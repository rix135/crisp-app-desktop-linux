#!/usr/bin/env python3
"""
Build script for Crisp Desktop App — Linux port
Produces a .deb package from the official Windows .nupkg

Requirements:
  pip install asar Pillow
  npm install electron  (or: npm install -g electron)

Usage:
  python3 build.py --nupkg crisp-app-desktop-7.1.0.nupkg
"""

import argparse
import base64
import io
import json
import os
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

try:
    from asar.asar import AsarArchive
except ImportError:
    sys.exit("Missing dependency: pip install asar")

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("Missing dependency: pip install Pillow")


# ─── Config ───────────────────────────────────────────────────────────────────

VERSION = "7.1.0"
ARCH    = "amd64"
PKG_NAME = f"crisp-app-desktop-linux_{VERSION}_{ARCH}.deb"


# ─── Helpers ──────────────────────────────────────────────────────────────────

def img_to_b64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return base64.b64encode(buf.getvalue()).decode()


def generate_tray_icons(base_icon_path: Path) -> dict:
    base = Image.open(base_icon_path).convert("RGBA").resize((22, 22), Image.LANCZOS)
    icon256 = Image.open(base_icon_path).convert("RGBA")

    icons = {
        "tray_normal": img_to_b64(base),
        "app_icon":    img_to_b64(icon256),
    }

    def make_badge(count_str):
        img  = base.copy()
        draw = ImageDraw.Draw(img)
        cx, cy, r = 15, 4, 6
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(232, 55, 55, 255))
        try:
            font = ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 7)
        except Exception:
            font = ImageFont.load_default()
        text = count_str if len(count_str) <= 2 else "9+"
        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text((cx - tw // 2, cy - th // 2 - 1), text, fill="white", font=font)
        return img_to_b64(img)

    for i in range(1, 10):
        icons[f"tray_badge_{i}"] = make_badge(str(i))
    icons["tray_badge_many"] = make_badge("9+")

    return icons


def build_tray_icons_block(icons: dict) -> str:
    lines = ["// Auto-generated tray icons (base64 PNG)", "const TRAY_ICONS = {"]
    for k, v in icons.items():
        lines.append(f'  "{k}": "data:image/png;base64,{v}",')
    lines.append("};")
    return "\n".join(lines)


def patch_background_js(src_path: Path, icons_block: str) -> str:
    """Inject the TRAY_ICONS block into background.js right after imports."""
    content = src_path.read_text()
    marker  = "// Auto-generated tray icons (base64 PNG)\nconst TRAY_ICONS = {"
    if marker in content:
        # Already patched — replace the block
        start = content.index(marker)
        end   = content.index("\n};", start) + 3
        content = content[:start] + icons_block + content[end:]
    return content


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Build Crisp Linux .deb")
    parser.add_argument("--nupkg", required=True, help="Path to the official Windows .nupkg")
    parser.add_argument("--electron", default=None, help="Path to electron binary (auto-detected if omitted)")
    parser.add_argument("--out", default=".", help="Output directory for the .deb")
    args = parser.parse_args()

    nupkg_path = Path(args.nupkg)
    out_dir    = Path(args.out)
    build_dir  = Path("_build")

    if not nupkg_path.exists():
        sys.exit(f"File not found: {nupkg_path}")

    # ── 1. Find electron ──────────────────────────────────────────────────────
    electron_bin = args.electron
    if not electron_bin:
        candidates = [
            "./node_modules/.bin/electron",
            "./node_modules/electron/dist/electron",
            shutil.which("electron"),
        ]
        for c in candidates:
            if c and Path(c).exists():
                electron_bin = c
                break
    if not electron_bin:
        sys.exit("Electron not found. Run: npm install electron")

    electron_dist = Path(electron_bin).resolve().parent
    if not (electron_dist / "chrome-sandbox").exists():
        electron_dist = Path(electron_bin).resolve().parent / "dist"
    print(f"  Electron dist : {electron_dist}")

    # ── 2. Extract nupkg (zip) ────────────────────────────────────────────────
    print("\n[1/6] Extracting nupkg…")
    nupkg_dir = build_dir / "nupkg"
    if nupkg_dir.exists():
        shutil.rmtree(nupkg_dir)
    nupkg_dir.mkdir(parents=True)
    with zipfile.ZipFile(nupkg_path) as z:
        z.extractall(nupkg_dir)

    asar_path = nupkg_dir / "lib" / "net45" / "resources" / "app.asar"
    if not asar_path.exists():
        sys.exit(f"app.asar not found inside nupkg at expected path: {asar_path}")

    # ── 3. Extract ASAR ───────────────────────────────────────────────────────
    print("[2/6] Extracting ASAR…")
    app_dir = build_dir / "app"
    if app_dir.exists():
        shutil.rmtree(app_dir)
    with AsarArchive(asar_path, "r") as a:
        a.extract(app_dir)

    # ── 4. Generate tray icons ────────────────────────────────────────────────
    print("[3/6] Generating tray icons…")
    base_icon = app_dir / "favicons" / "favicon-32x32.png"
    icon_256  = app_dir / "favicons" / "favicon-256x256.png"
    icons     = generate_tray_icons(base_icon)

    # ── 5. Patch source files ─────────────────────────────────────────────────
    print("[4/6] Patching background.js and preload.js…")
    src_dir = Path(__file__).parent

    bg_src  = src_dir / "background.js"
    pre_src = src_dir / "preload.js"

    if not bg_src.exists() or not pre_src.exists():
        sys.exit("background.js / preload.js not found next to build.py")

    # Inject fresh icon data
    icons_block = build_tray_icons_block(icons)
    bg_content  = patch_background_js(bg_src, icons_block)
    (app_dir / "background.js").write_text(bg_content)
    shutil.copy(pre_src, app_dir / "preload.js")

    # ── 6. Repack ASAR ────────────────────────────────────────────────────────
    print("[5/6] Repacking ASAR…")
    new_asar = build_dir / "app.asar"
    with AsarArchive(new_asar, "w") as a:
        a.pack(app_dir)

    # ── 7. Build .deb ─────────────────────────────────────────────────────────
    print("[6/6] Building .deb…")
    deb_root = build_dir / "deb"
    if deb_root.exists():
        shutil.rmtree(deb_root)

    opt      = deb_root / "opt" / "crisp-app"
    res      = opt / "resources"
    usr_bin  = deb_root / "usr" / "bin"
    apps_dir = deb_root / "usr" / "share" / "applications"
    icon_256_dir = deb_root / "usr" / "share" / "icons" / "hicolor" / "256x256" / "apps"
    icon_48_dir  = deb_root / "usr" / "share" / "icons" / "hicolor" / "48x48"  / "apps"
    debian   = deb_root / "DEBIAN"

    for d in [opt, res, usr_bin, apps_dir, icon_256_dir, icon_48_dir, debian]:
        d.mkdir(parents=True)

    # Electron binaries
    for f in electron_dist.iterdir():
        if f.is_file():
            shutil.copy2(f, opt / f.name)
        elif f.is_dir() and f.name in ("locales",):
            shutil.copytree(f, opt / f.name)

    # App
    shutil.copy(new_asar, res / "app.asar")

    # Icons
    icon_data = base64.b64decode(icons["app_icon"])
    (icon_256_dir / "crisp.png").write_bytes(icon_data)
    img48 = Image.open(io.BytesIO(icon_data)).resize((48, 48), Image.LANCZOS)
    img48.save(icon_48_dir / "crisp.png")

    # Launcher
    launcher = usr_bin / "crisp"
    launcher.write_text("#!/bin/bash\nexec /opt/crisp-app/electron "
                        "/opt/crisp-app/resources/app.asar --no-sandbox \"$@\"\n")
    launcher.chmod(0o755)

    # .desktop
    (apps_dir / "crisp.desktop").write_text(
        "[Desktop Entry]\nVersion=1.0\nType=Application\nName=Crisp\n"
        "GenericName=Customer Messaging\n"
        "Comment=Crisp – Plateforme de messagerie client\n"
        "Exec=/usr/bin/crisp %U\nIcon=crisp\nTerminal=false\n"
        "Categories=Network;InstantMessaging;\n"
        "MimeType=x-scheme-handler/crisp;\n"
        "StartupNotify=true\nStartupWMClass=crisp\n"
    )

    # DEBIAN/control
    installed_kb = sum(f.stat().st_size for f in deb_root.rglob("*") if f.is_file()) // 1024
    (debian / "control").write_text(
        f"Package: crisp-app\nVersion: {VERSION}\nSection: net\n"
        f"Priority: optional\nArchitecture: {ARCH}\n"
        f"Installed-Size: {installed_kb}\n"
        "Maintainer: Crisp IM SAS <support@crisp.chat>\n"
        "Description: Crisp Desktop App\n"
        " Application de bureau Crisp pour Linux.\n"
        "Homepage: https://crisp.chat\n"
    )

    # DEBIAN/postinst
    postinst = debian / "postinst"
    postinst.write_text(
        "#!/bin/bash\nset -e\n"
        "chmod 4755 /opt/crisp-app/chrome-sandbox\n"
        "gtk-update-icon-cache -f -t /usr/share/icons/hicolor 2>/dev/null || true\n"
        "update-desktop-database /usr/share/applications 2>/dev/null || true\n"
        "exit 0\n"
    )
    postinst.chmod(0o755)

    prerm = debian / "prerm"
    prerm.write_text(
        "#!/bin/bash\nset -e\n"
        "gtk-update-icon-cache -f -t /usr/share/icons/hicolor 2>/dev/null || true\n"
        "exit 0\n"
    )
    prerm.chmod(0o755)

    # Build
    out_dir.mkdir(parents=True, exist_ok=True)
    deb_out = out_dir / PKG_NAME
    subprocess.run(
        ["dpkg-deb", "--build", "--root-owner-group", str(deb_root), str(deb_out)],
        check=True
    )

    size_mb = deb_out.stat().st_size / 1024 / 1024
    print(f"\n✓ Done! {deb_out}  ({size_mb:.0f} MB)")


if __name__ == "__main__":
    main()
