const express = require('express');
const router = express.Router();
const executionController = require('../controllers/executionController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/:id/logs', executionController.getExecutionLogs);

module.exports = router;
