# REST API Specification

All API endpoints return standard JSON envelopes:
```json
{
  "success": true,
  "data": {},
  "message": "Optional message string"
}
```

---

## 🔑 Auth Endpoints (`/api/auth`)

- `POST /api/auth/register`: Create user account.
- `POST /api/auth/login`: Authenticate email/password and receive JWT token.
- `GET /api/auth/me`: Get current authenticated user profile.

---

## 📁 Project Endpoints (`/api/projects`)

- `GET /api/projects`: List projects.
- `POST /api/projects`: Create project.

---

## ⚡ Queue Endpoints (`/api/queues`)

- `GET /api/queues?projectId={id}`: List queues with statistics.
- `POST /api/queues`: Create queue.
- `PATCH /api/queues/:id`: Update queue concurrency limit, priority, or status (`active`/`paused`).
- `POST /api/queues/:id/pause`: Pause queue polling.
- `POST /api/queues/:id/resume`: Resume queue polling.

---

## 💼 Job Endpoints (`/api/jobs`)

- `GET /api/jobs`: Query jobs (supports `projectId`, `queueId`, `status`, `workerId`, `search`, `limit`, `offset`).
- `POST /api/queues/:queueId/jobs`: Create single job (immediate or delayed).
- `POST /api/jobs/batch`: Batch create up to 100 jobs.
- `GET /api/jobs/:id`: Get job detail with payload and executions.
- `GET /api/jobs/:id/logs`: Get job execution logs.
- `POST /api/jobs/:id/cancel`: Cancel job execution.

---

## 💀 DLQ Endpoints (`/api/dlq`)

- `GET /api/dlq`: List dead letter queue entries.
- `POST /api/dlq/:id/retry`: Requeue and redrive DLQ job.
- `DELETE /api/dlq/:id`: Purge DLQ entry.

---

## 🤖 Worker Endpoints (`/api/workers`)

- `GET /api/workers`: List active worker nodes and capacity.
- `GET /api/workers/:id/heartbeat`: Get worker heartbeat history.

---

## 📅 Schedule Endpoints (`/api/schedules`)

- `GET /api/schedules?projectId={id}`: List recurring cron schedules.
- `POST /api/schedules`: Create new cron schedule.
- `DELETE /api/schedules/:id`: Delete cron schedule.
