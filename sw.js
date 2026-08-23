/* 排座台账 Service Worker —— 离线缓存应用外壳
 * 仅在通过 http/https 访问时生效（双击 file:// 打开不注册，不影响使用）。
 */
var CACHE="seatLedger-cache-v1";
var ASSETS=["index.html","manifest.webmanifest","icon-192.png","icon-512.png"];

self.addEventListener("install",function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch",function(e){
  var req=e.request;
  if(req.method!=="GET") return;
  // 导航请求：优先网络（始终拿最新版），联网成功后把新页面写回缓存，
  // 使之后的离线打开也是最新；网络不可用时回退缓存的 index.html。
  if(req.mode==="navigate"){
    e.respondWith(fetch(req).then(function(res){
      if(res && res.status===200 && (res.type==="basic"||res.type==="opaque")){
        var cp=res.clone(); caches.open(CACHE).then(function(c){ c.put("index.html",cp); });
      }
      return res;
    }).catch(function(){ return caches.match("index.html"); }));
    return;
  }
  // 静态资源：缓存优先，缺失则网络并写入缓存
  e.respondWith(caches.match(req).then(function(hit){
    if(hit) return hit;
    return fetch(req).then(function(res){
      if(res && res.status===200 && (res.type==="basic"||res.type==="opaque")){
        var cp=res.clone(); caches.open(CACHE).then(function(c){ c.put(req,cp); });
      }
      return res;
    });
  }));
});
