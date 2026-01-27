/**
 * Fast Track Upload - Type Definitions
 * Spec: 006-boss-office-upload
 */

// ========== FILE TYPES ==========

/**
 * Supported file types for upload
 */
export enum FileType {
  PDF = 'PDF',
  DOCX = 'DOCX',
  TXT = 'TXT',
  MD = 'MD'
}

/**
 * File extension to FileType mapping
 */
export const EXTENSION_MAP: Record<string, FileType> = {
  'pdf': FileType.PDF,
  'docx': FileType.DOCX,
  'txt': FileType.TXT,
  'md': FileType.MD
};

/**
 * Valid file extensions (lowercase)
 */
export const VALID_EXTENSIONS = Object.keys(EXTENSION_MAP);

// ========== JOB STATUS ==========

/**
 * Job lifecycle states
 * This spec only creates DRAFT jobs; other states in future specs
 */
export enum JobStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

// ========== VALIDATION ==========

/**
 * File validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  fileType?: FileType;
}

/**
 * Validation error codes
 */
export enum ValidationErrorCode {
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_EMPTY = 'FILE_EMPTY',
  MULTIPLE_FILES = 'MULTIPLE_FILES'
}

// ========== JOB ENTITY ==========

/**
 * Job entity interface
 */
export interface Job {
  job_id: string;
  original_filename: string;
  file_type: FileType;
  file_size_bytes: number;
  file_storage_key: string;
  created_at: string;
  status: JobStatus;
}

/**
 * Job creation response from API
 */
export interface CreateJobResponse {
  job_id: string;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  created_at: string;
  status: string;
}

// ========== STORED FILE ==========

/**
 * Stored file reference
 */
export interface StoredFile {
  storage_key: string;
  job_id: string;
  content_type: string;
  size_bytes: number;
  original_filename: string;
  uploaded_at: string;
}

// ========== CONSTANTS ==========

/**
 * Maximum file size: 10MB
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Maximum filename length
 */
export const MAX_FILENAME_LENGTH = 255;
