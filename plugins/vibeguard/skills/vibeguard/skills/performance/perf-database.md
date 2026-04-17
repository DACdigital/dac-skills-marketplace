---
name: perf-database
description: Assess database performance — missing indexes, slow query patterns, connection limits, query optimization
---

# Skill: perf-database

## Domain: Performance
## Purpose
Assess database performance — missing indexes, slow query patterns, connection limits, and query plan optimization signals.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Database performance problems are uniquely dangerous because they degrade gradually under load, then cliff suddenly. A missing index on a 10M-row table turns a 2ms query into a 30-second full table scan. Connection pool exhaustion under traffic spike takes down the entire application, not just slow queries. These issues rarely show up in development with small datasets — they manifest in production.

To assess: check migration files for index definitions, scan source code for raw SQL and ORM query patterns, review database configuration files, and check for monitoring/optimization tooling.

### 1. Missing Indexes
- Are foreign key columns indexed? (Common miss — FK without index causes slow JOINs)
- Are columns used in WHERE clauses indexed?
- Are columns used in ORDER BY indexed?
- Are columns used in GROUP BY indexed?
- Are there composite indexes for common multi-column queries?
- Are there indexes on columns used for filtering in application code?

### 2. Unused/Redundant Indexes
- Are there indexes that overlap? (Index on `(a, b)` makes index on `(a)` redundant)
- Are there indexes on rarely-queried columns? (Indexes slow down writes)
- Are there indexes on low-cardinality columns? (Boolean, status enum — often not helpful)

### 3. Slow Query Patterns
- **Full table scans**: queries without WHERE or with non-indexed conditions on large tables
- **LIKE with leading wildcard**: `WHERE name LIKE '%search%'` (can't use index)
- **Function on indexed column**: `WHERE YEAR(created_at) = 2024` (can't use index, should be range)
- **Implicit type conversion**: comparing string column to integer (prevents index use)
- **OR conditions**: `WHERE a = 1 OR b = 2` (often requires separate indexes or UNION)
- **NOT IN with subquery**: often performs poorly (use NOT EXISTS or LEFT JOIN instead)
- **Correlated subqueries**: subquery that references outer query (executes per row)
- **DISTINCT on large result sets**: often indicates missing GROUP BY or incorrect JOIN

### 4. Table Design Signals
- **Missing primary keys**: every table should have a primary key
- **Oversized rows**: tables with many TEXT/BLOB columns (consider normalizing)
- **Wide tables**: tables with >30 columns (may benefit from splitting)
- **No partitioning**: very large tables (>100M rows) without partitioning strategy
- **Enum as string**: status fields stored as strings instead of enums or lookup tables

### 5. Connection Limits
- Is `max_connections` configured appropriately? (Default is often too low or too high)
- Does the total connection pool across all app instances fit within `max_connections`?
- Is there a connection pooler? (PgBouncer, ProxySQL, RDS Proxy — important for serverless/high-connection scenarios)
- Are connection limits monitored?

### 6. Query Optimization Signals
- Is `EXPLAIN`/`EXPLAIN ANALYZE` used in development? (Evidence of query optimization practice)
- Are there query timeouts configured? (`statement_timeout` in PostgreSQL, `max_execution_time` in MySQL)
- Is there slow query logging enabled? (For production monitoring)
- Are there materialized views for expensive aggregations?

### 7. Data Growth Patterns
- Are there tables that grow unboundedly? (Event logs, audit trails, analytics) — is there archival/cleanup?
- Are there auto-incrementing IDs that could overflow? (32-bit int limit)
- Is there a strategy for historical data? (Partitioning, archival, different storage tier)

### 8. Replication & Read Scaling
- If using read replicas: are read queries directed there?
- Is replication lag monitored?
- Is there read-after-write consistency handling? (Write to primary, read from replica — might see stale data)

## How to Assess (by database)

- **PostgreSQL**: Check CREATE INDEX statements in migrations, `pg_stat_user_indexes` queries, `explain` usage, `postgresql.conf` settings, PgBouncer config
- **MySQL**: Check index definitions, `slow_query_log` config, `max_connections`, ProxySQL config
- **MongoDB**: Check `.createIndex()` calls, `explain()` usage, `mongod.conf` settings
- **SQLite**: Check index definitions, `PRAGMA` settings, WAL mode configuration
- **Any ORM**: Check migration files for index definitions, model decorators/annotations for indexes
- **Elixir/Ecto**: Check indexes in Ecto migrations, `Repo` pool config, `Ecto.Query` `explain`, slow query logging via Ecto telemetry events
- **PHP/Laravel**: Check migration indexes (`->index()`, `->unique()`), `config/database.php` pool settings, `DB::listen()` for slow queries, query builder vs raw queries

## Shallow Mode
Config and migration checks only — no source code query analysis:
- Scan migration files for `CREATE INDEX` / `add_index` / `.index()` — are foreign key columns indexed?
- Check database config for connection pool size and `max_connections`
- Check for query timeout settings (`statement_timeout`, `max_execution_time`)
- Look for slow query logging configuration
- Check if a connection pooler is configured (PgBouncer, ProxySQL, RDS Proxy) for apps with many instances

## Deep Mode (default)
All of Shallow Mode, plus:
- Analyze every table's indexes against query patterns found in source code (search for raw SQL, ORM query builders, repository/DAO methods)
- Search source for slow query anti-patterns: `LIKE '%`, `SELECT *`, functions on indexed columns in WHERE clauses, correlated subqueries
- Cross-reference ORM model definitions with migration indexes — are all association/foreign key columns indexed?
- Calculate connection pool math: (pool size per instance) x (number of instances) vs `max_connections` — does it fit?
- Assess data growth patterns: identify tables that grow unboundedly and check for archival/cleanup
- Check replication configuration and read/write splitting if applicable
- Note: N+1 query detection is covered by `perf-backend` — focus here on index/schema/connection issues

## Severity Guide
- **CRITICAL**: No indexes on large, frequently-queried tables, connection pool total exceeds max_connections, no primary keys on tables, full table scans on user-facing queries
- **HIGH**: Missing indexes on foreign keys, no query timeouts (runaway queries can take down DB), no connection pooler for high-connection scenarios, unbounded tables with no archival
- **MEDIUM**: Missing composite indexes for common queries, slow query patterns in code, no slow query logging, no read replica utilization
- **LOW**: Redundant indexes, minor query optimization opportunities, no materialized views for complex reports, no partitioning strategy for large tables

## Output
Write report to: `vibeguard-reports/skill-reports/perf-database.md`
Follow the output contract at `references/skill-output-contract.md`.
