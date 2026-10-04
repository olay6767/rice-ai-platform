import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");
const VERIFY = process.argv.includes("--verify");
const CHUNK_SIZE = 500;
const VERSION_SPECS = {
  rice_price: {
    key: "static-rice-price-2026",
    label: "ข้อมูลราคาข้าวเดิมถึง พ.ศ. 2569",
    sourceName: "สมาคมโรงสีข้าวไทย",
  },
  flood: {
    key: "static-flood-2562-2567",
    label: "ข้อมูลน้ำท่วมเดิม พ.ศ. 2562–2567",
    sourceName: "ชุดข้อมูล Dashboard เดิม",
  },
  drought: {
    key: "static-drought-2562-2567",
    label: "ข้อมูลภัยแล้งเดิม พ.ศ. 2562–2567",
    sourceName: "ชุดข้อมูล Dashboard เดิม",
  },
  storm: {
    key: "static-storm-2562-2567",
    label: "ข้อมูลพายุเดิม พ.ศ. 2562–2567",
    sourceName: "ชุดข้อมูล Dashboard เดิม",
  },
};

function loadLocalEnv() {
  const envPath = resolve(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseCsv(text) {
  const records = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some(Boolean)) records.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted field");
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    if (row.some(Boolean)) records.push(row);
  }
  const [headers, ...values] = records;
  if (!headers?.length) throw new Error("CSV is empty");
  if (new Set(headers).size !== headers.length) throw new Error("CSV contains duplicate headers");
  return values.map((cells, rowIndex) => {
    if (cells.length !== headers.length) throw new Error(`CSV row ${rowIndex + 2} has an invalid column count`);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
  });
}

function readCsv(path) {
  return parseCsv(readFileSync(resolve(ROOT, path), "utf8").replace(/^\uFEFF/, ""));
}

function requiredNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a number`);
  return parsed;
}

function requiredInteger(value, label) {
  const parsed = requiredNumber(value, label);
  if (!Number.isInteger(parsed)) throw new Error(`${label} must be an integer`);
  return parsed;
}

function normalizeProvince(value) {
  return String(value ?? "").trim().replace(/\s+/g, "");
}

const RICE_TYPE_CODES = new Map([
  ["ข้าวขาว", "white-rice"],
  ["ข้าวนึ่ง", "parboiled-rice"],
  ["ข้าวหอมปทุมธานี", "pathum-thani-fragrant-rice"],
  ["ข้าวหอมมะลิ", "jasmine-rice"],
  ["ข้าวเหนียว", "glutinous-rice"],
]);

function priceRows() {
  const monthlyPath = "public/data/rice-price/rice_price_monthly.csv";
  const forecastPath = "public/data/rice-price/rice_forecast_2569.csv";
  const monthly = readCsv(monthlyPath);
  const forecast = readCsv(forecastPath).map((row) => ({
    ...row,
    price: row.forecast_price,
    data_type: "forecast",
    is_imputed: "False",
    impute_method: "",
    scope_level: "national",
    region: "",
    province: "",
    source: "สมาคมโรงสีข้าวไทย",
  }));
  const deduplicated = new Map();
  for (const row of [...monthly, ...forecast]) {
    const riceType = row.rice_type?.trim();
    const riceTypeCode = RICE_TYPE_CODES.get(riceType);
    if (!riceTypeCode) throw new Error(`Unknown rice type: ${riceType}`);
    const year = requiredInteger(row.year_ad, "year_ad");
    const month = requiredInteger(row.month, "month");
    if (year < 1900 || year > 2200 || month < 1 || month > 12) throw new Error("Invalid rice price year/month");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date ?? "")) throw new Error(`Invalid price date: ${row.date}`);
    const sourceType = row.data_type?.trim().toLowerCase();
    const dataType = sourceType === "forecast" ? "forecast" : "actual";
    const mapped = {
      observed_on: row.date,
      year,
      month,
      rice_type: riceType,
      rice_type_code: riceTypeCode,
      price: requiredNumber(row.price, "price"),
      unit: "บาท/100 กก.",
      data_type: dataType,
      source: row.source?.trim() || "สมาคมโรงสีข้าวไทย",
      is_imputed: sourceType === "imputed" || String(row.is_imputed).toLowerCase() === "true",
      model_name: row.model?.trim() || null,
      model_version: null,
      forecast_date: dataType === "forecast" ? row.date : null,
      reliability: null,
      reliability_label: row.forecast_reliability?.trim() || null,
      metadata: {
        yearBe: requiredInteger(row.year_be, "year_be"),
        monthNameTh: row.month_name_th?.trim() || null,
        sourceDataType: sourceType,
        imputeMethod: row.impute_method?.trim() || null,
        parameterSet: row.param_set?.trim() || null,
        forecastMethod: row.forecast_method?.trim() || null,
        scopeLevel: row.scope_level?.trim() || null,
        region: row.region?.trim() || null,
        province: row.province?.trim() || null,
      },
    };
    const key = `${mapped.rice_type_code}:${mapped.observed_on}:${mapped.data_type}`;
    const existing = deduplicated.get(key);
    if (existing && JSON.stringify(existing) !== JSON.stringify(mapped)) {
      throw new Error(`Conflicting duplicate rice-price row: ${key}`);
    }
    deduplicated.set(key, mapped);
  }
  return {
    rows: [...deduplicated.values()],
    files: [monthlyPath, forecastPath],
    fileRowCounts: {
      [monthlyPath]: monthly.length,
      [forecastPath]: forecast.length,
    },
    sourceCount: monthly.length + forecast.length,
    duplicateCount: monthly.length + forecast.length - deduplicated.size,
  };
}

function disasterRows(provincesByName) {
  const file = "public/data/disasters/disaster_overview.json";
  const data = JSON.parse(readFileSync(resolve(ROOT, file), "utf8"));
  if (!Array.isArray(data.records)) throw new Error("disaster_overview.json has no records array");
  const result = { flood: [], drought: [], storm: [] };
  const seen = { flood: new Set(), drought: new Set(), storm: new Set() };
  const unknownProvinces = new Set();
  const duplicateKeys = [];
  for (const row of data.records) {
    const category = row["ภัย"] === "น้ำท่วม" ? "flood" : row["ภัย"] === "ภัยแล้ง" ? "drought" : row["ภัย"] === "พายุ" ? "storm" : null;
    if (!category) continue;
    const provinceName = String(row["จังหวัด"] ?? "").trim();
    const provinceId = provincesByName.get(normalizeProvince(provinceName));
    if (!provinceId) {
      unknownProvinces.add(provinceName || "(ว่าง)");
      continue;
    }
    const yearBe = requiredInteger(row["ปี"], "ปี");
    const year = yearBe > 2400 ? yearBe - 543 : yearBe;
    const month = requiredInteger(row["เดือนเลข"], "เดือนเลข");
    const eventCount = requiredInteger(row.record_count, "record_count");
    if (year < 1900 || year > 2200 || month < 1 || month > 12 || eventCount < 0) throw new Error("Invalid disaster record");
    const key = `${year}:${month}:${provinceId}`;
    if (seen[category].has(key)) duplicateKeys.push(`${category}:${key}`);
    seen[category].add(key);
    const common = { year, month, province_id: provinceId, source: "public/data/disasters/disaster_overview.json" };
    if (category === "flood") result.flood.push({ ...common, flood_events: eventCount });
    else if (category === "drought") result.drought.push({ ...common, drought_events: eventCount });
    else result.storm.push({
      ...common,
      occurred_on: `${year}-${String(month).padStart(2, "0")}-01`,
      storm_type: "monthly-record",
      storm_events: eventCount,
    });
  }
  if (unknownProvinces.size) throw new Error(`Unknown provinces: ${[...unknownProvinces].join(", ")}`);
  if (duplicateKeys.length) throw new Error(`Duplicate disaster keys: ${duplicateKeys.slice(0, 10).join(", ")}`);
  return { ...result, file };
}

function summary(rows, duplicateCount = 0) {
  const years = rows.map((row) => row.year);
  const provinces = rows.map((row) => row.province_id).filter(Boolean);
  return {
    rowCount: rows.length,
    provinceCount: new Set(provinces).size,
    minYear: Math.min(...years),
    maxYear: Math.max(...years),
    missingCount: 0,
    duplicateCount,
    unknownProvinceCount: 0,
  };
}

async function insertChunks(client, table, rows) {
  for (let index = 0; index < rows.length; index += CHUNK_SIZE) {
    const { error } = await client.from(table).insert(rows.slice(index, index + CHUNK_SIZE));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function ensureDraftVersion(client, datasetType, files) {
  const spec = VERSION_SPECS[datasetType];
  const existing = await client
    .from("agricultural_dataset_versions")
    .select("*")
    .eq("dataset_type", datasetType)
    .eq("version_key", spec.key)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data && existing.data.status !== "draft") {
    throw new Error(`${datasetType}/${spec.key} is not a draft`);
  }
  if (existing.data) return existing.data;
  const created = await client.from("agricultural_dataset_versions").insert({
    dataset_type: datasetType,
    version_key: spec.key,
    label: spec.label,
    description: "นำเข้าจาก Static Dataset เดิมเพื่อ Preview และตรวจ parity ก่อน Publish",
    status: "draft",
    is_default: false,
    source_name: spec.sourceName,
    file_name: files.map((file) => basename(file)).join(", "),
    imported_at: new Date().toISOString(),
  }).select("*").single();
  if (created.error) throw new Error(created.error.message);
  return created.data;
}

async function replaceDraftData(client, definition) {
  const version = await ensureDraftVersion(client, definition.datasetType, definition.files);
  const removedRows = await client.from(definition.table).delete().eq("version_id", version.id);
  if (removedRows.error) throw new Error(removedRows.error.message);
  const removedFiles = await client.from("agricultural_import_files").delete().eq("version_id", version.id);
  if (removedFiles.error) throw new Error(removedFiles.error.message);
  await insertChunks(client, definition.table, definition.rows.map((row) => ({ ...row, version_id: version.id })));
  const validation = summary(definition.rows, definition.duplicateCount ?? 0);
  const importRows = definition.files.map((file) => ({
    version_id: version.id,
    dataset_type: definition.datasetType,
    file_name: basename(file),
    file_type: file.endsWith(".json") ? "json" : "csv",
    source_name: VERSION_SPECS[definition.datasetType].sourceName,
    row_count: definition.fileRowCounts?.[file] ?? definition.rows.length,
    validation_summary: validation,
  }));
  const imported = await client.from("agricultural_import_files").insert(importRows);
  if (imported.error) throw new Error(imported.error.message);
  const event = await client.from("agricultural_dataset_events").insert({
    version_id: version.id,
    actor_name: "Static data importer",
    action: "import",
    summary: `นำเข้าข้อมูลเดิม ${definition.rows.length.toLocaleString("en-US")} แถวเป็น Draft`,
    new_value: validation,
    details: { files: definition.files.map((file) => basename(file)) },
  });
  if (event.error) throw new Error(event.error.message);
}

async function verifyDraftData(client, definition) {
  const spec = VERSION_SPECS[definition.datasetType];
  const version = await client.from("agricultural_dataset_versions").select("id,status,is_default")
    .eq("dataset_type", definition.datasetType).eq("version_key", spec.key).single();
  if (version.error) throw new Error(`${definition.datasetType}: ${version.error.message}`);
  const actual = [];
  for (let start = 0; ; start += 1000) {
    const page = await client.from(definition.table).select("*").eq("version_id", version.data.id)
      .order("id").range(start, start + 999);
    if (page.error) throw new Error(`${definition.datasetType}: ${page.error.message}`);
    actual.push(...page.data);
    if (page.data.length < 1000) break;
  }
  if (actual.length !== definition.rows.length) throw new Error(`${definition.datasetType}: expected ${definition.rows.length}, found ${actual.length}`);
  const key = (row) => definition.datasetType === "rice_price"
    ? `${row.rice_type_code}|${row.observed_on}|${row.data_type}`
    : definition.datasetType === "storm"
      ? `${row.occurred_on}|${row.province_id}|${row.storm_type}`
      : `${row.year}|${row.month}|${row.province_id}`;
  const found = new Map(actual.map((row) => [key(row), row]));
  for (const expected of definition.rows) {
    const row = found.get(key(expected));
    if (!row) throw new Error(`${definition.datasetType}: missing ${key(expected)}`);
    for (const [field, value] of Object.entries(expected)) {
      const actualValue = row[field];
      if (typeof value === "number" ? Number(actualValue) !== value : !isDeepStrictEqual(actualValue, value)) {
        throw new Error(`${definition.datasetType}: ${key(expected)}.${field} differs from source`);
      }
    }
  }
  console.log(`${definition.datasetType}: ${actual.length} exact source rows; status=${version.data.status}; default=${version.data.is_default}`);
}

async function main() {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase environment variables are missing");
  const client = createClient(url, serviceKey, { auth: { persistSession: false } });
  const provinces = await client.from("rice_provinces").select("id,province_th,province_en").order("id");
  if (provinces.error) throw new Error(provinces.error.message);
  if (provinces.data.length !== 77) throw new Error(`Expected 77 provinces, found ${provinces.data.length}`);
  const provinceMap = new Map();
  for (const province of provinces.data) {
    provinceMap.set(normalizeProvince(province.province_th), province.id);
    provinceMap.set(normalizeProvince(province.province_en), province.id);
  }
  const prices = priceRows();
  const disasters = disasterRows(provinceMap);
  const definitions = [
    { datasetType: "rice_price", table: "rice_price_series", rows: prices.rows, files: prices.files, fileRowCounts: prices.fileRowCounts, duplicateCount: prices.duplicateCount },
    { datasetType: "flood", table: "flood_records", rows: disasters.flood, files: [disasters.file] },
    { datasetType: "drought", table: "drought_records", rows: disasters.drought, files: [disasters.file] },
    { datasetType: "storm", table: "storm_records", rows: disasters.storm, files: [disasters.file] },
  ];
  for (const definition of definitions) {
    console.log(`${definition.datasetType}:`, summary(definition.rows, definition.duplicateCount ?? 0));
  }
  if (VERIFY) {
    for (const definition of definitions) await verifyDraftData(client, definition);
    console.log("Static source parity verified without database writes.");
    return;
  }
  if (!APPLY) {
    console.log("Validation complete. No database writes (pass --apply to import drafts). ");
    return;
  }
  for (const definition of definitions) await replaceDraftData(client, definition);
  console.log("Imported all datasets as drafts. Nothing was published or set as default.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
