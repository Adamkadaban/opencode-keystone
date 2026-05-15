// opencode plugin shim for opencode-keystone.
//
// Lets users install with `opencode plugin opencode-keystone -g`.
// On every session start it ensures `~/.config/opencode/commands/keystone.md`
// exists (symlinked to the bundled command file, copied if symlinks fail).
// Idempotent, fast — a single existsSync if already installed.

import { existsSync, mkdirSync, copyFileSync, symlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOURCE = resolve(__dirname, "..", "commands", "keystone.md");
const TARGET_DIR = join(homedir(), ".config", "opencode", "commands");
const TARGET = join(TARGET_DIR, "keystone.md");

export const KeystonePlugin = async ({ client }) => {
  try {
    if (existsSync(TARGET)) return {};
    if (!existsSync(SOURCE)) {
      await client?.app?.log?.({
        body: {
          service: "opencode-keystone",
          level: "warn",
          message: `bundled command file not found at ${SOURCE}; package may be misinstalled`,
        },
      });
      return {};
    }
    mkdirSync(TARGET_DIR, { recursive: true });
    try {
      symlinkSync(SOURCE, TARGET);
    } catch {
      copyFileSync(SOURCE, TARGET);
    }
    await client?.app?.log?.({
      body: {
        service: "opencode-keystone",
        level: "info",
        message: `installed /keystone command at ${TARGET}`,
      },
    });
  } catch (e) {
    await client?.app?.log?.({
      body: {
        service: "opencode-keystone",
        level: "warn",
        message: `failed to install /keystone command: ${e?.message || e}`,
      },
    });
  }
  return {};
};
