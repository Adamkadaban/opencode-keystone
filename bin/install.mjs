#!/usr/bin/env node
// opencode-keystone installer
// Installs the /keystone slash command into ~/.config/opencode/commands/

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
} from "node:fs";
import { homedir } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..");
const SOURCE = join(REPO_ROOT, "commands", "keystone.md");
const TARGET_DIR = join(homedir(), ".config", "opencode", "commands");
const TARGET = join(TARGET_DIR, "keystone.md");

const args = new Set(process.argv.slice(2));
const cmd = process.argv[2] && !process.argv[2].startsWith("--")
  ? process.argv[2]
  : "install";
const force = args.has("--force");
const copy = args.has("--copy");
const dev = args.has("--dev");

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

function install() {
  if (!existsSync(SOURCE)) {
    err(`source not found: ${SOURCE}`);
    process.exit(1);
  }
  mkdirSync(TARGET_DIR, { recursive: true });

  const kind = existingKind(TARGET);
  if (kind !== "missing" && !force) {
    err(`refusing to overwrite existing ${TARGET} (${kind}). re-run with --force to replace.`);
    process.exit(1);
  }
  if (kind !== "missing") rmSync(TARGET, { force: true });

  if (copy && !dev) {
    copyFileSync(SOURCE, TARGET);
    log(`copied ${SOURCE} -> ${TARGET}`);
  } else {
    // dev mode and default both symlink. dev mode is a hint that we expect
    // the source to be a working git checkout; behaviour is identical.
    symlinkSync(SOURCE, TARGET);
    log(`symlinked ${TARGET} -> ${SOURCE}`);
    if (dev) log("dev mode: edits to the source file are picked up live.");
  }
  log("done. invoke /keystone in opencode to use it.");
}

function uninstall() {
  const kind = existingKind(TARGET);
  if (kind === "missing") {
    log(`nothing to remove at ${TARGET}`);
    return;
  }
  rmSync(TARGET, { force: true });
  log(`removed ${TARGET} (${kind})`);
}

function status() {
  log(`source : ${SOURCE} (${existsSync(SOURCE) ? "ok" : "MISSING"})`);
  log(`target : ${TARGET} (${existingKind(TARGET)})`);
}

switch (cmd) {
  case "install": install(); break;
  case "uninstall":
  case "remove": uninstall(); break;
  case "status": status(); break;
  case "help":
  case "--help":
  case "-h":
    log("usage: opencode-keystone <install|uninstall|status> [--force] [--copy] [--dev]");
    log("  install         symlink commands/keystone.md into ~/.config/opencode/commands/");
    log("  install --copy  copy instead of symlink (use this when installed via npm globally)");
    log("  install --dev   same as default; signals you're editing the source live");
    log("  install --force overwrite an existing keystone.md at the target");
    log("  uninstall       remove the installed file");
    log("  status          show source + target state");
    break;
  default:
    err(`unknown command: ${cmd}`);
    process.exit(2);
}
