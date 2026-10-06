"""Download private model artifacts to the writable runtime cache when needed."""

from __future__ import annotations

import hashlib
import os
import re
import tempfile
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener


# Keep enough /tmp headroom for the validator, one classifier and runtime files.
# Vercel Functions expose at most 500 MB of writable /tmp storage.
MAX_MODEL_BYTES = 300 * 1024 * 1024
CHUNK_BYTES = 1024 * 1024
CACHE_DIR = Path(tempfile.gettempdir()) / "rice-ai-disease-models"
PRIVATE_BLOB_HOST = re.compile(r"^[a-z0-9-]+\.private\.blob\.vercel-storage\.com$")


class _NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        return None


def validate_private_blob_url(url: str) -> None:
    parsed = urlparse(url)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or not PRIVATE_BLOB_HOST.fullmatch(parsed.hostname)
        or parsed.port is not None
        or parsed.username is not None
        or parsed.password is not None
        or not parsed.path.endswith(".keras")
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("Model URL must be an HTTPS URL in a private Vercel Blob store")


def _download_model(url: str, token: str, destination: Path) -> None:
    request = Request(
        url,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/octet-stream"},
    )
    opener = build_opener(_NoRedirects())
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary_path: Path | None = None

    try:
        with opener.open(request, timeout=60) as response:
            if response.status != 200:
                raise RuntimeError("Model download failed")
            content_length = response.headers.get("Content-Length")
            if content_length is not None and int(content_length) > MAX_MODEL_BYTES:
                raise RuntimeError("Model artifact is too large")

            with tempfile.NamedTemporaryFile(
                mode="wb", prefix="model-", suffix=".part", dir=destination.parent, delete=False
            ) as temporary_file:
                temporary_path = Path(temporary_file.name)
                total_bytes = 0
                while chunk := response.read(CHUNK_BYTES):
                    total_bytes += len(chunk)
                    if total_bytes > MAX_MODEL_BYTES:
                        raise RuntimeError("Model artifact is too large")
                    temporary_file.write(chunk)

        if total_bytes == 0:
            raise RuntimeError("Model artifact is empty")
        if content_length is not None and total_bytes != int(content_length):
            raise RuntimeError("Model artifact download is incomplete")
        os.replace(temporary_path, destination)
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


def resolve_model_path(local_path: Path, url_variable: str) -> Path:
    if local_path.is_file():
        return local_path

    url = os.getenv(url_variable, "").strip()
    if not url:
        raise RuntimeError(f"Model file is missing and {url_variable} is not configured")

    cache_group = "validator" if url_variable == "VALIDATOR_MODEL_URL" else "classifier"
    return resolve_model_url(url, local_path.name, cache_group=cache_group)


def resolve_model_url(
    url: str,
    filename: str = "classifier.keras",
    *,
    cache_group: str = "classifier",
) -> Path:
    """Resolve one explicitly selected private model artifact into the runtime cache."""

    validate_private_blob_url(url)

    token = os.getenv("BLOB_READ_WRITE_TOKEN", "").strip()
    if not token:
        raise RuntimeError("BLOB_READ_WRITE_TOKEN is required for private model downloads")

    safe_filename = Path(filename).name
    if not safe_filename.endswith(".keras"):
        raise ValueError("Model filename must end with .keras")
    if cache_group not in {"validator", "classifier"}:
        raise ValueError("Unknown model cache group")

    fingerprint = hashlib.sha256(url.encode()).hexdigest()[:16]
    group_dir = CACHE_DIR / cache_group
    cached_path = group_dir / f"{fingerprint}-{safe_filename}"

    # Only one artifact per role is retained. This prevents the normal release
    # validation flow from filling Vercel's 500 MB /tmp volume.
    group_dir.mkdir(parents=True, exist_ok=True)
    for candidate in group_dir.iterdir():
        if candidate.is_file() and candidate != cached_path:
            candidate.unlink(missing_ok=True)

    if not cached_path.is_file() or cached_path.stat().st_size == 0:
        _download_model(url, token, cached_path)
    return cached_path
