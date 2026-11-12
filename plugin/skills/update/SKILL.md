---
name: update
description: Fetch follow-ups for the active Vibrometer challenge (new data files and changed requirements released partway through). Use when the user wants to check for or fetch challenge updates, or when submit says a follow-up has arrived.
allowed-tools: Bash(node:*)
---

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/vibrometer.mjs" update
```

This adds or replaces files under `data/` and saves the stakeholder's message as `CHANGE-<n>.md`. Follow-ups count from the start of the clock; before `/vibrometer:start` there are none.

Show the user the message and the list of changed files, and point out what it changes in the current solution: a follow-up can change rules that the solution relies on, and the hidden tests check the updated requirements. Then let the user decide how to handle it; don't rework the solution until they ask.
