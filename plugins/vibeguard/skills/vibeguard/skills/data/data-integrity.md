---
name: data-integrity
description: Assess database integrity enforcement — foreign keys, constraints, transactions, referential integrity, and cascade behaviors
---

# Skill: data-integrity

## Domain: Data
## Purpose
Assess database integrity enforcement — foreign keys, constraints, transactions, referential integrity, and cascade behaviors.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Database constraints are the last line of defense against data corruption. Application-level validation can be bypassed by bugs, admin scripts, and migration mishaps. A missing foreign key means orphaned records accumulate silently. A missing NOT NULL on a required field means nulls creep in and break downstream logic. A missing transaction on a multi-step write means a crash leaves data half-updated. The database should enforce every invariant that matters.

### 1. Foreign Key Constraints
- Are foreign keys defined in the schema? (Not just in application code)
- Are all relationships that should be foreign keys actually enforced at the DB level?
- Are there orphan record risks? (References to records that can be deleted)
- For NoSQL: how are relationships maintained? (Application-level, denormalization, references)

### 2. NOT NULL Constraints
- Are required fields marked NOT NULL?
- Are there columns that should be NOT NULL but allow nulls? (Common oversight)
- Is there a pattern of checking for null in application code where a DB constraint would be better?

### 3. UNIQUE Constraints
- Are natural unique fields constrained? (Email, username, slug, etc.)
- Are there unique constraints that should be composite? (e.g., unique per tenant, not globally)
- Is unique constraint violation handled gracefully in application code?

### 4. CHECK Constraints
- Are value ranges enforced? (Positive amounts, valid status enums, date ranges)
- Are there business rules that should be CHECK constraints?
- For enums: are they DB-level enums or CHECK constraints, or only validated in application code?

### 5. Transaction Usage
- Are multi-step operations wrapped in transactions?
- Are transaction boundaries appropriate? (Not too broad — long locks; not too narrow — partial updates)
- Is the correct isolation level used?
- Are nested transactions handled correctly? (Savepoints)
- Are transactions properly committed/rolled back on all code paths? (Including error paths)

### 6. Cascade Behaviors
- What happens when a referenced record is deleted?
  - CASCADE — deletes dependent records (correct for some, dangerous for others)
  - SET NULL — nullifies the reference (leaves orphan-like state)
  - RESTRICT/NO ACTION — prevents deletion (safest default)
- Are cascade deletes intentional and appropriate? (Deleting a user shouldn't cascade-delete audit logs)
- Are cascade behaviors documented?

### 7. Referential Integrity in Application Code
- If the database doesn't enforce referential integrity (NoSQL, or FK disabled):
  - Is integrity maintained in application code?
  - Are there cleanup jobs for orphaned records?
  - Are there consistency checks?
  - Is eventual consistency acceptable for the use case?

### 8. Data Validation Layer
- Where is data validated? (Application layer, database layer, both?)
- Is the database the last line of defense? (Application validation can be bypassed)
- Are constraints consistent between application validation and database constraints?

## How to Assess (by stack)

- **PostgreSQL/MySQL**: Check CREATE TABLE statements or ORM schema for FK, UNIQUE, NOT NULL, CHECK constraints
- **Prisma**: Check `schema.prisma` for `@relation`, `@unique`, `@default`, `@@unique`, field optionality
- **Django**: Check model definitions for `ForeignKey`, `unique=True`, `null=True`, `blank=True`, `CheckConstraint`, `UniqueConstraint`
- **Rails/ActiveRecord**: Check migrations for `add_foreign_key`, `null: false`, `unique: true`, model validations vs DB constraints
- **TypeORM/Sequelize**: Check entity decorators/model definitions for constraints, `synchronize` vs migrations
- **SQLAlchemy**: Check model definitions for `ForeignKey`, `nullable`, `UniqueConstraint`, `CheckConstraint`
- **MongoDB**: Check for schema validation rules, Mongoose schema definitions with `required`, `unique`, `enum`
- **Go/GORM**: Check struct tags for constraints, migration definitions
- **Elixir/Ecto**: Check Ecto schema validations, `references` in migrations for FKs, `unique_constraint`/`check_constraint`, `Ecto.Multi` for transactions
- **PHP/Laravel**: Check Eloquent relationships, migration constraints (`->foreign()`, `->unique()`, `->nullable(false)`), `DB::transaction()` wrapping

## Shallow Mode
Schema and migration checks only — no source code tracing:
- Check migration files and schema definitions for: foreign keys, NOT NULL on required fields, UNIQUE constraints on natural keys (email, username, slug)
- Verify transaction usage exists in the codebase (search for `transaction`, `BEGIN`, `Ecto.Multi`, `DB::transaction`)
- Check for cascade behaviors on key foreign keys in migration files
- Is there a mix of ORM and raw SQL? (Raw SQL may bypass ORM constraints)

## Deep Mode (default)
All of Shallow Mode, plus:
- Analyze every table for appropriate constraints: are required fields NOT NULL? Are relationships FK-constrained? Are natural keys UNIQUE?
- Trace multi-step write operations (order creation, payment processing, user registration): are they wrapped in transactions?
- Check cascade behaviors on all foreign keys: is CASCADE appropriate or dangerous for each relationship?
- Compare application-layer validation rules with database constraints — flag divergences
- Search for orphan record risks: relationships without FK constraints, soft-delete on parent without handling children

## Severity Guide
- **CRITICAL**: No transactions on multi-step writes (partial update risk), no foreign keys on critical relationships (data integrity loss), cascade DELETE on sensitive data (accidental mass deletion)
- **HIGH**: Required fields without NOT NULL constraint, unique fields without UNIQUE constraint, no database-level validation (only application), financial/monetary data without appropriate constraints
- **MEDIUM**: Missing CHECK constraints for value ranges, inconsistent constraint enforcement (some tables rigorous, others not), no cascade behavior documentation
- **LOW**: Over-reliance on application validation without DB backup, no cleanup for orphaned records, enums validated only in code

## Output
Write report to: `vibeguard-reports/skill-reports/data-integrity.md`
Follow the output contract at `references/skill-output-contract.md`.
