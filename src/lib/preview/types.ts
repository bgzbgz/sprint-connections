/**
 * Fast Track Preview - Type Definitions
 * Spec: 010-tool-preview
 * Per data-model.md
 */

// ========== API RESPONSE TYPES ==========

/**
 * QA Report data from API
 * Per data-model.md
 */
export interface QAReportData {
  score?: number;
  passed_checks?: string[];
  failed_checks?: string[];
  notes?: string;
}

/**
 * Full job detail response from GET /api/boss/jobs/:id
 * Includes tool_html and qa_report (excluded from list response)
 * Per contracts/job-detail.yaml
 */
export interface JobDetailResponse {
  job_id: string;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  created_at: string;
  status: string;

  // Factory callback fields (spec-008)
  tool_id?: string;
  tool_html?: string;              // Full HTML content
  qa_status?: 'PASS' | 'FAIL';
  qa_report?: QAReportData;        // Full QA report
  callback_received_at?: string;
}

// ========== VIEW MODEL TYPES ==========

/**
 * Formatted metadata for preview display
 * Per FR-010: Display tool_id, job_id, received timestamp
 */
export interface PreviewMetadata {
  tool_id: string;           // Display name (tool_id or filename)
  job_id: string;            // Job identifier
  received_at: string;       // Formatted timestamp
}

/**
 * Preview page state
 * Tracks loading, error, and render status
 */
export interface PreviewState {
  // Data
  job: JobDetailResponse | null;

  // Loading states
  loading: boolean;           // True while fetching job
  rendering: boolean;         // True while iframe loading

  // Error states
  error: string | null;       // Fetch/load error message
  renderError: string | null; // Iframe render failure message

  // Blob URL management
  blobUrl: string | null;     // Current blob URL (for cleanup)
}

// ========== INITIAL STATE ==========

/**
 * Initial state for preview
 */
export const INITIAL_PREVIEW_STATE: PreviewState = {
  job: null,
  loading: true,
  rendering: false,
  error: null,
  renderError: null,
  blobUrl: null
};
