import http.server
import mimetypes
import os
from pathlib import Path
from urllib.parse import urlsplit

mimetypes.add_type("application/javascript", ".js", strict=True)
# AI-generated (Codex): the release gate exercises the exact staged filesystem, not the source.
os.chdir(os.environ.get("CPD_PREVIEW_DATA", str(Path(__file__).resolve().parents[2] / "data")))


class PreviewHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        self._serving_gzip_asset = False
        # AI-generated (Codex): navigation may redirect; APIs/assets never get successful HTML.
        path = urlsplit(self.path).path
        if path == "/api" or path.startswith("/api/"):
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"error":"The local preview does not implement controller APIs"}')
            return None
        if path == "/" or (not os.path.exists(super().translate_path(self.path))
                           and (not os.path.splitext(path)[1] or path.endswith(".html"))
                           and "text/html" in self.headers.get("Accept", "")):
            self.send_response(302)
            self.send_header("Location", "/targets.html")
            self.end_headers()
            return None
        return super().send_head()

    def translate_path(self, path):
        translated = super().translate_path(path)
        # AI-generated (Codex): match controller gzip preference, including paired source files.
        encodings = self.headers.get("Accept-Encoding", "").lower().split(",")
        accepts_gzip = any(item.strip().split(";")[0] == "gzip"
                           and not any(option.strip() in ("q=0", "q=0.0", "q=0.00", "q=0.000")
                                       for option in item.split(";")[1:]) for item in encodings)
        compressed = translated + ".gz"
        if accepts_gzip and os.path.isfile(compressed):
            self._serving_gzip_asset = True
            return compressed
        return translated

    def guess_type(self, path):
        if path.endswith(".gz"):
            path = path[:-3]
        if path.endswith(".js"):
            return "application/javascript"
        return super().guess_type(path)

    def end_headers(self):
        # AI-generated (Codex): mutable release paths must be revalidated after an upgrade.
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        if getattr(self, "_serving_gzip_asset", False):
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Vary", "Accept-Encoding")
        super().end_headers()


port = 8769 if os.environ.get("CPD_RELEASE_TEST") == "1" else 8768
http.server.ThreadingHTTPServer(("127.0.0.1", port), PreviewHandler).serve_forever()
