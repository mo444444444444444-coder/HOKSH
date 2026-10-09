const CACHE='hoksh-pro-v3';
const CORE=['./','./index.html','./manifest.webmanifest','./icon.svg','./developer.jpg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);
 if(e.request.mode==='navigate'||u.pathname.endsWith('/index.html')||u.pathname.endsWith('/HOKSH/')){
   e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put('./index.html',c)).catch(()=>{});return r}).catch(()=>caches.match('./index.html')));return;
 }
 e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{const q=r.clone();caches.open(CACHE).then(x=>x.put(e.request,q)).catch(()=>{});return r}).catch(()=>caches.match('./index.html'))));
});