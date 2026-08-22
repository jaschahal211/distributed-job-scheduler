const cronParser = require('cron-parser');
const db = require('../../../database/db');
const { NotFoundError, BadRequestError } = require('../utils/errors');

class ScheduleService {
    static getNextRunTime(cronExpression) {
        try {
            const interval = cronParser.parseExpression(cronExpression);
            return interval.next().toDate();
        } catch (err) {
            throw new BadRequestError(`Invalid cron expression '${cronExpression}': ${err.message}`);
        }
    }

    static async listSchedules(projectId) {
        const values = [];
        let whereClause = '';
        if (projectId) {
            values.push(projectId);
            whereClause = 'WHERE sj.project_id = $1';
        }

        const res = await db.query(
            `SELECT sj.*,
              q.name as queue_name,
              p.name as project_name
       FROM scheduled_jobs sj
       JOIN queues q ON q.id = sj.queue_id
       JOIN projects p ON p.id = sj.project_id
       ${whereClause}
       ORDER BY sj.created_at DESC;`,
            values
        );
        return res.rows;
    }

    static async createSchedule({ projectId, queueId, name, type, payload = {}, priority = 1, cronExpression }) {
        if (!name || !type || !cronExpression || !queueId) {
            throw new BadRequestError('Name, type, queueId, and cronExpression are required');
        }

        if (!projectId) {
            const queueRes = await db.query('SELECT project_id FROM queues WHERE id = $1;', [queueId]);
            if (queueRes.rows.length === 0) throw new NotFoundError('Queue not found');
            projectId = queueRes.rows[0].project_id;
        }

        const nextRunAt = this.getNextRunTime(cronExpression);

        const res = await db.query(
            `INSERT INTO scheduled_jobs (project_id, queue_id, name, type, payload, priority, cron_expression, next_run_at, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
       RETURNING *;`,
            [projectId, queueId, name, type, payload, priority, cronExpression, nextRunAt]
        );

        return res.rows[0];
    }

    static async updateSchedule(id, { name, cronExpression, payload, active, priority }) {
        const existingRes = await db.query('SELECT * FROM scheduled_jobs WHERE id = $1;', [id]);
        if (existingRes.rows.length === 0) {
            throw new NotFoundError(`Schedule with ID ${id} not found`);
        }
        const schedule = existingRes.rows[0];

        const newCron = cronExpression || schedule.cron_expression;
        let nextRunAt = schedule.next_run_at;
        if (cronExpression && cronExpression !== schedule.cron_expression) {
            nextRunAt = this.getNextRunTime(newCron);
        }

        const res = await db.query(
            `UPDATE scheduled_jobs
       SET name = COALESCE($1, name),
           cron_expression = $2,
           next_run_at = $3,
           payload = COALESCE($4, payload),
           active = COALESCE($5, active),
           priority = COALESCE($6, priority),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *;`,
            [name, newCron, nextRunAt, payload, active, priority, id]
        );

        return res.rows[0];
    }

    static async deleteSchedule(id) {
        const res = await db.query(`DELETE FROM scheduled_jobs WHERE id = $1 RETURNING id;`, [id]);
        if (res.rows.length === 0) {
            throw new NotFoundError(`Schedule with ID ${id} not found`);
        }
        return { deleted: true, id };
    }
}

module.exports = ScheduleService;
