---
name: qual-code-patterns
description: Assess code quality patterns — dead code, TODO/FIXME inventory, duplication, complexity, dependency cycles
---

# Skill: qual-code-patterns

## Domain: Quality
## Purpose
Assess code quality patterns — dead code, TODO/FIXME inventory, code duplication, complexity metrics, and dependency cycles.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Code quality patterns are leading indicators of maintenance burden and bug risk. Dead code confuses developers about what's active. TODOs in critical paths are deferred bugs. Circular dependencies make changes unpredictable. God objects resist refactoring. These aren't theoretical — they directly predict where the next production incident will come from. Focus on patterns in critical code paths first.

### 1. Dead Code
- **Unused exports**: functions, classes, constants exported but never imported
- **Unused imports**: imports that are never used in the file
- **Unreachable code**: code after return/throw/break, impossible conditions
- **Commented-out code**: large blocks of commented code (should be in version control, not comments)
- **Unused files**: entire files that are never imported/referenced
- **Deprecated code**: functions/classes marked deprecated but still present with no migration

### 2. TODO/FIXME/HACK Inventory
- Count and categorize `TODO`, `FIXME`, `HACK`, `XXX`, `TEMP`, `WORKAROUND` comments
- Are any in critical code paths? (Auth, payments, data handling)
- Are any security-related? ("TODO: validate input", "HACK: skip auth for now")
- How old are they? (Recent = tracking work, ancient = forgotten)
- Are they linked to issue tracker items?

### 3. Code Duplication
- Are there copy-pasted blocks of code? (Same logic in multiple places)
- Are there near-duplicates? (Same pattern with minor variations that could be abstracted)
- Is duplication in test code? (More acceptable but still worth noting)
- Focus on business logic duplication, not boilerplate

### 4. Complexity
- **Function length**: are there functions longer than ~50 lines? (Hard to understand and test)
- **File length**: are there files longer than ~500 lines? (Should likely be split)
- **Nesting depth**: deeply nested conditionals (if within if within if)?
- **Cyclomatic complexity**: functions with many code paths (many if/switch/loop branches)
- **Parameter count**: functions taking >5 parameters (often a sign of unclear responsibility)
- **God objects/files**: single file/class doing too many things

### 5. Dependency Cycles
- Are there circular imports/dependencies between modules?
- Do layers/domains depend on each other in unexpected directions? (E.g., data layer importing from UI layer)
- Is the dependency direction healthy? (UI → Business Logic → Data, not reversed)

### 6. Naming & Readability
- Are there misleading names? (Function names that don't match what they do)
- Are there extremely short variable names in non-trivial scopes? (Beyond loop counters)
- Are there inconsistent naming conventions? (camelCase mixed with snake_case)
- Are magic strings used instead of named constants?

### 7. Error-Prone Patterns
- **Equality gotchas**: `==` vs `===` (JS), mutable default arguments (Python), etc.
- **Null handling**: excessive null/undefined checks indicating missing type safety
- **String-typed enums**: status checks against string literals instead of constants/enums
- **Implicit type coercion**: operations relying on language-specific coercion behavior
- **Shadowed variables**: inner scope variables masking outer scope variables

## How to Assess (by stack)

- **JavaScript/TypeScript**: Check for unused variables (ESLint), dead exports (ts-prune, knip), commented code, TODO patterns
- **Python**: Check for unused imports (autoflake, ruff), dead code (vulture), complexity (radon, mccabe), circular imports
- **Go**: Check for unused variables (compiler catches), dead code, complexity, import cycles (go vet)
- **Ruby**: Check for dead code (debride), complexity (flog), code smells (reek)
- **Java**: Check for unused code (IntelliJ inspections, PMD), complexity (PMD, SonarQube), circular dependencies
- **Elixir/Phoenix**: Check for unused modules/functions (compiler warnings), `TODO`/`FIXME` comments, complexity via Credo checks, unused `alias`/`import`
- **PHP/Laravel**: Check for unused classes/methods, `TODO`/`FIXME` comments, complexity via PHPStan rules, unused `use` statements
- **Rust**: Check for dead code (compiler warnings), complexity, module cycles

## Shallow Mode
Quick signals only — no deep analysis:
- Search for `TODO`, `FIXME`, `HACK`, `XXX`, `TEMP`, `WORKAROUND` — count and note any in critical paths (auth, payments)
- Look for large blocks of commented-out code (more than 5-10 lines)
- Check for files over 500 lines — list the outliers
- Search for unused imports (many IDEs/linters flag these)

## Deep Mode (default)
All of Shallow Mode, plus:
- Inventory all TODO/FIXME comments with location and content — flag security-related ones as CRITICAL ("TODO: add auth", "FIXME: validate input")
- Analyze function/file length distribution: identify functions over 50 lines and files over 500 lines in critical paths
- Search for circular dependencies: check import graphs for cycles between major modules
- Look for code duplication: repeated business logic patterns across multiple files (not just boilerplate)
- Assess naming and readability: search for single-letter variables in non-trivial scopes, magic strings, inconsistent naming conventions

## Severity Guide
- **CRITICAL**: Security-related TODOs ("TODO: add auth", "FIXME: validate input"), dead code in critical paths that could be confusingly invoked
- **HIGH**: Circular dependencies between major modules, god objects/files managing critical logic, TODO/HACK items in production code paths
- **MEDIUM**: Significant code duplication in business logic, many files >500 lines, functions with cyclomatic complexity >15, ancient unfixed TODOs
- **LOW**: Commented-out code blocks, unused imports, minor naming inconsistencies, test code duplication

## Output
Write report to: `vibeguard-reports/skill-reports/qual-code-patterns.md`
Follow the output contract at `references/skill-output-contract.md`.
