const AuthService = require('../services/authService');
const { sendSuccess } = require('../utils/response');
const { asyncHandler } = require('../utils/errors');

const register = asyncHandler(async (req, res) => {
    const { email, password, name, orgName } = req.body;
    const result = await AuthService.register({ email, password, name, orgName });
    return sendSuccess(res, result, 201);
});

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await AuthService.login({ email, password });
    return sendSuccess(res, result, 200);
});

const getMe = asyncHandler(async (req, res) => {
    const user = await AuthService.getMe(req.user.id);
    return sendSuccess(res, user, 200);
});

module.exports = {
    register,
    login,
    getMe,
};
