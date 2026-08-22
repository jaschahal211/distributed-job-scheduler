const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const executionController = require('../controllers/executionController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Batch jobs
router.post('/batch', jobController.batchCreateJobs);

// Job listing & search
router.get('/', jobController.listJobs);
router.get('/dashboard-stats', jobController.getDashboardStats);
router.get('/:id', jobController.getJob);

// Actions
router.post('/:id/retry', jobController.retryJob);
router.post('/:id/cancel', jobController.cancelJob);
router.delete('/:id', jobController.deleteJob);

// Executions and logs for specific job
router.get('/:id/executions', executionController.listJobExecutions);
router.get('/:id/logs', executionController.getJobLogs);

module.exports = router;
