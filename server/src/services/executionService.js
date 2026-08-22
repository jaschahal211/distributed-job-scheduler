const db = require('../../../database/db');
const { NotFoundError } = require('../utils/errors');
const { buildPagination } = require('../utils/response');

class ExecutionService {
    static async listJobExecutions(jobId) {
        const res = await db.query(
            `SELECT je.*, w.name as worker_name
       FROM job_executions je
       LEFT JOIN workers w ON w.id = je.worker_id
       WHERE je.job_id = $1
       ORDER BY je.attempt_number ASC;`,
            [jobId]
        );
        return res.rows;
    }

    static async getExecutionLogs(executionId, { page = 1, limit = 50, level }) {
        const offset = (page - 1) * limit;
        const values = [executionId];
        const conditions = [`execution_id = $1`];

        if (level) {
            values.push(level.toUpperCase());
            conditions.push(`level = $${values.length}`);
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        const countRes = await db.query(
            `SELECT COUNT(*) as total FROM job_logs ${whereClause};`,
            values
        );
        const totalCount = parseInt(countRes.rows[0].total, 10);

        values.push(limit);
        const limitParam = `$${values.length}`;
        values.push(offset);
        const offsetParam = `$${values.length}`;

        const logsRes = await db.query(
            `SELECT * FROM job_logs
       ${whereClause}
       ORDER BY created_at ASC
       LIMIT ${limitParam} OFFSET ${offsetParam};`,
            values
        );

        return {
            logs: logsRes.rows,
            pagination: buildPagination(page, limit, totalCount),
        };
    }

    static async getJobLogs(jobId, { page = 1, limit = 50 }) {
        const offset = (page - 1) * limit;

        const countRes = await db.query(
            `SELECT COUNT(*) as total FROM job_logs WHERE job_id = $1;`,
            [jobId]
        );
        const totalCount = parseInt(countRes.rows[0].total, 10);

        const logsRes = await db.query(
            `SELECT * FROM job_logs
       WHERE job_id = $1
       ORDER BY created_at ASC
       LIMIT $2 OFFSET $3;`,
            [jobId, limit, offset]
        );

        return {
            logs: logsRes.rows,
            pagination: buildPagination(page, limit, totalCount),
        };
    }
}

module.exports = ExecutionService;
