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

function isP3005Error(output) {
  const text = String(output ?? "");
  return text.includes("P3005") || text.includes("database schema is not empty");
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
  
  // Format 1: "The `...` migration started ... failed"
  const m1 = text.match(/The `([^`]+)` migration started[\s\S]*?failed/);
  if (m1?.[1]) return m1[1];

  // Format 2: "Migration name: ..." (common in Vercel logs)
  const m2 = text.match(/Migration name: (\S+)/);
  if (m2?.[1]) return m2[1];

  return null;
}

function getApplyingMigrationName(output) {
  const text = String(output ?? "");

  // Common prisma migrate deploy outputs
  // - Applying migration `20260206223000_admin_v1`
  // - Migration `20260206223000_admin_v1` failed
  const m1 = text.match(/Applying migration `([^`]+)`/);
  if (m1?.[1]) return m1[1];

  const m2 = text.match(/Migration `([^`]+)` failed/);
  if (m2?.[1]) return m2[1];

  return null;
}

function isAlreadyExistsLikeError(output) {
  const text = String(output ?? "");
  return (
    text.includes("already exists") ||
    text.includes("duplicate_object") ||
    text.includes("42710") ||
    (text.includes("E42P07") && text.includes("already exists"))
  );
}

const AUTO_RESOLVE_APPLIED_MIGRATIONS = new Set([
  "20260205172558_notification_capitune",
  "20260205231708_add_job_postings",
  "20260206_add_messaging_system",
  "20260206015353_add_presence_and_verification",
  "20260206193000_add_user_settings",
  "20260206223000_admin_v1",
  "20260207005000_platform_settings_v1",
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
      let combinedOutput = `${deployResult.stdout ?? ""}\n${deployResult.stderr ?? ""}`;

      // 1. Auto-heal P3005: The database schema is not empty (baseline needed)
      if (isP3005Error(combinedOutput)) {
        const firstMigration = "0001_init";
        log(
          `Detected P3005 (non-empty schema); attempting to baseline with '${firstMigration}' then retrying.`,
        );
        try {
          runBin("prisma", ["migrate", "resolve", "--applied", firstMigration]);
          deployResult = deploy();
          combinedOutput = `${deployResult.stdout ?? ""}\n${deployResult.stderr ?? ""}`;
        } catch {
          // fall through
        }
      }

      // 2. Auto-heal when Prisma blocks deploy due to a migration recorded as failed.
      const failedMigration = getFailedMigrationName(combinedOutput);
      if (deployResult.status !== 0 && failedMigration && AUTO_RESOLVE_APPLIED_MIGRATIONS.has(failedMigration)) {
        log(
          `Detected failed migration record '${failedMigration}'; resolving (rolled-back then applied if needed), then retrying prisma migrate deploy.`,
        );
        try {
          try {
            runBin("prisma", ["migrate", "resolve", "--rolled-back", failedMigration]);
          } catch {
            // ignore
          }
          deployResult = deploy();
          combinedOutput = `${deployResult.stdout ?? ""}\n${deployResult.stderr ?? ""}`;

          if (deployResult.status !== 0 && (isAlreadyExistsLikeError(combinedOutput) || getApplyingMigrationName(combinedOutput) === failedMigration)) {
            runBin("prisma", ["migrate", "resolve", "--applied", failedMigration]);
            deployResult = deploy();
            combinedOutput = `${deployResult.stdout ?? ""}\n${deployResult.stderr ?? ""}`;
          }
        } catch {
          // ignore
        }
      }

      // 3. Auto-heal a common production blocker: tables exist but migration history is missing.
      if (deployResult.status !== 0 && isConversationAlreadyExistsError(combinedOutput)) {
        const migrationName = "20260206_add_messaging_system";
        log(
          `Detected existing Conversation table; resolving migration '${migrationName}' as applied, then retrying prisma migrate deploy.`,
        );
        try {
          runBin("prisma", ["migrate", "resolve", "--applied", migrationName]);
          deployResult = deploy();
          combinedOutput = `${deployResult.stdout ?? ""}\n${deployResult.stderr ?? ""}`;
        } catch {
          // ignore
        }
      }

      // 4. Auto-heal when a migration fails with "already exists" (manual SQL applied)
      const applying = getApplyingMigrationName(combinedOutput);
      if (deployResult.status !== 0 && applying && AUTO_RESOLVE_APPLIED_MIGRATIONS.has(applying) && isAlreadyExistsLikeError(combinedOutput)) {
        log(
          `Detected '${applying}' failing with an 'already exists' error; resolving as applied, then retrying prisma migrate deploy.`,
        );
        try {
          runBin("prisma", ["migrate", "resolve", "--applied", applying]);
          deployResult = deploy();
          combinedOutput = `${deployResult.stdout ?? ""}\n${deployResult.stderr ?? ""}`;
        } catch {
          // ignore
        }
      }

      if (deployResult.status !== 0) {
        if (!allowMigrateFailure) {
          throw new Error(`Command failed (${deployResult.status}): prisma migrate deploy\n${combinedOutput}`);
        }
        log(
          `Warning: prisma migrate deploy failed but ALLOW_PRISMA_MIGRATE_FAILURE is set; continuing.`,
        );
      }
    }
  }
}

log("Running prisma generate.");
runBin("prisma", ["generate"]);

runBin("next", ["build"]);
