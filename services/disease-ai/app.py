from __future__ import annotations

import os
from secrets import compare_digest

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from inference import predict_image


MAX_FILE_SIZE = 4 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}


def get_allowed_origins() -> list[str]:
    raw_origins = os.getenv("FRONTEND_ORIGINS", "")

    return [
        origin.strip()
        for origin in raw_origins.split(",")
        if origin.strip()
    ]


app = FastAPI(
    title="Rice AI Disease Inference API",
    version="1.0.0",
)

# Next.js เรียก service นี้จากฝั่ง server จึงไม่ต้องเปิด CORS โดยปริยาย
allowed_origins = get_allowed_origins()
if allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def require_api_token(authorization: str | None = Header(default=None)) -> None:
    token = os.getenv("DISEASE_API_TOKEN", "").strip()
    if token and not compare_digest(authorization or "", f"Bearer {token}"):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized",
            headers={"WWW-Authenticate": "Bearer"},
        )


@app.post("/predict", dependencies=[Depends(require_api_token)])
async def predict(file: UploadFile = File(...)) -> dict:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail="รองรับเฉพาะไฟล์ JPG, PNG และ WEBP",
        )

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(status_code=400, detail="ไฟล์ภาพว่าง")

    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="ไฟล์ภาพต้องมีขนาดไม่เกิน 4 MB",
        )

    try:
        return await run_in_threadpool(predict_image, image_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="เกิดข้อผิดพลาดระหว่างประมวลผลโมเดล",
        ) from None
