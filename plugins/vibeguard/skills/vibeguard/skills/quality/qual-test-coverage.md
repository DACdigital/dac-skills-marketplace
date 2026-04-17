---
name: qual-test-coverage
description: Assess test coverage tooling, thresholds, critical path coverage, and coverage enforcement
---

# Skill: qual-test-coverage

## Domain: Quality
## Purpose
Assess test coverage tooling, thresholds, critical path coverage, and coverage enforcement.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Coverage metrics tell you what's tested, but not how well. 90% line coverage with zero branch coverage misses every edge case. 100% coverage on utility functions with 0% on auth and payment logic is a false sense of security. The goal isn't a number — it's confidence that the code paths that matter are exercised. Coverage tools make the gaps visible; thresholds prevent erosion over time.

### 1. Coverage Tooling
- Is a coverage tool configured? (Istanbul/nyc, c8, coverage.py, SimpleCov, go test -cover, tarpaulin, JaCoCo, Cobertura)
- Is coverage collection automated? (Part of test command or CI step)
- Is a coverage report generated? (HTML, LCOV, Cobertura XML)
- Is coverage uploaded to a service? (Codecov, Coveralls, SonarQube)

### 2. Coverage Thresholds
- Are minimum coverage thresholds configured?
- What are the thresholds? (Line, branch, function, statement)
- Do thresholds fail the build when not met?
- Are thresholds at a reasonable level? (80%+ for mature projects, lower is understandable for new/rapid development)

### 3. Critical Path Coverage
- Are the most critical code paths well-covered?
  - Authentication & authorization logic
  - Payment/financial operations
  - Data mutation operations (create, update, delete)
  - API endpoint handlers
  - Business rule implementations
  - Error handling paths
- Is coverage concentrated in low-risk areas and missing from high-risk areas?

### 4. Coverage Quality
- High line coverage doesn't mean good testing. Look for:
  - **Branch coverage**: are conditional paths (if/else, switch, ternary) covered?
  - **Edge case coverage**: are boundary conditions tested? (Empty lists, null values, max values)
  - **Error path coverage**: are catch blocks and error handlers tested?
  - **Happy path only**: are tests only testing the success case?

### 5. Coverage Trends
- Is coverage trending up or down? (Check CI dashboard, coverage service history)
- Is there a ratchet mechanism? (Coverage can only increase, not decrease)
- Are new files required to have coverage?

### 6. Coverage Exclusions
- What's excluded from coverage? (Config files, migrations, generated code, type definitions)
- Are exclusions reasonable? (Not excluding large parts of the codebase to inflate numbers)
- Are there `/* istanbul ignore */` or `# pragma: no cover` comments? Are they justified?

## How to Assess (by stack)

- **Node.js/Jest**: Check `jest.config` for `coverageThreshold`, `collectCoverage`, `coverageDirectory`, `coverageReporters`
- **Node.js/Vitest**: Check `vitest.config` for `coverage` config, `c8`/`istanbul` provider
- **Python/Pytest**: Check `.coveragerc`, `pyproject.toml [tool.coverage]`, `--cov` flag in test commands
- **Go**: Check `go test -cover`, `-coverprofile`, coverage thresholds in CI scripts
- **Ruby**: Check `SimpleCov` config in `spec_helper.rb`, minimum coverage settings
- **Java**: Check JaCoCo/Cobertura plugin config, `minimum` coverage rules in build config
- **.NET**: Check `coverlet` config, `dotnet test --collect:"XPlat Code Coverage"`, threshold settings
- **Elixir/Phoenix**: Check `mix test --cover`, `ExCoveralls` config, coverage thresholds in CI, `coveralls.json`
- **PHP/Laravel**: Check `PHPUnit` coverage with PCOV/Xdebug, `phpunit.xml` coverage config, CI coverage reporting
- **Rust**: Check `cargo tarpaulin` or `llvm-cov` config

## Shallow Mode
Config and dependency checks only — no coverage analysis:
- Is a coverage tool in dependencies? (Istanbul/nyc, c8, coverage.py, SimpleCov, JaCoCo, tarpaulin, ExCoveralls)
- Is coverage configured in the test config? (Thresholds, reporters, output directory)
- Is there a coverage step in CI? Is coverage uploaded to a service (Codecov, Coveralls, SonarQube)?

## Deep Mode (default)
All of Shallow Mode, plus:
- Check coverage thresholds: are they configured? At what level? Do they fail the build?
- Map coverage to critical code paths: is auth, payment, data mutation logic covered? Or is coverage concentrated in low-risk utilities?
- Review coverage exclusions: search for `istanbul ignore`, `pragma: no cover`, `nocov` — are they justified?
- Assess coverage quality: is branch coverage tracked (not just line)? Are error paths covered?
- Check for coverage ratchet: can coverage go down on a PR, or is there a minimum that only increases?

## Severity Guide
- **CRITICAL**: No coverage tooling at all on a production codebase with significant business logic
- **HIGH**: Coverage tool exists but no thresholds enforced, critical paths (auth, payments) with zero coverage, coverage exclusions hiding untested business logic
- **MEDIUM**: Coverage below 50%, no branch coverage tracking, coverage not in CI, coverage declining over time
- **LOW**: No coverage service/dashboard, no ratchet mechanism, new files not required to have coverage, coverage exclusions not documented

## Output
Write report to: `vibeguard-reports/skill-reports/qual-test-coverage.md`
Follow the output contract at `references/skill-output-contract.md`.
