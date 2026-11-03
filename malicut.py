#!/usr/bin/env python3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import os, json, time, urllib.request, urllib.error

BASE = os.path.dirname(__file__)
HTML = open(os.path.join(BASE, "app.html"), "r", encoding="utf-8").read()
CALLS_JS = open(os.path.join(BASE, "calls.js"), "r", encoding="utf-8").read()
AI_REQUESTS = {}
STATIC_JS = {name: open(os.path.join(BASE, name), "r", encoding="utf-8").read() for name in ("messages.js", "studio-enhancements.js", "settings-center.js", "ai-assistant.js")}

class Handler(BaseHTTPRequestHandler):
    server_version = "MaliCut"
    sys_version = ""

    def send_text(self, body, content_type="text/html; charset=utf-8", status=200):
        data = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()")
        self.send_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        self.send_header("Content-Security-Policy", "frame-ancestors 'none'; object-src 'none'; base-uri 'self'")
        self.send_header("X-Permitted-Cross-Domain-Policies", "none")
        self.end_headers()
        self.wfile.write(data)


    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if path != "/api/ai/chat":
            self.send_text(json.dumps({"error": "Not found"}), "application/json; charset=utf-8", 404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 2 or length > 24000:
                self.send_text(json.dumps({"error": "Requête trop volumineuse."}), "application/json; charset=utf-8", 413)
                return
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            provider, history = payload.get("provider"), payload.get("history", [])
            if provider not in ("openai", "gemini") or not isinstance(history, list) or not history:
                self.send_text(json.dumps({"error": "Requête invalide."}), "application/json; charset=utf-8", 400)
                return
            messages = []
            for item in history[-10:]:
                if isinstance(item, dict) and item.get("role") in ("user", "assistant") and isinstance(item.get("content"), str):
                    content = item["content"].strip()
                    if content:
                        messages.append({"role": item["role"], "content": content[:4000]})
            if not messages or messages[-1]["role"] != "user":
                self.send_text(json.dumps({"error": "Ajoute un message avant l’envoi."}), "application/json; charset=utf-8", 400)
                return
            auth = self.headers.get("Authorization", "")
            if not auth.startswith("Bearer "):
                self.send_text(json.dumps({"error": "Connecte-toi à MaliCut pour continuer."}), "application/json; charset=utf-8", 401)
                return
            supabase_url = os.environ.get("SUPABASE_URL", "").strip()
            anon_key = (os.environ.get("SUPABASE_PUBLISHABLE_KEY") or os.environ.get("SUPABASE_ANON_KEY") or "").strip()
            if not supabase_url or not anon_key:
                self.send_text(json.dumps({"error": "Authentification du serveur non configurée."}), "application/json; charset=utf-8", 503)
                return
            verify = urllib.request.Request(supabase_url.rstrip("/") + "/auth/v1/user", headers={"apikey": anon_key, "Authorization": auth})
            try:
                with urllib.request.urlopen(verify, timeout=12) as response:
                    identity = json.loads(response.read().decode("utf-8"))
                user_id = identity.get("id")
                if not user_id:
                    raise ValueError("missing user")
            except Exception:
                self.send_text(json.dumps({"error": "Session expirée. Reconnecte-toi à MaliCut."}), "application/json; charset=utf-8", 401)
                return

            # Enforce AI consent on the server too; browser checks alone can be bypassed.
            consent_url = (supabase_url.rstrip("/") + "/rest/v1/account_preferences"
                           + "?select=allow_ai_processing&user_id=eq." + user_id)
            consent_request = urllib.request.Request(
                consent_url,
                headers={"apikey": anon_key, "Authorization": auth, "Accept": "application/json"}
            )
            try:
                with urllib.request.urlopen(consent_request, timeout=12) as response:
                    preferences = json.loads(response.read().decode("utf-8"))
                if not preferences or preferences[0].get("allow_ai_processing") is not True:
                    self.send_text(json.dumps({"error": "Autorisation de traitement IA non activée dans les paramètres de confidentialité."}), "application/json; charset=utf-8", 403)
                    return
            except urllib.error.HTTPError:
                self.send_text(json.dumps({"error": "Impossible de vérifier ton autorisation IA. Aucun message n’a été transmis."}), "application/json; charset=utf-8", 503)
                return
            except Exception:
                self.send_text(json.dumps({"error": "Vérification de confidentialité indisponible. Aucun message n’a été transmis."}), "application/json; charset=utf-8", 503)
                return

            now = time.time()
            recent = [t for t in AI_REQUESTS.get(user_id, []) if now - t < 60]
            if len(recent) >= 10:
                self.send_text(json.dumps({"error": "Limite temporaire atteinte. Réessaie dans une minute."}), "application/json; charset=utf-8", 429)
                return
            recent.append(now)
            AI_REQUESTS[user_id] = recent
            if provider == "openai":
                key = os.environ.get("OPENAI_API_KEY", "").strip()
                if not key:
                    self.send_text(json.dumps({"error": "ChatGPT n’est pas encore configuré sur le serveur."}), "application/json; charset=utf-8", 503)
                    return
                prompt = [{"role": "system", "content": "Tu es l’assistant de MaliCut Studio. Aide clairement à la création vidéo, au montage et au design. Réponds en français sauf demande contraire."}] + messages
                body = json.dumps({"model": os.environ.get("OPENAI_MODEL", "gpt-6-astra"), "input": prompt, "max_output_tokens": 900}).encode("utf-8")
                request = urllib.request.Request("https://api.openai.com/v1/responses", data=body, headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"}, method="POST")
                with urllib.request.urlopen(request, timeout=45) as response:
                    result = json.loads(response.read().decode("utf-8"))
                reply = result.get("output_text", "")
                if not reply:
                    reply = "\n".join(part.get("text", "") for item in result.get("output", []) if item.get("type") == "message" for part in item.get("content", []) if part.get("type") == "output_text")
            else:
                key = os.environ.get("GEMINI_API_KEY", "").strip()
                if not key:
                    self.send_text(json.dumps({"error": "Gemini n’est pas encore configuré sur le serveur."}), "application/json; charset=utf-8", 503)
                    return
                contents = [{"role": "user" if m["role"] == "user" else "model", "parts": [{"text": m["content"]}]} for m in messages]
                body = json.dumps({"system_instruction": {"parts": [{"text": "Tu es l’assistant de MaliCut Studio. Aide clairement à la création vidéo, au montage et au design. Réponds en français sauf demande contraire."}]}, "contents": contents, "generationConfig": {"maxOutputTokens": 900}}).encode("utf-8")
                model = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
                request = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", data=body, headers={"x-goog-api-key": key, "Content-Type": "application/json"}, method="POST")
                with urllib.request.urlopen(request, timeout=45) as response:
                    result = json.loads(response.read().decode("utf-8"))
                reply = "\n".join(part.get("text", "") for candidate in result.get("candidates", []) for part in candidate.get("content", {}).get("parts", []) if part.get("text"))
            if not reply:
                raise ValueError("Réponse vide du fournisseur IA.")
            self.send_text(json.dumps({"reply": reply[:12000]}, ensure_ascii=False), "application/json; charset=utf-8")
        except urllib.error.HTTPError as error:
            error.read(500)
            print("AI provider HTTP error:", error.code)
            self.send_text(json.dumps({"error": "Le fournisseur IA a refusé la requête. Vérifie la configuration et les quotas."}), "application/json; charset=utf-8", 502)
        except Exception as error:
            print("AI request failed:", repr(error))
            self.send_text(json.dumps({"error": "Erreur du service IA. Réessaie plus tard."}), "application/json; charset=utf-8", 502)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/":
            self.send_text(HTML)
        elif path == "/calls.js":
            self.send_text(CALLS_JS, "application/javascript; charset=utf-8")
        elif path in ("/messages.js", "/studio-enhancements.js", "/settings-center.js", "/ai-assistant.js"):
            self.send_text(STATIC_JS[path[1:]], "application/javascript; charset=utf-8")
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
