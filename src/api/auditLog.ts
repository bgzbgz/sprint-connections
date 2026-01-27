/**
 * Fast Track Audit Log - API Client
 * Spec: 011-status-audit-log
 * Per contracts/audit-log.yaml
 *
 * Frontend API client for audit log retrieval
 */

import { AuditLogListResponse } from '../lib/audit/types';

// ========== CONFIGURATION ==========

const API_BASE = '/api/boss/jobs';

// ========== API CLIENT ==========

/**
 * Fetch audit log for a job with pagination
 *
 * @param jobId - Job ID to get audit log for
 * @param page - Page number (1-indexed), defaults to 1
 * @param limit - Entries per page, defaults to 50
 * @returns Paginated audit log entries
 * @throws Error if request fails or job not found
 */
export async function fetchAuditLog(
  jobId: string,
  page: number = 1,
  limit: number = 50
): Promise<AuditLogListResponse> {
  const params = new URLSearchParams();
  if (page !== 1) {
    params.set('page', page.toString());
  }
  if (limit !== 50) {
    params.set('limit', limit.toString());
  }

  const queryString = params.toString();
  const url = `${API_BASE}/${jobId}/audit-log${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url);

  if (response.status === 404) {
    throw new Error('Job not found');
  }

  if (response.status === 401) {
    throw new Error('Authentication required');
  }

  if (!response.ok) {
    throw new Error('Failed to fetch audit log');
  }

  return response.json();
}
