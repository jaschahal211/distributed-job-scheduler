const JobService = require('../services/jobService');
const { sendSuccess } = require('../utils/response');
const { asyncHandler } = require('../utils/errors');

const createJob = asyncHandler(async (req, res) => {
    const result = await JobService.createJob(req.params.queueId, req.body);
    const statusCode = result.idempotentDuplicate ? 200 : 201;
    return sendSuccess(res, result.job, statusCode);
});

const batchCreateJobs = asyncHandler(async (req, res) => {
    const results = await JobService.batchCreateJobs(req.body);
    return sendSuccess(res, results.map(r => r.job), 201);
});

const listJobs = asyncHandler(async (req, res) => {
    const { projectId, queueId, status, workerId, search, page, limit } = req.query;
    const result = await JobService.listJobs({
        projectId,
        queueId,
        status,
        workerId,
        search,
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 20,
    });
    return sendSuccess(res, result.jobs, 200, result.pagination);
});

const getJob = asyncHandler(async (req, res) => {
    const job = await JobService.getJob(req.params.id);
    return sendSuccess(res, job);
});

const retryJob = asyncHandler(async (req, res) => {
    const job = await JobService.retryJob(req.params.id);
    return sendSuccess(res, job);
});

const cancelJob = asyncHandler(async (req, res) => {
    const job = await JobService.cancelJob(req.params.id);
    return sendSuccess(res, job);
});

const deleteJob = asyncHandler(async (req, res) => {
    const result = await JobService.deleteJob(req.params.id);
    return sendSuccess(res, result);
});

const getDashboardStats = asyncHandler(async (req, res) => {
    const stats = await JobService.getDashboardStats(req.user.organizationId);
    return sendSuccess(res, stats);
});

module.exports = {
    createJob,
    batchCreateJobs,
    listJobs,
    getJob,
    retryJob,
    cancelJob,
    deleteJob,
    getDashboardStats,
};
