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

function runCapture(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    stdio: "pipe",
    encoding: "utf8",
    shell: process.platform === "win32",
    ...options,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  return result;
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

function runBinCapture(binName, args, options = {}) {
  const cmd = resolveLocalBin(process.cwd(), binName);
  return runCapture(cmd, args, options);
}

const isVercel = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);

function isTruthyEnv(name) {
  const v = String(process.env[name] ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function isConversationAlreadyExistsError(output) {
  const text = String(output ?? "");
  return (
    text.includes('relation "Conversation" already exists') ||
    text.includes("relation \"Conversation\" already exists") ||
    (text.includes("E42P07") && text.includes("Conversation") && text.includes("already exists"))
  );
}

function getFailedMigrationName(output) {
  const text = String(output ?? "");
  if (!text.includes("migrate found failed migrations")) return null;

  // Example:
  // The `20260206_add_messaging_system` migration started at ... failed
  const match = text.match(/The `([^`]+)` migration started[\s\S]*?failed/);
  return match?.[1] ?? null;
}

const AUTO_RESOLVE_APPLIED_MIGRATIONS = new Set([
  "20260206_add_messaging_system",
  "20260206193000_add_user_settings",
]);

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

  const skipPrismaMigrate =
    isTruthyEnv("SKIP_PRISMA_MIGRATE") || isTruthyEnv("SKIP_PRISMA_MIGRATE_DEPLOY");
  const allowMigrateFailure = isTruthyEnv("ALLOW_PRISMA_MIGRATE_FAILURE");

  if (skipPrismaMigrate) {
    log("SKIP_PRISMA_MIGRATE is set; skipping prisma migrate deploy.");
  }

  if (!skipPrismaMigrate) {
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

    const deploy = () => runBinCapture("prisma", ["migrate", "deploy"]);

    let deployResult = deploy();
    if (deployResult.status !== 0) {
      const combinedOutput = `${deployResult.stdout ?? ""}\n${deployResult.stderr ?? ""}`;

      // Auto-heal when Prisma blocks deploy due to a migration recorded as failed.
      // In our case, the DB already contains the objects, but _prisma_migrations
      // has the migration in a failed state.
      const failedMigration = getFailedMigrationName(combinedOutput);
      if (failedMigration && AUTO_RESOLVE_APPLIED_MIGRATIONS.has(failedMigration)) {
        log(
          `Detected failed migration record '${failedMigration}'; resolving as applied, then retrying prisma migrate deploy.`,
        );
        try {
          runBin("prisma", ["migrate", "resolve", "--applied", failedMigration]);
          deployResult = deploy();
        } catch {
          // fall through to other auto-heal / failure handling
        }
      }

      // Auto-heal a common production blocker: tables exist but migration history is missing.
      // Symptom: migrate deploy fails with duplicate table on Conversation.
      if (isConversationAlreadyExistsError(combinedOutput)) {
        const migrationName = "20260206_add_messaging_system";
        log(
          `Detected existing Conversation table; resolving migration '${migrationName}' as applied, then retrying prisma migrate deploy.`,
        );

        try {
          runBin("prisma", ["migrate", "resolve", "--applied", migrationName]);
          deployResult = deploy();
        } catch (error) {
          // fall through to normal failure handling
          deployResult = deployResult ?? { status: 1, stdout: "", stderr: String(error?.message ?? error) };
        }
      }

      if (deployResult.status !== 0) {
        const retriedCombined = `${deployResult.stdout ?? ""}\n${deployResult.stderr ?? ""}`;
        if (!allowMigrateFailure) {
          const pretty = "prisma migrate deploy";
          throw new Error(`Command failed (${deployResult.status}): ${pretty}\n${retriedCombined}`);
        }

        log(
          `Warning: prisma migrate deploy failed but ALLOW_PRISMA_MIGRATE_FAILURE is set; continuing. (${retriedCombined.trim() || "no output"})`,
        );
      }
    }
  }
}

runBin("next", ["build"]);
