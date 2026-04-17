---
name: ops-iac
description: Assess Infrastructure as Code — state management, modularity, environment separation, security, drift detection
---

# Skill: ops-iac

## Domain: Operations
## Purpose
Assess Infrastructure as Code practices — Terraform, CloudFormation, Pulumi, CDK: state management, modularity, environment separation, and drift detection.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Infrastructure managed by hand is infrastructure that can't be reproduced, audited, or recovered. A manual change to a security group is untracked and unreviewable. A state file stored locally means `terraform apply` from two machines can corrupt infrastructure. An IAM policy with `*:*` is one compromised credential away from full account takeover. IaC makes infrastructure reviewable, reproducible, and recoverable — click-ops makes it fragile and opaque.

### 1. IaC Presence & Coverage
- Is infrastructure defined as code? (Not just cloud console click-ops)
- What tool? (Terraform, CloudFormation, Pulumi, CDK, Ansible, Chef, Puppet)
- What's covered? (Compute, networking, databases, storage, DNS, IAM, monitoring)
- What's NOT covered? (Manual resources that should be in IaC)
- Is it the source of truth? (Or is it drift-prone with manual changes)

### 2. State Management (Terraform/Pulumi)
- Where is state stored? (Local file = bad, remote backend = good)
- Is state locking configured? (Prevents concurrent modifications)
- Is state encrypted? (Contains sensitive values)
- Is state access controlled? (Not everyone can read/modify state)
- Are there multiple state files? (One per environment/component = good isolation)

### 3. Modularity
- Is infrastructure organized into modules/stacks? (Not one massive file)
- Are modules reusable across environments?
- Are modules versioned? (Pinned module sources)
- Is there a clear separation of concerns? (Networking, compute, data, monitoring)

### 4. Environment Separation
- Are environments (dev/staging/production) managed separately?
- Is the same IaC code used across environments with different variables? (DRY)
- Are environment differences minimal and explicit?
- Can environments be created/destroyed independently?
- Are production resources isolated from lower environments? (Separate accounts/projects, not just naming conventions)

### 5. Security
- **IAM/permissions**: are they following least privilege? (Not `*` on everything)
- **Sensitive values**: are secrets handled properly? (Vault, AWS Secrets Manager, not plaintext in variables)
- **Network security**: are security groups/firewalls restrictive? (Not 0.0.0.0/0 on everything)
- **Encryption**: are resources encrypted? (RDS encryption, S3 encryption, EBS encryption)
- **Public access**: are resources that should be private actually private? (S3 buckets, databases, admin panels)

### 6. Plan Before Apply
- Is there a plan/preview step before applying changes? (`terraform plan`, `pulumi preview`)
- Is the plan reviewed before apply? (In CI/CD or by a human)
- Are destructive changes flagged? (Resource deletion/replacement highlighted)
- Is there approval required for production changes?

### 7. Drift Detection
- Is there a mechanism to detect drift? (Actual state vs desired state)
- Is drift detection automated? (Regular checks, CI job)
- How is drift handled? (Alert and reconcile, or prevent manual changes)

### 8. IaC Best Practices
- **Version pinning**: are provider/plugin versions pinned?
- **Formatting**: is code formatted consistently? (`terraform fmt`, Prettier for CDK)
- **Validation**: is IaC validated in CI? (`terraform validate`, linting)
- **Documentation**: are resources documented? (Comments, README per module)
- **Tagging**: are resources tagged? (Owner, environment, cost center, project)
- **Cost awareness**: are resource sizes/types reviewed for cost efficiency?

## How to Assess (by tool)

- **Terraform**: Check `.tf` files, `backend` config, `terraform.lock.hcl`, module structure, variable files per environment, `.terraform-version`
- **CloudFormation**: Check template files, nested stacks, parameters, mappings, conditions
- **Pulumi**: Check `Pulumi.yaml`, `Pulumi.<stack>.yaml`, state backend config, program code
- **CDK**: Check `cdk.json`, construct structure, stacks, environments
- **Ansible**: Check playbooks, roles, inventories, vault usage
- **Kubernetes**: Check Helm charts, Kustomize overlays, ArgoCD/Flux configs
- **Elixir/Phoenix**: Check Mix release config in IaC, Elixir/Erlang-specific env vars (`RELEASE_NODE`, `RELEASE_COOKIE`) in IaC, clustering config
- **PHP/Laravel**: Check PHP-FPM/Nginx config in IaC, Laravel-specific env vars in IaC, Redis/database provisioning, `storage/` volume mounts

## Shallow Mode
File existence and config checks only — no policy analysis:
- Do IaC files exist? (`.tf` files, `template.yaml` for CloudFormation, `Pulumi.yaml`, `cdk.json`, Helm charts)
- Is remote state configured? (Search for `backend` config in Terraform, state bucket in Pulumi)
- Are there environment-specific variable files? (`terraform.tfvars`, `Pulumi.<stack>.yaml`)
- Quick security check: search for `*` in IAM policies, `0.0.0.0/0` in security groups, `publicly_accessible = true`

## Deep Mode (default)
All of Shallow Mode, plus:
- Analyze module structure: is IaC organized into reusable modules? Are modules versioned and pinned?
- Review IAM policies for least privilege: are actions and resources scoped narrowly? No `*:*`?
- Check network security: are security groups/firewalls restrictive? Are databases and internal services private?
- Verify encryption: is encryption enabled on all data stores (RDS, S3, EBS, etc.)?
- Check for drift detection: is there a mechanism to detect manual changes? (Terraform plan in CI, drift detection job)
- Review plan-before-apply workflow: is `terraform plan` output reviewed before `apply`? Is there approval for production changes?

## Severity Guide
- **CRITICAL**: No IaC (infrastructure managed by hand), state file in local/public storage, IAM with `*:*` permissions, databases publicly accessible, no encryption on data stores
- **HIGH**: No remote state locking, secrets in plaintext in IaC, no environment separation, no plan-before-apply, security groups open to 0.0.0.0/0
- **MEDIUM**: No drift detection, no module versioning, inconsistent tagging, no IaC validation in CI, state not encrypted
- **LOW**: No documentation per module, formatting inconsistent, provider versions not pinned, no cost optimization review

## Output
Write report to: `vibeguard-reports/skill-reports/ops-iac.md`
Follow the output contract at `references/skill-output-contract.md`.
