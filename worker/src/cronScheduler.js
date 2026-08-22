const cronParser = require('cron-parser');
const db = require('../../database/db');
const logger = require('../../server/src/utils/logger');

class CronScheduler {
    static async processScheduledCrons() {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // Lock and fetch scheduled jobs due for execution
            const res = await client.query(
                `SELECT * FROM scheduled_jobs
         WHERE active = true AND next_run_at <= NOW()
         FOR UPDATE SKIP LOCKED;`
            );

            for (const sj of res.rows) {
                let nextRunAt;
                try {
                    const interval = cronParser.parseExpression(sj.cron_expression);
                    nextRunAt = interval.next().toDate();
                } catch (err) {
                    logger.error(`Error parsing cron expression '${sj.cron_expression}' for schedule ${sj.id}:`, err);
                    nextRunAt = new Date(Date.now() + 3600000); // 1 hour fallback
                }

                // Spawn job into jobs table
                await client.query(
                    `INSERT INTO jobs (
            project_id, queue_id, name, type, payload, priority, status,
            scheduled_at, available_at, attempts, max_attempts
          ) VALUES ($1, $2, $3, $4, $5, $6, 'queued', NOW(), NOW(), 0, 3);`,
                    [
                        sj.project_id,
                        sj.queue_id,
                        `[Cron] ${sj.name}`,
                        sj.type,
                        sj.payload || {},
                        sj.priority || 1
                    ]
                );

                // Update schedule's next_run_at and last_run_at
                await client.query(
                    `UPDATE scheduled_jobs
           SET last_run_at = NOW(),
               next_run_at = $1,
               updated_at = NOW()
           WHERE id = $2;`,
                    [nextRunAt, sj.id]
                );

                logger.info(`⏰ Triggered scheduled cron job '${sj.name}' (Next run: ${nextRunAt.toISOString()})`);
            }

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            logger.error('Error processing cron schedules:', err);
        } finally {
            client.release();
        }
    }

    static startPeriodicCronEngine(intervalMs = 5000) {
        const timer = setInterval(async () => {
            await this.processScheduledCrons();
        }, intervalMs);

        return timer;
    }
}

module.exports = CronScheduler;
