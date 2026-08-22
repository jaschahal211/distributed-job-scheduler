const { v4: uuidv4 } = require('uuid');
const db = require('../../database/db');
const HeartbeatManager = require('../../worker/src/heartbeat');
const StaleWorkerRecovery = require('../../worker/src/staleWorkerRecovery');

describe('7. Worker Heartbeats & Stale Recovery Sweep Tests', () => {
    let workerId, workerName;

    beforeAll(() => {
        workerId = uuidv4();
        workerName = 'JestWorkerNodeTest';
    });

    afterAll(async () => {
        if (workerId) {
            await db.query('DELETE FROM workers WHERE id = $1;', [workerId]);
        }
    });

    test('Register worker and emit heartbeat', async () => {
        const getActiveJobCount = () => 0;
        const hbManager = new HeartbeatManager(workerId, workerName, 5, getActiveJobCount);

        const registered = await hbManager.registerWorker();
        expect(registered).toBeDefined();
        expect(registered.id).toBe(workerId);
        expect(registered.name).toBe(workerName);
        expect(registered.status).toBe('ONLINE');

        await hbManager.sendHeartbeat('ONLINE');

        const heartbeats = await db.query('SELECT * FROM worker_heartbeats WHERE worker_id = $1;', [workerId]);
        expect(heartbeats.rows.length).toBeGreaterThanOrEqual(1);

        await hbManager.stop('OFFLINE');

        const finalState = await db.query('SELECT status FROM workers WHERE id = $1;', [workerId]);
        expect(finalState.rows[0].status).toBe('OFFLINE');
    });

    test('Stale worker recovery sweep marks stale workers as OFFLINE', async () => {
        const staleWorkerId = uuidv4();

        // Insert a worker with last_heartbeat_at = 60 seconds ago
        await db.query(
            `INSERT INTO workers (id, name, status, concurrency_limit, current_job_count, last_heartbeat_at)
       VALUES ($1, 'StaleWorker', 'ONLINE', 5, 0, NOW() - INTERVAL '60 seconds');`,
            [staleWorkerId]
        );

        await StaleWorkerRecovery.recoverStaleJobs();

        const recoveredWorker = await db.query('SELECT status FROM workers WHERE id = $1;', [staleWorkerId]);
        expect(recoveredWorker.rows[0].status).toBe('OFFLINE');

        await db.query('DELETE FROM workers WHERE id = $1;', [staleWorkerId]);
    });
});
