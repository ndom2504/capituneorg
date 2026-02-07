#!/usr/bin/env node
/*
  Smoke test for maintenance-mode middleware behavior.

  Usage:
    npm run smoke:maintenance
    npm run smoke:maintenance -- --base-url http://localhost:3001
    npm run smoke:maintenance -- --cookie "capitune_session=..."

  Notes:
    - Assumes the dev/prod server is already running.
    - Cookie is optional; provide an admin session cookie to validate bypass.
*/

const DEFAULT_BASE_URL = "http://localhost:3001";

import { readFile } from "node:fs/promises";

function parseArgs(argv) {
  const args = {
    baseUrl: DEFAULT_BASE_URL,
    cookie: "",
    cookieFile: "",
    timeoutMs: 10_000,
    verbose: false,
  };

  const consumePositional = (value) => {
    const v = String(value ?? "").trim();
    if (!v) return;

    if (args.baseUrl === DEFAULT_BASE_URL && !v.startsWith("-") && v.startsWith("http")) {
      args.baseUrl = v;
      return;
    }

    if (!args.cookie && !v.startsWith("-") && v.includes("=") && v.startsWith("capitune_session=")) {
      args.cookie = v;
      return;
    }

    if (!args.cookieFile && !v.startsWith("-")) {
      args.cookieFile = v;
    }
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a && !String(a).startsWith("-")) {
      consumePositional(a);
      continue;
    }

    if (a === "--base-url") {
      args.baseUrl = String(argv[i + 1] ?? "");
      i++;
      continue;
    }

    if (a === "--cookie") {
      args.cookie = String(argv[i + 1] ?? "");
      i++;
      continue;
    }

    if (a === "--cookie-file") {
      args.cookieFile = String(argv[i + 1] ?? "");
      i++;
      continue;
    }

    if (a === "--timeout-ms") {
      const raw = String(argv[i + 1] ?? "");
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid --timeout-ms: ${raw}`);
      args.timeoutMs = Math.floor(n);
      i++;
      continue;
    }

    if (a === "--verbose") {
      args.verbose = true;
      continue;
    }
  }

  if (!args.baseUrl) throw new Error("Missing --base-url value");
  args.baseUrl = args.baseUrl.replace(/\/$/, "");

  if (!args.cookie && args.cookieFile) {
    // Lazy: load later in main so errors are reported as test failures.
  }

  return args;
}

function withTimeout(signal, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);

  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

async function http({ baseUrl, cookie, timeoutMs, verbose }, path, options = {}) {
  const url = new URL(path, baseUrl);

  const headers = new Headers(options.headers ?? {});
  if (cookie) headers.set("cookie", cookie);

  const t = withTimeout(options.signal, timeoutMs);
  try {
    const res = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      redirect: options.redirect ?? "manual",
      signal: t.signal,
    });

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");

    let bodyText = "";
    let bodyJson = null;

    if (isJson) {
      try {
        bodyJson = await res.json();
      } catch {
        bodyText = await res.text().catch(() => "");
      }
    } else {
      bodyText = await res.text().catch(() => "");
    }

    if (verbose) {
      const loc = res.headers.get("location");
      console.log(`[http] ${res.status} ${url.pathname}${url.search}${loc ? ` -> ${loc}` : ""}`);
    }

    return {
      status: res.status,
      headers: res.headers,
      json: bodyJson,
      text: bodyText,
    };
  } finally {
    t.clear();
  }
}

function expect(name, ok, details = "") {
  if (ok) return { name, ok: true };
  return { name, ok: false, details };
}

function summarize(results) {
  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    const tag = r.ok ? "OK" : "FAIL";
    console.log(`${tag} ${r.name}${r.ok ? "" : ` — ${r.details}`}`);
  }

  if (failed.length) {
    console.log(`\n${failed.length} check(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log("\nAll checks passed.");
  }
}

function isRedirect(status) {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function redirectLocation(headers) {
  return headers.get("location") ?? "";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const results = [];

  let maint;
  try {
    if (!args.cookie && args.cookieFile) {
      try {
        args.cookie = (await readFile(args.cookieFile, "utf8")).trim();
      } catch (e) {
        results.push(expect("Load --cookie-file", false, e?.message ? String(e.message) : String(e)));
        summarize(results);
        return;
      }
    }

    const res = await http(args, "/api/maintenance");
    results.push(expect("/api/maintenance returns 200", res.status === 200, `status=${res.status}`));

    maint = res.json;
    const enabled = Boolean(maint?.maintenance?.enabled);
    const allowBypass = Boolean(maint?.allowBypass);

    results.push(
      expect(
        "/api/maintenance returns shape",
        typeof maint === "object" && maint && typeof maint.maintenance === "object" && typeof maint.allowBypass === "boolean",
        `body=${JSON.stringify(maint)}`,
      ),
    );

    const adminRoute = await http(args, "/admin");
    if (isRedirect(adminRoute.status)) {
      const loc = redirectLocation(adminRoute.headers);
      results.push(
        expect(
          "/admin is not redirected to /maintenance",
          !loc.startsWith("/maintenance") && !loc.includes("/maintenance"),
          `location=${loc || "<empty>"}`,
        ),
      );
    } else {
      // If it's 200 or 401/403 etc, just ensure it's not being forced to maintenance.
      results.push(expect("/admin is not forced to 503", adminRoute.status !== 503, `status=${adminRoute.status}`));
    }

    const accueil = await http(args, "/accueil");
    const apiJobs = await http(args, "/api/jobs");
    const maintenancePage = await http(args, "/maintenance");

    results.push(expect("/maintenance is accessible", maintenancePage.status < 400, `status=${maintenancePage.status}`));

    if (enabled && !allowBypass) {
      if (isRedirect(accueil.status)) {
        const loc = redirectLocation(accueil.headers);
        results.push(
          expect("UI redirects to /maintenance", loc.startsWith("/maintenance"), `status=${accueil.status} location=${loc || "<empty>"}`),
        );
      } else {
        results.push(expect("UI redirects to /maintenance", false, `expected redirect, got status=${accueil.status}`));
      }

      results.push(expect("/api/jobs returns 503", apiJobs.status === 503, `status=${apiJobs.status}`));
    } else {
      // maintenance disabled OR bypassable
      if (isRedirect(accueil.status)) {
        const loc = redirectLocation(accueil.headers);
        results.push(
          expect(
            "UI is not redirected to /maintenance",
            !loc.startsWith("/maintenance"),
            `status=${accueil.status} location=${loc || "<empty>"}`,
          ),
        );
      } else {
        results.push(expect("UI loads without maintenance redirect", accueil.status < 400, `status=${accueil.status}`));
      }

      results.push(expect("/api/jobs is not 503", apiJobs.status !== 503, `status=${apiJobs.status}`));
    }
  } catch (e) {
    results.push(expect("script runtime", false, e?.message ? String(e.message) : String(e)));
  }

  summarize(results);
}

main();
