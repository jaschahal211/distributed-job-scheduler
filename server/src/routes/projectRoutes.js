const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const queueController = require('../controllers/queueController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', projectController.listProjects);
router.post('/', projectController.createProject);
router.get('/:id', projectController.getProject);
router.patch('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

// Nested Queue routes under project
router.get('/:projectId/queues', queueController.listQueues);
router.post('/:projectId/queues', queueController.createQueue);

module.exports = router;
