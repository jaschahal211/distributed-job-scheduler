const db = require('../../database/db');
const logger = require('../../server/src/utils/logger');
const RetryManager = require('./retryManager');

class JobExecutor {
    static async execute({ job, workerId }) {
        const attemptNumber = (job.attempts || 0) + 1;
        const startTime = Date.now();
        const startedAt = new Date();

        logger.info(`⚡ [Worker ${workerId}] Executing job ${job.id} ("${job.name}" - Type: ${job.type}) Attempt #${attemptNumber}`);

        // Update job state to 'running'
        await db.query(
            `UPDATE jobs
       SET status = 'running',
           attempts = $1,
           started_at = NOW(),
           updated_at = NOW()
       WHERE id = $2;`,
            [attemptNumber, job.id]
        );

        // Create Execution Record
        const executionRes = await db.query(
            `INSERT INTO job_executions (job_id, worker_id, attempt_number, status, started_at)
       VALUES ($1, $2, $3, 'running', $4)
       RETURNING id;`,
            [job.id, workerId, attemptNumber, startedAt]
        );
        const executionId = executionRes.rows[0].id;

        // Log Execution Start
        await this.logMessage({
            jobId: job.id,
            executionId,
            workerId,
            level: 'INFO',
            message: `Started execution attempt #${attemptNumber} on worker ${workerId}`,
            metadata: { jobType: job.type, priority: job.priority },
        });

        let executionSuccess = false;
        let output = {};
        let executionError = null;

        try {
            // Dispatch Job Handler
            output = await this.runHandler(job.type, job.payload, { jobId: job.id, executionId, workerId });
            executionSuccess = true;

            await this.logMessage({
                jobId: job.id,
                executionId,
                workerId,
                level: 'INFO',
                message: `Execution completed successfully`,
                metadata: output,
            });
        } catch (err) {
            executionSuccess = false;
            executionError = err.message || 'Job execution failed with unknown error';

            await this.logMessage({
                jobId: job.id,
                executionId,
                workerId,
                level: 'ERROR',
                message: `Execution failed: ${executionError}`,
                metadata: { error: executionError, stack: err.stack },
            });
        }

        const completedAt = new Date();
        const durationMs = Date.now() - startTime;
        const finalStatus = executionSuccess ? 'completed' : 'failed';

        // Update Execution Record
        await db.query(
            `UPDATE job_executions
       SET status = $1,
           completed_at = $2,
           duration_ms = $3,
           error = $4,
           output = $5
       WHERE id = $6;`,
            [finalStatus, completedAt, durationMs, executionError, JSON.stringify(output), executionId]
        );

        if (executionSuccess) {
            // Mark Job as COMPLETED
            await db.query(
                `UPDATE jobs
         SET status = 'completed',
             completed_at = NOW(),
             updated_at = NOW()
         WHERE id = $1;`,
                [job.id]
            );
            logger.info(`✅ [Worker ${workerId}] Job ${job.id} completed successfully in ${durationMs}ms`);
            return { success: true, durationMs, output };
        } else {
            // Delegate to RetryManager
            const retryResult = await RetryManager.handleJobFailure({
                job,
                attemptNumber,
                error: executionError,
                workerId,
            });
            return { success: false, durationMs, error: executionError, retryResult };
        }
    }

    static async runHandler(type, payload = {}, ctx) {
        switch (type) {
            case 'SUCCESS_TASK':
                return { message: 'Task processed successfully', payload, timestamp: new Date().toISOString() };

            case 'DELAY_TASK': {
                const duration = payload.durationMs || (payload.durationSec ? payload.durationSec * 1000 : 2000);
                await new Promise(resolve => setTimeout(resolve, duration));
                return { message: `Slept for ${duration}ms`, durationMs: duration };
            }

            case 'FAIL_TASK':
                throw new Error(payload.customErrorMessage || 'Intentional job failure triggered for retry/DLQ testing');

            case 'RANDOM_FAIL_TASK': {
                const failureRate = payload.failureRate !== undefined ? payload.failureRate : 0.5;
                if (Math.random() < failureRate) {
                    throw new Error(`Random task failed (Probability threshold ${failureRate})`);
                }
                return { message: 'Random task succeeded', failureRateTested: failureRate };
            }

            case 'DATA_PROCESS_TASK': {
                const items = payload.items || [10, 20, 30, 40, 50];
                const processed = items.map(n => n * 2);
                const sum = processed.reduce((acc, curr) => acc + curr, 0);
                return { processedCount: processed.length, sum, sample: processed.slice(0, 5) };
            }

            case 'HTTP_REQUEST': {
                const url = payload.url || 'https://jsonplaceholder.typicode.com/todos/1';
                return { status: 200, simulatedBody: { url, message: 'Simulated HTTP GET request successful' } };
            }

            default:
                // Default demo fallback handler
                return { message: `Executed custom job handler '${type}'`, payload };
        }
    }

    static async logMessage({ jobId, executionId, workerId, level, message, metadata }) {
        try {
            await db.query(
                `INSERT INTO job_logs (job_id, execution_id, worker_id, level, message, metadata)
         VALUES ($1, $2, $3, $4, $5, $6);`,
                [jobId, executionId || null, workerId || null, level, message, JSON.stringify(metadata || {})]
            );
        } catch (err) {
            logger.error('Failed to insert job log entry:', err);
        }
    }
}

module.exports = JobExecutor;
