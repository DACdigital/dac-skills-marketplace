---
name: ops-monitoring
description: Assess monitoring and observability — APM, error tracking, metrics, dashboards, distributed tracing
---

# Skill: ops-monitoring

## Domain: Operations
## Purpose
Assess monitoring and observability — APM integration, error tracking, metrics collection, dashboards, and distributed tracing.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

You can't fix what you can't see. Without monitoring, production issues are discovered by users — hours or days after they start. Without error tracking, exceptions go unnoticed until someone files a support ticket. Without metrics, you can't tell if the system is degrading gradually. Without distributed tracing, debugging a microservices issue means grepping logs across multiple services. Observability is what turns "something is wrong" into "this specific query on this specific service is slow because of this specific dependency."

### 1. Application Performance Monitoring (APM)
- Is an APM tool configured? (Datadog, New Relic, Dynatrace, Elastic APM, AWS X-Ray, Honeycomb)
- Is it instrumented correctly? (Auto-instrumentation vs manual)
- Is it tracking: request latency, throughput, error rate?
- Is it configured for production? (Not just development)

### 2. Error Tracking
- Is an error tracking service configured? (Sentry, Bugsnag, Rollbar, Datadog Error Tracking, Airbrake)
- Is it initialized correctly? (DSN/API key configured, environment set)
- Does it capture: stack traces, breadcrumbs, user context, tags?
- Is source map uploading configured? (For frontend error readability)
- Is PII scrubbed from error reports? (`beforeSend` hooks)
- Are error alerts configured? (New error types, error rate spikes)

### 3. Metrics Collection
- Are application metrics collected?
  - **RED metrics**: Rate, Errors, Duration (for services)
  - **USE metrics**: Utilization, Saturation, Errors (for resources)
  - **Custom business metrics**: signups, orders, payments, feature usage
- Is a metrics library configured? (Prometheus client, StatsD, Micrometer, OpenTelemetry)
- Are metrics exported? (Prometheus scrape, push to Datadog/CloudWatch/Grafana Cloud)
- Are there custom metrics for business KPIs?

### 4. Distributed Tracing
- Is distributed tracing configured? (OpenTelemetry, Jaeger, Zipkin, AWS X-Ray, Datadog APM)
- Are trace IDs propagated across services? (W3C Trace Context, B3)
- Can a request be traced from entry to database and back?
- Are spans created for: HTTP handlers, database queries, external API calls, queue operations?
- Is sampling configured? (Not tracing 100% in high-traffic production — too expensive)

### 5. Infrastructure Monitoring
- Is infrastructure monitored? (CPU, memory, disk, network for hosts/containers)
- Who provides it? (Cloud provider, Datadog, Prometheus + Grafana, Zabbix)
- Is container/pod monitoring in place? (Resource usage vs limits)
- Are database metrics monitored? (Connection count, query latency, replication lag, disk usage)

### 6. Dashboards
- Are dashboards defined in code/config? (Grafana dashboards as JSON, Terraform for Datadog, CloudWatch dashboard templates)
- Are there dashboards for:
  - Service health overview?
  - Request latency and error rates?
  - Database performance?
  - Business metrics?
  - Infrastructure resources?
- Are dashboards accessible to the team? (Shared, not personal)

### 7. Log-Metric-Trace Correlation
- Can logs, metrics, and traces be correlated? (Same request ID across all three)
- Is there a unified observability platform? (Or are logs, metrics, traces in different tools?)
- Can you go from an alert → dashboard → traces → logs for incident investigation?

### 8. Synthetic Monitoring
- Are there synthetic/uptime checks? (Pingdom, UptimeRobot, Datadog Synthetics, AWS Synthetics)
- Do they check from multiple locations?
- Do they test critical user flows? (Not just homepage ping)
- Are they alerting on failure?

## How to Assess (by stack)

- **Node.js**: Check for `@sentry/node`, `dd-trace`, `newrelic`, `@opentelemetry/*`, `prom-client` in dependencies and initialization code
- **Python**: Check for `sentry-sdk`, `ddtrace`, `newrelic`, `opentelemetry-*`, `prometheus-client` in requirements and startup code
- **Go**: Check for Sentry/Datadog/New Relic/OpenTelemetry packages, middleware instrumentation
- **Ruby/Rails**: Check for `sentry-ruby`, `ddtrace`, `newrelic_rpm`, Prometheus client gems
- **Java/Spring**: Check for Micrometer, Spring Actuator, Sentry/Datadog/New Relic agents, OpenTelemetry Java agent
- **.NET**: Check for Sentry/Application Insights/Datadog packages, OpenTelemetry.NET, health check endpoints
- **Elixir/Phoenix**: Check `Telemetry` library and `:telemetry` events, Prometheus via `telemetry_metrics_prometheus`, Sentry via `sentry-elixir`, AppSignal, LiveDashboard
- **PHP/Laravel**: Check Laravel Telescope (dev), Sentry via `sentry-laravel`, New Relic/Datadog APM agent, `config/logging.php`, custom metrics
- **Infrastructure**: Check for Prometheus/Grafana configs, Datadog agent, CloudWatch configs in IaC

## Shallow Mode
Config and dependency checks only — no instrumentation analysis:
- Is a monitoring/APM SDK in dependencies? (Datadog, New Relic, Sentry, OpenTelemetry, Prometheus client)
- Is error tracking initialized in the application entry point? (Search for Sentry/Bugsnag/Rollbar init)
- Is there a metrics endpoint or export configuration? (`/metrics`, StatsD config, CloudWatch)
- Are there dashboard config files? (Grafana JSON, Terraform `datadog_dashboard`)

## Deep Mode (default)
All of Shallow Mode, plus:
- Verify APM covers important paths: are HTTP handlers, database queries, and external API calls instrumented?
- Check error tracking config: is PII scrubbing enabled? Are source maps uploaded? Is the environment correctly set?
- Analyze metrics: are RED metrics (Rate, Errors, Duration) tracked? Are there custom business metrics?
- Review distributed tracing: are trace IDs propagated across services? Is sampling configured for high-traffic production?
- Assess dashboards: are there service health, latency/error, database, and business metric dashboards? Are they defined in code?

## Severity Guide
- **CRITICAL**: No monitoring at all (blind in production), no error tracking (errors go unnoticed)
- **HIGH**: No APM/request monitoring, error tracking configured but not for production environment, no metrics collection, no infrastructure monitoring
- **MEDIUM**: No distributed tracing in microservices, no custom business metrics, no dashboards (data collected but not visualized), error tracking missing source maps
- **LOW**: No synthetic monitoring, no log-metric-trace correlation, dashboards not version-controlled, sampling not configured for tracing

## Output
Write report to: `vibeguard-reports/skill-reports/ops-monitoring.md`
Follow the output contract at `references/skill-output-contract.md`.
