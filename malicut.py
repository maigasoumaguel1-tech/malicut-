#!/usr/bin/env python3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import os, json

BASE = os.path.dirname(__file__)
HTML = open(os.path.join(BASE, "app.html"), "r", encoding="utf-8").read()

class Handler(BaseHTTPRequestHandler):
    def send_text(self, body, content_type="text/html; charset=utf-8", status=200):
        data = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/":
            self.send_text(HTML)
        elif path == "/config.js":
            url = os.environ.get("SUPABASE_URL", "").strip()
            key = (os.environ.get("SUPABASE_PUBLISHABLE_KEY") or
                   os.environ.get("SUPABASE_ANON_KEY") or "").strip()
            payload = "window.MALICUT_CONFIG=" + json.dumps(
                {"url": url, "key": key}, ensure_ascii=False
            ) + ";"
            self.send_text(payload, "application/javascript; charset=utf-8")
        elif path == "/health":
            self.send_text(json.dumps({"ok": True, "app": "MaliCut V8"}),
                           "application/json; charset=utf-8")
        else:
            self.send_text("Not found", "text/plain; charset=utf-8", 404)

    def log_message(self, fmt, *args):
        print(fmt % args)

def main():
    port = int(os.environ.get("PORT", "10000"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"MaliCut V8 listening on 0.0.0.0:{port}")
    server.serve_forever()

if __name__ == "__main__":
    main()
