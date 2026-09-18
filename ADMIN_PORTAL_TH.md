# Rice AI Admin Portal

ระบบหลังบ้านแยกเป็นเว็บอีกตัวในโฟลเดอร์ `admin-portal` ใช้ Supabase โปรเจกต์และฐานข้อมูลชุดเดียวกับเว็บผู้ใช้ แต่รันและ deploy แยกกัน

## ตั้งค่า

1. สร้างไฟล์ `admin-portal/.env.local` โดยคัดลอกโครงจาก `admin-portal/.env.example`
2. กรอกค่า Supabase ชุดเดียวกับเว็บหลัก ได้แก่ URL, Publishable key และ Secret/service_role key
3. กำหนด `NEXT_PUBLIC_SUPABASE_COOKIE_NAME=rice-ai-admin-auth` เพื่อแยก session จากเว็บผู้ใช้
4. หากต้องการใช้ปุ่มดึงราคาข้าวจาก Agri-Map ให้เพิ่ม `THAGRI_API_TOKEN`, `THAGRI_RICE_LAT` และ `THAGRI_RICE_LON` ด้วย
5. ใน `.env.local` ของเว็บหลัก เพิ่ม URL หลังบ้าน:

```env
NEXT_PUBLIC_ADMIN_PORTAL_URL=http://localhost:3001
```

ห้ามใช้ `NEXT_PUBLIC_` นำหน้า `SUPABASE_SERVICE_ROLE_KEY` และห้าม commit ไฟล์ `.env.local`

เว็บผู้ใช้ใช้ `/login` ส่วนเว็บผู้ดูแลใช้ `/login` บนพอร์ตหรือโดเมนของ `admin-portal` โดยทั้งสองเว็บใช้ cookie คนละชื่อ จึงไม่แชร์สถานะการเข้าสู่ระบบกัน

## รันในเครื่อง

เปิด PowerShell อีกหน้าต่าง แล้วรัน:

```powershell
cd C:\Users\first\Desktop\new\rice-ai-platform\admin-portal
npm run dev
```

เปิด `http://localhost:3001` เพื่อเข้าสู่ระบบหลังบ้าน

## ก่อนใช้งานครั้งแรก

บัญชีที่จะใช้ต้องมี `app_metadata.role` เป็น `admin` และ migration `202608060004_create_admin_content_management.sql` ต้องติดตั้งแล้ว

เมื่อ deploy จริง ให้เปลี่ยน `NEXT_PUBLIC_ADMIN_PORTAL_URL` เป็นโดเมนของหลังบ้าน เช่น `https://admin.example.com` และกำหนดค่า Supabase เดียวกันใน environment ของทั้งสองเว็บ
