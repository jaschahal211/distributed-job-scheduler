# Architecture Overview

The **Distributed Job Scheduler** is designed as a decoupled, multi-process distributed architecture where the API server, database, worker execution nodes, scheduling services, and developer dashboard operate independently.

---

## 🏗️ System Architecture Diagram

```mermaid
flowchart TB

    %% =========================
    %% CLIENT LAYER
    %% =========================
    subgraph CLIENT["CLIENT LAYER"]
        UI["React Developer Dashboard"]
    end

    %% =========================
    %% APPLICATION LAYER
    %% =========================
    subgraph APP["APPLICATION LAYER"]
        API["Express API Server"]
        AUTH["Authentication & Authorization"]
        SERVICES["Job & Queue Management"]
        OBS["Monitoring & Metrics"]
    end

    UI -->|"HTTPS / REST API"| API
    API --> AUTH
    API --> SERVICES
    API --> OBS

    %% =========================
    %% WORKER EXECUTION LAYER
    %% =========================
    subgraph WORKERS["WORKER EXECUTION LAYER"]

        W1["Worker Process 1"]
        W2["Worker Process 2"]
        WN["Worker Process N"]

        subgraph ENGINE["Worker Services"]
            POLLER["Queue Poller"]
            EXEC["Job Executor"]
            RETRY["Retry Manager"]
            HEART["Heartbeat Manager"]
        end

        W1 --> POLLER
        W2 --> POLLER
        WN --> POLLER

        POLLER --> EXEC
        EXEC --> RETRY

        W1 --> HEART
        W2 --> HEART
        WN --> HEART
    end

    %% =========================
    %% SCHEDULING & RECOVERY
    %% =========================
    subgraph CONTROL["SCHEDULING & RECOVERY"]
        CRON["Cron Scheduler"]
        RECOVERY["Stale Worker Recovery"]
        SHUTDOWN["Graceful Shutdown"]
    end

    %% =========================
    %% DATA LAYER
    %% =========================
    subgraph DATA["DATA LAYER"]

        DB[("PostgreSQL Database")]

        JOBS["Jobs & Queues"]
        RUNS["Job Runs & Logs"]
        WORKERDB["Workers & Heartbeats"]
        DLQ["Dead Letter Queue"]
        SCHEDULES["Cron Schedules"]
    end

    %% =========================
    %% APPLICATION → DATABASE
    %% =========================
    API -->|"SQL / Transactions"| DB
    SERVICES --> DB
    OBS --> DB

    %% =========================
    %% WORKERS → DATABASE
    %% =========================
    POLLER -->|"Atomic Job Claiming"| DB
    EXEC -->|"Execution Results"| DB
    RETRY -->|"Retry / DLQ Routing"| DB
    HEART -->|"Heartbeat Updates"| DB

    %% =========================
    %% SCHEDULING & RECOVERY
    %% =========================
    CRON -->|"Generate Jobs"| DB
    RECOVERY -->|"Detect & Requeue"| DB
    SHUTDOWN -->|"Release Active Jobs"| DB

    %% =========================
    %% DATABASE COMPONENTS
    %% =========================
    DB --- JOBS
    DB --- RUNS
    DB --- WORKERDB
    DB --- DLQ
    DB --- SCHEDULES

    %% =========================
    %% STYLING
    %% =========================
    classDef client fill:#E8F1FF,stroke:#2563EB,stroke-width:2px,color:#111827
    classDef app fill:#EAF8EE,stroke:#16A34A,stroke-width:2px,color:#111827
    classDef worker fill:#F3EFFF,stroke:#7C3AED,stroke-width:2px,color:#111827
    classDef control fill:#FFF7E6,stroke:#D97706,stroke-width:2px,color:#111827
    classDef database fill:#EEF6FF,stroke:#0284C7,stroke-width:2px,color:#111827
    classDef component fill:#FFFFFF,stroke:#64748B,stroke-width:1px,color:#111827

    class UI client
    class API,AUTH,SERVICES,OBS app
    class W1,W2,WN,POLLER,EXEC,RETRY,HEART worker
    class CRON,RECOVERY,SHUTDOWN control
    class DB,JOBS,RUNS,WORKERDB,DLQ,SCHEDULES database
    class ENGINE component