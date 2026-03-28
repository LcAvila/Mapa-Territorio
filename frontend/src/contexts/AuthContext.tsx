import React, { useState } from 'react';
import { AuthContext, AuthContextType } from './auth-context-core';

export function AuthProvider({ children }: { children: React.ReactNode }) {
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

    const login = (newToken: string, newRole: string, newUserName?: string, newTipo?: string, newRepCode?: string, newEstadoEnd?: string, newWorkspace?: string, newLimit?: number) => {
        // Decode JWT to extract userId
        let uid: number | null = null;
        try {
            const payload = JSON.parse(atob(newToken.split('.')[1]));
            uid = payload.id ?? null;
        } catch { /* ignore */ }

        localStorage.setItem('token', newToken);
        localStorage.setItem('role', newRole);
        if (uid !== null) localStorage.setItem('userId', String(uid));
        if (newUserName) localStorage.setItem('userName', newUserName);
        else localStorage.removeItem('userName');
        if (newRepCode) localStorage.setItem('repCode', newRepCode);
        else localStorage.removeItem('repCode');
        if (newTipo) localStorage.setItem('tipo', newTipo);
        else localStorage.removeItem('tipo');
        if (newEstadoEnd) localStorage.setItem('estado_end', newEstadoEnd);
        else localStorage.removeItem('estado_end');
        if (newWorkspace) localStorage.setItem('defaultWorkspace', newWorkspace);
        else localStorage.removeItem('defaultWorkspace');
        if (newLimit) localStorage.setItem('inactivityLimit', String(newLimit));
        else localStorage.removeItem('inactivityLimit');

        setToken(newToken);
        setRole(newRole);
        setUserId(uid);
        setUserName(newUserName || null);
        setRepCode(newRepCode || null);
        setTipo(newTipo || null);
        setEstadoEnd(newEstadoEnd || null);
        setDefaultWorkspace(newWorkspace || null);
        setInactivityLimit(newLimit || null);
    };

    const logout = () => {
        ['token', 'role', 'userId', 'userName', 'repCode', 'tipo', 'estado_end', 'defaultWorkspace', 'inactivityLimit'].forEach(k => localStorage.removeItem(k));
        setToken(null); setRole(null); setUserId(null); setUserName(null); setRepCode(null); setTipo(null); setEstadoEnd(null);
        setDefaultWorkspace(null); setInactivityLimit(null);
    };

    return (
        <AuthContext.Provider value={{ token, role, userId, userName, repCode, tipo, estado_end, defaultWorkspace, inactivityLimit, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
}

