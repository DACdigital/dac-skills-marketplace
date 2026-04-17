---
name: data-migrations
description: Assess database migration system — existence, reversibility, safety practices, schema versioning, and deployment execution
---

# Skill: data-migrations

## Domain: Data
## Purpose
Assess the database migration system — existence, reversibility, safety practices, and schema versioning.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Migrations are one of the highest-risk operations in production. A bad migration can lock a table for minutes (taking down the app), silently corrupt data, or be irreversible once applied. Unlike code deployments, you can't just roll back a binary — data changes persist. The difference between "deploy with confidence" and "deploy with crossed fingers" often comes down to migration practices.

### 1. Migration System Existence
- Is there a migration system? (Alembic, Prisma Migrate, Knex, TypeORM, Django migrations, ActiveRecord migrations, Flyway, Liquibase, golang-migrate, Diesel, EF Core migrations)
- Are migration files present and populated? (Not just the tool configured but unused)
- Is the migration tool referenced in package scripts or CI? (Automated migration execution)

### 2. Migration Organization
- Are migrations named descriptively? (Not just timestamps — what does this migration do?)
- Are migrations ordered and sequential? (No gaps or reordering)
- Is there a migration history/tracking table referenced? (Ensures migrations run exactly once)
- Are migration files in version control?

### 3. Reversibility
- Do migrations have down/rollback methods? (Not just up)
- Are down migrations tested? (Easy to write a down migration that doesn't actually reverse correctly)
- Can you roll back the most recent migration safely?
- For data migrations: is the rollback data-safe? (You can't un-delete data)

### 4. Safety Practices
- **No data-destructive operations without plan**: DROP TABLE, DROP COLUMN, DELETE data — are these flagged?
- **Large table operations**: ALTER TABLE on large tables with appropriate strategy? (Online DDL, pt-online-schema-change, pg_repack)
- **Default values**: Adding NOT NULL columns to existing tables — is there a default value or data backfill?
- **Index creation**: CREATE INDEX CONCURRENTLY (PostgreSQL) or equivalent for zero-downtime?
- **Lock awareness**: Do migrations avoid long-held locks on production tables?
- **Backward compatibility**: Are migrations compatible with the previous code version? (For rolling deployments)

### 5. Schema Versioning & Documentation
- Is there a schema dump/snapshot? (For comparing expected vs actual state)
- Is the schema documented? (ERD, data dictionary, column comments)
- Are schema changes reviewed? (PR process, migration review checklist)

### 6. Migration Execution
- How are migrations run? (On deployment, manually, in CI/CD pipeline)
- Is there a migration step in the deployment pipeline?
- Are migrations run before or after code deployment? (Before = safe for new code, but rollback is harder)
- Is there a migration lock to prevent concurrent execution?
- Are migrations tested in staging/preview before production?

### 7. Data Migrations
- Are schema migrations and data migrations separated? (Different concerns, different risk profiles)
- Are data migrations idempotent? (Safe to run twice)
- For large data migrations: are they batched? (Not one giant transaction)
- Are data migrations reversible? (Often they aren't — is this acknowledged?)

## How to Assess (by stack)

- **Node.js/Prisma**: Check `prisma/migrations/`, `prisma migrate` commands, `schema.prisma` for models
- **Node.js/Knex**: Check migrations directory, `knex migrate:make`, up/down functions
- **Node.js/TypeORM**: Check migrations directory, `typeorm migration:create`, up/down methods
- **Python/Django**: Check `migrations/` in each app, `makemigrations`/`migrate` commands, `RunPython` for data migrations
- **Python/Alembic**: Check `alembic/versions/`, `upgrade()`/`downgrade()` functions, `alembic.ini`
- **Ruby/Rails**: Check `db/migrate/`, `change`/`up`/`down` methods, `db:migrate` rake task
- **Go**: Check `golang-migrate`, `goose`, or `atlas` migration files
- **Java**: Check Flyway (`db/migration/V*.sql`) or Liquibase (`changelog` files)
- **.NET**: Check EF Core `Migrations/` directory, `Up`/`Down` methods, `dotnet ef migrations`
- **Elixir/Ecto**: Check `priv/repo/migrations/`, `Ecto.Migration` with `up/down` or `change`, `mix ecto.migrate`/`mix ecto.rollback`, data migrations
- **PHP/Laravel**: Check `database/migrations/`, `up()`/`down()` methods, `php artisan migrate`/`migrate:rollback`, migration squashing
- **Rust/Diesel**: Check `migrations/` directory, `up.sql`/`down.sql` files

## Shallow Mode
Config and file existence checks only — no migration content review:
- Does a migration directory exist with migration files? (Not just the tool configured but no migrations written)
- Is the migration tool in project dependencies?
- Are migration commands referenced in CI/CD config, package scripts, or deployment docs? (e.g., `prisma migrate deploy`, `mix ecto.migrate`, `php artisan migrate`)
- Is there a schema dump file? (e.g., `schema.rb`, `structure.sql`, `schema.prisma`)

## Deep Mode (default)
All of Shallow Mode, plus:
- Read the last 5-10 migrations and check: do they have down/rollback methods? Are the rollbacks correct (not just empty)?
- Search migration files for dangerous operations: `DROP TABLE`, `DROP COLUMN`, `DELETE`, `TRUNCATE` — are they guarded with confirmation or flagged?
- Check for large-table-safe patterns: `CREATE INDEX CONCURRENTLY`, online DDL tools, batched data backfills
- Check NOT NULL additions — do they include a DEFAULT or a backfill step?
- Verify migration execution is automated in deployment pipeline (not manual SSH + run)
- Check whether schema and data migrations are separated
- Verify migration lock mechanism prevents concurrent execution

## Severity Guide
- **CRITICAL**: No migration system (schema changes are manual/ad-hoc), migrations with irreversible data loss and no acknowledgment, migrations that lock tables for extended periods in production
- **HIGH**: No down/rollback migrations, data-destructive operations without review process, no migration step in deployment, concurrent migration execution possible
- **MEDIUM**: Migrations not tested in staging, no schema documentation, data migrations not idempotent, index creation without CONCURRENTLY
- **LOW**: Migration naming not descriptive, no schema dump, data and schema migrations not separated, no migration review checklist

## Output
Write report to: `vibeguard-reports/skill-reports/data-migrations.md`
Follow the output contract at `references/skill-output-contract.md`.
