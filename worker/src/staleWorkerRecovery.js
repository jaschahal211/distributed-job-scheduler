const db = require('../../database/db');
const logger = require('../../server/src/utils/logger');

class StaleWorkerRecovery {
    static async recoverStaleJobs() {
        try {
            // 1. Mark workers with stale heartbeats (> 30s) as OFFLINE
            const offlineWorkersRes = await db.query(
                `UPDATE workers
         SET status = 'OFFLINE'
         WHERE status != 'OFFLINE'
           AND last_heartbeat_at < NOW() - INTERVAL '30 seconds'
         RETURNING id, name;`
            );

            if (offlineWorkersRes.rows.length > 0) {
                for (const w of offlineWorkersRes.rows) {
                    logger.warn(`⚠️ Worker ${w.name} (${w.id}) flagged as OFFLINE (stale heartbeat).`);
                }
            }

            // 2. Re-queue stranded jobs owned by offline workers or jobs stuck in running > timeout
            const recoverJobsRes = await db.query(
                `UPDATE jobs j
         SET status = 'queued',
             worker_id = NULL,
             claimed_at = NULL,
             started_at = NULL,
             last_error = 'Requeued due to worker crash / lease timeout',
             updated_at = NOW()
         FROM workers w
         WHERE j.worker_id = w.id
           AND j.status IN ('claimed', 'running')
           AND (
             w.status = 'OFFLINE'
             OR j.claimed_at < NOW() - (COALESCE(j.timeout, 60) || ' seconds')::INTERVAL
           )
         RETURNING j.id, j.name, j.worker_id;`
            );

            if (recoverJobsRes.rows.length > 0) {
                for (const j of recoverJobsRes.rows) {
                    logger.warn(`🔄 Re-queued stranded job ${j.id} ("${j.name}") previously assigned to worker ${j.worker_id}`);
                }
            }
        } catch (err) {
            logger.error('Error running stale worker recovery sweep:', err);
        }
    }

    static startPeriodicRecovery(intervalMs = 10000) {
        const timer = setInterval(async () => {
            await this.recoverStaleJobs();
        }, intervalMs);

        return timer;
    }
}

module.exports = StaleWorkerRecovery;
