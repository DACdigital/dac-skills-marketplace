---
name: rel-horizontal-scaling
description: Assess horizontal scaling readiness — in-memory state, real-time sync, filesystem deps, scheduled jobs, startup races
---

# Skill: rel-horizontal-scaling

## Domain: Reliability
## Purpose
Assess horizontal scaling readiness — in-memory state, real-time event synchronization, filesystem dependencies, scheduled job duplication, and startup race conditions across multiple replicas.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Horizontal scaling breaks every assumption about local state. Sessions in memory mean users lose their login on the next request (different replica). In-memory caches mean users see different data depending on which instance they hit. Scheduled jobs without distributed locking run N times on N replicas. WebSocket events sent to one instance never reach clients on others. These bugs don't exist with one replica and appear instantly with two.

### 1. Real-Time Communication Synchronization
- **WebSocket connections**: are WebSocket handlers implemented? Is there a mechanism for broadcasting events across instances? (Redis Pub/Sub, message broker, shared event bus)
- **Server-Sent Events (SSE)**: are SSE endpoints present? Can events reach clients connected to different replicas?
- **Long-polling**: are there long-polling endpoints? Is shared state required for response consistency?
- **Sticky sessions**: is session affinity configured at the load balancer? (Temporary workaround, not a solution)
- **Without synchronization**: an event sent to instance A won't reach a client connected to instance B

### 2. In-Memory Local State
- **Global mutable state**: variables, singletons, or module-level objects storing application data (user sessions, feature flags, config caches)
- **In-memory caches**: `Map`, `Object`, `dict`, `HashMap` used as cache without external backing store (Redis, Memcached)
- **Session storage**: sessions stored in process memory instead of external store (Redis, database, cookie-based)
- **Rate limiters and counters**: request counters, rate limiters, or throttles using in-memory storage (each replica counts independently)
- **In-memory queues and buffers**: event buffers, batch processors, or write-behind caches that accumulate in process memory
- **Each replica will have different state**: users see inconsistent behavior depending on which instance handles their request

### 3. Filesystem Dependencies
- **File uploads**: are uploads written to local disk? (Should use object storage — S3, GCS, Azure Blob)
- **Temporary files**: are temp files created and later read by a different request? (No guarantee same replica handles both)
- **Log files**: is the application writing logs to local files that are expected to be aggregated? (Use stdout/stderr or centralized logging)
- **Generated assets**: are files generated at runtime and served from local disk? (Build artifacts, reports, exports)
- **Files written on one replica won't be visible on others**

### 4. Scheduled Jobs and Cron Tasks
- **Application-level cron**: periodic tasks triggered by the framework or in-process scheduler (node-cron, APScheduler, Spring @Scheduled, whenever gem, Go cron libraries)
- **Duplicate execution**: without distributed locking, every replica will execute the same job at the same time
- **Leader election**: is there a mechanism to ensure only one replica runs scheduled work? (Database advisory locks, Redis locks, dedicated worker process, external scheduler)
- **Idempotency**: if a job does run on multiple replicas, is the work idempotent and safe?

### 5. Startup and Initialization Logic
- **Database migrations at startup**: does the application run migrations when it boots? (Race condition when multiple replicas start simultaneously)
- **Seed data insertion**: does startup logic insert initial records? (Duplicate key errors or duplicate data)
- **Cache warming**: does the application warm caches at startup? (Harmless duplication but wasted resources — watch for non-idempotent writes)
- **Lock acquisition**: do startup routines acquire locks or resources that could conflict across replicas?
- **Schema changes under concurrent traffic**: are migrations safe to run while other replicas are serving requests? (Additive changes are safe, destructive changes are not)

## How to Assess (by stack)

- **Node.js**: Check for `ws`/`socket.io` without Redis adapter, global variables, `node-cron`/`agenda` without locking, `multer` disk storage, `express-session` with default MemoryStore
- **Python**: Check for Flask/Django global state, `APScheduler` without distributed backend, `celery-beat` single-instance requirement, local file storage, in-memory `lru_cache` for mutable data
- **Go**: Check for package-level `var` with mutable state, `sync.Map` as application cache, goroutine-based schedulers without coordination, local file writes
- **Ruby**: Check for class variables (`@@`), Rails global state, `whenever`/`rufus-scheduler` without locking, `ActiveStorage` local disk service, `Rails.cache` with `:memory_store`
- **Java/Spring**: Check for `static` mutable fields, `@Scheduled` without `ShedLock`/distributed lock, `HttpSession` without session replication, local file storage, Spring Cache with `ConcurrentMapCacheManager`
- **.NET**: Check for `static` mutable state, `IMemoryCache` without distributed backing, `IHostedService` background tasks without coordination, local file uploads, in-memory session state
- **Elixir/Phoenix**: Check for local `GenServer`/`Agent` state without distributed backing, `Phoenix.PubSub` configured for multi-node (`Phoenix.PubSub.PG2` or Redis adapter), `:ets` tables as local cache, `Oban` without `unique` constraints or `Oban.Pro` for single-node scheduling, `Phoenix.Channel` presence tracking across nodes, migrations in `Application.start/2`
- **PHP/Laravel**: Check for `file` or `array` session/cache driver (should be `redis`/`memcached`/`database`), local file storage in `storage/app` without S3/cloud disk, Task Scheduling without `onOneServer()`, `artisan migrate` in deployment without locking, Broadcasting without Redis/Pusher driver
- **Rust**: Check for `lazy_static`/`once_cell` with mutable state, in-process schedulers, local file system dependencies, `tokio` tasks acting as singleton workers

## Shallow Mode
Config and dependency checks only — no state tracing:
- Check session storage config: is it in-memory/file-based or external (Redis, database, cookie)?
- Check for WebSocket/SSE libraries: is there a Redis adapter or message broker for cross-instance sync?
- Check file upload config: local disk or object storage (S3, GCS, Azure Blob)?
- Check for in-process scheduler libraries (node-cron, APScheduler, @Scheduled, whenever) — these run on every replica
- Check for migrations in application startup code (`Application.start`, `main()`)

## Deep Mode (default)
All of Shallow Mode, plus:
- Search for global/module-level mutable state: `global`, `static`, module-level `Map`/`dict`/`HashMap` used as caches or stores
- Map every real-time communication path (WebSocket, SSE, long-poll) and verify cross-instance synchronization
- Read scheduled job implementations: is there distributed locking? (ShedLock, `onOneServer()`, advisory locks, Oban unique)
- Trace startup sequence: are migrations, seed data, or lock acquisitions safe under concurrent boot?
- Check all filesystem write paths: are generated files, uploads, or temp files accessible across replicas?

## Severity Guide
- **CRITICAL**: WebSocket/SSE events without cross-instance synchronization (users silently miss events), sessions in process memory (users lose session on next request), database migrations running at startup without locking (data corruption on concurrent boot)
- **HIGH**: In-memory rate limiters or counters (limits not enforced correctly), scheduled jobs without distributed locking (duplicate execution of side-effecting work), file uploads to local disk in a replicated environment
- **MEDIUM**: In-memory caches without external backing store (inconsistent reads across replicas), startup seed data without idempotency guards, generated files served from local disk
- **LOW**: Cache warming duplicated across replicas (wasteful but harmless), sticky sessions used as primary strategy instead of proper state externalization, log files written locally when centralized logging exists

## Output
Write report to: `vibeguard-reports/skill-reports/rel-horizontal-scaling.md`
Follow the output contract at `references/skill-output-contract.md`.
