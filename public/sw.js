// Service Worker: 画像をキャッシュして次回以降の読み込みを高速化します。
// CSVファイルは常にネットワークから最新版を取得し、画像のみキャッシュします。

const CACHE_NAME = 'kanji-images-v2'; // バージョン更新: 古いキャッシュをクリア
const IMAGE_PATH_PREFIX = '/kanji/';

self.addEventListener('install', (event) => {
  // 新しい SW をすぐにアクティブ化
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // 古いキャッシュを削除
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      )
    ).then(() => self.clients.claim())
  );
});

// cache-first: 画像のみキャッシュ。CSVファイルは常に最新を取得
self.addEventListener('fetch', (event) => {
  try {
    const req = event.request;
    const url = new URL(req.url);

    // CSVファイルは常にネットワークから取得（キャッシュしない）
    const isCsv = url.pathname.endsWith('.csv');
    if (isCsv) {
      return; // キャッシュ処理をスキップし、通常のfetchに任せる
    }

    // 画像ファイルのみキャッシュ対象
    const isImage = /\.(png|jpg|jpeg|gif|svg|webp|avif)$/i.test(url.pathname);
    const isKanjiPath = url.pathname.startsWith(IMAGE_PATH_PREFIX);

    if (req.method === 'GET' && isImage && isKanjiPath) {
      event.respondWith(
        caches.open(CACHE_NAME).then((cache) =>
          cache.match(req).then((cached) => {
            if (cached) {
              // キャッシュを返す
              return cached;
            }
            // ネットワークから取得してキャッシュ
            return fetch(req).then((res) => {
              // 成功レスポンスのみキャッシュ
              if (res && res.status === 200 && res.type !== 'opaque') {
                cache.put(req, res.clone());
              }
              return res;
            }).catch(() => {
              // ネットワーク失敗時はキャッシュがなければ失敗レスポンス
              return new Response('Service Unavailable', { status: 503 });
            });
          })
        )
      );
    }
  } catch (e) {
    // URL パース失敗などは無視してフォールバック
  }
});

// メッセージで強制更新を受け付ける（オプション）
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
