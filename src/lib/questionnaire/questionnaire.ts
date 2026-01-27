/**
 * Fast Track Pre-Submission Questionnaire - Main Component
 * Spec: 014-pre-submission-questionnaire
 *
 * Implements:
 * - US1: Complete questionnaire flow
 * - US2: Submit structured request
 * - US3: Input validation
 * - US4: Progress persistence
 */

import {
  getCurrentState,
  updateAnswer,
  nextStep,
  previousStep,
  goToStep,
  resetState,
  setSubmitting,
  loadFromLocalStorage,
  clearLocalStorage
} from './state';
import { QUESTIONS, TOTAL_STEPS, REVIEW_STEP, getQuestionByStep } from './questions';
import { validateCurrentStep, getValidationError } from './validation';
import { submitQuestionnaire } from '../../api/jobs';
import { QuestionnaireState, InputTypeOption, INPUT_TYPE_OPTIONS } from './types';

// ========== DOM ELEMENTS ==========

interface Elements {
  container: HTMLElement | null;
  progressIndicator: HTMLElement | null;
  progressText: HTMLElement | null;
  stepContainer: HTMLElement | null;
  reviewContainer: HTMLElement | null;
  questionText: HTMLElement | null;
  textInputWrapper: HTMLElement | null;
  answerInput: HTMLTextAreaElement | null;
  charCount: HTMLElement | null;
  checkboxGroup: HTMLElement | null;
  validationError: HTMLElement | null;
  prevBtn: HTMLButtonElement | null;
  nextBtn: HTMLButtonElement | null;
  submitBtn: HTMLButtonElement | null;
  submitError: HTMLElement | null;
  successMessage: HTMLElement | null;
  reviewDecision: HTMLElement | null;
  reviewTeaching: HTMLElement | null;
  reviewInputTypes: HTMLElement | null;
  reviewScoring: HTMLElement | null;
}

let elements: Elements = {
  container: null,
  progressIndicator: null,
  progressText: null,
  stepContainer: null,
  reviewContainer: null,
  questionText: null,
  textInputWrapper: null,
  answerInput: null,
  charCount: null,
  checkboxGroup: null,
  validationError: null,
  prevBtn: null,
  nextBtn: null,
  submitBtn: null,
  submitError: null,
  successMessage: null,
  reviewDecision: null,
  reviewTeaching: null,
  reviewInputTypes: null,
  reviewScoring: null
};

// ========== INITIALIZATION (T017) ==========

/**
 * Initialize the questionnaire component
 * Call this after DOM is ready
 */
export function initQuestionnaire(): void {
  console.log('[Questionnaire] Initializing...');

  // Get DOM elements
  elements = {
    container: document.getElementById('questionnaire-container'),
    progressIndicator: document.getElementById('progress-indicator'),
    progressText: document.getElementById('progress-text'),
    stepContainer: document.getElementById('step-container'),
    reviewContainer: document.getElementById('review-container'),
    questionText: document.getElementById('question-text'),
    textInputWrapper: document.getElementById('text-input-wrapper'),
    answerInput: document.getElementById('answer-input') as HTMLTextAreaElement,
    charCount: document.getElementById('char-count'),
    checkboxGroup: document.getElementById('checkbox-group'),
    validationError: document.getElementById('validation-error'),
    prevBtn: document.getElementById('prev-btn') as HTMLButtonElement,
    nextBtn: document.getElementById('next-btn') as HTMLButtonElement,
    submitBtn: document.getElementById('submit-btn') as HTMLButtonElement,
    submitError: document.getElementById('submit-error'),
    successMessage: document.getElementById('success-message'),
    reviewDecision: document.getElementById('review-decision'),
    reviewTeaching: document.getElementById('review-teaching'),
    reviewInputTypes: document.getElementById('review-input-types'),
    reviewScoring: document.getElementById('review-scoring')
  };

  if (!elements.container) {
    console.error('[Questionnaire] Container element not found');
    return;
  }

  // Try to restore state from localStorage (US4)
  const restored = loadFromLocalStorage();

  // Setup event listeners
  setupEventListeners();

  // Render current state
  render();

  if (restored) {
    console.log('[Questionnaire] Restored previous session');
  }

  console.log('[Questionnaire] Initialized');
}

// ========== EVENT LISTENERS ==========

function setupEventListeners(): void {
  // Next button
  if (elements.nextBtn) {
    elements.nextBtn.addEventListener('click', handleNext);
  }

  // Previous button
  if (elements.prevBtn) {
    elements.prevBtn.addEventListener('click', handlePrevious);
  }

  // Text input - update state and character count
  if (elements.answerInput) {
    elements.answerInput.addEventListener('input', handleTextInput);
    elements.answerInput.addEventListener('keydown', handleKeyDown);
  }

  // Checkbox changes
  if (elements.checkboxGroup) {
    elements.checkboxGroup.addEventListener('change', handleCheckboxChange);
  }

  // Submit button
  if (elements.submitBtn) {
    elements.submitBtn.addEventListener('click', handleSubmit);
  }

  // Edit buttons (delegated)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.matches('[data-edit-step]')) {
      const step = parseInt(target.getAttribute('data-edit-step') || '1', 10);
      handleEdit(step);
    }
  });
}

// ========== RENDER FUNCTIONS ==========

/**
 * Main render function - decides what to show based on current step
 */
function render(): void {
  const state = getCurrentState();

  // Update progress indicator
  renderProgressIndicator(state.currentStep);

  // Hide success message by default
  hideSuccess();

  if (state.currentStep === REVIEW_STEP) {
    // Show review screen
    renderReviewStep();
  } else {
    // Show question step
    renderQuestionStep(state.currentStep);
  }
}

/**
 * Render progress indicator (T012)
 */
function renderProgressIndicator(currentStep: number): void {
  if (!elements.progressIndicator || !elements.progressText) return;

  // Update step indicators
  const steps = elements.progressIndicator.querySelectorAll('.ft-questionnaire__progress-step');
  steps.forEach((step, index) => {
    const stepNum = index + 1;
    step.classList.remove('ft-questionnaire__progress-step--active', 'ft-questionnaire__progress-step--completed');

    if (stepNum < currentStep) {
      step.classList.add('ft-questionnaire__progress-step--completed');
    } else if (stepNum === currentStep) {
      step.classList.add('ft-questionnaire__progress-step--active');
    }
  });

  // Update text
  const stepLabel = currentStep === REVIEW_STEP ? 'REVIEW' : `STEP ${currentStep}`;
  elements.progressText.textContent = `${stepLabel} OF ${TOTAL_STEPS}`;
}

/**
 * Render question step (T011)
 */
function renderQuestionStep(step: number): void {
  const question = getQuestionByStep(step);
  if (!question) return;

  const state = getCurrentState();

  // Show step container, hide review
  if (elements.stepContainer) elements.stepContainer.hidden = false;
  if (elements.reviewContainer) elements.reviewContainer.hidden = true;

  // Update question text
  if (elements.questionText) {
    elements.questionText.textContent = question.question;
  }

  // Show appropriate input type
  if (question.inputType === 'text') {
    if (elements.textInputWrapper) elements.textInputWrapper.hidden = false;
    if (elements.checkboxGroup) elements.checkboxGroup.hidden = true;

    // Set current answer value
    if (elements.answerInput) {
      const fieldId = question.id as 'decision' | 'teaching' | 'scoringCriteria';
      elements.answerInput.value = state.answers[fieldId] as string;
      elements.answerInput.placeholder = question.placeholder || '';
      elements.answerInput.maxLength = question.maxLength;

      // Update character count
      updateCharCount();

      // Focus input
      setTimeout(() => elements.answerInput?.focus(), 100);
    }
  } else if (question.inputType === 'multiselect') {
    if (elements.textInputWrapper) elements.textInputWrapper.hidden = true;
    if (elements.checkboxGroup) elements.checkboxGroup.hidden = false;

    // Set current checkbox states
    const checkboxes = elements.checkboxGroup?.querySelectorAll('input[type="checkbox"]');
    checkboxes?.forEach((cb) => {
      const checkbox = cb as HTMLInputElement;
      const isChecked = state.answers.inputTypes.includes(checkbox.value as InputTypeOption);
      checkbox.checked = isChecked;

      // Update parent styling
      const parent = checkbox.closest('.ft-questionnaire__checkbox-item');
      if (parent) {
        parent.classList.toggle('ft-questionnaire__checkbox-item--selected', isChecked);
      }
    });
  }

  // Show/hide Previous button
  if (elements.prevBtn) {
    elements.prevBtn.hidden = step === 1;
  }

  // Update Next button text
  if (elements.nextBtn) {
    elements.nextBtn.textContent = step === 4 ? 'Review' : 'Next';
  }

  // Hide validation error
  hideValidationError();
}

/**
 * Render review step (T015)
 */
function renderReviewStep(): void {
  const state = getCurrentState();

  // Hide step container, show review
  if (elements.stepContainer) elements.stepContainer.hidden = true;
  if (elements.reviewContainer) elements.reviewContainer.hidden = false;

  // Populate answers
  if (elements.reviewDecision) {
    elements.reviewDecision.textContent = state.answers.decision || '(not answered)';
  }

  if (elements.reviewTeaching) {
    elements.reviewTeaching.textContent = state.answers.teaching || '(not answered)';
  }

  if (elements.reviewInputTypes) {
    elements.reviewInputTypes.innerHTML = '';
    if (state.answers.inputTypes.length > 0) {
      state.answers.inputTypes.forEach(type => {
        const option = INPUT_TYPE_OPTIONS.find(o => o.value === type);
        if (option) {
          const tag = document.createElement('span');
          tag.className = 'ft-questionnaire__review-tag';
          tag.textContent = option.label;
          elements.reviewInputTypes?.appendChild(tag);
        }
      });
    } else {
      elements.reviewInputTypes.innerHTML = '<span class="ft-text-muted">(none selected)</span>';
    }
  }

  if (elements.reviewScoring) {
    elements.reviewScoring.textContent = state.answers.scoringCriteria || '(not answered)';
  }

  // Hide submit error
  hideError();
}

// ========== EVENT HANDLERS ==========

/**
 * Handle Next button click (T013)
 */
function handleNext(): void {
  const state = getCurrentState();

  // Validate current step (US3)
  const validation = validateCurrentStep(state);
  if (!validation.valid) {
    showValidationError(validation.error || 'This field is required');
    return;
  }

  // Advance to next step
  nextStep();
  render();
}

/**
 * Handle Previous button click (T014)
 */
function handlePrevious(): void {
  previousStep();
  render();
}

/**
 * Handle Edit button click (T016)
 */
function handleEdit(step: number): void {
  goToStep(step);
  render();
}

/**
 * Handle text input changes
 */
function handleTextInput(): void {
  if (!elements.answerInput) return;

  const state = getCurrentState();
  const question = getQuestionByStep(state.currentStep);
  if (!question || question.inputType !== 'text') return;

  const value = elements.answerInput.value;
  const fieldId = question.id as 'decision' | 'teaching' | 'scoringCriteria';

  updateAnswer(fieldId, value);
  updateCharCount();

  // Clear validation error when user starts typing
  hideValidationError();
}

/**
 * Handle keyboard events (T039 - polish)
 */
function handleKeyDown(e: KeyboardEvent): void {
  // Enter key (without shift) submits current step
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleNext();
  }
}

/**
 * Handle checkbox changes
 */
function handleCheckboxChange(e: Event): void {
  const target = e.target as HTMLInputElement;
  if (!target.matches('input[type="checkbox"]')) return;

  const state = getCurrentState();
  const value = target.value as InputTypeOption;

  let newTypes: InputTypeOption[];
  if (target.checked) {
    newTypes = [...state.answers.inputTypes, value];
  } else {
    newTypes = state.answers.inputTypes.filter(t => t !== value);
  }

  updateAnswer('inputTypes', newTypes);

  // Update parent styling
  const parent = target.closest('.ft-questionnaire__checkbox-item');
  if (parent) {
    parent.classList.toggle('ft-questionnaire__checkbox-item--selected', target.checked);
  }

  // Clear validation error
  hideValidationError();
}

/**
 * Update character count display (T031)
 */
function updateCharCount(): void {
  if (!elements.answerInput || !elements.charCount) return;

  const current = elements.answerInput.value.length;
  const max = elements.answerInput.maxLength || 500;

  elements.charCount.textContent = `${current}/${max}`;

  // Add warning class if near limit
  const isNearLimit = current > max * 0.9;
  elements.charCount.classList.toggle('ft-questionnaire__char-count--warning', isNearLimit);
}

// ========== SUBMIT HANDLING (US2) ==========

/**
 * Handle submit button click (T019)
 */
async function handleSubmit(): Promise<void> {
  const state = getCurrentState();

  // Final validation
  const validation = validateCurrentStep(state);
  if (!validation.valid) {
    showError(validation.error || 'Please complete all fields');
    return;
  }

  // Show loading state
  showLoading();

  try {
    // Build payload
    const payload = {
      source: {
        decision: state.answers.decision,
        teaching: state.answers.teaching,
        input_types: state.answers.inputTypes,
        scoring_criteria: state.answers.scoringCriteria
      }
    };

    // Submit to API
    const response = await submitQuestionnaire(payload);
    console.log('[Questionnaire] Submission successful, job_id:', response.job_id);

    // Hide loading
    hideLoading();

    // Show success
    showSuccess();

    // Clear localStorage (US4)
    clearLocalStorage();

    // Reset form after delay
    setTimeout(() => {
      resetState();
      render();
    }, 2000);

  } catch (error) {
    console.error('[Questionnaire] Submission failed:', error);
    hideLoading();
    showError((error as Error).message || 'Unable to submit. Please try again.');
  }
}

// ========== LOADING STATE (T020, T021) ==========

/**
 * Show loading state on submit button
 */
function showLoading(): void {
  setSubmitting(true);

  if (elements.submitBtn) {
    elements.submitBtn.disabled = true;
    elements.submitBtn.classList.add('ft-questionnaire__submit--loading');
    elements.submitBtn.innerHTML = '<span class="ft-questionnaire__spinner"></span> Submitting...';
  }
}

/**
 * Hide loading state
 */
function hideLoading(): void {
  setSubmitting(false);

  if (elements.submitBtn) {
    elements.submitBtn.disabled = false;
    elements.submitBtn.classList.remove('ft-questionnaire__submit--loading');
    elements.submitBtn.textContent = 'Submit Tool Request';
  }
}

// ========== SUCCESS/ERROR DISPLAY (T022, T023, T028, T029) ==========

/**
 * Show success message
 */
function showSuccess(): void {
  if (elements.successMessage) {
    elements.successMessage.classList.remove('ft-questionnaire__success--hidden');
  }

  // Hide review container
  if (elements.reviewContainer) {
    elements.reviewContainer.hidden = true;
  }
}

/**
 * Hide success message
 */
function hideSuccess(): void {
  if (elements.successMessage) {
    elements.successMessage.classList.add('ft-questionnaire__success--hidden');
  }
}

/**
 * Show error message (submit error)
 */
function showError(message: string): void {
  if (elements.submitError) {
    elements.submitError.textContent = message;
    elements.submitError.classList.remove('ft-questionnaire__error--hidden');
  }
}

/**
 * Hide error message
 */
function hideError(): void {
  if (elements.submitError) {
    elements.submitError.classList.add('ft-questionnaire__error--hidden');
  }
}

/**
 * Show validation error
 */
function showValidationError(message: string): void {
  if (elements.validationError) {
    elements.validationError.textContent = message;
    elements.validationError.classList.remove('ft-questionnaire__error--hidden');
  }

  // Add invalid class to input
  if (elements.answerInput) {
    elements.answerInput.classList.add('ft-questionnaire__textarea--invalid');
  }
}

/**
 * Hide validation error
 */
function hideValidationError(): void {
  if (elements.validationError) {
    elements.validationError.classList.add('ft-questionnaire__error--hidden');
  }

  // Remove invalid class from input
  if (elements.answerInput) {
    elements.answerInput.classList.remove('ft-questionnaire__textarea--invalid');
  }
}

// ========== EXPORTS ==========

export {
  render,
  renderProgressIndicator,
  renderQuestionStep,
  renderReviewStep,
  handleNext,
  handlePrevious,
  handleEdit,
  handleSubmit,
  showLoading,
  hideLoading,
  showSuccess,
  hideSuccess,
  showError,
  hideError,
  showValidationError,
  hideValidationError
};
