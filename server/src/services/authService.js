const bcrypt = require('bcrypt');
const db = require('../../../database/db');
const { generateToken } = require('../middleware/auth');
const { BadRequestError, UnauthorizedError, ConflictError } = require('../utils/errors');

class AuthService {
    static async register({ email, password, name, orgName = 'Default Organization' }) {
        const existing = await db.query('SELECT id FROM users WHERE email = $1;', [email]);
        if (existing.rows.length > 0) {
            throw new ConflictError('User with this email already exists');
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const userRes = await client.query(
                `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING id, email, name, created_at;`,
                [email, passwordHash, name]
            );
            const user = userRes.rows[0];

            const orgRes = await client.query(
                `INSERT INTO organizations (name) VALUES ($1) RETURNING id, name;`,
                [orgName]
            );
            const org = orgRes.rows[0];

            await client.query(
                `INSERT INTO organization_members (organization_id, user_id, role)
         VALUES ($1, $2, $3);`,
                [org.id, user.id, 'owner']
            );

            // Create a default demo project for this org
            const projRes = await client.query(
                `INSERT INTO projects (organization_id, name, description)
         VALUES ($1, $2, $3) RETURNING id, name;`,
                [org.id, 'Default Project', 'Primary system workspace']
            );

            // Create a default retry policy
            const rpRes = await client.query(
                `INSERT INTO retry_policies (name, strategy, initial_delay, max_delay, max_attempts)
         VALUES ('Exponential Default', 'exponential', 5, 300, 3) RETURNING id;`
            );

            // Create a default queue
            await client.query(
                `INSERT INTO queues (project_id, name, priority, concurrency_limit, retry_policy_id)
         VALUES ($1, 'default', 1, 5, $2);`,
                [projRes.rows[0].id, rpRes.rows[0].id]
            );

            await client.query('COMMIT');

            const token = generateToken(user);
            return { user, organization: org, token };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async login({ email, password }) {
        const res = await db.query(
            `SELECT u.id, u.email, u.name, u.password_hash, om.organization_id, om.role as org_role
       FROM users u
       LEFT JOIN organization_members om ON om.user_id = u.id
       WHERE u.email = $1;`,
            [email]
        );

        if (res.rows.length === 0) {
            throw new UnauthorizedError('Invalid email or password');
        }

        const user = res.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            throw new UnauthorizedError('Invalid email or password');
        }

        delete user.password_hash;
        const token = generateToken(user);

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                organizationId: user.organization_id,
                orgRole: user.org_role,
            },
            token,
        };
    }

    static async getMe(userId) {
        const res = await db.query(
            `SELECT u.id, u.email, u.name, u.created_at, om.organization_id, o.name as organization_name, om.role as org_role
       FROM users u
       LEFT JOIN organization_members om ON om.user_id = u.id
       LEFT JOIN organizations o ON o.id = om.organization_id
       WHERE u.id = $1;`,
            [userId]
        );

        if (res.rows.length === 0) {
            throw new UnauthorizedError('User not found');
        }

        return res.rows[0];
    }
}

module.exports = AuthService;
