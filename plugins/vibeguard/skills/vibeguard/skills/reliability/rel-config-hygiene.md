---
name: rel-config-hygiene
description: Assess configuration management — hardcoded values, env var handling, config validation, environment separation
---

# Skill: rel-config-hygiene

## Domain: Reliability
## Purpose
Assess configuration management — hardcoded values, environment variable handling, config validation, and environment-specific configuration.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Config problems are the #1 cause of "works in dev, breaks in production." A hardcoded localhost database URL silently connects to nothing. A missing env var discovered 30 minutes into serving traffic causes a cryptic crash. Different config shapes between environments mean you're not testing what you're deploying. The fix is simple: centralize config, validate at startup, fail fast.

### 1. Hardcoded Values
- **URLs/endpoints**: API base URLs, database hosts, service endpoints hardcoded in source (should be configurable)
- **Ports**: hardcoded port numbers that should be configurable
- **Magic numbers**: unexplained numeric constants (timeouts, limits, thresholds) without names or config
- **Feature switches**: boolean flags hardcoded instead of configurable
- **Credentials**: (covered by sec-secrets, but note if found — cross-reference)

### 2. Environment Variable Management
- Is there a single entry point for configuration? (One config module that reads all env vars)
- Or are `process.env`/`os.environ` scattered throughout the codebase?
- Is there a `.env.example` file documenting all required variables?
- Are required vs optional env vars distinguished?
- Are defaults sensible? (A missing `DATABASE_URL` should crash at startup, not silently use localhost)

### 3. Config Validation at Startup
- Does the application validate configuration on startup? (Not 30 minutes later when a code path first needs it)
- Are required values checked for presence?
- Are values validated for format? (Is the DATABASE_URL actually a URL? Is the PORT a number?)
- Does validation fail fast and loudly? (Clear error message, not a cryptic crash)
- Libraries: Zod, Joi, Pydantic Settings, convict, envalid, viper validation

### 4. Environment-Specific Configuration
- Is there a clear separation between development, staging, and production configs?
- Are environment differences minimal and explicit? (Not entirely different config files)
- Is there a mechanism to ensure production doesn't accidentally use development values?
- Are feature flags environment-aware?

### 5. Configuration Documentation
- Are all config options documented? (What they do, default values, valid ranges)
- Is there a config reference? (README section, dedicated config docs, `.env.example` with comments)
- Are deprecated config options handled? (Warning messages, migration guides)

### 6. Configuration Drift Risks
- Can the application run with partial configuration? (Dangerous — better to fail fast)
- Are there config values that must be consistent across instances? (Session secret, encryption keys)
- Is configuration loaded once at startup or re-read at runtime? (Both have tradeoffs — document which)
- Are there config-dependent code paths that are only exercised in certain environments?

## How to Assess (by stack)

- **Node.js**: Check for scattered `process.env` usage, config modules, `dotenv` patterns, `convict`/`envalid`/`zod` validation
- **Python**: Check `os.environ` usage, `pydantic.BaseSettings`, `python-decouple`, Django `settings.py`, Flask `config.py`
- **Go**: Check `os.Getenv` usage, `viper` config, `envconfig`, config structs with validation
- **Ruby/Rails**: Check `ENV[]` usage, Rails `config/environments/*.rb`, `figaro`/`dotenv` gems, `Rails.application.config`
- **Java/Spring**: Check `application.properties`/`application.yml`, `@Value` annotations, `@ConfigurationProperties`, profiles
- **.NET**: Check `appsettings.json`/`appsettings.*.json`, `IOptions<T>`, `IConfiguration`, config validation
- **Elixir/Phoenix**: Check `config/*.exs` structure, `config/runtime.exs` for runtime env, `System.get_env()` vs compile-time config, Mix release config
- **PHP/Laravel**: Check `.env` file handling, `config/` directory, `env()` helper with fallback defaults, `config:cache` for production
- **Rust**: Check `std::env::var`, `config` crate, `dotenv`, structopt/clap for config

## Shallow Mode
Config file checks only — no source code tracing:
- Does `.env.example` exist? Is it populated with all expected variables?
- Is a config validation library in dependencies? (Zod, envalid, convict, Pydantic Settings, etc.)
- Is there a centralized config module, or are `process.env`/`os.environ` calls scattered throughout?
- Are there environment-specific config files? (`config/production.js`, `settings/prod.py`, `appsettings.Production.json`)

## Deep Mode (default)
All of Shallow Mode, plus:
- Search for all `process.env`, `os.environ`, `os.Getenv`, `ENV[]`, `System.get_env`, `env()` calls — map every env var used
- Compare the list against `.env.example` — flag any env vars used in code but missing from the example
- Check startup code for config validation: are required values validated before the server starts listening?
- Search for hardcoded URLs, ports, hostnames, and magic numbers in source code that should be configurable
- Check for environment-conditional code paths (`if NODE_ENV === 'production'`) that might have untested branches

## Severity Guide
- **CRITICAL**: Hardcoded production URLs/credentials in source, no config validation (app runs with invalid config and fails later), production database URL defaulting to localhost
- **HIGH**: No `.env.example` (new devs can't set up), scattered env var access with no central config, no startup validation for required values
- **MEDIUM**: Some hardcoded values that should be configurable, incomplete `.env.example`, no config format validation
- **LOW**: Missing config documentation, no deprecated config handling, magic numbers without named constants

## Output
Write report to: `vibeguard-reports/skill-reports/rel-config-hygiene.md`
Follow the output contract at `references/skill-output-contract.md`.
