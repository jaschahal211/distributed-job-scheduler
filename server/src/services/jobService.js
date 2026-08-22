const db = require('../../../database/db');
const { NotFoundError, BadRequestError, ConflictError } = require('../utils/errors');
const { buildPagination } = require('../utils/response');

class JobService {
    static async createJob(queueId, {
        name,
        type,
        payload = {},
        priority = 1,
        scheduledAt,
        delaySeconds = 0,
        maxAttempts = 3,
        retryPolicyId = null,
        idempotencyKey = null,
        timeout = 60,
    }) {
        if (!name || !type) {
            throw new BadRequestError('Job name and type are required');
        }

        // Fetch queue info for project_id and default retry_policy_id
        const queueRes = await db.query('SELECT project_id, retry_policy_id FROM queues WHERE id = $1;', [queueId]);
        if (queueRes.rows.length === 0) {
            throw new NotFoundError(`Queue with ID ${queueId} not found`);
        }

        const projectId = queueRes.rows[0].project_id;
        const finalRetryPolicyId = retryPolicyId || queueRes.rows[0].retry_policy_id;

        // Check Idempotency Key
        if (idempotencyKey) {
            const existingJob = await db.query(
                'SELECT * FROM jobs WHERE project_id = $1 AND idempotency_key = $2;',
                [projectId, idempotencyKey]
            );
            if (existingJob.rows.length > 0) {
                return { job: existingJob.rows[0], idempotentDuplicate: true };
            }
        }

        let calculatedAvailableAt = new Date();
        let initialStatus = 'queued';

        if (scheduledAt) {
            calculatedAvailableAt = new Date(scheduledAt);
            if (calculatedAvailableAt > new Date()) {
                initialStatus = 'scheduled';
            }
        } else if (delaySeconds > 0) {
            calculatedAvailableAt = new Date(Date.now() + delaySeconds * 1000);
            initialStatus = 'scheduled';
        }

        try {
            const res = await db.query(
                `INSERT INTO jobs (
          project_id, queue_id, name, type, payload, priority, status,
          scheduled_at, available_at, attempts, max_attempts, retry_policy_id,
          idempotency_key, timeout
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, $10, $11, $12, $13)
        RETURNING *;`,
                [
                    projectId, queueId, name, type, payload, priority, initialStatus,
                    calculatedAvailableAt, calculatedAvailableAt, maxAttempts, finalRetryPolicyId,
                    idempotencyKey, timeout
                ]
            );

            return { job: res.rows[0], idempotentDuplicate: false };
        } catch (err) {
            if (err.code === '23505' && err.constraint === 'idx_jobs_idempotency_unique') {
                const existingJob = await db.query(
                    'SELECT * FROM jobs WHERE project_id = $1 AND idempotency_key = $2;',
                    [projectId, idempotencyKey]
                );
                return { job: existingJob.rows[0], idempotentDuplicate: true };
            }
            throw err;
        }
    }

    static async batchCreateJobs({ queueId, jobs }) {
        if (!Array.isArray(jobs) || jobs.length === 0) {
            throw new BadRequestError('Jobs array must be a non-empty array');
        }

        const createdJobs = [];
        for (const jobInput of jobs) {
            const targetQueueId = jobInput.queueId || queueId;
            if (!targetQueueId) throw new BadRequestError('Queue ID is required for each batch job');
            const result = await this.createJob(targetQueueId, jobInput);
            createdJobs.push(result);
        }

        return createdJobs;
    }

    static async listJobs({ projectId, queueId, status, workerId, search, page = 1, limit = 20 }) {
        const offset = (page - 1) * limit;
        const values = [];
        const conditions = [];

        if (projectId) {
            values.push(projectId);
            conditions.push(`j.project_id = $${values.length}`);
        }
        if (queueId) {
            values.push(queueId);
            conditions.push(`j.queue_id = $${values.length}`);
        }
        if (status) {
            values.push(status);
            conditions.push(`j.status = $${values.length}`);
        }
        if (workerId) {
            values.push(workerId);
            conditions.push(`j.worker_id = $${values.length}`);
        }
        if (search) {
            values.push(`%${search}%`);
            conditions.push(`(j.name ILIKE $${values.length} OR j.id::text ILIKE $${values.length})`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countRes = await db.query(
            `SELECT COUNT(*) as total FROM jobs j ${whereClause};`,
            values
        );
        const totalCount = parseInt(countRes.rows[0].total, 10);

        values.push(limit);
        const limitParam = `$${values.length}`;
        values.push(offset);
        const offsetParam = `$${values.length}`;

        const jobsRes = await db.query(
            `SELECT j.*,
              q.name as queue_name,
              p.name as project_name,
              w.name as worker_name,
              rp.name as retry_policy_name
       FROM jobs j
       JOIN queues q ON q.id = j.queue_id
       JOIN projects p ON p.id = j.project_id
       LEFT JOIN workers w ON w.id = j.worker_id
       LEFT JOIN retry_policies rp ON rp.id = j.retry_policy_id
       ${whereClause}
       ORDER BY j.created_at DESC
       LIMIT ${limitParam} OFFSET ${offsetParam};`,
            values
        );

        return {
            jobs: jobsRes.rows,
            pagination: buildPagination(page, limit, totalCount),
        };
    }

    static async getJob(jobId) {
        const res = await db.query(
            `SELECT j.*,
              q.name as queue_name,
              p.name as project_name,
              w.name as worker_name,
              rp.name as retry_policy_name,
              rp.strategy as retry_strategy
       FROM jobs j
       JOIN queues q ON q.id = j.queue_id
       JOIN projects p ON p.id = j.project_id
       LEFT JOIN workers w ON w.id = j.worker_id
       LEFT JOIN retry_policies rp ON rp.id = j.retry_policy_id
       WHERE j.id = $1;`,
            [jobId]
        );

        if (res.rows.length === 0) {
            throw new NotFoundError(`Job with ID ${jobId} not found`);
        }

        return res.rows[0];
    }

    static async retryJob(jobId) {
        const job = await this.getJob(jobId);

        if (job.status !== 'failed' && job.status !== 'completed') {
            throw new BadRequestError(`Cannot retry job in state '${job.status}'`);
        }

        const res = await db.query(
            `UPDATE jobs
       SET status = 'queued',
           available_at = NOW(),
           attempts = 0,
           worker_id = NULL,
           claimed_at = NULL,
           started_at = NULL,
           completed_at = NULL,
           failed_at = NULL,
           last_error = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *;`,
            [jobId]
        );

        // If job was in DLQ, remove it from DLQ
        await db.query(`DELETE FROM dead_letter_queue WHERE job_id = $1;`, [jobId]);

        return res.rows[0];
    }

    static async cancelJob(jobId) {
        const job = await this.getJob(jobId);

        if (job.status === 'completed' || job.status === 'failed') {
            throw new BadRequestError(`Job is already ${job.status}`);
        }

        const res = await db.query(
            `UPDATE jobs
       SET status = 'failed',
           last_error = 'Cancelled by user request',
           failed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *;`,
            [jobId]
        );

        return res.rows[0];
    }

    static async deleteJob(jobId) {
        const res = await db.query(`DELETE FROM jobs WHERE id = $1 RETURNING id;`, [jobId]);
        if (res.rows.length === 0) {
            throw new NotFoundError(`Job with ID ${jobId} not found`);
        }
        return { deleted: true, id: jobId };
    }

    static async getDashboardStats(orgId) {
        const jobsCountRes = await db.query(
            `SELECT
         COUNT(*) as total_jobs,
         COUNT(*) FILTER (WHERE status = 'queued') as queued,
         COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
         COUNT(*) FILTER (WHERE status = 'running' OR status = 'claimed') as running,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status = 'failed') as failed
       FROM jobs j
       JOIN projects p ON p.id = j.project_id
       WHERE p.organization_id = $1;`,
            [orgId]
        );

        const dlqRes = await db.query(
            `SELECT COUNT(*) as dlq_count
       FROM dead_letter_queue dlq
       JOIN queues q ON q.id = dlq.queue_id
       JOIN projects p ON p.id = q.project_id
       WHERE p.organization_id = $1;`,
            [orgId]
        );

        const activeWorkersRes = await db.query(
            `SELECT COUNT(*) as active_workers
       FROM workers
       WHERE status IN ('ONLINE', 'BUSY') AND last_heartbeat_at >= NOW() - INTERVAL '30 seconds';`
        );

        const durationRes = await db.query(
            `SELECT AVG(duration_ms) as avg_duration
       FROM job_executions
       WHERE status = 'completed';`
        );

        const counts = jobsCountRes.rows[0];
        const completed = parseInt(counts.completed, 10);
        const failed = parseInt(counts.failed, 10);
        const totalFinished = completed + failed;
        const successRate = totalFinished > 0 ? (completed / totalFinished) * 100 : 100;
        const avgDurationMs = Math.round(parseFloat(durationRes.rows[0].avg_duration || 0));

        // Time-series breakdown for dashboard chart
        const chartRes = await db.query(
            `SELECT
         DATE_TRUNC('hour', created_at) as timestamp,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status = 'failed') as failed
       FROM jobs
       WHERE created_at >= NOW() - INTERVAL '24 hours'
       GROUP BY DATE_TRUNC('hour', created_at)
       ORDER BY timestamp ASC;`
        );

        return {
            totalJobs: parseInt(counts.total_jobs, 10),
            queued: parseInt(counts.queued, 10),
            scheduled: parseInt(counts.scheduled, 10),
            running: parseInt(counts.running, 10),
            completed,
            failed,
            dlqCount: parseInt(dlqRes.rows[0].dlq_count, 10),
            activeWorkers: parseInt(activeWorkersRes.rows[0].active_workers, 10),
            successRate: Math.round(successRate * 10) / 10,
            avgExecutionTimeMs: avgDurationMs,
            chartData: chartRes.rows.map(row => ({
                time: new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                completed: parseInt(row.completed, 10),
                failed: parseInt(row.failed, 10),
            })),
        };
    }
}

module.exports = JobService;
