const C = 'yol3d-v1', F = ['./', 'index.html', 'style.css', 'game.js', 'manifest.json'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(F))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(n => { const k = n.clone(); caches.open(C).then(c => c.put(e.request, k)); return n; }))));
