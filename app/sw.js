// ================================================================
// sw.js — Service Worker (PWA)
// Cache de assets estáticos para carregamento offline.
// ================================================================

const CACHE_NAME = 'officinal-v1';

const ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/styles/main.css',
  '/config/supabase.js',
  '/components/toast.js',
  '/components/modal.js',
  '/utils/formatos.js',
  '/utils/exportar.js',
  '/utils/importacao-dicionario.js',
  '/pages/login.js',
  '/pages/dashboard.js',
  '/pages/estoque.js',
  '/pages/importacao.js',
  '/pages/conferencia.js',
  '/pages/pendencias.js',
  '/pages/validade.js',
  '/pages/historico.js',
  '/pages/relatorios.js',
  '/services/produto.service.js',
  '/services/importacao.service.js',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3/dist/tabler-icons.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
];

// Instalar: pré-cachear assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Ativar: limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache first para assets, network first para API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Supabase e APIs externas: sempre buscar da rede
  if (url.hostname.includes('supabase.co') || url.pathname.startsWith('/rest/')) {
    return;
  }

  // Assets estáticos: cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
