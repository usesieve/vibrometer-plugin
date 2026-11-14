---
name: submit
description: Submit the active Vibrometer challenge solution for grading against hidden tests, and post to the leaderboard. Use only when the user asks to submit their vibrometer challenge.
allowed-tools: Bash(node:*)
---

Submit only when the user asks: when to submit is their call. Submitting uploads the solution file and this session's transcript, which is compacted and redacted first. The transcript is a conversation, so the upload needs the user's confirmation first.

The transcript also shows how the user directed the work. A session with fewer than 3 prompts from the user that direct the work (replies like "go", "continue", "yes" or "solve it" don't count), or in which you asked the stakeholder questions on your own, is graded but kept off the leaderboards as practice. If that's likely, say so to the user before submitting.

1. **Ask about the statements.** Show the user all three statements word for word, exactly as below. Don't paraphrase or shorten them.

   The first statement is required:

   > I'm allowed to upload these conversations, and they don't contain sensitive, confidential or illegal material (such as credentials, other people's personal data, or code I'm not permitted to share).

   The second statement is optional, and the note under it is part of what you show:

   > Let Vibrometer and its partners use these conversations, with common secrets, email addresses and home-folder names removed, to improve their services.
   >
   > Optional. It applies only to this upload, and you can withdraw it later from your account page.

   The third statement is also optional, and separate from the second; the note under it is part of what you show:

   > Let Vibrometer use the numbers measured from this upload (never the conversations themselves) to study which habits lead to better results, and publish findings that can't identify anyone.
   >
   > Optional. It applies only to this upload, and you can withdraw it later from your account page.

   - Ask whether the first statement is true for this session's transcript, and wait for an explicit yes. Never assume it: asking you to submit, or having confirmed it for an earlier upload, doesn't count. If they say no or aren't sure, don't submit.
   - Ask about the second statement as a separate question, after the first, and then the third as its own question. For each, the answer is no unless they clearly say yes.

2. **Submit** with `--confirm-rights`, with `--allow-improvement` only if they said yes to the second statement, and `--allow-research` only if they said yes to the third:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/vibrometer.mjs" submit --confirm-rights
   ```

   If the command stops with "Nothing was uploaded", show the user its message and go back to step 1.

If the command says the enrollment belongs to another account, the plugin is signed in to a different account from the one that enrolled. Tell the user; `/vibrometer:login` signs in again.

Report the result to the user: pass/fail, hidden-test count, how it compares with the AI-alone score, time, prompts, tokens, verification status and leaderboard ranks. If the output says the attempt is practice and not ranked, show the user the reason exactly as printed.

If hidden tests failed, the output lists the failing test names. Ask the user what they want to do; the clock keeps running. Don't start fixing until they direct it. Each resubmission is a new upload, so ask about the statements again before it.
