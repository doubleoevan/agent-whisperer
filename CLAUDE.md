# Agent Whisperer

## What this is

A personal, single-user, MCP-native "literary agent" tool built around the thriller manuscript **Dark Market**. One human user (the author), one set of credentials, one set of preferences. There is no multi-tenant story for v1.

The product framing matters less than the engineering framing: **this repo is primarily a vehicle for learning this stack end-to-end on a real problem.** Every architectural choice should be evaluated against that goal — pick the option that teaches the stack correctly, not the option that shaves an hour today.

## Stack 

- **Runtime:** Node LTS (Temporal worker is Node-only — **no Bun runtime anywhere a Temporal worker touches**).
- **Package manager:** `pnpm` (workspaces). Never `npm` or `yarn` in this repo.
- **Monorepo:** Turborepo.
- **Language:** TypeScript everywhere. No plain JS in app code.
- **Workflow engine:** Temporal (local: `temporal server start-dev`; no Cloud in v1).
- **Database:** Postgres (local: Docker). ORM/schema: **Drizzle**.
- **MCP:** stdio MCP server exposing tools to the agent harness.
- **LLM client:** Vercel AI SDK, pointed at LiteLLM via `@ai-sdk/openai-compatible`.
- **Model gateway:** **LiteLLM** — provider routing, fallback, and aliasing live in LiteLLM's config. **No hardcoded model IDs in app code.** Application code asks for a LiteLLM alias (via `modelFor()`); LiteLLM decides which provider/model that resolves to.
- **Integrations / tools:** Composio.
- **Browser automation:** Playwright (for the scraper, Days 7–8).
- **Agent harness:** opencode (consuming our MCP server).
- **Secrets:** Doppler.
- **Observability:** PostHog + Better Stack.
- **Hosting (later):** Northflank.

## v1 scope vs. v2

**v1 (this repo, now):**
- Single hardcoded user. No login, no auth middleware, no session management.
- No web app. No public domain. The product surface is opencode → MCP server → workflows.
- A `userId` tenant key threads through **every table** in the schema from day one, and **every query is scoped by it.** This is non-negotiable. The goal: going multi-user later is a data/UX change, not a schema migration.

**Explicitly deferred to v2:**
- Auth (Clerk/Auth.js/whatever — not now).
- A web frontend.
- A public domain / custom hosting URL.
- Multi-user features (sharing, permissions, billing).

Do not add backwards-compat shims, feature flags, or stub auth endpoints for these. We'll add them when we add them.

## Build order

The order is deliberate. Earlier steps unblock later ones; later steps are intentionally off the critical path so the skeleton ships first.

- **Step 0** — Project docs (this file) and ignores.
- **Days 1–2 — Stack skeleton.** This is where the stack actually gets stood up. In order:
  1. Monorepo: pnpm + Turborepo, `tooling/` (shared eslint + tsconfig).
  2. Docker Postgres + Drizzle schema + first migration. `userId` on every table, all queries scoped.
  3. Doppler + `packages/config` typed env loader.
  4. LiteLLM gateway running. `packages/ai` wraps the AI SDK with `modelFor(alias)`; smoke-test two providers through one alias.
  5. Hello-world Temporal workflow + activity, running locally.
  6. **Outbox + outboxCoordinatorWorkflow.** Eternal coordinator polls `FOR UPDATE SKIP LOCKED`, starts per-run workflows idempotently (`WorkflowIdConflictPolicy: USE_EXISTING`), `continueAsNew` to bound history. The worker idempotently ensures the coordinator is running at boot (fixed workflow id + `USE_EXISTING`). **All workflow kick-offs go through the outbox** — MCP tools insert an outbox row in the same DB transaction as their state change, never `client.start()` directly.
  7. MCP server skeleton (stdio) exposing one tool that starts a workflow (via the outbox). Register in opencode with scoped permissions; call it from opencode.
  8. Confirm the opencode → LiteLLM → model loop end-to-end.
  9. ESLint rule pinning `packages/workflows/src/workflows/**` → `packages/domain` only (workflow code must stay deterministic; activities under `src/activities/**` may still import db, ai, etc.).
- **Days 3–6** — Domain work on top of the skeleton (TBD as it emerges).
- **Days 7–8 — Scraper.** Playwright-based, **off the critical path.** If the scraper slips, the rest of the system still functions.
- **Days 9+** — TBD.

## Monorepo layout

Filled in as it emerges. Expected shape:

```
agent-whisperer/
├── apps/
│   ├── mcp/              # stdio MCP server (entry for opencode)
│   └── worker/           # Temporal worker (Node-only)
├── packages/
│   ├── ai/               # AI SDK wrapper + modelFor(alias) → LiteLLM
│   ├── config/           # typed env loader (Doppler-fed)
│   ├── database/         # Drizzle schema, client, migrations
│   ├── domain/           # pure domain types/logic — workflow-safe (deterministic)
│   └── workflows/        # Temporal workflows + activities; may import only `domain`
├── tooling/
│   ├── eslint-config/
│   └── tsconfig/
├── infrastructure/       # docker-compose for Postgres, LiteLLM config, etc.
├── pnpm-workspace.yaml
├── turbo.json
└── CLAUDE.md
```

## Hard constraints

These are load-bearing. Violations are bugs.

- **TypeScript throughout.** No `.js` source files in app or package code.
- **Temporal worker is Node-only.** Do not introduce Bun anywhere a worker runs. Other packages may eventually use Bun for tooling, but not the worker.
- **`pnpm` for all package management.** Never run `npm install` or `yarn`. CI and local lockfile is `pnpm-lock.yaml`.
- **No hardcoded model IDs in app code.** Routing, fallback, and provider selection live in LiteLLM's config. App code only knows aliases.
- **`userId` is mandatory on every table and every query.** Even when there's only one user, the column exists and the `WHERE userId = ?` is present. This is the single most important multi-tenancy invariant.
- **Workflow kick-offs go through the outbox.** Never call `client.start()` from a request handler, MCP tool, or HTTP endpoint. The outbox is the boundary between "I changed state" and "a workflow will run."
- **`packages/workflows/src/workflows/**` may only import from `packages/domain` and Temporal's workflow SDK.** Enforced by ESLint (Step 9). Workflow code must be deterministic — no DB clients, no `fetch`, no `Date.now()`, no env reads. `packages/workflows/src/activities/**` is where side effects live; activities are free to import db, ai, and anything else.

## Code style

Follow the conventions in [`.claude/skills/code-style/SKILL.md`](.claude/skills/code-style/SKILL.md). That file is the source of truth for naming, control-flow braces, boolean prefixes, discriminated unions, branded types, and comment style. **Read it before writing or reviewing TypeScript here.** When this file and the skill disagree, the skill wins on style; this file wins on architecture.

## How to work while building

Explain as you build. This is a learning project — narrating why is part of the job, not optional. 
As you implement each step, give a short why alongside the what: the reasoning behind the choice, how the piece fits the stack, and the main alternative. 
Keep it proportional (a sentence or two per real decision, not an essay). 
This is in addition to normal engineering discipline — still write concise code and verify with typechecks/tests; don't trade rigor for commentary. 
At a genuine fork, surface both options and your recommendation before committing, then pause for review.

## Things I (the user) do that affect how you should work

- I move across **IntelliJ, Cursor, and Claude Code** during the day. Configs and ignore files need to handle all three. Don't generate IDE-specific artifacts that one of the others won't understand.
- Ask before installing **global tooling** (Doppler CLI, Temporal CLI, anything that needs a system-level install) or anything that needs **my credentials** (Doppler login, LiteLLM provider API keys). Local devDeps via `pnpm add -D` are fine without asking.
- Pause after each numbered phase (Step 0, then Days 1–2 sub-steps) so I can review before you push further.
