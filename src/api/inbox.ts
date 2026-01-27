/**
 * Fast Track Inbox - API Client
 * Spec: 009-inbox-approved-tools
 *
 * Fetches inbox data from GET /api/boss/jobs/inbox endpoint
 * Backend endpoint implemented in spec-008
 */

import { JobResponse } from '../lib/inbox/types';

// ========== CONFIGURATION ==========

const API_BASE = '/api/boss/jobs';

// ========== API FUNCTIONS ==========

/**
 * Fetch inbox items from backend
 * Only returns jobs with status = READY_FOR_REVIEW (backend-filtered)
 *
 * @returns Promise<JobResponse[]> - Array of approved jobs
 * @throws Error if fetch fails
 */
export async function fetchInbox(): Promise<JobResponse[]> {
  const response = await fetch(`${API_BASE}/inbox`);

  if (!response.ok) {
    throw new Error('Failed to load inbox');
  }

  return response.json();
}
