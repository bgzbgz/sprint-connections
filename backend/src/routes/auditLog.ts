/**
 * Fast Track Audit Log - API Routes
 * Spec: 011-status-audit-log
 * Per contracts/audit-log.yaml
 *
 * GET /api/boss/jobs/:jobId/audit-log - Retrieve audit log for a job
 *
 * SECURITY NOTES:
 * - SR-001: NO PUT, PATCH, or DELETE routes are defined (append-only)
 * - SR-004: Authentication required (TODO: implement auth middleware)
 */

import { Router, Request, Response } from 'express';
import { getAuditLog, hasAuditEntries } from '../services/stateMachine';

const router = Router();

// ========== ERROR MESSAGES ==========

const ERROR_MESSAGES = {
  NOT_FOUND: 'Job not found',
  UNAUTHORIZED: 'Authentication required',
  INVALID_PAGE: 'Invalid page parameter',
  INVALID_LIMIT: 'Invalid limit parameter'
};

// ========== ROUTES ==========

/**
 * GET /api/boss/jobs/:jobId/audit-log
 *
 * Retrieve audit log entries for a job with pagination.
 * Returns entries in chronological order (oldest first) per FR-008.
 *
 * Query Parameters:
 * - page: Page number (1-indexed), default 1
 * - limit: Entries per page (1-100), default 50
 *
 * Responses:
 * - 200: Audit log entries with pagination
 * - 404: Job not found
 * - 401: Unauthorized (SR-004) - TODO: implement
 */
router.get('/:jobId/audit-log', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    // TODO (SR-004): Verify authentication
    // if (!req.user || !req.user.isBoss) {
    //   return res.status(401).json({
    //     error: ERROR_MESSAGES.UNAUTHORIZED,
    //     code: 'UNAUTHORIZED'
    //   });
    // }

    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    // Validate page parameter
    if (page < 1 || !Number.isInteger(page)) {
      return res.status(400).json({
        error: ERROR_MESSAGES.INVALID_PAGE,
        code: 'INVALID_PAGE'
      });
    }

    // Validate limit parameter
    if (limit < 1 || limit > 100 || !Number.isInteger(limit)) {
      return res.status(400).json({
        error: ERROR_MESSAGES.INVALID_LIMIT,
        code: 'INVALID_LIMIT'
      });
    }

    // Check if job exists (via audit entries)
    // In production, also check the jobs collection
    const hasEntries = await hasAuditEntries(jobId);

    // TODO: Also check jobs collection to determine if job exists
    // For now, if no audit entries, we assume job doesn't exist
    // In production: const job = await JobModel.findOne({ job_id: jobId });

    // Get audit log with pagination
    const result = await getAuditLog(jobId, page, limit);

    // If no entries found on page 1, job might not exist
    // Note: In production, verify against jobs collection first
    if (result.pagination.total === 0 && !hasEntries) {
      return res.status(404).json({
        error: ERROR_MESSAGES.NOT_FOUND,
        code: 'NOT_FOUND'
      });
    }

    res.json(result);

  } catch (error) {
    console.error('[AuditLog] Error retrieving audit log:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// ========== SECURITY: NO MUTATION ROUTES (SR-001) ==========

// NOTE: The following routes are INTENTIONALLY NOT IMPLEMENTED
// to ensure audit log immutability (FR-006, SR-001):
//
// - PUT /api/boss/jobs/:jobId/audit-log/:entryId  - NOT ALLOWED
// - PATCH /api/boss/jobs/:jobId/audit-log/:entryId - NOT ALLOWED
// - DELETE /api/boss/jobs/:jobId/audit-log/:entryId - NOT ALLOWED
// - DELETE /api/boss/jobs/:jobId/audit-log - NOT ALLOWED
//
// Audit log entries are APPEND-ONLY and cannot be modified or deleted.

export default router;
