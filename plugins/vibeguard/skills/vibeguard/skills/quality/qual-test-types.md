---
name: qual-test-types
description: Assess test type balance — unit, integration, e2e, contract, snapshot, performance tests
---

# Skill: qual-test-types

## Domain: Quality
## Purpose
Assess the balance and completeness of test types — unit, integration, end-to-end, contract, snapshot, and performance tests.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Different test types catch different classes of bugs. Unit tests verify logic in isolation (fast, precise). Integration tests verify components work together (catch interface mismatches). E2E tests verify the user's experience (catch deployment/config issues). Missing a layer means missing an entire class of bugs. An inverted pyramid (mostly E2E, few unit tests) makes CI slow and fragile. The right balance depends on the project, but every layer matters.

### 1. Unit Tests
- Do unit tests exist? (Test individual functions/methods in isolation)
- Are dependencies mocked/stubbed appropriately? (Not testing the database in unit tests)
- Are unit tests fast? (Should run in seconds, not minutes)
- Are they focused? (Testing one behavior per test, not kitchen-sink tests)

### 2. Integration Tests
- Do integration tests exist? (Test components working together)
- Do they test real integrations? (Actual database, actual API calls to local services)
- Are external dependencies handled? (Test containers, in-memory databases, local services)
- Do they cover API endpoints end-to-end? (Request → handler → database → response)

### 3. End-to-End (E2E) Tests
- Do E2E tests exist? (Test the full application from the user's perspective)
- What tool? (Cypress, Playwright, Selenium, Puppeteer)
- Do they cover critical user flows? (Registration, login, core business operations, checkout)
- Are they reliable? (Not flaky — check for retry mechanisms, wait strategies)
- Are they fast enough to run in CI? (Or are they in a separate pipeline?)

### 4. Contract Tests (if microservices)
- Are there contract tests between services? (Pact, Spring Cloud Contract)
- Do they verify API contracts remain compatible?
- Are both consumer and provider tests present?
- Are they run in CI?

### 5. Snapshot Tests
- Are snapshot tests used? (Jest snapshots, approval tests)
- Are they meaningful? (Not just serializing large objects — focused on specific output)
- Are snapshots reviewed during code review? (Not blindly updated)
- Are they stable? (Not breaking on every minor change)

### 6. Performance/Load Tests
- Do performance tests exist? (k6, Artillery, Locust, JMeter, Gatling, wrk, ab)
- Do they test realistic scenarios? (Not just "can it respond")
- Are there performance baselines/budgets? (Response time thresholds, throughput targets)
- Are they run regularly? (In CI, on a schedule, before releases)

### 7. Test Pyramid Health
- What's the ratio? (Many unit tests, fewer integration, fewest E2E — the classic pyramid)
- Or is it inverted? (Many E2E, few unit tests — slow, fragile, expensive)
- Or is it missing a layer? (All unit tests, no integration — miss integration bugs)
- Is the balance appropriate for the project type?

### 8. Test Quality Signals
- Are tests readable? (Clear names, arrange-act-assert pattern, not testing implementation details)
- Are there test helpers/factories? (Not duplicating setup across tests)
- Are tests independent? (Can run in any order, no shared state between tests)
- Are there flaky tests? (Tests that sometimes pass, sometimes fail — look for retries, `.skip`)

## How to Assess (by stack)

- **Node.js**: Jest/Vitest for unit, Supertest for integration, Cypress/Playwright for E2E, Pact for contract, k6/Artillery for perf
- **Python**: Pytest for unit/integration, Selenium/Playwright for E2E, Locust for perf, factory_boy/faker for test data
- **Go**: `testing` package for unit, `httptest` for integration, testcontainers for external deps
- **Ruby**: RSpec/Minitest for unit/integration, Capybara for E2E, factory_bot for test data
- **Java**: JUnit for unit, Spring Boot Test for integration, Selenium for E2E, Gatling/JMeter for perf, Testcontainers
- **.NET**: xUnit/NUnit for unit, `WebApplicationFactory` for integration, Playwright for E2E, NBomber for perf
- **Elixir/Phoenix**: Check `ExUnit` for unit/integration, Wallaby for browser E2E, Mox for mock-based testing, test organization in `test/`
- **PHP/Laravel**: Check `PHPUnit`/`Pest` for unit, Laravel HTTP tests for integration, Dusk for browser E2E, Mockery for mocking

## Shallow Mode
Framework and file presence checks only — no test content analysis:
- Which test frameworks are in dependencies? (Unit: Jest/Vitest/Pytest/ExUnit. Integration: Supertest/httptest. E2E: Cypress/Playwright. Perf: k6/Locust)
- Are there test directories for each type? (e.g., `test/unit/`, `test/integration/`, `e2e/`, `test/`)
- Count test files by pattern/directory to estimate the type distribution

## Deep Mode (default)
All of Shallow Mode, plus:
- Analyze test pyramid balance: count tests by type and assess ratio (many unit, fewer integration, fewest E2E = healthy)
- Review test quality in each category: are unit tests truly isolated? Do integration tests use real databases? Do E2E tests cover critical flows?
- Check critical flow coverage across types: is authentication tested at unit, integration, and E2E levels?
- Search for flaky test signals: `.skip`, `.only`, retry config, `@flaky` annotations — these indicate reliability issues
- If microservices: are there contract tests? (Pact, Spring Cloud Contract)

## Severity Guide
- **CRITICAL**: No tests of any type on production code, only E2E with no unit/integration (extremely fragile)
- **HIGH**: No integration tests (miss cross-component bugs), no E2E for critical user flows, inverted test pyramid (slow CI, fragile tests)
- **MEDIUM**: Missing one test type that's important for the project (e.g., no contract tests in microservices), no performance tests for user-facing application, flaky tests in CI
- **LOW**: No snapshot tests, test pyramid slightly imbalanced, no performance baselines, test helpers could be better

## Output
Write report to: `vibeguard-reports/skill-reports/qual-test-types.md`
Follow the output contract at `references/skill-output-contract.md`.
