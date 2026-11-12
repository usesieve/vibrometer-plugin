---
name: ask
description: Ask the active Vibrometer challenge's stakeholder a question. Each challenge allows only a few questions. Use when the user wants to ask the stakeholder something, or to list the answers so far.
allowed-tools: Bash(node:*)
---

Questions are limited, so never ask one on your own initiative. Ask only a question that the user wrote or approved in this conversation. If you think a question would help, suggest the exact wording to the user and wait for them to agree.

Ask it (keep the user's wording):

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/vibrometer.mjs" ask "<the question>"
```

To list the questions asked so far and their answers, run the same command with no question.

Show the user the answer and how many questions are left. Questions that the stakeholder couldn't match to anything are free; the output says so.
