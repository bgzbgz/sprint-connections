# Tool Factory v2 - n8n Workflow Build Instructions

## Overview

This document provides step-by-step instructions for building the Tool Factory v2 workflow in n8n. The workflow receives tool requests from the Boss Office app, generates world-class interactive tools using AI, validates them through a QA loop, and returns the completed tools.

**Key Innovation**: We leverage the **Markdown** and **HTML** nodes to:
1. Have AI generate tool content in Markdown (easier, more expressive)
2. Convert Markdown to HTML fragments
3. Assemble fragments into a premium HTML template

---

## What The App Sends

The Boss Office app sends this JSON payload to the webhook:

```json
{
  "job_id": "uuid-string",
  "source": {
    "text": "The instruction text from uploaded file OR questionnaire answers"
  },
  "callback_url": "https://your-server.com/api/factory/callback",
  "metadata": {
    "original_filename": "tool-request.txt",
    "file_type": "TXT",
    "file_size_bytes": 1234,
    "submitted_at": "2024-01-15T10:30:00Z"
  }
}
```

**OR** (from questionnaire - Spec 014):

```json
{
  "job_id": "uuid-string",
  "source": {
    "decision": "What decision should the user make?",
    "teaching": "What will they learn?",
    "input_types": ["numbers", "yesno", "rating"],
    "scoring_criteria": "What makes HIGH vs LOW?"
  },
  "callback_url": "https://your-server.com/api/factory/callback"
}
```

---

## What The Workflow Returns

```json
{
  "success": true,
  "job_id": "uuid-string",
  "tool_name": "Hiring Decision Canvas",
  "tool_description": "Force a clear hiring decision...",
  "tool_html_base64": "base64-encoded-html",
  "qa_report": {
    "score": 85,
    "passed_checks": ["decision_clarity", "feedback_present", ...],
    "failed_checks": [],
    "recommendations": []
  },
  "revision_count": 2,
  "revision_history": [...]
}
```

---

## Complete Workflow Architecture

```
 [1. Webhook]
      |
      v
 [2. Parse Input]
      |
      v
 [3. Fetch Context] (MongoDB x3 in parallel)
      |
      v
 [4. Tool Architect Agent] <----+
      |                         |
      v                         |
 [5. Section Parser]            |
      |                         |
      v                         |
 [6. Markdown to HTML]          |
      |                         |
      v                         |
 [7. Build HTML Template]       |
      |                         |
      v                         |
 [8. QA Validator]              |
      |                         |
   [9. IF]                      |
    /    \                      |
 PASS    FAIL                   |
   |       |                    |
   v       +--------------------+
[10. Save to MongoDB]
      |
      v
[11. Respond to Webhook]
```

---

## Node-by-Node Instructions

---

### NODE 1: Webhook

**Label**: `Webhook - Tool Factory`

**Type**: Webhook

**Configuration**:
- HTTP Method: `POST`
- Path: `tool-factory`
- Authentication: `None` (or Header Auth if using callback secret)
- Respond: `Using 'Respond to Webhook' Node`

**Why**: Entry point for all tool generation requests. Using "Respond to Webhook" node allows us to process the entire workflow before responding.

---

### NODE 2: Parse Input

**Label**: `Parse & Normalize Input`

**Type**: Code

**Mode**: Run Once for All Items

**JavaScript Code**:
```javascript
// Parse & Normalize Input
// Handles both file upload and questionnaire payloads

const rawInput = $input.first();
const input = rawInput.json;

const job_id = input.job_id || `job_${Date.now()}`;

// Initialize source object
let source = {
  text: '',
  decision: '',
  teaching: '',
  input_types: [],
  scoring_criteria: ''
};

// Check if this is a questionnaire submission (has decision field)
if (input.source && input.source.decision) {
  // Questionnaire format
  source.decision = input.source.decision || '';
  source.teaching = input.source.teaching || '';
  source.input_types = input.source.input_types || [];
  source.scoring_criteria = input.source.scoring_criteria || '';

  // Build combined text for AI context
  source.text = `
TOOL REQUEST FROM QUESTIONNAIRE:

1. What decision should the user make?
${source.decision}

2. What will they learn?
${source.teaching}

3. Input types needed:
${source.input_types.join(', ')}

4. What makes HIGH vs LOW?
${source.scoring_criteria}
  `.trim();

} else if (input.source && input.source.text) {
  // File upload format
  source.text = input.source.text;
} else if (input.instruction) {
  // Legacy format
  source.text = input.instruction;
} else if (input.text) {
  // Direct text
  source.text = input.text;
}

// Validate we have content
if (!source.text || source.text.length < 10) {
  return [{
    json: {
      success: false,
      error: 'Missing or invalid instruction text',
      job_id: job_id,
      debug_keys: Object.keys(input)
    }
  }];
}

const callback_url = input.callback_url || null;
const metadata = input.metadata || {};

return [{
  json: {
    job_id,
    source,
    callback_url,
    metadata,
    attempt: 1,
    max_attempts: 3
  }
}];
```

**Why**: Normalizes different input formats (questionnaire vs file upload) into a consistent structure for the AI agent.

---

### NODE 3a: Fetch Brand Guidelines

**Label**: ` `

**Type**: MongoDB

**Configuration**:
- Operation: `Find`
- Collection: `guidelines`
- Query: `{ "type": "brand" }`
- Limit: `1`

**Why**: Retrieves Fast Track brand guidelines (colors, fonts, tone) to inject into AI context.

---

### NODE 3b: Fetch Writing Guide

**Label**: `MongoDB - Writing Guide`

**Type**: MongoDB

**Configuration**:
- Operation: `Find`
- Collection: `guidelines`
- Query: `{ "type": "writing" }`
- Limit: `1`

**Why**: Retrieves Fast Track writing rules (no hedge words, action verbs, etc.)

---

### NODE 3c: Fetch 8-Point Criteria

**Label**: `MongoDB - 8 Point Criteria`

**Type**: MongoDB

**Configuration**:
- Operation: `Find`
- Collection: `guidelines`
- Query: `{ "type": "criteria" }`
- Limit: `1`

**Why**: Retrieves the 8-point tool criteria that every tool must satisfy.

---

### NODE 3d: Merge Context

**Label**: `Merge Context`

**Type**: Code

**JavaScript Code**:
```javascript
// Merge all context for AI agent
const input = $('Parse & Normalize Input').first().json;
const brand = $('MongoDB - Brand Guidelines').first().json;
const writing = $('MongoDB - Writing Guide').first().json;
const criteria = $('MongoDB - 8 Point Criteria').first().json;

// Include revision instructions if this is a retry
const revisionInstructions = input.revision_instructions || null;

return [{
  json: {
    ...input,
    context: {
      brand_guidelines: brand?.content || '',
      writing_guide: writing?.content || '',
      eight_point_criteria: criteria?.content || ''
    },
    revision_instructions: revisionInstructions
  }
}];
```

**Why**: Combines all fetched context into a single object for the AI agent.

---

### NODE 4: Tool Architect Agent

**Label**: `Tool Architect Agent`

**Type**: AI Agent

**Connected Sub-nodes**:
- Google Gemini Chat Model (Model: `gemini-2.0-flash`)

**System Message**:
```
You are a Fast Track Tool Architect. You create world-class decision-making tools for elite CEOs (YPO-level, €5M-€500M companies).

## YOUR OUTPUT FORMAT

You MUST output a complete tool specification in Markdown format. Follow this EXACT structure:

===TOOL_META===
tool_name: [2-4 words, action-oriented name]
tool_slug: [lowercase-with-dashes]
decision: [The ONE specific decision this tool forces]
tagline: [Max 8 words, brutal and direct]
estimated_time: [X minutes - always 3-5 min]
===END_META===

===COVER===
# [TOOL NAME IN CAPS]

[Tagline]

[One sentence: What you'll walk away with]
===END_COVER===

===CONTEXT===
## Why This Matters

[Paragraph 1: The pain. What happens if they DON'T make this decision? Be brutal.]

[Paragraph 2: The promise. What this tool will reveal. Be specific.]
===END_CONTEXT===

===DIAGNOSTIC:1===
## [Section Title - Action Verb + 2-3 words]

**The Question:** [What are we really trying to figure out?]

### INPUT:1.1
- id: [snake_case_id]
- label: [Clear, jargon-free label - max 60 chars]
- type: slider | select | number | matrix | zones
- required: true

#### For type: slider
- min: 0
- max: 100
- default: 50
- unit: "%" | "hours" | "days" | ""
- markers: [{ value: 0, label: "None" }, { value: 50, label: "Moderate" }, { value: 100, label: "Extreme" }]

#### For type: select
- options: [{ value: "option1", label: "Option 1", score_impact: 10 }, ...]

#### For type: number
- min: 0
- max: 100
- placeholder: "e.g., 15"

#### For type: matrix
- rows: ["Item 1", "Item 2", "Item 3"]
- columns: ["Green Zone", "Yellow Zone", "Red Zone"]
- colors: ["#4ECDC4", "#FFF469", "#FF6B6B"]

### FEEDBACK:1.1
**Instant feedback shown as user interacts:**

- IF value <= 30%:
  - indicator: red
  - message: "[Brutal truth about what this means]"
  - insight: "[Pattern this reveals about their situation]"

- IF value 31-70%:
  - indicator: yellow
  - message: "[Direct observation]"
  - insight: "[What to pay attention to]"

- IF value > 70%:
  - indicator: green
  - message: "[Validation with a challenge]"
  - insight: "[What this strength means]"

### INPUT:1.2
[Continue with more inputs...]

===END_DIAGNOSTIC===

===DIAGNOSTIC:2===
[Same structure as DIAGNOSTIC:1]
===END_DIAGNOSTIC===

===COMMITMENT===
## Your Commitment

**The Decision:**
[What specific YES/NO or action must they commit to?]

**Commitment Template:**
"I will [ACTION] by [DATE] because my [diagnostic result] shows [INSIGHT]."

### Fields:
- action:
  - type: text
  - placeholder: "e.g., Post the job listing for a senior developer"
  - validation: min 10 characters, must start with verb

- deadline:
  - type: date
  - constraints: must be within 90 days
  - default: 30 days from today

### Accountability
- share_prompt: "Who needs to see this commitment?"
- share_options: ["My team", "My manager", "My coach", "My peer group"]
- share_required: true
===END_COMMITMENT===

===VERDICTS===
## The Verdict

### SCORE 0-35: [VERDICT NAME - 2 words max]
- color: #FF6B6B
- headline: "[Brutal one-liner]"
- explanation: "[2-3 sentences. What this score means.]"
- primary_action: "[ONE specific thing to do. Verb first. Include timeframe.]"
- secondary_actions: ["[Action 2]", "[Action 3]"]

### SCORE 36-65: [VERDICT NAME]
- color: #FFF469
- headline: "[Direct observation]"
- explanation: "[2-3 sentences]"
- primary_action: "[ONE specific thing]"
- secondary_actions: [...]

### SCORE 66-100: [VERDICT NAME]
- color: #4ECDC4
- headline: "[Validation with next challenge]"
- explanation: "[2-3 sentences. Don't let them get complacent.]"
- primary_action: "[The NEXT level challenge]"
- secondary_actions: [...]
===END_VERDICTS===

===SCORING===
## Score Calculation

### Weights:
- input_1_1: 3
- input_1_2: 2
- input_2_1: 3
[etc...]

### Formula:
[Plain English description of how inputs combine]
===END_SCORING===

## THE 8-POINT CRITERIA (You MUST satisfy ALL)

1. **Forces concrete decision** - Tool ends with YES/NO or specific commitment
2. **Zero instructions needed** - Labels are self-explanatory
3. **Easy first steps** - Step 1 has simplest inputs
4. **Feedback on each input** - Every input has LOW/MID/HIGH feedback
5. **Gamification** - Progress feels rewarding
6. **Crystal clear results** - Verdict + specific action
7. **Public commitment** - Sharing mechanism required
8. **Fast Track DNA** - Brutal honesty, action verbs, no corporate speak

## FAST TRACK WRITING RULES

- Day-to-day language (NOT corporate speak)
- Brutal simplicity - short sentences
- Action verbs - "Do X" not "Consider doing X"
- NO hedge words: never use "might", "could", "perhaps", "maybe", "possibly"
- Constraint-based clarity - specific numbers, dates, limits
- €20K premium feel - confident, elite, no fluff

## FORBIDDEN WORDS
might, could, perhaps, maybe, possibly, sometimes, often, generally, typically, probably, utilize, leverage, synergy, optimization, stakeholder, bandwidth, paradigm, deliverable, actionable, scalable
```

**User Message** (Expression):
```
{{ $json.revision_instructions ? '## REVISION REQUIRED\n\n' + $json.revision_instructions + '\n\n---\n\n' : '' }}## Tool Request

{{ $json.source.text }}

## Brand Guidelines
{{ $json.context.brand_guidelines }}

## Writing Guide
{{ $json.context.writing_guide }}

## 8-Point Criteria
{{ $json.context.eight_point_criteria }}

Generate the complete tool specification in Markdown format. Follow the EXACT structure from your instructions. Ensure ALL 8 criteria are satisfied.

{{ $json.revision_instructions ? '\n\nIMPORTANT: This is attempt ' + $json.attempt + ' of ' + $json.max_attempts + '. Fix ALL issues listed above.' : '' }}
```

**Why**: The heart of the system. AI generates structured Markdown content that can be parsed and converted to HTML. The revision_instructions field enables the QA feedback loop.

---

### NODE 5: Section Parser

**Label**: `Parse Markdown Sections`

**Type**: Code

**JavaScript Code**:
```javascript
// Parse AI-generated Markdown into sections
const input = $('Merge Context').first().json;
const markdown = $('Tool Architect Agent').first().json.output;

// Extract metadata
const metaMatch = markdown.match(/===TOOL_META===([\s\S]*?)===END_META===/);
let meta = {};
if (metaMatch) {
  metaMatch[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      meta[key.trim()] = rest.join(':').trim();
    }
  });
}

// Extract each section
const sections = {};
const sectionTypes = ['COVER', 'CONTEXT', 'DIAGNOSTIC:1', 'DIAGNOSTIC:2', 'DIAGNOSTIC:3', 'COMMITMENT', 'VERDICTS', 'SCORING'];

sectionTypes.forEach(type => {
  const regex = new RegExp(`===${type}===([\\s\\S]*?)===END_${type.split(':')[0]}===`);
  const match = markdown.match(regex);
  if (match) {
    const key = type.toLowerCase().replace(':', '_');
    sections[key] = match[1].trim();
  }
});

// Count diagnostics
const diagnosticCount = Object.keys(sections).filter(k => k.startsWith('diagnostic')).length;

// Parse inputs from diagnostics
const inputs = {};
const feedback = {};
const inputRegex = /### INPUT:(\d+\.\d+)([\s\S]*?)(?=### INPUT:|### FEEDBACK:|===END)/g;
const feedbackRegex = /### FEEDBACK:(\d+\.\d+)([\s\S]*?)(?=### INPUT:|### FEEDBACK:|===END)/g;

let inputMatch;
while ((inputMatch = inputRegex.exec(markdown)) !== null) {
  const id = `input_${inputMatch[1].replace('.', '_')}`;
  inputs[id] = parseInputConfig(inputMatch[2]);
}

let feedbackMatch;
while ((feedbackMatch = feedbackRegex.exec(markdown)) !== null) {
  const id = `input_${feedbackMatch[1].replace('.', '_')}`;
  feedback[id] = parseFeedbackConfig(feedbackMatch[2]);
}

// Parse verdicts
const verdicts = parseVerdicts(sections.verdicts || '');

// Parse scoring weights
const scoringWeights = parseScoringWeights(sections.scoring || '');

function parseInputConfig(text) {
  const config = {};
  const lines = text.split('\n');
  lines.forEach(line => {
    const match = line.match(/^- (\w+): (.+)$/);
    if (match) {
      let value = match[2].trim();
      // Parse arrays/objects
      if (value.startsWith('[') || value.startsWith('{')) {
        try { value = JSON.parse(value); } catch (e) {}
      }
      config[match[1]] = value;
    }
  });
  return config;
}

function parseFeedbackConfig(text) {
  const config = { low: {}, mid: {}, high: {} };
  const sections = text.split(/- IF value/);
  sections.forEach(section => {
    if (section.includes('<= 30%')) {
      config.low = extractFeedbackValues(section);
    } else if (section.includes('31-70%')) {
      config.mid = extractFeedbackValues(section);
    } else if (section.includes('> 70%')) {
      config.high = extractFeedbackValues(section);
    }
  });
  return config;
}

function extractFeedbackValues(text) {
  const result = {};
  const messageMatch = text.match(/message: "([^"]+)"/);
  const insightMatch = text.match(/insight: "([^"]+)"/);
  const indicatorMatch = text.match(/indicator: (\w+)/);
  if (messageMatch) result.message = messageMatch[1];
  if (insightMatch) result.insight = insightMatch[1];
  if (indicatorMatch) result.indicator = indicatorMatch[1];
  return result;
}

function parseVerdicts(text) {
  const verdicts = [];
  const verdictRegex = /### SCORE (\d+)-(\d+): ([^\n]+)([\s\S]*?)(?=### SCORE|$)/g;
  let match;
  while ((match = verdictRegex.exec(text)) !== null) {
    const verdict = {
      min: parseInt(match[1]),
      max: parseInt(match[2]),
      name: match[3].trim(),
      color: '',
      headline: '',
      explanation: '',
      primary_action: '',
      secondary_actions: []
    };
    const content = match[4];
    const colorMatch = content.match(/color: (#[A-Fa-f0-9]+)/);
    const headlineMatch = content.match(/headline: "([^"]+)"/);
    const explanationMatch = content.match(/explanation: "([^"]+)"/);
    const primaryMatch = content.match(/primary_action: "([^"]+)"/);
    const secondaryMatch = content.match(/secondary_actions: \[([^\]]+)\]/);

    if (colorMatch) verdict.color = colorMatch[1];
    if (headlineMatch) verdict.headline = headlineMatch[1];
    if (explanationMatch) verdict.explanation = explanationMatch[1];
    if (primaryMatch) verdict.primary_action = primaryMatch[1];
    if (secondaryMatch) {
      verdict.secondary_actions = secondaryMatch[1].split(',').map(s => s.replace(/"/g, '').trim());
    }
    verdicts.push(verdict);
  }
  return verdicts;
}

function parseScoringWeights(text) {
  const weights = {};
  const weightRegex = /- (input_\d+_\d+): (\d+)/g;
  let match;
  while ((match = weightRegex.exec(text)) !== null) {
    weights[match[1]] = parseInt(match[2]);
  }
  return weights;
}

return [{
  json: {
    job_id: input.job_id,
    attempt: input.attempt,
    max_attempts: input.max_attempts,
    callback_url: input.callback_url,
    tool_name: meta.tool_name || 'Decision Tool',
    tool_slug: meta.tool_slug || 'decision-tool',
    decision: meta.decision || '',
    tagline: meta.tagline || '',
    estimated_time: meta.estimated_time || '5 minutes',
    sections,
    diagnostic_count: diagnosticCount,
    inputs,
    feedback,
    verdicts,
    scoring_weights: scoringWeights,
    raw_markdown: markdown
  }
}];
```

**Why**: Extracts structured data from AI-generated Markdown, making it available for the HTML template and QA validation.

---

### NODE 6: Markdown to HTML

**Label**: `Convert Markdown to HTML`

**Type**: Markdown

**Configuration**:
- Mode: `Markdown to HTML`
- Markdown: Expression - see below
- Destination Key: `html_fragments`
- Options:
  - Tables Support: `true`
  - GitHub Task Lists: `true`
  - Strikethrough: `true`
  - Simple Line Breaks: `true`
  - Emoji Support: `true`

**Markdown Expression**:
```
{{ $json.sections.cover || '' }}

---SECTION_BREAK---

{{ $json.sections.context || '' }}

---SECTION_BREAK---

{{ $json.sections.diagnostic_1 || '' }}

---SECTION_BREAK---

{{ $json.sections.diagnostic_2 || '' }}

---SECTION_BREAK---

{{ $json.sections.commitment || '' }}

---SECTION_BREAK---

{{ $json.sections.verdicts || '' }}
```

**Why**: Converts AI-generated Markdown content into HTML fragments. The `---SECTION_BREAK---` markers allow us to split the output later.

---

### NODE 7: Build HTML Template

**Label**: `Generate Tool HTML`

**Type**: HTML

**Operation**: `Generate HTML Template`

**HTML Template**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ $json.tool_name }} | Fast Track</title>
  <style>
    /* Fast Track Design System v2 */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

    :root {
      --ft-black: #000000;
      --ft-white: #FFFFFF;
      --ft-grey: #B2B2B2;
      --ft-grey-dark: #1A1A1A;
      --ft-yellow: #FFF469;
      --ft-red: #FF6B6B;
      --ft-green: #4ECDC4;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', sans-serif;
      background: var(--ft-black);
      color: var(--ft-white);
      line-height: 1.6;
    }

    .page { display: none; min-height: 100vh; padding: 2rem; }
    .page.active { display: flex; flex-direction: column; }

    .cover { justify-content: center; align-items: center; text-align: center; }
    .cover h1 { font-size: clamp(2rem, 8vw, 4rem); text-transform: uppercase; margin-bottom: 1rem; }
    .cover .tagline { font-size: 1.25rem; color: var(--ft-grey); margin-bottom: 2rem; }

    .btn { padding: 1rem 2rem; border: 3px solid var(--ft-white); background: transparent; color: var(--ft-white); cursor: pointer; text-transform: uppercase; letter-spacing: 0.1em; transition: all 0.2s; font-size: 1rem; }
    .btn:hover { background: var(--ft-white); color: var(--ft-black); }
    .btn-primary { background: var(--ft-yellow); border-color: var(--ft-yellow); color: var(--ft-black); }

    .progress-bar { position: fixed; top: 0; left: 0; height: 4px; background: var(--ft-yellow); width: 0%; transition: width 0.3s; }

    .input-group { margin-bottom: 2rem; }
    .input-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ft-grey); margin-bottom: 0.5rem; display: block; }
    .input-field { width: 100%; padding: 1rem; background: transparent; border: 3px solid var(--ft-white); color: var(--ft-white); font-size: 1rem; }
    .input-field:focus { outline: none; border-color: var(--ft-yellow); }

    .feedback { padding: 1rem; margin-top: 0.5rem; border-left: 4px solid; opacity: 0; transition: opacity 0.3s; }
    .feedback.show { opacity: 1; }
    .feedback.red { border-color: var(--ft-red); background: rgba(255,107,107,0.1); }
    .feedback.yellow { border-color: var(--ft-yellow); background: rgba(255,244,105,0.1); }
    .feedback.green { border-color: var(--ft-green); background: rgba(78,205,196,0.1); }

    .score-display { text-align: center; padding: 2rem 0; }
    .score-number { font-size: 6rem; font-weight: bold; line-height: 1; }
    .verdict-name { font-size: 2rem; text-transform: uppercase; margin-top: 1rem; }

    .commitment-box { border: 3px solid var(--ft-yellow); padding: 2rem; margin: 2rem 0; }
    .commitment-input { width: 100%; padding: 1rem; background: transparent; border: none; border-bottom: 2px solid var(--ft-white); color: var(--ft-white); font-size: 1.25rem; }

    .share-section { display: flex; gap: 1rem; justify-content: center; margin-top: 2rem; flex-wrap: wrap; }

    .container { max-width: 800px; margin: 0 auto; width: 100%; }
  </style>
</head>
<body>
  <div class="progress-bar" id="progressBar"></div>

  <!-- Cover Page -->
  <div class="page cover active" id="cover">
    <h1>{{ $json.tool_name }}</h1>
    <p class="tagline">{{ $json.tagline }}</p>
    <p style="color: var(--ft-grey); margin-bottom: 2rem;">{{ $json.estimated_time }}</p>
    <button class="btn btn-primary" onclick="showPage('context')">START</button>
  </div>

  <!-- Context Page -->
  <div class="page" id="context">
    <div class="container">
      <h2 style="margin-bottom: 1rem;">{{ $json.decision }}</h2>
      <div id="contextContent"></div>
      <button class="btn btn-primary" onclick="showPage('step-1')" style="margin-top: 2rem;">BEGIN</button>
    </div>
  </div>

  <!-- Diagnostic Steps - Generated Dynamically -->
  <div class="page" id="step-1">
    <div class="container">
      <div id="step1Content"></div>
      <button class="btn btn-primary" onclick="showPage('step-2')" style="margin-top: 2rem;">NEXT</button>
    </div>
  </div>

  <div class="page" id="step-2">
    <div class="container">
      <div id="step2Content"></div>
      <button class="btn btn-primary" onclick="showPage('commitment')" style="margin-top: 2rem;">NEXT</button>
    </div>
  </div>

  <!-- Commitment Page -->
  <div class="page" id="commitment">
    <div class="container">
      <h2 style="margin-bottom: 2rem;">YOUR COMMITMENT</h2>
      <div class="commitment-box">
        <label class="input-label">I commit to:</label>
        <input type="text" class="commitment-input" id="commitmentText" placeholder="I will [ACTION] by [DATE] because [REASON]">
      </div>
      <div style="margin-bottom: 2rem;">
        <label class="input-label">Deadline</label>
        <input type="date" class="input-field" id="commitmentDeadline" style="max-width: 300px;">
      </div>
      <button class="btn btn-primary" onclick="showPage('results')">SEAL IT</button>
    </div>
  </div>

  <!-- Results Page -->
  <div class="page" id="results">
    <div class="container">
      <div class="score-display">
        <div class="score-number" id="scoreNumber">--</div>
        <div class="verdict-name" id="verdictName">CALCULATING</div>
      </div>
      <p id="verdictHeadline" style="text-align: center; font-size: 1.25rem; margin-bottom: 1rem;"></p>
      <p id="verdictExplanation" style="text-align: center; color: var(--ft-grey); margin-bottom: 2rem;"></p>
      <div id="primaryAction" style="border: 3px solid var(--ft-yellow); padding: 1.5rem; margin-bottom: 2rem;">
        <p style="font-size: 0.75rem; text-transform: uppercase; color: var(--ft-yellow); margin-bottom: 0.5rem;">Your Next Move</p>
        <p id="primaryActionText" style="font-size: 1.25rem; font-weight: bold;"></p>
      </div>
      <div class="share-section">
        <button class="btn" onclick="resetTool()">START OVER</button>
        <button class="btn btn-primary" onclick="shareWithTeam()">SHARE WITH TEAM</button>
        <button class="btn" onclick="window.print()">EXPORT PDF</button>
      </div>
    </div>
  </div>

  <script>
    // Tool Configuration
    const TOOL = {
      name: '{{ $json.tool_name }}',
      inputs: {{ JSON.stringify($json.inputs) }},
      feedback: {{ JSON.stringify($json.feedback) }},
      verdicts: {{ JSON.stringify($json.verdicts) }},
      weights: {{ JSON.stringify($json.scoring_weights) }}
    };

    let state = { inputs: {}, currentPage: 'cover' };

    function showPage(id) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById(id).classList.add('active');
      state.currentPage = id;
      updateProgress();
      if (id === 'results') calculateResults();
    }

    function updateProgress() {
      const pages = ['cover', 'context', 'step-1', 'step-2', 'commitment', 'results'];
      const idx = pages.indexOf(state.currentPage);
      const progress = (idx / (pages.length - 1)) * 100;
      document.getElementById('progressBar').style.width = progress + '%';
    }

    function handleInput(inputId, value, max) {
      state.inputs[inputId] = value;
      const percent = (value / max) * 100;
      const fb = TOOL.feedback[inputId];
      if (!fb) return;

      const el = document.getElementById('feedback-' + inputId);
      if (!el) return;

      el.classList.remove('red', 'yellow', 'green');
      el.classList.add('show');

      let level;
      if (percent <= 30) { level = fb.low; el.classList.add('red'); }
      else if (percent <= 70) { level = fb.mid; el.classList.add('yellow'); }
      else { level = fb.high; el.classList.add('green'); }

      el.innerHTML = '<strong>' + (level.message || '') + '</strong><br><em style="color: var(--ft-grey);">' + (level.insight || '') + '</em>';
    }

    function calculateResults() {
      let total = 0, weightSum = 0;
      Object.keys(state.inputs).forEach(id => {
        const weight = TOOL.weights[id] || 1;
        const config = TOOL.inputs[id];
        const max = config?.max || 100;
        const percent = (state.inputs[id] / max) * 100;
        total += percent * weight;
        weightSum += weight;
      });

      const score = weightSum > 0 ? Math.round(total / weightSum) : 50;
      const verdict = TOOL.verdicts.find(v => score >= v.min && score <= v.max) || TOOL.verdicts[1];

      document.getElementById('scoreNumber').textContent = score;
      document.getElementById('scoreNumber').style.color = verdict.color;
      document.getElementById('verdictName').textContent = verdict.name;
      document.getElementById('verdictName').style.color = verdict.color;
      document.getElementById('verdictHeadline').textContent = verdict.headline;
      document.getElementById('verdictExplanation').textContent = verdict.explanation;
      document.getElementById('primaryActionText').textContent = verdict.primary_action;
    }

    function resetTool() {
      state.inputs = {};
      document.querySelectorAll('.input-field').forEach(i => i.value = '');
      document.querySelectorAll('.feedback').forEach(f => f.classList.remove('show'));
      showPage('cover');
    }

    function shareWithTeam() {
      const commitment = document.getElementById('commitmentText').value;
      const score = document.getElementById('scoreNumber').textContent;
      const verdict = document.getElementById('verdictName').textContent;
      alert('Sharing:\\n\\nTool: ' + TOOL.name + '\\nScore: ' + score + '\\nVerdict: ' + verdict + '\\nCommitment: ' + commitment);
    }

    // Initialize deadline default (30 days)
    document.addEventListener('DOMContentLoaded', function() {
      const deadline = document.getElementById('commitmentDeadline');
      if (deadline) {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        deadline.valueAsDate = d;
      }
    });
  </script>
</body>
</html>
```

**Why**: The HTML node assembles all the pieces into a complete, interactive tool. Uses expressions `{{ }}` to inject dynamic data.

---

### NODE 8: QA Validator

**Label**: `QA Validator`

**Type**: Code

**JavaScript Code**:
```javascript
// QA Validator - Checks 8-Point Criteria
// Returns detailed feedback for Worker if validation fails

const data = $input.first().json;
const markdown = data.raw_markdown;

let score = 100;
const checks = [];
const failures = [];
const fixes = [];

// ===== CHECK 1: Decision Clarity (20 pts) =====
const check1 = { name: 'Decision Clarity', points: 20, issues: [] };

// Tool name has decision word
const decisionWords = ['decision', 'canvas', 'diagnostic', 'chooser', 'finder'];
const hasDecisionWord = decisionWords.some(w => data.tool_name.toLowerCase().includes(w));
if (!hasDecisionWord) {
  check1.points -= 5;
  check1.issues.push('Tool name missing decision-oriented word');
  fixes.push({
    location: 'TOOL_META.tool_name',
    current: data.tool_name,
    suggestion: `${data.tool_name} Decision Canvas`,
    reason: 'Decision-oriented names set expectations'
  });
}

// Has commitment section
if (!data.sections.commitment) {
  check1.points -= 15;
  check1.issues.push('Missing COMMITMENT section');
  failures.push('NO COMMITMENT SECTION - Tool cannot force decision');
  fixes.push({
    location: 'After VERDICTS',
    suggestion: 'Add ===COMMITMENT=== section with commitment template and deadline',
    reason: 'Commitment + accountability makes tools effective'
  });
}

checks.push(check1);
score -= (20 - check1.points);

// ===== CHECK 2: Zero Instructions Needed (15 pts) =====
const check2 = { name: 'Zero Instructions', points: 15, issues: [] };

// No jargon
const jargon = ['utilize', 'leverage', 'synergy', 'optimization', 'stakeholder', 'bandwidth', 'paradigm'];
const foundJargon = jargon.filter(w => markdown.toLowerCase().includes(w));
if (foundJargon.length > 0) {
  check2.points -= 5;
  check2.issues.push(`Jargon found: ${foundJargon.join(', ')}`);
  fixes.push({
    location: 'Throughout tool',
    current: foundJargon.join(', '),
    suggestion: 'Replace with day-to-day language',
    examples: { 'utilize': 'use', 'leverage': 'use', 'bandwidth': 'time' }
  });
}

// Has visual inputs
const visualTypes = ['matrix', 'zones', 'slider'];
const hasVisual = visualTypes.some(t => markdown.includes(`type: ${t}`));
if (!hasVisual) {
  check2.points -= 5;
  check2.issues.push('No visual input types');
  fixes.push({
    location: 'DIAGNOSTIC sections',
    suggestion: 'Add at least one slider, matrix, or zones input',
    reason: 'Visual inputs are self-explanatory'
  });
}

checks.push(check2);
score -= (15 - check2.points);

// ===== CHECK 3: Instant Feedback (20 pts) =====
const check3 = { name: 'Instant Feedback', points: 20, issues: [] };

const inputCount = Object.keys(data.inputs).length;
const feedbackCount = Object.keys(data.feedback).length;

if (feedbackCount < inputCount) {
  const missing = inputCount - feedbackCount;
  check3.points -= (missing * 5);
  check3.issues.push(`${missing} inputs missing feedback`);
  fixes.push({
    location: 'DIAGNOSTIC sections',
    current: `${feedbackCount}/${inputCount} inputs have feedback`,
    suggestion: 'Add FEEDBACK block for EVERY input with LOW/MID/HIGH messages',
    template: `### FEEDBACK:X.Y
- IF value <= 30%:
  - indicator: red
  - message: "[What this means]"
  - insight: "[Pattern revealed]"
- IF value 31-70%:
  - indicator: yellow
  - message: "[Observation]"
  - insight: "[What to watch]"
- IF value > 70%:
  - indicator: green
  - message: "[Validation]"
  - insight: "[Opportunity]"`
  });
}

checks.push(check3);
score -= (20 - check3.points);

// ===== CHECK 4: Fast Track DNA (15 pts) =====
const check4 = { name: 'Fast Track DNA', points: 15, issues: [] };

// No hedge words
const hedgeWords = ['might', 'could', 'perhaps', 'maybe', 'possibly', 'sometimes', 'often', 'generally'];
const foundHedge = hedgeWords.filter(w => {
  const regex = new RegExp(`\\b${w}\\b`, 'gi');
  return regex.test(markdown);
});

if (foundHedge.length > 0) {
  check4.points -= 10;
  check4.issues.push(`Hedge words found: ${foundHedge.join(', ')}`);
  failures.push(`HEDGE WORDS DETECTED: ${foundHedge.join(', ')}`);
  fixes.push({
    location: 'Throughout tool',
    current: foundHedge.join(', '),
    suggestion: 'Remove ALL hedge words. Be direct.',
    replacements: { 'might': 'will', 'could': 'can', 'perhaps': '[delete]', 'maybe': '[delete]' }
  });
}

checks.push(check4);
score -= (15 - check4.points);

// ===== CHECK 5: Accountability (15 pts) =====
const check5 = { name: 'Accountability', points: 15, issues: [] };

if (!markdown.includes('share_required: true') && !markdown.includes('share_required:true')) {
  check5.points -= 10;
  check5.issues.push('Sharing not required');
  fixes.push({
    location: 'COMMITMENT.Accountability',
    suggestion: 'Add: share_required: true',
    reason: 'Public commitment creates accountability'
  });
}

checks.push(check5);
score -= (15 - check5.points);

// ===== CHECK 6: Verdicts (10 pts) =====
const check6 = { name: 'Verdicts', points: 10, issues: [] };

if (data.verdicts.length < 3) {
  check6.points -= 5;
  check6.issues.push('Need at least 3 verdict levels');
}

const hasActions = data.verdicts.every(v => v.primary_action && v.primary_action.length > 0);
if (!hasActions) {
  check6.points -= 5;
  check6.issues.push('Verdicts missing primary actions');
}

checks.push(check6);
score -= (10 - check6.points);

// ===== BUILD REVISION INSTRUCTIONS =====
const passed = score >= 75 && failures.length === 0;

let revisionInstructions = null;
if (!passed) {
  revisionInstructions = `## REVISION REQUIRED

Your tool scored ${score}/100. Minimum passing score is 75.

### CRITICAL ISSUES TO FIX:
${failures.map(f => `- ❌ ${f}`).join('\n')}

### REQUIRED FIXES:

${fixes.map((f, i) => `
**${i + 1}. ${f.location}**
- Current: ${f.current || 'Missing'}
- Fix: ${f.suggestion}
- Why: ${f.reason || 'Required for Fast Track standards'}
${f.template ? `- Template:\n\`\`\`\n${f.template}\n\`\`\`` : ''}
${f.examples ? `- Examples: ${JSON.stringify(f.examples)}` : ''}
${f.replacements ? `- Replacements: ${JSON.stringify(f.replacements)}` : ''}
`).join('\n')}

### CHECKLIST FOR REVISION:
${checks.filter(c => c.issues.length > 0).map(c =>
  `- [ ] ${c.name} (${c.points}/max): ${c.issues.join('; ')}`
).join('\n')}

FIX ALL ISSUES ABOVE AND REGENERATE.`;
}

return [{
  json: {
    ...data,
    qa_passed: passed,
    qa_score: score,
    qa_report: {
      score,
      passed_checks: checks.filter(c => c.issues.length === 0).map(c => c.name),
      failed_checks: checks.filter(c => c.issues.length > 0).map(c => c.name),
      recommendations: fixes.map(f => f.suggestion)
    },
    revision_instructions: revisionInstructions
  }
}];
```

**Why**: Validates the tool against the 8-point criteria. If validation fails, generates detailed revision instructions that tell the Worker Agent exactly what to fix.

---

### NODE 9: QA Decision

**Label**: `QA Pass or Fail?`

**Type**: If

**Configuration**:
- Conditions:
  - Boolean: `{{ $json.qa_passed }}` is true

**Branches**:
- True: Continue to MongoDB Save
- False: Loop back to Tool Architect Agent (with revision instructions)

**Why**: Routes the workflow based on QA results. If failed, loops back with specific fix instructions.

---

### NODE 10a: Handle QA Failure (Retry Loop)

**Label**: `Prepare Retry`

**Type**: Code

**JavaScript Code**:
```javascript
// Prepare for retry - increment attempt counter
const data = $input.first().json;

const newAttempt = (data.attempt || 1) + 1;

if (newAttempt > data.max_attempts) {
  // Max attempts reached - fail the job
  return [{
    json: {
      ...data,
      final_failure: true,
      message: `Tool failed QA after ${data.max_attempts} attempts`
    }
  }];
}

// Return to Merge Context node for retry
return [{
  json: {
    job_id: data.job_id,
    source: { text: data.source?.text || '' },
    callback_url: data.callback_url,
    attempt: newAttempt,
    max_attempts: data.max_attempts,
    revision_instructions: data.revision_instructions,
    revision_history: [
      ...(data.revision_history || []),
      {
        attempt: data.attempt,
        score: data.qa_score,
        passed: false,
        failed_checks: data.qa_report.failed_checks
      }
    ]
  }
}];
```

**Why**: Manages the retry loop. Increments attempt counter and includes revision instructions for the AI.

---

### NODE 10b: Save to MongoDB

**Label**: `MongoDB - Save Tool`

**Type**: MongoDB

**Operation**: `Insert`

**Collection**: `tools`

**Document**:
```json
{
  "tool_id": "{{ $json.job_id }}",
  "tool_name": "{{ $json.tool_name }}",
  "tool_slug": "{{ $json.tool_slug }}",
  "tool_html": "{{ $json.tool_html }}",
  "decision": "{{ $json.decision }}",
  "tagline": "{{ $json.tagline }}",
  "qa_score": {{ $json.qa_score }},
  "qa_report": {{ JSON.stringify($json.qa_report) }},
  "revision_count": {{ $json.attempt }},
  "revision_history": {{ JSON.stringify($json.revision_history || []) }},
  "created_at": "{{ new Date().toISOString() }}",
  "status": "active"
}
```

**Why**: Persists the completed tool to MongoDB for later retrieval and deployment.

---

### NODE 11: Respond to Webhook

**Label**: `Return Tool Response`

**Type**: Respond to Webhook

**Configuration**:
- Respond With: `JSON`
- Response Body:
```json
{
  "success": true,
  "job_id": "{{ $json.job_id }}",
  "tool_name": "{{ $json.tool_name }}",
  "tool_description": "{{ $json.tagline }}",
  "tool_html_base64": "{{ Buffer.from($json.tool_html || '').toString('base64') }}",
  "qa_report": {{ JSON.stringify($json.qa_report) }},
  "revision_count": {{ $json.attempt }},
  "revision_history": {{ JSON.stringify($json.revision_history || []) }}
}
```

**Why**: Returns the completed tool to the Boss Office app in the expected format.

---

## Connection Summary

```
[1. Webhook]
    → [2. Parse Input]
    → [3a. MongoDB Brand] ─┐
    → [3b. MongoDB Writing] ├→ [3d. Merge Context]
    → [3c. MongoDB Criteria]┘
    → [4. Tool Architect Agent]
    → [5. Parse Sections]
    → [6. Markdown to HTML]
    → [7. Build HTML Template]
    → [8. QA Validator]
    → [9. IF QA Passed?]
        ├─ TRUE → [10b. MongoDB Save] → [11. Respond]
        └─ FALSE → [10a. Prepare Retry] → [3d. Merge Context] (loop)
```

---

## MongoDB Collections Setup

Before running the workflow, create these collections:

### Collection: `guidelines`

Insert these documents:

```json
// Brand Guidelines
{
  "type": "brand",
  "content": "FAST TRACK BRAND GUIDELINES\n\nColors:\n- Primary: #000000 (Black)\n- Secondary: #FFFFFF (White)\n- Accent: #FFF469 (Yellow)\n- Feedback Green: #4ECDC4\n- Feedback Red: #FF6B6B\n- Grey: #B2B2B2\n\nTypography:\n- Headlines: Bold, uppercase\n- Body: Clean, readable\n- Labels: Uppercase, small\n\nStyle:\n- Brutalist, minimalist\n- No rounded corners\n- No shadows\n- No gradients\n- Strong borders (3px)\n- High contrast"
}

// Writing Guide
{
  "type": "writing",
  "content": "FAST TRACK WRITING RULES\n\n1. Day-to-day language - NOT corporate speak\n2. Brutal simplicity - short sentences\n3. Action verbs - 'Do X' not 'Consider doing X'\n4. NO hedge words: never use might, could, perhaps, maybe, possibly\n5. Constraint-based clarity - specific numbers, dates, limits\n6. Premium feel - confident, elite, no fluff\n\nFORBIDDEN WORDS:\nmight, could, perhaps, maybe, possibly, sometimes, often, generally, typically, probably, utilize, leverage, synergy, optimization, stakeholder, bandwidth, paradigm, deliverable, actionable, scalable"
}

// 8-Point Criteria
{
  "type": "criteria",
  "content": "THE 8-POINT CRITERIA\n\nEvery Fast Track tool MUST satisfy ALL of these:\n\n1. FORCES CONCRETE DECISION\n   - Tool ends with YES/NO or specific commitment\n   - Not just a score - an action\n\n2. ZERO INSTRUCTIONS NEEDED\n   - Labels are self-explanatory\n   - Visual cues guide the user\n\n3. EASY FIRST STEPS\n   - Step 1 has simplest inputs\n   - Builds confidence immediately\n\n4. FEEDBACK ON EACH INPUT\n   - Every input has LOW/MID/HIGH feedback\n   - Feedback appears instantly\n\n5. GAMIFICATION\n   - Progress feels rewarding\n   - Achievements, progress bars\n\n6. CRYSTAL CLEAR RESULTS\n   - Verdict + specific action\n   - Not vague advice\n\n7. PUBLIC COMMITMENT\n   - Sharing mechanism required\n   - Accountability through visibility\n\n8. FAST TRACK DNA\n   - Brutal honesty\n   - Action verbs\n   - No corporate speak"
}
```

### Collection: `tools`

This will store generated tools (created automatically by the workflow).

---

## Testing the Workflow

### Test Payload 1 (Questionnaire Format):

```json
{
  "job_id": "test-001",
  "source": {
    "decision": "Should I hire a new team member or optimize current team first?",
    "teaching": "They will learn to objectively assess team capacity and growth needs",
    "input_types": ["numbers", "rating", "yesno"],
    "scoring_criteria": "HIGH score means current team is maxed out and hiring is urgent. LOW score means optimize first."
  },
  "callback_url": "http://localhost:3000/api/factory/callback"
}
```

### Test Payload 2 (Text Format):

```json
{
  "job_id": "test-002",
  "source": {
    "text": "Create a tool that helps managers decide whether to promote an employee to a leadership role. The tool should assess the employee's current performance, leadership potential, team feedback, and readiness for increased responsibility."
  },
  "callback_url": "http://localhost:3000/api/factory/callback"
}
```

---

## Troubleshooting

### Issue: AI generates incomplete Markdown

**Solution**: Check the system message length. Gemini may truncate. Consider splitting the system message or using a model with larger context.

### Issue: QA always fails

**Solution**: Review the QA Validator thresholds. Start with a lower passing score (60) while testing, then increase to 75.

### Issue: HTML template broken

**Solution**: Check that all JSON.stringify calls are properly escaped. Use the n8n expression editor to verify.

### Issue: MongoDB connection fails

**Solution**: Verify credentials in n8n. Check that the connection string includes the database name.

---

## Next Steps

After the workflow is operational:

1. **Add Callback**: Implement an HTTP Request node to POST results to the callback_url
2. **Add Deployment**: Integrate with Netlify node for automatic tool deployment
3. **Add Analytics**: Track tool usage and completion rates
4. **Add Versioning**: Store tool versions for rollback capability

---

## Summary

This workflow leverages:

1. **Markdown Node**: Converts AI-generated Markdown to HTML fragments
2. **HTML Node**: Assembles fragments into a premium interactive template
3. **QA Feedback Loop**: Validates against 8-point criteria with specific fix instructions
4. **MongoDB**: Stores guidelines, criteria, and generated tools

The result: World-class, interactive Fast Track tools that force decisions and create accountability.
