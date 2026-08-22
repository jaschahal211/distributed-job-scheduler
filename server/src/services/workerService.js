const db = require('../../../database/db');
const { NotFoundError } = require('../utils/errors');

class WorkerService {
    static async listWorkers() {
        // Automatically flag workers whose heartbeat is older than 30s as OFFLINE
        await db.query(
            `UPDATE workers
       SET status = 'OFFLINE'
       WHERE status != 'OFFLINE' AND last_heartbeat_at < NOW() - INTERVAL '30 seconds';`
        );

        const res = await db.query(
            `SELECT w.*,
              (SELECT COUNT(*) FROM jobs j WHERE j.worker_id = w.id AND j.status IN ('claimed', 'running')) as active_jobs_count
       FROM workers w
       ORDER BY w.last_heartbeat_at DESC;`
        );
        return res.rows;
    }

    static async getWorker(workerId) {
        const res = await db.query(`SELECT * FROM workers WHERE id = $1;`, [workerId]);
        if (res.rows.length === 0) {
            throw new NotFoundError(`Worker with ID ${workerId} not found`);
        }
        return res.rows[0];
    }

    static async getWorkerHeartbeats(workerId, limit = 20) {
        const res = await db.query(
            `SELECT * FROM worker_heartbeats WHERE worker_id = $1 ORDER BY timestamp DESC LIMIT $2;`,
            [workerId, limit]
        );
        return res.rows;
    }
}

module.exports = WorkerService;
