# ตั้งค่าระบบผู้ดูแล Rice AI

ระบบผู้ดูแลแยกอยู่ในโปรเจกต์ `admin-portal` ใช้ฐานบัญชี Supabase โปรเจกต์เดียวกัน แต่แยกหน้าเข้าสู่ระบบและ session cookie ออกจากเว็บผู้ใช้ โดยอนุญาตเฉพาะบัญชีที่มี `app_metadata.role` เป็น `admin`

## 1. เปิดใช้งาน Supabase และติดตั้ง migration

หากโปรเจกต์ Supabase ถูกพักไว้ ให้กด **Resume project** ใน Supabase Dashboard ก่อน

หากฐานข้อมูลยังไม่เคยติดตั้ง migration ให้รันไฟล์ใน **SQL Editor ตามลำดับนี้**:

1. `supabase/migrations/202607240001_create_finance_transactions.sql`
2. `supabase/migrations/202608060001_create_disease_predictions.sql`
3. `supabase/migrations/202608060002_expand_finance_categories.sql`
4. `supabase/migrations/202608060003_create_finance_budgets.sql`
5. `supabase/migrations/202608060004_create_admin_content_management.sql`
6. `supabase/migrations/202608060005_repair_finance_transaction_categories.sql`

หากติดตั้งผ่าน Supabase CLI ให้ใช้ `supabase db push` เพื่อให้ระบบจัดการลำดับ migration ให้อัตโนมัติ

หากบันทึกรายการหมวดเกษตร เช่น **ค่าน้ำและสูบน้ำ** แล้วพบข้อผิดพลาด `finance_transactions_category_matches_type` ให้รันไฟล์ข้อ 6 เพิ่มเติม ไฟล์นี้จะแก้กฎหมวดหมู่เดิมให้รองรับหมวดเกษตรและยังเก็บหมวดเก่าไว้ได้

สำหรับระบบหลังบ้าน ให้รันไฟล์นี้ทั้งไฟล์:

`supabase/migrations/202608060004_create_admin_content_management.sql`

Migration จะสร้างตารางสำหรับข่าว/อินโฟกราฟิก, การแจ้งเตือน, ราคาข้าว, คำแนะนำ, ประวัติกิจกรรม และ Storage bucket ชื่อ `admin-media` พร้อม RLS แล้ว

## 2. กำหนดผู้ดูแลคนแรก

สร้างบัญชีผ่านหน้า Register ตามปกติก่อน แล้วรัน SQL ด้านล่างใน SQL Editor โดยเปลี่ยนอีเมลให้ตรงกับบัญชีที่จะเป็นผู้ดูแล:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'admin')
where email = 'your-admin@email.com';
```

เปิดเว็บผู้ดูแลที่ `http://localhost:3001/login` แล้วเข้าสู่ระบบใหม่หนึ่งครั้ง บัญชีผู้ใช้ทั่วไปจะถูกปฏิเสธตั้งแต่หน้าเข้าสู่ระบบ

## 3. ตั้งค่า Service Role Key

คัดลอก **Secret key** (`sb_secret_...`) หรือ legacy **service_role key** จาก Supabase Dashboard → Project Settings → API แล้วเพิ่มไว้ใน `.env.local` (ห้ามใช้ Publishable key `sb_publishable_...`):

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

ห้ามใส่ `NEXT_PUBLIC_` นำหน้าคีย์นี้ และห้าม commit ไฟล์ `.env.local` เพราะคีย์นี้ใช้สำหรับ:

- อัปโหลดรูปไปที่ Storage bucket `admin-media`

หลังแก้ `.env.local` ให้ restart `npm run dev`

## 4. เปิดใช้ปุ่มดึงราคาข้าวจาก API

หน้า `/admin` → **ราคาข้าว** มีปุ่ม **ดึงจาก Agri-Map** สำหรับนำเข้าข้อมูลผ่าน API ของ THAGRI/Agri-Map ซึ่งต้องขอ token จาก [THAGRI](https://thagri.in.th) ก่อน แล้วตั้งค่าใน `.env.local`:

```env
THAGRI_API_TOKEN=token_ของคุณ
THAGRI_RICE_LAT=14.8818
THAGRI_RICE_LON=102.0207
```

พิกัดกำหนดพื้นที่อ้างอิงของ API และไม่ควรใส่ token ใน `NEXT_PUBLIC_` หรือส่ง token ผ่านแชต ระบบจะบันทึกข้อมูลที่ดึงมาเป็นประวัติราคาใหม่ พร้อมคำนวณแนวโน้มเทียบกับราคาล่าสุดในระบบโดยอัตโนมัติ

## สิ่งที่จัดการได้ใน `/admin`

- ข่าวและอินโฟกราฟิก: รูปปก, หมวด, ข่าวเด่น, ร่าง/เผยแพร่ และวันเผยแพร่
- การแจ้งเตือน: โรค, แมลง, อากาศ, ภัยพิบัติ, ระดับความรุนแรง, พื้นที่ และวันหมดอายุ
- ราคาข้าว: ชนิดข้าว, ราคา/ตัน, แนวโน้ม, เปอร์เซ็นต์เปลี่ยนแปลง และแหล่งอ้างอิง
- คำแนะนำเกษตรกร: หมวดและช่วงเวลาที่ต้องการแสดง
- สิทธิ์ผู้ใช้: กำหนดผ่าน Supabase Dashboard หรือ SQL Editor เพื่อไม่ให้มีการแก้สิทธิ์โดยไม่ตั้งใจจากหน้าแอดมิน
- ภาพรวมและประวัติการจัดการล่าสุด

รายการที่มีสถานะเผยแพร่/เปิดใช้งานจะแสดงในหน้า `/infographic` และ `/news` โดยอัตโนมัติ ส่วนระบบจะใช้ข้อมูลตัวอย่างต่อไปหากยังไม่ได้ติดตั้ง migration
