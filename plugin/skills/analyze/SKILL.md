---
name: analyze
description: Read the user's Claude Code or Codex conversations and get their Vibrometer vibe check (the habits where they differ most from other people), with coaching and a share link. Use when the user asks for their vibe check, how they code with AI, or wants to compare with friends.
argument-hint: "[--days 30]"
allowed-tools: Bash(node:*)
---

The script is at `${CLAUDE_PLUGIN_ROOT}/scripts/vibrometer.mjs` (if `CLAUDE_PLUGIN_ROOT` is empty, it's at `../../scripts/vibrometer.mjs` relative to this file). Nothing is uploaded unless the command includes `--yes`, and conversations are uploaded only when it also includes `--confirm-rights`. Follow these steps in order. Never add `--yes` before the user has confirmed the selection, never add `--confirm-rights` unless the user has said yes to the first statement in step 4, and never add `--allow-improvement` unless the user has said yes to the second statement.

1. **List the conversations.**

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/vibrometer.mjs" list $ARGUMENTS
   ```

   This prints each conversation from the last 30 days (or `--days N`) with an 8-character id, date, prompt count and first prompt, grouped by project.

2. **Ask the user what to include**, and tell them this first, in your own words: *don't upload any conversation that contains personal, sensitive or confidential information, such as customer or patient data, credentials, financial or health details, or code and documents they aren't allowed to share. Common secrets are stripped automatically, but not everything can be recognised.*

   Show the projects with how many conversations each has, and offer simple choices: everything listed, only some projects, everything except some projects, or specific conversations. If the user picks by conversation, show the ids so they can choose. Point out any project whose name suggests work for a client or employer, and ask about it rather than including it by default.

3. **Show exactly what would be sent.** Run `analyze` with their selection and without `--yes`. Use `--sessions id,id,...` for specific conversations, `--exclude id,...` to drop some, and `--project name` or `--exclude-project name` for whole projects:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/vibrometer.mjs" analyze --exclude-project acme-client --exclude 3f2a91c0
   ```

   It prints a preview of their vibe check and the list of conversations that would be uploaded. Show the user that list and ask them to confirm the selection. Offer `--private` if they'd rather send only aggregate numbers and no conversation text. A `--private` upload sends no conversations, so skip step 4 for it and run the same command with `--yes` once they confirm.

4. **Ask about the two statements before uploading conversations.** Show the user both statements word for word, exactly as below (they are also printed by the preview). Don't paraphrase or shorten them.

   The first statement is required:

   > I'm allowed to upload these conversations, and they don't contain sensitive, confidential or illegal material (such as credentials, other people's personal data, or code I'm not permitted to share).

   The second statement is optional, and the note under it is part of what you show:

   > Let Vibrometer and its partners use these conversations, with secrets and identifiers removed, to improve their services.
   >
   > Optional. It applies only to this upload, and you can withdraw it later from your account page.

   - Ask whether the first statement is true for the conversations they chose, and wait for an explicit yes. Never assume it: agreeing to the selection in step 3, asking you to "go ahead", or having confirmed it for an earlier upload doesn't count. If they say no or aren't sure, don't upload. Suggest removing the conversations in question (back to step 2) or using `--private`.
   - Ask about the second statement as a separate question, after the first. The answer is no unless they clearly say yes. Tell them that saying no doesn't change their vibe check or whether they can upload.

5. **Upload only after both answers**, by running the same command as in step 3 with `--yes --confirm-rights` added, and with `--allow-improvement` as well only if they said yes to the second statement:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/vibrometer.mjs" analyze --exclude-project acme-client --exclude 3f2a91c0 --yes --confirm-rights
   ```

   If the command stops with "Nothing was uploaded", show the user its message and go back to step 4.

Then show the result link exactly as printed. Mention that they can share the link with friends to compare and start a group on the site. Uploaded conversations that the server verifies count toward the Pantheon's habit boards (a `--private` upload doesn't). The skill rankings come from the timed challenges: `/vibrometer:challenge <slug>`.
