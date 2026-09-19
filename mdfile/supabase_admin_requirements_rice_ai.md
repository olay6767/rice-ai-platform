# แนวทางงานสำหรับผู้รับผิดชอบ Supabase — Rice AI Platform

## เป้าหมายหลัก

ทำให้ **Supabase เป็นแหล่งข้อมูลหลัก (Source of Truth)** ของระบบ เพื่อให้หน้า Admin สามารถเพิ่ม/แก้ไข/จัดการข้อมูล แล้วหน้า User แสดงข้อมูลล่าสุดผ่าน API ได้จริง โดยไม่ต้องแก้โค้ดทุกครั้ง

โครงสร้างที่ต้องการ:

```text
Admin
  ↓
เพิ่ม / แก้ไข / Upload
  ↓
Validation
  ↓
Supabase
  ↓
Publish / Set Default
  ↓
API
  ↓
User Dashboard
```

> สำคัญ: **ห้ามเปลี่ยนหน้า User ให้มาอ่าน Supabase จนกว่าจะตรวจว่าข้อมูลใน Supabase ครบเท่าข้อมูลเดิมแล้ว**

---

# 1. ตรวจโครงสร้าง Supabase เดิมก่อน

ก่อนสร้าง Table ใหม่ ให้ตรวจของเดิมทั้งหมดก่อนว่า:

- มี Table อะไรอยู่แล้ว
- มี Table สำหรับผลผลิตข้าวหรือไม่
- มี `rice_dashboard_version` หรือระบบ Version อยู่แล้วหรือไม่
- มี Table ผู้ใช้งาน / Profile / Role อยู่แล้วหรือไม่
- มี Migration อะไรอยู่แล้ว
- มี API หรือ Server Function อะไรที่ใช้งาน Supabase อยู่แล้ว
- มี Foreign Key อะไรบ้าง
- มี RLS Policy อะไรอยู่แล้ว

## กฎสำคัญ

- ห้ามสร้าง Table ซ้ำโดยไม่จำเป็น
- Reuse Schema / API เดิมให้มากที่สุด
- ห้ามลบข้อมูลเดิม
- ห้ามลบ Static JSON/CSV เดิม เพราะยังใช้เป็น Backup/Fallback ได้

---

# 2. ทำ Province Master กลาง

ควรมี Table จังหวัดกลางเพียงชุดเดียว เช่น:

```text
provinces

- province_id
- province_code
- province_name_th
- province_name_en
```

ข้อมูลต่อไปนี้ควรอ้างอิง `province_id` เดียวกัน:

- ผลผลิตข้าว
- น้ำท่วม
- ภัยแล้ง
- พายุ
- Forecast

เพื่อป้องกันปัญหาชื่อจังหวัดไม่ตรงกัน เช่น:

```text
กรุงเทพฯ
กรุงเทพมหานคร
Bangkok
```

---

# 3. ระบบ Version ของข้อมูล

ข้อมูล Dashboard ไม่ควรแก้ Published Data โดยตรง

ควรมีสถานะ:

```text
draft
published
archived
```

และรองรับ:

```text
is_default = true / false
```

ตัวอย่าง:

```text
baseline-2026

status = published
is_default = true
```

## กฎ

- หน้า User อ่านเฉพาะ `published`
- ถ้ามีหลาย Version ให้เลือกเฉพาะ `is_default = true`
- ห้ามมี Default มากกว่า 1 Version ในข้อมูลประเภทเดียวกัน
- Admin แก้ข้อมูลใน Draft ก่อน แล้วค่อย Publish

---

# 4. ข้อมูลผลผลิตข้าว

ต้องรองรับข้อมูลระดับ:

```text
จังหวัด + ปี
```

อย่างน้อยควรมี:

```text
- id
- version_id
- province_id
- crop_year
- year_ad
- yield_kg_rai
- planted_area_rai
- harvested_area_rai
- production_ton
- is_forecast
- source
- created_at
- updated_at
```

## Admin ต้องทำได้

- เพิ่มข้อมูล
- แก้ไขข้อมูล
- ลบข้อมูลใน Draft
- Upload CSV
- Upload Excel
- Filter ปี
- Filter จังหวัด
- Preview ก่อน Import
- Publish
- Set Default

## ค่าที่ Backend ควรคำนวณเอง

- Previous Year
- % Change
- Ranking
- ค่าเฉลี่ย
- KPI

Admin ไม่ควรกรอกค่าพวกนี้เอง

---

# 5. ข้อมูลราคาข้าว

ควรเป็น Time Series

อย่างน้อย:

```text
- id
- version_id
- date
- year
- month
- rice_type
- rice_type_code
- price
- unit
- data_type
- source
- is_imputed
- created_at
```

`data_type`:

```text
actual
forecast
```

ถ้ามี Forecast:

```text
- model_name
- model_version
- forecast_date
- forecast_value
- confidence หรือ reliability (ถ้ามีจริง)
```

ถ้ามี Model Metrics:

```text
- MAE
- RMSE
- R²
- evaluation_period
```

> Admin ไม่ควรพิมพ์ค่า MAE / RMSE / R² เอง ถ้าค่านี้สามารถคำนวณจากผล Model จริงได้

---

# 6. ข้อมูลน้ำท่วม

อย่างน้อย:

```text
- id
- version_id
- year
- month
- province_id
- flood_events
- affected_area_rai
- affected_households
- affected_people
- agricultural_damage_rai
- source
- created_at
```

## Admin จัดการ Raw Data

Admin สามารถเพิ่ม/แก้ข้อมูลต้นทางได้

แต่ค่าพวกนี้ให้ Backend คำนวณ:

- จังหวัดที่เกิดน้ำท่วมมากที่สุด
- จำนวนเหตุการณ์รวม
- Ranking
- ค่าเฉลี่ย
- KPI

---

# 7. ข้อมูลภัยแล้ง

อย่างน้อย:

```text
- id
- version_id
- year
- month
- province_id
- drought_events
- affected_area_rai
- affected_households
- agricultural_damage_rai
- source
- created_at
```

หลักการเหมือนน้ำท่วม:

- Admin แก้ Raw Data
- Backend คำนวณ KPI / Ranking

---

# 8. ข้อมูลพายุ

อย่างน้อย:

```text
- id
- version_id
- year
- month
- date
- province_id
- storm_type
- storm_events
- affected_people
- affected_households
- damaged_houses
- agricultural_damage_rai
- source
- created_at
```

Admin ต้องสามารถ:

- Upload
- เพิ่ม
- แก้ไข
- ลบ Draft
- Publish

---

# 9. Forecast ผลผลิตข้าว

ตอนนี้ **ไม่ต้องทำระบบให้ Admin Upload Model**

ให้ Admin จัดการ **ผล Forecast** และ Version เป็นหลัก

ข้อมูลตัวอย่าง:

```text
- forecast_id
- version_id
- province_id
- crop_year
- predicted_yield_kg_rai
- model_name
- model_version
- created_at
- is_visible
```

Model Metadata:

```text
- model_name
- model_version
- algorithm
- train_period
- feature_count
- MAE
- RMSE
- R²
- trained_at
```

## Admin ทำได้

- ดู Model ที่ใช้
- ดู Version
- ดู Metrics
- ดูผล Forecast
- Publish Forecast
- Set Default
- เปิด/ปิดการแสดงผล

## Admin ห้ามทำ

- Upload `.pkl` / `.joblib` แบบสุ่ม
- แก้ Features
- แก้ Preprocessing
- แก้ Metrics เอง
- แก้ Algorithm

---

# 10. ข้อมูลโรคข้าว

ควรมี Disease Master เช่น:

```text
- disease_code
- disease_name_th
- disease_name_en
- description
- symptoms
- causes
- prevention
- treatment
- example_image_url
- is_active
- created_at
- updated_at
```

`disease_code` ต้องตรงกับ Class ของ Model

ตัวอย่าง Class ปัจจุบัน:

```text
healthy
sheath_blight
bacterial_leaf_blight
brown_spot
rice_blast
neck_blast
```

## Admin ทำได้

- แก้ชื่อโรค
- แก้รายละเอียด
- แก้อาการ
- แก้สาเหตุ
- แก้วิธีป้องกัน/รักษา
- เพิ่มรูป
- เปิด/ปิดข้อมูลโรค

## Admin ห้ามทำ

- เพิ่ม Class ใหม่ถ้า Model ยังไม่รองรับ
- แก้ `.keras`
- แก้ Class Order
- แก้ Threshold
- แก้ Preprocessing
- แก้ Model Architecture

---

# 11. ประวัติการตรวจโรค

อย่างน้อย:

```text
- prediction_id
- user_id
- disease_code
- confidence
- probabilities
- model_version
- created_at
```

ใช้สำหรับ:

- จำนวนครั้งตรวจโรค
- โรคที่พบมากที่สุด
- จำนวนการตรวจรายวัน
- Disease Distribution

ไม่ควรให้ Admin ลบ Prediction History แบบถาวร

---

# 12. User Management

ควรมีข้อมูล:

```text
- user_id
- name
- email
- role
- status
- created_at
- last_login_at
```

Role:

```text
user
admin
super_admin
```

Status:

```text
active
disabled
suspended
```

## Admin ต้องทำได้

- ดูรายชื่อ User
- Search
- เปลี่ยน Role
- Disable / Enable
- ดูวันที่สมัคร
- ดู Last Login

## กฎ

ไม่ควร Hard Delete User ทันที

---

# 13. ข่าวสาร

ควรมี:

```text
- news_id
- title
- slug
- short_description
- content
- cover_image
- category_id
- author_id
- status
- publish_date
- created_at
- updated_at
- views
```

Status:

```text
draft
published
archived
```

Admin ต้องสามารถ:

- เพิ่มข่าว
- แก้ข่าว
- Publish
- Archive
- ตั้งวัน Publish
- เพิ่มรูป

---

# 14. หมวดข่าว

```text
- category_id
- category_name
- slug
- is_active
```

ตัวอย่าง:

```text
ความรู้เรื่องข้าว
พันธุ์ข้าว
โรคใบข้าว
การปลูกและดูแล
เกษตรอัจฉริยะ
```

---

# 15. Infographic

ควรมี:

```text
- infographic_id
- title
- description
- image_url
- category
- status
- publish_date
- created_at
```

Admin ต้องสามารถ:

- เพิ่ม
- แก้
- ลบ Draft
- Publish
- Archive

---

# 16. Activity Log

ต้องมี Log ทุกครั้งที่ Admin แก้ข้อมูลสำคัญ

อย่างน้อย:

```text
- log_id
- admin_id
- action
- entity_type
- entity_id
- description
- old_value
- new_value
- created_at
```

ตัวอย่าง:

```text
Admin01 แก้ราคาข้าว
Admin02 Publish ข่าว
Super Admin เปลี่ยน Default Dataset
```

Admin ทั่วไปไม่ควรลบ Activity Log

---

# 17. ระบบ Import CSV / Excel / JSON

ข้อมูลที่ Admin Upload ต้องผ่านขั้นตอน:

```text
1. ตรวจชนิดไฟล์
2. ตรวจ Column
3. ตรวจ Missing
4. ตรวจ Duplicate
5. ตรวจ Province Mapping
6. ตรวจ Year
7. Preview
8. Confirm Import
9. Import เป็น Draft
10. Publish ภายหลัง
```

ตัวอย่างหน้าสรุป:

```text
พบข้อมูล: 1,078 records
จังหวัด: 77 จังหวัด
ช่วงข้อมูล: 14 ปี

Missing: 0
Duplicate: 0
Unknown Province: 0
```

แล้วค่อยให้ Admin กด:

```text
Import เป็น Draft
```

## ห้าม

Upload แล้วเขียนทับ Published Data ทันที

---

# 18. เก็บ Source ของข้อมูล

ทุก Dataset ควรบันทึก:

```text
- source_name
- source_url
- file_name
- imported_at
- imported_by
```

เพื่อให้ตรวจย้อนหลังได้ว่าข้อมูลมาจากไหน

---

# 19. Permission / RLS

ต้องกำหนดสิทธิ์ให้เหมาะสม

ตัวอย่าง:

## User

- อ่านข้อมูล Published
- อ่าน/แก้ข้อมูลส่วนตัวของตัวเอง

## Admin

- จัดการ Dataset
- Import
- Draft
- Publish ตามสิทธิ์

## Super Admin

- จัดการ Role
- จัดการ Admin
- เปลี่ยน Default Version
- ตั้งค่าระบบสำคัญ

ควรใช้ Supabase RLS ป้องกันข้อมูลด้วย ไม่ควรพึ่งแค่การซ่อนปุ่มที่ Frontend

---

# 20. API

ต้องมี API ระหว่าง Supabase กับ Frontend

โครงสร้าง:

```text
Supabase
   ↓
Server/API
   ↓
User Dashboard
```

และ:

```text
Admin
   ↓
Admin API
   ↓
Supabase
```

ควรมี:

- GET
- CREATE
- UPDATE
- DELETE Draft
- PUBLISH
- ARCHIVE
- SET DEFAULT

---

# 21. สิ่งที่ต้องตรวจ ก่อนเปลี่ยนหน้า User มาใช้ Supabase

จุดนี้สำคัญที่สุด

ก่อนเปลี่ยน Dashboard จาก JSON/CSV เดิมมาอ่าน Supabase ต้องตรวจว่า:

- จำนวนปีครบ
- 77 จังหวัดครบ
- จำนวน Record ตรงกับต้นฉบับ
- Forecast ครบ
- Previous Year คำนวณได้
- % Change คำนวณได้
- Map แสดงครบ
- Graph แสดงครบ
- Filter ทำงาน
- Published Default ถูกต้อง

ตัวอย่างผลผลิตเดิม:

```text
14 ปี
77 จังหวัด
1,078 records
```

Supabase ต้องมีข้อมูลเทียบเท่าหรือถูกต้องกว่าก่อนจึงค่อยเปลี่ยนหน้า User

---

# 22. Static JSON / CSV เดิม

ตอนนี้ให้เก็บไว้ทั้งหมด

ใช้เป็น:

```text
Backup
Fallback
Reference
```

ห้ามลบจนกว่าระบบ Supabase จะทำงานครบและผ่านการตรวจแล้ว

---

# 23. สิ่งที่คนทำ Supabase ต้องส่งกลับก่อนเริ่มเขียน Admin เต็มระบบ

ขอเอกสารสรุปดังนี้:

1. รายชื่อ Table ที่มีอยู่แล้ว
2. Table ที่ต้องสร้างเพิ่ม
3. Column ของแต่ละ Table
4. Primary Key / Foreign Key
5. RLS Policy
6. Version System
7. Dataset → Table Mapping
8. Table → API Mapping
9. API → User Page Mapping
10. ข้อมูลไหน Admin แก้ได้
11. ข้อมูลไหน Admin ห้ามแก้
12. ข้อมูลไหนยังขาด
13. Migration ที่ต้องเพิ่ม
14. แผน Import JSON / CSV / Excel

---

# เป้าหมายสุดท้าย

ต้องการให้ระบบทำงานแบบนี้:

```text
Admin
  ↓
แก้ Draft / Upload File
  ↓
Validation
  ↓
Supabase
  ↓
Publish
  ↓
API
  ↓
User Dashboard
```

โดย:

- Admin ไม่ต้องแก้ Code
- User ไม่ต้องอ่าน Excel/JSON โดยตรงในระยะยาว
- Dataset มี Version
- มี Draft / Published / Default
- มี Permission
- มี Activity Log
- มี Validation ก่อน Import
- มี Backup/Fallback
- ข้อมูลต้องครบก่อนเปลี่ยนจาก Static Data มาใช้ Supabase
