"""Exercise the ASGI authorization boundary without loading TensorFlow models."""

from __future__ import annotations

import asyncio
import os
import unittest
from unittest.mock import patch

import app as disease_app

PREDICTION = {
    "status": "Unknown",
    "rice_probability": 0.1,
}
app = disease_app.app


BOUNDARY = "rice-ai-test-boundary"
BODY = (
    f"--{BOUNDARY}\r\n"
    'Content-Disposition: form-data; name="file"; filename="leaf.png"\r\n'
    "Content-Type: image/png\r\n\r\n"
    "fake-image-bytes\r\n"
    f"--{BOUNDARY}--\r\n"
).encode()


async def request(method: str, path: str, token: str | None = None) -> int:
    headers = [(b"content-type", f"multipart/form-data; boundary={BOUNDARY}".encode())]
    if token is not None:
        headers.append((b"authorization", f"Bearer {token}".encode()))

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method,
        "scheme": "http",
        "path": path,
        "raw_path": path.encode(),
        "query_string": b"",
        "root_path": "",
        "headers": headers,
        "client": ("testclient", 1234),
        "server": ("testserver", 80),
    }
    sent = []
    received = False

    async def receive():
        nonlocal received
        if not received:
            received = True
            return {"type": "http.request", "body": BODY, "more_body": False}
        return {"type": "http.disconnect"}

    async def send(message):
        sent.append(message)

    await app(scope, receive, send)
    return next(message["status"] for message in sent if message["type"] == "http.response.start")


class DiseaseApiAuthTests(unittest.TestCase):
    def test_predict_requires_matching_token_when_configured(self):
        with patch.dict(os.environ, {"DISEASE_API_TOKEN": "test-secret"}), patch.object(
            disease_app, "predict_image", return_value=PREDICTION
        ):
            self.assertEqual(asyncio.run(request("POST", "/predict")), 401)
            self.assertEqual(asyncio.run(request("POST", "/predict", "wrong")), 401)
            self.assertEqual(asyncio.run(request("POST", "/predict", "test-secret")), 200)

    def test_health_stays_public(self):
        with patch.dict(os.environ, {"DISEASE_API_TOKEN": "test-secret"}):
            self.assertEqual(asyncio.run(request("GET", "/health")), 200)

    def test_local_predict_stays_available_when_token_unset(self):
        with patch.dict(os.environ, {"DISEASE_API_TOKEN": ""}), patch.object(
            disease_app, "predict_image", return_value=PREDICTION
        ):
            self.assertEqual(asyncio.run(request("POST", "/predict")), 200)


if __name__ == "__main__":
    unittest.main()
