/**
 * Health Endpoint
 * Spec: 012-config-secrets
 * Per contracts/health.yaml
 *
 * GET /api/health - Returns system health and configuration status
 * MUST be available even in CONFIG_ERROR state (no auth required)
 */

import { Router, Request, Response } from 'express';
import {
  getValidationResult,
  isConfigurationValid
} from '../config/config';
import { ConfigurationState, HealthResponse } from '../config/types';

// ========== ROUTER ==========

const router = Router();

// ========== ROUTES ==========

/**
 * GET /api/health
 * Get system health and configuration status
 *
 * Per contracts/health.yaml:
 * - MUST be available even in CONFIG_ERROR state
 * - MUST respond within 100ms
 * - MUST NOT require authentication
 * - MUST always return 200 status code (health info is in body)
 * - MUST include config_state in every response
 * - MUST include error field names when in CONFIG_ERROR
 * - MUST NOT include configuration values
 * - MUST NOT include secret values
 */
router.get('/health', (req: Request, res: Response) => {
  const validation = getValidationResult();

  // Build response per contracts/health.yaml schema
  const response: HealthResponse = {
    status: validation.valid ? 'ok' : 'config_error',
    config_state: validation.state,
    timestamp: new Date().toISOString()
  };

  // Include error field names (not values) when in CONFIG_ERROR
  // Per contracts/health.yaml: SECURITY - Contains field names only, NEVER values
  if (!validation.valid) {
    response.errors = validation.errors.map(e => e.field);
  }

  // Always return 200 - health info is in the body
  // Per contracts/health.yaml: "MUST always return 200 status code"
  res.status(200).json(response);
});

/**
 * GET /api/health/config
 * Get detailed configuration status (field names only)
 *
 * This is an additional endpoint for debugging config issues
 * Still follows security rules - no values exposed
 */
router.get('/health/config', (req: Request, res: Response) => {
  const validation = getValidationResult();

  res.status(200).json({
    config_state: validation.state,
    valid: validation.valid,
    validated_at: validation.validated_at,
    errors: validation.errors.map(e => ({
      field: e.field,
      reason: e.reason,
      timestamp: e.timestamp
    })),
    timestamp: new Date().toISOString()
  });
});

export default router;
