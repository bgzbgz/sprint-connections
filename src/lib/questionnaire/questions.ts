/**
 * Fast Track Pre-Submission Questionnaire - Question Configuration
 * Spec: 014-pre-submission-questionnaire
 * Per spec.md FR-003 through FR-006
 */

import { QuestionConfig, INPUT_TYPE_OPTIONS } from './types';

/**
 * Question configuration array
 * 4 questions with id, step, question text, inputType, placeholder, options, maxLength
 */
export const QUESTIONS: QuestionConfig[] = [
  {
    id: 'decision',
    step: 1,
    question: 'What decision should the user make by the end of this tool?',
    inputType: 'text',
    placeholder: 'e.g., Should you hire a new team member?',
    maxLength: 500
  },
  {
    id: 'teaching',
    step: 2,
    question: 'What is the one thing this tool will teach them?',
    inputType: 'text',
    placeholder: 'e.g., How to objectively evaluate team capacity',
    maxLength: 500
  },
  {
    id: 'inputTypes',
    step: 3,
    question: 'What inputs should the user provide?',
    inputType: 'multiselect',
    options: INPUT_TYPE_OPTIONS,
    maxLength: 0 // Not applicable for multiselect
  },
  {
    id: 'scoringCriteria',
    step: 4,
    question: 'What makes someone score HIGH vs LOW?',
    inputType: 'text',
    placeholder: 'e.g., High overtime and missed deadlines = hire now',
    maxLength: 500
  }
];

/**
 * Total number of steps (4 questions + 1 review)
 */
export const TOTAL_STEPS = 5;

/**
 * Review step number
 */
export const REVIEW_STEP = 5;

/**
 * Get question config by step number
 */
export function getQuestionByStep(step: number): QuestionConfig | undefined {
  return QUESTIONS.find(q => q.step === step);
}

/**
 * Get question config by field id
 */
export function getQuestionById(id: string): QuestionConfig | undefined {
  return QUESTIONS.find(q => q.id === id);
}
