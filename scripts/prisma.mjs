import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function findProjectRoot() {
  const cwd = process.cwd();
  const here = path.resolve(cwd);

  if (fs.existsSync(path.join(here, "package.json"))) return here;

  // If launched from scripts/ or another subfolder
  const parent = path.resolve(here, "..");
  if (fs.existsSync(path.join(parent, "package.json"))) return parent;

  return here;
}

const projectRoot = findProjectRoot();

// Load env the same way Next.js does (.env.local, .env, etc.)
try {
  const { loadEnvConfig } = await import("@next/env");
  loadEnvConfig(projectRoot, true);
} catch {
  // If @next/env isn't available for some reason, proceed with current process.env
}

const prismaCli = path.join(projectRoot, "node_modules", "prisma", "build", "index.js");

const args = process.argv.slice(2);
const result = spawnSync(process.execPath, [prismaCli, ...args], {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 0);
