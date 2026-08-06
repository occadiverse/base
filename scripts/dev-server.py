#!/usr/bin/env python3
"""Local static server with cache disabled for HTML/JS/CSS.

Python's built-in http.server does not send Cache-Control. Browsers then keep
stale index.html (and therefore old ?v= asset URLs), so refreshes look broken.

Usage:
  python3 scripts/dev-server.py
  python3 scripts/dev-server.py 8765
"""

from __future__ import annotations

import os
import re
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSET_REF_RE = re.compile(
    r"""(?P<prefix>(?:src|href)=["'])(?P<path>assets/[^"'?]+)\?(?:v=)?(?P<ver>[^"']*)(?P<suffix>["'])"""
)
NO_CACHE_SUFFIXES = (".html", ".js", ".css", ".mjs", ".map")


class DevHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        path = (self.path or "").split("?", 1)[0].lower()
        if path.endswith(NO_CACHE_SUFFIXES) or path in ("", "/"):
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self) -> None:  # noqa: N802
        path = (self.path or "/").split("?", 1)[0]
        if path in ("/", "/index.html"):
            self._serve_index_with_fresh_assets()
            return
        super().do_GET()

    def _serve_index_with_fresh_assets(self) -> None:
        index_path = ROOT / "index.html"
        try:
            html = index_path.read_text(encoding="utf-8")
        except OSError as error:
            self.send_error(404, str(error))
            return

        def replace(match: re.Match[str]) -> str:
            asset_path = match.group("path")
            file_path = ROOT / asset_path
            version = str(int(file_path.stat().st_mtime)) if file_path.is_file() else match.group("ver")
            return f'{match.group("prefix")}{asset_path}?v={version}{match.group("suffix")}'

        html = ASSET_REF_RE.sub(replace, html)
        body = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        sys.stderr.write("%s - %s\n" % (self.address_string(), format % args))


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("127.0.0.1", port), partial(DevHandler, directory=str(ROOT)))
    print(f"Dev server: http://127.0.0.1:{port}/")
    print("Cache-Control: no-store for HTML/JS/CSS. Asset ?v= follows file mtime.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
