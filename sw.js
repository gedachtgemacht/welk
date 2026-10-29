const VERSION = 'dev';
const CACHE = 'welk-' + VERSION;
const SHELL = ['./', 'index.html', 'tabelle.js', 'welk.js', 'manifest.webmanifest', 'icon.svg'];
const OPTIONAL = ['icon-192.png', 'icon-512.png'];

self.addEventListener('install', (ev) => {
  self.skipWaiting();
  ev.waitUntil(caches.open(CACHE).then((c) =>
    c.addAll(SHELL).then(() => Promise.all(OPTIONAL.map((u) => c.add(u).catch(() => {}))))
  ));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const istSeite = req.mode === 'navigate' || /\/(index\.html)?$/.test(new URL(req.url).pathname);
  if (istSeite) {
    // Seite zuerst aus dem Netz, nur offline aus dem Cache
    ev.respondWith(
      fetch(req).then((res) => {
        if (res.ok) {
          const kopie = res.clone();
          caches.open(CACHE).then((c) => c.put(req, kopie));
        }
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
    );
    return;
  }
  ev.respondWith(caches.match(req).then((r) => r || fetch(req)));
});
