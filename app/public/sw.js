// One-time retirement of the legacy cache-first worker.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) {
    if (name.startsWith('ctf-daily-')) await caches.delete(name);
  }
  await self.clients.claim();
  await self.registration.unregister();
})()));
