const DLQService = require('../services/dlqService');
const { sendSuccess } = require('../utils/response');
const { asyncHandler } = require('../utils/errors');

const listDLQEntries = asyncHandler(async (req, res) => {
    const { queueId, projectId, page, limit } = req.query;
    const result = await DLQService.listDLQEntries({
        queueId,
        projectId,
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 20,
    });
    return sendSuccess(res, result.entries, 200, result.pagination);
});

const getDLQEntry = asyncHandler(async (req, res) => {
    const entry = await DLQService.getDLQEntry(req.params.id);
    return sendSuccess(res, entry);
});

const retryDLQEntry = asyncHandler(async (req, res) => {
    const result = await DLQService.retryDLQEntry(req.params.id);
    return sendSuccess(res, result);
});

const deleteDLQEntry = asyncHandler(async (req, res) => {
    const result = await DLQService.deleteDLQEntry(req.params.id);
    return sendSuccess(res, result);
});

module.exports = {
    listDLQEntries,
    getDLQEntry,
    retryDLQEntry,
    deleteDLQEntry,
};
