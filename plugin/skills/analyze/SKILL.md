---
name: analyze
description: Read the user's Claude Code or Codex conversations and get their Vibrometer vibe check (the habits where they differ most from other people), with coaching and a share link. Use when the user asks for their vibe check, how they code with AI, or wants to compare with friends.
argument-hint: "[--days 30]"
allowed-tools: Bash(node:*)
---

The script is at `${CLAUDE_PLUGIN_ROOT}/scripts/vibrometer.mjs` (if `CLAUDE_PLUGIN_ROOT` is empty, it's at `../../scripts/vibrometer.mjs` relative to this file). Nothing is uploaded unless the command includes `--yes`, so follow these steps in order and never add `--yes` before the user has confirmed.

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

   It prints a preview of their vibe check and the list of conversations that would be uploaded. Show the user that list and ask them to confirm. Offer `--private` if they'd rather send only aggregate numbers and no conversation text.

4. **Upload only after they confirm**, by running the same command with `--yes` added.

Then show the result link exactly as printed. Mention that they can share the link with friends to compare, start a group on the site, and earn a rank with `/vibrometer:challenge <slug>` (rankings come only from challenges, never from uploaded conversations).
