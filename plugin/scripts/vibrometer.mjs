#!/usr/bin/env node
// Vibrometer CLI (generated: edit src/cli/vibrometer.ts and run npm run build:cli)

// <define:__CHALLENGES__>
var define_CHALLENGES_default = [{ slug: "bank-reconciliation", title: "Month-End Bank Reconciliation", difficulty: "hard" }, { slug: "claims-underpayment", title: "Payer Underpayment Audit", difficulty: "hard" }, { slug: "crew-legality", title: "Part 117 Crew Legality Audit", difficulty: "hard" }, { slug: "first-flight", title: "First Flight: Delivery Summary", difficulty: "easy" }, { slug: "tou-solar-bill", title: "Solar Billing Disputes", difficulty: "hard" }];

// src/cli/vibrometer.ts
import { spawn, spawnSync } from "node:child_process";
import { createReadStream, existsSync as existsSync2, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { Readable, pipeline } from "node:stream";
import { homedir } from "node:os";
import * as zlib from "node:zlib";
import { join as join2, resolve as resolve2, dirname as dirname2, isAbsolute, relative } from "node:path";
import { fileURLToPath } from "node:url";

// src/cli/flow.ts
import { existsSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
var real = (p) => {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
};
function cliFlow(env, here) {
  if (env.VIBROMETER_FLOW === "auto") return "auto";
  if (env.CLAUDE_CODE_REMOTE === "true") return "cloud";
  if (!here) return "cli";
  if (existsSync(join(dirname(here), "..", ".claude-plugin", "plugin.json"))) return "plugin";
  const tmp = [env.TMPDIR, env.TEMP, env.TMP, tmpdir(), "/tmp"].filter((d) => !!d).map(real);
  return tmp.includes(real(dirname(here))) ? "prompt" : "cli";
}

// src/lib/analyzer/prices.ts
var CACHE_READ = 0.1;
var CACHE_WRITE_5M = 1.25;
var CACHE_WRITE_1H = 2;
var MODEL_FAMILIES = [
  // Anthropic: platform.claude.com pricing. Fable 5.2, Fable 5.1, Opus 5.5 and Sonnet 5.5 list cache reads below 0.1×.
  { name: "Claude Fable 5.2", prefixes: ["claude-fable-5-2"], input: 8, output: 40, cacheRead: 0.025 },
  { name: "Claude Fable 5.1", prefixes: ["claude-fable-5-1"], input: 10, output: 50, cacheRead: 0.025 },
  { name: "Claude Fable 5", prefixes: ["claude-fable-5", "claude-fable-5-0"], input: 10, output: 50 },
  { name: "Claude Opus 5.5", prefixes: ["claude-opus-5-5"], input: 4, output: 20, cacheRead: 0.05 },
  { name: "Claude Opus 5", prefixes: ["claude-opus-5", "claude-opus-5-0"], input: 5, output: 25 },
  { name: "Claude Opus 4.8", prefixes: ["claude-opus-4-8"], input: 5, output: 25 },
  { name: "Claude Opus 4.7", prefixes: ["claude-opus-4-7"], input: 5, output: 25 },
  { name: "Claude Opus 4.6", prefixes: ["claude-opus-4-6"], input: 5, output: 25 },
  { name: "Claude Opus 4.5", prefixes: ["claude-opus-4-5"], input: 5, output: 25 },
  { name: "Claude Opus 4.1", prefixes: ["claude-opus-4-1"], input: 15, output: 75 },
  { name: "Claude Opus 4", prefixes: ["claude-opus-4", "claude-opus-4-0"], input: 15, output: 75 },
  { name: "Claude Sonnet 5.5", prefixes: ["claude-sonnet-5-5"], input: 2, output: 10, cacheRead: 0.05 },
  { name: "Claude Sonnet 5", prefixes: ["claude-sonnet-5", "claude-sonnet-5-0"], input: 2, output: 10 },
  { name: "Claude Sonnet 4.6", prefixes: ["claude-sonnet-4-6"], input: 3, output: 15 },
  { name: "Claude Sonnet 4.5", prefixes: ["claude-sonnet-4-5"], input: 3, output: 15 },
  { name: "Claude Sonnet 4", prefixes: ["claude-sonnet-4", "claude-sonnet-4-0"], input: 3, output: 15 },
  { name: "Claude Haiku 5.5", prefixes: ["claude-haiku-5-5"], input: 0.1, output: 0.5 },
  { name: "Claude Haiku 4.5", prefixes: ["claude-haiku-4-5"], input: 1, output: 5 },
  { name: "Claude Haiku 3.5", prefixes: ["claude-3-5-haiku", "claude-haiku-3-5"], input: 0.8, output: 4 },
  // OpenAI (Codex): from memory of OpenAI's price list, not confirmed against the current one. Cached input is 0.1×
  // and there is no charge for writing the cache. Models not listed here are left out of the cost.
  { name: "GPT-5", prefixes: ["gpt-5"], input: 1.25, output: 10, needsCheck: true },
  { name: "GPT-5 Codex", prefixes: ["gpt-5-codex"], input: 1.25, output: 10, needsCheck: true },
  { name: "GPT-5 mini", prefixes: ["gpt-5-mini"], input: 0.25, output: 2, needsCheck: true },
  { name: "GPT-5.1", prefixes: ["gpt-5.1"], input: 1.25, output: 10, needsCheck: true },
  { name: "GPT-5.1 Codex", prefixes: ["gpt-5.1-codex"], input: 1.25, output: 10, needsCheck: true },
  { name: "GPT-5.1 Codex Max", prefixes: ["gpt-5.1-codex-max"], input: 1.25, output: 10, needsCheck: true },
  { name: "GPT-5.1 Codex mini", prefixes: ["gpt-5.1-codex-mini"], input: 0.25, output: 2, needsCheck: true }
];
var SUFFIX = /^(?:$|-\d{8}(?:$|\W|-v\d)|-\d{4}-\d{2}-\d{2}$|@|\[|:|-v\d)/;
function modelFamilyOf(model) {
  const id = model.trim().toLowerCase().replace(/^(?:[a-z]{2,4}\.)?anthropic\./, "");
  let best = -1;
  let bestLen = 0;
  MODEL_FAMILIES.forEach((f, i) => {
    for (const p of f.prefixes) if (p.length > bestLen && id.startsWith(p) && SUFFIX.test(id.slice(p.length))) {
      best = i;
      bestLen = p.length;
    }
  });
  return best;
}
function tokensCost(f, t) {
  return (t.input * f.input + t.cacheRead * f.input * (f.cacheRead ?? CACHE_READ) + t.cacheWrite5m * f.input * CACHE_WRITE_5M + t.cacheWrite1h * f.input * CACHE_WRITE_1H + t.output * f.output) / 1e6;
}
var tokenSum = (t) => t.input + t.output + t.cacheRead + t.cacheWrite5m + t.cacheWrite1h;
function apiCost(byModel) {
  const fam = /* @__PURE__ */ new Map();
  let unpricedTokens = 0;
  const unpricedModels = [];
  for (const [model, t] of Object.entries(byModel)) {
    const i = modelFamilyOf(model);
    if (i < 0) {
      if (tokenSum(t) > 0) {
        unpricedTokens += tokenSum(t);
        unpricedModels.push(model);
      }
      continue;
    }
    const cur = fam.get(i) ?? { usd: 0, tokens: 0 };
    cur.usd += tokensCost(MODEL_FAMILIES[i], t);
    cur.tokens += tokenSum(t);
    fam.set(i, cur);
  }
  const families = [...fam].map(([family, x]) => ({ family, ...x })).sort((a, b) => b.usd - a.usd || b.tokens - a.tokens);
  return { usd: families.reduce((a, f) => a + f.usd, 0), families, unpricedTokens, unpricedModels };
}

// src/lib/labeler/phase.ts
var g = globalThis;
var LABEL_HABITS_PUBLIC = typeof g.__VC_LABELS_PHASE3 === "boolean" ? g.__VC_LABELS_PHASE3 : /^(1|true|yes|on)$/i.test(g.process?.env?.LABELS_PHASE3?.trim() ?? "");

// src/lib/analyzer/signature.ts
var MIN_CALIBRATION_N = 50;
var PRIOR_STRENGTH = 300;
var hourLabel = (h) => `${(Math.round(h) + 11) % 12 + 1}${Math.round(h) % 24 < 12 ? "am" : "pm"}`;
var pct = (v) => `${Math.round(v * 100)}%`;
var per = (a, b, min = 1) => b >= min ? a / b : null;
var big = (v) => v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e4 ? `${Math.round(v / 1e3)}k` : Math.round(v).toLocaleString("en-US");
var wallHours = (m) => (m.wallMinutes ?? m.activeMinutes) / 60;
var n1 = (v) => v >= 10 ? String(Math.round(v)) : v.toFixed(1).replace(/\.0$/, "");
var readPrompts = (m) => m.humanTurns - (m.unmeasuredPrompts ?? 0);
var readPlanSessions = (m) => m.sessionsWithEdits - (m.unmeasuredPlanSessions ?? 0);
var mostlyEnglish = (m) => {
  const e = m.englishPrompts ?? 0;
  return e > 0 && e >= (m.otherLanguagePrompts ?? 0);
};
var LINK_MAX = 9999999;
var fit = (v, scale) => Math.min(v, LINK_MAX / scale);
var allTokens = (m) => m.tokensByModel ? Object.values(m.tokensByModel).reduce((a, t) => a + tokenSum(t), 0) : m.tokens.total + m.tokens.subagent;
function cacheShare(m) {
  if (!m.tokensByModel) return m.tokens.input + m.tokens.cacheRead + m.tokens.cacheWrite > 0 ? m.cacheHitRatio : null;
  let read = 0, input = 0;
  for (const t of Object.values(m.tokensByModel)) {
    read += t.cacheRead;
    input += t.input + t.cacheRead + t.cacheWrite5m + t.cacheWrite1h;
  }
  return input > 0 ? read / input : null;
}
var costOf = (m) => m.tokensByModel && Object.keys(m.tokensByModel).length ? apiCost(m.tokensByModel) : null;
var tokenCount = (v) => v >= 1e9 ? `${(v / 1e9).toFixed(1).replace(/\.0$/, "")}B` : v >= 1e8 ? `${Math.round(v / 1e6)}M` : big(v);
var usd = (v) => v >= 100 ? `$${Math.round(v).toLocaleString("en-US")}` : `$${v.toFixed(2)}`;
var modelName = (v) => MODEL_FAMILIES[Math.round(v)]?.name ?? "an unknown model";
var duration = (mins) => {
  const t = Math.round(mins), h = Math.floor(t / 60), mm = t % 60;
  return h ? `${h} h${mm ? ` ${mm} min` : ""}` : `${t} min`;
};
var fromLabels = (m, key, regex) => {
  const v = LABEL_HABITS_PUBLIC ? m.labelHabits?.[key] : void 0;
  return v === void 0 || v === null || !Number.isFinite(v) ? regex : v;
};
var labelOnly = (m, key) => {
  const v = m.labelHabits?.[key];
  return v === void 0 || v === null || !Number.isFinite(v) ? null : v;
};
var LP = {
  corrections: [0.05, 0.14, 0.3],
  vague: [0.1, 0.6, 1.8],
  done: [0.03, 0.1, 0.25],
  files: [0.15, 0.38, 0.65]
};
var cut = (regex, key) => LABEL_HABITS_PUBLIC ? [...LP[key]] : regex;
var SIGNALS = [
  // verify: Share. Agents now run tests and builds on their own far more than in 2024, so the middle moves up a little; Anthropic finds verified success in 15-33% of sessions by expertise [A2], so the low end stays low.
  { key: "verify", name: "Checks after edits", scale: 1e3, prior: [0.25, 0.6, 0.92], good: 1, value: (m) => per(m.verifiedEditTurns, m.editTurns, 2), fmt: pct, line: (v) => `You check the code after ${v} of your edits`, they: (v, w) => `${w} checks the code after ${v} of their edits` },
  // steps: Log. Anthropic: about 10 actions per prompt on average, about 12 for experts and 5 for novices, and 2% of sessions above 100 [A2]. Heavy users sit near the expert figure.
  { key: "steps", name: "Agent steps per prompt", scale: 10, prior: [4, 12, 35], log: true, good: 1, value: (m) => per(m.toolCalls, m.humanTurns, 3), fmt: n1, line: (v) => `Your agent takes ${v} steps for every prompt that you write`, they: (v, w) => `${w}'s agent takes ${v} steps for every prompt that they write` },
  // words: Log. The mean is pulled up by pasted specs, logs and errors; heavy users who write 150-250-word task briefs are common, so 150 is the 90th, not 80. No public figure for prompt length.
  { key: "words", name: "Words per prompt", scale: 10, prior: [12, 45, 150], log: true, value: (m) => per(m.humanWords, m.humanTurns, 3), fmt: n1, line: (v) => `Your prompts average ${v} words`, they: (v, w) => `${w}'s prompts average ${v} words` },
  // files: Share. No public data; widened from [0.2, 0.33, 0.45], which put ordinary variation in the tails.
  { key: "files", name: "Prompts naming a file", scale: 1e3, prior: cut([0.12, 0.3, 0.55], "files"), good: 1, value: (m) => fromLabels(m, "files", per(m.promptsWithPaths, m.humanTurns, 3)), fmt: pct, line: (v) => `${v} of your prompts name a specific file`, they: (v, w) => `${v} of ${w}'s prompts name a specific file` },
  // done: Share. No public data; widened slightly at the top.
  { key: "done", name: "Prompts defining done", scale: 1e3, prior: cut([0.1, 0.28, 0.5], "done"), good: 1, value: (m) => fromLabels(m, "done", per(m.promptsWithCriteria, readPrompts(m), 3)), fmt: pct, line: (v) => `${v} of your prompts describe what "done" looks like`, they: (v, w) => `${v} of ${w}'s prompts describe what "done" looks like` },
  // corrections: Share. Anthropic: internal users intervened 3.3 times per session, and missing context or corrections are 32% of interruptions [A1]. Barely changed.
  { key: "corrections", name: "Corrections", scale: 1e3, prior: cut([0.02, 0.08, 0.2], "corrections"), good: -1, value: (m) => fromLabels(m, "corrections", per(m.corrections, readPrompts(m), 3)), fmt: pct, line: (v) => `You correct the agent on ${v} of your prompts`, they: (v, w) => `${w} corrects the agent on ${v} of their prompts` },
  // interrupts: Log. Anthropic: people interrupt on about 5% of turns when new and about 9% when experienced [A1], i.e. 0.5-0.9 per 10 prompts, so the old middle of 0.3 was too low.
  { key: "interrupts", name: "Interrupts per 10 prompts", scale: 10, prior: [0.1, 0.7, 2], log: true, value: (m) => m.humanTurns >= 5 ? m.interrupts / m.humanTurns * 10 : null, fmt: n1, line: (v) => `You stop the agent mid-run ${v} times per 10 prompts`, they: (v, w) => `${w} stops the agent mid-run ${v} times per 10 prompts` },
  // reads: Share. Claude Code's Edit tool needs the file read first, so most Claude Code edits are read first; Codex patches and new files pull it down.
  { key: "reads", name: "Reads before editing", scale: 1e3, prior: [0.35, 0.7, 0.95], good: 1, value: (m) => m.editedFiles >= 2 ? m.readBeforeEditRatio : null, fmt: pct, line: (v) => `${v} of the files that you change are read first`, they: (v, w) => `${v} of the files that ${w} changes are read first` },
  // plans: Share. Plan mode is common among heavy users; little change.
  { key: "plans", name: "Plans before coding", scale: 1e3, prior: [0.1, 0.45, 0.85], good: 1, value: (m) => per(m.sessionsPlanFirst, readPlanSessions(m), 1), fmt: pct, line: (v) => `You plan before the first edit in ${v} of sessions`, they: (v, w) => `${w} plans before the first edit in ${v} of sessions` },
  // subagents: Log. Claude Code starts Explore and Plan subagents on its own and heavy users run their own, while Codex sessions and quick questions have none. 3-8 per session is a strong but normal heavy user (84-97).
  { key: "subagents", name: "Subagents per session", scale: 10, prior: [0, 1, 3.5], log: true, value: (m) => per(m.subagents, m.sessions, 1), fmt: n1, line: (v) => `You run ${v} subagents per session`, they: (v, w) => `${w} runs ${v} subagents per session` },
  // minutes: Log. Active minutes (gaps over 10 min dropped). Typical sessions are short (about 4 prompts [A2]; about 23 min on average [S2]), but heavy users run multi-hour sessions and the longest turns now pass 45 min [A1]. 2-4 hour sessions land at 90-96.
  { key: "minutes", name: "Minutes per session", scale: 1, prior: [10, 40, 120], log: true, value: (m) => per(m.activeMinutes, m.sessions, 1), fmt: (v) => `${Math.round(v)} min`, line: (v) => `Your sessions average ${v} of active work`, they: (v, w) => `${w}'s sessions average ${v} of active work` },
  // pace: Log. Heavy users with parallel agents write thousands of lines per hour; the old 90th of 2,300 was a single-session figure.
  { key: "pace", name: "Lines per hour", scale: 1, prior: [150, 800, 4e3], log: true, value: (m) => wallHours(m) >= 1 / 6 ? m.linesWritten / wallHours(m) : null, fmt: (v) => big(v), line: (v) => `Your agents write ${v} lines per hour of your coding time`, they: (v, w) => `${w}'s agents write ${v} lines per hour of their coding time` },
  // night: Share. Unchanged: no new evidence.
  { key: "night", name: "Prompts after 11pm", scale: 1e3, prior: [0, 0.05, 0.35], fun: true, value: (m) => per(m.nightOwlShare * m.humanTurns, m.humanTurns, 5), fmt: pct, line: (v) => `${v} of your prompts are sent after 11pm`, they: (v, w) => `${v} of ${w}'s prompts are sent after 11pm` },
  // please: Rate per prompt. Unchanged: no new evidence.
  { key: "please", name: "Pleases and thanks", scale: 1e3, prior: [0.05, 0.3, 0.55], fun: true, value: (m) => per(m.politeness, readPrompts(m), 5), fmt: (v) => n1(v * 10), line: (v) => `You say please or thanks ${v} times per 10 prompts`, they: (v, w) => `${w} says please or thanks ${v} times per 10 prompts` },
  // time and parallel work; per-hour measures use wall-clock time, so running sessions side by side counts once
  // hours: Log. Total wall-clock hours in the upload. Anthropic: people use Claude Code about 20 hours a week [A2], and Claude Code keeps 30 days of transcripts by default [D1], so a heavy month is 25-100 hours.
  { key: "hours", name: "Hours coding with agents", scale: 10, prior: [4, 25, 100], log: true, value: (m) => wallHours(m) > 0 ? wallHours(m) : null, fmt: n1, line: (v) => `You spent ${v} hours coding with agents in these sessions`, they: (v, w) => `${w} spent ${v} hours coding with agents in these sessions` },
  // concurrency: Log. Heavy users run worktrees and several sessions side by side; the old 90th of 1.7 was a single-window user.
  { key: "concurrency", name: "Sessions running at once", scale: 100, prior: [1, 1.2, 2.2], log: true, value: (m) => m.wallMinutes && m.wallMinutes >= 30 ? m.activeMinutes / m.wallMinutes : null, fmt: (v) => v.toFixed(1), line: (v) => `You have ${v} sessions running on average while you work`, they: (v, w) => `${w} has ${v} sessions running on average while they work` },
  // parallel: Share. As concurrency: parallel sessions are now normal for heavy users.
  { key: "parallel", name: "Time with parallel sessions", scale: 1e3, prior: [0, 0.15, 0.6], value: (m) => m.wallMinutes && m.wallMinutes >= 30 ? (m.parallelMinutes ?? 0) / m.wallMinutes : null, fmt: pct, line: (v) => `${v} of your coding time has two or more sessions running`, they: (v, w) => `${v} of ${w}'s coding time has two or more sessions running` },
  // peak: Log. Over a month of uploads most heavy users have three sessions open at some point; 8 or more is rare.
  { key: "peak", name: "Most sessions at once", scale: 1, prior: [1, 3, 8], log: true, value: (m) => m.peakParallel ? m.peakParallel : null, fmt: (v) => String(Math.round(v)), line: (v) => `You ran up to ${v} sessions at the same time`, they: (v, w) => `${w} ran up to ${v} sessions at the same time` },
  // promptsHour: Log. Parallel sessions raise prompts per wall-clock hour; the old 90th of 25 was one window.
  { key: "promptsHour", name: "Prompts per hour", scale: 10, prior: [5, 14, 40], log: true, value: (m) => wallHours(m) >= 0.5 ? m.humanTurns / wallHours(m) : null, fmt: n1, line: (v) => `You send ${v} prompts per hour of coding`, they: (v, w) => `${w} sends ${v} prompts per hour of coding` },
  // tokensLine: Log. Input, cache writes, output and subagent tokens (not cache reads) per line. Long sessions with subagents read far more than they write: a median agent request carries about 96k input tokens [S1], and agent teams use about 7x the tokens [D1].
  { key: "tokensLine", name: "Tokens per line written", scale: 1, prior: [1500, 1e4, 5e4], log: true, value: (m) => m.linesWritten >= 20 ? (m.tokens.input + m.tokens.cacheWrite + m.tokens.output + m.tokens.subagent) / m.linesWritten : null, fmt: big, line: (v) => `Your agents use ${v} tokens for each line that they write`, they: (v, w) => `${w}'s agents use ${v} tokens for each line that they write` },
  // who waits on whom: parallel sessions only help if each agent is kept busy with substantive work
  // workPerPrompt: Log. Anthropic: the median turn is about 45 s, but the 99.9th passed 45 min [A1], and experts get about 12 actions per prompt [A2]; a person's mean sits above the median turn.
  { key: "workPerPrompt", name: "Agent work per prompt", scale: 100, prior: [0.5, 2, 8], log: true, good: 1, value: (m) => m.agentTurns && m.agentTurns >= 3 ? (m.agentBusyMinutes ?? 0) / m.agentTurns : null, fmt: (v) => `${v >= 10 ? Math.round(v) : v.toFixed(1)} min`, line: (v) => `Each prompt keeps your agent working for ${v}`, they: (v, w) => `Each of ${w}'s prompts keeps their agent working for ${v}` },
  // utilization: Share. Unchanged: no new evidence.
  { key: "utilization", name: "Agents working, not waiting", scale: 1e3, prior: [0.25, 0.5, 0.8], good: 1, value: (m) => {
    const b = m.agentBusyMinutes ?? 0, w = m.agentWaitMinutes ?? 0;
    return m.agentTurns && m.agentTurns >= 3 && b + w > 0 ? b / (b + w) : null;
  }, fmt: pct, line: (v) => `Your agents spend ${v} of their time working rather than waiting for you`, they: (v, w) => `${w}'s agents spend ${v} of their time working rather than waiting` },
  // agentsAtOnce: Log. As concurrency and parallel.
  { key: "agentsAtOnce", name: "Agents working at once", scale: 100, prior: [0.3, 0.7, 2], log: true, value: (m) => m.wallMinutes && m.wallMinutes >= 30 && m.agentBusyMinutes ? m.agentBusyMinutes / m.wallMinutes : null, fmt: (v) => v.toFixed(1), line: (v) => `On average ${v} of your agents are working at any moment`, they: (v, w) => `On average ${v} of ${w}'s agents are working at any moment` },
  // Wrapped only
  // peakHour: Hour of the day, Wrapped only. Unchanged.
  { key: "peakHour", name: "Busiest hour", scale: 1, prior: [8, 14, 22], wrapped: true, fun: true, value: (m) => m.humanTurns >= 5 ? m.hourHistogram.indexOf(Math.max(...m.hourHistogram)) : null, fmt: (v) => hourLabel(v), line: (v) => `Your busiest hour is ${v}`, they: (v, w) => `${w}'s busiest hour is ${v}` },
  // weekend: Share, Wrapped only. Unchanged.
  { key: "weekend", name: "Prompts on weekends", scale: 1e3, prior: [0, 0.12, 0.4], wrapped: true, fun: true, value: (m) => m.humanTurns >= 5 ? m.weekendShare : null, fmt: pct, line: (v) => `${v} of your prompts are sent on weekends`, they: (v, w) => `${v} of ${w}'s prompts are sent on weekends` },
  // Appended last: share links store values in this order, so new signals go at the end.
  // outbursts: Rate per prompt, Wrapped only. Unchanged.
  { key: "outbursts", name: "Outbursts", scale: 1e3, prior: [0, 0.02, 0.12], wrapped: true, fun: true, value: (m) => per(m.profanity + (m.hostility ?? 0) + m.yelling, readPrompts(m), 5), fmt: (v) => n1(v * 10), line: (v) => `You lose your temper ${v} times per 10 prompts`, they: (v, w) => `${w} loses their temper ${v} times per 10 prompts` },
  // Outcomes (src/lib/analyzer/outcomes.ts). We have no population data for these yet, so every prior below is a wide
  // guess that the real distribution will replace as people share (see percentileFor). Where a prior leans on an
  // existing signal's prior, the comment says which.
  // Verified finish is stricter than "Checks after edits" (it needs a pass, by a real test or build tool, after the
  // session's last edit, or a commit), so its cutoffs sit below that signal's [0.25, 0.6, 0.92].
  // finish: Share. Unchanged: Anthropic's verified-success rates of 15-33% [A2] count a stricter outcome.
  { key: "finish", name: "Sessions that end verified", scale: 1e3, prior: [0.1, 0.45, 0.85], good: 1, value: (m) => per(m.verifiedFinishes ?? 0, m.codeEditSessions ?? 0, 2), fmt: pct, line: (v) => `${v} of your coding sessions end with passing checks or a commit after the last edit`, they: (v, w) => `${v} of ${w}'s coding sessions end with passing checks or a commit after the last edit` },
  // Wide guess: most sessions resolve what they break; a long tail leaves a few failures behind.
  // unresolved: Log. Unchanged cutoffs, now read on a log scale.
  { key: "unresolved", name: "Errors left unresolved", scale: 100, prior: [0, 0.4, 2], log: true, good: -1, value: (m) => m.unresolvedErrors === void 0 || m.toolCalls < 10 ? null : per(m.unresolvedErrors, m.sessions, 2), fmt: n1, line: (v) => `Your sessions end with ${v} unresolved errors on average`, they: (v, w) => `${w}'s sessions end with ${v} unresolved errors on average` },
  // Kept apart from "Errors left unresolved": loops are rare, so a combined number would be unknown for most people
  // or swamped by one part, and the two answer different questions (how work ends, and what you do when the agent
  // keeps failing). Wide guess, no data.
  // loops: Share. Unchanged.
  { key: "loops", name: "Retry loops you step into", scale: 1e3, prior: [0, 0.4, 0.9], good: 1, value: (m) => per(m.loopsSteppedIn ?? 0, m.retryLoops ?? 0, 2), fmt: pct, line: (v) => `You step in during ${v} of the agent's retry loops`, they: (v, w) => `${w} steps in during ${v} of the agent's retry loops` },
  // Wide guess, no data: we expect about a third of corrections to follow a failure or a missed instruction.
  // catches: Share. Unchanged.
  { key: "catches", name: "Corrections that catch mistakes", scale: 1e3, prior: [0.1, 0.35, 0.7], good: 1, value: (m) => m.catches === void 0 ? null : per(m.catches, m.corrections, 3), fmt: pct, line: (v) => `${v} of your corrections catch a mistake that the agent then fixes`, they: (v, w) => `${v} of ${w}'s corrections catch a mistake that the agent then fixes` },
  // Wide guess, no data: most people rarely edit these files, so the median is low.
  // lessons: Share. Heavy Claude Code users keep CLAUDE.md and memory files up to date more often, and Claude Code now writes memory files itself.
  { key: "lessons", name: "Saves lessons to CLAUDE.md or AGENTS.md", scale: 1e3, prior: [0, 0.06, 0.3], good: 1, value: (m) => m.configEditSessions === void 0 ? null : per(m.configEditSessions, m.sessions, 5), fmt: pct, line: (v) => `You update CLAUDE.md, AGENTS.md or memory files in ${v} of your sessions`, they: (v, w) => `${w} updates CLAUDE.md, AGENTS.md or memory files in ${v} of their sessions` },
  // Wide guess, no data.
  // resets: Share. Unchanged.
  { key: "resets", name: "Clears or compacts long contexts", scale: 1e3, prior: [0, 0.35, 0.9], good: 1, value: (m) => per(m.contextResets ?? 0, (m.contextResets ?? 0) + (m.autoCompactions ?? 0), 2), fmt: pct, line: (v) => `You clear or compact the context yourself in ${v} of resets, before automatic compaction does it`, they: (v, w) => `${w} clears or compacts the context in ${v} of resets, before automatic compaction does it` },
  // Wide guess, no data: a few edits per check is typical when the agent tests as it goes.
  // batch: Log. Unchanged cutoffs, now read on a log scale.
  { key: "batch", name: "Edits between checks", scale: 10, prior: [1.5, 4, 12], log: true, good: -1, value: (m) => per(m.batchEdits ?? 0, m.checkBatches ?? 0, 3), fmt: n1, line: (v) => `Your agent makes ${v} code edits before a test, build or lint checks them`, they: (v, w) => `${w}'s agent makes ${v} code edits before a test, build or lint checks them` },
  // Stored in thousands (scale 0.001) so that share links stay within seven digits.
  // tokensFinish: Log. The new tokens-per-line cutoffs times about 200 lines per coding session, widened because sessions that don't end verified add tokens but not outcomes.
  { key: "tokensFinish", name: "Tokens per verified session", scale: 1e-3, prior: [3e5, 25e5, 15e6], log: true, good: -1, value: (m) => per(m.tokens.input + m.tokens.cacheWrite + m.tokens.output + m.tokens.subagent, m.verifiedFinishes ?? 0, 2), fmt: big, line: (v) => `Your agents use ${v} tokens for each session that ends verified`, they: (v, w) => `${w}'s agents use ${v} tokens for each session that ends verified` },
  // Wrapped totals (fun only; never compared or ranked). Totals depend on how much someone uploads, so each value is
  // capped to fit seven digits at its scale. Tokens are stored in units of 10,000 and dollars in units of 10 cents.
  // tokensAll: Log. Anthropic: about $13 per developer per active day and $150-250 a month, 90% under $30 a day [D1]; mostly cache reads, that is tens of millions of tokens a day, and heavy Max users run billions a month.
  { key: "tokensAll", name: "Tokens used", scale: 1e-4, prior: [3e7, 6e8, 6e9], log: true, wrapped: true, fun: true, value: (m) => {
    const t = allTokens(m);
    return t > 0 ? fit(t, 1e-4) : null;
  }, fmt: tokenCount, line: (v) => `Your agents used ${v} tokens`, they: (v, w) => `${w}'s agents used ${v} tokens` },
  // cacheShare: Share. Claude Code's own /usage example shows 91% of input from the cache [D1]; long sessions sit higher.
  { key: "cacheShare", name: "Input read from the cache", scale: 1e3, prior: [0.75, 0.92, 0.98], wrapped: true, fun: true, value: cacheShare, fmt: pct, line: (v) => `${v} of your agents' input tokens were read from the cache`, they: (v, w) => `${v} of ${w}'s agents' input tokens were read from the cache` },
  // apiCost: Log. $150-250 per developer per month on average in enterprises [D1]; people who upload are heavier, often on Max plans whose list-price value runs to thousands.
  { key: "apiCost", name: "Cost at API list prices", scale: 10, prior: [20, 400, 4e3], log: true, wrapped: true, fun: true, value: (m) => {
    const c = costOf(m);
    return c && c.usd > 0 ? fit(c.usd, 10) : null;
  }, fmt: usd, line: (v) => `Your tokens would cost ${v} at API list prices`, they: (v, w) => `${w}'s tokens would cost ${v} at API list prices` },
  // an index into MODEL_FAMILIES (src/lib/analyzer/prices.ts), which is append-only so that old links keep their model
  // mainModel: An index into MODEL_FAMILIES, never compared. Unchanged.
  { key: "mainModel", name: "Main model by cost", scale: 1, prior: [0, 7, 20], wrapped: true, fun: true, value: (m) => costOf(m)?.families[0]?.family ?? null, fmt: modelName, line: (v) => `Most of your API cost is ${v}`, they: (v, w) => `Most of ${w}'s API cost is ${v}` },
  // mainModelShare: Share. Unchanged.
  { key: "mainModelShare", name: "Main model's share of the cost", scale: 1e3, prior: [0.5, 0.8, 0.98], wrapped: true, fun: true, value: (m) => {
    const c = costOf(m);
    return c && c.usd > 0 ? c.families[0].usd / c.usd : null;
  }, fmt: pct, line: (v) => `Your main model accounts for ${v} of your API cost`, they: (v, w) => `${w}'s main model accounts for ${v} of their API cost` },
  // unpricedTokens: Log. Unchanged: almost everyone is at 0.
  { key: "unpricedTokens", name: "Tokens without a known price", scale: 1e-4, prior: [0, 0, 1e7], log: true, wrapped: true, fun: true, value: (m) => {
    const c = costOf(m);
    return c ? fit(c.unpricedTokens, 1e-4) : null;
  }, fmt: tokenCount, line: (v) => `${v} of your tokens came from models without a known price`, they: (v, w) => `${v} of ${w}'s tokens came from models without a known price` },
  // promptsAll: Log. A month of heavy use (about 20 hours a week [A2]).
  { key: "promptsAll", name: "Prompts sent", scale: 1, prior: [60, 600, 4e3], log: true, wrapped: true, fun: true, value: (m) => m.humanTurns > 0 ? fit(m.humanTurns, 1) : null, fmt: (v) => Math.round(v).toLocaleString("en-US"), line: (v) => `You sent ${v} prompts`, they: (v, w) => `${w} sent ${v} prompts` },
  // linesAll: Log. A month of heavy use, as pace.
  { key: "linesAll", name: "Lines written by agents", scale: 1, prior: [1e3, 15e3, 15e4], log: true, wrapped: true, fun: true, value: (m) => m.linesWritten > 0 ? fit(m.linesWritten, 1) : null, fmt: (v) => Math.round(v).toLocaleString("en-US"), line: (v) => `Your agents wrote ${v} lines`, they: (v, w) => `${w}'s agents wrote ${v} lines` },
  // busiestDay: Log. As promptsAll.
  { key: "busiestDay", name: "Most prompts in one day", scale: 1, prior: [15, 60, 200], log: true, wrapped: true, fun: true, value: (m) => m.busiestDayPrompts ? fit(m.busiestDayPrompts, 1) : null, fmt: (v) => String(Math.round(v)), line: (v) => `You sent ${v} prompts on your busiest day`, they: (v, w) => `${w} sent ${v} prompts on their busiest day` },
  // longestSession: Log. Active minutes; above the per-session cutoffs, since it is each person's maximum.
  { key: "longestSession", name: "Longest session", scale: 1, prior: [30, 180, 600], log: true, wrapped: true, fun: true, value: (m) => m.longestSessionMinutes > 0 ? fit(m.longestSessionMinutes, 1) : null, fmt: duration, line: (v) => `Your longest session had ${v} of active work`, they: (v, w) => `${w}'s longest session had ${v} of active work` },
  // Appended last (share links). wait: Log. Median minutes from the end of an agent run to your next message, breaks of
  // 10 minutes or more left out (src/lib/analyzer/runs.ts). Reading the agent's summary and typing a 45-word prompt
  // takes one to two minutes; one-word approvals take seconds, and people juggling parallel sessions leave each agent
  // waiting several minutes. Needs 5 waits.
  { key: "wait", name: "Agent waits for you", scale: 100, prior: [0.3, 1.5, 5], log: true, good: -1, value: (m) => m.agentWaits && m.agentWaits >= 5 && m.agentWaitMedianMinutes !== void 0 ? m.agentWaitMedianMinutes : null, fmt: (v) => v < 1 ? `${Math.round(v * 60)} s` : `${n1(v)} min`, line: (v) => `Your agent waits ${v} for you between runs`, they: (v, w) => `${w}'s agent waits ${v} for them between runs` },
  // How people brief the agent, and work it redoes (src/lib/analyzer/specificity.ts, churn.ts; docs/RESEARCH.md).
  // Descriptive first: we don't yet know which level of detail leads to good outcomes, and expect an inverted U
  // (too vague and too prescriptive both cost time), so vague follow-ups have no better direction until the research
  // in docs/RESEARCH.md says otherwise. Only avoidable rework is judged: redoing work after a correction is wasted
  // time whatever caused it. Both priors are wide guesses with no population data; the first look at real
  // transcripts is in docs/RESEARCH.md. How prescriptive prompts are is measured (prescriptivePrompts) but not yet a
  // signal: see docs/RESEARCH.md, "Signals".
  // Share links: append only (src/lib/links.ts). Signals no longer need adding in pairs: the decoder tells a single
  // person at an even token count from two people of an older width by their handles (docs/CALIBRATION.md, "Adding a
  // signal").
  // vague: Log, per 10 prompts. "fix this", "make it work", "still broken" with nothing they could refer to. Rare in long briefs, common in quick back-and-forth.
  { key: "vague", name: "Vague follow-ups per 10 prompts", scale: 10, prior: cut([0, 0.4, 1.5], "vague"), log: true, value: (m) => fromLabels(m, "vague", m.vaguePrompts === void 0 || readPrompts(m) < 5 ? null : m.vaguePrompts / readPrompts(m) * 10), fmt: n1, line: (v) => `You send ${v} vague follow-ups ("fix this", "still broken") per 10 prompts`, they: (v, w) => `${w} sends ${v} vague follow-ups ("fix this", "still broken") per 10 prompts` },
  // rework: Share of coding turns that redo earlier work after a correction, an undo or a repeated ask, without a stated change of plan. Sits below Corrections [0.02, 0.08, 0.2]: only corrections that lead to redone code count.
  { key: "rework", name: "Avoidable rework", scale: 1e3, prior: [0, 0.06, 0.2], good: -1, value: (m) => m.workTurns === void 0 ? null : per(m.avoidableRedos ?? 0, m.workTurns, 5), fmt: pct, line: (v) => `${v} of your agent's coding turns redo earlier work after a correction, an undo or a repeated ask`, they: (v, w) => `${v} of ${w}'s agent's coding turns redo earlier work after a correction, an undo or a repeated ask` },
  // Just for fun (Wrapped only, never compared, ranked or judged): typos and verbosity (src/lib/analyzer/typos.ts,
  // verbosity.ts), and the share of prompts in English, which both need: when most prompts aren't English, neither is
  // measured, and the cards say so. Appended for share links (docs/CALIBRATION.md, "Adding a signal"): released width
  // 50. All three are null without the wordlist (lexicon.ts), which the page loads on its own.
  // typos: Log, per 100 words. A wide guess with no population data: prompts are typed fast and rarely proofread, and
  // the one heavy user in the pilot transcripts (docs/RESEARCH.md, section 7) makes about 1.7. Needs 200 words read
  // and most prompts in English.
  { key: "typos", name: "Typos per 100 words", scale: 100, prior: [0.2, 0.8, 2.5], log: true, wrapped: true, fun: true, value: (m) => m.typos === void 0 || (m.typoWordsChecked ?? 0) < 200 || !mostlyEnglish(m) ? null : m.typos / m.typoWordsChecked * 100, fmt: n1, line: (v) => `You make ${v} typos per 100 words`, they: (v, w) => `${w} makes ${v} typos per 100 words` },
  // verbosity: Log, a ratio. Words spent on requests (follow-ups and a round-trip allowance included) over the words a
  // typical brief uses for what they carried and set off; 1 is typical by construction. Needs 5 requests.
  { key: "verbosity", name: "Words for what you asked", scale: 100, prior: [0.5, 1, 2], log: true, wrapped: true, fun: true, value: (m) => m.briefNeededWords === void 0 || (m.briefRequests ?? 0) < 5 || !m.briefNeededWords || !mostlyEnglish(m) ? null : (m.briefSpentWords ?? 0) / m.briefNeededWords, fmt: (v) => `${v.toFixed(1)}\xD7`, line: (v) => `You use ${v} the words a typical brief would for the same request`, they: (v, w) => `${w} uses ${v} the words a typical brief would for the same request` },
  // english: Share. Prompts read as English among those whose language could be told. Needs 5.
  { key: "english", name: "Prompts in English", scale: 1e3, prior: [0.5, 0.97, 1], wrapped: true, fun: true, value: (m) => {
    const n = (m.englishPrompts ?? 0) + (m.otherLanguagePrompts ?? 0);
    return m.englishPrompts === void 0 || n < 5 ? null : m.englishPrompts / n;
  }, fmt: pct, line: (v) => `${v} of your prompts are in English`, they: (v, w) => `${v} of ${w}'s prompts are in English` },
  // Scoring v2 label habits (src/lib/labeler/habits.ts, research/scoring-v2/RUBRIC.md): counted by code from each
  // prompt's labels, never set by the model. Appended last for share links. Until phase 3 (LABEL_HABITS_PUBLIC) they
  // are `wrapped`, which keeps them out of every table, comparison and board, and their values stay null publicly.
  // Priors are wide guesses from the label definitions (docs/CALIBRATION.md, "Label-based habits").
  // approvals: Share. "ok", "go ahead", "lgtm", "yes, option 2": accepting the agent's proposal or result.
  { key: "approvals", name: "Approvals and go-aheads", scale: 1e3, prior: [0.06, 0.18, 0.38], wrapped: !LABEL_HABITS_PUBLIC, value: (m) => labelOnly(m, "approvals"), fmt: pct, line: (v) => `${v} of your prompts approve the agent's plan or result, or tell it to go ahead`, they: (v, w) => `${v} of ${w}'s prompts approve the agent's plan or result, or tell it to go ahead` },
  // questions: Share. Real questions that expect an answer, not requests phrased as questions.
  { key: "questions", name: "Questions to the agent", scale: 1e3, prior: [0.03, 0.1, 0.24], wrapped: !LABEL_HABITS_PUBLIC, value: (m) => labelOnly(m, "questions"), fmt: pct, line: (v) => `${v} of your prompts ask the agent a real question`, they: (v, w) => `${v} of ${w}'s prompts ask the agent a real question` },
  // constraints: Share. Limits on the means: a library to use or avoid, files not to touch, no new dependencies.
  { key: "constraints", name: "Prompts setting constraints", scale: 1e3, prior: [0.04, 0.12, 0.28], wrapped: !LABEL_HABITS_PUBLIC, value: (m) => labelOnly(m, "constraints"), fmt: pct, line: (v) => `${v} of your prompts set limits on how the work is done`, they: (v, w) => `${v} of ${w}'s prompts set limits on how the work is done` },
  // goals: Share. Says why the work is wanted, or the outcome for users.
  { key: "goals", name: "Prompts saying why", scale: 1e3, prior: [0.01, 0.05, 0.15], wrapped: !LABEL_HABITS_PUBLIC, value: (m) => labelOnly(m, "goals"), fmt: pct, line: (v) => `${v} of your prompts say why the work is wanted`, they: (v, w) => `${v} of ${w}'s prompts say why the work is wanted` },
  // planAsks: Share. Asks for a plan, options or an investigation before code changes.
  { key: "planAsks", name: "Asks for a plan first", scale: 1e3, prior: [0, 0.03, 0.12], wrapped: !LABEL_HABITS_PUBLIC, value: (m) => labelOnly(m, "planAsks"), fmt: pct, line: (v) => `${v} of your prompts ask for a plan or options before any code changes`, they: (v, w) => `${v} of ${w}'s prompts ask for a plan or options before any code changes` },
  // stillBroken: Share. "still 404", "same error", "try again": the fix didn't work.
  { key: "stillBroken", name: "Still-broken reports", scale: 1e3, prior: [0, 0.03, 0.1], wrapped: !LABEL_HABITS_PUBLIC, value: (m) => labelOnly(m, "stillBroken"), fmt: pct, line: (v) => `${v} of your prompts tell the agent the problem is still there`, they: (v, w) => `${v} of ${w}'s prompts tell the agent the problem is still there` },
  // specificity: Mean of the 0–3 specificity label (0 nothing actionable, 3 what plus two kinds of specifics).
  { key: "specificity", name: "Prompt specificity", scale: 100, prior: [0.7, 1.3, 2], wrapped: !LABEL_HABITS_PUBLIC, value: (m) => labelOnly(m, "specificity"), fmt: (v) => `${v.toFixed(1)} of 3`, line: (v) => `Your prompts rate ${v} for how specific they are`, they: (v, w) => `${w}'s prompts rate ${v} for how specific they are` },
  // Just for fun, the Wrapped "Sayings" (src/lib/analyzer/fun-counts.ts): totals, like the Treasury's, so they depend on
  // how much someone uploads and are never compared, ranked or judged. Appended for share links (released width 62).
  // Priors are wide guesses with no population data; no card shows a percentile for them.
  // keepGoing: prompts that only say "continue" or "keep going". Needs 5 prompts.
  { key: "keepGoing", name: "Keep-going nudges", scale: 1, prior: [0, 6, 60], log: true, wrapped: true, fun: true, value: (m) => m.keepGoingPrompts === void 0 || m.humanTurns < 5 ? null : fit(m.keepGoingPrompts, 1), fmt: (v) => Math.round(v).toLocaleString("en-US"), line: (v) => `You told the agent to keep going ${v} times`, they: (v, w) => `${w} told the agent to keep going ${v} times` },
  // absolutelyRight: the agent's replies saying "You're absolutely right". Needs 5 replies.
  { key: "absolutelyRight", name: "\u201CYou\u2019re absolutely right\u201D", scale: 1, prior: [0, 4, 40], log: true, wrapped: true, fun: true, value: (m) => m.absolutelyRight === void 0 || m.assistantMessages < 5 ? null : fit(m.absolutelyRight, 1), fmt: (v) => Math.round(v).toLocaleString("en-US"), line: (v) => `Your agent told you you\u2019re absolutely right ${v} times`, they: (v, w) => `${w}\u2019s agent told them they\u2019re absolutely right ${v} times` },
  // thinkHard: prompts asking for "ultrathink", "think hard" and the like. Needs 5 prompts.
  { key: "thinkHard", name: "Asks to think hard", scale: 1, prior: [0, 2, 30], log: true, wrapped: true, fun: true, value: (m) => m.thinkHardPrompts === void 0 || m.humanTurns < 5 ? null : fit(m.thinkHardPrompts, 1), fmt: (v) => Math.round(v).toLocaleString("en-US"), line: (v) => `You asked the agent to think hard ${v} times`, they: (v, w) => `${w} asked the agent to think hard ${v} times` },
  // praise: "perfect" and "great" in prompts. Needs 5 prompts.
  { key: "praise", name: "\u201CPerfect\u201D and \u201Cgreat\u201D", scale: 1, prior: [0, 10, 120], log: true, wrapped: true, fun: true, value: (m) => m.praiseWords === void 0 || m.humanTurns < 5 ? null : fit(m.praiseWords, 1), fmt: (v) => Math.round(v).toLocaleString("en-US"), line: (v) => `You told the agent \u201Cperfect\u201D or \u201Cgreat\u201D ${v} times`, they: (v, w) => `${w} told the agent \u201Cperfect\u201D or \u201Cgreat\u201D ${v} times` },
  // longestPrompt: the most words in one prompt, fenced code left out. Needs 5 prompts.
  { key: "longestPrompt", name: "Longest prompt", scale: 1, prior: [60, 300, 1500], log: true, wrapped: true, fun: true, value: (m) => !m.longestPromptWords || m.humanTurns < 5 ? null : fit(m.longestPromptWords, 1), fmt: (v) => `${Math.round(v).toLocaleString("en-US")} words`, line: (v) => `Your longest prompt ran to ${v}`, they: (v, w) => `${w}\u2019s longest prompt ran to ${v}` },
  // Appended for compatibility: older share links have no child timing, so this stays null for them.
  // These are observed first/last child-log timestamps, never counts divided by session duration.
  { key: "peakSubagents", name: "Peak subagents working at once", scale: 1, prior: [1, 2, 6], log: true, value: (m) => m.peakSubagents ?? null, fmt: (v) => Math.round(v).toLocaleString("en-US"), line: (v) => `You have up to ${v} subagents working at once in the recorded activity`, they: (v, w) => `${w} has up to ${v} subagents working at once in the recorded activity` }
];
var SIGNAL_BY_KEY = Object.fromEntries(SIGNALS.map((s) => [s.key, s]));
var WORD_SIGNALS = ["done", "corrections", "catches", "plans", "please", "outbursts", "vague", "rework"];
var PROVISIONAL_COVERAGE = 0.5;
function asIfAllRead(m) {
  return { ...m, unmeasuredPrompts: 0, unmeasuredPlanSessions: 0, ...m.workTurns !== void 0 ? { workTurns: m.workTurns + (m.unmeasuredWorkTurns ?? 0) } : {} };
}
function languageCoverage(m) {
  const share = (read, all2) => all2 > 0 ? read / all2 : 1;
  const coverage = share(readPrompts(m), m.humanTurns);
  if (!m.unmeasuredPrompts && !m.unmeasuredPlanSessions && !m.unmeasuredWorkTurns) return { coverage, unmeasured: [], provisional: [] };
  const all = asIfAllRead(m);
  const byKey = {
    plans: share(readPlanSessions(m), m.sessionsWithEdits),
    rework: share(m.workTurns ?? 0, (m.workTurns ?? 0) + (m.unmeasuredWorkTurns ?? 0))
  };
  const unmeasured2 = [];
  const provisional = [];
  for (const k of WORD_SIGNALS) {
    const s = SIGNAL_BY_KEY[k];
    const v = s.value(m);
    const would = k === "catches" ? readPrompts(m) < 3 && m.humanTurns >= 3 ? 0 : null : s.value(all);
    if (v === null) {
      if (would !== null) unmeasured2.push(k);
    } else if ((byKey[k] ?? coverage) < PROVISIONAL_COVERAGE) provisional.push(k);
  }
  return { coverage, unmeasured: unmeasured2, provisional };
}
function signalValues(m) {
  return Object.fromEntries(SIGNALS.map((s) => {
    const v = s.value(m);
    return [s.key, v === null || !Number.isFinite(v) ? null : v];
  }));
}
function linkValues(v) {
  return SIGNALS.map((s) => v[s.key] === null || v[s.key] === void 0 ? null : Math.min(LINK_MAX, Math.max(0, Math.round(v[s.key] * s.scale))));
}
function exactPercentileOf(q, v) {
  if (!q?.length) return 50;
  const last = q.length - 1;
  let lo = 0;
  while (lo < last && q[lo + 1] === q[lo]) lo++;
  let hi = last;
  while (hi > 0 && q[hi - 1] === q[hi]) hi--;
  const gapLo = lo < last ? q[lo + 1] - q[lo] : 0;
  const gapHi = hi > 0 ? q[hi] - q[hi - 1] : 0;
  if (v <= q[0]) return gapLo > 0 ? 0.5 * Math.exp(-(q[0] - v) / gapLo) : 0.5;
  if (v >= q[last]) return gapHi > 0 ? 100 - 0.5 * Math.exp(-(v - q[last]) / gapHi) : 99.5;
  let i = 0;
  while (i < last && q[i + 1] <= v) i++;
  const span = q[i + 1] - q[i];
  return 0.5 + 99 * (i + (span > 0 ? (v - q[i]) / span : 0.5)) / last;
}
var priorAxis = (v, log) => log && v >= 0 ? Math.log1p(v) : v;
var priorTail = (u) => 1 / (1 + u) ** 2;
function priorPercentile(prior, v, log = false) {
  const [x10, x50, x90] = prior.map((p) => priorAxis(p, log));
  const x = priorAxis(v, log);
  const at10 = prior[0] > 0 ? 10 : 5;
  const lowUnit = Math.max(1e-9, x50 - x10);
  const highUnit = Math.max(1e-9, x90 - x50);
  if (x <= x10) return at10 * priorTail((x10 - x) / lowUnit);
  if (x <= x50) return at10 + (50 - at10) * (x - x10) / lowUnit;
  if (x <= x90) return 50 + 40 * (x - x50) / highUnit;
  return 100 - 10 * priorTail((x - x90) / highUnit);
}
function dataWeight(key, ref) {
  const n = ref?.n[key] ?? 0;
  return n >= MIN_CALIBRATION_N && ref?.quantiles[key] ? n / (n + PRIOR_STRENGTH) : 0;
}
function exactPercentile(key, v, ref, o) {
  const s = SIGNAL_BY_KEY[key];
  const prior = o ? priorPercentile(o.prior, v, o.log) : priorPercentile(s.prior, v, s.log);
  const w = dataWeight(key, ref);
  return w ? w * exactPercentileOf(ref.quantiles[key], v) + (1 - w) * prior : prior;
}
function percentileFor(key, v, ref) {
  return Math.round(exactPercentile(key, v, ref));
}
var PCT_MIN = 0.01;
var PCT_MAX = 99.99;
var clampPct = (p) => Math.min(PCT_MAX, Math.max(PCT_MIN, Math.round(p * 100) / 100));
function percentilePrecise(key, v, ref, o) {
  return clampPct(exactPercentile(key, v, ref, o));
}
function pctText(p) {
  return `${clampPct(p).toFixed(2)}%`;
}
function compareWords(pct2) {
  const p = clampPct(pct2);
  return p >= 50 ? `Higher than ${pctText(p)} of people` : `Lower than ${pctText(100 - p)} of people`;
}
function profileLines(values, ref, who) {
  return SIGNALS.filter((s) => !s.wrapped && values[s.key] !== null && values[s.key] !== void 0).map((s) => {
    const v = values[s.key];
    const p = percentilePrecise(s.key, v, ref);
    return { key: s.key, text: who ? s.they(s.fmt(v), who) : s.line(s.fmt(v)), compare: compareWords(p), pct: p, value: v };
  }).sort((a, b) => standout(b) - standout(a));
}
function standout(l) {
  const d = Math.abs(l.pct - 50);
  return l.value <= 0 && SIGNAL_BY_KEY[l.key].prior[0] <= 0 ? d / 2 : d;
}
var VOLUME_SIGNALS = /* @__PURE__ */ new Set(["hours", "minutes", "pace", "promptsHour", "peak", "concurrency", "parallel"]);
var COACH = {
  verify: {
    keep: (v) => `You run a test, build or the app after ${v} of your edits, so most problems show up right after the change that caused them.`,
    improve: (v) => `You run a test, build or the app after ${v} of your edits. Problems from unchecked edits tend to show up several steps later, when they're harder to trace.`,
    tip: { title: "Have the agent check each change", body: "Ask it to run the tests or the app after every edit, or add a Stop hook that runs them automatically." }
  },
  reads: {
    keep: (v) => `The agent reads ${v} of files before it changes them, so fewer of its edits conflict with the existing code.`,
    improve: (v) => `The agent reads only ${v} of files before it changes them, so it makes some edits without seeing the surrounding code.`,
    tip: { title: "Ask the agent to read before it edits", body: "Tell the agent to open the files that it's about to change and summarize them first. For a large change, ask for a short plan." }
  },
  plans: {
    keep: (v) => `You plan before the first edit in ${v} of sessions.`,
    improve: (v) => `You plan before the first edit in ${v} of sessions. On anything bigger than a small fix, planning first usually leads to fewer corrections.`,
    tip: { title: "Start with a plan", body: "Use plan mode, or ask the agent to outline the steps and wait for your go-ahead before it writes code." }
  },
  done: {
    keep: (v) => `${v} of your prompts describe what "done" looks like, so the agent knows when to stop.`,
    improve: (v) => `${v} of your prompts describe what "done" looks like. Without that, the agent decides for itself when the work is finished.`,
    tip: { title: "Say what done looks like", body: `End the prompt with how you'll judge the result, for example "the tests in auth.test.ts pass" or "the page loads without errors".` }
  },
  files: {
    keep: (v) => `${v} of your prompts name a specific file, so the agent spends less time searching.`,
    improve: (v) => `${v} of your prompts name a specific file, so the agent often has to search for the right place to work.`,
    tip: { title: "Name the files", body: "Mention the files or functions involved (in Claude Code, type @ to pick a file), and paste the exact error if there is one." }
  },
  steps: {
    keep: (v) => `The agent takes ${v} steps for every prompt that you write, so you hand off whole tasks.`,
    improve: (v) => `The agent takes ${v} steps for every prompt that you write, so you direct most of the steps yourself.`,
    tip: { title: "Hand off bigger pieces", body: "Describe the outcome and the constraints, then let the agent work through several steps before you check in." }
  },
  workPerPrompt: {
    keep: (v) => `Each prompt keeps your agent working for ${v}, so your sessions do real work between your turns.`,
    improve: (v) => `Each prompt keeps your agent working for ${v}. Short bursts mean you spend more time steering than the agent spends building.`,
    tip: { title: "Give each prompt more to do", body: "Before you switch to another window, give the agent the whole next step: what to build, how to check it, and when to stop. Then it keeps working while you're elsewhere." }
  },
  utilization: {
    keep: (v) => `Your agents spend ${v} of their time working rather than waiting for you.`,
    improve: (v) => `Your agents spend ${v} of their time working; the rest they sit waiting for your next prompt. With several sessions open, that waiting is where the time goes.`,
    tip: { title: "Keep fewer sessions busier", body: "Running more windows only helps if each agent has enough to do. Give each one a substantial task, or close the ones that keep waiting for you." }
  },
  wait: {
    keep: (v) => `Your agent waits ${v} for you between runs, so it spends little of the session idle.`,
    improve: (v) => `Your agent waits ${v} for you between runs. That's time the session sits idle while you read its output and write the next message.`,
    tip: { title: "Queue the next step", body: "Send the next instruction while the agent is still working: it picks the message up at its next step without stopping. Ask for a short summary at the end of each run, so that it's quick to read." }
  },
  finish: {
    keep: (v) => `${v} of your coding sessions end with passing checks or a commit after the last edit, so you know that the work runs when you stop.`,
    improve: (v) => `${v} of your coding sessions end with passing checks or a commit after the last edit. In the rest, nothing confirmed that the last change works.`,
    tip: { title: "Finish each session on a passing check", body: "Before you close a session, ask the agent to run the project's tests or build one last time, and to commit only if they pass." }
  },
  unresolved: {
    keep: (v) => `Your sessions end with ${v} unresolved errors on average, so failures rarely get left behind.`,
    improve: (v) => `Your sessions end with ${v} unresolved errors on average. Each one is a command or test that failed and didn't pass again before you stopped.`,
    tip: { title: "Don't leave failures behind", body: "Before you move on, ask the agent to list every command or test that failed in this session and to rerun each one until it passes, or to explain why it can't." }
  },
  loops: {
    keep: (v) => `You step in during ${v} of the agent's retry loops, so it rarely repeats a failing command for long on its own.`,
    improve: (v) => `You step in during ${v} of the agent's retry loops. When the same command fails three times in a row, the agent is usually guessing.`,
    tip: { title: "Interrupt repeated failures", body: "When the same test or command fails three times, press Esc and tell the agent the cause or a different approach instead of letting it retry." }
  },
  catches: {
    keep: (v) => `${v} of your corrections catch a mistake that the agent then fixes, so most of your corrections point at real errors.`,
    improve: (v) => `${v} of your corrections catch a mistake that the agent then fixes. The rest re-explain what you wanted, which usually means that the first prompt left something out.`,
    tip: { title: "Correct with evidence", body: "When you correct the agent, paste the failing test or error output, or quote the instruction that it missed, so that it fixes the actual problem." }
  },
  lessons: {
    keep: (v) => `You update CLAUDE.md, AGENTS.md or memory files in ${v} of sessions, so the agent starts each session with what you taught it.`,
    improve: (v) => `You update CLAUDE.md, AGENTS.md or memory files in ${v} of sessions. Corrections that aren't written down have to be repeated in each new session.`,
    tip: { title: "Write repeated corrections down", body: "When you correct the agent for the same thing twice, ask it to add a one-line rule to CLAUDE.md or AGENTS.md so that new sessions follow it." }
  },
  resets: {
    keep: (v) => `You clear or compact the context yourself in ${v} of resets, so the agent rarely works from an overfull context.`,
    improve: (v) => `You clear or compact the context yourself in ${v} of resets. The rest happen when the context is already full, and the agent compacts it at a point that you didn't choose.`,
    tip: { title: "Clear between tasks", body: "Run /clear when you start an unrelated task, and run /compact with a short note on what to keep when a long task reaches a natural break." }
  },
  batch: {
    keep: (v) => `Your agent makes ${v} code edits before a test, build or lint checks them, so a failure points to a small set of changes.`,
    improve: (v) => `Your agent makes ${v} code edits before a test, build or lint checks them. When a check fails after many edits, it's harder to find the edit that caused it.`,
    tip: { title: "Check in smaller steps", body: "Ask the agent to run the relevant tests after each file that it changes, or split the task into steps that each end with a passing check." }
  },
  tokensFinish: {
    keep: (v) => `Your agents use ${v} tokens for each session that ends verified, which is fewer than most people use.`,
    improve: (v) => `Your agents use ${v} tokens for each session that ends verified. Tokens spent in sessions that never reach a passing check or a commit count against this number.`,
    tip: { title: "Spend tokens on finished work", body: "Give the agent a test or command that proves the task is done, and start a fresh session for each task, so that fewer tokens go to work that's never confirmed." }
  },
  rework: {
    keep: (v) => `${v} of your agent's coding turns redo earlier work after you push back, so most of what it builds stays built.`,
    improve: (v) => `${v} of your agent's coding turns redo earlier work after a correction, an undo or a repeated ask. Each redo spends time and tokens on something the first attempt missed.`,
    tip: { title: "Say what and how you'll know", body: 'Before the agent starts, name the thing to change and what done looks like (a test, an example, the expected output). When it misses, say what is wrong and where, rather than "still broken".' }
  },
  corrections: {
    keep: (v) => `You correct the agent on ${v} of prompts, so your first request usually works.`,
    improve: (v) => `You correct the agent on ${v} of prompts. A correction usually means that the first prompt was missing context that the agent needed.`,
    tip: { title: "Put the context in the first prompt", body: "Include the goal, the files and any constraints in the first prompt. If two corrections don't help, clear the conversation and start again with a better prompt." }
  }
};
var COACH_KEYS = Object.keys(COACH);
function coachingFor(values, ref) {
  const judged = SIGNALS.filter((s) => s.good && values[s.key] !== null && values[s.key] !== void 0).map((s) => {
    const v = values[s.key];
    const p = percentileFor(s.key, v, ref);
    return { s, v, p, exact: percentilePrecise(s.key, v, ref), goodness: s.good === 1 ? p : 100 - p };
  }).sort((a, b) => b.goodness - a.goodness);
  const out = [];
  for (const x of judged.filter((x2) => x2.goodness >= 60).slice(0, 2))
    out.push({ kind: "strength", key: x.s.key, title: x.s.name, body: COACH[x.s.key].keep(x.s.fmt(x.v)), compare: compareWords(x.exact) });
  const weak = judged.filter((x) => x.goodness <= 40).reverse().slice(0, 2);
  for (const x of weak) out.push({ kind: "blindspot", key: x.s.key, title: x.s.name, body: COACH[x.s.key].improve(x.s.fmt(x.v)), compare: compareWords(x.exact) });
  const focus = weak[0] ?? judged[judged.length - 1];
  if (focus) out.push({ kind: "tip", key: focus.s.key, ...COACH[focus.s.key].tip });
  return out;
}

// src/lib/labeler/taxonomy.ts
var FLAGS = [
  "correction",
  "still_broken",
  "vague",
  "approval",
  "question",
  "done_criteria",
  "names_location",
  "constraints",
  "states_goal",
  "asks_plan"
];
var FLAG_INDEX = Object.fromEntries(FLAGS.map((f, i) => [f, i]));
var LABEL_ITEM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["i", "f", "t", "s"],
  properties: {
    i: { type: "integer", description: "the item's index" },
    f: { type: "array", items: { type: "string", enum: [...FLAGS] }, description: "every flag that applies; [] when none" },
    t: { type: "string", enum: ["new", "continue"] },
    s: { type: "integer", enum: [0, 1, 2, 3] }
  }
};

// src/lib/labeler/habits.ts
var REPLACED_HABITS = ["corrections", "vague", "done", "files"];

// src/cli/summary.ts
function roughCompare(pct2) {
  if (pct2 >= 90) return { words: "Well above most people", at: 95 };
  if (pct2 >= 70) return { words: "Above most people", at: 80 };
  if (pct2 > 30) return { words: "Near typical", at: 50 };
  if (pct2 > 10) return { words: "Below most people", at: 20 };
  return { words: "Well below most people", at: 5 };
}
var STANDS_OUT = 15;
function headlineHabits(values, cmp) {
  const skip = /* @__PURE__ */ new Set(["hours", ...cmp.labelsPhase3 ? REPLACED_HABITS : []]);
  const lines = profileLines(values, cmp.ref).filter((l) => !skip.has(l.key));
  const tier = (l) => {
    const s = SIGNAL_BY_KEY[l.key];
    const goodness = s.good === 1 ? l.pct : s.good === -1 ? 100 - l.pct : null;
    if (l.value <= 0) return 4;
    if (goodness !== null && goodness < 50) return 3;
    if (Math.abs(l.pct - 50) < STANDS_OUT) return 2;
    return VOLUME_SIGNALS.has(l.key) ? 1 : 0;
  };
  const ranked = [0, 1, 2, 3, 4].flatMap((t) => lines.filter((l) => tier(l) === t));
  const out = [];
  let fun = 0;
  for (const l of ranked) {
    if (out.length === 3) break;
    if (SIGNAL_BY_KEY[l.key].fun && fun++ >= 1) continue;
    const rough = roughCompare(l.pct);
    out.push({ key: l.key, text: l.text, compare: cmp.ref ? compareWords(l.pct) : rough.words, pct: cmp.ref ? l.pct : rough.at });
  }
  return out;
}
function summaryStyle(env, out) {
  const force = env.FORCE_COLOR !== void 0 && env.FORCE_COLOR !== "0" && env.FORCE_COLOR !== "false";
  const color = env.NO_COLOR === void 0 || env.NO_COLOR === "" ? force || !!out.isTTY && env.TERM !== "dumb" : false;
  const columns = out.columns || Number(env.COLUMNS) || 80;
  return { columns: Math.max(20, columns), color, truecolor: /truecolor|24bit/i.test(env.COLORTERM ?? "") };
}
var times = (n) => n === 1 ? "once" : n === 2 ? "twice" : `${n.toLocaleString("en-US")} times`;
function funLines(m, max = 2) {
  const out = [];
  const right = m.absolutelyRight ?? 0;
  const keep = m.keepGoingPrompts ?? 0;
  const praise = m.praiseWords ?? 0;
  const think = m.thinkHardPrompts ?? 0;
  const longest = m.longestPromptWords ?? 0;
  if (right > 0) out.push(`Your agent told you \u201CYou\u2019re absolutely right\u201D ${times(right)}.`);
  if (keep > 0) out.push(`You told your agent to keep going ${times(keep)}.`);
  if (praise > 0) out.push(`You called its work \u201Cperfect\u201D or \u201Cgreat\u201D ${times(praise)}.`);
  if (think > 0) out.push(`You asked it to think hard ${times(think)}.`);
  if (longest > 0) out.push(`Your longest prompt ran to ${longest.toLocaleString("en-US")} word${longest === 1 ? "" : "s"}.`);
  return out.slice(0, max);
}
var AGENT_NAMES = { "claude-code": "Claude Code", codex: "Codex" };
var agentsText = (sources) => {
  const names = Object.keys(AGENT_NAMES).filter((k) => sources.includes(k)).map((k) => AGENT_NAMES[k]);
  return names.length ? names.join(" and ") : "your coding agents";
};
function wrap(text, width) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (!line) line = word;
    else if (line.length + 1 + word.length <= width) line += " " + word;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}
var MAX_BOX = 84;
var MIN_BOX = 60;
function renderSummary(d, style) {
  const esc = (code) => (s) => style.color && s ? `\x1B[${code}m${s}\x1B[0m` : s;
  const accent = esc(style.truecolor ? "38;2;226;70;43" : "38;5;166");
  const bold = esc("1");
  const dim = esc("2");
  const strong = esc(style.truecolor ? "1;38;2;226;70;43" : "1;38;5;166");
  const boxed = style.columns >= MIN_BOX;
  const outer = boxed ? Math.min(MAX_BOX, style.columns - 4) : style.columns - 2;
  const inner = boxed ? outer - 6 : outer;
  const margin = boxed ? "  " : " ";
  const out = [""];
  const row = (raw = "", shown = raw) => out.push(boxed ? `${margin}${dim("\u2502")}  ${shown}${" ".repeat(Math.max(0, inner - raw.length))}  ${dim("\u2502")}` : raw ? `${margin}${shown}` : "");
  const rule = (left2, right2, title2) => {
    if (!boxed) {
      if (title2) out.push(...out[out.length - 1] === "" ? [] : [""], `${margin}${bold(title2)}`, `${margin}${dim("\u2500".repeat(Math.min(inner, title2.length)))}`);
      return;
    }
    const t = title2 ? `\u2500 ${title2} ` : "";
    out.push(`${margin}${dim(left2 + (title2 ? "\u2500 " : ""))}${title2 ? bold(title2) + " " : ""}${dim("\u2500".repeat(outer - 2 - t.length) + right2)}`);
  };
  const center = (raw, shown = raw) => {
    const pad = Math.max(0, Math.floor((inner - raw.length) / 2));
    row(" ".repeat(pad) + raw, " ".repeat(pad) + shown);
  };
  const para = (text, indent = "", paint = (s) => s) => {
    for (const l of wrap(text, inner - indent.length)) row(indent + l, indent + paint(l));
  };
  rule("\u256D", "\u256E");
  if (boxed) row();
  const title = "V I B R O M E T E R";
  const left = ",(\\(\\(";
  const right = ")/)/),";
  if (inner >= title.length + 2 * (left.length + 3)) center(`${left}   ${title}   ${right}`, `${accent(left)}   ${bold(title)}   ${accent(right)}`);
  else center(title, bold(title));
  center("know thy vibe", dim("know thy vibe"));
  row();
  const c = d.conversations;
  const p = d.prompts;
  para(`Read ${c.toLocaleString("en-US")} conversation${c === 1 ? "" : "s"} and ${p.toLocaleString("en-US")} prompt${p === 1 ? "" : "s"} from ${agentsText(d.sources)}, from the last ${d.days} day${d.days === 1 ? "" : "s"}, on this computer.`);
  if (boxed) row();
  rule("\u251C", "\u2524", "Where you stand out");
  row();
  const gauge = Math.max(10, Math.min(28, inner - 3));
  const beside = d.habits.every((h) => 3 + gauge + 2 + h.compare.length <= inner);
  d.habits.forEach((h, i) => {
    const num2 = `${i + 1}  `;
    const lines = wrap(h.text, inner - num2.length);
    lines.forEach((l, k) => row((k ? "   " : num2) + l, (k ? "   " : accent(num2)) + bold(l)));
    const at = Math.min(gauge - 1, Math.max(0, Math.round(h.pct / 100 * (gauge - 1))));
    const mid = Math.round((gauge - 1) / 2);
    const track = Array.from({ length: gauge }, (_, k) => k === mid ? "\u253C" : "\u2500");
    const before = track.slice(0, at).join("");
    const after = track.slice(at + 1).join("");
    if (beside) row(`   ${before}\u25CF${after}  ${h.compare}`, `   ${dim(before)}${strong("\u25CF")}${dim(after)}  ${h.compare}`);
    else {
      row(`   ${before}\u25CF${after}`, `   ${dim(before)}${strong("\u25CF")}${dim(after)}`);
      para(h.compare, "   ");
    }
    row();
  });
  for (const n of d.notes) para(n, "   ", dim);
  if (d.notes.length) row();
  if (d.fun.length) {
    rule("\u251C", "\u2524", "Just for fun");
    row();
    for (const f of d.fun) {
      const ls = wrap(f, inner - 3);
      ls.forEach((l, k) => row((k ? "   " : "\xB7  ") + l, (k ? "   " : accent("\xB7  ")) + l));
    }
    row();
  }
  rule("\u2570", "\u256F");
  const foot = boxed ? "    " : " ";
  const footWidth = (boxed ? outer - 4 : inner) - (foot.length - margin.length);
  const say = (text, paint = (s) => s) => {
    for (const l of wrap(text, footWidth)) out.push(foot + paint(l));
  };
  say(
    d.online ? "A preview, worked out on this computer and compared with everyone on the site. Nothing was uploaded." : "A preview, worked out on this computer. The site couldn't be reached, so the comparisons are rough; the site compares you with everyone. Nothing was uploaded.",
    dim
  );
  out.push("");
  say("Next: get your vibe type and share card", bold);
  out.push(`${foot}  ${accent("$")} ${strong(`${d.command} analyze --yes`)}`);
  say(d.signedIn ? "It asks you to confirm before anything is sent." : "It asks you to confirm, then signs you in in the browser.", dim);
  out.push("");
  say("To see exactly what would be sent first:", dim);
  out.push(`${foot}  ${dim("$")} ${dim(`${d.command} analyze --preview`)}`);
  out.push("");
  return out.join("\n");
}

// src/lib/analyzer/classify.ts
var TEST_RE = /\b(pytest|jest|vitest|mocha|ava|go test|cargo test|npm (run )?test|pnpm (run )?test|yarn test|bun test|rspec|phpunit|unittest|playwright test|deno test|mix test|dotnet test|gradle test|mvn test|make test|tox|nox|node --test|ctest)\b/i;
var BUILD_RE = /\b(tsc|npm run (build|lint|typecheck|check)|pnpm (run )?(build|lint|typecheck)|yarn (build|lint)|cargo (build|check|clippy)|go (build|vet)|make\b|eslint|ruff|mypy|pyright|next build|vite build|webpack|gradle build|mvn (package|compile))\b/i;
var GIT_RE = /\b(git (commit|push|merge|rebase|checkout|switch|branch|stash|add|diff|log|status)|gh pr)\b/i;
var READ_CMD_RE = /^\s*(cat|head|tail|less|bat|sed -n|nl|wc|file|stat)\b/;
var SEARCH_CMD_RE = /^\s*(rg|grep|ag|find|fd|ls|tree|git grep|locate)\b/;
function heredocTarget(cmd) {
  if (!/<<-?\s*['"]?\w+['"]?/.test(cmd) || !/\b(cat|tee)\b/.test(cmd)) return null;
  const head = cmd.split("\n")[0];
  const redirect = head.match(/(>>?)\s*([^\s<>|&;]+)/);
  if (redirect) return { path: redirect[2], append: redirect[1] === ">>" };
  const tee = head.match(/\btee\s+(-a\s+)?([^\s<>|&;-][^\s<>|&;]*)/);
  if (tee) return { path: tee[2], append: !!tee[1] };
  return null;
}
function categorizeCommand(cmd) {
  if (/\b(npm|pnpm|yarn|bun) (i|install|add)\b|^\s*pip3? install|^\s*(apt|apt-get|brew) install/.test(cmd)) return "exec";
  if (heredocTarget(cmd)) return "edit";
  if (TEST_RE.test(cmd)) return "test";
  if (BUILD_RE.test(cmd)) return "build";
  if (GIT_RE.test(cmd)) return "git";
  if (/\b(curl|wget|http)\b/.test(cmd) && !/localhost|127\.0\.0\.1/.test(cmd)) return "web";
  if (READ_CMD_RE.test(cmd)) return "read";
  if (SEARCH_CMD_RE.test(cmd)) return "search";
  if (/apply_patch|cat\s*>|tee\s|>\s*\S+\.\w+/.test(cmd)) return "edit";
  return "exec";
}
var NAME_MAP = {
  read: "read",
  notebookread: "read",
  view_image: "read",
  ls: "search",
  glob: "search",
  grep: "search",
  write: "edit",
  edit: "edit",
  multiedit: "edit",
  notebookedit: "edit",
  apply_patch: "edit",
  str_replace_editor: "edit",
  webfetch: "web",
  websearch: "web",
  web_search: "web",
  task: "agent",
  agent: "agent",
  spawn_agent: "agent",
  todowrite: "plan",
  update_plan: "plan",
  exitplanmode: "plan",
  enterplanmode: "plan",
  taskcreate: "plan",
  taskupdate: "plan",
  askuserquestion: "ask",
  request_user_input: "ask"
};
function categorizeTool(name, command) {
  const n = name.toLowerCase();
  if (n.startsWith("mcp__")) return "mcp";
  if (n === "bash" || n === "shell" || n === "exec_command" || n === "local_shell" || n === "local_shell_call" || n === "container.exec" || n === "powershell") {
    return command ? categorizeCommand(command) : "exec";
  }
  return NAME_MAP[n] ?? "other";
}
var CORRECTION_RE = /^\s*(no[,.! ]|nope|wrong|that'?s (not|wrong)|actually[, ]|stop\b|undo|revert|why did you|don'?t\b|do not\b|you (broke|didn'?t|forgot|missed)|it'?s (still )?(broken|not working)|still (broken|failing|not)|this (is|isn'?t) (wrong|working)|wait[,.! ])/i;
var CRITERIA_RE = /\b(should|must|make sure|ensure|expect(ed)?|acceptance|criteria|verify|test(s)? (pass|should)|so that|requirement|edge case|constraint|without breaking|done when)\b/i;
var PATH_RE = /(^|[\s`'"(])((\.{0,2}\/|~\/)?[\w.-]+\/[\w./-]+|~\/[\w.-]+|[\w-]+\.(ts|tsx|js|jsx|mjs|py|rs|go|rb|java|kt|swift|c|cc|cpp|h|cs|php|md|json|ya?ml|toml|sql|css|html|sh))\b/;
var POLITE_RE = /\b(please|pls|plz|thanks|thank you|thx|ty|appreciate)\b/gi;
var PROFANITY_RE = /\b(fuck\w*|shit\w*|damn\w*|wtf|crap|hell no|bloody)\b/gi;
var PRAISE_RE = /\b(great job|good job|nice work|nice job|well done|good work|you'?re (the best|awesome|amazing)|love (it|this)|perfect,? thanks?)\b/gi;
var HOSTILE_RE = /\b(idiot\w*|moron\w*|incompetent|(?:(?:this|that|it)(?:'s| is)|you(?:'re| are)?) (?:so |completely |totally )?(stupid|dumb|useless|garbage|trash|pathetic|ridiculous|terrible|awful|braindead)|are you (serious|kidding( me)?)|what the hell|i (already |just )?told you|for the last time|how many times|stop doing that|why would you)\b|[!?]{3,}/gi;
var STRUCTURE_RE = /(^|\n)\s*([-*•]|\d+[.)])\s+\S/;
function humanCodeChars(text) {
  let n = 0;
  const fences = text.match(/```[\s\S]*?```/g);
  if (fences) for (const f of fences) n += f.length;
  const rest = text.replace(/```[\s\S]*?```/g, "");
  for (const line of rest.split("\n")) {
    if (/^\s*(def |class |function |const |let |var |import |export |return |if \(|for \(|while \(|}\s*$|\w+\s*=\s*.+;\s*$)/.test(line)) n += line.length;
  }
  return n;
}
function originalLines(s) {
  if (!s) return 0;
  const m = s.match(/⟪trunc (\d+)c (\d+)l⟫/);
  if (m) return Number(m[2]);
  return s.split("\n").length;
}

// src/lib/analyzer/codex-script.ts
var ID = /[\w$]/;
var OutOfSteps = class extends Error {
};
var steps = 0;
var tick = () => {
  if (--steps < 0) throw new OutOfSteps();
};
function skipString(src, i) {
  const q = src[i];
  for (let k = i + 1; k < src.length; k++) {
    if (src[k] === "\\") k++;
    else if (src[k] === q) return k + 1;
  }
  return src.length;
}
function skipComment(src, i) {
  if (src.startsWith("//", i)) {
    const e = src.indexOf("\n", i);
    return e < 0 ? src.length : e;
  }
  if (src.startsWith("/*", i)) {
    const e = src.indexOf("*/", i + 2);
    return e < 0 ? src.length : e + 2;
  }
  return i;
}
function ws(src, i) {
  for (; ; ) {
    while (i < src.length && /\s/.test(src[i])) i++;
    const j = skipComment(src, i);
    if (j === i) return i;
    i = j;
  }
}
var ESC = { n: "\n", t: "	", r: "\r", b: "\b", f: "\f", v: "\v", "0": "\0" };
function readString(src, i) {
  const q = src[i];
  let out = "";
  let k = i + 1;
  for (; k < src.length && src[k] !== q; k++) {
    if (src[k] !== "\\") {
      out += src[k];
      continue;
    }
    const c = src[++k] ?? "";
    const hex = c === "u" ? src.slice(k + 1, k + 5) : c === "x" ? src.slice(k + 1, k + 3) : "";
    if (hex && /^[0-9a-fA-F]+$/.test(hex) && hex.length === (c === "u" ? 4 : 2)) {
      out += String.fromCharCode(parseInt(hex, 16));
      k += hex.length;
    } else if (c !== "\n") out += ESC[c] ?? c;
  }
  return [out, Math.min(k + 1, src.length)];
}
function skipExpr(src, i) {
  let depth = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") i = skipString(src, i);
    else if (skipComment(src, i) !== i) i = skipComment(src, i);
    else {
      if ("([{".includes(c)) depth++;
      else if (")]}".includes(c)) {
        if (depth === 0) return i;
        depth--;
      } else if (c === "," && depth === 0) return i;
      i++;
    }
  }
  return i;
}
function readValue(src, i) {
  i = ws(src, i);
  const c = src[i];
  if (c === '"' || c === "'" || c === "`") return readString(src, i);
  if (c === "{" || c === "[") {
    const obj = c === "{";
    const out = obj ? {} : [];
    i++;
    for (; ; ) {
      tick();
      i = ws(src, i);
      if (i >= src.length) return [out, i];
      if (src[i] === (obj ? "}" : "]")) return [out, i + 1];
      if (src[i] === ",") {
        i++;
        continue;
      }
      if (!obj) {
        const [v2, e2] = readValue(src, i);
        if (e2 <= i) return [out, i];
        out.push(v2);
        i = e2;
        continue;
      }
      let key;
      if (src[i] === '"' || src[i] === "'") [key, i] = readString(src, i);
      else {
        const m = /^[\w$]+/.exec(src.slice(i, i + 200));
        if (!m) return [out, skipExpr(src, i)];
        key = m[0];
        i += key.length;
      }
      i = ws(src, i);
      if (src[i] !== ":") continue;
      const [v, e] = readValue(src, i + 1);
      out[key] = v;
      i = e;
    }
  }
  const num2 = /^-?\d+(\.\d+)?([eE][-+]?\d+)?/.exec(src.slice(i, i + 40));
  if (num2 && !ID.test(src[i + num2[0].length] ?? "")) return [Number(num2[0]), i + num2[0].length];
  return [void 0, skipExpr(src, i)];
}
function scriptCalls(src) {
  const calls = [];
  steps = 8 * src.length + 1024;
  try {
    readCalls(src, calls);
  } catch (e) {
    if (!(e instanceof OutOfSteps)) throw e;
  }
  return calls;
}
function readCalls(src, calls) {
  let i = 0;
  while (i < src.length) {
    tick();
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      i = skipString(src, i);
      continue;
    }
    const j = skipComment(src, i);
    if (j !== i) {
      i = j;
      continue;
    }
    if (src.startsWith("tools.", i) && (i === 0 || !/[\w$.]/.test(src[i - 1]))) {
      const m = /^tools\.([A-Za-z_$][\w$]*)\s*\(/.exec(src.slice(i, i + 120));
      if (m) {
        const [arg] = readValue(src, i + m[0].length);
        calls.push({ name: m[1], arg });
        i += m[0].length;
        continue;
      }
    }
    i++;
  }
}

// src/lib/analyzer/local-time.ts
var MIN = 6e4;
var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
var formatters = /* @__PURE__ */ new Map();
function formatter(zone) {
  let f = formatters.get(zone);
  if (f === void 0) {
    try {
      f = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      f = null;
    }
    formatters.set(zone, f);
  }
  return f;
}
function isValidZone(zone) {
  return typeof zone === "string" && zone.length > 0 && zone.length <= 64 && /^[A-Za-z][A-Za-z0-9_+\-/]*$/.test(zone) && formatter(zone) !== null;
}
var offsetCache = /* @__PURE__ */ new Map();
function zoneOffsetAt(zone, t) {
  const f = formatter(zone);
  if (!f) return null;
  const key = `${zone}|${Math.floor(t / (15 * MIN))}`;
  const hit = offsetCache.get(key);
  if (hit !== void 0) return hit;
  const p = {};
  for (const x of f.formatToParts(new Date(t))) if (x.type !== "literal") p[x.type] = Number(x.value);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  const off = Math.round((wall - Math.floor(t / 1e3) * 1e3) / MIN);
  if (offsetCache.size > 5e4) offsetCache.clear();
  offsetCache.set(key, off);
  return off;
}
function isUtcAlias(zone) {
  return /^(Etc\/)?(UTC|UCT|GMT|Universal|Zulu|Greenwich)([+-]?0)?$/i.test(zone);
}
function deviceTimeZone() {
  try {
    const z = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidZone(z) ? z : void 0;
  } catch {
    return void 0;
  }
}
function clientTimeFields(timeZone = deviceTimeZone(), zoneRanges) {
  return { ...timeZone ? { timeZone } : {}, tzOffsetMinutes: (/* @__PURE__ */ new Date()).getTimezoneOffset(), ...zoneRanges?.length ? { zoneRanges } : {} };
}
function parseZoneRanges(s) {
  const out = [];
  for (const part of s.split(",").map((x) => x.trim()).filter(Boolean)) {
    const m = part.match(/^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})=(.+)$/);
    if (!m || !isValidZone(m[3]) || m[1] > m[2]) throw new Error(`Not a time zone range: "${part}". Write it as 2026-03-01..2026-03-14=Asia/Tokyo.`);
    out.push({ from: m[1], to: m[2], zone: m[3] });
  }
  return out;
}
function isZoneRange(r8) {
  const x = r8;
  return !!x && typeof x === "object" && DATE_RE.test(String(x.from)) && DATE_RE.test(String(x.to)) && x.from <= x.to && isValidZone(x.zone);
}
var dayAt = (t, offsetMin) => new Date(t + offsetMin * MIN).toISOString().slice(0, 10);
function codexTimeZones(records) {
  const out = [];
  for (const r8 of records) {
    if (r8.type !== "response_item") continue;
    const p = r8.payload || {};
    if (p.type !== "message" || p.role !== "user" || !Array.isArray(p.content)) continue;
    const t = Date.parse(String(r8.timestamp));
    if (!Number.isFinite(t)) continue;
    for (const c of p.content) {
      const text = typeof c.text === "string" ? c.text : "";
      if (!text.trimStart().startsWith("<environment_context>")) continue;
      const zone = text.match(/<timezone>\s*([^<\s]+)\s*<\/timezone>/)?.[1];
      if (!zone || !isValidZone(zone) || isUtcAlias(zone)) continue;
      const date = text.match(/<current_date>\s*(\d{4}-\d{2}-\d{2})\s*<\/current_date>/)?.[1];
      if (date && date !== dayAt(t, zoneOffsetAt(zone, t))) continue;
      if (out.at(-1)?.zone !== zone) out.push({ t, zone });
    }
  }
  return out;
}
var MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
var offsetOf = (s) => {
  const m = s.match(/^([+-])(\d{2}):?(\d{2})$/);
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : null;
};
var plausible = (off) => Math.abs(off) <= 14 * 60 && off % 15 === 0;
var DATE_CMD_RE = /^date(?:\s+(?:-R|--rfc-email|--rfc-2822|-I[a-z]*|--iso-8601(?:=[a-z]+)?|--rfc-3339=[a-z]+|\+\S+|'\+[^']*'|"\+[^"]*"))*\s*$/;
var DAY = "(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)";
var MONTHS = "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";
var GIT_DATE_RES = [
  new RegExp(`^\\s*(?:Author|Commit)?Date:\\s+${DAY} ${MONTHS} (\\d{1,2}) (\\d{2}):(\\d{2}):(\\d{2}) (\\d{4}) ([+-]\\d{4})\\s*$`, "m"),
  /^\s*(?:Author|Commit)?Date:\s+(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2}) ?([+-]\d{2}:?\d{2})\s*$/m
];
function offsetFromDate(out, t) {
  const text = out.trim();
  const bare = offsetOf(text);
  if (bare !== null) return bare;
  let wall = null;
  let given = null;
  let m;
  if (m = text.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:[.,]\d+)?\s?([+-]\d{2}:?\d{2})\b/)) {
    wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    given = offsetOf(m[7]);
  } else if (m = text.match(new RegExp(`${DAY}, (\\d{1,2}) ${MONTHS} (\\d{4}) (\\d{2}):(\\d{2}):(\\d{2}) ([+-]\\d{4})`))) {
    wall = Date.UTC(+m[3], MON[m[2]], +m[1], +m[4], +m[5], +m[6]);
    given = offsetOf(m[7]);
  } else if (m = text.match(new RegExp(`^${DAY} ${MONTHS} +(\\d{1,2}) (\\d{2}):(\\d{2}):(\\d{2}) (?:[A-Z]{2,5}|[+-]\\d{2,4}) (\\d{4})$`, "m"))) {
    wall = Date.UTC(+m[6], MON[m[1]], +m[2], +m[3], +m[4], +m[5]);
  } else if (m = text.match(new RegExp(`^${DAY} (\\d{1,2}) ${MONTHS} (\\d{4}) (\\d{2}):(\\d{2}):(\\d{2}) (?:[A-Z]{2,5}|[+-]\\d{2,4})$`, "m"))) {
    wall = Date.UTC(+m[3], MON[m[2]], +m[1], +m[4], +m[5], +m[6]);
  }
  if (wall === null) return null;
  const off = given ?? Math.round((wall - t) / (15 * MIN)) * 15;
  return Math.abs(wall - off * MIN - t) <= 3 * MIN ? off : null;
}
function offsetFromGit(out, commitTimes) {
  for (const [i, re] of GIT_DATE_RES.entries()) {
    const m = out.match(re);
    if (!m) continue;
    const w = i === 0 ? Date.UTC(+m[6], MON[m[1]], +m[2], +m[3], +m[4], +m[5]) : Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    const off = offsetOf(m[7]);
    if (off === null) continue;
    const at = w - off * MIN;
    if (commitTimes.some((c) => Math.abs(c - at) <= 10 * MIN)) return { off, at };
  }
  return null;
}
var REMOTE_RE = /\b(ssh|docker|podman|kubectl|gcloud|aws ssm|vagrant|multipass)\b/;
function toolOffsetEvidence(s) {
  const commands = /* @__PURE__ */ new Map();
  const commitTimes = [];
  for (const e of s.events) {
    if (e.kind !== "tool") continue;
    const cmd = e.detail.trim();
    commands.set(e.id, cmd);
    if (/\bgit\b[^|;&]*\bcommit\b/.test(cmd) && !REMOTE_RE.test(cmd)) commitTimes.push(e.t);
  }
  const out = [];
  for (const e of s.events) {
    if (e.kind !== "tool_result" || e.isError || !e.text || !e.t) continue;
    const cmd = commands.get(e.id);
    if (!cmd || REMOTE_RE.test(cmd)) continue;
    let text = e.text;
    if (text.startsWith("{")) {
      try {
        const o = JSON.parse(text);
        if (typeof o.output === "string") text = o.output;
      } catch {
      }
    }
    text = text.replace(/^[\s\S]*?\nOutput:\n/, "");
    if (DATE_CMD_RE.test(cmd)) {
      const off = offsetFromDate(text, e.t);
      if (off !== null && off !== 0 && plausible(off)) out.push({ t: e.t, offsetMin: off, kind: "date" });
    } else if (/\bgit\b/.test(cmd) && commitTimes.length) {
      const g2 = offsetFromGit(text, commitTimes);
      if (g2 && g2.off !== 0 && plausible(g2.off)) out.push({ t: g2.at, offsetMin: g2.off, kind: "git" });
    }
  }
  return out;
}
var TOOL_EVIDENCE_REACH = 24 * 60 * MIN;
var evidenceCache = /* @__PURE__ */ new WeakMap();
function evidenceOf(s) {
  let ev = evidenceCache.get(s);
  if (!ev) {
    const offsets = toolOffsetEvidence(s);
    const agree = new Set(offsets.map((o) => o.offsetMin)).size === 1;
    ev = { zones: (s.timeZones ?? []).filter((z) => isValidZone(z.zone) && !isUtcAlias(z.zone)), offsets: agree ? offsets : [] };
    evidenceCache.set(s, ev);
  }
  return ev;
}
function partsAt(t, offsetMin, source) {
  const d = new Date(t + offsetMin * MIN);
  return { hour: d.getUTCHours(), weekday: d.getUTCDay(), dateKey: d.toISOString().slice(0, 10), offsetMin, source };
}
function localTime(opts = {}) {
  const uploaderZone = isValidZone(opts.timeZone) ? opts.timeZone : void 0;
  const legacy = typeof opts.tzOffsetMinutes === "number" && Number.isFinite(opts.tzOffsetMinutes) ? -Math.round(opts.tzOffsetMinutes) : void 0;
  const ranges = (opts.zoneRanges ?? []).filter(isZoneRange);
  return (t, s) => {
    for (const r8 of ranges) {
      const off = zoneOffsetAt(r8.zone, t);
      const day = dayAt(t, off);
      if (day >= r8.from && day <= r8.to) return partsAt(t, off, "corrected");
    }
    if (s) {
      const ev = evidenceOf(s);
      if (ev.zones.length) {
        let z = ev.zones[0];
        for (const x of ev.zones) if (x.t <= t) z = x;
        return partsAt(t, zoneOffsetAt(z.zone, t), "session-zone");
      }
      if (ev.offsets.length) {
        let near;
        for (const o of ev.offsets) if (Math.abs(o.t - t) <= TOOL_EVIDENCE_REACH && (!near || Math.abs(o.t - t) < Math.abs(near.t - t))) near = o;
        if (near && !(uploaderZone && zoneOffsetAt(uploaderZone, near.t) === near.offsetMin)) return partsAt(t, near.offsetMin, "tool-offset");
      }
    }
    if (uploaderZone) return partsAt(t, zoneOffsetAt(uploaderZone, t), "uploader-zone");
    if (legacy !== void 0) return partsAt(t, legacy, "uploader-offset");
    return partsAt(t, 0, "utc");
  };
}
function localParts(instantMs, session, opts = {}) {
  return localTime(opts)(instantMs, session);
}

// src/lib/analyzer/parse.ts
var zero = () => ({ input: 0, cacheRead: 0, cacheWrite: 0, output: 0 });
var str = (v) => typeof v === "string" ? v : "";
var num = (v) => typeof v === "number" && isFinite(v) ? v : 0;
var cut2 = (s, n) => s.length > n ? (" " + s.slice(0, n)).slice(1) : s;
var ts = (v) => {
  const t = Date.parse(str(v));
  return isNaN(t) ? 0 : t;
};
function readUsage(u) {
  const split = u.cache_creation || {};
  const w5 = num(split.ephemeral_5m_input_tokens);
  const w1 = num(split.ephemeral_1h_input_tokens);
  const cacheWrite = Math.max(num(u.cache_creation_input_tokens), w5 + w1);
  return { input: num(u.input_tokens), cacheRead: num(u.cache_read_input_tokens), cacheWrite, output: num(u.output_tokens), cacheWrite1h: Math.min(w1, cacheWrite) };
}
var maxUsage = (a, b) => ({
  input: Math.max(a.input, b.input),
  cacheRead: Math.max(a.cacheRead, b.cacheRead),
  cacheWrite: Math.max(a.cacheWrite, b.cacheWrite),
  output: Math.max(a.output, b.output),
  cacheWrite1h: Math.max(a.cacheWrite1h ?? 0, b.cacheWrite1h ?? 0)
});
function addUsage(to, u) {
  to.input += u.input;
  to.cacheRead += u.cacheRead;
  to.cacheWrite += u.cacheWrite;
  to.output += u.output;
  to.cacheWrite1h = (to.cacheWrite1h ?? 0) + (u.cacheWrite1h ?? 0);
}
var usageTotal = (u) => u.input + u.cacheRead + u.cacheWrite + u.output;
function detectSource(records) {
  for (const r8 of records.slice(0, 50)) {
    if ("payload" in r8 && (r8.type === "session_meta" || r8.type === "response_item" || r8.type === "event_msg" || r8.type === "turn_context")) return "codex";
    if ("sessionId" in r8 || r8.type === "assistant" || r8.type === "user" || r8.type === "attachment") return "claude-code";
    if (r8.type === "summary" && "leafUuid" in r8 || r8.type === "file-history-snapshot" && "snapshot" in r8) return "claude-code";
  }
  return "unknown";
}
var nonHumanOrigin = (o) => {
  const kind = o && typeof o === "object" ? o.kind : void 0;
  return typeof kind === "string" && kind !== "human" && kind !== "user";
};
function injectedRecord(r8) {
  return r8.isMeta === true || nonHumanOrigin(r8.origin) || typeof r8.turnOrigin === "string" && r8.turnOrigin !== "human";
}
function isSyntheticPrompt(text) {
  const t = text.trimStart();
  return (
    // a message from another session or a sub-agent's hand-back, when the record lacks isMeta/origin
    /^(?:Another Claude session sent a message:\s*)?<agent-message[\s>]/.test(t) || // GitHub and webhook events that wake a cloud session
    t.startsWith("<wake ") || t.startsWith("<wake>") || t.startsWith("<webhook-payload") || t.startsWith("<local-command-stdout>") || t.startsWith("<local-command-stderr>") || t.startsWith("Caveat:") || t.startsWith("<system-reminder>") || t.startsWith("<user_instructions>") || t.startsWith("<environment_context>") || t.startsWith("<task-notification>") || t.startsWith("This session is being continued from a previous conversation") || t.startsWith("<user_action>") || t.startsWith("<bash-input>") || t.startsWith("<bash-stdout>") || t.startsWith("<bash-stderr>") || t.startsWith("<command-message>") && !t.includes("<command-name>")
  );
}
function toolDetail(name, input) {
  const path = str(input.file_path) || str(input.path) || str(input.notebook_path) || void 0;
  const command = str(input.command) || void 0;
  let written;
  let old;
  if (typeof input.content === "string") written = input.content;
  else if (typeof input.new_string === "string") written = input.new_string;
  else if (Array.isArray(input.edits)) written = input.edits.map((e) => str(e.new_string)).join("\n");
  else if (typeof input.new_source === "string") written = input.new_source;
  if (typeof input.old_string === "string") old = input.old_string;
  else if (Array.isArray(input.edits)) old = input.edits.map((e) => str(e.old_string)).join("\n");
  const detail = cut2(command || path || str(input.pattern) || str(input.query) || str(input.url) || str(input.description) || name, 300);
  return { detail, path, written, old, command };
}
function claudeBuilder(fallbackId = "session") {
  const events = [];
  const models = /* @__PURE__ */ new Set();
  const subagentUsage = zero();
  let id = fallbackId;
  let version;
  let cwd;
  const assistantById = /* @__PURE__ */ new Map();
  const usageById = /* @__PURE__ */ new Map();
  const subUsageById = /* @__PURE__ */ new Map();
  const childTimes = /* @__PURE__ */ new Map();
  const toolsSeen = /* @__PURE__ */ new Set();
  let minT = Infinity;
  let maxT = 0;
  function push(r8) {
    const t = ts(r8.timestamp);
    if (r8.sessionId) id = str(r8.sessionId);
    if (r8.version) version = str(r8.version);
    if (!cwd && typeof r8.cwd === "string") cwd = r8.cwd;
    const msg = r8.message || {};
    if (r8.isSidechain === true) {
      if (typeof r8.agentId === "string" && r8.agentId && t) {
        const span = childTimes.get(r8.agentId);
        childTimes.set(r8.agentId, span ? [Math.min(span[0], t), Math.max(span[1], t)] : [t, t]);
      }
      if (r8.type === "assistant" && msg.usage) {
        const mid = str(msg.id) || str(r8.requestId) || str(r8.uuid);
        const prev = subUsageById.get(mid);
        const model = str(msg.model) || prev?.model || "unknown";
        subUsageById.set(mid, { model, usage: maxUsage(prev?.usage ?? zero(), readUsage(msg.usage)) });
      }
      return;
    }
    if (t) {
      minT = Math.min(minT, t);
      maxT = Math.max(maxT, t);
    }
    if (r8.type === "system" && (r8.subtype === "compact_boundary" || str(r8.content).includes("Conversation compacted"))) {
      const trigger = str((r8.compactMetadata || {}).trigger);
      events.push({ kind: "compact", t, ...trigger === "auto" ? { auto: true } : trigger === "manual" ? { auto: false } : {} });
      return;
    }
    if (r8.isCompactSummary === true) {
      events.push({ kind: "compact", t });
      return;
    }
    if (r8.type === "user") {
      if (r8.permissionMode === "plan") events.push({ kind: "plan_mode", t });
      const c = msg.content;
      const injected = injectedRecord(r8);
      if (typeof c === "string") {
        pushPrompt(c, t, injected);
      } else if (Array.isArray(c)) {
        for (const b of c) {
          if (b.type === "tool_result") {
            const content = typeof b.content === "string" ? b.content : JSON.stringify(b.content ?? "");
            const head = content.replace(/^\[\{"type":"text","text":"/, "").slice(0, 120);
            const rejected = /^(The user doesn't want to (proceed|take this action)|User rejected|Permission to use .* (was )?denied)/i.test(head.trimStart());
            events.push({ kind: "tool_result", t, id: str(b.tool_use_id), isError: b.is_error === true, rejected, text: cut2(content, 4e3) });
          } else if (b.type === "text") {
            pushPrompt(str(b.text), t, injected);
          }
        }
      }
    } else if (r8.type === "assistant") {
      const mid = str(msg.id) || str(r8.requestId) || str(r8.uuid);
      if (msg.model && str(msg.model) !== "<synthetic>") models.add(str(msg.model));
      let ev = assistantById.get(mid);
      if (!ev) {
        ev = { kind: "assistant", t, model: str(msg.model) || void 0, toolCount: 0, text: "" };
        assistantById.set(mid, ev);
        events.push(ev);
      }
      if (msg.usage) {
        usageById.set(mid, maxUsage(usageById.get(mid) ?? zero(), readUsage(msg.usage)));
      }
      const c = Array.isArray(msg.content) ? msg.content : [];
      for (const b of c) {
        if (b.type === "text") ev.text += cut2(str(b.text), 2e3);
        if (b.type === "tool_use") {
          const tid = str(b.id);
          if (toolsSeen.has(tid)) continue;
          toolsSeen.add(tid);
          const name = str(b.name);
          const input = b.input || {};
          const d = toolDetail(name, input);
          let create = name.toLowerCase() === "write";
          const hd = d.command && d.written === void 0 ? heredocTarget(d.command) : null;
          if (hd) {
            d.written = d.command;
            d.path = hd.path;
            create = !hd.append;
          }
          ev.toolCount++;
          events.push({
            kind: "tool",
            t,
            id: tid,
            name,
            category: categorizeTool(name, d.command),
            detail: d.detail,
            path: d.path,
            written: d.written,
            linesWritten: originalLines(d.written),
            create,
            ...d.old !== void 0 ? { old: d.old } : {}
          });
        }
      }
    } else if (r8.type === "attachment") {
      const a = r8.attachment || {};
      const prompt = typeof a.prompt === "string" ? a.prompt : Array.isArray(a.prompt) ? a.prompt.filter((b) => b.type === "text").map((b) => str(b.text)).join("\n") : void 0;
      if (a.type === "queued_command" && a.isMeta !== true && (a.commandMode === void 0 || a.commandMode === "prompt") && prompt !== void 0) {
        if (!nonHumanOrigin(a.origin)) pushPrompt(prompt, t, false, true);
      }
    }
  }
  function pushPrompt(text, t, injected, queued = false) {
    if (injected) return;
    if (/^\s*\[Request interrupted by user/.test(text)) {
      events.push({ kind: "interrupt", t });
      return;
    }
    if (isSyntheticPrompt(text)) return;
    const cmd = text.match(/<command-name>\/?([^<]+)<\/command-name>/);
    if (cmd) {
      const args2 = (text.match(/<command-args>([\s\S]*?)<\/command-args>/)?.[1] ?? "").trim();
      const name = cmd[1].trim();
      if (name === "plan") events.push({ kind: "plan_mode", t });
      events.push({ kind: "prompt", t, text: `/${name} ${args2}`.trim(), slash: true, ...queued ? { queued } : {} });
      return;
    }
    if (!text.trim()) return;
    events.push({ kind: "prompt", t, text, slash: false, ...queued ? { queued } : {} });
  }
  function finish() {
    for (const [mid, u] of usageById) {
      const ev = assistantById.get(mid);
      if (ev) ev.usage = u;
    }
    const subagentUsageByModel = {};
    for (const { model, usage } of subUsageById.values()) {
      if (model === "<synthetic>" && !usageTotal(usage)) continue;
      addUsage(subagentUsage, usage);
      addUsage(subagentUsageByModel[model] ??= zero(), usage);
    }
    return {
      id,
      source: "claude-code",
      startedAt: minT === Infinity ? childTimes.size ? Math.min(...[...childTimes.values()].map(([a]) => a)) : 0 : minT,
      endedAt: maxT || (childTimes.size ? Math.max(...[...childTimes.values()].map(([, b]) => b)) : 0),
      models: [...models],
      events,
      subagentUsage,
      subagentUsageByModel,
      ...childTimes.size ? { subagentSpans: [...childTimes.values()].filter(([a, b]) => b > a) } : {},
      version,
      cwd,
      firstPrompt: firstPromptOf(events)
    };
  }
  return { push, finish };
}
function firstPromptOf(events) {
  for (const e of events) if (e.kind === "prompt" && !e.slash) return cut2(e.text, 160);
  for (const e of events) if (e.kind === "prompt") return cut2(e.text, 160);
  return void 0;
}
function codexBuilder(fallbackId = "session") {
  const events = [];
  const models = /* @__PURE__ */ new Set();
  let id = fallbackId;
  let version;
  let total;
  let cwd;
  let repo;
  let minT = Infinity;
  let maxT = 0;
  let lastAssistant;
  let prevCum = zero();
  let curModel;
  const exitCodes = /* @__PURE__ */ new Map();
  const resultsById = /* @__PURE__ */ new Map();
  let inTurn = false;
  let turnBusy = false;
  let subagent;
  let sawMeta = false;
  const scriptIds = /* @__PURE__ */ new Map();
  let lastPrompt;
  function pushPrompt(text, t, via) {
    if (!text.trim() || isSyntheticPrompt(text)) return;
    if (lastPrompt && lastPrompt.via !== via && lastPrompt.text === text.trim() && Math.abs(t - lastPrompt.t) < 6e4) {
      if (!events.slice(lastPrompt.at + 1).some((e) => e.kind === "assistant" || e.kind === "tool")) return;
    }
    const queued = inTurn && turnBusy;
    lastPrompt = { text: text.trim(), t, via, at: events.length };
    events.push({ kind: "prompt", t, text, slash: text.trimStart().startsWith("/"), ...queued ? { queued } : {} });
    turnBusy = true;
  }
  function pushTool(t, id2, name, input) {
    let command;
    if (Array.isArray(input.command)) {
      const arr = input.command.map(String);
      command = arr[0] === "bash" && arr[1]?.startsWith("-") ? arr.slice(2).join(" ") : arr.join(" ");
    } else if (typeof input.cmd === "string") command = input.cmd;
    else if (typeof input.command === "string") command = input.command;
    let written;
    let old;
    let path;
    let paths;
    let deleted;
    if (name === "apply_patch" || command && command.includes("apply_patch")) {
      const patch = typeof input.content === "string" ? input.content : typeof input.input === "string" ? input.input : command ?? "";
      const lines = patch.split("\n");
      written = lines.filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1)).join("\n");
      old = lines.filter((l) => l.startsWith("-") && !l.startsWith("---")).map((l) => l.slice(1)).join("\n");
      path = patch.match(/\*\*\* (?:Update|Add) File: (.+)/)?.[1];
      const heads = [...patch.matchAll(/\*\*\* (Update|Add|Delete) File: (.+)/g)];
      if (heads.length > 1) paths = heads.map((h) => h[2].trim());
      const dels = heads.filter((h) => h[1] === "Delete").map((h) => h[2].trim());
      if (dels.length) {
        deleted = dels;
        path ??= dels[0];
      }
    }
    const cat = name === "apply_patch" ? "edit" : categorizeTool(name, command);
    if (!lastAssistant || lastAssistant.t < t - 6e4) {
      lastAssistant = { kind: "assistant", t, model: curModel, toolCount: 0, text: "" };
      events.push(lastAssistant);
    }
    lastAssistant.toolCount++;
    events.push({
      kind: "tool",
      t,
      id: id2,
      name,
      category: written !== void 0 ? "edit" : cat,
      detail: cut2(command || path || name, 300),
      path,
      written,
      linesWritten: originalLines(written),
      ...old ? { old } : {},
      ...paths ? { paths } : {},
      ...deleted ? { deleted } : {}
    });
  }
  function pushResult(t, cid, out) {
    let isError = false;
    try {
      const o = JSON.parse(out);
      const code = o?.metadata?.exit_code ?? o?.exit_code;
      isError = typeof code === "number" && code !== 0;
    } catch {
      isError = /Process exited with code [1-9]|exit code: [1-9]|"exit_code":\s*[1-9]/i.test(out);
    }
    if (exitCodes.has(cid)) isError = exitCodes.get(cid) !== 0;
    const rejected = /rejected by user|user denied|declined/i.test(out);
    const res = { kind: "tool_result", t, id: cid, isError, rejected, text: cut2(out, 4e3) };
    resultsById.set(cid, res);
    events.push(res);
  }
  const zones = [];
  function push(r8) {
    for (const z of codexTimeZones([r8])) if (zones.at(-1)?.zone !== z.zone) zones.push(z);
    const t = ts(r8.timestamp);
    if (t) {
      minT = Math.min(minT, t);
      maxT = Math.max(maxT, t);
    }
    const p = r8.payload || {};
    const ptype = str(p.type);
    if (r8.type === "session_meta") {
      const src = p.source;
      if (!sawMeta && src && typeof src === "object" && "subagent" in src) {
        subagent = { parent: str((src.subagent || {}).thread_spawn?.parent_thread_id) };
      }
      sawMeta = true;
      id = str(p.id) || id;
      version = str(p.cli_version) || version;
      if (typeof p.cwd === "string") cwd = p.cwd;
      repo ??= repoName((p.git || {}).repository_url);
      return;
    }
    if (r8.type === "turn_context") {
      if (p.model) {
        curModel = str(p.model);
        models.add(curModel);
      }
      return;
    }
    if (r8.type === "event_msg") {
      if (ptype === "user_message") {
        pushPrompt(str(p.message), t, "event");
      } else if (ptype === "item_completed" && (p.item || {}).type === "UserMessage") {
        const parts = Array.isArray(p.item.content) ? p.item.content : [];
        pushPrompt(parts.filter((x) => x.type === "text").map((x) => str(x.text)).join("\n"), t, "item");
      } else if (ptype === "task_started" || ptype === "turn_started") {
        inTurn = true;
        const last = events.at(-1);
        turnBusy = false;
        if (last?.kind === "prompt" && t - last.t < 5e3) turnBusy = true;
      } else if (ptype === "task_complete" || ptype === "turn_complete") {
        inTurn = false;
      } else if (ptype === "turn_aborted") {
        inTurn = false;
        events.push({ kind: "interrupt", t });
      } else if (ptype === "token_count") {
        const info = p.info || {};
        const tu = info.total_token_usage;
        if (tu) {
          const cached = num(tu.cached_input_tokens);
          const cum = {
            input: Math.max(0, num(tu.input_tokens) - cached),
            cacheRead: cached,
            cacheWrite: 0,
            output: num(tu.output_tokens)
          };
          total = cum;
          const delta = {
            input: Math.max(0, cum.input - prevCum.input),
            cacheRead: Math.max(0, cum.cacheRead - prevCum.cacheRead),
            cacheWrite: 0,
            output: Math.max(0, cum.output - prevCum.output)
          };
          if (delta.input + delta.cacheRead + delta.output > 0) {
            if (!lastAssistant || lastAssistant.usage && curModel && lastAssistant.model !== curModel) {
              lastAssistant = { kind: "assistant", t, model: curModel, toolCount: 0, text: "" };
              events.push(lastAssistant);
            }
            lastAssistant.model ??= curModel;
            const u = lastAssistant.usage ?? zero();
            lastAssistant.usage = { input: u.input + delta.input, cacheRead: u.cacheRead + delta.cacheRead, cacheWrite: 0, output: u.output + delta.output };
          }
          prevCum = cum;
        }
      } else if (ptype === "context_compacted" || ptype === "compacted") {
        events.push({ kind: "compact", t });
      } else if (ptype === "exec_command_end" && typeof p.exit_code === "number") {
        const cid = str(p.call_id);
        exitCodes.set(cid, p.exit_code);
        const res = resultsById.get(cid);
        if (res) res.isError = p.exit_code !== 0;
      }
      return;
    }
    if (r8.type === "compacted") {
      events.push({ kind: "compact", t });
      return;
    }
    if (r8.type === "response_item") {
      if (inTurn && (p.role === "assistant" || ptype !== "message")) turnBusy = true;
      if (ptype === "message" && p.role === "assistant") {
        const parts = Array.isArray(p.content) ? p.content : [];
        lastAssistant = { kind: "assistant", t, model: curModel, toolCount: 0, text: cut2(parts.map((x) => str(x.text)).join(""), 2e3) };
        events.push(lastAssistant);
      } else if (ptype === "function_call" || ptype === "custom_tool_call" || ptype === "local_shell_call") {
        const cid = str(p.call_id) || str(p.id);
        const calls = ptype === "custom_tool_call" && p.name === "exec" && typeof p.input === "string" ? scriptCalls(p.input) : [];
        if (calls.length) {
          const ids = calls.map((_, k) => calls.length > 1 ? `${cid}:${k}` : cid);
          scriptIds.set(str(p.call_id), ids);
          calls.forEach((c, k) => pushTool(t, ids[k], c.name, c.arg && typeof c.arg === "object" ? c.arg : typeof c.arg === "string" ? { input: c.arg } : {}));
          return;
        }
        let input = {};
        const rawArgs = p.arguments ?? p.input ?? p.action;
        if (typeof rawArgs === "string") {
          try {
            input = JSON.parse(rawArgs);
          } catch {
            input = { content: rawArgs };
          }
        } else if (rawArgs && typeof rawArgs === "object") input = rawArgs;
        pushTool(t, cid, str(p.name) || (ptype === "local_shell_call" ? "local_shell" : "tool"), input);
      } else if (ptype === "function_call_output" || ptype === "custom_tool_call_output") {
        const cid = str(p.call_id);
        const ids = scriptIds.get(cid);
        if (ids && Array.isArray(p.output)) {
          const parts = p.output.map((x) => str(x.text));
          if (parts.length && /^Script\b/.test(parts[0])) parts.shift();
          if (parts.length === ids.length) ids.forEach((id2, k) => pushResult(t, id2, parts[k]));
          else for (const id2 of ids) pushResult(t, id2, parts.join("\n"));
          return;
        }
        pushResult(t, cid, typeof p.output === "string" ? p.output : JSON.stringify(p.output ?? ""));
      }
    }
  }
  function finish() {
    const s = session();
    if (zones.length) s.timeZones = zones;
    return s;
  }
  function session() {
    if (subagent) {
      const subagentUsage = zero();
      const subagentUsageByModel = {};
      for (const e of events) {
        if (e.kind !== "assistant" || !e.usage) continue;
        addUsage(subagentUsage, e.usage);
        addUsage(subagentUsageByModel[e.model ?? "unknown"] ??= zero(), e.usage);
      }
      return { id: subagent.parent || id, source: "codex", startedAt: minT === Infinity ? 0 : minT, endedAt: maxT, models: [], events: [], subagentUsage, subagentUsageByModel, ...minT !== Infinity && maxT > minT ? { subagentSpans: [[minT, maxT]] } : {}, version, cwd, firstPrompt: void 0 };
    }
    return {
      id,
      source: "codex",
      startedAt: minT === Infinity ? 0 : minT,
      endedAt: maxT,
      models: [...models],
      events,
      totalUsageOverride: total,
      subagentUsage: zero(),
      version,
      cwd,
      ...repo ? { repo } : {},
      firstPrompt: firstPromptOf(events)
    };
  }
  return { push, finish };
}
var SessionParser = class {
  constructor(fallbackId) {
    this.fallbackId = fallbackId;
    this.head = [];
    this.builder = null;
    this.records = 0;
  }
  line(line) {
    const l = line.trim();
    if (!l || l[0] !== "{") return;
    let v;
    try {
      v = JSON.parse(l);
    } catch {
      return;
    }
    if (v && typeof v === "object") this.record(v);
  }
  record(r8) {
    this.records++;
    if (this.builder) return this.builder.push(r8);
    if (this.records > 50) return;
    this.head.push(r8);
    const src = detectSource([r8]);
    if (src === "unknown") return;
    this.builder = src === "codex" ? codexBuilder(this.fallbackId) : claudeBuilder(this.fallbackId);
    for (const h of this.head) this.builder.push(h);
    this.head = [];
  }
  finish() {
    return this.builder ? this.builder.finish() : null;
  }
};
function repoName(url) {
  if (typeof url !== "string") return void 0;
  const name = url.trim().replace(/[\\/]+$/, "").replace(/\.git$/, "").split(/[\\/:]/).pop();
  return name || void 0;
}
function parseSession(text, fallbackId) {
  const p = new SessionParser(fallbackId);
  for (const line of text.split("\n")) p.line(line);
  return p.finish();
}

// src/lib/analyzer/rules/types.ts
var WORD = "[\\p{L}\\p{N}_]";
var START = `(?<!${WORD})`;
var END = `(?!${WORD})`;
function words(src, flags = "") {
  return new RegExp(src.replace(/\\b(?=[\p{L}([\\])/gu, START).replace(/\\b/g, END), `iu${flags}`);
}
function chars(src, flags = "") {
  return new RegExp(src, `iu${flags}`);
}
var lexicon = (s) => new Set(s.trim().split(/\s+/).map((w) => w.toLowerCase()));

// src/lib/analyzer/rules/ko.ts
var r = String.raw;
var ko = {
  approval: chars(r`^(lgtm|ok(ay)?|오케이|ㅇㅋ|ㅇㅇ|ㄱㄱ|고고|좋아요?|좋습니다|좋네요?|좋은데요?|괜찮아요?|괜찮네요?|괜찮습니다|훌륭해요?|완벽해요?|완벽합니다|잘했어요?|잘했네요?|수고했어요?|응|네|넵|예|그래요?|맞아요?|맞습니다|진행(해|해요|하세요|해 ?줘|해 ?주세요|합시다|하자|시켜)?|계속(해|해요|하세요|해 ?줘|해 ?주세요|진행)?|그대로 (진행|가)|그렇게 해(줘|요|주세요)?|해 ?줘|해 ?주세요|고마워요?|고맙습니다|감사합니다|감사해요|머지(해|해 ?줘)?|커밋(해|해 ?줘)?|푸시(해|해 ?줘)?|배포(해|해 ?줘)?|승인)(?=[\s\p{P}]|$)`),
  question: chars(r`^[^.!?。！？\n]*(왜|어떻게|무엇|무슨|뭐|뭘|어디|언제|어느|누가|누구|몇|인가요|나요|까요|ㄹ까|할까|는지|니\s*[?？]|냐\s*[?？])`),
  request: chars(r`(줄|줘|주실) ?수 ?(있|있어|있나|있을까)|줘[.!,\s]|주세요|하자|합시다|해라|해 ?줄래|해 ?주실래|부탁|하고 ?싶|원해|필요해|해야 ?(해|돼|겠)`),
  // a noun + 하다 verb counts only with its verb ending: 수정 is "an edit", 수정해 줘 is "edit it"
  taskVerb: chars(r`(추가|구현|작성|수정|변경|삭제|제거|이동|마이그레이션|지원|처리|설정|배포|최적화|개선|정리|변환|교체|대체|추출|디버그|디버깅|조사|테스트|분리|병합|연결|표시|렌더링?|허용|방지|검증|파싱|생성|재설계|업그레이드|업데이트|문서화|제한|캐시|로그|저장|정렬|필터링?|그룹화|적용|빌드|해결|리팩터링|리팩토링)(을|를)? ?(좀 ?)?(해|하|시켜)|만들|만드|고쳐|고치|바꿔|바꾸|지워|옮겨|찾아|알아봐|나눠|나누|합쳐|보여 ?줘|보이게|숨겨|막아|줄여|늘려|불러|가져와|내보내|세워|세우|다시 작성`),
  outcome: chars(r`원해|원합니다|하고 ?싶|싶어|싶습니다|필요해|필요합니다|목표|위해서|위해|하도록|되도록|있도록|좋겠|수 ?있게|수 ?있어야|이유는|왜냐하면|때문(에|이)|문제는|하려고|목적은`),
  criteria: [
    ["tests", chars(r`테스트(가|를|는|들이?)? ?(모두|다|전부)? ?(통과|성공|패스|그린)|테스트를? ?(추가|작성|넣어|만들)|테스트 ?케이스|통과할 ?때까지`)],
    ["expect", chars(r`[가-힣]야 ?(해|한다|합니다|돼|된다|됩니다|함)(?![^.!?。！？]*[?？])|예상|기대(값|하는|한)|대신 .{0,20}(보여|반환|표시)`)],
    ["done", chars(r`완료(야|이다|입니다|예요|로 (봐|보|간주|칠게|칩니다))|끝(이야|입니다|난 ?거)|(되|하)면 (완료|끝|성공|된 ?거)|완료 ?(조건|기준)|인수 ?(조건|기준|테스트)|성공 ?(조건|기준)|될 ?때까지`)],
    ["example", chars(r`예를 ?들어|예시|예:|예컨대|가령|->|=>|→`)],
    ["verify", chars(r`확인(해|하고|해 ?줘|해 ?주세요|할 ?것|하세요)|반드시|깨지지 ?않|망가지지 ?않|깨뜨리지 ?않|회귀|(여전히|계속|그대로|기존) ?.{0,10}(동작|작동|통과)|검증(해|하)`)],
    ["limits", chars(r`(최대|최소|적어도|최소한)\s*\d|\d+\s*(이하|이상|미만|초과|이내)|\d+(\.\d+)? ?(ms|초|분|mb|kb|gb|%|px|개|건|줄|자|요청)|(상태|코드|반환|응답)\D{0,4}\d{3}|\d{3}(을|를)? ?(반환|응답|돌려)`)],
    ["edge", chars(r`엣지 ?케이스|예외 ?케이스|경계 ?(조건|값|케이스)|빈 ?(입력|배열|문자열|리스트|값)|null|잘못된 ?(입력|값|날짜)`)]
  ],
  vague: [
    ["deictic-fix", chars(r`(이거|이것|그거|그것|저거|이게|그게|이 ?문제|그 ?문제|이 ?버그|그 ?버그|이 ?에러|그 ?에러|이 ?오류|그 ?오류)(를|을|좀|도)? ?(좀 ?)?(고쳐|고치|수정|해결|처리|봐|확인|다시)`)],
    ["make-it-work", chars(r`(되게|작동하게|동작하게|돌아가게|제대로) ?(해|만들)`)],
    ["still-broken", chars(r`(아직|아직도|여전히|계속) ?(안 ?(돼|되|됨|돌아|고쳐)|안됨|에러|오류|깨져|고장|실패|그대로|똑같|문제|이상)`)],
    ["doesnt-work", chars(r`^\s*(안 ?(돼|되|됨)|작동 ?안|동작 ?안)|(이거|그거|이게|그게)? ?(안 ?(돼|되네|됨|되는데)|작동(하지 ?않| ?안)|동작(하지 ?않| ?안)|깨졌|고장)`)],
    ["try-again", chars(r`^\s*(다시|다시 ?해|다시 ?해 ?봐|다시 ?해 ?줘|재시도|한 ?번 ?더|아니|아니요|아냐|틀렸어|틀려)[\s\p{P}]*$`)],
    ["same-issue", chars(r`(같은|똑같은|동일한) ?(문제|에러|오류|버그|현상)|(문제|에러|오류|버그)(가|는)? ?(여전히|아직|계속)`)],
    ["bare-fix", chars(r`^\s*(제발 ?)?(고쳐|고쳐 ?줘|고쳐 ?주세요|수정해|수정해 ?줘|해결해|해결해 ?줘|제대로 ?해|똑바로 ?해)[\s\p{P}]*$`)]
  ],
  lexicon: lexicon("\uC774\uAC70 \uC774\uAC83 \uADF8\uAC70 \uADF8\uAC83 \uC800\uAC70 \uC774\uAC8C \uADF8\uAC8C \uC774 \uADF8 \uC800 \uC880 \uB2E4\uC2DC \uB610 \uC81C\uBC1C \uADF8\uB0E5 \uC544\uC9C1 \uC544\uC9C1\uB3C4 \uC5EC\uC804\uD788 \uACC4\uC18D \uC548 \uC548\uB3FC \uC548\uB418\uB124 \uC548\uB428 \uC548\uB418\uB294\uB370 \uB3FC \uB418 \uACE0\uCCD0 \uACE0\uCCD0\uC918 \uACE0\uCCD0\uC694 \uACE0\uCCD0\uC8FC\uC138\uC694 \uC218\uC815\uD574 \uC218\uC815\uD574\uC918 \uD574\uACB0\uD574 \uD574\uC918 \uD574 \uBB38\uC81C \uBB38\uC81C\uAC00 \uC5D0\uB7EC \uC5D0\uB7EC\uAC00 \uC624\uB958 \uBC84\uADF8 \uC774\uC0C1\uD574 \uB611\uAC19\uC544 \uAC19\uC740 \uC9C0\uAE08 \uC774\uC81C \uC9C4\uC9DC \uC815\uB9D0 \uC65C \uBB50 \uB124 \uC751 \uC544\uB2C8 \uC544\uB0D0 \uD2C0\uB838\uC5B4 \uD55C \uBC88 \uB354 \uD574\uBD10 \uAE68\uC838 \uACE0\uC7A5"),
  redo: chars(r`^\s*(아니(요|야|오)?|아냐|틀렸|잘못|그게 ?아니|되돌려|원래대로|롤백|취소해|다시 ?해|아직|여전히)|내가 ?(말한|원한|요청한|부탁한) ?(건|것은|거는|게)|(그게|이게) ?아니(라|야|고)|말고[,\s]|(다른|엉뚱한) ?(파일|곳|함수|버튼|컴포넌트|페이지|거)|다시 ?(해|고쳐|시도)|(아직|아직도|여전히|계속) ?(안 ?(돼|되)|깨져|에러|오류|실패|그대로|똑같)|안 ?(돼|되네|됨|되는데)|(같은|똑같은) ?(문제|에러|오류|버그)|되돌려|원래대로|롤백|(놓쳤|빠뜨렸|잊었|망가뜨렸|깨뜨렸|무시했)|(작동|동작) ?안|(작동|동작)하지 ?않`),
  correction: chars(r`^\s*(아니(요|야)?[,.! ]|내가 ?(말한|원한|요청한) ?(건|것은|거는|게)|아냐|틀렸|잘못(됐|되었|했)|그게 ?아니|멈춰|그만|중지|되돌려|취소|왜 .{0,10}(했|한 ?거)|하지 ?마|(놓쳤|빠뜨렸|잊었|망가뜨렸)|(아직|아직도|여전히) ?(안|깨져|에러|오류|실패)|잠깐[,.! ])|되돌려|원래대로 ?(돌려|해)|롤백해`),
  direction: chars(r`다시 ?생각해 ?보니|생각해 ?보니|생각이 ?바뀌|마음이 ?바뀌|계획 ?변경|대신(에)? .{0,30}(하자|쓰자|사용하자|가자|합시다)|차라리 .{0,30}(하자|쓰자|합시다)|하는 ?게 ?(낫|좋)겠|방향을 ?바꾸|새 ?요구 ?사항|하기로 ?했`),
  also: chars(r`^\s*(그리고|또(한)?|추가로|그 ?다음|다음으로|이제|그럼 ?이제|좋아,? ?이제|하나 ?더)`),
  revert: chars(r`되돌려|되돌리|원래대로|롤백|취소해|실행 ?취소`),
  wrongTarget: chars(r`말고[,\s]|(다른|엉뚱한|잘못된) ?(파일|곳|함수|버튼|컴포넌트|페이지|부분)|내 ?말은|내가 ?말한 ?건|그게 ?아니라`),
  errorText: chars(r`에러|오류|예외|크래시|실패|안 ?(돼|되네|됨)|작동 ?안|동작 ?안|깨져|500|undefined|not defined`),
  done: chars(r`[가-힣]야 ?(해|하|돼|되|겠|할|한|합)|반드시|확인|보장|기대|예상|인수|검증(해|하)|테스트(가|를)? ?(통과|성공)|하도록|되도록|있도록|(되|하)면 (완료|끝)|완료 ?(조건|기준)|요구 ?사항|엣지 ?케이스|제약|깨지지 ?않`),
  plan: chars(r`계획|설계|아키텍처|접근 ?방식|단계별|코드(를)? ?(짜기|작성하기|쓰기) ?전에|구현(하기)? ?전에|시작하기 ?전에|개요|플랜`),
  polite: chars(r`부탁(해|드려|합니다|드립니다|해요)|감사(합니다|해요|드려요|드립니다)|고마워(요)?|고맙습니다|땡큐|ㄳ|ㄱㅅ`, "g"),
  praise: chars(r`잘했(어|어요|네|다)|수고했|최고(야|예요|다)|훌륭(해|하네|합니다)|완벽(해|하네|합니다)|멋져`, "g"),
  profanity: chars(r`씨발|시발|ㅅㅂ|좆|존나|졸라|개새끼|병신|ㅂㅅ|젠장|빌어먹을|썅`, "g"),
  hostile: chars(r`바보|멍청|한심|쓸모 ?없|짜증 ?나|몇 ?번(이나|을|째)|내가 ?(이미|분명히|아까) ?(말했|얘기했)|장난(해|하냐|치냐)|미쳤`, "g"),
  wordScale: 1.35
};

// src/lib/analyzer/rules/zh.ts
var r2 = String.raw;
var END2 = r2`(?=[\s\p{P}]|$)`;
var zh = {
  approval: chars(r2`^(lgtm|ok(ay)?|好的|好啊|好吧|可以(的|了|啊)?|没问题|沒問題|[继繼][续續](吧|做|执行|執行|进行|進行)?|[开開]始吧|就[这這]样|就[这這]麼?[办辦做]|按[这這]个来|按這個來|看起[来來](不[错錯]|很好|没问题|沒問題)|不[错錯]|很好|挺好|完美|太好了|[谢謝][谢謝]|感[谢謝]|多[谢謝]|嗯+|同意|批准|没[错錯]|沒[错錯]|提交吧|合并吧|合併吧|部署吧|推送吧|发布吧|發布吧|搞定|干吧|幹吧|做吧|去吧|冲|衝|干得好|幹得好|做得好|(好|行|是|是的|对|對|嗯|提交|合并|合併|部署|推送)${END2})`),
  question: chars(r2`^[^。.!！?？\n，,：:]*(为什么|為什麼|为啥|為啥|怎么|怎麼|如何|什么|什麼|哪|谁|誰|是否|吗|嗎|呢|几|幾|多少|多久)`),
  request: chars(r2`(能|可以|可不可以|能不能|能否)(帮我|幫我|帮忙|幫忙)?.{0,4}(加|添加|新增|做|改|修|删|刪|写|寫|实现|實現|创建|創建|建立|更新|移除|弄)|[请請](?!求)|帮我|幫我|我想|我要|我需要|我[们們]需要|[让讓]我[们們]`),
  taskVerb: chars(r2`(?<![的了])(添加|新增|加上|加[个個]|加一[个個]|[实實][现現]|[构構]建|[创創]建|建立|编写|編寫|写一?[个個下]|寫一?[個下]|修复|修復|修正|修好|修改|修一下|改成|改[为為]|改一下|[换換]成|重构|重構|重命名|改名|[删刪]除|移除|去掉|去除|更新|升[级級]|迁移|遷移|支持|支援|[处處]理|[设設]置|配置|部署|[优優]化|改[进進]|改善|清理|[转轉][换換]|替[换換]|提取|抽取|[调調][试試]|排查|[调調]查|查一下|找出|[测測][试試]一下|拆分|合并|合併|接入|[显顯]示|[隐隱]藏|渲染|允[许許]|阻止|防止|校[验驗]|[验驗][证證]|解析|生成|重新[设設][计計]|重写|重寫|加快|减少|減少|增加|限制|[缓緩]存|[记記][录錄]|[发發]送|存[储儲]|加[载載]|[获獲]取|排序|[过過]滤|分[组組]|居中|[对對]齐|[对對]齊|导出|導出|解决|解決|做一?[个個])`),
  outcome: chars(r2`我想|我要|我希望|希望|我[们們](想|要|需要|希望)|我需要|目[标標]|[为為]了|以便|使得|[这這][样樣].{0,8}(就)?(能|可以)|(用户|用戶|使用者|客户|客戶|[访訪]客|大家)(能|可以|需要|想|应该|應該)|能[够夠]|目的是|原因是|因[为為]|[问問][题題]是|用途|[为為]的是`),
  criteria: [
    ["tests", chars(r2`[测測][试試](用例)?(要|必须|必須|应该|應該|都|全部)?(通[过過]|跑通|全[过過]|[变變][绿綠])|(添加|加上?|写|寫|编写|編寫|补|補)(一些|几[个個]|幾個|[个個]|单元|單元|集成)?[测測][试試]|直到[测測][试試]`)],
    ["expect", chars(r2`(应该|應該|应当|應當|必须|必須|需要|要)被?(返回|输出|輸出|[显顯]示|等于|等於|是|包含|包括|有|通[过過]|拒[绝絕]|抛出|拋出|失[败敗]|能|可以|保持)|期望|预期|預期|[结結]果(应该|應該|是|要)|而不是.{0,20}(返回|[显顯]示)`)],
    ["done", chars(r2`(就|才)算(完成|[结結]束|好了|[对對]了|成功)|完成的?(标准|標準|条件|條件|定[义義])|[验驗]收(标准|標準|条件|條件|[测測][试試])|成功的?(标准|標準)|直到(它)?(能|可以)?(工作|跑通|正常)|[这這][样樣]就(算)?(完成|好了)`)],
    ["example", chars(r2`例如|比如|[举舉][个個]例子|[举舉]例|示例|例子|->|=>|→`)],
    ["verify", chars(r2`确保|確保|确认|確認|[验驗][证證]|[检檢]查(一下)?(是否|有没有|有沒有)|不要(破坏|破壞|弄坏|弄壞)|不能(破坏|破壞)|[别別](破坏|破壞)|不影响|不影響|回[归歸]|(仍然|依然|还|還)(能|可以)?(工作|通[过過]|正常)`)],
    ["limits", chars(r2`(最多|最少|至少|不超[过過]|不少于|不少於|少于|少於|小于|小於|大于|大於|超[过過]|以[内內]|低于|低於|高于|高於)\s*\d|\d+\s*(以[内內]|以下|以上)|\d+(\.\d+)?\s?(ms|毫秒|秒|分[钟鐘]|mb|kb|gb|%|px|[个個]|条|條|行|字符|[请請]求)|(返回|状态|狀態|状态码|狀態碼)\s*\d{3}`)],
    ["edge", chars(r2`[边邊]界(情况|情況|条件|條件|值)?|[边邊]缘情况|邊緣情況|特殊情况|特殊情況|空(输入|輸入|数组|數組|字符串|列表|值)|null|无效|無效|非法(输入|輸入)?`)]
  ],
  vague: [
    ["deictic-fix", chars(r2`(修|改|[处處]理|解决|解決|看|弄|搞|[检檢]查)(一下|好|掉)?(这|這|那)(个|個|些|里|裡)?(问题|問題|bug|错误|錯誤|东西|東西)?|(把|将|將)(这|這|那)(个|個)?(问题|問題|bug|错误|錯誤)?(修|改|解决|解決|[处處]理|弄)(一下|好|掉)?`)],
    ["make-it-work", chars(r2`[让讓](它|这|這|那)(个|個)?(能)?(工作|跑起来|跑起來|运行|運行|正常|好用|生效)|弄好|搞好|搞定它`)],
    ["still-broken", chars(r2`(还是|還是|仍然|依然|依旧|依舊)(不行|不能用|没用|沒用|坏|壞|有[问問][题題]|[报報][错錯]|出[错錯]|失[败敗]|一样|一樣|没[好修]|沒[好修]|不[对對]|[错錯])|^\s*[还還](不行|是不行|[报報][错錯]|坏|壞)`)],
    ["doesnt-work", chars(r2`^\s*(不行|没用|沒用|不工作|不能用|没反应|沒反應)|(它|这|這|那)(个|個)?(还|還|仍然)?(不行|不工作|不能用|没用|沒用|跑不起来|跑不起來|坏了|壞了|[错錯]了)`)],
    ["try-again", chars(r2`^\s*(再[试試](一次|一下)?|重[试試]|重新(来|來|做|[试試])|再来(一次)?|再來(一次)?|不[对對]|[错錯]了|不是)[\s\p{P}]*$`)],
    ["same-issue", chars(r2`(同样|同樣|一样|一樣|相同)的?(问题|問題|错误|錯誤|bug|情况|情況)|(问题|問題|错误|錯誤|bug)(还在|還在|依然|仍然|依旧|依舊)`)],
    ["bare-fix", chars(r2`^\s*([请請])?(修复|修復|修一下|修好|改一下|弄好|搞定)(一下|它|吧)?[\s\p{P}]*$`)]
  ],
  lexicon: lexicon("\u8FD9 \u9019 \u90A3 \u8FD9\u4E2A \u9019\u500B \u90A3\u4E2A \u90A3\u500B \u5B83 \u8FD8\u662F \u9084\u662F \u8FD8 \u9084 \u662F \u4E0D \u4E0D\u884C \u6CA1\u7528 \u6C92\u7528 \u53C8 \u518D \u4E00\u6B21 \u4E00\u4E0B \u4FEE \u4FEE\u590D \u4FEE\u5FA9 \u4FEE\u597D \u6539 \u95EE\u9898 \u554F\u984C \u9519\u8BEF \u932F\u8AA4 bug \u574F \u58DE \u4E86 \u5427 \u554A \u5462 \u5417 \u55CE \u7684 \u6211 \u4F60 \u8BF7 \u8ACB \u5E2E \u5E6B \u5E2E\u6211 \u5E6B\u6211 \u597D \u80FD \u53EF\u4EE5 \u73B0\u5728 \u73FE\u5728 \u4E00\u6837 \u4E00\u6A23 \u4ECD\u7136 \u4F9D\u7136 \u4E1C\u897F \u6771\u897F \u5F04 \u641E \u4E0B \u4E2A \u500B \u8BD5 \u8A66 \u91CD\u65B0 \u5BF9 \u5C0D \u9519 \u932F"),
  redo: chars(r2`^\s*(不[对對]|[错錯]了|不是[这這那]|不要|[别別]|撤[销銷]|[还還]原|回[滚滾]|等等|等一下)|我(说|說)的是|我的意思是|不是我(要|想要|说|說)的|你(弄坏|弄壞|漏了|忘了|没有|沒有)|(另一[个個]|[错錯]的|别的|別的)(文件|檔案|地方|函数|函數|按钮|按鈕|组件|組件|页面|頁面)|不是(那|这|這)[个個]|再[试試]|重新(来|來|做|[试試])|(还是|還是|仍然|依然)(不|没|沒|有[问問][题題]|[报報][错錯]|失[败敗]|一样|一樣|坏|壞)|^\s*[还還](不行|是不行|[报報][错錯]|坏|壞)|(不|没|沒)(起作用|生效|好使)|不工作|不能用|没用|沒用|^\s*不行|(同样|同樣|一样|一樣)的(问题|問題|错误|錯誤|bug)|撤[销銷]|[还還]原|回[滚滾]|改回(去|来|來)|恢复|恢復`),
  correction: chars(r2`^\s*(不[,，.。! ！]|我的意思不是|我(说|說)的不是|不是我(要|想要)的|不[对對]|[错錯]了|[错錯]的|停(下|止)?[,，.。! ！]|等等|等一下|撤[销銷]|[还還]原|回[滚滾]|你(为什么|為什麼)|为什么你|為什麼你|不要|[别別]|你(弄坏|弄壞|漏了|忘了)|(还是|還是|仍然|依然)(不行|坏|壞|[报報][错錯]|失[败敗]|不)|[还還](不行|[报報][错錯]|坏|壞))|(把|将|將).{0,20}(撤[销銷]|[还還]原|改回)|撤[销銷](那|这|這|刚才|剛才|掉)`),
  direction: chars(r2`再想想|仔[细細]想想|想了想|改主意|改[变變]主意|[换換][个個]方案|[计計][划劃]有[变變]|[还還]是(用|改用|[换換]成)|不如|算了.{0,10}(用|改)|新的?需求|我决定|我決定|[换換]成.{0,10}吧`),
  also: chars(r2`^\s*(另外|[还還]有|并且|並且|同[时時]|然后|然後|接下[来來]|[现現]在|好的?[,，]?\s*[现現]在|好[,，]?\s*接下[来來]|[还還]要|[顺順]便|也)`),
  revert: chars(r2`撤[销銷]|[还還]原|回[滚滾]|改回|恢复|恢復|回到(之前|原[来來])`),
  wrongTarget: chars(r2`不是(那|这|這)(个|個)|(另一[个個]|[错錯]的|别的|別的)(文件|檔案|地方|函数|函數|按钮|按鈕|组件|組件|页面|頁面)|我(说|說)的是|我的意思是|我指的是|不是我(要|想要|说|說)的`),
  errorText: chars(r2`[报報][错錯]|[错錯]误|錯誤|异常|異常|崩[溃潰]|失[败敗]|不行|不工作|500|undefined|not defined|找不到`),
  done: chars(r2`应该|應該|应当|應當|必须|必須|确保|確保|[验驗]收|期望|预期|預期|[验驗][证證]|[测測][试試](要|需要)?通[过過]|以便|使得|[这這][样樣].{0,8}(就)?(能|可以)|需求|[边邊]界情[况況]|约束|約束|不(要)?破坏|不(要)?破壞|算完成|才算|完成(标准|標準|条件|條件)`),
  plan: chars(r2`[计計][划劃畫]|方案|[设設][计計]|架构|架構|思路|步[骤驟]|先[别別](写|寫)代[码碼]|先不要(写|寫)|(写|寫)代[码碼]之前|[动動]手之前|[开開]始之前|[实實][现現]之前|大[纲綱]`),
  polite: chars(r2`[请請](?!求)|麻[烦煩]|[谢謝][谢謝]|感[谢謝]|多[谢謝]|辛苦了`, "g"),
  praise: chars(r2`[干幹]得好|做得好|做得不[错錯]|太棒了|很棒|真棒|厉害|厲害|好[样樣]的`, "g"),
  profanity: chars(r2`他[妈媽]的|[妈媽]的|操(?![作心场場控纵縱练練])|卧槽|臥槽|我靠|草泥[马馬]|傻逼|傻b|tmd|尼[玛瑪]|[该該]死`, "g"),
  hostile: chars(r2`白[痴癡]|笨蛋|蠢|弱智|垃圾(?![回收集桶箱])|[废廢]物|你(是不是)?(傻|疯|瘋)|我(已[经經])?([说說])[过過](多少|几|幾)?(次|遍)|[说說]了(多少|几|幾)(次|遍)|搞什[么麼]|[开開]什[么麼]玩笑`, "g"),
  wordScale: 1.05
};

// src/lib/analyzer/rules/ja.ts
var r3 = String.raw;
var ja = {
  approval: chars(r3`^(lgtm|ok(ay)?|オッケー|オーケー|おけ|いいね|いいです(ね|よ)?|いい(よ|と思う|感じ)|良い(です)?|良さそう(です)?|よし|はい|うん|ええ|了解(です|しました)?|承知(しました)?|お願いします|お願い|進めて(ください)?|続けて(ください)?|続行(して)?|それで(お願いします|いい|いこう|進めて)|大丈夫(です)?|完璧(です)?|素晴らしい|ありがとう(ございます)?|どうも|マージ(して)?|コミット(して)?|プッシュ(して)?|デプロイ(して)?|ゴー|やって(ください)?|問題(ない|ありません)|ばっちり|よくやった|お疲れ様)`),
  question: chars(r3`^[^。.!！?？\n、,：:]*(なぜ|何故|どうして|どう|どうやって|何|なに|なん|どこ|いつ|どれ|どの|誰|だれ|ですか|ますか|でしょうか|のか|かな)`),
  request: chars(r3`(て|で)(くれ|もら|いただ)(ます|ませ|る|え)|てくれる|てくれない|ください|下さい|お願い|てほしい|て欲しい|したい|しよう|しましょう`),
  taskVerb: chars(r3`追加|実装|作成|作って|作る|作り|書いて|書く|修正|直して|直す|直し|変更|変えて|変える|置き換え|削除|消して|除去|リファクタ|名前を変え|リネーム|移動|移行|マイグレ|対応|サポート|処理|設定|セットアップ|デプロイ|最適化|改善|整理|クリーンアップ|変換|移植|抽出|デバッグ|調査|調べ|テストして|分割|分けて|統合|接続|表示|隠して|非表示|描画|レンダリング|許可|防いで|防止|検証|パース|解析|生成|再設計|書き直|アップグレード|ドキュメント|高速化|減らし|増やし|制限|キャッシュ|ログ|送信|保存|読み込|取得|ソート|並べ替え|フィルタ|グループ化|揃え|立てて|更新|エクスポート|出力して|加えて|足して|解決`),
  outcome: chars(r3`したい|てほしい|て欲しい|ように(する|して|なる|したい)|できるよう|目的|目標|ために|なぜなら|理由は|問題は|というのも|からです|ので|(ユーザー|利用者|お客様|みんな)(が|は)?.{0,10}(できる|したい|必要)`),
  criteria: [
    ["tests", chars(r3`テスト(が|を|は)?(全部|すべて|全て)?(通る|通って|通れ|パス|成功|グリーン)|テストを(追加|書い|書く|作)|テストケース|テストが通るまで`)],
    ["expect", chars(r3`(返す|返し|返却|出力|表示|含む|含め|含まれ|等し|一致|なる|なって|拒否|失敗|通る|保つ|する|ある|であ)(べき(?!ですか|か|でしょうか)|ように)|べき(?!ですか|か|でしょうか)|必要があ|なければ(なら|いけ)|でなければ|期待|予想|はず|代わりに.{0,20}(表示|返)`)],
    ["done", chars(r3`完了(です|とする|と(み|見)な|の条件|条件)|(なったら|したら|すれば|できたら|通ったら)(完了|終わり|ok|オッケー|成功|完成)|完成の?(条件|基準|定義)|受け入れ(条件|基準|テスト)|成功の?(条件|基準)`)],
    ["example", chars(r3`例えば|たとえば|例：|例:|例として|->|=>|→`)],
    ["verify", chars(r3`確認して|確かめ|確実に|必ず|検証(して|する)|壊さない|壊れない|壊さず|デグレ|リグレッション|(引き続き|まだ|ちゃんと)(動く|動作|通る|パス)`)],
    ["limits", chars(r3`(最大|最小|最低|少なくとも)\s*\d|\d+\s*(以下|以上|未満|以内|を超え)|\d+(\.\d+)?\s?(ms|ミリ秒|秒|分|mb|kb|gb|%|px|件|個|行|文字|リクエスト)|(ステータス|返す|返し)\s*\d{3}|\d{3}\s*を返`)],
    ["edge", chars(r3`エッジケース|境界(値|条件|ケース)?|コーナーケース|空の?(入力|配列|文字列|リスト)|null|不正な(入力|値|日付)|無効な(入力|値)`)]
  ],
  vague: [
    ["deictic-fix", chars(r3`(これ|それ|あれ|この(問題|バグ|エラー)|その(問題|バグ|エラー))(を|も)?(直して|修正して|直す|なんとかして|対応して|見て|確認して|やり直して)`)],
    ["make-it-work", chars(r3`(動く|動作する|ちゃんと動く|うまくいく)ように(して|する)`)],
    ["still-broken", chars(r3`(まだ|相変わらず|依然として?)(壊れ|動かない|動いてない|動作しない|ダメ|だめ|直って(い)?ない|エラー|失敗|同じ|おかしい|変わってない)`)],
    ["doesnt-work", chars(r3`^\s*(動かない|ダメ|だめ|うまくいかない|動いてない)|(これ|それ|あれ)(が|は)?(まだ)?(動かない|動作しない|動いてない|壊れ|ダメ|だめ|うまくいかない)`)],
    ["try-again", chars(r3`^\s*(もう一度|もう一回|もう1回|やり直して|やり直し|再試行|リトライ|違う|ちがう|いいえ)[\s\p{P}]*$`)],
    ["same-issue", chars(r3`(同じ|同様の)(問題|エラー|バグ|現象)|(問題|エラー|バグ)が(まだ|続い|残っ)`)],
    ["bare-fix", chars(r3`^\s*(直して|修正して|直してください|修正してください|ちゃんとやって|なんとかして)[\s\p{P}]*$`)]
  ],
  lexicon: lexicon("\u3053\u308C \u305D\u308C \u3042\u308C \u3053\u306E \u305D\u306E \u307E\u3060 \u3082\u3046 \u4E00\u5EA6 \u4E00\u56DE \u307E\u305F \u76F4\u3057 \u76F4\u3057\u3066 \u76F4\u3059 \u3066 \u4FEE\u6B63 \u3057 \u3057\u3066 \u304F\u3060\u3055\u3044 \u304A\u9858\u3044 \u52D5\u304B \u52D5\u3044 \u306A\u3044 \u3066\u306A\u3044 \u30C0\u30E1 \u3060\u3081 \u30A8\u30E9\u30FC \u554F\u984C \u30D0\u30B0 \u304C \u306F \u3092 \u3082 \u306B \u306E \u3067\u3059 \u307E\u3059 \u3088 \u306D \u304B \u540C\u3058 \u3084\u308A \u4ECA \u3061\u3083\u3093\u3068 \u306A\u3093\u3068\u304B \u58CA\u308C \u3066\u308B \u58CA\u308C\u3066\u308B \u3044\u308B \u305F"),
  redo: chars(r3`^\s*(いいえ|いや|違う|違い|ちがう|そうじゃない|そうではない|間違|元に戻し|戻して|取り消し|やめて|待って|ちょっと待って)|私が(言った|頼んだ|欲しかった)のは|(言った|頼んだ)のと違|そうじゃなく|じゃなくて|(別の|違う)(ファイル|場所|関数|ボタン|コンポーネント|ページ|ところ|やつ)|もう一度|やり直|(まだ|相変わらず)(壊れ|動かない|動いてない|ダメ|だめ|エラー|失敗|直って|同じ|おかしい)|意味じゃない|意味ではない|動かない|動いてない|直ってない|効いてない|同じ(問題|エラー|バグ)|元に戻|取り消|(忘れ|見落と|壊し|無視し)て(る|い)`),
  correction: chars(r3`^\s*(いいえ|そういう意味じゃない|そういう意味ではない|いや[、,。 ]|違う|違います|ちがう|間違|そうじゃない|止めて|やめて|ストップ|待って|ちょっと待って|元に戻|取り消|なぜ.{0,10}(した|たの)|しないで|(まだ|相変わらず)(壊れ|動かない|動いてない|ダメ|エラー|失敗))|元に戻して|取り消して`),
  direction: chars(r3`やっぱり|考え直|気が変わ|方針を変え|計画変更|代わりに.{0,20}(しよう|使おう|にしよう|しましょう|使いましょう)|にしましょう|にしよう|新しい要件|ことにしました|決めました`),
  also: chars(r3`^\s*(あと|それと|それから|また|さらに|加えて|次に|次は|では|じゃあ|今度は|よし[、,]?\s*次|ついでに|もう一つ)`),
  revert: chars(r3`元に戻|戻して|取り消|ロールバック|リバート`),
  wrongTarget: chars(r3`(それ|これ|その|この)(ファイル|関数)?じゃなくて|(別の|違う|間違った)(ファイル|場所|関数|ボタン|コンポーネント|ページ|ところ|もの|やつ)|私が言ったのは|言いたいのは|意図したのは|そうじゃなくて`),
  errorText: chars(r3`エラー|例外|クラッシュ|落ち(る|た)|失敗|動かない|動作しない|500|undefined|not defined|見つからない`),
  done: chars(r3`べき|必要があ|なければ|必ず|確実に|確認|保証|期待|予想|受け入れ|条件|検証(して|する)|テストが(通|パス)|ように|要件|エッジケース|制約|壊さない|完了(とする|の条件)`),
  plan: chars(r3`計画|プラン|設計|アーキテクチャ|方針|アプローチ|手順|段取り|ステップ|コードを書く前に|実装(する)?前に|始める前に|着手する前に|アウトライン|概要`),
  polite: chars(r3`お願い(します|いたします)?|ありがとう|感謝|助かり|恐れ入り`, "g"),
  praise: chars(r3`よくやった|よくできました|お疲れ様|おつかれ|素晴らしい|すばらしい|完璧|最高|さすが|ナイス`, "g"),
  profanity: chars(r3`くそ|クソ|糞|ちくしょう|畜生|くたばれ|ふざけんな|ふざけるな|死ね`, "g"),
  hostile: chars(r3`バカ|ばか|馬鹿|アホ|あほ|役立たず|使えない|無能|ポンコツ|何度(も)?言|何回言|いい加減にし|話にならない`, "g"),
  wordScale: 0.75
};

// src/lib/analyzer/rules/es.ts
var r4 = String.raw;
var es = {
  approval: words(r4`^[¡]?(ok(ay|ey)?|vale|va|dale|sí|si|claro|perfecto|genial|bien|muy bien|excelente|gracias|muchas gracias|listo|de acuerdo|adelante|(sigue|siga|continúa|continua)(?=[\s\p{P}]*$|,)|procede|hazlo|aprobado|aprobada|correcto|exacto|eso es|me parece bien|se ve bien|luce bien|todo bien|buen trabajo|bien hecho|lgtm|mergea|haz (el )?merge|haz (el )?commit|commitea|despliega|súbelo|publícalo)\b`),
  question: words(r4`^\s*[¿]?\s*(por qué|porqué|cómo|qué|dónde|cuándo|cuál|cuáles|quién|quiénes|es|son|está|están|hay|puede|puedo|debería|tiene|existe|como|que|donde|cuando)\b`),
  request: words(r4`\b(puedes|podrías|podrias|puede|podría|podria) (por favor )?(también )?\p{L}+|\b(por favor|quiero|quisiera|necesito|necesitamos|vamos a|hagamos)\b`),
  taskVerb: words(r4`\b(añade|añada|añadir|agrega|agregue|agregar|implementa|implemente|implementar|construye|crea|cree|crear|escribe|escriba|escribir|arregla|arregle|arreglar|arréglalo|corrige|corrija|corregir|refactoriza|renombra|elimina|elimine|eliminar|borra|quita|actualiza|actualice|cambia|cambie|cambiar|haz|haga|hacer|mueve|migra|soporta|maneja|configura|despliega|optimiza|mejora|limpia|convierte|reemplaza|sustituye|extrae|depura|investiga|revisa|averigua|prueba|divide|fusiona|conecta|muestra|mostrar|oculta|renderiza|permite|evita|valida|parsea|genera|rediseña|reescribe|documenta|acelera|reduce|aumenta|limita|cachea|registra|envía|guarda|carga|ordena|filtra|agrupa|centra|alinea|exporta|exportar|soluciona|resuelve)\b`),
  outcome: words(r4`\b(quiero|quisiera|queremos|necesito|necesitamos|el objetivo|la meta|para que|con el fin de|de modo que|de forma que|así (los usuarios|la gente|podemos|puedo)|(los )?usuarios (puedan|pueden|deberían|necesitan|quieren)|porque|ya que|el problema es|estoy intentando|el propósito|la idea es)\b`),
  criteria: [
    ["tests", words(r4`\b(los )?(tests?|pruebas?)( unitarias| de integración)? (deben |tienen que |deberían )?(pasar|pasen|en verde)\b|\bhasta que (pasen )?(los )?(tests?|pruebas?)|\b(añade|agrega|escribe|incluye|con) (unos? |algunas? |unas? )?(tests?|pruebas?)\b|\bque (pasen|sigan pasando) (los )?(tests?|pruebas?)\b`)],
    ["expect", words(r4`\bdeb(e|en|ería|erían|eria|erian) (devolver|retornar|mostrar|ser|incluir|contener|tener|aceptar|rechazar|lanzar|fallar|pasar|permitir|bloquear|funcionar|seguir|quedar|igualar)\b|\bdebe .{1,30} (devolver|retornar|mostrar|incluir|ser)\b|\btiene que (devolver|ser|incluir|tener|mostrar|funcionar)\b|\besperad[oa]s?\b|\bse espera\b|\bigual a \d|\ben (vez|lugar) de\b.{0,40}\b(mostrar|devolver)`)],
    ["done", words(r4`\b(está|estará) (listo|terminado|hecho) cuando\b|\b(listo|terminado) cuando\b|\bcriterios? de aceptación\b|\bdefinición de (hecho|terminado)\b|\bprueba de aceptación\b|\bhasta que funcione\b`)],
    ["example", words(r4`\b(por ejemplo|p\. ?ej\.|ejemplo:|tal como)|(->|=>|→)\s*\S`)],
    ["verify", words(r4`\b(asegúrate|asegurate|asegura que|verifica|comprueba|confirma que|revisa que|sin romper|no rompas|sin regresiones|sigan? funcionando|sigan? pasando)\b`)],
    ["limits", words(r4`\b(como máximo|como mínimo|al menos|no más de|menos de|más de|máximo|mínimo|por debajo de|por encima de|dentro de)\s+\d|\b\d+(\.\d+)?\s?(ms|s|seg|segundos|minutos|mb|kb|gb|%|px|peticiones|solicitudes|requests|filas|caracteres|líneas)\b|\b(devuelve|devolver|responde con|retorna|estado|código)\s+\d{3}\b`)],
    ["edge", words(r4`\bcasos? (límite|borde|extremos?)\b|\b(entrada|lista|cadena|array) vací[ao]\b|\bvalores? nulos?\b|\b(entrada|fecha|valor)(es)? inválid[ao]s?\b`)]
  ],
  vague: [
    ["deictic-fix", words(r4`\b(arréglalo|arreglalo|corrígelo|corrigelo|soluciónalo|(arregla|corrige|soluciona|resuelve|revisa|mira|cambia|mejora) (esto|eso|el (problema|error|bug)|la cosa))\b`)],
    ["make-it-work", words(r4`\b(haz que funcione|hazlo funcionar|que funcione)\b`)],
    ["still-broken", words(r4`\b(sigue|todavía|aún|aun) (roto|sin funcionar|fallando|mal|igual|sin arreglar|no funciona|sin andar|dando error|con el (mismo )?error)\b|^\s*todavía\W*$`)],
    ["doesnt-work", words(r4`\bno (funciona|anda|sirve|carga|corre)\b|\b(está|esta) (roto|mal)\b`)],
    ["try-again", words(r4`^\s*(otra vez|de nuevo|inténtalo de nuevo|intenta de nuevo|inténtalo otra vez|vuelve a intentarlo|reintenta|una vez más|no|nop|mal|incorrecto)[\s\p{P}]*$`)],
    ["same-issue", words(r4`\b(el )?mismo (problema|error|fallo|bug)\b|\b(el )?(problema|error) (persiste|sigue)\b`)],
    ["bare-fix", words(r4`^\s*(por favor\s+)?(arréglalo|arreglalo|arregla|corrígelo|corrige|haz que funcione|hazlo bien)( por favor)?[\s\p{P}]*$`)]
  ],
  lexicon: lexicon("esto eso esta este ese esa lo la el los las un una cosa cosas problema problemas error errores bug fallo arregla arr\xE9glalo arreglalo corrige corr\xEDgelo haz hazlo que funcione funciona no sigue todav\xEDa a\xFAn aun otra vez de nuevo por favor ya ahora bien mal roto igual mismo s\xED y pero es est\xE1 esta hay se me te mi tu puedes intenta int\xE9ntalo vuelve a"),
  redo: words(r4`^\s*(no\b|nop\b|mal\b|incorrecto|deshaz|revierte|eso no|esto no|no es (eso|así)|está mal|todavía|aún|espera,? no)|\b(quise decir|me refería|te pedí|lo que pedí)\b|\bno es lo que (quería|pedí|dije)\b|\b(rompiste|olvidaste|te olvidaste|ignoraste|no hiciste)\b|\b(el otro|la otra|archivo equivocado|lugar equivocado)\b|\b(ese|esa|este|esta) (archivo|función|botón|componente|página) no\b|\b(inténtalo|intenta|hazlo) (de nuevo|otra vez)\b|\b(sigue|todavía|aún) (roto|fallando|sin funcionar|mal|igual|no)\b|\bno (funciona|sirve|cambió|arregló|ayudó)\b|\bmismo (problema|error|fallo)\b|\b(deshaz|revierte)\b|\bdéjalo como estaba\b`),
  correction: words(r4`^\s*(no[,.!]|no (es eso|es así|así)\b|nop\b|mal\b|incorrecto|eso no|esto no|no es (eso|así)|está mal|en realidad[, ]|detente|para\b|deshaz|revierte|por qué (hiciste|has)|no (hagas|cambies|toques)|(rompiste|olvidaste|no hiciste)|(sigue|todavía|aún) (roto|fallando|sin funcionar|no)|espera[,.! ])`),
  direction: words(r4`\b(pensándolo bien|pensandolo bien|cambié de opinión|cambio de planes|mejor (usemos|hagamos|vamos)|en (vez|lugar) de eso,? (usemos|hagamos)|nuevo requisito|he decidido|decidí|prefiero)\b`),
  also: words(r4`^\s*\p{L}+ (también|además)\b|^\s*(también|además|ahora|luego|después|y también|ok,? ahora|bien,? ahora|vale,? ahora|genial,? ahora|otra cosa|una cosa más|puedes también)\b`),
  revert: words(r4`\b(deshaz|deshacer|revierte|revertir|vuelve atrás|déjalo como estaba|vuelve a como estaba|restaura)\b`),
  wrongTarget: words(r4`\b(ese|esa|este|esta) (archivo|función|botón|componente|página) no\b|\b(archivo|lugar|botón|componente|página|función) equivocad[oa]\b|\b(el otro|la otra)\b|\b(quise decir|me refería)\b|\bno es lo que (quería|pedí|dije)\b`),
  errorText: words(r4`\b(error|excepción|falla|falló|fallando|crashea|se cae|no funciona|roto|500|undefined)\b`),
  done: words(r4`\b(debe|debería|deberían|deben|debemos|deberíamos|tiene que|tienen que|asegúrate|asegura|verifica|esperad[oa]|se espera|criterios?|aceptación|requisito|para que|caso límite|restricción|sin romper|listo cuando)\b`),
  plan: words(r4`\b(plan|planifica|esquema|diseño|diseña|arquitectura|enfoque|paso a paso|antes de (escribir|programar|codificar|empezar|implementar))\b`),
  polite: words(r4`\b(por favor|porfa|porfavor|gracias|te lo agradezco)\b`, "g"),
  praise: words(r4`\b(buen trabajo|bien hecho|excelente trabajo|eres (el mejor|genial|increíble)|me encanta)\b`, "g"),
  profanity: words(r4`\b(mierda|joder|coño|carajo|puta|puto|hostia|cabrón|pinche|chingad\p{L}*|verga)\b`, "g"),
  hostile: words(r4`\b(idiota|estúpid[oa]|inútil|imbécil|ya te (lo )?dije|cuántas veces|por última vez|me estás tomando el pelo)\b`, "g"),
  // a sentence-initial "no" before a word is plain negation ("no funciona"), not English's "no, …"
  falseFriends: words(r4`^\s*no(?=\s+\p{L})`),
  wordScale: 1
};

// src/lib/analyzer/rules/pt.ts
var r5 = String.raw;
var pt = {
  approval: words(r5`^(ok(ay)?|beleza|blz|valeu|vlw|show|sim|claro|perfeito|ótimo|otimo|boa|bom|legal|top|massa|obrigad[oa]|pode (ir|seguir|continuar|mandar|fazer)|pode|(segue|siga|continua|continue)(?=[\s\p{P}]*$|,)|manda (ver|bala)|vai|faz|faça|aprovado|correto|exato|isso( aí)?|parece (bom|ótimo|certo)|tá bom|ta bom|está bom|tudo certo|bom trabalho|mandou bem|lgtm|faz o merge|commita|faz o deploy|sobe)\b`),
  question: words(r5`^\s*(por que|porque|por quê|como|o que|que|onde|quando|qual|quais|quem|é|são|está|tem|há|pode|posso|deveria|existe)\b`),
  request: words(r5`\b(pode|podes|poderia|consegue|você pode|vc pode) (por favor )?(também )?\p{L}+|\b(por favor|quero|queria|gostaria|preciso|precisamos|vamos)\b`),
  taskVerb: words(r5`\b(adiciona|adicione|adicionar|acrescenta|implementa|implemente|implementar|constrói|cria|crie|criar|escreve|escreva|corrige|corrija|corrigir|conserta|conserte|arruma|arrume|refatora|refatore|renomeia|renomeie|remove|remova|apaga|apague|deleta|exclui|atualiza|atualize|muda|mude|altera|altere|troca|troque|faz|faça|fazer|move|mova|migra|suporta|trata|trate|configura|configure|implanta|otimiza|melhora|melhore|limpa|converte|substitui|substitua|extrai|depura|investiga|verifica|descobre|testa|divide|separa|junta|conecta|mostra|mostre|exibe|exiba|esconde|oculta|renderiza|permite|evita|impede|valida|gera|redesenha|reescreve|documenta|acelera|reduz|aumenta|limita|salva|carrega|ordena|filtra|agrupa|centraliza|alinha|exporta|exportar|resolve|resolva)\b`),
  outcome: words(r5`\b(quero|queria|gostaria|queremos|preciso|precisamos|o objetivo|a meta|para que|a fim de|de modo que|de forma que|assim (os usuários|as pessoas|podemos|posso|o financeiro)|(os )?usuários (possam|podem|devem|precisam|querem)|porque|pois|já que|o problema é|estou tentando|o propósito|a ideia é)\b`),
  criteria: [
    ["tests", words(r5`\b(os )?testes?( unitários| de integração)? (devem |precisam |têm que |tem que )?(passar|passem|ficar verdes?)\b|\baté (os )?testes passarem\b|\b(adiciona|adicione|escreve|escreva|inclui|inclua|com) (uns? |alguns |umas? )?testes?\b|\bque (passem|continuem passando) (os )?testes\b`)],
    ["expect", words(r5`\bdeve(ria|m)? (retornar|devolver|mostrar|exibir|ser|incluir|conter|ter|aceitar|rejeitar|lançar|falhar|passar|permitir|bloquear|funcionar|continuar|ficar|igualar)\b|\bdeve .{1,30} (retornar|mostrar|incluir|ser)\b|\b(tem|têm|precisa) que (retornar|ser|incluir|ter|mostrar|funcionar)\b|\bprecisa (retornar|ser|incluir|ter)\b|\besperad[oa]s?\b|\b(é|seja) igual a\b|\bigual a \d|\b(em vez|ao invés) de\b.{0,40}\b(mostrar|retornar)`)],
    ["done", words(r5`\b(está|estará|fica) (pronto|concluído|feito|terminado) quando\b|\b(pronto|concluído) quando\b|\bcritérios? de (aceite|aceitação)\b|\bdefinição de pronto\b|\bteste de aceitação\b|\baté funcionar\b`)],
    ["example", words(r5`\b(por exemplo|ex\.:|exemplo:|tipo assim:)|(->|=>|→)\s*\S`)],
    ["verify", words(r5`\b(garanta|garante|certifique-se|certifica|verifique|confirme que|sem quebrar|não quebre|sem regress(ão|ões)|continuem? funcionando|continuem? passando)\b`)],
    ["limits", words(r5`\b(no máximo|no mínimo|pelo menos|não mais (de|que)|menos de|mais de|máximo|mínimo|abaixo de|acima de|dentro de)\s+\d|\b\d+(\.\d+)?\s?(ms|s|seg|segundos|minutos|mb|kb|gb|%|px|requisições|requests|linhas|caracteres)\b|\b(retorna|retornar|responde com|status|código)\s+\d{3}\b`)],
    ["edge", words(r5`\bcasos? (limite|extremos?|de borda)\b|\b(entrada|lista|string|array) vazi[ao]\b|\bvalores? nulos?\b|\b(entrada|data|valor)(es|s)? inválid[ao]s?\b`)]
  ],
  vague: [
    ["deictic-fix", words(r5`\b(corrige|corrija|conserta|conserte|arruma|arrume|resolve|resolva|vê|veja|olha) (isso|isto|aquilo|o (problema|erro|bug))\b`)],
    ["make-it-work", words(r5`\b(faz|faça|fazer) (isso )?funcionar\b`)],
    ["still-broken", words(r5`\b(continua|ainda|segue) (quebrado|sem funcionar|falhando|errado|igual|com (o mesmo )?erro|não funciona|dando erro)\b|^\s*ainda\W*$`)],
    ["doesnt-work", words(r5`\b(não|nao) (funciona|funcionou|roda|carrega|deu)\b|\b(está|tá|ta) (quebrado|errado)\b`)],
    ["try-again", words(r5`^\s*(de novo|outra vez|tenta de novo|tente de novo|tenta novamente|tente novamente|mais uma vez|não|nao|errado|incorreto)[\s\p{P}]*$`)],
    ["same-issue", words(r5`\b(o )?mesmo (problema|erro|bug)\b|\b(o )?(problema|erro) (persiste|continua)\b`)],
    ["bare-fix", words(r5`^\s*(por favor\s+)?(corrige|corrija|conserta|conserte|arruma|arrume|faz funcionar|faça direito)( isso)?( por favor)?[\s\p{P}]*$`)]
  ],
  lexicon: lexicon("isso isto aquilo o a os as um uma coisa problema erro erros bug corrige corrija conserta conserte arruma de novo outra vez n\xE3o nao funciona continua ainda quebrado por favor j\xE1 agora bem mal igual mesmo sim e mas \xE9 est\xE1 t\xE1 ta tem se me te meu seu pode tenta tente faz fa\xE7a"),
  redo: words(r5`^\s*(não\b|nao\b|errado|incorreto|desfaz|desfaça|reverte|reverta|isso não|não é (isso|assim)|está errado|tá errado|ainda|espera,? não)|\b(eu quis dizer|eu queria dizer|eu pedi|o que eu pedi)\b|\bnão é o que eu (queria|pedi|disse)\b|\bvocê (quebrou|esqueceu|ignorou|não fez)\b|\b(o outro|a outra|arquivo errado|lugar errado)\b|\b(esse|essa|este|esta) (arquivo|função|botão|componente|página) não\b|\b(tenta|tente|faz|faça) (de novo|outra vez|novamente)\b|\b(continua|ainda) (quebrado|falhando|sem funcionar|errado|igual|não)\b|\bnão (funciona|funcionou|mudou|resolveu|ajudou)\b|\bmesmo (problema|erro|bug)\b|\b(desfaz|desfaça|reverte|reverta)\b|\bvolta (como estava|ao que era)\b`),
  correction: words(r5`^\s*(não[,.!]|nao[,.!]|não (é isso|é assim)\b|errado|incorreto|isso não|não é (isso|assim)|está errado|tá errado|na verdade[, ]|para\b|pare\b|desfaz|desfaça|reverte|reverta|por que você|não (faça|mude|mexa)|você (quebrou|esqueceu|não fez)|(continua|ainda) (quebrado|falhando|sem funcionar|não)|espera[,.! ])`),
  direction: words(r5`\b(pensando bem|mudei de ideia|mudança de planos|melhor (usar|usarmos|fazer)|em vez disso,? (vamos|usa)|na verdade,? vamos|novo requisito|decidi|prefiro)\b`),
  also: words(r5`^\s*\p{L}+ (também|além disso)\b|^\s*(também|além disso|agora|depois|e também|ok,? agora|beleza,? agora|ótimo,? agora|outra coisa|mais uma coisa|pode também)\b`),
  revert: words(r5`\b(desfaz|desfaça|desfazer|reverte|reverta|reverter|volta (como estava|atrás)|restaura)\b`),
  wrongTarget: words(r5`\b(esse|essa|este|esta) (arquivo|função|botão|componente|página) não\b|\b(arquivo|lugar|botão|componente|página|função) errad[oa]\b|\b(o outro|a outra)\b|\beu quis dizer\b|\bnão é o que eu (queria|pedi|disse)\b`),
  errorText: words(r5`\b(erro|exceção|falha|falhou|falhando|quebrou|crash|não funciona|quebrado|500|undefined)\b`),
  done: words(r5`\b(deve|deveria|devem|devemos|deveríamos|tem que|têm que|precisa|garanta|certifique|verifique|esperad[oa]|critérios?|aceite|aceitação|requisito|para que|caso limite|restrição|sem quebrar|pronto quando)\b`),
  plan: words(r5`\b(plano|planeja|planeje|esboço|design|arquitetura|abordagem|passo a passo|antes de (escrever|codar|programar|começar|implementar))\b`),
  polite: words(r5`\b(por favor|pfv|obrigad[oa]|valeu|vlw|agradeço)\b`, "g"),
  praise: words(r5`\b(bom trabalho|mandou bem|excelente trabalho|ótimo trabalho|você é (o melhor|demais|incrível)|adorei)\b`, "g"),
  profanity: words(r5`\b(porra|caralho|merda|foda|foda-se|puta|cacete|bosta)\b`, "g"),
  hostile: words(r5`\b(idiota|estúpid[oa]|inútil|imbecil|eu já (te )?(disse|falei)|quantas vezes|pela última vez|tá de brincadeira)\b`, "g"),
  // "no" is "in the" ("no arquivo…"), not English's "no"
  falseFriends: words(r5`^\s*no(?=\s+\p{L})`),
  wordScale: 1
};

// src/lib/analyzer/rules/de.ts
var r6 = String.raw;
var de = {
  approval: words(r6`^(ok(ay)?|ja|jo|jep|klar|sicher|gut|sehr gut|super|perfekt|prima|toll|passt|passt so|alles klar|einverstanden|genau|richtig|stimmt|danke|vielen dank|weiter|mach weiter|mach'?s|weitermachen|fortfahren|leg los|los|sieht gut aus|lgtm|freigegeben|genehmigt|gute arbeit|gut gemacht|merge|mergen|committe|commit|pushen|push|deploy(en)?|beide|alle)\b`),
  question: words(r6`^\s*(warum|wieso|weshalb|wie|was|wo|wann|welche[rsmn]?|wer|ist|sind|war|waren|gibt es|hat|haben|kann (ich|man)|soll(te)?|würde|könnte|wird|funktioniert)\b`),
  request: words(r6`\b(kannst|könntest|würdest|kann|könnten) (du|sie) (bitte )?(auch )?\p{L}+|\b(bitte|ich will|ich möchte|ich hätte gern|wir brauchen|ich brauche|lass uns|lasst uns)\b`),
  taskVerb: words(r6`\b(füge|hinzufügen|füg|ergänze|ergänzen|implementiere|implementieren|baue|bau|erstelle|erstellen|schreibe|schreib|behebe|beheb|fixe|fix|repariere|korrigiere|refaktoriere|refactore|benenne|entferne|lösche|aktualisiere|update|ändere|änder|mach(e)?(?!\s+(weiter|das|es|mal|schon|doch)\b)(?![^.!?]*\brückgängig)|verschiebe|migriere|unterstütze|behandle|richte|deploye|optimiere|verbessere|räume|konvertiere|wandle|ersetze|extrahiere|debugge|untersuche|finde|teste|teile|verbinde|zeige|zeig|verstecke|blende|rendere|erlaube|verhindere|validiere|generiere|überarbeite|dokumentiere|beschleunige|reduziere|erhöhe|begrenze|logge|sende|speichere|lade|sortiere|filtere|gruppiere|zentriere|exportiere|bring|löse)\b`),
  outcome: words(r6`\b(ich (will|möchte|hätte gern|brauche)|wir (wollen|möchten|brauchen)|das ziel|ziel ist|damit|sodass|so dass|(nutzer|benutzer|leute|kunden) (können|sollen|müssen|wollen)|können sollen|weil|das problem ist|ich versuche|wir versuchen|der zweck|die idee ist)\b|\bum\b.{1,60}\bzu\b`),
  criteria: [
    ["tests", words(r6`\b(die )?tests? (müssen |sollen |sollten )?(alle )?(bestehen|grün (sein|werden|bleiben)|durchlaufen|laufen durch|passen)\b|\bbis (die )?tests (grün|bestehen|durchlaufen)\b|\b(füge|schreib|schreibe|mit|ergänze) (einen |ein paar |einige |unit-?|integrations-?)?tests?\b|\btests? (für|dafür)\b`)],
    ["expect", words(r6`\bsoll(te|ten|en)? (zurückgeben|ausgeben|anzeigen|sein|enthalten|haben|akzeptieren|ablehnen|werfen|fehlschlagen|bestehen|erlauben|blockieren|funktionieren|bleiben|gleich)\b|\bsoll(te|ten|en)? .{1,30} (zurückgeben|ausgeben|anzeigen|sein|enthalten|liefern|ergeben|werfen|bleiben|ablehnen|akzeptieren)\b|\bmuss (nicht )?(sein|zurückgeben|haben|bestehen|enthalten|funktionieren|bleiben|unterstützen)\b|\b(muss|müssen) .{1,30} (enthalten|sein|zurückgeben|haben|liefern|ergeben)\b|\berwartet\b|\bgleich \d|\b(statt|anstatt)\b.{0,40}\b(anzeigen|zurückgeben)`)],
    ["done", words(r6`\b(fertig|erledigt)(,)? wenn\b|\b(ist|es ist) (fertig|erledigt), wenn\b|\bdefinition of done\b|\b(akzeptanz|abnahme)kriterien\b|\babnahmetest\b|\bbis es (funktioniert|läuft)\b`)],
    ["example", words(r6`\b(z\. ?b\.|zum beispiel|beispielsweise|beispiel:|etwa so:)|(->|=>|→)\s*\S`)],
    ["verify", words(r6`\b(stell(e)? sicher|sicherstellen|achte darauf|prüfe|prüf|überprüfe|verifiziere|bestätige|nichts kaputt|keine regressionen?|weiterhin (funktionier|bestehen|laufen)\p{L}*)\b|\bohne\b.{0,20}\bkaputt`)],
    ["limits", words(r6`\b(höchstens|mindestens|maximal|minimal|nicht mehr als|weniger als|mehr als|unter|über|innerhalb von|max\.?|min\.?)\s+\d|\b\d+(\.\d+)?\s?(ms|s|sek|sekunden|minuten|mb|kb|gb|%|px|anfragen|requests|zeilen|zeichen|einträge)\b|\b(status|zurückgeben|liefert|antwortet mit|gibt)\s+\d{3}\b|\b\d{3} zurück`)],
    ["edge", words(r6`\b(randf(a|ä)ll(e)?|grenzf(a|ä)ll(e)?|edge cases?)\b|\bleere[rsnm]? (eingabe|liste|string|array)\b|\bnull-?werte?\b|\bungültige[rsnm]? (eingabe|datum|werte?)\b`)]
  ],
  vague: [
    ["deictic-fix", words(r6`\b(fix|behebe|beheb|repariere|korrigiere|löse|ändere|mach) (?!(das|es) rückgängig)(das|es|dies|diese[ns]?|den (fehler|bug)|das problem)\b|\b(das|es) (beheben|fixen|reparieren)\b`)],
    ["make-it-work", words(r6`\bmach (dass )?(es|das) (funktioniert|läuft|geht)\b|\bbring (es|das) zum laufen\b`)],
    ["still-broken", words(r6`\b(immer noch|noch immer|weiterhin|nach wie vor) (kaputt|fehlerhaft|falsch|nicht|gleich|derselbe|dasselbe|schlecht|da)\b|^\s*immer noch\W*$|\b(geht|funktioniert|läuft) (immer )?noch (immer )?nicht\b|\b(schlägt|scheitert) (immer )?noch (immer )?fehl\b`)],
    ["doesnt-work", words(r6`\b(geht|funktioniert|läuft|klappt|lädt) (immer noch |noch )?nicht\b|\b(es|das) ist (kaputt|falsch)\b`)],
    ["try-again", words(r6`^\s*(nochmal|noch ?mal|noch einmal|versuch es nochmal|versuch'?s nochmal|versuch es erneut|erneut|wiederholen|nein|nee|falsch)[\s\p{P}]*$`)],
    ["same-issue", words(r6`\b(gleiche[rsn]?|selbe[rsn]?|derselbe|dasselbe) (problem|fehler|bug)\b|\b(das problem|der fehler|der bug) (besteht|ist) (immer )?noch\b`)],
    ["bare-fix", words(r6`^\s*(bitte\s+)?(fix|fix das|fix es|behebe das|behebe es|reparier das|mach es richtig|mach es ordentlich)( bitte)?[\s\p{P}]*$`)]
  ],
  lexicon: lexicon("das es dies diese dieser den der die ein eine ding sache problem probleme fehler bug bugs fix fixen behebe beheb repariere reparier mach es funktioniert geht l\xE4uft klappt nicht immer noch nochmal mal bitte jetzt schon ja nein falsch kaputt gleich gleiche selbe und aber ist sind war kannst du ich wir mir doch einfach wieder"),
  redo: words(r6`^\s*(nein\b|nee\b|falsch|nicht (das|so|ganz|was)\b|das ist (nicht|falsch)|rückgängig|mach (das|es) rückgängig|immer noch|noch immer|warte,? (nein|das))|\bich (meinte|sagte|wollte)\b|\bnicht (das|was) ich (meinte|wollte|gesagt)\b|\bdu hast\b.{0,30}\b(kaputt gemacht|vergessen|übersehen|ignoriert)\b|\b(die )?(falsche|andere) (datei|stelle|funktion|button|komponente|seite)\b|\b(der|die|das) andere\b|\b(versuch'?s?|probier'?s?|mach'?s?) (es )?(nochmal|noch einmal|erneut)\b|\b(immer noch|noch immer) (kaputt|nicht|falsch|derselbe|gleich)\b|\b(geht|funktioniert|klappt|hilft) (immer )?(noch )?nicht\b|\b(schlägt|scheitert) (immer )?noch (immer )?fehl\b|\b(gleiche|selbe|derselbe|dieselbe|dasselbe)[rsn]? (problem|fehler|bug)\b|\brückgängig\b|\bzurücksetzen\b`),
  correction: words(r6`^\s*(nein[,.! ]|nee[,.! ]|falsch|das ist (nicht|falsch)|eigentlich[, ]|stopp|stop\b|halt\b|rückgängig|mach (das|es) rückgängig|warum hast du|(tu|mach) das nicht|lass das|du hast\b.{0,20}\b(kaputt|vergessen|übersehen)|(immer noch|noch immer) (kaputt|nicht|fehlerhaft)|(es|das) ist (immer noch )?(kaputt|falsch)|(geht|funktioniert|läuft|klappt) (immer )?noch (immer )?nicht|warte[,.! ])|\b(mach|setz)\b.{0,30}\brückgängig\b`),
  direction: words(r6`\b(bei genauerer überlegung|bei näherer betrachtung|wenn ich es mir recht überlege|ich habe es mir anders überlegt|ich hab'?s mir anders überlegt|planänderung|lass uns (stattdessen|lieber|doch)|stattdessen lass uns|neue anforderung|ich habe entschieden|ich hab entschieden|ich würde lieber|besser wäre|auf den zweiten blick)\b`),
  also: words(r6`^\s*\p{L}+ (außerdem|zusätzlich|auch noch)\b|^\s*(auch|außerdem|zusätzlich|jetzt|nun|als nächstes|dann|danach|und noch|ok,? jetzt|gut,? jetzt|super,? jetzt|danke!?,? jetzt|kannst du auch|noch eine sache|noch etwas)\b`),
  revert: words(r6`\b(rückgängig|zurücksetzen|zurückrollen|wiederherstellen)\b|\bstell\b.{0,20}\bwieder her\b`),
  wrongTarget: words(r6`\bnicht (die|das|den|diese[nsr]?) (datei|funktion|button|knopf|seite|komponente|stelle)\b|\b(falsche|andere)[nrs]? (datei|stelle|funktion|button|komponente|seite|element)\b|\b(der|die|das) andere\b|\bich meinte\b|\bnicht was ich (meinte|wollte)\b`),
  errorText: words(r6`\b(fehler|error|exception|ausnahme|absturz|stürzt ab|crasht|schlägt fehl|fehlgeschlagen|kaputt|geht nicht|funktioniert nicht|500|undefined)\b`),
  done: words(r6`\b(soll|sollte|sollten|sollen|muss|müssen|stell sicher|sicherstellen|achte darauf|erwartet|akzeptanz|kriterien|prüfe|verifiziere|damit|sodass|anforderung|randfall|randfälle|einschränkung|fertig wenn)\b|\bohne\b.{0,15}\bkaputt`),
  plan: words(r6`\b(plan|planen|plane|entwurf|entwirf|design|architektur|ansatz|vorgehen|schritt für schritt|bevor du (anfängst|codest|implementierst|code schreibst|loslegst)|vor dem (implementieren|programmieren|coden))\b`),
  polite: words(r6`\b(bitte|danke|dankeschön|vielen dank)\b`, "g"),
  praise: words(r6`\b(gute arbeit|gut gemacht|super gemacht|toll gemacht|du bist (der beste|super|toll))\b`, "g"),
  profanity: words(r6`\b(scheiße|scheiss|scheiß|verdammt|verflucht|kacke|fick\p{L}*|arschloch)\b`, "g"),
  hostile: words(r6`\b(idiot|dumm|blöd|nutzlos|unfähig|bescheuert|wie oft (noch)?|zum letzten mal|willst du mich verarschen)\b|\bich habe (es )?dir (doch )?(schon )?gesagt\b`, "g"),
  // "also" opens a sentence as "so" ("Also, die Summe…"), not English's "also"
  falseFriends: words(r6`^\s*also\b`),
  wordScale: 1
};

// src/lib/analyzer/rules/fr.ts
var r7 = String.raw;
var fr = {
  approval: words(r7`^(ok|okay|oui|ouais|d'accord|dac|ça marche|ca marche|parfait|super|génial|genial|très bien|tres bien|bien|top|nickel|merci|merci beaucoup|vas-y|vas y|allez-y|allez y|continue|continuez|poursuis|go|fais-le|fais le|c'est bon|ça me va|ca me va|ça a l'air (bien|bon)|ca a l'air (bien|bon)|ça semble bien|bon travail|beau travail|bien joué|lgtm|approuvé|validé|exactement|correct|merge|commit|push|déploie|deploie)\b`),
  question: words(r7`^\s*(pourquoi|comment|que|qu'est-ce|quoi|où|quand|quel|quelle|quels|quelles|qui|est-ce|combien|est-il|y a-t-il|peut-on|dois-je|faut-il)\b`),
  request: words(r7`\b(peux-tu|peux tu|pourrais-tu|pourrais tu|pouvez-vous|pourriez-vous|tu peux|vous pouvez) (s'il te plaît |stp |svp )?(aussi )?\p{L}+|\b(s'il te plaît|s'il vous plaît|stp|svp|je veux|je voudrais|j'aimerais|il faut|on doit|nous devons)\b`),
  taskVerb: words(r7`\b(ajoute|ajouter|ajoutez|implémente|implémenter|construis|crée|créer|écris|écrire|corrige|corriger|répare|réparer|refactorise|renomme|supprime|supprimer|enlève|retire|mets (aussi |également )?à jour|mettre à jour|change|changer|modifie|modifier|fais(?![-\s]le\b)|faire|déplace|migre|supporte|gère|configure|déploie|optimise|améliore|nettoie|convertis|remplace|extrais|débogue|cherche|trouve|teste|divise|sépare|fusionne|connecte|affiche|afficher|montre|masque|rends|autorise|empêche|valide|génère|refais|réécris|documente|accélère|réduis|augmente|limite|enregistre|envoie|sauvegarde|charge|trie|filtre|regroupe|centre|aligne|exporte|exporter|résous|règle)\b`),
  outcome: words(r7`\b(je veux|je voudrais|j'aimerais|nous voulons|on veut|on a besoin|j'ai besoin|nous avons besoin|l'objectif|le but|pour que|afin que|afin de|de sorte que|de façon à|(les )?utilisateurs (puissent|peuvent|doivent|veulent)|parce que|car|le problème c'est|le problème est|j'essaie de|on essaie de|l'idée est)\b`),
  criteria: [
    ["tests", words(r7`\b(les )?tests?( unitaires| d'intégration)? (doivent |devraient )?(passer|passent|être verts?|au vert)\b|\bjusqu'à ce que (les )?tests passent\b|\b(ajoute|écris|avec|inclus) (un |des |quelques )?tests?\b|\bque (les )?tests (passent|continuent de passer)\b`)],
    ["expect", words(r7`\b(doit|devrait|doivent|devraient) (retourner|renvoyer|afficher|être|inclure|contenir|avoir|accepter|rejeter|lever|échouer|passer|permettre|bloquer|fonctionner|rester|égaler)\b|\b(doit|devrait)\b.{1,25}\b(retourner|renvoyer|afficher|inclure|contenir|être)\b|\b(attendu|attendue|on s'attend)\b|\bégal à \d|\bau lieu de\b.{0,40}\b(afficher|retourner|renvoyer)`)],
    ["done", words(r7`\bc'est (fini|terminé|bon) quand\b|\b(fini|terminé) quand\b|\bcritères d'acceptation\b|\bdéfinition de (fini|terminé)\b|\btest d'acceptation\b|\bjusqu'à ce que (ça|ca) (marche|fonctionne)\b`)],
    ["example", words(r7`\b(par exemple|p\. ?ex\.|exemple ?:|comme ceci ?:)|(->|=>|→)\s*\S`)],
    ["verify", words(r7`\b(assure-toi|assurez-vous|assure que|vérifie|vérifiez|confirme que|sans casser|ne casse pas|pas de régression|continuent? de (fonctionner|passer)|toujours (fonctionner|passer))\b`)],
    ["limits", words(r7`\b(au plus|au moins|pas plus de|moins de|plus de|maximum|minimum|en dessous de|au-dessus de|en moins de)\s+\d|\b\d+(\.\d+)?\s?(ms|s|sec|secondes|minutes|mo|ko|go|mb|kb|gb|%|px|requêtes|requetes|lignes|caractères)\b|\b(retourne|renvoie|répond avec|statut|code)\s+\d{3}\b`)],
    ["edge", words(r7`\bcas (aux )?limites?\b|\bcas particuliers?\b|\b(entrée|liste|chaîne|tableau) vide\b|\bvaleurs? nulles?\b|\b(entrée|date|valeur)s? invalides?\b`)]
  ],
  vague: [
    ["deictic-fix", words(r7`\b(corrige|répare|règle|résous|regarde|vérifie|change|améliore|arrange) (ça|ca|ceci|cela|le (problème|bug|souci)|l'erreur)\b|\b(corrige|répare|règle)-le\b`)],
    ["make-it-work", words(r7`\bfais (que ça|en sorte que ça) (marche|fonctionne)\b|\bfais(-le)? (marcher|fonctionner)\b`)],
    ["still-broken", words(r7`\b(toujours|encore) (cassé|en panne|pas|faux|pareil|la même|le même|un problème|en erreur)\b|\b(ça|ca) (ne )?(marche|fonctionne) toujours pas\b|\b(échoue|plante) toujours\b|^\s*toujours\W*$`)],
    ["doesnt-work", words(r7`\b(ça|ca|cela) (ne )?(marche|fonctionne|charge|tourne) pas\b|^\s*(ne )?marche pas\b|\b(c'est|ça a l'air) (cassé|faux)\b`)],
    ["try-again", words(r7`^\s*(réessaie|réessaye|réessayez|essaie encore|essaye encore|encore une fois|recommence|refais|à nouveau|non|nan|faux)[\s\p{P}]*$`)],
    ["same-issue", words(r7`\b(même|le même|la même) (problème|erreur|bug|souci)\b|\b(le problème|l'erreur|le bug) (persiste|est toujours là)\b`)],
    ["bare-fix", words(r7`^\s*(s'il te plaît\s+|stp\s+)?(corrige|corrige ça|corrige-le|répare|répare ça|fais marcher|fais-le marcher|fais-le bien)( stp| svp| s'il te plaît)?[\s\p{P}]*$`)]
  ],
  lexicon: lexicon("\xE7a ca ceci cela le la les l un une truc chose probl\xE8me souci erreur bug corrige corrige-le r\xE9pare r\xE8gle fais marche marcher fonctionne fonctionner pas ne toujours encore une fois \xE0 nouveau refais stp svp s'il te pla\xEEt pla\xEEt te il juste maintenant ok bien mal cass\xE9 m\xEAme pareil oui non et mais est c'est sont peux tu je on"),
  redo: words(r7`^\s*(non\b|nan\b|faux|incorrect|annule|pas (ça|ca|ce|comme ça)|ce n'est pas (ça|ca|bon|correct)|c'est (faux|pas (ça|bon|correct))|toujours\b|attends,? non)|\bje (voulais dire|parlais de|t'ai demandé)\b|\bce n'est pas ce que (je voulais|j'ai demandé|j'ai dit)\b|\btu as (cassé|oublié|ignoré|raté)\b|\b(le mauvais|la mauvaise) (fichier|endroit|fonction|bouton|composant|page)\b|\bl'autre\b|\bpas (ce|cette) (fichier|fonction|bouton|composant|page)\b|\b(réessaie|réessaye|essaie encore|refais|recommence)\b|\b(toujours|encore) (cassé|en panne|pas|faux|pareil|le même|la même)\b|\b(ça|ca) (ne )?(marche|fonctionne|change) (toujours )?pas\b|\b(même|le même|la même) (problème|erreur|bug)\b|\b(échoue|plante) toujours\b|\bannule\b|\breviens en arrière\b`),
  correction: words(r7`^\s*(non[,.! ]|nan[,.! ]|faux|c'est (faux|pas (ça|bon))|ce n'est pas (ça|bon|ce que)|en fait[, ]|arrête|stop\b|annule|pourquoi (tu as|as-tu)|ne (fais|change|touche) pas|tu as (cassé|oublié|raté)|(c'est |ça est )?toujours (cassé|en panne|pas)|(ça|ca) (ne )?(marche|fonctionne) toujours pas|attends[,.! ])|\bannule (ça|ca|ce|cette|le|la|les)\b`),
  direction: words(r7`\b(à la réflexion|a la reflexion|réflexion faite|j'ai changé d'avis|changement de plan|utilisons plutôt|faisons plutôt|plutôt,? (utilisons|faisons)|en fait,? (utilisons|faisons)|nouvelle exigence|j'ai décidé|je préfère|je préférerais)\b`),
  also: words(r7`^\s*\p{L}+ (aussi|également)\b|^\s*(aussi|également|de plus|en plus|maintenant|ensuite|puis|et aussi|ok,? maintenant|bien,? maintenant|super,? maintenant|merci,? maintenant|peux-tu aussi|une dernière chose|encore une chose)\b`),
  revert: words(r7`\b(annule|annuler|reviens en arrière|remets (comme|le|ça)|restaure|défais)\b`),
  wrongTarget: words(r7`\bpas (ce|cette|ça) (fichier|fonction|bouton|composant|page)\b|\b(mauvais|mauvaise) (fichier|endroit|fonction|bouton|composant|page)\b|\bl'autre\b|\bje voulais dire\b|\bce n'est pas ce que (je voulais|j'ai demandé)\b`),
  errorText: words(r7`\b(erreur|exception|plante|crash|échoue|échec|cassé|ne marche pas|ne fonctionne pas|500|undefined)\b`),
  done: words(r7`\b(doit|devrait|doivent|devraient|devons|devrions|il faut|assure|assurez|vérifie|attendu|critères?|acceptation|exigence|pour que|afin que|cas limites?|contrainte|sans casser|fini quand|terminé quand)\b`),
  plan: words(r7`\b(plan|planifie|esquisse|conception|conçois|architecture|approche|étape par étape|avant de (coder|commencer|écrire|implémenter))\b`),
  polite: words(r7`\b(s'il te plaît|s'il vous plaît|stp|svp|merci)\b`, "g"),
  praise: words(r7`\b(bon travail|beau travail|bien joué|excellent travail|tu es (le meilleur|génial)|j'adore)\b`, "g"),
  profanity: words(r7`\b(merde|putain|bordel|chier|connard|foutu)\b`, "g"),
  hostile: words(r7`\b(idiot|stupide|inutile|incompétent|combien de fois|pour la dernière fois|tu te moques de moi)\b|\bje te l'ai (déjà )?dit\b`, "g"),
  wordScale: 1
};

// src/lib/analyzer/lang.ts
var RULES = { ko, zh, ja, es, pt, de, fr };
var rulesFor = (lang) => RULES[lang];
var isMeasured = (lang) => lang !== "other";
function test(re, s) {
  if (!re) return false;
  re.lastIndex = 0;
  return re.test(s);
}
var count = (re, s) => re ? (s.match(re) ?? []).length : 0;
var SCAN_CHARS = 2e3;
var STRIP_RE = /```[\s\S]*?(```|$)|`[^`\n]{1,200}`|<[^>]{1,200}>|\bhttps?:\/\/\S+|"[^"\n]{1,200}"|“[^”\n]{1,200}”|(^|\s)'[^'\n]{1,200}'(?=[\s.,;:!?)]|$)/gi;
var PATH_G = new RegExp(PATH_RE.source, "g");
function scripts(s) {
  const c = { latin: 0, hangul: 0, kana: 0, han: 0, other: 0, accents: "" };
  for (let i = 0; i < s.length; i++) {
    const x = s.charCodeAt(i);
    if (x < 128) {
      if (x >= 65 && x <= 90 || x >= 97 && x <= 122) c.latin++;
    } else if (x >= 192 && x <= 591 && x !== 215 && x !== 247) {
      c.latin++;
      if (c.accents.length < 40) c.accents += s[i].toLowerCase();
    } else if (x === 161 || x === 191) {
      c.accents += s[i];
    } else if (x >= 7680 && x <= 7935) {
      c.latin++;
      c.accents += "\u1EA1";
    } else if (x >= 44032 && x <= 55215 || x >= 4352 && x <= 4607 || x >= 12592 && x <= 12687) c.hangul++;
    else if (x >= 12352 && x <= 12543 || x >= 12784 && x <= 12799 || x >= 65382 && x <= 65439) c.kana++;
    else if (x >= 19968 && x <= 40959 || x >= 13312 && x <= 19903 || x >= 63744 && x <= 64255) c.han++;
    else if (x >= 880 && x <= 1023 || // Greek
    x >= 1024 && x <= 1327 || // Cyrillic
    x >= 1328 && x <= 1791 || // Armenian, Hebrew, Arabic
    x >= 1872 && x <= 1919 || x >= 2304 && x <= 3583 || // Indic scripts
    x >= 3584 && x <= 3839 || // Thai, Lao
    x >= 4096 && x <= 4351 || // Myanmar, Georgian
    x >= 4608 && x <= 4991 || // Ethiopic
    x >= 6016 && x <= 6143)
      c.other++;
  }
  return c;
}
var STOPWORDS = {
  en: "the a an and or but is are was were be been it it's its this that these those to of in on for with at by from as i i'm i've you you're we we're they he she my your our me us not no don't doesn't didn't isn't can't won't do does did can could should would will shall must have has had if then than so when what why how where which who there here also just now please thanks thank make fix add use run test tests file code need want get let let's ok okay yes yeah sure good great looks like all some any more one up out into about after before again still only very same other new work works working done change update remove",
  es: "arregla a\xF1ade agrega cambia quita borra elimina haz parece intenta int\xE9ntalo archivo funci\xF3n bot\xF3n p\xE1gina nuevo nueva el la los las un una unos unas que de del al por para con sin es son est\xE1 est\xE1n esto eso esta este ese esa hay pero como m\xE1s muy tambi\xE9n ya s\xED cuando donde porque qu\xE9 c\xF3mo hazlo haz arregla a\xF1ade cambia quiero necesito todav\xEDa a\xFAn sigue funciona falla bien vale dale listo perfecto gracias adelante usa debe deber\xEDa tiene hacer otra vez lo le se mi tu su no",
  pt: "conserta conserte arruma adiciona adicione muda mude apaga faz fa\xE7a parece bom boa novo nova tenta tente arquivo fun\xE7\xE3o bot\xE3o p\xE1gina o os a as um uma uns umas que de do da dos das no na nos nas por pelo pela para com sem \xE9 s\xE3o est\xE1 est\xE3o isso isto esta este essa esse mas como mais muito tamb\xE9m j\xE1 sim n\xE3o quando onde porque voc\xEA voc\xEAs faz fa\xE7a corrige corrija adiciona adicione muda mude quero preciso ainda continua funciona falha bem beleza valeu obrigado obrigada pode segue manda \xF3timo perfeito deve deveria tem fazer outra vez se meu minha seu sua",
  de: "deine dein letzte letzten behebe beheb mach mache \xE4ndere f\xFCge l\xF6sche entferne schreib erstelle versuch versuche nochmal datei funktion seite fehler der die das den dem des ein eine einen einem einer und oder aber ist sind war nicht kein keine mit auf f\xFCr von zu im in ich du wir sie es bitte danke noch auch schon dass wenn weil was wie wo warum mach mache \xE4ndere f\xFCge hinzu soll sollte muss m\xFCssen funktioniert geht kaputt immer wieder gut passt weiter genau ja nein jetzt mal doch dann hier dort",
  fr: "annule ta ton tes ma mon derni\xE8re dernier ajoute enl\xE8ve supprime fais r\xE9pare modifie r\xE9essaie r\xE9essaye fichier fonction bouton erreur le la les un une des du de et est sont pas ne que qui pour avec dans sur ce cette ces il elle je tu nous vous on mais ou plus aussi \xE7a cela si quand o\xF9 pourquoi comment fais faites corrige ajoute change modifie veux voudrais faut toujours encore marche fonctionne bien merci parfait vas-y d'accord oui non doit devrait c'est n'est j'ai au aux leur",
  // Latin-script languages without rules yet: their prompts read as "not measured", not as English
  other: "sbagliato giusto errore sistema sistemalo aggiungi correggi rimuovi fai adesso ora poi ecco essere deve dovrebbe tutto tutti il lo gli di che \xE8 non per sono questo questa anche perch\xE9 ancora della delle nel funziona grazie het een niet van dat ik je wat maar ook nog werkt zijn moet graag bedankt deze yang dan ini itu tidak untuk dengan saya ada bisa sudah belum tolong terima kasih och att \xE4r inte jag och f\xF6r som det ikke jeg og er ve bir bu i\xE7in de\u011Fil \xE7ok ama nie jest si\u0119 \u017Ce czy jak ale te\u017C ju\u017C"
};
var WORD_LANGS = /* @__PURE__ */ new Map();
for (const [lang, ws2] of Object.entries(STOPWORDS))
  for (const w of new Set(ws2.split(/\s+/))) WORD_LANGS.set(w, [...WORD_LANGS.get(w) ?? [], lang]);
var ACCENT_HINTS = [
  [/[ñ¿¡]/, ["es"], 2],
  [/[ãõ]/, ["pt"], 2],
  [/ß/, ["de"], 2],
  [/[äöü]/, ["de"], 1],
  [/[œêëîïûâ]/, ["fr"], 1],
  [/[èù]/, ["fr", "other"], 1],
  // French and Italian
  [/ç/, ["fr", "pt"], 1],
  [/[áíóú]/, ["es", "pt"], 1],
  [/é/, ["es", "pt", "fr"], 1],
  [/[ạłąęśźżćńřěůğşıőű]/, ["other"], 2]
];
var LATIN_WORD_RE = /[a-zà-ÿœß]+(?:['’-][a-zà-ÿœß]+)*/g;
function latinLang(s, accents) {
  const tokens = s.toLowerCase().slice(0, 600).match(LATIN_WORD_RE) ?? [];
  const score = { en: 0, es: 0, pt: 0, de: 0, fr: 0, other: 0 };
  for (const t of tokens) for (const l of WORD_LANGS.get(t.replace(/’/g, "'")) ?? []) score[l]++;
  if (accents) {
    for (const [re, langs, w] of ACCENT_HINTS) if (re.test(accents)) for (const l of langs) score[l] += w;
  }
  let best = "";
  for (const l of ["es", "pt", "de", "fr", "other"]) if (score[l] > (score[best] ?? 0)) best = l;
  if (!best) return "en";
  const clear = score[best] >= 2 && score[best] > score.en;
  const short = tokens.length <= 3 && score[best] >= 1 && score.en === 0;
  return clear || short ? best : "en";
}
var cache = /* @__PURE__ */ new Map();
var CACHE_MAX = 4e3;
function langOf(text) {
  const hit = cache.get(text);
  if (hit) return hit;
  const s = text.slice(0, SCAN_CHARS * 2).replace(STRIP_RE, " ").replace(PATH_G, " ").slice(0, SCAN_CHARS);
  const c = scripts(s);
  const cjk = c.hangul + c.kana + c.han;
  let lang;
  if (cjk * 3 >= c.latin && cjk * 3 >= c.other && cjk > 0) lang = c.hangul >= c.kana && c.hangul * 2 >= c.han ? "ko" : c.kana > 0 ? "ja" : "zh";
  else if (c.other > c.latin) lang = "other";
  else lang = c.latin ? latinLang(s, c.accents) : "en";
  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(text, lang);
  return lang;
}
var UNSPACED_RE = /[぀-ヿㇰ-ㇿ㐀-䶿一-鿿豈-﫿가-힯ᄀ-ᇿ㄰-㆏฀-໿က-႟ក-៿ｦ-ﾟ]/;
var UNSPACED_G = new RegExp(UNSPACED_RE.source, "g");
var segmenter;
function getSegmenter() {
  if (segmenter === void 0) {
    const S = Intl.Segmenter;
    try {
      segmenter = S ? new S(void 0, { granularity: "word" }) : null;
    } catch {
      segmenter = null;
    }
  }
  return segmenter;
}
function segmentCount(s) {
  const seg = getSegmenter();
  if (seg) {
    let n = 0;
    for (const x of seg.segment(s)) if (x.isWordLike) n++;
    return n;
  }
  const unspaced = (s.match(UNSPACED_G) ?? []).length;
  const rest = s.replace(UNSPACED_G, " ").trim();
  return Math.ceil(unspaced / 2) + (rest ? rest.split(/\s+/).length : 0);
}
function countWords(text) {
  const pieces = text.split(/\s+/).filter(Boolean);
  if (!UNSPACED_RE.test(text)) return pieces.length;
  const unspaced = pieces.filter((p) => UNSPACED_RE.test(p));
  return pieces.length - unspaced.length + segmentCount(unspaced.join(" "));
}
var WORD_G = new RegExp("[\\p{L}\\p{N}][\\p{L}\\p{N}'_-]*", "gu");
var NO_SPACES_RE = /[\u3040-\u30ff\u31f0-\u31ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u0e00-\u0eff\u1000-\u109f\u1780-\u17ff\uff66-\uff9f]/;
function wordsIn(prose2) {
  const s = prose2.toLowerCase();
  if (!NO_SPACES_RE.test(s)) return s.match(WORD_G) ?? [];
  const seg = getSegmenter();
  if (!seg) return (s.match(WORD_G) ?? []).flatMap((w) => NO_SPACES_RE.test(w) ? w.match(/[^]{1,2}/gu) ?? [] : [w]);
  const out = [];
  for (const x of seg.segment(s)) if (x.isWordLike) out.push(x.segment);
  return out;
}
var PLAN_RE = /\b(plan|outline|design|architecture|approach|step[- ]by[- ]step|before (you )?(code|start|implement))\b/i;
function promptHabits(text) {
  const lang = langOf(text);
  if (!isMeasured(lang)) return { lang, measured: false, criteria: false, correction: false, kind: 0, profanity: 0, hostility: 0, plan: false };
  const R = rulesFor(lang);
  const noCode = text.replace(/```[\s\S]*?```/g, " ");
  return {
    lang,
    measured: true,
    criteria: CRITERIA_RE.test(text) || test(R?.done, text),
    correction: CORRECTION_RE.test(R?.falseFriends ? text.replace(R.falseFriends, " ") : text) || test(R?.correction, text),
    kind: (text.match(POLITE_RE) || []).length + (text.match(PRAISE_RE) || []).length + count(R?.polite, text) + count(R?.praise, text),
    profanity: (text.match(PROFANITY_RE) || []).length + count(R?.profanity, text),
    hostility: (noCode.match(HOSTILE_RE) || []).length + count(R?.hostile, noCode),
    plan: PLAN_RE.test(text) || test(R?.plan, text)
  };
}

// src/lib/analyzer/outcomes.ts
var SHELL_TOOL = /^(bash|shell|exec_command|local_shell|local_shell_call|container\.exec|powershell)$/i;
function splitCommand(cmd) {
  const parts = [];
  const seps = [];
  let cur = "";
  let q = null;
  let sep = "";
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (q) {
      if (c === q) q = null;
      else if (c === "\\" && q === '"') {
        cur += c + (cmd[i + 1] ?? "");
        i++;
        continue;
      }
      cur += c;
      continue;
    }
    if (c === "'" || c === '"') {
      q = c;
      cur += c;
      continue;
    }
    const two = cmd.slice(i, i + 2);
    let s = null;
    if (two === "&&" || two === "||") {
      s = two;
      i++;
    } else if (c === ";" || c === "\n") s = ";";
    else if (c === "|") s = "|";
    else if (c === "&" && cmd[i - 1] !== ">" && cmd[i + 1] !== ">") s = "&";
    if (s) {
      if (cur.trim()) {
        parts.push(cur.trim());
        seps.push(sep);
      }
      sep = s;
      cur = "";
      continue;
    }
    cur += c;
  }
  if (cur.trim()) {
    parts.push(cur.trim());
    seps.push(sep);
  }
  return { parts, seps };
}
var PREFIX_RE = /^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+|(?:sudo|time|nice|env|npx|bunx|pnpx|exec|command)\s+|timeout\s+\S+\s+|(?:pnpm|yarn|npm)\s+exec\s+|(?:uv|poetry|pipenv|bundle|hatch|pdm)\s+(?:run|exec)\s+|python3?\s+-m\s+|(?:\.\/)?node_modules\/\.bin\/)/;
function stripPrefixes(seg) {
  let s = seg.trim().replace(/\s+\d?>&?\d?\s*\S*$/g, "").trim();
  for (let n = 0; n < 6; n++) {
    const next = s.replace(PREFIX_RE, "");
    if (next === s) break;
    s = next;
  }
  return s;
}
var SETUP_RE = /^(cd|pushd|popd|export|source|\.|set|unset|ulimit|clear)\b/;
var NOOP_RE = /^(true|:|exit\s+0|echo\b|printf\b)/;
var TEST_RUNNER_RE = /^(?:(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?[\w:.-]*test[\w:.-]*|vitest|jest|mocha|ava|pytest|py\.test|unittest|nose2|go\s+test|cargo\s+(?:test|nextest)|make\s+(?:test|check)|rspec|rake\s+(?:test|spec)|phpunit|deno\s+test|mix\s+test|dotnet\s+test|(?:\.\/)?gradlew?\s+test|mvn\s+(?:test|verify)|node\s+--test|playwright\s+test|ctest|tox|nox|bun\s+test|swift\s+test|zig\s+build\s+test)(?=\s|$)/;
var BUILD_RUNNER_RE = /^(?:tsc|vue-tsc|(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?[\w:.-]*(?:build|lint|typecheck|type-check|tsc|check|types|verify|ci)[\w:.-]*|eslint|ruff(?:\s+check)?|mypy|pyright|flake8|pylint|cargo\s+(?:build|check|clippy)|go\s+(?:build|vet)|golangci-lint|next\s+(?:build|lint)|vite\s+build|make(?:\s+(?:build|all|lint))?|(?:\.\/)?gradlew?\s+build|mvn\s+(?:package|compile)|swift\s+build|xcodebuild|biome\s+(?:check|lint|ci)|prettier\s+--check|clippy)(?=\s|$)/;
var SCRIPT_CHECK_RE = /^(?:(?:node|python3?|bash|sh|ruby|deno\s+run|tsx|ts-node)\s+)?(?:\S*\/)?[\w.-]*(?:test|check|lint|verify|spec)[\w.-]*(?=\s|$)/i;
function runnerKey(s) {
  const w = s.replace(/^(npm|pnpm|yarn|bun)\s+run\s+/, "$1 ").split(/\s+/);
  const two = /^(npm|pnpm|yarn|bun|go|cargo|make|gradle|gradlew|\.\/gradlew|mvn|next|vite|swift|biome|prettier|ruff|zig)$/.test(w[0]) && w[1] && !w[1].startsWith("-");
  return (two ? `${w[0]} ${w[1]}` : w[0]).replace(/:.*/, "");
}
function checkCommand(cmd) {
  const { parts, seps } = splitCommand(cmd);
  for (let i = 0; i < parts.length; i++) {
    const s = stripPrefixes(parts[i]);
    let kind = null;
    let known = true;
    if (TEST_RUNNER_RE.test(s)) kind = "test";
    else if (BUILD_RUNNER_RE.test(s)) kind = runnerKey(s);
    else if (SCRIPT_CHECK_RE.test(s) && !NOOP_RE.test(s) && !/^(cat|ls|grep|rg|find|head|tail|less|git)\b/.test(s)) {
      kind = s.split(/\s+/).slice(0, 2).join(" ");
      known = false;
    }
    if (!kind) continue;
    const before = seps[i];
    const after = seps[i + 1] ?? "";
    const rest = parts.slice(i + 1).map(stripPrefixes);
    const masked = before === "||" || before === "|" || after === ";" || after === "||" || after === "&" || // a later `|| true` or `; exit 0` anywhere in the chain also forces success
    rest.some((r8, j) => (seps[i + 1 + j] === "||" || seps[i + 1 + j] === ";") && NOOP_RE.test(r8));
    const piped = after === "|" && !/set -o pipefail|set -euo pipefail/.test(cmd);
    return { kind, known, piped, masked };
  }
  return null;
}
function commandKind(cmd) {
  const check = checkCommand(cmd);
  if (check) return `check:${check.kind}`;
  for (const p of splitCommand(cmd).parts) {
    const s = stripPrefixes(p);
    if (!s || SETUP_RE.test(s)) continue;
    const words2 = s.split(/\s+/);
    const prog = words2[0].replace(/^.*\//, "");
    if (/^(npm|pnpm|yarn|bun|go|cargo|make|dotnet|gradle|gradlew|mvn|mix|deno|git|docker|kubectl|pip3?|brew|apt|apt-get|gh|uv|poetry|node|python3?|ruby|bash|sh)$/.test(prog))
      return `${prog} ${words2[1] ?? ""}`.trim();
    return prog;
  }
  return null;
}
var BENIGN_KIND_RE = /^(grep|rg|ag|find|fd|ls|which|test|\[|\[\[|diff|cmp|pgrep|pkill|kill|type|command|stat|file|head|tail|cat|wc|sleep|lsof|curl|wget|ps|git (diff|status|log|show|grep|rev-parse|ls-files|branch|stash|remote|fetch|config))$/;
var FAIL_TEXT_RE = /\b[1-9]\d* (?:failed|failing|failures?|errors?)\b|\bFAIL(?:ED|URES?)?\b|\bTests?:\s+[1-9]\d* failed|error TS\d+|AssertionError|Traceback \(most recent call last\)|npm ERR!|panicked at|BUILD FAILED|[✗✕✖] /;
var EMPTY_TEST_RE = /no tests? (?:found|ran|to run|executed)|collected 0 items|\bRan 0 tests\b|no test files|\b0 passing\b|\bTests?:\s+0 total|No test suites? found/i;
var CONFIG_PATH_RE = /(^|[\/\\])(CLAUDE(\.local)?\.md|AGENTS(\.override)?\.md|MEMORY\.md|GEMINI\.md|\.cursorrules)$|[\/\\]\.claude[\/\\](memory|rules|agents|commands|skills)[\/\\]|[\/\\]memory[\/\\][^\/\\]+\.md$/i;
var isConfigPath = (p) => CONFIG_PATH_RE.test(p.trim());
var NON_CODE_RE = /\.(md|mdx|txt|rst|adoc)$/i;
function editPaths(e) {
  if (e.paths?.length) return e.paths;
  if (e.path) return [e.path];
  const m = e.detail.match(/>>?\s*([^\s<>|&;]+)/);
  return m ? [m[1]] : [];
}
function isCodeEdit(e) {
  if (e.category !== "edit") return false;
  const ps = editPaths(e);
  return !ps.length || ps.some((p) => !isConfigPath(p) && !NON_CODE_RE.test(p));
}
var isConfigEdit = (e) => e.category === "edit" && editPaths(e).some(isConfigPath);
var CATCH_TEXT_RE = /\b(i (?:said|told you|asked(?: you)?(?: to| for| not)?)\b|as i said|like i said|you (?:broke|ignored|forgot|missed|deleted|removed|skipped|reverted)\b|(?:tests?|build|lint|tsc|ci|type ?check)\s+(?:is |are |still )?(?:fail\w*|broken|red)\b|still (?:fail\w*|broken|throws|errors?)\b|(?:didn'?t|did not) ask|not (?:that|this) file|leave .{1,40} alone|don'?t (?:touch|change|edit|modify|delete) |shouldn'?t have|wrong (?:file|function|branch)|throws?\b|exception\b|traceback|stack ?trace|error:|is not defined|cannot find|undefined is not|returns? (?:the )?wrong|off by one|regression)/i;
var ERROR_PASTE_RE = /```[\s\S]*?(error|exception|fail|traceback)[\s\S]*?```|^\s*(Error|TypeError|ReferenceError|SyntaxError|FAIL|Traceback)\b/im;
var CORRECTION_TOPICS = [
  ["tests", /\btests?\b|\bspecs?\b|assert/i],
  ["scope", /didn'?t ask|\bonly\b|leave .* alone|don'?t (touch|change|edit)|unrelated|scope/i],
  ["style", /\bstyle|format|naming|indent|comments?\b|convention|lint/i],
  ["tooling", /\b(use|using|run|with) (pnpm|yarn|npm|bun|uv|poetry|pip|cargo|make)\b|instead of/i],
  ["git", /\bcommit|\bbranch|\bpush\b|\bgit\b|\bpr\b/i],
  ["dependencies", /dependenc|\bpackages?\b|librar|\bimports?\b/i],
  ["types", /\btypes?\b|\bany\b|typescript|\bnull\b/i]
];
var correctionTopic = (text) => CORRECTION_TOPICS.find(([, re]) => re.test(text))?.[0] ?? "other";
function trustedChecks(sessions) {
  const n = /* @__PURE__ */ new Map();
  for (const s of sessions)
    for (const e of s.events) {
      if (e.kind !== "tool" || !SHELL_TOOL.test(e.name) || e.category === "edit") continue;
      const c = checkCommand(e.detail);
      if (c && !c.known && !c.masked) n.set(c.kind, (n.get(c.kind) ?? 0) + 1);
    }
  const top = [...n.entries()].sort((a, b) => b[1] - a[1])[0];
  return new Set(top && top[1] >= 2 ? [top[0]] : []);
}
var isHumanPrompt = (e) => e.kind === "prompt" && !e.slash;
function sessionOutcome(sessionId, events, trusted = /* @__PURE__ */ new Set()) {
  const results = /* @__PURE__ */ new Map();
  for (const e of events) if (e.kind === "tool_result" && !results.has(e.id)) results.set(e.id, e);
  const runs = [];
  events.forEach((e, i) => {
    if (e.kind !== "tool") return;
    const res = results.get(e.id);
    const done = !!res && !res.rejected;
    const text = res?.text ?? "";
    const shell = SHELL_TOOL.test(e.name);
    if (shell && e.category !== "edit") {
      if (!["exec", "test", "build", "git"].includes(e.category)) return;
      const c = checkCommand(e.detail);
      const check = !!c && !c.masked && (c.known || trusted.has(c.kind));
      const kind = c ? `check:${c.kind}` : commandKind(e.detail);
      const badText = check && (FAIL_TEXT_RE.test(text) || EMPTY_TEST_RE.test(text));
      runs.push({ i, t: e.t, e, kind, check, done, ok: done && !res.isError && !badText && !(c?.piped && !text.trim()), failed: done && (res.isError || badText) });
    } else if (e.category === "edit") {
      const p = editPaths(e)[0];
      runs.push({ i, t: e.t, e, kind: p ? `edit:${p}` : null, check: false, done, ok: done && !res.isError, failed: done && res.isError });
    }
  });
  let lastEdit = -1;
  let codeEdits = 0;
  for (const r8 of runs) if (r8.e.category === "edit" && isCodeEdit(r8.e)) {
    lastEdit = r8.i;
    codeEdits++;
  }
  let verifiedFinish = false;
  if (lastEdit >= 0) {
    let staged = false;
    for (const r8 of runs) {
      if (r8.i <= lastEdit) continue;
      if (r8.check && r8.ok) {
        verifiedFinish = true;
        break;
      }
      const parts = splitCommand(r8.e.detail).parts.map(stripPrefixes);
      if (parts.some((p) => /^git\s+add\b/.test(p)) && r8.ok) staged = true;
      const commit = parts.find((p) => /^git\s+commit\b/.test(p));
      if (!commit || !r8.ok || /--allow-empty\b/.test(commit)) continue;
      const text = results.get(r8.e.id)?.text ?? "";
      if (/nothing to commit|no changes added to commit|nothing added to commit/i.test(text)) continue;
      if (staged || /(?:^|\s)-(?!-)[a-zA-Z]*a/.test(commit) || /\s--all\b/.test(commit) || /\d+ files? changed/.test(text)) {
        verifiedFinish = true;
        break;
      }
    }
  }
  let errors = 0, unresolved = 0, loops = 0, loopsSteppedIn = 0;
  const counted = runs.filter((r8) => r8.kind && !BENIGN_KIND_RE.test(r8.kind));
  const promptIdx = events.flatMap((e, i) => e.kind === "prompt" || e.kind === "interrupt" ? [i] : []);
  const streaks = /* @__PURE__ */ new Map();
  const closeStreak = (kind, end) => {
    const s = streaks.get(kind);
    if (s && s.n >= 3) {
      loops++;
      if (promptIdx.some((p) => p > s.start && p < end)) loopsSteppedIn++;
    }
    streaks.delete(kind);
  };
  const lastOk = /* @__PURE__ */ new Map();
  counted.forEach((r8, j) => {
    if (r8.ok) lastOk.set(r8.kind, j);
  });
  counted.forEach((r8, j) => {
    const k = r8.kind;
    if (r8.failed) {
      errors++;
      if ((lastOk.get(k) ?? -1) < j) unresolved++;
      const s = streaks.get(k);
      if (s) s.n++;
      else streaks.set(k, { n: 1, start: r8.i });
    } else if (r8.ok) closeStreak(k, r8.i);
  });
  for (const k of [...streaks.keys()]) closeStreak(k, events.length);
  const corrections = [];
  const humanIdx = events.flatMap((e, i) => isHumanPrompt(e) ? [i] : []);
  humanIdx.forEach((p, n) => {
    const ev = events[p];
    if (!promptHabits(ev.text).correction) return;
    const prevStart = n > 0 ? humanIdx[n - 1] : -1;
    const nextEnd = humanIdx[n + 1] ?? events.length;
    const before = runs.filter((r8) => r8.i > prevStart && r8.i < p);
    const failures = before.filter((r8, j) => r8.failed && r8.kind && !BENIGN_KIND_RE.test(r8.kind) && !before.slice(j + 1).some((x) => x.kind === r8.kind && x.ok)).map((r8) => r8.e.detail.slice(0, 160)).slice(0, 5);
    const edited = [...new Set(before.filter((r8) => r8.e.category === "edit").flatMap((r8) => editPaths(r8.e)))].slice(0, 8);
    const rejected = events.slice(prevStart + 1, p).some((e) => e.kind === "tool_result" && e.rejected);
    let agentText = "";
    for (let i = p - 1; i > prevStart && !agentText; i--) {
      const e = events[i];
      if (e.kind === "assistant" && e.text.trim()) agentText = e.text.slice(-600);
    }
    const acted = events.slice(p + 1, nextEnd).some((e) => e.kind === "tool" && ["edit", "exec", "test", "build", "git"].includes(e.category));
    const text = ev.text;
    const mentionsEdited = edited.some((f) => {
      const b = f.split(/[\/\\]/).pop();
      return b.length > 2 && text.includes(b);
    }) && /\b(why did you|don'?t|didn'?t|revert|undo|shouldn'?t)\b/i.test(text);
    const undoAfterEdit = edited.length > 0 && /^\s*(undo|revert)\b/i.test(text);
    const R = rulesFor(langOf(text));
    const evidence = failures.length > 0 || rejected || CATCH_TEXT_RE.test(text) || test(R?.errorText, text) || test(R?.wrongTarget, text) || ERROR_PASTE_RE.test(text) || mentionsEdited || undoAfterEdit;
    corrections.push({ id: `${sessionId}:${p}`, t: ev.t, text: text.slice(0, 600), agentText, failures, edited, rejected, acted, catch: evidence && acted, topic: correctionTopic(text) });
  });
  let configEdits = 0, resets = 0, autoCompactions = 0;
  let lastCompactT = -Infinity;
  let lastManualT = -Infinity;
  for (const e of events) {
    if (e.kind === "tool" && isConfigEdit(e)) configEdits++;
    if (e.kind === "prompt" && e.slash) {
      if (/^\/(init|memory)\b/.test(e.text)) configEdits++;
      if (/^\/(clear|compact|new|reset)\b/.test(e.text)) {
        resets++;
        if (/^\/compact\b/.test(e.text)) lastManualT = e.t;
      }
    }
    if (e.kind === "compact") {
      if (e.t - lastCompactT > 5e3) {
        const auto = e.auto ?? !(e.t - lastManualT < 5 * 6e4);
        if (auto) autoCompactions++;
      }
      lastCompactT = e.t;
    }
  }
  let batches = 0, batchEdits = 0, pending = 0;
  for (const r8 of runs) {
    if (r8.e.category === "edit" && isCodeEdit(r8.e) && !r8.failed) pending++;
    else if (r8.check && r8.done && pending > 0) {
      batches++;
      batchEdits += pending;
      pending = 0;
    }
  }
  if (pending > 0) {
    batches++;
    batchEdits += pending;
  }
  return { codeEdits, verifiedFinish, errors, unresolved, loops, loopsSteppedIn, corrections, configEdits, resets, autoCompactions, batches, batchEdits };
}
function codifiedLessons(items) {
  const xs = [...items].sort((a, b) => a.t - b.t);
  const done = /* @__PURE__ */ new Set();
  xs.forEach((x, i) => {
    if (!x.config) return;
    const before = /* @__PURE__ */ new Map();
    for (const y of xs.slice(0, i)) if (y.topic && y.topic !== "other") before.set(y.topic, (before.get(y.topic) ?? 0) + 1);
    const after = xs.slice(i + 1);
    if (after.filter((y) => y.prompt).length < 10) return;
    for (const [topic, n] of before) if (n >= 2 && !done.has(topic) && !after.some((y) => y.topic === topic)) done.add(topic);
  });
  return done.size;
}

// src/lib/analyzer/runs.ts
var BREAK_MS = 10 * 60 * 1e3;
var isAgent = (e) => e.kind === "assistant" || e.kind === "tool" || e.kind === "tool_result";
function sessionTiming(events) {
  const ord = events.filter((e) => e.t).sort((a, b) => a.t - b.t);
  const resultAt = /* @__PURE__ */ new Map();
  ord.forEach((e, i) => {
    if (e.kind === "tool_result" && !resultAt.has(e.id)) resultAt.set(e.id, i);
  });
  const nextInterrupt = new Array(ord.length + 1).fill(Infinity);
  for (let i = ord.length - 1; i >= 0; i--) nextInterrupt[i] = ord[i].kind === "interrupt" ? i : nextInterrupt[i + 1];
  const runs = [];
  const waits = [];
  const queued = /* @__PURE__ */ new Set();
  let run = null;
  let stoppedAt = -1;
  const inFlight = /* @__PURE__ */ new Set();
  const close = (end, interrupted) => {
    if (run && end > run.start) {
      runs.push({ start: run.start, end, queued: run.queued, interrupted });
      stoppedAt = end;
    }
    run = null;
    inFlight.clear();
  };
  for (let i = 0; i < ord.length; i++) {
    const e = ord[i];
    if (e.kind === "prompt") {
      if (run) {
        const toolRunning = [...inFlight].some((id) => (resultAt.get(id) ?? -1) > i && nextInterrupt[i] > resultAt.get(id));
        if (e.queued || toolRunning) {
          run.queued++;
          queued.add(e);
          continue;
        }
        close(run.last, false);
      }
      if (stoppedAt >= 0) waits.push(e.t - stoppedAt);
      stoppedAt = -1;
      run = { start: e.t, last: e.t, queued: 0 };
    } else if (e.kind === "interrupt") {
      if (run) close(Math.max(run.last, e.t), true);
    } else if (isAgent(e) && run) {
      run.last = e.t;
      if (e.kind === "tool") inFlight.add(e.id);
      else if (e.kind === "tool_result") inFlight.delete(e.id);
    }
  }
  if (run) close(run.last, false);
  return { runs, waits, queued };
}
function medianOf(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// src/lib/analyzer/specificity.ts
var FENCE_RE = /```[\s\S]*?(```|$)/g;
var INLINE_CODE_RE = /`[^`\n]{1,200}`/g;
var URL_RE = /\bhttps?:\/\/\S+/gi;
var PATH_G2 = new RegExp(PATH_RE.source, "g");
var IDENT_RE = /\b([a-z]+[A-Z]\w*|[A-Z][a-z]+[A-Z]\w*|[a-z]+_[a-z_\d]+|[A-Z]{2,}_[A-Z_\d]+|\w+\(\))|(^|\s)--[a-z][\w-]+|(^|\s)\.[a-z]\w+\(/g;
var ERROR_RE = /\b(\w*Error|Exception|Traceback|panicked|segfault|ENOENT|EADDRINUSE|ECONNREFUSED|exit code \d+|status (code )?\d{3}|HTTP \d{3}|\d{3} (error|response)|stack ?trace)\b|^\s*at \S+ \(.*:\d+:\d+\)|error TS\d+|\bFAIL\b/m;
var LINE_REF_RE = /\b(line|lines|L)\s?\d+\b|:\d+(:\d+)?\b/;
var QUOTED_RE = /"[^"\n]{3,120}"|'[^'\n]{3,120}'|“[^”\n]{3,120}”/;
function prose(text) {
  return text.replace(FENCE_RE, " ").replace(/<[^>]{1,200}>/g, " ");
}
var wordsOf = (s) => s.toLowerCase().match(/[a-z0-9][a-z0-9'_-]*/g) ?? [];
var APPROVAL_RE = /^(ok(ay)?|k|yes|yep|yeah|yup|sure|lgtm|looks good|sounds good|good|great|perfect|nice|cool|thanks?|thank you|ty|go( ahead| for it| on)?|continue|proceed|carry on|keep going|do it|ship it|approved?|i approved|confirmed?|done|deploy|merge( it)?|commit( it)?|push( it)?|next|y|right|exactly|correct|agreed|both|all of (them|the above))\b/i;
var QUESTION_START_RE = /^(why|how|what|where|when|which|who|is|are|was|were|does|do|did|should|would|could|will|has|have|can (i|we|it|this|that|you (see|tell|explain|confirm|check whether)))\b/i;
var REQUEST_RE = /\b(can|could|would|will) you (please )?(also )?(add|make|change|update|fix|remove|delete|create|build|write|implement|refactor|rename|move|put|take|set|try|run|help|look|investigate|redo|show|give)\b|\b(please|let'?s|i want|i'd like|we need|i need)\b/i;
function kindOf(p, n, R) {
  const t = p.trim().replace(/^[\s,.!-]+/, "");
  if (!R) {
    if (n <= 8 && APPROVAL_RE.test(t) && !TASK_VERB_RE.test(t.replace(APPROVAL_RE, ""))) return "approval";
    if (/\?\s*$/.test(t) && QUESTION_START_RE.test(t) && !REQUEST_RE.test(t)) return "question";
    return "task";
  }
  const approves = (re) => {
    if (!re.test(t)) return false;
    const rest = t.replace(re, "");
    return !TASK_VERB_RE.test(rest) && !R.taskVerb.test(rest);
  };
  if (n <= 8 && (approves(APPROVAL_RE) || approves(R.approval))) return "approval";
  if (/[?？]\s*$/.test(t) && (QUESTION_START_RE.test(t) || R.question.test(t)) && !REQUEST_RE.test(t) && !R.request.test(t)) return "question";
  return "task";
}
var TASK_VERB_RE = /\b(add|implement|build|create|write|fix|refactor|rename|remove|delete|drop|update|change|make|move|migrate|support|handle|set ?up|deploy|optimi[sz]e|improve|clean ?up|convert|port|replace|extract|debug|investigate|look into|figure out|find out|test|split|merge|wire|hook|expose|show|hide|display|render|allow|prevent|validate|parse|generate|redesign|rewrite|upgrade|bump|document|speed up|reduce|increase|limit|cache|log|track|send|store|load|fetch|sort|filter|group|center|align|style|resize|rotate|animate|translate)\b/i;
var OUTCOME_RE = /\b(i want|i'd like|i would like|we want|we need|i need|the goal|goal is|our goal|so that|in order to|so (users?|people|we|i|it|they) (can|could|don'?t|won'?t)|(users?|people|visitors|customers) (can|should|need|want)|should be able to|the (point|idea|aim|purpose) is|we'?re trying to|i'?m trying to|the problem is|because|objective|use case|for (users|people) to)\b/i;
var DEICTIC_OBJ_RE = /^(this|that|it|these|those|them|the (issue|problem|bug|error|thing|stuff|one))$/i;
var CRITERIA_SIGNALS = [
  ["tests", /\b(tests?|specs?) (must |should |all )?(pass|passing|green)|\b(make|get|keep) (the )?(tests?|ci|build) (pass|green)|\buntil (the )?(tests?|it|build) pass|\b(add|write|with|include) (a |an |some |unit |integration |e2e )?(tests?|test cases?|specs?)\b|\btest (for|that|it)\b/i],
  ["expect", /\bshould (return|output|print|equal|be|show|display|render|include|contain|have|accept|reject|throw|fail|pass|allow|block|take|load|work when|look like|match|stay|remain|not)\b|\bexpect(ed|s)?\b|\bmust (not )?(be|return|have|pass|include|work|stay|handle|support)\b|\binstead of\b.{0,40}\b(show|return|display)/i],
  ["done", /\b(done when|definition of done|acceptance criteria|acceptance test|success (criteria|looks like)|it'?s done|finished when|until it|you'?re done when)\b/i],
  ["example", /\b(e\.g\.|for example|for instance|example:|such as|like this:)|(->|=>|→)\s*\S|\bgiven\b.{1,80}\b(then|return|expect)/i],
  ["verify", /\b(make sure|ensure|verify|confirm (that|it)|check (that|it)|double[- ]check|without breaking|no regressions?|don'?t break|still (work|pass)s?)\b/i],
  ["limits", /\b(at most|at least|no more than|fewer than|less than|under|within|below|above|max(imum)?|min(imum)?)\s+\d|\b\d+(\.\d+)?\s?(ms|s|sec|seconds|minutes|mb|kb|gb|%|px|req\/\w+|requests?|rps|items|rows|chars|characters|lines)\b|\b(status|return|respond with|returns?)\s+\d{3}\b/i],
  ["edge", /\bedge cases?|corner cases?|empty (input|list|string|array)|null (input|values?)|invalid (input|dates?|values?)|when (it'?s|the input is) (empty|missing|null)/i]
];
var HOW_SIGNALS = [
  ["line", /\b(on |at |in )?line\s?\d+\b|\blines? \d+\s?(-|to)\s?\d+/i],
  ["replace", /\b(change|replace|swap|rename|set)\s+[`'"]?[\w.$()[\]-]+[`'"]?\s+(to|with|into|=)\s+[`'"]?[\w.$()[\]-]+/i],
  ["use", /\buse\s+[`'"]?[\w.@/-]+[`'"]?\s+instead of\b|\b(call|invoke)\s+`?\w+(\(\))?`?\s+(from|in|inside|before|after)\b/i],
  ["insert", /\b(add|insert|put|append|prepend)\s+(a |an |the )?(line|import|call|param(eter)?|argument|field|column|prop(erty)?|method|function|class|variable|const|check|if|guard|try|catch|return|key|attribute|flag)\b.{0,60}\b(to|in|into|at|before|after|inside)\b/i],
  ["wrap", /\b(wrap|move|extract|inline|hoist)\s+[`'"]?[\w.$()-]+[`'"]?\s+(in|into|to|out of|from)\b/i],
  ["sequence", /\b(first|step 1|1\.)\b[\s\S]{3,200}\b(then|next|after that|step 2|2\.)\b[\s\S]{3,200}\b(then|finally|lastly|step 3|3\.)\b/i],
  ["code", /\b(like this|as follows|this code|the following code|paste this|exactly this)\s*:?\s*$/im]
];
var STEP_LINE_RE = /^\s*(\d+[.)]|[-*•])\s+(add|change|replace|rename|move|create|delete|remove|set|update|call|use|import|wrap|extract|insert|put|make|write|run|edit|open|modify)\b/gim;
var VAGUE_PATTERNS = [
  ["deictic-fix", /\b(fix|solve|sort out|handle|repair|debug|redo|do|change|update|improve|clean up|look at|check)\s+(this|that|it|these|those|them|the (issue|problem|bug|error|thing|stuff))\b/i],
  ["make-it-work", /\bmake (it|this|that|them) (work|right|better|good|nicer|correct|pass)\b/i],
  ["still-broken", /\b(it'?s |it is |that'?s |this is )?still (broken|failing|not working|doesn'?t work|wrong|bad|the same|happening|there|an issue|a problem|not fixed|not right|off)\b|^\s*still\W*$/i],
  ["doesnt-work", /\b(it|this|that)(\s+(still|just))? (doesn'?t|does not|isn'?t|is not|didn'?t|did not|won'?t) (work|working|load|run)\b|^\s*(doesn'?t|not|didn'?t) work(ing)?\b|\b(it'?s|this is|that'?s) (broken|wrong|not working)\b/i],
  ["try-again", /^\s*(try again|again|retry|one more time|redo( it)?|nope|wrong|no+)\W*$/i],
  ["same-issue", /\b(same|similar) (issue|problem|error|thing|bug)\b|\bthe (issue|problem|error|bug) (is )?(still|persists)\b/i],
  ["bare-fix", /^\s*(please\s+)?(fix|fix it|fix pls|fix please|make it work|do it properly|do better)\W*$/i]
];
var VAGUE_LEXICON = new Set(
  "this that it its these those them the a an thing things stuff issue issues problem problems bug bugs error errors one ones fix fixed fixing make made work works working worked doesn't doesnt does not isn't isnt didn't didnt won't still again please pls just now ok okay so and but no nope yes wrong broken failing fail fails bad same similar there here try retry redo do done is was are be been can you could would should i we me my right better good properly anymore yet any some something somehow way also even really very too as to of in on for with at up out off".split(/\s+/)
);
var REDO_RE = /^\s*(no+\b|nope|wrong|incorrect|undo|revert|roll ?back|not (that|this|it|quite|what)|that'?s (not|wrong|incorrect)|this (is|isn'?t) (wrong|right|it)|still\b|actually,? (no|that|it|you)|wait,? (no|that|you))|\bi (meant|said|asked( for| you)?)\b|\bnot what i (meant|asked|wanted|said)\b|\bthat'?s not (it|right|what)\b|\byou (broke|missed|forgot|ignored|didn'?t)\b|\b(wrong|the other) (file|one|place|thing|element|button|function|component|page|section|field)\b|\b(try|do it) again\b|\bstill (broken|failing|not|wrong|the same|bad|doesn'?t|looks|there|happening)\b|\b(doesn'?t|didn'?t|does not|did not|isn'?t|still not) (work|fix|change|help|look right)\b|\bsame (issue|problem|error|bug)\b|\b(undo|revert) (that|this|it|the|your|those|these)\b|\bput it back\b|\bgo back to\b/i;
var DIRECTION_RE = /\b(on second thought|changed my mind|change of plan|new requirement|let'?s (instead|try|go with|switch|change|do)|instead,? let'?s|actually,? let'?s|what if we|i'?ve decided|i decided|now that i see|seeing (it|this)|after seeing|scratch that,? (let'?s|we)|i'?d rather|let'?s rather|pivot)\b/i;
var ALSO_RE = /^\s*(also|and also|additionally|now|next|then|ok(ay)?,? now|great,? now|thanks!? now|can you also|could you also|one more thing)\b/i;
var OPENING_CHARS = 240;
var level = (n, two) => n >= two ? 2 : n >= 1 ? 1 : 0;
var CJK_ASCII = /([\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af\uff00-\uffef])([!-~])/g;
var ASCII_CJK = /([!-~])([\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af\uff00-\uffef])/g;
var specCache = /* @__PURE__ */ new Map();
var SPEC_CACHE_MAX = 2e3;
function promptSpec(text) {
  const hit = specCache.get(text);
  if (hit) return hit;
  const s = readPrompt(text);
  if (specCache.size >= SPEC_CACHE_MAX) specCache.clear();
  specCache.set(text, s);
  return s;
}
function readPrompt(text) {
  const fences = text.match(FENCE_RE) ?? [];
  const lang = langOf(text);
  if (!isMeasured(lang)) return unmeasured(text, lang);
  const R = rulesFor(lang);
  const p = R && (lang === "zh" || lang === "ja" || lang === "ko") ? prose(text).replace(CJK_ASCII, "$1 $2").replace(ASCII_CJK, "$1 $2") : prose(text);
  const words2 = R ? wordsIn(p) : wordsOf(p);
  const n = R ? Math.round(words2.length * R.wordScale) : words2.length;
  const kind = kindOf(p, n, R);
  const inline = p.match(INLINE_CODE_RE) ?? [];
  const plain = p.replace(INLINE_CODE_RE, " ").replace(URL_RE, " ");
  const paths = (plain.match(PATH_G2) ?? []).length;
  const idents = (plain.match(IDENT_RE) ?? []).length;
  const urls = (p.match(URL_RE) ?? []).length;
  const errorPaste = ERROR_RE.test(text) && (fences.length > 0 || text.split("\n").length >= 3 || /\b\w*Error:|Traceback/.test(text));
  const codeFence = fences.some((f) => f.split("\n").length >= 3);
  const lineRef = LINE_REF_RE.test(plain);
  const quoted = QUOTED_RE.test(plain);
  const refs = paths + idents + inline.length + urls + fences.length + (lineRef ? 1 : 0) + (quoted ? 1 : 0) + (errorPaste ? 1 : 0);
  const context = errorPaste || codeFence ? 2 : level(refs, 3);
  const crit = CRITERIA_SIGNALS.filter(([, re]) => re.test(p)).map(([k]) => k);
  if (R) {
    for (const [k, re] of R.criteria) if (!crit.includes(k) && re.test(p)) crit.push(k);
  }
  const criteria = kind === "task" ? level(crit.length + (crit.includes("done") ? 1 : 0), 2) : 0;
  const steps2 = (p.match(STEP_LINE_RE) ?? []).length;
  const how = HOW_SIGNALS.filter(([, re]) => re.test(p)).length + (fences.length && !errorPaste && /\b(add|use|change|replace|like|to|with)\b[^.\n]{0,40}:?\s*$/im.test(p.split("```")[0] ?? "") ? 1 : 0);
  const prescriptive = kind !== "task" ? 0 : steps2 >= 2 ? 2 : level(how, 2);
  const vagueBy = kind === "task" ? VAGUE_PATTERNS.filter(([, re]) => re.test(p)).map(([k]) => k) : [];
  if (R && kind === "task") {
    for (const [k, re] of R.vague) if (!vagueBy.includes(k) && re.test(p)) vagueBy.push(k);
  }
  const filler = (w) => VAGUE_LEXICON.has(w) || !!R?.lexicon.has(w);
  const content = words2.filter((w) => !filler(w) && w.length > 1);
  const anchored = refs > 0;
  const vague = vagueBy.length > 0 && !anchored && n <= 15 && content.length <= 3;
  const verb = TASK_VERB_RE.exec(p);
  let goal = 0;
  if (kind === "task" && !vague) {
    const after = verb ? wordsOf(p.slice(verb.index + verb[0].length)).filter((w) => !/^(the|a|an|me|us|please|also|now|it)$/.test(w)) : [];
    let objectNamed = verb ? after.length > 0 && !(after.length <= 2 && DEICTIC_OBJ_RE.test(after.join(" "))) : false;
    if (R && !objectNamed && R.taskVerb.test(p)) {
      let rest = p;
      for (const re of [R.taskVerb, R.revert, R.redo]) rest = rest.replace(new RegExp(re.source, re.flags + "g"), " ");
      objectNamed = refs > 0 || wordsIn(rest).some((w) => !filler(w) && w.length > 1);
    }
    if ((OUTCOME_RE.test(p) || test(R?.outcome, p)) && n >= 6) goal = 2;
    else if (objectNamed || n >= 12) goal = 1;
    if (goal === 1 && criteria >= 1 && n >= 10) goal = 2;
  }
  const opening = p.trim().slice(0, OPENING_CHARS);
  const openingEn = R?.falseFriends ? opening.replace(R.falseFriends, " ") : opening;
  const correction = kind !== "approval" && (REDO_RE.test(openingEn) || test(R?.redo, opening));
  const newDirection = DIRECTION_RE.test(openingEn) || test(R?.direction, opening) || !correction && (ALSO_RE.test(openingEn) || test(R?.also, opening));
  let style = "none";
  if (kind === "task") {
    if (vague) style = "vague";
    else if (prescriptive === 2) style = "prescriptive";
    else if (goal >= 1 && criteria >= 1) style = "outcome";
    else if (context >= 1) style = "contextual";
    else style = "bare";
  }
  return { kind, words: words2.length, goal, criteria, context, prescriptive, vague, vagueBy, correction, newDirection, style, lang, measured: true };
}
function unmeasured(text, lang) {
  return { kind: "task", words: wordsIn(prose(text)).length, goal: 0, criteria: 0, context: 0, prescriptive: 0, vague: false, vagueBy: [], correction: false, newDirection: false, style: "none", lang, measured: false };
}
var emptySpecificity = () => ({ taskPrompts: 0, vaguePrompts: 0, goalPrompts: 0, criteriaPrompts: 0, contextPrompts: 0, prescriptivePrompts: 0, outcomeBriefs: 0 });
function specificityCounts(events, into = emptySpecificity()) {
  for (const e of events) {
    if (e.kind !== "prompt" || e.slash) continue;
    const s = promptSpec(e.text);
    if (!s.measured) {
      into.unmeasuredPrompts = (into.unmeasuredPrompts ?? 0) + 1;
      continue;
    }
    if (s.vague) into.vaguePrompts++;
    if (s.kind !== "task") continue;
    into.taskPrompts++;
    if (s.goal === 2) into.goalPrompts++;
    if (s.criteria >= 1) into.criteriaPrompts++;
    if (s.context >= 1) into.contextPrompts++;
    if (s.prescriptive === 2) into.prescriptivePrompts++;
    if (s.style === "outcome") into.outcomeBriefs++;
  }
  return into;
}

// src/lib/analyzer/churn.ts
var emptyChurn = () => ({ workTurns: 0, redoCycles: 0, avoidableRedos: 0, vagueRedos: 0, redoTokens: 0, redoMinutes: 0, workTokens: 0 });
var IDLE_GAP_MS = 10 * 60 * 1e3;
var STOP = new Set("the a an to of in on for and or but with this that it is are be can you please i we me my just now also so then do make add".split(" "));
function contentWords(s) {
  const R = rulesFor(langOf(s));
  if (R) return new Set(wordsIn(prose(s)).filter((w) => w.length >= 2 && !STOP.has(w) && !R.lexicon.has(w)));
  return new Set((s.toLowerCase().match(/[a-z0-9_]{3,}/g) ?? []).filter((w) => !STOP.has(w)));
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / (a.size + b.size - n);
}
var linesOf = (s) => (s ?? "").split("\n").map((l) => l.trim()).filter((l) => l.length >= 8 && !/^[\s{}()[\];,]*$/.test(l));
var editFiles = (e) => e.paths?.length ? e.paths : e.path ? [e.path] : [];
var GIT_REVERT_RE = /\bgit\s+(checkout\s+(--\s+)?\S*\.\w+|checkout\s+--\s|restore\b|reset\s+--hard|revert\b)/;
var REVERT_ASK_RE = /\b(undo|revert|roll ?back|put (it|that|them) back|go back to|restore (the|it|what))\b/i;
var WRONG_TARGET_RE = /\b(not (that|this) (one|file|function|button|page|component|section|thing|part)|wrong (file|one|place|thing|element|button|function|component|page|section|field)|the other (one|file|button|page)|i (meant|was talking about|'m talking about)|not what i (meant|asked))\b/i;
var ERROR_TEXT_RE = /\b(\w*Error|exception|traceback|crash(es|ed)?|throws?|fail(s|ed|ing)?|500|undefined is not|cannot find|is not defined|still (broken|failing|not working)|(doesn'?t|does not|isn'?t|not) working|doesn'?t work)\b/i;
var continues = (s) => s.kind === "approval";
function turnsOf(events) {
  const results = /* @__PURE__ */ new Map();
  for (const e of events) if (e.kind === "tool_result" && !results.has(e.id)) results.set(e.id, e);
  const turns = [];
  let cur = null;
  let lastAgent = 0;
  let active = 0;
  const failing = /* @__PURE__ */ new Map();
  const close = () => {
    if (!cur) return;
    cur.minutes = active / 6e4;
    cur.endedBadly = cur.endedBadly || [...failing.values()].some(Boolean);
    failing.clear();
  };
  events.forEach((e, i) => {
    if (e.kind === "prompt") {
      if (e.slash) return;
      const spec = promptSpec(e.text);
      if (cur && continues(spec)) return;
      close();
      cur = { i, t: e.t, spec, words: contentWords(e.text), files: /* @__PURE__ */ new Set(), edits: [], gitRevert: false, endedBadly: false, tokens: 0, minutes: 0 };
      lastAgent = e.t;
      active = 0;
      turns.push(cur);
      return;
    }
    if (!cur) return;
    const c = cur;
    if (e.t && lastAgent && e.t > lastAgent && e.t - lastAgent < IDLE_GAP_MS) active += e.t - lastAgent;
    if (e.t) lastAgent = Math.max(lastAgent, e.t);
    if (e.kind === "assistant") {
      if (e.usage) c.tokens += e.usage.input + e.usage.cacheWrite + e.usage.output;
    } else if (e.kind === "tool") {
      const res = results.get(e.id);
      if (res?.rejected) c.endedBadly = true;
      if (e.category === "edit") {
        if (res?.isError) return;
        c.edits.push(e);
        for (const f of editFiles(e)) c.files.add(f);
        for (const f of e.deleted ?? []) c.files.add(f);
      } else if (e.category === "git" || e.category === "exec") {
        if (GIT_REVERT_RE.test(e.detail)) c.gitRevert = true;
      }
      if (["exec", "test", "build"].includes(e.category) && res && !res.rejected) {
        const kind = checkCommand(e.detail)?.kind ?? e.detail.split(/\s+/).slice(0, 2).join(" ");
        failing.set(kind, res.isError);
      }
    }
  });
  close();
  return turns;
}
var isWork = (t) => t.edits.length > 0 || t.gitRevert;
function sessionChurn(events) {
  const turns = turnsOf(events);
  const cycles = [];
  const written = /* @__PURE__ */ new Map();
  const removed = /* @__PURE__ */ new Map();
  const work = [];
  let unmeasured2 = 0;
  turns.forEach((t, k) => {
    if (!isWork(t)) return;
    const prior = work.slice(-3);
    if (!t.spec.measured) unmeasured2++;
    else if (prior.length) {
      let origin = prior[prior.length - 1];
      for (let j = prior.length - 1; j >= 0; j--) if ([...turns[prior[j]].files].some((f) => t.files.has(f))) {
        origin = prior[j];
        break;
      }
      let overwrote = false;
      let restored = false;
      for (const e of t.edits)
        for (const f of editFiles(e)) {
          const w = written.get(f);
          const r8 = removed.get(f);
          const old = linesOf(e.old);
          const neu = linesOf(e.written);
          if (w && old.some((l) => w.has(l))) overwrote = true;
          if (w && r8 && old.length && neu.length && old.filter((l) => w.has(l)).length / old.length >= 0.6 && neu.filter((l) => r8.has(l)).length / neu.length >= 0.6) restored = true;
        }
      const s = t.spec;
      const repeat = turns.slice(Math.max(0, k - 5), k).some((p) => t.words.size >= 3 && jaccard(t.words, p.words) >= 0.6);
      const text = promptText(events, t);
      const R = rulesFor(s.lang);
      const wrongTarget = WRONG_TARGET_RE.test(text) || test(R?.wrongTarget, text);
      const revert = REVERT_ASK_RE.test(text) || test(R?.revert, text) || restored || t.gitRevert && s.correction;
      const trigger = revert ? "revert" : s.correction ? "correction" : repeat ? "repeat" : overwrote ? "overwrite" : null;
      if (trigger) {
        const kind = trigger === "overwrite" || s.newDirection && !wrongTarget ? "iteration" : "avoidable";
        const before = turns[k - 1];
        const cause = kind === "iteration" ? null : wrongTarget ? "wrong-target" : before?.endedBadly || turns[origin].endedBadly || ERROR_TEXT_RE.test(text) || test(R?.errorText, text) ? "agent-error" : "underspecified";
        cycles.push({
          turn: k,
          origin,
          trigger,
          kind,
          cause,
          originVague: turns[origin].spec.vague,
          triggerVague: s.vague,
          files: [...t.files].slice(0, 8),
          tokens: t.tokens,
          minutes: Math.round(t.minutes * 10) / 10
        });
      }
    }
    work.push(k);
    for (const e of t.edits)
      for (const f of editFiles(e)) {
        const w = written.get(f) ?? /* @__PURE__ */ new Map();
        const r8 = removed.get(f) ?? /* @__PURE__ */ new Map();
        for (const l of linesOf(e.written)) w.set(l, k);
        for (const l of linesOf(e.old)) r8.set(l, k);
        written.set(f, w);
        removed.set(f, r8);
      }
  });
  return { turns, workTurns: work.length - unmeasured2, unmeasuredWorkTurns: unmeasured2, cycles };
}
function promptText(events, t) {
  const e = events[t.i];
  return e.kind === "prompt" ? prose(e.text).trim().slice(0, OPENING_CHARS) : "";
}
function churnCounts(events, into = emptyChurn()) {
  const c = sessionChurn(events);
  into.workTurns += c.workTurns;
  if (c.unmeasuredWorkTurns) into.unmeasuredWorkTurns = (into.unmeasuredWorkTurns ?? 0) + c.unmeasuredWorkTurns;
  for (const t of c.turns) if (isWork(t)) into.workTokens += t.tokens;
  for (const y of c.cycles) {
    into.redoCycles++;
    if (y.kind !== "avoidable") continue;
    into.avoidableRedos++;
    if (y.originVague) into.vagueRedos++;
    into.redoTokens += y.tokens;
    into.redoMinutes += y.minutes;
  }
  return into;
}

// src/lib/analyzer/lexicon.ts
var current = null;
var getLexicon = () => current;

// src/lib/analyzer/typos.ts
var emptyTypos = () => ({ englishPrompts: 0, otherLanguagePrompts: 0, typoWordsChecked: 0, typos: 0 });
var FENCE_RE2 = /```[\s\S]*?(```|$)/g;
var INLINE_RE = /`[^`\n]*`?/g;
var URL_RE2 = /\b(https?:\/\/|www\.)\S+/gi;
var TAG_RE = /<[^>\n]{1,200}>/g;
var CODEY_RE = /[0-9_/\\@#=<>{}[\]()|$%^&*+~`]|[a-z]\.[a-z]|[a-z]:[a-z]/i;
var WORD_RE = /^[A-Za-z]+(?:'[A-Za-z]+)?$/;
var EDGE_RE = /^[\s"'“”‘’([{«*_.,;:!?…-]+|[\s"'“”‘’)\]}»*_.,;:!?…-]+$/g;
var LETTER_RE = new RegExp("\\p{L}", "gu");
var LATIN_RE = new RegExp("\\p{Script=Latin}", "gu");
var FUNCTION_WORDS = new Set("the and to of is it that for you this with be are was have can what not but we they would should could will just how which there their when your my our if then than so please".split(" "));
function proseWords(text) {
  const plain = text.replace(FENCE_RE2, "\n").replace(TAG_RE, " ").replace(INLINE_RE, " ").replace(URL_RE2, " ").replace(/[’‘]/g, "'");
  const out = [];
  let start = true;
  for (const line of plain.split("\n")) {
    start = true;
    for (const raw of line.split(/\s+/)) {
      if (!raw) continue;
      const ends = /[.!?:]["')\]]*$/.test(raw);
      if (/^([-*•>#]+|\d+[.)])$/.test(raw)) continue;
      const t = raw.replace(EDGE_RE, "");
      if (t && !raw.startsWith("-") && !CODEY_RE.test(t)) {
        for (const part of t.split(/-+/)) if (WORD_RE.test(part)) out.push({ w: part, start });
      }
      start = ends;
    }
  }
  return out;
}
var AZ = "abcdefghijklmnopqrstuvwxyz";
function edits1(w) {
  const out = [];
  for (let i = 0; i < w.length - 1; i++) if (w[i] !== w[i + 1]) out.push(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2));
  for (let i = 0; i < w.length; i++) out.push(w.slice(0, i) + w.slice(i + 1));
  for (let i = 0; i <= w.length; i++) for (const c of AZ) out.push(w.slice(0, i) + c + w.slice(i));
  for (let i = 0; i < w.length; i++) for (const c of AZ) if (c !== w[i]) out.push(w.slice(0, i) + c + w.slice(i + 1));
  return out;
}
var GLUE = new Set("a an the to of in on at is it for and or you we i that this with be by as my your".split(" "));
var verdicts = /* @__PURE__ */ new WeakMap();
function fixesFor(lex, w) {
  let cache3 = verdicts.get(lex);
  if (!cache3) verdicts.set(lex, cache3 = /* @__PURE__ */ new Map());
  const hit = cache3.get(w);
  if (hit !== void 0) return hit;
  let out = null;
  if (w.length >= 3 && w.length <= 24 && !lex.known(w)) {
    const need = w.length <= 5 ? 2 : 1;
    const fixes = [];
    for (let i = 1; i < w.length; i++) {
      const a = w.slice(0, i), b = w.slice(i);
      if (GLUE.has(a) && b.length >= 3 && lex.tier(b) === 2 || GLUE.has(b) && a.length >= 3 && lex.tier(a) === 2) fixes.push(`${a} ${b}`);
    }
    for (const e of new Set(edits1(w))) if (e.length >= 2 && lex.tier(e) >= need) fixes.push(e);
    out = fixes.length ? fixes : null;
  }
  if (cache3.size > 2e5) cache3.clear();
  cache3.set(w, out);
  return out;
}
function languageOf(text, lex, words2 = proseWords(text)) {
  const prose2 = text.replace(FENCE_RE2, " ").replace(INLINE_RE, " ").replace(URL_RE2, " ");
  const letters = (prose2.match(LETTER_RE) ?? []).length;
  if (letters >= 12 && (prose2.match(LATIN_RE) ?? []).length / letters < 0.7) return "other";
  const ws2 = words2.map((x) => x.w.toLowerCase());
  if (ws2.length < 4) return "unknown";
  const known = ws2.filter((w) => lex.known(w)).length / ws2.length;
  const fn = ws2.filter((w) => FUNCTION_WORDS.has(w)).length;
  if (known >= 0.7 || known >= 0.55 && fn >= 2 || fn / ws2.length >= 0.15) return "english";
  return "other";
}
function typoCounts(texts, lex) {
  return scan(texts, lex).counts;
}
function scan(texts, lex) {
  const counts = emptyTypos();
  const freq = /* @__PURE__ */ new Map();
  const prompts = [];
  for (const text of texts) {
    const words2 = proseWords(text);
    const lang = languageOf(text, lex, words2);
    if (lang === "other") {
      counts.otherLanguagePrompts++;
      continue;
    }
    if (lang === "english") counts.englishPrompts++;
    const cands = [];
    for (const { w, start } of words2) {
      const lw = w.toLowerCase();
      freq.set(lw, (freq.get(lw) ?? 0) + 1);
      if (w !== lw && (!start || /[A-Z]/.test(w.slice(1)))) continue;
      const fixes = fixesFor(lex, lw);
      if (fixes) cands.push({ w: lw, fixes });
    }
    counts.typoWordsChecked += words2.length;
    prompts.push({ cands, words: words2.length });
  }
  const best = /* @__PURE__ */ new Map();
  const consistent = (w, fixes) => {
    let fix = fixes[0], top2 = -1;
    for (const f of fixes) {
      const n2 = f.split(" ").reduce((m, x) => Math.min(m, freq.get(x) ?? 0), Infinity);
      if (n2 > top2) {
        top2 = n2;
        fix = f;
      }
    }
    best.set(w, fix);
    const n = freq.get(w) ?? 0;
    return n >= 3 && n >= top2;
  };
  const kept = /* @__PURE__ */ new Map();
  const per2 = /* @__PURE__ */ new Map();
  let worst = null;
  for (const p of prompts) {
    let k = 0;
    for (const c of p.cands) {
      let keep = kept.get(c.w);
      if (keep === void 0) kept.set(c.w, keep = !consistent(c.w, c.fixes));
      if (!keep) continue;
      k++;
      per2.set(c.w, (per2.get(c.w) ?? 0) + 1);
    }
    counts.typos += k;
    if (k && (!worst || k > worst.typos || k === worst.typos && p.words < worst.words)) worst = { typos: k, words: p.words };
  }
  let top = null;
  for (const [w, n] of per2) if (!top || n > top.count || n === top.count && w.length > top.word.length) top = { word: w, fix: best.get(w), count: n };
  return { counts, top, worst, per: per2, best };
}

// src/lib/analyzer/fun-counts.ts
var emptyFunCounts = () => ({ keepGoingPrompts: 0, thinkHardPrompts: 0, praiseWords: 0, longestPromptWords: 0, absolutelyRight: 0 });
var FENCED = /```[\s\S]*?(```|$)/g;
var proseOf = (text) => text.replace(FENCED, " ");
var LEAD = "(?:(?:ok(?:ay)?|k|yes|yep|yeah|sure|alright|right|cool|nice|good|great|perfect|thanks|thank you|ty|please|pls|plz|now|so|and|then)[\\s,.!]+)*";
var TAIL = "(?:[\\s,.!]+(?:please|pls|plz|thanks|thank you|ty|then|now|again|from here|from there|where you left off|with (?:the |that |this )?(?:task|work|plan|it|that|this))+)*";
var CORE = "(?:continue|cont|keep going|keep at it|keep working|go on|carry on|resume|don'?t stop)";
var KEEP_GOING_RE = new RegExp(`^${LEAD}${CORE}${TAIL}[\\s.!\u2026]*$`, "i");
function isKeepGoing(text) {
  const t = proseOf(text).replace(/[’]/g, "'").trim();
  return t.length > 0 && t.length <= 80 && KEEP_GOING_RE.test(t);
}
var THINK_HARD_RE = /\b(ultrathink|megathink|think\s+(?:(?:really|very|extra|super)\s+)?hard(?:er)?|think\s+harder)\b/i;
var asksToThinkHard = (text) => THINK_HARD_RE.test(proseOf(text));
var PRAISE_RE2 = /\b(perfect|great)\b(?![-_.(]\w)/gi;
var praiseIn = (text) => (proseOf(text).match(PRAISE_RE2) ?? []).length;
var ABSOLUTELY_RIGHT_RE = /\byou(?:'|’)?re\s+absolutely\s+right\b|\byou\s+are\s+absolutely\s+right\b/i;
var saysAbsolutelyRight = (text) => ABSOLUTELY_RIGHT_RE.test(text);
function funCounts(events, into = emptyFunCounts()) {
  for (const e of events) {
    if (e.kind === "prompt") {
      if (e.slash) continue;
      if (isKeepGoing(e.text)) into.keepGoingPrompts++;
      if (asksToThinkHard(e.text)) into.thinkHardPrompts++;
      into.praiseWords += praiseIn(e.text);
      into.longestPromptWords = Math.max(into.longestPromptWords, countWords(proseOf(e.text)));
    } else if (e.kind === "assistant" && e.text && saysAbsolutelyRight(e.text)) {
      into.absolutelyRight++;
    }
  }
  return into;
}

// src/lib/analyzer/verbosity.ts
var ROUND_TRIP_WORDS = 15;
var BASE_WORDS = 8;
var WORDS_PER_POINT = 14;
var WORDS_PER_STEP_DOUBLING = 2;
var emptyVerbosity = () => ({ briefRequests: 0, briefsFirstTime: 0, briefFollowUps: 0, briefWords: 0, briefSpentWords: 0, briefNeededWords: 0 });
var STOP2 = new Set("the a an to of in on for and or but with this that it is are be can you please i we me my just now also so then do make add".split(" "));
var contentWords2 = (s) => new Set((s.toLowerCase().match(/[a-z0-9_]{3,}/g) ?? []).filter((w) => !STOP2.has(w)));
function similar(a, b) {
  if (a.size < 3 || !b.size) return false;
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / (a.size + b.size - n) >= 0.6;
}
var neededFor = (points, steps2) => BASE_WORDS + WORDS_PER_POINT * points + WORDS_PER_STEP_DOUBLING * Math.log2(1 + steps2);
function verbosityCounts(events, lex, into = emptyVerbosity()) {
  let cur = null;
  const close = () => {
    if (!cur || !cur.english) return;
    into.briefRequests++;
    if (!cur.followUps) into.briefsFirstTime++;
    into.briefFollowUps += cur.followUps;
    into.briefWords += cur.words;
    into.briefSpentWords += cur.words + ROUND_TRIP_WORDS * cur.followUps;
    into.briefNeededWords += neededFor(cur.points, cur.steps);
  };
  for (const e of events) {
    if (e.kind === "tool") {
      if (cur) cur.steps++;
      continue;
    }
    if (e.kind !== "prompt" || e.slash) continue;
    const s = promptSpec(e.text);
    if (s.kind !== "task") continue;
    const content = contentWords2(e.text);
    if (cur && (s.vague || s.correction && !s.newDirection || similar(content, cur.content))) {
      cur.followUps++;
      cur.words += s.words;
      continue;
    }
    close();
    cur = { words: s.words, points: s.goal + s.criteria + s.context, steps: 0, followUps: 0, content, english: languageOf(e.text, lex) !== "other" };
  }
  close();
  return into;
}

// src/lib/redact-paths.ts
var NOT_PERSONAL = /* @__PURE__ */ new Set(["shared", "guest", "linuxbrew", "public", "default", "default user", "all users", "defaultuser0", ".localized", "[user]"]);
var NOT_A_BARE_NAME = new Set(
  "test tests spec specs src app apps dev user users admin administrator root runner vagrant docker node home build dist data code work project projects www git guest shared public default ubuntu debian centos fedora ec2-user pi lib bin tmp var opt etc main master local server client web api docs".split(" ")
);
var CUT = "\u2026\u27EAtrunc";
var UNIX_CH = String.raw`(?:\\u[0-9a-fA-F]{4}|[^\s/\\"'\x60:<>|()\[\]{},;*?!#&=…~^])`;
var UNIX_NAME = `${UNIX_CH}+`;
var WIN_CH = String.raw`[^\s\\/:*?"<>|…\[\]]`;
var WIN_NAME = (sep) => `(?:${WIN_CH}+(?: ${WIN_CH}+){0,3}(?=${sep}|${CUT})|${WIN_CH}+)`;
var START2 = String.raw`(?<![\p{L}\p{N}_.\-~@%+$/])`;
var UNIX_HOME = new RegExp(String.raw`${START2}(file:\/\/)?((?:\/mnt\/[a-zA-Z])?\/(?:Users|home)\/)(${UNIX_NAME})`, "gu");
var WIN_HOME = new RegExp(String.raw`(?<![\p{L}\p{N}_])([A-Za-z]):(\\+|\/)(?:[Uu]sers|USERS)\2(${WIN_NAME(String.raw`\2`)})`, "gu");
var TILDE_USER = new RegExp(String.raw`${START2}~(\p{L}${UNIX_CH}*)(?=[\/\\]|${CUT})`, "gu");
var escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
var trimDots = (name) => name.replace(/\.+$/, "");
var encodeName = (name) => name.replace(/[^A-Za-z0-9]/g, "-");
function inWebUrl(s, at) {
  const start = Math.max(s.lastIndexOf(" ", at), s.lastIndexOf("\n", at), s.lastIndexOf('"', at), s.lastIndexOf("'", at), s.lastIndexOf("(", at)) + 1;
  return /[a-z][a-z0-9+.-]*:\/\//i.test(s.slice(start, at).replace(/file:\/\//gi, ""));
}
function shortenGeneric(s, seen) {
  let out = s.replace(WIN_HOME, (m, drive, sep, raw) => {
    const name = trimDots(raw);
    if (!name || NOT_PERSONAL.has(name.toLowerCase())) return m;
    seen?.(`${drive}:${sep}Users${sep}${name}`, name);
    return `~${raw.slice(name.length)}`;
  });
  out = out.replace(UNIX_HOME, (m, file, prefix, raw) => {
    const name = trimDots(raw);
    if (!name || NOT_PERSONAL.has(name.toLowerCase())) return m;
    seen?.(prefix + name, name);
    return `${file ?? ""}~${raw.slice(name.length)}`;
  });
  out = out.replace(TILDE_USER, (m, raw, at) => {
    const name = trimDots(raw);
    if (name !== raw || NOT_PERSONAL.has(name.toLowerCase())) return m;
    if (!out.startsWith(CUT, at + m.length)) seen?.("", name);
    return "~";
  });
  return out;
}
function homeOf(path) {
  const p = path.trim().replace(/[\\/]+$/, "");
  if (!p) return null;
  const m = p.match(/^(.*?(?:^|[\\/])(?:[Uu]sers|home)[\\/]+)([^\\/]+)/);
  if (m) {
    const name = m[2];
    if (NOT_PERSONAL.has(name.toLowerCase())) return null;
    return { home: m[1] + name, name };
  }
  return null;
}
var HomePaths = class {
  constructor(homes = []) {
    this.homes = /* @__PURE__ */ new Set();
    this.names = /* @__PURE__ */ new Set();
    this.learned = null;
    for (const h of homes) if (h) this.learnHome(h, true);
  }
  /** A home folder known for certain ($HOME), or a working directory that may be inside one (a cwd). */
  learnHome(path, isHome = false) {
    const h = homeOf(path);
    if (h) return this.add(h.home, h.name);
    if (!isHome) return;
    const p = path.trim().replace(/[\\/]+$/, "");
    if (!p || /^(?:\/root|\/var\/root|[A-Za-z]:)?$/.test(p)) return;
    this.add(p, p.split(/[\\/]/).pop() ?? "");
  }
  /** Learns the names in a text's home folders and its cwd fields ("cwd":"..." in JSON lines). */
  learnText(text) {
    if (!text) return;
    for (const m of text.matchAll(/"cwd"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) {
      try {
        this.learnHome(JSON.parse(`"${m[1]}"`));
      } catch {
      }
    }
    if (/Users|home|sers|~/.test(text)) shortenGeneric(text, (home, name) => this.add(home, name));
  }
  add(home, name) {
    const n = name.trim();
    if (home && !this.homes.has(home)) {
      this.homes.add(home);
      this.learned = null;
    }
    if (n.length >= 3 && !NOT_A_BARE_NAME.has(n.toLowerCase()) && !NOT_PERSONAL.has(n.toLowerCase()) && !this.names.has(n)) {
      this.names.add(n);
      this.learned = null;
    }
  }
  /** Could this text hold a home folder or a learned name? A cheap test: text without one needs no shorten(). */
  mayHold(s) {
    if (CANDIDATE.test(s)) return true;
    for (const n of this.names) if (s.includes(n) || s.includes(encodeName(n))) return true;
    return false;
  }
  /** The learned names (for tests and the backfill's report). */
  get knownNames() {
    return [...this.names];
  }
  patterns() {
    if (this.learned) return this.learned;
    const sep = String.raw`(?:\\+|\/)`;
    const after = String.raw`(?=$|\.*(?:[^\p{L}\p{N}_.\-@%+$]|$))`;
    const res = [];
    const homes = [...this.homes].filter((h) => h.length > 1).sort((a, b) => b.length - a.length);
    if (homes.length) {
      const alt = homes.map((h) => h.split(/[\\/]+/).map(escapeRe).join(sep)).join("|");
      res.push([new RegExp(String.raw`(?<![\p{L}\p{N}_.\-~@%+$])(file:\/\/\/?)?(?:${alt})${after}`, "gu"), (_m, file) => `${file ? "file://" : ""}~`]);
    }
    const names = [...this.names].sort((a, b) => b.length - a.length);
    if (names.length) {
      const alt = names.map(escapeRe).join("|");
      res.push([new RegExp(String.raw`(?<=[\/\\])(?:${alt})${after}`, "gu"), (m, _g, at, src) => inWebUrl(src, at) ? m : "~"]);
      res.push([new RegExp(String.raw`${START2}~(?:${alt})${after}`, "gu"), () => "~"]);
      const enc = [...new Set(names.map(encodeName))].sort((a, b) => b.length - a.length).map(escapeRe).join("|");
      res.push([new RegExp(String.raw`(-(?:Users|home)-)(?:${enc})(?=-|[^A-Za-z0-9]|$)`, "g"), (_m, prefix) => `${prefix}~`]);
    }
    return this.learned = res;
  }
  /** The text with every home folder shortened to ~. */
  shorten(s) {
    if (!s) return s;
    const pats = this.patterns();
    let out = s;
    pats.forEach(([re, rep], i) => {
      if (i === 0 && this.homes.size) out = out.replace(re, (m, file) => rep(m, typeof file === "string" ? file : void 0, 0, out));
    });
    out = shortenGeneric(out);
    for (const [re, rep] of this.homes.size ? pats.slice(1) : pats) {
      const src = out;
      out = src.replace(re, (m, ...args2) => {
        const at = args2.find((a) => typeof a === "number");
        return rep(m, typeof args2[0] === "string" ? args2[0] : void 0, at, src);
      });
    }
    return this.names.size && out.includes(CUT) ? this.shortenCut(out) : out;
  }
  /** A learned name cut short by compaction ("/srv/nicole.l…⟪trunc", "-Users-nicole-…⟪trunc") becomes ~ too. */
  shortenCut(s) {
    const at = s.lastIndexOf(CUT);
    const head = s.slice(0, at);
    for (const n of [...this.names, ...[...this.names].map(encodeName)]) {
      for (let k = Math.min(n.length, head.length); k >= 2; k--) {
        if (!head.endsWith(n.slice(0, k))) continue;
        const before = head[head.length - k - 1];
        if (before === "/" || before === "\\" || before === "~" || before === "-") return `${head.slice(0, head.length - k)}${before === "~" ? "" : "~"}${s.slice(at)}`;
      }
    }
    return s;
  }
  /** Every string in a JSON value shortened (keys are kept). */
  shortenDeep(v) {
    if (typeof v === "string") return this.shorten(v);
    if (Array.isArray(v)) return v.map((x) => this.shortenDeep(x));
    if (v && typeof v === "object") {
      const out = {};
      for (const [k, x] of Object.entries(v)) out[k] = this.shortenDeep(x);
      return out;
    }
    return v;
  }
};
function shortenHomePaths(s, homes = []) {
  const h = new HomePaths(homes);
  h.learnText(s);
  return h.shorten(s);
}
var CANDIDATE = /Users|home|USERS|users|~/;

// src/lib/analyzer/home-paths.ts
var cache2 = /* @__PURE__ */ new WeakMap();
function strings(e) {
  switch (e.kind) {
    case "prompt":
    case "assistant":
      return [e.text];
    case "tool":
      return [e.detail, e.path ?? "", e.written ?? "", e.old ?? "", ...e.paths ?? [], ...e.deleted ?? []];
    case "tool_result":
      return [e.text ?? ""];
    default:
      return [];
  }
}
function homeAgnostic(s) {
  const hit = cache2.get(s);
  if (hit) return hit;
  const h = new HomePaths();
  if (s.cwd) h.learnHome(s.cwd);
  for (const e of s.events) for (const t of strings(e)) h.learnText(t);
  let changed = false;
  const sh = (t) => {
    const o = h.shorten(t);
    if (o !== t) changed = true;
    return o;
  };
  const opt = (t) => t === void 0 ? void 0 : sh(t);
  const events = s.events.map((e) => {
    switch (e.kind) {
      case "prompt":
      case "assistant":
        return { ...e, text: sh(e.text) };
      case "tool_result":
        return e.text === void 0 ? e : { ...e, text: sh(e.text) };
      case "tool": {
        const detail = sh(e.detail);
        const out2 = { ...e, detail, path: opt(e.path), written: opt(e.written), old: opt(e.old) };
        if (e.paths) out2.paths = e.paths.map(sh);
        if (e.deleted) out2.deleted = e.deleted.map(sh);
        for (const k of ["path", "written", "old"]) if (out2[k] === void 0) delete out2[k];
        if (detail !== e.detail && e.written === void 0 && categorizeTool(e.name, e.detail) === e.category) out2.category = categorizeTool(e.name, detail);
        return out2;
      }
      default:
        return e;
    }
  });
  const out = changed ? { ...s, events } : s;
  cache2.set(s, out);
  cache2.set(out, out);
  return out;
}

// src/lib/analyzer/subagent-concurrency.ts
function peakSubagents(spans) {
  const points = spans.filter(([start, end]) => Number.isFinite(start) && Number.isFinite(end) && start > 0 && end > start).flatMap(([start, end]) => [[start, 1], [end, -1]]);
  if (!points.length) return void 0;
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let open = 0, peak = 0;
  for (const [, delta] of points) {
    open += delta;
    peak = Math.max(peak, open);
  }
  return peak;
}

// src/lib/analyzer/metrics.ts
var CATS = ["read", "search", "edit", "exec", "test", "build", "git", "web", "agent", "plan", "ask", "mcp", "other"];
var IDLE_GAP_MS2 = 10 * 60 * 1e3;
var TOKEN_FIELDS = ["input", "output", "cacheRead", "cacheWrite5m", "cacheWrite1h"];
var noTokens = () => ({ input: 0, output: 0, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0 });
var billed = (u) => {
  const w1 = Math.min(u.cacheWrite1h ?? 0, u.cacheWrite);
  return { input: u.input, output: u.output, cacheRead: u.cacheRead, cacheWrite5m: u.cacheWrite - w1, cacheWrite1h: w1 };
};
function addTokens(to, model, u) {
  if (!(u.input + u.output + u.cacheRead + u.cacheWrite)) return;
  const key = (model || "unknown").slice(0, 60);
  const t = to[key] ??= noTokens();
  const b = billed(u);
  for (const f of TOKEN_FIELDS) t[f] += b[f];
}
var roundMinutes = (x) => Math.round(x * 10 + 1e-7) / 10;
var median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
function computeMetrics(sessions, opts = {}) {
  sessions = sessions.map(homeAgnostic);
  const toolsByCategory = Object.fromEntries(CATS.map((c) => [c, 0]));
  const m = {
    sessions: 0,
    sources: [],
    models: [],
    activeMinutes: 0,
    spanMinutes: 0,
    humanTurns: 0,
    slashCommands: 0,
    avgPromptChars: 0,
    medianPromptChars: 0,
    promptsWithCode: 0,
    promptsWithPaths: 0,
    promptsWithCriteria: 0,
    promptsStructured: 0,
    corrections: 0,
    interrupts: 0,
    compactions: 0,
    toolCalls: 0,
    toolsByCategory,
    toolErrors: 0,
    rejections: 0,
    parallelToolMessages: 0,
    assistantMessages: 0,
    subagents: 0,
    planEvents: 0,
    sessionsPlanFirst: 0,
    sessionsWithEdits: 0,
    editedFiles: 0,
    readBeforeEditRatio: 0,
    linesWritten: 0,
    testRuns: 0,
    editTurns: 0,
    verifiedEditTurns: 0,
    gitCommits: 0,
    prsOpened: 0,
    tokens: { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, total: 0, subagent: 0 },
    estCostUsd: 0,
    cacheHitRatio: 0,
    hourHistogram: new Array(24).fill(0),
    nightOwlShare: 0,
    weekendShare: 0,
    politeness: 0,
    profanity: 0,
    hostility: 0,
    yelling: 0,
    longestSessionMinutes: 0,
    agentBusyMinutes: 0,
    agentWaitMinutes: 0,
    agentTurns: 0,
    queuedPrompts: 0,
    agentWaits: 0,
    agentBreaks: 0,
    humanCodeChars: 0,
    humanWords: 0,
    codeEditSessions: 0,
    verifiedFinishes: 0,
    toolFailures: 0,
    unresolvedErrors: 0,
    retryLoops: 0,
    loopsSteppedIn: 0,
    catches: 0,
    configEdits: 0,
    configEditSessions: 0,
    lessonsCodified: 0,
    contextResets: 0,
    autoCompactions: 0,
    checkBatches: 0,
    batchEdits: 0
  };
  const trusted = trustedChecks(sessions);
  const briefs = emptySpecificity();
  const churn = emptyChurn();
  const lex = opts.lexicon === void 0 ? getLexicon() : opts.lexicon;
  const verbosity = emptyVerbosity();
  const fun = emptyFunCounts();
  const promptTexts = [];
  const lessonTimeline = [];
  const promptLens = [];
  const sources = /* @__PURE__ */ new Set();
  const models = /* @__PURE__ */ new Set();
  let editedTotal = 0;
  let editedReadFirst = 0;
  let weekend = 0;
  let night = 0;
  const local = localTime(opts);
  const byModel = {};
  const promptsByDay = /* @__PURE__ */ new Map();
  const waitsMs = [];
  const spans = [];
  const subagentSpans = [];
  for (const s of sessions) {
    for (const [start, end] of s.subagentSpans ?? []) {
      const a = Math.max(start, opts.since ?? start), b = Math.min(end, opts.until ?? end);
      if (b > a) subagentSpans.push([a, b]);
    }
    const events = s.events.filter((e) => (!opts.since || e.t >= opts.since) && (!opts.until || e.t <= opts.until));
    m.tokens.subagent += s.subagentUsage.input + s.subagentUsage.output + s.subagentUsage.cacheRead + s.subagentUsage.cacheWrite;
    if (s.subagentUsageByModel) for (const [model, u2] of Object.entries(s.subagentUsageByModel)) addTokens(byModel, model, u2);
    else addTokens(byModel, s.models[0], s.subagentUsage);
    if (!events.length) continue;
    m.sessions++;
    specificityCounts(events, briefs);
    churnCounts(events, churn);
    if (lex) verbosityCounts(events, lex, verbosity);
    funCounts(events, fun);
    {
      const o = sessionOutcome(s.id, events, trusted);
      if (o.codeEdits > 0) {
        m.codeEditSessions++;
        if (o.verifiedFinish) m.verifiedFinishes++;
      }
      m.toolFailures += o.errors;
      m.unresolvedErrors += o.unresolved;
      m.retryLoops += o.loops;
      m.loopsSteppedIn += o.loopsSteppedIn;
      for (const c of o.corrections) if (c.acted && (opts.catchLabels?.[c.id] ?? c.catch)) m.catches++;
      m.configEdits += o.configEdits;
      if (o.configEdits > 0) m.configEditSessions++;
      m.contextResets += o.resets;
      m.autoCompactions += o.autoCompactions;
      m.checkBatches += o.batches;
      m.batchEdits += o.batchEdits;
      for (const c of o.corrections) lessonTimeline.push({ t: c.t, topic: c.topic });
      for (const e of events) {
        if (e.kind === "prompt" && !e.slash) lessonTimeline.push({ t: e.t, prompt: true });
        if (e.kind === "prompt" && e.slash && /^\/(init|memory)\b/.test(e.text)) lessonTimeline.push({ t: e.t, config: true });
        if (e.kind === "tool" && e.category === "edit" && [e.path, ...e.paths ?? []].some((p) => p && isConfigPath(p))) lessonTimeline.push({ t: e.t, config: true });
      }
    }
    sources.add(s.source);
    s.models.forEach((x) => models.add(x));
    const times2 = events.map((e) => e.t).filter(Boolean).sort((a, b) => a - b);
    let active = 0;
    for (let i = 1; i < times2.length; i++) {
      const g2 = times2[i] - times2[i - 1];
      if (g2 < IDLE_GAP_MS2) active += g2;
    }
    const activeMin = active / 6e4;
    if (events.some((e) => e.kind === "prompt") && times2.length) {
      let a = times2[0], b = times2[0];
      for (let i = 1; i < times2.length; i++) {
        if (times2[i] - b < IDLE_GAP_MS2) b = times2[i];
        else {
          if (b > a) spans.push([a, b]);
          a = b = times2[i];
        }
      }
      if (b > a) spans.push([a, b]);
    }
    m.activeMinutes += activeMin;
    const timing = sessionTiming(events);
    for (const r8 of timing.runs) m.agentBusyMinutes += (r8.end - r8.start) / 6e4;
    m.agentTurns += timing.runs.length;
    for (const w of timing.waits) {
      m.agentWaitMinutes += Math.min(w, BREAK_MS) / 6e4;
      if (w < BREAK_MS) waitsMs.push(w);
      else m.agentBreaks++;
    }
    for (const e of timing.queued) if (e.kind === "prompt" && !e.slash) m.queuedPrompts++;
    if (times2.length) m.spanMinutes += (times2[times2.length - 1] - times2[0]) / 6e4;
    m.longestSessionMinutes = Math.max(m.longestSessionMinutes, activeMin);
    const readPaths = /* @__PURE__ */ new Set();
    const editedPaths = /* @__PURE__ */ new Set();
    let sawPlan = false;
    let sawEdit = false;
    let planUnknown = false;
    let planUnknownAtEdit = false;
    let planBeforeEdit = false;
    let turnHasEdit = false;
    let verifiedAfterLastEdit = false;
    const closeTurn = () => {
      if (turnHasEdit) {
        m.editTurns++;
        if (verifiedAfterLastEdit) m.verifiedEditTurns++;
      }
      turnHasEdit = false;
      verifiedAfterLastEdit = false;
    };
    let sessionUsage = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 };
    const sessionByModel = {};
    let lastModel;
    for (const e of events) {
      switch (e.kind) {
        case "prompt": {
          if (!timing.queued.has(e)) closeTurn();
          if (e.slash) {
            m.slashCommands++;
            if (/^\/(plan|ultraplan)/.test(e.text)) m.planEvents++;
            break;
          }
          m.humanTurns++;
          const text = e.text;
          promptLens.push(text.length);
          promptTexts.push(text);
          m.humanWords += countWords(text);
          if (/```/.test(text)) m.promptsWithCode++;
          if (PATH_RE.test(text)) m.promptsWithPaths++;
          if (STRUCTURE_RE.test(text) || text.length > 400) m.promptsStructured++;
          const h = promptHabits(text);
          if (h.measured) {
            if (h.criteria) m.promptsWithCriteria++;
            if (h.correction) m.corrections++;
            m.politeness += h.kind;
            m.hostility += h.hostility;
            m.profanity += h.profanity;
            const caps = text.match(/\b[A-Z]{4,}\b/g) || [];
            if (caps.filter((w) => !/^(TODO|JSON|HTML|HTTP|HTTPS|README|API|SQL|YAML|TOML|UUID|NOTE|FIXME|CSS|URL|CLI|AWS|GCP|IMPORTANT)$/.test(w)).length >= 2) m.yelling++;
          } else if (!sawEdit) planUnknown = true;
          m.humanCodeChars += humanCodeChars(text);
          if (e.t) {
            const { hour: h2, weekday: dow, dateKey: day } = local(e.t, s);
            m.hourHistogram[h2]++;
            if (h2 >= 23 || h2 < 5) night++;
            if (dow === 0 || dow === 6) weekend++;
            promptsByDay.set(day, (promptsByDay.get(day) ?? 0) + 1);
          }
          if (h.plan && !sawEdit) {
            sawPlan = true;
          }
          break;
        }
        case "assistant": {
          m.assistantMessages++;
          if (e.toolCount > 1) m.parallelToolMessages++;
          if (e.usage) {
            sessionUsage = {
              input: sessionUsage.input + e.usage.input,
              cacheRead: sessionUsage.cacheRead + e.usage.cacheRead,
              cacheWrite: sessionUsage.cacheWrite + e.usage.cacheWrite,
              output: sessionUsage.output + e.usage.output
            };
            addTokens(sessionByModel, e.model ?? s.models[0], e.usage);
            if (e.model && e.model !== "<synthetic>") lastModel = e.model;
          }
          break;
        }
        case "plan_mode":
          m.planEvents++;
          if (!sawEdit) sawPlan = true;
          break;
        case "tool": {
          m.toolCalls++;
          m.toolsByCategory[e.category]++;
          if (e.category === "agent") m.subagents++;
          if (e.category === "plan") {
            m.planEvents++;
            if (!sawEdit) sawPlan = true;
          }
          if ((e.category === "read" || e.category === "search") && e.path) readPaths.add(e.path);
          if (e.category === "read" && !e.path) {
            const p = e.detail.split(/\s+/).pop();
            if (p) readPaths.add(p);
          }
          if (e.category === "edit") {
            if (!sawEdit) {
              planBeforeEdit = sawPlan;
              planUnknownAtEdit = planUnknown;
            }
            sawEdit = true;
            turnHasEdit = true;
            verifiedAfterLastEdit = false;
            m.linesWritten += e.linesWritten;
            if (e.path && !editedPaths.has(e.path)) {
              editedPaths.add(e.path);
              editedTotal++;
              const isCreate = !!e.create && !readPaths.has(e.path);
              if (isCreate) editedTotal--;
              else if (readPaths.has(e.path) || [...readPaths].some((r8) => r8.endsWith(e.path.split("/").pop()))) editedReadFirst++;
            }
          }
          if (e.category === "test" || e.category === "build") {
            if (e.category === "test") m.testRuns++;
            if (turnHasEdit) verifiedAfterLastEdit = true;
          }
          if (e.category === "exec" && turnHasEdit && /\b(node|python3?|go run|cargo run|npm (run )?(dev|start)|curl .*localhost|deno run|bun run|ruby|php|java )\b/.test(e.detail)) {
            verifiedAfterLastEdit = true;
          }
          if (e.category === "git" && /git commit/.test(e.detail)) m.gitCommits++;
          if (/gh pr create/.test(e.detail)) m.prsOpened++;
          break;
        }
        case "tool_result":
          if (e.isError) m.toolErrors++;
          if (e.rejected) m.rejections++;
          break;
        case "interrupt":
          m.interrupts++;
          break;
        case "compact":
          m.compactions++;
          break;
      }
    }
    closeTurn();
    if (sawEdit) {
      m.sessionsWithEdits++;
      if (planBeforeEdit) m.sessionsPlanFirst++;
      else if (planUnknownAtEdit) m.unmeasuredPlanSessions = (m.unmeasuredPlanSessions ?? 0) + 1;
    }
    m.editedFiles += editedPaths.size;
    const u = s.totalUsageOverride && !opts.since ? s.totalUsageOverride : sessionUsage;
    if (u !== sessionUsage) {
      const total = billed(u);
      for (const f of TOKEN_FIELDS) {
        const sum = Object.values(sessionByModel).reduce((a, t) => a + t[f], 0);
        if (sum > 0) for (const t of Object.values(sessionByModel)) t[f] *= total[f] / sum;
        else if (total[f] > 0) (sessionByModel[(lastModel ?? s.models.at(-1) ?? "unknown").slice(0, 60)] ??= noTokens())[f] += total[f];
      }
    }
    for (const [model, t] of Object.entries(sessionByModel)) {
      const all = byModel[model] ??= noTokens();
      for (const f of TOKEN_FIELDS) all[f] += t[f];
    }
    m.tokens.input += u.input;
    m.tokens.cacheRead += u.cacheRead;
    m.tokens.cacheWrite += u.cacheWrite;
    m.tokens.output += u.output;
  }
  const edges = spans.flatMap(([a, b]) => [[a, 1], [b, -1]]).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  let open = 0, last = 0, wall = 0, par = 0, peak = 0;
  for (const [t, d] of edges) {
    if (open >= 1) wall += t - last;
    if (open >= 2) par += t - last;
    open += d;
    last = t;
    peak = Math.max(peak, open);
  }
  m.wallMinutes = Math.round(wall / 6e4 * 10) / 10;
  m.parallelMinutes = Math.round(par / 6e4 * 10) / 10;
  m.peakParallel = peak;
  m.lessonsCodified = codifiedLessons(lessonTimeline);
  Object.assign(m, briefs, churn, fun, { redoMinutes: roundMinutes(churn.redoMinutes) });
  if (lex) Object.assign(m, typoCounts(promptTexts, lex), verbosity, { briefNeededWords: Math.round(verbosity.briefNeededWords) });
  m.sources = [...sources];
  m.models = [...models];
  m.tokens.total = m.tokens.input + m.tokens.cacheRead + m.tokens.cacheWrite + m.tokens.output;
  const inAll = m.tokens.input + m.tokens.cacheRead + m.tokens.cacheWrite;
  m.cacheHitRatio = inAll ? m.tokens.cacheRead / inAll : 0;
  m.avgPromptChars = promptLens.length ? promptLens.reduce((a, b) => a + b, 0) / promptLens.length : 0;
  m.medianPromptChars = median(promptLens);
  m.readBeforeEditRatio = editedTotal > 0 ? editedReadFirst / editedTotal : m.sessionsWithEdits ? 0.5 : 0;
  m.nightOwlShare = m.humanTurns ? night / m.humanTurns : 0;
  m.weekendShare = m.humanTurns ? weekend / m.humanTurns : 0;
  const minutes = { activeMinutes: m.activeMinutes, spanMinutes: m.spanMinutes, agentBusyMinutes: m.agentBusyMinutes, agentWaitMinutes: m.agentWaitMinutes, redoMinutes: churn.redoMinutes };
  m.activeMinutes = roundMinutes(m.activeMinutes);
  m.agentBusyMinutes = roundMinutes(m.agentBusyMinutes);
  m.agentWaitMinutes = roundMinutes(m.agentWaitMinutes);
  m.agentWaits = waitsMs.length;
  m.agentWaitMedianMinutes = Math.round(medianOf(waitsMs) / 6e4 * 1e3) / 1e3;
  m.spanMinutes = roundMinutes(m.spanMinutes);
  m.longestSessionMinutes = Math.round(m.longestSessionMinutes * 10) / 10;
  for (const t of Object.values(byModel)) for (const f of TOKEN_FIELDS) t[f] = Math.round(t[f]);
  m.tokensByModel = byModel;
  m.estCostUsd = Math.round(apiCost(byModel).usd * 100) / 100;
  m.busiestDayPrompts = Math.max(0, ...promptsByDay.values());
  const peakChildren = peakSubagents(subagentSpans);
  if (peakChildren !== void 0) m.peakSubagents = peakChildren;
  if (opts.parts) Object.assign(opts.parts, { spans, ...subagentSpans.length ? { subagentSpans } : {}, promptLens, waitsMs, promptsByDay: Object.fromEntries(promptsByDay), editedTotal, editedReadFirst, minutes });
  return m;
}

// src/lib/analyzer/archetypes.ts
var AXES = [
  {
    key: "planning",
    name: "Planning",
    high: { letter: "A", name: "Architect", blurb: "Plans, outlines and sets acceptance criteria before code gets written." },
    low: { letter: "I", name: "Improviser", blurb: "Starts building right away and figures it out as the code takes shape." }
  },
  {
    key: "control",
    name: "Control",
    high: { letter: "D", name: "Delegator", blurb: "Hands the agent big chunks of work and lets it run for a long time." },
    low: { letter: "P", name: "Pilot", blurb: "Keeps a hand on the stick with short, frequent prompts and course corrections." }
  },
  {
    key: "verification",
    name: "Verification",
    high: { letter: "S", name: "Skeptic", blurb: "Makes the agent read before it edits, and runs tests before trusting a change." },
    low: { letter: "Y", name: "YOLO", blurb: "Ships on vibes. If it looks right, it's probably right." }
  },
  {
    key: "scope",
    name: "Scope",
    high: { letter: "E", name: "Explorer", blurb: "Runs long sessions that cover many files, searches and side quests." },
    low: { letter: "L", name: "Laser", blurb: "Runs short, focused sessions with one target and gets out." }
  }
];
var A = (code, name, emoji, color, tagline, description, strengths, blindSpots, bestWith) => ({ code, name, emoji, color, tagline, description, strengths, blindSpots, bestWith });
var ARCHETYPES = Object.fromEntries(
  [
    A(
      "ADSE",
      "The Orchestrator",
      "\u{1F3BC}",
      "#1E3AD6",
      "Conducts a whole section of agents and still hears every wrong note.",
      "You write the spec, hand off big pieces, and make every change prove itself with tests. Your sessions sprawl across a whole codebase, and they stay coherent anyway. This is the closest thing to a staff engineer with a team of AI interns.",
      ["Turns vague goals into specs an agent can carry out", "Lets agents run for a long time without losing quality", "Big refactors land green"],
      ["Can over-engineer a one-line fix", "Burns a lot of tokens on context"],
      "IPYL"
    ),
    A(
      "ADSL",
      "The Surgeon",
      "\u{1FA7A}",
      "#2F67E0",
      "Precise incision, clean close, out of the OR before lunch.",
      "You know exactly what needs to change, write it down, let the agent do the cutting, and check the vitals before closing. Short, planned, verified sessions with almost no wasted motion.",
      ["High success rate per session", "Minimal token waste", "Rarely needs a correction"],
      ["May avoid open-ended exploration", "Big-picture redesigns feel uncomfortable"],
      "IDYE"
    ),
    A(
      "ADYE",
      "The Visionary",
      "\u{1F52D}",
      "#3A2BB5",
      "Draws the cathedral, lets the robots lay the bricks, never checks the mortar.",
      "You think in systems and write great plans, then trust the agent to build all of it. You ship huge amounts of code. Some of it is load-bearing in ways nobody has checked yet.",
      ["Huge output per prompt", "Strong product and architecture instincts", "Fearless scope"],
      ["Untested changes pile up quietly", "Bugs show up three features later"],
      "IPSL"
    ),
    A(
      "ADYL",
      "The Spec Writer",
      "\u{1F4DC}",
      "#4C63E8",
      "Writes the ticket so well that the code writes itself. Hopefully.",
      "Your prompts read like great Jira tickets: context, constraints, done-when. Then you hand them off and move on. Clean, scoped and fast, though you tend to treat the agent's 'done' as actually done.",
      ["Very clear prompts", "Fast turnaround on scoped tasks", "Low back-and-forth"],
      ["Trusts the agent's 'done' without running anything", "Edge cases slip through"],
      "IPSE"
    ),
    A(
      "APSE",
      "The Professor",
      "\u{1F393}",
      "#1F6B45",
      "Every session is a seminar, and the agent is the PhD student.",
      "You plan carefully, then teach your way through the work one step at a time, checking each answer. Sessions run long and wander into interesting corners. You understand everything that ends up in the codebase.",
      ["Deep understanding of the result", "Catches subtle bugs early", "Good at gnarly legacy code"],
      ["Slower than you need to be", "Hard to let the agent off the leash"],
      "IDYL"
    ),
    A(
      "APSL",
      "The Craftsperson",
      "\u{1FA9A}",
      "#2E8A57",
      "Measures twice, prompts once, sands every edge.",
      "Planned, hands-on, verified and focused. You treat AI as a power tool, not an autopilot, and your diffs are small, readable and correct. Code reviewers love you.",
      ["High-quality, reviewable diffs", "Few regressions", "Predictable delivery"],
      ["Leaves leverage on the table", "Small tasks get a ceremony they don't need"],
      "IDYE"
    ),
    A(
      "APYE",
      "The Tinkerer",
      "\u{1F527}",
      "#557A1A",
      "Has a plan, a soldering iron, and absolutely no fear.",
      "You sketch a plan, then stay hands-on while trying lots of things across lots of files. Testing is something that happens to other people. Enormous curiosity, enormous blast radius.",
      ["Explores a solution space quickly", "Great at prototypes", "Learns new stacks fast"],
      ["Things break silently", "Prototypes become production by accident"],
      "ADSL"
    ),
    A(
      "APYL",
      "The Drill Sergeant",
      "\u{1F396}\uFE0F",
      "#13594F",
      "Short orders, tight control, march on.",
      "You know what you want and say it in short, frequent commands. The agent does as it's told, one step at a time. Efficient and decisive, though you rarely ask it to prove the work.",
      ["Very focused sessions", "Low token use", "Decisive"],
      ["Micromanagement caps your leverage", "Doesn't verify enough"],
      "IDSE"
    ),
    A(
      "IDSE",
      "The Scout",
      "\u{1F9ED}",
      "#E2462B",
      "Drops into unknown terrain, sends the agent ahead, checks every bridge before crossing.",
      "You don't over-plan. You point the agent at the unknown and let it explore, but nothing ships without a test run. You're good at unfamiliar codebases and debugging hunts.",
      ["Fast ramp-up on new codebases", "Uses the agent heavily for investigation", "Changes are verified"],
      ["Exploration can wander without a stated goal", "Expensive sessions"],
      "APYL"
    ),
    A(
      "IDSL",
      "The Sniper",
      "\u{1F3AF}",
      "#B8321C",
      "One prompt. One diff. Tests green. Gone.",
      "Minimal ceremony and maximum precision. You give the agent a clear target, let it take the shot, and confirm the hit with a test. This style tops the speedrun leaderboards.",
      ["Very efficient (turns, tokens and time)", "High verified-success rate", "Calm under pressure"],
      ["Can under-specify on big, ambiguous problems", "Might be too fast for complex migrations"],
      "APYE"
    ),
    A(
      "IDYE",
      "The Vibe Lord",
      "\u{1F300}",
      "#D93D78",
      "Fully gives in to the vibes. Forgets the code even exists.",
      "This is vibe coding as Karpathy described it: describe what you want, accept all, keep going, and never read the diff. Massive output, delightful demos, and a codebase held together by optimism.",
      ["Unmatched speed from idea to demo", "Fearless about scope", "Gets the most out of the agent's autonomy"],
      ["Technical debt grows quickly", "Debugging becomes archaeology"],
      "APSL"
    ),
    A(
      "IDYL",
      "The Speedrunner",
      "\u26A1",
      "#F06A2A",
      "Any% glitchless? Never heard of it. Any% is the only category.",
      "Short sessions, high autonomy, no ceremony, no tests. You get in, get the thing, and get out. Frightening on simple tasks and worrying on hard ones.",
      ["Very fast wall-clock times", "Low turn counts", "No analysis paralysis"],
      ["Brittle results", "Skips edge cases"],
      "APSE"
    ),
    A(
      "IPSE",
      "The Detective",
      "\u{1F50D}",
      "#B07D0C",
      "Interrogates the codebase until it confesses.",
      "You start without a plan, then question everything: read this, grep that, run it again. Long, hands-on, evidence-driven sessions. If there's a root cause, you'll find it.",
      ["Excellent debugger", "Thorough verification", "Builds deep codebase knowledge"],
      ["Long sessions", "Could delegate more of the legwork"],
      "ADYL"
    ),
    A(
      "IPSL",
      "The Mechanic",
      "\u{1F6E0}\uFE0F",
      "#8A6512",
      "Pops the hood, swaps the part, revs the engine, done.",
      "Practical and hands-on. You steer closely with quick prompts, check that it runs, and move on to the next fix. A no-nonsense style that keeps production up.",
      ["Reliable fixes", "Good feedback loops", "Low drama"],
      ["Rarely steps back to plan bigger moves", "Under-uses autonomy"],
      "ADYE"
    ),
    A(
      "IPYE",
      "The Freestyler",
      "\u{1F3A4}",
      "#D6981A",
      "Riffing across the codebase with no setlist and no safety net.",
      "Improvised, hands-on and exploratory, and you go with the flow. Sessions are a jam: lots of short prompts, lots of files, lots of energy. Some of it slaps. Some of it needs a second take.",
      ["Creative and fast-moving", "Good at greenfield experiments", "Never bored"],
      ["Hard to reproduce what worked", "Lots of rework"],
      "ADSL"
    ),
    A(
      "IPYL",
      "The Cowboy",
      "\u{1F920}",
      "#9E5212",
      "Shoots from the hip, rides off before the smoke clears.",
      "Quick, hands-on, unplanned and untested. You use the agent like a fast autocomplete for one thing at a time. Fine for one-off scripts. Your production deploys have a soundtrack.",
      ["Low overhead", "Good for quick scripts and one-offs", "Very fast at small fixes"],
      ["Bugs get through", "Doesn't scale to big tasks"],
      "ADSE"
    )
  ].map((a) => [a.code, a])
);

// src/lib/analyzer/score.ts
var clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
var sq = (x, mid, k) => 100 / (1 + Math.exp(-(x - mid) / k));
var ratio = (a, b) => b > 0 ? a / b : 0;
var r1 = (x) => Math.round(x);
var shrink = (hits, n, prior, k) => (hits + k * prior) / (Math.max(0, n) + k);
var planSessionsRead = (m) => m.sessionsWithEdits - (m.unmeasuredPlanSessions ?? 0);
var FEATURES = {
  planFirstRate: (m) => !m.unmeasuredPlanSessions ? ratio(m.sessionsPlanFirst, m.sessionsWithEdits) : planSessionsRead(m) > 0 ? ratio(m.sessionsPlanFirst, planSessionsRead(m)) : 0.45,
  planEventsPerSession: (m) => m.planEvents / Math.max(1, m.sessions),
  structuredShare: (m) => shrink(m.promptsStructured, m.humanTurns, 0.15, 5),
  criteriaShare: (m) => shrink(m.promptsWithCriteria, readPrompts(m), 0.2, 5),
  pathsShare: (m) => shrink(m.promptsWithPaths, m.humanTurns, 0.2, 5),
  avgPromptChars: (m) => m.avgPromptChars,
  toolsPerTurn: (m) => m.toolCalls / Math.max(1, m.humanTurns),
  steerRate: (m) => !m.unmeasuredPrompts ? (m.corrections + m.interrupts) / Math.max(1, m.humanTurns) : m.corrections / Math.max(1, readPrompts(m)) + m.interrupts / Math.max(1, m.humanTurns),
  // Corrections only: experienced users interrupt MORE (Anthropic autonomy study), so interrupts aren't penalized.
  correctionRate: (m) => shrink(m.corrections, readPrompts(m), 0.15, 5),
  subagentsPerSession: (m) => m.subagents / Math.max(1, m.sessions),
  verifiedRate: (m) => shrink(m.verifiedEditTurns, m.editTurns, 0.4, 3),
  readBeforeEdit: (m) => m.readBeforeEditRatio,
  testsPerEditTurn: (m) => m.testRuns / Math.max(1, m.editTurns),
  testsPerSession: (m) => m.testRuns / Math.max(1, m.sessions),
  minutesPerSession: (m) => m.activeMinutes / Math.max(1, m.sessions),
  filesPerSession: (m) => m.editedFiles / Math.max(1, m.sessions),
  readsPerSession: (m) => (m.toolsByCategory.read + m.toolsByCategory.search + m.toolsByCategory.web) / Math.max(1, m.sessions),
  linesPerWord: (m) => Math.log10(1 + m.linesWritten / Math.max(1, m.humanWords)),
  toolErrorRate: (m) => shrink(m.toolErrors, m.toolCalls, 0.05, 20),
  rejectionRate: (m) => ratio(m.rejections, m.toolCalls),
  cacheHitRatio: (m) => m.cacheHitRatio,
  tokensPerLine: (m) => Math.log10(1 + (m.tokens.input + m.tokens.cacheWrite + m.tokens.output) / Math.max(1, m.linesWritten)),
  linesPerHour: (m) => Math.log10(1 + m.linesWritten / Math.max(0.25, m.activeMinutes / 60))
};
var T = (f, w, dir, formula) => ({ f, w, dir, formula });
var AXIS_TERMS = {
  planning: [
    T("planFirstRate", 0.3, 1, (x) => x * 100),
    T("planEventsPerSession", 0.2, 1, (x) => sq(x, 1, 0.6)),
    T("structuredShare", 0.2, 1, (x) => clamp(x * 250)),
    T("criteriaShare", 0.15, 1, (x) => clamp(x * 200)),
    T("avgPromptChars", 0.15, 1, (x) => sq(x, 220, 90))
  ],
  control: [
    T("toolsPerTurn", 0.5, 1, (x) => sq(x, 7, 3)),
    T("avgPromptChars", 0.2, 1, (x) => sq(x, 200, 120)),
    T("steerRate", 0.15, -1, (x) => clamp(100 - x * 300)),
    T("subagentsPerSession", 0.15, 1, (x) => sq(x, 0.4, 0.4))
  ],
  verification: [
    T("verifiedRate", 0.45, 1, (x) => x * 100),
    T("readBeforeEdit", 0.3, 1, (x) => x * 100),
    T("testsPerEditTurn", 0.25, 1, (x) => sq(x, 0.6, 0.3))
  ],
  scope: [
    T("minutesPerSession", 0.35, 1, (x) => sq(x, 40, 18)),
    T("filesPerSession", 0.35, 1, (x) => sq(x, 6, 3)),
    T("readsPerSession", 0.3, 1, (x) => sq(x, 25, 12))
  ]
};
var SKILL_TERMS = {
  leverage: [T("toolsPerTurn", 0.55, 1, (x) => sq(x, 5, 2.5)), T("linesPerWord", 0.45, 1, (x) => sq(x, 0.5, 0.25))],
  steering: [
    T("correctionRate", 0.55, -1, (x) => clamp(100 - x * 250)),
    T("toolErrorRate", 0.3, -1, (x) => clamp(100 - x * 400)),
    T("rejectionRate", 0.15, -1, (x) => clamp(100 - x * 500))
  ],
  // Verify per edit (not raw test volume: failing agents often run tests MORE) + gather context first.
  verification: [
    T("verifiedRate", 0.6, 1, (x) => x * 100),
    T("readBeforeEdit", 0.4, 1, (x) => x * 100)
  ],
  // Cache hit rate dropped: it's mostly determined by the tool, not the person.
  context: [
    T("pathsShare", 0.25, 1, (x) => clamp(x * 180)),
    T("criteriaShare", 0.25, 1, (x) => clamp(x * 180)),
    T("structuredShare", 0.2, 1, (x) => clamp(x * 180)),
    T("planFirstRate", 0.3, 1, (x) => clamp(x * 100))
  ],
  efficiency: [T("tokensPerLine", 0.75, -1, (x) => 100 - sq(x, 2.9, 0.35)), T("toolErrorRate", 0.25, -1, (x) => clamp(100 - x * 300))],
  throughput: [T("linesPerHour", 1, 1, (x) => sq(x, 2.2, 0.3))]
};
function calibrationFor(m, cal) {
  if (!cal) return null;
  const src = m.sources?.length === 1 ? m.sources[0] : void 0;
  const sub = src ? cal.bySource?.[src] : void 0;
  return sub && sub.n >= MIN_CALIBRATION_N ? sub : cal;
}
function quantileRank(q, x) {
  if (!q.length) return 50;
  if (x <= q[0]) return x < q[0] ? 0 : 0.5 * (100 / (q.length - 1)) * (q.lastIndexOf(q[0]) || 0);
  if (x >= q[q.length - 1]) return 100;
  let lo = 0;
  let hi = q.length - 1;
  while (hi - lo > 1) {
    const mid = lo + hi >> 1;
    if (q[mid] <= x) lo = mid;
    else hi = mid;
  }
  const span = q[hi] - q[lo];
  const frac = span > 0 ? (x - q[lo]) / span : 0.5;
  return (lo + frac) / (q.length - 1) * 100;
}
function termScore(t, m, cal) {
  const x = FEATURES[t.f](m);
  const formula = clamp(t.formula(x));
  const q = cal && cal.n >= MIN_CALIBRATION_N ? cal.quantiles[t.f] : void 0;
  if (!q || !cal) return formula;
  const pct2 = quantileRank(q, x);
  const empirical = t.dir === 1 ? pct2 : 100 - pct2;
  const w = cal.n / (cal.n + PRIOR_STRENGTH);
  return w * empirical + (1 - w) * formula;
}
var combine = (terms, m, cal) => r1(clamp(terms.reduce((s, t) => s + t.w * termScore(t, m, cal), 0)));
function computeAxes(m, cal) {
  return {
    planning: combine(AXIS_TERMS.planning, m, cal),
    control: combine(AXIS_TERMS.control, m, cal),
    verification: combine(AXIS_TERMS.verification, m, cal),
    scope: combine(AXIS_TERMS.scope, m, cal)
  };
}
var BALANCED_BAND = 7;
function axesCode(a, previousCode) {
  return AXES.map((ax, i) => {
    const v = a[ax.key];
    const prev = previousCode?.[i];
    if (prev && Math.abs(v - 50) < BALANCED_BAND && (prev === ax.high.letter || prev === ax.low.letter)) return prev;
    return v >= 50 ? ax.high.letter : ax.low.letter;
  }).join("");
}
function computeSkills(m, cal) {
  return {
    leverage: combine(SKILL_TERMS.leverage, m, cal),
    steering: combine(SKILL_TERMS.steering, m, cal),
    verification: combine(SKILL_TERMS.verification, m, cal),
    context: combine(SKILL_TERMS.context, m, cal),
    efficiency: combine(SKILL_TERMS.efficiency, m, cal),
    throughput: combine(SKILL_TERMS.throughput, m, cal)
  };
}
var SKILL_WEIGHTS = {
  verification: 0.3,
  context: 0.22,
  steering: 0.2,
  leverage: 0.18,
  efficiency: 0.05,
  throughput: 0.05
};
function vibeScore(s) {
  let t = 0;
  for (const k of Object.keys(SKILL_WEIGHTS)) t += s[k] * SKILL_WEIGHTS[k];
  return Math.round(t * 10);
}
var fmtNum = (n) => n >= 1e9 ? (n / 1e9).toFixed(1) + "B" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "k" : String(Math.round(n));
function buildFunStats(m) {
  const fav = Object.entries(m.toolsByCategory).sort((a, b) => b[1] - a[1])[0];
  const peakHour = m.hourHistogram.indexOf(Math.max(...m.hourHistogram));
  const hourLabel2 = (h) => `${(h + 11) % 12 + 1}${h < 12 ? "am" : "pm"}`;
  const stats = [
    { label: "Tokens used", value: fmtNum(m.tokens.total + m.tokens.subagent), note: `about $${m.estCostUsd.toFixed(2)} at API list prices` },
    { label: "Prompts sent", value: String(m.humanTurns), note: `across ${m.sessions} session${m.sessions === 1 ? "" : "s"}` },
    { label: "Agent tool calls", value: fmtNum(m.toolCalls), note: fav && fav[1] ? `mostly ${fav[0]}` : void 0 },
    { label: "Lines written by AI", value: fmtNum(m.linesWritten) },
    { label: "Busiest hour", value: m.humanTurns ? hourLabel2(peakHour) : "n/a", note: m.nightOwlShare > 0.2 ? `${Math.round(m.nightOwlShare * 100)}% of prompts after 11pm` : void 0 },
    { label: "Times you said 'no'", value: String(m.corrections), note: m.interrupts ? `plus ${m.interrupts} hard interrupts` : void 0 },
    { label: "Politeness", value: String(m.politeness), note: `pleases and thank-yous across ${m.humanTurns} prompts` },
    { label: "Longest session", value: `${Math.round(m.longestSessionMinutes)} min` }
  ];
  if (m.profanity > 0) stats.push({ label: "Swears at the AI", value: String(m.profanity) });
  if (m.subagents > 0) stats.push({ label: "Subagents spawned", value: String(m.subagents) });
  return stats;
}
var MIN_RANKED_PROMPTS = 8;
var MIN_RANKED_EDITS = 2;
var tooShort = (m) => m.humanTurns < MIN_RANKED_PROMPTS || m.editTurns < MIN_RANKED_EDITS;
function provisionalMessage(r8) {
  if (!r8) return "Your vibe check isn't on the boards.";
  if (r8.kind === "sample") return "Your vibe check isn't on the boards because it was made from an example conversation.";
  if (r8.kind === "private") return "Your vibe check isn't on the boards because its numbers were computed on your device. Upload the conversations to be ranked.";
  if (r8.kind === "mixed") return "Your vibe check isn't on the boards because some of the conversations in it were sent as numbers only. Upload those conversations, and add them to your vibe check, to be ranked.";
  if (r8.kind === "rejected") return `Your vibe check isn't on the boards because too many of the conversations didn't pass the checks (${r8.rejected} of ${r8.uploaded}).`;
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const have = [r8.prompts < MIN_RANKED_PROMPTS ? plural(r8.prompts, "prompt") : null, r8.edits < MIN_RANKED_EDITS ? plural(r8.edits, "edit") : null].filter(Boolean).join(" and ");
  return `We need at least ${MIN_RANKED_PROMPTS} prompts and ${MIN_RANKED_EDITS} edits across your conversations; these have ${have}. Add more conversations.`;
}
function analyzeMetrics(m, calibration, opts = {}) {
  const cal = calibrationFor(m, calibration);
  const axes = computeAxes(m, cal);
  const skills = computeSkills(m, cal);
  return {
    metrics: m,
    axes,
    code: axesCode(axes, opts.previousCode),
    skills,
    vibeScore: vibeScore(skills),
    provisional: tooShort(m),
    insights: coachingFor(signalValues(m), cal?.signals),
    funStats: buildFunStats(m)
  };
}

// src/lib/analyzer/compact.ts
var SECRET_PATTERNS = [
  [/sk-ant-[A-Za-z0-9_-]{20,}/g, "[REDACTED_ANTHROPIC_KEY]"],
  [/sk-(proj-)?[A-Za-z0-9_-]{20,}/g, "[REDACTED_OPENAI_KEY]"],
  [/gh[pousr]_[A-Za-z0-9]{30,}/g, "[REDACTED_GITHUB_TOKEN]"],
  [/github_pat_[A-Za-z0-9_]{30,}/g, "[REDACTED_GITHUB_TOKEN]"],
  [/AKIA[0-9A-Z]{16}/g, "[REDACTED_AWS_KEY]"],
  [/xox[abprs]-[A-Za-z0-9-]{10,}/g, "[REDACTED_SLACK_TOKEN]"],
  [/AIza[0-9A-Za-z_-]{35}/g, "[REDACTED_GOOGLE_KEY]"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[REDACTED_PRIVATE_KEY]"],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, "[REDACTED_JWT]"],
  [/\b(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp):\/\/[^\s'"]+/g, "[REDACTED_DB_URL]"],
  // Stripe-style secret and restricted keys (sk_live_..., rk_test_...)
  [/\b[sr]k_(live|test)_[A-Za-z0-9]{16,}/g, "[REDACTED_STRIPE_KEY]"],
  // Authorization: Bearer <token>, as in curl -H (a token has a digit; "Bearer authentication" stays)
  [/\b(Bearer\s+)(?=[A-Za-z0-9._~+/-]*\d)[A-Za-z0-9._~+/-]{16,}=*/g, "$1[REDACTED]"],
  // name = value: also names that continue after "secret" (secret_access_key, SECRET_KEY_BASE) and *_key names
  [/((?:api[_-]?key|secret[A-Za-z0-9_-]{0,20}|(?:access|private|client)[_-]?key|token|password|passwd|pwd|auth)["']?\s*[:=]\s*["']?)[^\s"',;]{8,}/gi, "$1[REDACTED]"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]"]
];
function redactSecrets(s) {
  let out = s;
  for (const [re, rep] of SECRET_PATTERNS) out = out.replace(re, rep);
  return out;
}
var REDACT_PAST_CUT = 4096;
function clip(s, max) {
  if (s.length <= max) return redactSecrets(s);
  const lines = s.split("\n").length;
  return redactSecrets(s.slice(0, max + REDACT_PAST_CUT)).slice(0, max) + `\u2026\u27EAtrunc ${s.length}c ${lines}l\u27EB`;
}
var DROP_TYPES = /* @__PURE__ */ new Set(["attachment", "file-history-snapshot", "queue-operation", "atis-latch", "last-prompt", "tools-used", "summary"]);
var KEEP_EDIT_FIELDS = /* @__PURE__ */ new Set(["content", "new_string", "old_string", "new_source", "input", "arguments", "command", "cmd"]);
function walk(v, key, opts, inToolResult) {
  if (typeof v === "string") {
    const editField = KEEP_EDIT_FIELDS.has(key);
    const max = inToolResult ? opts.mode === "challenge" ? 4e3 : 240 : editField ? opts.mode === "challenge" ? 4e4 : key === "command" || key === "cmd" ? 1e3 : 400 : key === "text" || key === "message" ? 4e3 : 1e3;
    const c = clip(v, max);
    return opts.homePaths ? opts.homePaths.shorten(c) : c;
  }
  if (Array.isArray(v)) return v.map((x) => walk(x, key, opts, inToolResult));
  if (v && typeof v === "object") {
    const o = v;
    const out = {};
    const isTR = inToolResult || o.type === "tool_result" || o.type === "function_call_output" || o.type === "custom_tool_call_output";
    for (const [k, val] of Object.entries(o)) {
      if (k === "toolUseResult" || k === "snapshot" || k === "signature" || k === "encrypted_content" || k === "data") continue;
      if (k === "cwd" || k === "gitBranch") continue;
      if (o.type === "thinking" && k === "thinking") {
        out[k] = "";
        continue;
      }
      if (o.type === "reasoning" && (k === "summary" || k === "content")) continue;
      out[k] = walk(val, k, opts, isTR);
    }
    return out;
  }
  return v;
}
function compactRecord(rec, opts) {
  if (opts.shortenHomePaths !== false) opts = { ...opts, homePaths: learnRecord(opts.homePaths ?? new HomePaths(opts.homes), rec) };
  const stub = () => typeof rec.uuid === "string" ? { type: "stub", uuid: rec.uuid, parentUuid: rec.parentUuid ?? null, timestamp: rec.timestamp, sessionId: rec.sessionId, isSidechain: rec.isSidechain } : null;
  if (rec.type === "attachment") {
    const a = rec.attachment || {};
    if (a.type !== "queued_command" || a.isMeta === true) return stub();
    const kind = (a.origin || {}).kind;
    const origin = typeof kind === "string" && kind !== "human" && kind !== "user" ? { origin: { kind } } : {};
    return { type: "attachment", uuid: rec.uuid, parentUuid: rec.parentUuid ?? null, timestamp: rec.timestamp, sessionId: rec.sessionId, attachment: { type: a.type, commandMode: a.commandMode, prompt: walk(a.prompt, "text", opts, false), ...origin } };
  }
  if (rec.type === "user" && rec.origin && typeof rec.origin === "object") rec = { ...rec, origin: { kind: rec.origin.kind } };
  if (typeof rec.type === "string" && DROP_TYPES.has(rec.type)) return stub();
  if (rec.type === "session_meta") {
    const p = rec.payload || {};
    const sub = p.source && typeof p.source === "object" ? p.source.subagent : void 0;
    const parent = sub?.thread_spawn?.parent_thread_id;
    const source = sub === void 0 ? void 0 : { subagent: typeof parent === "string" ? { thread_spawn: { parent_thread_id: parent.slice(0, 100) } } : typeof sub === "string" ? sub.slice(0, 40) : {} };
    return { timestamp: rec.timestamp, type: "session_meta", payload: { id: p.id, cli_version: p.cli_version, timestamp: p.timestamp, ...source ? { source } : {} } };
  }
  const rp = rec.type === "response_item" ? rec.payload || {} : {};
  if (rp.type === "custom_tool_call" && rp.name === "exec" && typeof rp.input === "string") {
    const calls = scriptCalls(rp.input);
    if (calls.length) {
      const out = walk({ ...rec, payload: { ...rp, input: "" } }, "", opts, false);
      const script = calls.map((c) => `text(await tools.${c.name}(${c.arg === void 0 ? "" : JSON.stringify(walk(c.arg, typeof c.arg === "string" ? "input" : "", opts, false))}));`);
      out.payload.input = script.join("\n");
      return out;
    }
  }
  if (rec.type === "turn_context") {
    const p = rec.payload || {};
    return { timestamp: rec.timestamp, type: "turn_context", payload: { model: p.model } };
  }
  return walk(rec, "", opts, false);
}
function learnRecord(paths, rec) {
  if (typeof rec.cwd === "string") paths.learnHome(rec.cwd);
  const p = rec.payload;
  if (p && typeof p === "object" && typeof p.cwd === "string") paths.learnHome(p.cwd);
  return paths;
}
function compactLine(line, opts = { mode: "analysis" }) {
  const l = line.trim();
  if (!l || l[0] !== "{") return null;
  opts.homePaths?.learnText(l);
  try {
    const c = compactRecord(JSON.parse(l), opts);
    return c ? JSON.stringify(c) : null;
  } catch {
    return null;
  }
}
function compactTranscript(text, opts = { mode: "analysis" }) {
  if (opts.shortenHomePaths !== false && !opts.homePaths) {
    const homePaths = new HomePaths(opts.homes);
    homePaths.learnText(text);
    opts = { ...opts, homePaths };
  }
  const out = [];
  for (const line of text.split("\n")) {
    const c = compactLine(line, opts);
    if (c) out.push(c);
  }
  return out.join("\n");
}

// src/lib/analyzer/merge.ts
function mergeTranscripts(texts) {
  const seen = /* @__PURE__ */ new Set();
  const rows = [];
  let added = false;
  for (const [f, text] of texts.entries()) {
    let last = 0;
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line || line[0] !== "{") continue;
      let rec;
      try {
        rec = JSON.parse(line);
      } catch {
        continue;
      }
      const key = typeof rec.uuid === "string" ? `u:${rec.uuid}` : `l:${line}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const t = Date.parse(typeof rec.timestamp === "string" ? rec.timestamp : "");
      if (!isNaN(t)) last = t;
      rows.push({ line, t: last, i: rows.length });
      if (f > 0) added = true;
    }
  }
  if (added) rows.sort((a, b) => a.t - b.t || a.i - b.i);
  return rows.map((r8) => r8.line).join("\n");
}
var mainThread = (s) => s.source === "claude-code" && s.events.length > 0;
function joinSplitSessions(items, sessionOf, rebuild) {
  const groups = /* @__PURE__ */ new Map();
  for (const it of items) {
    const s = sessionOf(it);
    if (mainThread(s)) groups.set(s.id, [...groups.get(s.id) ?? [], it]);
  }
  const out = [];
  for (const it of items) {
    const s = sessionOf(it);
    const g2 = mainThread(s) ? groups.get(s.id) : [it];
    if (g2.length === 1) out.push(it);
    else if (g2[0] === it) {
      const files = [...g2].sort((a, b) => sessionOf(a).startedAt - sessionOf(b).startedAt);
      const text = mergeTranscripts(files.map((x) => x.text));
      const session = parseSession(text, s.id);
      out.push(session ? rebuild(files[0], text, session) : it);
    }
  }
  return out;
}

// src/lib/zst.ts
var ZST_MAX_BYTES = 5 * 1024 * 1024 * 1024;
var ZST_MAX_WINDOW = 128 * 1024 * 1024;
var ZstError = class extends Error {
};
var u32 = (b, i) => (b[i] | b[i + 1] << 8 | b[i + 2] << 16 | b[i + 3] << 24) >>> 0;
var ZstFrameGuard = class {
  constructor(cap = ZST_MAX_BYTES, maxWindow = ZST_MAX_WINDOW) {
    this.cap = cap;
    this.maxWindow = maxWindow;
    this.hdr = [];
    this.skip = 0;
    this.inFrame = false;
    this.frames = 0;
    this.declared = 0;
    this.checksum = false;
  }
  push(b) {
    let i = 0;
    while (i < b.length) {
      if (this.skip) {
        const n = Math.min(this.skip, b.length - i);
        this.skip -= n;
        i += n;
        continue;
      }
      this.hdr.push(b[i++]);
      if (this.inFrame) this.block();
      else this.frame();
    }
  }
  /** The stream ended: it must end between frames, after at least one. */
  end() {
    if (this.inFrame || this.skip || this.hdr.length) throw new ZstError("cut short");
    if (!this.frames) throw new ZstError("not a zstd file");
  }
  frame() {
    const h = this.hdr;
    if (h.length < 4) return;
    const magic = u32(h, 0);
    if ((magic & 4294967280) === 407710288) {
      if (h.length < 8) return;
      this.skip = u32(h, 4);
      this.hdr = [];
      return;
    }
    if (magic !== 4247762216) throw new ZstError("not a zstd file");
    if (h.length < 5) return;
    const flg = h[4];
    if (flg & 8) throw new ZstError("corrupt");
    const single = flg >> 5 & 1;
    const dictBytes = [0, 1, 2, 4][flg & 3];
    const fcf = flg >> 6;
    const sizeBytes = fcf ? 1 << fcf : single;
    if (h.length < 5 + (single ? 0 : 1) + dictBytes + sizeBytes) return;
    let p = 5;
    let window = 0;
    if (!single) {
      const wd = h[p++];
      const base = 2 ** (10 + (wd >> 3));
      window = base + base / 8 * (wd & 7);
    }
    p += dictBytes;
    let size2 = -1;
    if (sizeBytes === 1) size2 = h[p];
    else if (sizeBytes === 2) size2 = (h[p] | h[p + 1] << 8) + 256;
    else if (sizeBytes === 4) size2 = u32(h, p);
    else if (sizeBytes === 8) size2 = u32(h, p) + u32(h, p + 4) * 2 ** 32;
    if (single) window = size2;
    if (size2 >= 0) {
      this.declared += size2;
      if (this.declared > this.cap) throw new ZstError("too large");
    }
    if (window > this.maxWindow) throw new ZstError(window > this.cap ? "too large" : "window too large");
    this.checksum = (flg >> 2 & 1) === 1;
    this.inFrame = true;
    this.frames++;
    this.hdr = [];
  }
  // a block: a 3-byte header with the last-block bit, the type and the size on disk (an RLE block stores 1 byte)
  block() {
    const h = this.hdr;
    if (h.length < 3) return;
    const v = h[0] | h[1] << 8 | h[2] << 16;
    const type = v >> 1 & 3;
    if (type === 3) throw new ZstError("corrupt");
    const size2 = v >> 3;
    if (size2 > 128 * 1024) throw new ZstError("corrupt");
    this.skip = type === 1 ? 1 : size2;
    this.hdr = [];
    if (v & 1) {
      this.inFrame = false;
      if (this.checksum) this.skip += 4;
    }
  }
};
function zstDecoder(lib, out, cap = ZST_MAX_BYTES) {
  const guard = new ZstFrameGuard(cap);
  let outErr;
  const d = new lib.Decompress((chunk) => {
    if (!chunk.length) return;
    try {
      out(chunk);
    } catch (e) {
      outErr = e;
      throw e;
    }
  });
  const run = (f) => {
    try {
      f();
    } catch (e) {
      if (e === outErr || e instanceof ZstError) throw e;
      throw new ZstError("corrupt");
    }
  };
  return {
    push(chunk) {
      guard.push(chunk);
      run(() => d.push(chunk));
    },
    end() {
      guard.end();
      run(() => d.push(new Uint8Array(0), true));
    }
  };
}

// src/lib/transcript-stream.ts
var MAX_TRANSCRIPT_BYTES = ZST_MAX_BYTES;
var MAX_LINE_CHARS = 64 * 1024 * 1024;
var HEAD_CHARS = 2e6;
var TranscriptTooLarge = class extends Error {
  constructor(cap) {
    super("too large");
    this.cap = cap;
  }
};
var CompactTooLarge = class extends Error {
};
var TranscriptTimeout = class extends Error {
  constructor() {
    super("took too long");
  }
};
var DEFAULT_BUDGET = { stallMs: 6e4, baseMs: 3e4, msPerMB: 60 };
var GB = (n) => `${Math.round(n / 1024 ** 3 * 10) / 10} GB`;
var size = (n) => n >= 1024 ** 3 ? GB(n) : `${Math.round(n / 1024 / 1024)} MB`;
function skipReason(name, e) {
  if (e instanceof TranscriptTooLarge || e instanceof ZstError && e.message === "too large") {
    const cap = e instanceof TranscriptTooLarge ? e.cap : MAX_TRANSCRIPT_BYTES;
    return `${name.endsWith(".zst") ? "it would decompress to" : "it's"} more than ${size(cap)}`;
  }
  if (e instanceof ZstError) return "it isn't a readable zstd file";
  if (e instanceof TranscriptTimeout) return "reading it took too long";
  const msg = e instanceof Error ? e.message : String(e);
  return `it couldn't be read${msg ? ` (${msg.replace(/\s+/g, " ").slice(0, 80)})` : ""}`;
}
function skipNote(name, e) {
  return `Skipped ${name}: ${skipReason(name, e)}.`;
}
function longLineNote(name, n) {
  return `In ${name}, ${n === 1 ? "a record" : `${n} records`} longer than ${size(MAX_LINE_CHARS)} ${n === 1 ? "was" : "were"} left out.`;
}
var LineSplitter = class {
  constructor(onLine, maxBytes = MAX_TRANSCRIPT_BYTES, maxLine = MAX_LINE_CHARS) {
    this.onLine = onLine;
    this.maxBytes = maxBytes;
    this.maxLine = maxLine;
    this.dec = new TextDecoder();
    this.parts = [];
    this.partLen = 0;
    this.over = false;
    this.bytes = 0;
    this.longLines = 0;
  }
  feed(chunk) {
    this.bytes += chunk.length;
    if (this.bytes > this.maxBytes) throw new TranscriptTooLarge(this.maxBytes);
    this.text(this.dec.decode(chunk, { stream: true }));
  }
  end() {
    this.text(this.dec.decode());
    this.flush();
  }
  text(s) {
    let i = 0;
    for (; ; ) {
      const j = s.indexOf("\n", i);
      if (j < 0) return this.add(s, i, s.length);
      this.add(s, i, j);
      this.flush();
      i = j + 1;
    }
  }
  add(s, i, j) {
    if (i === j || this.over) return;
    if (this.partLen + (j - i) > this.maxLine) {
      this.over = true;
      this.parts = [];
      this.partLen = 0;
      return;
    }
    this.parts.push(i === 0 && j === s.length ? s : s.slice(i, j));
    this.partLen += j - i;
  }
  flush() {
    if (this.over) {
      this.over = false;
      this.longLines++;
      return;
    }
    const line = this.parts.length === 1 ? this.parts[0] : this.parts.join("");
    this.parts = [];
    this.partLen = 0;
    this.onLine(line);
  }
};
function within(p, ms) {
  if (!ms) return p;
  let timer;
  return Promise.race([p, new Promise((_, rej) => timer = setTimeout(() => rej(new TranscriptTimeout()), ms))]).finally(() => clearTimeout(timer));
}
async function* chunksOf(src, stallMs) {
  if (!("getReader" in src)) {
    const it = src[Symbol.asyncIterator]();
    try {
      for (; ; ) {
        const r8 = await within(it.next(), stallMs);
        if (r8.done) return;
        yield r8.value;
      }
    } finally {
      void it.return?.();
    }
  }
  const reader = src.getReader();
  let done = false;
  try {
    for (; ; ) {
      const r8 = await within(reader.read(), stallMs);
      if (r8.done) {
        done = true;
        return;
      }
      yield r8.value;
    }
  } finally {
    if (!done) void reader.cancel().catch(() => {
    });
  }
}
var pause = () => new Promise((r8) => setTimeout(r8, 0));
var lastYield = 0;
var STEP = 256 * 1024;
var ZST_OUT = 2 * 1024 * 1024;
async function scanTranscript(src, o = {}) {
  const parser = o.parse === false ? null : new SessionParser(o.id);
  const compacted = o.compact ? [] : null;
  const compactOpts = o.compact && o.compact.shortenHomePaths !== false && !o.compact.homePaths ? { ...o.compact, homePaths: new HomePaths(o.compact.homes) } : o.compact;
  let compactChars = 0;
  const headLines = [];
  let headChars = 0;
  const wantHead = o.head ?? 0;
  const splitter = new LineSplitter(
    (line) => {
      if (headChars < wantHead) {
        headLines.push(line);
        headChars += line.length + 1;
      }
      parser?.line(line);
      if (compacted) {
        const c = compactLine(line, compactOpts);
        if (c !== null) {
          compactChars += c.length + (compacted.length ? 1 : 0);
          if (o.maxCompactChars !== void 0 && compactChars > o.maxCompactChars) throw new CompactTooLarge(`That\u2019s more than ${size(o.maxCompactChars)} after shortening, and the limit is ${size(o.maxCompactChars)}. Choose fewer conversations, or use the CLI.`);
          compacted.push(c);
        }
      }
    },
    o.maxBytes ?? MAX_TRANSCRIPT_BYTES,
    o.maxLine ?? MAX_LINE_CHARS
  );
  const dec = o.zstd ? zstDecoder(o.zstd, (c) => splitter.feed(c), o.maxBytes ?? MAX_TRANSCRIPT_BYTES) : null;
  const yieldMs = o.yieldMs ?? 25;
  const budget = o.budget === false ? null : o.budget ?? DEFAULT_BUDGET;
  let busy = 0;
  let input = 0;
  const zstStep = () => splitter.bytes ? Math.max(1024, Math.min(STEP, Math.floor(ZST_OUT * input / splitter.bytes))) : 16 * 1024;
  for await (const chunk of chunksOf(src, budget?.stallMs ?? 0)) {
    let mark = Date.now();
    for (let i = 0; i < chunk.length; ) {
      const piece = chunk.subarray(i, i + (dec ? zstStep() : STEP));
      i += piece.length;
      if (dec) dec.push(piece);
      else splitter.feed(piece);
      input += piece.length;
      const now = Date.now();
      if (budget && busy + (now - mark) > budget.baseMs + splitter.bytes / 1024 / 1024 * budget.msPerMB) throw new TranscriptTimeout();
      if (yieldMs && now - lastYield >= yieldMs) {
        busy += now - mark;
        o.onProgress?.(input);
        await pause();
        mark = lastYield = Date.now();
      }
    }
    busy += Date.now() - mark;
  }
  dec?.end();
  splitter.end();
  o.onProgress?.(input);
  return { session: parser ? parser.finish() : null, compacted: compacted ? compacted.join("\n") : null, head: headLines.join("\n"), bytes: splitter.bytes, longLines: splitter.longLines };
}
async function* textChunks(text) {
  yield new TextEncoder().encode(text);
}
function pickedText(name, text, compact = { mode: "analysis" }) {
  return {
    name,
    scan: async (onProgress) => scanTranscript(textChunks(await text()), { id: name, head: HEAD_CHARS, onProgress }),
    compact: async (maxChars) => (await scanTranscript(textChunks(await text()), { parse: false, compact, maxCompactChars: maxChars })).compacted ?? "",
    text
  };
}
async function readSelection(files, o = {}) {
  const out = { read: [], skipped: [], notes: [] };
  for (const [k, f] of files.entries()) {
    o.onFile?.(k, files.length, f);
    try {
      const scan2 = await f.scan(o.onProgress && ((n) => o.onProgress(k, f, n)));
      if (scan2.session) computeMetrics([scan2.session], { tzOffsetMinutes: 0 });
      o.each?.(f, scan2);
      if (scan2.longLines) out.notes.push(longLineNote(f.name, scan2.longLines));
      out.read.push({ file: f, session: scan2.session });
    } catch (e) {
      out.skipped.push({ name: f.name, why: skipReason(f.name, e) });
    }
  }
  return out;
}
async function joinSplitRead(read, compact) {
  const mainThread2 = (s) => !!s && s.source === "claude-code" && s.events.length > 0;
  const n = /* @__PURE__ */ new Map();
  for (const r8 of read) if (mainThread2(r8.session)) n.set(r8.session.id, (n.get(r8.session.id) ?? 0) + 1);
  const groups = /* @__PURE__ */ new Map();
  for (const r8 of read) if (mainThread2(r8.session) && n.get(r8.session.id) > 1) groups.set(r8.session.id, [...groups.get(r8.session.id) ?? [], r8]);
  if (!groups.size) return read;
  const gone = /* @__PURE__ */ new Set();
  const joined = [];
  for (const g2 of groups.values()) {
    let loaded;
    try {
      loaded = await Promise.all(g2.map(async (r8) => ({ file: r8.file, session: r8.session, text: await r8.file.text() })));
    } catch {
      continue;
    }
    const [one] = joinSplitSessions(loaded, (x) => x.session, (first, text, session) => ({ text, session, file: { ...pickedText(first.file.name, async () => text, compact), path: first.file.path } }));
    for (const r8 of g2) gone.add(r8);
    joined.push({ file: one.file, session: one.session });
  }
  return [...read.filter((r8) => !gone.has(r8)), ...joined];
}
function skippedSummary(skipped, total) {
  return `${skipped} of ${total} file${total === 1 ? "" : "s"} couldn't be read`;
}

// src/lib/analyzer/history.ts
var PERIODS = ["day", "week", "month", "quarter", "year"];
var HISTORY_KEYS = SIGNALS.filter((s) => !s.wrapped).map((s) => s.key);
var MAX_BUCKETS = 400;
function localDateKey(instantMs, session, opts = {}) {
  return localParts(instantMs, session, opts).dateKey;
}
function periodKey(dateKey, period) {
  const y = dateKey.slice(0, 4), m = Number(dateKey.slice(5, 7));
  switch (period) {
    case "day":
      return dateKey;
    case "month":
      return dateKey.slice(0, 7);
    case "quarter":
      return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
    case "year":
      return y;
    case "week": {
      const d = /* @__PURE__ */ new Date(`${dateKey}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
      return d.toISOString().slice(0, 10);
    }
  }
}
var round = (x) => x === 0 ? 0 : +x.toPrecision(4);
function buildTimeline(sessions, opts = {}) {
  const g2 = timelineSteps(sessions, opts);
  let r8 = g2.next();
  while (!r8.done) r8 = g2.next();
  return r8.value;
}
function* timelineSteps(sessions, opts) {
  const tz = opts.tzOffsetMinutes ?? 0;
  const startOf = /* @__PURE__ */ new Map();
  const startSession = /* @__PURE__ */ new Map();
  let any = false;
  for (const s of sessions) {
    const t = startOf.get(s.id);
    if (t === void 0 || s.startedAt < t) {
      startOf.set(s.id, s.startedAt);
      startSession.set(s.id, s);
    }
    if (!any && s.events.some((e) => e.kind === "prompt")) any = true;
  }
  if (!any) return null;
  let first = Infinity, last = -Infinity;
  for (const t of startOf.values()) {
    if (t < first) first = t;
    if (t > last) last = t;
  }
  const dateOf = /* @__PURE__ */ new Map();
  for (const [id, t] of startOf) dateOf.set(id, localDateKey(t, startSession.get(id), opts));
  const periods = {};
  for (const period of opts.periods ?? PERIODS) {
    const groups = /* @__PURE__ */ new Map();
    for (const s of sessions) {
      const k = periodKey(dateOf.get(s.id), period);
      const g2 = groups.get(k);
      if (g2) g2.push(s);
      else groups.set(k, [s]);
    }
    const keys = [...groups.keys()].sort().slice(-MAX_BUCKETS);
    const out = [];
    for (const k of keys) {
      const m = computeMetrics(groups.get(k), opts);
      if (m.sessions > 0) {
        const sv = signalValues(m);
        out.push({ k, s: m.sessions, p: m.humanTurns, e: m.editTurns, v: HISTORY_KEYS.map((key) => sv[key] === null || sv[key] === void 0 ? null : round(sv[key])) });
      }
      yield;
    }
    periods[period] = out;
  }
  return { v: 1, keys: HISTORY_KEYS, tz, first, last, periods };
}

// src/lib/analyzer/narrative.ts
var NARRATIVE_VERSION = 2;
var MAX_PROMPTS = 40;
var PROMPT_CHARS = 280;
var VIBE_TYPE_SCRUB = `each cut to ${PROMPT_CHARS} characters, with secrets, emails and links removed and file paths cut to the file name`;
function vibeTypeSendNotice(n) {
  return `To write your vibe type, we send our AI provider ${n === 1 ? "1 of your prompts" : `${n} of your prompts`}, ${VIBE_TYPE_SCRUB}, together with your habit numbers and when you work. We don\u2019t keep them, and the provider doesn\u2019t use them to train models. Your conversations stay here, and this vibe check stays off the boards.`;
}
function scrubPrompt(s) {
  return redactSecrets(s).replace(/https?:\/\/\S+/gi, "[link]").replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]").replace(/(?:~|\.{1,2})?(?:[\\/][\w.@-]+){2,}[\\/]?/g, (m) => m.split(/[\\/]/).filter(Boolean).pop() ?? "[path]").replace(/<[^>]{1,80}>/g, " ").replace(/\s+/g, " ").trim().slice(0, PROMPT_CHARS);
}
var median2 = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
function pickPrompts(sessions) {
  const per2 = sessions.map((s) => s.events.filter((e) => e.kind === "prompt" && !e.slash).map((e) => scrubPrompt(e.text)).filter((t) => t.length >= 12)).filter((p) => p.length);
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (let round2 = 0; out.length < MAX_PROMPTS && per2.some((p) => p.length > round2); round2++) {
    for (const p of per2) {
      if (out.length >= MAX_PROMPTS) break;
      const i = round2 === 0 ? 0 : Math.min(p.length - 1, Math.round(round2 * p.length / 4));
      const t = p[i];
      if (t && !seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
    if (round2 > 6) break;
  }
  return out;
}
var NOT_IN_STORY = /* @__PURE__ */ new Set(["typos", "verbosity", "english"]);
function digestHabits(values, ref) {
  return SIGNALS.filter((s) => values[s.key] !== null && values[s.key] !== void 0 && !NOT_IN_STORY.has(s.key)).map((s) => {
    const v = values[s.key];
    return { key: s.key, name: s.name, value: s.fmt(v), pct: percentilePrecise(s.key, v, ref) };
  });
}
function buildNarrativeDigest(sessions, values, ref, time = {}) {
  const habits = digestHabits(values, ref);
  const local = localTime(time);
  const prompts = sessions.flatMap((s) => s.events.filter((e) => e.kind === "prompt" && !e.slash));
  const at = sessions.flatMap((s) => s.events.filter((e) => e.kind === "prompt" && !e.slash).map((p) => local(p.t, s)));
  const night = at.filter((d) => d.hour >= 22 || d.hour < 5).length;
  const weekend = at.filter((d) => d.weekday === 0 || d.weekday === 6).length;
  const days = new Set(at.map((d) => d.dateKey)).size;
  const models = [...new Set(sessions.flatMap((s) => s.models))].filter(Boolean).slice(0, 6);
  return {
    v: NARRATIVE_VERSION,
    habits,
    rhythm: {
      sessions: sessions.filter((s) => s.events.some((e) => e.kind === "prompt")).length,
      activeDays: days,
      nightShare: prompts.length ? Math.round(night / prompts.length * 100) / 100 : 0,
      weekendShare: prompts.length ? Math.round(weekend / prompts.length * 100) / 100 : 0,
      promptsPerSession: median2(sessions.map((s) => s.events.filter((e) => e.kind === "prompt").length).filter((n) => n > 0)),
      longestSessionHours: Math.round(Math.max(0, ...sessions.map((s) => (s.endedAt - s.startedAt) / 36e5)) * 10) / 10,
      models
    },
    prompts: pickPrompts(sessions)
  };
}
var TRAIT_SIGNALS = SIGNALS.filter((s) => !s.wrapped && s.key !== "hours" || s.key === "weekend" || s.key === "outbursts").map((s) => s.key);
var TRAIT_SET = new Set(TRAIT_SIGNALS);

// src/lib/analyzer/combine.ts
var ledgerKey = (s) => `${s.source === "codex" ? "codex" : "claude"}:${s.id}`;
function ledgerEntries(sessions, opts = {}) {
  const groups = /* @__PURE__ */ new Map();
  for (const s of sessions) groups.set(ledgerKey(s), [...groups.get(ledgerKey(s)) ?? [], s]);
  const out = [];
  for (const [k, g2] of groups) {
    const first = g2.reduce((a, b) => b.startedAt < a.startedAt ? b : a);
    const parts = {};
    const m = computeMetrics(g2, { ...opts, parts });
    if (!m.sessions) continue;
    out.push({ k, at: first.startedAt, day: localDateKey(first.startedAt, first, opts), m, parts });
  }
  return out;
}

// src/lib/consent.ts
var CONSENT_VERSION = "2026-11-14";
var RIGHTS_STATEMENT = "I'm allowed to upload these conversations, and they don't contain sensitive, confidential or illegal material (such as credentials, other people's personal data, or code I'm not permitted to share).";
var IMPROVEMENT_STATEMENT = "Let Vibrometer and its partners use these conversations, with common secrets, email addresses and home-folder names removed, to improve their services.";
var IMPROVEMENT_NOTE = "Optional. It applies only to this upload, and you can withdraw it later from your account page.";
var RESEARCH_STATEMENT = "Let Vibrometer use the numbers measured from this upload (never the conversations themselves) to study which habits lead to better results, and publish findings that can't identify anyone.";
var RESEARCH_NOTE = "Optional. It applies only to this upload, and you can withdraw it later from your account page.";
var RIGHTS_REQUIRED_ERROR = `Confirm this statement before uploading: "${RIGHTS_STATEMENT}" Send confirmRights: true with the upload (in the CLI, add --confirm-rights).`;
var consentFields = (allowImprovement, allowResearch = false) => ({
  confirmRights: true,
  allowImprovement,
  allowResearch,
  consentVersion: CONSENT_VERSION
});

// src/lib/server/direction.ts
var FILLER = new Set(
  "a an and or but the this that these those it its it's is are was were be been being am do does did done doing to of in on at by for with from as into onto up down out over so then than too very just also still even only now again already please pls plz thanks thank thx ty i me my we us our you your yours he she her him his they them their what which who how when where why there here yes yeah yep yup ya y ok okay k kk sure fine good great nice cool perfect alright right correct exactly agreed agree approve approved lgtm sgtm ack go ahead proceed continue continuing keep going carry on next more sounds looks seems can could would should will shall may might must let lets let's want need like try trying get got make made solve solved solving solution implement implemented implementation build finish finished complete completed work working do it everything all whole entire full rest remaining anything something stuff thing things challenge task problem ticket job spec code coding test tests testing tested pass passing passes fail failing failed fix fixed bug bugs error errors run running rerun submit submitted submission until till start started begin go on yourself own alone autonomously automatically best whatever think see know claude agent ai model no nope not don't dont stop wait hold".split(/\s+/)
);
var wordsOf2 = (s) => (s.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'._%-]*/gu) ?? []).map((w) => w.replace(/[.'_%-]+$/, ""));
function contentWords3(text) {
  return wordsOf2(text).filter((w) => w.length > 1 && !FILLER.has(w));
}
var ASK_CMD = /\bvibrometer(?:\.mjs)?["']?\s+ask\s+([\s\S]+)$/i;
function askQuestion(command) {
  const m = command.match(ASK_CMD);
  if (!m) return null;
  const q = m[1].trim().replace(/^["'`]|["'`]$/g, "").trim();
  return q && !q.startsWith("--") ? q : null;
}

// src/lib/client/uploads.ts
var PRESIGNED_UPLOAD_THRESHOLD = 4 * 1024 * 1024;
var MAX_UPLOAD_BYTES = 500 * 1024 * 1024;
var MAX_UPLOAD_LABEL = `${MAX_UPLOAD_BYTES / 1024 / 1024} MB`;
async function gzipText(text) {
  const gz = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Response(gz).blob();
}
async function uploadTranscripts(transcripts, consent, concurrency = 4, onProgress) {
  const o = typeof concurrency === "number" ? { concurrency, onProgress } : concurrency;
  const f = o.fetch ?? fetch;
  const blobs = [];
  for (const t of transcripts) blobs.push(await gzipText(t));
  const res = await f(`${o.base ?? ""}/api/uploads`, {
    method: "POST",
    headers: { "content-type": "application/json", ...o.headers },
    body: JSON.stringify({ files: blobs.map((b) => ({ size: b.size, encoding: "gzip" })), ...consent })
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d.files) throw new Error(d.error || "Upload failed");
  const files = d.files;
  let next = 0;
  let done = 0;
  o.onProgress?.(0, files.length);
  const worker = async () => {
    while (next < files.length) {
      const i = next++;
      const r8 = await f(files[i].url, { method: files[i].method, headers: files[i].headers, body: blobs[i] }).catch((e) => {
        throw new Error(`couldn't reach ${new URL(files[i].url, "http://localhost").host}`, { cause: e });
      });
      if (!r8.ok) throw new Error(`Upload failed (HTTP ${r8.status})`);
      o.onProgress?.(++done, files.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(o.concurrency ?? 4, files.length) }, worker));
  return files.map((x) => x.key);
}

// src/cli/vibrometer.ts
var PRIVACY = `Before you upload, leave out any conversation that contains personal, sensitive or confidential
information: customer or patient data, credentials, financial or health details, or code and documents
that you aren't allowed to share. We strip common secrets (API keys, tokens, passwords, emails) and
replace home folders in paths with ~, but we can't recognise everything, so choose what to include.
To write your vibe type, the server sends your prompts, with secrets, emails, links and paths removed,
to our AI provider (not kept); --private sends none unless you add --vibe-type.`;
var CONSENT = `Uploading conversations needs your confirmation of this statement (add --confirm-rights):
  "${RIGHTS_STATEMENT}"

To also agree to this statement, add --allow-improvement:
  "${IMPROVEMENT_STATEMENT}"
  ${IMPROVEMENT_NOTE}

Separately, to agree to this statement, add --allow-research:
  "${RESEARCH_STATEMENT}"
  ${RESEARCH_NOTE}`;
var flagOn = (v) => v === true || typeof v === "string" && !/^(false|no|0)$/i.test(v);
function requireConsent(flags, retry) {
  if (!flagOn(flags["confirm-rights"])) {
    console.log(`
Nothing was uploaded. Uploading conversations needs your confirmation of this statement:
  "${RIGHTS_STATEMENT}"`);
    console.log(`
If the statement is true, run ${retry} again with --confirm-rights added.`);
    console.log(`You can also add --allow-improvement to agree to this statement:
  "${IMPROVEMENT_STATEMENT}"
  ${IMPROVEMENT_NOTE}`);
    console.log(`And, separately, --allow-research to agree to this statement:
  "${RESEARCH_STATEMENT}"
  ${RESEARCH_NOTE}`);
    process.exit(1);
  }
  return consentFields(flagOn(flags["allow-improvement"]), flagOn(flags["allow-research"]));
}
var CFG_DIR = process.env.VIBROMETER_HOME || join2(homedir(), ".vibrometer");
var CFG = join2(CFG_DIR, "config.json");
var ACTIVE = join2(CFG_DIR, "active-challenge.json");
var PENDING_LOGIN = join2(CFG_DIR, "pending-login.json");
var readJson = (p, d) => {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return d;
  }
};
var writeJson = (p, v) => {
  mkdirSync(dirname2(p), { recursive: true });
  writeFileSync(p, JSON.stringify(v, null, 2), { mode: 384 });
};
var cfg = () => readJson(CFG, {});
var server = () => (process.env.VIBROMETER_SERVER || cfg().server || (true ? "https://vibrometer.ai" : "") || "http://localhost:3000").replace(/\/$/, "");
function args() {
  const [cmd, ...rest] = process.argv.slice(2);
  const pos = [];
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const nxt = rest[i + 1];
      if (nxt && !nxt.startsWith("--")) {
        flags[k] = nxt;
        i++;
      } else flags[k] = true;
    } else pos.push(a);
  }
  return { cmd, pos, flags };
}
function selfPath() {
  try {
    return fileURLToPath(import.meta.url);
  } catch {
    return null;
  }
}
var flowCache = null;
var flowHeader = () => flowCache ??= cliFlow(process.env, selfPath());
async function api(path, body, headers = {}) {
  const c = cfg();
  const res = await fetch(server() + path, {
    method: body === void 0 ? "GET" : "POST",
    headers: {
      ...body === void 0 ? {} : { "content-type": "application/json" },
      "x-vibrometer-client": "cli",
      "x-vibrometer-flow": flowHeader(),
      ...c.token ? { authorization: `Bearer ${c.token}` } : {},
      ...headers
    },
    body: body === void 0 ? void 0 : JSON.stringify(body)
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text.slice(0, 300) };
  }
  if (!res.ok) throw new ApiError(String(data.error || `HTTP ${res.status}`), res.status);
  return data;
}
var ApiError = class extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
};
var authHeaders = () => {
  const c = cfg();
  return { "x-vibrometer-client": "cli", ...c.token ? { authorization: `Bearer ${c.token}` } : {} };
};
async function post(path, body) {
  const res = await fetch(server() + path, { method: "POST", headers: { "content-type": "application/json", "x-vibrometer-client": "cli", "x-vibrometer-flow": flowHeader() }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}
var LOGIN_FIRST = "Sign in first with `vibrometer login` (in Claude Code, /vibrometer:login). It opens the site, where you approve this computer.";
function requireLogin(what) {
  if (cfg().token) return;
  console.log(`
Nothing was ${what}. ${LOGIN_FIRST}`);
  process.exit(1);
}
function walk2(dir, out, since) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join2(dir, e.name);
    if (e.isDirectory()) {
      walk2(p, out, since);
    } else if (e.name.endsWith(".jsonl") || e.name.endsWith(".jsonl.zst")) {
      try {
        if (statSync(p).mtimeMs >= since) out.push(p);
      } catch {
      }
    }
  }
}
function transcriptRoots() {
  const roots = [join2(homedir(), ".claude", "projects"), join2(process.env.CODEX_HOME || join2(homedir(), ".codex"), "sessions")];
  if (process.env.CLAUDE_CONFIG_DIR) roots.push(join2(process.env.CLAUDE_CONFIG_DIR, "projects"));
  return roots.filter((r8) => existsSync2(r8));
}
function findTranscripts(sinceMs, max) {
  const files = [];
  for (const r8 of transcriptRoots()) walk2(r8, files, sinceMs);
  return files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs).slice(0, max);
}
var MAX_UPLOAD = Math.min(MAX_UPLOAD_BYTES, Number(process.env.VIBROMETER_MAX_UPLOAD_BYTES) || MAX_UPLOAD_BYTES);
var UPLOAD_LIMIT_LABEL = MAX_UPLOAD === MAX_UPLOAD_BYTES ? MAX_UPLOAD_LABEL : `${(MAX_UPLOAD / 1e6).toFixed(2)} MB`;
var createZstdDecompress2 = zlib.createZstdDecompress;
async function* guarded(file) {
  const guard = new ZstFrameGuard();
  for await (const c of file) {
    guard.push(c);
    yield c;
  }
  guard.end();
}
async function scanFile(f, o) {
  const zst = f.endsWith(".zst");
  if (zst && !createZstdDecompress2) throw new Error(`Node ${process.versions.node} can't read .jsonl.zst files; Node 22.15 or later can`);
  if (!zst && statSync(f).size > MAX_TRANSCRIPT_BYTES) throw new TranscriptTooLarge(MAX_TRANSCRIPT_BYTES);
  const file = createReadStream(f, { highWaterMark: 1 << 20 });
  const src = zst ? pipeline(Readable.from(guarded(file)), createZstdDecompress2(), () => {
  }) : file;
  try {
    return await scanTranscript(src, { yieldMs: 0, ...o });
  } catch (e) {
    if (zst && /^ZSTD_/.test(String(e?.code ?? ""))) throw new ZstError("corrupt");
    throw e;
  } finally {
    file.destroy();
  }
}
var pickedPath = (f) => ({
  name: f,
  scan: () => scanFile(f, { id: f }),
  // read again for an upload: it was read whole a moment ago, so only a stall stops it, not a slow machine
  compact: async (maxChars) => (await scanFile(f, { parse: false, compact: { mode: "analysis", homes: [homedir()] }, maxCompactChars: maxChars, budget: { ...DEFAULT_BUDGET, baseMs: Infinity } })).compacted ?? "",
  text: async () => (await scanFile(f, { parse: false, head: Infinity })).head
});
var listCsv = (v) => typeof v === "string" ? v.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean) : [];
var projectOf = (s, file) => s.cwd ? s.cwd.split(/[\\/]/).filter(Boolean).slice(-2).join("/") : file.split(/[\\/]/).slice(-2, -1)[0] ?? "unknown";
async function loadConversations(flags) {
  const last = flags.last === void 0 ? 0 : typeof flags.last === "string" ? Number(flags.last) : NaN;
  if (!Number.isInteger(last) || last < 0 || flags.last !== void 0 && last === 0) {
    console.log("--last takes a number of conversations, such as --last 20.");
    process.exit(1);
  }
  const days = Number(flags.days ?? 30);
  const max = Number(flags.max ?? 400);
  const files = flags.file ? String(flags.file).split(",") : findTranscripts(Date.now() - days * 864e5, max);
  if (!files.length) {
    console.log(`No transcripts found in ${transcriptRoots().join(", ") || "~/.claude/projects or ~/.codex/sessions"} from the last ${days} days.`);
    process.exit(1);
  }
  const tty = process.stderr.isTTY && files.length > 20;
  const sel = await readSelection(files.map(pickedPath), { onFile: (k, n) => tty && process.stderr.write(`\rReading ${k + 1} of ${n}\u2026`) });
  if (tty) process.stderr.write("\r\x1B[K");
  for (const x of sel.skipped.slice(0, 10)) console.log(`Skipped ${x.name}: ${x.why}.`);
  if (sel.skipped.length) console.log(`${skippedSummary(sel.skipped.length, files.length)}${sel.skipped.length > 10 ? ` (the first 10 are listed above)` : ""}; the rest were read.`);
  for (const n of sel.notes) console.log(n);
  const all = [];
  for (const { file, session: s } of await joinSplitRead(sel.read, { mode: "analysis", homes: [homedir()] })) if (s) all.push({ file: file.name, src: file, s, main: s.events.some((e) => e.kind === "prompt"), id: s.id.slice(0, 8), project: projectOf(s, file.name) });
  const inc = listCsv(flags.project);
  const exc = listCsv(flags["exclude-project"]);
  const only = listCsv(flags.sessions);
  const skip = listCsv(flags.exclude);
  const matched = all.filter((x) => {
    if (!x.main) return false;
    const where = (x.s.cwd ?? x.file).toLowerCase();
    if (inc.length && !inc.some((p) => where.includes(p))) return false;
    if (exc.some((p) => where.includes(p))) return false;
    if (only.length && !only.some((id) => x.s.id.toLowerCase().startsWith(id))) return false;
    if (skip.some((id) => x.s.id.toLowerCase().startsWith(id))) return false;
    return true;
  });
  const mains = last ? [...matched].sort((a, b) => b.s.startedAt - a.s.startedAt).slice(0, last) : matched;
  const ids = new Set(mains.map((x) => x.s.id));
  const chosen = [...mains, ...all.filter((x) => !x.main && ids.has(x.s.id))];
  return { mains, chosen };
}
function timeFields(flags) {
  const tz = typeof flags["time-zone"] === "string" ? flags["time-zone"] : deviceTimeZone();
  if (tz !== void 0 && !isValidZone(tz)) {
    console.log(`"${tz}" isn't a time zone. Use a name such as Europe/Berlin or America/New_York.`);
    process.exit(1);
  }
  try {
    return clientTimeFields(tz, typeof flags.away === "string" ? parseZoneRanges(flags.away) : void 0);
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
}
async function cmdList(flags) {
  const { mains } = await loadConversations(flags);
  const time = timeFields(flags);
  const rows = mains.map((x) => ({ id: x.id, project: x.project, date: localParts(x.s.startedAt, x.s, time).dateKey, prompts: x.s.events.filter((e) => e.kind === "prompt").length, firstPrompt: (x.s.firstPrompt ?? "").replace(/\s+/g, " ").slice(0, 80) })).sort((a, b) => a.project.localeCompare(b.project) || b.date.localeCompare(a.date));
  if (flags.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  let last = "";
  for (const r8 of rows) {
    if (r8.project !== last) console.log(`
${r8.project}`);
    last = r8.project;
    console.log(`  ${r8.id}  ${r8.date}  ${String(r8.prompts).padStart(3)} prompts  ${r8.firstPrompt}`);
  }
  console.log(`
${rows.length} conversations. Choose with --sessions <id,id,...>, --last N or --project / --exclude-project / --exclude.

${PRIVACY}`);
}
function narrativeDigestOf(sessions, values, time) {
  const d = buildNarrativeDigest(sessions.map(homeAgnostic), values, null, time);
  return { ...d, prompts: d.prompts.map((p) => shortenHomePaths(p, [homedir()])) };
}
function printDigest(d) {
  console.log(`
To write your vibe type, also sent:
   ${vibeTypeSendNotice(d.prompts.length)}`);
  console.log(`
   Your habit numbers: ${d.habits.map((h) => `${h.name} ${h.value}`).join("; ")}.`);
  const r8 = d.rhythm;
  console.log(`   When you work: ${r8.sessions} sessions over ${r8.activeDays} active days, ${Math.round(r8.nightShare * 100)}% of prompts at night, ${Math.round(r8.weekendShare * 100)}% on weekends, ${r8.promptsPerSession} prompts per session (median), longest session ${r8.longestSessionHours} h${r8.models.length ? `, models ${r8.models.join(", ")}` : ""}.`);
  console.log(`   The ${d.prompts.length === 1 ? "prompt" : `${d.prompts.length} prompts`}, exactly as sent:`);
  d.prompts.forEach((p, i) => console.log(`   ${String(i + 1).padStart(2)}. ${p}`));
}
async function requestVibeType(digest, sv) {
  try {
    const r8 = await api("/api/narrative", { digest, sv });
    return r8.narrative ?? null;
  } catch (e) {
    console.log(`
   No vibe type this time: ${e.message}`);
    return null;
  }
}
function selfCommand() {
  const p = process.argv[1];
  if (!p) return "vibrometer";
  const rel = relative(process.cwd(), p);
  const shown = rel && !rel.startsWith("..") && !isAbsolute(rel) ? rel : shortenHomePaths(p, [homedir()]);
  return `node ${/\s/.test(shown) ? JSON.stringify(shown) : shown}`;
}
var wantsSummary = (flags) => !!flags.summary || !flags.preview && Object.keys(flags).length === 0 && !!process.stdout.isTTY;
async function siteComparison() {
  try {
    const res = await fetch(server() + "/api/reference", { signal: AbortSignal.timeout(4e3) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    const r8 = d.reference;
    if (!r8 || typeof r8.n !== "object" || !r8.n || typeof r8.quantiles !== "object" || !r8.quantiles) throw new Error("no reference");
    return { ref: r8, labelsPhase3: d.labelsPhase3 === true };
  } catch {
    return { ref: null, labelsPhase3: false };
  }
}
async function cmdSummary(flags) {
  const comparison = siteComparison();
  const { mains, chosen } = await loadConversations(flags);
  if (!mains.length) {
    console.log("No conversations matched. Run `list` to see them and their ids.");
    process.exit(1);
  }
  const m = computeMetrics(chosen.map((c) => c.s), timeFields(flags));
  const lang = languageCoverage(m);
  const names = (ks) => ks.map((k) => SIGNAL_BY_KEY[k].name).join(", ");
  const notes = [
    ...lang.unmeasured.length ? [`Not measured for this language: ${names(lang.unmeasured)}.`] : [],
    ...lang.provisional.length ? [`Provisional, read from ${Math.round(lang.coverage * 100)}% of your prompts: ${names(lang.provisional)}.`] : []
  ];
  const cmp = await comparison;
  const text = renderSummary(
    {
      conversations: mains.length,
      prompts: m.humanTurns,
      days: Number(flags.days ?? 30),
      sources: [...new Set(mains.map((x) => x.s.source))],
      habits: headlineHabits(signalValues(m), cmp),
      online: cmp.ref !== null,
      fun: funLines(m),
      notes,
      command: selfCommand(),
      signedIn: !!cfg().token
    },
    summaryStyle(process.env, process.stdout)
  );
  console.log(text);
}
async function signInHere() {
  if (cfg().token || !process.stdout.isTTY || !process.stdin.isTTY) return;
  console.log("\nUploading needs an account. Signing you in first.");
  await cmdLogin([], {});
}
async function cmdAnalyze(flags) {
  if (wantsSummary(flags)) return cmdSummary(flags);
  const { mains, chosen } = await loadConversations(flags);
  if (!mains.length) {
    console.log("No conversations matched. Run `list` to see them and their ids.");
    process.exit(1);
  }
  const time = timeFields(flags);
  const analysis = analyzeMetrics(computeMetrics(chosen.map((c) => c.s), time));
  const m = analysis.metrics;
  const priv = !!flags.private;
  console.log(`
Read ${m.sessions} conversations \xB7 ${m.humanTurns} prompts \xB7 ${m.toolCalls} tool calls \xB7 ${Math.round(m.activeMinutes)} active min
`);
  console.log("  Your vibe check (preview; the site compares you with everyone):");
  for (const l of headlineHabits(signalValues(m), { ref: null, labelsPhase3: false })) console.log(`   \xB7 ${l.text}. ${l.compare}.`);
  const lang = languageCoverage(m);
  const names = (ks) => ks.map((k) => SIGNAL_BY_KEY[k].name).join(", ");
  if (lang.unmeasured.length) console.log(`   Not measured for this language: ${names(lang.unmeasured)} (${Math.round((1 - lang.coverage) * 100)}% of your prompts are in a language whose prompt habits we can't read yet).`);
  if (lang.provisional.length) console.log(`   Provisional, read from ${Math.round(lang.coverage * 100)}% of your prompts: ${names(lang.provisional)}.`);
  const transcripts = [];
  let bytes = 0;
  let over = false;
  if (!priv)
    for (const c of chosen) {
      try {
        const t = await c.src.compact(MAX_UPLOAD - bytes);
        transcripts.push(t);
        bytes += Buffer.byteLength(t);
        if (bytes > MAX_UPLOAD) {
          over = true;
          break;
        }
      } catch (e) {
        if (!(e instanceof CompactTooLarge)) {
          console.log(skipNote(c.file, e));
          continue;
        }
        over = true;
        break;
      }
    }
  const vibeTypeOptIn = !!flags["vibe-type"];
  const add = !!flags.add;
  let ledgerCache = null;
  const ledgerOf = () => ledgerCache ??= ledgerEntries(chosen.map((c) => c.s), time);
  let numbersOnly = priv || over;
  const digest = narrativeDigestOf(chosen.map((c) => c.s), signalValues(m), time);
  const sendsDigest = () => priv ? vibeTypeOptIn : numbersOnly;
  const timelineOf = () => buildTimeline(chosen.map((c) => c.s), time);
  if (!priv && !over && !transcripts.length) {
    console.log("\nNone of those conversations could be read again for the upload, so nothing was uploaded. Run the same command again.");
    process.exit(1);
  }
  if (flags["dry-run"] || !flags.yes) {
    if (numbersOnly) {
      if (over) console.log(`
That's more than ${UPLOAD_LIMIT_LABEL} of conversations after compaction, more than one upload can hold, so they can't be uploaded and checked, and this vibe check won't be on the boards. With --yes, these are sent instead:`);
      const timeline2 = timelineOf();
      console.log("\nWould upload only these aggregate numbers (no conversation text):\n" + JSON.stringify(m, null, 2));
      console.log(`
\u2026and the same kind of numbers for each of the ${ledgerOf().length} conversations on its own, with the day it started, so that a later upload can be added to this vibe check (no conversation text).`);
      if (timeline2) console.log(`
\u2026and your habits as numbers per day, week, month, quarter and year (${timeline2.periods.month?.length ?? 0} months, ${timeline2.periods.day?.length ?? 0} days), for "Over time" on your vibe check.`);
      if (sendsDigest()) printDigest(digest);
      else console.log(`
No vibe type: in private mode nothing you wrote is sent. To get one, add --vibe-type: it also sends a scrubbed sample of up to ${MAX_PROMPTS} of your prompts to write it, and this preview shows exactly which.`);
    } else {
      console.log(`
Would upload ${mains.length} redacted conversation(s), ${(bytes / 1e6).toFixed(1)}MB:`);
      for (const x of mains) console.log(`   ${x.id}  ${localParts(x.s.startedAt, x.s, time).dateKey}  ${x.project.padEnd(28)}  ${(x.s.firstPrompt ?? "").replace(/\s+/g, " ").slice(0, 60)}`);
      console.log("Our server writes your vibe type from them.");
    }
    if (priv) console.log(`
${PRIVACY}

Nothing was uploaded. To upload exactly ${sendsDigest() ? "these numbers and this sample" : "these numbers"}, run the same command with --yes.`);
    else {
      console.log(`
${PRIVACY}

${CONSENT}`);
      console.log(`
Nothing was uploaded. To upload exactly ${over ? "these numbers and this sample" : "this selection"}, run the same command with --yes --confirm-rights (and --allow-improvement or --allow-research for each optional statement you agree to).`);
    }
    console.log("To change it: --sessions <id,...>, --exclude <id,...>, --last N (the most recent), --project / --exclude-project <name>, --days N, or --private (numbers only, no conversations, so no confirmation is needed; add --vibe-type for a vibe type from a scrubbed sample of prompts).");
    console.log(add ? "With --add, these are added to the vibe check already on your account (a conversation in both counts once)." : "This replaces the vibe check on your account. To add these to it instead (say, your laptop's sessions to a cloud session's), add --add.");
    if (!cfg().token) console.log(`
You're not signed in, and uploading needs an account. ${LOGIN_FIRST}`);
    return;
  }
  const consent = priv ? null : requireConsent(flags, "the same command");
  await signInHere();
  requireLogin("uploaded");
  if (over) console.log(`
That's more than ${UPLOAD_LIMIT_LABEL} after compaction (the most one upload can hold), so the conversations stay here: sending your numbers and the vibe type sample instead. This vibe check won't be on the boards; to be on them, narrow it down with --days or --project.`);
  const profile = {};
  for (const k of ["handle", "school", "major", "city", "region", "country", "github"]) if (typeof flags[k] === "string") profile[k] = flags[k];
  if (typeof flags["grad-year"] === "string") profile.gradYear = Number(flags["grad-year"]);
  if (flags["open-to-work"]) profile.openToWork = true;
  let sent = { transcripts };
  if (!numbersOnly && consent && bytes > PRESIGNED_UPLOAD_THRESHOLD) {
    const tty = process.stderr.isTTY;
    const t0 = Date.now();
    try {
      const uploads = await uploadTranscripts(transcripts, consent, {
        base: server(),
        headers: authHeaders(),
        onProgress: (d, n) => tty && process.stderr.write(`\rUploading ${d} of ${n} (compressed)\u2026`)
      });
      if (tty) process.stderr.write("\r\x1B[K");
      console.log(`
Uploaded ${(bytes / 1e6).toFixed(1)}MB of conversations (compressed) in ${((Date.now() - t0) / 1e3).toFixed(1)}s. Checking them on the server\u2026`);
      sent = { uploads };
    } catch (e) {
      if (tty) process.stderr.write("\r\x1B[K");
      if (e instanceof Error && /Sign in|login|confirm/i.test(e.message)) throw e;
      console.log(`
Couldn't upload the conversations: ${e.message}.`);
      if (inCloudSession()) console.log(`   The upload goes straight to storage, not through ${new URL(server()).host}: if the environment's network blocks that host, add it to the allowed hosts to be on the boards.`);
      console.log("   Sending your numbers and the vibe type sample instead; this vibe check won't be on the boards.");
      numbersOnly = true;
    }
  }
  const timeline = numbersOnly ? timelineOf() : null;
  const body = {
    ...numbersOnly ? { metrics: m, sessions: ledgerOf(), ...timeline ? { timeline } : {} } : { ...sent, ...time, ...consent ?? {} },
    ...add ? { combine: true } : {},
    ...Object.keys(profile).length ? { profile } : {}
  };
  let res;
  for (let attempt = 1; ; attempt++) {
    try {
      res = await api("/api/analyses", body);
      break;
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 503 && attempt < 5)) throw e;
      console.log(`The server is busy; trying again in ${15 * attempt}s\u2026`);
      await new Promise((r8) => setTimeout(r8, 15e3 * attempt));
    }
  }
  const v = res.verification;
  if (v?.mode === "verified") {
    console.log(`
\u{1F512} Verified: ${v.accepted}/${v.uploaded} sessions passed authenticity checks.`);
    if (v.rejected?.length) console.log(`   Excluded: ${v.rejected.slice(0, 3).map((r8) => r8.reasons.join(", ")).join(" \xB7 ")}`);
  } else console.log(`
\u{1F512} ${priv ? "Private result" : "Numbers only"}: only aggregate numbers were sent${sendsDigest() ? ", and the vibe type sample" : ""}.`);
  if (consent && !numbersOnly)
    console.log(
      consent.allowImprovement ? "   You let Vibrometer and its partners use these conversations, with common secrets, email addresses and home-folder names removed, to improve their services. You can withdraw this on your account page." : "   Vibrometer and its partners won't use these conversations to improve their services (you didn't add --allow-improvement)."
    );
  if (consent?.allowResearch) console.log("   You let Vibrometer use the numbers from this upload for research. You can withdraw this on your account page.");
  const combined = res.combined;
  if (combined?.unavailable) console.log("\n   Couldn't add these to your vibe check: the upload carried no per-conversation numbers. They replaced it instead.");
  else if (combined) console.log(combined.earlier ? `
\u2795 Added to your vibe check: it now covers ${combined.conversations} conversations, ${combined.earlier} of them from earlier uploads (a conversation uploaded twice counts once).` : "\n\u2795 There was nothing on your account to add these to yet: this is your vibe check. Run the other upload with --add to combine them.");
  if (res.provisional) console.log(`
\u26A0 ${provisionalMessage(res.reason)}`);
  else if (v?.mode === "verified") console.log("   It's on the habit boards in the Pantheon (they update within a minute).");
  if (sendsDigest()) {
    const n = await requestVibeType(digest, Array.isArray(res.sv) ? res.sv : linkValues(signalValues(m)));
    if (n) console.log(`
\u{1FAB6} Your vibe type: ${n.title}`);
  } else if (!numbersOnly) console.log(res.vibeType ? `
\u{1FAB6} Your vibe type: ${res.vibeType}` : "\n\u{1FAB6} Your vibe type is still being written; it shows at #you in a minute or two.");
  console.log(`
\u2728 See your vibe check, every habit compared with other people, and your share link at:
   ${server()}/#you
`);
  console.log(`   Sign in there with the same account that you approved this computer with${res.handle ? ` (@${res.handle})` : ""}; it's kept on your account, so it shows on any device.`);
}
function writeFiles(dir, files, overwrite) {
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    const p = join2(dir, name);
    if (existsSync2(p) && !overwrite(name)) {
      console.log(`! ${name} already exists; leaving it (use --force to overwrite)`);
      continue;
    }
    mkdirSync(dirname2(p), { recursive: true });
    writeFileSync(p, content);
  }
}
async function cmdChallenge(pos, flags) {
  const slug = pos[0];
  if (!slug) {
    const list = typeof define_CHALLENGES_default !== "undefined" ? define_CHALLENGES_default : [];
    console.log("Usage: vibrometer challenge <slug> [--dir .]\n");
    if (list.length) {
      console.log("Challenges:");
      const w = Math.max(...list.map((c) => c.slug.length));
      for (const c of list) console.log(`   ${c.slug.padEnd(w)}  ${c.title}${c.difficulty ? ` (${c.difficulty})` : ""}`);
      console.log("");
    }
    console.log(`Read about each one and see its leaderboards at ${server()}/#challenges`);
    process.exit(1);
  }
  requireLogin("started");
  const dir = resolve2(String(flags.dir ?? "."));
  const res = await api(`/api/challenges/${slug}/enroll`, {});
  const started = res.started !== false && typeof res.startedAt === "number";
  writeFiles(dir, res.files, (name) => name === "CHALLENGE.md" || !!flags.force);
  writeJson(ACTIVE, { nonce: res.nonce, slug, dir, entry: res.challenge.entry, startedAt: started ? res.startedAt : null, started, server: server() });
  console.log(`
\u{1F4CB} The ticket for "${res.challenge.title}" is in ${join2(dir, "CHALLENGE.md")}.`);
  console.log(`   Challenge nonce: ${res.nonce}`);
  console.log(
    started ? `   This server started the clock at ${new Date(res.startedAt).toLocaleTimeString()}.` : "   The clock has NOT started. Read the ticket, then start the clock with: vibrometer start (in Claude Code, /vibrometer:start)"
  );
  if (res.challenge.leaderboard === false) console.log("   This is a practice challenge: results show on its board but don't count toward the season rankings.");
  else
    console.log(
      res.ranked ? "   This is your RANKED attempt: your best submission goes on the leaderboard if the session shows that you directed the work." : `   Practice attempt #${res.attempt}: only your first attempt is ranked, so this one won't change your leaderboard spot.`
    );
  const sh = res.challenge.stakeholder;
  if (sh) console.log(`   Once the clock runs, you can ask ${sh.name ?? "the stakeholder"} ${sh.questions} questions. They're yours to ask: vibrometer ask "your question"`);
  if (res.challenge.drops?.length) console.log(`   Follow-ups arrive ${res.challenge.drops.map((d) => `${d.afterMinutes} min`).join(", ")} after the start. Get them with: vibrometer update`);
  if (res.challenge.baseline) console.log(`   The model alone scored ${res.challenge.baseline.testsPassed}/${res.challenge.baseline.testsTotal} on this challenge; the Olympiad ranks how far above that you lead it.`);
  console.log(`
   This challenge measures how YOU direct an AI agent. You are the lead and the agent is your tool:
   a session where the agent solves it alone, with only "go", "continue" or "yes" from you, is graded
   as practice and not ranked. Time target: ${res.challenge.timeLimitMinutes} min.
`);
}
async function cmdStart(flags) {
  const active = activeOrExit();
  if (active.started && active.startedAt) {
    console.log(`The clock of "${active.slug}" already started at ${new Date(active.startedAt).toLocaleTimeString()}.`);
    return;
  }
  const dir = String(flags.dir ?? active.dir);
  const res = await api(`/api/challenges/${active.slug}/start`, { nonce: active.nonce });
  writeFiles(dir, res.files, (name) => name === "CHALLENGE.md" || !!flags.force);
  writeJson(ACTIVE, { ...active, dir, entry: res.challenge.entry, startedAt: res.startedAt, started: true });
  console.log(`
\u{1F3C1} The clock for "${res.challenge.title}" started at ${new Date(res.startedAt).toLocaleTimeString()}.`);
  console.log(`   Challenge nonce: ${res.nonce}`);
  const top = [...new Set(Object.keys(res.files).map((f) => f.includes("/") ? f.split("/")[0] + "/" : f))];
  console.log(`   Files written to ${dir}: ${top.join(", ")}`);
  console.log(`   The entry file is ${res.challenge.entry}. When you're ready, submit from THIS session: vibrometer submit (or /vibrometer:submit)`);
  const sh = res.challenge.stakeholder;
  if (sh) console.log(`   You can ask ${sh.name ?? "the stakeholder"} ${sh.questions} questions: vibrometer ask "your question". Choosing them is your call.`);
  for (const d of res.challenge.drops ?? [])
    if (d.at) console.log(`   A follow-up arrives ${d.afterMinutes} min in (${new Date(d.at).toLocaleTimeString()}). Get it with: vibrometer update`);
  console.log(`   Ranked by hidden tests passed, then wall-clock time; only if the session shows you directing the work. Target: ${res.challenge.timeLimitMinutes} min.
`);
}
var isStarted = (a) => a.started !== false && !!a.startedAt;
function startedOrExit(a) {
  if (isStarted(a)) return;
  console.log(`The clock of "${a.slug}" hasn't started. Read CHALLENGE.md, then start it with: vibrometer start (in Claude Code, /vibrometer:start)`);
  process.exit(1);
}
function activeOrExit() {
  const active = readJson(ACTIVE, null);
  if (!active) {
    console.log("No active challenge. Start one with: vibrometer challenge <slug>");
    process.exit(1);
  }
  return active;
}
var fetchDrops = (a) => api(`/api/challenges/${a.slug}/drops?nonce=${encodeURIComponent(a.nonce)}`);
async function cmdUpdate(flags) {
  const active = activeOrExit();
  startedOrExit(active);
  const dir = String(flags.dir ?? active.dir);
  const r8 = await fetchDrops(active);
  const applied = new Set(active.appliedDrops ?? []);
  const fresh = r8.released.filter((d) => !applied.has(d.index));
  if (!fresh.length) console.log(r8.released.length ? "You already have every follow-up released so far." : "No follow-ups yet.");
  for (const d of fresh) {
    const n = d.index + 1;
    for (const [name, content] of Object.entries(d.files)) {
      const p = join2(dir, name);
      mkdirSync(dirname2(p), { recursive: true });
      const existed = existsSync2(p);
      writeFileSync(p, content);
      console.log(`   ${existed ? "replaced" : "added   "} ${name}`);
    }
    writeFileSync(join2(dir, `CHANGE-${n}.md`), d.change);
    console.log(`
\u{1F4EC} Follow-up ${n} (saved as CHANGE-${n}.md):

${d.change.trim()}
`);
    applied.add(d.index);
  }
  writeJson(ACTIVE, { ...active, appliedDrops: [...applied].sort((a, b) => a - b) });
  if (r8.next) console.log(`   The next follow-up arrives at ${new Date(r8.next.at).toLocaleTimeString()}.`);
}
async function cmdAsk(pos) {
  const active = activeOrExit();
  startedOrExit(active);
  const question = pos.join(" ").trim();
  if (!question) {
    const h = await api(`/api/challenges/${active.slug}/ask?nonce=${encodeURIComponent(active.nonce)}`);
    for (const q of h.history) console.log(`
Q: ${q.question}
A: ${q.answer}`);
    console.log(`
${h.used} of ${h.allowed} questions used. Ask with: vibrometer ask "your question"`);
    return;
  }
  const r8 = await api(`/api/challenges/${active.slug}/ask`, { nonce: active.nonce, question, context: askContext(active) });
  console.log(`
${r8.name}: ${r8.answer}
`);
  console.log(`   ${r8.used} of ${r8.allowed} questions used.`);
}
function askContext(active) {
  const none = { afterHumanPrompt: null, msSincePrompt: null, asksSincePrompt: null, promptWords: null };
  try {
    const f = findChallengeTranscript(active.nonce, active.startedAt ?? Date.now());
    if (!f) return none;
    const s = parseSession(readFileSync(f, "utf8"), "challenge");
    if (!s) return none;
    let lastPrompt = null;
    let asks = 0;
    for (const e of s.events) {
      if (e.kind === "prompt") {
        lastPrompt = { t: e.t, text: e.text };
        asks = 0;
      } else if (e.kind === "tool" && askQuestion(e.detail)) asks++;
    }
    if (!lastPrompt) return { ...none, afterHumanPrompt: false };
    return { afterHumanPrompt: asks <= 1, msSincePrompt: Math.max(0, Date.now() - lastPrompt.t), asksSincePrompt: asks, promptWords: contentWords3(lastPrompt.text).length };
  } catch {
    return none;
  }
}
function findChallengeTranscript(nonce, startedAt) {
  const candidates = findTranscripts(startedAt - 36e5, 500).filter((f) => f.endsWith(".jsonl") && !f.includes(`${"/"}subagents${"/"}`));
  for (const f of candidates) {
    try {
      if (readFileSync(f, "utf8").includes(nonce)) return f;
    } catch {
    }
  }
  return null;
}
async function cmdSubmit(flags) {
  const active = activeOrExit();
  startedOrExit(active);
  try {
    const d = await fetchDrops(active);
    const missing = d.released.filter((x) => !(active.appliedDrops ?? []).includes(x.index));
    if (missing.length && !flags["skip-update"]) {
      console.log(`\u{1F4EC} ${missing.length === 1 ? "A follow-up has" : `${missing.length} follow-ups have`} arrived that you haven't fetched. The hidden tests check the updated requirements.`);
      console.log("   Run vibrometer update, adjust your solution, then submit again (or submit as-is with --skip-update).");
      process.exit(1);
    }
  } catch {
  }
  const codePath = join2(String(flags.dir ?? active.dir), active.entry);
  if (!existsSync2(codePath)) {
    console.log(`Can't find ${codePath}`);
    process.exit(1);
  }
  const code = readFileSync(codePath, "utf8");
  const tPath = flags.transcript ? String(flags.transcript) : findChallengeTranscript(active.nonce, active.startedAt);
  if (!tPath) console.log("\u26A0 Couldn't find a Claude Code/Codex transcript containing your nonce. Submitting unverified.");
  let raw = tPath ? readFileSync(tPath, "utf8") : "";
  const subDir = tPath ? join2(tPath.replace(/\.jsonl$/, ""), "subagents") : "";
  if (subDir && existsSync2(subDir)) {
    for (const f of readdirSync(subDir)) if (f.endsWith(".jsonl")) raw += "\n" + readFileSync(join2(subDir, f), "utf8");
  }
  const transcript = tPath ? compactTranscript(raw, { mode: "challenge", homes: [homedir()] }) : void 0;
  const consent = transcript ? requireConsent(flags, "vibrometer submit") : null;
  let r8 = await api("/api/submit", { nonce: active.nonce, code, transcript, ...consent ?? {} }, { prefer: "respond-async" });
  if (r8.status === "pending" || r8.status === "running") {
    process.stdout.write("   Grading on the server");
    const until = Date.now() + 10 * 6e4;
    let errors = 0;
    while (r8.status === "pending" || r8.status === "running") {
      if (Date.now() > until) {
        console.log(`
   Still grading. Your result will appear on your profile; or check ${server()}/api/submissions/${r8.id}`);
        process.exit(1);
      }
      await new Promise((res) => setTimeout(res, 1500));
      process.stdout.write(".");
      try {
        r8 = await api(`/api/submissions/${r8.id}`);
        errors = 0;
      } catch (e) {
        if (++errors >= 5) throw e;
      }
    }
    process.stdout.write("\n");
  }
  if (r8.status === "failed") {
    console.log(`
\u274C ${r8.error || "Grading failed"}. You can submit again.`);
    process.exit(1);
  }
  const secs = Math.round(r8.wallClockMs / 1e3);
  const mins = secs >= 3600 ? `${Math.floor(secs / 3600)}h ${Math.floor(secs % 3600 / 60)}m` : secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`;
  console.log(`
${r8.passed ? "\u2705 PASSED" : "\u274C NOT YET"}: ${r8.testsPassed}/${r8.testsTotal} hidden tests${r8.error ? ` (${r8.error})` : ""}`);
  if (!r8.passed && r8.failures.length) console.log(`   Failing: ${r8.failures.slice(0, 8).join(", ")}`);
  console.log(`   \u23F1 ${mins} \xB7 \u{1F4AC} ${r8.humanTurns} turns \xB7 \u{1FA99} ${r8.tokens.toLocaleString()} tokens`);
  const hard = r8.flags.filter((f) => !f.review);
  const review = r8.flags.filter((f) => f.review);
  console.log(`   ${r8.verified ? "\u{1F512} Verified: the transcript checks out" : "\u26A0 Unverified: " + hard.map((f) => f.message).join("; ")}`);
  if (review.length) console.log(`   Flagged for review (the hidden tests still decide the score): ${review.map((f) => f.message).join("; ")}`);
  if (r8.baseline) console.log(`   \u{1F916} The model alone scored ${r8.baseline.testsPassed}/${r8.baseline.testsTotal}: you are ${r8.baseline.gainPoints >= 0 ? "+" : ""}${r8.baseline.gainPoints} points ${r8.baseline.gainPoints >= 0 ? "above" : "against"} it`);
  if (r8.direction) console.log(`   \u{1F9ED} Your direction: ${r8.direction.substantive} of ${r8.direction.prompts} prompts directed the work; ${r8.direction.humanAsks} of ${r8.direction.asks} stakeholder questions were yours`);
  if (r8.practiceReason) console.log(`   \u26A0 ${r8.practiceReason}`);
  else if (!r8.ranked) console.log(`   (Practice attempt #${r8.attempt}: not ranked)`);
  if (r8.ranks) {
    const fmt = (x) => x ? `#${x.rank}/${x.of}` : "n/a";
    console.log(`   Ranks: fastest ${fmt(r8.ranks.time)} \xB7 fewest prompts (above the AI-alone score) ${fmt(r8.ranks.turns)} \xB7 fewest tokens ${fmt(r8.ranks.tokens)}`);
  }
  console.log(`   Leaderboard: ${r8.leaderboardUrl}
   Profile: ${r8.profileUrl}
`);
  if (!r8.passed) console.log("   You can resubmit as many times as you like. The clock keeps running.");
}
function openBrowser(url) {
  const [cmd, args2] = process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", url.replace(/&/g, "^&")]] : ["xdg-open", [url]];
  try {
    const child = spawn(cmd, args2, { stdio: "ignore", detached: true });
    child.on("error", () => {
    });
    child.unref();
  } catch {
  }
}
async function cmdLogin(pos, flags) {
  if (typeof flags.server === "string") writeJson(CFG, { ...cfg(), server: flags.server.replace(/\/$/, "") });
  const pasted = typeof flags.token === "string" ? flags.token : pos[0];
  if (pasted) {
    writeJson(CFG, { ...cfg(), token: pasted, server: server() });
    console.log(`Saved. Using server ${server()}`);
    return;
  }
  let p = flags.wait ? readJson(PENDING_LOGIN, null) : null;
  if (flags.wait && (!p || p.expiresAt < Date.now() || p.server !== server())) {
    console.log("There's no sign-in waiting for approval. Start one with: vibrometer login");
    process.exit(1);
  }
  if (!p) {
    const r8 = await post("/api/cli/login/start", {});
    if (r8.status !== 200) throw new Error(String(r8.data.error || `HTTP ${r8.status}`));
    const d = r8.data;
    p = { deviceCode: d.deviceCode, userCode: d.userCode, url: d.verificationUrlComplete, interval: d.interval, expiresAt: Date.now() + d.expiresIn * 1e3, server: server() };
    writeJson(PENDING_LOGIN, p);
    console.log(`
To sign in, open this page in your browser:

   ${d.verificationUrlComplete}
`);
    console.log(`Check that it shows this code, then approve:

   ${d.userCode}
`);
    console.log(`(Or go to ${d.verificationUrl} and enter the code.) The code expires in ${Math.round(d.expiresIn / 60)} minutes.`);
    if (!flags["no-browser"]) openBrowser(d.verificationUrlComplete);
    if (flags["no-wait"]) {
      console.log("\nAfter approving, finish with: vibrometer login --wait");
      return;
    }
  }
  console.log("Waiting for approval\u2026");
  let interval = Math.max(1, p.interval);
  while (Date.now() < p.expiresAt) {
    await new Promise((res) => setTimeout(res, interval * 1e3));
    let r8;
    try {
      r8 = await post("/api/cli/login/poll", { deviceCode: p.deviceCode });
    } catch {
      continue;
    }
    const status = r8.data.status;
    if (status === "pending") continue;
    if (status === "slow_down") {
      interval += 5;
      continue;
    }
    writeJson(PENDING_LOGIN, null);
    if (status === "approved" && typeof r8.data.token === "string") {
      writeJson(CFG, { ...cfg(), token: r8.data.token, server: server() });
      console.log(`
Signed in${r8.data.handle ? ` as @${r8.data.handle}` : ""} on ${server()}.`);
      return;
    }
    if (status === "denied") console.log("\nThe sign-in was denied in the browser. Nothing changed.");
    else if (status === "expired") console.log("\nThe code expired or was already used. Run vibrometer login again.");
    else console.log(`
Sign-in failed: ${String(r8.data.error || `HTTP ${r8.status}`)}`);
    process.exit(1);
  }
  writeJson(PENDING_LOGIN, null);
  console.log("\nThe code expired before it was approved. Run vibrometer login again.");
  process.exit(1);
}
async function cmdLogout() {
  const c = cfg();
  if (c.token) await api("/api/cli/logout", {}).catch(() => console.log("(Couldn't reach the server to revoke the token; it's removed from this computer.)"));
  writeJson(CFG, { ...c, token: void 0 });
  console.log("Signed out on this computer.");
}
async function main() {
  const { cmd, pos, flags } = args();
  if (flags.server && cmd !== "login") process.env.VIBROMETER_SERVER = String(flags.server);
  if (cmd === void 0 && process.stdout.isTTY) return cmdSummary(flags);
  switch (cmd) {
    case "list":
      return cmdList(flags);
    case "analyze":
      return cmdAnalyze(flags);
    case "challenge":
      return cmdChallenge(pos, flags);
    case "start":
      return cmdStart(flags);
    case "submit":
      return cmdSubmit(flags);
    case "update":
      return cmdUpdate(flags);
    case "ask":
      return cmdAsk(pos);
    case "login":
      return cmdLogin(pos, flags);
    case "logout":
      return cmdLogout();
    case "status": {
      const c = cfg();
      let account = null;
      if (c.token) {
        try {
          const me = await api("/api/me");
          account = { signedIn: !!me.user?.signedIn, handle: me.user?.handle ?? null };
        } catch {
        }
      }
      const signedIn = account ? account.signedIn : !!c.token;
      console.log(JSON.stringify({ server: server(), signedIn, handle: account?.handle ?? null, activeChallenge: readJson(ACTIVE, null), transcriptRoots: transcriptRoots() }, null, 2));
      if (!signedIn) console.log(LOGIN_FIRST);
      return;
    }
    default:
      console.log(`vibrometer: see how you code with AI

  login [--server URL] [--no-browser]
                           sign in: approve this computer on the site (uploads and challenges need it)
  logout                   sign out on this computer
  list [--days 30] [--last N] [--json]   your conversations, grouped by project, with ids
  (no command)             in a terminal: your most distinctive habits, read on this computer; nothing is sent
  analyze [--days 30] [--last N] [--sessions id,...] [--exclude id,...] [--project name,...] [--exclude-project name,...]
          [--private [--vibe-type]] [--add] [--yes --confirm-rights [--allow-improvement] [--allow-research]]
          [--time-zone Europe/Berlin] [--away 2026-03-01..2026-03-14=Asia/Tokyo,...]
          [--handle h] [--school S] [--major M] [--city C] [--country X] [--grad-year Y] [--open-to-work]
                           shows what would be sent; add --yes --confirm-rights to upload it
                           (with no flags, in a terminal: the same summary as no command; --preview for
                            the full preview, --summary for the summary anywhere)
                           (--private = numbers only, no conversations, no confirmation needed;
                            --vibe-type with it also sends a scrubbed sample of up to 40 prompts to write
                            your vibe type, and the preview shows exactly which)
                           (--add = add these conversations to the vibe check already on your account,
                            e.g. a cloud session's and your laptop's, instead of replacing it; a
                            conversation uploaded twice counts once)
                           (hours and days are local to where you were: this computer's time zone, or
                            --time-zone, and --away for dates you spent in another one)
                           for habits over time on the site, include your whole history: --days 365 --max 2000
  challenge <slug> [--dir .]   enroll in a challenge and get its ticket (CHALLENGE.md); the clock doesn't start yet
  start                        start the clock and write the starter files
  update                       fetch follow-ups (new files, changed requirements) released during the challenge
  ask "question"               ask the challenge's stakeholder (limited questions); no question lists past answers
  submit --confirm-rights [--allow-improvement] [--allow-research] [--transcript path]
                               grade your solution and post to the leaderboard (uploads this session's log)
  login --token <token>    sign in with a token you already have, instead of the browser
  status                   show the server and whether you're signed in

  --confirm-rights      you confirm: "${RIGHTS_STATEMENT}"
  --allow-improvement   optional, off by default: "${IMPROVEMENT_STATEMENT}"
                        ${IMPROVEMENT_NOTE}
  --allow-research      optional, off by default: "${RESEARCH_STATEMENT}"
                        ${RESEARCH_NOTE}

  Server: ${server()}`);
  }
}
var inCloudSession = () => process.env.CLAUDE_CODE_REMOTE === "true";
var CLOUD_HINT = `This is a Claude Code cloud session: its conversations live only in this container, so analyze them here before the session ends.`;
var cloudNetworkHint = (host) => `If the environment's network blocks ${host}, add ${host} to its allowed hosts (environment settings, Network access) and run this again.`;
function rerunThroughProxy() {
  const e = process.env;
  if (!(e.HTTPS_PROXY || e.https_proxy) || e.NODE_USE_ENV_PROXY !== void 0) return null;
  const [maj, min] = process.versions.node.split(".").map(Number);
  if (!(maj >= 25 || maj === 24 && min >= 5 || maj === 22 && min >= 21)) return null;
  const r8 = spawnSync(process.execPath, [...process.execArgv, "--disable-warning=UNDICI-EHPA", ...process.argv.slice(1)], { stdio: "inherit", env: { ...e, NODE_USE_ENV_PROXY: "1" } });
  return r8.error ? null : r8.status ?? 1;
}
var rerun = rerunThroughProxy();
if (rerun !== null) process.exit(rerun);
else {
  if (inCloudSession() && ["list", "analyze"].includes(process.argv[2] ?? "")) console.error(CLOUD_HINT);
  main().catch((e) => {
    console.error("vibrometer error:", e instanceof Error ? e.message : e);
    const cause = e instanceof Error ? e.cause?.code : void 0;
    if (cause) console.error(`  (${cause} while connecting to ${server()})`);
    if (cause && inCloudSession()) console.error(cloudNetworkHint(new URL(server()).host));
    process.exit(1);
  });
}
