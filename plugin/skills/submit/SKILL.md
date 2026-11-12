---
name: submit
description: Submit the active Vibrometer challenge solution for grading against hidden tests, and post to the leaderboard. Use when the user wants to submit their vibrometer challenge.
allowed-tools: Bash(node:*)
---

Submit the active challenge. This uploads the solution file and this session's transcript, which is compacted and redacted first:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/vibrometer.mjs" submit
```

Report the result to the user: pass/fail, hidden-test count, time, turns, tokens, verification status and leaderboard ranks.

If hidden tests failed, the output lists the failing test names. Ask the user whether to fix and resubmit; the clock keeps running.
