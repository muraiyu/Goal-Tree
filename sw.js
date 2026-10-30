// オフラインでも開けるように、アプリの画面とアイコンを端末に残しておく
// アプリを直したときは VERSION を変えると、新しいファイルに入れ替わる
const VERSION = 'v2';
const CACHE = 'goal-tree-' + VERSION;
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // データの同期とログインの通信は、そのまま通す
  if (url.hostname.endsWith('googleapis.com') && !url.hostname.startsWith('fonts')) return;
  // アプリの画面：まずネットから新しいものを取り、つながらなければ端末に残したものを使う
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('.html'))) {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put('index.html', c)); return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  // アイコン・Firebase の部品・フォント：端末に残したものを先に使う
  if (url.origin === location.origin || url.hostname === 'www.gstatic.com' || url.hostname.startsWith('fonts.')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return r; })));
  }
});
