# Boss Revision Webhook - n8n Implementation Guide

## Overview

This guide adds a new webhook endpoint that receives revision requests from the Boss Office. When the Boss clicks "Request Revision" and provides feedback, the workflow will modify the tool according to their instructions and return the revised version.

**Key Difference from QA Loop:** Boss revisions do NOT go through QA again - Boss overrides quality principles.

---

## New Webhook Flow

```
Boss Office                          n8n Workflow
     │                                    │
     │  POST /webhook/tool-revision       │
     │  {job_id, revision_notes,          │
     │   tool_html, tool_name}            │
     ├───────────────────────────────────►│
     │                                    │
     │                              Parse Revision Request
     │                                    │
     │                              Extract Current Config
     │                              from HTML
     │                                    │
     │                              Boss Revision Agent
     │                              (applies Boss feedback)
     │                                    │
     │                              Rebuild HTML
     │                                    │
     │   {status, tool_html_base64,       │
     │    revision_applied}               │
     │◄───────────────────────────────────┤
     │                                    │
```

---

## Step 1: Add "Webhook Revision" Node

**Add a new Webhook node to your canvas (separate from the main flow)**

| Setting | Value |
|---------|-------|
| **Type** | Webhook |
| **Name** | `Webhook Revision` |
| **HTTP Method** | POST |
| **Path** | `tool-revision` |
| **Response Mode** | Response Node |

This creates endpoint: `https://n8n-edge.fasttrack-diagnostic.com/webhook/tool-revision`

---

## Step 2: Add "Parse Revision Request" Code Node

**Add after "Webhook Revision"**

| Setting | Value |
|---------|-------|
| **Type** | Code |
| **Name** | `Parse Revision Request` |
| **Language** | JavaScript |

**Code:**

```javascript
// Parse Revision Request from Boss Office
const input = $input.first().json;

const job_id = input.job_id || `revision_${Date.now()}`;
const revision_notes = input.revision_notes || input.notes || '';
const tool_html = input.tool_html || '';
const tool_name = input.tool_name || 'Unknown Tool';
const tool_description = input.tool_description || '';

// Validate required fields
if (!revision_notes || revision_notes.trim().length < 5) {
  return [{
    json: {
      success: false,
      error: 'Revision notes are required (min 5 characters)',
      job_id: job_id
    }
  }];
}

if (!tool_html || tool_html.length < 100) {
  return [{
    json: {
      success: false,
      error: 'Tool HTML is required',
      job_id: job_id
    }
  }];
}

// Try to extract the TOOL_CONFIG from the HTML
// This contains the JSON configuration we can modify
let currentConfig = null;
try {
  const configMatch = tool_html.match(/const TOOL_CONFIG = \{[\s\S]*?scoreRanges:\s*(\[[\s\S]*?\])\s*\};/);
  if (configMatch) {
    // Extract key parts from the HTML
    const nameMatch = tool_html.match(/<title>([^|]+)\s*\|/);
    const taglineMatch = tool_html.match(/class="cover-tagline">([^<]+)</);
    const scoreRangesMatch = tool_html.match(/scoreRanges:\s*(\[[\s\S]*?\])\s*\}/);

    // Extract steps from HTML structure
    const stepsMatches = [...tool_html.matchAll(/class="step-title">([^<]+)</g)];
    const steps = stepsMatches.map((m, i) => ({
      id: `step${i + 1}`,
      title: m[1],
      description: '',
      inputs: []
    }));

    currentConfig = {
      tool_name: nameMatch ? nameMatch[1].trim() : tool_name,
      tool_description: tool_description,
      cover_tagline: taglineMatch ? taglineMatch[1] : '',
      steps: steps,
      score_ranges: scoreRangesMatch ? JSON.parse(scoreRangesMatch[1]) : []
    };
  }
} catch (e) {
  // If extraction fails, we'll work with the raw HTML
  currentConfig = {
    tool_name: tool_name,
    tool_description: tool_description
  };
}

return [{
  json: {
    success: true,
    job_id: job_id,
    revision_notes: revision_notes.trim(),
    tool_html: tool_html,
    tool_name: tool_name,
    tool_description: tool_description,
    current_config: currentConfig
  }
}];
```

---

## Step 3: Add "IF Revision Valid" Node

**Add after "Parse Revision Request"**

| Setting | Value |
|---------|-------|
| **Type** | IF |
| **Name** | `IF Revision Valid` |
| **Condition** | `{{ $json.success }}` equals `true` |

---

## Step 4: Add "Respond Revision Error" Node

**Add on FALSE branch of "IF Revision Valid"**

| Setting | Value |
|---------|-------|
| **Type** | Respond to Webhook |
| **Name** | `Respond Revision Error` |

**Response Body:**

```json
{
  "status": "error",
  "error": "{{ $json.error }}",
  "job_id": "{{ $json.job_id }}"
}
```

---

## Step 5: Add "Boss Revision Agent" Node

**Add on TRUE branch of "IF Revision Valid"**

| Setting | Value |
|---------|-------|
| **Type** | AI Agent (`@n8n/n8n-nodes-langchain.agent`) |
| **Name** | `Boss Revision Agent` |
| **Prompt** | Define below |

### User Prompt (Text):

```
The Boss has requested a revision to this Fast Track tool.

TOOL NAME: {{ $json.tool_name }}

BOSS'S REVISION REQUEST:
{{ $json.revision_notes }}

CURRENT TOOL HTML (excerpt - first 2000 chars):
{{ $json.tool_html.substring(0, 2000) }}

CURRENT CONFIGURATION (extracted):
{{ JSON.stringify($json.current_config, null, 2) }}

---

Apply the Boss's requested changes to the tool configuration. The Boss's feedback overrides any other criteria - implement EXACTLY what they asked for.

Output a JSON object with:
1. "revised_config" - The updated tool configuration
2. "changes_made" - A brief summary of what you changed

Output format:
{
  "revised_config": { ... full config object ... },
  "changes_made": "Brief description of changes"
}
```

### System Message (in Options):

```
You are a Fast Track Tool Revision Agent. Your job is to apply the Boss's feedback to tool configurations.

IMPORTANT RULES:
1. The Boss's instructions override ALL other criteria
2. Implement EXACTLY what the Boss requested
3. Do not add extra changes beyond what was requested
4. Preserve all parts of the tool that weren't mentioned
5. Keep the same JSON structure for the config

The Boss is the final authority - their word is law.

OUTPUT FORMAT:
{
  "revised_config": {
    "tool_name": "...",
    "tool_description": "...",
    "cover_tagline": "...",
    "intro_paragraphs": ["...", "..."],
    "steps": [...],
    "calculations": {...},
    "results_display": {...}
  },
  "changes_made": "Summary of changes applied"
}

Output ONLY valid JSON. No markdown, no explanations outside the JSON.
```

### Options:
- **Max Iterations:** 3

### Connect:
- Connect **Google Gemini Chat Model4** (or create a new one) to this agent

---

## Step 6: Add "Build Revised HTML" Code Node

**Add after "Boss Revision Agent"**

| Setting | Value |
|---------|-------|
| **Type** | Code |
| **Name** | `Build Revised HTML` |
| **Language** | JavaScript |

**Code:**

```javascript
// Build Revised HTML from Boss Revision Agent output
const previousData = $('Parse Revision Request').first().json;
const agentOutput = $input.first().json;

// Parse the agent's response
let revisedConfig = null;
let changesMade = 'Revision applied';

try {
  let outputText = agentOutput.output || agentOutput.text || JSON.stringify(agentOutput);

  // Clean up markdown if present
  outputText = outputText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const jsonMatch = outputText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    revisedConfig = parsed.revised_config || parsed;
    changesMade = parsed.changes_made || 'Revision applied';
  }
} catch (e) {
  // If parsing fails, return error
  return [{
    json: {
      success: false,
      error: 'Failed to parse revision: ' + e.message,
      job_id: previousData.job_id
    }
  }];
}

if (!revisedConfig) {
  return [{
    json: {
      success: false,
      error: 'No revised configuration generated',
      job_id: previousData.job_id
    }
  }];
}

// Helper function to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper function to generate input HTML based on type
function generateInputHtml(input, stepIndex) {
  const inputId = `${input.id}_${stepIndex}`;
  const label = escapeHtml(input.label);
  const placeholder = escapeHtml(input.placeholder || '');

  let inputHtml = '';

  switch (input.type) {
    case 'number':
      inputHtml = `
        <div class="input-group">
          <label for="${inputId}">${label}</label>
          <input type="number" id="${inputId}" name="${inputId}"
                 placeholder="${placeholder}"
                 ${input.min !== undefined ? `min="${input.min}"` : ''}
                 ${input.max !== undefined ? `max="${input.max}"` : ''}
                 ${input.default !== undefined ? `value="${input.default}"` : ''}
                 class="tool-input" data-input-id="${input.id}" />
        </div>`;
      break;

    case 'text':
      inputHtml = `
        <div class="input-group">
          <label for="${inputId}">${label}</label>
          <input type="text" id="${inputId}" name="${inputId}"
                 placeholder="${placeholder}"
                 ${input.default ? `value="${escapeHtml(input.default)}"` : ''}
                 class="tool-input" data-input-id="${input.id}" />
        </div>`;
      break;

    case 'select':
      const options = (input.options || []).map(opt =>
        `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`
      ).join('');
      inputHtml = `
        <div class="input-group">
          <label for="${inputId}">${label}</label>
          <select id="${inputId}" name="${inputId}" class="tool-input" data-input-id="${input.id}">
            <option value="">Select...</option>
            ${options}
          </select>
        </div>`;
      break;

    case 'range':
      const min = input.min || 0;
      const max = input.max || 100;
      const defaultVal = input.default || Math.floor((min + max) / 2);
      inputHtml = `
        <div class="input-group">
          <label for="${inputId}">${label}</label>
          <div class="range-container">
            <input type="range" id="${inputId}" name="${inputId}"
                   min="${min}" max="${max}" value="${defaultVal}"
                   class="tool-input tool-range" data-input-id="${input.id}" />
            <span class="range-value" id="${inputId}_value">${defaultVal}</span>
          </div>
        </div>`;
      break;

    case 'checkbox':
      inputHtml = `
        <div class="input-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" id="${inputId}" name="${inputId}"
                   ${input.default ? 'checked' : ''}
                   class="tool-input tool-checkbox" data-input-id="${input.id}" />
            <span>${label}</span>
          </label>
        </div>`;
      break;

    default:
      inputHtml = `
        <div class="input-group">
          <label for="${inputId}">${label}</label>
          <input type="text" id="${inputId}" name="${inputId}"
                 placeholder="${placeholder}"
                 class="tool-input" data-input-id="${input.id}" />
        </div>`;
  }

  return inputHtml;
}

// Generate steps HTML
function generateStepsHtml(steps) {
  return steps.map((step, index) => {
    const inputsHtml = (step.inputs || []).map(inp =>
      generateInputHtml(inp, index)
    ).join('\n');

    return `
      <div class="tool-step" data-step="${index + 1}" style="display: ${index === 0 ? 'block' : 'none'};">
        <div class="step-header">
          <span class="step-number">Step ${index + 1} of ${steps.length}</span>
          <h2 class="step-title">${escapeHtml(step.title)}</h2>
          <p class="step-description">${escapeHtml(step.description)}</p>
        </div>
        <div class="step-inputs">
          ${inputsHtml}
        </div>
        <div class="step-navigation">
          ${index > 0 ? '<button type="button" class="btn btn-secondary prev-btn">Previous</button>' : ''}
          ${index < steps.length - 1
            ? '<button type="button" class="btn btn-primary next-btn">Next</button>'
            : '<button type="button" class="btn btn-primary calculate-btn">Calculate</button>'}
        </div>
      </div>`;
  }).join('\n');
}

// Generate score ranges for JavaScript
function generateScoreRangesJs(ranges) {
  return JSON.stringify(ranges || [
    {min: 0, max: 33, verdict: "Low", color: "#4ECDC4", recommendation: "Low score"},
    {min: 34, max: 66, verdict: "Medium", color: "#FFF469", recommendation: "Medium score"},
    {min: 67, max: 100, verdict: "High", color: "#FF6B6B", recommendation: "High score"}
  ]);
}

// Build the complete HTML
const config = revisedConfig;
const toolName = escapeHtml(config.tool_name || 'Decision Tool');
const toolDescription = escapeHtml(config.tool_description || '');
const decisionQuestion = escapeHtml(config.decision_question || 'What should you do?');
const coverTagline = escapeHtml(config.cover_tagline || 'Make better decisions');
const introParagraphs = (config.intro_paragraphs || []).map(p => `<p>${escapeHtml(p)}</p>`).join('\n');
const stepsHtml = generateStepsHtml(config.steps || []);
const scoreRangesJs = generateScoreRangesJs(config.calculations?.score_ranges);
const nextSteps = (config.results_display?.next_steps || []).map(s => `<li>${escapeHtml(s)}</li>`).join('\n');
const totalSteps = (config.steps || []).length;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${toolName} | Fast Track</title>
    <style>
        @font-face {
            font-family: 'Plaak';
            src: url('https://fasttrack-diagnostic.com/fonts/Plaak3Trial-43-Bold.woff2') format('woff2');
            font-weight: bold;
        }
        @font-face {
            font-family: 'Riforma';
            src: url('https://fasttrack-diagnostic.com/fonts/RiformaLL-Regular.woff2') format('woff2');
            font-weight: normal;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
            --ft-black: #000000;
            --ft-white: #FFFFFF;
            --ft-grey: #B2B2B2;
            --ft-yellow: #FFF469;
            --ft-green: #4ECDC4;
            --ft-red: #FF6B6B;
            --font-heading: 'Plaak', 'Arial Black', sans-serif;
            --font-body: 'Riforma', 'Helvetica Neue', sans-serif;
        }
        html { font-size: 16px; }
        body {
            font-family: var(--font-body);
            background-color: var(--ft-black);
            color: var(--ft-white);
            min-height: 100vh;
            line-height: 1.6;
        }
        .container { max-width: 800px; margin: 0 auto; padding: 2rem; }
        .cover-page {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 2rem;
        }
        .cover-page h1 {
            font-family: var(--font-heading);
            font-size: 3.5rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 1rem;
        }
        .cover-tagline { font-size: 1.5rem; color: var(--ft-grey); margin-bottom: 3rem; }
        .btn {
            font-family: var(--font-body);
            font-size: 1rem;
            padding: 1rem 2rem;
            border: 3px solid var(--ft-white);
            background: transparent;
            color: var(--ft-white);
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            transition: all 0.2s ease;
            border-radius: 0;
        }
        .btn:hover { background: var(--ft-white); color: var(--ft-black); }
        .btn-primary { background: var(--ft-yellow); border-color: var(--ft-yellow); color: var(--ft-black); }
        .btn-primary:hover { background: var(--ft-white); border-color: var(--ft-white); }
        .btn-secondary { border-color: var(--ft-grey); color: var(--ft-grey); }
        .btn-secondary:hover { background: var(--ft-grey); color: var(--ft-black); }
        .page { display: none; min-height: 100vh; padding: 2rem; }
        .page.active { display: block; }
        .intro-page { display: flex; flex-direction: column; justify-content: center; }
        .intro-page h2 { font-family: var(--font-heading); font-size: 2rem; margin-bottom: 2rem; }
        .intro-page p { font-size: 1.1rem; margin-bottom: 1.5rem; color: var(--ft-grey); }
        .intro-page .btn { align-self: flex-start; margin-top: 2rem; }
        .tool-page { padding-top: 4rem; }
        .progress-bar { display: flex; justify-content: center; gap: 0.5rem; margin-bottom: 3rem; }
        .progress-dot { width: 12px; height: 12px; border: 2px solid var(--ft-grey); background: transparent; }
        .progress-dot.active { background: var(--ft-yellow); border-color: var(--ft-yellow); }
        .progress-dot.completed { background: var(--ft-white); border-color: var(--ft-white); }
        .tool-step { max-width: 600px; margin: 0 auto; }
        .step-header { margin-bottom: 2rem; }
        .step-number { font-size: 0.875rem; color: var(--ft-grey); text-transform: uppercase; letter-spacing: 0.1em; }
        .step-title { font-family: var(--font-heading); font-size: 2rem; margin: 0.5rem 0; }
        .step-description { color: var(--ft-grey); }
        .input-group { margin-bottom: 1.5rem; }
        .input-group label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .tool-input {
            width: 100%;
            padding: 1rem;
            font-family: var(--font-body);
            font-size: 1rem;
            background: transparent;
            border: 3px solid var(--ft-white);
            color: var(--ft-white);
            border-radius: 0;
        }
        .tool-input:focus { outline: none; border-color: var(--ft-yellow); }
        .tool-input::placeholder { color: var(--ft-grey); }
        select.tool-input { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 1rem center; padding-right: 3rem; }
        .range-container { display: flex; align-items: center; gap: 1rem; }
        .tool-range { -webkit-appearance: none; appearance: none; height: 4px; background: var(--ft-grey); border: none; padding: 0; flex: 1; }
        .tool-range::-webkit-slider-thumb { -webkit-appearance: none; width: 24px; height: 24px; background: var(--ft-yellow); cursor: pointer; border-radius: 0; }
        .range-value { min-width: 3rem; text-align: center; font-size: 1.25rem; font-weight: bold; }
        .checkbox-group { display: flex; align-items: center; }
        .checkbox-label { display: flex; align-items: center; gap: 1rem; cursor: pointer; }
        .tool-checkbox { width: 24px; height: 24px; appearance: none; border: 3px solid var(--ft-white); cursor: pointer; }
        .tool-checkbox:checked { background: var(--ft-yellow); border-color: var(--ft-yellow); }
        .step-navigation { display: flex; justify-content: space-between; margin-top: 3rem; gap: 1rem; }
        .step-navigation .btn:only-child { margin-left: auto; }
        .results-page { text-align: center; padding-top: 4rem; }
        .results-page h2 { font-family: var(--font-heading); font-size: 2.5rem; margin-bottom: 1rem; }
        .score-display { margin: 3rem 0; }
        .score-number { font-family: var(--font-heading); font-size: 6rem; line-height: 1; }
        .verdict { font-family: var(--font-heading); font-size: 2rem; margin-top: 1rem; text-transform: uppercase; }
        .recommendation { max-width: 500px; margin: 2rem auto; font-size: 1.1rem; color: var(--ft-grey); }
        .next-steps { text-align: left; max-width: 500px; margin: 3rem auto; padding: 2rem; border: 3px solid var(--ft-white); }
        .next-steps h3 { font-family: var(--font-heading); margin-bottom: 1rem; }
        .next-steps ul { list-style: none; }
        .next-steps li { padding: 0.5rem 0; padding-left: 1.5rem; position: relative; }
        .next-steps li::before { content: '→'; position: absolute; left: 0; color: var(--ft-yellow); }
        .results-actions { display: flex; justify-content: center; gap: 1rem; margin-top: 3rem; flex-wrap: wrap; }
        .footer { text-align: center; padding: 2rem; color: var(--ft-grey); font-size: 0.875rem; }
        @media (max-width: 640px) {
            .cover-page h1 { font-size: 2.5rem; }
            .score-number { font-size: 4rem; }
            .step-navigation { flex-direction: column; }
        }
    </style>
</head>
<body>
    <div id="cover" class="page active">
        <div class="cover-page">
            <h1>${toolName}</h1>
            <p class="cover-tagline">${coverTagline}</p>
            <button class="btn btn-primary" onclick="showPage('intro')">Start</button>
        </div>
    </div>
    <div id="intro" class="page">
        <div class="container intro-page">
            <h2>${decisionQuestion}</h2>
            ${introParagraphs}
            <button class="btn btn-primary" onclick="showPage('tool')">Begin Assessment</button>
        </div>
    </div>
    <div id="tool" class="page">
        <div class="container tool-page">
            <div class="progress-bar" id="progressBar">
                ${Array(totalSteps).fill(0).map((_, i) => `<div class="progress-dot${i === 0 ? ' active' : ''}" data-step="${i + 1}"></div>`).join('')}
            </div>
            <form id="toolForm">
                ${stepsHtml}
            </form>
        </div>
    </div>
    <div id="results" class="page">
        <div class="container results-page">
            <h2>Your Results</h2>
            <div class="score-display">
                <div class="score-number" id="scoreNumber">--</div>
                <div class="verdict" id="verdict">Calculating...</div>
            </div>
            <p class="recommendation" id="recommendation"></p>
            <div class="next-steps">
                <h3>Recommended Next Steps</h3>
                <ul id="nextStepsList">${nextSteps}</ul>
            </div>
            <div class="results-actions">
                <button class="btn btn-secondary" onclick="resetTool()">Start Over</button>
                <button class="btn btn-primary" onclick="exportResults()">Export Results</button>
            </div>
        </div>
    </div>
    <footer class="footer"><p>Powered by Fast Track | ${toolName}</p></footer>
    <script>
        const TOOL_CONFIG = {
            name: '${toolName.replace(/'/g, "\\'")}',
            totalSteps: ${totalSteps},
            scoreRanges: ${scoreRangesJs}
        };
        let currentStep = 1;
        let formData = {};
        function loadSavedData() {
            const saved = localStorage.getItem('ft_tool_' + TOOL_CONFIG.name);
            if (saved) {
                try {
                    formData = JSON.parse(saved);
                    Object.keys(formData).forEach(key => {
                        const input = document.querySelector('[data-input-id="' + key + '"]');
                        if (input) {
                            if (input.type === 'checkbox') input.checked = formData[key];
                            else input.value = formData[key];
                        }
                    });
                } catch (e) {}
            }
        }
        function saveData() {
            document.querySelectorAll('.tool-input').forEach(input => {
                const id = input.dataset.inputId;
                if (id) formData[id] = input.type === 'checkbox' ? input.checked : input.value;
            });
            localStorage.setItem('ft_tool_' + TOOL_CONFIG.name, JSON.stringify(formData));
        }
        function showPage(pageId) {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
            window.scrollTo(0, 0);
        }
        function showStep(stepNum) {
            document.querySelectorAll('.tool-step').forEach(s => s.style.display = 'none');
            const step = document.querySelector('[data-step="' + stepNum + '"]');
            if (step) step.style.display = 'block';
            document.querySelectorAll('.progress-dot').forEach((dot, i) => {
                dot.classList.remove('active', 'completed');
                if (i + 1 < stepNum) dot.classList.add('completed');
                if (i + 1 === stepNum) dot.classList.add('active');
            });
            currentStep = stepNum;
        }
        function calculateScore() {
            saveData();
            const inputs = document.querySelectorAll('.tool-input');
            let total = 0, count = 0;
            inputs.forEach(input => {
                if (input.type === 'number' || input.type === 'range') {
                    const val = parseFloat(input.value) || 0;
                    const min = parseFloat(input.min) || 0;
                    const max = parseFloat(input.max) || 100;
                    total += ((val - min) / (max - min)) * 100;
                    count++;
                } else if (input.type === 'checkbox') {
                    total += input.checked ? 100 : 0;
                    count++;
                }
            });
            const score = count > 0 ? Math.round(total / count) : 50;
            let result = TOOL_CONFIG.scoreRanges[0];
            for (const range of TOOL_CONFIG.scoreRanges) {
                if (score >= range.min && score <= range.max) { result = range; break; }
            }
            document.getElementById('scoreNumber').textContent = score;
            document.getElementById('scoreNumber').style.color = result.color;
            document.getElementById('verdict').textContent = result.verdict;
            document.getElementById('verdict').style.color = result.color;
            document.getElementById('recommendation').textContent = result.recommendation;
            showPage('results');
        }
        function resetTool() {
            localStorage.removeItem('ft_tool_' + TOOL_CONFIG.name);
            formData = {};
            document.getElementById('toolForm').reset();
            currentStep = 1;
            showStep(1);
            showPage('cover');
        }
        function exportResults() {
            const score = document.getElementById('scoreNumber').textContent;
            const verdict = document.getElementById('verdict').textContent;
            const text = TOOL_CONFIG.name + ' Results\\n\\nScore: ' + score + '\\nVerdict: ' + verdict;
            const blob = new Blob([text], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = TOOL_CONFIG.name.toLowerCase().replace(/\\s+/g, '-') + '-results.txt';
            a.click();
        }
        document.addEventListener('DOMContentLoaded', function() {
            loadSavedData();
            document.querySelectorAll('.next-btn').forEach(btn => {
                btn.addEventListener('click', () => { saveData(); showStep(currentStep + 1); });
            });
            document.querySelectorAll('.prev-btn').forEach(btn => {
                btn.addEventListener('click', () => { saveData(); showStep(currentStep - 1); });
            });
            document.querySelectorAll('.calculate-btn').forEach(btn => {
                btn.addEventListener('click', calculateScore);
            });
            document.querySelectorAll('.tool-range').forEach(range => {
                range.addEventListener('input', function() {
                    const v = document.getElementById(this.id + '_value');
                    if (v) v.textContent = this.value;
                });
            });
            document.querySelectorAll('.tool-input').forEach(input => {
                input.addEventListener('change', saveData);
            });
        });
    </script>
</body>
</html>`;

// Return the complete HTML (base64 encoded)
const htmlBase64 = Buffer.from(html).toString('base64');

return [{
  json: {
    success: true,
    job_id: previousData.job_id,
    tool_name: config.tool_name,
    tool_description: config.tool_description,
    tool_html_base64: htmlBase64,
    revision_applied: changesMade
  }
}];
```

---

## Step 7: Add "Respond Revision Success" Node

**Add after "Build Revised HTML"**

| Setting | Value |
|---------|-------|
| **Type** | Respond to Webhook |
| **Name** | `Respond Revision Success` |

**Response Body:**

```json
{
  "status": "success",
  "job_id": "{{ $json.job_id }}",
  "tool_name": "{{ $json.tool_name }}",
  "tool_description": "{{ $json.tool_description }}",
  "tool_html_base64": "{{ $json.tool_html_base64 }}",
  "revision_applied": "{{ $json.revision_applied }}"
}
```

---

## Step 8: Connect the Nodes

```
Webhook Revision → Parse Revision Request → IF Revision Valid
                                                  │
                                           TRUE   │   FALSE
                                            ↓     ↓
                                    Boss Revision  Respond
                                    Agent          Revision Error
                                      ↓
                                    Build Revised HTML
                                      ↓
                                    Respond Revision Success
```

### Connections:
1. `Webhook Revision` → `Parse Revision Request`
2. `Parse Revision Request` → `IF Revision Valid`
3. `IF Revision Valid` (TRUE) → `Boss Revision Agent`
4. `IF Revision Valid` (FALSE) → `Respond Revision Error`
5. `Boss Revision Agent` → `Build Revised HTML`
6. `Build Revised HTML` → `Respond Revision Success`

### Connect Chat Model:
- `Google Gemini Chat Model4` → `Boss Revision Agent` (ai_languageModel connection)
- Or create a new Gemini Chat Model node if you prefer separation

---

## Backend Integration

Update the Boss Office backend to call this webhook when revision is requested.

**File:** `backend/src/routes/jobs.ts`

Update the `request-revision` endpoint:

```typescript
router.post('/:jobId/request-revision', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const { note } = req.body;

  try {
    if (!note || note.trim().length === 0) {
      return res.status(400).json({
        error: ERROR_MESSAGES.NOTE_REQUIRED,
        code: 'NOTE_REQUIRED'
      });
    }

    const job = getJob(jobId);
    if (!job) {
      return res.status(404).json({
        error: ERROR_MESSAGES.NOT_FOUND,
        code: 'NOT_FOUND'
      });
    }

    if (job.status !== JobStatus.READY_FOR_REVIEW) {
      return res.status(400).json({
        error: ERROR_MESSAGES.NOT_READY_FOR_REVIEW,
        code: 'INVALID_STATUS'
      });
    }

    // Call the revision webhook
    const REVISION_WEBHOOK_URL = process.env.REVISION_WEBHOOK_URL ||
      'https://n8n-edge.fasttrack-diagnostic.com/webhook/tool-revision';

    console.log(`[Jobs] Sending revision request for job ${jobId}...`);

    const revisionResponse = await fetch(REVISION_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        revision_notes: note.trim(),
        tool_html: job.tool_html,
        tool_name: job.tool_id, // or however you store the name
        tool_description: job.qa_report?.notes || ''
      })
    });

    const revisionResult = await revisionResponse.json();

    if (revisionResult.status === 'success' && revisionResult.tool_html_base64) {
      // Update job with revised tool
      const revisedHtml = Buffer.from(revisionResult.tool_html_base64, 'base64').toString('utf-8');

      updateJob(jobId, {
        tool_html: revisedHtml,
        status: JobStatus.READY_FOR_REVIEW, // Stay in review
        revision_notes: note.trim(),
        revision_applied: revisionResult.revision_applied
      });

      console.log(`[Jobs] Job ${jobId} revised successfully`);

      return res.json({
        job_id: jobId,
        status: 'READY_FOR_REVIEW',
        message: 'Tool revised successfully',
        revision_applied: revisionResult.revision_applied
      });
    } else {
      console.log(`[Jobs] Revision failed for job ${jobId}: ${revisionResult.error}`);
      return res.status(500).json({
        error: revisionResult.error || 'Revision failed',
        code: 'REVISION_FAILED'
      });
    }

  } catch (error) {
    console.error('[Jobs] Error requesting revision:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});
```

**Add to `.env`:**
```
REVISION_WEBHOOK_URL=https://n8n-edge.fasttrack-diagnostic.com/webhook/tool-revision
```

---

## Testing

1. Save the workflow in n8n
2. Activate the workflow (both webhooks should be active)
3. In Boss Office:
   - Open a tool in preview
   - Click "Request Revision"
   - Enter revision notes like "Make the questions shorter"
   - Submit
4. Check that the revised tool appears with changes applied

---

## Endpoint Summary

| Endpoint | Purpose |
|----------|---------|
| `POST /webhook/tool-factory` | Create new tools (existing) |
| `POST /webhook/tool-revision` | Revise existing tools (new) |

---

## Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TOOL FACTORY WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    NEW TOOL CREATION FLOW                            │   │
│  │                                                                      │   │
│  │  Webhook → Parse → Worker Agent → Build HTML → QA Agent → IF Pass?  │   │
│  │                         ↑                          │                 │   │
│  │                         │                    YES   │   NO            │   │
│  │                         │                     ↓    ↓                 │   │
│  │                         │               Respond  IF Max?             │   │
│  │                         │               Success   │                  │   │
│  │                         │                   YES   │   NO             │   │
│  │                         │                    ↓    ↓                  │   │
│  │                         └── Revision Agent ←─┘  Respond              │   │
│  │                                                  Failed              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    BOSS REVISION FLOW                                │   │
│  │                                                                      │   │
│  │  Webhook Revision → Parse → Boss Agent → Build HTML → Respond       │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```
