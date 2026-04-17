---
name: data-backup
description: Assess backup configuration — automated schedules, retention policies, encryption, restore procedures, and recovery capability
---

# Skill: data-backup

## Domain: Data
## Purpose
Assess backup configuration — automated schedules, retention policies, encryption, restore procedures, and recovery capability signals.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Backups are insurance. Without them, a single accidental `DROP TABLE`, a ransomware attack, or a corrupt disk means total data loss. But having backups isn't enough — untested restores are not restores. An encrypted backup with a lost key is useless. A backup on the same volume as the database is destroyed in the same failure. The goal here is to verify that data can actually be recovered, not just that backup commands are configured.

### 1. Backup Configuration Presence
- Is there evidence of backup configuration? Look for:
  - Cloud provider backup configs (AWS RDS automated backups, GCP Cloud SQL backups, Azure SQL backup)
  - Backup scripts or cron jobs
  - Backup tool configs (pg_dump scripts, mongodump, mysqldump, redis BGSAVE)
  - Managed backup service references (Barman, WAL-G, pgBackRest, Percona XtraBackup)
  - IaC backup resource definitions (Terraform `aws_db_instance` with `backup_retention_period`)

### 2. Backup Schedule
- Are backups automated? (Not manual)
- What's the frequency? (Daily at minimum for production, more for high-write systems)
- Is there point-in-time recovery (PITR) capability? (WAL archiving for PostgreSQL, binary logs for MySQL)
- Is the backup window appropriate? (Off-peak hours, not during batch processing)

### 3. Retention Policy
- How long are backups retained? (Minimum 7 days for operational, 30+ days for compliance)
- Is there a tiered retention? (Daily for 7 days, weekly for 4 weeks, monthly for 12 months)
- Is retention compliant with data regulations? (GDPR right to erasure affects backups)
- Are old backups cleaned up automatically?

### 4. Backup Encryption
- Are backups encrypted at rest?
- Are backups encrypted in transit? (If shipped to remote storage)
- Where are backup encryption keys stored? (Not with the backups themselves)
- Can backups be decrypted by someone other than the creator? (Bus factor)

### 5. Backup Storage
- Where are backups stored? (Same server = high risk, remote storage = better, different region = best)
- Is there geographic redundancy? (Backups in a different region/availability zone)
- Is backup storage access controlled? (Not publicly accessible, separate credentials)
- Is backup storage monitored? (Alerts on failed backups, storage capacity)

### 6. Restore Procedures
- Is there a documented restore procedure?
- Has the restore procedure been tested? (Evidence of restore testing)
- How long does a restore take? (RTO — Recovery Time Objective)
- How much data can be lost? (RPO — Recovery Point Objective)
- Can partial restores be done? (Single table, single record, specific time point)

### 7. What's Backed Up
- Database backups present?
- File/object storage backups? (User uploads, documents, media)
- Configuration/secrets backups? (Or are they reproducible from IaC/vault?)
- Are backups complete? (All databases, all storage, all critical data)
- Are transient/cache stores excluded from backup? (Don't waste space backing up Redis cache)

### 8. Non-Database Data
- File uploads: are they in durable storage? (S3 with versioning, not local disk)
- Configuration: is it in version control or a config management system?
- Secrets: are they in a vault with its own backup?

## How to Assess (by stack)

- **PostgreSQL**: Check for pg_dump/pg_basebackup scripts, WAL archiving config, pgBackRest/Barman/WAL-G config, RDS backup settings
- **MySQL**: Check for mysqldump scripts, binary log config, Percona XtraBackup, RDS/Aurora backup settings
- **MongoDB**: Check for mongodump scripts, Atlas backup config, oplog for PITR
- **Redis**: Check RDB/AOF persistence config, backup of dump files
- **AWS**: Check RDS `backup_retention_period`, S3 versioning, AWS Backup plans in Terraform/CloudFormation
- **GCP**: Check Cloud SQL backup config, GCS versioning, Backup/DR service
- **Azure**: Check Azure SQL backup config, Blob versioning, Azure Backup vaults
- **Docker/K8s**: Check for PersistentVolume backup (Velero, volume snapshots)
- **Elixir/Phoenix**: Check Ecto Repo database config for backup-compatible settings, migration state backup, release config for disaster recovery
- **PHP/Laravel**: Check `spatie/laravel-backup` package, scheduled backup commands, `config/backup.php`, backup notifications and monitoring

## Shallow Mode
Config and IaC checks only — no procedure analysis:
- Search IaC files (Terraform, CloudFormation, Pulumi) for backup configuration: `backup_retention_period`, snapshot schedules, backup plans
- Search for backup scripts: `pg_dump`, `mongodump`, `mysqldump`, `redis-cli BGSAVE` in scripts or CI
- Check database config for backup-related settings (WAL archiving, binary log)
- Look for restore documentation: search for `restore`, `recovery`, `disaster` in docs/runbooks

## Deep Mode (default)
All of Shallow Mode, plus:
- Map what's backed up vs what exists: are all databases, file stores, and critical data sources covered?
- Check backup schedule: is it automated? What's the frequency? Is PITR available?
- Verify retention policy: how long are backups kept? Is it sufficient for compliance?
- Check backup encryption: at rest and in transit? Where are the keys stored?
- Check backup storage location: same server (bad), same region (ok), different region (good)?
- Review restore procedure documentation: is it step-by-step? Has it been tested? What's the estimated RTO/RPO?

## Severity Guide
- **CRITICAL**: No backup configuration detected for production database, backups on same server/volume as database, no restore procedure (even if backups exist)
- **HIGH**: No automated backup schedule (manual only), no backup encryption, no geographic redundancy, no PITR capability for write-heavy application
- **MEDIUM**: Backup retention too short (<7 days), restore procedure not tested, incomplete backup coverage (some datastores not backed up), no backup monitoring/alerts
- **LOW**: No tiered retention policy, no partial restore capability documented, transient data included in backups, backup schedule not optimized

## Output
Write report to: `vibeguard-reports/skill-reports/data-backup.md`
Follow the output contract at `references/skill-output-contract.md`.
