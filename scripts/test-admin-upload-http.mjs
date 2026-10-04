import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import * as XLSX from "xlsx";

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
const email = `codex-upload-${randomUUID()}@example.invalid`;
const password = `${randomUUID()}Ab1!`;
const versions = [];
let actorId = null;
const examples = {
  rice_price: { observed_on: "2024-01-01", rice_type: "ข้าวหอมมะลิ", rice_type_code: "test-jasmine", price: 367 },
  flood: { year: 2024, month: 1, province_id: 1, flood_events: 2 },
  drought: { year: 2024, month: 1, province_id: 1, drought_events: 1 },
  storm: { occurred_on: "2024-01-01", province_id: 1, storm_type: "test-storm", storm_events: 1 },
};
function formats(row) {
  const headers = Object.keys(row);
  const values = Object.values(row);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, values]), "Data");
  return [
    ["test.json", new TextEncoder().encode(JSON.stringify([row]))],
    ["test.csv", new TextEncoder().encode(`${headers.join(",")}\n${values.join(",")}`)],
    ["test.xlsx", XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })],
    ["test.xls", XLSX.write(workbook, { type: "buffer", bookType: "biff8" })],
  ];
}
try {
  const created = await root.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role: "admin" } });
  if (created.error) throw created.error;
  actorId = created.data.user.id;
  const cookies = new Map();
  const actor = createServerClient(url, anon, {
    cookieOptions: { name: "rice-ai-admin-auth" },
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (items) => { for (const item of items) cookies.set(item.name, item.value); },
    },
  });
  const signed = await actor.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;
  const cookieHeader = [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
  assert.ok(cookieHeader);
  async function upload(type, id, action, name, bytes, token = "", revision = 0) {
    const form = new FormData();
    form.set("action", action); form.set("type", type); form.set("versionId", id);
    form.set("file", new File([bytes], name));
    if (token) { form.set("token", token); form.set("revision", String(revision)); }
    const response = await fetch("http://localhost:3001/api/admin/datasets/import", {
      method: "POST", headers: { cookie: cookieHeader }, body: form,
    });
    return { status: response.status, body: await response.json() };
  }
  async function changeVersion(body) {
    const response = await fetch("http://localhost:3001/api/admin/datasets", {
      method: "PATCH",
      headers: { cookie: cookieHeader, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }
  for (const [type, row] of Object.entries(examples)) {
    const createdVersion = await actor.rpc("agricultural_dataset_create_version", {
      p_dataset_type: type, p_key: `codex-http-${randomUUID().slice(0, 8)}`,
      p_label: "Temporary HTTP upload test", p_description: "Deleted after test",
      p_source_name: "Codex", p_source_url: null,
    });
    assert.ifError(createdVersion.error);
    const id = createdVersion.data.id;
    versions.push(id);
    const files = formats(row);
    for (const [name, bytes] of files) {
      const result = await upload(type, id, "preview", name, bytes);
      assert.equal(result.status, 200, `${type}/${name}: ${JSON.stringify(result.body.error)}`);
      assert.equal(result.body.data.valid, true, `${type}/${name}: ${JSON.stringify(result.body.data.errors)}`);
    }
    if (type === "flood") {
      const json = (rows) => new TextEncoder().encode(JSON.stringify(rows));
      const wrongColumn = await upload(type, id, "preview", "wrong.json", json([{ ...row, unexpected: 1 }]));
      assert.equal(wrongColumn.status, 400);
      assert.equal(wrongColumn.body.error.code, "INVALID_COLUMNS");
      const unknownProvince = await upload(type, id, "preview", "province.json", json([{ ...row, province_id: 999 }]));
      assert.equal(unknownProvince.body.data.valid, false);
      assert.match(unknownProvince.body.data.errors[0].message, /จังหวัด/);
      const duplicate = await upload(type, id, "preview", "duplicate.json", json([row, row]));
      assert.equal(duplicate.body.data.valid, false);
      assert.match(duplicate.body.data.errors[0].message, /ซ้ำ/);
      const missing = await upload(type, id, "preview", "missing.json", json([{ ...row, flood_events: "" }]));
      assert.equal(missing.body.data.valid, false);
      assert.match(missing.body.data.errors[0].message, /หายไป/);
      const tooLarge = await upload(type, id, "preview", "large.csv", new Uint8Array(10 * 1024 * 1024 + 1));
      assert.equal(tooLarge.status, 400);
      assert.equal(tooLarge.body.error.code, "FILE_SIZE");
    }
    const [name, bytes] = files[0];
    const preview = await upload(type, id, "preview", name, bytes);
    const commit = await upload(type, id, "commit", name, bytes, preview.body.data.token, preview.body.data.revision);
    assert.equal(commit.status, 200, `${type} commit: ${JSON.stringify(commit.body.error)}`);
    assert.equal(commit.body.data.importedRows, 1);
    if (type === "rice_price") {
      const edited = await changeVersion({
        type, id, action: "edit", revision: 1,
        label: "Temporary HTTP version lifecycle test",
        description: "Deleted after HTTP route test",
        sourceName: "Codex", sourceUrl: "",
      });
      assert.equal(edited.status, 200, JSON.stringify(edited.body.error));
      const published = await changeVersion({ type, id, action: "publish", revision: 2 });
      assert.equal(published.status, 200, JSON.stringify(published.body.error));
      const deleted = await changeVersion({ type, id, action: "delete", revision: 3 });
      assert.equal(deleted.status, 200, JSON.stringify(deleted.body.error));
      console.log(`${type}: import plus HTTP edit/publish/published-delete lifecycle passed`);
    } else {
      const changed = await actor.rpc("agricultural_dataset_change_version", { p_id: id, p_action: "publish", p_revision: 1 });
      assert.ifError(changed.error);
      console.log(`${type}: JSON/CSV/XLSX/XLS preview, commit, publish passed`);
    }
  }
  const yieldDraft = await root.from("rice_dashboard_versions").select("id").eq("status", "draft").limit(1).single();
  assert.ifError(yieldDraft.error);
  const yieldExample = { province_id: 1, crop_start_year: 2024, crop_year: "2567/68", actual_yield: 367 };
  for (const [name, bytes] of formats(yieldExample)) {
    const form = new FormData();
    form.set("action", "preview"); form.set("versionId", yieldDraft.data.id);
    form.set("datasetType", "yearly-yield"); form.set("file", new File([bytes], name));
    const response = await fetch("http://localhost:3001/api/admin/dashboard", { method: "POST", headers: { cookie: cookieHeader }, body: form });
    const body = await response.json();
    assert.equal(response.status, 200, `yield/${name}: ${JSON.stringify(body.error)}`);
    assert.equal(body.data.valid, true, `yield/${name}: ${JSON.stringify(body.data.errors)}`);
  }
  console.log("yield: JSON/CSV/XLSX/XLS preview passed (existing draft unchanged)");
} finally {
  for (const id of versions) {
    const events = await root.from("agricultural_dataset_events").delete().eq("version_id", id);
    if (events.error) console.error("Event cleanup failed", events.error.message);
    const version = await root.from("agricultural_dataset_versions").delete().eq("id", id);
    if (version.error) console.error("Version cleanup failed", version.error.message);
    const deletedAudit = await root.from("agricultural_dataset_deleted_versions").delete().eq("version_id", id);
    if (deletedAudit.error) console.error("Deleted-version audit cleanup failed", deletedAudit.error.message);
  }
  if (actorId) {
    const deleted = await root.auth.admin.deleteUser(actorId);
    if (deleted.error) console.error("Actor cleanup failed", deleted.error.message);
  }
}
