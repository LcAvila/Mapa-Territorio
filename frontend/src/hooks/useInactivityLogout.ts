import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context-core';
import { toast } from 'sonner';

export function useInactivityLogout() {
  const { logout, inactivityLimit, isAuthenticated } = useAuth();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    if (isAuthenticated && inactivityLimit && inactivityLimit > 0) {
      // Converte minutos para milisegundos
      const timeout = inactivityLimit * 60 * 1000;
      
      timerRef.current = setTimeout(() => {
        toast.info('Sua sessão expirou por inatividade');
        logout();
      }, timeout);
    }
  }, [isAuthenticated, inactivityLimit, logout]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => resetTimer();
    
    events.forEach(event => document.addEventListener(event, handleActivity));
    resetTimer(); // Inicia o timer

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => document.removeEventListener(event, handleActivity));
    };
  }, [isAuthenticated, resetTimer]);
}
