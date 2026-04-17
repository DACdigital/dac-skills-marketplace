---
name: sec-secrets
description: Detect hardcoded credentials, API keys, tokens, and secrets committed to the codebase
---

# Skill: sec-secrets

## Domain: Security
## Purpose
Detect hardcoded credentials, API keys, tokens, and secrets committed to the codebase.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

You are scanning for secrets that should never be in version control. A single leaked AWS key can rack up six-figure cloud bills in hours. A leaked database connection string means full data breach. Secrets in git history persist even after deletion — attackers actively scan public repos for them. The blast radius of a single leaked credential often exceeds every other security finding combined.

### False Positive Awareness
Not every string that looks like a secret is one. Before flagging, verify the value isn't a placeholder or test fixture. Skip strings containing: `example`, `placeholder`, `test`, `fake`, `dummy`, `changeme`, `xxx`, `TODO`, `your-`, `insert-`, `replace-`. Also skip: values in `.env.example` that are clearly templates, test fixtures with obviously fake keys, and documentation samples. When uncertain, flag as LOW with a note to verify.

### 1. Committed Environment Files
- `.env` files in version control (not just `.env.example`)
- `.env.local`, `.env.production`, `.env.staging` with real values
- Check `.gitignore` — is `.env` listed? If not, CRITICAL.
- Check git history (deep mode): were `.env` files ever committed then removed? They're still in history.

### 2. Hardcoded Credentials in Source
Scan ALL source files for patterns:
- **API keys**: strings matching `sk_live_*`, `pk_live_*`, `AKIA*` (AWS), `ghp_*` (GitHub), `xoxb-*`/`xoxp-*` (Slack), `SG.*` (SendGrid), `sk-*` (OpenAI/Stripe)
- **Connection strings**: `postgres://user:pass@`, `mongodb://user:pass@`, `mysql://`, `redis://user:pass@`, `amqp://`
- **Private keys**: `-----BEGIN RSA PRIVATE KEY-----`, `-----BEGIN OPENSSH PRIVATE KEY-----`, `-----BEGIN EC PRIVATE KEY-----`
- **Generic patterns**: `password\s*=\s*["'][^"']+["']`, `secret\s*=\s*["'][^"']+["']`, `token\s*=\s*["'][^"']+["']`, `api_key\s*=\s*["'][^"']+["']`
- **Base64-encoded secrets**: long base64 strings assigned to variables named `key`, `secret`, `token`, `password`
- **JWTs**: `eyJ` prefixed strings (especially in source, not test fixtures)

### 3. Secrets in Configuration Files
- Docker Compose files with hardcoded passwords in `environment:` blocks
- Kubernetes manifests with secrets in plain text (not using Secrets resources or external secret managers)
- CI/CD configs with inline secrets (not using pipeline secret variables)
- Terraform files with hardcoded credentials (should use variables or vault)
- `docker-compose.yml` with real credentials in environment variables

### 4. Secrets in Docker Layers
- Dockerfile `COPY`-ing `.env` files
- Dockerfile `ARG`/`ENV` with secret values
- Multi-stage builds that don't properly isolate secrets from final image
- `.dockerignore` missing `.env`, credentials files

### 5. Secrets in Client-Side Code
- API keys in frontend JavaScript/TypeScript that should be server-side only
- Backend URLs with embedded credentials in frontend code
- Firebase/Supabase/other service keys that are meant to be public but configured with excessive permissions

### 6. CI/CD Secret Hygiene
- Are pipeline secrets properly scoped? (Not exposed to fork PRs — this is a common attack vector)
- Are secrets injected at runtime, not baked into build artifacts?
- Are CI logs masking secret values? (Some CI systems print env vars in debug mode)
- Are secrets duplicated across pipelines instead of using a shared secret store?

### 7. Secret Rotation Signals
- If secrets were previously committed and removed: were they rotated? (Removing from code doesn't revoke the credential)
- Are there rotation mechanisms in place? (AWS key rotation, database password rotation policies)
- Are there secrets that appear unchanged across long git history? (Stale credentials that were never rotated)

### 8. Secret Management Signals
- **Positive signals**: `.env.example` with placeholder values, references to vault/SSM/Secrets Manager, secret scanning config (`.gitleaks.toml`, `.secretlint*`), pre-commit hooks for secret detection
- **Negative signals**: no `.env.example`, no secret manager references, no secret scanning in CI

## How to Assess (by stack)

Regardless of stack, the patterns above apply universally. Additionally:

- **Node.js**: Check `process.env` usage — are all secrets loaded from env? Check for `dotenv` usage patterns.
- **Python**: Check `os.environ`, `os.getenv` patterns. Django `settings.py` with `SECRET_KEY` hardcoded. Flask configs.
- **Go**: Check `os.Getenv` patterns. Viper config files.
- **Ruby**: Check `ENV[]` patterns. Rails `secrets.yml`, `credentials.yml.enc` (good), hardcoded in `database.yml` (bad).
- **Java/.NET**: Check `application.properties`, `appsettings.json`, `web.config` for hardcoded values.
- **Elixir/Phoenix**: Check `Application.get_env/3`, `config/*.exs` for hardcoded values, `System.get_env()` usage, runtime.exs vs compile-time config
- **PHP/Laravel**: Check `.env` handling, `config/` directory for hardcoded values, `env()` helper, `$_ENV`/`$_SERVER` access patterns
- **Rust**: Check `.cargo/config.toml`, environment variable access patterns.

## Shallow Mode
Quick checks only — no source code scanning or git history:
- Is `.env` in `.gitignore`? If not, CRITICAL.
- Does `.env` exist in the repo root (committed)? If yes, CRITICAL.
- Does `.env.example` exist? If not, MEDIUM.
- Are secret scanner configs present? (`.gitleaks.toml`, `.secretlint*`, pre-commit hooks)
- Scan `docker-compose.yml`, `Dockerfile`, and CI config files for strings matching `password=`, `secret=`, `token=`, `api_key=` with non-placeholder values
- Check Kubernetes manifests for plain-text secrets (not using Secret resources or external secret managers)

## Deep Mode (default)
All of Shallow Mode, plus:
- Full source code scan using grep/rg for all patterns in section 2 (API keys, connection strings, private keys, generic patterns, base64, JWTs)
- Git history analysis for previously committed secrets:
  - `git log --all --diff-filter=D -- '*.env*'` — deleted env files still in history
  - `git log --all -p -S 'password' --` — commits that added/removed password strings
  - `git log --all -p -S 'BEGIN RSA' --` — private keys that were committed then removed
  - If secrets found in history: check whether they were rotated after removal (if not, CRITICAL)
- Trace how environment variables are loaded and verify `.env.example` covers all used env vars
- Analyze Docker build layers for secret exposure (ARG/ENV with secrets, COPY of .env)
- Check git submodules for committed secrets

## Severity Guide
- **CRITICAL**: Real credentials found in source (API keys, passwords, private keys, connection strings with credentials)
- **CRITICAL**: `.env` file with real values committed to repo
- **CRITICAL**: Secrets found in git history and not rotated
- **HIGH**: Secrets in Docker layers, CI configs, or Kubernetes manifests
- **HIGH**: No `.gitignore` entry for `.env` files
- **HIGH**: CI secrets exposed to fork PRs
- **MEDIUM**: Frontend code with server-side API keys
- **MEDIUM**: No secret scanning in CI/pre-commit
- **MEDIUM**: No secret rotation mechanism for long-lived credentials
- **LOW**: Missing `.env.example` file
- **LOW**: Inconsistency between `.env.example` and actual env var usage
- **LOW**: Secrets duplicated across CI pipelines instead of shared store

## Output
Write report to: `vibeguard-reports/skill-reports/sec-secrets.md`
Follow the output contract at `references/skill-output-contract.md`.
