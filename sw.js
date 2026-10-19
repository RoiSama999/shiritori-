// sw.js - Service Worker cho Emi Nihongo PWA
// Chiến lược: Network-first cho trang chính (đảm bảo luôn mới), Cache-first có version cho file tĩnh (chạy offline Flashcard, Hành trình)

const CACHE_VERSION = 'v2.1.0';
const CACHE_NAME = `emi-nihongo-${CACHE_VERSION}`;

// Danh sách tài nguyên tĩnh cần nạp trước (precache)
const PRECACHE_ASSETS = [
  './index.v2.html',
  './vocab.js',
  './manifest.webmanifest',
  './icon.svg'
];

// Cài đặt Service Worker và lưu trước tài nguyên tĩnh
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    }).catch(err => {
      console.warn('[SW] Lỗi trong quá trình precache:', err);
    })
  );
});

// Kích hoạt Service Worker: Dọn dẹp cache phiên bản cũ để không kẹt bản cũ
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key.startsWith('emi-nihongo-') && key !== CACHE_NAME) {
            console.log('[SW] Xóa cache cũ:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Xử lý nạp tài nguyên (Fetch)
self.addEventListener('fetch', event => {
  const req = event.request;

  // Bỏ qua các yêu cầu không phải GET hoặc gọi API Worker Auth/PeerJS
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Không cache các endpoint API Worker hoặc WebSocket PeerJS
  if (url.pathname.startsWith('/api/') || url.hostname.includes('workers.dev') || url.hostname.includes('peerjs.com')) {
    return;
  }

  // TRANG CHÍNH: index.v2.html hoặc root -> NETWORK-FIRST (luôn cập nhật mới nhất, nếu mất mạng thì rơi về cache)
  const isMainPage = url.pathname.endsWith('index.v2.html') || url.pathname.endsWith('/') || url.pathname === '';
  if (isMainPage) {
    event.respondWith(
      fetch(req)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const respClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, respClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Khi offline, tìm trong cache index.v2.html
          return caches.match(req).then(cached => {
            if (cached) return cached;
            return caches.match('./index.v2.html');
          });
        })
    );
    return;
  }

  // TÀI NGUYÊN TĨNH (vocab.js, icon.svg, manifest, CDN scripts): CACHE-FIRST
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) {
        return cached;
      }
      return fetch(req).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const respClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, respClone));
        }
        return networkResponse;
      }).catch(fetchErr => {
        console.warn('[SW] Offline fetch fallback cho:', req.url);
        // Nếu là yêu cầu điều hướng mà rớt mạng, fallback về trang chính
        if (req.mode === 'navigate') {
          return caches.match('./index.v2.html');
        }
        throw fetchErr;
      });
    })
  );
});
