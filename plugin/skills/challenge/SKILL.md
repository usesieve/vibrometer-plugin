---
name: challenge
description: Enroll in a Vibrometer AI-coding challenge, which starts the clock and writes starter files. Use when the user wants to start a vibrometer challenge.
argument-hint: "<challenge-slug>"
allowed-tools: Bash(node:*)
---

Enroll in the challenge. The clock starts now:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/vibrometer.mjs" challenge $ARGUMENTS
```

If no slug was given, run the script without one to list where challenges are found, and ask the user which one to take. Current slugs: `claims-underpayment`, `tou-solar-bill`, `bank-reconciliation`, `crew-legality`.

After enrolling:
1. Read `CHALLENGE.md` carefully and implement the solution in the entry file it names. Keep the `// vibrometer nonce:` line at the top of the file.
2. Run the public tests with `node --test`. The hidden tests are stricter, so cover the edge cases the spec describes.
3. When the user is happy, or when they asked you to go all the way, submit with `/vibrometer:submit`. Submitting uploads this session's transcript, so it first asks the user to confirm the upload statement; even when they asked you to go all the way, wait for their answer.

This session's transcript is the proof of work, so do the work in this session. Only the user's first attempt at each challenge is ranked; if the output says "Practice attempt", tell the user.
