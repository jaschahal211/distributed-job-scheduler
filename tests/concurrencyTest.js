require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const QueuePoller = require('../worker/src/queuePoller');

async function runConcurrencyTest() {
    console.log('\n==================================================');
    console.log('🧪 RUNNING CONCURRENCY TEST: FOR UPDATE SKIP LOCKED');
    console.log('==================================================\n');

    const client = await db.getClient();

    try {
        // 1. Setup Test Project & Queue
        const orgRes = await client.query(
            'SELECT id FROM organizations LIMIT 1;'
        );

        if (orgRes.rows.length === 0) {
            throw new Error('No organization found. Run database seeding first.');
        }

        const orgId = orgRes.rows[0].id;

        const projRes = await client.query(
            `INSERT INTO projects (organization_id, name)
             VALUES ($1, 'Concurrency Test Project')
             RETURNING id;`,
            [orgId]
        );

        const projectId = projRes.rows[0].id;

        const queueRes = await client.query(
            `INSERT INTO queues
                (project_id, name, priority, concurrency_limit, status)
             VALUES
                ($1, 'test-concurrent-queue', 10, 3, 'active')
             RETURNING id;`,
            [projectId]
        );

        const queueId = queueRes.rows[0].id;

        // 2. Insert 30 queued jobs
        console.log(
            '📥 Seeded 30 queued jobs in queue with concurrency limit = 3...'
        );

        for (let i = 1; i <= 30; i++) {
            await client.query(
                `INSERT INTO jobs
                    (project_id, queue_id, name, type, priority, status, attempts, max_attempts)
                 VALUES
                    ($1, $2, $3, 'DELAY_TASK', $4, 'queued', 0, 3);`,
                [
                    projectId,
                    queueId,
                    `Concurrent Job #${i}`,
                    Math.floor(Math.random() * 10) + 1
                ]
            );
        }

        // 3. Spawn 10 concurrent worker pollers
        const workerCount = 10;

        const workerIds = Array.from(
            { length: workerCount },
            () => uuidv4()
        );

        for (let i = 0; i < workerCount; i++) {
            await client.query(
                `INSERT INTO workers
                    (id, name, status, concurrency_limit, current_job_count)
                 VALUES
                    ($1, $2, 'ONLINE', 5, 0)
                 ON CONFLICT (id) DO NOTHING;`,
                [
                    workerIds[i],
                    `WorkerNode-${i + 1}`
                ]
            );
        }

        const pollers = workerIds.map(
            (id) => new QueuePoller(id, 5)
        );

        console.log(
            `🚀 Spawning ${workerCount} concurrent worker pollers claiming simultaneously...`
        );

        const claimedMap = new Map();
        let duplicateClaimsDetected = 0;

        // 4. Run parallel claim loops
        const claimPromises = pollers.map(async (poller) => {
            for (let step = 0; step < 10; step++) {
                const job = await poller.claimSingleJobAtomic();

                if (job && job.queue_id === queueId) {
                    if (claimedMap.has(job.id)) {
                        duplicateClaimsDetected++;

                        console.error(
                            `❌ DUPLICATE CLAIM DETECTED! ` +
                            `Job ${job.id} was claimed by both ` +
                            `${claimedMap.get(job.id)} and ${poller.workerId}`
                        );
                    } else {
                        claimedMap.set(
                            job.id,
                            poller.workerId
                        );
                    }
                }
            }
        });

        await Promise.all(claimPromises);

        // 5. Check the actual database invariant BEFORE cleanup
        const activeRes = await client.query(
            `SELECT COUNT(*)::int AS count
             FROM jobs
             WHERE queue_id = $1
               AND status IN ('claimed', 'running');`,
            [queueId]
        );

        const activeCount = activeRes.rows[0].count;

        const queueLimitRes = await client.query(
            `SELECT concurrency_limit
             FROM queues
             WHERE id = $1;`,
            [queueId]
        );

        const queueConcurrencyLimit =
            queueLimitRes.rows[0].concurrency_limit;

        console.log('\n--------------------------------------------------');
        console.log('📊 CONCURRENCY TEST RESULTS:');
        console.log('Total Jobs Seeded: 30');
        console.log(
            `Total Jobs Successfully Claimed: ${claimedMap.size}`
        );
        console.log(
            `Duplicate Claims Count: ${duplicateClaimsDetected}`
        );
        console.log(
            `Active CLAIMED/RUNNING Jobs: ${activeCount}`
        );
        console.log(
            `Queue Concurrency Limit: ${queueConcurrencyLimit}`
        );
        console.log('--------------------------------------------------\n');

        // 6. Validate concurrency invariant
        const passed =
            duplicateClaimsDetected === 0 &&
            activeCount <= queueConcurrencyLimit &&
            claimedMap.size > 0;

        if (passed) {
            console.log(
                '✅ PASSED: Atomic claiming prevented duplicate claims ' +
                'and respected the queue concurrency limit.\n'
            );
        } else {
            console.error(
                '❌ FAILED: Queue concurrency invariant was violated.\n'
            );
        }

        // 7. Cleanup test project and workers AFTER verification
        await client.query(
            'DELETE FROM projects WHERE id = $1;',
            [projectId]
        );

        for (const workerId of workerIds) {
            await client.query(
                'DELETE FROM workers WHERE id = $1;',
                [workerId]
            );
        }

        if (!passed) {
            process.exitCode = 1;
        }

    } catch (err) {
        console.error(
            '❌ Error running concurrency test:',
            err
        );

        process.exitCode = 1;

    } finally {
        client.release();
    }
}

runConcurrencyTest();