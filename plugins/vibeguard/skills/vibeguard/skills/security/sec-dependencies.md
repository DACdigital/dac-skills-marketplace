---
name: sec-dependencies
description: Assess dependency tree for CVEs, outdated packages, unmaintained libraries, and license compliance
---

# Skill: sec-dependencies

## Domain: Security
## Purpose
Assess the dependency tree for known vulnerabilities, outdated packages, unmaintained libraries, and license compliance risks.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Dependencies are the largest attack surface in most applications — you're running thousands of lines of code you didn't write. A single vulnerable transitive dependency can be exploited even if your code is perfect. The Equifax breach (143M records) was a known Struts CVE that sat unpatched. Supply chain attacks (event-stream, ua-parser-js, colors.js) show that even popular packages can be compromised. The fix is systematic: audit, pin, monitor, update.

### 1. Known Vulnerabilities (CVEs)
- Run the appropriate audit command for each detected package manager:
  - `npm audit` / `yarn audit` / `pnpm audit`
  - `pip-audit` or `safety check` (Python)
  - `cargo audit` (Rust)
  - `bundle audit` (Ruby)
  - `go vuln check` (Go — check if govulncheck is referenced)
  - `dotnet list package --vulnerable` (.NET)
  - Check if any of these commands are available and run them
- If audit commands aren't available, check for known vulnerability scanning in CI (Snyk, Dependabot, Renovate, Trivy)
- Categorize findings by severity (critical/high/medium/low) as reported by the scanner

### 2. Outdated Dependencies
- **Major version behind**: dependencies more than 1 major version behind current (high risk — breaking changes accumulate, security patches stop)
- **Significantly outdated**: dependencies with no update in 2+ years
- **Framework/runtime EOL**: is the core framework/runtime still supported? (e.g., Node 14, Python 3.7, Ruby 2.7, Angular 12)

### 3. Unmaintained Dependencies
- Check for dependencies with:
  - No commits in 2+ years on their repository
  - Archived/deprecated repository
  - Known deprecation notices (look for warnings during install, README deprecation notices)
  - Very low download counts relative to alternatives
- Focus on direct dependencies, not transitive (direct deps are your explicit choices)

### 4. Dependency Count & Weight
- Total direct dependencies count — is it reasonable for the project size?
- Are there redundant dependencies? (e.g., both `moment` and `date-fns`, multiple HTTP clients, multiple testing frameworks)
- Are there dependencies that should be devDependencies but are in production? (or vice versa)
- Any vendored/copied dependencies instead of package-managed?

### 5. License Compliance
- Scan dependency licenses for:
  - **Copyleft**: GPL, AGPL, LGPL — may require your code to be open-sourced
  - **No license**: legally risky — no permission granted
  - **Uncommon/unknown licenses**: may have unexpected restrictions
- This matters most for commercial/proprietary projects. Note the finding and let the user assess business impact.

### 6. Automated Updates
- Is Dependabot, Renovate, or similar configured?
- Are there unmerged Dependabot/Renovate PRs piling up?
- Is there a policy for dependency updates (frequency, process)?

### 7. Supply Chain Signals
- Are lock files committed? (Critical — without them, builds aren't reproducible)
- Are dependency integrity checksums present? (npm `integrity` field, `yarn.lock` hashes)
- Is there a `.npmrc`, `.yarnrc`, or similar that points to a private registry? (Note it, could be relevant for security)

## How to Assess (by stack)

- **Node.js**: `npm audit --json`, check `package.json` vs `package-lock.json`, look for `overrides`/`resolutions` that might be hiding issues
- **Python**: Check for `pip-audit`, `safety`, `bandit` in dev deps or CI. Review `pyproject.toml`/`requirements.txt` for pinning strategy
- **Go**: Check `go.mod` for versions, `go.sum` for integrity, `govulncheck` in CI
- **Rust**: Check `Cargo.lock`, `cargo audit` in CI, `cargo deny` config
- **Ruby**: Check `Gemfile.lock`, `bundler-audit` in CI
- **Java/Kotlin**: Check dependency versions in `pom.xml`/`build.gradle`, OWASP dependency-check plugin
- **.NET**: Check `.csproj` package references, `dotnet list package --outdated`
- **PHP**: Check `composer.lock`, `roave/security-advisories` in dependencies
- **Elixir/Phoenix**: Check `mix.lock`, `mix hex.audit`, `mix deps.audit`, Hex package versions, retired packages

## Shallow Mode
Config and metadata checks only — no audit commands or deep analysis:
- Are lock files committed? (Check for `package-lock.json`, `yarn.lock`, `Gemfile.lock`, `go.sum`, `mix.lock`, `composer.lock`, etc.)
- Is vulnerability scanning configured in CI? (Look for `npm audit`, `pip-audit`, `snyk`, `trivy`, Dependabot alerts)
- Is Dependabot/Renovate configured? (Check `.github/dependabot.yml`, `renovate.json`)
- Check the core framework/runtime version — is it still in active support?

## Deep Mode (default)
All of Shallow Mode, plus:
- Run available audit commands (`npm audit`, `pip-audit`, `bundle audit`, `cargo audit`, `mix hex.audit`) and categorize findings by severity
- Review every direct dependency: last update date, maintenance status, deprecation notices
- Check license compliance across the dependency tree — flag copyleft (GPL/AGPL) and no-license packages
- Count direct vs transitive dependencies — flag unreasonable dependency counts or obvious redundancy
- Check for unmerged Dependabot/Renovate PRs piling up (sign of dependency neglect)
- Review CI pipeline for automated security scanning stages

## Severity Guide
- **CRITICAL**: Known critical/high CVEs in production dependencies, no lock files committed
- **HIGH**: Framework/runtime at end-of-life, dependencies with known critical vulnerabilities that are unpatched, no vulnerability scanning in CI
- **MEDIUM**: Major version outdated dependencies, unmaintained direct dependencies, copyleft licenses in commercial project
- **LOW**: No automated dependency updates configured, minor version staleness, dev dependencies with vulnerabilities

## Output
Write report to: `vibeguard-reports/skill-reports/sec-dependencies.md`
Follow the output contract at `references/skill-output-contract.md`.
