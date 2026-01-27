# N8N Tool Factory - Step-by-Step Build Guide

**Time estimate: 35 minutes**
**Your webhook URL:** `https://n8n-edge.fasttrack-diagnostic.com/webhook/tool-factory`

---

## TABLE OF CONTENTS

1. [Overview & Flow Diagram](#1-overview--flow-diagram)
2. [STEP 1: Configure Webhook Trigger](#step-1-configure-webhook-trigger)
3. [STEP 2: Parse & Normalize Input](#step-2-parse--normalize-input)
4. [STEP 3: Input Validation Gate](#step-3-input-validation-gate)
5. [STEP 4: Respond Fail - Bad Input](#step-4-respond-fail---bad-input)
6. [STEP 5: Worker Agent](#step-5-worker-agent)
7. [STEP 6: Parse Worker Output](#step-6-parse-worker-output)
8. [STEP 7: Worker Parse Gate](#step-7-worker-parse-gate)
9. [STEP 8: Retry Worker Agent](#step-8-retry-worker-agent)
10. [STEP 9: Parse Retry Output](#step-9-parse-retry-output)
11. [STEP 10: Retry Parse Gate](#step-10-retry-parse-gate)
12. [STEP 11: Respond Fail - Worker](#step-11-respond-fail---worker)
13. [STEP 12: Merge Worker Results](#step-12-merge-worker-results)
14. [STEP 13: Validate HTML Structure](#step-13-validate-html-structure)
15. [STEP 14: HTML Validation Gate](#step-14-html-validation-gate)
16. [STEP 15: Respond Fail - Invalid HTML](#step-15-respond-fail---invalid-html)
17. [STEP 16: Designer Agent](#step-16-designer-agent)
18. [STEP 17: Parse Designer Output](#step-17-parse-designer-output)
19. [STEP 18: QA Agent](#step-18-qa-agent)
20. [STEP 19: Parse QA Output](#step-19-parse-qa-output)
21. [STEP 20: QA Pass Gate](#step-20-qa-pass-gate)
22. [STEP 21: Respond Success](#step-21-respond-success)
23. [STEP 22: Respond Fail - QA Rejected](#step-22-respond-fail---qa-rejected)
24. [Testing](#testing)

---

## 1. OVERVIEW & FLOW DIAGRAM

```
START HERE
    │
    ▼
┌─────────────────────┐
│  STEP 1: Webhook    │  ← Your entry point
│  (already exists)   │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  STEP 2: Parse &    │
│  Normalize Input    │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐     ┌─────────────────────┐
│  STEP 3: IF Input   │────►│  STEP 4: Respond    │
│  Valid?             │ NO  │  Fail Bad Input     │
└─────────────────────┘     └─────────────────────┘
    │ YES
    ▼
┌─────────────────────┐
│  STEP 5: Worker     │
│  Agent (AI)         │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  STEP 6: Parse      │
│  Worker Output      │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐     ┌─────────────────────┐
│  STEP 7: IF Worker  │────►│  STEP 8: Retry      │
│  Parse OK?          │ NO  │  Worker Agent       │
└─────────────────────┘     └─────────────────────┘
    │ YES                       │
    │                           ▼
    │                   ┌─────────────────────┐
    │                   │  STEP 9: Parse      │
    │                   │  Retry Output       │
    │                   └─────────────────────┘
    │                           │
    │                           ▼
    │                   ┌─────────────────────┐     ┌─────────────────────┐
    │                   │  STEP 10: IF Retry  │────►│  STEP 11: Respond   │
    │                   │  Parse OK?          │ NO  │  Fail Worker        │
    │                   └─────────────────────┘     └─────────────────────┘
    │                           │ YES
    ▼                           ▼
┌─────────────────────────────────────────────┐
│            STEP 12: Merge Worker Results    │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────┐
│  STEP 13: Validate  │
│  HTML Structure     │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐     ┌─────────────────────┐
│  STEP 14: IF HTML   │────►│  STEP 15: Respond   │
│  Valid?             │ NO  │  Fail Invalid HTML  │
└─────────────────────┘     └─────────────────────┘
    │ YES
    ▼
┌─────────────────────┐
│  STEP 16: Designer  │
│  Agent (AI)         │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  STEP 17: Parse     │
│  Designer Output    │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  STEP 18: QA        │
│  Agent (AI)         │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  STEP 19: Parse     │
│  QA Output          │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐     ┌─────────────────────┐
│  STEP 20: IF QA     │────►│  STEP 22: Respond   │
│  Pass?              │ NO  │  Fail QA Rejected   │
└─────────────────────┘     └─────────────────────┘
    │ YES
    ▼
┌─────────────────────┐
│  STEP 21: Respond   │
│  Success            │
└─────────────────────┘
    │
    ▼
   END
```

---

## STEP 1: Configure Webhook Trigger

> **This is your starting point. You said you already have the webhook active.**

### Open your existing webhook node and verify these settings:

| Setting | Value |
|---------|-------|
| **HTTP Method** | `POST` |
| **Path** | `tool-factory` |
| **Authentication** | `None` |
| **Respond** | `Using 'Respond to Webhook' Node` ⚠️ **CRITICAL** |

### Why "Respond to Webhook Node"?
This lets us return different responses at different exit points (success, various failures).

### Screenshot reference:
```
┌──────────────────────────────────────┐
│ Webhook                              │
├──────────────────────────────────────┤
│ HTTP Method: [POST ▼]                │
│                                      │
│ Path: tool-factory                   │
│                                      │
│ Authentication: [None ▼]             │
│                                      │
│ Respond: [Using 'Respond to... ▼]    │  ← MUST be this!
└──────────────────────────────────────┘
```

### After configuring:
- Click **Save**
- Your webhook URL: `https://n8n-edge.fasttrack-diagnostic.com/webhook/tool-factory`

---

## STEP 2: Parse & Normalize Input

### Create the node:
1. Click **+** after the Webhook node
2. Search for **Code**
3. Select **Code** node

### Configure:

| Setting | Value |
|---------|-------|
| **Name** | `Parse & Normalize Input` |
| **Mode** | `Run Once for All Items` |
| **Language** | `JavaScript` |

### Paste this code:

```javascript
// Parse & Normalize Input
// Handles multiple input formats and validates required fields

const input = $input.first().json;

// Generate job_id if not provided
const job_id = input.job_id || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Extract instruction text from various formats
let instruction = null;

// Format 1: source.text (preferred)
if (input.source && input.source.text) {
  instruction = input.source.text;
}
// Format 2: source.type === 'text' with content field
else if (input.source && input.source.type === 'text' && input.source.content) {
  instruction = input.source.content;
}
// Format 3: message field (fallback)
else if (input.message) {
  instruction = input.message;
}
// Format 4: instruction field (fallback)
else if (input.instruction) {
  instruction = input.instruction;
}
// Format 5: text field (fallback)
else if (input.text) {
  instruction = input.text;
}

// Validate instruction exists
if (!instruction || typeof instruction !== 'string' || instruction.trim().length < 10) {
  return [{
    json: {
      success: false,
      error: 'INVALID_INPUT',
      message: 'Missing or invalid instruction. Provide at least 10 characters.',
      job_id: job_id
    }
  }];
}

// Extract optional context
const boss_context = input.boss_context || {};
const origin = boss_context.origin || 'unknown';
const priority = boss_context.priority || 'normal';

// Clean instruction (remove excessive whitespace)
const cleanInstruction = instruction.trim().replace(/\s+/g, ' ');

return [{
  json: {
    success: true,
    job_id: job_id,
    instruction: cleanInstruction,
    origin: origin,
    priority: priority,
    received_at: new Date().toISOString()
  }
}];
```

### Connect:
```
[Webhook Trigger] ──────► [Parse & Normalize Input]
```

---

## STEP 3: Input Validation Gate

### Create the node:
1. Click **+** after Parse & Normalize Input
2. Search for **IF**
3. Select **IF** node

### Configure:

| Setting | Value |
|---------|-------|
| **Name** | `IF Input Valid` |

### Conditions:
1. Click **Add Condition**
2. Set:
   - **Value 1:** `{{ $json.success }}`
   - **Operation:** `equals`
   - **Value 2:** `true`

### Visual:
```
┌──────────────────────────────────────┐
│ IF Input Valid                       │
├──────────────────────────────────────┤
│ Conditions:                          │
│                                      │
│ {{ $json.success }}  [equals]  true  │
│                                      │
│ [true] ──►  continues to Worker      │
│ [false] ──► goes to Fail response    │
└──────────────────────────────────────┘
```

### Connect:
```
[Parse & Normalize Input] ──────► [IF Input Valid]
```

---

## STEP 4: Respond Fail - Bad Input

### Create the node:
1. Click the **false** output of IF Input Valid
2. Search for **Respond to Webhook**
3. Select it

### Configure:

| Setting | Value |
|---------|-------|
| **Name** | `Respond Fail Bad Input` |
| **Respond With** | `JSON` |
| **Response Code** | `400` |

### Response Body:
Click on **Response Body** and paste:

```json
{
  "status": "FAIL",
  "job_id": "{{ $json.job_id }}",
  "reason": "{{ $json.message }}",
  "details": {
    "error_code": "{{ $json.error }}",
    "timestamp": "{{ $now.toISO() }}"
  }
}
```

### Connect:
```
[IF Input Valid] ──false──► [Respond Fail Bad Input]
```

---

## STEP 5: Worker Agent

### Create the node:
1. Click the **true** output of IF Input Valid
2. Search for **AI Agent**
3. Select **AI Agent** node

### Configure:

| Setting | Value |
|---------|-------|
| **Name** | `Worker Agent` |

### Add a Chat Model:
1. Click **+ Add Chat Model** under the Agent
2. Select **OpenAI Chat Model** (or your preferred model)
3. Configure:
   - **Credential:** Select your OpenAI credentials
   - **Model:** `gpt-4o` or `gpt-4-turbo` (recommended for code generation)

### Agent Settings:

| Setting | Value |
|---------|-------|
| **Prompt** | `Define below` (select this option) |
| **Text** | See PROMPT below |
| **System Message** | See SYSTEM MESSAGE below |
| **Max Iterations** | `3` |
| **Return Intermediate Steps** | `OFF` |

### PROMPT (paste in Text field):
```
Job ID: {{ $json.job_id }}
Priority: {{ $json.priority }}

INSTRUCTION FROM BOSS:
{{ $json.instruction }}

Generate the decision tool now. Output ONLY the JSON object, no markdown fences.
```

### SYSTEM MESSAGE (paste in System Message field):
```
You are WORKER, a tool-generation AI for Fast Track.

YOUR TASK:
Create a single-file interactive HTML decision tool based on the boss instruction.

TOOL REQUIREMENTS:
1. SINGLE DECISION QUESTION - The tool asks ONE clear yes/no or multiple-choice question
2. INTERACTIVE - User provides input, tool computes result
3. DECISIVE OUTPUT - Shows a clear VERDICT + EXACTLY 3 next moves
4. SELF-CONTAINED - Single HTML file with inline CSS and JS. NO external libraries.

BRAND REQUIREMENTS (Fast Track DNA):
- Colors: Black #000000, White #FFFFFF, Grey #B2B2B2, Yellow #FFF469 (accent only)
- Typography: Sans-serif stack (system fonts), uppercase headings
- Style: Sharp corners (border-radius: 0), 3px black borders on cards, no shadows
- Tone: Direct, actionable, no fluff

HTML STRUCTURE REQUIREMENTS:
- Must start with <!DOCTYPE html>
- Must have <html lang="en">
- Must have <meta charset="UTF-8">
- Must have <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Must have a <title> tag
- CSS must be in a <style> tag in <head>
- JS must be in a <script> tag before </body>
- Must have elements with these IDs: "tool-title", "tool-question", "tool-result"
- Must have a button or form to trigger computation

OUTPUT FORMAT:
You MUST output a valid JSON object with this exact structure:
{
  "tool_name": "Short name for the tool",
  "tool_description": "One sentence describing what it does",
  "decision_question": "The single question the tool answers",
  "tool_html_base64": "<base64 encoded HTML>"
}

CRITICAL:
- Output ONLY the JSON object
- Do NOT wrap in markdown code fences
- Do NOT include any text before or after the JSON
- The HTML must be base64 encoded (use standard base64, not URL-safe)
- The HTML must be complete and functional
```

### Connect:
```
[IF Input Valid] ──true──► [Worker Agent]
```

---

## STEP 6: Parse Worker Output

### Create the node:
1. Click **+** after Worker Agent
2. Search for **Code**
3. Select **Code** node

### Configure:

| Setting | Value |
|---------|-------|
| **Name** | `Parse Worker Output` |
| **Mode** | `Run Once for All Items` |
| **Language** | `JavaScript` |

### Paste this code:

```javascript
// Parse Worker Output
// Extracts and validates JSON from Worker Agent response

const input = $input.first().json;
const job_id = $('Parse & Normalize Input').first().json.job_id;

// Get the agent output text
let agentOutput = '';
if (input.output) {
  agentOutput = input.output;
} else if (input.text) {
  agentOutput = input.text;
} else if (typeof input === 'string') {
  agentOutput = input;
} else {
  // Try to find any string content
  agentOutput = JSON.stringify(input);
}

// Clean the output - remove markdown fences if present
let cleanOutput = agentOutput
  .replace(/^```json\s*/i, '')
  .replace(/^```\s*/i, '')
  .replace(/\s*```$/i, '')
  .trim();

// Try to extract JSON if wrapped in other text
const jsonMatch = cleanOutput.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  cleanOutput = jsonMatch[0];
}

// Attempt to parse JSON
let parsed = null;
let parseError = null;

try {
  parsed = JSON.parse(cleanOutput);
} catch (e) {
  parseError = e.message;
}

// Validate required fields
if (parsed) {
  const requiredFields = ['tool_name', 'tool_description', 'decision_question', 'tool_html_base64'];
  const missingFields = requiredFields.filter(f => !parsed[f]);

  if (missingFields.length > 0) {
    return [{
      json: {
        success: false,
        error: 'MISSING_FIELDS',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        job_id: job_id,
        attempt: 1,
        raw_output: agentOutput.substring(0, 500)
      }
    }];
  }

  // Validate base64
  let decodedHtml = '';
  try {
    decodedHtml = Buffer.from(parsed.tool_html_base64, 'base64').toString('utf-8');
  } catch (e) {
    return [{
      json: {
        success: false,
        error: 'INVALID_BASE64',
        message: 'tool_html_base64 is not valid base64',
        job_id: job_id,
        attempt: 1,
        raw_output: agentOutput.substring(0, 500)
      }
    }];
  }

  // Basic HTML validation
  if (!decodedHtml.includes('<!DOCTYPE html>') && !decodedHtml.includes('<!doctype html>')) {
    return [{
      json: {
        success: false,
        error: 'INVALID_HTML',
        message: 'HTML missing DOCTYPE declaration',
        job_id: job_id,
        attempt: 1,
        decoded_preview: decodedHtml.substring(0, 200)
      }
    }];
  }

  return [{
    json: {
      success: true,
      job_id: job_id,
      tool_name: parsed.tool_name,
      tool_description: parsed.tool_description,
      decision_question: parsed.decision_question,
      tool_html: decodedHtml,
      attempt: 1
    }
  }];
}

// Parse failed
return [{
  json: {
    success: false,
    error: 'JSON_PARSE_ERROR',
    message: parseError || 'Could not parse JSON from agent output',
    job_id: job_id,
    attempt: 1,
    raw_output: agentOutput.substring(0, 500)
  }
}];
```

### Connect:
```
[Worker Agent] ──────► [Parse Worker Output]
```

---

## STEP 7: Worker Parse Gate

### Create the node:
1. Click **+** after Parse Worker Output
2. Search for **IF**
3. Select **IF** node

### Configure:

| Setting | Value |
|---------|-------|
| **Name** | `IF Worker Parse OK` |

### Conditions:
- **Value 1:** `{{ $json.success }}`
- **Operation:** `equals`
- **Value 2:** `true`

### Connect:
```
[Parse Worker Output] ──────► [IF Worker Parse OK]
```

---

## STEP 8: Retry Worker Agent

### Create the node:
1. Click the **false** output of IF Worker Parse OK
2. Search for **AI Agent**
3. Select **AI Agent** node

### Configure:

| Setting | Value |
|---------|-------|
| **Name** | `Retry Worker Agent` |

### Add Chat Model (same as Worker Agent):
- Same model configuration as Step 5

### PROMPT (different from original - includes error context):
```
Job ID: {{ $('Parse & Normalize Input').first().json.job_id }}

PREVIOUS ATTEMPT FAILED WITH ERROR:
{{ $json.error }}: {{ $json.message }}

Raw output preview:
{{ $json.raw_output }}

ORIGINAL INSTRUCTION:
{{ $('Parse & Normalize Input').first().json.instruction }}

TRY AGAIN. Output ONLY a valid JSON object with these exact fields:
- tool_name (string)
- tool_description (string)
- decision_question (string)
- tool_html_base64 (base64 encoded complete HTML)

NO markdown fences. NO extra text. ONLY the JSON object.
```

### SYSTEM MESSAGE:
Same as Worker Agent (copy from Step 5)

### Connect:
```
[IF Worker Parse OK] ──false──► [Retry Worker Agent]
```

---

## STEP 9: Parse Retry Output

### Create the node:
1. Click **+** after Retry Worker Agent
2. Search for **Code**
3. Select **Code** node

### Configure:

| Setting | Value |
|---------|-------|
| **Name** | `Parse Retry Output` |
| **Mode** | `Run Once for All Items` |
| **Language** | `JavaScript` |

### Paste this code:

```javascript
// Parse Retry Output
// Same logic as Parse Worker Output but marks as attempt 2

const input = $input.first().json;
const job_id = $('Parse & Normalize Input').first().json.job_id;

let agentOutput = '';
if (input.output) {
  agentOutput = input.output;
} else if (input.text) {
  agentOutput = input.text;
} else if (typeof input === 'string') {
  agentOutput = input;
} else {
  agentOutput = JSON.stringify(input);
}

let cleanOutput = agentOutput
  .replace(/^```json\s*/i, '')
  .replace(/^```\s*/i, '')
  .replace(/\s*```$/i, '')
  .trim();

const jsonMatch = cleanOutput.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  cleanOutput = jsonMatch[0];
}

let parsed = null;
let parseError = null;

try {
  parsed = JSON.parse(cleanOutput);
} catch (e) {
  parseError = e.message;
}

if (parsed) {
  const requiredFields = ['tool_name', 'tool_description', 'decision_question', 'tool_html_base64'];
  const missingFields = requiredFields.filter(f => !parsed[f]);

  if (missingFields.length > 0) {
    return [{
      json: {
        success: false,
        error: 'MISSING_FIELDS',
        message: `Retry failed. Missing: ${missingFields.join(', ')}`,
        job_id: job_id,
        attempt: 2
      }
    }];
  }

  let decodedHtml = '';
  try {
    decodedHtml = Buffer.from(parsed.tool_html_base64, 'base64').toString('utf-8');
  } catch (e) {
    return [{
      json: {
        success: false,
        error: 'INVALID_BASE64',
        message: 'Retry failed. Invalid base64 encoding.',
        job_id: job_id,
        attempt: 2
      }
    }];
  }

  if (!decodedHtml.includes('<!DOCTYPE html>') && !decodedHtml.includes('<!doctype html>')) {
    return [{
      json: {
        success: false,
        error: 'INVALID_HTML',
        message: 'Retry failed. HTML missing DOCTYPE.',
        job_id: job_id,
        attempt: 2
      }
    }];
  }

  return [{
    json: {
      success: true,
      job_id: job_id,
      tool_name: parsed.tool_name,
      tool_description: parsed.tool_description,
      decision_question: parsed.decision_question,
      tool_html: decodedHtml,
      attempt: 2
    }
  }];
}

return [{
  json: {
    success: false,
    error: 'JSON_PARSE_ERROR',
    message: parseError || 'Retry failed. Could not parse JSON.',
    job_id: job_id,
    attempt: 2
  }
}];
```

### Connect:
```
[Retry Worker Agent] ──────► [Parse Retry Output]
```

---

## STEP 10: Retry Parse Gate

### Create the node:
1. Click **+** after Parse Retry Output
2. Search for **IF**
3. Select **IF** node

### Configure:

| Setting | Value |
|---------|-------|
| **Name** | `IF Retry Parse OK` |

### Conditions:
- **Value 1:** `{{ $json.success }}`
- **Operation:** `equals`
- **Value 2:** `true`

### Connect:
```
[Parse Retry Output] ──────► [IF Retry Parse OK]
```

---

## STEP 11: Respond Fail - Worker

### Create the node:
1. Click the **false** output of IF Retry Parse OK
2. Search for **Respond to Webhook**
3. Select it

### Configure:

| Setting | Value |
|---------|-------|
| **Name** | `Respond Fail Worker` |
| **Respond With** | `JSON` |
| **Response Code** | `500` |

### Response Body:
```json
{
  "status": "FAIL",
  "job_id": "{{ $json.job_id }}",
  "reason": "Worker agent failed after 2 attempts",
  "details": {
    "error_code": "{{ $json.error }}",
    "message": "{{ $json.message }}",
    "attempts": 2,
    "timestamp": "{{ $now.toISO() }}"
  }
}
```

### Connect:
```
[IF Retry Parse OK] ──false──► [Respond Fail Worker]
```

---

## STEP 12: Merge Worker Results

### Create the node:
1. Search for **Merge**
2. Select **Merge** node

### Configure:

| Setting | Value |
|---------|-------|
| **Name** | `Merge Worker Results` |
| **Mode** | `Combine` |
| **Combination Mode** | `Merge By Position` |

### Connect TWO inputs:
```
[IF Worker Parse OK] ──true──► [Merge Worker Results] (Input 1)
[IF Retry Parse OK] ──true──► [Merge Worker Results] (Input 2)
```

### How to connect multiple inputs:
1. Drag from IF Worker Parse OK (true) to Merge
2. Drag from IF Retry Parse OK (true) to Merge
3. n8n will automatically create Input 1 and Input 2

---

## STEP 13: Validate HTML Structure

### Create the node:
1. Click **+** after Merge Worker Results
2. Search for **Code**
3. Select **Code** node

### Configure:

| Setting | Value |
|---------|-------|
| **Name** | `Validate HTML Structure` |
| **Mode** | `Run Once for All Items` |
| **Language** | `JavaScript` |

### Paste this code:

```javascript
// Validate HTML Structure
// Checks for required elements and structure

const input = $input.first().json;
const html = input.tool_html;
const job_id = input.job_id;

const errors = [];

// Check DOCTYPE (case insensitive)
if (!/<!doctype\s+html>/i.test(html)) {
  errors.push('Missing DOCTYPE declaration');
}

// Check required meta tags
if (!/<meta\s+charset\s*=\s*["']?UTF-8["']?/i.test(html)) {
  errors.push('Missing charset meta tag');
}

if (!/<meta\s+name\s*=\s*["']?viewport["']?/i.test(html)) {
  errors.push('Missing viewport meta tag');
}

// Check for title
if (!/<title>[\s\S]*?<\/title>/i.test(html)) {
  errors.push('Missing title tag');
}

// Check for required IDs
const requiredIds = ['tool-title', 'tool-question', 'tool-result'];
for (const id of requiredIds) {
  const idRegex = new RegExp(`id\\s*=\\s*["']${id}["']`, 'i');
  if (!idRegex.test(html)) {
    errors.push(`Missing required element with id="${id}"`);
  }
}

// Check for inline CSS
if (!/<style[\s\S]*?>[\s\S]*?<\/style>/i.test(html)) {
  errors.push('Missing inline CSS (style tag)');
}

// Check for inline JS
if (!/<script[\s\S]*?>[\s\S]*?<\/script>/i.test(html)) {
  errors.push('Missing inline JavaScript (script tag)');
}

// Check for interactive elements (button or form)
if (!/<button[\s\S]*?>[\s\S]*?<\/button>/i.test(html) &&
    !/<input[\s\S]*?type\s*=\s*["']?submit["']?/i.test(html) &&
    !/<form[\s\S]*?>/i.test(html)) {
  errors.push('Missing interactive element (button or form)');
}

// Check for external resources (should NOT have any)
if (/<link[\s\S]*?href\s*=\s*["']?https?:/i.test(html)) {
  errors.push('Contains external CSS link (not allowed)');
}
if (/<script[\s\S]*?src\s*=\s*["']?https?:/i.test(html)) {
  errors.push('Contains external JavaScript (not allowed)');
}

// Size check (max 500KB)
const sizeKB = Buffer.byteLength(html, 'utf8') / 1024;
if (sizeKB > 500) {
  errors.push(`HTML too large: ${sizeKB.toFixed(1)}KB (max 500KB)`);
}

if (errors.length > 0) {
  return [{
    json: {
      success: false,
      error: 'HTML_VALIDATION_FAILED',
      message: errors.join('; '),
      job_id: job_id,
      error_count: errors.length,
      errors: errors
    }
  }];
}

return [{
  json: {
    success: true,
    job_id: job_id,
    tool_name: input.tool_name,
    tool_description: input.tool_description,
    decision_question: input.decision_question,
    tool_html: html,
    html_size_kb: sizeKB.toFixed(1)
  }
}];
```

### Connect:
```
[Merge Worker Results] ──────► [Validate HTML Structure]
```

---

## STEP 14: HTML Validation Gate

### Create the node:
1. Click **+** after Validate HTML Structure
2. Search for **IF**
3. Select **IF** node

### Configure:

| Setting | Value |
|---------|-------|
| **Name** | `IF HTML Valid` |

### Conditions:
- **Value 1:** `{{ $json.success }}`
- **Operation:** `equals`
- **Value 2:** `true`

### Connect:
```
[Validate HTML Structure] ──────► [IF HTML Valid]
```

---

## STEP 15: Respond Fail - Invalid HTML

### Create the node:
1. Click the **false** output of IF HTML Valid
2. Search for **Respond to Webhook**
3. Select it

### Configure:

| Setting | Value |
|---------|-------|
| **Name** | `Respond Fail Invalid HTML` |
| **Respond With** | `JSON` |
| **Response Code** | `422` |

### Response Body:
```json
{
  "status": "FAIL",
  "job_id": "{{ $json.job_id }}",
  "reason": "Generated HTML failed validation",
  "details": {
    "error_code": "{{ $json.error }}",
    "validation_errors": {{ $json.errors }},
    "error_count": {{ $json.error_count }},
    "timestamp": "{{ $now.toISO() }}"
  }
}
```

### Connect:
```
[IF HTML Valid] ──false──► [Respond Fail Invalid HTML]
```

---

## STEP 16: Designer Agent

### Create the node:
1. Click the **true** output of IF HTML Valid
2. Search for **AI Agent**
3. Select **AI Agent** node

### Configure:

| Setting | Value |
|---------|-------|
| **Name** | `Designer Agent` |

### Add Chat Model (same setup as before)

### PROMPT:
```
Job ID: {{ $json.job_id }}
Tool Name: {{ $json.tool_name }}

CURRENT HTML TO POLISH:
{{ $json.tool_html }}

Apply UX and brand polish. Output ONLY the JSON with polished_html_base64.
```

### SYSTEM MESSAGE:
```
You are DESIGNER, a UX/brand polish specialist for Fast Track tools.

YOUR TASK:
Polish the provided HTML tool for better UX and brand compliance.
DO NOT change the core logic or functionality.

WHAT YOU CAN CHANGE:
- Improve visual hierarchy and spacing
- Ensure brand color compliance (Black #000000, White #FFFFFF, Grey #B2B2B2, Yellow #FFF469)
- Improve typography (system sans-serif, uppercase headings)
- Add subtle hover states for buttons
- Improve mobile responsiveness
- Enhance the result display area
- Add any missing accessibility attributes (aria-labels, etc.)

WHAT YOU MUST NOT CHANGE:
- The decision question logic
- The computation/calculation code
- The three next moves in the result
- Required element IDs (tool-title, tool-question, tool-result)
- The overall tool purpose

FAST TRACK BRAND RULES:
- border-radius: 0 (never rounded)
- No box-shadow (flat design)
- 3px solid black borders on cards/containers
- Yellow (#FFF469) only for accents, errors, success checkmarks
- White background, black text as default
- Buttons: black background, white text, yellow on hover

OUTPUT FORMAT:
{
  "changes_made": ["list", "of", "changes"],
  "polished_html_base64": "<base64 encoded polished HTML>"
}

CRITICAL:
- Output ONLY the JSON object, no markdown fences
- The HTML must remain fully functional
- If the HTML is already good, return it unchanged with changes_made: ["No changes needed"]
```

### Connect:
```
[IF HTML Valid] ──true──► [Designer Agent]
```

---

## STEP 17: Parse Designer Output

### Create the node:
1. Click **+** after Designer Agent
2. Search for **Code**
3. Select **Code** node

### Configure:

| Setting | Value |
|---------|-------|
| **Name** | `Parse Designer Output` |
| **Mode** | `Run Once for All Items` |
| **Language** | `JavaScript` |

### Paste this code:

```javascript
// Parse Designer Output
// Extracts polished HTML, falls back to original if parsing fails

const input = $input.first().json;
const originalData = $('Validate HTML Structure').first().json;
const job_id = originalData.job_id;

let agentOutput = '';
if (input.output) {
  agentOutput = input.output;
} else if (input.text) {
  agentOutput = input.text;
} else if (typeof input === 'string') {
  agentOutput = input;
} else {
  agentOutput = JSON.stringify(input);
}

// Clean markdown fences
let cleanOutput = agentOutput
  .replace(/^```json\s*/i, '')
  .replace(/^```\s*/i, '')
  .replace(/\s*```$/i, '')
  .trim();

const jsonMatch = cleanOutput.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  cleanOutput = jsonMatch[0];
}

let parsed = null;
try {
  parsed = JSON.parse(cleanOutput);
} catch (e) {
  // Designer failed - use original HTML
  return [{
    json: {
      success: true,
      job_id: job_id,
      tool_name: originalData.tool_name,
      tool_description: originalData.tool_description,
      decision_question: originalData.decision_question,
      tool_html: originalData.tool_html,
      designer_applied: false,
      designer_note: 'Parse failed, using original HTML'
    }
  }];
}

// Try to decode polished HTML
if (parsed && parsed.polished_html_base64) {
  try {
    const polishedHtml = Buffer.from(parsed.polished_html_base64, 'base64').toString('utf-8');

    // Quick sanity check
    if (polishedHtml.includes('<!DOCTYPE html>') || polishedHtml.includes('<!doctype html>')) {
      return [{
        json: {
          success: true,
          job_id: job_id,
          tool_name: originalData.tool_name,
          tool_description: originalData.tool_description,
          decision_question: originalData.decision_question,
          tool_html: polishedHtml,
          designer_applied: true,
          changes_made: parsed.changes_made || []
        }
      }];
    }
  } catch (e) {
    // Fall through to use original
  }
}

// Fallback to original
return [{
  json: {
    success: true,
    job_id: job_id,
    tool_name: originalData.tool_name,
    tool_description: originalData.tool_description,
    decision_question: originalData.decision_question,
    tool_html: originalData.tool_html,
    designer_applied: false,
    designer_note: 'Invalid polished HTML, using original'
  }
}];
```

### Connect:
```
[Designer Agent] ──────► [Parse Designer Output]
```

---

## STEP 18: QA Agent

### Create the node:
1. Click **+** after Parse Designer Output
2. Search for **AI Agent**
3. Select **AI Agent** node

### Configure:

| Setting | Value |
|---------|-------|
| **Name** | `QA Agent` |

### Add Chat Model (same setup)

### PROMPT:
```
TOOL TO REVIEW:
Name: {{ $json.tool_name }}
Description: {{ $json.tool_description }}
Decision Question: {{ $json.decision_question }}

HTML CONTENT:
{{ $json.tool_html }}

Evaluate this tool against ALL criteria. Output your verdict as JSON.
```

### SYSTEM MESSAGE:
```
You are QA, the final quality gate for Fast Track decision tools.
Your verdict is FINAL. Only QA_PASS tools reach users.

EVALUATION CRITERIA (ALL must pass):

1. SINGLE DECISION QUESTION
   - Tool asks exactly ONE clear question
   - Question is answerable with the provided inputs
   - FAIL if: multiple questions, vague question, or no question

2. INTERACTIVE FUNCTIONALITY
   - User can provide input (form fields, buttons, selections)
   - Tool computes a result based on input
   - FAIL if: static content, no interactivity, broken inputs

3. DECISIVE OUTPUT
   - Shows a clear VERDICT (yes/no, go/no-go, recommended/not recommended)
   - Provides EXACTLY 3 next moves/actions
   - FAIL if: wishy-washy output, not exactly 3 next moves, generic advice

4. TECHNICAL REQUIREMENTS
   - Valid HTML5 structure
   - No external dependencies
   - Required IDs present: tool-title, tool-question, tool-result
   - Inline CSS and JS only
   - FAIL if: any external links, missing required elements

5. BRAND COMPLIANCE
   - Uses only: Black, White, Grey, Yellow (#FFF469)
   - No rounded corners (border-radius must be 0)
   - No shadows
   - FAIL if: off-brand colors, rounded elements, shadows

6. USABILITY
   - Clear instructions for the user
   - Result is easy to understand
   - Mobile-friendly layout
   - FAIL if: confusing UI, unclear result display

OUTPUT FORMAT:
{
  "verdict": "QA_PASS" or "QA_FAIL",
  "score": <number 0-100>,
  "checks": {
    "single_question": { "pass": true/false, "note": "..." },
    "interactivity": { "pass": true/false, "note": "..." },
    "decisive_output": { "pass": true/false, "note": "..." },
    "technical": { "pass": true/false, "note": "..." },
    "brand": { "pass": true/false, "note": "..." },
    "usability": { "pass": true/false, "note": "..." }
  },
  "summary": "One sentence summary"
}

CRITICAL RULES:
- Output ONLY the JSON object, no markdown fences
- verdict MUST be exactly "QA_PASS" or "QA_FAIL" (no other values)
- If ANY check fails, verdict MUST be "QA_FAIL"
- Be strict. Users depend on quality tools.
```

### Connect:
```
[Parse Designer Output] ──────► [QA Agent]
```

---

## STEP 19: Parse QA Output

### Create the node:
1. Click **+** after QA Agent
2. Search for **Code**
3. Select **Code** node

### Configure:

| Setting | Value |
|---------|-------|
| **Name** | `Parse QA Output` |
| **Mode** | `Run Once for All Items` |
| **Language** | `JavaScript` |

### Paste this code:

```javascript
// Parse QA Output
// Extracts verdict and determines final response

const input = $input.first().json;
const toolData = $('Parse Designer Output').first().json;
const job_id = toolData.job_id;

let agentOutput = '';
if (input.output) {
  agentOutput = input.output;
} else if (input.text) {
  agentOutput = input.text;
} else if (typeof input === 'string') {
  agentOutput = input;
} else {
  agentOutput = JSON.stringify(input);
}

// Clean markdown fences
let cleanOutput = agentOutput
  .replace(/^```json\s*/i, '')
  .replace(/^```\s*/i, '')
  .replace(/\s*```$/i, '')
  .trim();

const jsonMatch = cleanOutput.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  cleanOutput = jsonMatch[0];
}

let parsed = null;
try {
  parsed = JSON.parse(cleanOutput);
} catch (e) {
  // QA parse failed - treat as FAIL for safety
  return [{
    json: {
      qa_pass: false,
      job_id: job_id,
      verdict: 'QA_FAIL',
      reason: 'QA agent output could not be parsed',
      tool_html: toolData.tool_html,
      tool_name: toolData.tool_name,
      qa_report: {
        parse_error: true,
        raw_output: agentOutput.substring(0, 500)
      }
    }
  }];
}

// Extract verdict
const verdict = parsed.verdict;
const isPass = verdict === 'QA_PASS';

return [{
  json: {
    qa_pass: isPass,
    job_id: job_id,
    verdict: verdict || 'QA_FAIL',
    score: parsed.score || 0,
    summary: parsed.summary || 'No summary provided',
    checks: parsed.checks || {},
    tool_html: toolData.tool_html,
    tool_name: toolData.tool_name,
    tool_description: toolData.tool_description,
    decision_question: toolData.decision_question,
    designer_applied: toolData.designer_applied
  }
}];
```

### Connect:
```
[QA Agent] ──────► [Parse QA Output]
```

---

## STEP 20: QA Pass Gate

### Create the node:
1. Click **+** after Parse QA Output
2. Search for **IF**
3. Select **IF** node

### Configure:

| Setting | Value |
|---------|-------|
| **Name** | `IF QA Pass` |

### Conditions:
- **Value 1:** `{{ $json.qa_pass }}`
- **Operation:** `equals`
- **Value 2:** `true`

### Connect:
```
[Parse QA Output] ──────► [IF QA Pass]
```

---

## STEP 21: Respond Success

### Create the node:
1. Click the **true** output of IF QA Pass
2. Search for **Respond to Webhook**
3. Select it

### Configure:

| Setting | Value |
|---------|-------|
| **Name** | `Respond Success` |
| **Respond With** | `JSON` |
| **Response Code** | `200` |

### Response Body:
```json
{
  "status": "QA_PASS",
  "job_id": "{{ $json.job_id }}",
  "tool_name": "{{ $json.tool_name }}",
  "tool_description": "{{ $json.tool_description }}",
  "decision_question": "{{ $json.decision_question }}",
  "tool_html": {{ JSON.stringify($json.tool_html) }},
  "qa_report": {
    "score": {{ $json.score }},
    "summary": "{{ $json.summary }}",
    "checks": {{ JSON.stringify($json.checks) }},
    "designer_applied": {{ $json.designer_applied }}
  }
}
```

### Connect:
```
[IF QA Pass] ──true──► [Respond Success]
```

---

## STEP 22: Respond Fail - QA Rejected

### Create the node:
1. Click the **false** output of IF QA Pass
2. Search for **Respond to Webhook**
3. Select it

### Configure:

| Setting | Value |
|---------|-------|
| **Name** | `Respond Fail QA Rejected` |
| **Respond With** | `JSON` |
| **Response Code** | `422` |

### Response Body:
```json
{
  "status": "FAIL",
  "job_id": "{{ $json.job_id }}",
  "reason": "QA rejected the tool",
  "details": {
    "verdict": "{{ $json.verdict }}",
    "score": {{ $json.score }},
    "summary": "{{ $json.summary }}",
    "checks": {{ JSON.stringify($json.checks) }},
    "timestamp": "{{ $now.toISO() }}"
  }
}
```

### Connect:
```
[IF QA Pass] ──false──► [Respond Fail QA Rejected]
```

---

## TESTING

### Test 1: Valid Input (should succeed)

```bash
curl -X POST https://n8n-edge.fasttrack-diagnostic.com/webhook/tool-factory \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "test-001",
    "source": {
      "type": "text",
      "text": "Create a decision tool that helps someone decide if they should take a meeting. Ask about the meeting purpose and their current workload priority."
    },
    "boss_context": {
      "origin": "boss-office",
      "priority": "high"
    }
  }'
```

### Test 2: Fallback Format (should succeed)

```bash
curl -X POST https://n8n-edge.fasttrack-diagnostic.com/webhook/tool-factory \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Build a tool to decide whether to hire a contractor or do it in-house based on budget and timeline constraints."
  }'
```

### Test 3: Bad Input (should fail with 400)

```bash
curl -X POST https://n8n-edge.fasttrack-diagnostic.com/webhook/tool-factory \
  -H "Content-Type: application/json" \
  -d '{
    "foo": "bar"
  }'
```

---

## FINAL CHECKLIST

Before activating the workflow:

- [ ] All 22 nodes created
- [ ] All connections made (follow the diagram)
- [ ] Webhook set to "Respond to Webhook Node" mode
- [ ] All Code nodes have JavaScript pasted
- [ ] All AI Agents have system messages
- [ ] OpenAI credentials connected to all 3 agents
- [ ] Workflow saved
- [ ] Workflow activated

### Node Count Summary:
| Type | Count |
|------|-------|
| Webhook | 1 |
| Code | 6 |
| IF | 5 |
| AI Agent | 3 |
| Merge | 1 |
| Respond to Webhook | 5 |
| **TOTAL** | **21** |

---

## TROUBLESHOOTING

### "Expression error" in Respond nodes
- Make sure you're using the correct expression syntax
- Check that referenced nodes exist and are named exactly as shown

### AI Agent returns empty output
- Check that chat model credentials are valid
- Increase Max Iterations to 5
- Check n8n logs for API errors

### Merge node not receiving data
- Ensure both inputs are connected
- The merge only fires when at least one input receives data

### Webhook times out
- AI agents can take 30-60 seconds
- Increase your client timeout
- Consider adding streaming (advanced)

---

**You're done! Save and activate the workflow.**
