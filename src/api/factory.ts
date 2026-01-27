/**
 * Fast Track Factory Integration - API Client
 * Spec: 007-factory-integration
 * Per contracts/submit.yaml
 */

// ========== API CONFIGURATION ==========

const API_BASE_URL = '/api/boss';

// ========== INTERFACES ==========

/**
 * Successful submission response
 */
export interface SubmitSuccessResponse {
  job_id: string;
  status: 'SUBMITTED';
  submitted_at: string;
  message: string;
}

/**
 * Failed submission response
 */
export interface SubmitFailureResponse {
  job_id: string;
  status: 'FAILED_SEND';
  error: string;
  code: string;
  last_attempt_at: string;
}

/**
 * Union type for submit response
 */
export type SubmitResponse = SubmitSuccessResponse | SubmitFailureResponse;

// ========== ERROR MESSAGES (Fast Track DNA) ==========

const API_ERRORS = {
  NETWORK: 'Unable to reach Factory. Check your connection.',
  NOT_FOUND: 'Job not found.',
  ALREADY_SUBMITTED: 'Job already sent to Factory.',
  UNKNOWN: 'Submission failed. Try again.'
};

// ========== API FUNCTIONS ==========

/**
 * Submit a job to Factory
 *
 * @param jobId - The job ID to submit
 * @returns Promise resolving to the submit response
 * @throws Error with user-friendly message on failure
 */
export async function submitJob(jobId: string): Promise<SubmitResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok) {
      return data as SubmitSuccessResponse;
    }

    // Handle specific error codes
    if (response.status === 404) {
      throw new Error(API_ERRORS.NOT_FOUND);
    }

    if (data.code === 'ALREADY_SUBMITTED') {
      throw new Error(API_ERRORS.ALREADY_SUBMITTED);
    }

    // Return failure response for FAILED_SEND status
    if (data.status === 'FAILED_SEND') {
      return data as SubmitFailureResponse;
    }

    throw new Error(data.error || API_ERRORS.UNKNOWN);

  } catch (error) {
    // Network error (fetch failed)
    if (error instanceof TypeError) {
      throw new Error(API_ERRORS.NETWORK);
    }

    // Re-throw mapped errors
    throw error;
  }
}

/**
 * Check if response is a success
 */
export function isSubmitSuccess(response: SubmitResponse): response is SubmitSuccessResponse {
  return response.status === 'SUBMITTED';
}

/**
 * Check if response is a failure
 */
export function isSubmitFailure(response: SubmitResponse): response is SubmitFailureResponse {
  return response.status === 'FAILED_SEND';
}
