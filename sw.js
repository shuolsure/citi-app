/* 词替 · Service Worker —— 由 tools/build-pwa.mjs 生成，别手改 */
const CACHE = 'citi-a88d5bc19b5b';

/* ★ 这里绝不能出现 './' —— 目录路径在有的静态服务器上返回 index.html、
     在有的上面返回 404，而 addAll 是原子的：一个 404 就让整个 install 失败，
     于是 SW 根本装不上、离线能力为零，**页面却照常显示，什么错都不报**。
     （本地验的时候真踩了一次，就是这么发现的。）
     start_url 的兜底交给下面 navigate 分支的 './index.html'，不靠目录路径。 */
const CORE = ["./index.html","./manifest.webmanifest"];
const NICE = ["./icons/icon-180.png","./icons/icon-192.png","./icons/icon-512.png"];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    /* 核心两项必须全成 —— 少一个就是白屏，宁可 install 失败也别装个残废的。
       图标尽力而为：少一张图标只是主屏难看，不该因此丢掉整个离线能力。 */
    return c.addAll(CORE).then(function () {
      return Promise.allSettled(NICE.map(function (u) { return c.add(u); }));
    });
  }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) {
        return Promise.all(ks.filter(function (k) { return k !== CACHE; })
                             .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  /* 导航请求一律回缓存里的 index.html。
     ★ 不这么写的话，主屏图标点开时如果没网、且 start_url 带了参数
       （iOS 有时会带 ?utm_source=homescreen），cache.match 精确匹配不上 → 白屏。 */
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then(function (hit) { return hit || fetch(req); })
    );
    return;
  }

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || fetch(req); })
  );
});
