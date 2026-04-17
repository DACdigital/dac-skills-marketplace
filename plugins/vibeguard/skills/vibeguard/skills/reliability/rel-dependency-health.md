---
name: rel-dependency-health
description: Assess external dependency resilience — connection pools, DNS, socket config, API/DB/cache/queue failure handling
---

# Skill: rel-dependency-health

## Domain: Reliability
## Purpose
Assess how the application handles external service failures — connection pool exhaustion, DNS resolution, socket configuration, and dependency degradation patterns.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

External dependencies fail. Databases go down, APIs return 500s, Redis runs out of memory, DNS stops resolving. The question isn't whether it happens — it's whether your application handles it gracefully or cascades into a full outage. A missing connection timeout means threads hang forever. A connection leak under error conditions slowly exhausts the pool until the app freezes. Properly configured connection pools, timeouts, and failure handling are what keep a partial outage from becoming a total one.

### Scope Boundary
This skill covers connection configuration, pool health, and failure handling for external dependencies. For retry/circuit-breaker *patterns*, see `rel-resilience`. For error *catching and classification*, see `rel-error-handling`.

### 1. Connection Pool Exhaustion Handling
- What happens when all database connections are in use? (Queued? Rejected? Timeout?)
- Is there a connection acquisition timeout? (Not hanging forever)
- Are connections properly returned to the pool? (No connection leaks on error paths)
- Are pools monitored? (Metrics on active/idle/waiting connections)
- Is there pool health management? (Validation queries, max connection lifetime, idle timeout)

### 2. DNS Resolution
- Is DNS cached appropriately? (Not caching too long — stale endpoints; not too short — high DNS load)
- For cloud/container environments: are DNS TTLs respected? (Services move, IPs change)
- Is DNS resolution failure handled? (Retry, fallback, clear error)
- For service discovery: is the discovery mechanism resilient? (Consul, etcd, K8s DNS)

### 3. Socket Configuration
- **TCP keepalive**: enabled on long-lived connections? (Detects dead peers)
- **Connection timeouts**: configured for all outbound connections?
- **Read/write timeouts**: separate from connection timeouts?
- **Socket reuse**: `SO_REUSEADDR`/`SO_REUSEPORT` for high-throughput servers?
- **Backlog size**: `listen()` backlog appropriate for expected connection rate?

### 4. External API Resilience
- For each external API dependency identified by Scout:
  - Is there a timeout configured?
  - Is there retry logic with backoff?
  - Is there a circuit breaker?
  - Is there a fallback or degraded mode?
  - Is the API client configured with connection pooling/keep-alive?
  - Are API rate limits from the provider handled? (429 responses, Retry-After header)

### 5. Database Connection Resilience
- **Connection retry**: does the app retry on connection failure or crash?
- **Read replicas**: are read operations directed to replicas? Is failover handled?
- **Connection draining**: during deployment, are connections gracefully drained?
- **Prepared statement leaks**: are prepared statements properly closed?
- **Transaction timeout**: are there safeguards against hung transactions?

### 6. Cache Dependency
- What happens when the cache layer (Redis/Memcached) is unavailable?
  - Does the app crash?
  - Does it fall back to the primary data source?
  - Does it degrade gracefully (slower but functional)?
- Is there a local/in-process cache as a fallback?
- Are cache connection failures distinguished from cache misses?

### 7. Message Queue Dependency
- What happens when the message broker is unavailable?
- Are there reconnection/retry mechanisms?
- Are messages buffered locally when the broker is down?
- Is there visibility timeout tuning? (Messages reappearing if processing is slow)
- Are consumer failures handled? (Nack, requeue, DLQ)

### 8. HTTP Client Configuration
- Are HTTP clients reusing connections? (Connection pooling, keep-alive)
- Are redirect limits configured? (Prevent infinite redirect loops)
- Are response size limits configured? (Prevent memory exhaustion from large responses)
- Is TLS verification enabled? (Not disabled for convenience)
- Are proxy settings handled? (If the deployment environment requires it)

## How to Assess (by stack)

- **Node.js**: Check `pg`/`mysql2` pool config, `axios`/`got`/`node-fetch` settings, `ioredis` connection options, `http.Agent` config
- **Python**: Check SQLAlchemy pool config (`pool_size`, `max_overflow`, `pool_timeout`, `pool_recycle`), `requests.Session`/`httpx.Client` config, `redis-py` connection pool
- **Go**: Check `database/sql` (`SetMaxOpenConns`, `SetMaxIdleConns`, `SetConnMaxLifetime`), `http.Client` transport config, context deadlines
- **Ruby**: Check ActiveRecord pool config, Faraday/HTTParty settings, Redis connection config, Sidekiq Redis pool
- **Java/Spring**: Check HikariCP config, RestTemplate/WebClient settings, Lettuce/Jedis pool config, Apache HttpClient config
- **.NET**: Check EF Core connection pooling, `HttpClient`/`IHttpClientFactory` config, StackExchange.Redis connection config
- **Elixir/Phoenix**: Check `Finch`/`HTTPoison` connection pool config, Ecto Repo pool settings, health checks in supervision tree, external service timeouts
- **PHP/Laravel**: Check Guzzle connection config, `config/database.php` pool settings, Redis connection health, queue connection retry config
- **Rust**: Check `sqlx`/`diesel` pool config, `reqwest` client settings, `deadpool` pool config

## Shallow Mode
Config checks only — no connection lifecycle tracing:
- Check database pool config: `pool_size`, `max_overflow`/`max_connections`, `pool_timeout`, `pool_recycle`/`max_lifetime`
- Check HTTP client config: are explicit timeouts set? (Connect timeout + read timeout)
- Check cache client config: connection timeout, reconnect settings
- Check queue client config: connection retry, heartbeat interval

## Deep Mode (default)
All of Shallow Mode, plus:
- Trace connection lifecycle for each external dependency: acquire → use → return (or leak on error path)
- Verify pool exhaustion behavior: what happens when all connections are in use? (Search for acquisition timeout config)
- Check every external API integration: is there timeout + error handling + connection reuse?
- Trace cache failure paths: does the app crash, hang, or degrade gracefully when cache is unavailable?
- Review message queue consumer config: reconnection, visibility timeout, prefetch size
- Check for connection leaks: are connections returned to pool in `finally`/`ensure`/`defer` blocks, not just the happy path?

## Severity Guide
- **CRITICAL**: No connection pool configured (unlimited connections to DB), no timeouts on external calls, TLS verification disabled in production, app crashes when cache is unavailable
- **HIGH**: Connection leaks on error paths, no connection acquisition timeout, no retry on database connection failure, no handling of rate limit responses
- **MEDIUM**: Sub-optimal pool sizing, no connection health checks, no keep-alive on HTTP clients, no DNS TTL awareness, no redirect limits
- **LOW**: No pool metrics/monitoring, no local cache fallback, no prepared statement management, missing socket keepalive

## Output
Write report to: `vibeguard-reports/skill-reports/rel-dependency-health.md`
Follow the output contract at `references/skill-output-contract.md`.
