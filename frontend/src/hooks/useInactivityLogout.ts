import { useEffect } from 'react';
import { toast } from 'sonner';
import { getLastActivityTime, touchLastActivity } from '@/lib/auth-storage';

type UseInactivityLogoutParams = {
  enabled: boolean;
  inactivityLimit: number | null;
  onLogout: () => void | Promise<void>;
};

export function useInactivityLogout({
  enabled,
  inactivityLimit,
  onLogout,
}: UseInactivityLogoutParams) {
  useEffect(() => {
    if (!enabled) return;

    const limitMinutes = inactivityLimit ?? 30;
    const limitMs = limitMinutes * 60 * 1000;
    const warningThresholdMs = limitMs - Math.min(60000, limitMs * 0.1);

    const checkInactivity = () => {
      const lastActive = getLastActivityTime();

      if (!lastActive) {
        touchLastActivity();
        return;
      }

      const now = Date.now();
      const inactiveTime = now - parseInt(lastActive, 10);

      if (inactiveTime > limitMs) {
        toast.error('Sessão encerrada por inatividade.');
        onLogout();
        return;
      }

      if (inactiveTime > warningThresholdMs) {
        const remainingSeconds = Math.ceil((limitMs - inactiveTime) / 1000);

        if (remainingSeconds > 0) {
          toast.warning(
            `Sua sessão expirará em breve (${remainingSeconds}s) devido à inatividade.`,
            {
              id: 'inactivity-warning',
              duration: 5000,
            }
          );
        }
      }
    };

    let throttleTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleActivity = () => {
      if (throttleTimeout) return;

      throttleTimeout = setTimeout(() => {
        touchLastActivity();
        throttleTimeout = null;
      }, 2000);
    };

    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ] as const;

    checkInactivity();

    const intervalId = setInterval(checkInactivity, 15000);

    events.forEach((event) =>
      document.addEventListener(event, handleActivity, {
        capture: true,
        passive: true,
      })
    );

    return () => {
      clearInterval(intervalId);

      events.forEach((event) =>
        document.removeEventListener(event, handleActivity, {
          capture: true,
        })
      );

      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [enabled, inactivityLimit, onLogout]);
}