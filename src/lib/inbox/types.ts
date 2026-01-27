/**
 * Fast Track Inbox - Type Definitions
 * Spec: 009-inbox-approved-tools
 * Per data-model.md
 */

// ========== API RESPONSE TYPES ==========

/**
 * QA Report from Factory callback
 * Used for building qa_summary display
 */
export interface QAReport {
  score?: number;
  passed_checks?: string[];
  failed_checks?: string[];
  notes?: string;
}

/**
 * Job response from GET /api/boss/jobs/inbox
 * Per spec-006/008 JobResponse format
 */
export interface JobResponse {
  job_id: string;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  created_at: string;
  status: string;
  // Optional fields from callback (spec-008)
  tool_id?: string;
  qa_status?: 'PASS' | 'FAIL';
  callback_received_at?: string;
  // Note: qa_report NOT included in list response per FR-007
}

// ========== VIEW MODEL TYPES ==========

/**
 * InboxItem - Frontend view model for displaying a single Inbox entry
 * Per data-model.md
 */
export interface InboxItem {
  job_id: string;           // For detail link
  display_name: string;     // tool_id OR original_filename
  received_at: string;      // Formatted callback_received_at
  qa_summary: string;       // "QA Passed" or score info
}

/**
 * InboxState - Frontend state model for the Inbox view
 * Per data-model.md
 */
export interface InboxState {
  items: InboxItem[];       // List of inbox entries
  loading: boolean;         // True while fetching
  error: string | null;     // Error message if fetch failed
  isEmpty: boolean;         // True when items.length === 0 after successful load
}

// ========== INITIAL STATE ==========

/**
 * Initial state for inbox
 */
export const INITIAL_INBOX_STATE: InboxState = {
  items: [],
  loading: true,
  error: null,
  isEmpty: false
};
