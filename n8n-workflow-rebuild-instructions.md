# n8n Tool Factory Workflow - Complete Rebuild Guide

## The Problem with the Current Approach

The current workflow asks AI (Gemini) to generate complete HTML with JavaScript. This consistently fails because:
- AI often forgets `<script>` tags
- AI generates incomplete or malformed HTML
- Validation keeps failing on structural requirements
- AI is unreliable at generating raw HTML consistently

## The New Approach: Hybrid AI + Template

**Key Insight:** Let AI do what it's good at (understanding requirements, generating structured data) and let code do what it's good at (building consistent HTML).

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NEW WORKFLOW ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [Webhook] → [Parse Input] → [Worker Agent] → [Parse JSON Config]    │
│                                    │                                  │
│                                    ▼                                  │
│                           AI generates JSON:                          │
│                           - tool_name                                 │
│                           - tool_description                          │
│                           - steps[]                                   │
│                           - inputs[]                                  │
│                           - calculations                              │
│                           - verdicts                                  │
│                                    │                                  │
│                                    ▼                                  │
│               [Build HTML] → [Respond to Webhook]                    │
│                    │                                                  │
│                    ▼                                                  │
│            Code node builds complete HTML                             │
│            from template + JSON config                                │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Delete or Disable Current Nodes

Remove or disable these problematic nodes:
- Designer Agent (no longer needed)
- QA Agent (no longer needed)
- All validation nodes (template guarantees structure)
- Parse Designer Output
- IF HTML Valid branches

Keep only:
- Webhook
- Parse & Normalize Input (we'll update it)

---

## Step 2: Create New Workflow Nodes

### Node 1: Webhook (Keep Existing)
- **Type:** Webhook
- **Method:** POST
- **Path:** /tool-factory
- No changes needed

---

### Node 2: Parse & Normalize Input (Update)

**Type:** Code Node

```javascript
// Parse & Normalize Input
// Extracts job_id, instruction text, and metadata from webhook payload

const input = $input.first().json;

// Extract job_id
const job_id = input.job_id || input.jobId || `job_${Date.now()}`;

// Extract instruction text - check multiple possible locations
let instructionText = '';

if (input.source && input.source.text) {
  instructionText = input.source.text;
} else if (input.instruction) {
  instructionText = input.instruction;
} else if (input.text) {
  instructionText = input.text;
} else if (input.content) {
  instructionText = input.content;
}

// Clean up the instruction text
instructionText = instructionText.trim();

// Extract callback URL
const callback_url = input.callback_url || input.callbackUrl || null;

// Extract metadata
const metadata = input.metadata || {};

// Validate we have instruction text
if (!instructionText || instructionText.length < 10) {
  return [{
    json: {
      success: false,
      error: 'Missing or invalid instruction text',
      job_id: job_id
    }
  }];
}

return [{
  json: {
    success: true,
    job_id: job_id,
    instruction: instructionText,
    callback_url: callback_url,
    metadata: metadata
  }
}];
```

---

### Node 3: IF Input Valid

**Type:** IF Node

**Condition:** `{{ $json.success }}` equals `true`

- **True branch:** Continue to Worker Agent
- **False branch:** Go to Error Response

---

### Node 4: Worker Agent (AI generates JSON config only)

**Type:** AI Agent Node

**Model:** Google Gemini (gemini-pro-latest or gemini-1.5-flash)

**System Prompt:**
```
You are a Fast Track Tool Configuration Generator. Your ONLY job is to analyze tool requirements and output a JSON configuration object. You do NOT generate HTML.

## Your Task
Read the user's tool request and generate a JSON configuration that describes:
1. What the tool does
2. What inputs it needs
3. How to calculate results
4. What verdicts/outcomes to show

## Output Format
You MUST output ONLY valid JSON. No markdown, no explanations, no code blocks. Just the raw JSON object.

## JSON Schema
{
  "tool_name": "string - Short name for the tool (2-4 words)",
  "tool_description": "string - One sentence describing what this tool helps decide",
  "decision_question": "string - The main question this tool answers",
  "cover_tagline": "string - Catchy tagline for the cover page",
  "intro_paragraphs": ["string - First intro paragraph", "string - Second intro paragraph"],

  "steps": [
    {
      "id": "step1",
      "title": "string - Step title",
      "description": "string - What user does in this step",
      "inputs": [
        {
          "id": "input_id",
          "label": "string - Input label",
          "type": "number|text|select|range|checkbox",
          "placeholder": "string - Placeholder text",
          "options": ["only for select type"],
          "min": 0,
          "max": 100,
          "default": "default value"
        }
      ]
    }
  ],

  "calculations": {
    "formula_description": "string - How the final score/result is calculated",
    "score_ranges": [
      {"min": 0, "max": 33, "verdict": "Low", "color": "#FF6B6B", "recommendation": "string"},
      {"min": 34, "max": 66, "verdict": "Medium", "color": "#FFF469", "recommendation": "string"},
      {"min": 67, "max": 100, "verdict": "High", "color": "#4ECDC4", "recommendation": "string"}
    ]
  },

  "results_display": {
    "show_score": true,
    "show_breakdown": true,
    "show_next_steps": true,
    "next_steps": ["string - First recommended action", "string - Second action"]
  }
}

## Example Input
"Create a tool to help managers decide if they should hire a new team member"

## Example Output
{
  "tool_name": "Hiring Decision Tool",
  "tool_description": "Helps managers evaluate whether their team needs a new hire",
  "decision_question": "Should you hire a new team member?",
  "cover_tagline": "Make confident hiring decisions",
  "intro_paragraphs": [
    "Hiring decisions are among the most impactful choices a manager makes. This tool helps you objectively evaluate your team's capacity and workload.",
    "Answer a few questions about your current situation, and we'll help you determine if now is the right time to expand your team."
  ],
  "steps": [
    {
      "id": "workload",
      "title": "Current Workload",
      "description": "Assess your team's current capacity",
      "inputs": [
        {
          "id": "overtime_hours",
          "label": "Average weekly overtime hours per team member",
          "type": "number",
          "placeholder": "e.g., 5",
          "min": 0,
          "max": 40
        },
        {
          "id": "missed_deadlines",
          "label": "Deadlines missed in the last quarter",
          "type": "number",
          "placeholder": "e.g., 3",
          "min": 0,
          "max": 50
        }
      ]
    },
    {
      "id": "growth",
      "title": "Growth Factors",
      "description": "Consider future demands",
      "inputs": [
        {
          "id": "new_projects",
          "label": "New projects expected in next 6 months",
          "type": "number",
          "placeholder": "e.g., 2",
          "min": 0,
          "max": 20
        },
        {
          "id": "revenue_growth",
          "label": "Expected revenue growth (%)",
          "type": "range",
          "min": -20,
          "max": 100,
          "default": 10
        }
      ]
    }
  ],
  "calculations": {
    "formula_description": "Score based on workload pressure (40%), capacity issues (30%), and growth factors (30%)",
    "score_ranges": [
      {"min": 0, "max": 40, "verdict": "Not Yet", "color": "#4ECDC4", "recommendation": "Your team can handle current and expected workload. Focus on optimization before hiring."},
      {"min": 41, "max": 70, "verdict": "Consider It", "color": "#FFF469", "recommendation": "There are signs of strain. Start planning for a hire in the next 3-6 months."},
      {"min": 71, "max": 100, "verdict": "Hire Now", "color": "#FF6B6B", "recommendation": "Your team is overloaded. Begin the hiring process immediately to prevent burnout."}
    ]
  },
  "results_display": {
    "show_score": true,
    "show_breakdown": true,
    "show_next_steps": true,
    "next_steps": [
      "Review your budget allocation for the new position",
      "Draft the job description based on skill gaps identified",
      "Schedule a team meeting to discuss workload distribution"
    ]
  }
}

## Rules
1. Output ONLY the JSON object - no other text
2. Include at least 2 steps with 2-4 inputs each
3. Always include 3 score ranges (low/medium/high or equivalent)
4. Make verdicts actionable and specific to the decision
5. Keep labels concise but clear
6. Use appropriate input types (number for quantities, range for percentages, select for choices)
```

**User Message:** `{{ $json.instruction }}`

**Max Tokens:** 4000

---

### Node 5: Parse JSON Config

**Type:** Code Node

```javascript
// Parse JSON Config
// Extracts and validates the JSON configuration from AI output

const input = $input.first().json;
const previousData = $('IF Input Valid').first().json;

// Get the AI output
let aiOutput = '';
if (input.output) {
  aiOutput = input.output;
} else if (input.text) {
  aiOutput = input.text;
} else if (typeof input === 'string') {
  aiOutput = input;
} else {
  aiOutput = JSON.stringify(input);
}

// Clean up - remove markdown code blocks if present
let cleanOutput = aiOutput
  .replace(/^```json\s*/i, '')
  .replace(/^```\s*/i, '')
  .replace(/\s*```$/i, '')
  .trim();

// Try to extract JSON object
const jsonMatch = cleanOutput.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  cleanOutput = jsonMatch[0];
}

// Parse the JSON
let config = null;
try {
  config = JSON.parse(cleanOutput);
} catch (e) {
  // Return error if parsing fails
  return [{
    json: {
      success: false,
      error: 'Failed to parse AI output as JSON',
      raw_output: aiOutput.substring(0, 500),
      job_id: previousData.job_id,
      callback_url: previousData.callback_url
    }
  }];
}

// Validate required fields
const requiredFields = ['tool_name', 'tool_description', 'steps', 'calculations'];
const missingFields = requiredFields.filter(f => !config[f]);

if (missingFields.length > 0) {
  return [{
    json: {
      success: false,
      error: `Missing required fields: ${missingFields.join(', ')}`,
      job_id: previousData.job_id,
      callback_url: previousData.callback_url
    }
  }];
}

// Validate steps have inputs
if (!Array.isArray(config.steps) || config.steps.length === 0) {
  return [{
    json: {
      success: false,
      error: 'Config must have at least one step',
      job_id: previousData.job_id,
      callback_url: previousData.callback_url
    }
  }];
}

// Success - pass config forward
return [{
  json: {
    success: true,
    job_id: previousData.job_id,
    callback_url: previousData.callback_url,
    config: config
  }
}];
```

---

### Node 6: IF Config Valid

**Type:** IF Node

**Condition:** `{{ $json.success }}` equals `true`

- **True branch:** Continue to Build HTML
- **False branch:** Go to Error Response

---

### Node 7: Build HTML (The Core Node)

**Type:** Code Node

This is where the magic happens. This node takes the JSON config and builds complete, valid HTML.

```javascript
// Build HTML from Config
// Generates complete Fast Track tool HTML from JSON configuration

const input = $input.first().json;
const config = input.config;
const job_id = input.job_id;

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
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <style>
        /* Fast Track Brand Fonts */
        @font-face {
            font-family: 'Plaak';
            src: url('https://fasttrack-diagnostic.com/fonts/Plaak3Trial-43-Bold.woff2') format('woff2');
            font-weight: bold;
            font-style: normal;
        }
        @font-face {
            font-family: 'Riforma';
            src: url('https://fasttrack-diagnostic.com/fonts/RiformaLL-Regular.woff2') format('woff2');
            font-weight: normal;
            font-style: normal;
        }

        /* CSS Reset & Base */
        *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

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

        html {
            font-size: 16px;
        }

        body {
            font-family: var(--font-body);
            background-color: var(--ft-black);
            color: var(--ft-white);
            min-height: 100vh;
            line-height: 1.6;
        }

        /* Layout */
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
        }

        /* Cover Page */
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

        .cover-tagline {
            font-size: 1.5rem;
            color: var(--ft-grey);
            margin-bottom: 3rem;
        }

        /* Buttons */
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

        .btn:hover {
            background: var(--ft-white);
            color: var(--ft-black);
        }

        .btn-primary {
            background: var(--ft-yellow);
            border-color: var(--ft-yellow);
            color: var(--ft-black);
        }

        .btn-primary:hover {
            background: var(--ft-white);
            border-color: var(--ft-white);
        }

        .btn-secondary {
            border-color: var(--ft-grey);
            color: var(--ft-grey);
        }

        .btn-secondary:hover {
            background: var(--ft-grey);
            color: var(--ft-black);
        }

        /* Page Sections */
        .page {
            display: none;
            min-height: 100vh;
            padding: 2rem;
        }

        .page.active {
            display: block;
        }

        /* Intro Page */
        .intro-page {
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .intro-page h2 {
            font-family: var(--font-heading);
            font-size: 2rem;
            margin-bottom: 2rem;
        }

        .intro-page p {
            font-size: 1.1rem;
            margin-bottom: 1.5rem;
            color: var(--ft-grey);
        }

        .intro-page .btn {
            align-self: flex-start;
            margin-top: 2rem;
        }

        /* Tool Page */
        .tool-page {
            padding-top: 4rem;
        }

        .progress-bar {
            display: flex;
            justify-content: center;
            gap: 0.5rem;
            margin-bottom: 3rem;
        }

        .progress-dot {
            width: 12px;
            height: 12px;
            border: 2px solid var(--ft-grey);
            background: transparent;
        }

        .progress-dot.active {
            background: var(--ft-yellow);
            border-color: var(--ft-yellow);
        }

        .progress-dot.completed {
            background: var(--ft-white);
            border-color: var(--ft-white);
        }

        /* Steps */
        .tool-step {
            max-width: 600px;
            margin: 0 auto;
        }

        .step-header {
            margin-bottom: 2rem;
        }

        .step-number {
            font-size: 0.875rem;
            color: var(--ft-grey);
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }

        .step-title {
            font-family: var(--font-heading);
            font-size: 2rem;
            margin: 0.5rem 0;
        }

        .step-description {
            color: var(--ft-grey);
        }

        /* Inputs */
        .input-group {
            margin-bottom: 1.5rem;
        }

        .input-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

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

        .tool-input:focus {
            outline: none;
            border-color: var(--ft-yellow);
        }

        .tool-input::placeholder {
            color: var(--ft-grey);
        }

        select.tool-input {
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 1rem center;
            padding-right: 3rem;
        }

        /* Range Input */
        .range-container {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .tool-range {
            -webkit-appearance: none;
            appearance: none;
            height: 4px;
            background: var(--ft-grey);
            border: none;
            padding: 0;
        }

        .tool-range::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 24px;
            height: 24px;
            background: var(--ft-yellow);
            cursor: pointer;
            border-radius: 0;
        }

        .range-value {
            min-width: 3rem;
            text-align: center;
            font-size: 1.25rem;
            font-weight: bold;
        }

        /* Checkbox */
        .checkbox-group {
            display: flex;
            align-items: center;
        }

        .checkbox-label {
            display: flex;
            align-items: center;
            gap: 1rem;
            cursor: pointer;
        }

        .tool-checkbox {
            width: 24px;
            height: 24px;
            appearance: none;
            border: 3px solid var(--ft-white);
            cursor: pointer;
        }

        .tool-checkbox:checked {
            background: var(--ft-yellow);
            border-color: var(--ft-yellow);
        }

        /* Navigation */
        .step-navigation {
            display: flex;
            justify-content: space-between;
            margin-top: 3rem;
            gap: 1rem;
        }

        .step-navigation .btn:only-child {
            margin-left: auto;
        }

        /* Results Page */
        .results-page {
            text-align: center;
            padding-top: 4rem;
        }

        .results-page h2 {
            font-family: var(--font-heading);
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }

        .score-display {
            margin: 3rem 0;
        }

        .score-number {
            font-family: var(--font-heading);
            font-size: 6rem;
            line-height: 1;
        }

        .verdict {
            font-family: var(--font-heading);
            font-size: 2rem;
            margin-top: 1rem;
            text-transform: uppercase;
        }

        .recommendation {
            max-width: 500px;
            margin: 2rem auto;
            font-size: 1.1rem;
            color: var(--ft-grey);
        }

        .next-steps {
            text-align: left;
            max-width: 500px;
            margin: 3rem auto;
            padding: 2rem;
            border: 3px solid var(--ft-white);
        }

        .next-steps h3 {
            font-family: var(--font-heading);
            margin-bottom: 1rem;
        }

        .next-steps ul {
            list-style: none;
        }

        .next-steps li {
            padding: 0.5rem 0;
            padding-left: 1.5rem;
            position: relative;
        }

        .next-steps li::before {
            content: '→';
            position: absolute;
            left: 0;
            color: var(--ft-yellow);
        }

        .results-actions {
            display: flex;
            justify-content: center;
            gap: 1rem;
            margin-top: 3rem;
        }

        /* Footer */
        .footer {
            text-align: center;
            padding: 2rem;
            color: var(--ft-grey);
            font-size: 0.875rem;
        }

        /* Responsive */
        @media (max-width: 640px) {
            .cover-page h1 {
                font-size: 2.5rem;
            }

            .score-number {
                font-size: 4rem;
            }

            .step-navigation {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <!-- Cover Page -->
    <div id="cover" class="page active">
        <div class="cover-page">
            <h1>${toolName}</h1>
            <p class="cover-tagline">${coverTagline}</p>
            <button class="btn btn-primary" onclick="showPage('intro')">Start</button>
        </div>
    </div>

    <!-- Intro Page -->
    <div id="intro" class="page">
        <div class="container intro-page">
            <h2>${decisionQuestion}</h2>
            ${introParagraphs}
            <button class="btn btn-primary" onclick="showPage('tool')">Begin Assessment</button>
        </div>
    </div>

    <!-- Tool Page -->
    <div id="tool" class="page">
        <div class="container tool-page">
            <div class="progress-bar" id="progressBar">
                ${Array(totalSteps).fill(0).map((_, i) =>
                  `<div class="progress-dot${i === 0 ? ' active' : ''}" data-step="${i + 1}"></div>`
                ).join('')}
            </div>

            <form id="toolForm">
                ${stepsHtml}
            </form>
        </div>
    </div>

    <!-- Results Page -->
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
                <ul id="nextStepsList">
                    ${nextSteps}
                </ul>
            </div>

            <div class="results-actions">
                <button class="btn btn-secondary" onclick="resetTool()">Start Over</button>
                <button class="btn btn-primary" onclick="exportResults()">Export Results</button>
            </div>
        </div>
    </div>

    <footer class="footer">
        <p>Powered by Fast Track | ${toolName}</p>
    </footer>

    <script>
        // Tool Configuration
        const TOOL_CONFIG = {
            name: '${toolName.replace(/'/g, "\\'")}',
            description: '${toolDescription.replace(/'/g, "\\'")}',
            totalSteps: ${totalSteps},
            scoreRanges: ${scoreRangesJs}
        };

        // State
        let currentStep = 1;
        let formData = {};

        // Load saved data
        function loadSavedData() {
            const saved = localStorage.getItem('ft_tool_' + TOOL_CONFIG.name);
            if (saved) {
                try {
                    formData = JSON.parse(saved);
                    // Restore form values
                    Object.keys(formData).forEach(key => {
                        const input = document.querySelector('[data-input-id="' + key + '"]');
                        if (input) {
                            if (input.type === 'checkbox') {
                                input.checked = formData[key];
                            } else {
                                input.value = formData[key];
                            }
                        }
                    });
                } catch (e) {}
            }
        }

        // Save data
        function saveData() {
            const inputs = document.querySelectorAll('.tool-input');
            inputs.forEach(input => {
                const id = input.dataset.inputId;
                if (id) {
                    if (input.type === 'checkbox') {
                        formData[id] = input.checked;
                    } else {
                        formData[id] = input.value;
                    }
                }
            });
            localStorage.setItem('ft_tool_' + TOOL_CONFIG.name, JSON.stringify(formData));
        }

        // Page navigation
        function showPage(pageId) {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
            window.scrollTo(0, 0);
        }

        // Step navigation
        function showStep(stepNum) {
            document.querySelectorAll('.tool-step').forEach(s => s.style.display = 'none');
            document.querySelector('[data-step="' + stepNum + '"]').style.display = 'block';

            // Update progress
            document.querySelectorAll('.progress-dot').forEach((dot, i) => {
                dot.classList.remove('active', 'completed');
                if (i + 1 < stepNum) dot.classList.add('completed');
                if (i + 1 === stepNum) dot.classList.add('active');
            });

            currentStep = stepNum;
        }

        // Calculate score
        function calculateScore() {
            saveData();

            // Get all numeric inputs and calculate average
            const inputs = document.querySelectorAll('.tool-input');
            let total = 0;
            let count = 0;

            inputs.forEach(input => {
                if (input.type === 'number' || input.type === 'range') {
                    const val = parseFloat(input.value) || 0;
                    const min = parseFloat(input.min) || 0;
                    const max = parseFloat(input.max) || 100;
                    // Normalize to 0-100
                    const normalized = ((val - min) / (max - min)) * 100;
                    total += normalized;
                    count++;
                } else if (input.type === 'checkbox') {
                    total += input.checked ? 100 : 0;
                    count++;
                }
            });

            const score = count > 0 ? Math.round(total / count) : 50;

            // Find matching range
            let result = TOOL_CONFIG.scoreRanges[0];
            for (const range of TOOL_CONFIG.scoreRanges) {
                if (score >= range.min && score <= range.max) {
                    result = range;
                    break;
                }
            }

            // Display results
            document.getElementById('scoreNumber').textContent = score;
            document.getElementById('scoreNumber').style.color = result.color;
            document.getElementById('verdict').textContent = result.verdict;
            document.getElementById('verdict').style.color = result.color;
            document.getElementById('recommendation').textContent = result.recommendation;

            showPage('results');
        }

        // Reset tool
        function resetTool() {
            localStorage.removeItem('ft_tool_' + TOOL_CONFIG.name);
            formData = {};
            document.getElementById('toolForm').reset();
            currentStep = 1;
            showStep(1);
            showPage('cover');
        }

        // Export results
        function exportResults() {
            const score = document.getElementById('scoreNumber').textContent;
            const verdict = document.getElementById('verdict').textContent;
            const text = TOOL_CONFIG.name + ' Results\\n\\nScore: ' + score + '\\nVerdict: ' + verdict + '\\n\\nGenerated by Fast Track';

            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = TOOL_CONFIG.name.toLowerCase().replace(/\\s+/g, '-') + '-results.txt';
            a.click();
        }

        // Event listeners
        document.addEventListener('DOMContentLoaded', function() {
            loadSavedData();

            // Next buttons
            document.querySelectorAll('.next-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    saveData();
                    showStep(currentStep + 1);
                });
            });

            // Prev buttons
            document.querySelectorAll('.prev-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    saveData();
                    showStep(currentStep - 1);
                });
            });

            // Calculate button
            document.querySelectorAll('.calculate-btn').forEach(btn => {
                btn.addEventListener('click', calculateScore);
            });

            // Range value display
            document.querySelectorAll('.tool-range').forEach(range => {
                range.addEventListener('input', function() {
                    const valueDisplay = document.getElementById(this.id + '_value');
                    if (valueDisplay) {
                        valueDisplay.textContent = this.value;
                    }
                });
            });

            // Auto-save on input change
            document.querySelectorAll('.tool-input').forEach(input => {
                input.addEventListener('change', saveData);
            });
        });
    </script>
</body>
</html>`;

// Return the complete HTML
return [{
  json: {
    success: true,
    job_id: job_id,
    callback_url: input.callback_url,
    tool_name: config.tool_name,
    tool_description: config.tool_description,
    tool_html: html
  }
}];
```

---

### Node 8: Respond to Webhook (Success)

**Type:** Respond to Webhook Node

**Response Mode:** Using 'Respond to Webhook' Node

**Response Body:**
```json
{
  "success": true,
  "job_id": "{{ $json.job_id }}",
  "tool_name": "{{ $json.tool_name }}",
  "tool_description": "{{ $json.tool_description }}",
  "tool_html": "{{ $json.tool_html }}"
}
```

**Note:** For the tool_html field, you may need to use an expression that properly handles the large HTML string. Consider using:
```
{{ $json.tool_html }}
```

Or if issues with escaping, encode as base64 in the Build HTML node and decode in Boss Office.

---

### Node 9: Error Response

**Type:** Respond to Webhook Node

Connect this to the "false" branches of IF nodes.

**Response Code:** 400

**Response Body:**
```json
{
  "success": false,
  "error": "{{ $json.error }}",
  "job_id": "{{ $json.job_id }}"
}
```

---

## Complete Workflow Diagram

```
[Webhook: POST /tool-factory]
         │
         ▼
[Parse & Normalize Input]
         │
         ▼
[IF Input Valid] ──False──► [Error Response: 400]
         │
        True
         │
         ▼
[Worker Agent: Generate JSON Config]
         │
         ▼
[Parse JSON Config]
         │
         ▼
[IF Config Valid] ──False──► [Error Response: 400]
         │
        True
         │
         ▼
[Build HTML from Config]
         │
         ▼
[Respond to Webhook: Success]
```

---

## Testing the Workflow

### Test Payload
```json
{
  "job_id": "test-001",
  "source": {
    "text": "Create a tool to help entrepreneurs decide if they should bootstrap or seek VC funding for their startup"
  },
  "callback_url": "https://your-ngrok-url/api/factory/callback",
  "metadata": {
    "original_filename": "funding-decision.md",
    "file_type": "MD"
  }
}
```

### Expected Response
```json
{
  "success": true,
  "job_id": "test-001",
  "tool_name": "Funding Decision Tool",
  "tool_description": "Helps entrepreneurs evaluate whether to bootstrap or seek VC funding",
  "tool_html": "<!DOCTYPE html>..."
}
```

---

## Key Improvements Over Previous Workflow

| Previous Approach | New Approach |
|------------------|--------------|
| AI generates complete HTML | AI generates JSON config only |
| Validation constantly fails | Template guarantees valid structure |
| Multiple AI agents (Designer, QA) | Single AI call + code |
| Unpredictable output | Consistent, branded output |
| Complex error handling | Simple pass/fail |
| ~6 AI calls per request | 1 AI call per request |

---

## Customization Options

### Adding New Input Types

Edit the `generateInputHtml` function in the Build HTML node to add support for new input types like:
- `textarea` for long text
- `date` for date pickers
- `radio` for single-choice options

### Changing Brand Colors

Update the CSS variables in the Build HTML node:
```css
:root {
    --ft-black: #000000;
    --ft-white: #FFFFFF;
    --ft-grey: #B2B2B2;
    --ft-yellow: #FFF469;
    --ft-green: #4ECDC4;
    --ft-red: #FF6B6B;
}
```

### Adding More Complex Calculations

The current score calculation averages all inputs. For more complex formulas, edit the `calculateScore` function in the Build HTML node's JavaScript to implement weighted scoring, conditional logic, etc.

---

## Troubleshooting

### "Missing instruction text" error
- Check that the Boss Office is sending `source.text` in the payload
- Verify the Parse & Normalize Input node is extracting the text correctly

### AI returns invalid JSON
- Check the Worker Agent system prompt is correctly formatted
- Increase max tokens if the JSON is getting cut off
- Add examples to the system prompt for the specific type of tool

### HTML looks wrong
- Check the CSS variables match your brand
- Verify fonts are loading (may need to host locally)
- Test on different screen sizes

### Form data not saving
- Check localStorage is enabled in the browser
- Verify input IDs are unique

---

## Next Steps After Implementing

1. **Test with 5-10 different tool requests** to verify consistency
2. **Add callback handling** in Boss Office to receive the generated tool
3. **Implement preview** so users can see the tool before approving
4. **Add deploy workflow** to publish approved tools

---

## Files to Reference

- `backend/src/services/factory.ts` - Payload format for Boss Office
- `backend/.env` - Configuration including `FACTORY_WEBHOOK_URL`
- Example tools in `example of how tools should be like/` folder

---

*Generated for Fast Track Tool Factory - Spec 007-factory-integration*
