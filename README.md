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
