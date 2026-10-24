"""Dev server for the KH1 companion: serves the page plus a state.json from one of three sources.

  live    (default) the bridge's real file, %LOCALAPPDATA%\\KH1Companion\\state.json
  record  live, and also append every real change to recordings/<timestamp>.jsonl
  replay  play a recording back, controllable from the preview page

  python tools/devserver.py                      # live
  python tools/devserver.py --record             # live + record
  python tools/devserver.py --replay recordings/x.jsonl --speed 4
  python tools/devserver.py --lan                # also reachable from the Thor over Wi-Fi

Open http://localhost:8737/dev/ for the two-screen preview, or / for the bare page.
Recording lines look like {"ts": seconds_since_start, "state": {...}}; heartbeat-only
writes (seq/t changed, nothing else) are skipped.
"""
import argparse
import json
import os
import socket
import threading
import time
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
COMPANION = ROOT / "companion"
DEV = ROOT / "dev"
RECORDINGS = ROOT / "recordings"
DEFAULT_STATE = Path(os.environ.get("LOCALAPPDATA", ".")) / "KH1Companion" / "state.json"


def content_key(state):
    """The part of a snapshot that matters: everything but the heartbeat fields."""
    return json.dumps({k: v for k, v in state.items() if k not in ("seq", "t")}, sort_keys=True)


def read_json(path):
    for _ in range(5):  # the bridge may be mid-swap; on Windows the file can be briefly locked
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return None
        except (PermissionError, json.JSONDecodeError):
            time.sleep(0.02)
    return None


class Source:
    """Holds the current snapshot and the mode it comes from. All access under one lock."""

    def __init__(self, state_path, record):
        self.lock = threading.Lock()
        self.state_path = state_path
        self.mode = "live"
        self.current = None
        self.record_file = None
        self.recorded = 0
        self.frames, self.index, self.playing, self.speed, self.replay_name = [], 0, False, 1.0, None
        self._due = None  # monotonic time the next replay frame is due
        if record:
            RECORDINGS.mkdir(exist_ok=True)
            self.record_file = RECORDINGS / (datetime.now().strftime("%Y%m%d-%H%M%S") + ".jsonl")
        threading.Thread(target=self._live_loop, daemon=True).start()
        threading.Thread(target=self._replay_loop, daemon=True).start()

    # live / record
    def _live_loop(self):
        start, last_key = time.monotonic(), None
        while True:
            time.sleep(0.1)
            if self.mode != "live":
                continue
            state = read_json(self.state_path)
            if state is None:
                continue
            with self.lock:
                self.current = state
            key = content_key(state)
            if self.record_file and key != last_key:
                with self.record_file.open("a", encoding="utf-8") as f:
                    f.write(json.dumps({"ts": round(time.monotonic() - start, 2), "state": state}) + "\n")
                self.recorded += 1
            last_key = key

    # replay
    def load(self, path, speed=1.0):
        frames = [json.loads(line) for line in Path(path).read_text(encoding="utf-8").splitlines() if line.strip()]
        if not frames:
            raise ValueError(f"{path} has no frames")
        with self.lock:
            self.mode, self.frames, self.index, self.speed = "replay", frames, 0, speed
            self.playing, self.replay_name = True, Path(path).name
            self.current = self._stamp(0)

    def _stamp(self, i):
        # Fresh seq/t so the page treats a replayed frame as a live update.
        state = dict(self.frames[i]["state"])
        state["seq"], state["t"] = int(time.time() * 1000) % 2**31, int(time.time())
        return state

    def _replay_loop(self):
        while True:
            time.sleep(0.05)
            with self.lock:
                if self.mode != "replay" or not self.playing or self.index >= len(self.frames) - 1:
                    continue
                gap = (self.frames[self.index + 1]["ts"] - self.frames[self.index]["ts"]) / self.speed
                now = time.monotonic()
                if self._due is None:
                    self._due = now + min(gap, 5.0)  # cap long idle gaps so replays stay watchable
                elif now >= self._due:
                    self.index += 1
                    self.current = self._stamp(self.index)
                    self._due = None

    def control(self, action, value=None):
        with self.lock:
            if action == "live":
                self.mode, self.playing = "live", False
                return
            if self.mode != "replay":
                raise ValueError("not replaying")
            if action == "play":
                self.playing = True
            elif action == "pause":
                self.playing = False
            elif action == "step":
                self.index = min(self.index + 1, len(self.frames) - 1)
            elif action == "back":
                self.index = max(self.index - 1, 0)
            elif action == "seek":
                self.index = max(0, min(int(value), len(self.frames) - 1))
            elif action == "speed":
                self.speed = max(0.25, float(value))
            else:
                raise ValueError(f"unknown action {action}")
            self._due = None
            self.current = self._stamp(self.index)

    def status(self):
        with self.lock:
            return {
                "mode": self.mode,
                "state_path": str(self.state_path),
                "recording": self.record_file.name if self.record_file else None,
                "recorded": self.recorded,
                "replay": self.replay_name, "index": self.index, "count": len(self.frames),
                "playing": self.playing, "speed": self.speed,
                "frame_ts": self.frames[self.index]["ts"] if self.frames else None,
                "state": self.current,
            }


def make_handler(source):
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=str(COMPANION), **kw)

        def log_message(self, fmt, *args):
            pass  # the page polls 4x/second; keep the console readable

        def end_headers(self):
            self.send_header("Cache-Control", "no-store")
            self.send_header("Access-Control-Allow-Origin", "*")
            super().end_headers()

        def _json(self, obj, code=200):
            body = json.dumps(obj).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def translate_path(self, path):
            p = urlparse(path).path
            if p == "/dev" or p.startswith("/dev/"):
                rel = p[len("/dev"):].lstrip("/") or "preview.html"
                return str(DEV / rel)
            return super().translate_path(path)

        def do_GET(self):
            p = urlparse(self.path).path
            if p == "/state.json":
                st = source.status()["state"]
                return self._json(st) if st else self._json({"error": "no state yet"}, 404)
            if p == "/api/status":
                return self._json(source.status())
            if p == "/api/recordings":
                files = sorted(RECORDINGS.glob("*.jsonl"), reverse=True) if RECORDINGS.exists() else []
                return self._json([{"name": f.name, "frames": sum(1 for _ in f.open(encoding="utf-8"))} for f in files])
            if p == "/dev":
                self.send_response(301)
                self.send_header("Location", "/dev/")
                self.end_headers()
                return
            return super().do_GET()

        def do_POST(self):
            p = urlparse(self.path).path
            try:
                body = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)) or b"{}")
                if p == "/api/replay":
                    source.control(body["action"], body.get("value"))
                elif p == "/api/load":
                    name = Path(body["name"]).name  # recordings/ only
                    source.load(RECORDINGS / name, float(body.get("speed", 1)))
                else:
                    return self._json({"error": "not found"}, 404)
                return self._json(source.status())
            except (KeyError, ValueError, OSError) as e:
                return self._json({"error": str(e)}, 400)

    return Handler


def lan_ip():
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        try:
            s.connect(("10.255.255.255", 1))
            return s.getsockname()[0]
        except OSError:
            return "127.0.0.1"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--state", type=Path, default=DEFAULT_STATE, help="bridge output file (live mode)")
    ap.add_argument("--record", action="store_true", help="record real changes to recordings/")
    ap.add_argument("--replay", type=Path, help="recording to play back")
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--port", type=int, default=8737)
    ap.add_argument("--lan", action="store_true", help="listen on all interfaces so the Thor can connect")
    args = ap.parse_args()

    source = Source(args.state, args.record)
    if args.replay:
        source.load(args.replay, args.speed)
    host = "0.0.0.0" if args.lan else "127.0.0.1"
    server = ThreadingHTTPServer((host, args.port), make_handler(source))
    print(f"KH1 companion dev server: {source.mode} mode")
    print(f"  preview  http://localhost:{args.port}/dev/")
    if args.lan:
        print(f"  Thor     http://{lan_ip()}:{args.port}/   (set this as the wrapper's dev URL)")
    print(f"  watching {args.state}" if not args.replay else f"  replaying {args.replay}")
    if source.record_file:
        print(f"  recording to {source.record_file}")
    server.serve_forever()


if __name__ == "__main__":
    main()
