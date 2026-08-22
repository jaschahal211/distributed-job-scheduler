const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const jobController = require('../controllers/jobController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Queue endpoints
router.get('/:id', queueController.getQueue);
router.patch('/:id', queueController.updateQueue);
router.delete('/:id', queueController.deleteQueue);
router.post('/:id/pause', queueController.pauseQueue);
router.post('/:id/resume', queueController.resumeQueue);
router.get('/:id/stats', queueController.getQueueStats);

// Post job into specific queue
router.post('/:queueId/jobs', jobController.createJob);

module.exports = router;
