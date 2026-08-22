const sendSuccess = (res, data = null, statusCode = 200, pagination = null) => {
    const responsePayload = {
        success: true,
    };

    if (data !== null) {
        responsePayload.data = data;
    }

    if (pagination) {
        responsePayload.pagination = pagination;
    }

    return res.status(statusCode).json(responsePayload);
};

const buildPagination = (page, limit, totalCount) => {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const total = parseInt(totalCount, 10) || 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
        page: pageNum,
        limit: limitNum,

        // Keep both names for compatibility.
        total,
        totalCount: total,

        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
    };
};

module.exports = {
    sendSuccess,
    buildPagination,
};