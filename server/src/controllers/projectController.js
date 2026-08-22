const ProjectService = require('../services/projectService');
const { sendSuccess } = require('../utils/response');
const { asyncHandler } = require('../utils/errors');

const listProjects = asyncHandler(async (req, res) => {
    const projects = await ProjectService.listProjects(req.user.organizationId);
    return sendSuccess(res, projects);
});

const getProject = asyncHandler(async (req, res) => {
    const project = await ProjectService.getProject(req.params.id, req.user.organizationId);
    return sendSuccess(res, project);
});

const createProject = asyncHandler(async (req, res) => {
    const project = await ProjectService.createProject(req.user.organizationId, req.body);
    return sendSuccess(res, project, 201);
});

const updateProject = asyncHandler(async (req, res) => {
    const project = await ProjectService.updateProject(req.params.id, req.user.organizationId, req.body);
    return sendSuccess(res, project);
});

const deleteProject = asyncHandler(async (req, res) => {
    const result = await ProjectService.deleteProject(req.params.id, req.user.organizationId);
    return sendSuccess(res, result);
});

module.exports = {
    listProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
};
