// デプロイ時にバージョンを更新するとキャッシュが再構築される
const CACHE_NAME = 'kabukoto365-v6';

// キャッシュするファイルリスト
const urlsToCache = [
  '/',
  '/index.html',
  '/about.html',
  '/archive.html',
  '/privacy.html',
  '/contact.html',
  '/css/style.css',
  '/js/app.js',
  '/js/daily-tips.js',
  '/js/date-system.js',
  '/js/quotes-data.js',
  '/images/logo.svg',
  '/images/backgrounds/bg-board.jpg',
  '/images/backgrounds/bg-chart.jpg',
  '/images/backgrounds/bg-chart1.jpg',
  '/images/backgrounds/bg-chart2.jpg',
  '/images/backgrounds/bg-trading1.jpg',
  '/images/backgrounds/bg-trading2.jpg',
  '/images/icons/icon-192x192.png',
  '/images/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap'
];

// HTML・JS・CSS はネットワークファーストで最新版を優先する
function isNetworkFirstResource(requestUrl) {
  const url = new URL(requestUrl);
  return url.origin === self.location.origin && (
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  );
}

// Service Workerのインストール処理
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('キャッシュを開きました');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // 新しいService Workerをすぐにアクティブにする
  );
});

// Service Workerのアクティベーション処理
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // 古いキャッシュを削除
          if (cacheName !== CACHE_NAME) {
            console.log('古いキャッシュを削除:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // このService Workerをすべてのクライアントに対して有効にする
  );
});

// フェッチイベントの処理
self.addEventListener('fetch', event => {
  // 外部サービスはキャッシュしない
  if (event.request.url.includes('tradingview.com') ||
      event.request.url.includes('googletagmanager.com')) {
    return;
  }

  if (isNetworkFirstResource(event.request.url)) {
    // ネットワークファースト：HTML・JS・CSS はネットワークを優先し、キャッシュを更新する
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // オフライン時はキャッシュにフォールバック
          return caches.match(event.request)
            .then(cached => cached || caches.match('/index.html'));
        })
    );
  } else {
    // キャッシュファースト：画像・フォントはキャッシュを優先する
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
            }
            return response;
          });
        })
    );
  }
});