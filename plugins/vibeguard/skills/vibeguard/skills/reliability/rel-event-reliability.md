---
name: rel-event-reliability
description: Assess event-driven messaging reliability — outbox/inbox patterns, event loss vectors, duplicate processing, delivery guarantees
---

# Skill: rel-event-reliability

## Domain: Reliability
## Purpose
Assess event-driven messaging reliability — transactional outbox and inbox patterns, event loss vectors, duplicate processing risks, and delivery guarantees across service boundaries.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Event-driven systems have a fundamental reliability gap: the dual-write problem. If you write to the database and then publish an event, either can fail independently — leaving the system in an inconsistent state. A lost event means a downstream service never learns about a change. A duplicate event means a customer gets charged twice. These aren't edge cases — they're the normal failure mode under load. The outbox pattern, idempotent consumers, and proper acknowledgment are what make event-driven architectures reliable instead of fragile.

### 1. Event Publishing and Transaction Boundaries
- **Dual-write problem**: is event publishing happening outside the database transaction that writes the domain data? (If the transaction commits but the publish fails, the event is lost. If the publish succeeds but the transaction rolls back, a phantom event is sent.)
- **Outbox pattern**: is there an outbox table where events are stored in the same transaction as the domain data?
- **Outbox relay**: is there a background process that reads the outbox and publishes to the message broker? (Polling-based, CDC with Debezium, or trigger-based)
- **Retry on publish failure**: does the relay retry failed publishes? Is there backoff?
- **Outbox cleanup**: are published events marked as sent or deleted from the outbox?
- **Ordering guarantees**: does the outbox preserve event ordering? (Monotonic ID or timestamp-based ordering)

### 2. Event Consumption and Deduplication
- **At-least-once delivery**: message brokers deliver at least once — are consumers prepared for duplicates?
- **Inbox pattern**: is there an inbox table with a unique constraint on event/message ID?
- **Idempotent handlers**: are event handlers idempotent? (Processing the same event twice produces the same result)
- **Deduplication check**: is there a check-before-process pattern? Is the check and processing in the same transaction?
- **Constraint violation handling**: if a duplicate insert fails on the unique constraint, is the error handled gracefully? (Not treated as an unexpected error)
- **Natural idempotency**: are some operations naturally idempotent? (Upserts, setting absolute values vs increments)

### 3. Message Acknowledgment and Visibility
- **Ack timing**: are messages acknowledged before or after processing? (Ack before = message lost on crash. Ack after = potential duplicate on crash.)
- **Visibility timeout**: is the visibility/lock timeout long enough for processing? (If processing takes longer than the timeout, the message becomes visible again and is processed by another consumer)
- **Dead letter queue**: are messages that repeatedly fail moved to a DLQ? (Without DLQ, poison messages block the queue forever)
- **Manual ack vs auto-ack**: is auto-acknowledgment disabled? (Auto-ack loses messages on consumer crash)

### 4. Transaction Isolation and Event Consistency
- **Read-your-writes**: after publishing an event, can a consumer query the database and see the data the event references? (Replication lag in read replicas)
- **Event schema**: do events carry enough data to be processed independently? (If consumers must query back to the producer's database, coupling and consistency issues arise)
- **Eventual consistency windows**: are there UI or API paths that expose inconsistent state during the propagation delay?
- **Compensating transactions**: when a downstream consumer fails, is there a mechanism to compensate or roll back the upstream change?

### 5. Broker Configuration and Delivery Guarantees
- **Broker delivery mode**: is the broker configured for at-least-once or at-most-once delivery? (At-most-once loses messages)
- **Persistent/durable queues**: are queues and exchanges durable? (Non-durable queues lose messages on broker restart)
- **Publisher confirms**: does the producer wait for broker acknowledgment? (Fire-and-forget loses messages if the broker is temporarily unavailable)
- **Consumer prefetch**: is prefetch/batch size configured appropriately? (Too large = many messages in-flight, lost on crash)
- **Partition strategy**: for Kafka/similar, is the partition key chosen to preserve ordering where needed?

## How to Assess (by stack)

- **Node.js**: Check for event publishing inside/outside Knex/Prisma/TypeORM transactions, look for outbox table in migrations, check BullMQ/RabbitMQ/Kafka ack patterns, `@nestjs/cqrs` or `transactional-outbox` usage
- **Python**: Check for event publishing inside/outside SQLAlchemy/Django ORM transactions, `django-outbox` or `sqlalchemy-outbox`, Celery task publishing patterns, `tenacity` retry usage, Kafka/RabbitMQ consumer ack config
- **Go**: Check for event publishing inside/outside `database/sql` transactions, `watermill` library, NATS/Kafka consumer patterns, outbox table in migrations
- **Java/Spring**: Check for `@Transactional` boundaries around event publishing, Spring Modulith, Axon Framework, Eventuate, Debezium CDC, Kafka `@KafkaListener` ack mode, JPA/Hibernate transaction scoping
- **Ruby**: Check for event publishing inside/outside ActiveRecord transactions, Sidekiq job enqueuing patterns, `after_commit` callbacks vs `after_save`
- **.NET**: Check for event publishing inside/outside EF Core transactions, MassTransit/NServiceBus outbox support, `TransactionScope` usage, Azure Service Bus/RabbitMQ consumer patterns
- **Elixir/Phoenix**: Check for event publishing inside/outside `Ecto.Multi` transactions, Broadway/GenStage consumer ack patterns, `Oban` for transactional job insertion (inserted in same transaction via `Ecto.Multi`), Phoenix.PubSub (in-memory only — not persisted, lost on restart)
- **PHP/Laravel**: Check for event dispatching inside/outside DB transactions, `afterCommit` on dispatched queue jobs, Laravel Events/Listeners transaction awareness, Horizon queue worker ack patterns, `failed_jobs` table configuration, `DB::afterCommit()` for event publishing
- **Rust**: Check for event publishing inside/outside `sqlx`/`diesel` transactions, `lapin` (RabbitMQ) or `rdkafka` consumer ack patterns

## Shallow Mode
Config and schema checks only — no event flow tracing:
- Is a message broker in dependencies? (RabbitMQ, Kafka, SQS, NATS, Redis Streams, Oban, Sidekiq)
- Search migration files for outbox/inbox tables
- Check consumer config: is auto-acknowledgment disabled? Is there a DLQ configured?
- Look for event publishing calls near database write operations (same file/function)

## Deep Mode (default)
All of Shallow Mode, plus:
- Trace every event publish call: is it inside the same database transaction as the domain write? If not, is there an outbox pattern?
- Read consumer handlers: are they idempotent? Is there deduplication (inbox table, unique constraint, idempotency check)?
- Map acknowledgment timing: is the message acked before or after processing? (Before = lost on crash, after = duplicate on crash)
- Check broker config: are queues durable? Are publisher confirms enabled? Is prefetch size reasonable?
- Identify all dual-write scenarios and assess event loss vectors for each
- Trace compensating transaction or saga patterns for multi-step cross-service workflows

## Severity Guide
- **CRITICAL**: Event publishing outside database transaction with no outbox pattern (events lost on publish failure or phantom events on rollback), auto-acknowledgment on destructive operations (messages lost on crash), no DLQ configured (poison messages block queue permanently)
- **HIGH**: No deduplication on event consumption (side effects executed multiple times — duplicate charges, duplicate emails), visibility timeout shorter than processing time (messages processed concurrently by multiple consumers), non-durable queues or exchanges (messages lost on broker restart)
- **MEDIUM**: No publisher confirms (messages silently dropped under broker pressure), no compensating transactions for multi-step workflows, outbox table without cleanup (unbounded growth), consumers querying producer database instead of using event payload
- **LOW**: No event ordering guarantees where ordering matters, no metrics on event processing lag, no tracing/correlation IDs on events, eventual consistency windows exposed in UI without indication

## Output
Write report to: `vibeguard-reports/skill-reports/rel-event-reliability.md`
Follow the output contract at `references/skill-output-contract.md`.
