# VIBEguard

**Production readiness assessment for vibe-coded projects.**

You shipped fast. AI wrote most of it. Now you need to know if it's actually ready for production.

VIBEguard runs 47 specialized assessments against your codebase — security, reliability, data integrity, code quality, operations, and performance — and delivers a prioritized, actionable report. No code to install. No config to write. Just structured prompts executed as Claude Code subagents.

## Quick Start

### Install globally (recommended)

Clone the repo into your Claude Code skills directory:

```
git clone git@github.com:DACdigital/vibeguard.git ~/.claude/skills/vibeguard
```

Then open Claude Code in any project and run:

```
/vibeguard
```

That's it. VIBEguard scouts your codebase, runs relevant assessments in parallel, and writes a report to `vibeguard-reports/production-readiness.md` in your project directory. The `vibeguard-reports/` folder is automatically added to your `.gitignore`.

### Alternative: project-local

Copy VIBEguard into your project and tell Claude Code to read the orchestration file:

```
Read vibeguard/SKILL.md and execute a full production readiness assessment on this codebase.
```

## Usage

```
/vibeguard                              Full assessment (deep mode, all domains)
/vibeguard assess                       Same as above
/vibeguard assess security              Single domain
/vibeguard assess security reliability  Multiple domains
/vibeguard assess sec-secrets           Specific skill(s)
/vibeguard assess --shallow             Full assessment, shallow mode (fast)
/vibeguard assess security --shallow    Domain + shallow mode
/vibeguard scout                        Scout only (map codebase, no assessments)
/vibeguard guide                        Generate CLAUDE.md coding guideline (auto-detect stack)
/vibeguard guide python-django          Generate CLAUDE.md for specific stack
/vibeguard agent-assess                 Annotate findings with AI agent fix complexity (1-3)
/vibeguard help                         Show available commands and skills
```

### Modes

**Deep** (default) — reads source files, traces data flow, analyzes git history, computes metrics. Thorough. Takes longer.

**Shallow** (`--shallow`) — checks file existence, config patterns, dependency manifests. Quick triage. Skips source-level analysis.

## What You Get

A markdown report with:

- **Go/no-go recommendation** — READY, READY WITH CONDITIONS, or NOT READY
- **Risk heatmap** — severity counts across all six domains
- **Findings** — classified as CRITICAL, HIGH, MEDIUM, or LOW with file locations, evidence, and specific fix recommendations
- **Prioritized action plan** — sequenced by severity, effort, and dependencies
- **Effort estimates** — rough person-day sizing per phase

Reports are markdown — designed to be read by humans and fed directly to coding agents for automated remediation.

### Output structure

```
vibeguard-reports/                      # in your project directory, gitignored
├── scout-report.md                     # codebase discovery results
├── skill-reports/                      # individual assessment reports
│   ├── sec-secrets.md
│   ├── sec-authentication.md
│   └── ...
└── production-readiness.md             # final synthesized report
```

## How It Works

Three phases, executed as Claude Code subagents:

```
Scout (1 skill) ──> Assessors (up to 47, parallel) ──> Synthesizer (1 skill)
```

**Scout** maps the codebase: languages, frameworks, infrastructure, data layer, external dependencies, security surface, test landscape. Determines which assessment skills are relevant. You don't run container checks if there's no Dockerfile.

**Assessors** run in parallel. Each skill is a focused expert that reads the scout report, analyzes the relevant code, and writes a finding report. A Python/Django project triggers different skills than a Go microservice.

**Synthesizer** aggregates all findings into one report: deduplicates, prioritizes, sequences the action plan, and makes the go/no-go call.

## Assessment Domains

| Domain | Skills | Covers |
|--------|--------|--------|
| Security | 10 | Secrets, auth, authorization, input validation, dependencies, crypto, headers, data exposure, API security, supply chain |
| Reliability | 10 | Error handling, config hygiene, health checks, resilience, logging, concurrency, dependency health, horizontal scaling, event reliability, transaction boundaries |
| Data | 6 | Tenant isolation, migrations, integrity, backup, query safety, privacy |
| Quality | 7 | Test existence, coverage, test types, linting, code patterns, documentation, type safety |
| Operations | 8 | CI, CD, containers, orchestration, monitoring, alerting, IaC, environments |
| Performance | 6 | Backend, frontend, database, caching, async processing, sync blockers |

Full skill inventory with descriptions: [SKILL.md](SKILL.md)

## Severity Scale

| Level | Meaning |
|-------|---------|
| CRITICAL | Exploitable in production. Data loss or breach risk. Fix before any traffic. |
| HIGH | Significant risk under load or attack. Fix before launch. |
| MEDIUM | Operational pain, not outages. Should fix before launch. |
| LOW | Best practice gap. Tech debt. Fix post-launch. |

## Project Structure

```
~/.claude/skills/vibeguard/             # or wherever you cloned it
├── SKILL.md                            # Entry point, execution contract, skill inventory
├── scout/scout.md                      # Phase 1: codebase discovery
├── skills/                             # Phase 2: 47 assessment skills
│   ├── security/    (10)
│   ├── reliability/ (10)
│   ├── data/        (6)
│   ├── quality/     (7)
│   ├── operations/  (8)
│   └── performance/ (6)
└── synthesizer/synthesizer.md          # Phase 3: report synthesis
```

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- A codebase to assess

No dependencies. No installation beyond cloning. No configuration.

## Stack Agnostic, Stack Aware

VIBEguard works on any technology stack. The scout detects your languages, frameworks, and infrastructure. Every assessment skill adapts its checks based on what's actually in the project. Node.js, Python, Go, Ruby, Java, Rust, .NET — if Claude Code can read it, VIBEguard can assess it.

---

Built by [dac.digital](https://dac.digital)
