import { createContext, useContext } from 'react';

export interface AuthContextType {
    token: string | null;
    role: string | null;
    userId: number | null;
    userName: string | null;
    repCode: string | null;
    tipo: string | null;
    estado_end: string | null;
    defaultWorkspace: string | null;
    inactivityLimit: number | null;
    login: (token: string, role: string, userName?: string, tipo?: string, repCode?: string, estado_end?: string, defaultWorkspace?: string, inactivityLimit?: number) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}
