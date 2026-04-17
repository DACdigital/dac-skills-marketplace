---
name: data-privacy
description: Assess data privacy practices — PII identification, retention policies, right-to-erasure, data export, consent management, and data minimization
---

# Skill: data-privacy

## Domain: Data
## Purpose
Assess data privacy practices — PII identification, retention policies, right-to-erasure capability, data export, consent management, and data minimization.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Privacy violations carry real legal and financial consequences. GDPR fines can reach 4% of global annual revenue. A missing right-to-erasure capability means you can't comply with deletion requests. PII in logs means sensitive data is shipped to third-party aggregators, retained for months, and accessible to anyone with log access. Production data in dev environments means every developer has access to real customer PII. These aren't just compliance checkboxes — they're real exposure vectors.

### 1. PII Identification
- What PII is collected? (Names, emails, phone numbers, addresses, IP addresses, dates of birth, government IDs, biometric data, location data)
- Where is PII stored? (Which databases, tables, columns, file stores)
- Is PII documented? (Data inventory, data flow diagrams, privacy impact assessment)
- Is PII classified by sensitivity? (Public, internal, confidential, restricted)

### 2. Data Minimization
- Is only necessary data collected? (No fields "for future use")
- Are optional fields truly optional? (Not required by the schema when they shouldn't be)
- Is data collected at the right granularity? (Full address vs ZIP code, exact birthday vs age range)
- Are analytics/tracking collecting more data than needed?

### 3. Data Retention
- Is there a retention policy? (How long is data kept?)
- Is retention automated? (Scheduled cleanup/archival jobs)
- Are different data types retained for different periods? (Transaction records vs session data vs analytics)
- Is there a mechanism to purge expired data?
- Are backups subject to retention policies? (Old backups may contain data that should be deleted)

### 4. Right to Erasure (GDPR Article 17 / "Right to be Forgotten")
- Can a specific user's data be deleted?
- Is deletion complete? (All tables, all services, search indexes, caches, logs)
- Is deletion cascading? (User deleted → their comments, uploads, activity logs also deleted or anonymized)
- Are there data that cannot be deleted? (Legal requirements, financial records) — is this documented?
- Is soft delete vs hard delete appropriate? (Soft delete doesn't satisfy right to erasure)

### 5. Data Export (Portability)
- Can a user export their data? (GDPR Article 20)
- Is the export in a machine-readable format? (JSON, CSV, not PDF)
- Is the export complete? (All data related to the user)
- Is the export process automated or manual?

### 6. Consent Management
- Is there a consent mechanism? (Cookie consent, data processing consent, marketing consent)
- Are consent records stored? (Who consented, to what, when, how)
- Can consent be withdrawn? Does withdrawal trigger data deletion/processing stop?
- Is consent granular? (Not just "agree to everything")
- Is data processing conditional on consent? (No processing before consent granted)

### 7. Data Anonymization & Pseudonymization
- Is there anonymization for analytics/reporting? (Aggregation, k-anonymity)
- Is pseudonymization used where full identification isn't needed?
- Is anonymization reversible? (It shouldn't be — that's pseudonymization)
- For development/testing: is production data anonymized before use?

### 8. Third-Party Data Sharing
- Is PII shared with third parties? (Analytics, advertising, payment processors, support tools)
- Is sharing documented and consented to?
- Are data processing agreements (DPA) in place? (Evidence in config or documentation)
- Is data shared minimally? (Only what the third party needs)

### 9. Data in Non-Obvious Places
- **Logs**: PII in application logs, access logs, error logs
- **Caches**: PII in Redis/Memcached without TTL (persists indefinitely)
- **Search indexes**: PII in Elasticsearch/Algolia (needs deletion sync)
- **Message queues**: PII in unprocessed messages
- **Analytics**: PII in event tracking, user properties
- **Error tracking**: PII in Sentry/Bugsnag reports (user context, breadcrumbs)
- **CDN/Edge caches**: PII in cached responses

## How to Assess (by stack)

- **Any ORM**: Scan model/entity definitions for PII fields (name, email, phone, address, etc.)
- **Django**: Check for `django-gdpr-assist`, `django-privacy`, anonymization tools
- **Rails**: Check for `paranoia`/`discard` gems (soft delete), `acts_as_paranoid`, PII handling patterns
- **Node.js**: Check for GDPR libraries, data export endpoints, deletion cascades
- **Elixir/Phoenix**: Check PII fields in Ecto schemas, `Ecto.Changeset` data filtering, user deletion/anonymization endpoints, data export routes
- **PHP/Laravel**: Check PII in Eloquent models, `$hidden` model attribute, soft deletes, `spatie/laravel-personal-data-export`, user deletion routes
- **Go**: Check struct field tags for PII markers, deletion handlers, data export endpoints, anonymization in query builders
- **Java/Spring**: Check JPA entity PII fields, `@JsonIgnore` for API exposure, `CascadeType.REMOVE` for deletion, Spring Data export queries
- **.NET**: Check EF Core entity PII properties, `[JsonIgnore]` attributes, GDPR helper packages, deletion cascade config
- **Any framework**: Look for `/account/delete`, `/account/export`, `/privacy`, `/consent` endpoints
- **Analytics**: Check Segment/Mixpanel/GA config for PII settings, anonymization
- **Error tracking**: Check Sentry/Bugsnag config for PII scrubbing (`beforeSend`, `beforeBreadcrumb`)

## Shallow Mode
Schema and endpoint checks only — no data flow tracing:
- Scan model/entity definitions for PII fields (name, email, phone, address, SSN, DOB, IP)
- Search routes for deletion/export endpoints (`/account/delete`, `/account/export`, `/privacy`, `/consent`)
- Check error tracking config (Sentry, Bugsnag): is PII scrubbing enabled? (`beforeSend`, `beforeBreadcrumb`)
- Check analytics config: is IP anonymization or PII filtering enabled?
- Check for data retention/cleanup job configuration

## Deep Mode (default)
All of Shallow Mode, plus:
- Map complete PII flow: collection (forms, APIs) → storage (DB, files) → processing (analytics, ML) → sharing (third parties) → deletion
- Verify deletion cascade: when a user is deleted, trace what happens to their data in all tables, file storage, search indexes, cache, logs
- Check all third-party integrations for PII: what data is sent to analytics, error tracking, email services, payment processors?
- Search logs, cache writes, and queue payloads for PII patterns (email, phone, name near log/cache/queue calls)
- Verify anonymization: if production data is used in dev/staging, is it anonymized? Check for sanitization scripts or data masking config

## Severity Guide
- **CRITICAL**: No ability to delete user data (regulatory violation), PII shared with third parties without consent, PII in logs without retention/scrubbing, production data in development without anonymization
- **HIGH**: No data retention policy, no consent management, incomplete user data deletion (orphaned PII), PII in error tracking without scrubbing
- **MEDIUM**: No data minimization review, soft delete only (no hard delete option), no data export capability, no PII documentation/inventory
- **LOW**: No anonymization for analytics, consent not granular, no data flow documentation, third-party DPA not evidenced in code

## Output
Write report to: `vibeguard-reports/skill-reports/data-privacy.md`
Follow the output contract at `references/skill-output-contract.md`.
