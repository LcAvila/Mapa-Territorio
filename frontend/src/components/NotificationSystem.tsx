import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context-core';
import { API_BASE_URL } from '@/lib/api-base';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import DOMPurify from 'dompurify';

interface Notification {
  id: number;
  title: string;
  message: string;
  targetAll?: boolean;
  targetUserIds?: number[] | null;
  createdAt: string;
}

export default function NotificationSystem() {
  const { userId, token, tokenVersion } = useAuth();
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const currentUserId = userId || Number(localStorage.getItem('userId') || 0) || null;
  const seenKey = currentUserId ? `seen_notifications_user_${currentUserId}` : 'seen_notifications_guest';

  const isNotificationForCurrentUser = (notif: Notification): boolean => {
    const targetIds = Array.isArray(notif.targetUserIds)
      ? notif.targetUserIds.map((id) => Number(id))
      : [];
    return !!notif.targetAll || (!!currentUserId && targetIds.includes(currentUserId));
  };

  const wasSeen = (id: number): boolean => {
    try {
      const seen = JSON.parse(localStorage.getItem(seenKey) || '[]') as number[];
      return seen.includes(id);
    } catch {
      return false;
    }
  };

  const markSeen = (id: number) => {
    try {
      const seen = JSON.parse(localStorage.getItem(seenKey) || '[]') as number[];
      if (seen.includes(id)) return;
      const updated = [id, ...seen].slice(0, 200);
      localStorage.setItem(seenKey, JSON.stringify(updated));
    } catch {
      localStorage.setItem(seenKey, JSON.stringify([id]));
    }
  };

  const openModalForNotification = (notif: Notification) => {
    setCurrentNotification(notif);
    setIsOpen(true);
    markSeen(notif.id);
  };

  const fetchLatestNotification = async () => {
    if (!token || !currentUserId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-user-token-version': String(tokenVersion || 0),
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
      if (!res.ok) return;
      const data = (await res.json()) as Notification[];
      const candidate = data.find((n) => isNotificationForCurrentUser(n) && !wasSeen(n.id));
      if (candidate) {
        openModalForNotification(candidate);
      }
    } catch {
      // silent fallback
    }
  };

  useEffect(() => {
    // Listen for new notifications in real-time
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          console.log('[REALTIME] Nova notificação recebida:', payload);
          const newNotif = payload.new as Notification;
          if (!isNotificationForCurrentUser(newNotif)) return;
          if (wasSeen(newNotif.id)) return;
          openModalForNotification(newNotif);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, seenKey]);

  useEffect(() => {
    if (!token || !currentUserId) return;

    // First sync as soon as auth/session is ready
    fetchLatestNotification();

    // Hard fallback for near-real-time delivery if websocket event fails
    const intervalId = window.setInterval(fetchLatestNotification, 2000);

    // When tab gains focus, sync immediately
    const onFocus = () => { fetchLatestNotification(); };
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [token, tokenVersion, currentUserId, seenKey]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => setCurrentNotification(null), 300);
  };

  if (!currentNotification) return null;

  // Sanitize HTML content
  const sanitizedContent = DOMPurify.sanitize(currentNotification.message);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto border-t-4 border-t-primary animate-in fade-in zoom-in duration-300">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Bell className="w-5 h-5 text-primary animate-bounce" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Novo Alerta do Sistema</span>
          </div>
          <DialogTitle className="text-2xl font-extrabold text-foreground">
            {currentNotification.title}
          </DialogTitle>
          <DialogDescription className="text-xs opacity-60">
            Enviado em {new Date(currentNotification.createdAt).toLocaleString('pt-BR')}
          </DialogDescription>
        </DialogHeader>

        <div className="my-6 prose prose-sm dark:prose-invert max-w-none">
          {/* Renderizing the rich text content */}
          <div 
            className="ql-editor !p-0" 
            dangerouslySetInnerHTML={{ __html: sanitizedContent }} 
          />
        </div>

        <DialogFooter className="sm:justify-end gap-2 border-t pt-4">
          <Button type="button" onClick={handleClose} className="bg-primary hover:bg-primary/90 text-white font-bold px-8">
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
