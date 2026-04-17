---
name: sec-headers
description: Assess HTTP security headers, CORS policy, and cookie security flags
---

# Skill: sec-headers

## Domain: Security
## Purpose
Assess HTTP security headers, CORS policy, and cookie security flags.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Security headers are the cheapest defense available — a few lines of config prevent entire classes of attacks. Missing CSP means any XSS can load scripts from anywhere. Missing HSTS means users can be downgraded to HTTP via MITM. Misconfigured CORS with credentials lets any website make authenticated requests as the user. These are all one-header fixes that prevent real attacks.

### 1. HTTP Security Headers
Check for the presence and correctness of:

- **Content-Security-Policy (CSP)**: Restricts resource loading origins. Is it present? Is it `unsafe-inline`/`unsafe-eval` (weakens it significantly)? Does it use nonces or hashes? Is `default-src` restrictive?
- **Strict-Transport-Security (HSTS)**: Forces HTTPS. Is `max-age` sufficient (≥31536000 = 1 year)? `includeSubDomains` present? `preload` directive?
- **X-Content-Type-Options**: Should be `nosniff`. Prevents MIME sniffing.
- **X-Frame-Options**: Should be `DENY` or `SAMEORIGIN`. Prevents clickjacking. (Or use `frame-ancestors` in CSP instead.)
- **Referrer-Policy**: Should be `strict-origin-when-cross-origin` or more restrictive. Prevents leaking URLs to third parties.
- **Permissions-Policy** (formerly Feature-Policy): Restricts browser features (camera, microphone, geolocation, etc.)
- **X-XSS-Protection**: Legacy, but `0` is correct (disabling it avoids bugs in old browsers; CSP replaces it)
- **Cross-Origin-Opener-Policy (COOP)**: `same-origin` to prevent cross-origin attacks
- **Cross-Origin-Resource-Policy (CORP)**: `same-origin` or `same-site` to prevent cross-origin reads
- **Cross-Origin-Embedder-Policy (COEP)**: `require-corp` for cross-origin isolation

### 2. CORS Configuration
- **Origin validation**: Is `Access-Control-Allow-Origin` set to `*` (bad for credentialed requests) or a specific allowlist?
- **Dynamic origin reflection**: Does the server reflect the `Origin` header without validation? (Dangerous)
- **Credentials**: If `Access-Control-Allow-Credentials: true`, is the origin allowlist strict?
- **Methods**: Is `Access-Control-Allow-Methods` overly permissive? (e.g., allowing `DELETE` when only `GET/POST` is needed)
- **Headers**: Is `Access-Control-Allow-Headers` overly permissive?
- **Pre-flight caching**: Is `Access-Control-Max-Age` set to reduce pre-flight requests?
- **Null origin**: Does the CORS config allow `null` origin? (Can be spoofed)

### 3. Cookie Security
- **HttpOnly**: Set on session/auth cookies? (Prevents JavaScript access)
- **Secure**: Set on all cookies? (Only sent over HTTPS)
- **SameSite**: Set to `Strict` or `Lax`? (CSRF protection)
- **Domain**: Scoped appropriately? (Not too broad)
- **Path**: Scoped to the application path?
- **Expiration**: Session cookies vs persistent — appropriate for the use case?
- **Cookie prefix**: `__Host-` or `__Secure-` prefix for added security?

### 4. Where Headers Are Set
- **Application middleware**: Express helmet, Django SecurityMiddleware, Spring Security headers, custom middleware
- **Reverse proxy/CDN**: Nginx, Apache, Cloudflare, Vercel, Netlify config
- **Cloud provider**: AWS CloudFront, GCP Load Balancer response headers
- **Framework defaults**: Some frameworks set security headers by default — verify they're not overridden

### 5. Header Consistency
- Are headers set consistently across all response types? (HTML pages, API responses, static files, error pages)
- Are security headers present on error/404 pages?
- In microservices: is each service setting headers, or is there a central gateway?

## How to Assess (by stack)

- **Node.js/Express**: Check for `helmet` middleware, custom header middleware, CORS middleware (`cors` package config)
- **Python/Django**: Check `SECURE_*` settings, `django-cors-headers` config, `SecurityMiddleware`, `SESSION_COOKIE_*` settings
- **Python/FastAPI**: Check `CORSMiddleware` config, custom middleware, response headers
- **Ruby/Rails**: Check `config.force_ssl`, `SecureHeaders` gem, `ActionDispatch::Cookies` config, `rack-cors`
- **Go**: Check middleware for header setting, CORS handler config
- **Java/Spring**: Check `Spring Security` HTTP headers config, CORS config, cookie config
- **.NET**: Check `UseHsts()`, `UseCors()`, cookie policy config, `NWebsec` usage
- **Elixir/Phoenix**: Check `Plug.SSL`, `put_resp_header` in plugs, CORS via `corsica` or custom plug, CSP and security header configuration
- **PHP/Laravel**: Check security headers middleware, `config/cors.php`, CSRF via `VerifyCsrfToken`, `Secure` and `HttpOnly` cookie flags
- **Next.js**: Check `next.config.js` `headers()` function, middleware.ts, `vercel.json` headers
- **Nginx/Apache**: Check server config for `add_header`/`Header set` directives

## Shallow Mode
Config and dependency checks only — no response tracing:
- Is a security header library present? (`helmet` for Express, `SecureHeaders` for Rails, `django-csp`, etc.)
- Check CORS config: is `Access-Control-Allow-Origin` set to `*`? Are credentials allowed with wildcard?
- Check session/cookie config: are `HttpOnly`, `Secure`, `SameSite` flags set?
- Look for CSP configuration — does it exist at all?

## Deep Mode (default)
All of Shallow Mode, plus:
- Trace all places where headers are set: middleware, reverse proxy config (nginx/Apache), CDN settings, framework defaults
- Check header consistency: are security headers present on error pages, API responses, and static files (not just HTML)?
- Analyze CSP policy in detail: look for `unsafe-inline`, `unsafe-eval`, overly broad `script-src` domains
- Read CORS origin validation logic: is it an allowlist check, regex, or just reflecting the Origin header?
- Review every `Set-Cookie` call for `HttpOnly`, `Secure`, `SameSite`, `Domain`, `Path` flags
- In microservices: check whether headers are set at the gateway or per-service

## Severity Guide
- **CRITICAL**: CORS `Access-Control-Allow-Origin: *` with credentials, no CSP and user-generated content rendered
- **HIGH**: Missing HSTS, session cookies without HttpOnly/Secure, CORS reflecting arbitrary origins, CSP with `unsafe-inline` and `unsafe-eval`
- **MEDIUM**: Missing X-Content-Type-Options, missing X-Frame-Options/frame-ancestors, cookies without SameSite, overly permissive CORS methods
- **LOW**: Missing Permissions-Policy, missing CORP/COOP/COEP, no HSTS preload, missing Referrer-Policy

## Output
Write report to: `vibeguard-reports/skill-reports/sec-headers.md`
Follow the output contract at `references/skill-output-contract.md`.
