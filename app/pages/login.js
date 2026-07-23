// ================================================================
// pages/login.js — Tela de autenticação
// ================================================================

import { supabase } from '../config/supabase.js';
import { toast }    from '../components/toast.js';

export function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div style="
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg);
      padding: 20px;
    ">
      <div style="width: 100%; max-width: 360px;">

        <!-- Logo -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:32px;">
          <div style="
            width:40px;height:40px;
            background:var(--accent);
            border-radius:10px;
            display:flex;align-items:center;justify-content:center;
            color:#fff;font-size:20px;
          ">
            <i class="ti ti-flask"></i>
          </div>
          <div>
            <div style="font-size:16px;font-weight:600;color:var(--text-primary)">Farmácia Officinal</div>
            <div style="font-size:12px;color:var(--text-muted)">Controle de estoque</div>
          </div>
        </div>

        <!-- Card de login -->
        <div class="card">
          <h1 style="font-size:18px;font-weight:600;margin-bottom:4px">Entrar</h1>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:24px">
            Acesse com seu e-mail e senha
          </p>

          <form id="login-form" style="display:flex;flex-direction:column;gap:14px;">
            <div class="field">
              <label for="email">E-mail</label>
              <input
                id="email"
                type="email"
                class="input input-lg"
                placeholder="seu@email.com"
                autocomplete="email"
                required
              />
            </div>

            <div class="field">
              <label for="senha">Senha</label>
              <div style="position:relative">
                <input
                  id="senha"
                  type="password"
                  class="input input-lg"
                  placeholder="••••••••"
                  autocomplete="current-password"
                  required
                  style="padding-right:40px"
                />
                <button
                  type="button"
                  id="toggle-senha"
                  class="btn btn-ghost btn-icon btn-sm"
                  aria-label="Mostrar senha"
                  style="position:absolute;right:4px;top:50%;transform:translateY(-50%);color:var(--text-muted)"
                >
                  <i class="ti ti-eye" id="olho-icon"></i>
                </button>
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-lg w-full" id="btn-entrar" style="margin-top:4px">
              <span id="btn-texto">Entrar</span>
              <span id="btn-loading" style="display:none" class="spinner" style="width:16px;height:16px;border-width:2px"></span>
            </button>
          </form>
        </div>

        <p style="text-align:center;font-size:12px;color:var(--text-muted);margin-top:20px">
          Farmácia Officinal · Sistema interno
        </p>
      </div>
    </div>
  `;

  // Toggle senha
  document.getElementById('toggle-senha').addEventListener('click', () => {
    const input = document.getElementById('senha');
    const icon  = document.getElementById('olho-icon');
    const mostrar = input.type === 'password';
    input.type = mostrar ? 'text' : 'password';
    icon.className = mostrar ? 'ti ti-eye-off' : 'ti ti-eye';
  });

  // Submit
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const senha  = document.getElementById('senha').value;
    const btn    = document.getElementById('btn-entrar');
    const texto  = document.getElementById('btn-texto');
    const loader = document.getElementById('btn-loading');

    btn.disabled  = true;
    texto.style.display  = 'none';
    loader.style.display = 'inline-block';

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

    btn.disabled  = false;
    texto.style.display  = 'inline';
    loader.style.display = 'none';

    if (error) {
      toast.erro('E-mail ou senha incorretos.');
      document.getElementById('senha').value = '';
      document.getElementById('senha').focus();
    }
    // Se ok, o listener onAuthStateChange em app.js redireciona automaticamente
  });

  // Foco automático no campo de e-mail
  document.getElementById('email').focus();
}
