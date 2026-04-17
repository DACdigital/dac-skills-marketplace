---
name: qual-type-safety
description: Assess type system usage — strict mode, any/escape hatch prevalence, untyped boundaries, runtime validation
---

# Skill: qual-type-safety

## Domain: Quality
## Purpose
Assess type system usage — strict mode configuration, `any` type prevalence, untyped boundaries, and runtime type validation.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Type systems catch bugs at compile time that would otherwise surface in production. A missing `strictNullChecks` means null reference errors slip through. An `any` type in a request handler means no validation happens. Untyped API boundaries mean the contract between client and server is a handshake agreement that nobody enforces. The more of the codebase that's typed, the fewer classes of bugs can exist.

### 1. Type System Configuration
- **TypeScript**: Is `strict: true` enabled? Which strict flags are active?
  - `strictNullChecks` (most important)
  - `noImplicitAny`
  - `strictFunctionTypes`
  - `strictPropertyInitialization`
  - `noUncheckedIndexedAccess`
  - `exactOptionalPropertyTypes`
- **Python**: Is mypy/pyright configured? What strictness level? (`strict`, `basic`, custom)
- **Go/Rust/Java/.NET**: Type safety is inherent — check for escape hatches
- Is type checking part of CI?

### 2. `any` / Type Escape Hatches
- How many `any` types in TypeScript? (Count occurrences)
- How many `# type: ignore` in Python? (Count occurrences)
- How many `unsafe` blocks in Rust? (Are they justified?)
- How many raw type casts/assertions? (`as any`, `as unknown as T`, `(type)`, `reflect`)
- Are escape hatches concentrated in specific areas? (Legacy code, third-party integrations — more acceptable)
- Are escape hatches in critical code? (Auth, data handling — less acceptable)

### 3. Untyped Boundaries
- **API boundaries**: Are request/response types defined? (Not `any` or untyped)
- **Database boundaries**: Are query results typed? (ORM types, manual type definitions)
- **External API responses**: Are third-party API responses typed? (Type definitions for Stripe, Twilio, etc.)
- **Environment variables**: Are env vars typed? (Not just `string | undefined`)
- **Configuration**: Are config values typed and validated?
- **File I/O**: Are file contents parsed with type validation?

### 4. Runtime Type Validation
- At system boundaries (where external data enters), is there runtime validation?
  - **API input**: Zod, Joi, Yup, class-validator, Pydantic, marshmallow, dry-validation, JSON Schema
  - **Form input**: Zod + react-hook-form, Formik + Yup, vee-validate + Zod
  - **Config**: Zod, envalid, convict, Pydantic Settings
  - **Message queue payloads**: schema validation on consume
- Is there a consistent validation pattern? (Same library, same approach throughout)
- Do runtime types match compile-time types? (Zod schema infers TypeScript type, Pydantic model is the type)

### 5. Type Coverage
- What percentage of the codebase is typed?
- Are there untyped JavaScript files in a TypeScript project? (.js files alongside .ts)
- Are there `@ts-check` comments in JavaScript files? (Incremental typing)
- Is there a `allowJs: true` with strict checks on JS files?

### 6. Generic / Advanced Type Usage
- Are generics used where appropriate? (Not duplicating types for different data)
- Are discriminated unions used for state management? (Instead of optional fields)
- Are utility types used? (Partial, Required, Pick, Omit — not hand-rolled equivalents)
- Are there overly complex types that are hard to understand?

## How to Assess (by stack)

- **TypeScript**: Check tsconfig.json strict settings, grep for `any`, `@ts-ignore`, `as unknown`, count .js vs .ts files, check Zod/Joi usage
- **Python**: Check mypy/pyright config, grep for `# type: ignore`, `Any` imports, count typed vs untyped functions, check Pydantic usage
- **Go**: Check for `interface{}` / `any` usage, `reflect` package usage, type assertions without checks
- **Elixir/Phoenix**: Check `@spec`/`@type` annotations, Dialyzer config (`.dialyzer_ignore.exs`), typed structs, pattern matching exhaustiveness
- **PHP/Laravel**: Check `declare(strict_types=1)`, type hints on functions/methods, PHPStan level (1-9), Psalm analysis, return type declarations
- **Rust**: Check for `unsafe` blocks, `.unwrap()` calls (panic on error), `Box<dyn Any>`
- **Java**: Check for raw types (List vs List<String>), @SuppressWarnings("unchecked"), Object casts
- **.NET**: Check for `dynamic`, `object` casts, nullable reference types enabled

## Shallow Mode
Config and count checks only — no usage analysis:
- Check type system config: is `strict: true` in `tsconfig.json`? Is mypy/pyright configured? What strictness level?
- Count escape hatches: grep for `any` (TS), `# type: ignore` (Python), `unsafe` (Rust), `@SuppressWarnings` (Java)
- Is a runtime validation library present? (Zod, Joi, Pydantic, class-validator, dry-validation)
- Count `.js` vs `.ts` files in a TypeScript project

## Deep Mode (default)
All of Shallow Mode, plus:
- Analyze `any`/escape hatch usage by location: are they in critical code (auth, payments, data handling) or peripheral code (legacy, third-party integrations)?
- Trace untyped boundaries: are API request/response types defined? Are database query results typed? Are external API responses typed?
- Verify runtime validation at system boundaries: API input, form input, config, message queue payloads — is there a schema validation library at each entry point?
- Assess type coverage across modules: are there entire directories that are untyped?
- Review escape hatches: are `@ts-ignore`, `as any`, `# type: ignore` comments justified? Or are they silencing real type errors?

## Severity Guide
- **CRITICAL**: No type checking in a large codebase, API boundaries completely untyped (no input validation), `any` in security-critical code
- **HIGH**: `strict: false` in TypeScript, hundreds of `any` types, no runtime validation at API boundaries, untyped database results in business logic
- **MEDIUM**: Some strict flags disabled (especially `strictNullChecks`), runtime validation inconsistent, many `@ts-ignore`, no typed env vars
- **LOW**: Minor `any` usage in non-critical areas, no advanced type features, some .js files in a TS project, overly complex types

## Output
Write report to: `vibeguard-reports/skill-reports/qual-type-safety.md`
Follow the output contract at `references/skill-output-contract.md`.
