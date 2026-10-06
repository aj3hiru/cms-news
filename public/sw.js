/* Push notifications service worker. Payload: { title, body, image, icon, url, cid } */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : "" };
  }
  const options = {
    body: data.body || "",
    data: { url: data.url || "/", cid: data.cid || 0 },
    icon: data.icon || "/favicon.ico",
    badge: data.icon || undefined,
  };
  if (data.image) options.image = data.image;
  event.waitUntil(self.registration.showNotification(data.title || "New update", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  const url = d.url || "/";
  const track = d.cid ? fetch("/api/push/click?cid=" + d.cid, { method: "POST", keepalive: true }).catch(() => {}) : Promise.resolve();
  event.waitUntil(
    Promise.all([
      track,
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
        for (const w of wins) if (w.url === url && "focus" in w) return w.focus();
        return self.clients.openWindow ? self.clients.openWindow(url) : undefined;
      }),
    ])
  );
});
