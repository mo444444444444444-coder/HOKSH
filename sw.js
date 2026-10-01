const CACHE='hoksh-v6-final-ui';
const CORE=['./','./index.html','./manifest.webmanifest','./icon.svg','./developer.jpg'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  // Always ask the network for HTML/navigation so visitors receive the newest HOKSH build.
  if(e.request.mode==='navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/HOKSH/')){
    e.respondWith(fetch(e.request).then(r=>{
      const copy=r.clone(); caches.open(CACHE).then(c=>c.put('./index.html',copy)).catch(()=>{}); return r;
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached=>{
    if(cached)return cached;
    return fetch(e.request).then(r=>{
      const copy=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{}); return r;
    }).catch(()=>caches.match('./index.html'));
  }));
});