/**
 * Fast Track Pre-Submission Questionnaire - Validation
 * Spec: 014-pre-submission-questionnaire
 *
 * Implements US3: Input validation
 * - T026: Validate text fields (min 10 chars)
 * - T027: Validate multiselect (min 1 selection)
 * - T028: Show validation error on Next click
 * - T029: Clear validation error when user types
 * - T030: Validate all fields before submission
 * - T031: Show character counter with warning at 90%
 */

import { QuestionnaireState, InputTypeOption } from './types';
import { QUESTIONS, REVIEW_STEP, getQuestionByStep } from './questions';

// ========== CONSTANTS ==========

const MIN_TEXT_LENGTH = 10;
const MIN_SELECTIONS = 1;

// ========== TYPES ==========

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ========== VALIDATION FUNCTIONS ==========

/**
 * Validate a text field (T026)
 * Must have at least MIN_TEXT_LENGTH characters
 */
export function validateTextField(value: string): ValidationResult {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      valid: false,
      error: 'This field is required'
    };
  }

  if (trimmed.length < MIN_TEXT_LENGTH) {
    return {
      valid: false,
      error: `Please enter at least ${MIN_TEXT_LENGTH} characters`
    };
  }

  return { valid: true };
}

/**
 * Validate multiselect field (T027)
 * Must have at least MIN_SELECTIONS items selected
 */
export function validateMultiselect(values: InputTypeOption[]): ValidationResult {
  if (!values || values.length < MIN_SELECTIONS) {
    return {
      valid: false,
      error: 'Please select at least one option'
    };
  }

  return { valid: true };
}

/**
 * Validate current step (T028)
 * Returns validation result for the current question
 */
export function validateCurrentStep(state: QuestionnaireState): ValidationResult {
  const { currentStep, answers } = state;

  // Review step - validate all fields (T030)
  if (currentStep === REVIEW_STEP) {
    return validateAllFields(state);
  }

  const question = getQuestionByStep(currentStep);
  if (!question) {
    return { valid: true };
  }

  // Validate based on question type
  if (question.inputType === 'text') {
    const fieldId = question.id as 'decision' | 'teaching' | 'scoringCriteria';
    return validateTextField(answers[fieldId] as string);
  }

  if (question.inputType === 'multiselect') {
    return validateMultiselect(answers.inputTypes);
  }

  return { valid: true };
}

/**
 * Validate all fields before submission (T030)
 */
export function validateAllFields(state: QuestionnaireState): ValidationResult {
  const { answers } = state;

  // Check decision
  const decisionResult = validateTextField(answers.decision);
  if (!decisionResult.valid) {
    return {
      valid: false,
      error: 'Question 1: ' + decisionResult.error
    };
  }

  // Check teaching
  const teachingResult = validateTextField(answers.teaching);
  if (!teachingResult.valid) {
    return {
      valid: false,
      error: 'Question 2: ' + teachingResult.error
    };
  }

  // Check input types
  const inputTypesResult = validateMultiselect(answers.inputTypes);
  if (!inputTypesResult.valid) {
    return {
      valid: false,
      error: 'Question 3: ' + inputTypesResult.error
    };
  }

  // Check scoring criteria
  const scoringResult = validateTextField(answers.scoringCriteria);
  if (!scoringResult.valid) {
    return {
      valid: false,
      error: 'Question 4: ' + scoringResult.error
    };
  }

  return { valid: true };
}

/**
 * Get validation error for a specific field
 */
export function getValidationError(
  field: 'decision' | 'teaching' | 'inputTypes' | 'scoringCriteria',
  value: string | InputTypeOption[]
): string | null {
  if (field === 'inputTypes') {
    const result = validateMultiselect(value as InputTypeOption[]);
    return result.valid ? null : (result.error || null);
  }

  const result = validateTextField(value as string);
  return result.valid ? null : (result.error || null);
}

/**
 * Check if character count is near limit (T031)
 * Returns true if at 90% or more of max length
 */
export function isNearCharLimit(current: number, max: number): boolean {
  return current >= max * 0.9;
}

// ========== EXPORTS ==========

export {
  MIN_TEXT_LENGTH,
  MIN_SELECTIONS
};
