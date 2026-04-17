---
name: sec-authorization
description: Assess permission enforcement — RBAC/ABAC, route protection, IDOR, privilege escalation vectors
---

# Skill: sec-authorization

## Domain: Security
## Purpose
Assess permission enforcement — whether the application correctly controls who can do what after authentication.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Authorization bugs are among the most exploited vulnerabilities in production apps. An IDOR (changing `/users/123` to `/users/124`) can expose another user's data in seconds. Frontend-only permission checks are no protection — any HTTP client bypasses them. A default-allow posture means every new endpoint is a potential breach until someone remembers to add auth. These bugs are hard to catch in testing because testers usually test with their own accounts.

### 1. Permission Model
- What model is used? RBAC (role-based), ABAC (attribute-based), ACL (access control list), custom?
- Where is the model defined? (database, config, code, external service)
- How many roles/permissions exist? Are they documented?
- Is there a superadmin/god role? How is it protected?

### 2. Enforcement Points
- **Server-side middleware/decorators**: Are permissions checked before business logic executes?
- **Route-level protection**: Is every route explicitly marked with required permissions? Or is it default-deny?
- **Resource-level checks**: When accessing a specific record (e.g., `GET /users/123`), is ownership verified?
- **Field-level access**: Can users see/modify fields they shouldn't? (e.g., user editing their own role)
- **Bulk operations**: Do list/search endpoints respect permissions? Can a user enumerate resources they shouldn't see?

### 3. Privilege Escalation Vectors
- **Horizontal**: Can user A access user B's resources by changing an ID in the URL/request?
- **Vertical**: Can a regular user access admin functionality by guessing endpoints or manipulating requests?
- **Parameter manipulation**: Can a user elevate their role by including `role: admin` in a profile update?
- **IDOR (Insecure Direct Object Reference)**: Are object references (IDs in URLs, request bodies) validated against the requesting user's permissions?

### 4. UI vs Server Enforcement
- Are permission checks ONLY in the frontend (hidden buttons/routes) without server-side enforcement?
- Does the frontend gate match the backend gate? (i.e., if a button is hidden, is the API also protected?)

### 5. Default Posture
- **Default-deny** (good): new routes/resources require explicit permission grants
- **Default-allow** (bad): everything is accessible unless explicitly restricted
- How are new endpoints protected? Is there a pattern that forces developers to declare permissions?

### 6. Cross-Cutting Concerns
- **Multi-tenant authorization**: Can users from tenant A access tenant B's resources?
- **API key scoping**: Are API keys scoped to specific permissions/resources?
- **Webhook/callback authorization**: Are incoming webhooks verified (signatures)?
- **File/resource access**: Are uploaded files accessible only to authorized users?
- **GraphQL**: Are all resolvers individually authorized? (Field-level auth, not just query-level)
- **WebSocket**: Are subscriptions authorized? Can a user subscribe to another user's events?

## How to Assess (by stack)

- **Node.js/Express**: Check middleware chains, casl/casbin/accesscontrol usage, route definitions, custom auth decorators
- **Python/Django**: Check permissions classes, decorators (@permission_required, @login_required), DRF permissions, django-guardian/django-rules
- **Python/FastAPI**: Check Depends() for permission injection, custom permission classes
- **Ruby/Rails**: Check Pundit policies, CanCanCan abilities, before_action filters
- **Go**: Check middleware, casbin usage, custom auth interceptors
- **Java/Spring**: Check @PreAuthorize, @Secured, method security, URL-based security config
- **.NET**: Check [Authorize] attributes, policy-based auth, resource-based auth
- **Elixir/Phoenix**: Check `Plug` pipelines for permission checks, `BodyGuard` policies, custom authorization plugs, Phoenix router scopes with auth
- **PHP/Laravel**: Check Gates/Policies, `authorize()` calls, `can()`/`cannot()`, Spatie Permission, `@can` Blade directives, middleware groups
- **Next.js**: Check middleware.ts, API route guards, server component checks, getServerSideProps auth

## Shallow Mode
Config and dependency checks only — no endpoint tracing:
- Is an authorization library present? (Pundit, CanCanCan, casl, Spring Security, BodyGuard, Spatie Permission, etc.)
- Are permission decorators/middleware referenced in route definitions?
- Is there a permission model? (Roles table, permissions config file, policy classes)
- Check framework config for default auth posture: is it default-deny or default-allow?

## Deep Mode (default)
All of Shallow Mode, plus:
- Map every route/endpoint and verify each has server-side authorization (not just authentication)
- For endpoints that access resources by ID: trace whether ownership is validated (IDOR check)
- Check update/patch endpoints for parameter manipulation: can a user set `role`, `is_admin`, `organization_id` in the request body?
- If GraphQL: check resolvers individually for auth — query-level auth alone is insufficient
- Compare frontend permission gates (hidden buttons, guarded routes) with backend enforcement — look for gaps
- Search for `@public`, `allow_unauthenticated`, `skip_authorization` annotations that might expose sensitive endpoints

## Severity Guide
- **CRITICAL**: No server-side authorization (frontend-only), IDOR on sensitive resources, vertical privilege escalation possible, default-allow posture
- **HIGH**: Missing authorization on admin endpoints, parameter manipulation allows role elevation, bulk endpoints expose unauthorized data
- **MEDIUM**: Inconsistent enforcement (some routes protected, others not), no resource-level checks (only role checks)
- **LOW**: Authorization model not documented, no field-level access control, overly broad roles

## Output
Write report to: `vibeguard-reports/skill-reports/sec-authorization.md`
Follow the output contract at `references/skill-output-contract.md`.
