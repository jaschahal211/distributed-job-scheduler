const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', scheduleController.listSchedules);
router.post('/', scheduleController.createSchedule);
router.patch('/:id', scheduleController.updateSchedule);
router.delete('/:id', scheduleController.deleteSchedule);

module.exports = router;
