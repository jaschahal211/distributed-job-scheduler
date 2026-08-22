const QueueService = require('../services/queueService');
const { sendSuccess } = require('../utils/response');
const { asyncHandler } = require('../utils/errors');

const listQueues = asyncHandler(async (req, res) => {
    const queues = await QueueService.listQueues(req.params.projectId);
    return sendSuccess(res, queues);
});

const getQueue = asyncHandler(async (req, res) => {
    const queue = await QueueService.getQueue(req.params.id);
    return sendSuccess(res, queue);
});

const createQueue = asyncHandler(async (req, res) => {
    const queue = await QueueService.createQueue(req.params.projectId, req.body);
    return sendSuccess(res, queue, 201);
});

const updateQueue = asyncHandler(async (req, res) => {
    const queue = await QueueService.updateQueue(req.params.id, req.body);
    return sendSuccess(res, queue);
});

const pauseQueue = asyncHandler(async (req, res) => {
    const queue = await QueueService.pauseQueue(req.params.id);
    return sendSuccess(res, queue);
});

const resumeQueue = asyncHandler(async (req, res) => {
    const queue = await QueueService.resumeQueue(req.params.id);
    return sendSuccess(res, queue);
});

const deleteQueue = asyncHandler(async (req, res) => {
    const result = await QueueService.deleteQueue(req.params.id);
    return sendSuccess(res, result);
});

const getQueueStats = asyncHandler(async (req, res) => {
    const stats = await QueueService.getQueueStats(req.params.id);
    return sendSuccess(res, stats);
});

const listRetryPolicies = asyncHandler(async (req, res) => {
    const policies = await QueueService.listRetryPolicies();
    return sendSuccess(res, policies);
});

const createRetryPolicy = asyncHandler(async (req, res) => {
    const policy = await QueueService.createRetryPolicy(req.body);
    return sendSuccess(res, policy, 201);
});

module.exports = {
    listQueues,
    getQueue,
    createQueue,
    updateQueue,
    pauseQueue,
    resumeQueue,
    deleteQueue,
    getQueueStats,
    listRetryPolicies,
    createRetryPolicy,
};
