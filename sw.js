// Estratégia: "cache-first" para o app shell (HTML/CSS/JS/ícones).
// Justificativa: como a aplicação não depende de nenhuma API externa
// (os dados moram no LocalStorage do próprio navegador), não existe
// conteúdo "sempre novo" para buscar na rede — cachear tudo é seguro
// e é o que permite abrir o app inteiro offline.
const CACHE_NAME = 'clientflow-v2';

const ARQUIVOS_APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/reset.css',
  './css/variables.css',
  './css/base.css',
  './css/components.css',
  './css/responsive.css',
  './js/main.js',
  './js/state.js',
  './js/storage.js',
  './js/validation.js',
  './js/dom.js',
  './js/events.js',
  './js/utils.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS_APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  // Remove caches de versões antigas (ex.: quando o CACHE_NAME mudar
  // em um próximo deploy), evitando que a aplicação sirva arquivos
  // desatualizados indefinidamente.
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((chave) => chave !== CACHE_NAME).map((chave) => caches.delete(chave))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;
  evento.respondWith(
    caches.match(evento.request).then((respostaCache) => {
      if (respostaCache) return respostaCache;
      return fetch(evento.request).catch(() => caches.match('./index.html'));
    })
  );
});
