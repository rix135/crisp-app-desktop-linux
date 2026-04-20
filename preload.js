/*
 * This file is part of crisp-app-desktop
 *
 * Copyright (c) 2019 Crisp IM SAS
 * All rights belong to Crisp IM SAS
 */

"use strict";

/**************************************************************************
 * IMPORTS
 ***************************************************************************/

var contextBridge = require("electron").contextBridge;

var ipcRenderer = require("electron").ipcRenderer;
var platformShell = require("electron").shell;

var corsOverloaded = false;

/**************************************************************************
 * CONSTANTS
 ***************************************************************************/

// Create shared APIs, allowing to not access node integration from main \
//   renderer
contextBridge.exposeInMainWorld("CommonPlatformBridge", {
  getOS: () => {
    return process.platform;
  },

  isFullScreen: () => {
    return ipcRenderer.invoke("is-full-screen");
  },

  quit: () => {
    ipcRenderer.invoke("quit");
  },

  setMenu: (menuTemplate) => {
    ipcRenderer.invoke("set-menu", menuTemplate);
  },

  overrideDialog: () => {
    ipcRenderer.invoke("override-dialog");
  },

  openDevTools: () => {
    ipcRenderer.invoke("open-dev-tools").catch((_error) => {
      alert(`Error opening DevTools: ${_error}`);
    });
  },

  overrideCors: (origin) => {
    if (corsOverloaded === true) {
      return;
    }

    // Security: Do not execute if CORS is already initialized.
    corsOverloaded = true;

    ipcRenderer.invoke("override-cors", origin);
  }
});

contextBridge.exposeInMainWorld("DockPlatformBridge", {
  setUnreadCounter: (unreadCount) => {
    ipcRenderer.invoke("set-unread-counter", unreadCount);
  }
});

contextBridge.exposeInMainWorld("LinksPlatformBridge", {
  openExternal: (url) => {
    platformShell.openExternal(url);
  },
  loadURL: (url) => {
    return ipcRenderer.invoke("load-url", url);
  }
});

contextBridge.exposeInMainWorld("PermissionsPlatformBridge", {
  askForMediaAccess: (media) => {
    return ipcRenderer.invoke("ask-for-media-access", media);
  },
  askForDesktopCapture: () => {
    return ipcRenderer.invoke("ask-for-desktop-capture");
  }
});

contextBridge.exposeInMainWorld("UpdaterPlatformBridge", {
  createUpdater: (feedUrl, callback) => {
    return ipcRenderer.invoke("create-updater", feedUrl).then(() => {
      ipcRenderer.on("update-downloaded", callback);
    });
  },

  quitAndInstall: () => {
    ipcRenderer.invoke("quit-and-install");
  }
});

// Linux: expose notification click handler to be called by injected script
if (process.platform === "linux") {
  contextBridge.exposeInMainWorld("__crisp_notification_clicked", () => {
    ipcRenderer.invoke("notification-clicked");
  });
}

contextBridge.exposeInMainWorld("WindowPlatformBridge", {
  trackWindow: (callback) => {
    ipcRenderer.on("window-state-changed", (event, state) => {
      callback(state);
    });
    ipcRenderer.invoke("start-window-tracking");
  },

  restore: (width, height, minimumWidth, minimumHeight) => {
    ipcRenderer.invoke("restore-window", { width, height, minimumWidth, minimumHeight });
  },

  disableZoom: () => {
    require("electron").webFrame.setVisualZoomLevelLimits(1, 1);
  },

  show: () => {
    ipcRenderer.invoke("show-window");
  },

  hide: () => {
    ipcRenderer.invoke("hide-window");
  }
});
