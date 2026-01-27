# Fast Track Tool System

AI-powered tool generation system for Fast Track's decision-making tools.

## Overview

This system generates interactive, decision-forcing tools for elite CEOs. Tools are created via an n8n workflow that:

1. Receives tool requests via webhook
2. Analyzes requirements and selects appropriate template
3. Generates tool content using AI (Gemini)
4. Validates quality using a different AI model (unbiased QA)
5. Deploys to GitHub with version control

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   LearnWorlds   │────▶│   n8n Workflow  │────▶│     GitHub      │
│      LMS        │     │  (Tool Factory) │     │   Repository    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │   AI Agents     │              │
         │              │  - Generator    │              │
         │              │  - QA Validator │              │
         │              │  - Revision     │              │
         │              └─────────────────┘              │
         │                                               │
         └───────────────────────┬───────────────────────┘
                                 ▼
                        ┌─────────────────┐
                        │  Deployed Tool  │
                        │  (End Users)    │
                        └─────────────────┘
```

## Tool Categories

| Category | Description |
|----------|-------------|
| B2B Product | Tools for businesses selling products to businesses |
| B2B Service | Tools for businesses selling services to businesses |
| B2C Product | Tools for businesses selling products to consumers |
| B2C Service | Tools for businesses selling services to consumers |

## Project Structure

```
ft-tool-system/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Data models
│   │   ├── routes/         # API routes
│   │   └── services/       # Business logic
│   └── package.json
├── src/                     # Frontend (Vite + TypeScript)
│   ├── api/                # API client
│   ├── assets/             # Static assets (fonts, images)
│   ├── components/         # UI components
│   ├── lib/                # Utilities
│   ├── pages/              # Page modules
│   └── styles/             # CSS
├── Designs/                 # Brand assets
│   ├── 00. brand guidelines/
│   ├── 01. favicon/
│   ├── 02. logos/
│   ├── 03. Fonts/
│   └── 04. TOV/
├── the three principles/    # Tool creation guidelines
├── n8n docs for help/       # n8n node documentation
├── example of how tools should be like/  # Reference tools
└── N8N-WORKFLOW-INSTRUCTIONS.md  # Workflow setup guide
```

## 8-Point Tool Criteria

Every generated tool must satisfy:

1. **Forces concrete decision** - YES/NO or specific commitment
2. **Zero instructions needed** - Labels are self-explanatory
3. **Easy first steps** - Step 1 has simplest inputs
4. **Feedback on each input** - Every input has LOW/MID/HIGH feedback
5. **Gamification** - Progress feels rewarding
6. **Crystal clear results** - Verdict + specific action
7. **Public commitment** - Sharing mechanism required
8. **Fast Track DNA** - Brutal honesty, action verbs, no corporate speak

## Setup

### Prerequisites

- Node.js 18+
- n8n (self-hosted)
- MongoDB Atlas
- GitHub account

### Installation

```bash
# Install dependencies
npm install
cd backend && npm install

# Start development
npm run dev
```

### n8n Workflow

See `N8N-WORKFLOW-INSTRUCTIONS.md` for complete workflow setup.

## License

Proprietary - Fast Track Ltd.
