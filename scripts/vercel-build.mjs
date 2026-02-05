import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function log(msg) {
  console.log(`[vercel-build] ${msg}`);
}

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

function resolveLocalBin(projectRootDir, binName) {
  const binDir = path.join(projectRootDir, "node_modules", ".bin");
  const candidates =
    process.platform === "win32"
      ? [
          path.join(binDir, `${binName}.cmd`),
          path.join(binDir, `${binName}.ps1`),
          path.join(binDir, `${binName}.exe`),
          path.join(binDir, binName),
        ]
      : [path.join(binDir, binName)];

  for (const p of candidates) {
    if (fileExists(p)) return p;
  }
  return binName;
}

function runBin(binName, args, options = {}) {
  const cmd = resolveLocalBin(process.cwd(), binName);
  run(cmd, args, options);
}

const isVercel = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);

function fileExists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function detectProjectRoot(startDir) {
  const candidates = [startDir, path.join(startDir, "capitune-web")];

  for (const dir of candidates) {
    const pkg = path.join(dir, "package.json");
    const prismaSchema = path.join(dir, "prisma", "schema.prisma");
    const nextConfigTs = path.join(dir, "next.config.ts");
    if (fileExists(pkg) && fileExists(prismaSchema) && fileExists(nextConfigTs)) {
      return dir;
    }
  }

  // Fallback: at least find prisma schema.
  for (const dir of candidates) {
    const prismaSchema = path.join(dir, "prisma", "schema.prisma");
    if (fileExists(prismaSchema)) return dir;
  }

  return startDir;
}

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
  let changed = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const migrationSql = path.join(migrationsDir, entry.name, "migration.sql");
    if (!fs.existsSync(migrationSql)) continue;
    if (stripUtf8BomFromFile(migrationSql)) changed += 1;
  }

  if (changed > 0) log(`Stripped UTF-8 BOM from ${changed} migration.sql file(s).`);
}

const initialCwd = process.cwd();
const projectRoot = detectProjectRoot(initialCwd);
if (projectRoot !== initialCwd) {
  process.chdir(projectRoot);
}

log(`CWD: ${initialCwd}`);
if (projectRoot !== initialCwd) log(`Using project root: ${projectRoot}`);
if (isVercel) log(`Detected Vercel environment (VERCEL_ENV=${process.env.VERCEL_ENV ?? ""}).`);

if (isVercel) {
  // Guardrail: Postgres fails with a 42601 if a migration file starts with a UTF-8 BOM.
  stripBomsInPrismaMigrations(process.cwd());

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "Missing DATABASE_URL on Vercel. Set it in Project Settings → Environment Variables.",
    );
  }

  log(
    `Env present: DATABASE_URL=${process.env.DATABASE_URL ? "yes" : "no"}, DIRECT_URL=${process.env.DIRECT_URL ? "yes" : "no"}, DATABASE_URL_UNPOOLED=${process.env.DATABASE_URL_UNPOOLED ? "yes" : "no"}`,
  );

  // Prisma schema expects DIRECT_URL; allow common alternative names.
  if (!process.env.DIRECT_URL) {
    const candidates = [
      ["DATABASE_URL_UNPOOLED", process.env.DATABASE_URL_UNPOOLED],
      ["POSTGRES_URL_NON_POOLING", process.env.POSTGRES_URL_NON_POOLING],
      ["POSTGRES_URL_NON_POOLING_DIRECT", process.env.POSTGRES_URL_NON_POOLING_DIRECT],
      ["POSTGRES_URL_UNPOOLED", process.env.POSTGRES_URL_UNPOOLED],
    ];

    const hit = candidates.find(([, v]) => Boolean(v));
    if (hit) {
      const [name, value] = hit;
      process.env.DIRECT_URL = value;
      log(`DIRECT_URL was missing; using fallback from ${name}.`);
    }
  }

  if (!process.env.DIRECT_URL) {
    throw new Error(
      "Missing DIRECT_URL on Vercel. Set DIRECT_URL (Neon unpooled) or DATABASE_URL_UNPOOLED.",
    );
  }

  // Soft warning: DIRECT_URL should generally be unpooled/unpgbouncer.
  if (/pooler|pgbouncer/i.test(process.env.DIRECT_URL)) {
    log(
      "Warning: DIRECT_URL looks like a pooled/pooler URL. Prisma migrate deploy often requires an unpooled (direct) connection.",
    );
  }

  runBin("prisma", ["migrate", "deploy"]);
}

runBin("next", ["build"]);
