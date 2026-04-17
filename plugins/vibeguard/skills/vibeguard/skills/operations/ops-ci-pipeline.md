---
name: ops-ci-pipeline
description: Assess CI pipeline — stages, quality gates, branch protection, build caching, artifacts, pipeline security
---

# Skill: ops-ci-pipeline

## Domain: Operations
## Purpose
Assess CI pipeline configuration — stages, quality gates, branch protection, build artifacts, and pipeline speed.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

CI is the quality gate between code and production. Without it, bugs ship uncaught, formatting drifts, and security scans never run. A misconfigured CI that doesn't block merge means it's decorative — tests run but nobody looks. A slow CI discourages small, frequent PRs and leads to large, risky deployments. A CI without branch protection means anyone can push directly to main. The goal is a fast, reliable pipeline that catches problems before they reach users.

### 1. CI Configuration
- Is CI configured? (GitHub Actions, GitLab CI, CircleCI, Jenkins, Travis, Buildkite, Azure Pipelines)
- Is the config in version control? (Not just UI-configured)
- Is it well-structured? (Reusable workflows, DRY, not one massive file)

### 2. Pipeline Stages
- What stages/steps exist? Check for:
  - **Install**: dependency installation with caching
  - **Lint**: code linting, formatting check
  - **Type check**: static type analysis
  - **Unit tests**: fast, isolated tests
  - **Integration tests**: tests with dependencies
  - **Build**: production build step
  - **Security scan**: dependency audit, SAST, secret scanning
  - **E2E tests**: end-to-end testing (if applicable)
  - **Coverage**: coverage reporting
  - **Deploy**: deployment steps (if in same pipeline)
- Are stages ordered logically? (Fast checks first — lint before test, test before build)
- Do stages fail fast? (Don't run expensive steps if linting fails)

### 3. Quality Gates
- Which checks are required to pass before merge?
- Are there branch protection rules? (Required reviews, required checks, no direct push to main)
- Is force-push to main/master blocked?
- Is the merge queue or merge checks configured?
- Are all the right things blocking? (Tests should block, coverage report should not)

### 4. Build Caching
- Are dependencies cached? (node_modules, pip cache, Go modules, Docker layers)
- Are build outputs cached? (Incremental builds, Docker layer caching)
- Is the cache key appropriate? (Busted when lockfile changes)
- Is the cache effective? (Check if it's actually being used — look at cache hit rates)

### 5. Build Artifacts
- Are build artifacts versioned? (Tagged with commit SHA, semantic version)
- Are artifacts stored? (GitHub Releases, S3, Docker registry, npm registry)
- Are artifacts signed or checksummed?
- Are source maps generated but stored separately? (Not deployed publicly)

### 6. Pipeline Speed
- How long does the full pipeline take? (Estimate from config complexity)
- Are independent steps parallelized?
- Is there unnecessary sequential execution?
- Are there optimization opportunities? (Smaller Docker images, better caching, test splitting)

### 7. Pipeline Security
- Are secrets properly referenced? (From CI secret store, not hardcoded in config)
- Are third-party actions/orbs pinned by SHA? (Not just major version tag)
- Are permissions scoped? (Least privilege for CI tokens)
- Do PR pipelines from forks have restricted access? (No secret access)

### 8. Matrix/Multi-Environment Testing
- Does CI test against multiple runtime versions? (Node 18, 20, 22)
- Does CI test against multiple OS? (If relevant)
- Does CI test against multiple dependency versions? (If a library)

## Shallow Mode
Config file checks only — no stage-by-stage analysis:
- Does a CI config file exist? (`.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `.circleci/config.yml`, `buildkite/`)
- What stages are listed? (lint, test, build, deploy, security scan)
- Is there branch protection? (Check for `branch_protection_rules`, required status checks, or similar)
- Is the CI config in version control? (Not just UI-configured)

## Deep Mode (default)
All of Shallow Mode, plus:
- Analyze stage ordering: are fast checks (lint, type-check) before slow ones (integration tests, E2E)? Is there fail-fast behavior?
- Review caching: are dependencies cached with lockfile-based cache keys? Are build outputs cached?
- Check quality gates: which checks are required for merge? Are tests required or just informational?
- Assess pipeline security: are secrets from CI secret store (not hardcoded)? Are third-party actions pinned by SHA? Are fork PR builds restricted from secrets?
- Estimate pipeline speed: is there unnecessary sequential execution? Could independent stages be parallelized?

## Severity Guide
- **CRITICAL**: No CI pipeline configured, CI exists but tests are not run, main/master has no branch protection
- **HIGH**: Tests run but not required for merge, no linting in CI, no dependency caching (slow builds discourage running), secrets hardcoded in CI config
- **MEDIUM**: Stages not ordered for fail-fast, no security scanning in CI, no build caching, pipeline takes >15 minutes with optimization possible
- **LOW**: No matrix testing, artifacts not versioned, no coverage reporting, pipeline could be parallelized better

## Output
Write report to: `vibeguard-reports/skill-reports/ops-ci-pipeline.md`
Follow the output contract at `references/skill-output-contract.md`.
