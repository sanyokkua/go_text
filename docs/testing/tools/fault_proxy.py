#!/usr/bin/env python3
"""Fault-injection reverse proxy for GoText live testing (see LIVE_TESTING_PLAN.md Appendix C).

Sits in front of a real OpenAI-compatible LLM endpoint (Ollama/LM Studio) and, by default,
passes every request through unmodified (useful for wire-level capture). Toggle its mode via
the control endpoint to make it return a canned faulty response instead, to trigger error codes
that Ollama/LM Studio can't produce natively: `auth`, `rate_limited`, `upstream`,
`empty_completion`.

Usage:
    python3 fault_proxy.py --port 8765 --target http://localhost:11434

Control the active mode (defaults to "passthrough"):
    curl -X POST http://localhost:8765/_control/mode -d '{"mode": "auth401"}'
    curl http://localhost:8765/_control/mode                # read current mode

Modes:
    passthrough      forward everything to --target unchanged (default)
    auth401          HTTP 401 for any request (triggers apperr `auth`)
    ratelimited429   HTTP 429 with Retry-After header (triggers apperr `rate_limited`)
    upstream500      HTTP 500 (triggers apperr `upstream`)
    empty_completion HTTP 200 with {"choices": []} for chat completions (triggers apperr
                     `empty_completion`)

Point a scratch GoText provider's base URL at this proxy (e.g. http://localhost:8765/) for the
P11-T17/T18/T19 test cases, then delete the scratch provider afterward. Leave this script in
place for future runs — it is intentionally kept under docs/testing/tools/, not a scratch dir.
"""

import argparse
import json
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

STATE = {"mode": "passthrough", "target": "http://localhost:11434"}

CANNED_RESPONSES = {
    "auth401": (401, {}, {"error": {"message": "invalid api key", "type": "invalid_request_error"}}),
    "ratelimited429": (429, {"Retry-After": "2"}, {"error": {"message": "rate limit exceeded", "type": "rate_limit_error"}}),
    "upstream500": (500, {}, {"error": {"message": "internal server error", "type": "server_error"}}),
    "empty_completion": (200, {}, {"id": "fault-proxy-empty", "object": "chat.completion", "choices": []}),
}


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status, headers, body):
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        for key, value in headers.items():
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _control(self):
        if self.path != "/_control/mode":
            self._send_json(404, {}, {"error": "unknown control path"})
            return
        if self.command == "GET":
            self._send_json(200, {}, {"mode": STATE["mode"]})
            return
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw or b"{}")
        except json.JSONDecodeError:
            self._send_json(400, {}, {"error": "invalid JSON body"})
            return
        mode = body.get("mode", "passthrough")
        if mode != "passthrough" and mode not in CANNED_RESPONSES:
            self._send_json(400, {}, {"error": f"unknown mode {mode!r}", "known": list(CANNED_RESPONSES)})
            return
        STATE["mode"] = mode
        self._send_json(200, {}, {"mode": STATE["mode"]})

    def _forward(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length else b""
        target_url = STATE["target"].rstrip("/") + self.path
        req = urllib.request.Request(target_url, data=body or None, method=self.command)
        for key, value in self.headers.items():
            if key.lower() not in ("host", "content-length"):
                req.add_header(key, value)
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                self._relay(resp.status, resp.getheaders(), resp.read())
        except urllib.error.HTTPError as exc:
            self._relay(exc.code, exc.headers.items() if exc.headers else [], exc.read())
        except urllib.error.URLError as exc:
            self._send_json(502, {}, {"error": f"proxy could not reach target: {exc.reason}"})

    def _relay(self, status, headers, raw_body):
        self.send_response(status)
        for key, value in headers:
            if key.lower() not in ("transfer-encoding", "content-length", "connection"):
                self.send_header(key, value)
        self.send_header("Content-Length", str(len(raw_body)))
        self.end_headers()
        self.wfile.write(raw_body)

    def _handle(self):
        if self.path.startswith("/_control/"):
            self._control()
            return
        mode = STATE["mode"]
        if mode == "passthrough":
            self._forward()
            return
        status, headers, body = CANNED_RESPONSES[mode]
        self._send_json(status, headers, body)

    def do_GET(self):
        self._handle()

    def do_POST(self):
        self._handle()

    def log_message(self, format, *args):  # noqa: A002 - stdlib signature
        print(f"[fault_proxy] {self.address_string()} {format % args}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--target", default="http://localhost:11434", help="real provider base URL to forward to")
    args = parser.parse_args()
    STATE["target"] = args.target

    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"fault_proxy listening on http://127.0.0.1:{args.port}, forwarding to {args.target}")
    print("set mode: curl -X POST http://127.0.0.1:%d/_control/mode -d '{\"mode\": \"auth401\"}'" % args.port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
