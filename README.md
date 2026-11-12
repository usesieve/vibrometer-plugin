# Vibrometer plugin for Claude Code

See how you code with AI: get your vibe check from the Claude Code and Codex conversations you choose, compare with
friends, and compete on timed AI-coding challenges at https://vibrometer.ai.

## Install

In Claude Code:

```
/plugin marketplace add usesieve/vibrometer-plugin
/plugin install vibrometer@vibrometer
```

Then sign in with `/vibrometer:login` (it opens vibrometer.ai, where you approve this computer), and run
`/vibrometer:analyze`, `/vibrometer:challenge <slug>` (the ticket), `/vibrometer:start` (the clock) or `/vibrometer:submit`.

Nothing is uploaded until you confirm the selection and the upload statement. This repository is generated from
the main Vibrometer repository (plugin version 0.3.1); changes made here are overwritten.
