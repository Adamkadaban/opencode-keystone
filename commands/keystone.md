---
description: Bootstrap a new project — research, foresight, PLAN.md, AGENTS.md, review gate, then parallel worktree execution
agent: build
---

You are running the **Keystone** project bootstrap workflow. The user invoked `/keystone` with the following idea:

$ARGUMENTS

Follow these phases **in order**. Do not skip the review gate. Do not start writing code in worktrees until the user has reviewed and approved both `PLAN.md` and `AGENTS.md`.

---

## Phase 0 — Frame

1. Determine the project root. Default to the current working directory unless the idea names a different path. If the cwd is empty or new, use it. Otherwise ask once.
2. Ask the user a **short, batched** set of clarifying questions only if the idea is genuinely ambiguous. Cover at most:
   - primary language / runtime,
   - reference repos to clone into `references/` for inspiration,
   - deployment target (local CLI, web, mobile, embedded, cloud),
   - hard constraints (offline-only, must run on Windows, single-binary, license, cost ceilings if cloud is involved),
   - private or public on GitHub.

   If `$ARGUMENTS` already covered something, do not re-ask. Use the `question` tool with batched options. **Maximum one question round.** If still ambiguous, make the most reasonable choice and call it out as an assumption in `PLAN.md`.

## Phase 0.5 — Greenfield Check

**Run this immediately after Phase 0 step 1 (project root resolution), before any clarifying questions or research.**

Keystone assumes a greenfield project. Check the project root for any of these Keystone-managed artifacts:

- `PLAN.md`
- `AGENTS.md`
- `LICENSE`
- `CONTRIBUTING.md`
- `NOTES.md`
- `docs/adr/`
- `.github/workflows/test.yml`
- a `.git` directory with commits (use `git -C <root> rev-parse HEAD 2>/dev/null` — non-empty output means there's history)

**If none are found**, proceed to Phase 0 step 2.

**If any are found**, stop. Print a numbered list of exactly what was found (paths only, do not read contents yet) and present three options to the user via the `question` tool:

1. **Abort (recommended).** The user should run `/keystone` in a new directory or remove the conflicting files first. This is the default — Keystone is a bootstrap, not a retrofit, and the safest option is to not touch a populated project.
2. **Resume from a prior `/keystone` run.** Offer this option **only** if the artifacts look coherent with a prior bootstrap — specifically, all of `PLAN.md`, `AGENTS.md`, `NOTES.md`, and `docs/adr/0000-record-architecture-decisions.md` are present. If offered and chosen, determine the resume point by inspecting state:
   - `.git` has no bootstrap commit and no GitHub remote → resume at Phase 6 step 7 (create GitHub repo + push + ruleset + issues).
   - GitHub repo exists but no Phase 1 issues → resume at Phase 6 step 11 (open issues).
   - Phase 1 issues exist but no merged PRs → resume at Phase 7 (parallel execution).
   - Otherwise, ask the user which phase to resume from.
3. **Continue and overwrite.** Only with explicit confirmation. Before writing anything, list every file that would be replaced and ask once more — `"This will overwrite N files. Type 'overwrite' to confirm."` — and require the literal word `overwrite` in the response.

Never silently overwrite. Never delete files outside the Keystone-managed set. If the user picks abort, exit cleanly with a one-line summary of what they should do next.

## Phase 1 — Research

1. If the user named reference repos, clone them shallow into `references/` and add `references/` to `.gitignore`.
2. For each significant external library / framework you'll likely use, query Context7 MCP (`context7_resolve-library-id` → `context7_query-docs`) for current docs. Do not rely on training knowledge.
3. Skim `references/` for the patterns and protocol semantics you'll translate into our own tree.
4. **Identify the author.** Use the **GitHub MCP** (`github_get_me`) to read the authenticated user's `name` and `login`. Fall back to `gh api user` if the MCP is unavailable.
   - Prefer `name` for `LICENSE` and `package.json` author fields.
   - Fall back to `login` **only** if `name` is null/empty.
   - Never invent a real-name expansion from a GitHub username (e.g. don't split a CamelCase login into first/last words). If both `name` and `login` are missing, ask the user once.
5. **License discovery.** Enumerate every dependency you'll pull in, every project in `references/` (an AI-rewrite of a project counts as a dependency for licensing purposes even if it isn't a runtime dep), and the source license of any code being adapted. For each, record the SPDX identifier. Flag the most restrictive obligation you'll inherit (attribution required, share-alike, source-availability, patent grant, AGPL network clause, etc.). This drives the license choice in Phase 3.
6. Produce a short internal summary (do not paste it to the user yet) of what exists, what we're reusing, what we're inventing, and the inherited license constraints.

## Phase 2 — Foresight Pass

Before writing the plan, **explicitly enumerate likely future problems** so they can be designed around now. Walk through these categories and list concrete risks for *this* project under each (skip categories that genuinely don't apply, but say so):

- **Performance / scale** — what gets slow first?
- **Cross-platform / portability** — Windows / macOS / Linux / arch differences.
- **Security** — untrusted input, secret handling, sandboxing, supply chain.
- **Licensing / attribution** — especially for anything derived from `references/`.
- **API / dependency churn** — which deps are most likely to break us.
- **Test fragility** — what's hard to test deterministically.
- **Cloud cost** — if any cloud resource is in scope, what runs the bill up.
- **Data model lock-in** — schemas / on-disk formats we'd regret.
- **Concurrency / state** — races, deadlocks, leaked subprocesses.
- **Operational / lifecycle** — install, upgrade, uninstall, teardown.
- **Abandonment risk** — if the project pauses mid-phase, what's left in a broken state?

This becomes the **Anticipated Risks** section of `PLAN.md`. Each risk gets a one-line mitigation or a deferral note.

## Phase 3 — Write `PLAN.md`

Create `PLAN.md` at the project root. Structure:

1. **Overview** — one paragraph: what we're building and why.
2. **Architecture** — modules / crates / packages and their boundaries.
3. **Repo Layout** — directory tree of what will exist.
4. **MVP** — smallest concrete demo that proves the design works end-to-end. Real, not stubbed.
5. **Phased Checklist** — phases 0..N. Each phase has:
   - Goal (one sentence).
   - Exit test (objective, runnable).
   - Numbered checklist of tasks with `- [ ]` checkboxes.
   - Parallel-work split: which tasks can run concurrently in their own worktrees.
6. **Anticipated Risks** — from Phase 2, with mitigations. This is **forward-looking foresight only**, not a place for retrospective gotchas. Operational lessons learned during execution belong in `NOTES.md` (see the AGENTS.md template's Operational Memory section), not here.
7. **Extension Points** — things we plan for but won't build yet, with the hook they'll attach to.
8. **Teardown** — one-command project teardown (stop/delete cloud resources, drop `../<project>-wt/`, etc.).
9. **License Choice** — record the chosen SPDX identifier and the reasoning. Default to the most permissive license compatible with the inherited obligations from Phase 1. Common cases:
   - All deps MIT/BSD/ISC/Apache-2.0 with no copyleft → **MIT** (or **Apache-2.0** if any dep requires the patent grant or you want one).
   - Any LGPL dep (statically linked) → **LGPL-2.1-or-later** or **LGPL-3.0-or-later** to match.
   - Any GPL dep linked into the binary → **GPL-3.0-or-later** (or matching version).
   - Any AGPL dep (including network-served code) → **AGPL-3.0-or-later**.
   - AI-rewrite of a GPL/AGPL project → treat as derivative; match the upstream license unless the rewrite is genuinely clean-room (rare, hard to defend).
   - Mixed/conflicting → surface the conflict to the user before writing `LICENSE`.

   When the most permissive choice would be MIT, prefer MIT. The bias is toward openness, not toward defensive copyleft.

MVP comes first. Don't bloat phase 1 with nice-to-haves.

## Phase 4 — Write `AGENTS.md`

Create `AGENTS.md` at the project root. It must be **self-contained** — do not assume a global agents file exists. Include the universal rules below verbatim (or with project-specific tweaks where noted), plus the project-specific sections.

### Required sections

1. **Project context** — one paragraph + link to `PLAN.md`.
2. **Code Style**
   - Self-documenting code first. Clear names, small functions.
   - Comments only when the *why* is non-obvious. Never narrate what the code does.
   - No banner / decorative comments.
   - Docstrings on non-trivial / exported APIs only. Keep them short.
   - No TODO graveyards — open an issue.
   - Errors are never swallowed. Throw only for true bugs.
3. **Working with Libraries and GitHub** — For library docs, use **Context7 MCP** first (`context7_resolve-library-id` → `context7_query-docs`); fall back to upstream source in `references/` only if Context7 doesn't have the library. For every GitHub operation (user info, repo, issues, PRs, comments, review threads), use the **GitHub MCP** first; fall back to the `gh` CLI only if the MCP is unavailable. Do not trust training knowledge for library APIs and do not query the web for things either MCP can answer. Verify versions match the project manifest.
4. **`references/` convention** — read-only, gitignored, never imported, never committed. List what's currently in it and why.
5. **Git Workflow**
   - Never push directly to `main`.
   - Branch per issue: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`, `refactor/<slug>`, `test/<slug>`, `perf/<slug>`.
   - **Conventional Commits mandatory** for every commit and PR title. Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `style`. Breaking: `feat(scope)!:` with `BREAKING CHANGE:` footer.
   - One commit = one logical change that builds and passes tests. No `WIP` / `fix` / `updates`.
   - One PR per issue. **Squash-merge to `main`** so every commit on `main` is a complete tested unit (keeps `git bisect` reliable, makes reverts trivial, makes `git log main` read like a changelog). The squash commit body should include the PR's bullet-point summary so the linked PR is easy to find from `git log`. Detailed per-commit history is preserved on the PR itself on GitHub.
   - Delete branch after merge.
   - **Only merge code that is confirmed working.** A PR is opened only when the work is complete and the test suite passes. PRs are not checkpoints. If a PR turns out to be incomplete, close it or convert to draft — do not merge it "to be fixed later".
6. **Pull Request Review** — After opening every PR, run the **copilot second-opinion** flow (skill: `copilot-second-opinion`, MCP: `copilot-review`). Triage every comment, push fixes, reply, resolve threads. Repeat until Copilot is silent. Don't merge until CI is green, Copilot loop done, human approval.
7. **Quality Gates and CI**
   - Project-specific exact commands for `lint`, `format`, `typecheck`, `test`, `build`. All of `lint`, `typecheck`, `test` must pass **locally** before opening a PR. Tests ship with implementation. Deterministic preferred.
   - CI uses **manual triggers only** (`workflow_dispatch`) to avoid burning Actions minutes on every push. The agent runs the full suite locally during development, then triggers CI exactly once per PR right before requesting merge: `gh workflow run test.yml --ref <branch>`.
   - Branch protection on `main` requires the test workflow to pass on the PR's head SHA before merge is allowed. Use a repo **Ruleset** (not classic branch protection) so a `workflow_dispatch` run satisfies the required check.
8. **Parallel Work (Worktrees)** —
   - All worktrees for this project live in **one sibling directory**: `../<project-slug>-wt/<task-slug>/`. Single permission grant covers them all.
   - One agent per worktree. Max 3 concurrent.
   - Shared interfaces land in a small dedicated branch first.
   - `git worktree remove ../<project-slug>-wt/<task-slug>` immediately after PR merge.
   - When the project finishes / pauses indefinitely, `rm -rf ../<project-slug>-wt/`.
9. **Resource Safety** — Treat hanging subprocesses as a correctness bug. Bounded timeouts on tests / fuzzers / CI polling. Sweep for leaks before each batch. Graceful kill first, force only if needed.
10. **Cloud / Cost Discipline** *(only if the project uses cloud — Azure, AWS, GCP, etc.)* — Estimate cost before provisioning. Prefer cheapest tier / spot / serverless. Tag every resource with the project name. **Stop or delete** resources when work pauses or finishes. Document a one-command teardown in this file or `PLAN.md`. Never leave billing running overnight without an explicit kill-by date.
11. **Decision Biases** — Smallest correct change. Simple and testable beats clever. Explicit machine-readable artifacts over prose. Reproducibility over convenience.
12. **PLAN.md is the source of truth** — Read it before architectural changes. Don't advance past a phase boundary until exit tests pass. Update **Anticipated Risks** as new constraints surface.
13. **Operational Memory** — Two artifacts hold knowledge that AGENTS.md and PLAN.md must not absorb (because both get bloated and ignored):
    - **`NOTES.md`** — append-only running journal of solved problems, gotchas, dead-ends, surprising behavior. Catches the *"agent reintroduces a bug we already fixed"* failure mode.
      - **Read on entry, mandatory.** Before any non-trivial task, run `tail -n 100 NOTES.md` and `grep -i` it for keywords from the task description. If the task touches a specific file, also `grep` for that file path.
      - **Write on exit, mandatory.** After solving any non-obvious problem, hitting a dead-end, or discovering surprising behavior, append an entry **before closing the task**. Format:
        ```
        ## YYYY-MM-DD — <one-line problem>
        **Resolution:** <one line>. <file_path:line> · <commit-sha-or-PR-#>
        ```
      - **Compaction.** When `NOTES.md` exceeds ~500 lines, move entries older than 90 days into `NOTES-archive/YYYY-QN.md`. Live file stays scannable, archive stays greppable.
    - **`docs/adr/NNNN-title.md`** — one immutable file per non-trivial architectural decision (chose A over B because Z). Catches the *"agent reintroduces a library/pattern we deliberately rejected"* failure mode.
      - **Read on entry, mandatory.** Before contradicting any prior choice, `ls docs/adr/` and read anything related.
      - **Write on exit, mandatory.** When making a non-trivial choice between alternatives, write an ADR. Use the [MADR](https://adr.github.io/madr/) format: Status, Context, Decision, Consequences, Alternatives. ADRs are immutable once accepted; superseding decisions get a new ADR that links the old one.
      - `docs/adr/0000-record-architecture-decisions.md` is the meta-ADR establishing the practice itself; it's seeded at bootstrap.

### Project-specific sections (in addition to the above)

- **Toolchain commands** — exact `lint` / `format` / `typecheck` / `test` / `build` invocations for this stack.
- **`references/` contents** — what's in it, what each one is for.
- **Parallel-work splits for the current phase** — mirror `PLAN.md`.
- **Project quirks** — anything that contradicts or extends the universal rules (e.g. "this repo allows `unsafe` in the FFI crate only", "tests need Postgres at `localhost:5433`").

Keep the file scannable. If a section genuinely doesn't apply (e.g. no cloud), say "N/A" and move on rather than padding.

## Phase 5 — REVIEW GATE (stop here)

After both files exist:

1. Print a concise summary to the user: file paths, the phase count, the parallel splits for phase 1, the anticipated risks.
2. Tell the user explicitly: "Review `PLAN.md` and `AGENTS.md`. Reply with changes, or say 'go' to start phase 1."
3. **Stop. Do not spawn subagents. Do not start work.** Wait for the user's response.

If the user requests changes, edit the files and present the diff. Loop until they say go.

## Phase 6 — Bootstrap the Repo

Once approved:

1. `git init` if not already a repo.
2. Ensure `.gitignore` includes `references/`, build artifacts, secrets, OS junk.
3. Write `LICENSE` using the SPDX identifier chosen in Phase 3. Use the canonical text from <https://spdx.org/licenses/> (or fetch the GitHub-rendered template). The copyright line is `Copyright (c) <year> <author>` where `<author>` is the value resolved in Phase 1 step 4 (`name` from `gh api user`, falling back to `login`). Do not invent a real-name expansion of the username.
4. Write `CONTRIBUTING.md` — keep it short. Required content:
   - One-sentence pointer to `AGENTS.md` for the actual rules (commits, branching, review loop, worktrees).
   - One-sentence pointer to `PLAN.md` for the roadmap.
   - "How to propose a change": file an issue first if it's non-trivial, otherwise open a PR against an existing issue.
   - Toolchain bootstrap commands (`pnpm install`, `cargo build`, `uv sync`, etc.) so a new contributor can get to a passing test in one paste.
   - Note that AI agents are welcome and should follow `AGENTS.md` like any other contributor.
   Do not duplicate `AGENTS.md` content here.
5. Seed `NOTES.md` with a one-line header (`# Notes` and a sentence pointing readers at the AGENTS.md Operational Memory section) — empty body, ready for the first entry.
6. Seed `docs/adr/0000-record-architecture-decisions.md` — the meta-ADR establishing that this project uses ADRs. Status: Accepted. Context: short. Decision: "Use MADR-format ADRs in `docs/adr/` for non-trivial architectural decisions." Consequences: list the read-before / write-after rules from AGENTS.md.
7. First commit: `chore: initial project bootstrap` containing `PLAN.md`, `AGENTS.md`, `LICENSE`, `CONTRIBUTING.md`, `NOTES.md`, `docs/adr/0000-record-architecture-decisions.md`, `.gitignore`, `.github/workflows/test.yml`, and any minimal scaffolding (e.g. `pyproject.toml`, `Cargo.toml`, `package.json`, `Makefile`).
8. Write `.github/workflows/test.yml` — manual trigger only:
   - `on: workflow_dispatch` (no `push`, no `pull_request`).
   - Runs the project's `lint`, `typecheck`, and `test` commands. Fails the workflow on any non-zero exit.
   - Use the same toolchain the project uses locally (e.g. `actions/setup-node`, `actions-rust-lang/setup-rust-toolchain`, `astral-sh/setup-uv`).
9. Create the GitHub repo via the **GitHub MCP** (private/public per Phase 0 answer). Push `main`.
10. Configure a repo **Ruleset** on `main` that requires the `test` workflow to pass before merge. Use the GitHub MCP / API; if a Ruleset is not creatable programmatically with the user's permissions, print the exact UI steps for the user to do it once: `Settings → Rules → Rulesets → New branch ruleset → Target main → Require status checks to pass → add 'test'`.
11. Open a GitHub issue for **every** task in Phase 1's checklist. Title = task summary. Body = the checklist item plus a link to the relevant `PLAN.md` section.

## Phase 7 — Parallel Execution

For Phase 1 (and each subsequent phase):

1. Create the worktree directory: `../<project-slug>-wt/`. All worktrees go here so a single permission grant covers them all.
2. For each parallel task: `git worktree add ../<project-slug>-wt/<task-slug> -b <type>/<task-slug>`.
3. Spawn one sub-agent per worktree, **max 3 concurrent** (sequential waves if more).
4. Each sub-agent: implements the task, writes tests with the code, runs the project's `lint` / `typecheck` / `test` **locally to green**, commits in conventional-commit increments, pushes. **A PR is opened only after the work is complete and tests pass locally** — PRs are not checkpoints.
5. After the PR opens, run the **copilot second-opinion** loop (skill: `copilot-second-opinion`). Address feedback, push fixes, resolve threads, repeat until Copilot is silent.
6. **Pre-merge CI gate**: trigger the test workflow exactly once on the PR's head — `gh workflow run test.yml --ref <branch>` — and wait for it to complete green. Do not merge if it's red. Re-trigger only after pushing a fix.
7. Squash-merge (the squash commit body should include the PR description's bullet summary). Delete branch. `git worktree remove ../<project-slug>-wt/<task-slug>`.
8. Tick the box in `PLAN.md`. Roll the tick into the merging PR if the same change touches code; otherwise commit it alone with `docs(plan): tick <task>`.
9. When the phase's exit test passes, advance. Update `PLAN.md`'s **Anticipated Risks** with anything you learned.

## Phase 8 — Project Wind-Down

When the user signals the project is done (or going on indefinite pause):

1. Confirm all worktrees are removed; then `rm -rf ../<project-slug>-wt/` if the directory is empty.
2. Run the **Teardown** section from `PLAN.md`. Stop or delete any provisioned cloud resources. **Confirm with the user before any destructive cloud action.**
3. Final commit / tag if appropriate.

---

## Operating Notes

- **Required tooling**: the `copilot-second-opinion` skill + `copilot-review` MCP. Phase 7's PR review loop hard-depends on these. If they aren't installed, stop and tell the user before doing anything else.
- **Preferred tooling**: use the **GitHub MCP** for every GitHub operation (user info, repo creation, issues, PRs, comments) — fall back to the `gh` CLI only if the MCP is unavailable. Use **Context7 MCP** for live library documentation — fall back to upstream source in `references/` only if Context7 doesn't have the library. Do not query the web or rely on training knowledge for library APIs.
- Use the `todowrite` tool to track the phase you're on so the user can see progress.
- Prefer asking nothing over asking obvious questions. The user installed Keystone precisely because they don't want to re-specify this workflow every time.
- If `$ARGUMENTS` is empty, ask once: "What's the project idea?" and then proceed.
- Never push to `main`. Conventional commits everywhere. Run `copilot-second-opinion` after every PR. Cost discipline on cloud resources. These rules apply to *you*, the bootstrap agent, not just to the project being bootstrapped.
