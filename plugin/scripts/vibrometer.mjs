#!/usr/bin/env node
// Vibrometer CLI (generated: edit src/cli/vibrometer.ts and run npm run build:cli)

// src/cli/vibrometer.ts
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
        const u = msg.usage;
        subagentUsage.input += num(u.input_tokens);
        subagentUsage.output += num(u.output_tokens);
        subagentUsage.cacheRead += num(u.cache_read_input_tokens);
        subagentUsage.cacheWrite += num(u.cache_creation_input_tokens);
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
        const u = msg.usage;
        const prev = usageById.get(mid) ?? zero();
        usageById.set(mid, {
          input: Math.max(prev.input, num(u.input_tokens)),
          cacheRead: Math.max(prev.cacheRead, num(u.cache_read_input_tokens)),
          cacheWrite: Math.max(prev.cacheWrite, num(u.cache_creation_input_tokens)),
          output: Math.max(prev.output, num(u.output_tokens))
        });
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
      if (a.type === "queued_command" && a.isMeta !== true && (a.commandMode === void 0 || a.commandMode === "prompt") && typeof a.prompt === "string") {
        const o = a.origin;
        if (!o || o.kind === void 0 || o.kind === "user" || o.kind === "human") pushPrompt(a.prompt, t, false);
      }
    }
  }
  for (const [mid, u] of usageById) {
    const ev = assistantById.get(mid);
    if (ev) ev.usage = u;
  }
  function pushPrompt(text, t, isMeta) {
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
      events.push({ kind: "prompt", t, text: `/${name} ${args2}`.trim(), slash: true });
      return;
    }
    if (!text.trim()) return;
    events.push({ kind: "prompt", t, text, slash: false });
  }
  return {
    id,
    source: "claude-code",
    startedAt: minT === Infinity ? 0 : minT,
    endedAt: maxT,
    models: [...models],
    events,
    subagentUsage,
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
  const exitCodes = /* @__PURE__ */ new Map();
  const resultsById = /* @__PURE__ */ new Map();
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
      if (p.model) models.add(str(p.model));
      continue;
    }
    if (r.type === "event_msg") {
      if (ptype === "user_message") {
        const text = str(p.message);
        if (text.trim() && !isSyntheticPrompt(text)) events.push({ kind: "prompt", t, text, slash: text.trimStart().startsWith("/") });
      } else if (ptype === "turn_aborted") {
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
            if (!lastAssistant) {
              lastAssistant = { kind: "assistant", t, model: [...models].at(-1), toolCount: 0, text: "" };
              events.push(lastAssistant);
            }
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
      if (ptype === "message" && p.role === "assistant") {
        const parts = Array.isArray(p.content) ? p.content : [];
        lastAssistant = { kind: "assistant", t, model: [...models].at(-1), toolCount: 0, text: parts.map((x) => str(x.text)).join("").slice(0, 2e3) };
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
          lastAssistant = { kind: "assistant", t, model: [...models].at(-1), toolCount: 0, text: "" };
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

// src/lib/analyzer/metrics.ts
var CATS = ["read", "search", "edit", "exec", "test", "build", "git", "web", "agent", "plan", "ask", "mcp", "other"];
var IDLE_GAP_MS = 10 * 60 * 1e3;
var PRICES = [
  [/opus-4-[01]|opus-4-2|claude-3-opus/i, 15, 75],
  [/opus/i, 5, 25],
  [/sonnet/i, 3, 15],
  [/haiku/i, 1, 5],
  [/fable/i, 5, 25],
  [/gpt-5.*mini|o4-mini/i, 0.25, 2],
  [/gpt|codex|o3|o4/i, 1.25, 10]
];
function priceFor(model) {
  if (model) {
    for (const [re, i, o] of PRICES) if (re.test(model)) return [i, o];
  }
  return [3, 15];
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
  const lessonTimeline = [];
  const promptLens = [];
  const sources = /* @__PURE__ */ new Set();
  const models = /* @__PURE__ */ new Set();
  let editedTotal = 0;
  let editedReadFirst = 0;
  let weekend = 0;
  let night = 0;
  const tz = opts.tzOffsetMinutes ?? 0;
  const spans = [];
  for (const s of sessions) {
    const events = s.events.filter((e) => (!opts.since || e.t >= opts.since) && (!opts.until || e.t <= opts.until));
    m.tokens.subagent += s.subagentUsage.input + s.subagentUsage.output + s.subagentUsage.cacheRead + s.subagentUsage.cacheWrite;
    if (!events.length) continue;
    m.sessions++;
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
      if (g < IDLE_GAP_MS) active += g;
    }
    const activeMin = active / 6e4;
    if (events.some((e) => e.kind === "prompt") && times.length) {
      let a = times[0], b = times[0];
      for (let i = 1; i < times.length; i++) {
        if (times[i] - b < IDLE_GAP_MS) b = times[i];
        else {
          if (b > a) spans.push([a, b]);
          a = b = times[i];
        }
      }
      if (b > a) spans.push([a, b]);
    }
    m.activeMinutes += activeMin;
    {
      const ord = [...events].filter((e) => e.t).sort((a, b) => a.t - b.t);
      let promptAt = -1;
      let lastAgent = -1;
      for (const e of ord) {
        if (e.kind === "prompt") {
          if (promptAt >= 0 && lastAgent > promptAt) {
            m.agentBusyMinutes += (lastAgent - promptAt) / 6e4;
            m.agentTurns++;
            const wait = e.t - lastAgent;
            if (wait > 0) m.agentWaitMinutes += Math.min(wait, IDLE_GAP_MS) / 6e4;
          }
          promptAt = e.t;
          lastAgent = -1;
        } else if (e.kind === "interrupt") {
          if (promptAt >= 0) lastAgent = Math.max(lastAgent, e.t);
        } else if (e.kind === "assistant" || e.kind === "tool" || e.kind === "tool_result") {
          if (promptAt >= 0) lastAgent = e.t;
        }
      }
      if (promptAt >= 0 && lastAgent > promptAt) {
        m.agentBusyMinutes += (lastAgent - promptAt) / 6e4;
        m.agentTurns++;
      }
    }
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
    let sessionCost = 0;
    for (const e of events) {
      switch (e.kind) {
        case "prompt": {
          closeTurn();
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
            const [pi, po] = priceFor(e.model);
            sessionCost += (e.usage.input * pi + e.usage.cacheRead * pi * 0.1 + e.usage.cacheWrite * pi * 1.25 + e.usage.output * po) / 1e6;
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
    if (s.totalUsageOverride && !opts.since && sessionCost === 0) {
      const [pi, po] = priceFor(s.models[0]);
      sessionCost = (u.input * pi + u.cacheRead * pi * 0.1 + u.output * po) / 1e6;
    }
    m.tokens.input += u.input;
    m.tokens.cacheRead += u.cacheRead;
    m.tokens.cacheWrite += u.cacheWrite;
    m.tokens.output += u.output;
    m.estCostUsd += sessionCost;
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
  m.spanMinutes = Math.round(m.spanMinutes * 10) / 10;
  m.longestSessionMinutes = Math.round(m.longestSessionMinutes * 10) / 10;
  m.estCostUsd = Math.round(m.estCostUsd * 100) / 100;
  return m;
}

// src/lib/analyzer/signature.ts
var MIN_CALIBRATION_N = 50;
var PRIOR_STRENGTH = 300;
var hourLabel = (h) => `${(Math.round(h) + 11) % 12 + 1}${Math.round(h) % 24 < 12 ? "am" : "pm"}`;
var pct = (v) => `${Math.round(v * 100)}%`;
var per = (a, b, min = 1) => b >= min ? a / b : null;
var big = (v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e4 ? `${Math.round(v / 1e3)}k` : Math.round(v).toLocaleString("en-US");
var wallHours = (m) => (m.wallMinutes ?? m.activeMinutes) / 60;
var n1 = (v) => v >= 10 ? String(Math.round(v)) : v.toFixed(1).replace(/\.0$/, "");
var SIGNALS = [
  { key: "verify", name: "Checks after edits", scale: 1e3, prior: [0.2, 0.55, 0.9], good: 1, value: (m) => per(m.verifiedEditTurns, m.editTurns, 2), fmt: pct, line: (v) => `You check the code after ${v} of your edits`, they: (v, w) => `${w} checks the code after ${v} of their edits` },
  { key: "steps", name: "Agent steps per prompt", scale: 10, prior: [3, 8, 13], good: 1, value: (m) => per(m.toolCalls, m.humanTurns, 3), fmt: n1, line: (v) => `Your agent takes ${v} steps for every prompt that you write`, they: (v, w) => `${w}'s agent takes ${v} steps for every prompt that they write` },
  { key: "words", name: "Words per prompt", scale: 10, prior: [15, 45, 80], value: (m) => per(m.humanWords, m.humanTurns, 3), fmt: n1, line: (v) => `Your prompts average ${v} words`, they: (v, w) => `${w}'s prompts average ${v} words` },
  { key: "files", name: "Prompts naming a file", scale: 1e3, prior: [0.2, 0.33, 0.45], good: 1, value: (m) => per(m.promptsWithPaths, m.humanTurns, 3), fmt: pct, line: (v) => `${v} of your prompts name a specific file`, they: (v, w) => `${v} of ${w}'s prompts name a specific file` },
  { key: "done", name: "Prompts defining done", scale: 1e3, prior: [0.12, 0.28, 0.45], good: 1, value: (m) => per(m.promptsWithCriteria, m.humanTurns, 3), fmt: pct, line: (v) => `${v} of your prompts describe what "done" looks like`, they: (v, w) => `${v} of ${w}'s prompts describe what "done" looks like` },
  { key: "corrections", name: "Corrections", scale: 1e3, prior: [0.015, 0.08, 0.18], good: -1, value: (m) => per(m.corrections, m.humanTurns, 3), fmt: pct, line: (v) => `You correct the agent on ${v} of your prompts`, they: (v, w) => `${w} corrects the agent on ${v} of their prompts` },
  { key: "interrupts", name: "Interrupts per 10 prompts", scale: 10, prior: [0.05, 0.3, 0.55], value: (m) => m.humanTurns >= 5 ? m.interrupts / m.humanTurns * 10 : null, fmt: n1, line: (v) => `You stop the agent mid-run ${v} times per 10 prompts`, they: (v, w) => `${w} stops the agent mid-run ${v} times per 10 prompts` },
  { key: "reads", name: "Reads before editing", scale: 1e3, prior: [0.35, 0.6, 0.88], good: 1, value: (m) => m.editedFiles >= 2 ? m.readBeforeEditRatio : null, fmt: pct, line: (v) => `${v} of the files that you change are read first`, they: (v, w) => `${v} of the files that ${w} changes are read first` },
  { key: "plans", name: "Plans before coding", scale: 1e3, prior: [0.1, 0.45, 0.8], good: 1, value: (m) => per(m.sessionsPlanFirst, m.sessionsWithEdits, 1), fmt: pct, line: (v) => `You plan before the first edit in ${v} of sessions`, they: (v, w) => `${w} plans before the first edit in ${v} of sessions` },
  { key: "subagents", name: "Subagents per session", scale: 10, prior: [0, 0.25, 0.7], value: (m) => per(m.subagents, m.sessions, 1), fmt: n1, line: (v) => `You run ${v} subagents per session`, they: (v, w) => `${w} runs ${v} subagents per session` },
  { key: "minutes", name: "Minutes per session", scale: 1, prior: [15, 40, 65], value: (m) => per(m.activeMinutes, m.sessions, 1), fmt: (v) => `${Math.round(v)} min`, line: (v) => `Your sessions average ${v} of active work`, they: (v, w) => `${w}'s sessions average ${v} of active work` },
  { key: "pace", name: "Lines per hour", scale: 1, prior: [150, 650, 2300], value: (m) => wallHours(m) >= 1 / 6 ? m.linesWritten / wallHours(m) : null, fmt: (v) => big(v), line: (v) => `Your agents write ${v} lines per hour of your coding time`, they: (v, w) => `${w}'s agents write ${v} lines per hour of their coding time` },
  { key: "night", name: "Prompts after 11pm", scale: 1e3, prior: [0, 0.05, 0.35], fun: true, value: (m) => per(m.nightOwlShare * m.humanTurns, m.humanTurns, 5), fmt: pct, line: (v) => `${v} of your prompts are sent after 11pm`, they: (v, w) => `${v} of ${w}'s prompts are sent after 11pm` },
  { key: "please", name: "Pleases and thanks", scale: 1e3, prior: [0.05, 0.3, 0.55], fun: true, value: (m) => per(m.politeness, m.humanTurns, 5), fmt: (v) => n1(v * 10), line: (v) => `You say please or thanks ${v} times per 10 prompts`, they: (v, w) => `${w} says please or thanks ${v} times per 10 prompts` },
  // time and parallel work; per-hour measures use wall-clock time, so running sessions side by side counts once
  { key: "hours", name: "Hours coding with agents", scale: 10, prior: [3, 15, 50], value: (m) => wallHours(m) > 0 ? wallHours(m) : null, fmt: n1, line: (v) => `You spent ${v} hours coding with agents in these sessions`, they: (v, w) => `${w} spent ${v} hours coding with agents in these sessions` },
  { key: "concurrency", name: "Sessions running at once", scale: 100, prior: [1, 1.1, 1.7], value: (m) => m.wallMinutes && m.wallMinutes >= 30 ? m.activeMinutes / m.wallMinutes : null, fmt: (v) => v.toFixed(1), line: (v) => `You have ${v} sessions running on average while you work`, they: (v, w) => `${w} has ${v} sessions running on average while they work` },
  { key: "parallel", name: "Time with parallel sessions", scale: 1e3, prior: [0, 0.08, 0.4], value: (m) => m.wallMinutes && m.wallMinutes >= 30 ? (m.parallelMinutes ?? 0) / m.wallMinutes : null, fmt: pct, line: (v) => `${v} of your coding time has two or more sessions running`, they: (v, w) => `${v} of ${w}'s coding time has two or more sessions running` },
  { key: "peak", name: "Most sessions at once", scale: 1, prior: [1, 2, 4], value: (m) => m.peakParallel ? m.peakParallel : null, fmt: (v) => String(Math.round(v)), line: (v) => `You ran up to ${v} sessions at the same time`, they: (v, w) => `${w} ran up to ${v} sessions at the same time` },
  { key: "promptsHour", name: "Prompts per hour", scale: 10, prior: [4, 10, 25], value: (m) => wallHours(m) >= 0.5 ? m.humanTurns / wallHours(m) : null, fmt: n1, line: (v) => `You send ${v} prompts per hour of coding`, they: (v, w) => `${w} sends ${v} prompts per hour of coding` },
  { key: "tokensLine", name: "Tokens per line written", scale: 1, prior: [800, 4e3, 2e4], value: (m) => m.linesWritten >= 20 ? (m.tokens.input + m.tokens.cacheWrite + m.tokens.output + m.tokens.subagent) / m.linesWritten : null, fmt: big, line: (v) => `Your agents use ${v} tokens for each line that they write`, they: (v, w) => `${w}'s agents use ${v} tokens for each line that they write` },
  // who waits on whom: parallel sessions only help if each agent is kept busy with substantive work
  { key: "workPerPrompt", name: "Agent work per prompt", scale: 100, prior: [0.3, 1.5, 6], good: 1, value: (m) => m.agentTurns && m.agentTurns >= 3 ? (m.agentBusyMinutes ?? 0) / m.agentTurns : null, fmt: (v) => `${v >= 10 ? Math.round(v) : v.toFixed(1)} min`, line: (v) => `Each prompt keeps your agent working for ${v}`, they: (v, w) => `Each of ${w}'s prompts keeps their agent working for ${v}` },
  { key: "utilization", name: "Agents working, not waiting", scale: 1e3, prior: [0.25, 0.5, 0.8], good: 1, value: (m) => {
    const b = m.agentBusyMinutes ?? 0, w = m.agentWaitMinutes ?? 0;
    return m.agentTurns && m.agentTurns >= 3 && b + w > 0 ? b / (b + w) : null;
  }, fmt: pct, line: (v) => `Your agents spend ${v} of their time working rather than waiting for you`, they: (v, w) => `${w}'s agents spend ${v} of their time working rather than waiting` },
  { key: "agentsAtOnce", name: "Agents working at once", scale: 100, prior: [0.3, 0.6, 1.4], value: (m) => m.wallMinutes && m.wallMinutes >= 30 && m.agentBusyMinutes ? m.agentBusyMinutes / m.wallMinutes : null, fmt: (v) => v.toFixed(1), line: (v) => `On average ${v} of your agents are working at any moment`, they: (v, w) => `On average ${v} of ${w}'s agents are working at any moment` },
  // Wrapped only
  { key: "peakHour", name: "Busiest hour", scale: 1, prior: [8, 14, 22], wrapped: true, fun: true, value: (m) => m.humanTurns >= 5 ? m.hourHistogram.indexOf(Math.max(...m.hourHistogram)) : null, fmt: (v) => hourLabel(v), line: (v) => `Your busiest hour is ${v}`, they: (v, w) => `${w}'s busiest hour is ${v}` },
  { key: "weekend", name: "Prompts on weekends", scale: 1e3, prior: [0, 0.12, 0.4], wrapped: true, fun: true, value: (m) => m.humanTurns >= 5 ? m.weekendShare : null, fmt: pct, line: (v) => `${v} of your prompts are sent on weekends`, they: (v, w) => `${v} of ${w}'s prompts are sent on weekends` },
  // Appended last: share links store values in this order, so new signals go at the end.
  { key: "outbursts", name: "Outbursts", scale: 1e3, prior: [0, 0.02, 0.12], wrapped: true, fun: true, value: (m) => per(m.profanity + (m.hostility ?? 0) + m.yelling, m.humanTurns, 5), fmt: (v) => n1(v * 10), line: (v) => `You lose your temper ${v} times per 10 prompts`, they: (v, w) => `${w} loses their temper ${v} times per 10 prompts` },
  // Outcomes (src/lib/analyzer/outcomes.ts). We have no population data for these yet, so every prior below is a wide
  // guess that the real distribution will replace as people share (see percentileFor). Where a prior leans on an
  // existing signal's prior, the comment says which.
  // Verified finish is stricter than "Checks after edits" (it needs a pass, by a real test or build tool, after the
  // session's last edit, or a commit), so its cutoffs sit below that signal's [0.2, 0.55, 0.9].
  { key: "finish", name: "Sessions that end verified", scale: 1e3, prior: [0.1, 0.45, 0.85], good: 1, value: (m) => per(m.verifiedFinishes ?? 0, m.codeEditSessions ?? 0, 2), fmt: pct, line: (v) => `${v} of your coding sessions end with passing checks or a commit after the last edit`, they: (v, w) => `${v} of ${w}'s coding sessions end with passing checks or a commit after the last edit` },
  // Wide guess: most sessions resolve what they break; a long tail leaves a few failures behind.
  { key: "unresolved", name: "Errors left unresolved", scale: 100, prior: [0, 0.4, 2], good: -1, value: (m) => m.unresolvedErrors === void 0 || m.toolCalls < 10 ? null : per(m.unresolvedErrors, m.sessions, 2), fmt: n1, line: (v) => `Your sessions end with ${v} unresolved errors on average`, they: (v, w) => `${w}'s sessions end with ${v} unresolved errors on average` },
  // Kept apart from "Errors left unresolved": loops are rare, so a combined number would be unknown for most people
  // or swamped by one part, and the two answer different questions (how work ends, and what you do when the agent
  // keeps failing). Wide guess, no data.
  { key: "loops", name: "Retry loops you step into", scale: 1e3, prior: [0, 0.4, 0.9], good: 1, value: (m) => per(m.loopsSteppedIn ?? 0, m.retryLoops ?? 0, 2), fmt: pct, line: (v) => `You step in during ${v} of the agent's retry loops`, they: (v, w) => `${w} steps in during ${v} of the agent's retry loops` },
  // Wide guess, no data: we expect about a third of corrections to follow a failure or a missed instruction.
  { key: "catches", name: "Corrections that catch mistakes", scale: 1e3, prior: [0.1, 0.35, 0.7], good: 1, value: (m) => m.catches === void 0 ? null : per(m.catches, m.corrections, 3), fmt: pct, line: (v) => `${v} of your corrections catch a mistake that the agent then fixes`, they: (v, w) => `${v} of ${w}'s corrections catch a mistake that the agent then fixes` },
  // Wide guess, no data: most people rarely edit these files, so the median is low.
  { key: "lessons", name: "Saves lessons to CLAUDE.md or AGENTS.md", scale: 1e3, prior: [0, 0.04, 0.2], good: 1, value: (m) => m.configEditSessions === void 0 ? null : per(m.configEditSessions, m.sessions, 5), fmt: pct, line: (v) => `You update CLAUDE.md, AGENTS.md or memory files in ${v} of your sessions`, they: (v, w) => `${w} updates CLAUDE.md, AGENTS.md or memory files in ${v} of their sessions` },
  // Wide guess, no data.
  { key: "resets", name: "Clears or compacts long contexts", scale: 1e3, prior: [0, 0.35, 0.9], good: 1, value: (m) => per(m.contextResets ?? 0, (m.contextResets ?? 0) + (m.autoCompactions ?? 0), 2), fmt: pct, line: (v) => `You clear or compact the context yourself in ${v} of resets, before automatic compaction does it`, they: (v, w) => `${w} clears or compacts the context in ${v} of resets, before automatic compaction does it` },
  // Wide guess, no data: a few edits per check is typical when the agent tests as it goes.
  { key: "batch", name: "Edits between checks", scale: 10, prior: [1.5, 4, 12], good: -1, value: (m) => per(m.batchEdits ?? 0, m.checkBatches ?? 0, 3), fmt: n1, line: (v) => `Your agent makes ${v} code edits before a test, build or lint checks them`, they: (v, w) => `${w}'s agent makes ${v} code edits before a test, build or lint checks them` },
  // The "Tokens per line written" prior [800, 4000, 20000] times about 200 lines in a typical coding session, then
  // widened because sessions that don't end verified add tokens but not outcomes. Stored in thousands (scale 0.001)
  // so that share links stay within seven digits.
  { key: "tokensFinish", name: "Tokens per verified session", scale: 1e-3, prior: [15e4, 1e6, 6e6], good: -1, value: (m) => per(m.tokens.input + m.tokens.cacheWrite + m.tokens.output + m.tokens.subagent, m.verifiedFinishes ?? 0, 2), fmt: big, line: (v) => `Your agents use ${v} tokens for each session that ends verified`, they: (v, w) => `${w}'s agents use ${v} tokens for each session that ends verified` }
];
var SIGNAL_BY_KEY = Object.fromEntries(SIGNALS.map((s) => [s.key, s]));
function signalValues(m) {
  return Object.fromEntries(SIGNALS.map((s) => {
    const v = s.value(m);
    return [s.key, v === null || !Number.isFinite(v) ? null : v];
  }));
}
function percentileOf(q, v) {
  if (!q?.length) return 50;
  if (v <= q[0]) return 0;
  if (v >= q[q.length - 1]) return 100;
  let i = 0;
  while (i < q.length - 1 && q[i + 1] <= v) i++;
  const span = q[i + 1] - q[i];
  return Math.round((i + (span > 0 ? (v - q[i]) / span : 0.5)) / (q.length - 1) * 100);
}
function priorPercentile([p10, p50, p90], v) {
  if (v <= p10) return p10 > 0 ? Math.max(1, 10 * v / p10) : 5;
  if (v <= p50) return 10 + 40 * (v - p10) / (p50 - p10);
  if (v <= p90) return 50 + 40 * (v - p50) / (p90 - p50);
  return Math.min(99, 90 + 9 * (v - p90) / Math.max(1e-9, p90 - p50));
}
function dataWeight(key, ref) {
  const n = ref?.n[key] ?? 0;
  return n >= MIN_CALIBRATION_N && ref?.quantiles[key] ? n / (n + PRIOR_STRENGTH) : 0;
}
function percentileFor(key, v, ref) {
  const s = SIGNAL_BY_KEY[key];
  const prior = priorPercentile(s.prior, v);
  const w = dataWeight(key, ref);
  return Math.round(w ? w * percentileOf(ref.quantiles[key], v) + (1 - w) * prior : prior);
}
function compareWords(pct2) {
  if (pct2 >= 95) return "Higher than 19 in 20 people";
  if (pct2 <= 5) return "Lower than 19 in 20 people";
  if (pct2 >= 50) return `Higher than ${Math.floor(pct2 / 10)} in 10 people`;
  return `Lower than ${Math.max(5, Math.floor((100 - pct2) / 10))} in 10 people`;
}
function profileLines(values, ref, who) {
  return SIGNALS.filter((s) => !s.wrapped && values[s.key] !== null && values[s.key] !== void 0).map((s) => {
    const v = values[s.key];
    const p = percentileFor(s.key, v, ref);
    return { key: s.key, text: who ? s.they(s.fmt(v), who) : s.line(s.fmt(v)), compare: compareWords(p), pct: p, value: v };
  }).sort((a, b) => Math.abs(b.pct - 50) - Math.abs(a.pct - 50));
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
    return { s, v, p, goodness: s.good === 1 ? p : 100 - p };
  }).sort((a, b) => b.goodness - a.goodness);
  const out = [];
  for (const x of judged.filter((x2) => x2.goodness >= 60).slice(0, 2))
    out.push({ kind: "strength", key: x.s.key, title: x.s.name, body: COACH[x.s.key].keep(x.s.fmt(x.v)), compare: compareWords(x.p) });
  const weak = judged.filter((x) => x.goodness <= 40).reverse().slice(0, 2);
  for (const x of weak) out.push({ kind: "blindspot", key: x.s.key, title: x.s.name, body: COACH[x.s.key].improve(x.s.fmt(x.v)), compare: compareWords(x.p) });
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
    { label: "Tokens used", value: fmtNum(m.tokens.total + m.tokens.subagent), note: `about $${m.estCostUsd.toFixed(2)} at list price` },
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
    provisional: m.humanTurns < 8 || m.editTurns < 2,
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
  [/((?:api[_-]?key|secret|token|password|passwd|pwd|auth)["']?\s*[:=]\s*["']?)[^\s"',;]{8,}/gi, "$1[REDACTED]"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]"]
];
function redactSecrets(s) {
  let out = s;
  for (const [re, rep] of SECRET_PATTERNS) out = out.replace(re, rep);
  return out;
}
function truncate(s, max) {
  if (s.length <= max) return s;
  const lines = s.split("\n").length;
  return s.slice(0, max) + `\u2026\u27EAtrunc ${s.length}c ${lines}l\u27EB`;
}
var DROP_TYPES = /* @__PURE__ */ new Set(["attachment", "file-history-snapshot", "queue-operation", "atis-latch", "last-prompt", "tools-used", "summary"]);
var KEEP_EDIT_FIELDS = /* @__PURE__ */ new Set(["content", "new_string", "old_string", "new_source", "input", "arguments", "command", "cmd"]);
function walk(v, key, opts, inToolResult) {
  if (typeof v === "string") {
    const editField = KEEP_EDIT_FIELDS.has(key);
    const max = inToolResult ? opts.mode === "challenge" ? 4e3 : 240 : editField ? opts.mode === "challenge" ? 4e4 : key === "command" || key === "cmd" ? 1e3 : 400 : key === "text" || key === "message" ? 4e3 : 1e3;
    return redactSecrets(truncate(v, max));
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

// src/cli/vibrometer.ts
var PRIVACY = `Before you upload, leave out any conversation that contains personal, sensitive or confidential
information: customer or patient data, credentials, financial or health details, or code and documents
that you aren't allowed to share. We strip common secrets (API keys, tokens, passwords, emails), but we
can't recognise everything, so choose what to include.`;
var CFG_DIR = process.env.VIBROMETER_HOME || join(homedir(), ".vibrometer");
var CFG = join(CFG_DIR, "config.json");
var ACTIVE = join(CFG_DIR, "active-challenge.json");
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
  if (typeof data.token === "string") writeJson(CFG, { ...c, token: data.token, server: c.server || server() });
  return data;
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
    console.log(`
${PRIVACY}

Nothing was uploaded. To upload exactly this selection, run the same command with --yes.`);
    console.log("To change it: --sessions <id,...>, --exclude <id,...>, --project / --exclude-project <name>, --days N, or --private (numbers only).");
    return;
  }
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
    ...Object.keys(profile).length ? { profile } : {}
  };
  const res = await api("/api/analyses", body);
  const v = res.verification;
  if (v?.mode === "verified") {
    console.log(`
\u{1F512} Verified: ${v.accepted}/${v.uploaded} sessions passed authenticity checks.`);
    if (v.rejected?.length) console.log(`   Excluded: ${v.rejected.slice(0, 3).map((r) => r.reasons.join(", ")).join(" \xB7 ")}`);
  } else console.log("\n\u{1F512} Private result: only aggregate numbers were sent.");
  console.log(`
\u2728 Your vibe check, every habit compared with other people, and your share link:
   ${res.url}
`);
  console.log(`   Profile: ${server()}/u/${res.handle}`);
  if (res.claimUrl) console.log(`   Open in your browser to edit school/city (one-time link, 15 min):
   ${res.claimUrl}`);
}
async function cmdChallenge(pos, flags) {
  const slug = pos[0];
  if (!slug) {
    console.log(`Usage: vibrometer challenge <slug>. Browse challenges at ${server()}/challenges`);
    process.exit(1);
  }
  const dir = resolve(String(flags.dir ?? "."));
  const res = await api(`/api/challenges/${slug}/enroll`, {});
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(res.files)) {
    const p = join(dir, name);
    if (existsSync(p) && !flags.force) {
      console.log(`! ${name} already exists; leaving it (use --force to overwrite)`);
      continue;
    }
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content);
  }
  writeJson(ACTIVE, { nonce: res.nonce, slug, dir, entry: res.challenge.entry, startedAt: res.startedAt, server: server() });
  console.log(`
\u{1F3C1} Enrolled in "${res.challenge.title}". The clock started at ${new Date(res.startedAt).toLocaleTimeString()}.`);
  console.log(`   Challenge nonce: ${res.nonce}`);
  if (res.challenge.leaderboard === false) console.log("   This is a practice challenge: results show on its board but don't count toward the season rankings.");
  else
    console.log(
      res.ranked ? "   This is your RANKED attempt: your best passing submission goes on the leaderboard." : `   Practice attempt #${res.attempt}: only your first attempt is ranked, so this one won't change your leaderboard spot.`
    );
  const top = [...new Set(Object.keys(res.files).map((f) => f.includes("/") ? f.split("/")[0] + "/" : f))];
  console.log(`   Files written to ${dir}: ${top.join(", ")}`);
  console.log(`
   Read CHALLENGE.md, implement ${res.challenge.entry}, and test it with: node --test`);
  console.log(`   When ready, submit from THIS session: vibrometer submit (or /vibrometer:submit)`);
  const sh = res.challenge.stakeholder;
  if (sh) console.log(`   You can ask ${sh.name ?? "the stakeholder"} ${sh.questions} questions: vibrometer ask "your question"`);
  for (const d of res.challenge.drops ?? [])
    console.log(`   A follow-up arrives ${d.afterMinutes} min in (${new Date(d.at).toLocaleTimeString()}). Get it with: vibrometer update`);
  console.log(`   Ranked on wall-clock time, turns and tokens. Target: ${res.challenge.timeLimitMinutes} min.
`);
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
  const r = await api(`/api/challenges/${active.slug}/ask`, { nonce: active.nonce, question });
  console.log(`
${r.name}: ${r.answer}
`);
  console.log(`   ${r.used} of ${r.allowed} questions used.`);
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
  let r = await api("/api/submit", { nonce: active.nonce, code, transcript }, { prefer: "respond-async" });
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
  if (!r.ranked) console.log(`   (Practice attempt #${r.attempt}: not ranked)`);
  if (r.ranks) {
    const fmt = (x) => x ? `#${x.rank}/${x.of}` : "n/a";
    console.log(`   Ranks: fastest ${fmt(r.ranks.time)} \xB7 fewest turns ${fmt(r.ranks.turns)} \xB7 fewest tokens ${fmt(r.ranks.tokens)}`);
  }
  console.log(`   Leaderboard: ${r.leaderboardUrl}
   Profile: ${r.profileUrl}
`);
  if (!r.passed) console.log("   You can resubmit as many times as you like. The clock keeps running.");
}
function cmdLogin(pos, flags) {
  const token = pos[0];
  if (!token) {
    console.log(`Usage: vibrometer login <token> [--server URL]. Get a token at ${server()}/me`);
    process.exit(1);
  }
  writeJson(CFG, { ...cfg(), token, ...flags.server ? { server: String(flags.server).replace(/\/$/, "") } : {} });
  console.log(`Saved. Using server ${server()}`);
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
    case "submit":
      return cmdSubmit(flags);
    case "update":
      return cmdUpdate(flags);
    case "ask":
      return cmdAsk(pos);
    case "login":
      return cmdLogin(pos, flags);
    case "link": {
      const r = await api("/api/claim", {});
      console.log(`One-time sign-in link for your browser (15 min):
${r.url}`);
      return;
    }
    case "status": {
      const c = cfg();
      console.log(JSON.stringify({ server: server(), loggedIn: !!c.token, activeChallenge: readJson(ACTIVE, null), transcriptRoots: transcriptRoots() }, null, 2));
      return;
    }
    default:
      console.log(`vibrometer: see how you code with AI

  list [--days 30] [--json]   your conversations, grouped by project, with ids
  analyze [--days 30] [--sessions id,...] [--exclude id,...] [--project name,...] [--exclude-project name,...]
          [--private] [--yes] [--handle h] [--school S] [--major M] [--city C] [--country X] [--grad-year Y] [--open-to-work]
                           shows what would be sent; add --yes to upload it (--private = numbers only)
  link                     one-time link that signs your browser into this profile
  challenge <slug> [--dir .]   enroll in a challenge and start the clock
  update                       fetch follow-ups (new files, changed requirements) released during the challenge
  ask "question"               ask the challenge's stakeholder (limited questions); no question lists past answers
  submit [--transcript path]   grade your solution and post to the leaderboard
  login <token> [--server URL] link to your profile (token from ${server()}/me)
  status                   show config

  Server: ${server()}`);
  }
}
main().catch((e) => {
  console.error("vibrometer error:", e instanceof Error ? e.message : e);
  process.exit(1);
});
