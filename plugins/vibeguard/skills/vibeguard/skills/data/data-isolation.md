---
name: data-isolation
description: Assess multi-tenant data isolation — tenant context propagation, query scoping, cross-tenant leak vectors, shared resource isolation
---

# Skill: data-isolation

## Domain: Data
## Purpose
Assess multi-tenant data isolation — tenant context propagation, query-level scoping, cross-tenant leak vectors, and shared resource isolation.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

A cross-tenant data leak is the worst kind of security incident for a SaaS product. One missing WHERE clause exposes Customer A's data to Customer B. A cache key without tenant scope serves another tenant's data. A background job without tenant context processes work in the wrong tenant's scope. These bugs are invisible in single-tenant testing and catastrophic in production — they destroy customer trust instantly and may trigger breach notification requirements.

### 1. Tenant Identification
- How is the tenant identified? (Subdomain, URL path, header, JWT claim, API key)
- Is tenant identification consistent across all entry points? (HTTP, WebSocket, queue consumers, cron jobs)
- Can the tenant identifier be spoofed? (Client-controlled header vs server-derived)
- Is the tenant context set once at the boundary and propagated internally? (Not re-derived deep in business logic)

### 2. Query-Level Scoping
- Are ALL database queries scoped to the current tenant?
- Is scoping enforced automatically? (ORM middleware, default scope, row-level security) or manually per query?
- Are there queries that intentionally cross tenants? (Admin/reporting) Are they properly guarded?
- Can a developer accidentally write an unscoped query? (Is the default safe?)
- For raw/custom queries: is tenant scoping applied?

### 3. Data Architecture
- **Shared database, shared schema**: tenant_id column on all tables — is it indexed? Is it in all WHERE clauses?
- **Shared database, separate schemas**: one schema per tenant — is schema selection secure? Is there cross-schema access?
- **Separate databases**: one database per tenant — is connection routing correct? Can it leak?
- **Hybrid**: some data shared, some isolated — is the boundary clear?

### 4. Cross-Tenant Leak Vectors
- **Direct object access**: Can user from tenant A access tenant B's resources by guessing/changing IDs?
- **Search/listing**: Do search results or list endpoints only return the current tenant's data?
- **File storage**: Are uploaded files scoped to tenants? (Separate buckets/prefixes, signed URLs with tenant validation)
- **Caching**: Is cached data keyed by tenant? (Cache key includes tenant_id)
- **Background jobs**: Do async jobs carry tenant context? (A job queued by tenant A processes in tenant A's context)
- **Logging**: Do logs include tenant context? (For debugging, not for exposure)
- **Error messages**: Can error messages reveal information about other tenants?

### 5. Shared Resource Isolation
- **Rate limiting**: Is rate limiting per-tenant? (One tenant's abuse shouldn't affect others)
- **Resource quotas**: Are there per-tenant limits on storage, API calls, etc.?
- **Connection pooling**: Is one tenant able to exhaust the connection pool?
- **Noisy neighbor**: Can one tenant's heavy usage degrade performance for others?

### 6. Administrative Access
- Can admin users access cross-tenant data? Is this audited?
- Is there a tenant impersonation mechanism? Is it logged?
- Can tenant admin escalate to platform admin? Is this prevented?

## How to Assess (by stack)

- **Node.js**: Check middleware for tenant extraction, ORM default scopes/hooks, AsyncLocalStorage for tenant context propagation
- **Python/Django**: Check middleware for tenant setting, `django-tenants`/`django-multitenant`, queryset defaults, `threading.local` for tenant context
- **Python/FastAPI**: Check dependency injection for tenant, middleware, database session scoping
- **Ruby/Rails**: Check `acts_as_tenant`, default scopes, `Current` attributes, apartment gem
- **Go**: Check context values for tenant propagation, middleware, query builder patterns
- **Java/Spring**: Check `TenantContext`, Hibernate filters, `@TenantId`, request scope beans
- **.NET**: Check `IMultiTenantStore`, EF Core query filters, tenant middleware
- **Elixir/Phoenix**: Check Ecto query scoping with `where` clauses, `Plug` middleware for tenant context, `Triplex` library for multi-tenancy, default query composition
- **PHP/Laravel**: Check Eloquent global scopes for tenant filtering, tenant middleware, `stancl/tenancy` or Spatie Multitenancy packages, `BelongsToTenant` traits
- **PostgreSQL**: Check Row Level Security (RLS) policies — powerful if properly configured

## Shallow Mode
Schema and config checks only — no query tracing:
- Is there a tenant identification mechanism in middleware? (Check middleware stack for tenant extraction)
- Does a `tenant_id` column exist on key database tables? (Check migration files)
- Is a multi-tenancy library present? (`acts_as_tenant`, `django-tenants`, `stancl/tenancy`, `Triplex`, etc.)
- Check cache config: do cache keys include tenant context in their key pattern?
- Check session/cookie config: is tenant context stored and validated?

## Deep Mode (default)
All of Shallow Mode, plus:
- Trace database queries in key endpoints: is every query scoped to the current tenant? Search for queries that lack a tenant_id condition
- Check file storage operations: are upload/download paths scoped by tenant? (Separate S3 prefixes, signed URLs with tenant validation)
- Verify cache keys include tenant ID — search for cache read/write calls and check key construction
- Check background job dispatching: is tenant context passed to the job payload and restored before processing?
- Look for cross-tenant access vectors: admin endpoints, search/listing endpoints, resource access by ID, GraphQL resolvers

## Severity Guide
- **CRITICAL**: No tenant scoping on database queries, cross-tenant data accessible by changing URL/ID parameters, shared cache without tenant keys, background jobs losing tenant context
- **HIGH**: Manual tenant scoping (easy to forget), no tenant scoping on search/list endpoints, file storage without tenant isolation, tenant ID from client-controlled header without validation
- **MEDIUM**: No per-tenant rate limiting, no tenant context in logs, admin cross-tenant access not audited, cache stampede affecting all tenants
- **LOW**: No per-tenant resource quotas, tenant impersonation not logged, no noisy-neighbor protections

## Output
Write report to: `vibeguard-reports/skill-reports/data-isolation.md`
Follow the output contract at `references/skill-output-contract.md`.
