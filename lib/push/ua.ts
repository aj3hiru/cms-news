/** Device, OS and browser of a subscriber (for Push analytics and segments). Same rules as EduMint. */
export function parseUserAgent(ua: string, touchMac = false, endpoint = ""): { device: "mobile" | "desktop" | ""; os: string; browser: string } {
  if (!ua) {
    const host = (() => {
      try {
        return new URL(endpoint).host;
      } catch {
        return "";
      }
    })();
    const browser = /fcm\.googleapis|android\.googleapis/.test(host) ? "Chrome" : /mozilla/.test(host) ? "Firefox" : /apple/.test(host) ? "Safari" : /notify\.windows|wns/.test(host) ? "Edge" : "";
    return { device: "", os: "", browser };
  }
  const os = /Android/i.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/i.test(ua) || (touchMac && /Macintosh/.test(ua))
      ? "iOS"
      : /CrOS/.test(ua)
        ? "ChromeOS"
        : /Windows/i.test(ua)
          ? "Windows"
          : /Macintosh|Mac OS X/i.test(ua)
            ? "macOS"
            : /Linux|X11/i.test(ua)
              ? "Linux"
              : "Other";
  const browser = /SamsungBrowser/i.test(ua)
    ? "Samsung Internet"
    : /Edg(e|A|iOS)?\//.test(ua)
      ? "Edge"
      : /OPR\/|Opera/.test(ua)
        ? "Opera"
        : /YaBrowser/.test(ua)
          ? "Yandex"
          : /UCBrowser/.test(ua)
            ? "UC Browser"
            : /Firefox|FxiOS/.test(ua)
              ? "Firefox"
              : /Chrome|CriOS|Chromium/.test(ua)
                ? "Chrome"
                : /Safari/.test(ua)
                  ? "Safari"
                  : "Other";
  const device = os === "Android" || os === "iOS" || /Mobi|Tablet/i.test(ua) ? "mobile" : "desktop";
  return { device, os, browser };
}
