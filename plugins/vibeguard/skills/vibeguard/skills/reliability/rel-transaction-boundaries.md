---
name: rel-transaction-boundaries
description: Detect external service calls inside database transactions and unsafe transaction-to-service boundaries — HTTP calls holding DB connections, missing outbox for API calls, webhook handlers without deduplication
---

# Skill: rel-transaction-boundaries

## Domain: Reliability
## Purpose
Detect external service calls inside database transactions and unsafe boundaries between transaction scopes and external I/O — patterns that cause connection pool exhaustion, data inconsistency, and duplicate processing.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

The most dangerous pattern in backend code is an external HTTP call inside a database transaction. While your code waits 10-30 seconds for Stripe to respond, it holds a database connection hostage. With a pool of 20 connections and 20 concurrent payment requests, the entire application freezes — not just payments, but every endpoint that needs the database. The second most dangerous pattern is an external call after a transaction commits with no outbox: if the call fails, the database says "order created" but the payment never happened. Both patterns look correct in testing and fail catastrophically in production under load.

### Scope Boundary
This skill traces the boundary between database transactions and external service calls. For **event/message broker** reliability (Kafka, RabbitMQ, SQS outbox/inbox), see `rel-event-reliability`. For general **connection pool configuration**, see `rel-dependency-health`. For **retry/timeout/circuit-breaker patterns**, see `rel-resilience`.

### 1. External Calls Inside Transaction Scopes
This is the #1 finding to look for. Search for HTTP/API calls inside transaction boundaries:

**What to search for:**
- Transaction markers: `@Transactional`, `@transaction.atomic`, `BEGIN`/`COMMIT`, `Ecto.Multi`, `DB::transaction()`, `dataSource.transaction()`, `Repo.transaction()`
- Inside those boundaries: any HTTP client call, SDK call, email send, cloud storage operation, or external service interaction

**Why this is critical:**
The database connection is held for the entire duration of the external call. If the external service is slow (5-30s), the connection is unavailable to other requests. Under concurrent load, this exhausts the pool and blocks the entire application — not just the endpoint making the external call.

**Saturation math:** (concurrent requests hitting this endpoint) x (external call duration) / (connection pool size). If this approaches 1.0, the endpoint can freeze the entire application. Example: pool of 20, Stripe averaging 5s, 4 concurrent checkouts = 20s of connection time held = pool under stress.

**What to flag:**
- HTTP client calls (`requests.post`, `axios.post`, `restTemplate.postForObject`, `webClient.block()`, `HTTPoison.post`, `Guzzle`, `fetch`) inside transaction blocks
- Payment SDK calls (`stripe.Charge.create`, `braintree`, `paypal`) inside transactions
- Email sends (`sendgrid.send`, `ses.send_email`, `nodemailer.sendMail`, `Mail::send`) inside transactions
- Cloud storage operations (`s3.upload_file`, `gcs_client.upload_blob`) inside transactions
- Any `await` on an HTTP call inside a transaction in async code
- `SELECT FOR UPDATE` followed by an external call before the lock is released

### 2. External Calls After Transaction Without Outbox
When a transaction commits and then an external call is made separately, there's a gap: if the external call fails (network error, timeout, service down), the database state is committed but the side effect never happened. The order is created but the payment never initiated. The user is registered but the welcome email never sent.

**What to search for:**
- A database write (INSERT/UPDATE via ORM or raw SQL) followed by an external service call in the same handler, with no outbox table in between
- Patterns like: `order = Order.create(...)` then `stripe.PaymentIntent.create(...)` — if Stripe fails, the order exists without payment
- The inverse is also a problem: external call first, then DB write — if the DB write fails, the payment happened but no order record exists

**What constitutes an outbox:**
- A database table (often named `outbox`, `external_call_queue`, `pending_tasks`, `jobs`) where the intent to call an external service is stored in the same transaction as the domain data
- A background worker/scheduler that reads pending outbox entries and executes the external calls with retry logic
- The key property: the outbox write and the domain write are in the same transaction — they succeed or fail together

**When an outbox isn't needed:**
- Idempotent operations where eventual retry is acceptable (e.g., analytics events)
- Operations where the external call result doesn't matter to the user (e.g., optional logging)
- Cases where the external service is the source of truth and the DB write depends on its response (valid pattern: call first, write if success)

### 3. Webhook Handlers Without Deduplication
External services (Stripe, PayPal, SendGrid, Twilio) retry webhook deliveries when they don't receive a timely response. If the handler processes the webhook before responding, a timeout causes the provider to retry — and the handler processes it again. Double charges, duplicate emails, double inventory decrements.

**What to search for:**
- Webhook endpoint handlers (routes matching `/webhook*`, `/callback*`, `/hook*`, `/notify*`)
- Check: does the handler store/check a unique event ID before processing? (Stripe sends `event.id`, PayPal sends `txn_id`, etc.)
- Check: does the handler acknowledge (return 200/202) before or after doing the heavy processing?
- Check: is the idempotency check inside the same transaction as the state change?

**What to flag:**
- Webhook handlers that process and then respond (should acknowledge immediately, process async or with dedup)
- No unique constraint or check on webhook event IDs
- Missing idempotency keys on outgoing payment API calls

### 4. Transaction Scope Analysis
Beyond individual patterns, assess the overall transaction discipline:

- **Transaction duration**: are transactions short (sub-second for DB-only work) or long (holding connections while doing non-DB work)?
- **Lock scope**: are `SELECT FOR UPDATE` or advisory locks held while external calls execute?
- **Nested transaction awareness**: do developers understand savepoint behavior in their framework? (Nested `@Transactional` in Spring, `transaction.atomic` blocks in Django)
- **Read-only vs read-write**: are read-only queries inside write transactions unnecessarily? (Bloating transaction scope)

### 5. Service Call Idempotency
When external calls are retried (by outbox worker, retry logic, or webhook redelivery), are they idempotent?

- **Payment APIs**: is an idempotency key passed? (`stripe.PaymentIntent.create(idempotency_key=...)`)
- **Email sends**: can the same email be sent twice safely? (Usually yes, but not for transactional emails with one-time codes)
- **State mutations on external systems**: are external create/update calls using idempotency keys or conditional writes?

## How to Assess (by stack)

- **Python/Django**: Search `@transaction.atomic` blocks for `requests.post`, `httpx`, Stripe/SendGrid SDK calls. Check if `transaction.on_commit()` is used to defer external calls. Look for outbox tables in migrations.
- **Python/FastAPI/SQLAlchemy**: Search `async with session.begin()` or `session.commit()` scopes for HTTP calls. Check if external calls happen after session commit without outbox.
- **Java/Spring**: Search `@Transactional` methods for `RestTemplate`, `WebClient`, any `@Autowired` service that makes HTTP calls. Watch for `@Transactional` on class level (makes ALL methods transactional — external calls silently included). Check for `@TransactionalEventListener` for deferred execution.
- **Node.js/TypeORM/Prisma**: Search `dataSource.transaction()`, `prisma.$transaction()` blocks for `axios`, `fetch`, SDK calls. Check if external calls are inside the transaction callback.
- **Ruby/Rails**: Search `ActiveRecord::Base.transaction` blocks for HTTP calls, mailer calls (`.deliver_now` inside transaction). Check for `after_commit` callbacks vs `after_save` (after_save runs inside transaction, after_commit runs after).
- **Go**: Search `tx.Commit()` / `tx.Rollback()` scopes for `http.Client` calls. Check if external calls happen between `Begin()` and `Commit()`.
- **.NET/EF Core**: Search `using var transaction = ...` or `TransactionScope` blocks for `HttpClient` calls. Check if `SaveChanges()` and external calls are in the same scope.
- **Elixir/Phoenix**: Search `Ecto.Multi` and `Repo.transaction()` blocks for `HTTPoison`, `Finch`, `Tesla` calls. Check if `Oban` jobs are inserted inside transactions (good — Oban uses the same transaction) vs direct HTTP calls.
- **PHP/Laravel**: Search `DB::transaction()` blocks for `Http::post()`, Guzzle calls, `Mail::send()`. Check if queue jobs (`dispatch()`) are used inside transactions (Laravel dispatches after commit by default since v8 with `afterCommit`).

## Shallow Mode
Config and schema checks only — no transaction tracing:
- Search migration files for outbox-like tables (`outbox`, `external_call_queue`, `pending_tasks`, `webhook_events`, `inbox`)
- Check webhook routes: is there an event ID / idempotency check? (Search for `event_id`, `idempotency`, `already_processed`, `duplicate`)
- Check if external service SDKs (Stripe, SendGrid, etc.) are in dependencies — if so, there should be outbox/retry infrastructure
- Look for `@TransactionalEventListener`, `transaction.on_commit()`, `after_commit` patterns — signs of awareness

## Deep Mode (default)
All of Shallow Mode, plus:
- Locate all transaction boundaries: search for `@Transactional`, `transaction.atomic`, `BEGIN`/`COMMIT`, `Ecto.Multi`, `DB::transaction()`, `$transaction()`
- For each transaction scope, trace the code path for any external I/O: HTTP calls, SDK calls, email sends, cloud storage operations, external service interactions
- For each external call found inside a transaction: estimate how long the connection is held, calculate saturation risk against pool size
- For external calls after transactions without outbox: assess data inconsistency risk — what happens if the call fails?
- Trace webhook handlers: check for dedup before processing, check acknowledgment timing (before or after processing)
- Check for idempotency keys on outgoing payment/financial API calls
- Search for developer comments near transaction code containing `TODO`, `FIXME`, `slow`, `timeout`, `race condition`, `eventually` — signs of known boundary issues

## Severity Guide
- **CRITICAL**: Payment/financial API calls inside database transactions (connection exhaustion + potential double-charge on timeout/retry), `SELECT FOR UPDATE` held while waiting for external service (deadlock risk under load), webhook handlers processing without dedup on financial operations (double charge, double fulfillment)
- **HIGH**: Any external HTTP call inside a transaction scope (connection pool exhaustion under load), external calls after transaction commit without outbox on critical paths (order creation, user registration — data inconsistency on failure), `@Transactional` on class level silently including methods with external calls
- **MEDIUM**: External calls after transaction without outbox on non-critical paths (analytics, notifications — acceptable loss in some cases), webhook handlers without dedup on non-financial operations, missing idempotency keys on retryable external calls, long transaction scopes that include non-DB work (logging, computation)
- **LOW**: Read-only queries inside write transactions unnecessarily, no outbox for truly fire-and-forget operations, webhook dedup using application logic instead of DB constraint, transaction scopes wider than needed but no external I/O inside

## Output
Write report to: `vibeguard-reports/skill-reports/rel-transaction-boundaries.md`
Follow the output contract at `references/skill-output-contract.md`.
