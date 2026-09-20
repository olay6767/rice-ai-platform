# รายงานตรวจ Supabase และแผน Source of Truth — Rice AI Platform

วันที่ตรวจ: 19 กันยายน 2026  
เอกสารอ้างอิง: `supabase_admin_requirements_rice_ai.md`

## สถานะสรุป

- ระบบมี Province Master กลางแล้วใน `rice_provinces` จำนวน 77 จังหวัด จึงไม่สร้าง `provinces` ซ้ำ
- ระบบผลผลิตข้าวมี Version, Draft, Published, Archived, Default, Import Preview, RLS และ Audit แล้ว
- หน้า User Dashboard ผลผลิตยังอ่าน Static JSON ตามข้อกำหนด เพราะข้อมูล Forecast ใน Supabase ยังไม่ครบเท่า Static
- ข้อมูลราคา น้ำท่วม ภัยแล้ง และพายุเดิมใน Admin เป็นตารางทั่วไป จึงยังไม่เหมาะเป็น Source of Truth
- เพิ่ม migration `202609190003_admin_data_governance_foundation.sql` สำหรับ Version กลาง ตารางแบบมีชนิดข้อมูลชัดเจน RLS แหล่งที่มา และ Audit โดยไม่แก้หรือลบข้อมูลเดิม
- นำ Static ราคา/ภัยพิบัติเข้า Supabase เป็น Draft ครบ 4 ประเภทแล้ว ยังไม่ Publish และไม่ Set Default
- ล็อก Disease Master ให้ตรงกับ Class ของโมเดล และยกเลิกการลบ Prediction History ผ่าน Client API

## 1. ตารางที่มีอยู่แล้ว

### ข้อมูลผู้ใช้และข้อมูลส่วนตัว

| ตาราง | หน้าที่ | การแยกข้อมูล |
|---|---|---|
| `auth.users` | บัญชี อีเมล Role และสถานะ Auth | Supabase Auth |
| `rice_farm_fields` | แปลงนา จังหวัด พื้นที่ พันธุ์ข้าว วันปลูก | `user_id = auth.uid()` |
| `user_notification_preferences` | การตั้งค่าแจ้งเตือน | `user_id = auth.uid()` |
| `user_behavior_events` | Weather, Disease, Yield, Chat | `user_id = auth.uid()` |
| `disease_predictions` | ประวัติผลตรวจโรคและความมั่นใจ | `user_id = auth.uid()` |
| `finance_transactions` และกลุ่ม `finance_*` | ข้อมูลการเงินส่วนบุคคล | `user_id = auth.uid()` |

### ข้อมูลผลผลิตและโมเดล

| ตาราง | หน้าที่ |
|---|---|
| `rice_provinces` | Province Master กลาง 77 จังหวัด พร้อมรหัส ภูมิภาค และ GeoJSON |
| `rice_dashboard_versions` | Version ผลผลิต: draft/published/archived/default |
| `rice_yield_yearly` | ผลผลิต จังหวัด + ปี |
| `rice_environment_monthly` | ภูมิอากาศและ NDVI จังหวัด + ปี + เดือน |
| `rice_yield_predictions` | ผลพยากรณ์ย้อนหลังของโมเดล |
| `rice_prediction_intervals` | ช่วงความเชื่อมั่น |
| `rice_model_metadata` | Metadata/Metrics ของโมเดล |
| `rice_shap_global`, `rice_shap_group` | Explainability ของโมเดล |
| `rice_dashboard_import_files` | ไฟล์นำเข้าของ Version ผลผลิต |
| `rice_dashboard_events` | Audit ของ Version ผลผลิต |
| `rice_dashboard_deleted_versions` | หลักฐาน Version ที่ลบตาม workflow เดิม |

### ข้อมูล Admin และเนื้อหา

| ตาราง | หน้าที่ | ข้อสังเกต |
|---|---|---|
| `news_posts` | ข่าว/บทความ | ยังไม่มี archived, slug และ category master |
| `management_alerts` | การแจ้งเตือนส่วนกลาง | ใช้งานได้ |
| `rice_price_updates` | ราคาล่าสุดเพื่อแสดงเนื้อหา | ไม่ใช่ Time Series สำหรับ Dashboard |
| `farmer_recommendations` | คำแนะนำเกษตรกร | ใช้งานได้ |
| `admin_activity_logs` | Activity Log กลาง | migration ใหม่เพิ่ม `old_value`/`new_value` |
| `rice_diseases` | Disease Master 6 Class | migration ใหม่ล็อกรหัส Class |
| `admin_agricultural_records` | ข้อมูล price/flood/drought/storm แบบทั่วไป | เก็บไว้เพื่อไม่ทำลายข้อมูลเดิม แต่ไม่ใช้เป็น Source of Truth ระยะยาว |
| `assistant_usage_logs` | จำนวนการใช้งานผู้ช่วย | ใช้สรุป Admin Dashboard |

## 2. ตารางที่เพิ่ม

Migration `202609190003_admin_data_governance_foundation.sql` เพิ่ม:

1. `agricultural_dataset_versions`
2. `agricultural_dataset_events`
3. `agricultural_import_files`
4. `rice_price_series`
5. `flood_records`
6. `drought_records`
7. `storm_records`

ตารางเดิมยังอยู่ครบ ไม่มีการ Drop หรือย้ายข้อมูลอัตโนมัติจาก `admin_agricultural_records` เพราะข้อมูลเดิมไม่มี Column เพียงพอสำหรับ mapping ที่เชื่อถือได้

## 3. Column สำคัญ

### `agricultural_dataset_versions`

`id`, `dataset_type`, `version_key`, `label`, `description`, `status`, `is_default`, `source_name`, `source_url`, `file_name`, `imported_at`, `imported_by`, `created_by`, `published_at`, `revision`, `created_at`, `updated_at`

`dataset_type` รองรับ `rice_price`, `flood`, `drought`, `storm`

### `rice_price_series`

`id`, `version_id`, `observed_on`, `year`, `month`, `rice_type`, `rice_type_code`, `price`, `unit`, `data_type`, `source`, `is_imputed`, `model_name`, `model_version`, `forecast_date`, `reliability`, `created_at`, `updated_at`

### `flood_records`

`id`, `version_id`, `year`, `month`, `province_id`, `flood_events`, `affected_area_rai`, `affected_households`, `affected_people`, `agricultural_damage_rai`, `source`, `created_at`, `updated_at`

### `drought_records`

`id`, `version_id`, `year`, `month`, `province_id`, `drought_events`, `affected_area_rai`, `affected_households`, `agricultural_damage_rai`, `source`, `created_at`, `updated_at`

### `storm_records`

`id`, `version_id`, `occurred_on`, `year`, `month`, `province_id`, `storm_type`, `storm_events`, `affected_people`, `affected_households`, `damaged_houses`, `agricultural_damage_rai`, `source`, `created_at`, `updated_at`

### `agricultural_import_files`

`id`, `version_id`, `dataset_type`, `file_name`, `file_type`, `source_name`, `source_url`, `row_count`, `validation_summary`, `imported_by`, `imported_at`

รองรับชนิดไฟล์ใน Schema: `csv`, `xlsx`, `json`

## 4. Primary Key และ Foreign Key

- Version และ Event ใช้ UUID เป็น Primary Key
- ข้อมูล Time Series/ภัยพิบัติใช้ Identity `bigint` เป็น Primary Key
- ทุกตารางข้อมูลใหม่อ้าง `version_id → agricultural_dataset_versions.id` แบบ `on delete cascade`
- น้ำท่วม ภัยแล้ง และพายุอ้าง `province_id → rice_provinces.id`
- ผู้สร้าง/ผู้นำเข้า/ผู้ทำรายการอ้าง `auth.users.id` แบบ `on delete set null` เพื่อเก็บ Audit ต่อแม้บัญชีถูกปิด
- มี Unique Partial Index ให้มี Default ได้สูงสุด 1 Version ต่อ `dataset_type`
- มี Unique Key ระดับ business key เพื่อกันข้อมูลซ้ำใน Version เดียวกัน

## 5. RLS Policy

### User/Anonymous

- อ่านเฉพาะ Version ที่ `status = 'published'`
- อ่านแถวข้อมูลได้เมื่อ Version แม่เป็น `published` และชนิด Dataset ตรงกับตาราง
- อ่าน/เขียนข้อมูลส่วนตัวผ่าน `user_id = auth.uid()` ตาม Policy เดิม
- ไม่มีสิทธิ์ลบ `disease_predictions` ผ่าน Client แล้ว

### Admin

- อ่านทุก Version และ Audit ได้
- สร้าง Version แบบ Draft เท่านั้น
- เพิ่ม/แก้/ลบแถวได้เฉพาะ Version ที่เป็น Draft
- Published Data ถูกล็อกที่ RLS จึงแก้โดยตรงไม่ได้
- Publish/Archive ทำผ่าน RPC ที่ตรวจ Role, Revision และจำนวนข้อมูล

### Super Admin

- สิทธิ์ Admin ทั้งหมด
- `Set Default` และ `Publish + Set Default` ตรวจ `is_superadmin()` ใน RPC
- การเปลี่ยน Role ผู้ใช้ยังคงจำกัดที่ Super Admin ใน Admin API เดิม

## 6. Version System

State ที่รองรับ:

```text
draft → published → archived
                  ↘ set_default
archived → published (restore)
```

กฎที่บังคับในฐานข้อมูล:

- Default ต้องเป็น Published
- มี Default ได้ 1 Version ต่อ Dataset Type
- Publish ไม่ได้ถ้า Version ไม่มีข้อมูล
- Admin แก้แถวข้อมูลได้เฉพาะ Draft
- Set Default ต้องเป็น Super Admin
- ใช้ `revision` ป้องกันการเขียนทับเมื่อมี Admin หลายคนแก้พร้อมกัน
- Lifecycle บันทึก `old_value` และ `new_value` ใน `agricultural_dataset_events`

RPC ที่เพิ่ม:

- `agricultural_dataset_create_version(...)`
- `agricultural_dataset_change_version(...)`

## 7. Dataset → Table Mapping

| Dataset | Version | Data | Province Master | Audit/Import |
|---|---|---|---|---|
| ผลผลิตข้าว | `rice_dashboard_versions` | `rice_yield_yearly` | `rice_provinces` | `rice_dashboard_events`, `rice_dashboard_import_files` |
| ภูมิอากาศ/NDVI | `rice_dashboard_versions` | `rice_environment_monthly` | `rice_provinces` | ชุดเดียวกับผลผลิต |
| Forecast ผลผลิต | `rice_dashboard_versions` | `rice_yield_predictions`, `rice_prediction_intervals` | `rice_provinces` | ชุดเดียวกับผลผลิต |
| ราคาข้าว Time Series | `agricultural_dataset_versions` | `rice_price_series` | ไม่จำเป็น | `agricultural_dataset_events`, `agricultural_import_files` |
| น้ำท่วม | `agricultural_dataset_versions` | `flood_records` | `rice_provinces` | ตาราง Audit/Import กลาง |
| ภัยแล้ง | `agricultural_dataset_versions` | `drought_records` | `rice_provinces` | ตาราง Audit/Import กลาง |
| พายุ | `agricultural_dataset_versions` | `storm_records` | `rice_provinces` | ตาราง Audit/Import กลาง |
| โรคข้าว | ไม่มี Version เนื้อหา | `rice_diseases` | ไม่จำเป็น | `admin_activity_logs` |
| ประวัติตรวจโรค | ไม่มี Version | `disease_predictions` | ไม่จำเป็น | เป็น History ในตัว |

## 8. Table → API Mapping

### ใช้งานแล้ว

| Table | API |
|---|---|
| `rice_dashboard_versions`, `rice_yield_*`, `rice_environment_monthly` | `/api/admin/dashboard`, `/api/v1/dashboard`, `/api/v1/dashboard/versions`, `/api/v1/provinces`, `/api/v1/map`, `/api/v1/compare` |
| `rice_model_metadata`, `rice_shap_*` | `/api/admin/models`, `/api/v1/research/*` |
| `rice_diseases` | `/api/admin/diseases` |
| `disease_predictions` | `/api/disease/predict` |
| `auth.users`, `rice_farm_fields` | `/api/admin/users` |
| `news_posts`, alerts, prices, recommendations | `/api/admin/content/*` |
| `admin_activity_logs`, `rice_dashboard_events` | `/api/admin/activity`, `/api/admin/dashboard` |

### API Version ที่เพิ่มแล้ว

| Table | API ที่กำหนด |
|---|---|
| `agricultural_dataset_versions` | `/api/admin/datasets` สำหรับ List/Create/Publish/Archive/Default |
| `rice_price_series` | `/api/v1/datasets/rice_price` อ่าน Published Default |
| `flood_records` | `/api/v1/datasets/flood` อ่าน Published Default |
| `drought_records` | `/api/v1/datasets/drought` อ่าน Published Default |
| `storm_records` | `/api/v1/datasets/storm` อ่าน Published Default |

### API ที่ยังต้องเพิ่มสำหรับการแก้ Raw Data/Upload จาก Browser

| Table | API ที่กำหนด |
|---|---|
| ตารางข้อมูลทั้ง 4 ประเภท | `/api/admin/datasets/rows` สำหรับ CREATE/UPDATE/DELETE Draft |
| `agricultural_import_files` | `/api/admin/datasets/import/preview`, `/api/admin/datasets/import/commit` |

API User ต้อง resolve เฉพาะ Published Default และไม่เปิด Service Role Key ไปยัง Browser

## 9. API → User Page Mapping

| หน้า User | สถานะปัจจุบัน | แหล่งข้อมูลเป้าหมาย |
|---|---|---|
| `/dashboard` ผลผลิต | Static JSON เพื่อรักษา Forecast 2025 | `/api/v1/dashboard?view=yield-dashboard` หลังผ่าน parity |
| `/analytics/yield/*` เชิงวิจัย | Supabase API | API เดิม |
| `/analytics/rice-price` | Static CSV | `/api/v1/rice-price` หลัง import + parity |
| `/analytics/flood` | Static JSON/GeoJSON | `/api/v1/flood` หลัง import + parity |
| `/analytics/drought` | Static JSON | `/api/v1/drought` หลัง import + parity |
| `/analytics/storm` | Static JSON | `/api/v1/storm` หลัง import + parity |
| `/disease` | Backend Disease API + Supabase History | คงรูปแบบเดิม |
| `/chatbot` | Backend AI API + Supabase Profile/Farm/Behavior | คงรูปแบบเดิม |

## 10. ข้อมูลที่ Admin แก้ได้

- Draft Dataset และ Raw Data ของผลผลิต ราคา น้ำท่วม ภัยแล้ง พายุ
- ชื่อ/คำอธิบาย/Source ของ Draft Version
- รายละเอียดโรค ชื่อแสดงผล รูป อาการ สาเหตุ การป้องกัน การรักษา และ `is_active`
- เนื้อหาข่าว การแจ้งเตือน คำแนะนำ และรูป
- เปิด/ปิดการมองเห็นผล Forecast และเลือก Active Model ตาม API ที่จำกัดไว้
- Admin ทั่วไปเปลี่ยนผู้ใช้เป็น Admin ไม่ได้; Super Admin จัดการ Role

## 11. ข้อมูลที่ Admin ห้ามแก้

- Published Dataset โดยตรง
- Disease Class Code, Class Order และจำนวน Class
- ไฟล์ `.keras`, `.pkl`, `.joblib`
- Feature, Preprocessing, Threshold และ Model Architecture
- Metrics ที่มาจากการประเมินโมเดลจริง
- Prediction History แบบลบถาวร
- Activity Log แบบแก้หรือลบ
- Password เดิมของผู้ใช้ เพราะ Supabase เก็บเป็น Hash และไม่สามารถเปิดอ่านได้

## 12. ข้อมูลที่ยังขาด

### ผลผลิต

ผลตรวจ Default `baseline-2026` ใน Supabase:

- จังหวัด: 77
- Actual: ปี 2011–2024 จำนวน 1,078 แถว
- Prediction ย้อนหลัง: 2023–2024 จำนวน 154 แถว
- Monthly Environment: 2011–2025 จำนวน 13,860 แถว

Static ที่หน้า User ใช้:

- จังหวัด: 77
- Actual: ปี 2011–2024 จำนวน 1,078 แถว
- Forecast: ปี 2025 จำนวน 77 แถว
- รวม: 1,155 แถว

ดังนั้น Supabase ยังขาด Forecast ปี 2025 จำนวน 77 แถวในรูปแบบที่หน้า User ต้องใช้ และยังไม่ผ่าน parity สำหรับการสลับ `/dashboard`

### Dataset อื่น

- นำเข้า Draft แล้ว: ราคา 720 แถว, น้ำท่วม 1,270 แถว, ภัยแล้ง 206 แถว และพายุ 3,134 แถว
- ทุก Draft ยังตั้ง `is_default = false` และหน้า User ยังไม่อ่านข้อมูลชุดใหม่นี้
- ต้องทำ Preview/Validation/Commit สำหรับ CSV, XLSX และ JSON บน API ใหม่
- ข่าวยังขาด Category Master, Slug, Archived และ View Count
- Infographic ยังไม่มีตารางเฉพาะ
- Profile ชื่อ/ที่อยู่หลักยังอาศัย Auth Metadata; ควรกำหนด Profile Table กลางในรอบถัดไปโดยไม่สร้างซ้ำกับข้อมูลเดิม

## 13. Migration

| Migration | สถานะ/หน้าที่ |
|---|---|
| `202608260001_create_rice_yield_analytics.sql` | Province, Yield, Environment, Prediction, Model |
| `202609030001` ถึง `202609040005` | Version, Draft workflow, Import, Audit, Delete audit |
| `202609170001_expand_admin_dashboard.sql` | Disease Master, generic agriculture, usage |
| `202609190001_create_user_behavior_events.sql` | Personalized behavior |
| `202609190002_add_superadmin_role.sql` | Admin/Super Admin functions |
| `202609190003_admin_data_governance_foundation.sql` | Version/Table/RLS/Audit ของราคาและภัยพิบัติ พร้อมล็อก Disease/Prediction History |
| `202609190004_preserve_rice_price_metadata.sql` | เก็บ Reliability แบบข้อความและ Metadata จากไฟล์ราคาต้นฉบับโดยไม่สร้างค่าตัวเลขขึ้นเอง |

Migration ใหม่เป็นแบบ additive: ไม่ Drop Static file, ไม่ Drop ตารางเดิม และไม่เขียนทับข้อมูล Published เดิม

Script `scripts/import-agricultural-static-data.mjs` ตรวจ Province Mapping, Year, Month, Duplicate และจำนวนแถวก่อนเขียน สามารถรัน `npm run agriculture:data:check` เพื่อตรวจอย่างเดียว และ `npm run agriculture:data:import` เพื่อนำเข้า/รีเฟรช Draft

## 14. แผน Import JSON / CSV / Excel

1. รับเฉพาะ `.csv`, `.xlsx`, `.json` และตรวจ MIME/ขนาดไฟล์บน Backend
2. Parse บน Backend เท่านั้น
3. Normalize ชื่อ Column และชนิดข้อมูล
4. ตรวจ Required Column ตาม Dataset Type
5. ตรวจ Missing, Number, Date, Year และ Month
6. Map จังหวัดด้วย `rice_provinces`: `id`, `gid_1`, `province_th`, `province_en`
7. รายงาน Unknown Province โดยไม่เดา mapping อัตโนมัติ
8. ตรวจ Duplicate ด้วย business key ของแต่ละตาราง
9. แสดง Preview จำนวนแถว จังหวัด ช่วงปี Missing Duplicate และ Unknown Province
10. ผู้ใช้กด Confirm แล้วจึง Commit เข้า Draft
11. บันทึก File/Source/Validation Summary ใน `agricultural_import_files`
12. Publish ผ่าน RPC หลังมีข้อมูลและผ่าน Validation
13. Super Admin จึง Set Default
14. รัน parity check เทียบ Static ก่อนเปลี่ยนหน้า User

## เกณฑ์อนุมัติการสลับหน้า User

ต้องผ่านครบทุกข้อ:

- Record count เท่ากันหรือมีเอกสารอธิบายข้อมูลที่เพิ่มอย่างถูกต้อง
- 77 จังหวัดครบและ Province Mapping ไม่เหลือ Unknown
- ช่วงปีและ Forecast ครบ
- Previous Year และ % Change ตรงกับค่าที่คำนวณจาก Static
- Map Feature ครบ 77 จังหวัด
- Graph และ Filter ผ่าน UI test
- มี Published Default เพียง Version เดียวต่อ Dataset Type
- API ล้มเหลวแล้วมี Fallback ที่ทดสอบแล้ว

จนกว่าจะผ่านเกณฑ์นี้ ให้เก็บและใช้ Static JSON/CSV เป็น Backup, Fallback และ Reference ต่อไป
