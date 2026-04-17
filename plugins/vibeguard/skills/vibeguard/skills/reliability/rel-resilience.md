---
name: rel-resilience
description: Assess resilience patterns — retries, timeouts, circuit breakers, bulkheads, fallback strategies
---

# Skill: rel-resilience

## Domain: Reliability
## Purpose
Assess resilience patterns — retries, timeouts, circuit breakers, bulkheads, and fallback strategies for external call failures.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Without resilience patterns, one slow dependency takes down the entire application. A missing timeout means a thread/connection hangs forever, eventually exhausting the pool. Retries without backoff can DDoS a recovering service. No circuit breaker means every request to a dead service waits for a timeout before failing. These patterns are the difference between "Service X is degraded" and "Everything is down because Service X is degraded."

### Scope Boundary
This skill covers resilience *patterns* (retry, timeout, circuit breaker, fallback). For error *catching and classification*, see `rel-error-handling`. For connection *pool configuration and health*, see `rel-dependency-health`.

### 1. Timeouts
- Do ALL external calls have explicit timeouts? (HTTP requests, database queries, cache operations, queue operations)
- Are default timeouts overridden with appropriate values? (Framework defaults are often too high — 30s, 60s, or infinite)
- Are timeouts proportional to the operation? (Fast reads: 2-5s, writes: 5-10s, batch operations: longer with progress tracking)
- Are connection timeouts separate from read timeouts?
- What happens when a timeout fires? (Graceful failure, not a crash)

### 2. Retry Logic
- Are retries implemented for transient failures? (Network errors, 503s, 429s, connection resets)
- Is there exponential backoff? (Not just fixed-interval retries)
- Is there jitter? (Randomized backoff to prevent thundering herd)
- Is there a max retry count? (Not infinite retries)
- Are retries idempotent? (Is it safe to retry the operation? PUT/DELETE yes, POST maybe not)
- Are non-retryable errors excluded? (Don't retry 4xx client errors, auth failures, validation errors)

### 3. Circuit Breakers
- For critical external dependencies, is there a circuit breaker pattern?
- Circuit breaker states: closed (normal) → open (failing, fast-fail) → half-open (testing recovery)
- What triggers the circuit to open? (Error rate threshold, consecutive failures, latency threshold)
- What happens when the circuit is open? (Fallback response, cached data, degraded mode)
- Is the circuit breaker monitored? (Metrics on state changes)

### 4. Bulkhead Isolation
- Are external dependencies isolated from each other? (One slow service shouldn't consume all threads/connections)
- Connection pool separation per service
- Thread pool isolation (Java/JVM)
- Semaphore-based concurrency limits per dependency

### 5. Fallback Strategies
- When a dependency fails, is there a fallback?
  - **Cache fallback**: serve stale data from cache when primary source is down
  - **Default values**: return sensible defaults when a config/feature service is unavailable
  - **Degraded mode**: disable non-critical features rather than failing entirely
  - **Queue for retry**: write to a queue for later processing if immediate processing fails
- Are fallbacks tested? (Easy to have fallback code that doesn't actually work)

### 6. Dead Letter Queues & Failure Handling
- For message/event processing: what happens when a message can't be processed?
- Is there a dead letter queue (DLQ) for failed messages?
- Are DLQ messages monitored and alerted on?
- Is there a mechanism to replay/retry DLQ messages?
- Is there a maximum delivery attempt count before DLQ?

### 7. Cascading Failure Prevention
- Can a failure in one component cascade to others?
- Are there circuit breakers at service boundaries?
- Is back-pressure implemented? (When overwhelmed, push back on callers rather than accepting and failing)
- Rate limiting on outbound calls to protect downstream services?

## How to Assess (by stack)

- **Node.js**: Check `axios`/`got`/`node-fetch` timeout config, retry libraries (`p-retry`, `axios-retry`), `opossum` circuit breaker, `cockatiel`
- **Python**: Check `requests`/`httpx` timeout config, `tenacity` for retries, `pybreaker` for circuit breakers, `celery` retry config
- **Go**: Check `http.Client.Timeout`, context deadlines, `go-retryablehttp`, custom retry logic, circuit breaker packages
- **Ruby**: Check `Net::HTTP` timeouts, `retryable` gem, `circuitbox`, Sidekiq retry config
- **Java/Spring**: Check `Resilience4j` (circuit breaker, retry, rate limiter, bulkhead), Spring Retry, `HttpClient` timeouts, Hystrix (deprecated but still seen)
- **.NET**: Check `Polly` (retry, circuit breaker, timeout, bulkhead), `HttpClient` timeout config, `IHttpClientFactory`
- **Elixir/Phoenix**: Check `HTTPoison`/`Finch`/`Req` timeout config, `Tesla` middleware, supervisor restart strategies as circuit breakers, `ElixirRetry` for retries
- **PHP/Laravel**: Check Guzzle timeout config, `retry()` helper, circuit breaker packages, queue retry/backoff config, `failed_jobs` handling
- **Rust**: Check `reqwest` timeout, `backoff` crate, `governor` for rate limiting

## Shallow Mode
Config and dependency checks only — no call-site tracing:
- Is a resilience library present? (Resilience4j, Polly, opossum, cockatiel, tenacity, pybreaker, etc.)
- Check HTTP client config for explicit timeouts (not relying on defaults)
- Check database client config for query timeout / statement timeout
- Look for retry configuration in queue/job processor config

## Deep Mode (default)
All of Shallow Mode, plus:
- Map every external call site (HTTP, DB, cache, queue, external API) and verify each has an explicit timeout
- Analyze retry logic at each call site: is there backoff? Jitter? Max retries? Are non-retryable errors excluded? Is the operation idempotent?
- Trace circuit breaker configuration: what triggers open? What's the fallback? Is there monitoring?
- Check message queue failure handling: DLQ config, max delivery attempts, poison message handling
- Assess cascading failure potential: if Service A is slow, does it consume all connections/threads and block access to Services B and C?

## Severity Guide
- **CRITICAL**: No timeouts on external calls (can hang forever, exhaust resources), infinite retries without backoff (can DDoS a recovering service), no failure handling on data-write operations
- **HIGH**: No circuit breakers on critical dependencies, no fallback strategy (single point of failure), no DLQ for message processing, retries on non-idempotent operations
- **MEDIUM**: Missing timeouts on some external calls, fixed-interval retries without backoff, no jitter on retries, circuit breaker not monitored
- **LOW**: No bulkhead isolation, fallback strategies not tested, no back-pressure implementation, retry count too high

## Output
Write report to: `vibeguard-reports/skill-reports/rel-resilience.md`
Follow the output contract at `references/skill-output-contract.md`.
