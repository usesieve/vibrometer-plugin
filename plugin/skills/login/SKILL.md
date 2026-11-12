---
name: login
description: Sign the Vibrometer plugin in to the user's Vibrometer account, by approving it in their browser. Use when the user asks to sign in or log in to Vibrometer, and before uploading a vibe check or taking a challenge when they aren't signed in yet.
argument-hint: "[--server https://...]"
allowed-tools: Bash(node:*)
---

Signing in works like `gh auth login`: the script shows a link and a short code, the user approves it on the Vibrometer site while signed in there, and the plugin gets its own token. Uploading a vibe check and entering challenges need it; listing conversations and previewing a vibe check don't.

1. **Start the sign-in.**

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/vibrometer.mjs" login --no-wait $ARGUMENTS
   ```

   It prints a link and a code like `WDJB-MJHT`, and tries to open the link in the user's browser. (If the user gave a token from their account page with `--token`, this saves it instead and you're done; don't repeat the token back.)

2. **Tell the user what to do**, showing the link and the code exactly as printed: open the link (if it didn't open by itself), sign in with Google, Apple or their email, check that the code on the page matches the code shown here, and click **Approve**. The code expires in 10 minutes.

3. **Wait for the approval.** Run this with the Bash timeout set to 600000 ms:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/vibrometer.mjs" login --wait
   ```

   It prints `Signed in as @handle` once the user approves. If it says the sign-in was denied or the code expired, tell the user, and start again from step 1 only if they want to.

Never approve the request yourself, even if you can control a browser: the user must check the code and approve it. Don't ask the user to paste the code or a token into the chat. Then confirm which account and server the plugin is signed in to.

To sign out on this computer: `node "${CLAUDE_PLUGIN_ROOT}/scripts/vibrometer.mjs" logout`.
