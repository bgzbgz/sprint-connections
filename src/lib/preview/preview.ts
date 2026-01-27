/**
 * Fast Track Preview - Logic and Rendering
 * Spec: 010-tool-preview
 *
 * State management, blob handling, and rendering for Preview page
 */

import { JobDetailResponse, PreviewState, PreviewMetadata, QAReportData, INITIAL_PREVIEW_STATE } from './types';
import { fetchJobDetail } from '../../api/preview';

// ========== BLOB URL MANAGEMENT ==========

// Track current blob URL for cleanup
let currentBlobUrl: string | null = null;

/**
 * Create a blob URL from tool HTML for iframe rendering
 * Per research.md RQ-001: Blob URL for proper isolation
 *
 * @param toolHtml - HTML content to render
 * @returns Blob URL string
 */
export function createPreviewBlob(toolHtml: string): string {
  const blob = new Blob([toolHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  currentBlobUrl = url;
  return url;
}

/**
 * Revoke a blob URL to prevent memory leaks
 *
 * @param blobUrl - Blob URL to revoke (optional, revokes current if not provided)
 */
export function revokePreviewBlob(blobUrl?: string): void {
  const urlToRevoke = blobUrl || currentBlobUrl;
  if (urlToRevoke) {
    URL.revokeObjectURL(urlToRevoke);
    if (urlToRevoke === currentBlobUrl) {
      currentBlobUrl = null;
    }
  }
}

/**
 * Get current blob URL (for cleanup on navigation)
 */
export function getCurrentBlobUrl(): string | null {
  return currentBlobUrl;
}

// ========== DATA TRANSFORMATION ==========

/**
 * Format a date string as relative time (e.g., "2 hours ago", "Yesterday")
 * Reused pattern from inbox.ts
 *
 * @param dateString - ISO 8601 date string
 * @returns Formatted relative time string
 */
export function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) {
    return 'Unknown';
  }

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  // Format as date for older items
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Transform JobDetailResponse to PreviewMetadata
 * Per FR-010: Display tool_id, job_id, received timestamp
 *
 * @param job - Job detail response
 * @returns PreviewMetadata for display
 */
export function toPreviewMetadata(job: JobDetailResponse): PreviewMetadata {
  return {
    tool_id: job.tool_id || job.original_filename,
    job_id: job.job_id,
    received_at: formatRelativeTime(job.callback_received_at || job.created_at)
  };
}

// ========== RENDERING FUNCTIONS ==========

/**
 * Render loading state
 *
 * @returns HTML string for loading state
 */
export function renderLoadingState(): string {
  return `
    <div class="preview-loading">
      <span class="preview-loading__text">LOADING PREVIEW...</span>
    </div>
  `;
}

/**
 * Render error state with download/copy fallback options
 * Per FR-006, FR-007
 *
 * @param message - Error message
 * @param hasToolHtml - Whether tool_html is available for fallback
 * @returns HTML string for error state
 */
export function renderErrorState(message: string, hasToolHtml: boolean = false): string {
  const fallbackActions = hasToolHtml ? `
    <div class="preview-error__actions">
      <button class="preview-error__action" data-action="download" aria-label="Download tool HTML file">
        DOWNLOAD HTML
      </button>
      <button class="preview-error__action" data-action="copy" aria-label="Copy tool HTML to clipboard">
        COPY HTML
      </button>
    </div>
  ` : '';

  return `
    <div class="preview-error" role="alert" aria-live="polite">
      <div class="preview-error__header">
        <span class="preview-error__icon">!</span>
        <h3 class="preview-error__title">PREVIEW FAILED</h3>
      </div>
      <p class="preview-error__message">${message}</p>
      <p class="preview-error__guidance">
        ${hasToolHtml
          ? 'The tool HTML could not be rendered. Download or copy the raw HTML to inspect locally.'
          : 'No tool content is available for this job.'}
      </p>
      ${fallbackActions}
      <p class="preview-error__support">
        If this issue persists, contact the Factory team.
      </p>
    </div>
  `;
}

/**
 * Render preview metadata header
 * Per contracts/preview-meta.yaml
 *
 * @param metadata - Preview metadata
 * @returns HTML string for metadata header
 */
export function renderPreviewMeta(metadata: PreviewMetadata): string {
  return `
    <header class="preview-meta">
      <div class="preview-meta__primary">
        <h1 class="preview-meta__title">${metadata.tool_id.toUpperCase()}</h1>
        <span class="preview-meta__job-id">JOB: ${metadata.job_id}</span>
      </div>
      <div class="preview-meta__secondary">
        <span class="preview-meta__timestamp">RECEIVED: ${metadata.received_at.toUpperCase()}</span>
      </div>
    </header>
  `;
}

/**
 * Render QA status badge
 *
 * @param status - QA status (PASS or FAIL)
 * @returns HTML string for status badge
 */
export function renderQAStatus(status: 'PASS' | 'FAIL' | undefined): string {
  if (!status) {
    return '<span class="qa-panel__status">UNKNOWN</span>';
  }
  return `<span class="qa-panel__status qa-panel__status--${status}">${status}</span>`;
}

/**
 * Render violations list (passed or failed checks)
 *
 * @param checks - Array of check names/descriptions
 * @param type - Type of list (passed or failed)
 * @returns HTML string for list
 */
export function renderViolationsList(checks: string[] | undefined, type: 'passed' | 'failed'): string {
  if (!checks || checks.length === 0) {
    if (type === 'failed') {
      return '<p class="qa-panel__empty">No violations</p>';
    }
    return '<p class="qa-panel__empty">Data unavailable</p>';
  }

  const items = checks.map(check => `<li>${check}</li>`).join('');
  return `<ul class="qa-panel__list qa-panel__list--${type}">${items}</ul>`;
}

/**
 * Render QA panel
 * Per contracts/qa-panel.yaml
 *
 * @param qaStatus - QA status
 * @param qaReport - QA report data
 * @returns HTML string for QA panel
 */
export function renderQAPanel(qaStatus: 'PASS' | 'FAIL' | undefined, qaReport: QAReportData | undefined): string {
  const statusBadge = renderQAStatus(qaStatus);

  // Handle missing report entirely
  if (!qaReport && !qaStatus) {
    return `
      <aside class="qa-panel" role="complementary" aria-label="QA Report Panel">
        <header class="qa-panel__header">
          <h2 class="qa-panel__title">QA REPORT</h2>
          ${statusBadge}
        </header>
        <div class="qa-panel__content">
          <p class="qa-panel__empty">QA data unavailable</p>
        </div>
      </aside>
    `;
  }

  const score = qaReport?.score !== undefined
    ? `<span class="qa-panel__value">${qaReport.score}/100</span>`
    : '<span class="qa-panel__value">Data unavailable</span>';

  const notes = qaReport?.notes
    ? `<p class="qa-panel__notes">${qaReport.notes}</p>`
    : '';

  return `
    <aside class="qa-panel" role="complementary" aria-label="QA Report Panel">
      <header class="qa-panel__header">
        <h2 class="qa-panel__title">QA REPORT</h2>
        ${statusBadge}
      </header>
      <div class="qa-panel__content">
        <div class="qa-panel__section">
          <span class="qa-panel__label">SCORE</span>
          ${score}
        </div>
        <div class="qa-panel__section">
          <span class="qa-panel__label">PASSED</span>
          ${renderViolationsList(qaReport?.passed_checks, 'passed')}
        </div>
        <div class="qa-panel__section">
          <span class="qa-panel__label">VIOLATIONS</span>
          ${renderViolationsList(qaReport?.failed_checks, 'failed')}
        </div>
        ${notes ? `
        <div class="qa-panel__section">
          <span class="qa-panel__label">NOTES</span>
          ${notes}
        </div>
        ` : ''}
      </div>
    </aside>
  `;
}

/**
 * Render preview iframe with sandboxed content
 * Per contracts/preview-frame.yaml
 * SECURITY: sandbox="allow-scripts allow-modals" - NO allow-same-origin
 *
 * @param blobUrl - Blob URL for iframe src
 * @returns HTML string for preview frame
 */
export function renderPreviewFrame(blobUrl: string): string {
  return `
    <div class="preview-frame">
      <div class="preview-frame__container">
        <iframe
          class="preview-frame__iframe"
          src="${blobUrl}"
          sandbox="allow-scripts allow-modals"
          title="Tool Preview"
        ></iframe>
      </div>
      <div class="preview-frame__loading" aria-hidden="true">
        <span class="preview-frame__loading-text">RENDERING PREVIEW...</span>
      </div>
    </div>
  `;
}

/**
 * Render action buttons (back, new tab)
 *
 * @returns HTML string for action buttons
 */
export function renderPreviewActions(): string {
  return `
    <div class="preview-actions">
      <button class="preview-actions__back" data-action="back" aria-label="Return to Inbox">
        BACK TO INBOX
      </button>
      <button class="preview-actions__new-tab" data-action="new-tab" aria-label="Open tool preview in new browser tab">
        OPEN IN NEW TAB
      </button>
    </div>
  `;
}

/**
 * Render Boss action buttons (approve, reject, request revision)
 * Only shown when status is READY_FOR_REVIEW per FR-013
 * Spec: 011-status-audit-log
 *
 * @param status - Current job status
 * @returns HTML string for Boss action buttons (empty if not READY_FOR_REVIEW)
 */
export function renderBossActions(status: string): string {
  // Only show actions when job is READY_FOR_REVIEW (FR-013)
  if (status !== 'READY_FOR_REVIEW') {
    return '';
  }

  return `
    <div class="preview-actions preview-actions--boss">
      <button class="preview-actions__approve" data-action="approve" aria-label="Approve tool for deployment">
        APPROVE
      </button>
      <button class="preview-actions__revision" data-action="request-revision" aria-label="Request revision for tool">
        REQUEST REVISION
      </button>
      <button class="preview-actions__reject" data-action="reject" aria-label="Reject tool">
        REJECT
      </button>
    </div>
  `;
}

/**
 * Render note input modal for rejection/revision
 * Spec: 011-status-audit-log (FR-014)
 *
 * @param actionType - 'reject' or 'revision'
 * @param title - Modal title
 * @returns HTML string for modal
 */
export function renderNoteModal(actionType: 'reject' | 'revision', title: string): string {
  const placeholder = actionType === 'reject'
    ? 'Enter rejection reason...'
    : 'Enter revision feedback...';

  const submitLabel = actionType === 'reject' ? 'REJECT' : 'REQUEST REVISION';

  return `
    <div class="note-modal" data-modal-type="${actionType}" role="dialog" aria-labelledby="modal-title" aria-modal="true">
      <div class="note-modal__backdrop" data-action="close-modal"></div>
      <div class="note-modal__content">
        <header class="note-modal__header">
          <h2 id="modal-title" class="note-modal__title">${title}</h2>
          <button class="note-modal__close" data-action="close-modal" aria-label="Close modal">&times;</button>
        </header>
        <div class="note-modal__body">
          <label for="note-input" class="note-modal__label">NOTE (REQUIRED)</label>
          <textarea
            id="note-input"
            class="note-modal__input"
            placeholder="${placeholder}"
            maxlength="1000"
            required
            aria-describedby="note-hint"
          ></textarea>
          <span id="note-hint" class="note-modal__hint">Maximum 1000 characters</span>
        </div>
        <footer class="note-modal__footer">
          <button class="note-modal__cancel" data-action="close-modal">CANCEL</button>
          <button class="note-modal__submit" data-action="submit-modal" disabled>${submitLabel}</button>
        </footer>
      </div>
    </div>
  `;
}

/**
 * Render complete preview page
 *
 * @param state - Current preview state
 * @returns HTML string for entire preview content
 */
export function renderPreviewPage(state: PreviewState): string {
  // Show loading state
  if (state.loading) {
    return renderLoadingState();
  }

  // Show fetch error
  if (state.error) {
    return renderErrorState(state.error, false);
  }

  // No job data
  if (!state.job) {
    return renderErrorState('No job data available', false);
  }

  // Check for empty tool_html
  if (!state.job.tool_html) {
    return renderErrorState('No tool content available', false);
  }

  // Show render error with fallback
  if (state.renderError) {
    return renderErrorState(state.renderError, true);
  }

  // Get metadata
  const metadata = toPreviewMetadata(state.job);

  // Create blob URL if not exists
  let blobUrl = state.blobUrl;
  if (!blobUrl) {
    blobUrl = createPreviewBlob(state.job.tool_html);
  }

  // Render full preview page
  // Spec-011: Include Boss action buttons when READY_FOR_REVIEW
  return `
    ${renderPreviewMeta(metadata)}
    ${renderPreviewActions()}
    ${renderBossActions(state.job.status)}
    <div class="preview-content">
      ${renderPreviewFrame(blobUrl)}
      ${renderQAPanel(state.job.qa_status, state.job.qa_report)}
    </div>
  `;
}

// ========== STATE MANAGEMENT ==========

/**
 * Load preview data and return updated state
 *
 * @param jobId - Job identifier to load
 * @returns Promise<PreviewState> - Updated state after load
 */
export async function loadPreview(jobId: string): Promise<PreviewState> {
  try {
    const job = await fetchJobDetail(jobId);

    // Check for empty tool_html
    if (!job.tool_html) {
      return {
        ...INITIAL_PREVIEW_STATE,
        job,
        loading: false,
        error: 'No tool content available'
      };
    }

    // Create blob URL
    const blobUrl = createPreviewBlob(job.tool_html);

    return {
      job,
      loading: false,
      rendering: true,
      error: null,
      renderError: null,
      blobUrl
    };
  } catch (error) {
    return {
      ...INITIAL_PREVIEW_STATE,
      loading: false,
      error: error instanceof Error ? error.message : 'Failed to load preview'
    };
  }
}

// ========== ACTIONS ==========

/**
 * Open tool HTML in a new browser tab
 * Per contracts/new-tab.yaml
 * SECURITY: Uses noopener,noreferrer per SR-003
 *
 * @param toolHtml - HTML content to open
 */
export function openInNewTab(toolHtml: string): void {
  const blob = new Blob([toolHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  // Open with security attributes per SR-003
  window.open(url, '_blank', 'noopener,noreferrer');

  // Revoke after tab has time to load
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Download tool HTML as a file
 *
 * @param toolHtml - HTML content to download
 * @param filename - Filename for download
 */
export function downloadHtml(toolHtml: string, filename: string): void {
  const blob = new Blob([toolHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Copy tool HTML to clipboard
 *
 * @param toolHtml - HTML content to copy
 * @returns Promise that resolves when copy is complete
 */
export async function copyHtmlToClipboard(toolHtml: string): Promise<void> {
  await navigator.clipboard.writeText(toolHtml);
}

/**
 * Navigate back to inbox
 * Per contracts/back-navigation.yaml
 */
export function navigateToInbox(): void {
  // Cleanup blob URL before navigation
  revokePreviewBlob();

  // Prefer history navigation to preserve browser history
  if (window.history.length > 1) {
    window.history.back();
  } else {
    // Direct navigation if no history (e.g., direct link to preview)
    window.location.href = '/inbox.html';
  }
}

// ========== DOM UTILITIES ==========

/**
 * Mount preview to a container element
 *
 * @param container - DOM element to mount to
 * @param state - Preview state to render
 */
export function mountPreview(container: HTMLElement, state: PreviewState): void {
  container.innerHTML = renderPreviewPage(state);
}

/**
 * Setup render timeout detection
 * Per research.md RQ-003: 5-second timeout
 *
 * @param iframe - Iframe element to monitor
 * @param onTimeout - Callback when timeout fires
 * @param onSuccess - Callback when iframe loads successfully
 * @returns Cleanup function to clear timeout
 */
export function setupRenderTimeout(
  iframe: HTMLIFrameElement,
  onTimeout: () => void,
  onSuccess: () => void
): () => void {
  const timeoutId = window.setTimeout(() => {
    onTimeout();
  }, 5000);

  const handleLoad = () => {
    clearTimeout(timeoutId);
    onSuccess();
  };

  iframe.addEventListener('load', handleLoad);

  // Return cleanup function
  return () => {
    clearTimeout(timeoutId);
    iframe.removeEventListener('load', handleLoad);
  };
}
