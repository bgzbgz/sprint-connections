/**
 * Fast Track Upload - Upload Page
 * Spec: 014-pre-submission-questionnaire
 *
 * Initializes the questionnaire component when the page loads
 */

import { initQuestionnaire } from '../lib/questionnaire/questionnaire';

// ========== PAGE INITIALIZATION ==========

/**
 * Initialize the upload page
 * Called when DOM is ready
 */
function initUploadPage(): void {
  console.log('[Upload] Initializing upload page');

  // Initialize questionnaire component
  initQuestionnaire();

  console.log('[Upload] Upload page initialized');
}

// ========== DOM READY ==========

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUploadPage);
} else {
  // DOM already loaded
  initUploadPage();
}

// ========== EXPORTS ==========

export { initUploadPage };
