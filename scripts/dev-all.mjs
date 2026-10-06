import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createConnection } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const service = path.join(root, "services", "disease-ai");
const includeAdmin = process.argv.includes("--include-admin");
const python = process.env.RICE_AI_PYTHON || (process.platform === "win32"
  ? path.join(service, ".venv", "Scripts", "python.exe")
  : path.join(service, ".venv", "bin", "python"));
const next = path.join(root, "node_modules", "next", "dist", "bin", "next");
const localDiseaseApiToken = process.env.DISEASE_API_TOKEN || "rice-ai-local-development";
const requiredFiles = [
  python,
  next,
  path.join(service, "app.py"),
  path.join(service, "models", "Binary_Set2_ResNet50_best.keras"),
  path.join(service, "models", "Set2_ResNet50_Finetuned_best.keras"),
];
const missing = requiredFiles.filter(file => !existsSync(file));

if (missing.length) {
  console.error("เปิดระบบไม่ได้ เพราะไม่พบไฟล์:\n" + missing.map(file => `- ${file}`).join("\n"));
  console.error("หากยังไม่มี Python environment ให้ทำตาม services/disease-ai/README.md");
  process.exit(1);
}

console.log("กำลังเปิด Rice AI จากโปรเจกต์เดียว");
console.log("- เว็บหลัก: http://localhost:3000");
if (includeAdmin) {
  console.log("- ผู้ดูแล: http://localhost:3001");
}
console.log("- โมเดลตรวจโรค: http://127.0.0.1:8000/health");
console.log("ครั้งแรกอาจใช้เวลาสักครู่เพื่อโหลดโมเดล กรุณารอข้อความ Application startup complete\n");

function portIsOpen(port, host) {
  return new Promise(resolve => {
    const socket = createConnection({ port, host });
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(500);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

const services = [
  { name: "เว็บหลัก", port: 3000, host: "127.0.0.1", command: process.execPath, args: [next, "dev", "-p", "3000"], options: {
    cwd: root, stdio: "inherit", windowsHide: true,
    env: { ...process.env, DISEASE_API_TOKEN: localDiseaseApiToken },
  }},
  ...(includeAdmin ? [{ name: "หน้า Admin", port: 3001, host: "127.0.0.1", command: process.execPath, args: [next, "dev", "-p", "3001"], options: {
    cwd: path.join(root, "admin-portal"), stdio: "inherit", windowsHide: true,
    env: { ...process.env, DISEASE_API_TOKEN: localDiseaseApiToken },
  }}] : []),
  { name: "โมเดลตรวจโรค", port: 8000, host: "127.0.0.1", command: python, args: ["-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", "8000"], options: {
    cwd: service, stdio: "inherit", windowsHide: true,
    env: { ...process.env, DISEASE_API_TOKEN: localDiseaseApiToken, PYTHONUNBUFFERED: "1" },
  }},
];

const children = [];
for (const item of services) {
  if (await portIsOpen(item.port, item.host)) {
    console.log(`${item.name} เปิดอยู่แล้วที่พอร์ต ${item.port} — ใช้งานของเดิมโดยไม่เปิดซ้ำ`);
  } else {
    console.log(`กำลังเปิด${item.name}ที่พอร์ต ${item.port}`);
    children.push(spawn(item.command, item.args, item.options));
  }
}

if (!children.length) {
  console.log("ทุกบริการเปิดทำงานอยู่แล้ว");
  process.exit(0);
}

let stopping = false;
function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exitCode = exitCode;
}

for (const child of children) {
  child.on("error", error => {
    console.error(`เปิดบริการไม่สำเร็จ: ${error.message}`);
    stop(1);
  });
  child.on("exit", (code, signal) => {
    if (stopping) return;
    console.error(`บริการหนึ่งหยุดทำงาน (${signal || `exit ${code ?? 1}`}) จึงกำลังหยุดบริการที่เหลือ`);
    stop(code ?? 1);
  });
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
