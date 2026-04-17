# Scout Report — [Project Name]

> Generated: [timestamp]
> Mode: [deep|shallow]
> Codebase root: [path]

## Executive Summary

[2-3 sentences: what this project is, what stack it uses, how big it is, and its deployment model]

## Stack

| Aspect | Details |
|--------|---------|
| Primary language(s) | |
| Framework(s) | |
| Package manager(s) | |
| Build tool(s) | |
| Runtime version(s) | |

## Topology

- **Architecture type**: [monolith | monorepo | microservices | library | hybrid]
- **Deployable units**: [count]

[For each unit:]
### [Unit Name]
- **Path**: [directory]
- **Entry point**: [file]
- **Stack**: [language + framework]
- **Internal deps**: [list]

## Infrastructure

### Containers
[What was found or "No container configuration detected"]

### Orchestration
[What was found or "No orchestration configuration detected"]

### Infrastructure as Code
[What was found or "No IaC detected"]

### CI/CD
[What was found or "No CI/CD configuration detected"]

### Cloud Provider
[What was found or "No cloud provider signals detected"]

### Serverless
[What was found or "No serverless configuration detected"]

## Data Layer

| Store | Type | Client/ORM | Migrations | Config Location |
|-------|------|------------|------------|-----------------|
| | | | | |

[If no data stores detected: "No data layer detected"]

## External Dependencies

| Service | Category | Integration Method | Config Location |
|---------|----------|--------------------|-----------------|
| | | | |

[If none detected: "No external service integrations detected"]

## Security Surface

- **Auth mechanism**: [description or "Not detected"]
- **CORS**: [location + policy summary or "Not configured"]
- **Security headers**: [location or "Not configured"]
- **Secrets management**: [approach or "No structured approach detected"]
- **TLS/Certs**: [signals or "No signals detected"]
- **Security scanning**: [tools or "None configured"]

## Test Landscape

| Aspect | Details |
|--------|---------|
| Test framework(s) | |
| Test directories | |
| Test types | [unit, integration, e2e, contract, ...] |
| Coverage tooling | |
| Test commands | |
| CI integration | [yes/no — tests run in pipeline] |

[If no tests detected: "No test infrastructure detected"]

## Documentation

| Document | Status | Quality |
|----------|--------|---------|
| README | [exists/missing] | [placeholder/basic/comprehensive] |
| API docs | [exists/missing] | |
| Architecture docs | [exists/missing] | |
| Runbooks | [exists/missing] | |
| Contributing guide | [exists/missing] | |
| Changelog | [exists/missing] | |
| Inline comments | [light/moderate/heavy] | |

## Codebase Metrics

| Metric | Value |
|--------|-------|
| Total files | |
| Lines of code | [per language] |
| Directory depth (max) | |
| Contributors (total) | |
| Contributors (active 90d) | |
| Last commit | |
| First commit | |
| Commit frequency | |

[Omit this section in shallow mode]

## Skill Relevance Determination

Use ONLY the canonical skill IDs listed in scout.md. Do not use abbreviations, aliases, or free-form names. Each entry must start with a skill ID that exactly matches one from the inventory. The orchestrator reads this list literally.

Based on the above findings, the following skills should be activated:

### Always Run (any codebase)
- `sec-secrets`
- `sec-dependencies`
- `sec-supply-chain`
- `rel-config-hygiene`
- `qual-test-existence`
- `qual-linting`
- `qual-code-patterns`
- `qual-documentation`

### Activated by Detection
[List each activated skill with the evidence. Use EXACT canonical skill IDs only:]
- `sec-authentication` — [auth library X detected in path Y]
- `sec-authorization` — [RBAC middleware found in path Y]
- `data-migrations` — [Prisma schema detected at path Z]
[... etc.]

### Not Activated (reason)
[List skills NOT activated using EXACT canonical skill IDs:]
- `data-isolation` — no multi-tenant signals detected
- `ops-containers` — no Dockerfile found
[... etc.]

## Raw Signals

<details>
<summary>Expand for raw detection evidence</summary>

[List every file, import, config key, or pattern that informed the above conclusions. This section is for audit/debugging — skills can reference it for precise file locations.]

### Files of Interest
- [path]: [what it tells us]
- [path]: [what it tells us]

### Key Imports/Dependencies
- [package@version]: [what it indicates]

### Environment Variables Referenced
- [VAR_NAME]: [found in file, probable purpose]

### Unrecognized Patterns
[Anything unusual that didn't fit the above categories but might be relevant]

</details>
