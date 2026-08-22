require('dotenv').config();
const { v4: uuidv4, v5: uuidv5, validate: uuidValidate } = require('uuid');
const logger = require('../../server/src/utils/logger');
const HeartbeatManager = require('./heartbeat');
const QueuePoller = require('./queuePoller');
const StaleWorkerRecovery = require('./staleWorkerRecovery');
const CronScheduler = require('./cronScheduler');
const GracefulShutdownManager = require('./gracefulShutdown');

const WORKER_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function resolveWorkerConfig() {
    const envId = process.env.WORKER_ID;
    const envName = process.env.WORKER_NAME;

    let workerName = envName || (envId && !uuidValidate(envId) ? envId : `WorkerNode-${process.pid}`);
    let workerId;

    if (envId && uuidValidate(envId)) {
        workerId = envId;
    } else if (envId) {
        // Non-UUID identifier supplied (e.g. "worker-node-1").
        // Derive a deterministic valid UUID so restarts hit ON CONFLICT DO UPDATE cleanly.
        workerId = uuidv5(envId, WORKER_NAMESPACE);
    } else {
        workerId = uuidv5(workerName, WORKER_NAMESPACE);
    }

    return { workerId, workerName };
}

const { workerId: WORKER_ID, workerName: WORKER_NAME } = resolveWorkerConfig();
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY, 10) || 5;
const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL, 10) || 5000;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL, 10) || 2000;

async function startWorker() {
    logger.info(`Starting Worker Service process... [ID: ${WORKER_ID}, Name: ${WORKER_NAME}, Concurrency: ${CONCURRENCY}]`);

    const queuePoller = new QueuePoller(WORKER_ID, CONCURRENCY);

    const heartbeatManager = new HeartbeatManager(
        WORKER_ID,
        WORKER_NAME,
        CONCURRENCY,
        () => queuePoller.getActiveJobCount()
    );

    // 1. Register worker in DB
    await heartbeatManager.registerWorker();

    // 2. Start Periodic Heartbeats
    heartbeatManager.start(HEARTBEAT_INTERVAL);

    // 3. Start Atomic Queue Poller
    queuePoller.start(POLL_INTERVAL);

    // 4. Start Stale Worker Recovery Engine (runs every 15s)
    const recoveryTimer = StaleWorkerRecovery.startPeriodicRecovery(15000);

    // 5. Start Cron Scheduler Engine (runs every 5s)
    const cronTimer = CronScheduler.startPeriodicCronEngine(5000);

    // 6. Register Graceful Shutdown Hooks (SIGINT / SIGTERM)
    GracefulShutdownManager.setup({
        heartbeatManager,
        queuePoller,
        recoveryTimer,
        cronTimer,
    });

    logger.info(`🚀 Worker Service [${WORKER_NAME} / ${WORKER_ID}] is fully operational and actively polling jobs!`);
}

startWorker().catch((err) => {
    logger.error('Fatal error starting worker service:', err);
    process.exit(1);
});
