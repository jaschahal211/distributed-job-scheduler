require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const db = require('../../database/db');

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
    logger.info(`🚀 Distributed Job Scheduler API Server running on port ${PORT}`);
});

const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}. Gracefully shutting down HTTP server...`);
    server.close(async () => {
        logger.info('HTTP server closed. Closing database connection pool...');
        try {
            await db.pool.end();
            logger.info('Database pool closed cleanly.');
            process.exit(0);
        } catch (err) {
            logger.error('Error closing database pool:', err);
            process.exit(1);
        }
    });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
