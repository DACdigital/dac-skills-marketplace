---
name: perf-caching
description: Assess caching implementation — cache layers, invalidation, TTL config, stampede protection, cold start handling
---

# Skill: perf-caching

## Domain: Performance
## Purpose
Assess caching implementation — cache layers, invalidation strategy, TTL configuration, stampede protection, and cold start handling.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Caching is the single biggest performance lever for most applications. A database query that takes 50ms on every request takes 0ms from cache. But caching done wrong is worse than no caching: stale data served to users, cache stampedes that amplify load spikes, cross-user data leaks from missing tenant scope in cache keys. The goal is caching that's correct (right data, right staleness), performant (high hit rate), and safe (properly scoped and invalidated).

### 1. Cache Layer Presence
- Is there a caching layer? (Redis, Memcached, in-memory cache, CDN, HTTP cache)
- What level of caching exists?
  - **Application-level**: in-process cache (LRU, node-cache, caffeine, cachetools)
  - **Distributed cache**: Redis, Memcached (shared across instances)
  - **HTTP cache**: Cache-Control headers, CDN caching, reverse proxy caching
  - **Database cache**: query result cache, materialized views
- What's cached? (Query results, computed values, session data, API responses, static assets)
- What should be cached but isn't? (Frequently-read, rarely-changing data)

### 2. Cache Invalidation Strategy
- How is cache invalidated? (This is famously the hardest problem)
  - **TTL-based**: cache expires after a fixed time (simple, acceptable staleness)
  - **Event-based**: cache invalidated when source data changes (complex, more consistent)
  - **Manual**: explicit invalidation calls (error-prone)
  - **Write-through**: cache updated on write (consistent, more complex)
  - **Write-behind**: cache updated async after write (eventual consistency)
- Is there a risk of serving stale data? How long can data be stale?
- Is invalidation consistent across cache layers? (In-memory AND Redis invalidated together)

### 3. TTL Configuration
- Are TTLs set on all cached data? (No indefinite caching of mutable data)
- Are TTLs appropriate for the data type?
  - Config/feature flags: 30s-5m (short, needs freshness)
  - User profiles: 5m-15m (moderate staleness acceptable)
  - Reference data: 1h-24h (rarely changes)
  - Static assets: days-years (with cache busting)
- Are TTLs consistent? (Not a random mix with no rationale)

### 4. Cache Stampede Protection
- When a popular cache entry expires, do all concurrent requests hit the backend? (Stampede/thundering herd)
- Is there a protection mechanism?
  - **Lock**: only one request rebuilds cache, others wait
  - **Stale-while-revalidate**: serve stale data while one request refreshes
  - **Probabilistic early expiration**: randomly expire slightly before TTL
  - **Pre-warming**: background job refreshes cache before expiry

### 5. Cold Start Handling
- What happens when the cache is empty? (Application restart, cache flush)
- Is there a cache warming strategy? (Pre-populate on startup)
- Does the application degrade gracefully with empty cache? (Slower but functional)
- Can the backend handle the full load without cache? (If not, cache is a single point of failure)

### 6. Cache Key Design
- Are cache keys well-structured? (Namespaced, versioned, deterministic)
- Are keys including all relevant dimensions? (User ID, tenant ID, locale, etc.)
- Is there a key versioning strategy? (For when cached data shape changes)
- Are keys reasonable length? (Very long keys waste memory)

### 7. Cache Monitoring
- Are cache metrics collected? (Hit rate, miss rate, eviction rate, memory usage)
- Is cache hit rate healthy? (>80% for most application caches)
- Are there alerts on cache failure? (Redis down, high eviction rate)
- Is memory usage monitored? (Eviction due to memory pressure)

### 8. HTTP Caching
- Are `Cache-Control` headers set appropriately on responses?
  - Static assets: `max-age=31536000, immutable` (with filename hashing)
  - API responses: `no-cache` or short `max-age` with `stale-while-revalidate`
  - Private data: `private, no-store` or `private, max-age=X`
- Are ETags used for conditional requests?
- Is the CDN configured to respect cache headers?
- Is `Vary` header used correctly? (For content negotiation)

## How to Assess (by stack)

- **Node.js**: Check for `ioredis`/`redis`, `node-cache`, `lru-cache`, `cache-manager`, Express cache headers, CDN config
- **Python**: Check for `redis-py`, `django-redis`, `cachetools`, `diskcache`, Django cache framework config, `@lru_cache`
- **Go**: Check for `go-redis`, `ristretto`, `groupcache`, `bigcache`, HTTP middleware for caching
- **Ruby**: Check for `redis-rb`, Rails cache config (`cache_store`), fragment caching, Russian doll caching
- **Java/Spring**: Check for Spring Cache (`@Cacheable`), Caffeine, Hazelcast, Redis config, HTTP caching
- **.NET**: Check for `IMemoryCache`, `IDistributedCache`, Redis, output caching middleware
- **Elixir/Phoenix**: Check `Cachex` or `ConCache` config, Redis via `Redix`/`Nebulex`, ETS for hot data, HTTP cache headers via `Plug`, cache invalidation strategy
- **PHP/Laravel**: Check `Cache` facade config, Redis/Memcached driver in `config/cache.php`, cache tags, HTTP cache middleware, `cache.headers` route middleware

## Shallow Mode
Config and dependency checks only — no cache pattern analysis:
- Is a caching library/service in dependencies? (Redis client, Memcached client, in-memory cache library)
- Is cache configuration present? (Redis connection config, cache store config, TTL defaults)
- Check for HTTP cache headers in middleware or framework config (`Cache-Control`, `ETag`)
- Is a CDN configured? (Cloudflare, CloudFront, Fastly, Vercel Edge)

## Deep Mode (default)
All of Shallow Mode, plus:
- Analyze what's cached vs what should be: are frequently-read, rarely-changed data sources cached? (Config, reference data, user profiles, feature flags)
- Review invalidation patterns: is invalidation TTL-based, event-based, or manual? Is there a risk of serving stale data on critical paths?
- Check TTL config: are TTLs set on all cached mutable data? Are they appropriate for the data type?
- Assess stampede protection: when a popular cache entry expires, is there a lock, stale-while-revalidate, or early expiration mechanism?
- Review cache key design: are keys namespaced, versioned, and scoped correctly (include tenant ID, user ID where needed)?
- Check HTTP caching: are `Cache-Control` headers set on static assets (long cache + hashing) and API responses (appropriate staleness)?

## Severity Guide
- **CRITICAL**: Application cannot function without cache (no fallback), cache with no TTL on mutable data (stale forever), sensitive data cached without proper scoping (cross-user cache leak)
- **HIGH**: No caching layer for read-heavy application, no cache invalidation strategy, cache stampede on popular endpoints, session data cached without encryption
- **MEDIUM**: Cache hit rate low (<50%), no cache monitoring, TTLs not tuned, no stale-while-revalidate for critical data, HTTP cache headers missing on static assets
- **LOW**: No cache warming, cache keys not namespaced, no probabilistic early expiration, CDN not utilized, no cache metrics dashboard

## Output
Write report to: `vibeguard-reports/skill-reports/perf-caching.md`
Follow the output contract at `references/skill-output-contract.md`.
