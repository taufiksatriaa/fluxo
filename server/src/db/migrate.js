import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/fluxo_db";

  const dbUrl = new URL(connectionString);
  const targetDbName = dbUrl.pathname.replace(/^\//, "") || "fluxo_db";

  console.log(`[Migrate] Target Database: "${targetDbName}"`);

  // Step 1: Ensure database exists by connecting to standard "postgres" db
  const adminUrl = new URL(connectionString);
  adminUrl.pathname = "/postgres";

  const adminClient = new Client({ connectionString: adminUrl.toString() });
  await adminClient.connect();

  try {
    const checkDbRes = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDbName]
    );

    if (checkDbRes.rows.length === 0) {
      console.log(`[Migrate] Database "${targetDbName}" not found. Creating...`);
      // Database names cannot be parameterized in CREATE DATABASE
      const safeDbName = targetDbName.replace(/"/g, '""');
      await adminClient.query(`CREATE DATABASE "${safeDbName}"`);
      console.log(`[Migrate] Database "${targetDbName}" successfully created.`);
    } else {
      console.log(`[Migrate] Database "${targetDbName}" already exists.`);
    }
  } finally {
    await adminClient.end();
  }

  // Step 2: Connect to target database
  const client = new Client({ connectionString });
  await client.connect();

  try {
    // Step 3: Ensure _migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Step 4: Scan migrations folder
    const migrationsDir = path.resolve(__dirname, "../../migrations");
    if (!fs.existsSync(migrationsDir)) {
      console.log("[Migrate] No migrations directory found.");
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const appliedRes = await client.query("SELECT name FROM _migrations");
    const appliedSet = new Set(appliedRes.rows.map((r) => r.name));

    console.log(`[Migrate] Found ${files.length} migration file(s).`);

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[Migrate] Skipping (already applied): ${file}`);
        continue;
      }

      console.log(`[Migrate] Applying: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf-8");

      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`[Migrate] ✓ Applied successfully: ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`[Migrate] ✗ Failed to apply migration "${file}":`, err.message);
        throw err;
      }
    }

    console.log("[Migrate] All migrations completed successfully!");
  } finally {
    await client.end();
  }
}

runMigrations().catch((err) => {
  console.error("[Migrate Fatal Error]", err);
  process.exit(1);
});
