---
name: ops-cd-pipeline
description: Assess deployment automation — strategies, rollback capability, environment promotion, post-deploy verification
---

# Skill: ops-cd-pipeline

## Domain: Operations
## Purpose
Assess deployment automation — deployment strategies, rollback capability, environment promotion, and post-deploy verification.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Deployment is where code meets reality. Manual deployments are slow, error-prone, and stressful — every deploy is a risky event instead of a routine operation. No rollback capability means a bad deploy requires a fix-forward under pressure. No post-deploy verification means broken deploys go unnoticed until users report them. The goal is to make deploys boring: automated, fast, reversible, and verified.

### 1. Deployment Automation
- Is deployment automated? (Push-to-deploy, CI/CD pipeline, GitOps)
- Or is it manual? (SSH and run commands, manual uploads)
- Is there a deployment command or script? (Is it documented?)
- How is deployment triggered? (Merge to main, tag, manual approval, schedule)

### 2. Deployment Strategy
- What strategy is used?
  - **Rolling update**: gradually replacing instances (standard K8s, ECS)
  - **Blue/green**: full parallel environment swap
  - **Canary**: gradual traffic shift to new version
  - **Recreate**: stop old, start new (downtime)
  - **Feature flags**: deploy code dark, enable via flags
- Is there zero-downtime deployment? (No user-visible interruption)
- Are database migrations compatible with rolling deployments? (Old code can run with new schema)

### 3. Rollback Capability
- Can the previous version be restored quickly?
- Is rollback automated or manual?
- How long does rollback take? (Should be minutes, not hours)
- Is rollback tested? (Has it ever been used successfully?)
- Are database migrations reversible to support rollback?
- For containers: are previous image versions retained?

### 4. Environment Promotion
- Is there a promotion path? (dev → staging → production)
- Is the same artifact deployed to all environments? (Build once, deploy many — not rebuild per environment)
- Are environment differences configuration-only? (Same code, different config)
- Is there a staging environment that mirrors production?
- Is there a preview/PR environment? (Ephemeral environments for PRs)

### 5. Approval Gates
- Is there a manual approval step before production deployment?
- Who can approve? (Is it documented?)
- Is there an audit trail of deployments? (Who deployed what, when)
- Are there deployment windows? (Avoid Friday deploys, maintenance windows)

### 6. Post-Deploy Verification
- Are there automated checks after deployment?
  - Smoke tests (basic functionality verification)
  - Health check verification
  - Canary metrics monitoring
  - Synthetic monitoring
- Is there automatic rollback on failed checks?
- Are deployment notifications sent? (Slack, email, PagerDuty)

### 7. Deployment Configuration
- Are deployment configs in version control?
- Are deployment-specific values externalized? (Not hardcoded in deployment scripts)
- Is there a deployment manifest? (What services, what versions, what configs)

### 8. GitOps Signals
- Is there a GitOps workflow? (ArgoCD, Flux, Spinnaker)
- Is the desired state declared in a repository?
- Is drift detection enabled?
- Are manual changes to production prevented?

## Shallow Mode
Config checks only — no strategy analysis:
- Is there a deployment configuration? (CI/CD deploy steps, GitOps configs, deployment scripts)
- Is deployment automated or manual? (Search for deploy commands, SSH-based scripts)
- Is there a rollback mechanism? (Previous container images retained, `git revert` workflow, ArgoCD rollback)
- Is there a staging environment? (Evidence of multi-environment promotion)

## Deep Mode (default)
All of Shallow Mode, plus:
- Analyze deployment strategy: is it rolling, blue/green, canary, or recreate? Is there zero-downtime?
- Check rollback: how fast can the previous version be restored? Is it automated or manual? Are previous artifacts/images retained?
- Verify migration compatibility: can old code run with new schema during rolling deploys? Can new code run with old schema during rollback?
- Check post-deploy verification: are there automated smoke tests, health check waits, or canary metrics checks after deploy?
- Review approval gates: is there manual approval before production? Is there an audit trail of who deployed what?

## Severity Guide
- **CRITICAL**: No automated deployment (manual SSH-based), no rollback capability, deployment requires significant downtime
- **HIGH**: No staging environment, no post-deploy verification, rollback untested/undocumented, database migrations incompatible with rollback
- **MEDIUM**: No approval gates for production, no deployment notifications, no preview environments, recreate strategy (downtime)
- **LOW**: No canary deployments, no GitOps, no deployment windows, no audit trail, no automatic rollback

## Output
Write report to: `vibeguard-reports/skill-reports/ops-cd-pipeline.md`
Follow the output contract at `references/skill-output-contract.md`.
