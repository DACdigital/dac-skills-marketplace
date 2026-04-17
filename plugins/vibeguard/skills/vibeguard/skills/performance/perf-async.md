---
name: perf-async
description: Assess background job and async processing — queue config, worker scaling, retry/DLQ, job idempotency
---

# Skill: perf-async

## Domain: Performance
## Purpose
Assess background job and async processing — job system configuration, queue management, worker scaling, retry/dead-letter handling, and long-running request detection.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Synchronous operations in the request path are the most common cause of slow APIs. Every email sent inline adds 200-2000ms. Every PDF generated synchronously blocks a connection. Every webhook delivered in the request path means a slow third-party makes your endpoint slow. Background jobs are the pattern that turns "user waits 10 seconds" into "user gets instant response, work happens in the background." But a poorly configured job system loses jobs, retries forever, or silently drops failures.

### 1. Background Job System
- Is there a background job/task system? (Celery, Sidekiq, Bull/BullMQ, Bee-Queue, Hangfire, Spring Batch, Faktory, Temporal, Inngest)
- Is it appropriate for the workload? (Simple queue vs workflow engine)
- Is the job system configured for production? (Not just development defaults)

### 2. What Should Be Async
- Are there operations in the request path that should be background jobs?
  - Email/SMS sending
  - Report/PDF generation
  - Image/video processing
  - Data export (CSV, bulk export)
  - Third-party API calls that aren't immediately needed
  - Webhook deliveries
  - Cleanup/maintenance tasks
  - Analytics event processing
  - Search index updates
- Are these currently synchronous? (User waiting for email to send = poor UX)

### 3. Queue Configuration
- How many queues? Are they separated by priority/type? (Critical vs default vs low-priority)
- Is there a dedicated queue for time-sensitive jobs? (Password reset email vs weekly report)
- Are queue sizes monitored? (Growing queue = workers can't keep up)
- Is there queue persistence? (Jobs survive broker restart)

### 4. Worker Configuration
- How many workers? Is it appropriate for the workload?
- Is worker count configurable/scalable? (Not hardcoded)
- Is concurrency per worker configured? (Not too many — overwhelms dependencies; not too few — wastes capacity)
- Are workers monitored? (CPU, memory, throughput, latency)
- Do workers handle shutdown gracefully? (Complete in-progress job before stopping)

### 5. Retry & Error Handling
- Do failed jobs retry? (With backoff)
- Is there a max retry count?
- Is the backoff strategy appropriate? (Exponential with jitter)
- Are non-retryable errors excluded from retry? (Bad input, auth failure)
- Are retry attempts logged? (For debugging)

### 6. Dead Letter Queue (DLQ)
- Is there a DLQ for jobs that fail all retries?
- Is the DLQ monitored and alerted on?
- Is there a mechanism to inspect and replay DLQ jobs?
- Are DLQ jobs preserved for debugging? (Not just discarded)

### 7. Job Idempotency
- Are jobs idempotent? (Safe to process the same job twice)
- Is there deduplication? (Same job not enqueued twice)
- Are there unique job constraints? (Only one instance of a specific job at a time)

### 8. Scheduled/Cron Jobs
- Are there scheduled/periodic jobs? (Daily reports, cleanup, sync)
- Are they configured reliably? (Not just system cron — what if the server changes?)
- Is there protection against overlapping runs? (Lock, skip-if-running)
- Are scheduled jobs monitored? (Alert if a scheduled job doesn't run)

### 9. Long-Running Request Detection
- Are there endpoints that take >5s to respond? (Should be async)
- Is there a request timeout? (Don't let requests hang indefinitely)
- Are there streaming responses for large data? (SSE, chunked transfer, WebSocket)
- Is there progress feedback for long operations? (Polling endpoint, WebSocket updates)

## How to Assess (by stack)

- **Node.js**: Check for `bull`/`bullmq`, `bee-queue`, `agenda`, `node-cron`, `cron` in dependencies. Check queue config, worker processes
- **Python**: Check for `celery`, `rq`, `dramatiq`, `huey`, `arq`. Check celery config, beat schedule, worker command
- **Ruby**: Check for `sidekiq`, `resque`, `good_job`, `delayed_job`. Check config, queues, scheduled tasks
- **Go**: Check for `asynq`, `machinery`, custom goroutine workers, cron libraries
- **Java/Spring**: Check for `@Async`, `@Scheduled`, Spring Batch, Quartz scheduler
- **.NET**: Check for Hangfire, MassTransit, `IHostedService`, `BackgroundService`
- **Serverless**: Check for SQS/SNS triggers, Lambda async invocation, Step Functions
- **Elixir/Phoenix**: Check `Oban` for background jobs, `GenServer`/`Task.Supervisor` for async work, Broadway for data pipelines, job retry and snooze config
- **PHP/Laravel**: Check Laravel Queue with Horizon, `failed_jobs` table, retry/backoff config, job batching, `ShouldQueue` interface usage

## Shallow Mode
Config and dependency checks only — no job auditing:
- Is a background job library present? (Sidekiq, Celery, BullMQ, Oban, Hangfire, Laravel Queue)
- Is queue configuration present? (Redis connection, queue names, worker count)
- Is there scheduled job config? (Cron, beat schedule, Oban crontab, Laravel Scheduler)
- Quick check: search for email sending, PDF generation, or webhook delivery in HTTP handlers — are they synchronous?

## Deep Mode (default)
All of Shallow Mode, plus:
- Map all operations that should be async: email/SMS, report generation, image/video processing, data export, webhook delivery, analytics — verify each is dispatched to a background job
- Analyze retry config: is there exponential backoff? Max retries? Are non-retryable errors excluded?
- Check DLQ: are failed jobs moved to a dead-letter queue? Is it monitored and alerted?
- Verify job idempotency: are critical jobs (payment processing, data sync) safe to process twice?
- Review worker config: is concurrency appropriate? Do workers shut down gracefully? Are they monitored?
- Identify long-running request paths: are there endpoints that take >5s? Should they return immediately with a job ID and use polling/webhooks for results?

## Severity Guide
- **CRITICAL**: No background job system for email/notification sending (user waits, failures lose messages), synchronous operations that can take >30s in request path, no retry on critical jobs (payment processing, data sync)
- **HIGH**: No DLQ (failed jobs disappear), no retry with backoff, jobs not idempotent, no job monitoring, synchronous operations that should be async
- **MEDIUM**: Queue not separated by priority, no scheduled job monitoring, workers not gracefully shutting down, no job deduplication
- **LOW**: No streaming for large responses, worker count not auto-scaled, no progress feedback for long operations, scheduled jobs using system cron

## Output
Write report to: `vibeguard-reports/skill-reports/perf-async.md`
Follow the output contract at `references/skill-output-contract.md`.
