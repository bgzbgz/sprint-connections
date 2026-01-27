/**
 * Fast Track Job Actions - API Client
 * Spec: 011-status-audit-log
 * Per contracts/job-actions.yaml
 *
 * Frontend API client for Boss actions (approve, reject, revision)
 */

// ========== CONFIGURATION ==========

const API_BASE = '/api/boss/jobs';

// ========== INTERFACES ==========

/**
 * Response from job action endpoints
 */
export interface ActionResponse {
  job_id: string;
  status: string;
  message: string;
  audit_entry_id: string;
}

/**
 * Error response from job action endpoints
 */
export interface ActionError {
  error: string;
  code: 'NOT_FOUND' | 'INVALID_STATUS' | 'NOTE_REQUIRED' | 'UNAUTHORIZED';
}

// ========== API CLIENTS ==========

/**
 * Approve a job for deployment
 * Changes status: READY_FOR_REVIEW → DEPLOY_REQUESTED
 *
 * @param jobId - Job ID to approve
 * @param note - Optional approval note
 * @returns ActionResponse with new status
 * @throws Error if request fails
 */
export async function approveJob(jobId: string, note?: string): Promise<ActionResponse> {
  const body = note ? { note } : {};

  const response = await fetch(`${API_BASE}/${jobId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (response.status === 404) {
    throw new Error('Job not found');
  }

  if (response.status === 400) {
    const error: ActionError = await response.json();
    throw new Error(error.error || 'Invalid request');
  }

  if (response.status === 401) {
    throw new Error('Authentication required');
  }

  if (!response.ok) {
    throw new Error('Failed to approve job');
  }

  return response.json();
}

/**
 * Reject a job
 * Changes status: READY_FOR_REVIEW → REJECTED
 *
 * @param jobId - Job ID to reject
 * @param note - Required rejection reason
 * @returns ActionResponse with new status
 * @throws Error if request fails or note is missing
 */
export async function rejectJob(jobId: string, note: string): Promise<ActionResponse> {
  if (!note || note.trim().length === 0) {
    throw new Error('Rejection reason is required');
  }

  const response = await fetch(`${API_BASE}/${jobId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ note })
  });

  if (response.status === 404) {
    throw new Error('Job not found');
  }

  if (response.status === 400) {
    const error: ActionError = await response.json();
    throw new Error(error.error || 'Invalid request');
  }

  if (response.status === 401) {
    throw new Error('Authentication required');
  }

  if (!response.ok) {
    throw new Error('Failed to reject job');
  }

  return response.json();
}

/**
 * Request revision for a job
 * Changes status: READY_FOR_REVIEW → REVISION_REQUESTED
 *
 * @param jobId - Job ID to request revision for
 * @param note - Required revision feedback
 * @returns ActionResponse with new status
 * @throws Error if request fails or note is missing
 */
export async function requestRevision(jobId: string, note: string): Promise<ActionResponse> {
  if (!note || note.trim().length === 0) {
    throw new Error('Revision feedback is required');
  }

  const response = await fetch(`${API_BASE}/${jobId}/request-revision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ note })
  });

  if (response.status === 404) {
    throw new Error('Job not found');
  }

  if (response.status === 400) {
    const error: ActionError = await response.json();
    throw new Error(error.error || 'Invalid request');
  }

  if (response.status === 401) {
    throw new Error('Authentication required');
  }

  if (!response.ok) {
    throw new Error('Failed to request revision');
  }

  return response.json();
}
