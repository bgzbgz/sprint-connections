/**
 * Fast Track Preview - Page Entry Point
 * Spec: 010-tool-preview
 *
 * Initializes preview page with job_id from URL parameter
 */

import {
  loadPreview,
  mountPreview,
  openInNewTab,
  downloadHtml,
  copyHtmlToClipboard,
  navigateToInbox,
  revokePreviewBlob,
  getCurrentBlobUrl,
  setupRenderTimeout,
  renderNoteModal
} from '../lib/preview/preview';
import { PreviewState, INITIAL_PREVIEW_STATE } from '../lib/preview/types';
import { fetchAuditLog } from '../api/auditLog';
import { approveJob, rejectJob, requestRevision } from '../api/jobActions';
import { mountTimeline, renderLoadingState, renderTimelineState } from '../lib/audit/timeline';
import { TimelineState, INITIAL_TIMELINE_STATE } from '../lib/audit/types';

// ========== STATE ==========

let currentState: PreviewState = INITIAL_PREVIEW_STATE;
let timelineState: TimelineState = INITIAL_TIMELINE_STATE;
let cleanupRenderTimeout: (() => void) | null = null;
let currentJobId: string | null = null;

// ========== INITIALIZATION ==========

/**
 * Get job_id from URL query parameters
 */
function getJobIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('job_id');
}

/**
 * Initialize the preview page
 */
async function initPreview(): Promise<void> {
  const container = document.getElementById('preview-container');
  const timelineContainer = document.getElementById('timeline-container');

  if (!container) {
    console.error('Preview container not found');
    return;
  }

  // Get job_id from URL
  const jobId = getJobIdFromUrl();
  if (!jobId) {
    currentState = {
      ...INITIAL_PREVIEW_STATE,
      loading: false,
      error: 'No job ID provided. Please navigate from the Inbox.'
    };
    mountPreview(container, currentState);
    return;
  }

  // Store job ID for actions
  currentJobId = jobId;

  // Load preview data
  currentState = await loadPreview(jobId);
  mountPreview(container, currentState);

  // Setup event listeners after mounting
  setupEventListeners(container);

  // Setup render timeout if we have a blob URL
  if (currentState.blobUrl) {
    const iframe = container.querySelector('.preview-frame__iframe') as HTMLIFrameElement;
    if (iframe) {
      cleanupRenderTimeout = setupRenderTimeout(
        iframe,
        () => handleRenderTimeout(container),
        () => handleRenderSuccess(container)
      );
    }
  }

  // Load and render audit timeline (spec-011)
  if (timelineContainer) {
    await loadAndRenderTimeline(jobId, timelineContainer);
  }
}

/**
 * Handle iframe render timeout (5 seconds)
 */
function handleRenderTimeout(container: HTMLElement): void {
  currentState = {
    ...currentState,
    rendering: false,
    renderError: 'Preview took too long to render'
  };
  mountPreview(container, currentState);
  setupEventListeners(container);
}

/**
 * Handle successful iframe render
 */
function handleRenderSuccess(container: HTMLElement): void {
  // Remove loading class from frame
  const frame = container.querySelector('.preview-frame');
  if (frame) {
    frame.classList.remove('preview-frame--loading');
  }

  currentState = {
    ...currentState,
    rendering: false
  };
}

// ========== EVENT HANDLERS ==========

/**
 * Setup event listeners for preview actions
 */
function setupEventListeners(container: HTMLElement): void {
  // Back to inbox button
  const backButton = container.querySelector('[data-action="back"]');
  if (backButton) {
    backButton.addEventListener('click', handleBackClick);
  }

  // Open in new tab button
  const newTabButton = container.querySelector('[data-action="new-tab"]');
  if (newTabButton) {
    newTabButton.addEventListener('click', handleNewTabClick);
  }

  // Download HTML button
  const downloadButton = container.querySelector('[data-action="download"]');
  if (downloadButton) {
    downloadButton.addEventListener('click', handleDownloadClick);
  }

  // Copy HTML button
  const copyButton = container.querySelector('[data-action="copy"]');
  if (copyButton) {
    copyButton.addEventListener('click', handleCopyClick);
  }

  // Boss action buttons (spec-011)
  const approveButton = container.querySelector('[data-action="approve"]');
  if (approveButton) {
    approveButton.addEventListener('click', handleApproveClick);
  }

  const rejectButton = container.querySelector('[data-action="reject"]');
  if (rejectButton) {
    rejectButton.addEventListener('click', handleRejectClick);
  }

  const revisionButton = container.querySelector('[data-action="request-revision"]');
  if (revisionButton) {
    revisionButton.addEventListener('click', handleRevisionClick);
  }
}

/**
 * Handle back to inbox click
 */
function handleBackClick(): void {
  // Cleanup timeout if running
  if (cleanupRenderTimeout) {
    cleanupRenderTimeout();
  }
  navigateToInbox();
}

/**
 * Handle open in new tab click
 */
function handleNewTabClick(): void {
  if (currentState.job?.tool_html) {
    openInNewTab(currentState.job.tool_html);
  }
}

/**
 * Handle download HTML click
 */
function handleDownloadClick(): void {
  if (currentState.job?.tool_html) {
    const filename = currentState.job.tool_id || currentState.job.job_id || 'tool';
    downloadHtml(currentState.job.tool_html, filename);
  }
}

/**
 * Handle copy HTML click
 */
async function handleCopyClick(event: Event): Promise<void> {
  const button = event.target as HTMLButtonElement;
  if (!currentState.job?.tool_html) return;

  try {
    await copyHtmlToClipboard(currentState.job.tool_html);

    // Show feedback
    const originalText = button.textContent;
    button.textContent = 'COPIED!';

    // Revert after 2 seconds
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    button.textContent = 'COPY FAILED';
    setTimeout(() => {
      button.textContent = 'COPY HTML';
    }, 2000);
  }
}

// ========== TIMELINE FUNCTIONS (spec-011) ==========

/**
 * Load and render audit timeline
 */
async function loadAndRenderTimeline(jobId: string, container: HTMLElement): Promise<void> {
  // Show loading state
  container.innerHTML = renderLoadingState();

  try {
    const response = await fetchAuditLog(jobId);

    timelineState = {
      entries: response.entries,
      loading: false,
      error: null,
      pagination: response.pagination
    };

    mountTimeline(container, timelineState);
  } catch (error) {
    timelineState = {
      entries: [],
      loading: false,
      error: error instanceof Error ? error.message : 'Failed to load timeline',
      pagination: null
    };

    mountTimeline(container, timelineState);
  }
}

/**
 * Refresh timeline after action
 */
async function refreshTimeline(): Promise<void> {
  const container = document.getElementById('timeline-container');
  if (!container || !currentJobId) return;

  await loadAndRenderTimeline(currentJobId, container);
}

// ========== BOSS ACTION HANDLERS (spec-011) ==========

/**
 * Handle approve button click
 */
async function handleApproveClick(): Promise<void> {
  if (!currentJobId) return;

  const button = document.querySelector('[data-action="approve"]') as HTMLButtonElement;
  if (!button) return;

  try {
    button.disabled = true;
    button.textContent = 'APPROVING...';

    await approveJob(currentJobId);

    // Show success feedback
    button.textContent = 'APPROVED';

    // Refresh timeline to show new entry
    await refreshTimeline();

    // Reload page to update UI (status changed)
    setTimeout(() => {
      window.location.reload();
    }, 1000);

  } catch (error) {
    console.error('Failed to approve job:', error);
    button.textContent = 'APPROVE FAILED';
    button.disabled = false;

    setTimeout(() => {
      button.textContent = 'APPROVE';
    }, 2000);
  }
}

/**
 * Handle reject button click - opens modal
 */
function handleRejectClick(): void {
  showNoteModal('reject', 'REJECT TOOL');
}

/**
 * Handle revision button click - opens modal
 */
function handleRevisionClick(): void {
  showNoteModal('revision', 'REQUEST REVISION');
}

/**
 * Show note input modal
 */
function showNoteModal(actionType: 'reject' | 'revision', title: string): void {
  // Remove any existing modal
  const existingModal = document.querySelector('.note-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create and append modal
  const modalHtml = renderNoteModal(actionType, title);
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Setup modal event listeners
  const modal = document.querySelector('.note-modal') as HTMLElement;
  if (!modal) return;

  const textarea = modal.querySelector('.note-modal__input') as HTMLTextAreaElement;
  const submitButton = modal.querySelector('[data-action="submit-modal"]') as HTMLButtonElement;
  const closeButtons = modal.querySelectorAll('[data-action="close-modal"]');

  // Enable/disable submit based on input
  textarea.addEventListener('input', () => {
    submitButton.disabled = textarea.value.trim().length === 0;
  });

  // Handle close
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => modal.remove());
  });

  // Handle submit
  submitButton.addEventListener('click', () => {
    handleModalSubmit(actionType, textarea.value.trim(), modal);
  });

  // Focus textarea
  textarea.focus();
}

/**
 * Handle modal submit
 */
async function handleModalSubmit(
  actionType: 'reject' | 'revision',
  note: string,
  modal: HTMLElement
): Promise<void> {
  if (!currentJobId || !note) return;

  const submitButton = modal.querySelector('[data-action="submit-modal"]') as HTMLButtonElement;
  submitButton.disabled = true;
  submitButton.textContent = actionType === 'reject' ? 'REJECTING...' : 'REQUESTING...';

  try {
    if (actionType === 'reject') {
      await rejectJob(currentJobId, note);
    } else {
      await requestRevision(currentJobId, note);
    }

    // Close modal
    modal.remove();

    // Show success in Boss actions area
    const actionsContainer = document.querySelector('.preview-actions--boss');
    if (actionsContainer) {
      actionsContainer.innerHTML = `
        <div class="preview-actions__feedback preview-actions__feedback--success">
          ${actionType === 'reject' ? 'TOOL REJECTED' : 'REVISION REQUESTED'}
        </div>
      `;
    }

    // Refresh timeline
    await refreshTimeline();

    // Reload page after brief delay
    setTimeout(() => {
      window.location.reload();
    }, 1500);

  } catch (error) {
    console.error(`Failed to ${actionType} job:`, error);
    submitButton.textContent = 'FAILED - TRY AGAIN';
    submitButton.disabled = false;

    setTimeout(() => {
      submitButton.textContent = actionType === 'reject' ? 'REJECT' : 'REQUEST REVISION';
    }, 2000);
  }
}

// ========== CLEANUP ==========

/**
 * Cleanup blob URL before page unload
 * Prevents memory leaks
 */
function handleBeforeUnload(): void {
  if (cleanupRenderTimeout) {
    cleanupRenderTimeout();
  }
  revokePreviewBlob();
}

// ========== PAGE INITIALIZATION ==========

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initPreview);

// Cleanup on page unload
window.addEventListener('beforeunload', handleBeforeUnload);
