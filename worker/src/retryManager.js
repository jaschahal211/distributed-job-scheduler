const db = require('../../database/db');
const logger = require('../../server/src/utils/logger');

class RetryManager {
    /**
     * Calculate retry delay.
     *
     * Supported strategies:
     * - fixed:       initial delay every time
     * - linear:      initial delay * attempt
     * - exponential: initial delay * 2^(attempt - 1)
     *
     * Supports both:
     * calculateNextRetryDelay(strategy, initial, max, attempt)
     *
     * and:
     * calculateNextRetryDelay(policy, attempt)
     */
    static calculateNextRetryDelay(
    strategyOrPolicy,
    initialDelay,
    maxDelay,
    attemptNumber
) {
    let strategy;
    let init;
    let max;
    let attempt;

    // Policy object form
    if (
        typeof strategyOrPolicy === 'object' &&
        strategyOrPolicy !== null
    ) {
        strategy = strategyOrPolicy.strategy || 'exponential';

        init =
            strategyOrPolicy.base_delay_seconds ||
            strategyOrPolicy.initial_delay ||
            strategyOrPolicy.initialDelay ||
            5;

        max =
            strategyOrPolicy.max_delay_seconds ||
            strategyOrPolicy.max_delay ||
            strategyOrPolicy.maxDelay ||
            300;

        attempt = initialDelay || 1;
    }

    // Simple strategy form:
    // calculateNextRetryDelay('exponential', 5, 300, 1)
    else if (strategyOrPolicy) {
        strategy = strategyOrPolicy;
        init = initialDelay || 5;
        max = maxDelay || 300;
        attempt = attemptNumber || 1;
    }

    // Undefined/null strategy:
    // calculateNextRetryDelay(null, 1)
    // => exponential, 5 seconds, attempt 1
    else {
        strategy = 'exponential';
        init = 5;
        max = 300;
        attempt = initialDelay || 1;
    }

    let delaySeconds;

    switch (strategy) {
        case 'fixed':
            delaySeconds = init;
            break;

        case 'linear':
            delaySeconds = init * attempt;
            break;

        case 'exponential':
        default:
            delaySeconds =
                init * Math.pow(2, Math.max(0, attempt - 1));
            break;
    }

    return Math.min(delaySeconds, max);
}

    static async handleJobFailure({
        job,
        attemptNumber,
        error,
        workerId
    }) {
        if (!job || !job.id) {
            throw new Error(
                'Cannot handle job failure: valid job object is required'
            );
        }

        const client = await db.getClient();

        try {
            await client.query('BEGIN');

            /*
             * Fetch retry policy.
             */
            let strategy = 'exponential';
            let initialDelay = 5;
            let maxDelay = 300;
            let maxAttempts = job.max_attempts || 3;

            if (job.retry_policy_id) {
                const rpRes = await client.query(
                    `SELECT
                        strategy,
                        initial_delay,
                        max_delay,
                        max_attempts
                     FROM retry_policies
                     WHERE id = $1;`,
                    [job.retry_policy_id]
                );

                if (rpRes.rows.length > 0) {
                    const rp = rpRes.rows[0];

                    strategy =
                        rp.strategy || 'exponential';

                    initialDelay =
                        rp.initial_delay ?? 5;

                    maxDelay =
                        rp.max_delay ?? 300;

                    maxAttempts =
                        rp.max_attempts ||
                        maxAttempts;
                }
            }

            const attempt =
                Number(attemptNumber) || 1;

            const errorMessage =
                typeof error === 'string'
                    ? error
                    : error?.message ||
                      'Job execution failed';

            /*
             * =========================================
             * PERMANENT FAILURE -> DLQ
             * =========================================
             */
            if (attempt >= maxAttempts) {
                logger.warn(
                    `Job ${job.id} (${job.name}) failed permanently ` +
                    `after ${attempt}/${maxAttempts} attempts. ` +
                    `Moving to DLQ.`
                );

                await client.query(
                    `UPDATE jobs
                     SET status = 'failed',
                         attempts = $1,
                         failed_at = NOW(),
                         last_error = $2,
                         worker_id = $3,
                         updated_at = NOW()
                     WHERE id = $4;`,
                    [
                        attempt,
                        errorMessage,
                        workerId,
                        job.id
                    ]
                );

                /*
                 * Avoid creating duplicate DLQ entries if
                 * the failure handler is called more than once.
                 */
                await client.query(
                    `DELETE FROM dead_letter_queue
                     WHERE job_id = $1;`,
                    [job.id]
                );

                await client.query(
                    `INSERT INTO dead_letter_queue (
                        job_id,
                        queue_id,
                        reason,
                        error,
                        attempts,
                        failed_at,
                        payload,
                        worker_id
                     )
                     VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        NOW(),
                        $6,
                        $7
                     );`,
                    [
                        job.id,
                        job.queue_id,
                        `Exceeded maximum retry attempts (${attempt}/${maxAttempts})`,
                        errorMessage,
                        attempt,
                        job.payload || {},
                        workerId
                    ]
                );

                await client.query('COMMIT');

                return {
                    isDlq: true,
                    retryScheduled: false,
                    nextAvailableAt: null
                };
            }

            /*
             * =========================================
             * RETRY PENDING -> QUEUED WITH BACKOFF
             * =========================================
             */
            const delaySec =
                RetryManager.calculateNextRetryDelay(
                    strategy,
                    initialDelay,
                    maxDelay,
                    attempt
                );

            const nextAvailableAt =
                new Date(
                    Date.now() +
                    delaySec * 1000
                );

            logger.info(
                `Job ${job.id} failed attempt ` +
                `${attempt}/${maxAttempts}. ` +
                `Scheduling retry with ${delaySec}s ` +
                `backoff (${strategy}).`
            );

            await client.query(
                `UPDATE jobs
                 SET status = 'queued',
                     attempts = $1,
                     available_at = $2,
                     last_error = $3,
                     worker_id = NULL,
                     claimed_at = NULL,
                     started_at = NULL,
                     updated_at = NOW()
                 WHERE id = $4;`,
                [
                    attempt,
                    nextAvailableAt,
                    errorMessage,
                    job.id
                ]
            );

            await client.query('COMMIT');

            return {
                isDlq: false,
                retryScheduled: true,
                nextAvailableAt,
                delaySec
            };

        } catch (err) {
            await client.query('ROLLBACK');

            logger.error(
                `Error handling failure for job ${job.id}:`,
                err
            );

            throw err;

        } finally {
            client.release();
        }
    }
}

module.exports = RetryManager;