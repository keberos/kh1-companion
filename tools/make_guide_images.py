"""Make the setup guide's pictures from screenshots of GameNative 1.3.0 on the AYN Thor (Android 13,
1920x1080 top screen), taken 2026-10-24. If GameNative's screens change, retake them and update
GUIDE_SOURCE in android/app/src/main/java/com/kh1companion/MainActivity.kt, which tells users.

Each picture is a crop of GameNative's own UI with what to tap outlined in gold. Crops stay on
GameNative's menus and dialogs, away from the game's key art. Output goes to
android/app/src/main/assets/guide/, which the setup screen shows step by step.

Take the screenshots with  adb exec-out screencap -p -d <top display id> > shot.png  while
walking through the steps, name them as in SHOTS, then:
Usage:  python tools/make_guide_images.py <folder with the screenshots>
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "android" / "app" / "src" / "main" / "assets" / "guide"
GOLD = (246, 215, 122)
MAX_W = 900

# name: (screenshot, crop box, [highlight boxes]) in screenshot pixels
SHOTS = {
    "gear":            ("game-page.png",      (1570, 462, 1870, 612), [(1597, 482, 1706, 591)]),
    "import-menu":     ("options-import.png", (1100, 120, 1920, 760), [(1150, 515, 1880, 620)]),
    "select-files":    ("import-files.png",   (0, 0, 1920, 560),      [(83, 414, 1837, 506)]),
    "pick-files":      ("picker.png",         (0, 160, 1920, 1040),   [(40, 718, 1900, 852), (40, 886, 1900, 1020)]),
    "copy":            ("import-bottom.png",  (0, 172, 1920, 1060),   [(80, 196, 350, 252), (70, 795, 545, 858), (1576, 928, 1878, 1030)]),
    "edit-container":  ("options-top.png",    (1100, 60, 1920, 560),  [(1150, 270, 1880, 385)]),
    "environment-tab": ("env-tab.png",        (0, 0, 1920, 270),      [(1215, 165, 1484, 262)]),
    "add-variable":    ("env-bottom.png",     (0, 660, 1920, 1040),   [(905, 886, 1015, 996)]),
    "new-variable":    ("new-variable.png",   (590, 160, 1330, 920),  [(640, 412, 1280, 702), (1150, 765, 1265, 850)]),
    "save":            ("unsaved.png",        (0, 0, 1920, 150),      [(1815, 35, 1898, 115)]),
    # optional: start straight into KH1 instead of the collection's launcher
    "general-tab":     ("general.png",        (0, 0, 1920, 770),      [(4, 165, 208, 262), (34, 622, 1888, 762)]),
    "exe-list":        ("exe-list.png",       (0, 130, 1920, 770),    [(40, 470, 1880, 566)]),
}


def outline(img, boxes, offset):
    """Gold rounded outline with a soft glow around each box."""
    ox, oy = offset
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for x0, y0, x1, y1 in boxes:
        gd.rounded_rectangle((x0 - ox - 6, y0 - oy - 6, x1 - ox + 6, y1 - oy + 6), radius=22, outline=GOLD + (200,), width=18)
    glow = glow.filter(ImageFilter.GaussianBlur(10))
    img = Image.alpha_composite(img, glow)
    d = ImageDraw.Draw(img)
    for x0, y0, x1, y1 in boxes:
        d.rounded_rectangle((x0 - ox - 6, y0 - oy - 6, x1 - ox + 6, y1 - oy + 6), radius=18, outline=GOLD + (255,), width=7)
    return img


def main(src):
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (shot, box, highlights) in SHOTS.items():
        img = Image.open(Path(src) / shot).convert("RGBA").crop(box)
        img = outline(img, highlights, box[:2])
        if img.width > MAX_W:
            img = img.resize((MAX_W, round(img.height * MAX_W / img.width)), Image.LANCZOS)
        img.convert("RGB").save(OUT / f"{name}.png", optimize=True)
        print(f"{name}.png {img.size}")


if __name__ == "__main__":
    main(sys.argv[1])
