---
name: perf-backend
description: Assess backend performance — N+1 queries, missing pagination, sync bottlenecks, caching, response compression
---

# Skill: perf-backend

## Domain: Performance
## Purpose
Assess backend performance patterns — N+1 queries, missing pagination, synchronous bottlenecks, missing caching, and response compression.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Backend performance problems scale with traffic. An N+1 query that's invisible with 10 records becomes 10,000 database queries when a list grows. An unpaginated endpoint that returns 50KB today returns 50MB after a year of data. A synchronous email send that takes 200ms adds 200ms to every request that triggers it. These problems compound — a slow backend means slow pages, frustrated users, and eventually resource exhaustion under load.

### 1. N+1 Query Patterns
- Are there loops that execute a database query per iteration? (Classic N+1)
- Are ORM relationships loaded lazily when they should be eagerly loaded?
- In GraphQL resolvers: are data loaders used to batch requests? (DataLoader pattern)
- Are there API endpoints that return a list where each item triggers additional queries?

### 2. Missing Pagination
- Do list/search endpoints return unbounded results? (No LIMIT, no max page size)
- Is pagination implemented? (Offset-based, cursor-based)
- Is there a maximum page size enforced server-side? (Client can't request 10,000 records)
- Are total count queries optimized? (`COUNT(*)` on large tables can be expensive)
- Is cursor-based pagination used for large datasets? (Better than offset for deep pages)

### 3. Synchronous Bottlenecks
At a high level: are there long-running operations in the request path that should be background jobs? Are there sequential external calls that could be parallelized? For detailed endpoint-by-endpoint analysis of blocking operations (with specific function patterns to search for, saturation math, and timeout analysis), see `perf-sync-blockers`.

### 4. Caching Opportunities
- Are frequently-read, rarely-changed data cached? (User profiles, config, feature flags, reference data)
- Are expensive computations cached? (Aggregations, reports, search results)
- Is there appropriate caching at each layer?
  - **Application-level**: in-memory cache (LRU) for hot data
  - **Distributed cache**: Redis/Memcached for shared cache
  - **HTTP caching**: Cache-Control headers, ETag, conditional requests
  - **CDN caching**: static assets, API responses where appropriate

### 5. Response Compression
- Is HTTP response compression enabled? (gzip, brotli, deflate)
- Is it configured at the application level or reverse proxy?
- Are large JSON responses compressed?
- Are static assets compressed and served with proper cache headers?

### 6. Database Query Efficiency
- Are there SELECT * queries? (Fetching all columns when only some are needed)
- Are there unnecessary JOINs? (Joining tables when the joined data isn't used)
- Are aggregate queries optimized? (GROUP BY with proper indexes)
- Are COUNT queries on large tables optimized? (Approximate counts, cached counts)
- Are there queries in loops? (Should be batched)

### 7. Connection Reuse
- Are HTTP clients reusing connections? (Keep-alive, connection pooling)
- Are database connections pooled? (Not creating a new connection per request)
- Are WebSocket connections efficiently managed?

### 8. Serialization Efficiency
- Are large objects serialized efficiently? (Not converting entire database records to JSON when only a few fields are needed)
- Is there unnecessary data transformation in the response path?
- Are responses appropriately shaped for the consumer? (API returns only what's needed)

## How to Assess (by stack)

- **Node.js/Express**: Check for N+1 in Prisma/TypeORM (missing `include`/`join`), pagination middleware, compression middleware, redis caching, `Promise.all` for parallel calls
- **Python/Django**: Check for N+1 (missing `select_related`/`prefetch_related`), pagination classes, django-cacheops/django-redis, celery for background jobs
- **Python/FastAPI**: Check for N+1 in SQLAlchemy (missing `joinedload`/`selectinload`), pagination, redis/memcached, background tasks
- **Ruby/Rails**: Check for N+1 (bullet gem, missing `includes`/`eager_load`), pagination (kaminari/pagy), fragment caching, sidekiq for background jobs
- **Go**: Check for N+1 in ORM patterns, pagination, in-memory caching (groupcache/ristretto), compression middleware
- **Java/Spring**: Check for N+1 in JPA/Hibernate (missing `@Fetch`/`@EntityGraph`), pagination (Pageable), Spring Cache, @Async
- **Elixir/Phoenix**: Check Ecto N+1 (missing `preload`/`Repo.preload`), pagination with `Repo.paginate` or Scrivener, ETS/Cachex for caching, `Task.async` for parallel calls
- **PHP/Laravel**: Check Eloquent N+1 (missing `with`/`load`), pagination via `->paginate()`, Redis caching with `Cache` facade, queue jobs for heavy processing

## Shallow Mode
Config and dependency checks only — no request tracing:
- Is pagination configured? (Check for pagination libraries, default page size settings)
- Is a caching library present? (Redis client, in-memory cache, cache middleware)
- Is HTTP compression enabled? (Check middleware stack or reverse proxy config for gzip/brotli)
- Quick N+1 check: search for database queries inside loops or `.each`/`.map`/`.forEach` blocks

## Deep Mode (default)
All of Shallow Mode, plus:
- Trace request handlers for N+1 patterns: search for ORM calls inside loops, missing `include`/`preload`/`select_related`/`with`
- Map all list/search endpoints: is each paginated with a max page size? Are there unbounded SELECTs?
- Identify synchronous bottlenecks: are email sends, PDF generation, image processing, or external API calls in the request path?
- Analyze caching: what's cached? What should be cached but isn't? (Frequently-read reference data, expensive computations, API responses)
- Review response payloads: are there `SELECT *` patterns? Are APIs returning more data than the consumer needs?

## Severity Guide
- **CRITICAL**: Unbounded queries on large tables (no pagination, no LIMIT), N+1 on high-traffic endpoints, synchronous email/PDF/image processing blocking requests
- **HIGH**: No pagination on list endpoints, no caching for frequently-accessed data, sequential external API calls that could be parallel, SELECT * on large tables
- **MEDIUM**: No HTTP response compression, missing HTTP cache headers on static content, no background job system for long operations, N+1 on low-traffic endpoints
- **LOW**: No application-level caching (only DB), cursor pagination not used for deep pages, minor over-fetching in API responses, count queries not optimized

## Output
Write report to: `vibeguard-reports/skill-reports/perf-backend.md`
Follow the output contract at `references/skill-output-contract.md`.
