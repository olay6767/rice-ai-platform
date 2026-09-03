# Rice Yield Thailand — คู่มือติดตั้งและใช้งาน

โมดูลวิเคราะห์ผลผลิตข้าวเป็นหน้าแดชบอร์ดหลักของ Rice AI Platform ที่เส้นทาง `/dashboard` โดยใช้ข้อมูลจาก `datarice/Rice_Yield_Thailand_Handoff_v1` และใช้ `province_id` เป็น Canonical Join Key ระหว่างทุกชุดข้อมูล

## สิ่งที่พัฒนาแล้ว

- Dashboard พร้อมตัวกรองปีเพาะปลูก ปีปฏิทิน เดือน ภูมิภาค และจังหวัด
- KPI ผลผลิตจริง ผลพยากรณ์ ฝน อุณหภูมิ NDVI และความชื้นในดิน
- กราฟแนวโน้มผลผลิตรายปี
- แผนที่ประเทศไทย 77 จังหวัด พร้อม Hover/Click, Zoom, Pan, Fullscreen, Legend และ Layer Selector
- หน้ารายละเอียดจังหวัด
- หน้าสิ่งแวดล้อมรายเดือนและตาราง 12 เดือน
- หน้าเปรียบเทียบ 2–5 จังหวัดหรือ 4 ภูมิภาค
- หน้างานวิจัย Model Performance, Scatter, Ablation, SHAP และ Baseline
- หน้าข้อมูล แหล่งที่มา พจนานุกรมตัวแปร และข้อจำกัด
- REST API ภายใต้ `/api/v1`
- รองรับ Desktop, Tablet และ Mobile

## ติดตั้งฐานข้อมูล

รันใน PowerShell จากโฟลเดอร์โปรเจก:

```powershell
npx supabase login
npx supabase link --project-ref svrucnmemwtrvjzrdncq
npx supabase db push
```

Migration ที่ต้องถูกติดตั้งคือ:

```text
supabase/migrations/202608260001_create_rice_yield_analytics.sql
```

Migration นี้สร้างตาราง:

- `rice_provinces`
- `rice_environment_monthly`
- `rice_yield_yearly`
- `rice_yield_predictions`
- `rice_prediction_intervals`
- `rice_shap_global`
- `rice_shap_group`
- `rice_model_metadata`

ทุกตารางเปิด RLS แบบ Public Read และอนุญาตการจัดการข้อมูลเฉพาะผู้ดูแลระบบ

## ตรวจและนำเข้าข้อมูล

ตรวจแพ็กเกจก่อน โดยยังไม่เขียนฐานข้อมูล:

```powershell
npm run rice:data:check
```

ผลที่ถูกต้องต้องเป็น:

```text
provinces: 77
monthly: 13860
yearly: 1078
predictions: 154
intervals: 154
shapGlobal: 77
shapGroups: 7
```

เมื่อติดตั้ง migration แล้ว ให้นำเข้าข้อมูล:

```powershell
npm run rice:data:import
```

สคริปต์อ่านค่า `NEXT_PUBLIC_SUPABASE_URL` และ `SUPABASE_SERVICE_ROLE_KEY` จาก `.env.local` โดยไม่แสดง Secret Key ใน Log และใช้ Upsert จึงสามารถรันซ้ำได้

## เปิดระบบ

```powershell
npm run dev
```

จากนั้นเปิด:

```text
http://localhost:3000/dashboard
```

## Routes

| หน้า | Route |
|---|---|
| Dashboard | `/dashboard` |
| Province Detail | `/analytics/yield/province/:provinceId` |
| Monthly Environment | `/analytics/yield/monthly` |
| Area Comparison | `/analytics/yield/compare` |
| Research & Model | `/analytics/yield/research` |
| Data & Sources | `/analytics/yield/about-data` |

เส้นทางเดิม `/analytics/yield` จะเปลี่ยนเส้นทางไปยัง `/dashboard` โดยอัตโนมัติ

## API

- `GET /api/v1/provinces`
- `GET /api/v1/dashboard?cropYear=2024&year=2024&month=8&region=Northeast&province=40`
- `GET /api/v1/provinces/:id/yield`
- `GET /api/v1/provinces/:id/environment?year=2024`
- `GET /api/v1/map?metric=actual_yield&year=2024`
- `GET /api/v1/map?metric=rainfall&year=2024&month=8`
- `GET /api/v1/compare?type=province&ids=1,2,3&metric=ndvi&year=2024`
- `GET /api/v1/research/model-performance`
- `GET /api/v1/research/shap-global`
- `GET /api/v1/research/ablation`
- `GET /api/v1/research/baselines`

## กติกาข้อมูลที่ระบบบังคับใช้

- ผลผลิตข้าวแสดงเป็นข้อมูลรายปี/ปีเพาะปลูกเท่านั้น
- ภูมิอากาศ NDVI และความชื้นในดินแสดงเป็นข้อมูลรายเดือน
- ค่า Missing เป็น `null` และไม่ถูกแทนด้วย `0`
- `residual = actual_yield - predicted_yield`
- Residual ติดลบหมายถึงโมเดลพยากรณ์สูงกว่าค่าจริง
- Residual เป็นบวกหมายถึงโมเดลพยากรณ์ต่ำกว่าค่าจริง
- SHAP ใช้อธิบายพฤติกรรมของโมเดล ไม่ใช่หลักฐานเชิงเหตุและผล
- Prediction Interval ถูกระบุชัดว่าเป็นผลทดลอง Conformal ซึ่งค่ากลางไม่ใช่ค่าพยากรณ์หลักชุดเดียวกัน
- R² = 0.750 ไม่ถูกเรียกว่า Accuracy 75%

## ตรวจสอบโค้ด

คำสั่งที่ใช้ตรวจ:

```powershell
npx tsc --noEmit --incremental false
npx eslint src/lib/rice-yield src/components/rice-yield src/app/api/v1 src/app/analytics/yield scripts/import-rice-yield-data.mjs
npm run build
```
