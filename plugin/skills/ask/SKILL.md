---
name: ask
description: Put the user's question to the active Vibrometer challenge's stakeholder (each challenge allows only a few), or list the answers so far. Use when the user asks the stakeholder something or approves a question you suggested.
argument-hint: "\"<the user's question>\""
allowed-tools: Bash(node:*)
---

The questions are the user's to compose. Choosing what to ask the stakeholder is part of what the Olympiad measures, and the allowance is small. So:

- Never ask a question on your own initiative, and never spend the allowance to get ahead with the work.
- Ask only a question that the user wrote, or one that you suggested with its exact wording and the user approved in this conversation. Ask one question per approval.
- Keep the user's wording. Don't merge several of their questions into one, or add questions of your own to theirs.

The session log is checked when the user submits: questions that the agent put on its own make the attempt practice, and it isn't ranked.

Ask it:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/vibrometer.mjs" ask "<the question>"
```

To list the questions asked so far and their answers, run the same command with no question.

Show the user the answer and how many questions are left. Questions that the stakeholder couldn't match to anything are free; the output says so. Then wait for the user to decide what to do with the answer.
