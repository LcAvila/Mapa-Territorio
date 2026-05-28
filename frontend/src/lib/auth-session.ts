import { API_BASE_URL } from '@/lib/api-base';
import { supabase } from '@/lib/supabase';
import { buildAssignedStates } from '@/lib/user-territory';

export async function getInitialSupabaseSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function subscribeToAuthChanges(
  onChange: (event: string, session: any) => void
) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    onChange(event, session);
  });

  return () => subscription.unsubscribe();
}

export async function signOutSupabase() {
  await supabase.auth.signOut();
}

export async function validateSessionWithBackend(token: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      data: null,
    };
  }

  const userData = await response.json();

  const assigned_states = buildAssignedStates(
    userData.assigned_state,
    userData.territories
  );

  return {
    ok: true as const,
    status: response.status,
    data: {
      token,
      userId: userData.id,
      role: userData.role,
      userName: userData.full_name,
      tipo: userData.tipo,
      estado_end: userData.estado_end,
      defaultWorkspace: userData.default_workspace,
      inactivityLimit: userData.inactivity_limit,
      tokenVersion: userData.token_version,
      assigned_state: userData.assigned_state,
      assigned_states,
    },
  };
}