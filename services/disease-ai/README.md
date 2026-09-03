# Rice AI Disease Inference Service

FastAPI service สำหรับโมเดล ResNet50 ตรวจภาพใบข้าว โดย Next.js จะเรียกผ่าน `POST /api/disease/predict` อีกชั้นหนึ่ง

## เปิดพร้อมทั้งระบบ (แนะนำ)

จากโฟลเดอร์หลัก `rice-ai-platform` ใช้คำสั่งเดียว:

```powershell
npm run dev:all
```

คำสั่งนี้เปิดเว็บหลักที่พอร์ต `3000`, หน้า Admin ที่พอร์ต `3001` และโมเดลตรวจโรคที่พอร์ต `8000` จากโฟลเดอร์ในโปรเจกต์เดียว ไม่ต้องเปิดคำสั่ง `uvicorn` ใน Downloads อีก หากบางบริการเปิดอยู่แล้ว ระบบจะใช้ของเดิมโดยไม่เปิดซ้ำ กด `Ctrl+C` เพื่อหยุดบริการที่คำสั่งนี้เป็นผู้เปิด

ไฟล์โมเดลอยู่ใน `services/disease-ai/models/` และถูกละเว้นจาก Git เนื่องจากมีขนาดใหญ่

## ติดตั้ง Python ครั้งแรกหรือเมื่อลบ `.venv`

ใช้ Python 3.11 แล้วติดตั้ง dependencies:

```powershell
cd services/disease-ai
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app:app --host 127.0.0.1 --port 8000
```

วางไฟล์โมเดลต่อไปนี้ใน `models/` ก่อนรัน:

- `Binary_Set2_ResNet50_best.keras`
- `Set2_ResNet50_Finetuned_best.keras`

ตั้งค่า `DISEASE_API_URL=http://127.0.0.1:8000` ใน `.env.local` ของโปรเจกต์ Next.js แล้วเปิดเว็บตามปกติ

## API ภายใน

- `GET /health`
- `POST /predict` โดยใช้ `multipart/form-data` field ชื่อ `file`

โมเดลจำแนกได้ `Healthy`, `Sheath Blight`, `Bacterial Leaf Blight`, `Brown Spot`, `Rice Blast` และ `Neck Blast` เท่านั้น จึงยังไม่รองรับโรคเมล็ดด่าง
