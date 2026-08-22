const ExecutionService = require('../services/executionService');
const { sendSuccess } = require('../utils/response');
const { asyncHandler } = require('../utils/errors');

const listJobExecutions = asyncHandler(async (req, res) => {
    const executions = await ExecutionService.listJobExecutions(req.params.id);
    return sendSuccess(res, executions);
});

const getExecutionLogs = asyncHandler(async (req, res) => {
    const { page, limit, level } = req.query;
    const result = await ExecutionService.getExecutionLogs(req.params.id, {
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 50,
        level,
    });
    return sendSuccess(res, result.logs, 200, result.pagination);
});

const getJobLogs = asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await ExecutionService.getJobLogs(req.params.id, {
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 50,
    });
    return sendSuccess(res, result.logs, 200, result.pagination);
});

module.exports = {
    listJobExecutions,
    getExecutionLogs,
    getJobLogs,
};
