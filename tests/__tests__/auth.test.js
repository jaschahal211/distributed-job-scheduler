const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../database/db');

describe('1. Authentication & Authorization Unit/Integration Tests', () => {
    let testOrgId;
    let testUserId;

    beforeAll(async () => {
        const res = await db.query(
            'SELECT id FROM organizations LIMIT 1;'
        );

        if (res.rows.length === 0) {
            throw new Error(
                'No organization found. Run database seeding first.'
            );
        }

        testOrgId = res.rows[0].id;
    });

    afterAll(async () => {
        // Ensure any test-created user is removed.
        if (testUserId) {
            await db.query(
                'DELETE FROM users WHERE id = $1;',
                [testUserId]
            );
        }

        // Close PostgreSQL connections used by Jest.
        await db.pool.end();
    });

    test('Password Hashing & Verification', async () => {
        const rawPassword = 'SecurePassword123!';
        const hash = await bcrypt.hash(rawPassword, 10);

        expect(hash).not.toEqual(rawPassword);

        const isValid = await bcrypt.compare(
            rawPassword,
            hash
        );

        expect(isValid).toBe(true);

        const isInvalid = await bcrypt.compare(
            'WrongPassword',
            hash
        );

        expect(isInvalid).toBe(false);
    });

    test('JWT Token Generation & Verification', () => {
        const secret =
            process.env.JWT_SECRET ||
            'super-secret-distributed-job-scheduler-key-2026';

        const payload = {
            userId: '11111111-1111-1111-1111-111111111111',
            role: 'ADMIN'
        };

        const token = jwt.sign(
            payload,
            secret,
            { expiresIn: '1h' }
        );

        expect(token).toBeDefined();

        const decoded = jwt.verify(
            token,
            secret
        );

        expect(decoded.userId).toBe(payload.userId);
        expect(decoded.role).toBe(payload.role);
    });

    test('User Database Insertion & Organization Membership', async () => {
        const email =
            `testuser_${Date.now()}@scheduler.io`;

        const hash = await bcrypt.hash(
            'password123',
            10
        );

        // Users are independent entities.
        const userRes = await db.query(
            `INSERT INTO users
                (email, password_hash, name)
             VALUES
                ($1, $2, $3)
             RETURNING id, email, name;`,
            [
                email,
                hash,
                'Test Scheduler User'
            ]
        );

        testUserId = userRes.rows[0].id;

        expect(userRes.rows[0].email).toBe(email);
        expect(userRes.rows[0].name).toBe(
            'Test Scheduler User'
        );

        // Organization membership is represented
        // by the normalized junction table.
        const membershipRes = await db.query(
            `INSERT INTO organization_members
                (organization_id, user_id, role)
             VALUES
                ($1, $2, $3)
             RETURNING organization_id, user_id, role;`,
            [
                testOrgId,
                testUserId,
                'member'
            ]
        );

        expect(
            membershipRes.rows[0].organization_id
        ).toBe(testOrgId);

        expect(
            membershipRes.rows[0].user_id
        ).toBe(testUserId);

        expect(
            membershipRes.rows[0].role
        ).toBe('member');

        // Verify the relationship can be queried.
        const verifyRes = await db.query(
            `SELECT
                u.email,
                om.organization_id,
                om.role
             FROM users u
             JOIN organization_members om
               ON om.user_id = u.id
             WHERE u.id = $1
               AND om.organization_id = $2;`,
            [
                testUserId,
                testOrgId
            ]
        );

        expect(verifyRes.rows.length).toBe(1);
        expect(verifyRes.rows[0].email).toBe(email);
        expect(verifyRes.rows[0].organization_id).toBe(
            testOrgId
        );
        expect(verifyRes.rows[0].role).toBe('member');
    });
});