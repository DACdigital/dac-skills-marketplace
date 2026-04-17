---
name: sec-data-exposure
description: Identify sensitive data exposure — logs, error messages, debug endpoints, URLs, API over-sharing, source maps
---

# Skill: sec-data-exposure

## Domain: Security
## Purpose
Identify places where sensitive data is unintentionally exposed — through logs, error messages, debug endpoints, URLs, or API responses.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Data exposure is the quiet breach — no exploit needed, the application just hands out information it shouldn't. Passwords in logs get shipped to log aggregators accessible to dozens of engineers. Stack traces in production error responses reveal file paths, database structure, and framework versions to attackers. Debug endpoints left enabled let anyone browse internal state. Source maps in production let competitors and attackers read your entire codebase. These findings are trivial to exploit and often trivial to fix.

### 1. Sensitive Data in Logs
For logging *configuration and scrubbing mechanisms* (structured format, log levels, sanitization), see `rel-logging`. This section focuses on identifying *what* sensitive data is exposed.
- **Passwords/credentials**: logged during authentication flows, API calls, debugging
- **Tokens/session IDs**: JWT tokens, session cookies, API keys appearing in log output
- **PII**: names, emails, phone numbers, addresses, SSNs, credit card numbers in logs
- **Request/response bodies**: middleware that logs full request/response bodies (often includes auth headers, passwords)
- **Stack traces with sensitive data**: exception messages containing query parameters, request bodies
- **ORM/SQL query logging**: query logs including bound parameter values (may expose passwords, PII)

### 2. Error Messages Leaking Internals
- **Stack traces to users**: production error responses including full stack traces
- **SQL errors**: database error messages exposing table names, column names, query structure
- **Framework debug pages**: Django debug page, Express default error handler, Rails detailed errors — enabled in production config?
- **Internal paths**: file system paths exposed in error messages
- **Version disclosure**: server headers or error pages revealing framework/language versions
- **Dependency versions**: error pages showing installed package versions

### 3. Debug Endpoints in Production
- **Debug routes**: `/debug`, `/test`, `/admin`, `/phpinfo`, `/info`, `/health/debug`, `/_debug`
- **Profiling endpoints**: performance profilers, memory dumps, thread dumps accessible without auth
- **API documentation endpoints**: Swagger UI, GraphQL Playground, GraphiQL exposed without auth in production
- **Database admin**: phpMyAdmin, Adminer, pgAdmin accessible from the web
- **Development tools**: webpack-dev-server config, hot reload endpoints, source maps served in production
- **Debug flags**: `DEBUG=true`, `NODE_ENV=development`, verbose logging flags in production config

### 4. PII in URLs
- **Query parameters**: user IDs, email addresses, names, tokens in URL query strings (logged by proxies, browsers, analytics)
- **Path parameters**: PII used as URL path segments (e.g., `/users/john.doe@email.com/profile`)
- **Referrer leakage**: PII in URLs leaked via Referrer header to third-party resources

### 5. Over-Exposed API Responses
- **Excessive data**: API endpoints returning full database records when only a subset is needed
- **Internal fields**: `_id`, `password_hash`, `internal_notes`, `created_by` leaked in API responses
- **User enumeration**: different error messages for "user exists" vs "user doesn't exist" on login/registration
- **Admin fields in user responses**: role, permissions, internal flags returned to non-admin users
- **GraphQL introspection**: full schema exposed in production, allowing attackers to map the entire API

### 6. Source Maps & Build Artifacts
- **Source maps in production**: `.map` files served, allowing reconstruction of source code
- **Unminified code**: original source visible in production builds
- **Build artifacts**: `.env` files, test fixtures, development configs included in production builds/Docker images
- **Git directory**: `.git/` directory accessible via web server

## How to Assess (by stack)

- **Node.js/Express**: Check error middleware, `morgan`/`winston`/`pino` logger configs, `NODE_ENV` usage, express error handler
- **Python/Django**: Check `DEBUG` setting, `ADMINS`, logging config, DRF exception handler, Sentry config (does it send PII?)
- **Python/FastAPI**: Check exception handlers, logging middleware, debug mode
- **Ruby/Rails**: Check `config.consider_all_requests_local`, `config.log_level`, exception notification setup
- **Go**: Check error response handlers, logger configuration, debug endpoints
- **Java/Spring**: Check `spring.profiles.active`, error controller, actuator endpoint security, logging config
- **.NET**: Check `ASPNETCORE_ENVIRONMENT`, developer exception page, logging config
- **Elixir/Phoenix**: Check `Logger` config and metadata filtering, error views in `:prod`, `Plug.Debugger` disabled in production, Sentry PII scrubbing
- **PHP/Laravel**: Check `APP_DEBUG=false` in production, `config/logging.php` for PII, error handler in `Handler.php`, Sentry context scrubbing
- **Next.js**: Check `next.config.js` source maps, error pages, API error responses

## Shallow Mode
Config checks only — no source code tracing:
- Is debug mode disabled in production config? (`DEBUG=false`, `NODE_ENV=production`, `ASPNETCORE_ENVIRONMENT=Production`)
- Is there an error handler that produces user-safe error responses?
- Check build config: are source maps disabled for production builds? (`productionSourceMap: false`, `devtool: false`)
- Check logger config: is the log level appropriate for production? (Not `debug` or `trace`)
- Is `.git` excluded from deployed artifacts? (Check `.dockerignore`, deployment config)

## Deep Mode (default)
All of Shallow Mode, plus:
- Trace error handling to verify production responses don't include stack traces, SQL errors, or file paths
- Search logging statements for sensitive data patterns: search for `log` calls near `password`, `token`, `secret`, `ssn`, `credit_card`
- Search for debug endpoints: grep for routes matching `/debug`, `/test`, `/admin`, `/phpinfo`, `/_debug`, `/graphiql`, `/playground`
- Check API response serializers/transformers: do they explicitly select fields (good) or dump entire models (bad)?
- Verify build output: check that `.map` files, `.env` files, and test fixtures are excluded from production artifacts
- Check error tracking (Sentry, etc.) config: is PII scrubbing enabled?

## Severity Guide
- **CRITICAL**: Passwords/tokens in logs, stack traces in production error responses, debug mode enabled in production, `.git` directory accessible
- **HIGH**: PII in logs, debug endpoints without auth, GraphQL introspection in production, source maps served in production, full SQL errors exposed
- **MEDIUM**: API responses with excessive internal fields, user enumeration possible, verbose error messages, ORM query logging with parameters
- **LOW**: Server version disclosure, missing version stripping headers, API docs without auth (if public API)

## Output
Write report to: `vibeguard-reports/skill-reports/sec-data-exposure.md`
Follow the output contract at `references/skill-output-contract.md`.
