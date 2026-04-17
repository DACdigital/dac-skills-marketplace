---
name: data-query-safety
description: Assess database query safety — parameterized queries, ORM usage patterns, connection pooling, and query timeout configuration
---

# Skill: data-query-safety

## Domain: Data
## Purpose
Assess database query safety — parameterized queries, ORM usage patterns, connection pooling, and query timeout configuration.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Unsafe queries are both a security and reliability problem. A non-parameterized query with user input is SQL injection — full database compromise. An unbounded SELECT on a growing table returns 10M rows and OOMs the server. A missing connection pool means each request opens a new connection until the database refuses more. A missing query timeout means one runaway query holds a connection forever. These are basic hygiene that prevents both breaches and outages.

### Scope Boundary
This skill focuses on query *construction and safety patterns*. For database *performance* (indexing, query optimization), see `perf-database`. For *connection pool health and failure handling*, see `rel-dependency-health`.

### 1. Parameterized Queries
- Are ALL queries parameterized? (No string interpolation/concatenation for building SQL)
- Are ORM escape hatches (raw queries) parameterized when used?
- Are dynamic query builders (WHERE clauses, ORDER BY) safe from injection?
- Are stored procedures called with parameters, not concatenated strings?

### 2. ORM Usage Patterns
- Is an ORM consistently used? Or a mix of ORM and raw SQL?
- Are there ORM anti-patterns?
  - `find()` without limits on large tables
  - Missing `select()` — fetching all columns when only some are needed
  - Eager loading everything vs appropriate lazy/eager loading strategy
  - `synchronize: true` or auto-migration in production (schema changes without migration)
- Are ORM-generated queries efficient? (Not overly complex joins, appropriate query strategies)

### 3. Connection Pooling
- Is connection pooling configured?
- Pool parameters:
  - `min` connections: appropriate for baseline load?
  - `max` connections: appropriate for peak load without exhausting DB?
  - `idle timeout`: releasing unused connections?
  - `connection timeout`: failing fast when pool is exhausted?
  - `max lifetime`: recycling connections to prevent stale connections?
- Multiple app instances: does total pool size across instances fit within DB max_connections?

### 4. Query Timeouts
- Is there a query/statement timeout configured? (Prevent runaway queries)
- At what level? (Database server, connection pool, per-query)
- Is the timeout appropriate? (Short for user-facing queries, longer for batch operations)
- What happens when a query times out? (Graceful error, not a crash)

### 5. Read/Write Splitting
- If read replicas exist: are read operations routed to replicas?
- Is the routing correct? (Writes never go to read replicas)
- Is replication lag handled? (Read-after-write consistency needs)

### 6. Query Patterns
- **Unbounded queries**: SELECT without LIMIT that could return millions of rows
- **Missing WHERE clauses**: UPDATE/DELETE without WHERE (mass modification risk)
- **SELECT ***: fetching all columns when only specific fields are needed
- **Cartesian products**: JOINs without proper ON conditions
- **COUNT(*)**: on large tables without appropriate indexes (full table scan)

### 7. Prepared Statements
- Are frequently-executed queries using prepared statements? (Performance and security)
- Are prepared statements properly closed? (No statement leak)
- Is the prepared statement cache size appropriate?

## How to Assess (by stack)

- **Node.js/Prisma**: Check for `$queryRaw`/`$executeRaw` usage, connection pool in `datasource` config, `findMany` without `take`
- **Node.js/Knex**: Check for `.raw()` with bindings, pool config, `.select()` specificity
- **Python/SQLAlchemy**: Check for `text()` with bound params, `create_engine` pool config, `session.execute()` patterns
- **Python/Django**: Check for `extra()`, `raw()`, `RawSQL()`, `DATABASES` pool config (with `django-db-connection-pool`), queryset patterns
- **Ruby/Rails**: Check for `find_by_sql`, `where("...")` with string interpolation, `database.yml` pool config
- **Go**: Check for `db.Query()` with `?`/`$1` placeholders, `sql.DB` pool settings, context with timeout
- **Java/Spring**: Check for `JdbcTemplate` with `?` placeholders, HikariCP config, `@Query` annotations, `EntityManager` usage
- **.NET/EF Core**: Check for `FromSqlRaw`/`FromSqlInterpolated`, connection string pooling params, `CommandTimeout`
- **Elixir/Ecto**: Check Ecto auto-parameterization (default safe), `Ecto.Adapters.SQL.query` for raw SQL with `$1` params, Repo pool config, query timeouts
- **PHP/Laravel**: Check Eloquent parameterized queries, `DB::raw()` and `DB::select()` with bindings, `config/database.php` pool config, query builder safety

## Shallow Mode
Config and dependency checks only — no query auditing:
- Is an ORM or parameterized query library present?
- Check connection pool config: pool size, timeouts, max lifetime
- Search for raw query patterns: `.raw()`, `$queryRaw`, `execute()`, `text()` — are they using parameter placeholders?
- Check for query timeout config (`statement_timeout`, `max_execution_time`, `CommandTimeout`)

## Deep Mode (default)
All of Shallow Mode, plus:
- Audit every raw/custom SQL query: search for string interpolation/concatenation in SQL strings — each must use parameterized placeholders
- Analyze ORM query patterns: search for `find()` without `limit`, `SELECT *` patterns, `synchronize: true` in production config
- Calculate pool math: (pool size per instance) x (expected instances) vs database `max_connections`
- Check query timeout at all levels: database config, connection pool, per-query
- Search for unbounded queries: `SELECT` without `LIMIT`, `UPDATE`/`DELETE` without `WHERE` on large/growing tables

## Severity Guide
- **CRITICAL**: Non-parameterized queries with user input (SQL injection), no connection pooling (connection exhaustion), UPDATE/DELETE without WHERE clause
- **HIGH**: Missing query timeouts (runaway queries can take down DB), auto-migration in production, unbounded SELECT on user-facing endpoints, pool size × instances > DB max_connections
- **MEDIUM**: Inconsistent parameterization (some queries safe, others not), SELECT * on large tables, missing connection pool health management, no read/write splitting with replicas available
- **LOW**: Sub-optimal pool sizing, prepared statements not used for hot queries, missing idle timeout on connections, ORM eager loading everything

## Output
Write report to: `vibeguard-reports/skill-reports/data-query-safety.md`
Follow the output contract at `references/skill-output-contract.md`.
