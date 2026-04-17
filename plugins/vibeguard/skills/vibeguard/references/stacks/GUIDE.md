# Stack Best Practices — Contributor Guide

## What this is

Opinionated best-practice files per technology stack. When VIBEguard assesses a project, skills check if a stack file exists for the detected technology. If it does, the skill incorporates these opinions into its analysis and recommendations — preferring specific stack guidance over generic advice.

These files are prescriptive: "use X", not "consider X or Y." The point is to encode team/org opinions so assessments produce consistent, actionable recommendations.

## What belongs here

- Preferred libraries/tools for common tasks (HTTP client, ORM, testing, auth, background jobs, etc.)
- Recommended project structure and conventions
- Configuration opinions (linter rules, formatter config, type strictness levels)
- Deployment preferences (containerization, process manager, runtime version management)
- Stack-specific anti-patterns to flag — things that are technically valid but that we consider wrong
- Preferred patterns for common problems (error handling, config management, async work, etc.)

## What does NOT belong here

- Assessment criteria — "check if X exists" belongs in skill files, not here
- Detection patterns — "search for `requests.post`" belongs in skill `How to Assess` sections
- Generic advice that applies to all stacks — that's already in the skills
- Tutorials or explanations — keep it terse, link out if someone needs background

## File naming

One file per stack variant. Name format: `{language}` or `{language}-{framework}`.

Examples:
- `node.md` — general Node.js (applies to Express, Fastify, Nest, etc.)
- `python-django.md` — Django-specific
- `python-fastapi.md` — FastAPI-specific
- `go.md` — Go (no dominant framework, so just the language)
- `elixir-phoenix.md` — Phoenix-specific
- `php-laravel.md` — Laravel-specific

If a project uses a framework, the framework file takes precedence over the language file. If both exist, both are loaded (language file as baseline, framework file as override).

## Template

```markdown
# [Stack Name] Best Practices

## Project Setup
- **Package manager**: [tool] — [why]
- **Runtime version**: [management tool, e.g., mise, asdf, nvm, pyenv]
- **Project structure**: [convention or reference]

## Libraries

| Purpose | Use | Avoid | Why |
|---------|-----|-------|-----|
| HTTP client | | | |
| ORM / database | | | |
| Validation | | | |
| Auth | | | |
| Testing | | | |
| Background jobs | | | |
| Logging | | | |
| Config / env | | | |
| Linting | | | |
| Formatting | | | |

## Patterns

### [Pattern name]
[What we recommend and a one-line reason]

### [Pattern name]
[What we recommend and a one-line reason]

## Anti-Patterns

### [Anti-pattern name]
**Instead**: [what to do]
**Why**: [one line]

## Deployment
- **Containerization**: [approach]
- **Process manager**: [tool]
- **Health checks**: [pattern]

## Security Specifics
[Stack-specific security opinions beyond what skills already check]

## Performance Specifics
[Stack-specific performance opinions beyond what skills already check]
```

## Rules

1. **Be opinionated.** "Use X" not "consider X or Y." Indecisive guidance is useless.
2. **Say why in one sentence.** Not a paragraph. If someone needs convincing, they can research it.
3. **Keep it under 200 lines.** If longer, you're over-explaining. Link out.
4. **Keep it current.** Remove deprecated tools. Update version recommendations.
5. **Avoid version pinning** unless a specific version boundary matters (e.g., "Node 20+", not "Node 20.11.1").
6. **The Libraries table is the most important section.** Skills reference it when recommending alternatives.
7. **Don't duplicate skill content.** Skills say "check for missing timeouts." Stack files say "use httpx with timeout=30 as default client." Different jobs.

## How skills use these files

Every skill file contains this instruction (in the assessment flow):

> If a stack best-practices file exists at `references/stacks/` for the detected technology, read it. When making recommendations, prefer the specific library/pattern/tool named in the stack file over generic alternatives.

This means:
- **Without stack file**: Skill says "Missing password hashing — use bcrypt or argon2"
- **With stack file**: Skill says "Missing password hashing — use argon2-cffi (per stack guidelines)"

The stack file turns generic advice into specific, actionable recommendations.

## Adding a new stack file

1. Copy the template above
2. Fill in your opinions — every row in the Libraries table should have a clear "Use" and ideally an "Avoid"
3. Keep Patterns and Anti-Patterns sections focused on things unique to this stack
4. Save as `references/stacks/{name}.md`
5. That's it — skills automatically pick it up on the next run if the scout detects the stack
