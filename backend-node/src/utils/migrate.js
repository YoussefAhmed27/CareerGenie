const pool = require("../db");

async function runMigrations() {
  console.log("Running HR database migrations...");
  try {
    // 1. Add position column to hr_user if not exists
    await pool.query(`
      ALTER TABLE hr_user 
      ADD COLUMN IF NOT EXISTS position VARCHAR(100);
    `);

    // 2. Add is_workspace_owner column to hr_user if not exists
    await pool.query(`
      ALTER TABLE hr_user 
      ADD COLUMN IF NOT EXISTS is_workspace_owner BOOLEAN DEFAULT false;
    `);

    // 3. Create workspace_invite table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workspace_invite (
        invite_id SERIAL PRIMARY KEY,
        workspace_id INT NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        position VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'Member',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log("HR migrations completed successfully!");
  } catch (err) {
    console.error("Migration Error:", err);
  }
}

module.exports = runMigrations;
