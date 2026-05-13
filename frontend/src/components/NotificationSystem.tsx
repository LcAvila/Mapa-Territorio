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
import { Bell, X, User, Clock } from 'lucide-react';
import DOMPurify from 'dompurify';
import { toast } from 'sonner';

interface Notification {
  id: number;
  title: string;
  message: string;
  senderName?: string;
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
    if (!notif) return false;
    if (notif.targetAll) return true;
    
    // Se não for para todos, precisamos do ID do usuário logado
    if (!currentUserId) return false;

    // Trata o campo targetUserIds que pode vir do Supabase Realtime como JSON string ou Array
    let targetIds: number[] = [];
    try {
      const raw = notif.targetUserIds;
      if (Array.isArray(raw)) {
        targetIds = raw.map(id => Number(id));
      } else if (typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          targetIds = parsed.map(id => Number(id));
        }
      }
    } catch (e) {
      console.error('Erro ao processar targetUserIds:', e);
    }

    return targetIds.includes(currentUserId);
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
    // Evita abrir a mesma notificação múltiplas vezes
    if (currentNotification?.id === notif.id && isOpen) return;
    
    setCurrentNotification(notif);
    setIsOpen(true);
    markSeen(notif.id);
    
    // Alerta sonoro visual via Toast além do Modal
    toast.info(`Novo Alerta: ${notif.title}`, {
      description: 'Clique para ler os detalhes',
      action: {
        label: 'Ver Agora',
        onClick: () => setIsOpen(true)
      },
      duration: 10000,
      icon: <Bell className="w-4 h-4 text-primary" />
    });
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
    if (!currentUserId || !token) return;

    console.log('[REALTIME] Iniciando escuta para usuário:', currentUserId);

    // Listen for new notifications in real-time
    const channel = supabase
      .channel(`user-notifications-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          console.log('[REALTIME] Nova linha inserida na tabela:', payload);
          const newNotif = payload.new as Notification;
          
          if (isNotificationForCurrentUser(newNotif)) {
            console.log('[REALTIME] Notificação válida para este usuário, abrindo modal...');
            if (!wasSeen(newNotif.id)) {
              openModalForNotification(newNotif);
            }
          } else {
            console.log('[REALTIME] Notificação ignorada (não é para este usuário)');
          }
        }
      )
      .subscribe((status) => {
        console.log('[REALTIME] Status da subscrição:', status);
      });

    return () => {
      console.log('[REALTIME] Removendo canal de escuta');
      supabase.removeChannel(channel);
    };
  }, [currentUserId, seenKey]);

  useEffect(() => {
    if (!token || !currentUserId) return;

    // First sync as soon as auth/session is ready
    fetchLatestNotification();

    // Hard fallback para sincronização apenas ao focar na aba
    const onFocus = () => { fetchLatestNotification(); };
    window.addEventListener('focus', onFocus);

    return () => {
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
          <div className="flex flex-col gap-1 mt-1">
            <DialogDescription className="text-xs font-semibold text-primary/80 flex items-center gap-1">
              <User className="w-3 h-3" />
              Remetente: {currentNotification.senderName || 'Sistema'}
            </DialogDescription>
            <DialogDescription className="text-[10px] opacity-60 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Enviado em {new Date(currentNotification.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </DialogDescription>
          </div>
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
