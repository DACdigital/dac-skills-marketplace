---
name: qual-documentation
description: Assess documentation quality — README, API docs, architecture docs, runbooks, onboarding, inline docs
---

# Skill: qual-documentation

## Domain: Quality
## Purpose
Assess documentation quality — README, API docs, architecture docs, runbooks, onboarding guides, and inline documentation.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Documentation is how knowledge survives team turnover. A missing README means every new developer needs a walkthrough from someone. Missing runbooks mean incidents take longer to resolve. Outdated setup instructions mean hours wasted on a problem someone already solved. Wrong API docs mean clients build against a lie. The cost of documentation debt compounds over time — every missing doc is a future interrupt.

### 1. README
- Does it exist?
- Does it cover:
  - **What**: what the project does (one paragraph)
  - **Why**: what problem it solves
  - **How to run**: setup instructions, prerequisites, environment variables
  - **How to develop**: development workflow, running tests, building
  - **How to deploy**: deployment process or link to deployment docs
  - **Architecture**: high-level overview or link to architecture docs
- Is it up to date? (Do the setup instructions actually work? Do referenced commands exist?)
- Is it appropriate length? (Not a wall of text, not a stub)

### 2. API Documentation
- Is there API documentation? (OpenAPI/Swagger spec, GraphQL schema with descriptions, API Blueprint, Postman collection)
- Is it generated from code or manually maintained? (Generated = stays in sync)
- Does it cover all endpoints?
- Are request/response examples included?
- Are error responses documented?
- Is authentication documented?
- Is there a live/interactive API explorer? (Swagger UI, GraphQL Playground)

### 3. Architecture Documentation
- Is there an architecture overview? (Diagrams, component descriptions)
- Are Architecture Decision Records (ADR) maintained? (docs/adr/, decisions/)
- Are data flow diagrams present?
- Are external dependencies and their purposes documented?
- Is the deployment architecture documented?

### 4. Runbooks & Operations
- Are there runbooks for common operational tasks?
  - Deployment procedures
  - Rollback procedures
  - Database migration procedures
  - Incident response playbooks
  - On-call guides
- Are monitoring dashboards documented? (What to look at, what's normal)
- Are alert response procedures documented? (What to do when alert X fires)

### 5. Onboarding Guide
- Is there a guide for new developers?
- Does it cover environment setup end-to-end?
- Are prerequisites listed? (Runtime versions, system dependencies, accounts needed)
- Is there a "getting started in 5 minutes" flow?
- Are common gotchas documented?

### 6. Inline Documentation
- Are complex algorithms/business logic explained with comments?
- Are non-obvious decisions explained? (Why, not what)
- Are public APIs (functions, classes) documented? (JSDoc, docstrings, GoDoc, Javadoc, XML docs)
- Is documentation density appropriate? (Not over-commented boilerplate, not under-commented complex logic)

### 7. Changelog & Release Notes
- Is there a CHANGELOG.md or equivalent?
- Is it maintained? (Updated with releases)
- Are release notes informative? (Not just "bug fixes")
- Is there semantic versioning? (For libraries/packages)

### 8. Contributing Guide
- Is there a CONTRIBUTING.md?
- Does it cover: branching strategy, PR process, code style, testing requirements?
- Is there a code of conduct?
- Are there issue/PR templates?

## How to Assess (by stack)

- **Any project**: Check for README.md, CHANGELOG.md, CONTRIBUTING.md, docs/ directory, ADR directory
- **REST APIs**: Check for OpenAPI spec (openapi.yaml, swagger.json), Swagger UI route
- **GraphQL**: Check for schema descriptions, GraphQL Playground/GraphiQL route
- **Libraries**: Check for API reference docs, examples directory, migration guides
- **Node.js**: Check for JSDoc comments, TypeDoc config, docs scripts in package.json
- **Python**: Check for docstrings, Sphinx/MkDocs config, docs/ directory
- **Go**: Check for GoDoc comments, package-level documentation
- **Java**: Check for Javadoc, documentation site config (Docusaurus, GitBook)
- **Elixir/Phoenix**: Check `@moduledoc`/`@doc` attributes, ExDoc config for doc generation, `mix docs` command, type specs as documentation
- **PHP/Laravel**: Check PHPDoc `/** */` comments, API documentation, `php artisan route:list` for route inventory, README quality
- **Rust**: Check for `///` doc comments, `cargo doc`, docs.rs publishing

## Shallow Mode
File existence checks only — no content quality analysis:
- Check for: README.md, CHANGELOG.md, CONTRIBUTING.md, docs/ directory, ADR directory
- Check for API documentation files: `openapi.yaml`/`swagger.json`, GraphQL schema with descriptions
- Does the README have setup instructions? (Just check section headers, not accuracy)
- Are there runbook/operations docs?

## Deep Mode (default)
All of Shallow Mode, plus:
- Read the README: do setup instructions match actual project structure? (Are referenced commands in package.json? Do listed env vars match `.env.example`?)
- Review API documentation: does it cover all endpoints? Are error responses documented? Is auth documented?
- Check for architecture documentation: diagrams, ADRs, component descriptions — are they current or stale?
- Check for runbooks: deployment procedure, rollback procedure, incident response — are they present for a production system?
- Sample inline documentation: are complex algorithms and non-obvious decisions explained? Is public API documented?

## Severity Guide
- **CRITICAL**: No README at all, no documentation for a complex system with multiple operators
- **HIGH**: README exists but setup instructions are wrong/outdated, no API documentation for a public API, no runbooks for a production system
- **MEDIUM**: Missing architecture documentation, no contributing guide, API docs incomplete, no changelog for a library
- **LOW**: Inline comments sparse on complex logic, no onboarding guide, no ADRs, changelog not maintained

## Output
Write report to: `vibeguard-reports/skill-reports/qual-documentation.md`
Follow the output contract at `references/skill-output-contract.md`.
