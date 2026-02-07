#!/usr/bin/env node

import process from "node:process";

function isTruthyEnv(name) {
  const v = String(process.env[name] ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function parseArgs(argv) {
  const args = { email: "", adminRole: "ADMIN", accountStatus: "ACTIVE" };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    // Allow positional email: node scripts/make-admin.mjs user@example.com
    if (!a.startsWith("-") && !args.email && String(a).includes("@")) {
      args.email = String(a);
      continue;
    }

    if (a === "--email") {
      args.email = String(argv[i + 1] ?? "");
      i++;
      continue;
    }

    if (a === "--role") {
      args.adminRole = String(argv[i + 1] ?? "");
      i++;
      continue;
    }

    if (a === "--status") {
      args.accountStatus = String(argv[i + 1] ?? "");
      i++;
      continue;
    }
  }

  args.email = args.email.trim().toLowerCase();
  if (!args.email || !args.email.includes("@")) {
    throw new Error("Usage: node scripts/make-admin.mjs --email user@example.com [--role ADMIN|MODERATOR] [--status ACTIVE]");
  }

  if (args.adminRole !== "ADMIN" && args.adminRole !== "MODERATOR") {
    throw new Error("--role must be ADMIN or MODERATOR");
  }

  if (args.accountStatus !== "ACTIVE") {
    throw new Error("Only --status ACTIVE is supported by this script");
  }

  return args;
}

async function loadEnv(projectRoot) {
  try {
    const { loadEnvConfig } = await import("@next/env");
    loadEnvConfig(projectRoot, true);
  } catch {
    // ignore
  }
}

async function main() {
  const { email, adminRole, accountStatus } = parseArgs(process.argv.slice(2));

  const projectRoot = process.cwd();
  await loadEnv(projectRoot);

  const { PrismaClient } = await import("@prisma/client");
  let prisma;
  if (!isTruthyEnv("USE_NEON_ADAPTER")) {
    prisma = new PrismaClient();
  } else {
    const { PrismaNeon } = await import("@prisma/adapter-neon");
    const { neonConfig } = await import("@neondatabase/serverless");
    const wsMod = await import("ws");

    neonConfig.webSocketConstructor = wsMod.default ?? wsMod;

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required when USE_NEON_ADAPTER is enabled");
    }

    const adapter = new PrismaNeon({ connectionString });
    prisma = new PrismaClient({ adapter });
  }

  try {
    try {
      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, accountType: true, adminRole: true, accountStatus: true },
      });

      if (!existing) {
        console.error(`User not found for email: ${email}`);
        process.exitCode = 1;
        return;
      }

      const updated = await prisma.user.update({
        where: { email },
        data: {
          accountType: "ADMIN",
          adminRole,
          accountStatus,
        },
        select: { id: true, email: true, accountType: true, adminRole: true, accountStatus: true },
      });

      console.log("Updated user:");
      console.log(JSON.stringify({ before: existing, after: updated }, null, 2));
      return;
    } catch (e) {
      const msg = e?.message ? String(e.message) : String(e);

      // If Prisma can't connect (common with pool limits), fallback to Neon HTTP SQL.
      if (!msg.toLowerCase().includes("connection pool")) throw e;

      const { neon } = await import("@neondatabase/serverless");
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) throw e;

      const sql = neon(connectionString);
      const rows = await sql`
        UPDATE "User"
        SET
          "accountType" = 'ADMIN'::"AccountType",
          "adminRole" = ${adminRole}::"AdminRole",
          "accountStatus" = ${accountStatus}::"AccountStatus"
        WHERE "email" = ${email}
        RETURNING "id", "email", "accountType", "adminRole", "accountStatus";
      `;

      if (!rows?.length) {
        console.error(`User not found for email: ${email}`);
        process.exitCode = 1;
        return;
      }

      console.log("Updated user (via Neon SQL fallback):");
      console.log(JSON.stringify(rows[0], null, 2));
      return;
    }
  } catch (e) {
    const msg = e?.message ? String(e.message) : String(e);
    console.error(msg);
    if (msg.includes("Environment variable not found") && msg.includes("DATABASE_URL")) {
      console.error("DATABASE_URL n'est pas défini pour ce process. Lance le script depuis capitune-web avec .env(.local) configuré.");
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
