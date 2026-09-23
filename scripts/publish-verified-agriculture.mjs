import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const verification = spawnSync(process.execPath, ["scripts/import-agricultural-static-data.mjs", "--verify"], { cwd: process.cwd(), stdio: "inherit" });
if (verification.status !== 0) process.exit(verification.status || 1);
const envFile = resolve(process.cwd(), ".env.local");
if (existsSync(envFile)) for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && anon && service);
const root = createClient(url, service, { auth: { persistSession: false } });
const publicClient = createClient(url, anon, { auth: { persistSession: false } });
const datasets = [
  ["rice_price", "static-rice-price-2026", "rice_price_series", 720],
  ["flood", "static-flood-2562-2567", "flood_records", 1270],
  ["drought", "static-drought-2562-2567", "drought_records", 206],
  ["storm", "static-storm-2562-2567", "storm_records", 3134],
];
const email = `codex-publish-${randomUUID()}@example.invalid`;
const password = `${randomUUID()}Ab1!`;
let actorId = null;
try {
  const user = await root.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role: "superadmin" } });
  if (user.error) throw user.error;
  actorId = user.data.user.id;
  const actor = createClient(url, anon, { auth: { persistSession: false } });
  const signed = await actor.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;
  for (const [type, key, table, expected] of datasets) {
    const fetched = await root.from("agricultural_dataset_versions").select("id,status,is_default,revision")
      .eq("dataset_type", type).eq("version_key", key).single();
    assert.ifError(fetched.error);
    const version = fetched.data;
    if (!version.is_default || version.status !== "published") {
      assert.equal(version.status, "draft", `${type} must be an existing verified draft`);
      const publish = await actor.rpc("agricultural_dataset_change_version", {
        p_id: version.id, p_action: "publish-default", p_revision: version.revision,
      });
      if (publish.error) throw publish.error;
    }
    const publicVersion = await publicClient.from("agricultural_dataset_versions")
      .select("id").eq("dataset_type", type).eq("status", "published").eq("is_default", true).single();
    assert.ifError(publicVersion.error);
    assert.equal(publicVersion.data.id, version.id);
    const publicRows = await publicClient.from(table).select("id", { count: "exact", head: true }).eq("version_id", version.id);
    assert.ifError(publicRows.error);
    assert.equal(publicRows.count, expected);
    console.log(`${type}: Published Default visible via anon Supabase (${publicRows.count} rows)`);
  }
} finally {
  if (actorId) {
    const deleted = await root.auth.admin.deleteUser(actorId);
    if (deleted.error) console.error("Temporary publisher cleanup failed", deleted.error.message);
  }
}
