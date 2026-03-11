import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
    token: string | null;
    role: string | null;
    userId: number | null;
    repCode: string | null;
    tipo: string | null;
    estado_end: string | null;
    login: (token: string, role: string, tipo?: string, repCode?: string, estado_end?: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [role, setRole] = useState<string | null>(localStorage.getItem('role'));
    const [userId, setUserId] = useState<number | null>(() => {
        const stored = localStorage.getItem('userId');
        return stored ? Number(stored) : null;
    });
    const [repCode, setRepCode] = useState<string | null>(localStorage.getItem('repCode'));
    const [tipo, setTipo] = useState<string | null>(localStorage.getItem('tipo'));
    const [estado_end, setEstadoEnd] = useState<string | null>(localStorage.getItem('estado_end'));

    const login = (newToken: string, newRole: string, newTipo?: string, newRepCode?: string, newEstadoEnd?: string) => {
        // Decode JWT to extract userId
        let uid: number | null = null;
        try {
            const payload = JSON.parse(atob(newToken.split('.')[1]));
            uid = payload.id ?? null;
        } catch { /* ignore */ }

        localStorage.setItem('token', newToken);
        localStorage.setItem('role', newRole);
        if (uid !== null) localStorage.setItem('userId', String(uid));
        if (newRepCode) localStorage.setItem('repCode', newRepCode);
        else localStorage.removeItem('repCode');
        if (newTipo) localStorage.setItem('tipo', newTipo);
        else localStorage.removeItem('tipo');
        if (newEstadoEnd) localStorage.setItem('estado_end', newEstadoEnd);
        else localStorage.removeItem('estado_end');

        setToken(newToken);
        setRole(newRole);
        setUserId(uid);
        setRepCode(newRepCode || null);
        setTipo(newTipo || null);
        setEstadoEnd(newEstadoEnd || null);
    };

    const logout = () => {
        ['token', 'role', 'userId', 'repCode', 'tipo', 'estado_end'].forEach(k => localStorage.removeItem(k));
        setToken(null); setRole(null); setUserId(null); setRepCode(null); setTipo(null); setEstadoEnd(null);
    };

    return (
        <AuthContext.Provider value={{ token, role, userId, repCode, tipo, estado_end, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}
