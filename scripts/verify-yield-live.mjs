import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const envFile = resolve(process.cwd(), ".env.local");
if (existsSync(envFile)) for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && key);
const client = createClient(url, key, { auth: { persistSession: false } });
const version = await client.from("rice_dashboard_versions").select("id,version_key,status,is_default").eq("is_default", true).single();
assert.ifError(version.error);
assert.equal(version.data.status, "published");
const provinces = await client.from("rice_provinces").select("id", { count: "exact", head: true });
assert.ifError(provinces.error);
assert.equal(provinces.count, 77);
const tables = [
  ["rice_yield_yearly", 1078],
  ["rice_environment_monthly", 13860],
  ["rice_yield_predictions", 154],
];
for (const [table, expected] of tables) {
  const result = await client.from(table).select("id", { count: "exact", head: true }).eq("dashboard_version_id", version.data.id);
  assert.ifError(result.error);
  assert.equal(result.count, expected, table);
}
const years = new Map();
for (let start = 0; start < 1078; start += 1000) {
  const result = await client.from("rice_yield_yearly").select("province_id,crop_start_year")
    .eq("dashboard_version_id", version.data.id).order("id").range(start, start + 999);
  assert.ifError(result.error);
  for (const row of result.data) {
    if (!years.has(row.crop_start_year)) years.set(row.crop_start_year, new Set());
    years.get(row.crop_start_year).add(row.province_id);
  }
}
for (let year = 2011; year <= 2024; year += 1) assert.equal(years.get(year)?.size, 77, `year ${year}`);
assert.equal(years.size, 14);
console.log(`Live rice yield verified: ${version.data.version_key}, 77 provinces × 2011–2024 = 1,078 yearly; 13,860 environment; 154 predictions`);
