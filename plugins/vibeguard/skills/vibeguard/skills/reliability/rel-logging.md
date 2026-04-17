---
name: rel-logging
description: Assess logging practices — structured logging, log levels, correlation IDs, sensitive data in logs, centralized aggregation
---

# Skill: rel-logging

## Domain: Reliability
## Purpose
Assess logging practices — structured logging, log levels, correlation IDs, sensitive data in logs, and centralized logging configuration.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Logging is how you debug production problems. Without structured logs, finding the root cause of an incident means grepping through walls of text. Without correlation IDs, you can't trace a single request across services. Without proper log levels, production logs are either too noisy to search or too quiet to diagnose. And sensitive data in logs means your log aggregator becomes a liability — accessible to dozens of engineers, shipped to third-party services, retained for months.

### Scope Boundary
This skill assesses logging *infrastructure and practices* — structured format, log levels, correlation IDs, sanitization mechanisms. For identifying *specific sensitive data types* exposed through logs, error messages, debug endpoints, and other channels, see `sec-data-exposure`.

### 1. Structured Logging
- Are logs structured (JSON) or unstructured (plain text)?
- Structured logging enables searching, filtering, and alerting in log aggregation systems
- Is the log format consistent across the application? (Same fields, same structure)
- Are key fields included: timestamp, level, message, service name, request ID?

### 2. Log Levels
- Are log levels used appropriately?
  - `ERROR`/`FATAL`: actual errors that need investigation
  - `WARN`: unexpected but handled situations
  - `INFO`: significant business events (user created, order placed, payment processed)
  - `DEBUG`/`TRACE`: developer diagnostics, not in production
- Is the log level configurable at runtime? (Without redeployment)
- Is `DEBUG` level disabled in production config?
- Are logs at the right level? (Not `INFO` for every function call, not `ERROR` for expected validation failures)

### 3. Correlation/Request IDs
- Is there a request ID/correlation ID generated for each request?
- Is it propagated through the entire request lifecycle? (From HTTP handler through service layer to database calls)
- Is it included in all log entries for the request?
- Is it returned to the client? (In a response header for support debugging)
- In microservices: is the correlation ID passed between services? (Distributed tracing)

### 4. Sensitive Data in Logs
- Are passwords, tokens, API keys, session IDs logged? (CRITICAL)
- Is PII (names, emails, phone numbers, addresses) logged? (May violate GDPR/CCPA)
- Are request/response bodies logged? (May contain sensitive data)
- Are SQL queries logged with bound parameter values? (May contain sensitive data)
- Is there a log sanitization/scrubbing mechanism? (Masking, redaction)
- Are credit card numbers, SSNs, or health information logged?

### 5. Log Configuration
- Is logging configured in one place? (Not scattered logger creation)
- Is the logger a global/shared instance or created per-module?
- Are log outputs configurable? (Console for dev, file/service for production)
- Is there log rotation configured? (For file-based logging)
- Are log files included in `.gitignore`?

### 6. Centralized Log Aggregation
- Is there a log aggregation service? (ELK, Datadog, CloudWatch, Grafana Loki, Papertrail, Logtail)
- Are logs shipped from all services/instances to the central system?
- Is there search/filter capability?
- Are log retention policies configured?

### 7. Error Logging
- Are errors logged with full context? (Stack trace, request data, user context)
- Are errors logged at the appropriate level? (Not swallowed, not logged multiple times as they propagate)
- Is there error deduplication? (Same error logged once, not once per retry)

### 8. Performance & Audit Logging
- Are slow operations logged? (Slow queries, slow HTTP calls, slow endpoints)
- Are significant business events logged? (Audit trail for compliance)
- Are authentication events logged? (Login, logout, failed attempts, password changes)
- Are authorization failures logged?

## How to Assess (by stack)

- **Node.js**: Check for `winston`, `pino`, `bunyan` vs bare `console.log`. Check format (JSON?), transport config, log level, request ID middleware (`cls-hooked`, `AsyncLocalStorage`)
- **Python**: Check `logging` module config, `structlog`, `loguru`. Check formatters, handlers, log level, request ID middleware
- **Go**: Check `log/slog` (Go 1.21+), `zap`, `zerolog`, `logrus`. Check structured output, context propagation, middleware
- **Ruby/Rails**: Check `Rails.logger`, `Lograge` (structured Rails logs), `SemanticLogger`. Check log level, formatters, tagged logging
- **Java/Spring**: Check `SLF4J`/`Logback`/`Log4j2` config, MDC for correlation IDs, structured logging (Logstash encoder), actuator log levels
- **.NET**: Check `ILogger`/`Serilog`/`NLog` config, structured logging, `IHttpContextAccessor` for correlation, log sinks
- **Elixir/Phoenix**: Check `Logger` config in `config/*.exs`, structured metadata via `Logger.metadata/1`, log levels per environment, correlation IDs in Plug pipelines
- **PHP/Laravel**: Check `config/logging.php`, Monolog channels and handlers, structured JSON logging, request ID middleware for correlation
- **Rust**: Check `tracing`, `log`, `env_logger`, `slog`. Check structured output, span propagation

## Shallow Mode
Config and dependency checks only — no log statement analysis:
- Is a structured logging library present? (winston, pino, structlog, slog, Lograge, Serilog — not bare `console.log` or `print`)
- Check logger config: is the format JSON? Is the log level set appropriately for production?
- Is correlation/request ID middleware configured? (Check middleware stack)
- Is a log aggregation service referenced? (ELK, Datadog, CloudWatch, Loki, Papertrail)

## Deep Mode (default)
All of Shallow Mode, plus:
- Search for `console.log`, `print()`, `fmt.Println`, `System.out.println` in production source code — these should use the logger
- Search for sensitive data near log calls: grep for `log` within 2 lines of `password`, `token`, `secret`, `ssn`, `credit_card`, `authorization`
- Trace correlation ID: is it generated at request entry, included in all log calls, passed to downstream services, returned in response headers?
- Sample 5-10 log statements across the codebase: are log levels appropriate? (Not INFO for debug noise, not ERROR for expected validation failures)
- Check error logging: are errors logged with stack traces and request context?

## Severity Guide
- **CRITICAL**: Passwords/tokens/credentials in logs, PII logged without consent/compliance mechanism
- **HIGH**: No structured logging (plain text, unsearchable), no request/correlation IDs, sensitive request/response bodies logged, `console.log` in production code
- **MEDIUM**: Debug logging enabled in production, inconsistent log format, missing error context in logs, no centralized log aggregation
- **LOW**: No log level runtime configuration, no audit logging, no slow operation logging, log rotation not configured

## Output
Write report to: `vibeguard-reports/skill-reports/rel-logging.md`
Follow the output contract at `references/skill-output-contract.md`.
