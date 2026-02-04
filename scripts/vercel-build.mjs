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
