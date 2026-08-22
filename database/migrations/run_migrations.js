const fs = require('fs');
const path = require('path');
const db = require('../db');

async function runMigrations() {
    console.log('Running database migrations...');
    try {
        const migrationPath = path.join(__dirname, '001_init_schema.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        await db.query(sql);
        console.log('✅ Migrations completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await db.pool.end();
    }
}

if (require.main === module) {
    runMigrations();
}

module.exports = runMigrations;
