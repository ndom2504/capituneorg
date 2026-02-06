import nextEnv from "@next/env";
import fs from "node:fs";
import path from "node:path";
import ws from "ws";
import { neon, neonConfig } from "@neondatabase/serverless";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), true);

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DIRECT_URL or DATABASE_URL in env.");
  process.exitCode = 1;
  process.exit();
}

const sql = neon(connectionString);

function splitSqlStatements(sqlText) {
  const withoutComments = sqlText
    .split(/\r?\n/g)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  return withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  // Health check
  await sql`SELECT 1 as ok`;

  const exists = await sql`SELECT to_regclass('public."UserSettings"') as reg`;
  const reg = Array.isArray(exists) ? exists[0]?.reg ?? null : null;
  console.log("UserSettings regclass before:", reg);

  if (reg) {
    console.log("UserSettings already exists; nothing to do.");
    return;
  }

  const migrationPath = path.join(
    process.cwd(),
    "prisma",
    "migrations",
    "20260206193000_add_user_settings",
    "migration.sql",
  );

  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`);
    process.exitCode = 1;
    return;
  }

  const migrationSql = fs.readFileSync(migrationPath, "utf8");
  const statements = splitSqlStatements(migrationSql);

  if (statements.length === 0) {
    console.error("No SQL statements found in migration file.");
    process.exitCode = 1;
    return;
  }

  console.log(`Applying ${statements.length} SQL statements...`);

  for (const stmt of statements) {
    await sql.query(stmt);
  }

  const existsAfter = await sql`SELECT to_regclass('public."UserSettings"') as reg`;
  const regAfter = Array.isArray(existsAfter) ? existsAfter[0]?.reg ?? null : null;
  console.log("UserSettings regclass after:", regAfter);

  const tables = await sql.query(
    "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name ILIKE '%usersettings%';",
  );
  console.log("information_schema match:", tables);

  if (!regAfter) {
    console.error("Migration ran, but UserSettings still missing.");
    process.exitCode = 1;
    return;
  }

  console.log("Migration applied: UserSettings created.");
}

main().catch((e) => {
  console.error("Failed to apply migration:", e);
  process.exitCode = 1;
});
