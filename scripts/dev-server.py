#!/usr/bin/env python3
"""本地开发服务器：静态文件 + /api 反代到后端 5666，避免浏览器跨域 Failed to fetch。"""

from __future__ import annotations

import json
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
BACKEND = "http://127.0.0.1:5666"
PORT = 8080


class DevHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        if self.path.startswith("/api/"):
            self.send_response(204)
            self._send_cors_headers()
            self.end_headers()
            return
        self.send_error(404)

    def do_POST(self) -> None:
        if not self.path.startswith("/api/"):
            self.send_error(404)
            return
        self._proxy("POST")

    def do_GET(self) -> None:
        if self.path.startswith("/api/"):
            self._proxy("GET")
            return
        super().do_GET()

    def _send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _proxy(self, method: str) -> None:
        target = f"{BACKEND}{self.path}"
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length else None
        headers = {}
        if self.headers.get("Content-Type"):
            headers["Content-Type"] = self.headers["Content-Type"]

        req = Request(target, data=body, headers=headers, method=method)
        try:
            with urlopen(req, timeout=15) as resp:
                data = resp.read()
                self.send_response(resp.status)
                self._send_cors_headers()
                ctype = resp.headers.get("Content-Type")
                if ctype:
                    self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
        except URLError:
            payload = json.dumps({"code": 503, "msg": "提交失败，请稍后重试"}, ensure_ascii=False).encode("utf-8")
            self.send_response(503)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

    def log_message(self, fmt: str, *args) -> None:
        sys.stdout.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", PORT), DevHandler)
    print(f"Dev server: http://127.0.0.1:{PORT}")
    print(f"API proxy:  /api/* -> {BACKEND}/api/*")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        server.server_close()


if __name__ == "__main__":
    main()
