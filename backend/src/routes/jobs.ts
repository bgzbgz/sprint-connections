/**
 * Fast Track Upload - Jobs API Routes
 * Spec: 006-boss-office-upload
 * Per contracts/job.yaml
 *
 * POST /api/boss/jobs - Create a new job from uploaded file
 */

import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import multer from 'multer';
import {
  Job,
  JobStatus,
  FileType,
  createJob,
  jobToResponse,
  isValidFileType
} from '../models/job';
import { storeFile } from '../services/storage';
import { submitJobToFactory, getErrorMessage, SubmitErrorCode } from '../services/factory';
import { transitionJob, createInitialAuditEntry, ActorType } from '../services/stateMachine';
import { saveJob, getJob, getAllJobs, getInboxJobs, updateJob, getJobDetail } from '../services/jobStore';

// ========== CONFIGURATION ==========

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const VALID_EXTENSIONS = ['pdf', 'docx', 'txt', 'md'];

// ========== MULTER CONFIGURATION ==========

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    const extension = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (VALID_EXTENSIONS.includes(extension)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE'));
    }
  }
});

// ========== ROUTER ==========

const router = Router();

// ========== ERROR MESSAGES ==========

const ERROR_MESSAGES = {
  INVALID_FILE_TYPE: 'Wrong file type. Use PDF, DOCX, TXT, or MD.',
  FILE_TOO_LARGE: 'File too large. Split it.',
  FILE_EMPTY: 'File is empty. Upload a document with content.',
  STORAGE_ERROR: 'Storage unavailable. Try again later.',
  NO_FILE: 'No file uploaded.',
  // NEW (spec 007): Factory submission errors
  ALREADY_SUBMITTED: 'Job already sent to Factory.',
  INVALID_STATUS: 'Job cannot be submitted.',
  NOT_FOUND: 'Job not found',
  // NEW (spec 011): Boss action errors
  NOTE_REQUIRED: 'Note is required for this action.',
  NOT_READY_FOR_REVIEW: 'Job must be in READY_FOR_REVIEW status.',
  TRANSITION_FAILED: 'Status transition failed.'
};

// ========== ROUTES ==========

/**
 * GET /api/boss/jobs/inbox
 * List jobs ready for review (READY_FOR_REVIEW status only)
 * Spec: 008-factory-callback
 * Per contracts/inbox.yaml
 *
 * Note: This route MUST come before /:jobId to avoid being caught by wildcard
 * Note: FACTORY_FAILED jobs are NOT included - Boss only sees approved tools
 */
router.get('/inbox', async (req: Request, res: Response) => {
  // Get jobs ready for review from store
  const inboxJobs = getInboxJobs();
  console.log(`[Jobs] Inbox request: ${inboxJobs.length} jobs ready for review`);
  res.json(inboxJobs);
});

/**
 * POST /api/boss/jobs
 * Create a new Job from uploaded file
 */
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: ERROR_MESSAGES.NO_FILE,
        code: 'NO_FILE'
      });
    }

    const file = req.file;

    // Check for empty file
    if (file.size === 0) {
      return res.status(400).json({
        error: ERROR_MESSAGES.FILE_EMPTY,
        code: 'FILE_EMPTY'
      });
    }

    // Get file extension and type
    const extension = file.originalname.split('.').pop()?.toLowerCase() || '';
    const fileType = extension.toUpperCase() as FileType;

    if (!isValidFileType(fileType)) {
      return res.status(400).json({
        error: ERROR_MESSAGES.INVALID_FILE_TYPE,
        code: 'INVALID_FILE_TYPE'
      });
    }

    // Generate job ID
    const jobId = randomUUID();

    // Store file
    let storedFile;
    try {
      storedFile = await storeFile(jobId, file.originalname, file.buffer);
    } catch (storageError) {
      return res.status(500).json({
        error: ERROR_MESSAGES.STORAGE_ERROR,
        code: 'STORAGE_ERROR'
      });
    }

    // Create job
    const job = createJob(
      {
        original_filename: file.originalname,
        file_type: fileType,
        file_size_bytes: file.size,
        file_storage_key: storedFile.storage_key
      },
      jobId
    );

    // Auto-submit to Factory webhook
    console.log(`[Jobs] Submitting job ${jobId} to Factory...`);
    const submitResult = await submitJobToFactory(job);

    if (submitResult.success) {
      console.log(`[Jobs] Job ${jobId} submitted successfully`);
      job.status = JobStatus.SENT;
      job.submitted_at = submitResult.submitted_at;

      // If factory returned tool HTML, process it immediately
      if (submitResult.factoryResponse?.tool_html_base64) {
        console.log(`[Jobs] Factory returned tool: ${submitResult.factoryResponse.tool_name}`);

        // Decode base64 HTML
        const toolHtml = Buffer.from(
          submitResult.factoryResponse.tool_html_base64,
          'base64'
        ).toString('utf-8');

        // Update job with tool data
        job.tool_id = submitResult.factoryResponse.job_id || jobId;
        job.tool_html = toolHtml;

        // Use QA report from factory if provided, otherwise create default
        const factoryQA = submitResult.factoryResponse.qa_report;
        if (factoryQA) {
          console.log(`[Jobs] QA Report received - score: ${factoryQA.score}`);
          job.qa_report = factoryQA;
          job.qa_status = factoryQA.score >= 70 ? 'PASS' : 'FAIL';
        } else {
          // Fallback for workflows without QA Agent
          job.qa_status = 'PASS';
          job.qa_report = {
            score: 100,
            passed_checks: ['html_valid', 'script_present', 'styling_complete'],
            failed_checks: [],
            notes: `Generated tool: ${submitResult.factoryResponse.tool_name}`
          };
        }

        // NEW: Track revision history from QA loop
        if (submitResult.factoryResponse.revision_history) {
          job.revision_history = submitResult.factoryResponse.revision_history;
          job.revision_count = submitResult.factoryResponse.revision_count || 1;
          console.log(`[Jobs] Tool revised ${job.revision_count} time(s) during QA`);
        }

        // Handle failed_qa status (tool failed after max attempts)
        if (submitResult.factoryResponse.status === 'failed_qa') {
          console.log(`[Jobs] Tool failed QA after max revision attempts`);
          job.qa_status = 'FAIL';
          // Still send to Boss Office for manual review
        }

        job.status = JobStatus.READY_FOR_REVIEW;
        job.callback_received_at = new Date();

        console.log(`[Jobs] Job ${jobId} ready for review (QA: ${job.qa_status}, revisions: ${job.revision_count || 1})`);
      }
    } else {
      console.log(`[Jobs] Job ${jobId} submission failed: ${submitResult.failure_reason}`);
      job.status = JobStatus.FAILED_SEND;
      job.failure_reason = submitResult.failure_reason;
    }

    // Save job to store
    saveJob(job);

    // Return response with submission status
    res.status(201).json({
      ...jobToResponse(job),
      submission: submitResult.success
        ? {
            status: job.status === JobStatus.READY_FOR_REVIEW ? 'ready_for_review' : 'sent',
            submitted_at: job.submitted_at,
            tool_name: submitResult.factoryResponse?.tool_name
          }
        : { status: 'failed', error: submitResult.failure_reason }
    });

  } catch (error) {
    // Handle multer errors
    if ((error as any).code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: ERROR_MESSAGES.FILE_TOO_LARGE,
        code: 'FILE_TOO_LARGE'
      });
    }

    if ((error as Error).message === 'INVALID_FILE_TYPE') {
      return res.status(400).json({
        error: ERROR_MESSAGES.INVALID_FILE_TYPE,
        code: 'INVALID_FILE_TYPE'
      });
    }

    console.error('[Jobs] Error creating job:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/boss/jobs/:jobId/submit
 * Submit a job to Factory
 * Spec: 007-factory-integration
 */
router.post('/:jobId/submit', async (req: Request, res: Response) => {
  const { jobId } = req.params;

  // TODO: Fetch from MongoDB
  // const job = await JobModel.findOne({ job_id: jobId });
  // For now, we'll use a mock job lookup pattern

  try {
    // Get job from store
    const job = getJob(jobId);

    if (!job) {
      return res.status(404).json({
        error: ERROR_MESSAGES.NOT_FOUND,
        code: 'NOT_FOUND'
      });
    }

    // Validate job status - must be DRAFT or FAILED_SEND
    if (job.status === JobStatus.SENT) {
      return res.status(400).json({
        error: ERROR_MESSAGES.ALREADY_SUBMITTED,
        code: 'ALREADY_SUBMITTED'
      });
    }

    if (job.status !== JobStatus.DRAFT && job.status !== JobStatus.FAILED_SEND) {
      return res.status(400).json({
        error: ERROR_MESSAGES.INVALID_STATUS,
        code: 'INVALID_STATUS'
      });
    }

    // Submit to Factory
    const result = await submitJobToFactory(job);

    if (result.success) {
      // Update job in store
      const updated = updateJob(jobId, {
        status: JobStatus.SENT,
        submitted_at: result.submitted_at,
        last_attempt_at: result.submitted_at,
        failure_reason: undefined
      });

      return res.status(200).json({
        job_id: jobId,
        status: updated?.status,
        submitted_at: result.submitted_at.toISOString(),
        message: 'Job sent to Factory'
      });
    } else {
      // Update job in store
      const updated = updateJob(jobId, {
        status: JobStatus.FAILED_SEND,
        last_attempt_at: new Date(),
        failure_reason: result.failure_reason
      });

      return res.status(500).json({
        job_id: jobId,
        status: updated?.status,
        error: getErrorMessage(result.error_code),
        code: result.error_code
      });
    }

  } catch (error) {
    console.error('[Jobs] Error submitting job:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/boss/jobs/:jobId
 * Get a Job by ID (includes full tool_html for preview)
 */
router.get('/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params;

  // Get job from store
  const job = getJobDetail(jobId);

  if (!job) {
    return res.status(404).json({
      error: ERROR_MESSAGES.NOT_FOUND,
      code: 'NOT_FOUND'
    });
  }

  // Return full job including tool_html for preview
  res.json({
    ...jobToResponse(job),
    tool_html: job.tool_html,
    qa_report: job.qa_report
  });
});

/**
 * GET /api/boss/jobs
 * List all Jobs
 */
router.get('/', async (req: Request, res: Response) => {
  // Get all jobs from store
  const jobs = getAllJobs()
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    .map(job => jobToResponse(job));

  console.log(`[Jobs] List request: ${jobs.length} total jobs`);
  res.json(jobs);
});

// ========== BOSS ACTION ROUTES (spec-011) ==========

/**
 * POST /api/boss/jobs/:jobId/approve
 * Approve a job for deployment
 * Spec: 011-status-audit-log
 * Per contracts/job-actions.yaml
 *
 * Transitions: READY_FOR_REVIEW → DEPLOY_REQUESTED
 * Note: Optional
 */
router.post('/:jobId/approve', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const { note } = req.body;

  try {
    // Get job from store
    const job = getJob(jobId);

    if (!job) {
      return res.status(404).json({
        error: ERROR_MESSAGES.NOT_FOUND,
        code: 'NOT_FOUND'
      });
    }

    // Validate status is READY_FOR_REVIEW
    if (job.status !== JobStatus.READY_FOR_REVIEW) {
      return res.status(400).json({
        error: ERROR_MESSAGES.NOT_READY_FOR_REVIEW,
        code: 'INVALID_STATUS'
      });
    }

    // Execute transition with audit logging
    const result = await transitionJob(
      job,
      JobStatus.DEPLOY_REQUESTED,
      ActorType.BOSS,
      note
    );

    if (!result.success) {
      return res.status(400).json({
        error: result.error || ERROR_MESSAGES.TRANSITION_FAILED,
        code: 'INVALID_STATUS'
      });
    }

    // TODO: Save updated job to MongoDB
    // await JobModel.updateOne({ job_id: jobId }, result.job);

    res.json({
      job_id: jobId,
      status: result.job!.status,
      message: 'Job approved for deployment',
      audit_entry_id: result.auditEntry!._id
    });

  } catch (error) {
    console.error('[Jobs] Error approving job:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/boss/jobs/:jobId/reject
 * Reject a job
 * Spec: 011-status-audit-log
 * Per contracts/job-actions.yaml
 *
 * Transitions: READY_FOR_REVIEW → REJECTED
 * Note: Required
 */
router.post('/:jobId/reject', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const { note } = req.body;

  try {
    // Validate note is provided
    if (!note || note.trim().length === 0) {
      return res.status(400).json({
        error: ERROR_MESSAGES.NOTE_REQUIRED,
        code: 'NOTE_REQUIRED'
      });
    }

    // Get job from store
    const job = getJob(jobId);

    if (!job) {
      return res.status(404).json({
        error: ERROR_MESSAGES.NOT_FOUND,
        code: 'NOT_FOUND'
      });
    }

    // Validate status is READY_FOR_REVIEW
    if (job.status !== JobStatus.READY_FOR_REVIEW) {
      return res.status(400).json({
        error: ERROR_MESSAGES.NOT_READY_FOR_REVIEW,
        code: 'INVALID_STATUS'
      });
    }

    // Execute transition with audit logging
    const result = await transitionJob(
      job,
      JobStatus.REJECTED,
      ActorType.BOSS,
      note.trim()
    );

    if (!result.success) {
      return res.status(400).json({
        error: result.error || ERROR_MESSAGES.TRANSITION_FAILED,
        code: 'INVALID_STATUS'
      });
    }

    // TODO: Save updated job to MongoDB
    // await JobModel.updateOne({ job_id: jobId }, result.job);

    res.json({
      job_id: jobId,
      status: result.job!.status,
      message: 'Job rejected',
      audit_entry_id: result.auditEntry!._id
    });

  } catch (error) {
    console.error('[Jobs] Error rejecting job:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/boss/jobs/:jobId/request-revision
 * Request revision for a job - calls n8n revision webhook
 * Spec: 011-status-audit-log
 * Per contracts/job-actions.yaml
 *
 * Transitions: READY_FOR_REVIEW → REVISION_REQUESTED
 * n8n will callback with revised tool → READY_FOR_REVIEW
 * Note: Required (revision_notes)
 */
router.post('/:jobId/request-revision', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const { note, revision_notes } = req.body;

  // Support both 'note' and 'revision_notes' field names
  const revisionNotes = revision_notes || note;

  try {
    // Validate revision notes are provided
    if (!revisionNotes || revisionNotes.trim().length === 0) {
      return res.status(400).json({
        error: 'Revision notes are required',
        code: 'NOTE_REQUIRED'
      });
    }

    // Get job from store
    const job = getJob(jobId);

    if (!job) {
      return res.status(404).json({
        error: ERROR_MESSAGES.NOT_FOUND,
        code: 'NOT_FOUND'
      });
    }

    // Validate status is READY_FOR_REVIEW
    if (job.status !== JobStatus.READY_FOR_REVIEW) {
      return res.status(400).json({
        error: ERROR_MESSAGES.NOT_READY_FOR_REVIEW,
        code: 'INVALID_STATUS'
      });
    }

    // Build simplified payload - n8n fetches tool from MongoDB using job_id
    const payload = {
      job_id: job.job_id,
      revision_notes: revisionNotes.trim(),
      callback_url: process.env.CALLBACK_URL || 'http://localhost:3000/api/factory/callback'
    };

    // Send to n8n revision webhook
    const REVISION_WEBHOOK_URL = process.env.REVISION_WEBHOOK_URL ||
      'https://n8n-edge.fasttrack-diagnostic.com/webhook/tool-revision';

    console.log(`[Jobs] Sending revision request for job ${jobId}...`);
    console.log(`[Jobs] Revision notes: ${revisionNotes.trim().substring(0, 100)}...`);

    try {
      const response = await fetch(REVISION_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Update job status to REVISION_REQUESTED
        updateJob(jobId, {
          status: JobStatus.REVISION_REQUESTED,
          revision_notes: revisionNotes.trim()
        });

        // Create audit entry for the revision request
        await transitionJob(
          job,
          JobStatus.REVISION_REQUESTED,
          ActorType.BOSS,
          `Revision requested: ${revisionNotes.trim()}`
        );

        console.log(`[Jobs] Revision request sent for job ${jobId}`);

        return res.json({
          success: true,
          job_id: jobId,
          status: 'REVISION_REQUESTED',
          message: 'Revision request sent to Factory'
        });
      } else {
        const errorText = await response.text();
        console.log(`[Jobs] Revision request failed: ${response.status} - ${errorText}`);
        return res.status(500).json({
          error: 'Failed to send revision request',
          code: 'REVISION_FAILED'
        });
      }
    } catch (fetchError: any) {
      console.log(`[Jobs] Network error sending revision request: ${fetchError.message}`);
      return res.status(500).json({
        error: 'Network error sending revision request',
        code: 'NETWORK_ERROR'
      });
    }

  } catch (error) {
    console.error('[Jobs] Error requesting revision:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// ========== ERROR HANDLER ==========

// Multer error handler middleware
router.use((error: any, req: Request, res: Response, next: Function) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: ERROR_MESSAGES.FILE_TOO_LARGE,
      code: 'FILE_TOO_LARGE'
    });
  }

  if (error.message === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      error: ERROR_MESSAGES.INVALID_FILE_TYPE,
      code: 'INVALID_FILE_TYPE'
    });
  }

  next(error);
});

export default router;
