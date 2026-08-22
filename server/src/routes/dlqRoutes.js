const express = require('express');
const router = express.Router();
const dlqController = require('../controllers/dlqController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', dlqController.listDLQEntries);
router.get('/:id', dlqController.getDLQEntry);
router.post('/:id/retry', dlqController.retryDLQEntry);
router.delete('/:id', dlqController.deleteDLQEntry);

module.exports = router;
