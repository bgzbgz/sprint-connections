/**
 * Fast Track Factory Integration - Submit Handler
 * Spec: 007-factory-integration
 *
 * Handles job submission to Factory with loading state and feedback
 */

import { submitJob, isSubmitSuccess, isSubmitFailure, SubmitResponse } from '../../api/factory';

// ========== STATE MANAGEMENT ==========

/**
 * Track loading state for each job
 */
const loadingJobs = new Set<string>();

/**
 * Check if a job is currently being submitted
 */
export function isJobLoading(jobId: string): boolean {
  return loadingJobs.has(jobId);
}

// ========== DOM HELPERS ==========

/**
 * Show success feedback message
 */
function showSuccess(message: string): void {
  const successEl = document.querySelector('.ft-job-status__success');
  if (successEl) {
    successEl.textContent = message;
    successEl.classList.add('ft-job-status__success--visible');

    // Hide after 5 seconds
    setTimeout(() => {
      successEl.classList.remove('ft-job-status__success--visible');
    }, 5000);
  }
}

/**
 * Show error feedback message
 */
function showError(message: string): void {
  const errorEl = document.querySelector('.ft-job-status__error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('ft-job-status__error--visible');
  }
}

/**
 * Hide error message
 */
function hideError(): void {
  const errorEl = document.querySelector('.ft-job-status__error');
  if (errorEl) {
    errorEl.classList.remove('ft-job-status__error--visible');
  }
}

/**
 * Update loading state in UI
 */
function setLoadingState(jobId: string, isLoading: boolean): void {
  const container = document.querySelector(`[data-job-id="${jobId}"]`);
  if (!container) return;

  const submitBtn = container.querySelector('.ft-job-status__submit-btn') as HTMLButtonElement;
  const retryBtn = container.querySelector('.ft-job-status__retry-btn') as HTMLButtonElement;
  const spinner = container.querySelector('.ft-job-status__spinner');

  if (submitBtn) {
    submitBtn.disabled = isLoading;
  }
  if (retryBtn) {
    retryBtn.disabled = isLoading;
  }
  if (spinner) {
    spinner.classList.toggle('ft-job-status__spinner--visible', isLoading);
  }
}

/**
 * Update job status badge
 */
function updateStatusBadge(jobId: string, status: string): void {
  const container = document.querySelector(`[data-job-id="${jobId}"]`);
  if (!container) return;

  const badge = container.querySelector('.ft-job-status__badge');
  if (badge) {
    // Remove all status classes
    badge.classList.remove(
      'ft-badge--default',
      'ft-badge--success',
      'ft-badge--warning'
    );

    // Add appropriate class based on status
    switch (status) {
      case 'SUBMITTED':
        badge.classList.add('ft-badge--success');
        badge.textContent = 'SUBMITTED';
        break;
      case 'FAILED_SEND':
        badge.classList.add('ft-badge--warning');
        badge.textContent = 'FAILED';
        break;
      default:
        badge.classList.add('ft-badge--default');
        badge.textContent = status;
    }
  }
}

/**
 * Show/hide action buttons based on status
 */
function updateActionButtons(jobId: string, status: string): void {
  const container = document.querySelector(`[data-job-id="${jobId}"]`);
  if (!container) return;

  const submitBtn = container.querySelector('.ft-job-status__submit-btn');
  const retryBtn = container.querySelector('.ft-job-status__retry-btn');
  const waitingMsg = container.querySelector('.ft-job-status__waiting');

  if (submitBtn) {
    submitBtn.classList.toggle('ft-hidden', status !== 'DRAFT');
  }
  if (retryBtn) {
    retryBtn.classList.toggle('ft-hidden', status !== 'FAILED_SEND');
  }
  if (waitingMsg) {
    waitingMsg.classList.toggle('ft-hidden', status !== 'SUBMITTED');
  }
}

// ========== SUBMIT HANDLERS ==========

/**
 * Handle submit button click for a DRAFT job
 *
 * @param jobId - The job ID to submit
 */
export async function handleSubmit(jobId: string): Promise<void> {
  // Prevent duplicate submissions
  if (loadingJobs.has(jobId)) {
    return;
  }

  // Set loading state
  loadingJobs.add(jobId);
  setLoadingState(jobId, true);
  hideError();

  try {
    const response = await submitJob(jobId);

    if (isSubmitSuccess(response)) {
      // Update UI for success
      updateStatusBadge(jobId, 'SUBMITTED');
      updateActionButtons(jobId, 'SUBMITTED');
      showSuccess('Job sent to Factory');
    } else if (isSubmitFailure(response)) {
      // Update UI for failure
      updateStatusBadge(jobId, 'FAILED_SEND');
      updateActionButtons(jobId, 'FAILED_SEND');
      showError(response.error);
    }

  } catch (error) {
    // Show error message
    const message = error instanceof Error ? error.message : 'Submission failed. Try again.';
    showError(message);
  } finally {
    // Clear loading state
    loadingJobs.delete(jobId);
    setLoadingState(jobId, false);
  }
}

/**
 * Handle retry button click for a FAILED_SEND job
 * Uses the same logic as handleSubmit
 *
 * @param jobId - The job ID to retry
 */
export async function handleRetry(jobId: string): Promise<void> {
  // Retry uses the same endpoint and logic
  await handleSubmit(jobId);
}

// ========== INITIALIZATION ==========

/**
 * Initialize submit handlers for all job status components on the page
 */
export function initSubmitHandlers(): void {
  // Attach click handlers to all submit buttons
  document.querySelectorAll('.ft-job-status__submit-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const button = e.currentTarget as HTMLButtonElement;
      const container = button.closest('[data-job-id]');
      const jobId = container?.getAttribute('data-job-id');
      if (jobId) {
        handleSubmit(jobId);
      }
    });
  });

  // Attach click handlers to all retry buttons
  document.querySelectorAll('.ft-job-status__retry-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const button = e.currentTarget as HTMLButtonElement;
      const container = button.closest('[data-job-id]');
      const jobId = container?.getAttribute('data-job-id');
      if (jobId) {
        handleRetry(jobId);
      }
    });
  });
}

// ========== EXPORTS ==========

export { SubmitResponse };
