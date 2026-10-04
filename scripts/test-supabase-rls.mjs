import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const envFile = resolve(process.cwd(), ".env.local");
if (existsSync(envFile)) for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && anon && service, "Supabase env is required");
const root = createClient(url, service, { auth: { persistSession: false } });
const created = [];
let testVersionId = null;
let deletedVersionId = null;
const suffix = randomUUID().slice(0, 8);
const prior = await root.auth.admin.listUsers({ page: 1, perPage: 100 });
if (prior.error) throw prior.error;
for (const user of prior.data.users.filter((item) => item.email?.startsWith("codex-rls-") && item.email.endsWith("@example.invalid"))) {
  const removed = await root.auth.admin.deleteUser(user.id);
  if (removed.error) throw removed.error;
}
async function account(role) {
  const email = `codex-rls-${role}-${created.length}-${suffix}@example.invalid`;
  const password = `${randomUUID()}Ab1!`;
  const { data, error } = await root.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role } });
  if (error) throw error;
  created.push(data.user.id);
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const signed = await client.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;
  return { client, id: data.user.id };
}

try {
  const userA = await account("user");
  const userB = await account("user");
  const admin = await account("admin");
  const superadmin = await account("superadmin");
  const promotedAdmin = await account("admin");
  for (const [name, actor, expected] of [["user", userA, false], ["admin", admin, true], ["superadmin", superadmin, true]]) {
    const result = await actor.client.rpc("is_admin");
    assert.ifError(result.error);
    assert.equal(result.data, expected, `${name} admin role`);
  }
  const superRole = await superadmin.client.rpc("is_superadmin");
  assert.ifError(superRole.error);
  assert.equal(superRole.data, true);
  const adminSuperRole = await admin.client.rpc("is_superadmin");
  assert.equal(adminSuperRole.data, false);

  const promotedBeforeRefresh = await promotedAdmin.client.rpc("is_superadmin");
  assert.ifError(promotedBeforeRefresh.error);
  assert.equal(promotedBeforeRefresh.data, false);
  const promotedUser = await root.auth.admin.updateUserById(promotedAdmin.id, {
    app_metadata: { role: "superadmin" },
  });
  assert.ifError(promotedUser.error);
  const authoritativePromotedUser = await promotedAdmin.client.auth.getUser();
  assert.ifError(authoritativePromotedUser.error);
  assert.equal(authoritativePromotedUser.data.user.app_metadata.role, "superadmin");
  const staleTokenRole = await promotedAdmin.client.rpc("is_superadmin");
  assert.ifError(staleTokenRole.error);
  assert.equal(staleTokenRole.data, false, "database still sees the old JWT role before refresh");
  const refreshedRoleSession = await promotedAdmin.client.auth.refreshSession();
  assert.ifError(refreshedRoleSession.error);
  assert.equal(refreshedRoleSession.data.user.app_metadata.role, "superadmin");
  const promotedAfterRefresh = await promotedAdmin.client.rpc("is_superadmin");
  assert.ifError(promotedAfterRefresh.error);
  assert.equal(promotedAfterRefresh.data, true, "database sees the promoted role after refresh");

  const currentDefault = await root.from("agricultural_dataset_versions")
    .select("id,revision").eq("dataset_type", "flood").eq("is_default", true).single();
  assert.ifError(currentDefault.error);
  const adminDefaultDelete = await admin.client.rpc("agricultural_dataset_delete_version_v2", {
    p_id: currentDefault.data.id, p_revision: currentDefault.data.revision, p_replacement_id: null,
  });
  assert.equal(adminDefaultDelete.error?.message, "SUPERADMIN_REQUIRED");
  const missingDefaultReplacement = await superadmin.client.rpc("agricultural_dataset_delete_version_v2", {
    p_id: currentDefault.data.id, p_revision: currentDefault.data.revision, p_replacement_id: null,
  });
  assert.equal(missingDefaultReplacement.error?.message, "REPLACEMENT_REQUIRED");

  const ownField = await userA.client.from("rice_farm_fields").insert({ user_id: userA.id, name: "Codex field", province: "กรุงเทพมหานคร", area_rai: 1, rice_variety: "ข้าวหอมมะลิ" }).select("id").single();
  assert.ifError(ownField.error);
  const ownVisible = await userA.client.from("rice_farm_fields").select("id").eq("id", ownField.data.id);
  assert.equal(ownVisible.data.length, 1);
  const hiddenField = await userB.client.from("rice_farm_fields").select("id").eq("id", ownField.data.id);
  assert.equal(hiddenField.data.length, 0);
  const forgedField = await userB.client.from("rice_farm_fields").insert({ user_id: userA.id, name: "Forged field", province: "กรุงเทพมหานคร", area_rai: 1, rice_variety: "ข้าวหอมมะลิ" });
  assert.ok(forgedField.error, "cross-user field insert must fail");

  const ownEvent = await userA.client.from("user_behavior_events").insert({ user_id: userA.id, event_type: "view", feature: "weather", path: "/weather" }).select("id").single();
  assert.ifError(ownEvent.error);
  const hiddenEvent = await userB.client.from("user_behavior_events").select("id").eq("id", ownEvent.data.id);
  assert.equal(hiddenEvent.data.length, 0);
  const forgedEvent = await userB.client.from("user_behavior_events").insert({ user_id: userA.id, event_type: "chat", feature: "chat" });
  assert.ok(forgedEvent.error, "cross-user event insert must fail");

  const userCreate = await userA.client.rpc("agricultural_dataset_create_version", { p_dataset_type: "flood", p_key: `test-${suffix}`, p_label: "test", p_description: "", p_source_name: "", p_source_url: null });
  assert.ok(userCreate.error, "user cannot create admin version");
  const createdVersion = await admin.client.rpc("agricultural_dataset_create_version", {
    p_dataset_type: "flood", p_key: `codex-test-${suffix}`, p_label: "Temporary import test",
    p_description: "Deleted after test", p_source_name: "Codex test", p_source_url: null,
  });
  assert.ifError(createdVersion.error);
  testVersionId = createdVersion.data.id;
  const userDraft = await userA.client.from("agricultural_dataset_versions").select("id").eq("id", testVersionId);
  assert.equal(userDraft.data.length, 0);
  const adminDraft = await admin.client.from("agricultural_dataset_versions").select("id").eq("id", testVersionId);
  assert.equal(adminDraft.data.length, 1);
  const adminDefault = await admin.client.rpc("agricultural_dataset_change_version", { p_id: testVersionId, p_action: "publish-default", p_revision: 0 });
  assert.equal(adminDefault.error?.message, "SUPERADMIN_REQUIRED");
  const superGuard = await superadmin.client.rpc("agricultural_dataset_change_version", { p_id: "00000000-0000-0000-0000-000000000000", p_action: "default", p_revision: 0 });
  assert.equal(superGuard.error?.message, "VERSION_NOT_FOUND");
  const row = { year: 2024, month: 1, province_id: 1, flood_events: 2, source: "Codex test",
    affected_area_rai: null, affected_households: null, affected_people: null, agricultural_damage_rai: null };
  const blockedImport = await userA.client.rpc("agricultural_dataset_import", {
    p_id: testVersionId, p_dataset_type: "flood", p_revision: 0, p_rows: [row],
    p_file_name: "test.json", p_file_type: "json", p_validation_summary: {},
  });
  assert.equal(blockedImport.error?.message, "ADMIN_REQUIRED");
  const imported = await admin.client.rpc("agricultural_dataset_import", {
    p_id: testVersionId, p_dataset_type: "flood", p_revision: 0, p_rows: [row],
    p_file_name: "test.json", p_file_type: "json", p_validation_summary: { rowCount: 1 },
  });
  assert.ifError(imported.error);
  assert.equal(imported.data.importedRows, 1);
  const hiddenDraftRow = await userA.client.from("flood_records").select("id").eq("version_id", testVersionId);
  assert.equal(hiddenDraftRow.data.length, 0);
  const visibleAdminRow = await admin.client.from("flood_records").select("id").eq("version_id", testVersionId);
  assert.equal(visibleAdminRow.data.length, 1);
  const staleImport = await admin.client.rpc("agricultural_dataset_import", {
    p_id: testVersionId, p_dataset_type: "flood", p_revision: 0, p_rows: [row],
    p_file_name: "test.json", p_file_type: "json", p_validation_summary: {},
  });
  assert.equal(staleImport.error?.message, "VERSION_CHANGED");
  const afterStale = await admin.client.from("flood_records").select("id").eq("version_id", testVersionId);
  assert.equal(afterStale.data.length, 1);
  const edited = await admin.client.rpc("agricultural_dataset_change_version", {
    p_id: testVersionId, p_action: "edit", p_revision: 1,
    p_label: "Temporary version lifecycle test", p_description: "Edited metadata",
    p_source_name: "Codex test", p_source_url: null,
  });
  assert.ifError(edited.error);
  assert.equal(edited.data.label, "Temporary version lifecycle test");
  const published = await admin.client.rpc("agricultural_dataset_change_version", {
    p_id: testVersionId, p_action: "publish", p_revision: 2,
  });
  assert.ifError(published.error);
  const unpublished = await admin.client.rpc("agricultural_dataset_change_version", {
    p_id: testVersionId, p_action: "unpublish", p_revision: 3,
  });
  assert.ifError(unpublished.error);
  const republished = await admin.client.rpc("agricultural_dataset_change_version", {
    p_id: testVersionId, p_action: "publish", p_revision: 4,
  });
  assert.ifError(republished.error);
  const blockedDelete = await userA.client.rpc("agricultural_dataset_delete_version_v2", {
    p_id: testVersionId, p_revision: 5, p_replacement_id: null,
  });
  assert.equal(blockedDelete.error?.message, "ADMIN_REQUIRED");
  const deleted = await admin.client.rpc("agricultural_dataset_delete_version_v2", {
    p_id: testVersionId, p_revision: 5, p_replacement_id: null,
  });
  assert.ifError(deleted.error);
  deletedVersionId = testVersionId;
  testVersionId = null;
  const tombstone = await root.from("agricultural_dataset_deleted_versions")
    .select("version_id,record_count").eq("version_id", deletedVersionId).single();
  assert.ifError(tombstone.error);
  assert.equal(tombstone.data.record_count, 1);
  console.log("Live Supabase RLS/version lifecycle passed: isolation, role guards, role refresh, default-delete guards, import, edit, publish, unpublish, republish, published delete, audited delete");
} finally {
  if (testVersionId) {
    const events = await root.from("agricultural_dataset_events").delete().eq("version_id", testVersionId);
    if (events.error) console.error("Temporary event cleanup failed", events.error.message);
    const version = await root.from("agricultural_dataset_versions").delete().eq("id", testVersionId);
    if (version.error) console.error("Temporary version cleanup failed", version.error.message);
  }
  if (deletedVersionId) {
    const deletedAudit = await root.from("agricultural_dataset_deleted_versions").delete().eq("version_id", deletedVersionId);
    if (deletedAudit.error) console.error("Temporary deletion audit cleanup failed", deletedAudit.error.message);
  }
  for (const id of created) {
    const deleted = await root.auth.admin.deleteUser(id);
    if (deleted.error) console.error("Temporary auth cleanup failed", deleted.error.message);
  }
}
