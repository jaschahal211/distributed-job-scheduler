const express = require('express');
const router = express.Router();
const workerController = require('../controllers/workerController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', workerController.listWorkers);
router.get('/:id', workerController.getWorker);
router.get('/:id/heartbeat', workerController.getWorkerHeartbeats);

module.exports = router;
