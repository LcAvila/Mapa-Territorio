import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context-core';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';

interface ProtectedRouteProps {
    allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    const { isAuthenticated, role, loading } = useAuth();
    useInactivityLogout();

    if (loading) {
        return null; // Or a loading spinner
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && role && !allowedRoles.includes(role)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
