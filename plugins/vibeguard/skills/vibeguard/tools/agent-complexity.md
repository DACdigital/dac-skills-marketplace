---
name: agent-complexity
description: Annotate VIBEguard findings with AI agent fix complexity ratings (1-3) — how easily can a coding agent fix each finding autonomously?
---

# Tool: Agent Complexity Annotator

## Purpose
Read all existing VIBEguard skill reports and add an `Agent Complexity` rating to each finding. This tells teams which findings to hand to an AI coding agent immediately (level 1), which need a brief human decision first (level 2), and which are human-led projects (level 3).

This tool only runs when explicitly invoked. It does not modify skill definitions, the scout report, or the synthesizer output. It only enriches existing finding entries in skill reports.

## Input
- Skill reports at: `vibeguard-reports/skill-reports/*.md`
- Scout report at: `vibeguard-reports/scout-report.md` (for stack detection)
- Stack best-practices file at: `references/stacks/` (if one exists for the detected stack)

## Process

### Step 1 — Detect Stack and Load Opinions

Read the scout report's Stack section to identify the technology. Check if a stack best-practices file exists at `references/stacks/` for the detected stack. If it does, load it — these opinions can accelerate findings from level 2 to level 1.

### Step 2 — Process Each Skill Report

For each `.md` file in `vibeguard-reports/skill-reports/`:

1. Parse each finding (identified by `### [finding-id]: [title]`)
2. Read the finding's severity, area, evidence, and recommendation
3. Assess the agent complexity level using the criteria below
4. Check if the stack file has an opinion that accelerates the level
5. Add the `Agent Complexity` line to the finding's metadata block

### Step 3 — Add to Each Finding

Insert a new line in the finding's metadata block, after the `> Effort:` line:

```markdown
> Agent Complexity: [1|2|3] ([explanation])
```

Examples:

```markdown
> Agent Complexity: 1 (single-file fix, pattern-based — add timeout parameter)
```

```markdown
> Agent Complexity: 1 (base: 2, accelerated by stack guide — python-django.md recommends argon2-cffi)
```

```markdown
> Agent Complexity: 2 (multiple valid approaches — needs team input on caching strategy)
```

```markdown
> Agent Complexity: 3 (architectural change — requires outbox pattern implementation across service boundary)
```

### Step 4 — Write Summary

After annotating all reports, append an agent complexity summary to `vibeguard-reports/production-readiness.md` (the synthesizer output), in a new section before the Methodology section:

```markdown
## Agent Remediation Summary

| Complexity | Count | Description |
|-----------|-------|-------------|
| 1 — Autonomous | X | Agent can fix without human input |
| 2 — Guided | Y | Agent needs a decision or context from human |
| 3 — Human-led | Z | Human drives, agent assists |

### Level 1 Findings (hand to agent now)
- `finding-id`: title — [one-line fix description]
- ...

### Level 2 Findings (decide, then hand to agent)
- `finding-id`: title — [what decision is needed]
- ...

### Level 3 Findings (human project)
- `finding-id`: title — [why this needs human leadership]
- ...
```

## Complexity Criteria

### Level 1 — Autonomous Fix
Agent can fix with no human input. ALL of these must be true:
- **Localized**: single file or small set of related files
- **Pattern-based**: add a parameter, wrap in a function, change a config value, create a file with known content
- **Deterministic**: one correct answer, not a design choice
- **Verifiable**: tests, lint, or type-check can confirm the fix
- **No external setup**: no new service, no infrastructure change, no account creation

Examples: add `timeout=30` to HTTP client, add `HttpOnly` to cookie flag, add missing index in migration, parameterize a raw SQL query, add `.env` to `.gitignore`, create `.env.example`, enable HSTS header, add `NOT NULL` constraint

### Level 2 — Guided Fix
Agent can implement but needs a decision or context. ANY of these means level 2:
- **Multiple valid approaches**: which library? which pattern? which config values?
- **Business context needed**: which fields are PII? what's the SLA? which endpoints are public?
- **Judgment-dependent config**: pool size, TTL, retry count, rate limit thresholds — depends on load profile
- **Multi-file changes**: changes span modules and need coordination
- **Partial verifiability**: agent can implement but human must verify correctness

Examples: choose caching strategy, set appropriate timeout values, decide CORS allowlist, configure rate limit thresholds, select password hashing library, decide which data needs encryption at rest

### Level 3 — Human-Led Implementation
Agent can scaffold or advise but human drives. ANY of these means level 3:
- **Architectural change**: new system component, new pattern across the codebase
- **External provisioning**: set up monitoring service, create CI/CD pipeline, configure cloud resources
- **Business/legal decisions**: data retention policy, consent model, compliance requirements
- **Multi-step migration**: rollback planning, data migration, coordination across teams
- **Cross-system coordination**: changes to multiple services, infrastructure, or external systems

Examples: implement outbox pattern, add full auth system, set up CD pipeline, design multi-tenant isolation, create incident response runbooks, implement distributed tracing

## Stack File Acceleration

When a stack best-practices file exists and has an opinion relevant to a finding, the complexity can be reduced:

| Base Level | Stack File Covers This? | Effective Level | Annotation |
|-----------|------------------------|-----------------|------------|
| 1 | — | **1** | (no change) |
| 2 | Yes — resolves the choice | **1** | `base: 2, accelerated by stack guide — {file} recommends {tool}` |
| 2 | No | **2** | `no stack guide opinion for this decision` |
| 3 | Yes — resolves tooling choice, but architecture still needed | **2** | `base: 3, partially accelerated by stack guide — {file} recommends {pattern}` |
| 3 | No | **3** | (no change) |

The stack file can only accelerate, never increase complexity. If the stack file is ambiguous or doesn't clearly cover the decision, don't accelerate.

## Critical Rules

1. **Read-only except for the annotation.** Do not change finding text, severity, evidence, recommendations, or any other part of the report. Only add the `> Agent Complexity:` line.
2. **Every finding gets a rating.** No finding should be left without an agent complexity annotation.
3. **Explain the rating.** The parenthetical explanation is mandatory — it's how humans and agents understand why.
4. **Be conservative on level 1.** If you're unsure whether an agent can fix it autonomously, rate it level 2. A failed autonomous fix wastes more time than asking first.
5. **Check the recommendation block.** If the recommendation is a clear, complete code block that an agent can apply directly, that's a strong signal for level 1. If the recommendation is vague or involves choices, that's level 2+.

## Output
Annotated reports written in-place to: `vibeguard-reports/skill-reports/*.md`
Summary appended to: `vibeguard-reports/production-readiness.md`
