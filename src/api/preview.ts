/**
 * Fast Track Preview - API Client
 * Spec: 010-tool-preview
 *
 * Fetches job detail from GET /api/boss/jobs/:id endpoint
 * Includes tool_html and qa_report (not in list response)
 */

import { JobDetailResponse } from '../lib/preview/types';

// ========== CONFIGURATION ==========

const API_BASE = '/api/boss/jobs';

// ========== API FUNCTIONS ==========

/**
 * Fetch job detail with full tool_html and qa_report
 * Per contracts/job-detail.yaml
 *
 * @param jobId - Job identifier
 * @returns Promise<JobDetailResponse> - Full job details
 * @throws Error if fetch fails or job not found
 */
export async function fetchJobDetail(jobId: string): Promise<JobDetailResponse> {
  const response = await fetch(`${API_BASE}/${jobId}`);

  if (response.status === 404) {
    throw new Error('Job not found');
  }

  if (!response.ok) {
    throw new Error('Failed to load job details');
  }

  return response.json();
}
