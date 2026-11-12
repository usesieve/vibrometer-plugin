#!/usr/bin/env node
// Vibrometer CLI (generated: edit src/cli/vibrometer.ts and run npm run build:cli)

// <define:__CHALLENGES__>
var define_CHALLENGES_default = [{ slug: "bank-reconciliation", title: "Month-End Bank Reconciliation", difficulty: "hard" }, { slug: "claims-underpayment", title: "Payer Underpayment Audit", difficulty: "hard" }, { slug: "crew-legality", title: "Part 117 Crew Legality Audit", difficulty: "hard" }, { slug: "tou-solar-bill", title: "Solar Billing Disputes", difficulty: "hard" }];

// src/cli/vibrometer.ts
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, dirname } from "node:path";

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
var PATH_RE = /(^|[\s`'"(])((\.{0,2}\/)?[\w.-]+\/[\w./-]+|[\w-]+\.(ts|tsx|js|jsx|mjs|py|rs|go|rb|java|kt|swift|c|cc|cpp|h|cs|php|md|json|ya?ml|toml|sql|css|html|sh))\b/;
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

// src/lib/analyzer/parse.ts
var zero = () => ({ input: 0, cacheRead: 0, cacheWrite: 0, output: 0 });
var str = (v) => typeof v === "string" ? v : "";
var num = (v) => typeof v === "number" && isFinite(v) ? v : 0;
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
function parseJsonl(text) {
  const out = [];
  for (const line of text.split("\n")) {
    const l = line.trim();
    if (!l || l[0] !== "{") continue;
    try {
      const v = JSON.parse(l);
      if (v && typeof v === "object") out.push(v);
    } catch {
    }
  }
  return out;
}
function detectSource(records) {
  for (const r of records.slice(0, 50)) {
    if ("payload" in r && (r.type === "session_meta" || r.type === "response_item" || r.type === "event_msg" || r.type === "turn_context")) return "codex";
    if ("sessionId" in r || r.type === "assistant" || r.type === "user" || r.type === "attachment") return "claude-code";
  }
  return "unknown";
}
function isSyntheticPrompt(text) {
  const t = text.trimStart();
  return t.startsWith("<local-command-stdout>") || t.startsWith("<local-command-stderr>") || t.startsWith("Caveat:") || t.startsWith("<system-reminder>") || t.startsWith("<user_instructions>") || t.startsWith("<environment_context>") || t.startsWith("<task-notification>") || t.startsWith("This session is being continued from a previous conversation") || t.startsWith("<user_action>") || t.startsWith("<bash-input>") || t.startsWith("<bash-stdout>") || t.startsWith("<bash-stderr>") || t.startsWith("<command-message>") && !t.includes("<command-name>");
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
  const detail = (command || path || str(input.pattern) || str(input.query) || str(input.url) || str(input.description) || name).slice(0, 300);
  return { detail, path, written, old, command };
}
function parseClaude(records, fallbackId = "session") {
  const events = [];
  const models = /* @__PURE__ */ new Set();
  const subagentUsage = zero();
  let id = fallbackId;
  let version;
  let cwd;
  const assistantById = /* @__PURE__ */ new Map();
  const usageById = /* @__PURE__ */ new Map();
  const subUsageById = /* @__PURE__ */ new Map();
  const toolsSeen = /* @__PURE__ */ new Set();
  let minT = Infinity;
  let maxT = 0;
  for (const r of records) {
    const t = ts(r.timestamp);
    if (r.sessionId) id = str(r.sessionId);
    if (r.version) version = str(r.version);
    if (!cwd && typeof r.cwd === "string") cwd = r.cwd;
    const msg = r.message || {};
    if (r.isSidechain === true) {
      if (r.type === "assistant" && msg.usage) {
        const mid = str(msg.id) || str(r.requestId) || str(r.uuid);
        const prev = subUsageById.get(mid);
        const model = str(msg.model) || prev?.model || "unknown";
        subUsageById.set(mid, { model, usage: maxUsage(prev?.usage ?? zero(), readUsage(msg.usage)) });
      }
      continue;
    }
    if (t) {
      minT = Math.min(minT, t);
      maxT = Math.max(maxT, t);
    }
    if (r.type === "system" && (r.subtype === "compact_boundary" || str(r.content).includes("Conversation compacted"))) {
      const trigger = str((r.compactMetadata || {}).trigger);
      events.push({ kind: "compact", t, ...trigger === "auto" ? { auto: true } : trigger === "manual" ? { auto: false } : {} });
      continue;
    }
    if (r.isCompactSummary === true) {
      events.push({ kind: "compact", t });
      continue;
    }
    if (r.type === "user") {
      if (r.permissionMode === "plan") events.push({ kind: "plan_mode", t });
      const c = msg.content;
      if (typeof c === "string") {
        pushPrompt(c, t, r.isMeta === true);
      } else if (Array.isArray(c)) {
        for (const b of c) {
          if (b.type === "tool_result") {
            const content = typeof b.content === "string" ? b.content : JSON.stringify(b.content ?? "");
            const head = content.replace(/^\[\{"type":"text","text":"/, "").slice(0, 120);
            const rejected = /^(The user doesn't want to (proceed|take this action)|User rejected|Permission to use .* (was )?denied)/i.test(head.trimStart());
            events.push({ kind: "tool_result", t, id: str(b.tool_use_id), isError: b.is_error === true, rejected, text: content.slice(0, 4e3) });
          } else if (b.type === "text") {
            pushPrompt(str(b.text), t, r.isMeta === true);
          }
        }
      }
    } else if (r.type === "assistant") {
      const mid = str(msg.id) || str(r.requestId) || str(r.uuid);
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
        if (b.type === "text") ev.text += str(b.text).slice(0, 2e3);
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
    } else if (r.type === "attachment") {
      const a = r.attachment || {};
      const prompt = typeof a.prompt === "string" ? a.prompt : Array.isArray(a.prompt) ? a.prompt.filter((b) => b.type === "text").map((b) => str(b.text)).join("\n") : void 0;
      if (a.type === "queued_command" && a.isMeta !== true && (a.commandMode === void 0 || a.commandMode === "prompt") && prompt !== void 0) {
        const o = a.origin;
        if (!o || o.kind === void 0 || o.kind === "user" || o.kind === "human") pushPrompt(prompt, t, false, true);
      }
    }
  }
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
  function pushPrompt(text, t, isMeta, queued = false) {
    if (isMeta) return;
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
  return {
    id,
    source: "claude-code",
    startedAt: minT === Infinity ? 0 : minT,
    endedAt: maxT,
    models: [...models],
    events,
    subagentUsage,
    subagentUsageByModel,
    version,
    cwd,
    firstPrompt: firstPromptOf(events)
  };
}
function firstPromptOf(events) {
  for (const e of events) if (e.kind === "prompt" && !e.slash) return e.text.slice(0, 160);
  for (const e of events) if (e.kind === "prompt") return e.text.slice(0, 160);
  return void 0;
}
function parseCodex(records, fallbackId = "session") {
  const events = [];
  const models = /* @__PURE__ */ new Set();
  let id = fallbackId;
  let version;
  let total;
  let cwd;
  let minT = Infinity;
  let maxT = 0;
  let lastAssistant;
  let prevCum = zero();
  let curModel;
  const exitCodes = /* @__PURE__ */ new Map();
  const resultsById = /* @__PURE__ */ new Map();
  let inTurn = false;
  let turnBusy = false;
  for (const r of records) {
    const t = ts(r.timestamp);
    if (t) {
      minT = Math.min(minT, t);
      maxT = Math.max(maxT, t);
    }
    const p = r.payload || {};
    const ptype = str(p.type);
    if (r.type === "session_meta") {
      id = str(p.id) || id;
      version = str(p.cli_version) || version;
      if (typeof p.cwd === "string") cwd = p.cwd;
      continue;
    }
    if (r.type === "turn_context") {
      if (p.model) {
        curModel = str(p.model);
        models.add(curModel);
      }
      continue;
    }
    if (r.type === "event_msg") {
      if (ptype === "user_message") {
        const text = str(p.message);
        if (text.trim() && !isSyntheticPrompt(text)) {
          const queued = inTurn && turnBusy;
          events.push({ kind: "prompt", t, text, slash: text.trimStart().startsWith("/"), ...queued ? { queued } : {} });
          turnBusy = true;
        }
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
      continue;
    }
    if (r.type === "compacted") {
      events.push({ kind: "compact", t });
      continue;
    }
    if (r.type === "response_item") {
      if (inTurn && (p.role === "assistant" || ptype !== "message")) turnBusy = true;
      if (ptype === "message" && p.role === "assistant") {
        const parts = Array.isArray(p.content) ? p.content : [];
        lastAssistant = { kind: "assistant", t, model: curModel, toolCount: 0, text: parts.map((x) => str(x.text)).join("").slice(0, 2e3) };
        events.push(lastAssistant);
      } else if (ptype === "function_call" || ptype === "custom_tool_call" || ptype === "local_shell_call") {
        let input = {};
        const rawArgs = p.arguments ?? p.input ?? p.action;
        if (typeof rawArgs === "string") {
          try {
            input = JSON.parse(rawArgs);
          } catch {
            input = { content: rawArgs };
          }
        } else if (rawArgs && typeof rawArgs === "object") input = rawArgs;
        const name = str(p.name) || (ptype === "local_shell_call" ? "local_shell" : "tool");
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
          id: str(p.call_id) || str(p.id),
          name,
          category: written !== void 0 ? "edit" : cat,
          detail: (command || path || name).slice(0, 300),
          path,
          written,
          linesWritten: originalLines(written),
          ...old ? { old } : {},
          ...paths ? { paths } : {},
          ...deleted ? { deleted } : {}
        });
      } else if (ptype === "function_call_output" || ptype === "custom_tool_call_output") {
        const out = typeof p.output === "string" ? p.output : JSON.stringify(p.output ?? "");
        let isError = false;
        try {
          const o = JSON.parse(out);
          const code = o?.metadata?.exit_code ?? o?.exit_code;
          isError = typeof code === "number" && code !== 0;
        } catch {
          isError = /Process exited with code [1-9]|exit code: [1-9]|"exit_code":\s*[1-9]/i.test(out);
        }
        const cid = str(p.call_id);
        if (exitCodes.has(cid)) isError = exitCodes.get(cid) !== 0;
        const rejected = /rejected by user|user denied|declined/i.test(out);
        const res = { kind: "tool_result", t, id: cid, isError, rejected, text: out.slice(0, 4e3) };
        resultsById.set(cid, res);
        events.push(res);
      }
    }
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
    firstPrompt: firstPromptOf(events)
  };
}
function parseSession(text, fallbackId) {
  const records = parseJsonl(text);
  if (!records.length) return null;
  const src = detectSource(records);
  if (src === "codex") return parseCodex(records, fallbackId);
  if (src === "claude-code") return parseClaude(records, fallbackId);
  return null;
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
    rest.some((r, j) => (seps[i + 1 + j] === "||" || seps[i + 1 + j] === ";") && NOOP_RE.test(r));
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
    const words = s.split(/\s+/);
    const prog = words[0].replace(/^.*\//, "");
    if (/^(npm|pnpm|yarn|bun|go|cargo|make|dotnet|gradle|gradlew|mvn|mix|deno|git|docker|kubectl|pip3?|brew|apt|apt-get|gh|uv|poetry|node|python3?|ruby|bash|sh)$/.test(prog))
      return `${prog} ${words[1] ?? ""}`.trim();
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
  for (const r of runs) if (r.e.category === "edit" && isCodeEdit(r.e)) {
    lastEdit = r.i;
    codeEdits++;
  }
  let verifiedFinish = false;
  if (lastEdit >= 0) {
    let staged = false;
    for (const r of runs) {
      if (r.i <= lastEdit) continue;
      if (r.check && r.ok) {
        verifiedFinish = true;
        break;
      }
      const parts = splitCommand(r.e.detail).parts.map(stripPrefixes);
      if (parts.some((p) => /^git\s+add\b/.test(p)) && r.ok) staged = true;
      const commit = parts.find((p) => /^git\s+commit\b/.test(p));
      if (!commit || !r.ok || /--allow-empty\b/.test(commit)) continue;
      const text = results.get(r.e.id)?.text ?? "";
      if (/nothing to commit|no changes added to commit|nothing added to commit/i.test(text)) continue;
      if (staged || /(?:^|\s)-(?!-)[a-zA-Z]*a/.test(commit) || /\s--all\b/.test(commit) || /\d+ files? changed/.test(text)) {
        verifiedFinish = true;
        break;
      }
    }
  }
  let errors = 0, unresolved = 0, loops = 0, loopsSteppedIn = 0;
  const counted = runs.filter((r) => r.kind && !BENIGN_KIND_RE.test(r.kind));
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
  counted.forEach((r, j) => {
    if (r.ok) lastOk.set(r.kind, j);
  });
  counted.forEach((r, j) => {
    const k = r.kind;
    if (r.failed) {
      errors++;
      if ((lastOk.get(k) ?? -1) < j) unresolved++;
      const s = streaks.get(k);
      if (s) s.n++;
      else streaks.set(k, { n: 1, start: r.i });
    } else if (r.ok) closeStreak(k, r.i);
  });
  for (const k of [...streaks.keys()]) closeStreak(k, events.length);
  const corrections = [];
  const humanIdx = events.flatMap((e, i) => isHumanPrompt(e) ? [i] : []);
  humanIdx.forEach((p, n) => {
    const ev = events[p];
    if (!CORRECTION_RE.test(ev.text)) return;
    const prevStart = n > 0 ? humanIdx[n - 1] : -1;
    const nextEnd = humanIdx[n + 1] ?? events.length;
    const before = runs.filter((r) => r.i > prevStart && r.i < p);
    const failures = before.filter((r, j) => r.failed && r.kind && !BENIGN_KIND_RE.test(r.kind) && !before.slice(j + 1).some((x) => x.kind === r.kind && x.ok)).map((r) => r.e.detail.slice(0, 160)).slice(0, 5);
    const edited = [...new Set(before.filter((r) => r.e.category === "edit").flatMap((r) => editPaths(r.e)))].slice(0, 8);
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
    const evidence = failures.length > 0 || rejected || CATCH_TEXT_RE.test(text) || ERROR_PASTE_RE.test(text) || mentionsEdited || undoAfterEdit;
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
  for (const r of runs) {
    if (r.e.category === "edit" && isCodeEdit(r.e) && !r.failed) pending++;
    else if (r.check && r.done && pending > 0) {
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
var PATH_G = new RegExp(PATH_RE.source, "g");
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
function kindOf(p, words) {
  const t = p.trim().replace(/^[\s,.!-]+/, "");
  if (words.length <= 8 && APPROVAL_RE.test(t) && !TASK_VERB_RE.test(t.replace(APPROVAL_RE, ""))) return "approval";
  if (/\?\s*$/.test(t) && QUESTION_START_RE.test(t) && !REQUEST_RE.test(t)) return "question";
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
function promptSpec(text) {
  const fences = text.match(FENCE_RE) ?? [];
  const p = prose(text);
  const words = wordsOf(p);
  const kind = kindOf(p, words);
  const inline = p.match(INLINE_CODE_RE) ?? [];
  const plain = p.replace(INLINE_CODE_RE, " ").replace(URL_RE, " ");
  const paths = (plain.match(PATH_G) ?? []).length;
  const idents = (plain.match(IDENT_RE) ?? []).length;
  const urls = (p.match(URL_RE) ?? []).length;
  const errorPaste = ERROR_RE.test(text) && (fences.length > 0 || text.split("\n").length >= 3 || /\b\w*Error:|Traceback/.test(text));
  const codeFence = fences.some((f) => f.split("\n").length >= 3);
  const lineRef = LINE_REF_RE.test(plain);
  const quoted = QUOTED_RE.test(plain);
  const refs = paths + idents + inline.length + urls + fences.length + (lineRef ? 1 : 0) + (quoted ? 1 : 0) + (errorPaste ? 1 : 0);
  const context = errorPaste || codeFence ? 2 : level(refs, 3);
  const crit = CRITERIA_SIGNALS.filter(([, re]) => re.test(p)).map(([k]) => k);
  const criteria = kind === "task" ? level(crit.length + (crit.includes("done") ? 1 : 0), 2) : 0;
  const steps = (p.match(STEP_LINE_RE) ?? []).length;
  const how = HOW_SIGNALS.filter(([, re]) => re.test(p)).length + (fences.length && !errorPaste && /\b(add|use|change|replace|like|to|with)\b[^.\n]{0,40}:?\s*$/im.test(p.split("```")[0] ?? "") ? 1 : 0);
  const prescriptive = kind !== "task" ? 0 : steps >= 2 ? 2 : level(how, 2);
  const vagueBy = kind === "task" ? VAGUE_PATTERNS.filter(([, re]) => re.test(p)).map(([k]) => k) : [];
  const content = words.filter((w) => !VAGUE_LEXICON.has(w) && w.length > 1);
  const anchored = refs > 0;
  const vague = vagueBy.length > 0 && !anchored && words.length <= 15 && content.length <= 3;
  const verb = TASK_VERB_RE.exec(p);
  let goal = 0;
  if (kind === "task" && !vague) {
    const after = verb ? wordsOf(p.slice(verb.index + verb[0].length)).filter((w) => !/^(the|a|an|me|us|please|also|now|it)$/.test(w)) : [];
    const objectNamed = verb ? after.length > 0 && !(after.length <= 2 && DEICTIC_OBJ_RE.test(after.join(" "))) : false;
    if (OUTCOME_RE.test(p) && words.length >= 6) goal = 2;
    else if (objectNamed || words.length >= 12) goal = 1;
    if (goal === 1 && criteria >= 1 && words.length >= 10) goal = 2;
  }
  const opening = p.trim().slice(0, OPENING_CHARS);
  const correction = kind !== "approval" && REDO_RE.test(opening);
  const newDirection = DIRECTION_RE.test(opening) || !correction && ALSO_RE.test(opening);
  let style = "none";
  if (kind === "task") {
    if (vague) style = "vague";
    else if (prescriptive === 2) style = "prescriptive";
    else if (goal >= 1 && criteria >= 1) style = "outcome";
    else if (context >= 1) style = "contextual";
    else style = "bare";
  }
  return { kind, words: words.length, goal, criteria, context, prescriptive, vague, vagueBy, correction, newDirection, style };
}
var emptySpecificity = () => ({ taskPrompts: 0, vaguePrompts: 0, goalPrompts: 0, criteriaPrompts: 0, contextPrompts: 0, prescriptivePrompts: 0, outcomeBriefs: 0 });
function specificityCounts(events, into = emptySpecificity()) {
  for (const e of events) {
    if (e.kind !== "prompt" || e.slash) continue;
    const s = promptSpec(e.text);
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
var contentWords = (s) => new Set((s.toLowerCase().match(/[a-z0-9_]{3,}/g) ?? []).filter((w) => !STOP.has(w)));
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
  turns.forEach((t, k) => {
    if (!isWork(t)) return;
    const prior = work.slice(-3);
    if (prior.length) {
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
          const r = removed.get(f);
          const old = linesOf(e.old);
          const neu = linesOf(e.written);
          if (w && old.some((l) => w.has(l))) overwrote = true;
          if (w && r && old.length && neu.length && old.filter((l) => w.has(l)).length / old.length >= 0.6 && neu.filter((l) => r.has(l)).length / neu.length >= 0.6) restored = true;
        }
      const s = t.spec;
      const repeat = turns.slice(Math.max(0, k - 5), k).some((p) => t.words.size >= 3 && jaccard(t.words, p.words) >= 0.6);
      const revert = REVERT_ASK_RE.test(promptText(events, t)) || restored || t.gitRevert && s.correction;
      const trigger = revert ? "revert" : s.correction ? "correction" : repeat ? "repeat" : overwrote ? "overwrite" : null;
      if (trigger) {
        const text = promptText(events, t);
        const kind = trigger === "overwrite" || s.newDirection && !WRONG_TARGET_RE.test(text) ? "iteration" : "avoidable";
        const before = turns[k - 1];
        const cause = kind === "iteration" ? null : WRONG_TARGET_RE.test(text) ? "wrong-target" : before?.endedBadly || turns[origin].endedBadly || ERROR_TEXT_RE.test(text) ? "agent-error" : "underspecified";
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
        const r = removed.get(f) ?? /* @__PURE__ */ new Map();
        for (const l of linesOf(e.written)) w.set(l, k);
        for (const l of linesOf(e.old)) r.set(l, k);
        written.set(f, w);
        removed.set(f, r);
      }
  });
  return { turns, workTurns: work.length, cycles };
}
function promptText(events, t) {
  const e = events[t.i];
  return e.kind === "prompt" ? prose(e.text).trim().slice(0, OPENING_CHARS) : "";
}
function churnCounts(events, into = emptyChurn()) {
  const c = sessionChurn(events);
  into.workTurns += c.workTurns;
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
var median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
function computeMetrics(sessions, opts = {}) {
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
  const lessonTimeline = [];
  const promptLens = [];
  const sources = /* @__PURE__ */ new Set();
  const models = /* @__PURE__ */ new Set();
  let editedTotal = 0;
  let editedReadFirst = 0;
  let weekend = 0;
  let night = 0;
  const tz = opts.tzOffsetMinutes ?? 0;
  const byModel = {};
  const promptsByDay = /* @__PURE__ */ new Map();
  const waitsMs = [];
  const spans = [];
  for (const s of sessions) {
    const events = s.events.filter((e) => (!opts.since || e.t >= opts.since) && (!opts.until || e.t <= opts.until));
    m.tokens.subagent += s.subagentUsage.input + s.subagentUsage.output + s.subagentUsage.cacheRead + s.subagentUsage.cacheWrite;
    if (s.subagentUsageByModel) for (const [model, u2] of Object.entries(s.subagentUsageByModel)) addTokens(byModel, model, u2);
    else addTokens(byModel, s.models[0], s.subagentUsage);
    if (!events.length) continue;
    m.sessions++;
    specificityCounts(events, briefs);
    churnCounts(events, churn);
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
    const times = events.map((e) => e.t).filter(Boolean).sort((a, b) => a - b);
    let active = 0;
    for (let i = 1; i < times.length; i++) {
      const g = times[i] - times[i - 1];
      if (g < IDLE_GAP_MS2) active += g;
    }
    const activeMin = active / 6e4;
    if (events.some((e) => e.kind === "prompt") && times.length) {
      let a = times[0], b = times[0];
      for (let i = 1; i < times.length; i++) {
        if (times[i] - b < IDLE_GAP_MS2) b = times[i];
        else {
          if (b > a) spans.push([a, b]);
          a = b = times[i];
        }
      }
      if (b > a) spans.push([a, b]);
    }
    m.activeMinutes += activeMin;
    const timing = sessionTiming(events);
    for (const r of timing.runs) m.agentBusyMinutes += (r.end - r.start) / 6e4;
    m.agentTurns += timing.runs.length;
    for (const w of timing.waits) {
      m.agentWaitMinutes += Math.min(w, BREAK_MS) / 6e4;
      if (w < BREAK_MS) waitsMs.push(w);
      else m.agentBreaks++;
    }
    for (const e of timing.queued) if (e.kind === "prompt" && !e.slash) m.queuedPrompts++;
    if (times.length) m.spanMinutes += (times[times.length - 1] - times[0]) / 6e4;
    m.longestSessionMinutes = Math.max(m.longestSessionMinutes, activeMin);
    const readPaths = /* @__PURE__ */ new Set();
    const editedPaths = /* @__PURE__ */ new Set();
    let sawPlan = false;
    let sawEdit = false;
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
          m.humanWords += text.split(/\s+/).filter(Boolean).length;
          if (/```/.test(text)) m.promptsWithCode++;
          if (PATH_RE.test(text)) m.promptsWithPaths++;
          if (CRITERIA_RE.test(text)) m.promptsWithCriteria++;
          if (STRUCTURE_RE.test(text) || text.length > 400) m.promptsStructured++;
          if (CORRECTION_RE.test(text)) m.corrections++;
          m.politeness += (text.match(POLITE_RE) || []).length + (text.match(PRAISE_RE) || []).length;
          m.hostility += (text.replace(/```[\s\S]*?```/g, " ").match(HOSTILE_RE) || []).length;
          m.profanity += (text.match(PROFANITY_RE) || []).length;
          const caps = text.match(/\b[A-Z]{4,}\b/g) || [];
          if (caps.filter((w) => !/^(TODO|JSON|HTML|HTTP|HTTPS|README|API|SQL|YAML|TOML|UUID|NOTE|FIXME|CSS|URL|CLI|AWS|GCP|IMPORTANT)$/.test(w)).length >= 2) m.yelling++;
          m.humanCodeChars += humanCodeChars(text);
          if (e.t) {
            const d = new Date(e.t - tz * 6e4);
            const h = d.getUTCHours();
            m.hourHistogram[h]++;
            if (h >= 23 || h < 5) night++;
            const dow = d.getUTCDay();
            if (dow === 0 || dow === 6) weekend++;
            const day = d.toISOString().slice(0, 10);
            promptsByDay.set(day, (promptsByDay.get(day) ?? 0) + 1);
          }
          if (/\b(plan|outline|design|architecture|approach|step[- ]by[- ]step|before (you )?(code|start|implement))\b/i.test(text) && !sawEdit) {
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
            if (!sawEdit) planBeforeEdit = sawPlan;
            sawEdit = true;
            turnHasEdit = true;
            verifiedAfterLastEdit = false;
            m.linesWritten += e.linesWritten;
            if (e.path && !editedPaths.has(e.path)) {
              editedPaths.add(e.path);
              editedTotal++;
              const isCreate = !!e.create && !readPaths.has(e.path);
              if (isCreate) editedTotal--;
              else if (readPaths.has(e.path) || [...readPaths].some((r) => r.endsWith(e.path.split("/").pop()))) editedReadFirst++;
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
  Object.assign(m, briefs, churn, { redoMinutes: Math.round(churn.redoMinutes * 10) / 10 });
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
  m.activeMinutes = Math.round(m.activeMinutes * 10) / 10;
  m.agentBusyMinutes = Math.round(m.agentBusyMinutes * 10) / 10;
  m.agentWaitMinutes = Math.round(m.agentWaitMinutes * 10) / 10;
  m.agentWaits = waitsMs.length;
  m.agentWaitMedianMinutes = Math.round(medianOf(waitsMs) / 6e4 * 1e3) / 1e3;
  m.spanMinutes = Math.round(m.spanMinutes * 10) / 10;
  m.longestSessionMinutes = Math.round(m.longestSessionMinutes * 10) / 10;
  for (const t of Object.values(byModel)) for (const f of TOKEN_FIELDS) t[f] = Math.round(t[f]);
  m.tokensByModel = byModel;
  m.estCostUsd = Math.round(apiCost(byModel).usd * 100) / 100;
  m.busiestDayPrompts = Math.max(0, ...promptsByDay.values());
  return m;
}

// src/lib/analyzer/signature.ts
var MIN_CALIBRATION_N = 50;
var PRIOR_STRENGTH = 300;
var hourLabel = (h) => `${(Math.round(h) + 11) % 12 + 1}${Math.round(h) % 24 < 12 ? "am" : "pm"}`;
var pct = (v) => `${Math.round(v * 100)}%`;
var per = (a, b, min = 1) => b >= min ? a / b : null;
var big = (v) => v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e4 ? `${Math.round(v / 1e3)}k` : Math.round(v).toLocaleString("en-US");
var wallHours = (m) => (m.wallMinutes ?? m.activeMinutes) / 60;
var n1 = (v) => v >= 10 ? String(Math.round(v)) : v.toFixed(1).replace(/\.0$/, "");
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
var SIGNALS = [
  // verify: Share. Agents now run tests and builds on their own far more than in 2024, so the middle moves up a little; Anthropic finds verified success in 15-33% of sessions by expertise [A2], so the low end stays low.
  { key: "verify", name: "Checks after edits", scale: 1e3, prior: [0.25, 0.6, 0.92], good: 1, value: (m) => per(m.verifiedEditTurns, m.editTurns, 2), fmt: pct, line: (v) => `You check the code after ${v} of your edits`, they: (v, w) => `${w} checks the code after ${v} of their edits` },
  // steps: Log. Anthropic: about 10 actions per prompt on average, about 12 for experts and 5 for novices, and 2% of sessions above 100 [A2]. Heavy users sit near the expert figure.
  { key: "steps", name: "Agent steps per prompt", scale: 10, prior: [4, 12, 35], log: true, good: 1, value: (m) => per(m.toolCalls, m.humanTurns, 3), fmt: n1, line: (v) => `Your agent takes ${v} steps for every prompt that you write`, they: (v, w) => `${w}'s agent takes ${v} steps for every prompt that they write` },
  // words: Log. The mean is pulled up by pasted specs, logs and errors; heavy users who write 150-250-word task briefs are common, so 150 is the 90th, not 80. No public figure for prompt length.
  { key: "words", name: "Words per prompt", scale: 10, prior: [12, 45, 150], log: true, value: (m) => per(m.humanWords, m.humanTurns, 3), fmt: n1, line: (v) => `Your prompts average ${v} words`, they: (v, w) => `${w}'s prompts average ${v} words` },
  // files: Share. No public data; widened from [0.2, 0.33, 0.45], which put ordinary variation in the tails.
  { key: "files", name: "Prompts naming a file", scale: 1e3, prior: [0.12, 0.3, 0.55], good: 1, value: (m) => per(m.promptsWithPaths, m.humanTurns, 3), fmt: pct, line: (v) => `${v} of your prompts name a specific file`, they: (v, w) => `${v} of ${w}'s prompts name a specific file` },
  // done: Share. No public data; widened slightly at the top.
  { key: "done", name: "Prompts defining done", scale: 1e3, prior: [0.1, 0.28, 0.5], good: 1, value: (m) => per(m.promptsWithCriteria, m.humanTurns, 3), fmt: pct, line: (v) => `${v} of your prompts describe what "done" looks like`, they: (v, w) => `${v} of ${w}'s prompts describe what "done" looks like` },
  // corrections: Share. Anthropic: internal users intervened 3.3 times per session, and missing context or corrections are 32% of interruptions [A1]. Barely changed.
  { key: "corrections", name: "Corrections", scale: 1e3, prior: [0.02, 0.08, 0.2], good: -1, value: (m) => per(m.corrections, m.humanTurns, 3), fmt: pct, line: (v) => `You correct the agent on ${v} of your prompts`, they: (v, w) => `${w} corrects the agent on ${v} of their prompts` },
  // interrupts: Log. Anthropic: people interrupt on about 5% of turns when new and about 9% when experienced [A1], i.e. 0.5-0.9 per 10 prompts, so the old middle of 0.3 was too low.
  { key: "interrupts", name: "Interrupts per 10 prompts", scale: 10, prior: [0.1, 0.7, 2], log: true, value: (m) => m.humanTurns >= 5 ? m.interrupts / m.humanTurns * 10 : null, fmt: n1, line: (v) => `You stop the agent mid-run ${v} times per 10 prompts`, they: (v, w) => `${w} stops the agent mid-run ${v} times per 10 prompts` },
  // reads: Share. Claude Code's Edit tool needs the file read first, so most Claude Code edits are read first; Codex patches and new files pull it down.
  { key: "reads", name: "Reads before editing", scale: 1e3, prior: [0.35, 0.7, 0.95], good: 1, value: (m) => m.editedFiles >= 2 ? m.readBeforeEditRatio : null, fmt: pct, line: (v) => `${v} of the files that you change are read first`, they: (v, w) => `${v} of the files that ${w} changes are read first` },
  // plans: Share. Plan mode is common among heavy users; little change.
  { key: "plans", name: "Plans before coding", scale: 1e3, prior: [0.1, 0.45, 0.85], good: 1, value: (m) => per(m.sessionsPlanFirst, m.sessionsWithEdits, 1), fmt: pct, line: (v) => `You plan before the first edit in ${v} of sessions`, they: (v, w) => `${w} plans before the first edit in ${v} of sessions` },
  // subagents: Log. Claude Code starts Explore and Plan subagents on its own and heavy users run their own, while Codex sessions and quick questions have none. 3-8 per session is a strong but normal heavy user (84-97).
  { key: "subagents", name: "Subagents per session", scale: 10, prior: [0, 1, 3.5], log: true, value: (m) => per(m.subagents, m.sessions, 1), fmt: n1, line: (v) => `You run ${v} subagents per session`, they: (v, w) => `${w} runs ${v} subagents per session` },
  // minutes: Log. Active minutes (gaps over 10 min dropped). Typical sessions are short (about 4 prompts [A2]; about 23 min on average [S2]), but heavy users run multi-hour sessions and the longest turns now pass 45 min [A1]. 2-4 hour sessions land at 90-96.
  { key: "minutes", name: "Minutes per session", scale: 1, prior: [10, 40, 120], log: true, value: (m) => per(m.activeMinutes, m.sessions, 1), fmt: (v) => `${Math.round(v)} min`, line: (v) => `Your sessions average ${v} of active work`, they: (v, w) => `${w}'s sessions average ${v} of active work` },
  // pace: Log. Heavy users with parallel agents write thousands of lines per hour; the old 90th of 2,300 was a single-session figure.
  { key: "pace", name: "Lines per hour", scale: 1, prior: [150, 800, 4e3], log: true, value: (m) => wallHours(m) >= 1 / 6 ? m.linesWritten / wallHours(m) : null, fmt: (v) => big(v), line: (v) => `Your agents write ${v} lines per hour of your coding time`, they: (v, w) => `${w}'s agents write ${v} lines per hour of their coding time` },
  // night: Share. Unchanged: no new evidence.
  { key: "night", name: "Prompts after 11pm", scale: 1e3, prior: [0, 0.05, 0.35], fun: true, value: (m) => per(m.nightOwlShare * m.humanTurns, m.humanTurns, 5), fmt: pct, line: (v) => `${v} of your prompts are sent after 11pm`, they: (v, w) => `${v} of ${w}'s prompts are sent after 11pm` },
  // please: Rate per prompt. Unchanged: no new evidence.
  { key: "please", name: "Pleases and thanks", scale: 1e3, prior: [0.05, 0.3, 0.55], fun: true, value: (m) => per(m.politeness, m.humanTurns, 5), fmt: (v) => n1(v * 10), line: (v) => `You say please or thanks ${v} times per 10 prompts`, they: (v, w) => `${w} says please or thanks ${v} times per 10 prompts` },
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
  { key: "outbursts", name: "Outbursts", scale: 1e3, prior: [0, 0.02, 0.12], wrapped: true, fun: true, value: (m) => per(m.profanity + (m.hostility ?? 0) + m.yelling, m.humanTurns, 5), fmt: (v) => n1(v * 10), line: (v) => `You lose your temper ${v} times per 10 prompts`, they: (v, w) => `${w} loses their temper ${v} times per 10 prompts` },
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
  { key: "vague", name: "Vague follow-ups per 10 prompts", scale: 10, prior: [0, 0.4, 1.5], log: true, value: (m) => m.vaguePrompts === void 0 || m.humanTurns < 5 ? null : m.vaguePrompts / m.humanTurns * 10, fmt: n1, line: (v) => `You send ${v} vague follow-ups ("fix this", "still broken") per 10 prompts`, they: (v, w) => `${w} sends ${v} vague follow-ups ("fix this", "still broken") per 10 prompts` },
  // rework: Share of coding turns that redo earlier work after a correction, an undo or a repeated ask, without a stated change of plan. Sits below Corrections [0.02, 0.08, 0.2]: only corrections that lead to redone code count.
  { key: "rework", name: "Avoidable rework", scale: 1e3, prior: [0, 0.06, 0.2], good: -1, value: (m) => m.workTurns === void 0 ? null : per(m.avoidableRedos ?? 0, m.workTurns, 5), fmt: pct, line: (v) => `${v} of your agent's coding turns redo earlier work after a correction, an undo or a repeated ask`, they: (v, w) => `${v} of ${w}'s agent's coding turns redo earlier work after a correction, an undo or a repeated ask` }
];
var SIGNAL_BY_KEY = Object.fromEntries(SIGNALS.map((s) => [s.key, s]));
function signalValues(m) {
  return Object.fromEntries(SIGNALS.map((s) => {
    const v = s.value(m);
    return [s.key, v === null || !Number.isFinite(v) ? null : v];
  }));
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
function exactPercentile(key, v, ref) {
  const s = SIGNAL_BY_KEY[key];
  const prior = priorPercentile(s.prior, v, s.log);
  const w = dataWeight(key, ref);
  return w ? w * exactPercentileOf(ref.quantiles[key], v) + (1 - w) * prior : prior;
}
function percentileFor(key, v, ref) {
  return Math.round(exactPercentile(key, v, ref));
}
var PCT_MIN = 0.01;
var PCT_MAX = 99.99;
var clampPct = (p) => Math.min(PCT_MAX, Math.max(PCT_MIN, Math.round(p * 100) / 100));
function percentilePrecise(key, v, ref) {
  return clampPct(exactPercentile(key, v, ref));
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
function signatureOf(values, ref, who) {
  const out = [];
  let fun = 0;
  for (const l of profileLines(values, ref, who)) {
    if (l.key === "hours") continue;
    const isFun = SIGNAL_BY_KEY[l.key].fun;
    if (isFun && fun >= 1) continue;
    out.push(l);
    if (isFun) fun++;
    if (out.length === 3) break;
  }
  return out;
}
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
var FEATURES = {
  planFirstRate: (m) => ratio(m.sessionsPlanFirst, m.sessionsWithEdits),
  planEventsPerSession: (m) => m.planEvents / Math.max(1, m.sessions),
  structuredShare: (m) => shrink(m.promptsStructured, m.humanTurns, 0.15, 5),
  criteriaShare: (m) => shrink(m.promptsWithCriteria, m.humanTurns, 0.2, 5),
  pathsShare: (m) => shrink(m.promptsWithPaths, m.humanTurns, 0.2, 5),
  avgPromptChars: (m) => m.avgPromptChars,
  toolsPerTurn: (m) => m.toolCalls / Math.max(1, m.humanTurns),
  steerRate: (m) => (m.corrections + m.interrupts) / Math.max(1, m.humanTurns),
  // Corrections only: experienced users interrupt MORE (Anthropic autonomy study), so interrupts aren't penalized.
  correctionRate: (m) => shrink(m.corrections, m.humanTurns, 0.15, 5),
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
function provisionalMessage(r) {
  if (!r) return "Your vibe check isn't on the boards.";
  if (r.kind === "sample") return "Your vibe check isn't on the boards because it was made from an example conversation.";
  if (r.kind === "private") return "Your vibe check isn't on the boards because its numbers were computed on your device. Upload the conversations to be ranked.";
  if (r.kind === "rejected") return `Your vibe check isn't on the boards because too many of the conversations didn't pass the checks (${r.rejected} of ${r.uploaded}).`;
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const have = [r.prompts < MIN_RANKED_PROMPTS ? plural(r.prompts, "prompt") : null, r.edits < MIN_RANKED_EDITS ? plural(r.edits, "edit") : null].filter(Boolean).join(" and ");
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
    return clip(v, max);
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
  const stub = () => typeof rec.uuid === "string" ? { type: "stub", uuid: rec.uuid, parentUuid: rec.parentUuid ?? null, timestamp: rec.timestamp, sessionId: rec.sessionId, isSidechain: rec.isSidechain } : null;
  if (rec.type === "attachment") {
    const a = rec.attachment || {};
    if (a.type !== "queued_command" || a.isMeta === true) return stub();
    return { type: "attachment", uuid: rec.uuid, parentUuid: rec.parentUuid ?? null, timestamp: rec.timestamp, sessionId: rec.sessionId, attachment: { type: a.type, commandMode: a.commandMode, prompt: walk(a.prompt, "text", opts, false) } };
  }
  if (typeof rec.type === "string" && DROP_TYPES.has(rec.type)) return stub();
  if (rec.type === "session_meta") {
    const p = rec.payload || {};
    return { timestamp: rec.timestamp, type: "session_meta", payload: { id: p.id, cli_version: p.cli_version, timestamp: p.timestamp } };
  }
  if (rec.type === "turn_context") {
    const p = rec.payload || {};
    return { timestamp: rec.timestamp, type: "turn_context", payload: { model: p.model } };
  }
  return walk(rec, "", opts, false);
}
function compactTranscript(text, opts = { mode: "analysis" }) {
  const out = [];
  for (const line of text.split("\n")) {
    const l = line.trim();
    if (!l || l[0] !== "{") continue;
    try {
      const c = compactRecord(JSON.parse(l), opts);
      if (c) out.push(JSON.stringify(c));
    } catch {
    }
  }
  return out.join("\n");
}

// src/lib/consent.ts
var CONSENT_VERSION = "2026-11-11";
var RIGHTS_STATEMENT = "I'm allowed to upload these conversations, and they don't contain sensitive, confidential or illegal material (such as credentials, other people's personal data, or code I'm not permitted to share).";
var IMPROVEMENT_STATEMENT = "Let Vibrometer and its partners use these conversations, with secrets and identifiers removed, to improve their services.";
var IMPROVEMENT_NOTE = "Optional. It applies only to this upload, and you can withdraw it later from your account page.";
var RIGHTS_REQUIRED_ERROR = `Confirm this statement before uploading: "${RIGHTS_STATEMENT}" Send confirmRights: true with the upload (in the CLI, add --confirm-rights).`;
var consentFields = (allowImprovement) => ({ confirmRights: true, allowImprovement, consentVersion: CONSENT_VERSION });

// src/lib/server/direction.ts
var FILLER = new Set(
  "a an and or but the this that these those it its it's is are was were be been being am do does did done doing to of in on at by for with from as into onto up down out over so then than too very just also still even only now again already please pls plz thanks thank thx ty i me my we us our you your yours he she her him his they them their what which who how when where why there here yes yeah yep yup ya y ok okay k kk sure fine good great nice cool perfect alright right correct exactly agreed agree approve approved lgtm sgtm ack go ahead proceed continue continuing keep going carry on next more sounds looks seems can could would should will shall may might must let lets let's want need like try trying get got make made solve solved solving solution implement implemented implementation build finish finished complete completed work working do it everything all whole entire full rest remaining anything something stuff thing things challenge task problem ticket job spec code coding test tests testing tested pass passing passes fail failing failed fix fixed bug bugs error errors run running rerun submit submitted submission until till start started begin go on yourself own alone autonomously automatically best whatever think see know claude agent ai model no nope not don't dont stop wait hold".split(/\s+/)
);
var wordsOf2 = (s) => (s.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'._%-]*/gu) ?? []).map((w) => w.replace(/[.'_%-]+$/, ""));
function contentWords2(text) {
  return wordsOf2(text).filter((w) => w.length > 1 && !FILLER.has(w));
}
var ASK_CMD = /\bvibrometer(?:\.mjs)?["']?\s+ask\s+([\s\S]+)$/i;
function askQuestion(command) {
  const m = command.match(ASK_CMD);
  if (!m) return null;
  const q = m[1].trim().replace(/^["'`]|["'`]$/g, "").trim();
  return q && !q.startsWith("--") ? q : null;
}

// src/cli/vibrometer.ts
var PRIVACY = `Before you upload, leave out any conversation that contains personal, sensitive or confidential
information: customer or patient data, credentials, financial or health details, or code and documents
that you aren't allowed to share. We strip common secrets (API keys, tokens, passwords, emails), but we
can't recognise everything, so choose what to include.`;
var CONSENT = `Uploading conversations needs your confirmation of this statement (add --confirm-rights):
  "${RIGHTS_STATEMENT}"

To also agree to this statement, add --allow-improvement:
  "${IMPROVEMENT_STATEMENT}"
  ${IMPROVEMENT_NOTE}`;
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
    process.exit(1);
  }
  return consentFields(flagOn(flags["allow-improvement"]));
}
var CFG_DIR = process.env.VIBROMETER_HOME || join(homedir(), ".vibrometer");
var CFG = join(CFG_DIR, "config.json");
var ACTIVE = join(CFG_DIR, "active-challenge.json");
var PENDING_LOGIN = join(CFG_DIR, "pending-login.json");
var readJson = (p, d) => {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return d;
  }
};
var writeJson = (p, v) => {
  mkdirSync(dirname(p), { recursive: true });
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
async function api(path, body, headers = {}) {
  const c = cfg();
  const res = await fetch(server() + path, {
    method: body === void 0 ? "GET" : "POST",
    headers: {
      ...body === void 0 ? {} : { "content-type": "application/json" },
      "x-vibrometer-client": "cli",
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
  if (!res.ok) throw new Error(String(data.error || `HTTP ${res.status}`));
  return data;
}
async function post(path, body) {
  const res = await fetch(server() + path, { method: "POST", headers: { "content-type": "application/json", "x-vibrometer-client": "cli" }, body: JSON.stringify(body) });
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
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      walk2(p, out, since);
    } else if (e.name.endsWith(".jsonl")) {
      try {
        if (statSync(p).mtimeMs >= since) out.push(p);
      } catch {
      }
    }
  }
}
function transcriptRoots() {
  const roots = [join(homedir(), ".claude", "projects"), join(process.env.CODEX_HOME || join(homedir(), ".codex"), "sessions")];
  if (process.env.CLAUDE_CONFIG_DIR) roots.push(join(process.env.CLAUDE_CONFIG_DIR, "projects"));
  return roots.filter((r) => existsSync(r));
}
function findTranscripts(sinceMs, max) {
  const files = [];
  for (const r of transcriptRoots()) walk2(r, files, sinceMs);
  return files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs).slice(0, max);
}
var listCsv = (v) => typeof v === "string" ? v.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean) : [];
var projectOf = (s, file) => s.cwd ? s.cwd.split(/[\\/]/).filter(Boolean).slice(-2).join("/") : file.split(/[\\/]/).slice(-2, -1)[0] ?? "unknown";
function loadConversations(flags) {
  const days = Number(flags.days ?? 30);
  const max = Number(flags.max ?? 400);
  const files = flags.file ? String(flags.file).split(",") : findTranscripts(Date.now() - days * 864e5, max);
  if (!files.length) {
    console.log(`No transcripts found in ${transcriptRoots().join(", ") || "~/.claude/projects or ~/.codex/sessions"} from the last ${days} days.`);
    process.exit(1);
  }
  const all = [];
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    const s = parseSession(text, f);
    if (s) all.push({ file: f, text, s, main: s.events.some((e) => e.kind === "prompt"), id: s.id.slice(0, 8), project: projectOf(s, f) });
  }
  const inc = listCsv(flags.project);
  const exc = listCsv(flags["exclude-project"]);
  const only = listCsv(flags.sessions);
  const skip = listCsv(flags.exclude);
  const mains = all.filter((x) => {
    if (!x.main) return false;
    const where = (x.s.cwd ?? x.file).toLowerCase();
    if (inc.length && !inc.some((p) => where.includes(p))) return false;
    if (exc.some((p) => where.includes(p))) return false;
    if (only.length && !only.some((id) => x.s.id.toLowerCase().startsWith(id))) return false;
    if (skip.some((id) => x.s.id.toLowerCase().startsWith(id))) return false;
    return true;
  });
  const ids = new Set(mains.map((x) => x.s.id));
  const chosen = [...mains, ...all.filter((x) => !x.main && ids.has(x.s.id))];
  return { mains, chosen };
}
function cmdList(flags) {
  const { mains } = loadConversations(flags);
  const rows = mains.map((x) => ({ id: x.id, project: x.project, date: new Date(x.s.startedAt).toISOString().slice(0, 10), prompts: x.s.events.filter((e) => e.kind === "prompt").length, firstPrompt: (x.s.firstPrompt ?? "").replace(/\s+/g, " ").slice(0, 80) })).sort((a, b) => a.project.localeCompare(b.project) || b.date.localeCompare(a.date));
  if (flags.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  let last = "";
  for (const r of rows) {
    if (r.project !== last) console.log(`
${r.project}`);
    last = r.project;
    console.log(`  ${r.id}  ${r.date}  ${String(r.prompts).padStart(3)} prompts  ${r.firstPrompt}`);
  }
  console.log(`
${rows.length} conversations. Choose with --sessions <id,id,...> or --project / --exclude-project / --exclude.

${PRIVACY}`);
}
async function cmdAnalyze(flags) {
  const { mains, chosen } = loadConversations(flags);
  if (!mains.length) {
    console.log("No conversations matched. Run `list` to see them and their ids.");
    process.exit(1);
  }
  const analysis = analyzeMetrics(computeMetrics(chosen.map((c) => c.s), { tzOffsetMinutes: (/* @__PURE__ */ new Date()).getTimezoneOffset() }));
  const m = analysis.metrics;
  const priv = !!flags.private;
  console.log(`
Read ${m.sessions} conversations \xB7 ${m.humanTurns} prompts \xB7 ${m.toolCalls} tool calls \xB7 ${Math.round(m.activeMinutes)} active min
`);
  console.log("  Your vibe check (preview; the site compares you with everyone):");
  for (const l of signatureOf(signalValues(m), null)) console.log(`   \xB7 ${l.text}. ${l.compare}.`);
  const transcripts = priv ? [] : chosen.map((c) => compactTranscript(c.text, { mode: "analysis" }));
  const bytes = transcripts.reduce((n, t) => n + t.length, 0);
  if (flags["dry-run"] || !flags.yes) {
    if (priv) console.log("\nWould upload only these aggregate numbers (no conversation text):\n" + JSON.stringify(m, null, 2));
    else {
      console.log(`
Would upload ${mains.length} redacted conversation(s), ${(bytes / 1e6).toFixed(1)}MB:`);
      for (const x of mains) console.log(`   ${x.id}  ${new Date(x.s.startedAt).toISOString().slice(0, 10)}  ${x.project.padEnd(28)}  ${(x.s.firstPrompt ?? "").replace(/\s+/g, " ").slice(0, 60)}`);
    }
    if (priv) console.log(`
${PRIVACY}

Nothing was uploaded. To upload exactly these numbers, run the same command with --yes.`);
    else {
      console.log(`
${PRIVACY}

${CONSENT}`);
      console.log("\nNothing was uploaded. To upload exactly this selection, run the same command with --yes --confirm-rights (and --allow-improvement if you agree to the optional statement).");
    }
    console.log("To change it: --sessions <id,...>, --exclude <id,...>, --project / --exclude-project <name>, --days N, or --private (numbers only, no conversations, so no confirmation is needed).");
    if (!cfg().token) console.log(`
You're not signed in, and uploading needs an account. ${LOGIN_FIRST}`);
    return;
  }
  requireLogin("uploaded");
  const consent = priv ? null : requireConsent(flags, "the same command");
  if (bytes > 36e6) {
    console.log(`
That's ${(bytes / 1e6).toFixed(0)}MB after compaction (max 36MB). Use --days or --project to narrow it down.`);
    process.exit(1);
  }
  const profile = {};
  for (const k of ["handle", "school", "major", "city", "region", "country", "github"]) if (typeof flags[k] === "string") profile[k] = flags[k];
  if (typeof flags["grad-year"] === "string") profile.gradYear = Number(flags["grad-year"]);
  if (flags["open-to-work"]) profile.openToWork = true;
  const body = {
    ...priv ? { metrics: m } : { transcripts, tzOffsetMinutes: (/* @__PURE__ */ new Date()).getTimezoneOffset() },
    ...consent ?? {},
    ...Object.keys(profile).length ? { profile } : {}
  };
  const res = await api("/api/analyses", body);
  const v = res.verification;
  if (v?.mode === "verified") {
    console.log(`
\u{1F512} Verified: ${v.accepted}/${v.uploaded} sessions passed authenticity checks.`);
    if (v.rejected?.length) console.log(`   Excluded: ${v.rejected.slice(0, 3).map((r) => r.reasons.join(", ")).join(" \xB7 ")}`);
  } else console.log("\n\u{1F512} Private result: only aggregate numbers were sent.");
  if (consent)
    console.log(
      consent.allowImprovement ? "   You let Vibrometer and its partners use these conversations, with secrets and identifiers removed, to improve their services. You can withdraw this on your account page." : "   Vibrometer and its partners won't use these conversations to improve their services (you didn't add --allow-improvement)."
    );
  if (res.provisional) console.log(`
\u26A0 ${provisionalMessage(res.reason)}`);
  else if (v?.mode === "verified") console.log("   It's on the habit boards in the Pantheon (they update within a minute).");
  console.log(`
\u2728 See your vibe check, every habit compared with other people, and your share link at:
   ${server()}/#you
`);
  console.log(`   Sign in there with the same account that you approved this computer with${res.handle ? ` (@${res.handle})` : ""}; it's kept on your account, so it shows on any device.`);
}
function writeFiles(dir, files, overwrite) {
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    const p = join(dir, name);
    if (existsSync(p) && !overwrite(name)) {
      console.log(`! ${name} already exists; leaving it (use --force to overwrite)`);
      continue;
    }
    mkdirSync(dirname(p), { recursive: true });
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
  const dir = resolve(String(flags.dir ?? "."));
  const res = await api(`/api/challenges/${slug}/enroll`, {});
  const started = res.started !== false && typeof res.startedAt === "number";
  writeFiles(dir, res.files, (name) => name === "CHALLENGE.md" || !!flags.force);
  writeJson(ACTIVE, { nonce: res.nonce, slug, dir, entry: res.challenge.entry, startedAt: started ? res.startedAt : null, started, server: server() });
  console.log(`
\u{1F4CB} The ticket for "${res.challenge.title}" is in ${join(dir, "CHALLENGE.md")}.`);
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
  const r = await fetchDrops(active);
  const applied = new Set(active.appliedDrops ?? []);
  const fresh = r.released.filter((d) => !applied.has(d.index));
  if (!fresh.length) console.log(r.released.length ? "You already have every follow-up released so far." : "No follow-ups yet.");
  for (const d of fresh) {
    const n = d.index + 1;
    for (const [name, content] of Object.entries(d.files)) {
      const p = join(dir, name);
      mkdirSync(dirname(p), { recursive: true });
      const existed = existsSync(p);
      writeFileSync(p, content);
      console.log(`   ${existed ? "replaced" : "added   "} ${name}`);
    }
    writeFileSync(join(dir, `CHANGE-${n}.md`), d.change);
    console.log(`
\u{1F4EC} Follow-up ${n} (saved as CHANGE-${n}.md):

${d.change.trim()}
`);
    applied.add(d.index);
  }
  writeJson(ACTIVE, { ...active, appliedDrops: [...applied].sort((a, b) => a - b) });
  if (r.next) console.log(`   The next follow-up arrives at ${new Date(r.next.at).toLocaleTimeString()}.`);
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
  const r = await api(`/api/challenges/${active.slug}/ask`, { nonce: active.nonce, question, context: askContext(active) });
  console.log(`
${r.name}: ${r.answer}
`);
  console.log(`   ${r.used} of ${r.allowed} questions used.`);
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
    return { afterHumanPrompt: asks <= 1, msSincePrompt: Math.max(0, Date.now() - lastPrompt.t), asksSincePrompt: asks, promptWords: contentWords2(lastPrompt.text).length };
  } catch {
    return none;
  }
}
function findChallengeTranscript(nonce, startedAt) {
  const candidates = findTranscripts(startedAt - 36e5, 500).filter((f) => !f.includes(`${"/"}subagents${"/"}`));
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
  const codePath = join(String(flags.dir ?? active.dir), active.entry);
  if (!existsSync(codePath)) {
    console.log(`Can't find ${codePath}`);
    process.exit(1);
  }
  const code = readFileSync(codePath, "utf8");
  const tPath = flags.transcript ? String(flags.transcript) : findChallengeTranscript(active.nonce, active.startedAt);
  if (!tPath) console.log("\u26A0 Couldn't find a Claude Code/Codex transcript containing your nonce. Submitting unverified.");
  let raw = tPath ? readFileSync(tPath, "utf8") : "";
  const subDir = tPath ? join(tPath.replace(/\.jsonl$/, ""), "subagents") : "";
  if (subDir && existsSync(subDir)) {
    for (const f of readdirSync(subDir)) if (f.endsWith(".jsonl")) raw += "\n" + readFileSync(join(subDir, f), "utf8");
  }
  const transcript = tPath ? compactTranscript(raw, { mode: "challenge" }) : void 0;
  const consent = transcript ? requireConsent(flags, "vibrometer submit") : null;
  let r = await api("/api/submit", { nonce: active.nonce, code, transcript, ...consent ?? {} }, { prefer: "respond-async" });
  if (r.status === "pending" || r.status === "running") {
    process.stdout.write("   Grading on the server");
    const until = Date.now() + 10 * 6e4;
    let errors = 0;
    while (r.status === "pending" || r.status === "running") {
      if (Date.now() > until) {
        console.log(`
   Still grading. Your result will appear on your profile; or check ${server()}/api/submissions/${r.id}`);
        process.exit(1);
      }
      await new Promise((res) => setTimeout(res, 1500));
      process.stdout.write(".");
      try {
        r = await api(`/api/submissions/${r.id}`);
        errors = 0;
      } catch (e) {
        if (++errors >= 5) throw e;
      }
    }
    process.stdout.write("\n");
  }
  if (r.status === "failed") {
    console.log(`
\u274C ${r.error || "Grading failed"}. You can submit again.`);
    process.exit(1);
  }
  const secs = Math.round(r.wallClockMs / 1e3);
  const mins = secs >= 3600 ? `${Math.floor(secs / 3600)}h ${Math.floor(secs % 3600 / 60)}m` : secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`;
  console.log(`
${r.passed ? "\u2705 PASSED" : "\u274C NOT YET"}: ${r.testsPassed}/${r.testsTotal} hidden tests${r.error ? ` (${r.error})` : ""}`);
  if (!r.passed && r.failures.length) console.log(`   Failing: ${r.failures.slice(0, 8).join(", ")}`);
  console.log(`   \u23F1 ${mins} \xB7 \u{1F4AC} ${r.humanTurns} turns \xB7 \u{1FA99} ${r.tokens.toLocaleString()} tokens`);
  const hard = r.flags.filter((f) => !f.review);
  const review = r.flags.filter((f) => f.review);
  console.log(`   ${r.verified ? "\u{1F512} Verified: the transcript checks out" : "\u26A0 Unverified: " + hard.map((f) => f.message).join("; ")}`);
  if (review.length) console.log(`   Flagged for review (the hidden tests still decide the score): ${review.map((f) => f.message).join("; ")}`);
  if (r.baseline) console.log(`   \u{1F916} The model alone scored ${r.baseline.testsPassed}/${r.baseline.testsTotal}: you are ${r.baseline.gainPoints >= 0 ? "+" : ""}${r.baseline.gainPoints} points ${r.baseline.gainPoints >= 0 ? "above" : "against"} it`);
  if (r.direction) console.log(`   \u{1F9ED} Your direction: ${r.direction.substantive} of ${r.direction.prompts} prompts directed the work; ${r.direction.humanAsks} of ${r.direction.asks} stakeholder questions were yours`);
  if (r.practiceReason) console.log(`   \u26A0 ${r.practiceReason}`);
  else if (!r.ranked) console.log(`   (Practice attempt #${r.attempt}: not ranked)`);
  if (r.ranks) {
    const fmt = (x) => x ? `#${x.rank}/${x.of}` : "n/a";
    console.log(`   Ranks: fastest ${fmt(r.ranks.time)} \xB7 fewest prompts (above the AI-alone score) ${fmt(r.ranks.turns)} \xB7 fewest tokens ${fmt(r.ranks.tokens)}`);
  }
  console.log(`   Leaderboard: ${r.leaderboardUrl}
   Profile: ${r.profileUrl}
`);
  if (!r.passed) console.log("   You can resubmit as many times as you like. The clock keeps running.");
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
    const r = await post("/api/cli/login/start", {});
    if (r.status !== 200) throw new Error(String(r.data.error || `HTTP ${r.status}`));
    const d = r.data;
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
    let r;
    try {
      r = await post("/api/cli/login/poll", { deviceCode: p.deviceCode });
    } catch {
      continue;
    }
    const status = r.data.status;
    if (status === "pending") continue;
    if (status === "slow_down") {
      interval += 5;
      continue;
    }
    writeJson(PENDING_LOGIN, null);
    if (status === "approved" && typeof r.data.token === "string") {
      writeJson(CFG, { ...cfg(), token: r.data.token, server: server() });
      console.log(`
Signed in${r.data.handle ? ` as @${r.data.handle}` : ""} on ${server()}.`);
      return;
    }
    if (status === "denied") console.log("\nThe sign-in was denied in the browser. Nothing changed.");
    else if (status === "expired") console.log("\nThe code expired or was already used. Run vibrometer login again.");
    else console.log(`
Sign-in failed: ${String(r.data.error || `HTTP ${r.status}`)}`);
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
  list [--days 30] [--json]   your conversations, grouped by project, with ids
  analyze [--days 30] [--sessions id,...] [--exclude id,...] [--project name,...] [--exclude-project name,...]
          [--private] [--yes --confirm-rights [--allow-improvement]]
          [--handle h] [--school S] [--major M] [--city C] [--country X] [--grad-year Y] [--open-to-work]
                           shows what would be sent; add --yes --confirm-rights to upload it
                           (--private = numbers only, no conversations, no confirmation needed)
  challenge <slug> [--dir .]   enroll in a challenge and get its ticket (CHALLENGE.md); the clock doesn't start yet
  start                        start the clock and write the starter files
  update                       fetch follow-ups (new files, changed requirements) released during the challenge
  ask "question"               ask the challenge's stakeholder (limited questions); no question lists past answers
  submit --confirm-rights [--allow-improvement] [--transcript path]
                               grade your solution and post to the leaderboard (uploads this session's log)
  login --token <token>    sign in with a token from ${server()}/me instead of the browser
  status                   show the server and whether you're signed in

  --confirm-rights      you confirm: "${RIGHTS_STATEMENT}"
  --allow-improvement   optional, off by default: "${IMPROVEMENT_STATEMENT}"
                        ${IMPROVEMENT_NOTE}

  Server: ${server()}`);
  }
}
main().catch((e) => {
  console.error("vibrometer error:", e instanceof Error ? e.message : e);
  process.exit(1);
});
