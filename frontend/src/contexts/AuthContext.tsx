import React, { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { AuthContext } from './auth-context-core';
import {
  clearStoredAuth,
  persistAuth,
  readStoredAuth,
  touchLastActivity,
} from '@/lib/auth-storage';
import {
  getInitialSupabaseSession,
  signOutSupabase,
  subscribeToAuthChanges,
  validateSessionWithBackend,
} from '@/lib/auth-session';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [stored] = useState(() => readStoredAuth());

  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(stored.token);
  const [role, setRole] = useState<string | null>(stored.role);
  const [userId, setUserId] = useState<number | null>(stored.userId);
  const [userName, setUserName] = useState<string | null>(stored.userName);
  const [tipo, setTipo] = useState<string | null>(stored.tipo);
  const [estado_end, setEstadoEnd] = useState<string | null>(stored.estado_end);
  const [assigned_state, setAssignedState] = useState<string | null>(stored.assigned_state);
  const [assigned_states, setAssignedStates] = useState<string[]>(stored.assigned_states);
  const [defaultWorkspace, setDefaultWorkspace] = useState<string | null>(stored.defaultWorkspace);
  const [inactivityLimit, setInactivityLimit] = useState<number | null>(stored.inactivityLimit);
  const [tokenVersion, setTokenVersion] = useState<number | null>(stored.tokenVersion);

  const clearLocalAuth = useCallback(() => {
    clearStoredAuth();
    setSession(null);
    setToken(null);
    setRole(null);
    setUserId(null);
    setUserName(null);
    setTipo(null);
    setEstadoEnd(null);
    setAssignedState(null);
    setAssignedStates([]);
    setDefaultWorkspace(null);
    setInactivityLimit(null);
    setTokenVersion(null);
  }, []);

  const login = useCallback((
    newToken: string,
    newUserId: number,
    newRole: string,
    newUserName?: string,
    newTipo?: string,
    newEstadoEnd?: string,
    newDefaultWorkspace?: string,
    newInactivityLimit?: number,
    newTokenVersion?: number,
    newAssignedState?: string,
    newAssignedStates?: string[]
  ) => {
    const normalizedUserName = newUserName ?? null;
    const normalizedTipo = newTipo ?? null;
    const normalizedEstadoEnd = newEstadoEnd ?? null;
    const normalizedDefaultWorkspace = newDefaultWorkspace ?? null;
    const normalizedInactivityLimit = newInactivityLimit ?? null;
    const normalizedTokenVersion = newTokenVersion ?? null;
    const normalizedAssignedState = newAssignedState ?? null;
    const normalizedAssignedStates = newAssignedStates ?? [];

    setToken(newToken);
    setRole(newRole);
    setUserId(newUserId);
    setUserName(normalizedUserName);
    setTipo(normalizedTipo);
    setEstadoEnd(normalizedEstadoEnd);
    setAssignedState(normalizedAssignedState);
    setAssignedStates(normalizedAssignedStates);
    setDefaultWorkspace(normalizedDefaultWorkspace);
    setInactivityLimit(normalizedInactivityLimit);
    setTokenVersion(normalizedTokenVersion);

    persistAuth({
      token: newToken,
      role: newRole,
      userId: newUserId,
      userName: normalizedUserName,
      tipo: normalizedTipo,
      estado_end: normalizedEstadoEnd,
      assigned_state: normalizedAssignedState,
      assigned_states: normalizedAssignedStates,
      defaultWorkspace: normalizedDefaultWorkspace,
      inactivityLimit: normalizedInactivityLimit,
      tokenVersion: normalizedTokenVersion,
    });
  }, []);

  const logout = useCallback(async () => {
    clearLocalAuth();
    await signOutSupabase();
  }, [clearLocalAuth]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const currentSession = await getInitialSupabaseSession();
        if (!active) return;

        setSession(currentSession);

        if (!currentSession) {
          clearLocalAuth();
          setIsLoading(false);
          return;
        }

        const existingToken = currentSession.access_token;
        const result = await validateSessionWithBackend(existingToken);

        if (!active) return;

        if (result.ok) {
          const data = result.data;

          login(
            data.token,
            data.userId,
            data.role,
            data.userName,
            data.tipo,
            data.estado_end,
            data.defaultWorkspace,
            data.inactivityLimit,
            data.tokenVersion,
            data.assigned_state,
            data.assigned_states
          );
        } else if (result.status === 401) {
          clearLocalAuth();
          await signOutSupabase();
        }
      } catch (error) {
        console.error('Error validating session:', error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    bootstrap();

    const unsubscribe = subscribeToAuthChanges((event, nextSession) => {
      if (!active) return;

      setSession(nextSession);

      if (event === 'SIGNED_OUT') {
        clearLocalAuth();
        return;
      }

      if (!nextSession?.access_token) return;

      setToken((currentToken) => {
        if (currentToken !== nextSession.access_token) {
          touchLastActivity();
          return nextSession.access_token;
        }
        return currentToken;
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [clearLocalAuth, login]);

  useInactivityLogout({
    enabled: !!token,
    inactivityLimit,
    onLogout: logout,
  });

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        userId,
        userName,
        tipo,
        estado_end,
        assigned_state,
        assigned_states,
        defaultWorkspace,
        inactivityLimit,
        tokenVersion,
        login,
        logout,
        isAuthenticated: !!token,
        loading: isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}