/**
 * Frontend Configuration State Handler
 * Spec: 012-config-secrets
 * Per contracts/health.yaml frontend usage rules
 *
 * Fetches configuration status from /api/health and manages blocking overlay
 */

// ========== TYPES ==========

/**
 * Configuration state enum (matches backend)
 */
export enum ConfigurationState {
  VALID = 'VALID',
  CONFIG_ERROR = 'CONFIG_ERROR'
}

/**
 * Health response from /api/health
 * Per contracts/health.yaml schema
 */
export interface HealthResponse {
  status: 'ok' | 'config_error';
  config_state: ConfigurationState;
  errors?: string[];
  timestamp: string;
}

/**
 * Configuration state handler options
 */
export interface ConfigStateOptions {
  /** API base URL (defaults to current origin) */
  apiBaseUrl?: string;
  /** Polling interval in ms (0 to disable, default: 30000) */
  pollInterval?: number;
  /** Callback when config state changes */
  onStateChange?: (state: ConfigurationState, errors?: string[]) => void;
}

// ========== STATE ==========

let currentState: ConfigurationState | null = null;
let currentErrors: string[] = [];
let pollTimer: ReturnType<typeof setInterval> | null = null;

// ========== API ==========

/**
 * Fetch health status from API
 * Per contracts/health.yaml: Frontend MUST call /api/health on page load
 *
 * @param apiBaseUrl - Base URL for API
 * @returns HealthResponse
 */
export async function fetchHealthStatus(apiBaseUrl: string = ''): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl}/api/health`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }

  return response.json();
}

// ========== OVERLAY ==========

/**
 * Show configuration error overlay
 * Per contracts/startup.yaml: Full-screen blocking overlay, not dismissable
 *
 * @param errors - List of missing configuration field names
 */
export function showConfigErrorOverlay(errors: string[]): void {
  // Check if overlay already exists
  let overlay = document.getElementById('config-error-overlay');

  if (!overlay) {
    // Create overlay from template or dynamically
    overlay = createConfigErrorOverlay(errors);
    document.body.appendChild(overlay);
  } else {
    // Update existing overlay
    updateConfigErrorOverlay(overlay, errors);
  }

  // Show overlay
  overlay.removeAttribute('hidden');

  // Prevent scrolling
  document.body.style.overflow = 'hidden';
}

/**
 * Hide configuration error overlay
 */
export function hideConfigErrorOverlay(): void {
  const overlay = document.getElementById('config-error-overlay');

  if (overlay) {
    overlay.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }
}

/**
 * Create configuration error overlay element
 */
function createConfigErrorOverlay(errors: string[]): HTMLElement {
  const overlay = document.createElement('div');
  overlay.id = 'config-error-overlay';
  overlay.className = 'config-error-overlay';
  overlay.setAttribute('role', 'alert');
  overlay.setAttribute('aria-live', 'assertive');

  overlay.innerHTML = `
    <div class="config-error-container">
      <div class="config-error-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h1 class="config-error-title">Boss Office is not configured</h1>
      <p class="config-error-message">Fix configuration before proceeding.</p>
      <div class="config-error-fields">
        <p class="config-error-fields-label">Missing configuration:</p>
        <ul class="config-error-fields-list" id="config-error-fields-list">
          ${errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}
        </ul>
      </div>
      <div class="config-error-instructions">
        <p>To fix this issue:</p>
        <ol>
          <li>Check your <code>.env</code> file contains all required values</li>
          <li>Verify environment variables are set correctly</li>
          <li>Restart the application</li>
        </ol>
      </div>
    </div>
  `;

  return overlay;
}

/**
 * Update existing overlay with new errors
 */
function updateConfigErrorOverlay(overlay: HTMLElement, errors: string[]): void {
  const list = overlay.querySelector('#config-error-fields-list');
  if (list) {
    list.innerHTML = errors.map(e => `<li>${escapeHtml(e)}</li>`).join('');
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========== INITIALIZATION ==========

/**
 * Initialize configuration state handler
 * Per contracts/health.yaml: Frontend MUST call /api/health on page load
 *
 * @param options - Configuration options
 */
export async function initConfigState(options: ConfigStateOptions = {}): Promise<void> {
  const {
    apiBaseUrl = '',
    pollInterval = 30000,
    onStateChange
  } = options;

  // Initial check
  await checkConfigState(apiBaseUrl, onStateChange);

  // Setup polling if enabled
  if (pollInterval > 0) {
    pollTimer = setInterval(() => {
      checkConfigState(apiBaseUrl, onStateChange);
    }, pollInterval);
  }
}

/**
 * Check configuration state and update UI
 */
async function checkConfigState(
  apiBaseUrl: string,
  onStateChange?: (state: ConfigurationState, errors?: string[]) => void
): Promise<void> {
  try {
    const health = await fetchHealthStatus(apiBaseUrl);

    const newState = health.config_state;
    const newErrors = health.errors || [];

    // Check if state changed
    if (newState !== currentState) {
      currentState = newState;
      currentErrors = newErrors;

      // Notify callback
      if (onStateChange) {
        onStateChange(newState, newErrors);
      }

      // Update UI
      if (newState === ConfigurationState.CONFIG_ERROR) {
        showConfigErrorOverlay(newErrors);
      } else {
        hideConfigErrorOverlay();
      }
    }
  } catch (error) {
    // Network error - assume config error for safety
    console.error('[ConfigState] Failed to fetch health status:', error);

    if (currentState !== ConfigurationState.CONFIG_ERROR) {
      currentState = ConfigurationState.CONFIG_ERROR;
      currentErrors = ['Unable to reach server'];

      if (onStateChange) {
        onStateChange(ConfigurationState.CONFIG_ERROR, currentErrors);
      }

      showConfigErrorOverlay(currentErrors);
    }
  }
}

/**
 * Stop polling for configuration state
 */
export function stopConfigStatePolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/**
 * Get current configuration state
 */
export function getConfigState(): ConfigurationState | null {
  return currentState;
}

/**
 * Get current configuration errors
 */
export function getConfigErrors(): string[] {
  return currentErrors;
}

/**
 * Check if configuration is valid
 */
export function isConfigValid(): boolean {
  return currentState === ConfigurationState.VALID;
}
