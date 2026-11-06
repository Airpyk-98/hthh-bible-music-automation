#!/usr/bin/env python3
"""
HTHH Bible Hip-Hop Music Automation — Local Kaggle Kernel Push & Firestore Bridge
=================================================================================
- Exposes a local HTTP endpoint (`http://127.0.0.1:8765/trigger`) so the Firebase Web App
  can push Kaggle T4 GPU kernels directly from the browser with zero CORS friction.
- Also polls Firestore `/automations` for any job with `status == "queued"` and automatically
  injects `JOB_ID` and `PAYLOAD_PASSPHRASE` into `kaggle_executor.py` and runs:
  `kaggle kernels push -p <temp_kernel_dir>`
  using the user's Kaggle credentials (either from the encrypted payload or `~/.kaggle/kaggle.json`).
"""

import os
import sys
import json
import time
import math
import base64
import shutil
import hashlib
import tempfile
import threading
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler
import requests

FIRESTORE_PROJECT_ID = "hthh-music-auto-2026"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WORKER_TEMPLATE_DIR = os.path.join(BASE_DIR, "kaggle_worker")
dispatched_jobs = set()


def decrypt_secure_payload(cipher_b64: str, passphrase: str) -> dict:
    if not cipher_b64 or not passphrase:
        return {}
    try:
        raw = base64.b64decode(cipher_b64)
        salt = raw[:16]
        ciphertext = raw[16:]
        out = bytearray(len(ciphertext))
        block_count = math.ceil(len(ciphertext) / 32)
        key_bytes = passphrase.encode("utf-8")
        for b in range(block_count):
            counter_bytes = b.to_bytes(4, byteorder="big")
            digest = hashlib.sha256(key_bytes + salt + counter_bytes).digest()
            start = b * 32
            end = min(start + 32, len(ciphertext))
            for i in range(start, end):
                out[i] = ciphertext[i] ^ digest[i - start]
        return json.loads(out.decode("utf-8"))
    except Exception as exc:
        print(f"[Bridge] Payload decrypt warning: {exc}")
        return {}


def push_kaggle_kernel_for_job(job_id: str, passphrase: str = "", kaggle_username: str = "", kaggle_key: str = "") -> dict:
    """Prepares a temporary kernel directory with JOB_ID injected and pushes to Kaggle T4 GPU."""
    if job_id in dispatched_jobs:
        return {"ok": True, "message": f"Job {job_id} already dispatched"}
    dispatched_jobs.add(job_id)

    # Read local ~/.kaggle/kaggle.json fallback if not provided
    local_kaggle_path = os.path.expanduser("~/.kaggle/kaggle.json")
    if (not kaggle_username or not kaggle_key) and os.path.exists(local_kaggle_path):
        try:
            with open(local_kaggle_path, "r", encoding="utf-8") as f:
                kdata = json.load(f)
                kaggle_username = kaggle_username or kdata.get("username", "")
                kaggle_key = kaggle_key or kdata.get("key", "")
        except Exception:
            pass

    if not kaggle_username or not kaggle_key:
        return {"ok": False, "error": "Missing Kaggle Username or API Key."}

    tmp_dir = tempfile.mkdtemp(prefix=f"hthh_kernel_{job_id}_")
    try:
        # 1. Read template executor and inject JOB_ID and PAYLOAD_PASSPHRASE
        src_py = os.path.join(WORKER_TEMPLATE_DIR, "kaggle_executor.py")
        with open(src_py, "r", encoding="utf-8") as f:
            code = f.read()

        code = code.replace("__INJECT_JOB_ID__", job_id)
        code = code.replace("__INJECT_PASSPHRASE__", passphrase)
        # Also inject default HF token if available in host env so user doesn't even have to type it if already configured
        host_hf = os.environ.get("HF_TOKEN", "")
        if host_hf:
            code = code.replace('os.environ.get("HF_TOKEN", "")', f'os.environ.get("HF_TOKEN", "{host_hf}")')

        dst_py = os.path.join(tmp_dir, "kaggle_executor.py")
        with open(dst_py, "w", encoding="utf-8") as f:
            f.write(code)

        # 2. Write kernel-metadata.json with the active Kaggle username
        meta = {
            "id": f"{kaggle_username}/hthh-bible-music-worker",
            "title": "HTHH Bible Music Worker",
            "code_file": "kaggle_executor.py",
            "language": "python",
            "kernel_type": "script",
            "is_private": True,
            "enable_gpu": True,
            "enable_tpu": False,
            "accelerator": "nvidiaTeslaT4",
            "enable_internet": True,
            "dataset_sources": [],
            "competition_sources": [],
            "kernel_sources": [],
            "model_sources": []
        }
        with open(os.path.join(tmp_dir, "kernel-metadata.json"), "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

        # 3. Push via Kaggle CLI with credentials in environment
        env = os.environ.copy()
        env["KAGGLE_USERNAME"] = kaggle_username
        env["KAGGLE_KEY"] = kaggle_key
        env["PYTHONIOENCODING"] = "utf-8"

        print(f"[Bridge] Pushing Kaggle T4 GPU kernel for Job {job_id} as {kaggle_username}...")
        proc = subprocess.run(
            ["kaggle", "kernels", "push", "-p", tmp_dir],
            env=env,
            capture_output=True,
            text=True,
            timeout=60
        )
        output = (proc.stdout or "") + "\n" + (proc.stderr or "")
        print(f"[Bridge] Kaggle CLI output:\n{output.strip()}")

        if proc.returncode == 0:
            # Update Firestore job milestone to reflect Kaggle T4 kernel booted
            url = f"https://firestore.googleapis.com/v1/projects/{FIRESTORE_PROJECT_ID}/databases/(default)/documents/automations/{job_id}"
            fields = {
                "status": {"stringValue": "running"},
                "progress": {"integerValue": "2"},
                "current_milestone": {"stringValue": f"Kaggle T4 GPU Kernel pushed ({kaggle_username}/hthh-bible-music-worker). Booting container..."},
                "updated_at": {"stringValue": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
            }
            mask = "updateMask.fieldPaths=status&updateMask.fieldPaths=progress&updateMask.fieldPaths=current_milestone&updateMask.fieldPaths=updated_at"
            requests.patch(f"{url}?{mask}", json={"fields": fields}, timeout=8)
            return {"ok": True, "output": output.strip(), "kernel_slug": f"{kaggle_username}/hthh-bible-music-worker"}
        else:
            dispatched_jobs.discard(job_id)
            return {"ok": False, "error": output.strip()}
    except Exception as exc:
        dispatched_jobs.discard(job_id)
        return {"ok": False, "error": str(exc)}
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


class BridgeHandler(BaseHTTPRequestHandler):
    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors()
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self._send_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True, "service": "hthh-kaggle-bridge", "project": FIRESTORE_PROJECT_ID}).encode("utf-8"))
            return

        # Serve static frontend from `public/` so http://localhost:8765 works even when ISP blocks *.web.app IP
        public_dir = os.path.join(BASE_DIR, "public")
        req_path = self.path.split("?")[0]
        if req_path == "/" or req_path == "":
            file_path = os.path.join(public_dir, "index.html")
        else:
            file_path = os.path.join(public_dir, req_path.lstrip("/"))

        if os.path.isfile(file_path):
            ext = os.path.splitext(file_path)[1].lower()
            ctype = {
                ".html": "text/html; charset=utf-8",
                ".js": "application/javascript; charset=utf-8",
                ".css": "text/css; charset=utf-8",
                ".json": "application/json; charset=utf-8",
                ".png": "image/png",
                ".svg": "image/svg+xml"
            }.get(ext, "application/octet-stream")
            self.send_response(200)
            self._send_cors()
            self.send_header("Content-Type", ctype)
            self.end_headers()
            with open(file_path, "rb") as f:
                self.wfile.write(f.read())
        else:
            # SPA Fallback
            idx_path = os.path.join(public_dir, "index.html")
            self.send_response(200)
            self._send_cors()
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            with open(idx_path, "rb") as f:
                self.wfile.write(f.read())

    def do_POST(self):
        if self.path == "/trigger":
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length).decode("utf-8")) if length > 0 else {}
            job_id = body.get("job_id", "")
            passphrase = body.get("passphrase", "")
            cipher_b64 = body.get("payload_cipher", "")

            decrypted = decrypt_secure_payload(cipher_b64, passphrase) if cipher_b64 else {}
            k_user = decrypted.get("kaggle_username") or body.get("kaggle_username", "")
            k_key = decrypted.get("kaggle_key") or body.get("kaggle_key", "")

            res = push_kaggle_kernel_for_job(job_id, passphrase, k_user, k_key)
            self.send_response(200 if res.get("ok") else 500)
            self._send_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(res).encode("utf-8"))
        else:
            self.send_response(404)
            self._send_cors()
            self.end_headers()


def firestore_queue_watcher():
    """Watches Firestore `/automations` for queued jobs that contain `bridge_envelope`."""
    url = f"https://firestore.googleapis.com/v1/projects/{FIRESTORE_PROJECT_ID}/databases/(default)/documents/automations"
    while True:
        try:
            r = requests.get(url, timeout=10)
            if r.status_code == 200:
                docs = r.json().get("documents", [])
                for doc in docs:
                    doc_name = doc.get("name", "")
                    job_id = doc_name.split("/")[-1]
                    fields = doc.get("fields", {})
                    status = fields.get("status", {}).get("stringValue", "")
                    if status == "queued" and job_id not in dispatched_jobs:
                        passphrase = fields.get("bridge_token", {}).get("stringValue", "")
                        cipher_b64 = fields.get("payload_cipher", {}).get("stringValue", "")
                        if passphrase and cipher_b64 and cipher_b64 != "WIPED_AFTER_READ":
                            decrypted = decrypt_secure_payload(cipher_b64, passphrase)
                            k_user = decrypted.get("kaggle_username", "")
                            k_key = decrypted.get("kaggle_key", "")
                            # Wipe bridge_token before pushing
                            patch_url = f"{url}/{job_id}?updateMask.fieldPaths=bridge_token"
                            requests.patch(patch_url, json={"fields": {"bridge_token": {"stringValue": "CONSUMED"}}}, timeout=5)
                            push_kaggle_kernel_for_job(job_id, passphrase, k_user, k_key)
        except Exception:
            pass
        time.sleep(4)


if __name__ == "__main__":
    watcher = threading.Thread(target=firestore_queue_watcher, daemon=True)
    watcher.start()
    port = int(os.environ.get("BRIDGE_PORT", "8765"))
    print(f"[HTHH Kaggle Bridge] Listening on http://127.0.0.1:{port} and watching Firestore project '{FIRESTORE_PROJECT_ID}'...")
    server = HTTPServer(("127.0.0.1", port), BridgeHandler)
    server.serve_forever()
