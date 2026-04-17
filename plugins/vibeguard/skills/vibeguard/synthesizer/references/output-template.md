# Production Readiness Assessment — [Project Name]

> Generated: [timestamp]
> Assessed by: VIBEguard
> Skills executed: [count]
> Mode: [deep|shallow]

---

## Executive Summary

[2-4 paragraph narrative: what this project is, its overall readiness posture, the biggest risks, and a clear go/no-go recommendation with conditions]

**Recommendation**: [READY | READY WITH CONDITIONS | NOT READY]

[If READY WITH CONDITIONS or NOT READY, list the specific blocking conditions]

---

## Risk Heatmap

| Domain | Critical | High | Medium | Low | Overall |
|--------|----------|------|--------|-----|---------|
| Security | | | | | [PASS/WARN/FAIL] |
| Reliability | | | | | [PASS/WARN/FAIL] |
| Data | | | | | [PASS/WARN/FAIL] |
| Quality | | | | | [PASS/WARN/FAIL] |
| Operations | | | | | [PASS/WARN/FAIL] |
| Performance | | | | | [PASS/WARN/FAIL] |
| **Total** | | | | | |

**Scoring**: FAIL = any critical findings. WARN = high findings but no critical. PASS = medium/low only.

---

## Critical Findings (Must Fix Before Production)

[List every CRITICAL finding across all skills, deduplicated. Use `C-N` IDs, sequential within this section.]

### C-1: [Finding Title]
- **Source skill**: [skill-name]
- **Source finding**: `[skill-id-N]`
- **Domain**: [security/reliability/data/quality/operations/performance]
- **Location**: `file:line`
- **Risk**: [what could happen]
- **Fix**: [code block — always show the target state]
- **Effort**: [low/medium/high]

### C-2: [Next Critical Finding]
- **Source skill**: [skill-name]
- **Source finding**: `[skill-id-N]` (or multiple if deduplicated: `sec-secrets-3, sec-data-exposure-1`)
- ...

---

## High Priority Findings (Must Fix Before Launch)

[Same format, using `H-N` IDs.]

### H-1: [Finding Title]
- **Source skill**: [skill-name]
- **Source finding**: `[skill-id-N]`
- **Domain**: ...
- **Location**: ...
- **Risk**: ...
- **Fix**: [code block]
- **Effort**: ...

---

## Medium Priority Findings (Should Fix Before Launch)

[Same format, using `M-N` IDs. Group by domain for readability.]

### Security
#### M-1: [Finding Title]
- **Source skill**: [skill-name]
- **Source finding**: `[skill-id-N]`
- ...

### Reliability
[findings]

### Data
[findings]

### Quality
[findings]

### Operations
[findings]

### Performance
[findings]

---

## Low Priority Findings (Fix Post-Launch)

[Using `L-N` IDs. Brief format — title, source, one-line recommendation.]

- **L-1**: [Title] — Source: `[skill-id-N]` — [one-line fix]
- **L-2**: [Title] — Source: `[skill-id-N]` — [one-line fix]

---

## Positive Observations

[Aggregate the good things found across all skills. This matters — it acknowledges good work, provides context for the team's maturity level, and helps prioritize what NOT to change.]

### Security
[what's done well]

### Reliability
[what's done well]

[...etc for each domain that has positive observations]

---

## Prioritized Action Plan

### Phase 1: Critical Fixes (Before any production traffic)
| Finding | Action | Domain | Effort | Dependencies |
|---------|--------|--------|--------|-------------|
| C-1 | | | | |

### Phase 2: High Priority (Before public launch)
| Finding | Action | Domain | Effort | Dependencies |
|---------|--------|--------|--------|-------------|
| H-1 | | | | |

### Phase 3: Medium Priority (First month post-launch)
| Finding | Action | Domain | Effort | Dependencies |
|---------|--------|--------|--------|-------------|
| M-1 | | | | |

### Phase 4: Continuous Improvement (Ongoing)
| Finding | Action | Domain | Effort |
|---------|--------|--------|--------|
| L-1 | | | |

---

## Dependency Map

[If certain fixes must happen before others, document the sequence]

```
[Fix A] → enables → [Fix B] → enables → [Fix C]
[Fix D] → blocks → [Fix E]
```

---

## Effort Estimation Summary

| Phase | Items | Estimated Effort |
|-------|-------|-----------------|
| Critical Fixes | X items | ~Y person-days |
| High Priority | X items | ~Y person-days |
| Medium Priority | X items | ~Y person-days |
| Low Priority | X items | ~Y person-days |
| **Total** | X items | ~Y person-days |

*Estimates are rough order-of-magnitude based on typical complexity. Actual effort depends on team familiarity and codebase specifics.*

---

## Skills Not Executed

[List skills that were not activated by the Scout, and why — for transparency]

| Skill | Reason Not Activated |
|-------|---------------------|
| | |

---

## Assessment Friction

[If `vibeguard-reports/permission-friction.md` exists, include a brief summary here:]

> Some tool calls required manual approval during this run. See `vibeguard-reports/permission-friction.md` for a ready-to-paste `.claude/settings.json` that eliminates prompts on future runs.

[If auto-approve was enabled or no friction occurred, omit this section.]

---

## Methodology

This assessment was performed by VIBEguard, a production readiness assessment toolkit. It uses specialized assessment skills that analyze the codebase for security, reliability, data integrity, code quality, operational readiness, and performance patterns.

Each finding is classified by severity:
- **Critical**: Exploitable in production, data loss/breach risk, system failure imminent
- **High**: Significant risk, must fix before launch
- **Medium**: Operational risk, should fix before launch
- **Low**: Best practice gap, tech debt

Assessment mode: [deep|shallow]
