#!/usr/bin/env node
/*
  Smoke test for feature-flags enforcement (Marketplace).

  What it does:
    - Reads current /api/admin/settings
    - Temporarily sets featureFlags.marketplace=false
    - Verifies:
        - /marketplace redirects to /accueil
        - /api/marketplace/professionals returns 404
    - Restores original settings

  Usage:
    npm run smoke:featureflags -- --cookie "capitune_session=..."
    npm run smoke:featureflags -- --cookie-file ./.secrets/admin.cookie
    npm run smoke:featureflags -- --login-email admin@exemple.com --login-password "..."
    npm run smoke:featureflags -- --base-url http://localhost:3001 --cookie-file ./.secrets/admin.cookie

  Notes:
    - Assumes the server is already running.
    - Requires an admin session cookie (POST /api/admin/settings).
*/

import { readFile } from "node:fs/promises";

const DEFAULT_BASE_URL = "http://localhost:3001";

function parseArgs(argv) {
  const args = {
    baseUrl: DEFAULT_BASE_URL,
    cookie: "",
    cookieFile: "",
    loginEmail: "",
    loginPassword: "",
    timeoutMs: 10_000,
    verbose: false,
  };

  const consumePositional = (value) => {
    const v = String(value ?? "").trim();
    if (!v) return;

    // Fallback for weird npm/Windows forwarding: treat first positional as baseUrl.
    if (args.baseUrl === DEFAULT_BASE_URL && !v.startsWith("-") && v.startsWith("http")) {
      args.baseUrl = v;
      return;
    }

    // If it looks like a full cookie pair, accept it.
    if (!args.cookie && !v.startsWith("-") && v.includes("=") && v.startsWith("capitune_session=")) {
      args.cookie = v;
      return;
    }

    // Otherwise assume it's a cookie file path.
    if (!args.cookieFile && !v.startsWith("-")) {
      args.cookieFile = v;
    }
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    // Positional fallback: npm on Windows sometimes drops the flag names and only passes values.
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

    if (a === "--login-email") {
      args.loginEmail = String(argv[i + 1] ?? "");
      i++;
      continue;
    }

    if (a === "--login-password") {
      args.loginPassword = String(argv[i + 1] ?? "");
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

async function http(args, path, options = {}) {
  const url = new URL(path, args.baseUrl);

  const headers = new Headers(options.headers ?? {});
  if (args.cookie) headers.set("cookie", args.cookie);

  const t = withTimeout(options.signal, args.timeoutMs);
  try {
    const res = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      redirect: options.redirect ?? "manual",
      body: options.body,
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

    if (args.verbose) {
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

function extractCookiePair(setCookieHeader) {
  const raw = String(setCookieHeader ?? "");
  if (!raw) return "";

  // Expect something like: capitune_session=...; Path=/; HttpOnly; SameSite=Lax
  const m = raw.match(/(?:^|,\s*)capitune_session=([^;]+)/);
  if (!m) return "";
  return `capitune_session=${m[1]}`;
}

async function loadCookie(args) {
  if (args.cookie) return args.cookie.trim();

  if (args.cookieFile) {
    const contents = await readFile(args.cookieFile, "utf8");
    const value = contents.trim();
    if (!value) throw new Error(`Cookie file is empty: ${args.cookieFile}`);
    return value;
  }

  const email = (args.loginEmail || process.env.CAPITUNE_SMOKE_EMAIL || "").trim();
  const password = args.loginPassword || process.env.CAPITUNE_SMOKE_PASSWORD || "";
  if (!email || !password) return "";

  const res = await http(
    { ...args, cookie: "" },
    "/api/auth/login",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
      redirect: "manual",
    },
  );

  if (res.status !== 200) {
    throw new Error(`Login failed (status=${res.status})`);
  }

  const setCookie = res.headers.get("set-cookie") ?? "";
  const cookiePair = extractCookiePair(setCookie);
  if (!cookiePair) {
    throw new Error("Login succeeded but Set-Cookie capitune_session not found.");
  }
  return cookiePair;
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
  try {
    args.cookie = await loadCookie(args);
  } catch (e) {
    results.push(
      expect(
        "Auth cookie available",
        false,
        e?.message ? String(e.message) : String(e),
      ),
    );
    summarize(results);
    return;
  }

  if (!args.cookie) {
    results.push(
      expect(
        "Auth cookie available",
        false,
        "Fournis --cookie / --cookie-file OU --login-email/--login-password (ou env CAPITUNE_SMOKE_EMAIL / CAPITUNE_SMOKE_PASSWORD)",
      ),
    );
    summarize(results);
    return;
  }

  let original = null;

  try {
    const getSettings = await http(args, "/api/admin/settings", { redirect: "manual" });
    results.push(expect("GET /api/admin/settings returns 200", getSettings.status === 200, `status=${getSettings.status}`));
    if (getSettings.status !== 200) {
      summarize(results);
      return;
    }

    original = getSettings.json;
    const prevFlags = original?.featureFlags;
    results.push(
      expect(
        "settings payload contains featureFlags",
        typeof prevFlags === "object" && prevFlags && typeof prevFlags.marketplace === "boolean",
        `body=${JSON.stringify(original)}`,
      ),
    );

    // Disable marketplace
    const disable = await http(args, "/api/admin/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ featureFlags: { marketplace: false } }),
    });
    results.push(expect("POST disable marketplace returns 200", disable.status === 200, `status=${disable.status}`));

    // UI redirect
    const marketplacePage = await http(args, "/marketplace", { redirect: "manual" });
    if (isRedirect(marketplacePage.status)) {
      const loc = redirectLocation(marketplacePage.headers);
      results.push(expect("/marketplace redirects to /accueil", loc.startsWith("/accueil"), `status=${marketplacePage.status} location=${loc || "<empty>"}`));
    } else {
      results.push(expect("/marketplace redirects to /accueil", false, `expected redirect, got status=${marketplacePage.status}`));
    }

    // API hidden
    const api = await http(args, "/api/marketplace/professionals", { redirect: "manual" });
    results.push(expect("/api/marketplace/professionals returns 404", api.status === 404, `status=${api.status}`));
  } catch (e) {
    results.push(expect("script runtime", false, e?.message ? String(e.message) : String(e)));
  } finally {
    // Restore original settings (best-effort)
    if (original?.maintenance || original?.featureFlags) {
      try {
        await http(args, "/api/admin/settings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            maintenance: original.maintenance,
            featureFlags: original.featureFlags,
          }),
        });
      } catch {
        // ignore restore failure; test output will reflect the main assertions
      }
    }
  }

  summarize(results);
}

main();
