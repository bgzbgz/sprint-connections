/**
 * Fast Track Upload - File Validation
 * Spec: 006-boss-office-upload
 * Per contracts/validation.yaml
 */

import {
  ValidationResult,
  FileType,
  EXTENSION_MAP,
  VALID_EXTENSIONS,
  MAX_FILE_SIZE,
  MAX_FILENAME_LENGTH
} from './types';

// ========== ERROR MESSAGES ==========
// Per Fast Track DNA: Short, direct, actionable

export const ERROR_MESSAGES = {
  INVALID_FILE_TYPE: 'Wrong file type. Use PDF, DOCX, TXT, or MD.',
  FILE_TOO_LARGE: 'File too large. Split it.',
  FILE_EMPTY: 'File is empty. Upload a document with content.',
  MULTIPLE_FILES: 'One file at a time. Drop a single file.',
  NETWORK_ERROR: 'Upload failed. Check connection and try again.',
  STORAGE_ERROR: 'Storage unavailable. Try again later.'
};

// ========== VALIDATION FUNCTIONS ==========

/**
 * Validate a file for upload
 * Validation order per contracts/validation.yaml:
 * 1. File type (extension)
 * 2. Empty check
 * 3. Size check
 *
 * @param file - The file to validate
 * @returns ValidationResult with valid flag, error message if invalid, and fileType if valid
 */
export function validateFile(file: File): ValidationResult {
  // Check if file exists
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  // Check file extension
  const extension = getFileExtension(file.name);
  if (!extension || !VALID_EXTENSIONS.includes(extension)) {
    return { valid: false, error: ERROR_MESSAGES.INVALID_FILE_TYPE };
  }

  // Check empty file (0 bytes)
  if (file.size === 0) {
    return { valid: false, error: ERROR_MESSAGES.FILE_EMPTY };
  }

  // Check file size (max 10MB)
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: ERROR_MESSAGES.FILE_TOO_LARGE };
  }

  // Valid file
  const fileType = EXTENSION_MAP[extension];
  return { valid: true, fileType };
}

/**
 * Validate multiple files (reject if more than one)
 *
 * @param files - FileList from drop event or input
 * @returns ValidationResult
 */
export function validateFileCount(files: FileList | null): ValidationResult {
  if (!files || files.length === 0) {
    return { valid: false, error: 'No file selected.' };
  }

  if (files.length > 1) {
    return { valid: false, error: ERROR_MESSAGES.MULTIPLE_FILES };
  }

  return { valid: true };
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Get file extension in lowercase
 *
 * @param filename - The filename to extract extension from
 * @returns Lowercase extension without dot, or empty string if no extension
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return parts.pop()?.toLowerCase() || '';
}

/**
 * Format file size in human-readable format
 * Per data-model.md:
 * - < 1KB: bytes
 * - < 1MB: KB with 1 decimal
 * - >= 1MB: MB with 1 decimal
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB", "512 KB", "800 B")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Sanitize filename for storage
 * Removes invalid filesystem characters
 *
 * @param filename - Original filename
 * @returns Sanitized filename safe for storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    // Remove invalid filesystem characters
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    // Remove trailing dots
    .replace(/\.+$/, '')
    // Enforce max length
    .substring(0, MAX_FILENAME_LENGTH);
}

/**
 * Get FileType enum from filename
 *
 * @param filename - The filename
 * @returns FileType or undefined if not a valid extension
 */
export function getFileType(filename: string): FileType | undefined {
  const extension = getFileExtension(filename);
  return EXTENSION_MAP[extension];
}
