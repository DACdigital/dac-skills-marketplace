---
name: vibeguard
description: Production readiness assessment — run security, reliability, data, quality, operations, and performance checks against any codebase
---

# VIBEguard

You are executing VIBEguard, a production readiness assessment toolkit. Parse the user's arguments to determine what to do.

## Argument Parsing

The user invoked `/vibeguard` with optional arguments. Parse them as follows:

- `/vibeguard` or `/vibeguard assess` — Run a full assessment (all domains, deep mode)
- `/vibeguard assess <domain>` — Run scout + only skills from the specified domain(s). Valid domains: `security`, `reliability`, `data`, `quality`, `operations`, `performance`
- `/vibeguard assess <skill-name>` — Run scout + specific skill(s). Example: `sec-secrets`, `rel-logging`
- `/vibeguard assess --shallow` — Full assessment in shallow mode (fast triage, no deep source analysis)
- `/vibeguard assess <domain> --shallow` — Domain-specific in shallow mode
- `/vibeguard scout` — Run only the scout (codebase discovery, no assessments)
- `/vibeguard agent-assess` — Annotate existing findings with AI agent fix complexity ratings (1-3). Requires reports to already exist.
- `/vibeguard guide` — Generate a stack-specific `CLAUDE.md` coding guideline from skills + stack best practices. Auto-detects stack.
- `/vibeguard guide <stack>` — Same, but with explicit stack (e.g., `python-django`, `elixir-phoenix`, `node`)
- `/vibeguard help` — Show usage instructions (print the Help section below and stop)

Multiple domains or skills can be specified separated by spaces:
- `/vibeguard assess security reliability`
- `/vibeguard assess sec-secrets sec-dependencies sec-crypto`

## Help

When the user runs `/vibeguard help`, print this and stop:

```
VIBEguard — Production readiness assessment

Usage:
  /vibeguard                              Full assessment (all domains, deep mode)
  /vibeguard assess                       Same as above
  /vibeguard assess security              Assess one domain
  /vibeguard assess security reliability  Assess multiple domains
  /vibeguard assess sec-secrets           Assess specific skill(s)
  /vibeguard assess --shallow             Full assessment, shallow mode (fast)
  /vibeguard assess security --shallow    Domain-specific, shallow mode
  /vibeguard scout                        Scout only (codebase discovery, no assessments)
  /vibeguard agent-assess                 Annotate findings with AI agent fix complexity (1-3)
  /vibeguard guide                        Generate CLAUDE.md coding guideline (auto-detect stack)
  /vibeguard guide python-django          Generate CLAUDE.md for specific stack
  /vibeguard help                         Show this help

Domains: security, reliability, data, quality, operations, performance

Skills per domain:
  security:    sec-secrets, sec-authentication, sec-authorization, sec-input-validation,
               sec-dependencies, sec-crypto, sec-headers, sec-data-exposure,
               sec-api-security, sec-supply-chain
  reliability: rel-error-handling, rel-config-hygiene, rel-health-checks, rel-resilience,
               rel-logging, rel-concurrency, rel-dependency-health, rel-horizontal-scaling,
               rel-event-reliability, rel-transaction-boundaries
  data:        data-isolation, data-migrations, data-integrity, data-backup,
               data-query-safety, data-privacy
  quality:     qual-test-existence, qual-test-coverage, qual-test-types, qual-linting,
               qual-code-patterns, qual-documentation, qual-type-safety
  operations:  ops-ci-pipeline, ops-cd-pipeline, ops-containers, ops-orchestration,
               ops-monitoring, ops-alerting, ops-iac, ops-environments
  performance: perf-backend, perf-frontend, perf-database, perf-caching, perf-async,
               perf-sync-blockers

Output: vibeguard-reports/ in your project directory
```

---

## Execution

### Agent-Assess (standalone tool — only if `/vibeguard agent-assess`)

If the user ran `/vibeguard agent-assess`, skip the entire assessment pipeline (Steps 0-6) and run the agent complexity annotator instead:

1. Verify that skill reports exist at `vibeguard-reports/skill-reports/`. If the directory is empty or missing, tell the user to run `/vibeguard` first.
2. Read the tool definition from: `tools/agent-complexity.md`
3. Execute it as a subagent. It will:
   - Read all existing skill reports
   - Load the scout report and stack best-practices file (if any)
   - Add `> Agent Complexity: [1|2|3]` to each finding in each skill report
   - Append an Agent Remediation Summary to `vibeguard-reports/production-readiness.md`
4. Tell the user what was annotated and where to find the summary.

**Stop here.** Do not continue to Step 0 or any other step.

---

### Guide (standalone tool — only if `/vibeguard guide`)

If the user ran `/vibeguard guide` or `/vibeguard guide <stack>`, skip the entire assessment pipeline and generate a coding guideline instead:

1. Read the tool definition from: `tools/guide-generator.md`
2. Execute it as a subagent with:
   - The current working directory as the target project
   - The stack argument if provided (e.g., `python-django`), otherwise auto-detect
   - Access to all skill definitions in `skills/`
   - Access to stack best-practices files in `references/stacks/`
3. It will write `CLAUDE.md` to the project root (preserving any existing content).
4. Tell the user where the file was written and which stack was detected/used.

**Stop here.** Do not continue to Step 0 or any other step.

---

### Step 0 — Setup

Before running any assessment:

1. Create the output directories in the current working directory (the project being assessed):
   ```
   mkdir -p vibeguard-reports/skill-reports
   ```

2. Check if `vibeguard-reports` is in the project's `.gitignore`. If not, append it:
   ```
   echo 'vibeguard-reports/' >> .gitignore
   ```
   If no `.gitignore` exists, create one with just that line.

3. **Auto-approve check.** VIBEguard runs many parallel subagents that need file reads and git commands. Without pre-approved permissions, the user gets prompted dozens of times. Check if the project already has VIBEguard permissions configured:

   Read `.claude/settings.json` (if it exists). Look for the `permissions.allow` array. If it already contains entries covering `Bash(git log:*)`, `Bash(find:*)`, and similar read-only patterns, skip this step — permissions are configured.

   If permissions are NOT configured (file missing, no `permissions` key, or the allow list doesn't cover VIBEguard's needs), show the user:

   > **VIBEguard auto-approve mode**
   >
   > VIBEguard spawns many parallel assessments that read files and run git commands. Without auto-approve, you'll be prompted for each tool call across all subagents — this gets noisy.
   >
   > I can add read-only permissions to `.claude/settings.json` for this project. This covers: git history analysis, file discovery, and report writing. No destructive operations are included.
   >
   > Enable auto-approve mode? (y/n)

   If the user agrees, write or merge the following into `.claude/settings.json`:

   ```json
   {
     "permissions": {
       "allow": [
         "Bash(git log:*)",
         "Bash(git diff:*)",
         "Bash(git blame:*)",
         "Bash(git show:*)",
         "Bash(git rev-list:*)",
         "Bash(find:*)",
         "Bash(wc:*)",
         "Bash(ls:*)",
         "Bash(mkdir -p vibeguard-reports:*)",
         "Bash(cat:*)",
         "Bash(head:*)",
         "Bash(tail:*)"
       ]
     }
   }
   ```

   If `.claude/settings.json` already exists with other permissions, merge the VIBEguard entries into the existing `allow` array — do not overwrite existing permissions.

   If the user declines, proceed normally. They will be prompted for tool approvals during the run.

### Step 1 — Scout (always runs first)

Check if `vibeguard-reports/scout-report.md` already exists. If it does, ask the user:

> A scout report already exists. Reuse it or re-run the scout?

- If **reuse**: skip to Step 2 (or stop here if the user ran `/vibeguard scout`)
- If **re-run**: execute the scout as normal (below)

Read the scout skill definition from this skill's directory: `scout/scout.md`

Execute it as a subagent. The scout will:
- Analyze the current working directory as the target codebase
- Write its report to `vibeguard-reports/scout-report.md`
- Determine which assessment skills are relevant

**Wait for the scout to complete before proceeding.**

If the user ran `/vibeguard scout`, stop here. Report the scout results and skip Steps 2–4.

### Step 2 — Determine Skills to Run

Read `vibeguard-reports/scout-report.md`, specifically the **Skill Relevance Determination** section.

Apply the user's filter:
- **Full assessment**: Run all skills activated by the scout
- **Domain filter**: Run only skills from the specified domain(s) that were activated by the scout
- **Skill filter**: Run only the specified skill(s), regardless of scout activation (the user explicitly asked for them)

Check mode:
- If `--shallow` was specified, pass `Mode: shallow` to each skill
- Otherwise, pass `Mode: deep` (default)

Use the **Skill Inventory** below to map skill names to file paths.

### Step 3 — Run Assessment Skills (parallel)

For each skill to run:
1. Read the skill definition from this skill's directory (e.g., `skills/security/sec-secrets.md`)
2. Check if a stack best-practices file exists at `references/stacks/` for the detected technology (from the scout report). If it does, include it in the subagent's context. When making recommendations, the skill should prefer the specific library/pattern/tool named in the stack file over generic alternatives.
3. Launch it as a subagent with access to:
   - The scout report at `vibeguard-reports/scout-report.md`
   - The stack best-practices file (if one exists for the detected stack)
   - The target codebase (current working directory)
   - The mode (deep or shallow)
4. Each skill writes its report to `vibeguard-reports/skill-reports/[skill-name].md`

**Maximize parallelism.** Skills have zero dependencies on each other. Launch as many as possible concurrently.

### Step 4 — Synthesize (after all skills complete)

Read the synthesizer definition from: `synthesizer/synthesizer.md`

Execute it as a subagent. It will:
- Read all skill reports from `vibeguard-reports/skill-reports/`
- Read the scout report from `vibeguard-reports/scout-report.md`
- Write the final report to `vibeguard-reports/production-readiness.md`

### Step 5 — Report

Tell the user the assessment is complete and where to find the report:
- Full report: `vibeguard-reports/production-readiness.md`
- Individual skill reports: `vibeguard-reports/skill-reports/`
- Scout report: `vibeguard-reports/scout-report.md`

Give a brief summary of the top-level findings (go/no-go, critical count, high count) so they don't have to open the file to get the headline.

### Step 6 — Permission Friction Report

If auto-approve mode was NOT enabled in Step 0 (user declined or was not asked), and tool calls were denied or required manual approval during the run, write a friction report to `vibeguard-reports/permission-friction.md` with:

1. **What was blocked or prompted** — list each tool/command pattern that required user approval (e.g., `Bash(git log ...)`, `Read(src/...)`, `Bash(find ...)`)
2. **Which skill needed it** — map each permission to the skill/phase that triggered it
3. **Suggested settings.json** — produce a ready-to-paste JSON block that would eliminate all the friction for future runs:

```markdown
## Permission Friction Report

During this VIBEguard run, the following tool calls required manual approval:

| Tool Pattern | Skill / Phase | Purpose |
|---|---|---|
| `Bash(git log:*)` | scout, multiple skills | Git history analysis |
| ... | ... | ... |

### Suggested `.claude/settings.json`

To eliminate these prompts in future runs, add the following to your project's `.claude/settings.json`:

\```json
{
  "permissions": {
    "allow": [
      ... (list all patterns that were prompted)
    ]
  }
}
\```

This covers only read-only operations used by VIBEguard. No destructive commands are included.
```

Tell the user about this file at the end of Step 5's summary:

> A permission friction report was saved to `vibeguard-reports/permission-friction.md` with a ready-to-paste settings.json to eliminate prompts on future runs.

---

## Skill Inventory

### Discovery (Phase 1)
| Skill | File | Purpose |
|-------|------|---------|
| scout | `scout/scout.md` | Map codebase: stack, topology, infra, data, deps, security, tests, docs, metrics |

### Security (10 skills)
| Skill | File | Purpose |
|-------|------|---------|
| sec-secrets | `skills/security/sec-secrets.md` | Hardcoded credentials, API keys, tokens, committed .env files |
| sec-authentication | `skills/security/sec-authentication.md` | Auth implementation: sessions, tokens, passwords, MFA, SSO |
| sec-authorization | `skills/security/sec-authorization.md` | Permission enforcement: RBAC/ABAC, route protection, privilege escalation |
| sec-input-validation | `skills/security/sec-input-validation.md` | Injection surfaces: SQLi, XSS, command injection, path traversal, SSRF |
| sec-dependencies | `skills/security/sec-dependencies.md` | CVEs, outdated packages, unmaintained deps, license compliance |
| sec-crypto | `skills/security/sec-crypto.md` | TLS, encryption at rest, key management, hashing, secure random |
| sec-headers | `skills/security/sec-headers.md` | HTTP security headers, CORS, cookie flags |
| sec-data-exposure | `skills/security/sec-data-exposure.md` | Sensitive data in logs, stack trace leaks, debug endpoints, PII in URLs |
| sec-api-security | `skills/security/sec-api-security.md` | Rate limiting, CSRF, request validation, idempotency, auth coverage |
| sec-supply-chain | `skills/security/sec-supply-chain.md` | Lock files, pinned versions, integrity checks, CI security |

### Reliability (10 skills)
| Skill | File | Purpose |
|-------|------|---------|
| rel-error-handling | `skills/reliability/rel-error-handling.md` | Uncaught exceptions, error boundaries, graceful degradation |
| rel-config-hygiene | `skills/reliability/rel-config-hygiene.md` | Hardcoded values, env var management, config validation |
| rel-health-checks | `skills/reliability/rel-health-checks.md` | Liveness/readiness probes, dependency health, graceful shutdown |
| rel-resilience | `skills/reliability/rel-resilience.md` | Retries, timeouts, circuit breakers, fallbacks |
| rel-logging | `skills/reliability/rel-logging.md` | Structured logging, log levels, correlation IDs, no PII in logs |
| rel-concurrency | `skills/reliability/rel-concurrency.md` | Race conditions, deadlocks, pool sizing, thread safety, async correctness |
| rel-dependency-health | `skills/reliability/rel-dependency-health.md` | External service failure handling, pool exhaustion, DNS, socket config |
| rel-horizontal-scaling | `skills/reliability/rel-horizontal-scaling.md` | In-memory state, real-time sync, filesystem, scheduled jobs, startup races across replicas |
| rel-event-reliability | `skills/reliability/rel-event-reliability.md` | Transactional outbox/inbox, event loss vectors, duplicate processing, delivery guarantees |
| rel-transaction-boundaries | `skills/reliability/rel-transaction-boundaries.md` | External HTTP/API calls inside DB transactions, outbox for service calls, webhook dedup |

### Data (6 skills)
| Skill | File | Purpose |
|-------|------|---------|
| data-isolation | `skills/data/data-isolation.md` | Multi-tenant scoping, cross-tenant leak vectors |
| data-migrations | `skills/data/data-migrations.md` | Migration system, reversibility, schema versioning |
| data-integrity | `skills/data/data-integrity.md` | Foreign keys, constraints, transactions, referential integrity |
| data-backup | `skills/data/data-backup.md` | Backup config, automation, retention, restore procedures |
| data-query-safety | `skills/data/data-query-safety.md` | Parameterized queries, ORM patterns, connection pooling |
| data-privacy | `skills/data/data-privacy.md` | PII handling, retention policies, right-to-erasure, data minimization |

### Quality (7 skills)
| Skill | File | Purpose |
|-------|------|---------|
| qual-test-existence | `skills/quality/qual-test-existence.md` | Test files present, frameworks, test-to-source ratio |
| qual-test-coverage | `skills/quality/qual-test-coverage.md` | Coverage tooling, thresholds, critical path coverage |
| qual-test-types | `skills/quality/qual-test-types.md` | Unit/integration/e2e/contract test balance |
| qual-linting | `skills/quality/qual-linting.md` | Linter, formatter, type checker config, CI enforcement |
| qual-code-patterns | `skills/quality/qual-code-patterns.md` | Dead code, TODOs, duplication, complexity, dependency cycles |
| qual-documentation | `skills/quality/qual-documentation.md` | README, API docs, architecture docs, runbooks, onboarding |
| qual-type-safety | `skills/quality/qual-type-safety.md` | Type system usage, `any` types, untyped boundaries |

### Operations (8 skills)
| Skill | File | Purpose |
|-------|------|---------|
| ops-ci-pipeline | `skills/operations/ops-ci-pipeline.md` | CI config, stages, branch protection, build artifacts |
| ops-cd-pipeline | `skills/operations/ops-cd-pipeline.md` | Deployment automation, rollback, promotion strategy |
| ops-containers | `skills/operations/ops-containers.md` | Dockerfile best practices, image security, .dockerignore |
| ops-orchestration | `skills/operations/ops-orchestration.md` | K8s/Compose/ECS config: resource limits, replicas, disruption budgets |
| ops-monitoring | `skills/operations/ops-monitoring.md` | APM, error tracking, metrics, dashboards |
| ops-alerting | `skills/operations/ops-alerting.md` | Alert rules, severity, routing, escalation, runbook links |
| ops-iac | `skills/operations/ops-iac.md` | Terraform/CloudFormation/Pulumi: state, modules, env separation |
| ops-environments | `skills/operations/ops-environments.md` | Environment parity, config separation, data isolation |

### Performance (6 skills)
| Skill | File | Purpose |
|-------|------|---------|
| perf-backend | `skills/performance/perf-backend.md` | N+1 queries, missing pagination, sync bottlenecks, caching |
| perf-frontend | `skills/performance/perf-frontend.md` | Bundle size, code splitting, lazy loading, Web Vitals |
| perf-database | `skills/performance/perf-database.md` | Missing indexes, slow query patterns, connection limits |
| perf-caching | `skills/performance/perf-caching.md` | Cache layer, invalidation strategy, TTLs, stampede protection |
| perf-async | `skills/performance/perf-async.md` | Background jobs, queue config, worker scaling, long requests |
| perf-sync-blockers | `skills/performance/perf-sync-blockers.md` | Synchronous long-running ops in HTTP handlers: email, file processing, external APIs |

### Synthesis (Phase 3)
| Skill | File | Purpose |
|-------|------|---------|
| synthesizer | `synthesizer/synthesizer.md` | Aggregate all reports into final production-readiness assessment |

---

## Severity Definitions

All skills use this severity scale:

| Severity | Definition | Action |
|----------|-----------|--------|
| **CRITICAL** | Exploitable in production, data loss/breach risk, system failure imminent | Must fix before any production traffic |
| **HIGH** | Significant risk, will cause incidents under load or attack | Must fix before launch |
| **MEDIUM** | Operational risk, will cause pain but not outages | Should fix before launch |
| **LOW** | Best practice gap, tech debt, maintainability concern | Fix post-launch |

---

## Skill Output Contract

Every skill report must follow the template defined in `references/skill-output-contract.md`. Read that file for the exact structure, field rules, and examples.

Key requirements:
- **Result first**: `**Result**: PASS | PASS WITH WARNINGS | FAIL` at the top of Summary
- **Areas Assessed table**: one row per numbered section in "What to Assess", with PASS/WARN/FAIL/SKIPPED
- **Finding IDs**: `[skill-id]-[N]` format (e.g., `sec-secrets-1`)
- **Evidence**: always a code block, even for missing files/config
- **Recommendation**: always a code block showing the target state — agents must be able to apply it directly
- **Findings ordered by severity**: CRITICAL first, LOW last
