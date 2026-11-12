---
name: submit
description: Submit the active Vibrometer challenge solution for grading against hidden tests, and post to the leaderboard. Use when the user wants to submit their vibrometer challenge.
allowed-tools: Bash(node:*)
---

Submitting uploads the solution file and this session's transcript, which is compacted and redacted first. The transcript is a conversation, so the upload needs the user's confirmation first.

1. **Ask about the two statements.** Show the user both statements word for word, exactly as below. Don't paraphrase or shorten them.

   The first statement is required:

   > I'm allowed to upload these conversations, and they don't contain sensitive, confidential or illegal material (such as credentials, other people's personal data, or code I'm not permitted to share).

   The second statement is optional, and the note under it is part of what you show:

   > Let Vibrometer and its partners use these conversations, with secrets and identifiers removed, to improve their services.
   >
   > Optional. It applies only to this upload, and you can withdraw it later from your account page.

   - Ask whether the first statement is true for this session's transcript, and wait for an explicit yes. Never assume it: asking you to submit, or having confirmed it for an earlier upload, doesn't count. If they say no or aren't sure, don't submit.
   - Ask about the second statement as a separate question, after the first. The answer is no unless they clearly say yes.

2. **Submit** with `--confirm-rights`, and with `--allow-improvement` as well only if they said yes to the second statement:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/vibrometer.mjs" submit --confirm-rights
   ```

   If the command stops with "Nothing was uploaded", show the user its message and go back to step 1.

Report the result to the user: pass/fail, hidden-test count, time, turns, tokens, verification status and leaderboard ranks.

If hidden tests failed, the output lists the failing test names. Ask the user whether to fix and resubmit; the clock keeps running. Each resubmission is a new upload, so ask about both statements again before it.
