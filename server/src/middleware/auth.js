const jwt = require('jsonwebtoken');
const db = require('../../../database/db');
const { UnauthorizedError } = require('../utils/errors');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-distributed-job-scheduler-key-2026';

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('No authentication token provided');
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const userResult = await db.query(
            `SELECT u.id, u.email, u.name, om.organization_id, om.role as org_role
       FROM users u
       LEFT JOIN organization_members om ON om.user_id = u.id
       WHERE u.id = $1;`,
            [decoded.id]
        );

        if (userResult.rows.length === 0) {
            throw new UnauthorizedError('Invalid token: User no longer exists');
        }

        const user = userResult.rows[0];
        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            organizationId: user.organization_id,
            orgRole: user.org_role || 'member',
        };

        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return next(new UnauthorizedError('Invalid or expired authentication token'));
        }
        next(err);
    }
};

module.exports = {
    generateToken,
    authenticate,
};
