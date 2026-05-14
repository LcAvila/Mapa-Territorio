import { createContext, useContext } from 'react';

export interface AuthContextType {
    token: string | null;
    role: string | null;
    userId: number | null;
    userName: string | null;
    tipo: string | null;
    estado_end: string | null;
    assigned_state: string | null;
    defaultWorkspace: string | null;
    inactivityLimit: number | null;
    tokenVersion: number | null;
    login: (token: string, userId: number, role: string, userName?: string, tipo?: string, estado_end?: string, defaultWorkspace?: string, inactivityLimit?: number, tokenVersion?: number, assigned_state?: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
    loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}
