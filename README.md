<h1 align="center">opencode-keystone</h1>

<p align="center">
  An opinionated <code>/keystone</code> slash command that bootstraps a new project the way you actually want.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/opencode-keystone"><img alt="npm version" src="https://img.shields.io/npm/v/opencode-keystone.svg"></a>
  <a href="https://www.npmjs.com/package/opencode-keystone"><img alt="npm downloads" src="https://img.shields.io/npm/dm/opencode-keystone.svg"></a>
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/npm/l/opencode-keystone.svg"></a>
  <img alt="made with vibes" src="https://img.shields.io/badge/made_with-vibes-ff69b4">
</p>

---

Drop `/keystone <idea>` into any [OpenCode](https://github.com/anomalyco/opencode) session. It researches, lists likely future problems, writes `PLAN.md` and `AGENTS.md`, **stops for your review**, then bootstraps the repo and runs phase 1 in parallel git worktrees with the Copilot review loop after every PR.

## Highlights

- **Foresight first** — explicit pass over perf, licensing, security, cost, portability, and abandonment risk *before* the plan is written.
- **Phased `PLAN.md`** — MVP-first, exit tests per phase, anticipated risks, one-command teardown.
- **Self-contained `AGENTS.md`** — conventional commits, branch-per-issue, Copilot second-opinion loop, worktree convention, cloud cost discipline. No global file required.
- **Review gate** — nothing gets built until you read both files and say `go`.
- **Parallel worktrees** — sub-agents work in `../<project>-wt/<task>/` (single dir for permission scoping), max 3 concurrent, squash-merged, cleaned up on merge and again on project wind-down.
- **Opinionated** — every choice above is baked in. Disagree with one? It's one markdown file. Fork it.

## Install

```bash
npx opencode-keystone install
```

Or via curl:

```bash
curl -fsSL https://raw.githubusercontent.com/Adamkadaban/opencode-keystone/main/install.sh | bash
```

> Keystone is a slash command, not an OpenCode plugin — `opencode plugin` won't work for it.

Both install the same single file: `~/.config/opencode/commands/keystone.md`. Nothing else is touched.

## Use

```
/keystone i want to build a rust cli that renders markdown to ANSI in the terminal
```

Run with no argument and Keystone will ask for the idea once, then proceed.

## Companions

**Required:**

- [`copilot-second-opinion`](https://github.com/Adamkadaban/copilot-second-opinion) — skill + MCP server. Keystone's Phase 7 PR review loop hard-depends on it. Install before first use.

**Strongly recommended:**

- [GitHub MCP](https://github.com/github/github-mcp-server) — used for `gh api user` (author identity), repo creation, issues, PRs, and review-thread management. Without it, Keystone falls back to the `gh` CLI for what it can and asks you for the rest.
- [Context7 MCP](https://github.com/upstash/context7) — live library docs during the Research phase. Without it, Keystone has to rely on upstream source in `references/` and is more likely to ask clarifying questions.

## Hacking on it

```bash
git clone https://github.com/Adamkadaban/opencode-keystone && cd opencode-keystone
node bin/install.mjs install --dev --force
```

`--dev` symlinks from your checkout, so edits are picked up live on the next `/keystone`.

## Releasing

```bash
npm version patch && git push --follow-tags
```

The [publish workflow](./.github/workflows/publish.yml) handles npm (Trusted Publishing + provenance) and the GitHub Release.

## License

[MIT](./LICENSE)
