const db = require('../../database/db');
const logger = require('../../server/src/utils/logger');

class HeartbeatManager {
    constructor(workerId, workerName, concurrencyLimit, getActiveJobCount) {
        this.workerId = workerId;
        this.workerName = workerName;
        this.concurrencyLimit = concurrencyLimit;
        this.getActiveJobCount = getActiveJobCount;
        this.intervalHandle = null;
    }

    async registerWorker() {
        try {
            const res = await db.query(
                `INSERT INTO workers (id, name, status, concurrency_limit, current_job_count, last_heartbeat_at, started_at)
         VALUES ($1, $2, 'ONLINE', $3, $4, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           status = 'ONLINE',
           concurrency_limit = EXCLUDED.concurrency_limit,
           current_job_count = EXCLUDED.current_job_count,
           last_heartbeat_at = NOW(),
           stopped_at = NULL
         RETURNING *;`,
                [this.workerId, this.workerName, this.concurrencyLimit, this.getActiveJobCount()]
            );
            logger.info(`Worker ${this.workerName} (${this.workerId}) registered successfully.`);
            return res.rows[0];
        } catch (err) {
            logger.error('Failed to register worker in database:', err);
            throw err;
        }
    }

    start(intervalMs = 5000) {
        this.intervalHandle = setInterval(async () => {
            await this.sendHeartbeat();
        }, intervalMs);
    }

    async sendHeartbeat(statusOverride = null) {
        try {
            const activeJobs = this.getActiveJobCount();
            const status = statusOverride || (activeJobs > 0 ? 'BUSY' : 'ONLINE');

            await db.query(
                `UPDATE workers
         SET status = $1,
             current_job_count = $2,
             last_heartbeat_at = NOW()
         WHERE id = $3;`,
                [status, activeJobs, this.workerId]
            );

            await db.query(
                `INSERT INTO worker_heartbeats (worker_id, status, current_job_count, metadata)
         VALUES ($1, $2, $3, $4);`,
                [this.workerId, status, activeJobs, JSON.stringify({ pid: process.pid, uptime: Math.round(process.uptime()) })]
            );
        } catch (err) {
            logger.error(`Error sending worker heartbeat for ${this.workerId}:`, err);
        }
    }

    async stop(finalStatus = 'OFFLINE') {
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
        }

        try {
            await db.query(
                `UPDATE workers
         SET status = $1,
             current_job_count = 0,
             last_heartbeat_at = NOW(),
             stopped_at = NOW()
         WHERE id = $2;`,
                [finalStatus, this.workerId]
            );
            logger.info(`Worker ${this.workerId} status updated to ${finalStatus}`);
        } catch (err) {
            logger.error(`Failed to update worker stop status for ${this.workerId}:`, err);
        }
    }
}

module.exports = HeartbeatManager;
