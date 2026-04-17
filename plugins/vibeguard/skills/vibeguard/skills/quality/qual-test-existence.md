---
name: qual-test-existence
description: Assess whether tests exist, frameworks are configured, test-to-source ratio, CI integration
---

# Skill: qual-test-existence

## Domain: Quality
## Purpose
Assess whether tests exist, test frameworks are configured, and the test-to-source ratio is healthy.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Tests are the only automated proof that code does what it's supposed to. Without them, every deployment is a gamble — the only way to know if something broke is when users report it. A production codebase without tests can't be safely refactored, can't catch regressions, and makes every code review a guessing game about what might break. The question isn't whether you need tests — it's whether the important things are tested.

### 1. Test Files Present
- Do test files exist in the repository?
- Where are they? (Colocated with source, separate `test/`/`tests/`/`__tests__`/`spec/` directory)
- How many test files vs source files? (Test-to-source file ratio)
- Are there test files for all major modules/features? Or only some areas?

### 2. Test Framework Configuration
- Is a test framework installed and configured?
- Is the config file present? (jest.config, vitest.config, pytest.ini, .rspec, etc.)
- Are test commands defined? (In package.json scripts, Makefile, CI config)
- Can tests be run with a single command?

### 3. Test-to-Source Ratio
- Approximate ratio of test lines to source lines
- Are there modules with zero test coverage? (Identify the gaps)
- Is the ratio reasonable for the project type? (Libraries should be higher, prototypes lower)

### 4. Test Organization
- Are tests organized in a discoverable pattern? (Test runner can find them automatically)
- Are test files named conventionally? (*.test.*, *.spec.*, test_*, *_test.*)
- Is there a clear structure? (Unit tests vs integration tests in different dirs/patterns)

### 5. Test Infrastructure
- Are test utilities/helpers present? (Factories, fixtures, mocks, test database setup)
- Is there a test database or test environment configuration?
- Are there shared test fixtures?
- Is there test setup/teardown handling?

### 6. CI Integration
- Are tests run in the CI pipeline?
- Is the test step a required check for merging?
- Do tests run on every PR?
- Is the test run reliable? (Not flaky — check for retry/rerun config)

### 7. Test Gaps
- List the major source directories/modules that have NO corresponding tests
- Are critical paths untested? (Auth, payment, data mutations, API endpoints)
- Are recently changed files tested? (Hot areas of the codebase)

## How to Assess (by stack)

- **Node.js**: Look for jest/vitest/mocha in devDependencies, `*.test.ts`, `*.spec.ts`, `__tests__/` dirs, `test` script in package.json
- **Python**: Look for pytest/unittest in requirements, `test_*.py`, `*_test.py`, `tests/` dirs, pytest.ini/setup.cfg/pyproject.toml [tool.pytest]
- **Go**: Look for `*_test.go` files (built into the language), `go test` in CI
- **Ruby**: Look for rspec/minitest in Gemfile, `spec/` or `test/` dirs, `.rspec` config
- **Java**: Look for JUnit/TestNG in dependencies, `src/test/`, `*Test.java`, `*Spec.java`
- **.NET**: Look for xUnit/NUnit/MSTest in `.csproj`, `*.Tests` projects, `*Tests.cs`
- **Elixir/Phoenix**: Check `test/` directory, `ExUnit` framework, `test_helper.exs` setup, `mix test` command
- **PHP/Laravel**: Check `tests/` directory, `PHPUnit`/`Pest` framework, `phpunit.xml` config, `php artisan test` command
- **Rust**: Look for `#[test]` in source files, `tests/` integration test dir

## Shallow Mode
File counting and config checks only — no test content analysis:
- Count test files vs source files (approximate ratio)
- Is a test framework in dependencies? (Jest, Vitest, Pytest, RSpec, ExUnit, PHPUnit, etc.)
- Is there a test command in package scripts, Makefile, or CI? (`npm test`, `mix test`, `go test ./...`)
- Is there a test step in CI config? Is it a required check for merge?

## Deep Mode (default)
All of Shallow Mode, plus:
- Map source modules/directories to test files: which areas have tests and which have zero?
- Read a sample of test files: are they real tests with assertions, or empty stubs/skipped tests?
- Identify untested critical paths: auth, payments, data mutations, API endpoints — do they have corresponding test files?
- Check test infrastructure: are there test helpers, factories, fixtures, test database config?
- Verify CI test enforcement: do tests run on every PR? Is the check required for merge?

## Severity Guide
- **CRITICAL**: No tests exist at all, no test framework configured
- **HIGH**: Tests exist but not in CI (never run automatically), critical paths untested (auth, payments, data writes), test-to-source ratio < 0.1
- **MEDIUM**: Many modules with zero tests, test framework configured but few actual tests, tests not required for merge
- **LOW**: Test organization inconsistent, no test utilities/helpers, some areas under-tested but core paths covered

## Output
Write report to: `vibeguard-reports/skill-reports/qual-test-existence.md`
Follow the output contract at `references/skill-output-contract.md`.
