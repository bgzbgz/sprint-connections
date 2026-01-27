# QA Revision Loop - n8n Implementation Guide

## Overview

This guide adds an automatic revision loop to your Tool Factory workflow. When QA fails (score < 70), the tool will be automatically revised and re-evaluated up to 3 times before being sent to Boss Office.

---

## Current Flow (Before)

```
Worker Agent1 → Build HTML → QA Agent1 → Parse QA Result → Respond to Webhook1
```

## New Flow (After)

```
Worker Agent1 → Build HTML → QA Agent1 → Parse QA Result → IF QA Passed?
                    ↑                                          │
                    │                                    YES   │   NO
                    │                                     ↓    ↓
                    │                              Respond   IF Max Attempts?
                    │                              (success)      │
                    │                                       YES   │   NO
                    │                                        ↓    ↓
                    └──── Rebuild HTML ◄── Revision Agent  Respond
                              ↑                            (failed)
                              │
                         Track Attempts
```

---

## Step 1: Modify "Parse QA Result" Node

**Node:** `Parse QA Result`
**Action:** Update the code to track attempt count and history

Replace the existing code with:

```javascript
// Parse QA Result - with revision tracking
const toolData = $('Continue to Build HTML').first().json;
const agentOutput = $input.first().json;

// Get existing attempt data (if in a retry loop)
let attemptCount = toolData.attempt_count || 1;
let revisionHistory = toolData.revision_history || [];

// Extract the JSON from agent response
let qaReport = {
  score: 0,
  passed_checks: [],
  failed_checks: [],
  recommendations: []
};

try {
  const outputText = agentOutput.output || agentOutput.text || JSON.stringify(agentOutput);
  const jsonMatch = outputText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    qaReport = JSON.parse(jsonMatch[0]);
  }
} catch (e) {
  qaReport = {
    score: 50,
    passed_checks: ["Tool generated"],
    failed_checks: ["QA parsing failed - manual review needed"],
    recommendations: ["Review tool manually"]
  };
}

// Add this attempt to history
revisionHistory.push({
  attempt: attemptCount,
  score: qaReport.score,
  passed: qaReport.score >= 70,
  failed_checks: qaReport.failed_checks,
  recommendations: qaReport.recommendations
});

// Determine if QA passed
const qaPassed = qaReport.score >= 70;

return {
  json: {
    ...toolData,
    qa_report: qaReport,
    qa_passed: qaPassed,
    attempt_count: attemptCount,
    revision_history: revisionHistory
  }
};
```

---

## Step 2: Add "IF QA Passed" Node

**Add new node after "Parse QA Result"**

| Setting | Value |
|---------|-------|
| **Type** | IF |
| **Name** | `IF QA Passed` |
| **Condition** | `{{ $json.qa_passed }}` equals `true` (boolean) |

**Configuration:**
```
Conditions:
- Value 1: {{ $json.qa_passed }}
- Operation: is true (boolean)
```

---

## Step 3: Add "IF Max Attempts" Node

**Add new node on the FALSE branch of "IF QA Passed"**

| Setting | Value |
|---------|-------|
| **Type** | IF |
| **Name** | `IF Max Attempts` |
| **Condition** | `{{ $json.attempt_count }}` is less than `3` |

**Configuration:**
```
Conditions:
- Value 1: {{ $json.attempt_count }}
- Operation: Smaller (<)
- Value 2: 3
```

---

## Step 4: Add "Revision Agent" Node

**Add new node on the TRUE branch of "IF Max Attempts"**

| Setting | Value |
|---------|-------|
| **Type** | AI Agent (`@n8n/n8n-nodes-langchain.agent`) |
| **Name** | `Revision Agent` |
| **Prompt** | Define below |

### User Prompt (Text):

```
You need to revise a Fast Track tool configuration that failed QA.

ORIGINAL INSTRUCTION:
{{ $('IF Input Valid').first().json.instruction }}

CURRENT CONFIG:
{{ JSON.stringify($('parse json config').first().json.config, null, 2) }}

QA FEEDBACK:
- Score: {{ $json.qa_report.score }}/100 (needs 70+ to pass)
- Failed Checks: {{ JSON.stringify($json.qa_report.failed_checks) }}
- Recommendations: {{ JSON.stringify($json.qa_report.recommendations) }}

ATTEMPT: {{ $json.attempt_count }} of 3

Based on the QA feedback, revise the configuration to address ALL failed checks and recommendations.

Output ONLY the revised JSON configuration object. No explanations, no markdown.
```

### System Message (in Options):

```
You are a Fast Track Tool Configuration Reviser. Your job is to improve tool configurations based on QA feedback.

RULES:
1. Read the QA failed_checks and recommendations carefully
2. Modify the configuration to address EVERY issue mentioned
3. Keep the tool's core purpose intact
4. Ensure brutal simplicity (5-7 questions max, under 3 minutes)
5. Use clear, action-oriented language
6. Remove any redundant or unnecessary questions
7. Make sure inputs are intuitive (sliders, dropdowns over text fields)

OUTPUT FORMAT:
- Output ONLY valid JSON
- No markdown code blocks
- No explanations before or after
- Just the raw JSON configuration object

The revised config must follow the exact same schema as the input config.
```

### Options:
- **Max Iterations:** 3
- Connect to **Google Gemini Chat Model4** (same as Worker Agent1)

---

## Step 5: Add "Prepare Retry" Code Node

**Add new node after "Revision Agent"**

| Setting | Value |
|---------|-------|
| **Type** | Code |
| **Name** | `Prepare Retry` |
| **Language** | JavaScript |

**Code:**

```javascript
// Prepare Retry - formats revised config for rebuild
const previousData = $('Parse QA Result').first().json;
const revisionOutput = $input.first().json;

// Parse the revised config from agent output
let revisedConfig = null;
try {
  let outputText = revisionOutput.output || revisionOutput.text || JSON.stringify(revisionOutput);

  // Clean up markdown if present
  outputText = outputText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const jsonMatch = outputText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    revisedConfig = JSON.parse(jsonMatch[0]);
  }
} catch (e) {
  // If parsing fails, use original config
  revisedConfig = $('parse json config').first().json.config;
}

// Return data formatted for Build HTML node
return {
  json: {
    success: true,
    job_id: previousData.job_id,
    callback_url: previousData.callback_url,
    config: revisedConfig,
    // Increment attempt count for next round
    attempt_count: previousData.attempt_count + 1,
    revision_history: previousData.revision_history
  }
};
```

---

## Step 6: Add "Build HTML Retry" Code Node

**Add new node after "Prepare Retry"**

| Setting | Value |
|---------|-------|
| **Type** | Code |
| **Name** | `Build HTML Retry` |
| **Language** | JavaScript |

**Code:**

Copy the EXACT same code from your existing "Continue to Build HTML" node, but add these lines at the end before the return statement:

```javascript
// ... (all the existing Build HTML code) ...

// At the very end, REPLACE the return statement with this:
// Preserve attempt tracking data
const attemptCount = input.attempt_count || 1;
const revisionHistory = input.revision_history || [];

return [{
  json: {
    success: true,
    job_id: job_id,
    callback_url: input.callback_url,
    tool_name: config.tool_name,
    tool_description: config.tool_description,
    tool_html_base64: htmlBase64,
    // Pass through revision tracking
    attempt_count: attemptCount,
    revision_history: revisionHistory,
    // Include config for potential further revisions
    config: config
  }
}];
```

**Important:** This node's code is identical to "Continue to Build HTML" except it preserves `attempt_count` and `revision_history`.

---

## Step 7: Add "Respond Failed QA" Node

**Add new node on the FALSE branch of "IF Max Attempts"**

| Setting | Value |
|---------|-------|
| **Type** | Respond to Webhook |
| **Name** | `Respond Failed QA` |

**Response Body:**

```json
{
  "status": "failed_qa",
  "tool_name": "{{ $json.tool_name }}",
  "tool_description": "{{ $json.tool_description }}",
  "tool_html_base64": "{{ $json.tool_html_base64 }}",
  "qa_report": {{ JSON.stringify($json.qa_report) }},
  "revision_history": {{ JSON.stringify($json.revision_history) }},
  "message": "Tool failed QA after 3 revision attempts"
}
```

---

## Step 8: Update "Respond to Webhook1" Node

**Modify existing node to include revision history**

**New Response Body:**

```json
{
  "status": "success",
  "tool_name": "{{ $json.tool_name }}",
  "tool_description": "{{ $json.tool_description }}",
  "tool_html_base64": "{{ $json.tool_html_base64 }}",
  "qa_report": {{ JSON.stringify($json.qa_report) }},
  "revision_history": {{ JSON.stringify($json.revision_history) }},
  "revision_count": {{ $json.attempt_count || 1 }}
}
```

---

## Step 9: Update Connections

### Disconnect:
1. `Parse QA Result` → `Respond to Webhook1` (remove this connection)

### Connect:
1. `Parse QA Result` → `IF QA Passed`
2. `IF QA Passed` (TRUE/Yes) → `Respond to Webhook1`
3. `IF QA Passed` (FALSE/No) → `IF Max Attempts`
4. `IF Max Attempts` (TRUE/Yes - attempts remaining) → `Revision Agent`
5. `IF Max Attempts` (FALSE/No - max reached) → `Respond Failed QA`
6. `Revision Agent` → `Prepare Retry`
7. `Prepare Retry` → `Build HTML Retry`
8. `Build HTML Retry` → `QA Agent1` (creates the loop!)

### Connect Chat Model:
- `Google Gemini Chat Model4` → `Revision Agent` (ai_languageModel connection)

---

## Final Connection Diagram

```
                                                    ┌─────────────────┐
                                                    │  Respond to     │
                                              YES   │  Webhook1       │
                                               ┌───►│  (success)      │
                                               │    └─────────────────┘
┌──────────┐    ┌──────────┐    ┌───────────┐  │
│ Continue │    │ QA       │    │ Parse QA  │  │    ┌─────────────────┐
│ to Build │───►│ Agent1   │───►│ Result    │──┴───►│  IF QA Passed   │
│ HTML     │    │          │    │           │       │                 │
└──────────┘    └──────────┘    └───────────┘       └────────┬────────┘
      ▲                                                      │ NO
      │                                                      ▼
      │                                             ┌─────────────────┐
      │                                             │ IF Max Attempts │
      │                                             │                 │
      │                                             └────────┬────────┘
      │                                               YES    │    NO
      │                                                ▼     ▼
      │         ┌──────────┐    ┌───────────┐    ┌─────────────────┐
      │         │ Prepare  │    │ Revision  │    │ Respond Failed  │
      │         │ Retry    │◄───│ Agent     │◄───┤ QA              │
      │         │          │    │           │    └─────────────────┘
      │         └────┬─────┘    └───────────┘
      │              │
      │              ▼
      │         ┌──────────┐
      └─────────│ Build    │
                │ HTML     │
                │ Retry    │
                └──────────┘
```

---

## Testing

1. Save the workflow
2. Submit a test tool from Boss Office
3. Check n8n Executions to see:
   - First QA evaluation
   - If score < 70: Revision Agent runs
   - Loop continues until pass or 3 attempts
4. Check the response includes `revision_history` and `revision_count`

---

## Backend Update Required

Update `backend/src/routes/jobs.ts` to handle the new response fields:

```typescript
// In the section that handles factory response:
if (factoryQA) {
  console.log(`[Jobs] QA Report received - score: ${factoryQA.score}`);
  job.qa_report = factoryQA;
  job.qa_status = factoryQA.score >= 70 ? 'PASS' : 'FAIL';
}

// Add revision history tracking
if (submitResult.factoryResponse?.revision_history) {
  job.revision_history = submitResult.factoryResponse.revision_history;
  job.revision_count = submitResult.factoryResponse.revision_count || 1;
  console.log(`[Jobs] Tool revised ${job.revision_count} time(s)`);
}

// Handle failed_qa status
if (submitResult.factoryResponse?.status === 'failed_qa') {
  console.log(`[Jobs] Tool failed QA after max attempts`);
  job.qa_status = 'FAIL';
  // Still send to Boss Office for manual review
}
```

---

## Next Steps

Once this is working, proceed to Part 2: Boss Revision Webhook (separate instructions file).
