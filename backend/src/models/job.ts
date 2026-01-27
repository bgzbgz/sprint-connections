/**
 * Fast Track Upload - Job Model
 * Spec: 006-boss-office-upload
 * Per contracts/job.yaml
 */

// ========== ENUMS ==========

/**
 * Supported file types
 */
export enum FileType {
  PDF = 'PDF',
  DOCX = 'DOCX',
  TXT = 'TXT',
  MD = 'MD'
}

/**
 * Job lifecycle states
 * Updated spec-011: Complete status model with audit log support
 */
export enum JobStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',                           // spec-011: Renamed from SUBMITTED
  FAILED_SEND = 'FAILED_SEND',             // spec-007: Submission to Factory failed
  FACTORY_FAILED = 'FACTORY_FAILED',       // spec-008: Factory callback qa_status=FAIL
  READY_FOR_REVIEW = 'READY_FOR_REVIEW',   // spec-008: Factory callback qa_status=PASS
  REVISION_REQUESTED = 'REVISION_REQUESTED', // spec-011: Boss requested changes
  DEPLOY_REQUESTED = 'DEPLOY_REQUESTED',   // spec-011: Boss approved for deployment
  DEPLOYED = 'DEPLOYED',                   // spec-011: Successfully deployed
  REJECTED = 'REJECTED'                    // spec-011: Boss rejected the tool
}

/**
 * QA Report from Factory callback
 * NEW (spec 008)
 */
export interface QAReport {
  score?: number;
  passed_checks?: string[];
  failed_checks?: string[];
  recommendations?: string[];
  notes?: string;
}

/**
 * Revision history entry - tracks QA revision attempts
 * NEW: QA Revision Loop feature
 */
export interface RevisionHistoryEntry {
  attempt: number;
  score: number;
  passed: boolean;
  failed_checks: string[];
  recommendations?: string[];
}

// ========== INTERFACES ==========

/**
 * Job entity - represents a document upload
 */
export interface Job {
  job_id: string;
  original_filename: string;
  file_type: FileType;
  file_size_bytes: number;
  file_storage_key: string;
  created_at: Date;
  status: JobStatus;
  // spec-007: Factory submission fields
  submitted_at?: Date;       // When successfully sent to Factory
  last_attempt_at?: Date;    // When last send was attempted
  failure_reason?: string;   // Error description when FAILED_SEND
  // NEW spec-008: Factory callback fields
  tool_id?: string;          // Factory-assigned tool identifier
  tool_html?: string;        // Generated tool HTML content (max 10MB)
  qa_status?: 'PASS' | 'FAIL';  // QA result from Factory
  qa_report?: QAReport;      // Factory QA report details
  callback_received_at?: Date;  // When callback was processed
  // NEW: QA Revision Loop fields
  revision_count?: number;           // Number of QA revision attempts
  revision_history?: RevisionHistoryEntry[];  // History of all QA attempts
  // NEW: Boss Revision fields
  revision_notes?: string;           // Boss's revision request notes
  revision_applied?: string;         // Summary of applied revision
}

/**
 * Job creation input
 */
export interface CreateJobInput {
  original_filename: string;
  file_type: FileType;
  file_size_bytes: number;
  file_storage_key: string;
}

/**
 * Job API response
 */
export interface JobResponse {
  job_id: string;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  created_at: string;
  status: string;
  // spec-007: Factory submission fields
  submitted_at?: string;      // ISO 8601 if submitted
  last_attempt_at?: string;   // ISO 8601 if attempted
  failure_reason?: string;    // Present if FAILED_SEND
  // NEW spec-008: Factory callback fields
  tool_id?: string;           // Factory-assigned tool identifier
  qa_status?: 'PASS' | 'FAIL';  // QA result from Factory
  callback_received_at?: string;  // ISO 8601 when callback received
  // Note: tool_html NOT included in list responses (too large)
  // Note: qa_report included only in detail view
}

// ========== MONGOOSE SCHEMA (if using MongoDB) ==========

/**
 * MongoDB schema definition for Job collection
 * Collection: fast_track_tools.jobs
 *
 * Indexes:
 * - job_id: unique
 * - status: standard
 * - created_at: descending
 */
export const JobSchema = {
  job_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  original_filename: {
    type: String,
    required: true,
    maxlength: 255
  },
  file_type: {
    type: String,
    required: true,
    enum: Object.values(FileType)
  },
  file_size_bytes: {
    type: Number,
    required: true,
    min: 1,
    max: 10 * 1024 * 1024 // 10MB
  },
  file_storage_key: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(JobStatus),
    default: JobStatus.DRAFT
  },
  // spec-007: Factory submission fields
  submitted_at: {
    type: Date,
    required: false,
    default: null
  },
  last_attempt_at: {
    type: Date,
    required: false,
    default: null
  },
  failure_reason: {
    type: String,
    required: false,
    default: null,
    maxlength: 500
  },
  // NEW spec-008: Factory callback fields
  tool_id: {
    type: String,
    required: false,
    default: null
  },
  tool_html: {
    type: String,
    required: false,
    default: null,
    maxlength: 10 * 1024 * 1024  // 10MB max
  },
  qa_status: {
    type: String,
    required: false,
    enum: ['PASS', 'FAIL', null],
    default: null
  },
  qa_report: {
    type: Object,
    required: false,
    default: null
  },
  callback_received_at: {
    type: Date,
    required: false,
    default: null
  }
};

// ========== VALIDATION ==========

/**
 * Validate file type string
 */
export function isValidFileType(type: string): type is FileType {
  return Object.values(FileType).includes(type as FileType);
}

/**
 * Validate job status string
 */
export function isValidJobStatus(status: string): status is JobStatus {
  return Object.values(JobStatus).includes(status as JobStatus);
}

// ========== FACTORY FUNCTIONS ==========

/**
 * Create a new Job entity
 */
export function createJob(input: CreateJobInput, jobId: string): Job {
  return {
    job_id: jobId,
    original_filename: input.original_filename,
    file_type: input.file_type,
    file_size_bytes: input.file_size_bytes,
    file_storage_key: input.file_storage_key,
    created_at: new Date(),
    status: JobStatus.DRAFT
  };
}

/**
 * Convert Job to API response format
 */
export function jobToResponse(job: Job): JobResponse {
  const response: JobResponse = {
    job_id: job.job_id,
    original_filename: job.original_filename,
    file_type: job.file_type,
    file_size_bytes: job.file_size_bytes,
    created_at: job.created_at.toISOString(),
    status: job.status
  };

  // spec-007: Include optional submission fields if present
  if (job.submitted_at) {
    response.submitted_at = job.submitted_at.toISOString();
  }
  if (job.last_attempt_at) {
    response.last_attempt_at = job.last_attempt_at.toISOString();
  }
  if (job.failure_reason) {
    response.failure_reason = job.failure_reason;
  }

  // NEW spec-008: Include optional callback fields if present
  if (job.tool_id) {
    response.tool_id = job.tool_id;
  }
  if (job.qa_status) {
    response.qa_status = job.qa_status;
  }
  if (job.callback_received_at) {
    response.callback_received_at = job.callback_received_at.toISOString();
  }
  // Note: tool_html and qa_report omitted from list response (too large)

  return response;
}
