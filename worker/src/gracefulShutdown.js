const db = require('../../database/db');
const logger = require('../../server/src/utils/logger');

class GracefulShutdownManager {
    static setup({ heartbeatManager, queuePoller, recoveryTimer, cronTimer }) {
        let isShuttingDown = false;

        const handleSignal = async (signal) => {
            if (isShuttingDown) return;
            isShuttingDown = true;

            logger.info(`Received ${signal}. Initiating graceful worker shutdown sequence...`);

            try {
                // 1. Clear timers
                if (recoveryTimer) clearInterval(recoveryTimer);
                if (cronTimer) clearInterval(cronTimer);

                // 2. Mark heartbeat status as DRAINING
                await heartbeatManager.sendHeartbeat('DRAINING');

                // 3. Drain active jobs and stop poller
                await queuePoller.drainAndStop();

                // 4. Mark heartbeat status as OFFLINE and stop heartbeat manager
                await heartbeatManager.stop('OFFLINE');

                // 5. Close database connections
                logger.info('Closing worker database connections...');
                await db.pool.end();

                logger.info('Worker process exited cleanly.');
                process.exit(0);
            } catch (err) {
                logger.error('Error during graceful worker shutdown:', err);
                process.exit(1);
            }
        };

        process.on('SIGINT', () => handleSignal('SIGINT'));
        process.on('SIGTERM', () => handleSignal('SIGTERM'));
    }
}

module.exports = GracefulShutdownManager;
