import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

// Run the actual pure validator without Next.js's server-only build marker.
const modules = new Map();
function load(file) {
  const filename = path.resolve(file);
  if (modules.has(filename)) return modules.get(filename);
  const source = fs.readFileSync(filename,"utf8");
  const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module = {exports:{}};
  const requireLocal = name => name === "server-only" ? {} : load(path.resolve(path.dirname(filename),name+".ts"));
  vm.runInNewContext(compiled,{module,exports:module.exports,require:requireLocal,console},{filename});
  modules.set(filename,module.exports);return module.exports;
}
const {inspectDashboardCsv,inspectDashboardRecord} = load("src/lib/admin/dashboard-import.ts");
const {DASHBOARD_DATASETS} = load("src/lib/admin/dashboard-types.ts");
const provinces = new Set([1,3,5,14,16]);
let checks = 0;
function check(label,run) {run();checks++;console.log(`PASS ${label}`);}
for (const dataset of DASHBOARD_DATASETS) {
  const source = fs.readFileSync(`sample-data/dashboard-version-demo/${dataset.fileName.replace(".csv","_demo.csv")}`,"utf8");
  check(`sample ${dataset.type}`,()=>assert.equal(inspectDashboardCsv(dataset.type,source,provinces).errorCount,0));
  const template = [dataset.columns.map(c=>c.key).join(","),dataset.columns.map(c=>c.example).join(",")].join("\n");
  check(`template ${dataset.type}`,()=>assert.equal(inspectDashboardCsv(dataset.type,template,provinces).errorCount,0));
  const row = inspectDashboardCsv(dataset.type,template,provinces).rows[0];
  check(`row editor accepts ${dataset.type}`,()=>assert.equal(JSON.stringify(inspectDashboardRecord(dataset.type,row,provinces)),JSON.stringify(row)));
  check(`row editor rejects unknown columns ${dataset.type}`,()=>assert.throws(()=>inspectDashboardRecord(dataset.type,{...row,admin_override:true},provinces),/คอลัมน์/));
  check(`row editor requires every column ${dataset.type}`,()=>{
    const partial = {...row};delete partial[dataset.columns.at(-1).key];
    assert.throws(()=>inspectDashboardRecord(dataset.type,partial,provinces),/คอลัมน์/);
  });
  check(`row editor rejects nested values ${dataset.type}`,()=>assert.throws(()=>inspectDashboardRecord(dataset.type,{...row,province_id:{id:1}},provinces),/province_id/));
  if (dataset.type === "monthly-environment") {
    check("row editor applies existing NDVI validation",()=>assert.throws(()=>inspectDashboardRecord(dataset.type,{...row,ndvi_mean:2},provinces),/ndvi_mean|NDVI/));
    check("row editor preserves quotes, commas and newlines",()=>assert.equal(inspectDashboardRecord(dataset.type,{...row,rice_ndvi_final_quality:'from "team", checked\nagain'},provinces).rice_ndvi_final_quality,'from "team", checked\nagain'));
    check("row editor preserves empty cells instead of zero",()=>assert.equal(inspectDashboardRecord(dataset.type,{...row,temperature_mean_c:""},provinces).temperature_mean_c,null));
  }
  if (dataset.type === "yield-predictions") check("row editor validates prediction arithmetic",()=>assert.throws(()=>inspectDashboardRecord(dataset.type,{...row,residual:500},provinces),/residual/));
}
const headers = "province_id,crop_start_year,crop_year,actual_yield";
const inspect = csv => inspectDashboardCsv("yearly-yield",csv,provinces);
check("BOM and CRLF",()=>assert.equal(inspect("\uFEFF"+headers+"\r\n5,2025,2568/69,400\r\n").errorCount,0));
check("duplicate row blocked",()=>assert.equal(inspect(headers+"\n5,2025,2568/69,400\n5,2025,2568/69,500").errorCount,1));
check("unknown province",()=>assert.equal(inspect(headers+"\n999,2025,2568/69,400").errorCount,1));
check("Buddhist start year rejected",()=>assert.equal(inspect(headers+"\n5,2568,2568/69,400").errorCount,1));
check("mismatched crop year",()=>assert.equal(inspect(headers+"\n5,2025,2567/68,400").errorCount,1));
check("multiple errors reported",()=>assert.equal(inspect(headers+"\n999,2025,2568/69,400\n5,2025,2568/69,-5").errorCount,2));
check("missing cells rejected",()=>assert.throws(()=>inspect(headers+"\n5,2025,2568/69")));
check("extra cells rejected",()=>assert.throws(()=>inspect(headers+"\n5,2025,2568/69,400,extra")));
check("unterminated quote rejected",()=>assert.throws(()=>inspect(headers+'\n5,2025,"2568/69,400')));
check("duplicate headers rejected",()=>assert.throws(()=>inspect("province_id,province_id\n5,5")));
check("empty file rejected",()=>assert.throws(()=>inspect(headers)));
check("future year accepted",()=>assert.equal(inspect(headers+"\n5,2027,2570/71,400").errorCount,0));
check("row limit",()=>assert.throws(()=>inspect(headers+"\n"+Array(20001).fill("5,2025,2568/69,400").join("\n"))));
const predictionHeaders = "province_id,crop_start_year,crop_year,actual_yield,predicted_yield,residual,absolute_error,percentage_error,model_version";
check("prediction arithmetic",()=>assert.equal(inspectDashboardCsv("yield-predictions",predictionHeaders+"\n5,2025,2568/69,400,410,10,10,2.5,Demo",provinces).errorCount,1));
check("multiple models rejected",()=>assert.equal(inspectDashboardCsv("yield-predictions",predictionHeaders+"\n5,2025,2568/69,400,410,-10,10,2.5,A\n3,2025,2568/69,400,410,-10,10,2.5,B",provinces).errorCount,1));
check("bad month",()=>assert.equal(inspectDashboardCsv("monthly-environment","province_id,year,month,rainfall_total_mm\n5,2025,13,100",provinces).errorCount,1));
check("missing monthly measurements",()=>assert.equal(inspectDashboardCsv("monthly-environment","province_id,year,month\n5,2025,1",provinces).errorCount,1));
check("NDVI bounds",()=>assert.equal(inspectDashboardCsv("monthly-environment","province_id,year,month,ndvi_mean,ndvi_min,ndvi_max\n5,2025,1,0.8,0.3,0.5",provinces).errorCount,1));
check("invalid boolean",()=>assert.equal(inspectDashboardCsv("monthly-environment","province_id,year,month,ndvi_mean,rice_ndvi_imputed\n5,2025,1,0.5,maybe",provinces).errorCount,1));
console.log(`${checks} validation checks passed; no database writes.`);
