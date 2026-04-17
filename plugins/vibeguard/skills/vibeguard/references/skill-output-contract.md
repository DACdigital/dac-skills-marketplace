# Skill Output Contract

Every skill report MUST follow this exact template. The synthesizer, agents processing findings, and humans scanning reports all depend on this structure being consistent across all 47 skills. Do not deviate.

---

## Template

```markdown
# [Skill Name] Assessment

> Skill: [skill-id]
> Domain: [security|reliability|data|quality|operations|performance]
> Mode: [deep|shallow]
> Generated: [timestamp]
> Stack: [detected stack from scout report, e.g., "Python 3.12 / Django 5.0 / PostgreSQL"]

---

## Summary

**Result**: [PASS | PASS WITH WARNINGS | FAIL]

| Severity | Count |
|----------|-------|
| Critical | X |
| High     | Y |
| Medium   | Z |
| Low      | W |

---

## Areas Assessed

| # | Area | Result | Findings |
|---|------|--------|----------|
| 1 | [area name] | PASS | 0 |
| 2 | [area name] | FAIL | 2 |
| 3 | [area name] | SKIPPED | - |

---

## Findings

### skill-id-1: [Finding Title]

> Severity: CRITICAL
> Area: [area name from table above]
> Effort: low

**Location**
`src/auth/login.py:42`

**Evidence**
```python
password = request.data["password"]
user = User.objects.get(email=email)
if user.password == hashlib.md5(password.encode()).hexdigest():
```

**Risk**
MD5 password hashing is rainbow-table crackable in seconds — full account takeover.

**Recommendation**
```python
from django.contrib.auth.hashers import check_password

if check_password(password, user.password):
```
Replace MD5 with Django's password hasher (argon2 by default).

---

### skill-id-2: [Next Finding Title]

[...repeat for each finding]

---

## Positive Observations

- [Bullet list of what's done well, with file paths]

---

## Metadata

- Areas assessed: [N]
- Areas passed: [N]
- Areas with findings: [N]
- Areas skipped: [N]
- Files analyzed: [N]
- Stack file applied: [yes/no — which file]
```

---

## Rules

### Result
- **FAIL** = any Critical findings
- **PASS WITH WARNINGS** = High or Medium findings, no Critical
- **PASS** = Low findings only, or no findings

### Areas Assessed Table
- One row per numbered section in the skill's "What to Assess"
- **PASS**: area was checked, no findings
- **WARN**: area has Medium or Low findings only
- **FAIL**: area has Critical or High findings
- **SKIPPED**: area not applicable to this codebase (e.g., "no GraphQL detected", "no Docker found"). Include a brief reason.
- This table is the first thing a human scans and the first thing the synthesizer aggregates. It must be accurate.

### Finding IDs
Format: `[skill-id]-[N]` where N is sequential starting at 1 (e.g., `sec-secrets-1`, `sec-secrets-2`, `rel-logging-1`).

Finding IDs must be unique within a report. They are used by:
- The synthesizer to deduplicate across skills
- Agents to track which findings have been fixed
- Humans to reference specific findings in discussions

### Finding Order
Within each report, order findings by severity: all CRITICALs first, then HIGHs, then MEDIUMs, then LOWs.

### Evidence — Always a Code Block
Even if the finding is about a missing file or missing config, show it as a code block:
- Problematic code: quote the actual lines with language tag
- Missing file: `# File not found: .env.example`
- Missing config: `# No timeout configured in requests.post() call`
- Config issue: quote the config file with the problematic section

The evidence must include enough context (3-10 lines) that someone unfamiliar with the codebase understands what they're looking at.

### Recommendation — Always a Code Block
Show the target state — what the code/config/file SHOULD look like after the fix. Always.

- **Code fix**: show the corrected code
- **Missing file**: show the file content to create (`cat > filename << 'EOF'` or just the file content)
- **Missing config**: show the config block to add
- **Missing dependency**: show the install command (`npm install X`, `pip install X`) and any config needed
- **Infrastructure change**: show the config/manifest change

Follow with one sentence explaining the change if not obvious from the code.

An agent consuming this report should be able to apply the recommendation without interpretation. If the recommendation is ambiguous, it's not specific enough.

### Positive Observations
Always include this section. Be specific — file paths, library names, patterns observed. This provides context for the team's maturity level and acknowledges good work.

### Metadata
Fill in all fields. "Files analyzed" = approximate count of source files the skill examined. "Stack file applied" = whether a `references/stacks/` best-practices file was loaded for this assessment.
