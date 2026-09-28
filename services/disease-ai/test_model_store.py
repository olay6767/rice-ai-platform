"""Verify private Blob downloads without making network requests."""

from __future__ import annotations

import io
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import model_store


PRIVATE_URL = "https://store123.private.blob.vercel-storage.com/models/validator.keras"


class FakeResponse:
    status = 200

    def __init__(self, data: bytes, declared_length: int | None = None):
        self.stream = io.BytesIO(data)
        self.headers = {"Content-Length": str(declared_length or len(data))}

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        self.stream.close()

    def read(self, size: int) -> bytes:
        return self.stream.read(size)


class FakeOpener:
    def __init__(self, response: FakeResponse):
        self.response = response
        self.calls = []

    def open(self, request, timeout):
        self.calls.append((request, timeout))
        return self.response


class ModelStoreTests(unittest.TestCase):
    def test_private_download_is_streamed_and_cached(self):
        with tempfile.TemporaryDirectory() as temporary_dir:
            cache_dir = Path(temporary_dir) / "cache"
            opener = FakeOpener(FakeResponse(b"model-data"))
            with (
                patch.object(model_store, "CACHE_DIR", cache_dir),
                patch.object(model_store, "build_opener", return_value=opener),
                patch.dict(
                    os.environ,
                    {"VALIDATOR_MODEL_URL": PRIVATE_URL, "BLOB_READ_WRITE_TOKEN": "test-token"},
                ),
            ):
                local_path = Path(temporary_dir) / "validator.keras"
                first_path = model_store.resolve_model_path(local_path, "VALIDATOR_MODEL_URL")
                second_path = model_store.resolve_model_path(local_path, "VALIDATOR_MODEL_URL")

            self.assertEqual(first_path, second_path)
            self.assertEqual(first_path.read_bytes(), b"model-data")
            self.assertEqual(len(opener.calls), 1)
            self.assertEqual(
                opener.calls[0][0].get_header("Authorization"), "Bearer test-token"
            )

    def test_invalid_url_and_missing_token_fail_before_download(self):
        with tempfile.TemporaryDirectory() as temporary_dir:
            missing_path = Path(temporary_dir) / "validator.keras"
            with patch.dict(
                os.environ,
                {
                    "VALIDATOR_MODEL_URL": "http://localhost/validator.keras",
                    "BLOB_READ_WRITE_TOKEN": "test-token",
                },
            ):
                with self.assertRaises(ValueError):
                    model_store.resolve_model_path(missing_path, "VALIDATOR_MODEL_URL")

            with patch.dict(
                os.environ,
                {"VALIDATOR_MODEL_URL": PRIVATE_URL, "BLOB_READ_WRITE_TOKEN": ""},
            ):
                with self.assertRaises(RuntimeError):
                    model_store.resolve_model_path(missing_path, "VALIDATOR_MODEL_URL")

    def test_incomplete_download_cleans_temporary_file(self):
        with tempfile.TemporaryDirectory() as temporary_dir:
            cache_dir = Path(temporary_dir) / "cache"
            opener = FakeOpener(FakeResponse(b"short", declared_length=10))
            with (
                patch.object(model_store, "CACHE_DIR", cache_dir),
                patch.object(model_store, "build_opener", return_value=opener),
                patch.dict(
                    os.environ,
                    {"VALIDATOR_MODEL_URL": PRIVATE_URL, "BLOB_READ_WRITE_TOKEN": "test-token"},
                ),
            ):
                with self.assertRaises(RuntimeError):
                    model_store.resolve_model_path(
                        Path(temporary_dir) / "validator.keras", "VALIDATOR_MODEL_URL"
                    )
            self.assertEqual(list(cache_dir.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
