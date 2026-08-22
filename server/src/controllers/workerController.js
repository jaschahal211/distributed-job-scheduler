const WorkerService = require('../services/workerService');
const { sendSuccess } = require('../utils/response');
const { asyncHandler } = require('../utils/errors');

const listWorkers = asyncHandler(async (req, res) => {
    const workers = await WorkerService.listWorkers();
    return sendSuccess(res, workers);
});

const getWorker = asyncHandler(async (req, res) => {
    const worker = await WorkerService.getWorker(req.params.id);
    return sendSuccess(res, worker);
});

const getWorkerHeartbeats = asyncHandler(async (req, res) => {
    const heartbeats = await WorkerService.getWorkerHeartbeats(req.params.id);
    return sendSuccess(res, heartbeats);
});

module.exports = {
    listWorkers,
    getWorker,
    getWorkerHeartbeats,
};
