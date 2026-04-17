---
name: sec-api-security
description: Assess API security — rate limiting, CSRF, request validation, idempotency, auth coverage, GraphQL security
---

# Skill: sec-api-security

## Domain: Security
## Purpose
Assess API-level security controls — rate limiting, CSRF protection, request validation, idempotency, and authentication coverage across all endpoints.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

APIs are the primary attack surface for most modern applications. Without rate limiting, an attacker can brute-force credentials or scrape your entire dataset. Without CSRF protection on cookie-authenticated endpoints, any website can make requests as your users. Without request validation, oversized payloads can OOM your server. Without idempotency, network retries can double-charge customers. These controls are table stakes for any API exposed to the internet.

### 1. Rate Limiting
- Is rate limiting implemented? Where? (Application middleware, API gateway, CDN, reverse proxy)
- What's rate-limited? (All endpoints, auth endpoints only, write operations?)
- Rate limit strategy: per-IP, per-user, per-API-key, sliding window vs fixed window?
- Are rate limit headers returned? (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`)
- Is the auth/login endpoint rate-limited? (Brute force protection)
- Are expensive operations (search, export, file upload) separately rate-limited?

### 2. CSRF Protection
- Is CSRF protection enabled for state-changing requests? (POST, PUT, DELETE, PATCH)
- Token-based CSRF (synchronizer pattern) or SameSite cookie approach?
- Is CSRF skipped for API-key-authenticated endpoints? (Appropriate if no cookie auth)
- Are CSRF tokens properly validated on the server side?
- GraphQL mutations — CSRF protected?

### 3. Request Validation
- **Content-Type enforcement**: Does the API reject requests with unexpected content types?
- **Request body size limits**: Are there max body size limits? Are they appropriate? (Large uploads should have separate limits)
- **Schema validation**: Are request bodies validated against a schema before processing?
- **Parameter type checking**: Are path/query parameters validated for type and range?
- **File upload validation**: file type, file size, file content (magic bytes, not just extension)

### 4. Authentication Coverage
- Are ALL endpoints authenticated? Map unauthenticated endpoints — are they intentionally public?
- Are admin/internal endpoints on a separate port or path with stronger auth?
- Are WebSocket connections authenticated on connect?
- Are webhook receivers verified (signature validation)?
- Are health/status endpoints appropriately exposed (info leak vs necessary)?

### 5. Idempotency
- Do write operations support idempotency keys? (Critical for payment, order creation, etc.)
- Are retried requests safe? (Double-submit protection)
- Are database operations in transactions where needed?

### 6. API Versioning & Deprecation
- Is the API versioned? (URL path, header, query parameter)
- Are deprecated endpoints marked and scheduled for removal?
- Is there a sunset header or deprecation notice mechanism?

### 7. GraphQL-Specific (if applicable)
- **Query depth limiting**: Can clients send arbitrarily nested queries? (DoS vector)
- **Query complexity analysis**: Is there a cost limit per query?
- **Batching limits**: Can clients batch unlimited queries?
- **Field-level authorization**: Are resolvers individually authorized?
- **Introspection disabled**: Is schema introspection disabled in production?
- **Persisted queries**: Are only pre-approved queries allowed?

### 8. Request Smuggling & Parsing
- **HTTP request smuggling**: inconsistent `Content-Length` / `Transfer-Encoding` handling between proxy and app
- **HTTP parameter pollution**: how does the app handle duplicate query parameters?
- **JSON parsing edge cases**: duplicate keys, type confusion, large numbers

## How to Assess (by stack)

- **Node.js/Express**: Check `express-rate-limit`, `rate-limiter-flexible`, `csurf`/`csrf-csrf`, `express-validator`, helmet, body-parser limits
- **Python/Django**: Check `django-ratelimit`, `throttle` in DRF, `CsrfViewMiddleware`, `MAX_UPLOAD_SIZE`
- **Python/FastAPI**: Check `slowapi`, CORS/CSRF middleware, Pydantic validation, `UploadFile` limits
- **Ruby/Rails**: Check `rack-attack`, CSRF token verification, `ActionController::Parameters`, request size limits
- **Go**: Check rate limiting middleware, CSRF packages, request validation libraries
- **Java/Spring**: Check Spring Security CSRF, `@Valid`/`@Validated`, `CommonsMultipartResolver` limits, Bucket4j/Resilience4j
- **.NET**: Check rate limiting middleware, anti-forgery tokens, model validation, request size limits
- **Elixir/Phoenix**: Check `Hammer` for rate limiting, CSRF tokens in Phoenix forms, `Plug.Parsers` request size limits, API auth pipelines
- **PHP/Laravel**: Check `throttle` middleware, `RateLimiter` config, CSRF via `VerifyCsrfToken`, `FormRequest` validation, `upload_max_filesize`
- **API Gateways**: Check Kong, AWS API Gateway, Apigee, Traefik config for rate limiting, WAF rules

## Shallow Mode
Config and dependency checks only — no endpoint mapping:
- Is a rate limiting library/middleware present? (`express-rate-limit`, `rack-attack`, `Hammer`, `throttle`, `django-ratelimit`)
- Is CSRF protection enabled in framework config? (Not disabled or skipped globally)
- Check server/framework config for request body size limits (`body-parser` limit, `DATA_UPLOAD_MAX_MEMORY_SIZE`, `upload_max_filesize`)
- Is there an API gateway or WAF configured? (Kong, AWS API Gateway, Cloudflare, etc.)

## Deep Mode (default)
All of Shallow Mode, plus:
- Map all API endpoints (from route definitions) and verify: is each authenticated? Rate-limited? Validated?
- Analyze CSRF implementation: is it applied to all state-changing endpoints? Is token validation server-side?
- Check request validation on each endpoint: are bodies validated against a schema before business logic?
- Verify idempotency on financial/critical write operations: is there an idempotency key mechanism?
- If GraphQL: check for query depth limiting, complexity analysis, batching limits, introspection disabled in production
- Check for HTTP parameter pollution and content-type enforcement

## Severity Guide
- **CRITICAL**: No authentication on sensitive endpoints, no CSRF on cookie-authenticated state-changing endpoints, no rate limiting on auth endpoints
- **HIGH**: No rate limiting anywhere, no request body size limits, GraphQL without depth/complexity limits, unauthenticated admin endpoints
- **MEDIUM**: Rate limiting only on some endpoints, CSRF disabled for convenience, no idempotency on financial operations, no content-type validation
- **LOW**: No API versioning, no rate limit headers, no deprecation mechanism, no idempotency keys on non-critical writes

## Output
Write report to: `vibeguard-reports/skill-reports/sec-api-security.md`
Follow the output contract at `references/skill-output-contract.md`.
