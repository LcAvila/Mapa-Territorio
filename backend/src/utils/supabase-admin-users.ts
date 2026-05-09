import type { User as AuthUser } from '@supabase/supabase-js';
import { supabaseAdmin } from '../lib/supabase';

/** E-mail usado no Supabase Auth (mesma regra do kick e da tela de login). */
export function resolveAuthEmailFromDbUser(user: {
  username: string;
  code: string | null;
}): string {
  if (user.username === 'admin') return 'admin@mapaterritorio.com';
  const login = String(user.code || user.username || '').trim();
  if (!login) throw new Error('Usuário sem código/username para montar o e-mail de login');
  return `${login}@mapaterritorio.com`;
}

/**
 * listUsers() é paginado; buscar só na primeira página falha para muitos usuários.
 */
export async function findAuthUserByEmail(email: string): Promise<AuthUser | null> {
  const normalized = email.toLowerCase();
  const perPage = 200;
  const maxPages = 100;

  for (let page = 1; page <= maxPages; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('[supabase-admin-users] listUsers:', error);
      throw error;
    }
    const users = data?.users ?? [];
    const found = users.find((u) => (u.email || '').toLowerCase() === normalized);
    if (found) return found;
    if (users.length < perPage) break;
  }
  return null;
}
