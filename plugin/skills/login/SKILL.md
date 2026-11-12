---
name: login
description: Link the Vibrometer plugin to the user's Vibrometer profile with a token from the /me page.
argument-hint: "<token> [--server https://...]"
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/vibrometer.mjs" login $ARGUMENTS
```

Confirm to the user which server is now configured. Do not repeat the token back.
