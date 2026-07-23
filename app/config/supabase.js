// ================================================================
// config/supabase.js
// Cliente Supabase — instância única exportada para todo o app.
// ================================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL  = 'https://npcqgcbiuzckippkrntq.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wY3FnY2JpdXpja2lwcGtybnRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDM2MDgsImV4cCI6MjEwMDMxOTYwOH0.IuEOE6iw9AjM4uTbXjWrBBQeoTsgUzhpsqyJI-VFsiU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Retorna a sessão ativa ou null
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Retorna o usuário logado ou null
export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
