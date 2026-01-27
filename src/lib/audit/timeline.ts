/**
 * Fast Track Audit Timeline - Rendering Logic
 * Spec: 011-status-audit-log
 * Per contracts/timeline.yaml
 *
 * Timeline rendering for audit log display
 */

import { AuditLogEntry, TimelineState, INITIAL_TIMELINE_STATE } from './types';

// ========== DATE FORMATTING ==========

/**
 * Format ISO timestamp to display format
 * Example: "24 JAN 2026, 10:05"
 *
 * @param isoTimestamp - ISO 8601 timestamp string
 * @returns Formatted timestamp string (UPPERCASE)
 */
export function formatTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);

  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

// ========== STATUS FORMATTING ==========

/**
 * Format status for display
 * null becomes "NEW" for creation entries
 *
 * @param status - Status string or null
 * @returns Display string (UPPERCASE)
 */
function formatStatus(status: string | null): string {
  if (status === null) {
    return 'NEW';
  }
  return status;
}

// ========== RENDERING ==========

/**
 * Render a single timeline entry
 *
 * @param entry - Audit log entry to render
 * @returns HTML string for the entry
 */
export function renderTimelineEntry(entry: AuditLogEntry): string {
  const actorClass = entry.actor.toLowerCase();
  const fromStatus = formatStatus(entry.from_status);
  const toStatus = entry.to_status;
  const formattedTime = formatTimestamp(entry.timestamp);

  let html = `
    <article class="audit-timeline__entry audit-timeline__entry--${actorClass}"
             data-actor="${entry.actor}"
             data-timestamp="${entry.timestamp}">
      <div class="audit-timeline__header">
        <time class="audit-timeline__time" datetime="${entry.timestamp}">
          ${formattedTime}
        </time>
        <span class="audit-timeline__actor">${entry.actor}</span>
      </div>
      <div class="audit-timeline__transition">
        <span class="audit-timeline__from">${fromStatus}</span>
        <span class="audit-timeline__arrow">→</span>
        <span class="audit-timeline__to">${toStatus}</span>
      </div>`;

  // Add note if present
  if (entry.note) {
    html += `
      <p class="audit-timeline__note">${escapeHtml(entry.note)}</p>`;
  }

  html += `
    </article>`;

  return html;
}

/**
 * Render complete timeline from entries
 *
 * @param entries - Array of audit log entries
 * @returns HTML string for the timeline
 */
export function renderTimeline(entries: AuditLogEntry[]): string {
  if (entries.length === 0) {
    return renderEmptyState();
  }

  const entriesHtml = entries.map(renderTimelineEntry).join('');

  return `
    <section class="audit-timeline" aria-label="Job status history">
      ${entriesHtml}
    </section>
  `;
}

/**
 * Render loading state
 *
 * @returns HTML string for loading state
 */
export function renderLoadingState(): string {
  return `
    <div class="audit-timeline audit-timeline--loading">
      <div class="audit-timeline__loading">
        <span class="audit-timeline__loading-text">LOADING HISTORY...</span>
      </div>
    </div>
  `;
}

/**
 * Render empty state
 *
 * @returns HTML string for empty state
 */
export function renderEmptyState(): string {
  return `
    <div class="audit-timeline audit-timeline--empty">
      <div class="audit-timeline__empty">
        <span class="audit-timeline__empty-text">NO STATUS HISTORY</span>
      </div>
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
    <div class="audit-timeline audit-timeline--error">
      <div class="audit-timeline__error">
        <span class="audit-timeline__error-title">LOAD FAILED</span>
        <span class="audit-timeline__error-message">${escapeHtml(message)}</span>
      </div>
    </div>
  `;
}

/**
 * Render timeline based on state
 *
 * @param state - Timeline state
 * @returns HTML string for current state
 */
export function renderTimelineState(state: TimelineState): string {
  if (state.loading) {
    return renderLoadingState();
  }

  if (state.error) {
    return renderErrorState(state.error);
  }

  return renderTimeline(state.entries);
}

// ========== DOM UTILITIES ==========

/**
 * Mount timeline to a container element
 *
 * @param container - DOM element to mount to
 * @param state - Timeline state to render
 */
export function mountTimeline(container: HTMLElement, state: TimelineState): void {
  container.innerHTML = renderTimelineState(state);
}

/**
 * Escape HTML special characters to prevent XSS
 *
 * @param text - Text to escape
 * @returns Escaped text safe for HTML
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
