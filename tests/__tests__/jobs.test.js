const db = require('../../database/db');
const JobService = require('../../server/src/services/jobService');

describe('2. Job Creation & Lifecycle Integration Tests', () => {
    let projectId, queueId;

    beforeAll(async () => {
        const orgRes = await db.query('SELECT id FROM organizations LIMIT 1;');
        const orgId = orgRes.rows[0].id;

        const projRes = await db.query(
            "INSERT INTO projects (organization_id, name) VALUES ($1, 'Jest Job Lifecycle Project') RETURNING id;",
            [orgId]
        );
        projectId = projRes.rows[0].id;

        const queueRes = await db.query(
            "INSERT INTO queues (project_id, name, priority, concurrency_limit, status) VALUES ($1, 'jest-queue', 5, 5, 'active') RETURNING id;",
            [projectId]
        );
        queueId = queueRes.rows[0].id;
    });

    afterAll(async () => {
        if (projectId) {
            await db.query('DELETE FROM projects WHERE id = $1;', [projectId]);
        }
    });

    test('Create Immediate Job (queued status)', async () => {
        const result = await JobService.createJob(queueId, {
            name: 'Immediate Test Job',
            type: 'SUCCESS_TASK',
            priority: 10,
            payload: { email: 'jest@test.com' },
        });

        expect(result.job).toBeDefined();
        expect(result.job.status).toBe('queued');
        expect(result.job.priority).toBe(10);
    });

    test('Create Delayed Job (scheduled status)', async () => {
        const result = await JobService.createJob(queueId, {
            name: 'Delayed Test Job',
            type: 'DELAY_TASK',
            delaySeconds: 60,
        });

        expect(result.job).toBeDefined();
        expect(result.job.status).toBe('scheduled');
        expect(new Date(result.job.available_at).getTime()).toBeGreaterThan(Date.now());
    });

    test('Idempotent Job Submission', async () => {
        const key = `idempotency_${Date.now()}`;

        const res1 = await JobService.createJob(queueId, {
            name: 'Idempotent Job',
            type: 'SUCCESS_TASK',
            idempotencyKey: key,
        });
        expect(res1.idempotentDuplicate).toBe(false);

        const res2 = await JobService.createJob(queueId, {
            name: 'Idempotent Job Duplicate',
            type: 'SUCCESS_TASK',
            idempotencyKey: key,
        });
        expect(res2.idempotentDuplicate).toBe(true);
        expect(res2.job.id).toBe(res1.job.id);
    });

    test('List & Filter Jobs', async () => {
        const list = await JobService.listJobs({ projectId, limit: 10 });
        expect(list.jobs.length).toBeGreaterThanOrEqual(3);
        expect(list.pagination.total).toBeGreaterThanOrEqual(3);
    });
});
