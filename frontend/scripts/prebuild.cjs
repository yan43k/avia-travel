/**
 * Writes .env.production.local before Vite build (Render static site).
 * Uses VITE_API_URL or API_RENDER_EXTERNAL_URL from Render blueprint.
 */
const fs = require("fs");
const path = require("path");

function resolveApiBase() {
  if (process.env.VITE_API_URL) {
    const v = process.env.VITE_API_URL.trim().replace(/\/$/, "");
    return v.endsWith("/api") ? v : `${v}/api`;
  }
  const external = process.env.API_RENDER_EXTERNAL_URL?.trim().replace(/\/$/, "");
  if (external) return `${external}/api`;
  return "/api";
}

const apiBase = resolveApiBase();
const out = path.join(__dirname, "..", ".env.production.local");
fs.writeFileSync(out, `VITE_API_URL=${apiBase}\n`, "utf8");
console.log("[prebuild] VITE_API_URL =", apiBase);
