from __future__ import annotations

import io
import hashlib
import importlib
import json
import os
from pathlib import Path
from threading import Lock
from typing import Any

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from model_store import resolve_model_path, resolve_model_url


BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"

VALIDATOR_MODEL_PATH = Path(
    os.getenv(
        "VALIDATOR_MODEL_PATH",
        MODELS_DIR / "Binary_Set2_ResNet50_best.keras",
    )
)
CLASSIFIER_MODEL_PATH = Path(
    os.getenv(
        "CLASSIFIER_MODEL_PATH",
        MODELS_DIR / "Set2_ResNet50_Finetuned_best.keras",
    )
)
if not VALIDATOR_MODEL_PATH.is_absolute():
    VALIDATOR_MODEL_PATH = BASE_DIR / VALIDATOR_MODEL_PATH
if not CLASSIFIER_MODEL_PATH.is_absolute():
    CLASSIFIER_MODEL_PATH = BASE_DIR / CLASSIFIER_MODEL_PATH
CLASS_NAMES_PATH = BASE_DIR / "class_names.txt"
LABELS_PATH = BASE_DIR / "disease_labels.json"

RICE_THRESHOLD = float(os.getenv("RICE_THRESHOLD", "0.90"))
DISEASE_THRESHOLD = float(os.getenv("DISEASE_THRESHOLD", "0.80"))
PREPROCESS_MODE = os.getenv("PREPROCESS_MODE", "raw").strip().lower()
ALLOWED_PREPROCESS_MODES = {"raw", "rescale_01", "resnet50"}

# ป้องกันภาพที่มีจำนวนพิกเซลสูงผิดปกติและอาจใช้หน่วยความจำมาก
Image.MAX_IMAGE_PIXELS = 30_000_000


def _read_class_names() -> list[str]:
    names = [
        line.strip()
        for line in CLASS_NAMES_PATH.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]

    if len(names) != 6:
        raise RuntimeError(
            f"class_names.txt ต้องมี 6 คลาส แต่พบ {len(names)} คลาส"
        )

    return names


def _read_thai_labels() -> dict[str, str]:
    labels = json.loads(LABELS_PATH.read_text(encoding="utf-8"))

    if not isinstance(labels, dict):
        raise RuntimeError("disease_labels.json ต้องเป็น JSON object")

    return {
        str(label): str(label_th)
        for label, label_th in labels.items()
    }


CLASS_NAMES = _read_class_names()
THAI_LABELS = _read_thai_labels()

if PREPROCESS_MODE not in ALLOWED_PREPROCESS_MODES:
    raise RuntimeError(
        f"PREPROCESS_MODE ไม่ถูกต้อง: {PREPROCESS_MODE}. "
        f"ใช้ได้เฉพาะ {sorted(ALLOWED_PREPROCESS_MODES)}"
    )

if not 0 <= RICE_THRESHOLD <= 1:
    raise RuntimeError("RICE_THRESHOLD ต้องอยู่ระหว่าง 0 ถึง 1")

if not 0 <= DISEASE_THRESHOLD <= 1:
    raise RuntimeError("DISEASE_THRESHOLD ต้องอยู่ระหว่าง 0 ถึง 1")

_validator_model: Any | None = None
_classifier_model: Any | None = None
_classifier_key: str | None = None
_models_lock = Lock()


def _classifier_output_count(model: Any) -> int:
    output_shape = model.output_shape
    if isinstance(output_shape, list):
        raise RuntimeError("Classifier ต้องมี output เดียว")
    if not output_shape or output_shape[-1] is None:
        raise RuntimeError("ไม่สามารถตรวจจำนวน Class ของโมเดลได้")
    return int(output_shape[-1])


def _validate_classifier_contract(model: Any) -> None:
    """Run one real inference batch before a release can be activated."""

    batch = np.zeros((1, 224, 224, 3), dtype=np.float32)
    if PREPROCESS_MODE == "resnet50":
        tf = importlib.import_module("tensorflow")
        batch = tf.keras.applications.resnet50.preprocess_input(batch)

    output = np.asarray(model.predict(batch, verbose=0))
    expected_shape = (1, len(CLASS_NAMES))
    if output.shape != expected_shape:
        raise RuntimeError(
            f"Classifier smoke test ต้องได้ shape {expected_shape} แต่พบ {output.shape}"
        )
    if not np.all(np.isfinite(output)):
        raise RuntimeError("Classifier ส่งค่า NaN หรือ Infinity")
    if np.any(output < 0) or np.any(output > 1):
        raise RuntimeError("Classifier ต้องส่งค่าความน่าจะเป็นระหว่าง 0 ถึง 1")


def _load_classifier(classifier_model_url: str | None = None) -> tuple[Any, str]:
    global _classifier_model, _classifier_key

    model_key = classifier_model_url or "environment-default"
    if _classifier_model is not None and _classifier_key == model_key:
        return _classifier_model, model_key

    with _models_lock:
        if _classifier_model is None or _classifier_key != model_key:
            classifier_path = (
                resolve_model_url(classifier_model_url, "classifier.keras")
                if classifier_model_url
                else resolve_model_path(CLASSIFIER_MODEL_PATH, "CLASSIFIER_MODEL_URL")
            )
            tf = importlib.import_module("tensorflow")
            classifier = tf.keras.models.load_model(classifier_path, compile=False)
            output_count = _classifier_output_count(classifier)
            if output_count != len(CLASS_NAMES):
                raise RuntimeError(
                    f"Classifier output มี {output_count} ค่า "
                    f"แต่ class_names มี {len(CLASS_NAMES)} คลาส"
                )
            _validate_classifier_contract(classifier)
            _classifier_model = classifier
            _classifier_key = model_key
    return _classifier_model, model_key


def _get_validator_model() -> Any:
    global _validator_model
    if _validator_model is not None:
        return _validator_model

    with _models_lock:
        if _validator_model is None:
            validator_path = resolve_model_path(VALIDATOR_MODEL_PATH, "VALIDATOR_MODEL_URL")
            tf = importlib.import_module("tensorflow")
            _validator_model = tf.keras.models.load_model(validator_path, compile=False)
    return _validator_model


def validate_classifier_model(classifier_model_url: str) -> dict[str, Any]:
    classifier, model_key = _load_classifier(classifier_model_url)
    classifier_path = resolve_model_url(
        classifier_model_url,
        "classifier.keras",
        cache_group="classifier",
    )
    digest = hashlib.sha256()
    with classifier_path.open("rb") as model_file:
        while chunk := model_file.read(1024 * 1024):
            digest.update(chunk)
    return {
        "status": "ready",
        "model_key": model_key,
        "class_count": _classifier_output_count(classifier),
        "class_names": CLASS_NAMES,
        "input_shape": [224, 224, 3],
        "preprocess_mode": PREPROCESS_MODE,
        "artifact_sha256": digest.hexdigest(),
    }


def _open_rgb_image(image_bytes: bytes) -> Image.Image:
    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.verify()

        image = Image.open(io.BytesIO(image_bytes))
        image = ImageOps.exif_transpose(image)

        if image.mode in ("RGBA", "LA"):
            rgba = image.convert("RGBA")
            background = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
            image = Image.alpha_composite(background, rgba).convert("RGB")
        else:
            image = image.convert("RGB")

        return image
    except (
        Image.DecompressionBombError,
        UnidentifiedImageError,
        OSError,
        ValueError,
    ) as exc:
        raise ValueError("ไฟล์ภาพไม่ถูกต้องหรือไม่รองรับ") from exc


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    image = _open_rgb_image(image_bytes)
    image = image.resize((224, 224), Image.Resampling.BILINEAR)
    array = np.asarray(image, dtype=np.float32)

    if PREPROCESS_MODE == "rescale_01":
        array = array / 255.0
    elif PREPROCESS_MODE == "resnet50":
        tf = importlib.import_module("tensorflow")
        array = tf.keras.applications.resnet50.preprocess_input(array)

    return np.expand_dims(array, axis=0)


def _to_probability(value: Any) -> float:
    probability = float(value)

    if not 0 <= probability <= 1:
        raise RuntimeError("โมเดลส่งค่าความน่าจะเป็นที่ไม่ถูกต้อง")

    return probability


def predict_image(
    image_bytes: bytes,
    classifier_model_url: str | None = None,
) -> dict[str, Any]:
    batch = preprocess_image(image_bytes)
    validator_model = _get_validator_model()
    classifier_model, _model_key = _load_classifier(classifier_model_url)

    validator_output = validator_model.predict(batch, verbose=0)
    rice_probability = _to_probability(
        np.asarray(validator_output).reshape(-1)[0]
    )

    if rice_probability < RICE_THRESHOLD:
        return {
            "status": "Unknown",
            "message": "กรุณาอัปโหลดภาพใบข้าวที่ชัดเจน",
            "rice_probability": rice_probability,
        }

    probabilities = np.asarray(
        classifier_model.predict(batch, verbose=0)
    ).reshape(-1)

    if probabilities.size != len(CLASS_NAMES):
        raise RuntimeError(
            f"Classifier output มี {probabilities.size} ค่า "
            f"แต่ class_names มี {len(CLASS_NAMES)} คลาส"
        )

    probability_values = [_to_probability(value) for value in probabilities]
    predicted_index = int(np.argmax(probabilities))
    confidence = probability_values[predicted_index]
    disease_en = CLASS_NAMES[predicted_index]
    disease_th = THAI_LABELS.get(disease_en, disease_en)
    result_status = (
        "Rice Leaf" if confidence >= DISEASE_THRESHOLD else "Uncertain"
    )

    response: dict[str, Any] = {
        "status": result_status,
        "rice_probability": rice_probability,
        "prediction": {
            "disease": disease_en,
            "disease_th": disease_th,
            "confidence": confidence,
            "all_probabilities": dict(
                zip(CLASS_NAMES, probability_values, strict=True)
            ),
        },
    }

    if result_status == "Uncertain":
        response["message"] = (
            "ตรวจพบใบข้าว แต่โมเดลยังไม่มั่นใจชนิดโรค "
            "กรุณาถ่ายภาพใหม่ให้เห็นบริเวณอาการชัดเจน"
        )

    return response
