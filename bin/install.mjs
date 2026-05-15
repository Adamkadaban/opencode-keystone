#!/usr/bin/env node
// opencode-keystone installer
// Installs the /keystone slash command for opencode, Claude Code, and/or Copilot CLI.
// Codex CLI is intentionally not supported — its slash-command model doesn't map cleanly.

import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import {
  existsSync,
  mkdirSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..");
const SOURCE = join(REPO_ROOT, "commands", "keystone.md");

const HOME = homedir();

// Per-target install descriptors. Each target may define a `transform`
// function that rewrites the source file's contents before writing — used
// to strip frontmatter fields that aren't valid for that target. When
// `transform` is set the file is copied (not symlinked) so the user's
// edits to the source don't break the target.
const TARGETS = {
  opencode: {
    label: "OpenCode",
    target: join(HOME, ".config", "opencode", "commands", "keystone.md"),
    invoke: "/keystone",
  },
  claude: {
    label: "Claude Code",
    target: join(HOME, ".claude", "commands", "keystone.md"),
    invoke: "/keystone",
  },
  copilot: {
    label: "GitHub Copilot CLI",
    target: join(HOME, ".copilot", "agents", "keystone.md"),
    invoke: "copilot --agent=keystone --prompt '<idea>'",
    // Copilot agent frontmatter doesn't recognize opencode's `agent:` field.
    // Strip that one line; the rest is fine.
    transform: (src) => src.replace(/^agent:\s*\S+\s*\n/m, ""),
  },
};

const VALID_TARGETS = Object.keys(TARGETS);

function parseArgs() {
  const argv = process.argv.slice(2);
  const positional = [];
  const flags = new Set();
  let targetSpec = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--force" || a === "--copy" || a === "--dev") {
      flags.add(a.slice(2));
    } else if (a === "--target" || a === "-t") {
      targetSpec = argv[++i];
    } else if (a.startsWith("--target=")) {
      targetSpec = a.slice("--target=".length);
    } else if (!a.startsWith("--")) {
      positional.push(a);
    }
  }
  const cmd = positional[0] || "install";
  const targets = resolveTargets(targetSpec);
  return { cmd, targets, force: flags.has("force"), copy: flags.has("copy"), dev: flags.has("dev") };
}

function resolveTargets(spec) {
  if (!spec || spec === "opencode") return ["opencode"];
  if (spec === "all") return VALID_TARGETS.slice();
  const requested = spec.split(",").map((s) => s.trim()).filter(Boolean);
  for (const t of requested) {
    if (!VALID_TARGETS.includes(t)) {
      err(`unknown target: ${t}. valid: ${VALID_TARGETS.join(", ")}, all`);
      process.exit(2);
    }
  }
  return requested;
}

function log(msg) { process.stdout.write(`[opencode-keystone] ${msg}\n`); }
function err(msg) { process.stderr.write(`[opencode-keystone] ${msg}\n`); }

function existingKind(p) {
  try {
    const s = statSync(p, { throwIfNoEntry: false });
    if (!s) return "missing";
    try {
      const link = readlinkSync(p);
      return `symlink -> ${link}`;
    } catch {
      return "file";
    }
  } catch {
    return "missing";
  }
}

function installOne(targetKey, { force, copy, dev }) {
  const t = TARGETS[targetKey];
  if (!existsSync(SOURCE)) {
    err(`source not found: ${SOURCE}`);
    process.exit(1);
  }
  mkdirSync(dirname(t.target), { recursive: true });

  const kind = existingKind(t.target);
  if (kind !== "missing" && !force) {
    err(`${t.label}: refusing to overwrite existing ${t.target} (${kind}). re-run with --force to replace.`);
    return false;
  }
  if (kind !== "missing") rmSync(t.target, { force: true });

  if (t.transform) {
    // transformed targets must be a real file, not a symlink — the source
    // file would otherwise leak the untransformed content.
    const transformed = t.transform(readFileSync(SOURCE, "utf8"));
    writeFileSync(t.target, transformed);
    log(`${t.label}: wrote (transformed) -> ${t.target}`);
  } else if (copy && !dev) {
    copyFileSync(SOURCE, t.target);
    log(`${t.label}: copied -> ${t.target}`);
  } else {
    try {
      symlinkSync(SOURCE, t.target);
      log(`${t.label}: symlinked -> ${t.target}`);
    } catch (e) {
      // fall back to copy if symlinks aren't permitted (e.g. some Windows configs)
      copyFileSync(SOURCE, t.target);
      log(`${t.label}: copied -> ${t.target} (symlink failed: ${e.message})`);
    }
  }
  log(`${t.label}: invoke with \`${t.invoke}\``);
  return true;
}

function uninstallOne(targetKey) {
  const t = TARGETS[targetKey];
  const kind = existingKind(t.target);
  if (kind === "missing") {
    log(`${t.label}: nothing to remove at ${t.target}`);
    return true;
  }
  rmSync(t.target, { force: true });
  log(`${t.label}: removed ${t.target} (${kind})`);
  return true;
}

function statusOne(targetKey) {
  const t = TARGETS[targetKey];
  log(`${t.label.padEnd(20)} ${t.target} (${existingKind(t.target)})`);
}

const { cmd, targets, force, copy, dev } = parseArgs();

switch (cmd) {
  case "install": {
    let allOk = true;
    for (const k of targets) if (!installOne(k, { force, copy, dev })) allOk = false;
    if (!allOk) process.exit(1);
    break;
  }
  case "uninstall":
  case "remove": {
    for (const k of targets) uninstallOne(k);
    break;
  }
  case "status": {
    log(`source: ${SOURCE} (${existsSync(SOURCE) ? "ok" : "MISSING"})`);
    const list = targets.length === 1 && !process.argv.includes("--target") && !process.argv.includes("-t")
      ? VALID_TARGETS // default `status` shows everything
      : targets;
    for (const k of list) statusOne(k);
    break;
  }
  case "help":
  case "--help":
  case "-h": {
    log("usage: opencode-keystone <command> [options]");
    log("");
    log("commands:");
    log("  install      install the slash command (default)");
    log("  uninstall    remove the installed file(s)");
    log("  status       show source + target state");
    log("");
    log("options:");
    log("  --target=<t> target CLI; one of: opencode (default), claude, copilot, all");
    log("               or a comma-separated list, e.g. --target=opencode,claude");
    log("  --force      overwrite an existing file at the target");
    log("  --copy       copy instead of symlink (use when installed via npm globally)");
    log("  --dev        symlink from source (default behavior; signals live-edit intent)");
    break;
  }
  default:
    err(`unknown command: ${cmd}`);
    process.exit(2);
}
