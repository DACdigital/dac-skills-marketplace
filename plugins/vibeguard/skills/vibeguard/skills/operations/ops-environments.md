---
name: ops-environments
description: Assess environment management — dev/staging/prod parity, config separation, data isolation, preview environments
---

# Skill: ops-environments

## Domain: Operations
## Purpose
Assess environment management — parity between dev/staging/prod, configuration separation, data isolation, and environment documentation.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Environment management determines whether you're testing what you ship. A staging environment that differs from production hides bugs until they hit real users. Production data in development without anonymization exposes customer PII to every developer. Shared credentials between environments means a staging compromise gives production access. The goal is environments that are isolated, representative, and safe.

### 1. Environment Inventory
- What environments exist? (development, staging, preview/PR, production, QA, UAT)
- How are they defined? (Separate infrastructure, separate configs, separate branches)
- Are they documented? (Which environment, what it's for, how to access)

### 2. Environment Parity
- How similar is staging to production?
  - Same infrastructure components? (Same database type, same cache, same queue)
  - Same runtime versions? (Same Node/Python/Go version)
  - Same OS/container base?
  - Same deployment process? (Deploy to staging exactly how you deploy to production)
  - Similar scale? (Doesn't need to be identical, but representative)
- Are there components in production that don't exist in staging? (This gap hides bugs)

### 3. Configuration Separation
- Are environment-specific configs cleanly separated? (Not if/else in code)
- Is config loading environment-aware? (Loads correct config for the environment)
- Are there any hardcoded environment URLs/values in source code?
- Is the configuration mechanism the same across environments? (Same approach, different values)
- Are secrets managed per-environment? (Staging secrets ≠ production secrets)

### 4. Data Isolation
- Does staging use production data? (Risky — PII, compliance issues)
- If so, is it anonymized? (Scrubbed PII before use in lower environments)
- Do developers have access to production data? (Should be minimal)
- Are production database credentials shared with lower environments? (Should be different)
- Is there a mechanism to seed development/staging with realistic test data?

### 5. Network Isolation
- Are production and lower environments network-isolated? (Separate VPCs, accounts, projects)
- Can staging accidentally connect to production services? (DNS, service discovery)
- Are external service integrations separate per environment? (Sandbox/test accounts for Stripe, SendGrid, etc.)

### 6. Preview/Ephemeral Environments
- Are there PR/branch preview environments?
- Are they automatically created and destroyed?
- Do they have their own databases/resources? (Or share staging)
- Are they accessible for review? (PR includes preview URL)

### 7. Environment Promotion
- Is the same artifact deployed across environments? (Build once, deploy many)
- Is there a clear promotion path? (dev → staging → production)
- Are environment-specific overrides minimal? (Only config values, not code changes)

### 8. Development Experience
- Can developers run the full stack locally? (docker-compose, devcontainers)
- Is there documentation for local setup?
- Are external services mockable locally? (LocalStack, fake SMTP, mock APIs)
- Is the local development experience close to production? (Not a completely different stack)

## Shallow Mode
Config file checks only — no parity analysis:
- Are there environment-specific config files? (`config/production.js`, `.env.staging`, `appsettings.Staging.json`)
- Is there a staging/production separation? (Different config values, different infrastructure)
- Is there environment documentation? (Which environments exist, how to access them)
- Is there a local dev setup? (`docker-compose.yml`, `.devcontainer/`, `Makefile` with setup commands)

## Deep Mode (default)
All of Shallow Mode, plus:
- Compare staging vs production configuration: same database type? Same cache? Same queue? Same runtime version? Same deployment process?
- Search for hardcoded environment-specific values in source code (URLs, hostnames, ports that should be config)
- Check data isolation: does staging use production data? If so, is it anonymized? Are credentials different per environment?
- Check for preview/PR environments: are they automatically created and destroyed? Do they have isolated resources?
- Assess local dev experience: can developers run the full stack locally? Is setup documented? Are external services mockable?

## Severity Guide
- **CRITICAL**: Production data in development/staging without anonymization, staging using production credentials, no separation between environments (single environment for everything)
- **HIGH**: No staging environment, significant staging/production parity gaps (different database types, missing components), production-only services not tested before deploy
- **MEDIUM**: No preview environments, local development difficult (manual setup, missing docs), external services shared between environments (same Stripe account)
- **LOW**: Development environment not fully representative, no seed data mechanism, environment documentation incomplete, local setup requires many manual steps

## Output
Write report to: `vibeguard-reports/skill-reports/ops-environments.md`
Follow the output contract at `references/skill-output-contract.md`.
