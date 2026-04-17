---
name: guide-generator
description: Generate a stack-specific CLAUDE.md coding guideline from VIBEguard skills and stack best practices — preventive rules organized by developer activity
---

# Tool: Guide Generator

## Purpose
Generate a `CLAUDE.md` file for a project — a focused, stack-specific coding guideline derived from VIBEguard's 47 assessment skills and the team's stack best-practices file. Instead of assessing after the fact, this prevents issues from being written in the first place.

The output is designed for both humans (readable coding standards) and AI coding agents (actionable `CLAUDE.md` instructions).

## Input
- Stack detection: either auto-discovered from the current project (run a lightweight scout), or specified via argument (e.g., `python-django`, `elixir-phoenix`, `node`)
- Stack best-practices file at `references/stacks/{stack}.md` (if it exists) — these are the team's opinionated choices
- All skill definitions in `skills/` — the source of preventive rules

## Process

### Step 1 — Detect Stack

**Auto-discovery** (default): Scan the current directory for stack signals — the same detection the scout does, but lightweight. Look for:
- Package manifests (package.json, mix.exs, pyproject.toml, go.mod, Gemfile, pom.xml, composer.json, *.csproj)
- Framework config files (next.config.*, nuxt.config.*, django settings, Phoenix config)
- Runtime version files (.node-version, .python-version, .tool-versions, .elixir-version)

**Explicit** (if user provided a stack name): Use that directly. Map to the matching `references/stacks/` file.

If multiple stacks detected (polyglot/monorepo), generate sections for each.

### Step 2 — Load Stack Best Practices

Check if `references/stacks/{detected-stack}.md` exists. If it does, load it — the Libraries table, Patterns, and Anti-Patterns sections become primary opinion sources.

If no stack file exists, proceed with generic guidance derived from skills only. Note in the output: "No team stack guide found — guidelines are generic. Add `references/stacks/{stack}.md` for opinionated recommendations."

### Step 3 — Extract Preventive Rules from Skills

Read all 47 skill definitions. For each skill, transform its assessment criteria into preventive rules:

**Transformation logic:**
- Skill says "check for X" → Guideline says "always do X" or "never do Y"
- Severity guide calibrates priority — CRITICAL prevention rules come first within each section
- Stack-specific "How to Assess" sections provide the concrete implementation detail
- If a stack file has an opinion (specific library, pattern), use that instead of generic advice

**Example transformations:**
- `sec-secrets` checks for hardcoded credentials → "Never hardcode credentials. Use environment variables. Maintain `.env.example` with all required vars."
- `perf-sync-blockers` checks for blocking ops in handlers → "Never send emails, generate PDFs, or process images in HTTP handlers. Use [Oban/Celery/BullMQ] for background processing."
- `rel-transaction-boundaries` checks for HTTP calls in transactions → "Never make external API calls inside a database transaction. Use the outbox pattern or call after commit."
- `data-query-safety` checks for parameterization → "Always use parameterized queries. Never interpolate user input into SQL strings."

### Step 4 — Organize by Developer Activity

Do NOT organize by VIBEguard domain (security, reliability, etc.) — that's an assessment taxonomy, not how developers think. Instead, organize by what a developer is actually doing when they'd need the rule.

**Sections** (include only those relevant to the detected stack):

1. **Project Setup** — env management, config, dependencies, tooling
2. **API Endpoints** — request handling, validation, pagination, response format, auth
3. **Database** — queries, migrations, transactions, indexes, connection pool
4. **External Services** — HTTP clients, timeouts, retries, transaction boundaries, outbox
5. **Background Jobs** — what to offload, queue config, idempotency, error handling
6. **Authentication & Authorization** — password handling, sessions, tokens, permission enforcement
7. **Error Handling & Logging** — structured logging, error boundaries, correlation IDs, sensitive data
8. **Testing** — what to test, coverage expectations, test types
9. **Deployment & Operations** — containers, CI/CD, health checks, environment config
10. **Security Basics** — headers, CORS, input validation, secrets, dependencies

Each section should have 5-15 rules — the most impactful ones. Not exhaustive. A developer should be able to read the whole document in 10 minutes.

### Step 5 — Write CLAUDE.md

Write the output to `CLAUDE.md` in the project root (or the path the user specifies).

**Format rules:**
- Rules are imperative: "Always X", "Never Y", "Use X for Y"
- Each rule is one line or a short bullet — not a paragraph
- Stack-specific: name the actual library/function, not generic concepts
- If from a stack file, it IS the team standard — state it as fact
- If no stack file, frame as best practice — "Recommended: X" or "Prefer X over Y"
- Include brief "why" only when not obvious — one clause, not a sentence
- Group related rules under the activity section, not by domain

**Template:**

```markdown
# CLAUDE.md

Project: [name]
Stack: [detected stack]
Generated by: VIBEguard guide generator

---

## Project Setup
- [rules about env, config, dependencies, tooling]

## API Endpoints
- [rules about request handling, validation, pagination]

## Database
- [rules about queries, migrations, transactions]

## External Services
- [rules about HTTP clients, timeouts, outbox]

## Background Jobs
- [rules about async processing, queues]

## Authentication & Authorization
- [rules about auth implementation]

## Error Handling & Logging
- [rules about error handling, logging]

## Testing
- [rules about test expectations]

## Deployment & Operations
- [rules about containers, CI/CD, health checks]

## Security Basics
- [rules about headers, input validation, secrets]

---

*Generated from VIBEguard assessment skills and team stack guidelines.*
*Stack guide applied: [yes — {filename} / no — generic guidelines]*
```

## Critical Rules

1. **Stack-specific over generic.** "Use `Ecto.Multi` for multi-step writes" beats "use transactions." If the stack file names a library, use that name.
2. **Activity-organized, not domain-organized.** A developer writing an API endpoint needs auth + validation + pagination + error handling rules together, not scattered across 6 sections.
3. **Focused.** 50-80 rules total. If a section has more than 15 rules, prioritize by severity (CRITICAL/HIGH prevention first) and cut the rest.
4. **Actionable.** Every rule should be something a developer (or AI agent) can follow without looking anything else up. "Always set timeouts" is vague. "Set `timeout: {connect: 5_000, read: 30_000}` on all `Finch` requests" is actionable.
5. **No assessment language.** Don't say "CRITICAL finding if missing." Say "Always do X." This is a guideline, not a checklist.
6. **Stack file opinions are law.** If the stack file says "Use httpx, avoid requests" — the guideline says "Use httpx for all HTTP calls" with no hedging.
7. **Preserve existing CLAUDE.md content.** If a `CLAUDE.md` already exists, read it first. Add VIBEguard guidelines as a new section or merge — never overwrite existing project instructions.

## Output
Write to: `CLAUDE.md` in the project root (or user-specified path).
