require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const RetryManager = require('../worker/src/retryManager');

async function runRetryAndDlqTest() {
    console.log('\n==================================================');
    console.log('🧪 RUNNING RETRY POLICY & DLQ INTEGRATION TEST');
    console.log('==================================================\n');

    const client = await db.getClient();
    try {
        // 1. Setup Test Project & Queue
        const orgRes = await client.query('SELECT id FROM organizations LIMIT 1;');
        const orgId = orgRes.rows[0].id;

        const projRes = await client.query(
            `INSERT INTO projects (organization_id, name) VALUES ($1, 'Retry Test Project') RETURNING id;`,
            [orgId]
        );
        const projectId = projRes.rows[0].id;

        const queueRes = await client.query(
            `INSERT INTO queues (project_id, name, priority, concurrency_limit, status)
       VALUES ($1, 'test-retry-queue', 10, 5, 'active') RETURNING id;`,
            [projectId]
        );
        const queueId = queueRes.rows[0].id;

        const workerId = uuidv4();
        await client.query(
            `INSERT INTO workers (id, name, status) VALUES ($1, 'TestWorker-Retry', 'ONLINE');`,
            [workerId]
        );

        // 2. Test Exponential Backoff Calculation
        console.log('📐 Testing Exponential Backoff Calculation...');
        const delay1 = RetryManager.calculateNextRetryDelay('exponential', 5, 300, 1); // 5s
        const delay2 = RetryManager.calculateNextRetryDelay('exponential', 5, 300, 2); // 10s
        const delay3 = RetryManager.calculateNextRetryDelay('exponential', 5, 300, 3); // 20s
        console.log(`Attempt #1 Delay: ${delay1}s | Attempt #2 Delay: ${delay2}s | Attempt #3 Delay: ${delay3}s`);

        if (delay1 !== 5 || delay2 !== 10 || delay3 !== 20) {
            throw new Error('Exponential backoff calculation mismatch!');
        }
        console.log('✅ Exponential backoff mathematical calculation verified.');

        // 3. Test DLQ Transition on Max Attempts Reached
        console.log('\n💀 Testing DLQ Routing when max attempts reached...');
        const jobRes = await client.query(
            `INSERT INTO jobs (project_id, queue_id, name, type, priority, status, attempts, max_attempts, payload)
       VALUES ($1, $2, 'Failing Job Demo', 'FAIL_TASK', 5, 'running', 2, 3, '{"test": true}') RETURNING *;`,
            [projectId, queueId]
        );
        const testJob = jobRes.rows[0];

        // Attempt #3 (equals max_attempts=3) -> Should trigger DLQ
        const failureResult = await RetryManager.handleJobFailure({
            job: testJob,
            attemptNumber: 3,
            error: 'Simulated 3rd attempt failure',
            workerId,
        });

        if (!failureResult.isDlq) {
            throw new Error('Job was not routed to DLQ upon reaching max attempts!');
        }
        console.log('✅ Job successfully marked as failed and routed to DLQ.');

        // Verify DLQ Table Entry
        const dlqRes = await client.query(
            `SELECT * FROM dead_letter_queue WHERE job_id = $1;`,
            [testJob.id]
        );
        if (dlqRes.rows.length === 0) {
            throw new Error('DLQ table entry missing!');
        }
        console.log(`✅ DLQ table entry created. Reason: "${dlqRes.rows[0].reason}"`);

        // Clean up
        await client.query('DELETE FROM projects WHERE id = $1;', [projectId]);
        await client.query('DELETE FROM workers WHERE id = $1;', [workerId]);

        console.log('\n==================================================');
        console.log('✅ RETRY & DLQ TEST PASSED SUCCESSFULLY!');
        console.log('==================================================\n');
        process.exit(0);
    } catch (err) {
        console.error('❌ Retry & DLQ Test Failed:', err);
        process.exit(1);
    } finally {
        client.release();
    }
}

runRetryAndDlqTest();
