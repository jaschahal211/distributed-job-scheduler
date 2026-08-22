const db = require('../../../database/db');
const { NotFoundError, BadRequestError } = require('../utils/errors');

class ProjectService {
    static async listProjects(orgId) {
        const res = await db.query(
            `SELECT p.*,
              COUNT(q.id) as queue_count,
              (SELECT COUNT(*) FROM jobs j WHERE j.project_id = p.id) as total_jobs
       FROM projects p
       LEFT JOIN queues q ON q.project_id = p.id
       WHERE p.organization_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC;`,
            [orgId]
        );
        return res.rows;
    }

    static async getProject(projectId, orgId) {
        const res = await db.query(
            `SELECT p.*,
              COUNT(q.id) as queue_count,
              (SELECT COUNT(*) FROM jobs j WHERE j.project_id = p.id) as total_jobs
       FROM projects p
       LEFT JOIN queues q ON q.project_id = p.id
       WHERE p.id = $1 AND p.organization_id = $2
       GROUP BY p.id;`,
            [projectId, orgId]
        );

        if (res.rows.length === 0) {
            throw new NotFoundError(`Project with ID ${projectId} not found`);
        }

        return res.rows[0];
    }

    static async createProject(orgId, { name, description }) {
        if (!name) throw new BadRequestError('Project name is required');
        const res = await db.query(
            `INSERT INTO projects (organization_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *;`,
            [orgId, name, description || null]
        );
        return res.rows[0];
    }

    static async updateProject(projectId, orgId, { name, description }) {
        const res = await db.query(
            `UPDATE projects
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           updated_at = NOW()
       WHERE id = $3 AND organization_id = $4
       RETURNING *;`,
            [name, description, projectId, orgId]
        );

        if (res.rows.length === 0) {
            throw new NotFoundError(`Project with ID ${projectId} not found`);
        }

        return res.rows[0];
    }

    static async deleteProject(projectId, orgId) {
        const res = await db.query(
            `DELETE FROM projects WHERE id = $1 AND organization_id = $2 RETURNING id;`,
            [projectId, orgId]
        );

        if (res.rows.length === 0) {
            throw new NotFoundError(`Project with ID ${projectId} not found`);
        }

        return { deleted: true, id: projectId };
    }
}

module.exports = ProjectService;
