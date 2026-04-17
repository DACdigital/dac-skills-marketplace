---
name: perf-sync-blockers
description: Detect synchronous long-running operations in HTTP endpoint handlers — email, file processing, external APIs, heavy DB ops blocking request threads
---

# Skill: perf-sync-blockers

## Domain: Performance
## Purpose
Detect synchronous long-running operations inside HTTP endpoint handlers that block request threads, cause timeouts, degrade throughput, and exhaust server resources.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

HTTP requests have timeouts — typically 30-60 seconds at the server, often 29 seconds at API gateways (AWS API Gateway hard limit). Any operation that takes longer than a few seconds inside a request handler is a ticking bomb: it blocks the thread/worker, and under load, all workers get stuck waiting for slow operations. The result is a cascade — new requests queue up, timeouts fire, and the application appears down even though the server is running. The fix is always the same: offload to a background job, return 202 Accepted immediately, and let the client poll or receive a webhook.

### Scope Boundary
This skill traces endpoint handler code for blocking operations. For background job *system configuration* (queues, workers, retry, DLQ), see `perf-async`. For general backend performance (N+1, pagination, caching), see `perf-backend`.

### What Counts as Long-Running

Operations that typically take >2 seconds or have unpredictable duration:

**Definite blockers:**
- Email sending (especially bulk, with attachments)
- PDF/report/export generation (CSV, Excel, large datasets)
- Image/video processing, transcoding, resizing
- File uploads to cloud storage (S3, GCS, Azure Blob)
- Slow external API calls (payment processors, third-party services, AI/ML inference)
- Database-heavy operations (complex aggregations, large batch inserts, data migrations)
- Web scraping, data synchronization
- Cryptographic operations on large payloads

**Context-dependent (flag if no timeout or in a loop):**
- Database queries with complex joins on large tables
- Calls to internal microservices (especially chained sequentially)
- Cache warming operations
- Multiple sequential external API calls

### 1. Endpoint Handler Inventory
- Map all HTTP route handlers/controllers in the codebase
- For each endpoint, trace the execution flow from handler entry to response
- Identify which endpoints call functions that perform I/O, network calls, or CPU-heavy work

### 2. Blocking Operations in Handlers
Search endpoint handler code for these patterns:

**Email sending in request path:**
- `smtp.send`, `sendgrid.send`, `ses.send_email`, `nodemailer.sendMail`, `sgMail.send`, `javaMailSender.send`, `Mail::send`

**File/media processing in request path:**
- Image libraries: `PIL.Image`, `sharp()`, `ImageIO`, `imaging.Resize`, `cv2.imread`, `Mogrify`
- PDF generation: `pdf.generate`, `wkhtmltopdf`, `puppeteer.pdf`, `PdfGenerator`, `TCPDF`, `dompdf`
- Video: `ffmpeg`, transcoding calls
- Excel/CSV: large dataset serialization, `ExcelWriter`, `csv.writer` on big collections

**External API calls without timeouts or in critical path:**
- HTTP clients: `requests.post`, `httpx.post`, `axios.post`, `fetch`, `restTemplate.postForObject`, `webClient.block()`, `HTTPoison.post`, `Guzzle`
- Payment processors: `stripe.Charge.create`, `stripe.charges.create`, `braintree`
- Any third-party SDK call that makes network requests

**Cloud storage uploads in request path:**
- `s3.upload_file`, `s3.putObject`, `gcs_client.upload_blob`, `Azure.Storage.Blobs`

**Heavy database operations:**
- Queries returning unbounded results without pagination
- Bulk inserts/updates on large datasets
- Complex aggregation queries on million-row tables
- Data migration or transformation logic

**Explicit waits and polling in handlers:**
- `time.sleep()`, `Thread.sleep()`, `setTimeout()` with await, `:timer.sleep` — almost always a sign of a polling loop or artificial delay that belongs in a background job
- Busy-wait loops checking for external state (file existence, job completion, third-party status)

### 3. Timeout Configuration
- What are the server timeout settings? (Gunicorn `--timeout`, Uvicorn, Tomcat `connectionTimeout`, Node.js `server.timeout`, Puma `worker_timeout`)
- Are load balancer/API gateway timeouts configured? (These override server timeouts)
- Do HTTP client calls have explicit timeouts? (Missing timeout = infinite wait)
- Are there database query timeouts? (`statement_timeout`, `max_execution_time`)
- Warning signs: timeout values >30s, no timeout configured, comments like "TODO: this is slow"

### 4. Request Thread/Worker Saturation Risk
- How many workers/threads does the server run? (Check process manager config: Gunicorn `--workers`, Puma `threads`, PM2 instances, Tomcat `maxThreads`)
- For each blocking endpoint found, estimate saturation: (concurrent users of this endpoint) x (average blocking time) / (number of workers). If this approaches 1.0, the endpoint can take down the entire application by itself.
- Example: 4 Gunicorn workers, a report endpoint averaging 30s, 4 users requesting simultaneously = 100% saturation, all other endpoints stop responding

### 5. Webhook and Batch Endpoint Patterns
- **Incoming webhooks**: are they acknowledged immediately (200/202) before processing? Or does processing happen before responding? (Webhook providers retry on timeout, causing duplicate processing)
- **Batch/bulk endpoints**: do they accept the batch and process async? Or process all items synchronously?
- **File upload endpoints**: do they stream to storage and process async? Or process inline?
- **Export/download endpoints**: do they generate synchronously? Or generate async and provide a download link?

### 6. Existing Async Infrastructure
- Is there a background job system? (Celery, Sidekiq, BullMQ, Oban, Hangfire, Spring @Async)
- Is it actually used for the blocking operations found? (Having a queue but not using it is a common gap)
- Are there operations that use lightweight in-process async (FastAPI BackgroundTasks, goroutines without persistence) for work that needs a proper queue? (Lost on crash)

## How to Assess (by stack)

- **Python/FastAPI**: Search for blocking calls in `async def` handlers (I/O without `await`, sync libraries in async handlers), check if `BackgroundTasks` is used for heavy work (it shouldn't be — it's in-process), check Celery/RQ/Dramatiq usage
- **Python/Django**: Search views for email sends, PDF generation, external API calls. Check if Celery is configured and used for heavy operations
- **Node.js/Express/NestJS**: Search route handlers for `await` on slow operations (email, file processing, external APIs). Check for BullMQ/Agenda queues. Check if CPU-heavy work uses `worker_threads`
- **Java/Spring**: Search `@RequestMapping`/`@PostMapping` handlers for blocking calls. Check for `@Async` usage, `CompletableFuture`, thread pool config. Watch for `webClient.block()` in reactive handlers
- **Go**: Search HTTP handlers for synchronous external calls, image processing, file uploads. Check for goroutine-based offloading (but note: goroutines without a queue lose work on crash)
- **Ruby/Rails**: Search controller actions for mailer delivery (`.deliver_now` vs `.deliver_later`), PDF generation, external API calls. Check Sidekiq/GoodJob usage
- **.NET**: Search controller actions for blocking calls. Check for Hangfire, `IHostedService`, `BackgroundService`, `Task.Run` patterns
- **Elixir/Phoenix**: Search controller actions for blocking calls. Check `Oban` usage for async work, `Task.Supervisor` for fire-and-forget, `GenServer` for background processing
- **PHP/Laravel**: Search controller methods for email (`Mail::send` vs `Mail::queue`), PDF generation, API calls. Check Laravel Queue usage, `ShouldQueue` interface on jobs/listeners

## Shallow Mode
Config and dependency checks only — no endpoint tracing:
- Is a background job system in dependencies? (Celery, Sidekiq, BullMQ, Oban, Hangfire, etc.)
- Check server timeout configuration: what's the worker timeout? Is it >30s? (Warning sign)
- Check for API gateway/load balancer timeout settings in deployment config
- Quick search: are email-sending libraries called directly in handler files? (Search for `send_email`, `sendMail`, `deliver_now`, `Mail::send` in controller/route files)
- Check if HTTP clients have explicit timeouts configured

## Deep Mode (default)
All of Shallow Mode, plus:
- Map all HTTP endpoints from route definitions
- For each endpoint, trace the handler code for blocking operations: email, file processing, external API calls, heavy DB queries, cloud uploads
- For each blocking operation found: estimate duration based on operation type, assess timeout risk, check if async alternative exists in the codebase
- Check webhook endpoints: are they acknowledging before processing?
- Check batch/bulk endpoints: are they processing synchronously or dispatching to a queue?
- Verify that existing async infrastructure (if present) is actually used for the heavy operations identified
- Check for in-process async (BackgroundTasks, goroutines) used for work that needs a persistent queue
- Search for developer comments near handler code containing `slow`, `TODO`, `FIXME`, `timeout`, `takes a while`, `hack`, `temporary` — developers often annotate known blocking issues they haven't fixed yet

## Severity Guide
- **CRITICAL**: Payment processing synchronous in handler (timeout = failed payment + potential double-charge on retry), operations >30s in handler (guaranteed timeout under load), webhook handlers processing before acknowledging (duplicate processing on timeout)
- **HIGH**: Email sending in request path (5-10s delay per request, fails silently on timeout), PDF/report generation synchronous for large datasets (30s+ timeout risk), image/video processing in handler, cloud storage upload in handler, no background job system at all for an app with heavy async needs
- **MEDIUM**: External API calls without timeouts in handlers, sequential microservice calls that could be parallel, lightweight in-process async used for work that needs a persistent queue (lost on crash), server timeout >60s (masking the problem instead of fixing it)
- **LOW**: Context-dependent slow operations without timeout guards, missing timeout configuration on HTTP clients, no worker saturation analysis, async infrastructure exists but some operations still inline

## Output
Write report to: `vibeguard-reports/skill-reports/perf-sync-blockers.md`
Follow the output contract at `references/skill-output-contract.md`.
