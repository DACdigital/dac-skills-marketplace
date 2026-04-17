---
name: rel-concurrency
description: Assess concurrency safety — race conditions, deadlocks, connection pool sizing, thread safety, async correctness
---

# Skill: rel-concurrency

## Domain: Reliability
## Purpose
Assess concurrency safety — race conditions, deadlocks, connection pool sizing, thread safety, async correctness, and shared state management.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Concurrency bugs are the hardest class of production issues — they're intermittent, load-dependent, and nearly impossible to reproduce locally. A race condition on a payment endpoint can double-charge customers. A connection pool exhaustion takes down the entire app, not just slow queries. A lost update on concurrent writes silently corrupts data. These bugs pass all tests because tests run single-threaded on a single instance.

### 1. Race Conditions
- **Check-then-act patterns**: read a value, make a decision, write — without atomicity (e.g., "if not exists, create")
- **Lost updates**: two concurrent requests reading and updating the same record (optimistic locking? versioning?)
- **Counter increments**: `counter = counter + 1` without atomic operations or transactions
- **File system races**: checking if file exists then creating it (TOCTOU — time of check to time of use)
- **Shared in-memory state**: mutable global variables accessed by multiple requests/threads

### 2. Database Concurrency
- **Transaction isolation levels**: what level is configured? Is it appropriate?
- **Optimistic locking**: is there a version column or updated_at check for concurrent updates?
- **Pessimistic locking**: are SELECT FOR UPDATE or advisory locks used where needed?
- **Deadlock potential**: are resources locked in inconsistent order across different operations?
- **Long transactions**: are transactions held open longer than necessary? (Lock contention)

### 3. Connection Pool Sizing
- **Database pool**: is max connections configured? Is it appropriate for the concurrency level?
- **Redis pool**: connection pool configured?
- **HTTP client pool**: connection pooling for outbound HTTP calls?
- **Pool exhaustion handling**: what happens when the pool is full? (Block? Fail? Queue?)
- **Pool-to-instance ratio**: in a scaled environment, do N instances × pool_size exceed the database's max_connections?

### 4. Thread/Worker Safety
- In multi-threaded runtimes (Java, Go, .NET, Python with threads):
  - Are shared data structures thread-safe? (ConcurrentHashMap, sync.Map, Mutex)
  - Are critical sections properly synchronized?
  - Are atomic operations used for simple counters/flags?
- In single-threaded event loops (Node.js):
  - Are there CPU-intensive operations blocking the event loop?
  - Are Worker threads used for heavy computation?
  - Is `cluster` mode or PM2 cluster used for multi-core utilization?

### 5. Async/Await Correctness
- **Unhandled promises**: async operations without error handling
- **Sequential where parallel**: `await a; await b;` when `a` and `b` are independent (should be `Promise.all`)
- **Parallel where sequential**: `Promise.all` on operations that need ordering or transaction safety
- **Resource leaks**: async operations that acquire resources (connections, file handles) but don't release on error
- **Cancellation**: are long-running async operations cancellable? (Context cancellation in Go, AbortController in JS)

### 6. Queue Processing Guarantees
- **At-least-once vs exactly-once**: what delivery guarantee is configured?
- **Idempotent consumers**: are message handlers idempotent? (Safe to process the same message twice)
- **Ordering guarantees**: are messages processed in order when it matters? (Partition keys, FIFO queues)
- **Concurrent consumers**: are multiple consumers safe? (Message visibility timeout, acknowledgment)

### 7. Caching Concurrency
- **Cache stampede**: when a popular cache entry expires, do all requests hit the backend simultaneously?
- **Stale-while-revalidate**: is there a pattern to serve stale data while refreshing?
- **Distributed locks**: for cache population, is there a lock to prevent stampede?
- **Cache invalidation races**: can a cache entry be set with stale data after an update?

### 8. Distributed System Concerns (if applicable)
- **Leader election**: is there a leader election mechanism for singleton operations?
- **Distributed locking**: are distributed locks used correctly? (Redlock, Zookeeper, etcd)
- **Idempotency keys**: for cross-service operations, are idempotency keys used?
- **Event ordering**: in event-driven systems, can out-of-order events cause inconsistency?

## How to Assess (by stack)

- **Node.js**: Check for event loop blocking, `Promise.all` vs sequential awaits, cluster mode, shared state in memory, database pool config
- **Python**: Check for GIL implications, `asyncio` patterns, thread safety of shared state, SQLAlchemy pool config, Celery concurrency
- **Go**: Check goroutine safety, mutex usage, channel patterns, `sync.Pool`, `database/sql` pool config, race detector (`go test -race`)
- **Ruby**: Check thread safety in multi-threaded servers (Puma), ActiveRecord connection pool, Sidekiq concurrency config
- **Java/Spring**: Check `synchronized`, `ConcurrentHashMap`, `@Transactional` isolation, HikariCP pool config, `@Async` usage, `CompletableFuture`
- **.NET**: Check `lock`, `ConcurrentDictionary`, `SemaphoreSlim`, `DbContext` lifetime, async/await patterns, connection pool config
- **Elixir/Phoenix**: Check `GenServer`/`Agent` state management, Ecto connection pool in Repo config, `Task` and `Task.Supervisor` usage, distributed locks via Redis/`:global`
- **PHP/Laravel**: Check PHP-FPM shared-nothing model, database-level locks, `Cache::lock()` for distributed locking, queue worker concurrency config
- **Rust**: Check `Arc<Mutex<T>>`, `tokio` async patterns, channel usage, connection pool config

## Shallow Mode
Config checks only — no source code tracing:
- Check database connection pool configuration (pool size, max connections, timeouts)
- Check for obvious global/static mutable state in entry point or config files
- Is a concurrency-aware library present? (connection pooler, distributed lock, etc.)
- Check queue consumer concurrency config (prefetch, worker count)

## Deep Mode (default)
All of Shallow Mode, plus:
- Search for shared mutable state: global variables, static fields, module-level dicts/maps that store request-scoped data
- Trace check-then-act patterns: search for "if not exists, create" logic without transactions or atomic operations
- Analyze transaction isolation and locking: are concurrent writes protected by optimistic locking (version column) or pessimistic locking (SELECT FOR UPDATE)?
- Calculate pool math: (pool size per instance) x (expected instances) vs database `max_connections`
- Review async code: search for sequential awaits that should be parallel, fire-and-forget without error handling, resource leaks in error paths
- Check queue processing: are consumers idempotent? Is ordering preserved when it matters?

## Severity Guide
- **CRITICAL**: Race conditions on financial/data-critical operations, no database transaction for multi-step writes, connection pool not configured (unlimited connections), deadlock-prone locking patterns
- **HIGH**: Lost update potential on concurrent writes, no optimistic locking, CPU-blocking event loop, pool size exceeding database limits, no idempotent message processing
- **MEDIUM**: Sequential awaits where parallel is safe, no cache stampede protection, long-held transactions, sub-optimal pool sizing
- **LOW**: No connection pool metrics, no distributed locking for cache population, no race detector in CI, missing cancellation support

## Output
Write report to: `vibeguard-reports/skill-reports/rel-concurrency.md`
Follow the output contract at `references/skill-output-contract.md`.
