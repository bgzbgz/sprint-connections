/**
 * Fast Track State Machine - Status Transitions
 * Spec: 011-status-audit-log
 * Per data-model.md, research.md RQ-002, RQ-003
 *
 * Centralized control for all job status transitions with atomic audit logging
 */

import { Job, JobStatus } from '../models/job';
import {
  AuditLogEntry,
  AuditLogResponse,
  AuditLogListResponse,
  ActorType,
  CreateAuditLogInput,
  createAuditLogEntry,
  auditLogToResponse
} from '../models/auditLog';

// ========== VALID TRANSITIONS (FR-002) ==========

/**
 * State machine: Valid status transitions
 * Key = from status (null for creation)
 * Value = array of valid target statuses
 */
export const VALID_TRANSITIONS: Map<JobStatus | null, JobStatus[]> = new Map([
  [null, [JobStatus.DRAFT]],
  [JobStatus.DRAFT, [JobStatus.SENT, JobStatus.FAILED_SEND]],
  [JobStatus.SENT, [JobStatus.READY_FOR_REVIEW, JobStatus.FACTORY_FAILED]],
  [JobStatus.READY_FOR_REVIEW, [
    JobStatus.DEPLOY_REQUESTED,
    JobStatus.REVISION_REQUESTED,
    JobStatus.REJECTED
  ]],
  [JobStatus.DEPLOY_REQUESTED, [JobStatus.DEPLOYED]],
  [JobStatus.REVISION_REQUESTED, [JobStatus.SENT]],
  // Terminal states - no outgoing transitions
  [JobStatus.FAILED_SEND, []],
  [JobStatus.FACTORY_FAILED, []],
  [JobStatus.DEPLOYED, []],
  [JobStatus.REJECTED, []]
]);

// ========== TRANSITION VALIDATION ==========

/**
 * Check if a status transition is valid
 *
 * @param from - Current status (null for new job)
 * @param to - Target status
 * @returns true if transition is allowed
 */
export function canTransition(from: JobStatus | null, to: JobStatus): boolean {
  const allowedTargets = VALID_TRANSITIONS.get(from);
  if (!allowedTargets) {
    return false;
  }
  return allowedTargets.includes(to);
}

/**
 * Get error message for invalid transition
 *
 * @param from - Current status
 * @param to - Attempted target status
 * @returns Human-readable error message
 */
export function getInvalidTransitionError(from: JobStatus | null, to: JobStatus): string {
  const fromStr = from || 'null';
  const allowedTargets = VALID_TRANSITIONS.get(from);

  if (!allowedTargets || allowedTargets.length === 0) {
    return `Status ${fromStr} is terminal and cannot transition to any other status`;
  }

  return `Invalid transition: ${fromStr} → ${to}. Allowed: ${allowedTargets.join(', ')}`;
}

// ========== IN-MEMORY STORAGE (TODO: Replace with MongoDB) ==========

// Temporary in-memory storage for audit logs
// TODO: Replace with MongoDB collection
const auditLogStore: AuditLogEntry[] = [];
let auditIdCounter = 1;

/**
 * Create audit log entry in storage
 * Internal function - not exposed via API
 */
async function createAuditLog(input: CreateAuditLogInput): Promise<AuditLogEntry> {
  const entry: AuditLogEntry = {
    _id: `audit_${auditIdCounter++}`,
    ...createAuditLogEntry(input)
  };

  auditLogStore.push(entry);

  console.log('[AuditLog] Entry created:', {
    id: entry._id,
    job_id: entry.job_id,
    transition: `${entry.from_status || 'null'} → ${entry.to_status}`,
    actor: entry.actor,
    note: entry.note || 'N/A'
  });

  return entry;
}

// ========== CORE TRANSITION FUNCTION ==========

/**
 * Result of a job transition
 */
export interface TransitionResult {
  success: boolean;
  job?: Job;
  auditEntry?: AuditLogEntry;
  error?: string;
}

/**
 * Execute status transition with atomic audit logging
 *
 * This is the ONLY way to change a job's status.
 * Every call creates an audit log entry (FR-004).
 *
 * @param job - The job to transition
 * @param toStatus - Target status
 * @param actor - Who initiated the transition (SR-003: server-determined)
 * @param note - Optional note (max 1000 chars)
 * @returns TransitionResult with updated job and audit entry
 */
export async function transitionJob(
  job: Job,
  toStatus: JobStatus,
  actor: ActorType,
  note?: string
): Promise<TransitionResult> {
  const fromStatus = job.status;

  // Validate transition
  if (!canTransition(fromStatus, toStatus)) {
    return {
      success: false,
      error: getInvalidTransitionError(fromStatus, toStatus)
    };
  }

  // Validate note length
  if (note && note.length > 1000) {
    return {
      success: false,
      error: 'Note exceeds maximum length of 1000 characters'
    };
  }

  // Create audit log entry (FR-004: automatic logging)
  const auditEntry = await createAuditLog({
    job_id: job.job_id,
    from_status: fromStatus,
    to_status: toStatus,
    actor,
    note
  });

  // Update job status
  const updatedJob: Job = {
    ...job,
    status: toStatus
  };

  // TODO: In production, this should be an atomic MongoDB transaction
  // to ensure both job update and audit log creation succeed or both fail

  return {
    success: true,
    job: updatedJob,
    auditEntry
  };
}

/**
 * Create initial audit entry for a new job (null → DRAFT)
 * Called during job creation
 *
 * @param jobId - The new job's ID
 * @returns The created audit entry
 */
export async function createInitialAuditEntry(jobId: string): Promise<AuditLogEntry> {
  return createAuditLog({
    job_id: jobId,
    from_status: null,
    to_status: JobStatus.DRAFT,
    actor: ActorType.SYSTEM
  });
}

// ========== AUDIT LOG RETRIEVAL (FR-007, FR-008, FR-009) ==========

/**
 * Get audit log entries for a job with pagination
 *
 * @param jobId - Job ID to get audit log for
 * @param page - Page number (1-indexed), defaults to 1
 * @param limit - Entries per page, defaults to 50, max 100
 * @returns Paginated audit log entries in chronological order (oldest first)
 */
export async function getAuditLog(
  jobId: string,
  page: number = 1,
  limit: number = 50
): Promise<AuditLogListResponse> {
  // Clamp limit to max 100
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const safePage = Math.max(1, page);

  // Filter entries for this job
  const jobEntries = auditLogStore.filter(e => e.job_id === jobId);

  // Sort by timestamp ascending (oldest first) per FR-008
  const sorted = [...jobEntries].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  // Calculate pagination
  const total = sorted.length;
  const pages = Math.ceil(total / safeLimit);
  const skip = (safePage - 1) * safeLimit;

  // Get page of entries
  const pageEntries = sorted.slice(skip, skip + safeLimit);

  return {
    entries: pageEntries.map(auditLogToResponse),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages
    }
  };
}

/**
 * Check if any audit entries exist for a job
 * Used to verify job exists before returning 404
 */
export async function hasAuditEntries(jobId: string): Promise<boolean> {
  return auditLogStore.some(e => e.job_id === jobId);
}

// ========== EXPORTS ==========

export { ActorType } from '../models/auditLog';
