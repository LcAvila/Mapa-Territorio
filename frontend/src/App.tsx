import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Ajuda from "./pages/Ajuda";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import NotificationSystem from "./components/NotificationSystem";
import { useAuth } from "./contexts/auth-context-core";
import { Navigate } from "react-router-dom";

import { ThemeProvider } from "./contexts/ThemeContext";

const queryClient = new QueryClient();

const RootRedirect = () => {
  const { defaultWorkspace } = useAuth();
  
  if (defaultWorkspace === 'mapa' || !defaultWorkspace) {
    return <Navigate to="/mapa" replace />;
  }
  
  if (defaultWorkspace === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  
  return <Navigate to={`/admin?tab=${defaultWorkspace}`} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="mapa-theme">
      <AuthProvider>
        <NotificationSystem />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/mapa" element={<Index />} />
                <Route path="/perfil" element={<Profile />} />
                <Route path="/ajuda" element={<Ajuda />} />
              </Route>


              {/* Rotas Administrativas */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'supervisor', 'user']} />}>
                <Route path="/admin" element={<Admin />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
