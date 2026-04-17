---
name: ops-alerting
description: Assess alerting configuration — alert rules, severity, routing, escalation, runbook integration
---

# Skill: ops-alerting

## Domain: Operations
## Purpose
Assess alerting configuration — alert rules, severity levels, routing, escalation policies, and runbook integration.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Monitoring without alerting is a dashboard nobody watches. Alerting without routing is a notification nobody sees. Alerting without severity classification means everything is urgent — which means nothing is. Alert fatigue from too many non-actionable alerts is as dangerous as no alerting at all — the on-call engineer stops responding. The goal is a small number of actionable alerts that reach the right person at the right urgency level.

### 1. Alert Rules
- Are alert rules defined? Where? (Prometheus rules, Datadog monitors, CloudWatch alarms, PagerDuty, Grafana alerts)
- Are alert rules in version control? (Infrastructure as code, not UI-only)
- What conditions trigger alerts?
  - Error rate exceeds threshold
  - Latency exceeds threshold (p50, p95, p99)
  - Service health check failing
  - Disk/memory/CPU usage high
  - Certificate expiring
  - Database connection pool exhaustion
  - Queue depth growing
  - Business metric anomaly (signup rate drops, payment failures spike)

### 2. Alert Severity Classification
- Are alerts classified by severity? (Critical, Warning, Info)
- Are severity levels mapped to response urgency?
  - **Critical/P1**: pages on-call immediately, requires immediate response
  - **Warning/P2**: notifies team, needs attention within hours
  - **Info/P3**: tracked, addressed during business hours
- Is there a clear definition of what constitutes each severity?

### 3. Alert Routing
- Where do alerts go?
  - **Critical**: PagerDuty/OpsGenie/VictorOps → phone/SMS to on-call
  - **Warning**: Slack/Teams/email to team channel
  - **Info**: Dashboard/log only
- Is routing configured for off-hours? (Critical alerts should still reach someone)
- Are the right people alerted? (Not everyone for everything)

### 4. Escalation Policy
- Is there an escalation policy? (If on-call doesn't respond in X minutes, escalate to Y)
- Are there multiple escalation levels?
- Is there a final catch-all? (Someone always gets notified)
- Is the on-call rotation defined?

### 5. Alert Quality
- **Signal-to-noise ratio**: are there too many alerts? (Alert fatigue leads to ignoring all alerts)
- **Actionability**: does each alert have a clear action? (If you can't do anything about it, it shouldn't page)
- **Deduplication**: are duplicate alerts suppressed? (Same issue doesn't generate N alerts)
- **Auto-resolution**: do alerts auto-resolve when the condition clears?
- **Thresholds**: are thresholds appropriate? (Not too sensitive — false positives; not too loose — miss real issues)
- **Flapping protection**: is there hysteresis to prevent rapid alert/resolve cycles?

### 6. Runbook Integration
- Do alerts link to runbooks? (When paged, engineer can immediately find what to do)
- Are runbooks up to date?
- Do runbooks cover: diagnosis steps, remediation actions, escalation criteria, communication templates?

### 7. Alert Coverage
- Are all critical services monitored?
- Are SLO/SLA thresholds defined and alerted on?
- Are business-critical flows monitored? (Not just infrastructure)
- Is there a "canary in the coal mine" alert? (First indicator of broader issues)

### 8. Incident Communication
- Is there an incident channel/process? (Dedicated Slack channel, status page)
- Is there a status page? (Statuspage, Instatus, Cachet)
- Are stakeholders notified during incidents?
- Is there a post-incident review process? (Blameless retrospectives)

## How to Assess (by platform)

- **Prometheus**: Check `rules/` or `alerting_rules.yml` for alert definitions, Alertmanager config for routing
- **Datadog**: Check Terraform `datadog_monitor` resources, or look for monitor definitions
- **AWS**: Check CloudWatch alarm definitions in Terraform/CloudFormation
- **Grafana**: Check alert rules in dashboard JSON, Grafana alerting config
- **PagerDuty/OpsGenie**: Check for integration config, escalation policy references in IaC
- **Application**: Check for alert-sending code (Slack webhook calls, PagerDuty events API)
- **Elixir/Phoenix**: Check `Telemetry`-based alert triggers, Sentry alert rules for Elixir exceptions, application-level health check alerts
- **PHP/Laravel**: Check Laravel exception notifications, Horizon failure alerts, Sentry/Bugsnag alert config, queue failure monitoring

## Shallow Mode
Config file checks only — no rule analysis:
- Are there alert configuration files? (Prometheus rules, Terraform `datadog_monitor`, CloudWatch alarms, Grafana alert rules)
- Is an alerting/incident platform referenced? (PagerDuty, OpsGenie, VictorOps, Slack webhooks)
- Is there on-call/escalation configuration? (PagerDuty schedules, OpsGenie rotations)

## Deep Mode (default)
All of Shallow Mode, plus:
- Analyze alert rules for coverage: are error rate, latency, health check failure, disk/memory/CPU, and queue depth monitored?
- Review severity classification: are alerts categorized into page-worthy (P1), team-notification (P2), and informational (P3)?
- Check alert routing: do critical alerts reach on-call via phone/SMS? Do warnings go to the right team channel?
- Assess alert quality: are alerts actionable? Are there too many (fatigue risk)? Are thresholds appropriate? Is there deduplication?
- Check runbook links: do alerts include a link to a runbook explaining what to do?
- Review escalation: if on-call doesn't respond, who gets notified next?

## Severity Guide
- **CRITICAL**: No alerting configured at all (silent failures in production), critical services with no monitoring alerts
- **HIGH**: Alerts exist but no routing to responsible people (alerts go to a dead channel), no escalation policy, no on-call rotation
- **MEDIUM**: Alert fatigue (too many non-actionable alerts), no runbooks linked, no severity classification, alert rules in UI only (not version-controlled)
- **LOW**: No business metric alerts, no auto-resolution, no status page, no post-incident review process, thresholds not tuned

## Output
Write report to: `vibeguard-reports/skill-reports/ops-alerting.md`
Follow the output contract at `references/skill-output-contract.md`.
