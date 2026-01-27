/**
 * Fast Track Inbox - Page Entry Point
 * Spec: 009-inbox-approved-tools
 *
 * Initializes and renders the Inbox view
 * This is the default landing view for the Boss Office
 */

import { loadInbox, mountInbox, renderLoadingState } from '../lib/inbox/inbox';
import { INITIAL_INBOX_STATE } from '../lib/inbox/types';

// ========== CONFIGURATION ==========

const INBOX_CONTAINER_ID = 'inbox-container';

// ========== PAGE INITIALIZATION ==========

/**
 * Initialize the inbox page
 * Shows loading state, fetches data, then renders results
 */
async function initInboxPage(): Promise<void> {
  const container = document.getElementById(INBOX_CONTAINER_ID);

  if (!container) {
    console.error('[Inbox] Container element not found:', INBOX_CONTAINER_ID);
    return;
  }

  // Show loading state immediately
  container.innerHTML = renderLoadingState();

  // Load inbox data and render
  const state = await loadInbox();
  mountInbox(container, state);

  // Log result for debugging
  console.log('[Inbox] Loaded:', {
    count: state.items.length,
    isEmpty: state.isEmpty,
    error: state.error
  });
}

// ========== EVENT LISTENERS ==========

/**
 * Handle inbox item click
 * Future: Navigate to job detail view
 */
function handleItemClick(event: Event): void {
  const target = event.target as HTMLElement;
  const item = target.closest('.inbox-item');

  if (item) {
    const jobId = item.getAttribute('data-job-id');
    console.log('[Inbox] Item clicked:', jobId);
    // Future: Navigate to job detail
    // window.location.href = `/jobs/${jobId}`;
  }
}

/**
 * Attach event listeners to inbox container
 */
function attachEventListeners(): void {
  const container = document.getElementById(INBOX_CONTAINER_ID);

  if (container) {
    container.addEventListener('click', handleItemClick);
  }
}

// ========== EXPORTS ==========

export { initInboxPage, INBOX_CONTAINER_ID };

// ========== AUTO-INIT ==========

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initInboxPage();
      attachEventListeners();
    });
  } else {
    initInboxPage();
    attachEventListeners();
  }
}
