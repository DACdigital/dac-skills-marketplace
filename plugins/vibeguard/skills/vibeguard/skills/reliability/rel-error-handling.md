---
name: rel-error-handling
description: Assess error handling — uncaught exceptions, error boundaries, error classification, graceful degradation
---

# Skill: rel-error-handling

## Domain: Reliability
## Purpose
Assess error handling practices — uncaught exceptions, error boundaries, error classification, and graceful degradation under failure.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Poor error handling is the most common source of "it works on my machine" production failures. A single unhandled exception can crash a process serving thousands of users. Silent error swallowing causes data corruption that goes undetected for weeks. Inconsistent error responses make clients fragile and debugging impossible. The goal here is to verify that errors are caught, classified, reported, and surfaced — not swallowed or ignored.

### Nuance: Intentional vs Accidental Error Swallowing
Not every empty catch block is a bug. Some are legitimate: cleanup code where failure is acceptable, optional logging, best-effort operations. When you find an empty catch, check context — if it's on a data-write path or payment flow, it's a problem. If it's on a "try to prefetch, ignore if it fails" path, it may be fine. Flag the former as HIGH/CRITICAL, note the latter as acceptable.

### 1. Global Error Handling
- Is there a top-level/global error handler? (uncaught exception handler, unhandled rejection handler)
- Does the process crash on unhandled errors? (In Node.js, it should for uncaught exceptions — but should be caught by a process manager)
- Is there a process manager (PM2, systemd, Kubernetes restart policy) to handle crashes?
- Does the global handler log the error before crashing? (Don't swallow silently)

### 2. HTTP Error Handling
- Is there a centralized error handling middleware/filter?
- Are errors classified correctly? (4xx for client errors, 5xx for server errors — not 200 for everything)
- Are error responses consistent in structure? (Same JSON shape for all errors)
- Are error IDs/codes returned for debugging? (Correlation ID to trace in logs)
- Do errors return appropriate detail? (Enough for the client to act, not so much to leak internals)

### 3. Frontend Error Boundaries (if applicable)
- Are React/Vue/Svelte error boundaries implemented?
- Do they cover the full component tree? (Not just root — nested boundaries for partial failure)
- What happens when an error boundary catches? (Fallback UI, retry option, error reporting)
- Are async errors caught? (Promise rejections in event handlers, useEffect cleanup)

### 4. Async Error Handling
- **Promises**: Are all promises `.catch()`-ed or `await`-ed in try/catch?
- **Event handlers**: Do async event handlers have error handling?
- **Callbacks**: Are error-first callbacks handled? (Node.js callback pattern)
- **Streams**: Are stream errors handled? (`.on('error', ...)`)
- **Fire-and-forget**: Are there async operations that are intentionally not awaited? Are their errors handled?

### 5. Error Propagation
- Are errors propagated correctly up the call stack? (Not swallowed in catch blocks)
- Are errors wrapped with context when re-thrown? (Preserving original stack trace)
- Empty catch blocks — are there `catch {}` or `catch(e) {}` blocks that swallow errors?
- Are errors typed/classified? (Custom error classes, error codes, not just generic Error)

### 6. External Call Error Handling
Focus here on whether errors are *caught and classified* — retry/timeout/circuit-breaker logic is covered by `rel-resilience`, and pool/connection health is covered by `rel-dependency-health`. This skill checks that the error is handled at all.
- **Database calls**: Are connection failures, query timeouts, and constraint violations caught and classified (not silently swallowed or generically re-thrown)?
- **HTTP calls**: Are network errors, timeouts, and non-2xx responses handled with appropriate error types?
- **File operations**: Are I/O errors handled? (File not found, permission denied, disk full)
- **Message queue**: Are publish failures and consume failures caught? Are poison messages handled (messages that always fail processing)?

### 7. Graceful Degradation
- When a non-critical service fails, does the application degrade gracefully or crash entirely?
- Are there fallback paths? (Cache when DB is down, default values when config service fails)
- Is partial failure handled? (Some items in a batch fail — does the whole batch fail?)

### 8. Background Job / Worker Error Handling
- Do background job processors have error handling? (Failed jobs shouldn't disappear silently)
- Is there a dead-letter queue or failed-job table for inspection?
- What happens when a job fails repeatedly? (Retry limit, exponential backoff, alerting)
- Are job errors reported to the same error tracking as HTTP errors?

### 9. Error Reporting
- Is an error tracking service configured? (Sentry, Bugsnag, Rollbar, Datadog, New Relic)
- Are errors reported with sufficient context? (User, request, stack trace, breadcrumbs)
- Is error grouping configured? (Not flooding with duplicate reports)
- Are alerts set on error rates/new error types?

## How to Assess (by stack)

- **Node.js**: Check `process.on('uncaughtException')`, `process.on('unhandledRejection')`, Express error middleware (4-arg function), async wrapper patterns
- **Python**: Check `try/except` patterns, bare `except:` (bad), Django/FastAPI exception handlers, `logging.exception()`, `sys.excepthook`
- **Go**: Check error return values — are they checked? (`if err != nil`), `defer`/`recover` for panics, middleware error handling
- **Ruby/Rails**: Check `rescue` blocks, `ApplicationController` error handling, `rescue_from`, global exception handlers
- **Java/Spring**: Check `@ControllerAdvice`, `@ExceptionHandler`, try-catch patterns, checked vs unchecked exceptions
- **.NET**: Check exception middleware, `IExceptionHandler`, try-catch patterns, global error handling
- **Elixir/Phoenix**: Check `try/rescue` patterns, `with` for error flow, Phoenix error views, `Plug.ErrorHandler`, `Logger` error reporting, Sentry via `sentry-elixir`
- **PHP/Laravel**: Check `app/Exceptions/Handler.php`, `report()`/`render()` methods, `try/catch` patterns, Sentry via `sentry-laravel`, error logging config
- **React**: Check `ErrorBoundary` components, `componentDidCatch`, error boundary coverage
- **Vue**: Check `errorHandler`, `errorCaptured`, error component boundaries

## Shallow Mode
Config and dependency checks only — no source code tracing:
- Is there a global error handler? (Check entry point files for uncaught exception/rejection handlers)
- Is an error tracking service in dependencies? (Sentry, Bugsnag, Rollbar, Datadog, New Relic)
- Is there error middleware registered in the framework config? (Express error handler, Django middleware, etc.)
- Is there a centralized error response format? (Check for a shared error handler/formatter)

## Deep Mode (default)
All of Shallow Mode, plus:
- Search for `catch`, `rescue`, `except`, `recover` blocks across the codebase — check each for error swallowing (empty body, logging-only on critical paths, generic re-throw without context)
- Trace error paths from external calls (DB, HTTP, queue) through the stack to verify they reach the global handler or error reporter
- Verify all async operations (promises, goroutines, tasks) have error handling — search for fire-and-forget patterns
- Analyze error response consistency: hit 3-5 different error-producing endpoints mentally and check the response shape matches
- Review error boundary coverage in frontend (if applicable)
- Check background job error handling and dead-letter/retry configuration

## Severity Guide
- **CRITICAL**: No global error handler (app crashes silently), empty catch blocks on critical operations (data corruption risk), errors swallowed in payment/data-write paths
- **HIGH**: No error tracking/reporting, uncaught promise rejections, no error classification (everything is 500), no frontend error boundaries, background jobs failing silently with no dead-letter/retry
- **MEDIUM**: Inconsistent error response format, partial error handling (some paths covered, others not), generic catch-all without logging, no error handling on fire-and-forget async
- **LOW**: No error IDs/correlation, no graceful degradation, custom errors not classified, no error rate alerting

## Output
Write report to: `vibeguard-reports/skill-reports/rel-error-handling.md`
Follow the output contract at `references/skill-output-contract.md`.
