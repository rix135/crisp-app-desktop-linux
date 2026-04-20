# Crisp Desktop App — Linux

Unofficial Linux port of the [Crisp](https://crisp.chat) desktop app (v7.1.0).

The official app only ships for Windows and macOS. This port patches the
Electron main process to add full Linux support.

## Features

- System tray icon (minimize to tray on close)
- Unread message badge on tray icon (1–9, then 9+)
- Click on system notification → focuses the app
- No menu bar (File/Edit/View removed)
- App icon in taskbar

## Install

Download the latest `.deb` from [Releases](../../releases):

```bash
sudo dpkg -i crisp-app-desktop-linux_7.1.0_amd64.deb
```
Then launch from your app menu or run crisp in a terminal.

Build from source
Requirements: Node.js ≥ 20, Python 3 with Pillow
```
git clone https://github.com/YOUR_USERNAME/crisp-app-desktop-linux
cd crisp-app-desktop-linux
npm install electron
python3 build.py
```

Disclaimer
This is an unofficial port, not affiliated with Crisp IM SAS.
All rights to the Crisp application belong to Crisp IM SAS.

---
