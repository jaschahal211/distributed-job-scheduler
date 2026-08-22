# Design Decisions & Tradeoffs

This document describes the major architectural and engineering decisions made while designing the **Distributed Job Scheduler**, along with the trade-offs associated with each decision.

---

## 1. Database-Backed Queue vs. Redis

### Decision

Use PostgreSQL as the primary job queue and coordination mechanism instead of introducing Redis or a Redis-based queue framework such as BullMQ.

### Rationale

1. **ACID Transactions**

   Job creation, state transitions, retry handling, and Dead Letter Queue operations can be performed using PostgreSQL transactions.

2. **Simplified Infrastructure**

   The system requires only PostgreSQL as its persistent state store instead of maintaining a separate Redis infrastructure.

3. **Strong Consistency**

   Jobs, queues, workers, executions, and logs remain within the same transactional data system.

4. **Reduced Operational Complexity**

   For this project, using PostgreSQL avoids the additional deployment, monitoring, and persistence concerns associated with a separate Redis service.

### Trade-off

A dedicated distributed queue such as Redis can provide very high-throughput queue operations and specialized queue semantics.

The PostgreSQL approach trades some potential queue-specific performance for:

- Simpler architecture
- Strong relational consistency
- Fewer infrastructure dependencies
- Easier inspection and debugging

---

## 2. Atomic Job Claiming with `FOR UPDATE SKIP LOCKED`

### Problem

Multiple worker processes can poll the same queue simultaneously.

Without atomic row locking, two workers could potentially select the same available job before either transaction updates its state.

### Decision

Use PostgreSQL row-level locking with:

```sql
SELECT ...
FOR UPDATE SKIP LOCKED