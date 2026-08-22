const db = require('../../database/db');
const RetryManager = require('../../worker/src/retryManager');

describe('5. Dead Letter Queue (DLQ) Routing & Redrive Tests', () => {
    let projectId;
    let queueId;
    let jobId;

    beforeAll(async () => {
        const orgRes = await db.query(
            'SELECT id FROM organizations LIMIT 1;'
        );

        if (orgRes.rows.length === 0) {
            throw new Error(
                'No organization found. Run npm run db:seed first.'
            );
        }

        const orgId = orgRes.rows[0].id;

        const projRes = await db.query(
            `INSERT INTO projects
                (organization_id, name)
             VALUES
                ($1, 'DLQ Jest Project')
             RETURNING id;`,
            [orgId]
        );

        projectId = projRes.rows[0].id;

        const queueRes = await db.query(
            `INSERT INTO queues
                (
                    project_id,
                    name,
                    priority,
                    concurrency_limit,
                    status
                )
             VALUES
                (
                    $1,
                    'dlq-jest-queue',
                    5,
                    5,
                    'active'
                )
             RETURNING id;`,
            [projectId]
        );

        queueId = queueRes.rows[0].id;

        const jobRes = await db.query(
            `INSERT INTO jobs
                (
                    project_id,
                    queue_id,
                    name,
                    type,
                    priority,
                    status,
                    attempts,
                    max_attempts,
                    payload
                )
             VALUES
                (
                    $1,
                    $2,
                    'Failing DLQ Job',
                    'FAIL_TASK',
                    5,
                    'running',
                    2,
                    3,
                    '{}'::jsonb
                )
             RETURNING id;`,
            [projectId, queueId]
        );

        jobId = jobRes.rows[0].id;
    });

    afterAll(async () => {
        if (projectId) {
            await db.query(
                'DELETE FROM projects WHERE id = $1;',
                [projectId]
            );
        }

        await db.pool.end();
    });

    test(
        'Routes to DLQ when max attempts is reached',
        async () => {

            const job = {
                id: jobId,
                queue_id: queueId,
                attempts: 2,
                max_attempts: 3,
                name: 'Failing DLQ Job',
                payload: {},
                worker_id: null,
                retry_policy_id: null
            };

            /*
             * IMPORTANT:
             * RetryManager.handleJobFailure expects
             * ONE object containing:
             *
             * { job, attemptNumber, error, workerId }
             */
            const result =
                await RetryManager.handleJobFailure({
                    job: job,
                    attemptNumber: 3,
                    error: new Error(
                        'Synthetic Max Attempt Failure'
                    ),
                    workerId: null
                });

            expect(result.isDlq).toBe(true);
            expect(result.retryScheduled).toBe(false);

            const updatedJob = await db.query(
                `SELECT
                    status,
                    attempts,
                    last_error
                 FROM jobs
                 WHERE id = $1;`,
                [jobId]
            );

            expect(updatedJob.rows.length).toBe(1);

            expect(
                updatedJob.rows[0].status
            ).toBe('failed');

            expect(
                updatedJob.rows[0].attempts
            ).toBe(3);

            expect(
                updatedJob.rows[0].last_error
            ).toBe(
                'Synthetic Max Attempt Failure'
            );

            const dlqEntry = await db.query(
                `SELECT
                    job_id,
                    queue_id,
                    reason,
                    error,
                    attempts
                 FROM dead_letter_queue
                 WHERE job_id = $1;`,
                [jobId]
            );

            expect(dlqEntry.rows.length).toBe(1);

            expect(
                dlqEntry.rows[0].job_id
            ).toBe(jobId);

            expect(
                dlqEntry.rows[0].queue_id
            ).toBe(queueId);

            expect(
                dlqEntry.rows[0].reason
            ).toContain(
                'Exceeded maximum retry attempts'
            );

            expect(
                dlqEntry.rows[0].error
            ).toBe(
                'Synthetic Max Attempt Failure'
            );

            expect(
                dlqEntry.rows[0].attempts
            ).toBe(3);
        }
    );
});