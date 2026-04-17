---
name: synthesizer
description: Aggregate all skill reports into a final production-readiness assessment with go/no-go recommendation
---

# Skill: Synthesizer

## Purpose
Aggregate all skill reports into a single, actionable production-readiness assessment. This is the final output — the document a team reads to understand where they stand and what to do next.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- All skill reports in: `vibeguard-reports/skill-reports/*.md`

## Process

You are a senior engineering consultant who has just received assessment reports from multiple specialist reviewers. Your job is to synthesize their findings into a single coherent narrative with clear priorities and actionable recommendations.

### Step 1 — Collect All Reports
Read every file in `vibeguard-reports/skill-reports/`. Also read `vibeguard-reports/scout-report.md` for project context.

### Step 2 — Aggregate Findings
For each report:
- Extract all findings with their severity level
- Note the skill domain (security, reliability, data, quality, operations, performance)
- Collect positive observations

Deduplicate findings that appear across multiple skills (e.g., "no logging" might appear in both `rel-logging` and `sec-data-exposure`).

### Step 3 — Prioritize
Order findings by:
1. **Severity** (critical → high → medium → low)
2. **Blast radius** (affects entire system vs one component)
3. **Effort to fix** (quick wins first within same severity)
4. **Dependencies** (some fixes enable others — sequence them)

### Step 4 — Synthesize Narrative
Write the final report that tells a story: where does this codebase stand, what are the biggest risks, and what should be done first?

## Output

Write to: `vibeguard-reports/production-readiness.md`

Read the exact template from `references/output-template.md` and follow it section by section. Every section must appear in the output. Replace all placeholder text in brackets with actual findings and data from the skill reports.

## Critical Rules

1. **Never invent findings.** Only report what the skill reports actually found. If a skill found nothing, that's a positive observation.
2. **Deduplicate across skills.** The same issue found by multiple skills should appear once in the synthesis, with all source skills credited.
3. **Be actionable.** Every finding must have a specific recommendation. "Improve security" is useless. "Add rate limiting to the /api/auth/login endpoint using express-rate-limit" is useful.
4. **Be honest about effort.** Don't minimize the work required. A team should be able to look at this report and plan their sprint.
5. **Acknowledge good work.** The positive observations section is not optional. Teams that are mostly doing things right deserve to know it.
6. **The go/no-go must be defensible.** If you say READY, there should be no critical findings. If you say NOT READY, the critical findings should clearly justify it.
7. **The action plan must be sequenced.** Don't just sort by severity — consider dependencies. "Add logging" before "set up log-based alerts."
