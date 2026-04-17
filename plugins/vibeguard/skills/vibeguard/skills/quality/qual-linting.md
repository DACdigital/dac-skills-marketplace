---
name: qual-linting
description: Assess linting, formatting, and type checking — tool presence, CI enforcement, rule customization
---

# Skill: qual-linting

## Domain: Quality
## Purpose
Assess linting, formatting, and type checking configuration — tool presence, CI enforcement, and rule customization.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Linting and formatting are automated code review for consistency and common bugs. Without them, every PR has style debates instead of substance. Without type checking, entire categories of bugs (null reference, wrong argument types, missing fields) slip through to production. These tools catch problems at write-time instead of runtime — they're the cheapest form of quality assurance.

### 1. Linter Configuration
- Is a linter configured for each language in the project?
  - **JavaScript/TypeScript**: ESLint, Biome
  - **Python**: Ruff, Flake8, Pylint, Bandit (security)
  - **Go**: golangci-lint, go vet, staticcheck
  - **Ruby**: RuboCop
  - **Rust**: clippy
  - **Java**: Checkstyle, PMD, SpotBugs
  - **PHP**: PHP_CodeSniffer, PHPStan, Psalm
  - **C#**: Roslyn analyzers, StyleCop
- Is the linter config file present? (.eslintrc, biome.json, ruff.toml, .rubocop.yml, etc.)
- Is the configuration customized or default? (Some customization is healthy)

### 2. Formatter Configuration
- Is a code formatter configured?
  - **JavaScript/TypeScript**: Prettier, Biome
  - **Python**: Black, Ruff format, YAPF
  - **Go**: gofmt (built-in), goimports
  - **Ruby**: RuboCop (formatter mode), standardrb
  - **Rust**: rustfmt
  - **Java**: google-java-format, Spotless
  - **General**: EditorConfig (.editorconfig)
- Is formatting enforced? (CI check, pre-commit hook, editor integration)
- Is there a format-check command? (Not just format — check that formatting is correct)

### 3. Type Checking
- Is static type checking configured?
  - **TypeScript**: `tsconfig.json` with `strict: true`? What strict flags are enabled?
  - **Python**: mypy, pyright, pytype configured? Type hints used?
  - **Flow**: still used? (Usually migrated to TypeScript by now)
  - **Go/Rust/Java/.NET**: type checking is inherent — but check for `any` equivalents
- Is type checking in CI?
- Are there `@ts-ignore`, `# type: ignore`, `any` casts? How many?

### 4. Pre-Commit Hooks
- Are pre-commit hooks configured? (husky, lint-staged, pre-commit framework)
- What runs on commit? (Lint, format, type check, tests?)
- Do hooks run on staged files only? (Fast) or entire codebase? (Slow)
- Can hooks be bypassed? (`--no-verify`) Is this common?

### 5. CI Enforcement
- Are linting, formatting, and type checking run in CI?
- Do they fail the build on violations?
- Are they required checks for PR merge?
- Are they fast enough to not be a bottleneck?

### 6. Rule Customization
- Are there disabled rules? Which ones, and are they justified?
- Are there inline suppressions? (`// eslint-disable`, `# noqa`, `// nolint`) How many?
- Are suppressions for valid reasons or just to silence warnings?
- Are security-focused lint rules enabled? (eslint-plugin-security, bandit, gosec)

### 7. IDE Integration
- Is there an editor config? (.editorconfig, .vscode/settings.json, .idea/)
- Are recommended extensions specified? (.vscode/extensions.json)
- Is format-on-save configured?

## How to Assess (by stack)

- **Node.js/TypeScript**: Check for ESLint/Biome config, Prettier config, tsconfig.json strict settings, husky/lint-staged, package.json lint scripts
- **Python**: Check for Ruff/Flake8 config, Black/Ruff format config, mypy/pyright config, pre-commit config
- **Go**: Check for golangci-lint config (.golangci.yml), gofmt in CI, go vet in CI
- **Ruby**: Check for .rubocop.yml, standardrb, overcommit gem
- **Elixir/Phoenix**: Check `Credo` for linting, `mix format` for formatting, `Dialyzer` for type checking, `Sobelow` for security static analysis
- **PHP/Laravel**: Check `PHP_CodeSniffer`/`Pint` for formatting, `PHPStan`/`Psalm` for static analysis, CI enforcement of these tools
- **Rust**: Check for clippy in CI, rustfmt.toml, `#[allow()]` attributes
- **Java**: Check for Checkstyle/PMD config, Spotless plugin, CI enforcement
- **.NET**: Check for .editorconfig rules, analyzer packages, Directory.Build.props

## Shallow Mode
Config file existence checks only — no suppression analysis:
- Is a linter config present? (`.eslintrc`, `biome.json`, `ruff.toml`, `.rubocop.yml`, `.golangci.yml`)
- Is a formatter config present? (`.prettierrc`, `biome.json`, `rustfmt.toml`, `.editorconfig`)
- Is type checking configured? (`tsconfig.json`, `mypy.ini`, `pyrightconfig.json`, `.dialyzer_ignore.exs`)
- Are lint/format commands in CI or package scripts?

## Deep Mode (default)
All of Shallow Mode, plus:
- Count inline suppressions: search for `eslint-disable`, `noqa`, `nolint`, `@ts-ignore`, `#[allow(`, `@SuppressWarnings` — how many? Are they justified?
- Review disabled rules in config: are security-focused rules enabled? Are any important rules disabled?
- Check TypeScript `strict` mode flags individually (especially `strictNullChecks` and `noImplicitAny`)
- Verify CI enforcement: do lint/format/type-check steps run on every PR? Do they block merge?
- Check pre-commit hooks: is `husky`/`lint-staged`/`pre-commit` configured? Does it run lint + format on staged files?

## Severity Guide
- **CRITICAL**: (rare for linting — but) type checking completely disabled on a large TypeScript codebase with `any` everywhere
- **HIGH**: No linter configured, no formatter configured (inconsistent code style), type checking not in CI, hundreds of inline suppressions
- **MEDIUM**: Linter configured but not in CI, pre-commit hooks not set up, strict mode not fully enabled, security lint rules not enabled
- **LOW**: Some inline suppressions without justification, no editor config, formatter configured but not enforced, no recommended extensions

## Output
Write report to: `vibeguard-reports/skill-reports/qual-linting.md`
Follow the output contract at `references/skill-output-contract.md`.
