/**
 * Boss Office Unified App - JavaScript Controller
 * Feature: 013-boss-office-app + 014-pre-submission-questionnaire
 *
 * A single-page application with three views:
 * - Upload: Pre-submission questionnaire for tool requests
 * - Inbox: View approved tools ready for review
 * - Preview: Review and take action on tools
 */

(function() {
  'use strict';

  // ============================================================
  // CONFIGURATION
  // ============================================================
  const CONFIG = {
    API_BASE: 'http://localhost:3000/api/boss',
    POLL_INTERVAL: 10000, // 10 seconds
    ERROR_TIMEOUT: 5000,  // 5 seconds
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['pdf', 'docx', 'txt', 'md'],
    STORAGE_KEY: 'bossOfficeState'
  };

  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  const state = {
    currentView: 'inbox',
    selectedJobId: null,
    selectedJob: null,
    inboxJobs: [],
    isLoading: false,
    loadingMessage: null,
    error: null,
    // Questionnaire state
    questionnaire: {
      currentStep: 1,
      answers: {
        decision: '',
        teaching: '',
        inputTypes: [],
        scoringCriteria: ''
      },
      isSubmitting: false,
      uploadFile: null
    }
  };

  // Questionnaire constants
  const QUESTIONNAIRE = {
    TOTAL_STEPS: 4,
    REVIEW_STEP: 5,
    MIN_TEXT_LENGTH: 10,
    QUESTIONS: [
      { id: 'decision', step: 1, question: 'What decision should the user make by the end of this tool?', inputType: 'text', maxLength: 500, placeholder: 'Describe the key decision or outcome...' },
      { id: 'teaching', step: 2, question: 'What is the one thing this tool will teach them?', inputType: 'text', maxLength: 500, placeholder: 'The main insight or learning...' },
      { id: 'inputTypes', step: 3, question: 'What inputs should the user provide?', inputType: 'multiselect' },
      { id: 'scoringCriteria', step: 4, question: 'What makes someone score HIGH vs LOW?', inputType: 'text', maxLength: 500, placeholder: 'Describe the scoring criteria...' }
    ],
    INPUT_TYPE_OPTIONS: [
      { value: 'numbers', label: 'Numbers/Metrics' },
      { value: 'yesno', label: 'Yes/No Questions' },
      { value: 'rating', label: 'Rating Scales' },
      { value: 'multiple', label: 'Multiple Choice' },
      { value: 'text', label: 'Text Responses' }
    ],
    STORAGE_KEY: 'ft_questionnaire_state'
  };

  let pollInterval = null;
  let errorTimeout = null;

  // ============================================================
  // DOM ELEMENTS (populated in initElements() after DOM is ready)
  // ============================================================
  let elements = {};

  /**
   * Initialize DOM element references - must be called after DOM is ready
   */
  function initElements() {
    elements = {
      // Navigation
      tabs: {
        upload: document.getElementById('tab-upload'),
        inbox: document.getElementById('tab-inbox'),
        preview: document.getElementById('tab-preview')
      },
      views: {
        upload: document.getElementById('view-upload'),
        inbox: document.getElementById('view-inbox'),
        preview: document.getElementById('view-preview')
      },
      inboxBadge: document.getElementById('inbox-badge'),

      // Global error
      globalError: document.getElementById('global-error'),
      errorText: document.getElementById('error-text'),
      errorDismiss: document.getElementById('error-dismiss'),

      // Questionnaire view (Upload)
      questionnaireContainer: document.getElementById('questionnaire-container'),
      progressIndicator: document.getElementById('progress-indicator'),
      progressText: document.getElementById('progress-text'),
      stepContainer: document.getElementById('step-container'),
      reviewContainer: document.getElementById('review-container'),
      questionText: document.getElementById('question-text'),
      textInputWrapper: document.getElementById('text-input-wrapper'),
      answerInput: document.getElementById('answer-input'),
      charCount: document.getElementById('char-count'),
      checkboxGroup: document.getElementById('checkbox-group'),
      validationError: document.getElementById('validation-error'),
      prevBtn: document.getElementById('prev-btn'),
      nextBtn: document.getElementById('next-btn'),
      submitBtn: document.getElementById('submit-btn'),
      submitError: document.getElementById('submit-error'),
      successMessage: document.getElementById('success-message'),
      reviewDecision: document.getElementById('review-decision'),
      reviewTeaching: document.getElementById('review-teaching'),
      reviewInputTypes: document.getElementById('review-input-types'),
      reviewScoring: document.getElementById('review-scoring'),

      // Dropzone (in review step)
      reviewDropzone: document.getElementById('review-dropzone'),
      dropzoneContent: document.getElementById('dropzone-content'),
      dropzoneFile: document.getElementById('dropzone-file'),
      fileInput: document.getElementById('file-input'),
      fileTypeBadge: document.getElementById('file-type-badge'),
      fileName: document.getElementById('file-name'),
      fileSize: document.getElementById('file-size'),
      removeFileBtn: document.getElementById('remove-file-btn'),

      // Inbox view
      inboxContainer: document.getElementById('inbox-container'),
      inboxLoading: document.getElementById('inbox-loading'),
      inboxEmpty: document.getElementById('inbox-empty'),
      inboxItems: document.getElementById('inbox-items'),
      inboxCount: document.getElementById('inbox-count'),

      // Preview view
      previewEmpty: document.getElementById('preview-empty'),
      previewContent: document.getElementById('preview-content'),
      previewMeta: document.getElementById('preview-meta'),
      previewTitle: document.getElementById('preview-title'),
      previewJobId: document.getElementById('preview-job-id'),
      previewTimestamp: document.getElementById('preview-timestamp'),
      backToInbox: document.getElementById('back-to-inbox'),
      openNewTab: document.getElementById('open-new-tab'),
      previewFrame: document.getElementById('preview-frame'),
      toolIframe: document.getElementById('tool-iframe'),
      previewLoading: document.getElementById('preview-loading'),
      qaPanel: document.getElementById('qa-panel'),
      qaStatus: document.getElementById('qa-status'),
      qaScore: document.getElementById('qa-score'),
      qaSummary: document.getElementById('qa-summary'),
      qaChecks: document.getElementById('qa-checks'),
      qaChecksSection: document.getElementById('qa-checks-section'),
      btnApprove: document.getElementById('btn-approve'),
      btnRevision: document.getElementById('btn-revision'),
      btnReject: document.getElementById('btn-reject'),

      // Modal
      modal: document.getElementById('modal'),
      modalBackdrop: document.getElementById('modal-backdrop'),
      modalTitle: document.getElementById('modal-title'),
      modalLabel: document.getElementById('modal-label'),
      modalInput: document.getElementById('modal-input'),
      modalHint: document.getElementById('modal-hint'),
      modalCancel: document.getElementById('modal-cancel'),
      modalSubmit: document.getElementById('modal-submit'),
      modalClose: document.getElementById('modal-close')
    };
  }

  // ============================================================
  // NAVIGATION
  // ============================================================
  function showView(viewName) {
    if (!['upload', 'inbox', 'preview'].includes(viewName)) {
      viewName = 'inbox';
    }

    state.currentView = viewName;

    // Update views visibility
    Object.keys(elements.views).forEach(key => {
      const view = elements.views[key];
      if (key === viewName) {
        view.hidden = false;
        view.setAttribute('aria-hidden', 'false');
      } else {
        view.hidden = true;
        view.setAttribute('aria-hidden', 'true');
      }
    });

    // Update tab states
    Object.keys(elements.tabs).forEach(key => {
      const tab = elements.tabs[key];
      if (key === viewName) {
        tab.classList.add('ft-header__nav-item--active');
        tab.setAttribute('aria-selected', 'true');
      } else {
        tab.classList.remove('ft-header__nav-item--active');
        tab.setAttribute('aria-selected', 'false');
      }
    });

    // Update URL hash
    if (window.location.hash !== '#' + viewName) {
      history.pushState(null, '', '#' + viewName);
    }

    // View-specific actions
    if (viewName === 'inbox') {
      fetchInbox();
      startPolling();
    } else {
      stopPolling();
    }

    if (viewName === 'preview') {
      if (state.selectedJobId) {
        fetchJobDetails(state.selectedJobId);
      } else {
        showPreviewEmpty();
      }
    }

    // Save state
    saveState();
  }

  function handleHashChange() {
    const hash = window.location.hash.slice(1) || 'inbox';
    showView(hash);
  }

  function handleTabClick(e) {
    e.preventDefault();
    const href = e.currentTarget.getAttribute('href');
    const viewName = href.slice(1);
    showView(viewName);
  }

  // ============================================================
  // STATE PERSISTENCE
  // ============================================================
  function saveState() {
    try {
      const toSave = {
        currentView: state.currentView,
        selectedJobId: state.selectedJobId
      };
      sessionStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  }

  function loadState() {
    try {
      const saved = sessionStorage.getItem(CONFIG.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentView) state.currentView = parsed.currentView;
        if (parsed.selectedJobId) state.selectedJobId = parsed.selectedJobId;
      }
    } catch (e) {
      console.warn('Failed to load state:', e);
    }
  }

  // ============================================================
  // ERROR HANDLING
  // ============================================================
  function showError(message) {
    state.error = message;
    elements.errorText.textContent = message;
    elements.globalError.hidden = false;

    // Auto-dismiss after timeout
    if (errorTimeout) clearTimeout(errorTimeout);
    errorTimeout = setTimeout(() => {
      hideError();
    }, CONFIG.ERROR_TIMEOUT);

    console.error('App Error:', message);
  }

  function hideError() {
    state.error = null;
    elements.globalError.hidden = true;
    if (errorTimeout) {
      clearTimeout(errorTimeout);
      errorTimeout = null;
    }
  }

  // ============================================================
  // API CALLS
  // ============================================================
  async function apiCall(endpoint, options = {}) {
    const url = CONFIG.API_BASE + endpoint;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // ============================================================
  // INBOX FUNCTIONALITY
  // ============================================================
  async function fetchInbox() {
    if (state.isLoading) return;

    state.isLoading = true;
    elements.inboxLoading.hidden = false;
    elements.inboxEmpty.hidden = true;
    elements.inboxItems.innerHTML = '';

    try {
      const jobs = await apiCall('/jobs/inbox');
      state.inboxJobs = jobs || [];
      renderInbox();
    } catch (error) {
      showError('Failed to load inbox. ' + error.message);
      elements.inboxEmpty.hidden = false;
    } finally {
      state.isLoading = false;
      elements.inboxLoading.hidden = true;
    }
  }

  function renderInbox() {
    const jobs = state.inboxJobs;

    // Update count
    const count = jobs.length;
    elements.inboxCount.textContent = count + (count === 1 ? ' tool' : ' tools');

    // Update badge
    if (count > 0) {
      elements.inboxBadge.textContent = count;
      elements.inboxBadge.hidden = false;
    } else {
      elements.inboxBadge.hidden = true;
    }

    // Show empty state or items
    if (count === 0) {
      elements.inboxEmpty.hidden = false;
      elements.inboxItems.innerHTML = '';
      return;
    }

    elements.inboxEmpty.hidden = true;

    // Render items
    elements.inboxItems.innerHTML = jobs.map(job => `
      <article class="inbox-item" data-job-id="${job.job_id}" tabindex="0" role="button">
        <header class="inbox-item__header">
          <h2 class="inbox-item__title">${escapeHtml(job.original_filename || job.tool_id || 'Untitled')}</h2>
          <span class="inbox-item__time">${formatTime(job.callback_received_at)}</span>
        </header>
        <div class="inbox-item__meta">
          <span class="inbox-item__job-id">${job.job_id}</span>
        </div>
        <div class="inbox-item__footer">
          <span class="inbox-item__qa">
            ${job.qa_status || 'PASS'} - Score: ${job.qa_report?.score || '--'}/100
            ${job.qa_report?.summary ? ' - ' + escapeHtml(truncate(job.qa_report.summary, 80)) : ''}
          </span>
        </div>
      </article>
    `).join('');

    // Add click listeners
    elements.inboxItems.querySelectorAll('.inbox-item').forEach(item => {
      item.addEventListener('click', () => handleInboxItemClick(item.dataset.jobId));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleInboxItemClick(item.dataset.jobId);
        }
      });
    });
  }

  function handleInboxItemClick(jobId) {
    state.selectedJobId = jobId;
    saveState();
    showView('preview');
  }

  function startPolling() {
    stopPolling();
    pollInterval = setInterval(() => {
      if (state.currentView === 'inbox' && !state.isLoading) {
        fetchInbox();
      }
    }, CONFIG.POLL_INTERVAL);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  // ============================================================
  // PREVIEW FUNCTIONALITY
  // ============================================================
  async function fetchJobDetails(jobId) {
    if (!jobId) {
      showPreviewEmpty();
      return;
    }

    elements.previewEmpty.hidden = true;
    elements.previewContent.hidden = false;
    elements.previewFrame.classList.add('preview-frame--loading');

    try {
      const job = await apiCall('/jobs/' + jobId);
      state.selectedJob = job;
      renderPreview(job);
    } catch (error) {
      showError('Failed to load job details. ' + error.message);
      showPreviewEmpty();
    }
  }

  function renderPreview(job) {
    // Meta info
    elements.previewTitle.textContent = job.original_filename || job.tool_id || 'Untitled';
    elements.previewJobId.textContent = job.job_id;
    elements.previewTimestamp.textContent = formatTime(job.callback_received_at);

    // Tool iframe
    if (job.tool_html) {
      elements.toolIframe.srcdoc = job.tool_html;
    } else {
      elements.toolIframe.srcdoc = '<html><body><p style="padding:20px;font-family:sans-serif;color:#B2B2B2;">No tool HTML available.</p></body></html>';
    }
    elements.previewFrame.classList.remove('preview-frame--loading');

    // QA Panel
    const qaStatus = job.qa_status || 'PASS';
    elements.qaStatus.textContent = qaStatus;
    elements.qaStatus.className = 'qa-panel__status qa-panel__status--' + qaStatus;

    if (job.qa_report) {
      elements.qaScore.textContent = (job.qa_report.score || '--') + '/100';
      elements.qaSummary.textContent = job.qa_report.summary || 'No summary available.';

      // Render checks if available
      if (job.qa_report.checks && Object.keys(job.qa_report.checks).length > 0) {
        elements.qaChecksSection.hidden = false;
        elements.qaChecks.innerHTML = Object.entries(job.qa_report.checks).map(([name, check]) => {
          const passClass = check.pass ? 'qa-panel__list--passed' : 'qa-panel__list--failed';
          const icon = check.pass ? '✓' : '✗';
          return `<li class="${passClass}">${icon} ${escapeHtml(name)}: ${escapeHtml(check.note || '')}</li>`;
        }).join('');
      } else {
        elements.qaChecksSection.hidden = true;
      }
    } else {
      elements.qaScore.textContent = '--/100';
      elements.qaSummary.textContent = 'No QA report available.';
      elements.qaChecksSection.hidden = true;
    }

    // Enable/disable action buttons based on status
    const canAct = job.status === 'READY_FOR_REVIEW';
    elements.btnApprove.disabled = !canAct;
    elements.btnRevision.disabled = !canAct;
    elements.btnReject.disabled = !canAct;
  }

  function showPreviewEmpty() {
    elements.previewEmpty.hidden = false;
    elements.previewContent.hidden = true;
    state.selectedJob = null;
  }

  function openInNewTab() {
    if (!state.selectedJob || !state.selectedJob.tool_html) {
      showError('No tool HTML to display.');
      return;
    }

    const blob = new Blob([state.selectedJob.tool_html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');

    // Clean up blob URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  // ============================================================
  // BOSS ACTIONS
  // ============================================================
  async function approveJob() {
    if (!state.selectedJobId) return;

    const confirmed = confirm('Approve this tool for deployment?');
    if (!confirmed) return;

    try {
      state.isLoading = true;
      elements.btnApprove.disabled = true;
      elements.btnApprove.textContent = 'Approving...';

      await apiCall('/jobs/' + state.selectedJobId + '/approve', {
        method: 'POST',
        body: JSON.stringify({ note: '' })
      });

      // Success - return to inbox
      state.selectedJobId = null;
      state.selectedJob = null;
      saveState();
      showView('inbox');
      showSuccess('Tool approved successfully.');
    } catch (error) {
      showError('Failed to approve. ' + error.message);
    } finally {
      state.isLoading = false;
      elements.btnApprove.disabled = false;
      elements.btnApprove.textContent = 'Approve';
    }
  }

  function openRejectModal() {
    openModal({
      title: 'REJECT TOOL',
      label: 'Rejection reason (required)',
      hint: 'Explain why this tool is being rejected.',
      required: true,
      onSubmit: async (note) => {
        if (!note.trim()) {
          showError('Rejection reason is required.');
          return false;
        }
        await rejectJob(note);
        return true;
      }
    });
  }

  async function rejectJob(note) {
    if (!state.selectedJobId) return;

    try {
      state.isLoading = true;
      elements.modalSubmit.disabled = true;
      elements.modalSubmit.textContent = 'Rejecting...';

      await apiCall('/jobs/' + state.selectedJobId + '/reject', {
        method: 'POST',
        body: JSON.stringify({ note })
      });

      closeModal();
      state.selectedJobId = null;
      state.selectedJob = null;
      saveState();
      showView('inbox');
      showSuccess('Tool rejected.');
    } catch (error) {
      showError('Failed to reject. ' + error.message);
    } finally {
      state.isLoading = false;
      elements.modalSubmit.disabled = false;
      elements.modalSubmit.textContent = 'Submit';
    }
  }

  function openRevisionModal() {
    openModal({
      title: 'REQUEST REVISION',
      label: 'Feedback (optional)',
      hint: 'Describe what changes are needed.',
      required: false,
      onSubmit: async (feedback) => {
        await requestRevision(feedback);
        return true;
      }
    });
  }

  async function requestRevision(feedback) {
    if (!state.selectedJobId) return;

    try {
      state.isLoading = true;
      elements.modalSubmit.disabled = true;
      elements.modalSubmit.textContent = 'Requesting...';

      await apiCall('/jobs/' + state.selectedJobId + '/request-revision', {
        method: 'POST',
        body: JSON.stringify({ feedback })
      });

      closeModal();
      state.selectedJobId = null;
      state.selectedJob = null;
      saveState();
      showView('inbox');
      showSuccess('Revision requested.');
    } catch (error) {
      showError('Failed to request revision. ' + error.message);
    } finally {
      state.isLoading = false;
      elements.modalSubmit.disabled = false;
      elements.modalSubmit.textContent = 'Submit';
    }
  }

  function showSuccess(message) {
    // Temporarily use the error display with a success message style
    // In a production app, you'd have a separate success notification
    state.error = message;
    elements.errorText.textContent = message;
    elements.globalError.hidden = false;
    elements.globalError.style.backgroundColor = 'var(--ft-color-white)';
    elements.globalError.style.borderColor = 'var(--ft-color-black)';

    if (errorTimeout) clearTimeout(errorTimeout);
    errorTimeout = setTimeout(() => {
      hideError();
      elements.globalError.style.backgroundColor = '';
      elements.globalError.style.borderColor = '';
    }, 3000);
  }

  // ============================================================
  // MODAL
  // ============================================================
  let modalCallback = null;

  function openModal({ title, label, hint, required, onSubmit }) {
    elements.modalTitle.textContent = title;
    elements.modalLabel.textContent = label;
    elements.modalHint.textContent = hint || '';
    elements.modalInput.value = '';
    elements.modalInput.required = required;
    elements.modalSubmit.disabled = required;
    modalCallback = onSubmit;

    elements.modal.hidden = false;
    elements.modalInput.focus();

    // Update submit button state for required fields
    if (required) {
      elements.modalInput.addEventListener('input', updateModalSubmitState);
    }
  }

  function closeModal() {
    elements.modal.hidden = true;
    elements.modalInput.value = '';
    elements.modalInput.removeEventListener('input', updateModalSubmitState);
    modalCallback = null;
  }

  function updateModalSubmitState() {
    elements.modalSubmit.disabled = elements.modalInput.required && !elements.modalInput.value.trim();
  }

  async function handleModalSubmit() {
    if (modalCallback) {
      const value = elements.modalInput.value.trim();
      const success = await modalCallback(value);
      if (success) {
        closeModal();
      }
    }
  }

  // ============================================================
  // QUESTIONNAIRE FUNCTIONALITY
  // ============================================================

  function getQuestionByStep(step) {
    return QUESTIONNAIRE.QUESTIONS.find(q => q.step === step);
  }

  function initQuestionnaire() {
    // Try to restore state from localStorage
    loadQuestionnaireFromStorage();

    // Setup event listeners
    if (elements.nextBtn) {
      elements.nextBtn.addEventListener('click', handleQuestionnaireNext);
    }
    if (elements.prevBtn) {
      elements.prevBtn.addEventListener('click', handleQuestionnairePrevious);
    }
    if (elements.answerInput) {
      elements.answerInput.addEventListener('input', handleTextInput);
      elements.answerInput.addEventListener('keydown', handleQuestionnaireKeyDown);
    }
    if (elements.checkboxGroup) {
      elements.checkboxGroup.addEventListener('change', handleCheckboxChange);
    }
    if (elements.submitBtn) {
      elements.submitBtn.addEventListener('click', handleQuestionnaireSubmit);
    }

    // Edit buttons (delegated)
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (target.matches && target.matches('[data-edit-step]')) {
        const step = parseInt(target.getAttribute('data-edit-step') || '1', 10);
        handleQuestionnaireEdit(step);
      }
    });

    // Initialize dropzone
    initDropzone();

    // Render initial state
    renderQuestionnaire();
  }

  function renderQuestionnaire() {
    const { currentStep } = state.questionnaire;

    // Update progress indicator
    renderProgressIndicator(currentStep);

    // Hide success message by default
    hideQuestionnaireSuccess();

    if (currentStep === QUESTIONNAIRE.REVIEW_STEP) {
      renderReviewStep();
    } else {
      renderQuestionStep(currentStep);
    }
  }

  function renderProgressIndicator(currentStep) {
    if (!elements.progressIndicator || !elements.progressText) return;

    const steps = elements.progressIndicator.querySelectorAll('.ft-questionnaire__progress-step');
    steps.forEach((step, index) => {
      const stepNum = index + 1;
      step.classList.remove('ft-questionnaire__progress-step--active', 'ft-questionnaire__progress-step--completed');

      if (stepNum < currentStep) {
        step.classList.add('ft-questionnaire__progress-step--completed');
      } else if (stepNum === currentStep) {
        step.classList.add('ft-questionnaire__progress-step--active');
      }
    });

    if (currentStep === QUESTIONNAIRE.REVIEW_STEP) {
      elements.progressText.textContent = 'REVIEW';
    } else {
      elements.progressText.textContent = `STEP ${currentStep} OF ${QUESTIONNAIRE.TOTAL_STEPS}`;
    }
  }

  function renderQuestionStep(step) {
    const question = getQuestionByStep(step);
    if (!question) return;

    const { answers } = state.questionnaire;

    // Show step container, hide review
    if (elements.stepContainer) elements.stepContainer.hidden = false;
    if (elements.reviewContainer) elements.reviewContainer.hidden = true;

    // Update question text
    if (elements.questionText) {
      elements.questionText.textContent = question.question;
    }

    // Show appropriate input type
    if (question.inputType === 'text') {
      if (elements.textInputWrapper) elements.textInputWrapper.hidden = false;
      if (elements.checkboxGroup) elements.checkboxGroup.hidden = true;

      if (elements.answerInput) {
        elements.answerInput.value = answers[question.id] || '';
        elements.answerInput.placeholder = question.placeholder || '';
        elements.answerInput.maxLength = question.maxLength;
        updateCharCount();
        setTimeout(() => elements.answerInput.focus(), 100);
      }
    } else if (question.inputType === 'multiselect') {
      if (elements.textInputWrapper) elements.textInputWrapper.hidden = true;
      if (elements.checkboxGroup) elements.checkboxGroup.hidden = false;

      const checkboxes = elements.checkboxGroup?.querySelectorAll('input[type="checkbox"]');
      checkboxes?.forEach((cb) => {
        const isChecked = answers.inputTypes.includes(cb.value);
        cb.checked = isChecked;
        const parent = cb.closest('.ft-questionnaire__checkbox-item');
        if (parent) {
          parent.classList.toggle('ft-questionnaire__checkbox-item--selected', isChecked);
        }
      });
    }

    // Show/hide Previous button
    if (elements.prevBtn) {
      elements.prevBtn.hidden = step === 1;
    }

    // Update Next button text
    if (elements.nextBtn) {
      elements.nextBtn.textContent = step === 4 ? 'Review' : 'Next';
    }

    hideValidationError();
  }

  function renderReviewStep() {
    const { answers } = state.questionnaire;

    if (elements.stepContainer) elements.stepContainer.hidden = true;
    if (elements.reviewContainer) elements.reviewContainer.hidden = false;

    if (elements.reviewDecision) {
      elements.reviewDecision.textContent = answers.decision || '(not answered)';
    }

    if (elements.reviewTeaching) {
      elements.reviewTeaching.textContent = answers.teaching || '(not answered)';
    }

    if (elements.reviewInputTypes) {
      elements.reviewInputTypes.innerHTML = '';
      if (answers.inputTypes.length > 0) {
        answers.inputTypes.forEach(type => {
          const option = QUESTIONNAIRE.INPUT_TYPE_OPTIONS.find(o => o.value === type);
          if (option) {
            const tag = document.createElement('span');
            tag.className = 'ft-questionnaire__review-tag';
            tag.textContent = option.label;
            elements.reviewInputTypes.appendChild(tag);
          }
        });
      } else {
        elements.reviewInputTypes.innerHTML = '<span class="ft-text-muted">(none selected)</span>';
      }
    }

    if (elements.reviewScoring) {
      elements.reviewScoring.textContent = answers.scoringCriteria || '(not answered)';
    }

    hideSubmitError();
  }

  function handleQuestionnaireNext() {
    const { currentStep } = state.questionnaire;

    // Validate current step
    const validation = validateCurrentStep();
    if (!validation.valid) {
      showValidationError(validation.error || 'This field is required');
      return;
    }

    // Advance to next step
    if (currentStep < QUESTIONNAIRE.REVIEW_STEP) {
      state.questionnaire.currentStep = currentStep + 1;
      saveQuestionnaireToStorage();
      renderQuestionnaire();
    }
  }

  function handleQuestionnairePrevious() {
    const { currentStep } = state.questionnaire;
    if (currentStep > 1) {
      state.questionnaire.currentStep = currentStep - 1;
      saveQuestionnaireToStorage();
      renderQuestionnaire();
    }
  }

  function handleQuestionnaireEdit(step) {
    state.questionnaire.currentStep = step;
    saveQuestionnaireToStorage();
    renderQuestionnaire();
  }

  function handleTextInput() {
    if (!elements.answerInput) return;

    const { currentStep } = state.questionnaire;
    const question = getQuestionByStep(currentStep);
    if (!question || question.inputType !== 'text') return;

    state.questionnaire.answers[question.id] = elements.answerInput.value;
    updateCharCount();
    hideValidationError();
    saveQuestionnaireToStorage();
  }

  function handleQuestionnaireKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuestionnaireNext();
    }
  }

  function handleCheckboxChange(e) {
    const target = e.target;
    if (!target.matches || !target.matches('input[type="checkbox"]')) return;

    const value = target.value;
    let newTypes = [...state.questionnaire.answers.inputTypes];

    if (target.checked) {
      if (!newTypes.includes(value)) newTypes.push(value);
    } else {
      newTypes = newTypes.filter(t => t !== value);
    }

    state.questionnaire.answers.inputTypes = newTypes;

    const parent = target.closest('.ft-questionnaire__checkbox-item');
    if (parent) {
      parent.classList.toggle('ft-questionnaire__checkbox-item--selected', target.checked);
    }

    hideValidationError();
    saveQuestionnaireToStorage();
  }

  function updateCharCount() {
    if (!elements.answerInput || !elements.charCount) return;

    const current = elements.answerInput.value.length;
    const max = elements.answerInput.maxLength || 500;

    elements.charCount.textContent = `${current}/${max}`;

    const isNearLimit = current > max * 0.9;
    elements.charCount.classList.toggle('ft-questionnaire__char-count--warning', isNearLimit);
  }

  function validateCurrentStep() {
    const { currentStep, answers } = state.questionnaire;

    if (currentStep === QUESTIONNAIRE.REVIEW_STEP) {
      return validateAllFields();
    }

    const question = getQuestionByStep(currentStep);
    if (!question) return { valid: true };

    if (question.inputType === 'text') {
      const value = (answers[question.id] || '').trim();
      if (!value) {
        return { valid: false, error: 'This field is required' };
      }
      if (value.length < QUESTIONNAIRE.MIN_TEXT_LENGTH) {
        return { valid: false, error: `Please enter at least ${QUESTIONNAIRE.MIN_TEXT_LENGTH} characters` };
      }
    }

    if (question.inputType === 'multiselect') {
      if (answers.inputTypes.length === 0) {
        return { valid: false, error: 'Please select at least one option' };
      }
    }

    return { valid: true };
  }

  function validateAllFields() {
    const { answers } = state.questionnaire;

    if (!answers.decision.trim() || answers.decision.trim().length < QUESTIONNAIRE.MIN_TEXT_LENGTH) {
      return { valid: false, error: 'Question 1: Please enter at least ' + QUESTIONNAIRE.MIN_TEXT_LENGTH + ' characters' };
    }
    if (!answers.teaching.trim() || answers.teaching.trim().length < QUESTIONNAIRE.MIN_TEXT_LENGTH) {
      return { valid: false, error: 'Question 2: Please enter at least ' + QUESTIONNAIRE.MIN_TEXT_LENGTH + ' characters' };
    }
    if (answers.inputTypes.length === 0) {
      return { valid: false, error: 'Question 3: Please select at least one option' };
    }
    if (!answers.scoringCriteria.trim() || answers.scoringCriteria.trim().length < QUESTIONNAIRE.MIN_TEXT_LENGTH) {
      return { valid: false, error: 'Question 4: Please enter at least ' + QUESTIONNAIRE.MIN_TEXT_LENGTH + ' characters' };
    }

    return { valid: true };
  }

  async function handleQuestionnaireSubmit() {
    const validation = validateAllFields();
    if (!validation.valid) {
      showSubmitError(validation.error || 'Please complete all fields');
      return;
    }

    showQuestionnaireLoading();

    try {
      const { answers, uploadFile } = state.questionnaire;
      const sourceData = {
        decision: answers.decision,
        teaching: answers.teaching,
        input_types: answers.inputTypes,
        scoring_criteria: answers.scoringCriteria
      };

      let response;

      if (uploadFile) {
        // Send as FormData with file
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('source', JSON.stringify(sourceData));

        response = await fetch(CONFIG.API_BASE + '/jobs', {
          method: 'POST',
          body: formData
        });
      } else {
        // Send as JSON (no file)
        response = await fetch(CONFIG.API_BASE + '/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: sourceData })
        });
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || error.error || 'Submission failed');
      }

      const result = await response.json();
      console.log('[Questionnaire] Submission successful, job_id:', result.job_id);

      hideQuestionnaireLoading();
      showQuestionnaireSuccess();
      clearQuestionnaireStorage();

      setTimeout(() => {
        resetQuestionnaire();
        renderQuestionnaire();
      }, 2000);

    } catch (error) {
      console.error('[Questionnaire] Submission failed:', error);
      hideQuestionnaireLoading();
      showSubmitError(error.message || 'Unable to submit. Please try again.');
    }
  }

  function showQuestionnaireLoading() {
    state.questionnaire.isSubmitting = true;
    if (elements.submitBtn) {
      elements.submitBtn.disabled = true;
      elements.submitBtn.classList.add('ft-questionnaire__submit--loading');
      elements.submitBtn.innerHTML = '<span class="ft-questionnaire__spinner"></span> Submitting...';
    }
  }

  function hideQuestionnaireLoading() {
    state.questionnaire.isSubmitting = false;
    if (elements.submitBtn) {
      elements.submitBtn.disabled = false;
      elements.submitBtn.classList.remove('ft-questionnaire__submit--loading');
      elements.submitBtn.textContent = 'Submit Tool Request';
    }
  }

  function showQuestionnaireSuccess() {
    if (elements.successMessage) {
      elements.successMessage.classList.remove('ft-questionnaire__success--hidden');
    }
    if (elements.reviewContainer) {
      elements.reviewContainer.hidden = true;
    }
  }

  function hideQuestionnaireSuccess() {
    if (elements.successMessage) {
      elements.successMessage.classList.add('ft-questionnaire__success--hidden');
    }
  }

  function showValidationError(message) {
    if (elements.validationError) {
      elements.validationError.textContent = message;
      elements.validationError.classList.remove('ft-questionnaire__error--hidden');
    }
    if (elements.answerInput) {
      elements.answerInput.classList.add('ft-questionnaire__textarea--invalid');
    }
  }

  function hideValidationError() {
    if (elements.validationError) {
      elements.validationError.classList.add('ft-questionnaire__error--hidden');
    }
    if (elements.answerInput) {
      elements.answerInput.classList.remove('ft-questionnaire__textarea--invalid');
    }
  }

  function showSubmitError(message) {
    if (elements.submitError) {
      elements.submitError.textContent = message;
      elements.submitError.classList.remove('ft-questionnaire__error--hidden');
    }
  }

  function hideSubmitError() {
    if (elements.submitError) {
      elements.submitError.classList.add('ft-questionnaire__error--hidden');
    }
  }

  function resetQuestionnaire() {
    state.questionnaire = {
      currentStep: 1,
      answers: {
        decision: '',
        teaching: '',
        inputTypes: [],
        scoringCriteria: ''
      },
      isSubmitting: false,
      uploadFile: null
    };

    // Reset dropzone UI
    if (elements.fileInput) elements.fileInput.value = '';
    if (elements.dropzoneContent) elements.dropzoneContent.hidden = false;
    if (elements.dropzoneFile) elements.dropzoneFile.hidden = true;
  }

  function saveQuestionnaireToStorage() {
    try {
      localStorage.setItem(QUESTIONNAIRE.STORAGE_KEY, JSON.stringify(state.questionnaire));
    } catch (e) {
      console.warn('[Questionnaire] Could not save to localStorage:', e);
    }
  }

  function loadQuestionnaireFromStorage() {
    try {
      const stored = localStorage.getItem(QUESTIONNAIRE.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.currentStep === 'number' && parsed.answers) {
          state.questionnaire = parsed;
          console.log('[Questionnaire] Restored state from localStorage, step:', parsed.currentStep);
          return true;
        }
      }
    } catch (e) {
      console.warn('[Questionnaire] Could not load from localStorage:', e);
    }
    return false;
  }

  function clearQuestionnaireStorage() {
    try {
      localStorage.removeItem(QUESTIONNAIRE.STORAGE_KEY);
    } catch (e) {
      console.warn('[Questionnaire] Could not clear localStorage:', e);
    }
  }

  // ============================================================
  // DROPZONE FUNCTIONALITY (in review step)
  // ============================================================

  function initDropzone() {
    if (!elements.reviewDropzone) return;

    // Drag and drop events
    elements.reviewDropzone.addEventListener('dragover', handleDragOver);
    elements.reviewDropzone.addEventListener('dragleave', handleDragLeave);
    elements.reviewDropzone.addEventListener('drop', handleDrop);

    // File input change
    if (elements.fileInput) {
      elements.fileInput.addEventListener('change', handleFileSelect);
    }

    // Remove file button
    if (elements.removeFileBtn) {
      elements.removeFileBtn.addEventListener('click', handleRemoveFile);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.reviewDropzone.classList.add('ft-questionnaire__dropzone--drag-over');
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.reviewDropzone.classList.remove('ft-questionnaire__dropzone--drag-over');
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.reviewDropzone.classList.remove('ft-questionnaire__dropzone--drag-over');

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }

  function handleFileSelect(e) {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }

  function processFile(file) {
    // Validate file type
    const ext = file.name.split('.').pop().toLowerCase();
    if (!CONFIG.ALLOWED_TYPES.includes(ext)) {
      showSubmitError('Invalid file type. Use PDF, DOCX, TXT, or MD.');
      return;
    }

    // Validate file size
    if (file.size > CONFIG.MAX_FILE_SIZE) {
      showSubmitError('File too large. Maximum 10MB.');
      return;
    }

    // Store file
    state.questionnaire.uploadFile = file;

    // Update UI
    if (elements.fileTypeBadge) elements.fileTypeBadge.textContent = ext.toUpperCase();
    if (elements.fileName) elements.fileName.textContent = file.name;
    if (elements.fileSize) elements.fileSize.textContent = formatFileSize(file.size);

    if (elements.dropzoneContent) elements.dropzoneContent.hidden = true;
    if (elements.dropzoneFile) elements.dropzoneFile.hidden = false;

    hideSubmitError();
  }

  function handleRemoveFile() {
    state.questionnaire.uploadFile = null;
    if (elements.fileInput) elements.fileInput.value = '';
    if (elements.dropzoneContent) elements.dropzoneContent.hidden = false;
    if (elements.dropzoneFile) elements.dropzoneFile.hidden = true;
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ============================================================
  // KEYBOARD NAVIGATION
  // ============================================================
  function handleKeydown(e) {
    // Escape key
    if (e.key === 'Escape') {
      // Close modal if open
      if (!elements.modal.hidden) {
        closeModal();
        return;
      }

      // Clear selection in preview
      if (state.currentView === 'preview' && state.selectedJobId) {
        state.selectedJobId = null;
        state.selectedJob = null;
        saveState();
        showPreviewEmpty();
      }
    }
  }

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function truncate(str, maxLength) {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  }

  function formatTime(isoString) {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }).toUpperCase();
    } catch {
      return isoString;
    }
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================
  function init() {
    // Initialize DOM element references first
    initElements();

    // Load saved state
    loadState();

    // Set up navigation event listeners
    Object.values(elements.tabs).forEach(tab => {
      tab.addEventListener('click', handleTabClick);
    });

    // Hash change listener
    window.addEventListener('hashchange', handleHashChange);

    // Global keyboard listener
    document.addEventListener('keydown', handleKeydown);

    // Error dismiss
    elements.errorDismiss.addEventListener('click', hideError);

    // Initialize questionnaire
    initQuestionnaire();

    // Preview actions
    elements.backToInbox.addEventListener('click', () => showView('inbox'));
    elements.openNewTab.addEventListener('click', openInNewTab);
    elements.btnApprove.addEventListener('click', approveJob);
    elements.btnReject.addEventListener('click', openRejectModal);
    elements.btnRevision.addEventListener('click', openRevisionModal);

    // Modal
    elements.modalBackdrop.addEventListener('click', closeModal);
    elements.modalClose.addEventListener('click', closeModal);
    elements.modalCancel.addEventListener('click', closeModal);
    elements.modalSubmit.addEventListener('click', handleModalSubmit);
    elements.modalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !elements.modalSubmit.disabled) {
        e.preventDefault();
        handleModalSubmit();
      }
    });

    // Initial view based on URL hash or saved state
    const hash = window.location.hash.slice(1);
    if (hash && ['upload', 'inbox', 'preview'].includes(hash)) {
      showView(hash);
    } else {
      showView(state.currentView);
    }

    console.log('Boss Office initialized');
  }

  // Start the app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
