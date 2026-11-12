---
name: start
description: Start the clock of the Vibrometer challenge whose ticket the user has read, and write its starter files. Use only when the user asks to start the challenge or the clock.
allowed-tools: Bash(node:*)
---

Run this only when the user has asked to start. It starts the clock of the challenge opened with `/vibrometer:challenge` and writes the starter files and data:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/vibrometer.mjs" start
```

If it says there's no active challenge, the user needs `/vibrometer:challenge <slug>` first.

Then tell the user that the clock is running, which files arrived, how many stakeholder questions they have and when follow-ups arrive, as printed. Remind them that this challenge measures how they direct you: they are the lead and you are their tool.

Then **wait for the user's direction.** Don't plan, read the data, write code or run tests until they ask. Questions to the stakeholder (`/vibrometer:ask`) are the user's to compose: you may suggest wording, but never ask on your own. If they tell you to just solve it yourself, explain that a session without their direction is graded as practice and isn't ranked, and ask them to confirm first.
