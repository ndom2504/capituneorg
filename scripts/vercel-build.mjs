import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });

  if (result.status !== 0) {
    const pretty = [cmd, ...args].join(" ");
    throw new Error(`Command failed (${result.status}): ${pretty}`);
  }
}

const isVercel = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);

function stripUtf8BomFromFile(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    fs.writeFileSync(filePath, buf.subarray(3));
    return true;
  }
  return false;
}

function stripBomsInPrismaMigrations(projectRoot) {
  const migrationsDir = path.join(projectRoot, "prisma", "migrations");
  if (!fs.existsSync(migrationsDir)) return;

  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const migrationSql = path.join(migrationsDir, entry.name, "migration.sql");
    if (!fs.existsSync(migrationSql)) continue;
    stripUtf8BomFromFile(migrationSql);
  }
}

if (isVercel) {
  // Guardrail: Postgres fails with a 42601 if a migration file starts with a UTF-8 BOM.
  stripBomsInPrismaMigrations(process.cwd());

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "Missing DATABASE_URL on Vercel. Set it in Project Settings → Environment Variables.",
    );
  }

  // Prisma schema expects DIRECT_URL; allow common alternative names.
  if (!process.env.DIRECT_URL) {
    const fallback =
      process.env.DATABASE_URL_UNPOOLED ??
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.POSTGRES_URL_NON_POOLING_DIRECT ??
      process.env.POSTGRES_URL_UNPOOLED;
    if (fallback) process.env.DIRECT_URL = fallback;
  }

  if (!process.env.DIRECT_URL) {
    throw new Error(
      "Missing DIRECT_URL on Vercel. Set DIRECT_URL (Neon unpooled) or DATABASE_URL_UNPOOLED.",
    );
  }

  run("prisma", ["migrate", "deploy"]);
}

run("next", ["build"]);
