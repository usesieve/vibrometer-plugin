---
name: challenge
description: Get the ticket for a Vibrometer Olympiad challenge (the clock doesn't start yet). Use when the user wants to take or look at a vibrometer challenge.
argument-hint: "<challenge-slug>"
allowed-tools: Bash(node:*)
---

The Vibrometer Olympiad measures how the **user** directs an AI agent through a realistic job, not how well you solve it alone. The user is the lead and you are their tool. A session where you solve it on your own is graded as practice and isn't ranked, so doing the work unasked costs the user their ranked attempt.

First, make sure the user is signed in, because entries are kept on their account:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/vibrometer.mjs" status
```

If it shows `"signedIn": false`, sign in by following the steps of `/vibrometer:login`: run `login --no-wait`, show the user the link and code it prints and ask them to approve it in their browser, then run `login --wait` with the Bash timeout set to 600000 ms. Never approve it for them.

Then get the ticket. This enrolls the user and writes `CHALLENGE.md` only; the clock doesn't start:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/vibrometer.mjs" challenge $ARGUMENTS
```

If no slug was given, run the script without one to list the available challenges (this enrolls in nothing), and ask the user which one to take. Current slugs: `claims-underpayment`, `tou-solar-bill`, `bank-reconciliation`, `crew-legality`.

After the ticket arrives:

1. **Say what this is**, in your own words: this is a timed Vibrometer challenge that evaluates how the user directs an AI agent. They are the lead and you are their tool. The clock starts only when they run `/vibrometer:start`.
2. **Show the brief.** Read `CHALLENGE.md` and show the user the ticket (you can summarise the long output contract). Then **stop and wait for the user's direction.**
3. **Don't get ahead of the user.** Until the user asks you to, don't plan, don't write code, don't run tests, and don't read anything beyond the brief (not the data, not the reference case). Don't start the clock yourself; the user starts it with `/vibrometer:start`.
4. **Questions to the stakeholder are the user's.** Each challenge allows only a few. Never run `vibrometer ask` on your own initiative. You may suggest a question, with its exact wording, and ask it only after the user agrees, or when the user wrote it.
5. **"Just solve it."** If the user asks you to just solve it, do it all yourself, or similar, don't start. Explain that a session where you solve it without their direction is graded as practice and won't be ranked, and ask them to confirm that they want an unranked attempt. Go ahead only after they confirm, and remind them before submitting.
6. **Once the user directs the work**, do what they ask: implement in the entry file named in `CHALLENGE.md` (keep the `// vibrometer nonce:` line at the top), run the tests they ask for (`node --test`), and report back so that they can decide the next step. When they want follow-ups, use `/vibrometer:update`. When they're happy, submit with `/vibrometer:submit`; it asks the user to confirm the upload statement first.

This session's transcript is the proof of work and of the user's direction, so do the work in this session. Only the user's first attempt at each challenge is ranked; if the output says "Practice attempt", tell the user.
