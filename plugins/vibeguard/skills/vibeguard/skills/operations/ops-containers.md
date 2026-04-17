---
name: ops-containers
description: Assess container configuration — Dockerfile best practices, image security, .dockerignore, build optimization
---

# Skill: ops-containers

## Domain: Operations
## Purpose
Assess container configuration — Dockerfile best practices, image security, .dockerignore, and build optimization.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Container configuration directly affects security, build speed, and image size. Running as root means a container escape gives the attacker full host access. No `.dockerignore` sends the entire repo (including `.git` and `.env`) as build context. No multi-stage build means dev tools and build artifacts bloat the production image. `:latest` tags mean builds aren't reproducible — the same Dockerfile produces different images on different days.

### 1. Dockerfile Best Practices
- **Multi-stage builds**: is the build separate from the runtime? (Build tools not in production image)
- **Base image**: is it minimal? (Alpine, distroless, slim — not full Ubuntu/Debian)
- **Base image pinning**: tagged by version + digest? (Not `:latest`)
- **Layer ordering**: are frequently-changing layers (source code) after rarely-changing layers (dependencies)? (Cache efficiency)
- **Single RUN for related commands**: minimizing layer count where appropriate?
- **COPY vs ADD**: using COPY for simple file copies? (ADD has extra features that can be surprising)

### 2. Security
- **Non-root user**: does the container run as a non-root user? (`USER` instruction)
- **No secrets in image**: no `.env` files, credentials, or API keys in any layer
- **No unnecessary tools**: no `curl`, `wget`, `ssh`, shells in production image? (Reduces attack surface)
- **Read-only filesystem**: can the container run with a read-only root filesystem?
- **No privileged mode**: container not running with `--privileged`
- **Capabilities dropped**: `--cap-drop=ALL` with only needed capabilities added back
- **Image scanning**: is there image vulnerability scanning configured? (Trivy, Snyk, Docker Scout, Grype)

### 3. .dockerignore
- Does `.dockerignore` exist?
- Does it exclude:
  - `.git/`
  - `node_modules/` (or equivalent)
  - `.env` files
  - Test files
  - Documentation
  - IDE configs
  - Build outputs that will be regenerated
  - Temporary files
- Is it comprehensive? (Compare to `.gitignore` — often they should be similar)

### 4. Health Check
- Is a `HEALTHCHECK` instruction present? (Docker-native health monitoring)
- Is it appropriate? (Lightweight check, reasonable interval and timeout)

### 5. Image Size
- Is the final image size reasonable? (Slim/Alpine base + only production deps)
- Are build artifacts cleaned up? (Cache dirs, temp files, package manager caches)
- Is there unused data in the image? (Documentation, man pages, test files)

### 6. Docker Compose (if present)
- Are services well-defined? (Each service has a clear purpose)
- Are volumes used for persistent data? (Not storing data in containers)
- Are networks defined for service isolation?
- Are resource limits set? (`mem_limit`, `cpus`)
- Are restart policies configured?
- Is there a `docker-compose.override.yml` for dev-specific config?
- Are production and development compose files separated?

### 7. Build Optimization
- Are dependencies installed before copying source? (Layer caching)
- Is `--no-cache` / `--production` / `--omit=dev` used for production dependency install?
- Are `.dockerignore` and layer ordering optimized for build speed?
- Is BuildKit used? (`DOCKER_BUILDKIT=1`)
- Are build arguments used appropriately? (Not for secrets — use `--secret` mount instead)

## How to Assess

Applicable to any project with Dockerfile(s). Look for:
- `Dockerfile` in root or service directories
- `docker-compose.yml` / `docker-compose.yaml`
- `.dockerignore`
- CI/CD steps that build Docker images

### By stack
- **Elixir/Phoenix**: Check multi-stage build for Mix releases, `.dockerignore` for `_build`/`deps`/`.elixir_ls`, runtime-only OTP/Erlang in final image, `RELEASE_*` env vars
- **PHP/Laravel**: Check multi-stage build for Composer install, PHP-FPM config, `.dockerignore` for `vendor`/`node_modules`, opcache enabled in production image

## Shallow Mode
File-level checks only — no instruction-by-instruction analysis:
- Does a Dockerfile exist? Does it use multi-stage build?
- Does `.dockerignore` exist? Does it exclude `.git/`, `.env`, `node_modules/`?
- Is there a `USER` instruction (non-root)?
- Is the base image pinned to a specific version (not `:latest`)?

## Deep Mode (default)
All of Shallow Mode, plus:
- Analyze Dockerfile layer ordering: are dependency install layers before source code copy? (Cache efficiency)
- Check every instruction for security: are secrets passed via `ARG`/`ENV` (bad) or `--secret` mount (good)? Are unnecessary tools present?
- Verify `.dockerignore` completeness: compare against `.gitignore` — is everything sensitive excluded?
- If Docker Compose: check for resource limits, restart policies, volume configuration, network isolation, prod vs dev file separation
- Assess image size: is the base minimal (Alpine/distroless/slim)? Are build artifacts cleaned up? Are dev dependencies excluded?

## Severity Guide
- **CRITICAL**: Secrets in Docker image layers, running as root with no justification, no `.dockerignore` (sending entire repo as build context), base image with known critical CVEs
- **HIGH**: No multi-stage build (dev tools in production), `:latest` tag on base image, no `.dockerignore`, privileged mode enabled, no image scanning
- **MEDIUM**: Non-minimal base image, layer ordering not optimized, no HEALTHCHECK, no resource limits in Compose, dev dependencies in production image
- **LOW**: Image size could be smaller, build not using BuildKit, no build caching optimization, Compose not using networks for isolation

## Output
Write report to: `vibeguard-reports/skill-reports/ops-containers.md`
Follow the output contract at `references/skill-output-contract.md`.
