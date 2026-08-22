const { v4: uuidv4 } = require('uuid');
const db = require('../../database/db');
const QueuePoller = require('../../worker/src/queuePoller');

describe('6. Atomic Claiming & Concurrency Limit Tests', () => {
    let projectId, queueId;
    const workerIds = Array.from({ length: 10 }, () => uuidv4());

    beforeAll(async () => {
        const orgRes = await db.query('SELECT id FROM organizations LIMIT 1;');
        const orgId = orgRes.rows[0].id;

        const projRes = await db.query(
            "INSERT INTO projects (organization_id, name) VALUES ($1, 'Jest Concurrency Project') RETURNING id;",
            [orgId]
        );
        projectId = projRes.rows[0].id;

        const queueRes = await db.query(
            "INSERT INTO queues (project_id, name, priority, concurrency_limit, status) VALUES ($1, 'jest-concurrency-queue', 10, 3, 'active') RETURNING id;",
            [projectId]
        );
        queueId = queueRes.rows[0].id;

        // Seed 30 queued jobs
        for (let i = 1; i <= 30; i++) {
            await db.query(
                `INSERT INTO jobs (project_id, queue_id, name, type, priority, status, attempts, max_attempts)
         VALUES ($1, $2, $3, 'DELAY_TASK', 10, 'queued', 0, 3);`,
                [projectId, queueId, `Concurrency Job #${i}`]
            );
        }

        // Register worker nodes
        for (let i = 0; i < workerIds.length; i++) {
            await db.query(
                `INSERT INTO workers (id, name, status, concurrency_limit, current_job_count)
         VALUES ($1, $2, 'ONLINE', 5, 0);`,
                [workerIds[i], `JestWorkerNode-${i + 1}`]
            );
        }
    });

    afterAll(async () => {
        if (projectId) {
            await db.query('DELETE FROM projects WHERE id = $1;', [projectId]);
        }
        for (const wId of workerIds) {
            await db.query('DELETE FROM workers WHERE id = $1;', [wId]);
        }
    });

    test('Strictly enforces concurrency_limit = 3 across 10 concurrent pollers with ZERO duplicate claims', async () => {
        const pollers = workerIds.map((id) => new QueuePoller(id, 5));
        const claimedMap = new Map();
        let duplicateCount = 0;

        await Promise.all(
            pollers.map(async (poller) => {
                for (let step = 0; step < 10; step++) {
                    const job = await poller.claimSingleJobAtomic();
                    if (job && job.queue_id === queueId) {
                        if (claimedMap.has(job.id)) {
                            duplicateCount++;
                        } else {
                            claimedMap.set(job.id, poller.workerId);
                        }
                    }
                }
            })
        );

        expect(duplicateCount).toBe(0);
        expect(claimedMap.size).toBe(3); // Exactly matches queue concurrency_limit = 3
    });
});
