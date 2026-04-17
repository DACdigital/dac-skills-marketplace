---
name: sec-input-validation
description: Identify injection surfaces — SQLi, XSS, command injection, path traversal, SSRF, and input validation patterns
---

# Skill: sec-input-validation

## Domain: Security
## Purpose
Identify injection surfaces — places where untrusted input reaches dangerous sinks without proper sanitization or validation.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Injection is the most dangerous class of web vulnerability. A single unparameterized SQL query can dump the entire database. An XSS in stored user content gives an attacker session tokens for every user who views it. Command injection grants shell access to the server. These attacks are automated at scale — bots probe every public endpoint. The defense is systematic: validate at boundaries, parameterize queries, escape output, never trust user input.

### False Positive Awareness
Not every use of `exec()` or raw SQL is a vulnerability. The key question is: does user-controlled data flow into the dangerous sink? A raw SQL query with only hardcoded strings or server-generated values is fine. An `exec()` that only runs a fixed command is fine. Focus on the data flow, not just the function name.

### 1. SQL Injection
- **String interpolation in queries**: template literals, f-strings, string concatenation used to build SQL
- **Raw query usage**: ORM escape hatches (`.raw()`, `execute()`, `$queryRaw`) without parameterization
- **Dynamic table/column names**: user input used to select tables or columns without allowlisting
- **ORDER BY injection**: dynamic sort fields from user input without validation
- **LIKE clause injection**: unescaped `%` and `_` wildcards from user input
- **Stored procedures**: user input passed to stored procs without validation

### 2. Cross-Site Scripting (XSS)
- **Reflected XSS**: user input rendered directly in HTML responses without escaping
- **Stored XSS**: user-provided content stored and later rendered without sanitization
- **DOM XSS**: client-side JavaScript using `innerHTML`, `document.write`, `eval()` with user data
- **Framework bypasses**: React's `dangerouslySetInnerHTML`, Vue's `v-html`, Angular's `bypassSecurityTrust*`, Svelte's `{@html}`
- **Template injection**: server-side template engines with unescaped output (Jinja2 `|safe`, EJS `<%-`, Pug `!=`)
- **Markdown/rich text**: user-generated content rendered as HTML without sanitization (DOMPurify, sanitize-html)
- **SVG/image uploads**: SVG files with embedded scripts

### 3. Command Injection
- **Shell execution**: `exec()`, `spawn()`, `system()`, `os.popen()`, backtick operators with user input
- **Argument injection**: user input passed as arguments to shell commands without escaping
- **Path traversal in commands**: user input in file paths passed to shell commands

### 4. Path Traversal
- **File reads**: user input in file paths (`../../etc/passwd` vectors)
- **File uploads**: user-controlled filenames used for storage without sanitization
- **Static file serving**: directory traversal in URL paths to access files outside webroot
- **Zip extraction**: zip slip vulnerability (archive entries with `../` paths)

### 5. Server-Side Request Forgery (SSRF)
- **URL input**: user-provided URLs fetched server-side without validation
- **Redirect following**: HTTP client following redirects to internal hosts
- **DNS rebinding**: hostname validation that doesn't account for DNS changes
- **Internal network access**: requests to `127.0.0.1`, `169.254.169.254` (cloud metadata), `10.*`, `172.16-31.*`, `192.168.*`

### 6. Other Injection Vectors
- **LDAP injection**: user input in LDAP queries
- **XML injection/XXE**: XML parsing with external entity expansion enabled
- **NoSQL injection**: MongoDB/DynamoDB query operators from user input (`$gt`, `$ne`, `$regex`)
- **Header injection**: user input in HTTP headers (CRLF injection)
- **Log injection**: user input written to logs without sanitization (log forging)
- **Regex injection**: user input compiled as regex (ReDoS — catastrophic backtracking)
- **Expression language injection**: user input in template expressions, OGNL, SpEL

### 7. Input Validation Patterns
- **Allowlisting vs denylisting**: is validation based on what's allowed (good) or what's blocked (fragile)?
- **Validation library usage**: Zod, Joi, Yup, class-validator, Pydantic, marshmallow, dry-validation
- **Validation at boundaries**: is input validated at API entry points before reaching business logic?
- **Type coercion**: is `"1"` vs `1` vs `true` handled safely?
- **Request size limits**: are there max body/upload size limits?

## How to Assess (by stack)

- **Node.js**: Check for `eval()`, `new Function()`, `child_process.exec()`, `innerHTML` in React/Vue/Svelte, express-validator/Zod/Joi usage
- **Python**: Check for `eval()`, `exec()`, `os.system()`, `subprocess` with `shell=True`, f-strings in SQL, Jinja2 `|safe` filter
- **Go**: Check for `os/exec` with user input, `html/template` vs `text/template`, SQL string building
- **Ruby**: Check for `eval`, `system()`, backticks, `send()` with user input, ERB `raw`/`html_safe`
- **Java**: Check for `Runtime.exec()`, `ProcessBuilder`, JDBC string concat, JNDI lookups, XML parsers with external entities
- **PHP**: Check for `eval()`, `exec()`, `system()`, `include()` with user input, `mysqli_query` with string concat
- **.NET**: Check for `Process.Start()`, string concat in EF queries, `XmlReader` without DTD disabled
- **Elixir/Phoenix**: Check `Ecto.Changeset` cast/validate, `Plug.Parsers` size limits, raw SQL via `Ecto.Adapters.SQL.query`, Phoenix `html_safe` patterns

## Shallow Mode
Pattern-matching only — no data flow tracing:
- Search for dangerous functions: `eval()`, `exec()`, `system()`, `innerHTML`, `dangerouslySetInnerHTML`, `v-html`, `raw()`, `$queryRaw`
- Check if a validation library is in dependencies (Zod, Joi, Pydantic, class-validator, dry-validation)
- Search for string interpolation in SQL-adjacent code: template literals or f-strings near `query`, `execute`, `sql`
- Check for `shell=True` (Python), backtick execution (Ruby/PHP), `child_process.exec` (Node)

## Deep Mode (default)
All of Shallow Mode, plus:
- Trace data flow from HTTP request handlers (params, body, headers, query strings) to dangerous sinks (SQL, shell, HTML output, file system, HTTP client)
- Analyze every ORM raw/escape-hatch query for parameterization
- Check each API endpoint for input validation at the boundary
- Review file upload handling: type validation, filename sanitization, storage path construction
- Analyze URL/redirect handling for SSRF: are user-provided URLs validated against an allowlist? Are internal IPs blocked?
- Check XML parser config for external entity expansion (XXE)

## Severity Guide
- **CRITICAL**: SQL injection via string interpolation, command injection via user input, XSS in stored user content without sanitization, SSRF with access to internal network
- **HIGH**: Raw SQL queries without parameterization, `eval()` with any external input, path traversal on file operations, XXE enabled
- **MEDIUM**: Missing input validation on API endpoints, NoSQL injection vectors, `dangerouslySetInnerHTML` without sanitization, ReDoS-vulnerable regex
- **LOW**: Missing request size limits, validation only on some endpoints, LIKE clause without wildcard escaping

## Output
Write report to: `vibeguard-reports/skill-reports/sec-input-validation.md`
Follow the output contract at `references/skill-output-contract.md`.
