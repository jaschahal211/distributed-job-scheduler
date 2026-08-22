const db = require('../../../database/db');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const { buildPagination } = require('../utils/response');

class DLQService {
    static async listDLQEntries({ queueId, projectId, page = 1, limit = 20 }) {
        const offset = (page - 1) * limit;
        const values = [];
        const conditions = [];

        if (queueId) {
            values.push(queueId);
            conditions.push(`dlq.queue_id = $${values.length}`);
        }
        if (projectId) {
            values.push(projectId);
            conditions.push(`q.project_id = $${values.length}`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countRes = await db.query(
            `SELECT COUNT(*) as total
       FROM dead_letter_queue dlq
       JOIN queues q ON q.id = dlq.queue_id
       ${whereClause};`,
            values
        );
        const totalCount = parseInt(countRes.rows[0].total, 10);

        values.push(limit);
        const limitParam = `$${values.length}`;
        values.push(offset);
        const offsetParam = `$${values.length}`;

        const res = await db.query(
            `SELECT dlq.*,
              q.name as queue_name,
              p.name as project_name,
              j.name as job_name,
              w.name as worker_name
       FROM dead_letter_queue dlq
       JOIN queues q ON q.id = dlq.queue_id
       JOIN projects p ON p.id = q.project_id
       LEFT JOIN jobs j ON j.id = dlq.job_id
       LEFT JOIN workers w ON w.id = dlq.worker_id
       ${whereClause}
       ORDER BY dlq.failed_at DESC
       LIMIT ${limitParam} OFFSET ${offsetParam};`,
            values
        );

        return {
            entries: res.rows,
            pagination: buildPagination(page, limit, totalCount),
        };
    }

    static async getDLQEntry(id) {
        const res = await db.query(
            `SELECT dlq.*,
              q.name as queue_name,
              p.name as project_name,
              j.name as job_name,
              w.name as worker_name
       FROM dead_letter_queue dlq
       JOIN queues q ON q.id = dlq.queue_id
       JOIN projects p ON p.id = q.project_id
       LEFT JOIN jobs j ON j.id = dlq.job_id
       LEFT JOIN workers w ON w.id = dlq.worker_id
       WHERE dlq.id = $1;`,
            [id]
        );

        if (res.rows.length === 0) {
            throw new NotFoundError(`DLQ entry with ID ${id} not found`);
        }

        return res.rows[0];
    }

    static async retryDLQEntry(id) {
        const dlqEntry = await this.getDLQEntry(id);

        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            let job;
            if (dlqEntry.job_id) {
                // Re-queue existing job
                const jobRes = await client.query(
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
                    [dlqEntry.job_id]
                );
                job = jobRes.rows[0];
            } else {
                // Create new job from payload
                const queueRes = await client.query('SELECT project_id FROM queues WHERE id = $1;', [dlqEntry.queue_id]);
                const projectId = queueRes.rows[0].project_id;

                const newJobRes = await client.query(
                    `INSERT INTO jobs (
            project_id, queue_id, name, type, payload, priority, status,
            scheduled_at, available_at, attempts, max_attempts
          ) VALUES ($1, $2, $3, $4, $5, $6, 'queued', NOW(), NOW(), 0, 3)
          RETURNING *;`,
                    [projectId, dlqEntry.queue_id, `Retried DLQ Job ${id.slice(0, 8)}`, 'RETRYS_TASK', dlqEntry.payload, 5]
                );
                job = newJobRes.rows[0];
            }

            // Remove from DLQ
            await client.query(`DELETE FROM dead_letter_queue WHERE id = $1;`, [id]);

            await client.query('COMMIT');
            return { success: true, retriedJob: job };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async deleteDLQEntry(id) {
        const res = await db.query(`DELETE FROM dead_letter_queue WHERE id = $1 RETURNING id;`, [id]);
        if (res.rows.length === 0) {
            throw new NotFoundError(`DLQ entry with ID ${id} not found`);
        }
        return { deleted: true, id };
    }
}

module.exports = DLQService;
