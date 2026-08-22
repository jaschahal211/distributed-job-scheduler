class AppError extends Error {
    constructor(message, statusCode = 500, errorCode = 'INTERNAL_SERVER_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found', errorCode = 'NOT_FOUND') {
        super(message, 404, errorCode);
    }
}

class BadRequestError extends AppError {
    constructor(message = 'Bad request', errorCode = 'BAD_REQUEST') {
        super(message, 400, errorCode);
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access', errorCode = 'UNAUTHORIZED') {
        super(message, 401, errorCode);
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'Forbidden access', errorCode = 'FORBIDDEN') {
        super(message, 403, errorCode);
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource conflict', errorCode = 'CONFLICT') {
        super(message, 409, errorCode);
    }
}

const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
    const message = err.message || 'An unexpected error occurred';

    if (statusCode >= 500) {
        console.error('Unhandled System Error:', err);
    }

    res.status(statusCode).json({
        success: false,
        error: {
            code: errorCode,
            message,
        },
    });
};

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    AppError,
    NotFoundError,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    errorHandler,
    asyncHandler,
};
