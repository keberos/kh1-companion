"""Render the companion's tabs at the Thor's bottom-screen resolution for the README and releases.

Uses headless Chrome against the dev server (python tools/devserver.py) and the sample saves in
dev/scenarios/ (python tools/make_scenarios.py). The bottom screen is 1240x1080 physical pixels at
density 369, so the page lays out at 537x468 CSS pixels with a 2.31 device scale factor.
Output: docs/screenshots/<tab>.png and bosses.png (the boss sheet), then docs/banner.png from docs/banner.html (which frames the map shot).
Usage:  python tools/make_screenshots.py [--port 8737] [--scenario traverse-town]
"""
import argparse
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "screenshots"
CHROME = [
    Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
]
TABS = ["here", "map", "progress", "level"]  # the Guide tab is hidden for now (companion/app.js SHOW)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8737)
    ap.add_argument("--scenario", default="traverse-town")
    args = ap.parse_args()
    chrome = next(p for p in CHROME if p.exists())
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as profile:
        for tab in TABS:
            url = f"http://localhost:{args.port}/?state=/dev/scenarios/{args.scenario}.json&view={tab}"
            out = OUT / f"{tab}.png"
            subprocess.run([str(chrome), "--headless=new", f"--user-data-dir={profile}", "--hide-scrollbars",
                            "--window-size=537,468", "--force-device-scale-factor=2.3091",
                            "--virtual-time-budget=5000", f"--screenshot={out}", url],
                           check=True, capture_output=True)
            print(out)
        # The boss list lives in a sheet on Here; ?sheet=bosses opens it with the next boss revealed.
        out = OUT / "bosses.png"
        url = f"http://localhost:{args.port}/?state=/dev/scenarios/{args.scenario}.json&view=here&sheet=bosses"
        subprocess.run([str(chrome), "--headless=new", f"--user-data-dir={profile}", "--hide-scrollbars",
                        "--window-size=537,468", "--force-device-scale-factor=2.3091",
                        "--virtual-time-budget=5000", f"--screenshot={out}", url],
                       check=True, capture_output=True)
        print(out)
        banner = ROOT / "docs" / "banner.png"
        subprocess.run([str(chrome), "--headless=new", f"--user-data-dir={profile}", "--hide-scrollbars",
                        "--allow-file-access-from-files", "--window-size=1600,760", "--force-device-scale-factor=1",
                        "--virtual-time-budget=5000", f"--screenshot={banner}", (ROOT / "docs" / "banner.html").as_uri()],
                       check=True, capture_output=True)
        print(banner)


if __name__ == "__main__":
    main()
