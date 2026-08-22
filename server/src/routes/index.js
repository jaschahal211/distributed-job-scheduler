const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const projectRoutes = require('./projectRoutes');
const queueRoutes = require('./queueRoutes');
const jobRoutes = require('./jobRoutes');
const executionRoutes = require('./executionRoutes');
const workerRoutes = require('./workerRoutes');
const dlqRoutes = require('./dlqRoutes');
const scheduleRoutes = require('./scheduleRoutes');
const retryPolicyRoutes = require('./retryPolicyRoutes');

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/queues', queueRoutes);
router.use('/jobs', jobRoutes);
router.use('/executions', executionRoutes);
router.use('/workers', workerRoutes);
router.use('/dlq', dlqRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/retry-policies', retryPolicyRoutes);

module.exports = router;
