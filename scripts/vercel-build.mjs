import { spawnSync } from "node:child_process";

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

if (isVercel) {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "Missing DATABASE_URL on Vercel. Set it in Project Settings → Environment Variables.",
    );
  }
  if (!process.env.DIRECT_URL) {
    throw new Error(
      "Missing DIRECT_URL on Vercel. Prisma migrations need a non-pooled connection string (Neon unpooled).",
    );
  }

  run("prisma", ["migrate", "deploy"]);
}

run("next", ["build"]);
