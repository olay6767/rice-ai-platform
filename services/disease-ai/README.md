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
uvicorn app:app --host 127.0.0.1 --port 8000
```

วางไฟล์โมเดลต่อไปนี้ใน `models/` ก่อนรัน:

- `Binary_Set2_ResNet50_best.keras`
- `Set2_ResNet50_Finetuned_best.keras`

ตั้งค่า `DISEASE_API_URL=http://127.0.0.1:8000` ใน `.env.local` ของโปรเจกต์ Next.js แล้วเปิดเว็บตามปกติ

`.env.example` เป็นรายการตัวแปรอ้างอิง ตัวบริการ Python อ่านค่าจาก environment ของ process โดยตรง `npm run dev:all` จะตั้ง token สำหรับการพัฒนาให้ทั้งสามบริการอัตโนมัติ หากเปิด `uvicorn` เอง ต้องตั้ง `DISEASE_API_TOKEN` ค่าเดียวกันใน process ของ FastAPI และใน `.env.local` ของ Next.js ระบบจะปฏิเสธ `POST /predict` และ `POST /models/validate` เมื่อไม่มี token ส่วน `GET /health` ยังเปิดให้ตรวจสถานะได้ ห้ามใช้ตัวแปร `NEXT_PUBLIC_` กับ token นี้

## Deploy บริการตรวจโรคแยกจากเว็บหลักบน Vercel

สร้าง **Vercel project ใหม่** โดยใช้ `services/disease-ai` เป็น project root (`app.py` คือ FastAPI entrypoint) และ Python 3.12 ตาม `.python-version` โมเดล `.keras` ทั้งสองไฟล์ไม่อยู่ใน Git และ `.vercelignore` กันไฟล์เหล่านี้กับ `.env` ออกจาก deployment เพราะไฟล์ classifier ใหญ่กว่า [เพดาน source upload ของ Hobby](https://vercel.com/docs/limits#static-file-uploads) ให้อัปโหลดโมเดลไปยัง **private Vercel Blob store** แล้วให้บริการดึงแบบ stream ลง `/tmp` เมื่อมีคำขอวิเคราะห์ภาพครั้งแรก

```powershell
cd services/disease-ai
vercel link  # สร้าง project ใหม่สำหรับ disease API แยกจากเว็บหลัก
vercel blob create-store rice-ai-disease-models --access private
vercel blob put models/Binary_Set2_ResNet50_best.keras --access private --pathname models/Binary_Set2_ResNet50_best.keras
vercel blob put models/Set2_ResNet50_Finetuned_best.keras --access private --pathname models/Set2_ResNet50_Finetuned_best.keras
```

ตั้งค่าฝั่ง disease API project ใน Vercel:

- `VALIDATOR_MODEL_URL` และ `CLASSIFIER_MODEL_URL` เป็น URL ของ private Blob ที่อัปโหลด (ต้องเป็น HTTPS, โฮสต์ลงท้าย `.private.blob.vercel-storage.com` และ path ลงท้าย `.keras`)
- `BLOB_READ_WRITE_TOKEN` เป็น token ของ Blob store นี้สำหรับดาวน์โหลดจาก Python โดยตรง; เก็บเป็น environment secret เท่านั้น
- `DISEASE_API_TOKEN` เป็น secret ที่ใช้รับคำขอจากเว็บหลัก

ตั้งค่า `DISEASE_API_URL` ของเว็บหลักเป็น URL ของ disease API โดยไม่ต่อ `/predict` และตั้ง `DISEASE_API_TOKEN` ค่าเดียวกันในเว็บหลัก จากนั้น deploy disease API และ redeploy เว็บหลัก:

```powershell
vercel deploy  # ตรวจ preview หลังตั้ง environment variables
vercel deploy --prod
```

ตรวจ `GET /health` ให้ตอบ `{"status":"ok"}` ก่อน ซึ่ง endpoint นี้ไม่ดาวน์โหลดหรือโหลด TensorFlow/โมเดล จากนั้นอัปโหลดภาพทดสอบผ่านหน้าเว็บจริง คำขอแรกจะดาวน์โหลดโมเดลรวมประมาณ 316 MB และโหลด TensorFlow จึงใช้เวลานานกว่าคำขอถัดไป ไฟล์ใน `/tmp` และโมเดลในหน่วยความจำใช้ซ้ำได้ภายใน Function instance เดียว; instance ใหม่ต้องดาวน์โหลดอีกครั้ง

Vercel Functions จำกัด [request body 4.5 MB](https://vercel.com/docs/functions/limitations) แอปจึงจำกัดภาพไว้ที่ 4 MB เพื่อเผื่อ multipart overhead ส่วนการดาวน์โหลดไฟล์โมเดลจาก Blob เป็นการดึงจากฝั่ง Function ไม่ใช่ request body ของผู้ใช้ เว็บหลักตั้งระยะเวลาคำขอวิเคราะห์ไว้สูงสุด 300 วินาทีสำหรับการโหลดครั้งแรก; ตรวจหน่วยความจำและระยะเวลาคำขอแรกหลัง deploy จริงด้วย

## API ภายใน

- `GET /health`
- `POST /predict` โดยใช้ `multipart/form-data` field ชื่อ `file`
- `POST /predict` และ `POST /models/validate` ต้องส่ง `Authorization: Bearer <token>` เสมอ

โมเดลจำแนกได้ `Healthy`, `Sheath Blight`, `Bacterial Leaf Blight`, `Brown Spot`, `Rice Blast` และ `Neck Blast` เท่านั้น จึงยังไม่รองรับโรคเมล็ดด่าง
