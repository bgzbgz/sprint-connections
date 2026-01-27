/**
 * Fast Track Upload - Dropzone Handler
 * Spec: 006-boss-office-upload
 * Per contracts/upload.yaml
 *
 * Handles drag-and-drop and file picker functionality
 */

import {
  validateFile,
  validateFileCount,
  formatFileSize,
  getFileType,
  ERROR_MESSAGES
} from './validation';
import { FileType, ValidationResult } from './types';
import { createJob } from '../../api/jobs';

// ========== STATE ==========

interface DropzoneState {
  selectedFile: File | null;
  isUploading: boolean;
  lastError: string | null;
}

const state: DropzoneState = {
  selectedFile: null,
  isUploading: false,
  lastError: null
};

// ========== DOM ELEMENTS ==========

let elements: {
  dropzone: HTMLElement | null;
  dropzoneContent: HTMLElement | null;
  fileInput: HTMLInputElement | null;
  fileInfo: HTMLElement | null;
  fileTypeBadge: HTMLElement | null;
  fileName: HTMLElement | null;
  fileSize: HTMLElement | null;
  removeBtn: HTMLElement | null;
  loadingState: HTMLElement | null;
  errorMessage: HTMLElement | null;
  errorText: HTMLElement | null;
  retryBtn: HTMLElement | null;
  successMessage: HTMLElement | null;
  jobIdDisplay: HTMLElement | null;
  submitBtn: HTMLButtonElement | null;
};

// ========== INITIALIZATION ==========

/**
 * Initialize the dropzone component
 * Call this after DOM is ready
 */
export function initDropzone(): void {
  // Get DOM elements
  elements = {
    dropzone: document.getElementById('dropzone'),
    dropzoneContent: document.getElementById('dropzone-content'),
    fileInput: document.getElementById('file-input') as HTMLInputElement,
    fileInfo: document.getElementById('file-info'),
    fileTypeBadge: document.getElementById('file-type-badge'),
    fileName: document.getElementById('file-name'),
    fileSize: document.getElementById('file-size'),
    removeBtn: document.getElementById('remove-btn'),
    loadingState: document.getElementById('loading-state'),
    errorMessage: document.getElementById('error-message'),
    errorText: document.getElementById('error-text'),
    retryBtn: document.getElementById('retry-btn'),
    successMessage: document.getElementById('success-message'),
    jobIdDisplay: document.getElementById('job-id-display'),
    submitBtn: document.getElementById('submit-btn') as HTMLButtonElement
  };

  if (!elements.dropzone) {
    console.error('Dropzone element not found');
    return;
  }

  // Setup event listeners
  setupDragAndDrop();
  setupFilePicker();
  setupButtons();
}

// ========== DRAG AND DROP ==========

function setupDragAndDrop(): void {
  const { dropzone } = elements;
  if (!dropzone) return;

  // Prevent default drag behaviors on window
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, preventDefaults, false);
  });

  // Highlight on drag enter/over
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, handleDragEnter, false);
  });

  // Remove highlight on drag leave/drop
  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, handleDragLeave, false);
  });

  // Handle drop
  dropzone.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e: Event): void {
  e.preventDefault();
  e.stopPropagation();
}

function handleDragEnter(): void {
  if (state.isUploading) return;
  elements.dropzone?.classList.add('ft-upload-dropzone--drag-over');
}

function handleDragLeave(): void {
  elements.dropzone?.classList.remove('ft-upload-dropzone--drag-over');
}

function handleDrop(e: DragEvent): void {
  if (state.isUploading) return;

  const files = e.dataTransfer?.files;

  // Validate file count
  const countResult = validateFileCount(files || null);
  if (!countResult.valid) {
    showError(countResult.error!);
    return;
  }

  // Process the single file
  if (files && files[0]) {
    handleFile(files[0]);
  }
}

// ========== FILE PICKER ==========

function setupFilePicker(): void {
  const { fileInput } = elements;
  if (!fileInput) return;

  fileInput.addEventListener('change', () => {
    if (state.isUploading) return;

    const files = fileInput.files;

    // Validate file count (should be 1 with single select)
    const countResult = validateFileCount(files);
    if (!countResult.valid) {
      showError(countResult.error!);
      return;
    }

    if (files && files[0]) {
      handleFile(files[0]);
    }
  });
}

// ========== FILE HANDLING ==========

function handleFile(file: File): void {
  // Clear previous state
  hideError();
  hideSuccess();

  // Validate file
  const result = validateFile(file);

  if (!result.valid) {
    showError(result.error!);
    return;
  }

  // Store selected file
  state.selectedFile = file;

  // Show file info
  showFileInfo(file, result.fileType!);
}

// ========== UI FUNCTIONS ==========

function showFileInfo(file: File, fileType: FileType): void {
  const { dropzoneContent, fileInfo, fileTypeBadge, fileName, fileSize, submitBtn } = elements;

  if (dropzoneContent) dropzoneContent.hidden = true;
  if (fileInfo) fileInfo.hidden = false;
  if (fileTypeBadge) fileTypeBadge.textContent = fileType;
  if (fileName) fileName.textContent = file.name;
  if (fileSize) fileSize.textContent = formatFileSize(file.size);
  if (submitBtn) submitBtn.disabled = false;
}

function hideFileInfo(): void {
  const { dropzoneContent, fileInfo, submitBtn } = elements;

  if (dropzoneContent) dropzoneContent.hidden = false;
  if (fileInfo) fileInfo.hidden = true;
  if (submitBtn) submitBtn.disabled = true;
}

function showError(message: string): void {
  const { errorMessage, errorText, retryBtn } = elements;

  state.lastError = message;

  if (errorMessage) errorMessage.hidden = false;
  if (errorText) errorText.textContent = message;

  // Show retry button for network/storage errors
  const isRetryable = message === ERROR_MESSAGES.NETWORK_ERROR ||
                      message === ERROR_MESSAGES.STORAGE_ERROR;
  if (retryBtn) retryBtn.hidden = !isRetryable;
}

function hideError(): void {
  const { errorMessage } = elements;
  state.lastError = null;
  if (errorMessage) errorMessage.hidden = true;
}

function showSuccess(jobId: string): void {
  const { successMessage, jobIdDisplay } = elements;

  if (successMessage) successMessage.hidden = false;
  if (jobIdDisplay) jobIdDisplay.textContent = `Job ID: ${jobId}`;
}

function hideSuccess(): void {
  const { successMessage } = elements;
  if (successMessage) successMessage.hidden = true;
}

function showLoading(): void {
  const { dropzone, dropzoneContent, fileInfo, loadingState, submitBtn } = elements;

  state.isUploading = true;

  if (dropzone) dropzone.classList.add('ft-upload-dropzone--disabled');
  if (dropzoneContent) dropzoneContent.hidden = true;
  if (fileInfo) fileInfo.hidden = true;
  if (loadingState) loadingState.hidden = false;
  if (submitBtn) submitBtn.disabled = true;
}

function hideLoading(): void {
  const { dropzone, loadingState } = elements;

  state.isUploading = false;

  if (dropzone) dropzone.classList.remove('ft-upload-dropzone--disabled');
  if (loadingState) loadingState.hidden = true;
}

// ========== BUTTONS ==========

function setupButtons(): void {
  const { removeBtn, retryBtn, submitBtn } = elements;

  // Remove button
  if (removeBtn) {
    removeBtn.addEventListener('click', clearFile);
  }

  // Retry button
  if (retryBtn) {
    retryBtn.addEventListener('click', handleRetry);
  }

  // Submit button
  if (submitBtn) {
    submitBtn.addEventListener('click', handleSubmit);
  }
}

function clearFile(): void {
  state.selectedFile = null;

  // Reset file input
  if (elements.fileInput) {
    elements.fileInput.value = '';
  }

  hideFileInfo();
  hideError();
  hideSuccess();
}

function handleRetry(): void {
  hideError();

  // If we have a file, retry upload
  if (state.selectedFile) {
    handleSubmit();
  }
}

async function handleSubmit(): Promise<void> {
  if (!state.selectedFile || state.isUploading) return;

  showLoading();
  hideError();

  try {
    const response = await createJob(state.selectedFile);

    hideLoading();
    showSuccess(response.job_id);

    // Clear file after successful upload
    state.selectedFile = null;
    if (elements.fileInput) {
      elements.fileInput.value = '';
    }

  } catch (error) {
    hideLoading();

    // Determine error type
    if (error instanceof TypeError || (error as Error).message?.includes('network')) {
      showError(ERROR_MESSAGES.NETWORK_ERROR);
    } else if ((error as Error).message?.includes('storage')) {
      showError(ERROR_MESSAGES.STORAGE_ERROR);
    } else {
      showError((error as Error).message || ERROR_MESSAGES.NETWORK_ERROR);
    }

    // Show file info again for retry
    if (state.selectedFile) {
      const fileType = getFileType(state.selectedFile.name);
      if (fileType) {
        showFileInfo(state.selectedFile, fileType);
      }
    }
  }
}

// ========== EXPORTS ==========

export {
  clearFile,
  handleRetry,
  handleSubmit,
  showError,
  hideError,
  showSuccess,
  hideSuccess
};
