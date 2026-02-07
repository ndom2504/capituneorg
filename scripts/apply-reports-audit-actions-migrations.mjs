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

async function applyMigrationFile(migrationPath) {
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${migrationPath}`);
  }

  const migrationSql = fs.readFileSync(migrationPath, "utf8");
  const statements = splitSqlStatements(migrationSql);
  if (statements.length === 0) {
    console.log(`No SQL statements in ${migrationPath}; skipping.`);
    return;
  }

  console.log(`Applying ${statements.length} statements from ${path.relative(process.cwd(), migrationPath)}...`);
  for (const stmt of statements) {
    try {
      await sql.query(stmt);
    } catch (e) {
      console.error("Statement failed:\n", stmt);
      throw e;
    }
  }
}

async function main() {
  await sql`SELECT 1 as ok`;

  // Ensure base enum exists
  const typeExists = await sql`
    SELECT EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = 'AuditAction'
    ) as ok
  `;

  const ok = Array.isArray(typeExists) ? Boolean(typeExists[0]?.ok) : false;
  if (!ok) {
    console.error('Type "AuditAction" does not exist. Apply Admin V1 migration first.');
    process.exitCode = 1;
    return;
  }

  const migrationPaths = [
    path.join(process.cwd(), "prisma", "migrations", "20260206234500_reports_audit_actions", "migration.sql"),
    path.join(
      process.cwd(),
      "prisma",
      "migrations",
      "20260207000100_reports_sanctions_audit_actions",
      "migration.sql",
    ),
  ];

  for (const p of migrationPaths) {
    await applyMigrationFile(p);
  }

  const labels = await sql`
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'AuditAction'
    ORDER BY e.enumsortorder
  `;

  const set = new Set((Array.isArray(labels) ? labels : []).map((r) => r.enumlabel));
  const expected = [
    "REPORT_REVIEW",
    "REPORT_RESOLVE",
    "REPORT_DISMISS",
    "SUSPEND_PROFILE",
    "DELETE_COMMENT",
  ];

  const missing = expected.filter((x) => !set.has(x));
  if (missing.length > 0) {
    console.error("Migration applied but some enum values are still missing:", missing);
    process.exitCode = 1;
    return;
  }

  console.log("OK: AuditAction enum contains report/sanction values.");
}

main().catch((e) => {
  console.error("Failed to apply migrations:", e);
  process.exitCode = 1;
});
