---
name: update
description: Fetch follow-ups for the active Vibrometer challenge (new data files and changed requirements released partway through). Use when the user wants to check for or fetch challenge updates, or when submit says a follow-up has arrived.
allowed-tools: Bash(node:*)
---

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/vibrometer.mjs" update
```

This adds or replaces files under `data/` and saves the stakeholder's message as `CHANGE-<n>.md`. Show the user the message and the list of changed files, then re-read the requirements before changing the solution: a follow-up can change rules that the current solution relies on. The hidden tests check the updated requirements.
