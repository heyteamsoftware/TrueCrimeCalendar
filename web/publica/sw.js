/* Service worker de la web instalable (TRUE CRIME CALENDAR).
   - Guarda la página, las tipografías, los iconos y los guiones para que la web abra sin conexión.
   - Siempre intenta primero la red para lo que puede cambiar (página, guiones, índice de audio), así que
     un cambio de contenido en el servidor llega de inmediato y las cintas no se descuadran.
   - No toca las cintas (.ogg), el contador de visitas ni la versión mínima: esas peticiones van directas a la red. */
const VERSION = "__VERSION__";
const CACHE = "tcc-" + VERSION;
const BASICOS = ["truecrime.html", "fonts/fonts.css", "favicon.svg", "icono-192.png", "icono-512.png", "manifest.webmanifest"];

self.addEventListener("install", ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", ev => {
  ev.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("tcc-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const ESTATICO = /\/(fonts|sfx)\/|\/(favicon|icono|apple-touch|og-image)[^/]*$/;
const DIRECTO = /\.(ogg|php)$|version-minima\.json$|\/sw\.js$/;

self.addEventListener("fetch", ev => {
  const req = ev.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || req.headers.has("range") || DIRECTO.test(url.pathname)) return;

  if (ESTATICO.test(url.pathname)) {              // no cambian: primero la copia guardada
    ev.respondWith(caches.match(req).then(hit => hit || red(req)));
    return;
  }
  ev.respondWith(                                   // lo demás: primero la red, y sin conexión la última copia
    red(req).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === "navigate" ? caches.match("truecrime.html") : Response.error())))
  );
});

function red(req) {
  return fetch(req).then(res => {
    if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
    return res;
  });
}
