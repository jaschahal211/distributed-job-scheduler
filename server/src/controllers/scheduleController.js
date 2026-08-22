const ScheduleService = require('../services/scheduleService');
const { sendSuccess } = require('../utils/response');
const { asyncHandler } = require('../utils/errors');

const listSchedules = asyncHandler(async (req, res) => {
    const schedules = await ScheduleService.listSchedules(req.query.projectId);
    return sendSuccess(res, schedules);
});

const createSchedule = asyncHandler(async (req, res) => {
    const schedule = await ScheduleService.createSchedule(req.body);
    return sendSuccess(res, schedule, 201);
});

const updateSchedule = asyncHandler(async (req, res) => {
    const schedule = await ScheduleService.updateSchedule(req.params.id, req.body);
    return sendSuccess(res, schedule);
});

const deleteSchedule = asyncHandler(async (req, res) => {
    const result = await ScheduleService.deleteSchedule(req.params.id);
    return sendSuccess(res, result);
});

module.exports = {
    listSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
};
