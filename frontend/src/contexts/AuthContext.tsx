import React, { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './auth-context-core';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { API_BASE_URL } from '@/lib/api-base';
import { buildAssignedStates } from '@/lib/user-territory';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const [session, setSession] = useState<Session | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [role, setRole] = useState<string | null>(localStorage.getItem('role'));
    const [userId, setUserId] = useState<number | null>(() => {
        const stored = localStorage.getItem('userId');
        return stored ? Number(stored) : null;
    });
    const [userName, setUserName] = useState<string | null>(localStorage.getItem('userName'));
    const [tipo, setTipo] = useState<string | null>(localStorage.getItem('tipo'));
    const [estado_end, setEstadoEnd] = useState<string | null>(localStorage.getItem('estado_end'));
    const [assigned_state, setAssignedState] = useState<string | null>(localStorage.getItem('assigned_state'));
    const [assigned_states, setAssignedStates] = useState<string[]>(() => {
        const stored = localStorage.getItem('assigned_states');
        return stored ? JSON.parse(stored) : [];
    });
    const [defaultWorkspace, setDefaultWorkspace] = useState<string | null>(localStorage.getItem('defaultWorkspace'));
    const [inactivityLimit, setInactivityLimit] = useState<number | null>(() => {
        const stored = localStorage.getItem('inactivityLimit');
        return stored ? Number(stored) : null;
    });

    const clearLocalAuth = useCallback(() => {
        ['token', 'role', 'userId', 'userName', 'tipo', 'estado_end', 'assigned_state', 'assigned_states', 'defaultWorkspace', 'inactivityLimit', 'tokenVersion', 'lastActivityTime'].forEach(k => localStorage.removeItem(k));
        setToken(null); setRole(null); setUserId(null); setUserName(null); setTipo(null); setEstadoEnd(null); setAssignedState(null);
        setAssignedStates([]);
        setDefaultWorkspace(null); setInactivityLimit(null); setTokenVersion(null);
    }, []);

    const logout = useCallback(async () => {
        // Clear local state first before signOut to avoid infinite loop in onAuthStateChange
        clearLocalAuth();
        // signOut last — this triggers onAuthStateChange but we no longer call logout() there
        await supabase.auth.signOut();
    }, [clearLocalAuth]);

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                const existingToken = session.access_token;
                setToken(existingToken);
                localStorage.setItem('token', existingToken);

                // ALWAYS validate session metadata with backend on startup to ensure token is still valid
                fetch(`${API_BASE_URL}/api/auth/me`, {
                    headers: { 'Authorization': `Bearer ${existingToken}` }
                })
                .then(async r => {
                    if (r.ok) {
                        const userData = await r.json();
                        const assigned_states = buildAssignedStates(
                            userData.assigned_state,
                            userData.territories
                        );
                        login(existingToken, userData.id, userData.role, userData.full_name, userData.tipo, userData.estado_end, userData.default_workspace, userData.inactivity_limit, userData.token_version, userData.assigned_state, assigned_states);
                    } else if (r.status === 401) {
                        // Token invalid on backend (e.g. email changed or kicked)
                        clearLocalAuth();
                        await supabase.auth.signOut();
                    }
                })
                .catch(e => {
                    console.error('Error validating session:', e);
                    // If it's a connection error, we might want to keep the local session as fallback
                    // but for 401 we definitely want to clear.
                })
                .finally(() => setIsLoading(false));
            } else {
                 // If Supabase says no session, we should clear our local state
                 clearLocalAuth();
                 setIsLoading(false);
             }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log(`[AUTH] Event: ${event}`);
            setSession(session);

            if (event === 'SIGNED_OUT') {
                console.warn('[AUTH] Session signed out or refresh failed. Clearing local data.');
                clearLocalAuth();
            } else if (session && session.access_token !== localStorage.getItem('token')) {
                setToken(session.access_token);
                localStorage.setItem('token', session.access_token);
                // Garante que lastActivityTime esteja definido antes que o efeito de
                // inatividade rode — evita logout() prematuro durante o fluxo de login.
                if (!localStorage.getItem('lastActivityTime')) {
                    localStorage.setItem('lastActivityTime', Date.now().toString());
                }
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const [tokenVersion, setTokenVersion] = useState<number | null>(() => {
        const stored = localStorage.getItem('tokenVersion');
        return stored ? Number(stored) : null;
    });

    const login = useCallback((newToken: string, newUserId: number, newRole: string, newUserName?: string, newTipo?: string, newEstadoEnd?: string, newDefaultWorkspace?: string, newInactivityLimit?: number, newTokenVersion?: number, newAssignedState?: string, newAssignedStates?: string[]) => {
        setToken(newToken);
        setRole(newRole);
        setUserId(newUserId);
        setUserName(newUserName || null);
        setTipo(newTipo || null);
        setEstadoEnd(newEstadoEnd || null);
        setAssignedState(newAssignedState || null);
        setAssignedStates(newAssignedStates || []);
        setDefaultWorkspace(newDefaultWorkspace || null);
        setInactivityLimit(newInactivityLimit || null);
        setTokenVersion(newTokenVersion || 0);

        localStorage.setItem('token', newToken);
        localStorage.setItem('role', newRole);
        localStorage.setItem('userId', String(newUserId));
        localStorage.setItem('lastActivityTime', Date.now().toString());
        if (newUserName) localStorage.setItem('userName', newUserName);
        if (newTipo) localStorage.setItem('tipo', newTipo);
        if (newEstadoEnd) localStorage.setItem('estado_end', newEstadoEnd);
        if (newAssignedState) {
            localStorage.setItem('assigned_state', newAssignedState);
        } else {
            localStorage.removeItem('assigned_state');
        }
        localStorage.setItem('assigned_states', JSON.stringify(newAssignedStates || []));
        if (newDefaultWorkspace) localStorage.setItem('defaultWorkspace', newDefaultWorkspace);
        if (newInactivityLimit) localStorage.setItem('inactivityLimit', String(newInactivityLimit));
        if (newTokenVersion) localStorage.setItem('tokenVersion', String(newTokenVersion));
    }, []);

    // Inactivity Tracker
    useEffect(() => {
        if (!token) return;

        const limitMinutes = inactivityLimit || 30; // 30 minutes default
        const limitMs = limitMinutes * 60 * 1000;
        // Aviso quando faltar 1 minuto ou restarem apenas 10% do tempo (o que for maior)
        const warningThresholdMs = limitMs - Math.min(60000, limitMs * 0.1);

        const checkInactivity = () => {
            const lastActive = localStorage.getItem('lastActivityTime');
            if (!lastActive) {
                localStorage.setItem('lastActivityTime', Date.now().toString());
                return;
            }
            
            const now = Date.now();
            const inactiveTime = now - parseInt(lastActive, 10);

            if (inactiveTime > limitMs) {
                console.warn('[AUTH] Inactivity limit reached. Logging out.');
                toast.error("Sessão encerrada por inatividade.");
                logout();
            } else if (inactiveTime > warningThresholdMs) {
                const remainingSeconds = Math.ceil((limitMs - inactiveTime) / 1000);
                if (remainingSeconds > 0) {
                    toast.warning(`Sua sessão expirará em breve (${remainingSeconds}s) devido à inatividade.`, {
                        id: 'inactivity-warning',
                        duration: 5000
                    });
                }
            }
        };

        const updateActivity = () => {
            localStorage.setItem('lastActivityTime', Date.now().toString());
        };

        checkInactivity();
        const intervalId = setInterval(checkInactivity, 15000); // Checar a cada 15s para ser mais responsivo ao aviso

        let throttleTimeout: ReturnType<typeof setTimeout> | null = null;
        const handleActivity = () => {
            if (throttleTimeout) return;
            throttleTimeout = setTimeout(() => {
                updateActivity();
                throttleTimeout = null;
            }, 2000); // Throttling de 2s para poupar localStorage
        };

        // Capturamos eventos no document para garantir que cliques em sidebars e outros elementos sejam detectados
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        events.forEach(e => document.addEventListener(e, handleActivity, { capture: true, passive: true }));

        return () => {
            clearInterval(intervalId);
            events.forEach(e => document.removeEventListener(e, handleActivity, { capture: true }));
            if (throttleTimeout) clearTimeout(throttleTimeout);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, inactivityLimit]);

    return (
        <AuthContext.Provider value={{
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
            loading: isLoading
        }}>
            {children}
        </AuthContext.Provider>
    );
}

