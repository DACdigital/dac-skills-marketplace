---
name: sec-authentication
description: Assess authentication implementation — sessions, tokens, passwords, MFA, SSO, and bypass vectors
---

# Skill: sec-authentication

## Domain: Security
## Purpose
Assess the authentication implementation for correctness, completeness, and resistance to common attacks.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Broken authentication is consistently in the OWASP Top 10 because it's the front door. A weak session ID can be brute-forced. A JWT without expiry is a permanent access token. A password reset flow with a guessable token means anyone can take over any account. Authentication flaws don't just affect one user — they often cascade to full system compromise.

### 1. Session Management
- How are sessions created, stored, and invalidated?
- Session ID entropy — is it cryptographically random?
- Session fixation protection — is the session ID regenerated after login?
- Session expiration — is there a timeout? Is it enforced server-side?
- Session storage — server-side (good) vs client-side only (risky)?
- Concurrent session handling — can a user have unlimited sessions?
- Logout — does it actually destroy the session server-side?

### 2. Token Handling (JWT/OAuth)
- **JWT specifics**:
  - Algorithm: is `none` algorithm rejected? Is `HS256` with a weak secret used? Is `RS256` properly configured?
  - Expiration: do tokens have `exp` claims? Is expiry reasonable (not days/weeks)?
  - Validation: is the full token validated (signature + claims) on every request?
  - Storage: where are tokens stored client-side? (HttpOnly cookie = good, localStorage = risky, sessionStorage = acceptable)
  - Refresh tokens: do they exist? Are they rotated on use? Is there revocation?
  - Token payload: does it contain sensitive data (passwords, full user records)?
- **OAuth/OIDC**: state parameter used, PKCE for public clients, token exchange validated, redirect URI validation

### 3. Password Handling
- Hashing algorithm: bcrypt/scrypt/argon2 (good) vs MD5/SHA1/SHA256 without salt (bad)
- Salt: is it unique per user and cryptographically random?
- Password requirements enforced (length, complexity — length > complexity)?
- Password stored in plaintext anywhere (logs, debug output, error messages)?
- Password reset: is it time-limited? Does it invalidate previous tokens? Is it guessable?
- Account lockout: is there brute force protection?

### 4. Multi-Factor Authentication
- Is MFA available? Is it enforced for sensitive operations?
- TOTP implementation: proper secret generation, backup codes, recovery flow
- WebAuthn/FIDO2 support signals

### 5. SSO/External Auth Integration
- OAuth2/OIDC provider configuration
- SAML configuration (if enterprise)
- Proper redirect URI validation (no open redirects)
- State parameter to prevent CSRF
- Nonce for replay protection

### 6. Authentication Bypass Vectors
- Routes/endpoints without auth middleware that should have it
- Auth checks in frontend only (no server-side enforcement)
- API endpoints accessible without authentication
- Admin endpoints with weak or missing auth
- WebSocket connections without auth
- File upload/download endpoints without auth

## How to Assess (by stack)

- **Node.js/Express**: Check passport.js config, express-session setup, JWT libraries (jsonwebtoken, jose), cookie settings, middleware chain
- **Python/Django**: Check AUTH_USER_MODEL, authentication backends, SESSION_ENGINE, password hashers, django-allauth/django-rest-auth config
- **Python/FastAPI**: Check dependency injection for auth, OAuth2PasswordBearer, JWT handling, security utilities
- **Ruby/Rails**: Check Devise config, has_secure_password, session store, Warden strategies
- **Go**: Check auth middleware, JWT libraries, session packages, bcrypt usage
- **Java/Spring**: Check Spring Security config, authentication providers, session management, password encoders
- **.NET**: Check Identity config, authentication schemes, JWT bearer config, cookie auth settings
- **Elixir/Phoenix**: Check `phx.gen.auth`, `Guardian` or `Pow`, `Comeonin`/`Bcrypt`/`Argon2` for passwords, `Plug` session config, token handling
- **PHP/Laravel**: Check `Sanctum`/`Passport`/`Fortify` config, `Hash::make()`, session config, `auth` middleware, `config/auth.php`
- **Next.js/Nuxt**: Check next-auth/auth.js config, middleware.ts, API route protection, server component auth

## Shallow Mode
Config and dependency checks only — no source code tracing:
- Is an auth library present? (Passport, Devise, Spring Security, Guardian, Sanctum, etc.)
- Is a password hashing library present? (bcrypt, argon2, scrypt — not just `crypto` or `hashlib`)
- Is auth middleware referenced in route definitions or framework config?
- Check session/JWT config files for obvious issues: missing expiry, `DEBUG` mode, `none` algorithm
- Is there an auth-related `.env` variable for secret/key configuration?

## Deep Mode (default)
All of Shallow Mode, plus:
- Trace the full authentication flow: login request → credential verification → session/token creation → session storage → subsequent request validation
- Verify every route has appropriate auth middleware — search for route definitions and check which have auth guards
- Read JWT validation logic: is the signature verified? Are claims (`exp`, `iss`, `aud`) checked? Is the `none` algorithm rejected?
- Analyze password reset flow: is the token time-limited? Single-use? Cryptographically random?
- Search for auth bypasses: `// TODO`, `SKIP_AUTH`, test-only auth shortcuts left in production config
- Check session config values: expiry, cookie flags, storage backend

## Severity Guide
- **CRITICAL**: No authentication on sensitive endpoints, passwords in plaintext, JWT `none` algorithm accepted, session fixation
- **HIGH**: Weak password hashing (MD5/SHA without salt), no token expiry, tokens in localStorage with XSS vectors, no logout invalidation
- **MEDIUM**: No MFA support, no brute force protection, no session expiry, missing CSRF on auth endpoints
- **LOW**: No concurrent session limits, password policy only enforced client-side, no account lockout

## Output
Write report to: `vibeguard-reports/skill-reports/sec-authentication.md`
Follow the output contract at `references/skill-output-contract.md`.
