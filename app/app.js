// ================================================================
// app.js — Bootstrap, roteador, layout e autenticação
// ================================================================

import { supabase, getSession } from './config/supabase.js';
import { renderLogin }          from './pages/login.js';
import { toast }                from './components/toast.js';

// ── Estado global ─────────────────────────────────────────────
let currentUser = null;
let currentRoute = '';

// ── Rotas disponíveis ─────────────────────────────────────────
// Cada rota é carregada dinamicamente (lazy) ao navegar
const ROTAS = {
  'dashboard':   { label: 'Dashboard',    icon: 'ti-layout-dashboard', loader: () => import('./pages/dashboard.js') },
  'estoque':     { label: 'Estoque',      icon: 'ti-packages',         loader: () => import('./pages/estoque.js') },
  'importacao':  { label: 'Importar',     icon: 'ti-file-import',      loader: () => import('./pages/importacao.js') },
  'conferencia': { label: 'Conferência',  icon: 'ti-clipboard-check',  loader: () => import('./pages/conferencia.js') },
  'pendencias':  { label: 'Notas Pend.',  icon: 'ti-file-invoice',     loader: () => import('./pages/pendencias.js') },
  'validade':    { label: 'Validade',     icon: 'ti-calendar-x',       loader: () => import('./pages/validade.js') },
  'historico':   { label: 'Histórico',    icon: 'ti-history',          loader: () => import('./pages/historico.js') },
  'relatorios':  { label: 'Relatórios',   icon: 'ti-chart-bar',        loader: () => import('./pages/relatorios.js') },
};

const ROTA_PADRAO = 'dashboard';

// ── Bootstrap ─────────────────────────────────────────────────
async function init() {
  const session = await getSession();
  if (session?.user) {
    currentUser = session.user;
    renderApp();
    navegarPara(rotaAtual() || ROTA_PADRAO);
  } else {
    renderLogin();
  }

  // Escuta mudanças de autenticação
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      currentUser = session.user;
      renderApp();
      navegarPara(ROTA_PADRAO);
    }
    if (event === 'SIGNED_OUT') {
      currentUser = null;
      renderLogin();
    }
  });

  // Escuta navegação via hash
  window.addEventListener('hashchange', () => {
    if (currentUser) navegarPara(rotaAtual());
  });
}

// ── Rota atual via hash ────────────────────────────────────────
function rotaAtual() {
  return window.location.hash.replace('#', '') || ROTA_PADRAO;
}

// ── Renderizar shell do app ────────────────────────────────────
function renderApp() {
  const nome  = currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'Usuário';
  const email = currentUser?.email || '';
  const iniciais = nome.slice(0, 2).toUpperCase();

  document.getElementById('app').innerHTML = `
    <!-- Overlay mobile -->
    <div class="sidebar-overlay" id="sidebar-overlay"></div>

    <!-- Sidebar -->
    <nav id="sidebar" aria-label="Menu principal">
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">
          <i class="ti ti-flask" aria-hidden="true"></i>
        </div>
        <div class="sidebar-logo-text">
          Officinal
          <div class="sidebar-logo-sub">Estoque</div>
        </div>
      </div>

      <div class="sidebar-nav" id="sidebar-nav">
        <div class="nav-section">Principal</div>
        ${navItem('dashboard',   'ti-layout-dashboard', 'Dashboard')}
        ${navItem('estoque',     'ti-packages',         'Estoque')}
        ${navItem('importacao',  'ti-file-import',      'Importar produtos')}
        ${navItem('conferencia', 'ti-clipboard-check',  'Conferência')}

        <div class="nav-section" style="margin-top:8px">Gestão</div>
        ${navItem('pendencias',  'ti-file-invoice',     'Notas pendentes', 'pendencias-badge')}
        ${navItem('validade',    'ti-calendar-x',       'Validade',        'validade-badge')}
        ${navItem('historico',   'ti-history',          'Histórico')}
        ${navItem('relatorios',  'ti-chart-bar',        'Relatórios')}
      </div>

      <div class="sidebar-footer">
        <div class="sidebar-user" id="user-menu" role="button" tabindex="0" aria-label="Menu do usuário">
          <div class="user-avatar">${iniciais}</div>
          <div class="user-info">
            <div class="user-name">${nome}</div>
            <div class="user-email">${email}</div>
          </div>
          <i class="ti ti-logout" style="color:var(--text-muted);font-size:15px" aria-hidden="true"></i>
        </div>
      </div>
    </nav>

    <!-- Área principal -->
    <div id="main">
      <header id="header">
        <button class="menu-btn" id="menu-btn" aria-label="Abrir menu">
          <i class="ti ti-menu-2" aria-hidden="true"></i>
        </button>
        <h1 class="header-title" id="header-title">Dashboard</h1>
        <div class="header-actions">
          <button class="theme-btn" id="theme-btn" aria-label="Alternar tema">
            <i class="ti ti-moon" id="theme-icon" aria-hidden="true"></i>
          </button>
        </div>
      </header>

      <main id="page" role="main">
        <div class="loading-page">
          <div class="spinner"></div>
          <span>Carregando…</span>
        </div>
      </main>
    </div>
  `;

  // Eventos do layout
  bindLayoutEvents();
  // Carregar badges dos contadores
  carregarBadges();
}

// ── Gerar item de menu ─────────────────────────────────────────
function navItem(rota, icon, label, badgeId = null) {
  return `
    <a class="nav-item" data-rota="${rota}" href="#${rota}" role="menuitem">
      <i class="ti ${icon}" aria-hidden="true"></i>
      <span>${label}</span>
      ${badgeId ? `<span class="nav-badge" id="${badgeId}" style="display:none">0</span>` : ''}
    </a>
  `;
}

// ── Eventos do layout ──────────────────────────────────────────
function bindLayoutEvents() {
  // Navegação nos itens do menu
  document.getElementById('sidebar-nav').addEventListener('click', (e) => {
    const item = e.target.closest('[data-rota]');
    if (item) fecharMenuMobile();
  });

  // Logout
  const userMenu = document.getElementById('user-menu');
  userMenu.addEventListener('click', sair);
  userMenu.addEventListener('keydown', (e) => { if (e.key === 'Enter') sair(); });

  // Menu mobile
  document.getElementById('menu-btn').addEventListener('click', abrirMenuMobile);
  document.getElementById('sidebar-overlay').addEventListener('click', fecharMenuMobile);

  // Tema
  const temaAtual = localStorage.getItem('tema') || 'light';
  aplicarTema(temaAtual);
  document.getElementById('theme-btn').addEventListener('click', () => {
    const novo = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    aplicarTema(novo);
    localStorage.setItem('tema', novo);
  });

  // Atalhos de teclado globais
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      navegarPara('estoque');
      setTimeout(() => document.getElementById('busca-input')?.focus(), 100);
    }
  });
}

// ── Navegação ──────────────────────────────────────────────────
export async function navegarPara(rota) {
  if (!ROTAS[rota]) rota = ROTA_PADRAO;
  if (rota === currentRoute) return;
  currentRoute = rota;

  // Atualizar hash sem disparar hashchange
  history.replaceState(null, '', `#${rota}`);

  // Atualizar menu ativo
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.rota === rota);
  });

  // Atualizar título do header
  const titulo = ROTAS[rota]?.label || '';
  const headerTitle = document.getElementById('header-title');
  if (headerTitle) headerTitle.textContent = titulo;

  // Mostrar loading
  const page = document.getElementById('page');
  if (page) page.innerHTML = `<div class="loading-page"><div class="spinner"></div><span>Carregando…</span></div>`;

  // Carregar módulo da página
  try {
    const mod = await ROTAS[rota].loader();
    const renderFn = mod.render || mod[`render${rota.charAt(0).toUpperCase() + rota.slice(1)}`];
    if (renderFn && page) renderFn(page);
  } catch (err) {
    console.error('Erro ao carregar página:', err);
    if (page) page.innerHTML = `
      <div class="empty">
        <i class="ti ti-alert-triangle"></i>
        <p>Erro ao carregar esta página.</p>
        <span>${err.message}</span>
      </div>
    `;
  }
}

// ── Tema ───────────────────────────────────────────────────────
function aplicarTema(tema) {
  document.documentElement.dataset.theme = tema;
  const icon = document.getElementById('theme-icon');
  if (icon) icon.className = tema === 'dark' ? 'ti ti-sun' : 'ti ti-moon';
}

// ── Mobile ─────────────────────────────────────────────────────
function abrirMenuMobile() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebar-overlay')?.classList.add('open');
}

function fecharMenuMobile() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('open');
}

// ── Logout ─────────────────────────────────────────────────────
async function sair() {
  await supabase.auth.signOut();
  toast.sucesso('Até logo!');
}

// ── Badges de contadores no menu ───────────────────────────────
async function carregarBadges() {
  try {
    const { data } = await supabase.rpc('fn_dashboard_indicadores');
    if (!data) return;

    const badgePend = document.getElementById('pendencias-badge');
    if (badgePend) {
      const n = (data.pendencias_nf || 0) + (data.parcialmente_emitidas || 0);
      badgePend.textContent = n;
      badgePend.style.display = n > 0 ? 'inline-flex' : 'none';
    }

    const badgeVal = document.getElementById('validade-badge');
    if (badgeVal) {
      const n = (data.vencidos || 0) + (data.vencendo_30 || 0);
      badgeVal.textContent = n;
      badgeVal.style.display = n > 0 ? 'inline-flex' : 'none';
    }
  } catch {
    // Badges são opcionais, falha silenciosa
  }
}

// ── Exportar utilitários para uso nas páginas ──────────────────
export { currentUser, carregarBadges };

// ── Iniciar ────────────────────────────────────────────────────
init();
