import nextEnv from "@next/env";
import fs from "node:fs";
import path from "node:path";
import ws from "ws";
import { neon, neonConfig } from "@neondatabase/serverless";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), true);

function parseArgs(argv) {
  const args = { envFile: null, target: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--env-file") {
      args.envFile = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (a === "--target") {
      args.target = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
  }
  return args;
}

function loadEnvFile(envFilePath, { override = false } = {}) {
  const abs = path.isAbsolute(envFilePath)
    ? envFilePath
    : path.join(process.cwd(), envFilePath);

  if (!fs.existsSync(abs)) {
    throw new Error(`Env file not found: ${abs}`);
  }

  const buf = fs.readFileSync(abs);

  // Windows Notepad commonly saves as UTF-16 LE; support it to avoid silent parse failures.
  let text;
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    text = buf.slice(2).toString("utf16le");
  } else if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    // UTF-16 BE -> convert to LE
    const swapped = Buffer.alloc(Math.max(0, buf.length - 2));
    for (let i = 2; i + 1 < buf.length; i += 2) {
      swapped[i - 2] = buf[i + 1];
      swapped[i - 1] = buf[i];
    }
    text = swapped.toString("utf16le");
  } else {
    text = buf.toString("utf8");
  }

  text = text.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/g);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim().replace(/^\uFEFF/, "");
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (override) {
      process.env[key] = value;
      continue;
    }

    // Default behavior: do not overwrite values already provided by the environment.
    if (process.env[key] == null || String(process.env[key]) === "") {
      process.env[key] = value;
    }
  }
}

neonConfig.webSocketConstructor = ws;

const args = parseArgs(process.argv.slice(2));
if (args.envFile) {
  // Make sure we don't accidentally reuse values from .env.local / shell env.
  delete process.env.DIRECT_URL;
  delete process.env.DATABASE_URL;

  loadEnvFile(args.envFile, { override: true });
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DIRECT_URL or DATABASE_URL in env.");
  console.error(
    "Tip: create an env file (uncommitted) containing DIRECT_URL=... and run: node scripts/apply-notifications-templates-migration.mjs --env-file .env.neon.dev",
  );
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
  const targetLabel = args.target ? ` (${args.target})` : "";
  console.log(`Starting notifications templates migration${targetLabel}...`);
  await sql`SELECT 1 as ok`;

  const typeExists = await sql`
    SELECT EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = 'AuditAction'
    ) as ok
  `;

  const auditTypeOk = Array.isArray(typeExists) ? Boolean(typeExists[0]?.ok) : false;
  if (!auditTypeOk) {
    console.error('Type "AuditAction" does not exist. Apply Admin V1 migration first.');
    process.exitCode = 1;
    return;
  }

  const tableExistsBefore = await sql`SELECT to_regclass('public."NotificationTemplate"') as reg`;
  const regBefore = Array.isArray(tableExistsBefore) ? tableExistsBefore[0]?.reg ?? null : null;
  console.log(`NotificationTemplate regclass before${targetLabel}:`, regBefore);

  const migrationPath = path.join(
    process.cwd(),
    "prisma",
    "migrations",
    "20260207004000_notifications_templates_v1",
    "migration.sql",
  );

  await applyMigrationFile(migrationPath);

  const tableExistsAfter = await sql`SELECT to_regclass('public."NotificationTemplate"') as reg`;
  const regAfter = Array.isArray(tableExistsAfter) ? tableExistsAfter[0]?.reg ?? null : null;
  console.log(`NotificationTemplate regclass after${targetLabel}:`, regAfter);

  if (!regAfter) {
    console.error("Migration ran, but NotificationTemplate still missing.");
    process.exitCode = 1;
    return;
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
    "CREATE_NOTIFICATION_TEMPLATE",
    "UPDATE_NOTIFICATION_TEMPLATE",
    "ARCHIVE_NOTIFICATION_TEMPLATE",
    "RESTORE_NOTIFICATION_TEMPLATE",
    "SEND_NOTIFICATION",
  ];
  const missing = expected.filter((x) => !set.has(x));
  if (missing.length > 0) {
    console.error("Migration applied but some enum values are still missing:", missing);
    process.exitCode = 1;
    return;
  }

  console.log(`OK${targetLabel}: NotificationTemplate table exists and AuditAction contains notifications actions.`);
}

main().catch((e) => {
  console.error("Failed to apply migration:", e);
  process.exitCode = 1;
});
