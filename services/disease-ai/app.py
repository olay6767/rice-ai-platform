from __future__ import annotations

import os
from secrets import compare_digest

from fastapi import Body, Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from inference import (
    CLASS_NAMES,
    PREPROCESS_MODE,
    predict_image,
    validate_classifier_model,
)


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
    if not token:
        raise HTTPException(
            status_code=503,
            detail="DISEASE_API_TOKEN is not configured",
        )
    if not compare_digest(authorization or "", f"Bearer {token}"):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized",
            headers={"WWW-Authenticate": "Bearer"},
        )


@app.post("/predict", dependencies=[Depends(require_api_token)])
async def predict(
    file: UploadFile = File(...),
    x_disease_classifier_url: str | None = Header(default=None),
    x_disease_preprocess_mode: str | None = Header(default=None),
) -> dict:
    if (
        x_disease_preprocess_mode
        and x_disease_preprocess_mode != PREPROCESS_MODE
    ):
        raise HTTPException(
            status_code=409,
            detail="Preprocessing ของโมเดลไม่ตรงกับบริการที่กำลังทำงาน",
        )
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
        return await run_in_threadpool(
            predict_image,
            image_bytes,
            x_disease_classifier_url,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="เกิดข้อผิดพลาดระหว่างประมวลผลโมเดล",
        ) from None


@app.post("/models/validate", dependencies=[Depends(require_api_token)])
async def validate_model(
    payload: dict = Body(...),
) -> dict:
    classifier_model_url = payload.get("classifier_model_url")
    class_names = payload.get("class_names")
    preprocess_mode = payload.get("preprocess_mode")
    if not isinstance(classifier_model_url, str) or not classifier_model_url.strip():
        raise HTTPException(status_code=400, detail="กรุณาระบุ URL ของโมเดล")
    if class_names != CLASS_NAMES:
        raise HTTPException(
            status_code=400,
            detail="Class manifest ไม่ตรงกับลำดับ Class ของระบบ",
        )
    if preprocess_mode != PREPROCESS_MODE:
        raise HTTPException(
            status_code=400,
            detail=f"โมเดลต้องใช้ preprocessing แบบ {PREPROCESS_MODE}",
        )

    try:
        return await run_in_threadpool(
            validate_classifier_model,
            classifier_model_url.strip(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="ไฟล์โมเดลไม่ถูกต้อง หรือจำนวน Class ไม่ตรงกับระบบ",
        ) from None
