import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

function resolvePort(argv) {
  // Accept patterns like:
  // - node script.mjs 3000
  // - node script.mjs --port 3001
  // - node script.mjs -p 3001
  // - npm run dev -- -p 3001 (extra args appended)
  const args = argv.slice(2);

  const portFlagIndex = args.findIndex((v) => v === "-p" || v === "--port");
  if (portFlagIndex >= 0) {
    const candidate = args[portFlagIndex + 1];
    const parsed = Number.parseInt(String(candidate ?? ""), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const numericCandidates = args
    .map((v) => Number.parseInt(String(v ?? ""), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (numericCandidates.length) return numericCandidates[numericCandidates.length - 1];

  const envCandidate = Number.parseInt(String(process.env.PORT ?? ""), 10);
  if (Number.isFinite(envCandidate) && envCandidate > 0) return envCandidate;

  return null;
}

const port = resolvePort(process.argv);

if (!Number.isFinite(port) || port <= 0) {
  console.error("Usage: npm run dev:port -- 3001");
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const inferredProjectRoot = path.resolve(scriptDir, "..");
const cwdProjectRoot = process.cwd();

const projectRoot = fs.existsSync(path.join(cwdProjectRoot, "package.json"))
  ? cwdProjectRoot
  : inferredProjectRoot;

const packageJsonPath = path.join(projectRoot, "package.json");
if (!fs.existsSync(packageJsonPath)) {
  console.error(
    "dev:port must be run from the Next.js project root (capitune-web).\n" +
      "Example: npm --prefix \"C:\\capitunecanada\\capitune-web\" run dev:port -- 3001",
  );
  process.exit(1);
}

const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

// Self-heal common Windows dev issues: stale lock or partial .next output
try {
  const lockPath = path.join(projectRoot, ".next", "dev", "lock");
  if (fs.existsSync(lockPath)) {
    fs.rmSync(lockPath, { force: true });
  }

  const expectedDocumentJs = path.join(
    projectRoot,
    ".next",
    "dev",
    "server",
    "pages",
    "_document.js",
  );
  const nextDir = path.join(projectRoot, ".next");
  const pagesDir = path.join(projectRoot, ".next", "dev", "server", "pages");
  if (fs.existsSync(nextDir) && fs.existsSync(pagesDir) && !fs.existsSync(expectedDocumentJs)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
  }
} catch (error) {
  console.warn("dev:port preflight warning:", error);
}

const child = spawn(process.execPath, [nextBin, "dev", "-p", String(port)], {
  cwd: projectRoot,
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
