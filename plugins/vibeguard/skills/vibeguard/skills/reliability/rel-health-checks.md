---
name: rel-health-checks
description: Assess health checks — liveness/readiness probes, dependency health verification, graceful shutdown
---

# Skill: rel-health-checks

## Domain: Reliability
## Purpose
Assess health check implementation — liveness/readiness probes, dependency health verification, and graceful shutdown handling.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Without health checks, orchestrators and load balancers are blind — they send traffic to broken instances and leave crashed ones running. Without graceful shutdown, every deployment drops in-flight requests. A liveness check that includes database verification causes cascading restarts when the DB is slow (killing healthy processes that just need to wait). These are cheap to implement and prevent entire categories of deployment and scaling failures.

This skill covers health check *endpoints and probes*. For runtime dependency *connection health and failure handling* (pool exhaustion, DNS, socket config), see `rel-dependency-health`.

### 1. Health Endpoints
- Does a health/status endpoint exist? (`/health`, `/healthz`, `/readyz`, `/livez`, `/status`, `/ping`)
- Is it unauthenticated? (Health checks from load balancers/orchestrators need to reach it)
- Does it return a clear status? (200 for healthy, 503 for unhealthy, structured response)
- Is it lightweight? (No expensive operations — it's called frequently)

### 2. Liveness vs Readiness Separation
- **Liveness**: "Is the process alive?" — should return 200 if the process is running and not deadlocked
- **Readiness**: "Can it handle traffic?" — should check that all dependencies (DB, cache, required services) are reachable
- Are these separated? (Important for Kubernetes, useful for any orchestrator)
- Does the liveness check avoid dependency checks? (A down database shouldn't trigger a container restart — that makes things worse)

### 3. Dependency Health Checks
- Does the readiness check verify:
  - Database connection is alive? (Simple query like `SELECT 1`)
  - Cache (Redis/Memcached) is reachable?
  - Required external services are responding?
  - Message queue connection is active?
  - File storage is accessible?
- Are dependency checks timeout-bounded? (Don't hang forever waiting for a dead service)
- Is each dependency's status reported individually? (Not just "unhealthy" — which dependency?)

### 4. Startup Probes
- For applications with slow startup (migrations, cache warming, model loading):
  - Is there a startup probe separate from liveness?
  - Is the startup timeout sufficient?
  - Does the application signal when it's ready? (Not just "process started")

### 5. Graceful Shutdown
- Does the application handle `SIGTERM`/`SIGINT`?
- On shutdown, does it:
  - Stop accepting new requests/connections?
  - Complete in-flight requests?
  - Close database connections cleanly?
  - Flush logs/metrics?
  - Drain message queue consumers?
  - Deregister from service discovery?
- Is there a shutdown timeout? (Don't hang forever — eventually force exit)
- Is the shutdown order correct? (Stop accepting traffic → drain → close connections → exit)

### 6. Health Check in Orchestration
- If Kubernetes: are `livenessProbe`, `readinessProbe`, `startupProbe` configured in pod specs?
- Are probe parameters reasonable? (`initialDelaySeconds`, `periodSeconds`, `timeoutSeconds`, `failureThreshold`)
- If Docker Compose: is `healthcheck` configured?
- If using a load balancer: are health checks configured?

### 7. Deep Health / Diagnostic Endpoints
- Is there a detailed health endpoint for operators? (Shows individual component status, version, uptime)
- Is it auth-protected? (Contains sensitive operational data)
- Does it show build info? (Version, commit hash, build time)

## How to Assess (by stack)

- **Node.js/Express**: Check for `/health` route, `process.on('SIGTERM')`, `server.close()`, `@godaddy/terminus`, `lightship`
- **Python/Django**: Check for health check URL, `django-health-check`, signal handlers, ASGI lifespan
- **Python/FastAPI**: Check for health endpoint, `@app.on_event("shutdown")`, lifespan context manager
- **Go**: Check for health handler, `os/signal.Notify`, `http.Server.Shutdown()`, context cancellation
- **Ruby/Rails**: Check for health route, `at_exit`, Puma/Unicorn graceful shutdown config
- **Java/Spring**: Check Spring Actuator (`/actuator/health`), `@PreDestroy`, `SmartLifecycle`, health indicators
- **.NET**: Check `IHealthCheck`, `MapHealthChecks`, `IHostApplicationLifetime`, `IHostedService.StopAsync`
- **Elixir/Phoenix**: Check Phoenix health endpoint route, `Ecto.Repo` ping for DB health, graceful shutdown via SIGTERM in Mix releases, supervision tree restart strategy
- **PHP/Laravel**: Check health check route, `Illuminate\Health` checks, Horizon health, `php artisan down`/`up`, graceful shutdown with PHP-FPM
- **Kubernetes**: Check deployment YAML for probe configuration

## Shallow Mode
Route and config checks only — no implementation tracing:
- Does a health/status endpoint exist? (Search routes for `/health`, `/healthz`, `/readyz`, `/livez`, `/status`)
- Is `SIGTERM`/`SIGINT` handled in the application entry point?
- If Kubernetes: are `livenessProbe`/`readinessProbe` configured in pod specs?
- If Docker Compose: is `healthcheck` configured?
- Is a health check library present? (`terminus`, `django-health-check`, Spring Actuator, etc.)

## Deep Mode (default)
All of Shallow Mode, plus:
- Read the health endpoint implementation: what does it actually check? Does it distinguish liveness from readiness?
- Verify liveness does NOT include dependency checks (a slow DB should not trigger restarts)
- Read the shutdown handler: does it stop accepting traffic → drain in-flight → close connections → exit?
- Check dependency health checks for timeout bounds (a dead service check shouldn't hang)
- Verify probe parameters in orchestration config: are `initialDelaySeconds`, `timeoutSeconds`, `failureThreshold` reasonable for the app's startup time?

## Severity Guide
- **CRITICAL**: No health endpoint (orchestrator can't determine if the app is alive), no graceful shutdown (in-flight requests dropped, data corruption risk)
- **HIGH**: No readiness check (traffic sent to unready instances), liveness check includes dependency checks (cascading restarts), no shutdown timeout
- **MEDIUM**: Health check doesn't verify critical dependencies, no startup probe for slow-starting apps, no individual component status
- **LOW**: No build info in health endpoint, no deep diagnostic endpoint, health check not optimized for performance

## Output
Write report to: `vibeguard-reports/skill-reports/rel-health-checks.md`
Follow the output contract at `references/skill-output-contract.md`.
