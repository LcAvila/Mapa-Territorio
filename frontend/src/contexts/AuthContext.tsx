import React, { useState, useEffect } from 'react';
import { AuthContext } from './auth-context-core';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { API_BASE_URL } from '@/lib/api-base';

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
    const [defaultWorkspace, setDefaultWorkspace] = useState<string | null>(localStorage.getItem('defaultWorkspace'));
    const [inactivityLimit, setInactivityLimit] = useState<number | null>(() => {
        const stored = localStorage.getItem('inactivityLimit');
        return stored ? Number(stored) : null;
    });

    const clearLocalAuth = () => {
        ['token', 'role', 'userId', 'userName', 'tipo', 'estado_end', 'defaultWorkspace', 'inactivityLimit', 'tokenVersion', 'lastActivityTime'].forEach(k => localStorage.removeItem(k));
        setToken(null); setRole(null); setUserId(null); setUserName(null); setTipo(null); setEstadoEnd(null);
        setDefaultWorkspace(null); setInactivityLimit(null); setTokenVersion(null);
    };

    const logout = async () => {
        // Clear local state first before signOut to avoid infinite loop in onAuthStateChange
        clearLocalAuth();
        // signOut last — this triggers onAuthStateChange but we no longer call logout() there
        await supabase.auth.signOut();
    };

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
                        login(existingToken, userData.id, userData.role, userData.full_name, userData.tipo, userData.estado_end, userData.default_workspace, userData.inactivity_limit, userData.token_version);
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

    const login = (newToken: string, newUserId: number, newRole: string, newUserName?: string, newTipo?: string, newEstadoEnd?: string, newWorkspace?: string, newLimit?: number, newTokenVersion?: number) => {
        // Use Supabase access token for API calls
        localStorage.setItem('role', newRole);
        localStorage.setItem('token', newToken);
        localStorage.setItem('userId', String(newUserId));
        // Stamp activity time so the inactivity tracker has a reference point
        localStorage.setItem('lastActivityTime', Date.now().toString());
        if (newTokenVersion !== undefined) localStorage.setItem('tokenVersion', String(newTokenVersion));

        if (newUserName) localStorage.setItem('userName', newUserName);
        if (newTipo) localStorage.setItem('tipo', newTipo);
        if (newEstadoEnd) localStorage.setItem('estado_end', newEstadoEnd);
        if (newWorkspace) localStorage.setItem('defaultWorkspace', newWorkspace);
        if (newLimit) localStorage.setItem('inactivityLimit', String(newLimit));

        setRole(newRole);
        setToken(newToken);
        setUserId(newUserId);
        if (newTokenVersion !== undefined) setTokenVersion(newTokenVersion);
        setUserName(newUserName || null);
        setTipo(newTipo || null);
        setEstadoEnd(newEstadoEnd || null);
        setDefaultWorkspace(newWorkspace || null);
        setInactivityLimit(newLimit || null);
    };

    // Inactivity Tracker
    useEffect(() => {
        if (!token) return;

        const limitMinutes = inactivityLimit || 30; // 30 minutes default
        const limitMs = limitMinutes * 60 * 1000;

        const checkInactivity = () => {
            const lastActive = localStorage.getItem('lastActivityTime');
            if (!lastActive) {
                // Sem timestamp: pode ser sessão restaurada sem atividade conhecida.
                // Definimos como agora para não derrubar o usuário que acabou de logar.
                localStorage.setItem('lastActivityTime', Date.now().toString());
                return;
            }
            const now = Date.now();
            if (now - parseInt(lastActive, 10) > limitMs) {
                logout();
            }
        };

        const updateActivity = () => {
            localStorage.setItem('lastActivityTime', Date.now().toString());
        };

        checkInactivity();
        const intervalId = setInterval(checkInactivity, 60000);

        let throttleTimeout: ReturnType<typeof setTimeout> | null = null;
        const handleActivity = () => {
            if (throttleTimeout) return;
            throttleTimeout = setTimeout(() => {
                updateActivity();
                throttleTimeout = null;
            }, 1000);
        };

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, handleActivity));

        return () => {
            clearInterval(intervalId);
            events.forEach(e => window.removeEventListener(e, handleActivity));
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

