# Database Schema & Indexing Guide

The Distributed Job Scheduler uses PostgreSQL as its central persistent state store and coordination layer.

The database is responsible for:

- Organization and user management
- Project and queue organization
- Job persistence and lifecycle management
- Distributed worker coordination
- Retry policy configuration
- Job execution history
- Worker heartbeat monitoring
- Execution and operational logging
- Recurring job scheduling
- Dead Letter Queue (DLQ) management
- Atomic job claiming and concurrency control

The database schema is implemented in:

`database/migrations/001_init_schema.sql`

---

## 🗄️ Entity Relationship Diagram

The following ER model represents the major entities and relationships in the scheduler database.

```mermaid
erDiagram

    ORGANIZATIONS {
        UUID id PK
        VARCHAR name
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    USERS {
        UUID id PK
        VARCHAR email UK
        VARCHAR password_hash
        VARCHAR name
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    ORGANIZATION_MEMBERS {
        UUID organization_id PK, FK
        UUID user_id PK, FK
        VARCHAR role
        TIMESTAMPTZ created_at
    }

    PROJECTS {
        UUID id PK
        UUID organization_id FK
        VARCHAR name
        TEXT description
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    RETRY_POLICIES {
        UUID id PK
        VARCHAR name
        VARCHAR strategy
        INT initial_delay
        INT max_delay
        INT max_attempts
        TIMESTAMPTZ created_at
    }

    QUEUES {
        UUID id PK
        UUID project_id FK
        VARCHAR name
        INT priority
        INT concurrency_limit
        UUID retry_policy_id FK
        VARCHAR status
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    WORKERS {
        UUID id PK
        VARCHAR name
        VARCHAR status
        INT concurrency_limit
        INT current_job_count
        TIMESTAMPTZ last_heartbeat_at
        TIMESTAMPTZ started_at
        TIMESTAMPTZ stopped_at
        JSONB metadata
    }

    JOBS {
        UUID id PK
        UUID project_id FK
        UUID queue_id FK
        VARCHAR name
        VARCHAR type
        JSONB payload
        INT priority
        VARCHAR status
        TIMESTAMPTZ scheduled_at
        TIMESTAMPTZ available_at
        INT attempts
        INT max_attempts
        UUID retry_policy_id FK
        UUID worker_id FK
        VARCHAR idempotency_key
        TIMESTAMPTZ claimed_at
        TIMESTAMPTZ started_at
        TIMESTAMPTZ completed_at
        TIMESTAMPTZ failed_at
        TEXT last_error
        INT timeout
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    JOB_EXECUTIONS {
        UUID id PK
        UUID job_id FK
        UUID worker_id FK
        INT attempt_number
        VARCHAR status
        TIMESTAMPTZ started_at
        TIMESTAMPTZ completed_at
        INT duration_ms
        TEXT error
        JSONB output
    }

    WORKER_HEARTBEATS {
        UUID id PK
        UUID worker_id FK
        TIMESTAMPTZ timestamp
        VARCHAR status
        INT current_job_count
        JSONB metadata
    }

    JOB_LOGS {
        UUID id PK
        UUID job_id FK
        UUID execution_id FK
        UUID worker_id FK
        VARCHAR level
        TEXT message
        JSONB metadata
        TIMESTAMPTZ created_at
    }

    SCHEDULED_JOBS {
        UUID id PK
        UUID project_id FK
        UUID queue_id FK
        VARCHAR name
        VARCHAR type
        JSONB payload
        INT priority
        VARCHAR cron_expression
        TIMESTAMPTZ next_run_at
        TIMESTAMPTZ last_run_at
        BOOLEAN active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    DEAD_LETTER_QUEUE {
        UUID id PK
        UUID job_id FK
        UUID queue_id FK
        TEXT reason
        TEXT error
        INT attempts
        TIMESTAMPTZ failed_at
        JSONB payload
        UUID worker_id FK
        TIMESTAMPTZ created_at
    }

    ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERS : contains
    USERS ||--o{ ORGANIZATION_MEMBERS : belongs_to

    ORGANIZATIONS ||--o{ PROJECTS : owns

    PROJECTS ||--o{ QUEUES : contains
    PROJECTS ||--o{ JOBS : contains
    PROJECTS ||--o{ SCHEDULED_JOBS : defines

    RETRY_POLICIES ||--o{ QUEUES : configured_for
    RETRY_POLICIES ||--o{ JOBS : configured_for

    QUEUES ||--o{ JOBS : contains
    QUEUES ||--o{ SCHEDULED_JOBS : schedules
    QUEUES ||--o{ DEAD_LETTER_QUEUE : receives

    WORKERS ||--o{ JOBS : executes
    WORKERS ||--o{ JOB_EXECUTIONS : performs
    WORKERS ||--o{ WORKER_HEARTBEATS : reports
    WORKERS ||--o{ JOB_LOGS : produces
    WORKERS ||--o{ DEAD_LETTER_QUEUE : associated_with

    JOBS ||--o{ JOB_EXECUTIONS : has
    JOBS ||--o{ JOB_LOGS : generates
    JOBS ||--o{ DEAD_LETTER_QUEUE : may_enter

    JOB_EXECUTIONS ||--o{ JOB_LOGS : produces