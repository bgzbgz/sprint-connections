# n8n Boss Revision Workflow

**Webhook URL:** `https://n8n-edge.fasttrack-diagnostic.com/webhook/tool-revision`

---

## Prerequisites: Save Generated Tools in Main Workflow

**IMPORTANT:** Before this revision workflow can work, you must save generated tools to MongoDB in your main `tool-factory` workflow.

### Add to Main Workflow (Before Respond to Webhook - Success Path)

**Node: MongoDB - Save Generated Tool**
- **Operation:** Insert
- **Collection:** `generated_tools`

### Required Fields (Copy This Exactly)

| Field | Source | Purpose |
|-------|--------|---------|
| `job_id` | From webhook input | Unique identifier to find the tool later |
| `tool_name` | From Build HTML output | Display name |
| `tool_description` | From Build HTML output | Tool description |
| `tool_html` | From Build HTML output (base64) | The generated HTML |
| `original_instruction` | From webhook input `source.text` | What the Boss originally asked for |
| `config` | From worker agent output | The JSON config used to build the tool |
| `created_at` | Current timestamp | When tool was generated |
| `revision_count` | Set to 0 | Tracks how many times revised |

### Document Expression (Use in n8n)

```json
{
  "job_id": "{{ $json.job_id }}",
  "tool_name": "{{ $json.tool_name }}",
  "tool_description": "{{ $json.tool_description }}",
  "tool_html": "{{ $json.tool_html_base64 }}",
  "original_instruction": "{{ $('Webhook').item.json.source.text }}",
  "config": {{ JSON.stringify($json.config) }},
  "created_at": "{{ new Date().toISOString() }}",
  "revision_count": 0
}
```

### Where to Connect

Place this node **after** the successful Build HTML node and **before** the Respond to Webhook node:

```
Build HTML (success)
       ↓
MongoDB - Save Generated Tool  ← ADD THIS
       ↓
Respond to Webhook (success)
```

This gives the revision workflow everything it needs: the original instruction, the current HTML, and the config.

---

## What This Workflow Does

1. Boss sees a tool in the inbox and wants changes
2. Boss types revision notes (e.g., "Make the questions shorter")
3. Boss Office sends **only job_id + revision_notes** to n8n
4. n8n fetches the tool from MongoDB `generated_tools` collection
5. n8n fetches the three principles from MongoDB
6. Revision Agent applies the changes
7. Revised tool saved back to MongoDB
8. Result sent back to Boss Office via callback

---

## Payload From Boss Office (Simplified)

```json
{
  "job_id": "uuid-here",
  "revision_notes": "Make the questions more direct. Remove the explanation text.",
  "callback_url": "https://your-ngrok.ngrok.io/api/factory/callback"
}
```

The workflow fetches everything else from MongoDB.

---

## Workflow Nodes (In Order)

### 1. Webhook - Receive Revision Request

**Node Type:** Webhook
**Settings:**
- HTTP Method: POST
- Path: `tool-revision`
- Response Mode: Using 'Respond to Webhook' node

---

### 2. MongoDB - Get Generated Tool

**Node Type:** MongoDB
**Settings:**
- Operation: Find
- Collection: `generated_tools`
- Query: `{ "job_id": "{{ $json.job_id }}" }`
- Limit: 1

This fetches the original tool with all its context (HTML, config, original instruction).

---

### 3. Code - Prepare Revision Context

**Node Type:** Code
**JavaScript:**

```javascript
const webhookInput = $('Webhook').first().json;
const toolDoc = $('MongoDB - Get Generated Tool').first().json;

// Validate
if (!toolDoc || !toolDoc.job_id) {
  throw new Error('Tool not found in database for job_id: ' + webhookInput.job_id);
}

// Decode current HTML from base64
const currentHtml = Buffer.from(toolDoc.tool_html, 'base64').toString('utf-8');

return [{
  json: {
    job_id: webhookInput.job_id,
    revision_notes: webhookInput.revision_notes,
    callback_url: webhookInput.callback_url,
    tool_name: toolDoc.tool_name,
    tool_description: toolDoc.tool_description,
    original_instruction: toolDoc.original_instruction,
    current_html: currentHtml,
    config: toolDoc.config,
    revision_count: (toolDoc.revision_count || 0) + 1
  }
}];
```

---

### 4. MongoDB - Get Brand Guidelines

**Node Type:** MongoDB
**Settings:**
- Operation: Find
- Collection: `three_principles`
- Query: `{ "type": "brand_guidelines" }`

---

### 5. MongoDB - Get Writing Guide

**Node Type:** MongoDB
**Settings:**
- Operation: Find
- Collection: `three_principles`
- Query: `{ "type": "writing_guides" }`

---

### 6. MongoDB - Get 8-Point Criteria

**Node Type:** MongoDB
**Settings:**
- Operation: Find
- Collection: `three_principles`
- Query: `{ "type": "8_point_criteria" }`

---

### 7. AI Agent - Revision Agent

**Node Type:** AI Agent
**System Prompt:**

```
You are a Fast Track Tool Revision Agent. Your job is to revise the JSON config of a tool based on the Boss's feedback.

## Your Task
1. Read the current tool config (JSON)
2. Understand what the Boss wants changed (revision notes)
3. Modify ONLY the relevant fields in the config
4. Keep everything else intact
5. Return the complete revised JSON config

## Rules
- DO NOT change anything the Boss didn't ask to change
- Preserve all existing config structure
- Maintain Fast Track DNA (brutal honesty, short sentences, no hedging)
- The tool must still pass all 8-point criteria after revision

## Brand Guidelines
{{ $('MongoDB - Get Brand Guidelines').first().json.content }}

## Writing Guide
{{ $('MongoDB - Get Writing Guide').first().json.content }}

## 8-Point Quality Criteria
{{ $('MongoDB - Get 8-Point Criteria').first().json.content }}

## Output Format
Return ONLY valid JSON. No explanations, no markdown, just the config object.
```

**User Message:**

```
## Original Instruction
{{ $('Code - Prepare Revision Context').first().json.original_instruction }}

## Boss Revision Request
{{ $('Code - Prepare Revision Context').first().json.revision_notes }}

## Current Tool Config (modify this)
{{ JSON.stringify($('Code - Prepare Revision Context').first().json.config, null, 2) }}

Apply the Boss's requested changes and return the complete revised JSON config.
```

---

### 8. Code - Parse Revised Config

**Node Type:** Code
**JavaScript:**

```javascript
const context = $('Code - Prepare Revision Context').first().json;
const agentOutput = $('AI Agent - Revision Agent').first().json.output;

// Parse the JSON config from agent output
let revisedConfig;
try {
  // Try to extract JSON from the output (in case agent added extra text)
  const jsonMatch = agentOutput.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    revisedConfig = JSON.parse(jsonMatch[0]);
  } else {
    throw new Error('No JSON found in agent output');
  }
} catch (e) {
  throw new Error('Failed to parse revised config: ' + e.message);
}

return [{
  json: {
    job_id: context.job_id,
    callback_url: context.callback_url,
    tool_name: revisedConfig.tool_name || context.tool_name,
    tool_description: revisedConfig.tool_description || context.tool_description,
    config: revisedConfig,
    revision_notes: context.revision_notes,
    revision_count: context.revision_count
  }
}];
```

---

### 9. Code - Build HTML

**Node Type:** Code
**JavaScript:**

Use the **same Build HTML code** from your main tool-factory workflow. This ensures consistent HTML generation.

```javascript
// Build HTML from config - COPY FROM YOUR MAIN WORKFLOW
const input = $input.first().json;
const config = input.config;

// === PASTE YOUR BUILD HTML CODE HERE ===
// This should be identical to your main workflow's Build HTML node
// It takes config and generates the complete HTML tool

// Example structure (replace with your actual code):
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${config.tool_name}</title>
  <!-- Your styles -->
</head>
<body>
  <!-- Your HTML generation logic -->
</body>
</html>`;

const htmlBase64 = Buffer.from(html).toString('base64');

return [{
  json: {
    success: true,
    job_id: input.job_id,
    callback_url: input.callback_url,
    tool_name: config.tool_name,
    tool_description: config.tool_description,
    tool_html_base64: htmlBase64,
    config: config,
    revision_applied: input.revision_notes,
    revision_count: input.revision_count,
    revised_at: new Date().toISOString()
  }
}];
```

**IMPORTANT:** Copy your existing Build HTML code from the main workflow to keep HTML generation consistent.

---

### 10. MongoDB - Update Generated Tool

**Node Type:** MongoDB
**Settings:**
- Operation: Update
- Collection: `generated_tools`
- Query: `{ "job_id": "{{ $json.job_id }}" }`
- Update:
```json
{
  "$set": {
    "tool_html": "{{ $json.tool_html_base64 }}",
    "config": {{ JSON.stringify($json.config) }},
    "revision_count": {{ $json.revision_count }},
    "last_revision_notes": "{{ $json.revision_applied }}",
    "revised_at": "{{ $json.revised_at }}"
  }
}
```

This saves both the revised HTML and the revised config back to MongoDB so future revisions start from the latest version.

---

### 11. HTTP Request - Send Callback

**Node Type:** HTTP Request
**Settings:**
- Method: POST
- URL: `{{ $json.callback_url }}`
- Body Content Type: JSON
- Body:

```json
{
  "job_id": "{{ $json.job_id }}",
  "status": "revision_complete",
  "tool_name": "{{ $json.tool_name }}",
  "tool_html_base64": "{{ $json.tool_html_base64 }}",
  "revision_applied": "{{ $json.revision_applied }}",
  "revision_count": {{ $json.revision_count }},
  "revised_at": "{{ $json.revised_at }}"
}
```

---

### 12. Respond to Webhook - Acknowledge

**Node Type:** Respond to Webhook
**Settings:**
- Response Code: 200
- Response Body:

```json
{
  "status": "processing",
  "job_id": "{{ $('Webhook').item.json.job_id }}",
  "message": "Revision request received, processing"
}
```

---

## Node Connections

```
Webhook
    ↓
MongoDB - Get Generated Tool
    ↓
Code - Prepare Revision Context
    ↓
┌─────────────────────────────────────┐
│  MongoDB - Get Brand Guidelines     │──┐
├─────────────────────────────────────┤  │
│  MongoDB - Get Writing Guide        │──┼──→ AI Agent - Revision Agent
├─────────────────────────────────────┤  │              ↓
│  MongoDB - Get 8-Point Criteria     │──┘    Code - Parse Revised Config
└─────────────────────────────────────┘                 ↓
                                                Code - Build HTML
                                                        ↓
                                              MongoDB - Update Generated Tool
                                                        ↓
                                              HTTP Request - Send Callback
                                                        ↓
                                              Respond to Webhook
```

**Important:** The three MongoDB principle nodes run in parallel, then all feed into the AI Agent. The agent outputs JSON, which is parsed and then converted to HTML by the Build HTML code node.

---

## Backend Update Required

In `backend/src/routes/jobs.ts`, update the `request-revision` endpoint to call this webhook.

**Note:** The payload is now simplified - n8n fetches the tool from MongoDB using the job_id.

```typescript
// POST /api/jobs/:id/request-revision
router.post('/:id/request-revision', async (req, res) => {
  const { id } = req.params;
  const { revision_notes } = req.body;

  // Validate revision notes
  if (!revision_notes || revision_notes.trim() === '') {
    return res.status(400).json({ error: 'Revision notes are required' });
  }

  // Get job
  const job = getJob(id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.status !== JobStatus.READY_FOR_REVIEW) {
    return res.status(400).json({ error: 'Job is not ready for revision' });
  }

  // Build simplified payload - n8n fetches tool from MongoDB
  const payload = {
    job_id: job.job_id,
    revision_notes: revision_notes,
    callback_url: process.env.CALLBACK_URL || 'http://localhost:3000/api/factory/callback'
  };

  // Send to n8n revision webhook
  const REVISION_WEBHOOK = 'https://n8n-edge.fasttrack-diagnostic.com/webhook/tool-revision';

  try {
    const response = await fetch(REVISION_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      // Update job status
      updateJob(id, {
        status: JobStatus.REVISION_REQUESTED,
        revision_notes: revision_notes
      });

      return res.json({
        success: true,
        message: 'Revision request sent to Factory'
      });
    } else {
      return res.status(500).json({ error: 'Failed to send revision request' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Network error sending revision request' });
  }
});
```

---

## Testing

1. Have a tool in READY_FOR_REVIEW status with tool_html
2. Call: `POST /api/jobs/{job_id}/request-revision`
   ```json
   { "revision_notes": "Make the questions shorter and more direct" }
   ```
3. n8n receives request, revises tool, sends callback
4. Boss Office receives updated tool

---

## Error Handling

Add an Error node connected to the AI Agent to catch failures:

**On Error → Code - Handle Error → HTTP Request (error callback)**

```javascript
// Code - Handle Error
const context = $('Code - Prepare Revision Context').first().json;

return [{
  json: {
    job_id: context.job_id,
    callback_url: context.callback_url,
    status: 'revision_failed',
    error: 'Failed to apply revision'
  }
}];
```
