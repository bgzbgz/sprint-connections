/**
 * Fast Track Inbox - Logic and Rendering
 * Spec: 009-inbox-approved-tools
 *
 * State management, data transformation, and rendering for Inbox view
 */

import { JobResponse, InboxItem, InboxState, INITIAL_INBOX_STATE } from './types';
import { fetchInbox } from '../../api/inbox';

// ========== DATA TRANSFORMATION ==========

/**
 * Format a date string as relative time (e.g., "2 hours ago", "Yesterday")
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
 * Build QA summary string from job data
 * Since qa_report is not included in list response, show simple "QA Passed" message
 *
 * @param job - Job response object
 * @returns QA summary string
 */
export function buildQaSummary(job: JobResponse): string {
  // qa_report not included in list response per FR-007
  // Show simple status for approved tools
  return 'QA Passed';
}

/**
 * Transform JobResponse to InboxItem view model
 *
 * @param job - Job response from API
 * @returns InboxItem for display
 */
export function toInboxItem(job: JobResponse): InboxItem {
  return {
    job_id: job.job_id,
    // Use tool_id if present, fallback to original_filename
    display_name: job.tool_id || job.original_filename,
    // Format callback_received_at, fallback to created_at
    received_at: formatRelativeTime(job.callback_received_at || job.created_at),
    qa_summary: buildQaSummary(job)
  };
}

// ========== RENDERING ==========

/**
 * Render a single inbox item card
 *
 * @param item - InboxItem to render
 * @returns HTML string for the item card
 */
export function renderInboxItem(item: InboxItem): string {
  return `
    <article class="inbox-item" data-job-id="${item.job_id}" tabindex="0">
      <div class="inbox-item__header">
        <h3 class="inbox-item__title">${item.display_name.toUpperCase()}</h3>
        <span class="inbox-item__time">${item.received_at.toUpperCase()}</span>
      </div>
      <div class="inbox-item__meta">
        <span class="inbox-item__job-id">JOB: ${item.job_id}</span>
      </div>
      <div class="inbox-item__footer">
        <span class="inbox-item__qa">${item.qa_summary}</span>
      </div>
    </article>
  `;
}

/**
 * Render the empty state when no approved tools exist
 *
 * @returns HTML string for empty state
 */
export function renderEmptyState(): string {
  return `
    <div class="inbox-empty">
      <h2 class="inbox-empty__title">NO APPROVED TOOLS YET.</h2>
      <p class="inbox-empty__description">Tools appear here after Factory QA pass.</p>
    </div>
  `;
}

/**
 * Render loading state
 *
 * @returns HTML string for loading state
 */
export function renderLoadingState(): string {
  return `
    <div class="inbox-loading">
      <span class="inbox-loading__text">LOADING APPROVED TOOLS...</span>
    </div>
  `;
}

/**
 * Render error state
 *
 * @param message - Error message to display
 * @returns HTML string for error state
 */
export function renderErrorState(message: string): string {
  return `
    <div class="inbox-error">
      <span class="inbox-error__title">LOAD FAILED</span>
      <span class="inbox-error__message">${message}</span>
    </div>
  `;
}

/**
 * Render the inbox list based on current state
 *
 * @param state - Current inbox state
 * @returns HTML string for the inbox
 */
export function renderInboxList(state: InboxState): string {
  if (state.loading) {
    return renderLoadingState();
  }

  if (state.error) {
    return renderErrorState(state.error);
  }

  if (state.isEmpty || state.items.length === 0) {
    return renderEmptyState();
  }

  const itemsHtml = state.items.map(renderInboxItem).join('');

  return `
    <div class="inbox-list">
      <header class="inbox-list__header">
        <h1 class="inbox-list__title">APPROVED TOOLS</h1>
        <span class="inbox-list__count">${state.items.length} ${state.items.length === 1 ? 'TOOL' : 'TOOLS'}</span>
      </header>
      <div class="inbox-list__items">
        ${itemsHtml}
      </div>
    </div>
  `;
}

// ========== STATE MANAGEMENT ==========

/**
 * Load inbox data and return updated state
 * Filtering is backend-enforced; defensive check ensures only READY_FOR_REVIEW items
 *
 * Note: Backend endpoint GET /api/boss/jobs/inbox already filters by status = READY_FOR_REVIEW
 * The defensive filter below is belt-and-suspenders for data integrity
 *
 * @returns Promise<InboxState> - Updated state after load
 */
export async function loadInbox(): Promise<InboxState> {
  try {
    const jobs = await fetchInbox();

    // Defensive filter: ensure only READY_FOR_REVIEW status (backend should already filter)
    // This is belt-and-suspenders - backend is the source of truth for filtering
    const filteredJobs = jobs.filter(job => job.status === 'READY_FOR_REVIEW');

    const items = filteredJobs.map(toInboxItem);

    return {
      items,
      loading: false,
      error: null,
      isEmpty: items.length === 0
    };
  } catch (error) {
    return {
      items: [],
      loading: false,
      error: error instanceof Error ? error.message : 'Failed to load inbox',
      isEmpty: false
    };
  }
}

// ========== NAVIGATION ==========

/**
 * Navigate to preview page for a specific job
 * Per spec-010: 1-click navigation from Inbox to Preview (FR-001)
 *
 * @param jobId - Job identifier to preview
 */
export function navigateToPreview(jobId: string): void {
  window.location.href = `/preview.html?job_id=${encodeURIComponent(jobId)}`;
}

/**
 * Handle click on inbox item to navigate to preview
 *
 * @param event - Click event
 */
function handleInboxItemClick(event: Event): void {
  const target = event.target as HTMLElement;
  const item = target.closest('.inbox-item') as HTMLElement;

  if (item) {
    const jobId = item.dataset.jobId;
    if (jobId) {
      navigateToPreview(jobId);
    }
  }
}

/**
 * Handle keyboard navigation on inbox items
 *
 * @param event - Keyboard event
 */
function handleInboxItemKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    handleInboxItemClick(event);
  }
}

// ========== DOM UTILITIES ==========

/**
 * Mount inbox to a container element
 *
 * @param container - DOM element to mount to
 * @param state - Inbox state to render
 */
export function mountInbox(container: HTMLElement, state: InboxState): void {
  container.innerHTML = renderInboxList(state);

  // Setup click handlers for inbox items (spec-010 navigation)
  setupInboxItemHandlers(container);
}

/**
 * Setup event handlers for inbox item navigation
 * Per spec-010: Click to navigate to Preview
 *
 * @param container - Container element with inbox items
 */
export function setupInboxItemHandlers(container: HTMLElement): void {
  // Add click handler for all inbox items
  const items = container.querySelectorAll('.inbox-item');
  items.forEach(item => {
    item.addEventListener('click', handleInboxItemClick);
    item.addEventListener('keydown', handleInboxItemKeydown as EventListener);
  });
}
