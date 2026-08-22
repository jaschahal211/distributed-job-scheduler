const bcrypt = require('bcrypt');
const db = require('../db');

async function seed() {
    console.log('🌱 Seeding database with realistic demo data...');
    try {
        // 1. Password hashing
        const passwordHash = await bcrypt.hash('password123', 10);

        // 2. User
        const userRes = await db.query(
            `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id;`,
            ['admin@scheduler.io', passwordHash, 'System Admin']
        );
        const userId = userRes.rows[0].id;

        // 3. Organization
        const orgRes = await db.query(
            `INSERT INTO organizations (name) VALUES ($1) RETURNING id;`,
            ['Acme Corp']
        );
        const orgId = orgRes.rows[0].id;

        // 4. Org Member
        await db.query(
            `INSERT INTO organization_members (organization_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING;`,
            [orgId, userId, 'owner']
        );

        // 5. Projects
        const p1 = await db.query(
            `INSERT INTO projects (organization_id, name, description)
       VALUES ($1, $2, $3) RETURNING id;`,
            [orgId, 'Payment Gateway Engine', 'High throughput transactional payment processing engine']
        );
        const projectId = p1.rows[0].id;

        const p2 = await db.query(
            `INSERT INTO projects (organization_id, name, description)
       VALUES ($1, $2, $3) RETURNING id;`,
            [orgId, 'Data Pipeline Services', 'ETL workflows, report generators and periodic data synchronizations']
        );

        // 6. Retry Policies
        const rpExp = await db.query(
            `INSERT INTO retry_policies (name, strategy, initial_delay, max_delay, max_attempts)
       VALUES ($1, $2, $3, $4, $5) RETURNING id;`,
            ['Default Exponential Backoff', 'exponential', 5, 300, 4]
        );
        const rpExpId = rpExp.rows[0].id;

        const rpFixed = await db.query(
            `INSERT INTO retry_policies (name, strategy, initial_delay, max_delay, max_attempts)
       VALUES ($1, $2, $3, $4, $5) RETURNING id;`,
            ['Fixed 5s Retry', 'fixed', 5, 5, 3]
        );
        const rpFixedId = rpFixed.rows[0].id;

        const rpLinear = await db.query(
            `INSERT INTO retry_policies (name, strategy, initial_delay, max_delay, max_attempts)
       VALUES ($1, $2, $3, $4, $5) RETURNING id;`,
            ['Linear Backoff 10s Step', 'linear', 10, 60, 3]
        );

        // 7. Queues
        const qPayment = await db.query(
            `INSERT INTO queues (project_id, name, priority, concurrency_limit, retry_policy_id, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;`,
            [projectId, 'payment-processing', 10, 3, rpExpId, 'active']
        );
        const qPaymentId = qPayment.rows[0].id;

        const qEmail = await db.query(
            `INSERT INTO queues (project_id, name, priority, concurrency_limit, retry_policy_id, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;`,
            [projectId, 'email-notifications', 5, 5, rpFixedId, 'active']
        );
        const qEmailId = qEmail.rows[0].id;

        const qAnalytics = await db.query(
            `INSERT INTO queues (project_id, name, priority, concurrency_limit, retry_policy_id, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;`,
            [p2.rows[0].id, 'analytics-ingestion', 2, 2, rpExpId, 'active']
        );
        const qAnalyticsId = qAnalytics.rows[0].id;

        const qReports = await db.query(
            `INSERT INTO queues (project_id, name, priority, concurrency_limit, retry_policy_id, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;`,
            [p2.rows[0].id, 'report-generation', 1, 1, rpExpId, 'paused']
        );

        // 8. Workers
        const w1 = await db.query(
            `INSERT INTO workers (name, status, concurrency_limit, current_job_count, last_heartbeat_at, metadata)
       VALUES ($1, $2, $3, $4, NOW(), $5) RETURNING id;`,
            ['worker-node-alpha', 'ONLINE', 5, 1, JSON.stringify({ hostname: 'ip-10-0-1-12', region: 'us-east-1' })]
        );
        const workerAlphaId = w1.rows[0].id;

        const w2 = await db.query(
            `INSERT INTO workers (name, status, concurrency_limit, current_job_count, last_heartbeat_at, metadata)
       VALUES ($1, $2, $3, $4, NOW(), $5) RETURNING id;`,
            ['worker-node-beta', 'ONLINE', 5, 0, JSON.stringify({ hostname: 'ip-10-0-1-18', region: 'us-west-2' })]
        );

        const w3 = await db.query(
            `INSERT INTO workers (name, status, concurrency_limit, current_job_count, last_heartbeat_at, metadata)
       VALUES ($1, $2, $3, $4, NOW() - INTERVAL '15 minutes', $5) RETURNING id;`,
            ['worker-node-legacy', 'OFFLINE', 3, 0, JSON.stringify({ hostname: 'ip-10-0-2-99', region: 'eu-central-1' })]
        );

        // Worker heartbeats
        await db.query(
            `INSERT INTO worker_heartbeats (worker_id, status, current_job_count, metadata)
       VALUES ($1, 'ONLINE', 1, '{"cpu": "12%", "mem": "42%"}'::jsonb),
              ($2, 'ONLINE', 0, '{"cpu": "4%", "mem": "28%"}'::jsonb);`,
            [workerAlphaId, w2.rows[0].id]
        );

        // 9. Jobs & Executions
        // Completed Job
        const jComp = await db.query(
            `INSERT INTO jobs (project_id, queue_id, name, type, payload, priority, status, attempts, max_attempts, retry_policy_id, worker_id, claimed_at, started_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'completed', 1, 3, $7, $8, NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '4 minutes')
       RETURNING id;`,
            [projectId, qPaymentId, 'Process Stripe Webhook #1092', 'SUCCESS_TASK', JSON.stringify({ invoiceId: 'inv_99812', amount: 4900, currency: 'usd' }), 10, rpExpId, workerAlphaId]
        );
        const jCompId = jComp.rows[0].id;

        // Job Execution for Completed Job
        const exComp = await db.query(
            `INSERT INTO job_executions (job_id, worker_id, attempt_number, status, started_at, completed_at, duration_ms, output)
       VALUES ($1, $2, 1, 'completed', NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '4 minutes', 1240, $3)
       RETURNING id;`,
            [jCompId, workerAlphaId, JSON.stringify({ success: true, stripeReceipt: 'ch_3M19028371' })]
        );
        const exCompId = exComp.rows[0].id;

        // Logs for Completed Job
        await db.query(
            `INSERT INTO job_logs (job_id, execution_id, worker_id, level, message, metadata)
       VALUES ($1, $2, $3, 'INFO', 'Received Stripe webhook invoice payment', '{"invoiceId": "inv_99812"}'::jsonb),
              ($1, $2, $3, 'INFO', 'Successfully validated signature and fulfilled invoice', '{"receipt": "ch_3M19028371"}'::jsonb);`,
            [jCompId, exCompId, workerAlphaId]
        );

        // Queued Job
        await db.query(
            `INSERT INTO jobs (project_id, queue_id, name, type, payload, priority, status, attempts, max_attempts, retry_policy_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'queued', 0, 3, $7);`,
            [projectId, qPaymentId, 'Process Subscription Renewal #4812', 'SUCCESS_TASK', JSON.stringify({ userId: 'usr_882', plan: 'pro_monthly' }), 10, rpExpId]
        );

        // Queued Delayed Job
        await db.query(
            `INSERT INTO jobs (project_id, queue_id, name, type, payload, priority, status, scheduled_at, available_at, attempts, max_attempts, retry_policy_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'queued', NOW() + INTERVAL '10 minutes', NOW() + INTERVAL '10 minutes', 0, 3, $7);`,
            [projectId, qEmailId, 'Send Welcome Drip Campaign Email', 'SUCCESS_TASK', JSON.stringify({ email: 'user@example.com', templateId: 'welcome_day_1' }), 5, rpFixedId]
        );

        // Running Job
        const jRun = await db.query(
            `INSERT INTO jobs (project_id, queue_id, name, type, payload, priority, status, attempts, max_attempts, retry_policy_id, worker_id, claimed_at, started_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'running', 1, 3, $7, $8, NOW() - INTERVAL '30 seconds', NOW() - INTERVAL '30 seconds')
       RETURNING id;`,
            [p2.rows[0].id, qAnalyticsId, 'Aggregate Daily Active User Metrics', 'DELAY_TASK', JSON.stringify({ date: '2026-08-21', durationMs: 5000 }), 2, rpExpId, workerAlphaId]
        );

        await db.query(
            `INSERT INTO job_executions (job_id, worker_id, attempt_number, status, started_at)
       VALUES ($1, $2, 1, 'running', NOW() - INTERVAL '30 seconds');`,
            [jRun.rows[0].id, workerAlphaId]
        );

        // Failed / Retrying Job
        const jFailed = await db.query(
            `INSERT INTO jobs (project_id, queue_id, name, type, payload, priority, status, attempts, max_attempts, retry_policy_id, last_error, available_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'queued', 2, 4, $7, $8, NOW() + INTERVAL '15 seconds')
       RETURNING id;`,
            [projectId, qPaymentId, 'Sync User Payment Method (Retry Pending)', 'FAIL_TASK', JSON.stringify({ cardLast4: '4242' }), 8, rpExpId, 'Connection timeout contacting payment provider (Attempt 2 failed)']
        );

        await db.query(
            `INSERT INTO job_executions (job_id, worker_id, attempt_number, status, started_at, completed_at, error)
       VALUES ($1, $2, 1, 'failed', NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '118 seconds', 'Connection timeout contacting payment provider'),
              ($1, $2, 2, 'failed', NOW() - INTERVAL '1 minute', NOW() - INTERVAL '58 seconds', 'Connection timeout contacting payment provider (Attempt 2 failed)');`,
            [jFailed.rows[0].id, workerAlphaId]
        );

        // Permanently Failed Job in DLQ
        const jDlq = await db.query(
            `INSERT INTO jobs (project_id, queue_id, name, type, payload, priority, status, attempts, max_attempts, retry_policy_id, last_error, failed_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'failed', 3, 3, $7, $8, NOW() - INTERVAL '20 minutes')
       RETURNING id;`,
            [projectId, qEmailId, 'Send Transaction Receipt PDF', 'FAIL_TASK', JSON.stringify({ recipient: 'invalid_email_format', transactionId: 'tx_9011' }), 5, rpFixedId, 'SMTP 550 Invalid Recipient Address']
        );

        await db.query(
            `INSERT INTO dead_letter_queue (job_id, queue_id, reason, error, attempts, failed_at, payload, worker_id)
       VALUES ($1, $2, $3, $4, 3, NOW() - INTERVAL '20 minutes', $5, $6);`,
            [jDlq.rows[0].id, qEmailId, 'Exceeded maximum retry attempts (3/3)', 'SMTP 550 Invalid Recipient Address', JSON.stringify({ recipient: 'invalid_email_format', transactionId: 'tx_9011' }), workerAlphaId]
        );

        // 10. Scheduled Jobs (Cron)
        await db.query(
            `INSERT INTO scheduled_jobs (project_id, queue_id, name, type, payload, priority, cron_expression, next_run_at, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '5 minutes', true),
              ($8, $9, $10, $11, $12, $13, $14, NOW() + INTERVAL '1 hour', true);`,
            [
                projectId, qEmailId, 'Hourly Digest Emails', 'SUCCESS_TASK', JSON.stringify({ batchSize: 50 }), 5, '0 * * * *',
                p2.rows[0].id, qAnalyticsId, 'Nightly Database Cleanup & Vacuum', 'SUCCESS_TASK', JSON.stringify({ tables: ['job_logs', 'worker_heartbeats'] }), 1, '0 2 * * *'
            ]
        );

        console.log('✅ Seeding completed successfully.');
        console.log(`🔑 Demo User Credentials: email="admin@scheduler.io", password="password123"`);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    } finally {
        await db.pool.end();
    }
}

if (require.main === module) {
    seed();
}

module.exports = seed;
