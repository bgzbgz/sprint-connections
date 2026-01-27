/**
 * Fast Track Audit Timeline - Types
 * Spec: 011-status-audit-log
 * Per data-model.md
 *
 * TypeScript interfaces for audit log display
 */

// ========== ACTOR TYPE ==========

/**
 * Actor types for audit log entries
 */
export type ActorType = 'BOSS' | 'FACTORY' | 'SYSTEM';

// ========== AUDIT LOG ENTRY ==========

/**
 * Single audit log entry from API
 */
export interface AuditLogEntry {
  id: string;
  job_id: string;
  from_status: string | null;
  to_status: string;
  timestamp: string;     // ISO 8601
  actor: ActorType;
  note?: string;
}

// ========== PAGINATION ==========

/**
 * Pagination metadata
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ========== AUDIT LOG LIST RESPONSE ==========

/**
 * Audit log list response with pagination
 * Per contracts/audit-log.yaml
 */
export interface AuditLogListResponse {
  entries: AuditLogEntry[];
  pagination: Pagination;
}

// ========== TIMELINE STATE ==========

/**
 * Timeline component state
 */
export interface TimelineState {
  entries: AuditLogEntry[];
  loading: boolean;
  error: string | null;
  pagination: Pagination | null;
}

/**
 * Initial timeline state
 */
export const INITIAL_TIMELINE_STATE: TimelineState = {
  entries: [],
  loading: true,
  error: null,
  pagination: null
};
