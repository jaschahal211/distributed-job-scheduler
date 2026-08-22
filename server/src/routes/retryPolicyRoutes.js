const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', queueController.listRetryPolicies);
router.post('/', queueController.createRetryPolicy);

module.exports = router;
