const db = require('../../database/db');
const logger = require('../../server/src/utils/logger');
const JobExecutor = require('./jobExecutor');

class QueuePoller {
    constructor(workerId, concurrencyLimit) {
        this.workerId = workerId;
        this.concurrencyLimit = concurrencyLimit;
        this.activeJobs = new Set();
        this.isPolling = false;
        this.isDraining = false;
        this.pollTimer = null;
    }

    getActiveJobCount() {
        return this.activeJobs.size;
    }

    start(pollIntervalMs = 2000) {
        this.isPolling = true;
        logger.info(`🔄 Worker ${this.workerId} QueuePoller started (Interval: ${pollIntervalMs}ms, Max Worker Concurrency: ${this.concurrencyLimit})`);

        const pollLoop = async () => {
            if (!this.isPolling || this.isDraining) return;

            try {
                await this.pollAndClaimJobs();
            } catch (err) {
                logger.error(`Error in queue poller loop for worker ${this.workerId}:`, err);
            } finally {
                if (this.isPolling && !this.isDraining) {
                    this.pollTimer = setTimeout(pollLoop, pollIntervalMs);
                }
            }
        };

        pollLoop();
    }

    async pollAndClaimJobs() {
        const availableSlots = this.concurrencyLimit - this.activeJobs.size;
        if (availableSlots <= 0) {
            return; // Worker is at maximum concurrency limit
        }

        // Attempt to claim up to availableSlots jobs
        for (let i = 0; i < availableSlots; i++) {
            const claimedJob = await this.claimSingleJobAtomic();
            if (!claimedJob) {
                break; // No more available jobs to claim at this moment
            }

            // Add to active jobs and execute concurrently
            this.activeJobs.add(claimedJob.id);
            this.executeJobAsync(claimedJob);
        }
    }

    /**
     * CRITICAL REQUIREMENT: Atomic Job Claiming with FOR UPDATE SKIP LOCKED
     * Enforces:
     * 1. Status = 'queued'
     * 2. Available_at <= NOW()
     * 3. Queue status = 'active'
     * 4. Queue concurrency limit: Active jobs in queue < queue.concurrency_limit
     * 5. Priority ordering: priority DESC, created_at ASC
     * 6. FOR UPDATE SKIP LOCKED row locking (prevents duplicate claiming across workers)
     */
    async claimSingleJobAtomic() {
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        /*
         * Lock ONE eligible queue at a time.
         *
         * The queue row is the synchronization point for queue-level
         * concurrency. Once locked, other workers trying to claim from
         * the same queue must wait until this transaction commits.
         */
        const queueRes = await client.query(`
            SELECT q.id, q.concurrency_limit
            FROM queues q
            WHERE q.status = 'active'
              AND EXISTS (
                  SELECT 1
                  FROM jobs j
                  WHERE j.queue_id = q.id
                    AND j.status = 'queued'
                    AND j.available_at <= NOW()
              )
            ORDER BY q.priority DESC, q.created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1;
        `);

        if (queueRes.rows.length === 0) {
            await client.query('COMMIT');
            return null;
        }

        const queue = queueRes.rows[0];

        /*
         * The queue row is locked, so concurrent workers cannot modify
         * the same queue's claim state while this transaction is running.
         */
        const activeRes = await client.query(`
            SELECT COUNT(*)::int AS count
            FROM jobs
            WHERE queue_id = $1
              AND status IN ('claimed', 'running');
        `, [queue.id]);

        const activeCount = activeRes.rows[0].count;

        if (activeCount >= queue.concurrency_limit) {
            await client.query('COMMIT');
            return null;
        }

        /*
         * Select the highest-priority eligible job from this queue.
         */
        const jobRes = await client.query(`
            SELECT *
            FROM jobs
            WHERE queue_id = $1
              AND status = 'queued'
              AND available_at <= NOW()
            ORDER BY priority DESC, created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1;
        `, [queue.id]);

        if (jobRes.rows.length === 0) {
            await client.query('COMMIT');
            return null;
        }

        const job = jobRes.rows[0];

        const result = await client.query(`
            UPDATE jobs
            SET status = 'claimed',
                worker_id = $1,
                claimed_at = NOW(),
                updated_at = NOW()
            WHERE id = $2
            RETURNING *;
        `, [this.workerId, job.id]);

        await client.query('COMMIT');

        if (result.rows.length > 0) {
            const claimedJob = result.rows[0];

            logger.info(
                `🔒 Worker ${this.workerId} atomically claimed job ${claimedJob.id} ` +
                `("${claimedJob.name}" Priority: ${claimedJob.priority})`
            );

            return claimedJob;
        }

        return null;

    } catch (err) {
        await client.query('ROLLBACK');
        logger.error(
            'Error during atomic job claim transaction:',
            err
        );
        return null;
    } finally {
        client.release();
    }
}

    executeJobAsync(job) {
        JobExecutor.execute({ job, workerId: this.workerId })
            .catch((err) => {
                logger.error(`Unhandled error during async execution of job ${job.id}:`, err);
            })
            .finally(() => {
                this.activeJobs.delete(job.id);
            });
    }

    async drainAndStop() {
        this.isDraining = true;
        this.isPolling = false;
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = null;
        }

        logger.info(`⏳ Worker ${this.workerId} draining... Waiting for ${this.activeJobs.size} active jobs to finish.`);

        const maxWaitTime = 30000; // 30 seconds max drain timeout
        const startTime = Date.now();

        while (this.activeJobs.size > 0 && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(r => setTimeout(r, 500));
        }

        if (this.activeJobs.size > 0) {
            logger.warn(`Worker ${this.workerId} shutdown timeout reached. Releasing ${this.activeJobs.size} unfinished jobs...`);
            for (const jobId of this.activeJobs) {
                await db.query(
                    `UPDATE jobs
           SET status = 'queued',
               worker_id = NULL,
               claimed_at = NULL,
               started_at = NULL,
               updated_at = NOW()
           WHERE id = $1 AND status IN ('claimed', 'running');`,
                    [jobId]
                );
            }
            this.activeJobs.clear();
        }

        logger.info(`🏁 Worker ${this.workerId} drained successfully.`);
    }
}

module.exports = QueuePoller;
