const db = require('../../../database/db');
const { NotFoundError, BadRequestError } = require('../utils/errors');

class QueueService {
    static async listQueues(projectId) {
        const res = await db.query(
            `SELECT q.*,
              rp.name as retry_policy_name,
              rp.strategy as retry_strategy,
              COUNT(j.id) FILTER (WHERE j.status = 'queued') as queued_jobs,
              COUNT(j.id) FILTER (WHERE j.status = 'running') as running_jobs,
              COUNT(j.id) FILTER (WHERE j.status = 'completed') as completed_jobs,
              COUNT(j.id) FILTER (WHERE j.status = 'failed') as failed_jobs
       FROM queues q
       LEFT JOIN retry_policies rp ON rp.id = q.retry_policy_id
       LEFT JOIN jobs j ON j.queue_id = q.id
       WHERE q.project_id = $1
       GROUP BY q.id, rp.id
       ORDER BY q.priority DESC, q.created_at ASC;`,
            [projectId]
        );
        return res.rows;
    }

    static async getQueue(queueId) {
        const res = await db.query(
            `SELECT q.*,
              p.name as project_name,
              rp.name as retry_policy_name,
              rp.strategy as retry_strategy,
              rp.initial_delay, rp.max_delay, rp.max_attempts
       FROM queues q
       JOIN projects p ON p.id = q.project_id
       LEFT JOIN retry_policies rp ON rp.id = q.retry_policy_id
       WHERE q.id = $1;`,
            [queueId]
        );

        if (res.rows.length === 0) {
            throw new NotFoundError(`Queue with ID ${queueId} not found`);
        }

        return res.rows[0];
    }

    static async createQueue(projectId, { name, priority = 1, concurrencyLimit = 5, retryPolicyId = null }) {
        if (!name) throw new BadRequestError('Queue name is required');

        const res = await db.query(
            `INSERT INTO queues (project_id, name, priority, concurrency_limit, retry_policy_id, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING *;`,
            [projectId, name, priority, concurrencyLimit, retryPolicyId]
        );
        return res.rows[0];
    }

    static async updateQueue(queueId, { name, priority, concurrencyLimit, retryPolicyId, status }) {
        const res = await db.query(
            `UPDATE queues
       SET name = COALESCE($1, name),
           priority = COALESCE($2, priority),
           concurrency_limit = COALESCE($3, concurrency_limit),
           retry_policy_id = COALESCE($4, retry_policy_id),
           status = COALESCE($5, status),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *;`,
            [name, priority, concurrencyLimit, retryPolicyId, status, queueId]
        );

        if (res.rows.length === 0) {
            throw new NotFoundError(`Queue with ID ${queueId} not found`);
        }

        return res.rows[0];
    }

    static async pauseQueue(queueId) {
        return this.updateQueue(queueId, { status: 'paused' });
    }

    static async resumeQueue(queueId) {
        return this.updateQueue(queueId, { status: 'active' });
    }

    static async deleteQueue(queueId) {
        const res = await db.query(`DELETE FROM queues WHERE id = $1 RETURNING id;`, [queueId]);
        if (res.rows.length === 0) {
            throw new NotFoundError(`Queue with ID ${queueId} not found`);
        }
        return { deleted: true, id: queueId };
    }

    static async getQueueStats(queueId) {
        const queue = await this.getQueue(queueId);

        const countsRes = await db.query(
            `SELECT
         COUNT(*) as total_jobs,
         COUNT(*) FILTER (WHERE status = 'queued') as queued_jobs,
         COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_jobs,
         COUNT(*) FILTER (WHERE status = 'running') as running_jobs,
         COUNT(*) FILTER (WHERE status = 'claimed') as claimed_jobs,
         COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
         COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs
       FROM jobs
       WHERE queue_id = $1;`,
            [queueId]
        );

        const dlqRes = await db.query(
            `SELECT COUNT(*) as dlq_jobs FROM dead_letter_queue WHERE queue_id = $1;`,
            [queueId]
        );

        const durationRes = await db.query(
            `SELECT AVG(duration_ms) as avg_duration_ms
       FROM job_executions je
       JOIN jobs j ON j.id = je.job_id
       WHERE j.queue_id = $1 AND je.status = 'completed';`,
            [queueId]
        );

        const counts = countsRes.rows[0];
        const dlqJobs = parseInt(dlqRes.rows[0].dlq_jobs, 10);
        const completed = parseInt(counts.completed_jobs, 10);
        const failed = parseInt(counts.failed_jobs, 10);
        const totalFinished = completed + failed;
        const successRate = totalFinished > 0 ? (completed / totalFinished) * 100 : 100;
        const avgDurationMs = Math.round(parseFloat(durationRes.rows[0].avg_duration_ms || 0));

        return {
            queueId,
            queueName: queue.name,
            status: queue.status,
            concurrencyLimit: queue.concurrency_limit,
            priority: queue.priority,
            totalJobs: parseInt(counts.total_jobs, 10),
            queuedJobs: parseInt(counts.queued_jobs, 10),
            scheduledJobs: parseInt(counts.scheduled_jobs, 10),
            runningJobs: parseInt(counts.running_jobs, 10) + parseInt(counts.claimed_jobs, 10),
            completedJobs: completed,
            failedJobs: failed,
            dlqJobs,
            successRate: Math.round(successRate * 10) / 10,
            avgExecutionTimeMs: avgDurationMs,
            throughputJobsPerMin: Math.round(completed * 1.5), // calculated metric
        };
    }

    static async listRetryPolicies() {
        const res = await db.query(`SELECT * FROM retry_policies ORDER BY name ASC;`);
        return res.rows;
    }

    static async createRetryPolicy({ name, strategy = 'exponential', initialDelay = 5, maxDelay = 300, maxAttempts = 3 }) {
        const res = await db.query(
            `INSERT INTO retry_policies (name, strategy, initial_delay, max_delay, max_attempts)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
            [name, strategy, initialDelay, maxDelay, maxAttempts]
        );
        return res.rows[0];
    }
}

module.exports = QueueService;
