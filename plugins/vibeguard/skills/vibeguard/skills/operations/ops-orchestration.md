---
name: ops-orchestration
description: Assess container orchestration — K8s/Compose/ECS resource limits, replicas, disruption budgets, security context
---

# Skill: ops-orchestration

## Domain: Operations
## Purpose
Assess container orchestration configuration — Kubernetes, Docker Compose, ECS, or equivalent: resource limits, replicas, disruption budgets, and namespace isolation.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Orchestration configuration determines whether your application survives real-world conditions. No resource limits means one container can starve the entire node. A single replica means one pod crash takes down the service. No PDB means a routine node drain kills all your pods at once. No security context means containers run as root with full capabilities. These settings are the difference between "self-healing" and "self-destructing."

### 1. Resource Management
- **CPU/Memory limits**: are resource requests AND limits set for all containers?
- **Requests vs limits**: are requests realistic for normal operation? Are limits set to prevent runaway usage?
- **Resource ratio**: is the limit-to-request ratio reasonable? (>10x means potential for noisy neighbors)
- **OOMKilled risk**: are memory limits high enough for peak usage?
- **CPU throttling**: are CPU limits causing unnecessary throttling?

### 2. Replica Configuration
- **Replica count**: is `replicas > 1` for production? (Single replica = single point of failure)
- **Horizontal Pod Autoscaler (HPA)**: is autoscaling configured? On what metric? (CPU, memory, custom)
- **Min/max replicas**: are bounds set? (Don't scale to 0 or 1000)
- **Scale-down behavior**: is there a cooldown to prevent flapping?

### 3. Pod Disruption Budgets (PDB)
- Is a PDB configured? (Prevents all pods being killed during maintenance)
- Is `minAvailable` or `maxUnavailable` set appropriately?
- Does the PDB work with the replica count? (PDB blocking with 1 replica = can never drain)

### 4. Affinity & Topology
- **Pod anti-affinity**: are replicas spread across nodes/zones? (Availability)
- **Node affinity**: are pods scheduled on appropriate node types?
- **Topology spread constraints**: is there zone/region balancing?
- **Taints/tolerations**: are they used appropriately?

### 5. Service Configuration
- **Service type**: ClusterIP (internal), LoadBalancer (external), NodePort — appropriate for use case?
- **Ingress**: is ingress configured? TLS termination? Path routing?
- **Service mesh**: is Istio/Linkerd/Consul Connect in use? (mTLS, traffic management)
- **DNS**: are services discovered by DNS? Are there readiness gates?

### 6. Storage
- **Persistent volumes**: are PVCs used for stateful data?
- **Storage class**: is the storage class appropriate? (SSD vs HDD, provisioner)
- **Volume mount permissions**: are permissions correct?
- **Backup of persistent volumes**: is there a backup mechanism? (Velero, volume snapshots)

### 7. Security Context
- **Pod security**: is `runAsNonRoot: true` set?
- **Read-only root filesystem**: `readOnlyRootFilesystem: true`?
- **Capabilities**: are capabilities dropped? (`drop: [ALL]`)
- **Security policies**: Pod Security Standards/Policies configured?
- **Network policies**: are ingress/egress network policies defined? (Zero-trust networking)
- **Service account**: is the default service account avoided? Is token automounting disabled when not needed?

### 8. Namespace Isolation
- Are environments/services in separate namespaces?
- Are resource quotas set per namespace?
- Are network policies enforcing namespace isolation?
- Are RBAC roles scoped to namespaces?

### 9. ConfigMaps & Secrets
- Are application configs in ConfigMaps? (Not hardcoded in pod specs)
- Are secrets in Kubernetes Secrets or an external secret manager? (Sealed Secrets, External Secrets Operator, Vault)
- Are secrets encrypted at rest in etcd?
- Are configs mounted as files or env vars? (Files allow hot-reload)

## How to Assess (by platform)

- **Kubernetes**: Check manifests in k8s/, deploy/, helm/, kustomize/ directories. Check Helm values.yaml, Chart.yaml
- **Docker Compose**: Check `docker-compose.yml` for resource limits, restart policies, networks, volumes
- **AWS ECS**: Check task definitions for resource limits, service configuration, auto-scaling
- **Nomad**: Check job specifications for resources, scaling, constraints
- **Docker Swarm**: Check stack files for deploy configuration

## Shallow Mode
Manifest-level checks only — no ratio analysis:
- Are resource `requests` and `limits` set on all containers? (Search for `resources:` blocks)
- Is `replicas` > 1 for production workloads?
- Is a PDB configured? (Search for `PodDisruptionBudget`)
- Is `runAsNonRoot: true` in the security context?

## Deep Mode (default)
All of Shallow Mode, plus:
- Analyze resource requests vs limits ratios: are limits realistic for peak usage? Is the ratio >10x (noisy neighbor risk)?
- Review autoscaling: is HPA configured? What metric? Are min/max bounds reasonable?
- Check network policies: are ingress/egress policies defined? Can any pod reach any pod (no zero-trust)?
- Verify namespace isolation: are environments/services in separate namespaces with resource quotas and RBAC?
- Review secret management: are secrets in Kubernetes Secrets, Sealed Secrets, or external secret manager? Not in plain text in pod specs?
- Assess storage: are PVCs used for stateful data? Is the storage class appropriate?

## Severity Guide
- **CRITICAL**: No resource limits (container can consume entire node), no security context (running as root, all capabilities), secrets in plain text in pod specs, no network policies (any pod can reach any pod)
- **HIGH**: Single replica in production, no PDB (all pods killed during node drain), no autoscaling for variable load, no namespace isolation
- **MEDIUM**: Resource limits too high/low, no pod anti-affinity (all replicas on one node), no ingress TLS, default service account used
- **LOW**: No topology spread constraints, no Horizontal Pod Autoscaler fine-tuning, ConfigMaps as env vars instead of files, no resource quotas per namespace

## Output
Write report to: `vibeguard-reports/skill-reports/ops-orchestration.md`
Follow the output contract at `references/skill-output-contract.md`.
