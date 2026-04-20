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
  "tray_normal": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAACVElEQVR4nLWVvW4TQRDHf7O3vnNshZCYBAQUSDQICl4BXgHxILwAEhKi5yloeAFECwUUFEiUFJEgilASQSD22d7dGYq980cS0eCMtLrT7ux/vv4zK3c+BuMCxFvQlYOagLeLcFjAp7h6jwE80RDAsqGzppuTfGbNroDkfzPQhbuttteoYC4rWgZwkhXMDAXUNAMYJIOEoQaG0SuEsgC1BloMMfApQLYJghENRsFAoOOgdNB1Qt8L6yVslo5BBduV43pPeLsf+XSU6HlBjRmO19iGB9FgpxIe3e6ws+YYlMKgK1yphK3KcbmEvl9O2M9aebcX6XeZAQN4CZrzIjANxqDveXq/+8/CGBAVCoENL0hQrMj5a6vitaGbCkiEg5PE96FxrSeY5XxLY7iNrF1OYLsSJBkp5EK2TufiNTcswUkNx2PlZr9Am8vnSWtoq4SOGjHM2cWix60XwwRHtQJFw4xloNYrbcLe7AilGWEKhZsjexYaxAGjCIdDJWrWKdwcUKRZC5HcWHesCYynivdzR2asgFyMemwMp4ZvACcJkhk9n3N+WCvvvwUORsqPYWL3V2IyVpwaGuYtNEsF5OFRGbz+UvP1MLB7nDgYKX8myvOHl3hwq+TJm9+8+jyiKh1Bc0TrZW6stMAb2Xyxv5R1EaiDUUfDIRQOQjLuXfU8vrvGyw9DnEGnaLoTSGd7Gtl4tmftbsY3nMgyGwQm0Zgk6HdklvM5BxanTS6GJ9pMoVVTjNMzzwt0BPTcMWtnvj7F8xT/X2YvyCrhhVN0W5UY4O2CXpC/z/8vx2Cj+vAAAAAASUVORK5CYII=",
  "app_icon": "data:image/png;base64,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",
  "tray_badge_1": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAACbklEQVR4nK2VvWuUQRDGf7O3dzFqFIkmhQqBgBgtgqgQUFBLsZP8CxY2QbCxFMTU4v8QC+2CSERBkYCvpSDYWAh+ERIhibmv7LszFvveXT7O5JA8MCy7O/vsM7M7u3L6QzB6xNupy7v6XH08D4CzoPRivZC2NtdckVNvGrsqfnfvSk+kG+FiruxmW1EeG2M4yxjOMsrj492JyQ3JjVa72UhzWxA+f2bh0qUdFXvNFcyBGJgggBMwwMzYrrc3+BiAYrlg5Aa1YCBQdlBx/0csJ56uWiKFaDDUJ9wc8Qz1OwYrwuA+4WifMHS9E7ofHWVwZqbdX52epj472+5fuPsKOTmzbEYKvxaM8UHP6xsHu6pYmJjYVenFqZcY4DQYFgwN6bAW1yLfqyklQVMUainnQ1m2I+n523O0+JzmihbXyqKyVo+sNBQvUCrMSUqVAMP/ID936wVWcGmueC0qurWwGuF3XYFScTPSQpHUmsGx9xnR0qbZz8Dk81XCulFypNAAz4YCcEAth6WqkmvyKbkOoUhhpCgAjg84+gUa64r3HSFeNxRASaDeMKrrhi8ImxGiGfu9YAZLdWX+W2CxpixUI1+XI82G4tTQ0BIsnVQAmECfwbNPdb4sBb6uRBZryp+m8uDaIa6OVLgzt8qTjzX6Ko6gKaKBSiqs2GFCjjz8ZUgnNyJQD0Y9NxxCyUGIxtlhz+SZfh5lVZxBuVRUJxC1OCCKAQE5fP+HtUYTv+FE2jlsTTRzoxnhQFnaOW+raSsrWhE8ubUdWm7K9jfCC5QFtOu/YNtaH7u8XnsBb0E37bUXELZct72CAd66/BB7gb8W6XlIshL7xwAAAABJRU5ErkJggg==",
  "tray_badge_2": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAACnElEQVR4nK2VvWuUQRDGf7O3d2eip4bTC/gBViJaiKgQMKCWYicWgqVYWEQEESwFsbOQ+x8U0VaCoqAYwVMrwdJC8YuQiDF6n/vujMX73l3MnSZFHhiW3Z155mN3dmXPq2CsEs8uTq6oc6z6AgBnQVmNrIa061wTRXY/ba0Y8fOrR1dFuhQuJspKshyjZ84wXqtRmZlh882bSD4/SExiSGJ0x7+FdG8ZGnfvMjsxwcKVKxQnJ8lt2zag4zVRMAdiYIIATsAAM2Mw3iyiUokN587Rmp4m+fhxkDgGIDMXjMSgEQwE8g4KbghpucxYtUrn9Wt+VatDHcuOe4uWkkI0qBSFU7s8lRFHuSCU1wlbikLlxJGe0ejZs5SmpnrzH1NTdN686c0PXX6M7Ly9YJal3wjG/rLnyckNQ6OYnZj4R2H6OHzxEQY4DYYFQ0N6WHO/I5/raUmCplmopTWv1Gr/JT144SFdPqeJotm1sqj8bkZ+thQvkMvESVoqAcb/QX7g/DSWcWmieM06umtYj/C9qUAuuxmpoUg6msHWlzWipU5rXwOnHywSOkbOkaYGeJY0gAMaCczXlURTnZzrE4pkQpoFwPaSY0Sg1VG87wfidUkD5ASaLaPeMXxG2I4QzRj1ghnMN5UXnwJzDWW2HvmwEGm3FKeGhm7A0i8FgAkUDe6/a/J+PvDhZ2SuofxqK9ePb+TYrgKXHi5y522DYsERNM2oVEgbK/aZkLEb3wzp10YEmsFoJoZDyDkI0dg37jm9d4RbtTrOIJ/LuhOImh0Q2YKAbLr2xbqrKb/hRHo17G60E6MdYX1eejXvRdOLLBtF8CTWU+iqKYNvhBfIC+jQf8EGRh+HvF5rAW9B//K1FhCWXbe1ggHehvwQa4E/lbmIqerYltcAAAAASUVORK5CYII=",
  "tray_badge_3": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAACoklEQVR4nK2Vu2tUURDGf3P27q7xkSDBTSGCIIhooeKDgIEo2IidpE2ZQgQRbCwsBGOv/g/a2IoPFHwluJaCdhaCL2KiuDH7uDn3zFicu7smu5oU+WAYuHfud7757pxzZN8bb6wTzy+OrVlz8vYMAM68sp5YD2l7cc0U2fustabil1fG10X6N1zIlLViNcrj44xUq1RevWL7rVtIsdhLTGZIZrTzyiC+W4X0xQvmRkdZnJ6mdPw4MjjYU5NopmAOxMAEAZyAAWZGr96IoelpNp0+TTozg9ZqfazwxJa9oZmSeuVHPfCzEVhKA5kPfYlrV6/yc2qK8tgYpUOH+imOrQqQGVTKwrk9RSoDjuGSMLxJ+P5wlsqZE52Ptl64wJbJSazVIp2dxb9/v4L06OUnyK47v8zy9hveODic8PTs1r4q50ZH/2FMF8cuPsYAp94wb6iPP2t+KfC5bmQGXiEYqEXPK9Xqf0mPnH9Em89ppmg+VhaUpWag1lISgUIeTqJVAoz8g/zw1AMs59JMSdR3PRagHuBHU4FCPhnxQ5GYzWDH6yrB4qLVr56J+4v4ZaPgiK0BCX9tAAc0MlioK5nGmoLrEorkQewCYOc2x4BAa1lJkq6QzlRAVNBsGfVlI8kJ0wDBjM2JYAYLTWXmk2e+oczVAx9/BdKW4tRQ3xYsXSsATKBscO9dkw8Lno+1wHxD+Z0q108NcnJ3iUuPFrn7tkG55PAaO9pWihurO/GGbL/xzZCuNyLQ9EYzMxxCwYEPxoGRhIn9A9ys1nEGxUK+O4Gg+Q8ifyAgQ9e+WPtp5DecSMfD9os0M9IAW4rS8byjpqMszyIkZNYpaJcpvWdEIlAU0L73gvXkJPQ5vTYCiXldsdZGQFg1bhsFAxLrc0NsBP4AVgOe9MNY93kAAAAASUVORK5CYII=",
  "tray_badge_4": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAACiUlEQVR4nK2Vz0tUURTHP+fOdaapLMOyRQW6iahFRAVCYraMQCh0475FGwnauAyiffg/5KK2EUZBEULTSoKWLoR+ESqoNb+8757T4r2Z0WZMK79wOLx7z/meH/ede+XM+2DsEm8mh3a0GZmeA8BZUHYjuyFtBNdEkdOvaztm/Hbq6q5IN8PHRP/aCcD19NA7M4OurrIyMdG+T2JIYjT0ViHd64BDU1NszM9vn7EmCuZADEwQwAkYYGZ0qqc4OkqysICureEHBjoTxwBk7oKRGFSCgUCXg7xrdyoMDVEYHm5+d09O8mN6eouNnHyybikpRIO+gnCr39NXdPTmhd59wtGC0Hf9SluA/ePjFG/ebOvxpXsvkVOPV82y8ivBON/reXXjYMfyvg8OdlzfjMuTLzDAaTAsGBrSw1r6GflcTlsSNK1CLe15X6n0R9KLd2Zp8DlNFE2UmCgWlZ/VyFpN8QK5TJykrRLg+DbkF24/xzIuTRSv2UQ3HMsRVqoK5LI/I3UUSbUZHHtXIloatPQ1MPZsnbBh5BxpaYBn04A4oJLAcllJNLXJuRahSCakVQCc6HYUBWobivetRLxuGoCcQLVmlDcMnxHWI0Qz9nvBDJarytynwFJF+V6OLK5G6jXFqaGhkbC0WgFgAgWDpx+rLCwHFtciSxXlR115cO0QI/157s6uM/OhQiHvCJpW1J1PByu2mJAjD78Z0uqNCFSDUU0Mh5BzEKJx7rhn7GyRR6UyzqArl00nEDU7ILIFATl8/4s1VlN+w4k0e9jYqCdGPcKBLmn2vJlNM7NMi+BJrGnQMFPa7wgv0CWgHd8Fa9M+bnN7/S+8Bd0Say8g/Pa77RUM8PaPL8hO+AUxpGqZ7VsfdwAAAABJRU5ErkJggg==",
  "tray_badge_5": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAACn0lEQVR4nK2Vu2vUQRDHP7P3u4tRTwnBsxBBEIJoESQGQiIYS7ETOxtBLCwSBBtLQexFC/8CbWzFBwqKiXiSpBAsLCwEX8TE4CP33N0Zi9+94kU9H18Ylt9vZ77z2NlZ2fPMGz3i0fTB3+pMXpkFwJlXepFeSJvONSgy9LD624gfnz/UE2knkhj0j41yo6MMXL3a+l6cmIAY1xITDAEMkC6K5k43/MuXrJw8+VPnToMSPWiwdPVAAAug3gh+fcPs0BCFmRkGrl3D5fPdxNFDDEr0hgal5pVPpchKObJaiwQfu4zqc3Msjo+zcuoUueFhsiMjXTqJBmslHQwKfcKx3VkK/Y7BnDC4Qfh45wmFIxMto40nTpCfmsK8pz4/T31hYQ3pgXP3kZ3XP5sBTqDsjeHBhAdHN6+b/uLY2Pp16cDo9D0McOoN84Z6QwIsrUbeloxg4BWigVp6hIVi8ZekI2fu0uRzGhQNSgyKRWW1EvlSVRKBTEOcpKUSYPtPyPefvo01uDQoifp2jQUoRfhUUSCDAdboNmn0ohlse1okWuq0+N5z/NZXfN3IOFrdmdBxQRxQDrBcUoKmOhnXJhRpCGkWADvyjn6Bal1JknYgra6ANIJK1SjVjaRBWIsQzdiYCGawXFFm33iWyspiKfL6c6RWVZwa6psBS7sUACbQZ3DzRYVXy57XXyJLZeVbTbl4eAuTu3KcvfuVG8/L9OUcXtOM8jlBgHbHGzJw6YN13lwRqHijEgyHkHHgo7Fve8Lxvf1cLpZwBtlMamJAVNrzoDEbZOuFd9b8m/IbTqRVw+ZGLRi1CJuy0qp5e450Tpv0MBKCtRSaaorx48xLBLKSzo9uWNeaxLCe4r8jMa9rfP0PCD+02/+CAYn9xQvSC74DBOJ/TA5D+goAAAAASUVORK5CYII=",
  "tray_badge_6": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAACpklEQVR4nK2Vu2vUQRDHP7P3y13i+UAOYyEBISCihYgKAQMmRQqxEyGVdhY2IghiKYi9+BfYqIitmIgBRSKepWBpQNFoNDnxkXtld2csfveKd+r5+MKwsDvzncfOzsruZ97oE4/Ojv9WZ+LaPADOvNKP9EPadK5BkV0Pa7+N+PHFI32RdiKJQf/YCOfYfOECg1NTSD5PaXqa8Pr1emKCIYAB0sXQPFmPwakpcpOTlE6dIi4u9vatQYkeNFi6eiCABVBvBN8jzdFRMKNw/TqFW7fIjIx0E0cPMSjRGxqUuldK5cinSmS1Hgk+dhnFpSUkm6V08iSSz5Mb777YRIO1kg4Gwznh+OgAw0OOQlYoDAofZ54wfPRwy6g2M0NufJzC7duEhQVqc3PrSA+ef4CM3PhsBjiBijf2FRLmjm3sWbcPY2M99ztx6Ox9DHDqDfOGekMCLK9G3paNYOAVooFaeoXDxeIvSQ+cmaXJ5zQoGpQYFIvKajXypaYkApmGOElLJcD2n5DvP30Pa3BpUBL17RoLUI5QqiqQwQBrdJs0etEMtj0tEi11WnznOXH3K37NyDha3ZnQ8UAcUAmwUlaCpjoZ1yYUaQhpFgA7NjmGBGprSpK0A2l1BaQRVGtGec1IGoT1CNGMDYlgBitVZf6NZ7mifChHXn2O1GuKU0N9M2BplwLABHIGd15UebniefUlslxRvtWVy5ObmdiZ5dzsV24+r5DLOrymGW3KCgK0O96QrVfeW+fLFYGqN6rBcAgZBz4ae7cnnNgzxNViGWcwkElNDIhKex40ZoNsubRozd2U33AirRo2D+rBqEfID0ir5u050jlt0stICNZSaKopxo8zLxEYkHR+dMO61iSGXor/jsS8rvP1PyD80G7/CwYk9jc/SB/4DsI1gcSV+FMHAAAAAElFTkSuQmCC",
  "tray_badge_7": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAACiklEQVR4nK2VvWtUQRTFf3d2dmNMokgwKUSQCCJaiEQhoKCWYidpU1qIEAxpUgpiL4J/ghaxCohGFBQxuEIawdIi4BcxEdaY/cq8udfivd1NsqtZJQcuw5u5c+bc8+ZDjr8LRpd4NXl+x5yL994A4Cwo3UQ3pI3FNVHk2Mvajopfz1zoinQzfEz0nyf137hB38RE87s0PU19YWFLjiMxJDEa7dYgHduG9fv3WR4bozQzg5ZKbCwutivWRMEciIEJAjgBA8yMv9XTNzFBZXYWq9fbiWMAsumCkRhUgoFA3kHBdSYtjI7iR0YoTU11HPealSpAYjDUI1w9mmeo1zFYEAb3CN+fLjB0+Vyb2urcHLq21kZ6Zvo5cvhBySwrvxKMU4OeF1f6O6pYHhvrLH8Tzk4+wwCnwbBgaEh/1sp65HM5tSQoRAO11POhYvGvpKPX52nwOU0UTZSYKBaV9WrkZ03xArksnKRWCTD8B/LT155gGZcmitfQ8liAcoQfVQVy2c5IJ4qkrRkcfFskWrpo8Wtg/PEaYcPIOdLSAM+mA+KASgKrZSXRNCfnWoQiWZBWAXBowNErUNtQvG8Jae4KSBVUa0Z5w/AZYT1CNGOvF8xgtaq8+RRYqSjL5chSKVKvKU4NDQ3B0rICwAR6DB59qPJxNbD0M7JSUX7VlduX9nHxSIGb82s8fF+hp+AImlY0UEgPVmwxIQfufDOk5Y0IVINRTQyHkHMQonFy2DN+ope7xTLOIJ/LTicQNftBZB0Csv/WF2v0pvyGE2l62BioJ0Y9Ql9emp431TSVZa0InsSaCY00pf2O8AJ5Ae34Llhb62OH22s34C3olrV2A8K27bZbMMDbf7wg3eA3lrp1YZuVG38AAAAASUVORK5CYII=",
  "tray_badge_8": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAACrklEQVR4nK2Vy2tUSxDGf9XTk4fG62NwXEgkIFzCVRBRQVBQF1mIG7lk6daFGxHcuBQu7sU/wJ2iZCs+UFBMxDHgQhB04SLgC2+iqMk8u7vKxTkzk2SiySIfFAXV1V/XV12nj4y+CMYa8eT80VVzjl+bAsBZUNZiayFtH65Rkb8fN1at+OmlY2siXQyXorKaLUdh1y5Kt25Rnpxk2/XruC1beomJhkSj7Zca2doyFPfuxQ0N8e3MGYqjo/iRkV5ijUoKoNEyH4AIFkGDEUOvzNb0NKZK6fZtwtu3hDdvVmhFIJMcDI1KMyhfq4lvtcRCMxFD6tm0YXwcm59n7vRp/PAwA2NjPTlec6kCRINyv/Dv7iLlQUepTygNCP/fe0b55JHOpubUFANjY5QmJkgzM7RevlxCevDiQ2T4xnczwAnUgrGv5Hl0aqhXP/Dl8OEV44tx6PwDDHAaDAuGhuyyZhcSH6pGNAgKyUANDChXKn8kPXDuPm0+p1HRfKwsKQv1xI+G4gUKuTnJWiXAjt+Q7z97F8u5NCpeQ7fHAlQTfK0rUMAAy6dNJPNmsP15hWTZoZVPgfE7Pwkto+DIpAGeRR+AA2oR5qpK1Cyn4LqEIrmRqQDYuckxKNBoKd53C+lMBWQV1BtGtWX4nLCZIJmxwQtmMFdXpt4HZmvKl2pi5nui2VCcGhraBUu3FQAm0G8w8brOu7nAzI/EbE2Zbyr/nfiL4yN9XLj/k5uvavT3OYJmijb1CQJ0J96QrVc+G9LtjQjUg1GPhkMoOAjJ2LPDM/7PIFcrVZxBsZBtMSBpfkHkAQHZfPmjtaMZv+FEOj1sLzSj0UywsSidnneq6VSWexE80ToJ7TTFWP6meYGiZO9HL6zH+7TC67Ue8BZ0yVnrAWHZuK0XDPC2wh9iPfALEVyqctcAX8AAAAAASUVORK5CYII=",
  "tray_badge_9": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAACo0lEQVR4nK2Vu2tUURDGf3P27q7xrcFVEEEQgqggYoSAAbUUQUX8F1LYBMFGrASxs5B0FpZqYSs+iBCRiGslglgpCL7QRDFxnznnzFjcu7tJbjQp8sEwMGfOd76ZM/dc2fvKGyvEs9HhZXOOj00C4MwrK7GVkHYO16DIwERrWcXPLx9bEel8uBiU5WwxkoEB+u/dozIxwcYrV0AkT0wwJBgdv9BI1xZh7dmzWK3Gr5ER+k6fpjQ4mCfWoEQPGiz1HghgAdQbwefLbI2P4yoVtoyNYa0WhR078lVFD5CWKxjBoOENBIoOSi5PPPf6NdNnzlA8cICtt24RPnzIE2tWqgDBoFIWzu0pUulz9JeE/jXCj0cvqJw82t1UHh5m840b6MwMtdu38e/eLSAdvDSO7Lrz2wxwkio92J/w9NT6vEzg+9DQkvH5ODL6BAOcesO8oT69rKla5HM9bYlXiAZqYEClWv0v6eELj+nwOQ2KZmNlUak1IzMtJREoZOYkbZUA2/9BfmjkIZZxaVAS9b0eC1CP8LOpQAEDLJu2zqiawbaXVaKlh1a/es4/mMXPGQVHWhqQMO8DcEAjwHRdCZrmFFyPUCQz0ioAdm5w9Am05pQk6QnpTgWkCpotoz5nJBlhO0I0Y20imMF0U5n85JlqKN/rkY+/I+2W4tRQ3xEsvVYAmEDZ4P7bJu+nPR9nIlMN5U9buXZiI8d3l7j4eJa7bxqUSw6vaUUbSoIAsceEbLn+zZBeb0Sg6Y1mMBxCwYGPxv7tCef39XGzWscZFAvpFgOiZhdEFhCQTVe/WCea8htOpNvDzkI7GO0I64rS7XlXTVdZ5kVICNZN6KQpxuI3LREoSvp+5GE5n8QlXq/VQGJeF5y1GhAWjdtqwYDElvhDrAb+Akl/mf6geNPeAAAAAElFTkSuQmCC",
  "tray_badge_many": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAC0klEQVR4nK2VS2idVRDHf3PuuTdNY1PTYFqQgiAE0YKICQQqWBddCX1I19ll4aYILpSuhNBdF5KuuuhSu3ArfXCFiFS8roogWVko+LjEXKWp9/HdnHNmXHyP29Q0CZiB4cA5M//5z//M+T557cdg7NO+vfzOnjFnVu4D4Cwo+/H9gJbFNSoyu5rtyfi7T9/dF+jT5lJU9nIAPzvL9K1bzKyuMnnlCohUIBOLixw6e3Y7MNGQaJTrdic/Aw5fuIB1u/y9tMT4uXM05uZ2Zew1KpgDMTBBACdggJmhRWDWbDJ5+jRTKytYllE7cYLG/DxT169XYEeXl+lcvEhqt/EpAEW6YESDfjAQqDtouDxp68EDOufPUz91imM3bhAfPiSsrbG+sMDE4iKp3SZrNp9mbAUoRIOZMeGDV+vMjDumG8L0IeHPO99z8uonvHjtGrq5SffmTcLa2nNlmPu4iZz84rFZ0X4/GG9Oe755/4UdE9YXFnbVFWD+8j0McBoMC4aG/LI2uonferkkQSEZqOWaz7Rau4K+/eFdSjynUdFirCwp3UFiM1O8QK1wJ7lUAhx/DvhbS7exAkuj4jWMNBagl+CvgQK1YjLyxHJszeClH1oky4u2/ghc+voJYcuoOfLWAE/UqqoD+hE6PSVqHlNzI0CRwsm7AHj5iGNcINtSvB8RqaYCcgaDzOhtGb4AHCZIZhz2ghl0Bsr9XwMbfWW9l3j0ODHMFKeGhpKwjKQAMIExg69+HvBLJ/BoM7HRV/4ZKsvvTXLmlQYf3X3Clz/1GWs4guYdHWnkDyuNkJCpq21DRtqIwCAYg2g4hJqDkIw3jnsuvT7O560ezqBeK14nkLS4IIoNATn62e9W7ub4hhOpNCwPhtEYJpioS6V5xaZiVqwieKJVAWWYMvpGlOYF6gK643/B/rP6FHcK/P/mLei2WgdhwjPjdlBmgLf4rJoHY/8Cqi2j+8eU1K4AAAAASUVORK5CYII=",
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
      click: (menuItem) => {
        __config.startMinimized = menuItem.checked;
        saveConfig();
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
