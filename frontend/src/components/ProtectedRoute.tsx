import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context-core';
import Loader from './Loader';

interface ProtectedRouteProps {
    allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    const { isAuthenticated, role, loading } = useAuth();

    if (loading) {
        return <Loader label="Verificando autenticação..." />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && role && !allowedRoles.includes(role)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
