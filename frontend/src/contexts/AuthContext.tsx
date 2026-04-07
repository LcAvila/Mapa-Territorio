import React, { useState, useEffect } from 'react';
import { AuthContext } from './auth-context-core';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [role, setRole] = useState<string | null>(localStorage.getItem('role'));
    const [userId, setUserId] = useState<number | null>(() => {
        const stored = localStorage.getItem('userId');
        return stored ? Number(stored) : null;
    });
    const [userName, setUserName] = useState<string | null>(localStorage.getItem('userName'));
    const [repCode, setRepCode] = useState<string | null>(localStorage.getItem('repCode'));
    const [tipo, setTipo] = useState<string | null>(localStorage.getItem('tipo'));
    const [estado_end, setEstadoEnd] = useState<string | null>(localStorage.getItem('estado_end'));
    const [defaultWorkspace, setDefaultWorkspace] = useState<string | null>(localStorage.getItem('defaultWorkspace'));
    const [inactivityLimit, setInactivityLimit] = useState<number | null>(() => {
        const stored = localStorage.getItem('inactivityLimit');
        return stored ? Number(stored) : null;
    });

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                const existingToken = session.access_token;
                setToken(existingToken);
                localStorage.setItem('token', existingToken);

                // If we have a token but missing core metadata (common after refresh), restore it
                if (!localStorage.getItem('role') || !localStorage.getItem('userId')) {
                    fetch('http://localhost:3001/api/auth/me', {
                        headers: { 'Authorization': `Bearer ${existingToken}` }
                    })
                    .then(r => r.json())
                    .then(userData => {
                        if (userData.id) {
                            login(existingToken, userData.id, userData.role, userData.fullName, userData.tipo, userData.repCode, userData.estadoEnd, userData.defaultWorkspace, userData.inactivityLimit, userData.token_version);
                        }
                    })
                    .catch(e => console.error('Error restoring session metadata:', e));
                }
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session && session.access_token !== localStorage.getItem('token')) {
                setToken(session.access_token);
                localStorage.setItem('token', session.access_token);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const [tokenVersion, setTokenVersion] = useState<number | null>(() => {
        const stored = localStorage.getItem('tokenVersion');
        return stored ? Number(stored) : null;
    });

    const login = (newToken: string, newUserId: number, newRole: string, newUserName?: string, newTipo?: string, newRepCode?: string, newEstadoEnd?: string, newWorkspace?: string, newLimit?: number, newTokenVersion?: number) => {
        // Use Supabase access token for API calls
        localStorage.setItem('role', newRole);
        localStorage.setItem('token', newToken);
        localStorage.setItem('userId', String(newUserId));
        if (newTokenVersion !== undefined) localStorage.setItem('tokenVersion', String(newTokenVersion));

        if (newUserName) localStorage.setItem('userName', newUserName);
        if (newRepCode) localStorage.setItem('repCode', newRepCode);
        if (newTipo) localStorage.setItem('tipo', newTipo);
        if (newEstadoEnd) localStorage.setItem('estado_end', newEstadoEnd);
        if (newWorkspace) localStorage.setItem('defaultWorkspace', newWorkspace);
        if (newLimit) localStorage.setItem('inactivityLimit', String(newLimit));

        setRole(newRole);
        setToken(newToken);
        setUserId(newUserId);
        if (newTokenVersion !== undefined) setTokenVersion(newTokenVersion);
        setUserName(newUserName || null);
        setRepCode(newRepCode || null);
        setTipo(newTipo || null);
        setEstadoEnd(newEstadoEnd || null);
        setDefaultWorkspace(newWorkspace || null);
        setInactivityLimit(newLimit || null);
    };

    const logout = async () => {
        // Clear local state first before signOut to avoid infinite loop in onAuthStateChange
        ['token', 'role', 'userId', 'userName', 'repCode', 'tipo', 'estado_end', 'defaultWorkspace', 'inactivityLimit', 'tokenVersion'].forEach(k => localStorage.removeItem(k));
        setToken(null); setRole(null); setUserId(null); setUserName(null); setRepCode(null); setTipo(null); setEstadoEnd(null);
        setDefaultWorkspace(null); setInactivityLimit(null); setTokenVersion(null);
        // signOut last — this triggers onAuthStateChange but we no longer call logout() there
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{
            token,
            role,
            userId,
            userName,
            repCode,
            tipo,
            estado_end,
            defaultWorkspace,
            inactivityLimit,
            tokenVersion,
            login,
            logout,
            isAuthenticated: !!token
        }}>
            {children}
        </AuthContext.Provider>
    );
}

