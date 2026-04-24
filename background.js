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

const electron = require("electron");
const {
  app,
  autoUpdater,
  protocol,
  shell,
  BrowserWindow,
  Tray,
  Menu,
  Notification,
  nativeImage,
  ipcMain,
  dialog,
  systemPreferences,
  desktopCapturer
} = electron;

const { readFile, writeFileSync, existsSync, readFileSync } = require("fs");
const { URL } = require("url");
const os = require("os");
const path = require("path");
const childProcess = require("child_process");
// @ts-ignore
const contextMenu = require("electron-context-menu");
// @ts-ignore
const Badge = process.platform === "win32" ? require("electron-windows-badge") : null;

/**************************************************************************
 * TRAY ICONS
 ***************************************************************************/

// Auto-generated tray icons (base64 PNG)
const TRAY_ICONS = {
  "tray_normal": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAABhklEQVR4nN2UvU4bURCFv7O7YAESQhHix1BQ0EQ8GC0FD5CSV+CRItFTURBIbCASRYQsJOyTYmfItbOR7BCaHGk0d/fec2Z2Zu7CO0GLHLat4CQvvQFLmnQK2646SACTkvQeGa8DH4AtoA/shT8ABpJObUuSVZCW41BJ2g/rAzvAJrABLHfEvZJ0mA+N7VrSGDgCPgNL8yQPTApfAT3bK5JGttXEJsAjbWkMjGeEuppWF0EUJdoARoCqGeHHgtQUVkdWpXgZFGA1xCEOJ36EcGaxCHJitjJYJcnRyQnw/Y3C26/CsUh/95fCid1cNBkh/HABkZwKgJfwmfGrcOIbv0YoJyPJNdONK/uTE/LxT8KDIHddgDKIgC/AfXBuga/AReyPmxnCAHgCHmgbOQRugGfghPaTl4Az4JOk567okqZ7ZHvF9q7t3m+p2sducW17Ld5VtmvbTViWZLoUkka0Nyd/kXkpKknntg+BS0lPthtJL8wD20rr2KvKc3MJzov49H8r+v/jJ0DIp0CuOuQeAAAAAElFTkSuQmCC",
  "app_icon": "data:image/png;base64,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",
  "tray_badge_1": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAABq0lEQVR4nN2UPW7bQBCFv0dSDgx3KULbcecggJDCpQX4Du5zgrQ5QkpfQQcyQALpVefHsZQESGUYhiy+FNx1SGalyICrPGCw5M7M28eZWYpHYH566n/F7Ne1ALKnJO3GqbtpO+vsPfgWk8lyWwERPcWSGkmrYPfRhkmj8ZiyqiiritHJSZK46KjdAQ6BF2F9CRwBR4vJpJe0nM1YnJ1RXl6uVVzYziWtgDdADYy2+9jNKIDYlF+0dTWwSsQ9CtmAOJLngawAirKq+qccHz+U4fl0yu75ec9fVlUu25LkMBEz4DXQkBjFYa1T2K9r2c6zQCpJDfAz+JMzO1Se8L8Nj4qq4rrYRLyJPOwfxPfYlHgZ5hsl9UmajoBl4CqHxBHfQnDDn8mIyTn9m9rtQR7W8Tri65C8s0ZsPETAZ+B7yPkKXAEfg39VDBKugRvgB20j58AX4A54D9zTXqAL4IOku9Tpkvo9sr1r+8D2s7+k2u/c4pPtvbCX2c5tF8FiSfqlkHQL3IYk0dZRQCZpavsVMJN0Y7tI/aCSsK1oCV/WjduKcFuET39a0v8fvwGgYL1jJ1FV/wAAAABJRU5ErkJggg==",
  "tray_badge_2": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAB3UlEQVR4nN2UvU4bURCFv7O7OAkJUhAShoSOKFKUGrGPwBuApXQUafMIKVNQIHd5EV6AAhulp3b+sPOjFBEiBNsnhe+FXXtxHIkqRxrd3TszZ869M7viH9Dd3PTfYlbabQEkt0lajFNx03ZS2Lvy9fL8clYBESXFkoaSBsH60caT5nd2qLdaLB8e8nBvD83NTRBfqbJdAx4By2F9DKwBa708f1GlqpbnLO7v8317m36nU/JltlNJA+A50AYmy1cddWGBB7u7/Do4mCAFyIDYlB/hBAYGFXHXpEtLLDab/D4+5mezWV14jDiSp4EsA7J6q1VKuru1Rba+znyjQf3oiNrGRslfb7VS2ZYkh4k4AZ4CQypGsZfnleqKWGm3ZTtNAqkkDYFvwV85s+PKK/yN8KioKq69acTTyMP+anyPTYlj150qqUwyLAi4DFz1ceKIzyF4yPVkxOSU8pda7EEa1mc3EZ+G5NoNYmMRAe+BLyHnI/AJeBf8g2ws4RQ4A74yamQX+ABcAK+APqMP6A3wWtJFVXVJ5R7Zvmd71fadCan2S4/QsX0/7CW2U9tZsHgl5auQdA6chyQxukcBiaS3tp8AJ5LObGdVP6hK2Fa0Cl9SjJuJcFaEo98u6f+PP2c+yyxpsqMhAAAAAElFTkSuQmCC",
  "tray_badge_3": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAB5UlEQVR4nN2UP0/bYBDGf2c7CRWVUIdiaBmrSlUXNjwgsSCx8AUqwYgYWPoBGDIwdGXs5wEkR+qKmPuXpJSiDAiiED8d8r6RHTtpKjH1kU5n3733vI/vTjb+Ae21Nf3tzFKrZQDBY5Lmz1k+KCnIxUa5TpL0ZxXgUVBsZpmZDZw9eBsvamxsEKcpiycnPDs+xmq1EvFIlaQ68AJYdP4lsAKsdJJkp0rV3NYWC80mV9vbZNfXhVwkKTSzAfAWaAHl6yuwcHTE3OYmvdNTsm63lA8AP5Qb9wUCHsashO7hIb/39misr1NfXS3lozHiG+A5EJJrU5ymdJJkVPT04ID53V10f0/v7Iz++XmBNE7T0CSZmcltxAXwGsioWMU8+SQstVomKQwcqZlZBvxy+cqdjdN0Kmmcpu/co3lV3nemEU8jd/Fl/x75G5xvT5VUJMlyAvqOKx4n9vjhDmfAwMV8cWGgFGcQOv9mEvGlK65PEOsvMeAL8NPVfAO+A59cfhCNFVwCt8AVw0G2ga9AD3jPcKdrwAegaWa9qtvNrDgjSU8kLUtqlKRK+xris6R5FwskhZIiZ74lxVaY2R1w54qMYR8NCMzso6RXwIWZ3UqKqn5QlZBk3ipyQf7cTISzwn3645L+//gD6nLU2hS6Kd8AAAAASUVORK5CYII=",
  "tray_badge_4": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAB0UlEQVR4nN2UzU4TURTHf/+ZSlONSmKwoGxIjInxAeiC8AgkLFjIC7gjLlm6dM3OF+AReIZpYsKShWz8pEUNIYQQpJ2/i96LM+201ISVJzm5M+fjd889586If5DO8rJviplvtwWQ3Ca0GKei0XZSsF37uq3W1bQFRClVLCmX1A/ai1qZODvL3N4ej3Z3K8G1QrUzwBPgcVifAovAYrfVGkl8sL3N7/19aktL1WDbqaQ+8BJoA3duOmZjbY3e4SH56el4MBCHcsKgrwb6404GUF9Zob66ev1+f2uLs52dUoJsS5JtPwQ+AnMBXhpsVTvubmzQWF/n1+Zmyd7MsrQIToAD4DmQU3EVq+DDMt9uy3aaBKgk5cDP4K+8s80smwhtZtmr8KhYVVy7k8CT4MG+EN/jUGI/OxNLKkPyQgFXgdUcBkf5HoJz/t6MmJxSHmhxBmlYX4wDH4XkmTHFxk0EfAaOQ85X4BvwIfj7taGEI+Ac+MFgkB3gC3AJvAF6DD6gd8BbSZdVu0sqz8h2w/aC7fpIqfZrD+ST7XvBlthObdeCxpaUWyHpArgISWLQRwGJpPe2nwEHks5t18b9oEbEtqJW+JJi3FTAaSUc/Xah/7/8AeR3yf1Qgl0OAAAAAElFTkSuQmCC",
  "tray_badge_5": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAB1UlEQVR4nN2UP08bQRDFf+/u7ChJlwJDQhkhRSkoEMLim0Q0SBRpU1GnzFdIwaehOQvTIUGbv+AkIkIIITD2S3G71t35cByJKk8a7d3Mztu3s7Mr/gFnGxv+25zFXk8AyUOSluep7LSdlHyT2KDbHc4rIKKiWNJY0ijYXbR6Unt9nU6eT4w0nSLOSmrbwHNgIYwvgGVgedDtTiUOT044396+V3FmO5U0Al4DPaA1z1ZbKyss7O8zPDriYneX8eVlJZ4A8VB+U9TVwF3NKrg9OGCwucn5zg7t1VVaa2tTC9eJI3lKUaYMyDp5Xkl6srVFJ895trfHbb/P7eFhJd7J81S2JcmhI46BFWBMQys21bqOxV5PttMkkErSGPgV4o09W1feEH8TPhVVxXEwi3gWefAvxf/YbvEynM2UVCUZlwQMA1enThzxPUweA6Pgi8kp1ZtaPoN4Q17dR3waktv3iI2LCPgM/Ag5X4FvQD/ER1kt4RS4An5SHOQZ8AW4Ad5R9HQL+AC8l3TTtLqk6hnZfmx7yfajKan2Wxf4ZPtp8CW2U9tZsMmjUSmFpGvgOiSJoo4CEkkfbb8EjiVd2c6aHqhG2Fa0hlhSnjcX4bwIW39Y0v8ffwA4CtUp7o+RJAAAAABJRU5ErkJggg==",
  "tray_badge_6": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAB4ElEQVR4nN2UvU7cQBSFv2ub3UQrpUFigSBREEWK8gBsQUPBQ6SANi0VokyZV0hHyxPQQG9LKeiok82G3cSINAgI2CeFZyL/sWwkqhzpauz7c+b4zh0b/4Dx+roey1lMEgMInpK0nGdlp6Sg5PsbmwwGd7MK8KgoNrPczDJn996aVQEv9vdZODmhH8dEq6uNlKiktgMsAwtufQmsACuTwaBS9Gxri+7mJhc7O2SjUaviSFJoZhnwFkiAucc+M1pbA4n5gwOyNOXX3h7ZcNhohT+US4q+CrivWQXZeIx1Olxsb2O9Ht2NjcbmdWJPHlK0KQKifhxXim6Ojvh9esr84SF5mnJzfFyJ9+M4NElmZnITcQa8BnJaRrHe6zYsJolJCgNHamaWA6mLt85sXXlL/J17NK/Kr5NpxNPInX/Jv/tx85dhPFVSlSQvCbhzXP06scd3l5wDmfP54pDqTS2fQejWNw8Rn7vizgNi/SYGfAV+uJpvwAj47OJZVCs4B66AnxQHOQaGwC2wSzHTc8BH4IOZ3bbtbmbVM5L0XNKSpG5DqvReBb5I6jlfICmUFDnzLam2wsyugWtXZBR9NCAws0+SXgFnZnYlKWr9QbVBknlriQXlvJkIZ4X79Kcl/f/xBy4e2KJPPua9AAAAAElFTkSuQmCC",
  "tray_badge_7": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAABw0lEQVR4nN2UvWobQRSFv7O7lggOKSM7cWVCIKR04QU3fgPXgbhO4Saly5R5hbyCceO3WEF61/m1lBgCBkcIW3tSaEbsnxUFXOXA5e7enzNnZu6u+AeMdnf9t5qN4VAAyX2SVutUDdpOKrFFbpznN6sKiKgpllRKmgW7jdZsenh0xKAoFtbf22sRL1TZ7gFPgMfBPwW2gK1xnr/uUtXf3+fR8TGXBwd4Oq3lMtuppBnwEhgCa6tud/3wkN8nJy1SmB9FvJRfYQcGbhvWQm9nh2x7m8npaeeiTeJIngJZtEFRdKqdnJ1RXl21coOiSGVbkhwm4hx4DpR0jOI4zzvVVbExHMp2mgRSSSqBy5DvnNku5Y38q/CoqCr68TLiZeQhvhnfs7hC8KOlkuokZUXATeAaNIkjvofiEpiFWGxOqX+p1TtIg39xF/FFaO7dITYuIuAz8CP0fAW+AR9DfpY1Gi6Aa+An84scAV+AKfCW+UyvAe+Bd5LaXwYgqX5Hth/Y3rTdb0m133iOT7bXQyyxndrOgsUjqR+FpAkwCU1ifo4CEkkfbD8DziVd2866flCdsK1oHbmkWrcS4aoIW79f0v8ffwCpAM5782GlBAAAAABJRU5ErkJggg==",
  "tray_badge_8": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAB5klEQVR4nN2Uv27TUBTGf8d2SoAOFZFIO7TKgFARnWleoHuGLkjdqcTCI7DBK7B0YWnVx2iHuKJrM/On1IEKhqqq0tT+GHIvsh0nAdGJTzq69jn3fPfzOcfX+Ask6+uatWcxjg0guE3S/D7LOyUFOd/vWL/dHv6pAI+CYjPLzCx1duOtnBSurNDY3eXhwQEPdnYIFhYmE0uak9SS9ExSR9JLSW8kvS8n1dbWCObn+bG1RW11lajVGiOOJIVmlgJPgRiozfrM66MjtL1NY2+P4ckJw16vUrFvyk9GdRVwU7IC7m1uoosLzjsdouVl6hsbM4k9eQhE3prdbiFpcHiI1es09vdJk4Tr4+NCvNnthibJzExuInrAYyCjYhT77XZ1bXJYjGOTFAaO1MwsA85dvHJmy8or4s/do3lVfu1PI55G7vxL/j3yJ7g1mSqpSJLlBAwdV7NM7PHVbc6A1Pl8ckjxT833IHTrk0nEZy55boJYf4gBn4BvLucLcAp8cPE0KiWcAZfAd0aNTIDPwAB4xWima8Bb4LWZDapON7NijyTdlbQk6c6YVOmFRvgo6b7zBZJCSZEzX5JiKczsCrhyScaojgYEZvZO0iOgZ2aXkqKqC6oSksxbRSx/YY3F/wnu02+X9P/HL+ej5sHAfdy9AAAAAElFTkSuQmCC",
  "tray_badge_9": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAB6ElEQVR4nN2Uv07bUBTGf8d2QG0l1AqJhJaxilT1AYgE7wBrHwCxdmJg6tiFha0DGxIPkYHVFpXYYGLoXxKKWoYgAkn8dfC9le2aJJWY+klH1z5/vvvdc49t/AM6y8ualNNIEgMIHpI0n2d5p6Qg5/sT67Zag2kFeBQUm1lqZiNnQ2/loqjZZP7ggIXDQ+a2t8GsnEKUUzsDPAcW3PoCWAKWuq1Woejx+jrq9fi5scH8/j79dpu7o6MisaTQzEbAayABapOO2W+3mVtZ4dnuLur3CRuNylb4S/lF1lcBw5IVcHd8zOXaGldbW1itxvDsbCKxJw/J2hQBUT2OC0Wzq6vU45inOzv09vYYnJwU4vU4Dk2SmZncRJwCTSClYhTLva5CI0lMUhg4UjOzFLh08cqZLSuviL9xj+ZV+bU7jngcufMv+nc/bn4QO2MlFUnSnICB46qXiT2+u+QUGDmfLw4pfqn5Owjd+uo+4nNXPHOPWL+JAZ+BC1fzFfgGfHTxUVQqOAeugR9kF9kBvgC3wFuyma4B74F3ZnZbtbuZFe9I0iNJi5Jm/5IqbSrDJ0lPnC+QFEqKnPmWFFthZjfAjSsysj4aEJjZB0kvgVMzu5YUVf2gKiHJvFXEgnzeVITTwh39YUn/f/wGHxna47hQ5tQAAAAASUVORK5CYII=",
  "tray_badge_many": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAACCUlEQVR4nN2UP08bQRDFf3NnIAlSFAUJQ0KRIrIUiSaVr6Cld5uGzgoFRWqqFBRp+AAu6JD4EC5ozyI1FKny1+cQHEUyMmD7Xgp2zR3YhkhUedJo72Zn3r6bmT3jH5CUy7otZqHRMIDgPkmzcZZ1SgoyvuFeK4p6dxXgkVNsZqmZDZz1vQEUSiXm9vaY39/n8eYm2JWm2bU1Hqyu5ogLGbXTwDNg3q3PgSVgqRVFPKpUUKdDu1plbneXs3qdi4OD8ZIlhW59LelCI5CUy2qvr6ufJBqcnCjtdvVna0vtjY0bsceVipJyWSYpMLNU0gvgExACg+zhrSgaftnU8jJPazXa1Sq9w8NhKQbNJmf1eq7Gvtu/nZkjL3grxjEzKysU45gn29t0dnaGpKNQjOPQJJmZyU3EEVACUkaMYiuKxtfUYaHRMElh4EjNzFLgly/9GCUTSYtx/MY9mlfl19Yk4knkzr/o331T/FAmEyXlSdKMgJ7jKl4n9vjhglOuJsMnh+RvarYHoVtfjSNuuuTpMWL9IQZ8AX66nG/Ad+Cj2x8UriU0gVPgmMtGJsBX4Bx4B/SBKeAD8N7Mzkedbmb5Hkl6KGlR0swNqdJbd7k+S5p1vkBSKKngzJckXwoz6wJdl2Rc1tGAwMxqkl4CR2Z2Kqngf1C3QpJ5G7EXZOPuRHhXuE+/X9L/H38BXc4f9xrm6GwAAAAASUVORK5CYII=",
};

/**************************************************************************
 * CONSTANTS
 ***************************************************************************/

// Catch current environment
const ENVIRONMENT = "__CRISP_ENVIRONMENT__";

const UPDATE_INTERVAL = 21600000; // 6 hours
const UPDATE_QUIT_DELAY = 4000; // 4 seconds

/**************************************************************************
 * INSTANCES
 ***************************************************************************/

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let __window;

let __updateInterval;

// Linux tray icon
let __tray = null;

// Linux app icon path (written to temp on startup)
let __linuxIconPath = null;

// Persistent config (stored in userData)
let __config = { startMinimized: false };

var loadConfig = function() {
  try {
    const _configPath = path.join(app.getPath("userData"), "crisp-linux-config.json");
    if (existsSync(_configPath)) {
      __config = Object.assign(__config, JSON.parse(readFileSync(_configPath, "utf8")));
    }
  } catch {
    // Ignore
  }
};

var saveConfig = function() {
  try {
    const _configPath = path.join(app.getPath("userData"), "crisp-linux-config.json");
    writeFileSync(_configPath, JSON.stringify(__config, null, 2));
  } catch {
    // Ignore
  }
};

/**************************************************************************
 * CONFIGURATION
 ***************************************************************************/

// Standard scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } }
]);

// Linux: link the running process to crisp.desktop so the taskbar shows the icon
if (process.platform === "linux") {
  app.setName("Crisp");
  if (app.setDesktopFileName) {
    app.setDesktopFileName("crisp.desktop");
  }
}

// Crash silently (Squirrel.Windows may warn in some cases)
process.on("uncaughtException", () => {});

/**************************************************************************
 * METHODS
 ***************************************************************************/

// Creates a child process
var spawn = function(command, args) {
  let _spawnedProcess;

  try {
    _spawnedProcess = childProcess.spawn(command, args, { detached: true });
  } catch {
    // Ignore
  }

  return _spawnedProcess;
};

// Spawns updater on window
var spawnUpdate = function(args, callback) {
  let _updateExe = path.resolve(
    path.dirname(process.execPath),
    "..",
    "Update.exe"
  );

  spawn(_updateExe, args).on("close", callback);
};

var windowsLaunch = function() {
  let _cmd = process.argv[1],
    _target = path.basename(process.execPath);

  // Install or update command?
  if (_cmd === "--squirrel-install" || _cmd === "--squirrel-updated") {
    spawnUpdate([`--createShortcut=${_target}`], app.quit);

    return true;
  }

  // Uninstall command?
  if (_cmd === "--squirrel-uninstall") {
    spawnUpdate([`--removeShortcut=${_target}`], app.quit);

    return true;
  }

  // Obsolete command?
  if (_cmd === "--squirrel-obsolete") {
    app.quit();

    return true;
  }

  return false;
};

// Returns the tray icon matching an unread count
var getTrayIcon = function(unreadCount) {
  let _key;

  if (!unreadCount || unreadCount === 0) {
    _key = "tray_normal";
  } else if (unreadCount >= 10) {
    _key = "tray_badge_many";
  } else {
    _key = `tray_badge_${unreadCount}`;
  }

  return nativeImage.createFromDataURL(TRAY_ICONS[_key]);
};

// Writes the app icon to a temp PNG file (more reliable than data URL for Linux)
var initLinuxIcon = function() {
  if (process.platform !== "linux") {
    return;
  }

  try {
    const _iconData = Buffer.from(
      TRAY_ICONS["app_icon"].replace("data:image/png;base64,", ""),
      "base64"
    );
    __linuxIconPath = path.join(os.tmpdir(), "crisp-app-icon.png");
    writeFileSync(__linuxIconPath, _iconData);
  } catch {
    // Ignore
  }
};

// Loads bundled Chrome extensions
var loadExtensions = function() {
  // Extension directory is next to the electron binary
  const _extBase = path.join(path.dirname(process.execPath), "extensions");

  if (!require("fs").existsSync(_extBase)) {
    return;
  }

  const _extensions = require("fs").readdirSync(_extBase);

  _extensions.forEach((_name) => {
    const _extPath = path.join(_extBase, _name);
    // Remove _metadata folder if present (causes warnings)
    const _metaPath = path.join(_extPath, "_metadata");
    if (require("fs").existsSync(_metaPath)) {
      require("fs").rmSync(_metaPath, { recursive: true, force: true });
    }
    const _loader = (electron.session.defaultSession.extensions &&
                     electron.session.defaultSession.extensions.loadExtension)
      ? electron.session.defaultSession.extensions.loadExtension.bind(electron.session.defaultSession.extensions)
      : electron.session.defaultSession.loadExtension.bind(electron.session.defaultSession);
    _loader(_extPath, { allowFileAccess: true }).catch(() => {
      // Ignore load errors
    });
  });
};

// Creates or updates the Linux system tray
var createTray = function() {
  if (process.platform !== "linux") {
    return;
  }

  __tray = new Tray(nativeImage.createFromDataURL(TRAY_ICONS["tray_normal"]));

  const _buildContextMenu = () => Menu.buildFromTemplate([
    {
      label: "Ouvrir Crisp",
      click: () => {
        if (__window) {
          __window.show();
          __window.focus();
        }
      }
    },
    { type: "separator" },
    {
      label: "Démarrer réduit",
      type: "checkbox",
      checked: __config.startMinimized,
      click: () => {
        // Toggle manually — menuItem.checked is unreliable on Linux GTK
        __config.startMinimized = !__config.startMinimized;
        saveConfig();
        // Rebuild the menu so the checkbox reflects the new state
        __tray.setContextMenu(_buildContextMenu());
      }
    },
    { type: "separator" },
    {
      label: "Quitter",
      click: () => {
        // @ts-ignore
        app.quitting = true;
        app.quit();
      }
    }
  ]);

  __tray.setToolTip("Crisp");
  __tray.setContextMenu(_buildContextMenu());

  // Rebuild menu on open so the checkbox reflects current state
  __tray.on("right-click", () => {
    __tray.setContextMenu(_buildContextMenu());
  });

  // Left click = show/focus the window
  __tray.on("click", () => {
    if (__window) {
      if (__window.isVisible()) {
        __window.focus();
      } else {
        __window.show();
      }
    }
  });
};

// Updates the tray icon + taskbar badge with unread count
var updateTrayBadge = function(unreadCount) {
  if (process.platform !== "linux") {
    return;
  }

  // Update tray icon
  if (__tray) {
    __tray.setImage(getTrayIcon(unreadCount));

    const _label = unreadCount > 0
      ? `Crisp — ${unreadCount} message${unreadCount > 1 ? "s" : ""} non lu${unreadCount > 1 ? "s" : ""}`
      : "Crisp";

    __tray.setToolTip(_label);
  }

  // Update taskbar badge (works on GNOME/Unity with proper setup)
  if (app.setBadgeCount) {
    app.setBadgeCount(unreadCount || 0);
  }
};

// Allows to right click
contextMenu({
  menu: (actions, props, browserWindow, dictionarySuggestions) => {
    return [
      ...dictionarySuggestions,
      actions.separator(),
      actions.copyLink({
        transform: (content) => {
          return content.replace("app://.", "https://app.crisp.chat");
        }
      }),
      actions.separator(),
      actions.copy(),
      actions.copyImage(),
      actions.paste()
    ];
  }
});

var createProtocol = (scheme, customProtocol) => {
  (customProtocol || protocol).registerBufferProtocol(
    scheme,
    (request, respond) => {
      let _pathName = new URL(request.url).pathname;

      _pathName = decodeURI(_pathName); // Needed in case URL contains spaces

      readFile(path.join(__dirname, _pathName), (error, data) => {
        if (error) {
          return;
        }

        const _extension = path.extname(_pathName).toLowerCase();

        let _mimeType = "";

        if (_extension === ".js") {
          _mimeType = "text/javascript";
        } else if (_extension === ".html") {
          _mimeType = "text/html";
        } else if (_extension === ".css") {
          _mimeType = "text/css";
        } else if (_extension === ".svg") {
          _mimeType = "image/svg+xml";
        } else if (_extension === ".json") {
          _mimeType = "application/json";
        } else if (_extension === ".wasm") {
          _mimeType = "application/wasm";
        }

        respond({ mimeType: _mimeType, data });
      });
    }
  );
};

var createWindow = function() {
  // Remove native menu bar on Linux (File, Edit, View…)
  if (process.platform === "linux") {
    Menu.setApplicationMenu(null);
  }

  // Create the browser window.
  __window = new BrowserWindow({
    title: app.getName(),
    center: true,
    resizable: true,
    show: false,

    // Hide the title bar on macOS only (hiddenInset is macOS-specific)
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",

    // Set app icon for Linux taskbar (use file path, more reliable than data URL)
    icon: process.platform === "linux" && __linuxIconPath
      ? __linuxIconPath
      : undefined,

    width: 1140,
    height: 705,

    webPreferences: {
      webSecurity: true,
      backgroundThrottling: false,
      textAreasAreResizable: false,
      webgl: false,
      webviewTag: true,
      plugins: false,
      sandbox: true,
      spellcheck: true,
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js")
    }
  });

  // Badge for Windows
  if (Badge) {
    new Badge(__window, {});
  }

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    __window.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
  } else {
    createProtocol("app");

    if (os.platform() === "darwin" || os.platform() === "linux" || (os.platform() === "win32" && !windowsLaunch())) {
      __window.loadURL("app://./index.html");
    }
  }

  // On Linux: intercept Notification clicks to focus the window
  if (process.platform === "linux") {
    __window.webContents.on("did-finish-load", () => {
      __window.webContents.executeJavaScript(`
        (function() {
          const _OrigNotif = window.Notification;
          if (!_OrigNotif || _OrigNotif.__crisp_patched) return;

          function CrispNotification(title, options) {
            const _n = new _OrigNotif(title, options);
            _n.addEventListener('click', function() {
              window.__crisp_notification_clicked && window.__crisp_notification_clicked();
            });
            return _n;
          }
          CrispNotification.__crisp_patched = true;
          CrispNotification.requestPermission = _OrigNotif.requestPermission.bind(_OrigNotif);
          Object.defineProperty(CrispNotification, 'permission', {
            get: () => _OrigNotif.permission
          });
          window.Notification = CrispNotification;
        })();
      `).catch(() => {});
    });

    ipcMain.handle("notification-clicked", () => {
      if (__window) {
        __window.show();
        __window.focus();
      }
    });
  }

  // @ts-ignore
  // Called before creating a new window is requested by the renderer, eg. by
  //   window.open()
  __window.webContents.setWindowOpenHandler(({ url }) => {
    // Open URL in the browser
    shell.openExternal(url);

    // Prevent URL to be opened in a new Electron window
    return { action: "deny" };
  });

  __window.on("close", (event) => {
    if (process.platform === "darwin") {
      // @ts-ignore
      if (app.quitting) {
        __window = null;
      } else {
        event.preventDefault();
        __window.hide();
      }
    } else if (process.platform === "linux" && __tray) {
      // On Linux with tray: minimize to tray, unless app.quit() was called explicitly
      // @ts-ignore
      if (app.quitting) {
        __window = null;
      } else {
        event.preventDefault();
        __window.hide();
      }
    } else {
      app.quit();
    }
  });

  ipcMain.handle("quit", () => {
    app.quit();
  });

  ipcMain.handle("is-full-screen", () => {
    return __window.isFullScreen();
  });

  ipcMain.handle("set-menu", (menuTemplate) => {
    // Build & bind menu
    // @ts-ignore
    let _menuItems = electron.Menu.buildFromTemplate(menuTemplate);

    // Insert default Menu
    _menuItems.insert(0, electron.Menu.getApplicationMenu().items[0]);

    electron.Menu.setApplicationMenu(_menuItems);
  });

  ipcMain.handle("override-dialog", () => {
    // Disables main process error dialogs (overrides handler)
    dialog.showErrorBox = function() {
      // Do nothing.
    };
  });

  ipcMain.handle("open-dev-tools", () => {
    try {
      __window.webContents.openDevTools({ mode: "detach" });
    } catch {
      // Ignore
    }
  });

  ipcMain.handle("override-cors", (event, origin) => {
    __window.webContents.session.webRequest.onBeforeSendHeaders(
      (details, callback) => {
        details.requestHeaders.Origin = origin;

        callback({
          requestHeaders: details.requestHeaders
        });
      }
    );

    __window.webContents.session.webRequest.onHeadersReceived(
      (details, callback) => {
        [
          "Access-Control-Allow-Origin",
          "access-control-allow-origin"
        ].forEach((header) => {
          if (details.responseHeaders[header]?.[0] === origin) {
            details.responseHeaders[header] = ["app://."];
          }
        });

        callback({
          responseHeaders: details.responseHeaders
        });
      }
    );
  });

  ipcMain.handle("set-unread-counter", (event, unreadCount) => {
    const _platformDock = app.dock;

    if (_platformDock) {
      // macOS dock badge
      if (unreadCount > 0) {
        _platformDock.setBadge(`${unreadCount}`);
      } else {
        _platformDock.setBadge("");
      }
    } else if (process.platform === "linux") {
      // Linux: update tray icon + taskbar badge
      updateTrayBadge(unreadCount);
    } else {
      if (__window) {
        // Windows: update via electron-windows-badge custom event
        ipcMain.emit("update-badge", event, unreadCount);
      }
    }
  });

  ipcMain.handle("load-url", (event, url) => {
    if (__window) {
      return __window.loadURL(url);
    }
  });

  ipcMain.handle("ask-for-media-access", async (event, media) => {
    if (process.platform !== "darwin") {
      return true; // On non-macOS platforms, we assume access is granted
    }

    return systemPreferences.askForMediaAccess(media);
  });

  ipcMain.handle("ask-for-desktop-capture", async () => {
    const _sources = await desktopCapturer.getSources({ types: ["window", "screen"] });

    if (_sources.length > 0) {
      return _sources[0];
    }

    throw new Error("No sources found");
  });

  ipcMain.handle("create-updater", async (event, feedUrl) => {
    if (__updateInterval) {
      clearInterval(__updateInterval);
    }

    const _platform = { darwin: "mac", win32: "windows" }[process.platform];

    if (!_platform) {
      return false; // Auto-update not supported on Linux (AppImage handles it)
    }

    autoUpdater.setFeedURL({
      url: `${feedUrl}/update/${_platform}/${app.getVersion()}/`
    });

    autoUpdater.on("update-downloaded", () => {
      __window.webContents.send("update-downloaded");
    });

    autoUpdater.checkForUpdates();

    __updateInterval = setInterval(() => {
      autoUpdater.checkForUpdates();
    }, UPDATE_INTERVAL);

    return true;
  });

  ipcMain.handle("quit-and-install", () => {
    autoUpdater.quitAndInstall();

    // For some reason, latest Electron release is not killing its process,
    //   this trick is forcing the app to close to update.
    setTimeout(() => {
      app.quit();
    }, UPDATE_QUIT_DELAY); // 4 seconds
  });

  ipcMain.handle("start-window-tracking", () => {
    const _sendWindowState = () => {
      if (__window) {
        __window.webContents.send("window-state-changed", {
          width: __window.getSize()[0],
          height: __window.getSize()[1],
          maximized: __window.isMaximized()
        });
      }
    };

    ["resize", "move", "maximize", "unmaximize", "minimize", "restore"].forEach((event) => {
      __window.on(event, _sendWindowState);
    });
  });

  ipcMain.handle("restore-window", (event, { width, height, minimumWidth, minimumHeight }) => {
    if (__window) {
      __window.setSize(width, height);
      __window.setMinimumSize(minimumWidth, minimumHeight);

      if (__window.isMaximized()) {
        __window.maximize();
      }

      __window.setResizable(true);
      __window.center();

      // Don't show if start-minimized is active
      const _startMinimized = __config.startMinimized ||
        process.argv.includes("--start-minimized");

      if (!_startMinimized) {
        __window.show();
      }
    }
  });

  ipcMain.handle("show-window", () => {
    if (__window && !__window.isVisible()) {
      __window.show();
    }
  });

  ipcMain.handle("hide-window", () => {
    if (__window) {
      __window.hide();
    }
  });
};

/**************************************************************************
 * EVENTS
 ***************************************************************************/

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (__window === null) {
    createWindow();
  } else {
    __window.show();
  }
});

app.on("before-quit", () => {
  // @ts-ignore
  app.quitting = true;
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  loadConfig();
  initLinuxIcon();
  createTray();
  createWindow();
  loadExtensions();
});

// Exit cleanly on request from parent process in development mode.
// @ts-ignore
if (ENVIRONMENT !== "production") {
  if (process.platform === "win32") {
    process.on("message", (data) => {
      if (data === "graceful-exit") {
        app.quit();
      }
    });
  } else {
    process.on("SIGTERM", () => {
      app.quit();
    });
  }
}
