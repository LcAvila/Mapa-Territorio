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
  seen?: boolean; // Propriedade vinda do servidor
}

export default function NotificationSystem() {
  const { userId, token, tokenVersion, logout } = useAuth();
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionSeenIds, setSessionSeenIds] = useState<number[]>([]);
  const currentUserId = userId || Number(localStorage.getItem('userId') || 0) || null;

  const markSeenOnServer = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/${id}/seen`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        console.log(`[NOTIF] Marked ${id} as seen on server`);
      } else if (res.status === 404) {
        console.warn(`[NOTIF] Notification ${id} no longer exists on server`);
      }
    } catch (error) {
      console.error('Error marking as seen on server:', error);
    }
  };

  const openModalForNotification = (notif: Notification) => {
    // Evita abrir a mesma notificação múltiplas vezes na mesma sessão
    if (sessionSeenIds.includes(notif.id)) return;
    if (currentNotification?.id === notif.id && isOpen) return;
    
    setCurrentNotification(notif);
    setIsOpen(true);
    
    // Adiciona ao bloqueio de sessão para não reabrir enquanto não fechar ou se já foi exibida
    setSessionSeenIds(prev => [...prev, notif.id]);
    
    // Alerta sonoro visual via Toast além do Modal
    toast.info(`${notif.title}`, {
      description: 'Clique para ler os detalhes importantes',
      action: {
        label: 'Ver Agora',
        onClick: () => setIsOpen(true)
      },
      duration: 15000,
      icon: <div className="p-1 bg-primary/20 rounded-full"><Bell className="w-4 h-4 text-primary animate-pulse" /></div>
    });
  };

  const isNotificationForCurrentUser = (n: Notification) => {
    if (n.targetAll) return true;
    if (!currentUserId || !n.targetUserIds) return false;
    return n.targetUserIds.map((id) => Number(id)).includes(currentUserId);
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
      if (!res.ok) {
        if (res.status === 401) {
          logout();
        }
        return;
      }
      const data = (await res.json()) as Notification[];
      // Busca a primeira notificação que o usuário ainda não viu (baseado no campo 'seen' do servidor)
      const candidate = data.find((n) => isNotificationForCurrentUser(n) && !n.seen);
      if (candidate) {
        openModalForNotification(candidate);
      }
    } catch {
      // silent fallback
    }
  };

  useEffect(() => {
    fetchLatestNotification();

    // Polling opcional a cada 2 minutos para novas notificações
    const interval = setInterval(fetchLatestNotification, 120000);
    
    // Hard fallback para sincronização apenas ao focar na aba
    const onFocus = () => { fetchLatestNotification(); };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [token, tokenVersion, currentUserId]);

  const handleClose = () => {
    if (currentNotification) {
      markSeenOnServer(currentNotification.id);
    }
    setIsOpen(false);
    setTimeout(() => setCurrentNotification(null), 300);
  };

  if (!currentNotification) return null;

  // Sanitize HTML content
  const sanitizedContent = DOMPurify.sanitize(currentNotification.message);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] p-0 overflow-hidden border-none bg-background shadow-2xl animate-in fade-in zoom-in duration-300 z-[5001]">
        <div className="flex flex-col h-full bg-background relative z-[5002]">
          {/* Faixa decorativa no topo */}
          <div className="h-2 w-full bg-primary/80" />
        
        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
          <DialogHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl shadow-inner">
                  <Bell className="w-6 h-6 text-primary animate-bounce" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 block">Notificação Importante</span>
                  <DialogTitle className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-none mt-1">
                    {currentNotification.title}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Alerta do sistema enviado por {currentNotification.senderName || 'Sistema'}.
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 py-3 border-y border-border/40">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-lg border border-border/40">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-3 h-3 text-primary" />
                </div>
                <span className="text-xs font-bold text-foreground/80">
                  {currentNotification.senderName || 'Sistema'}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">
                  {new Date(currentNotification.createdAt).toLocaleString('pt-BR', { 
                    day: '2-digit', month: 'long', year: 'numeric', 
                    hour: '2-digit', minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-8 mb-4">
            <div 
              className="ql-editor !p-0 text-sm sm:text-base leading-relaxed text-foreground/90 selection:bg-primary/20" 
              dangerouslySetInnerHTML={{ __html: sanitizedContent }} 
            />
          </div>
        </div>

        <DialogFooter className="p-4 bg-secondary/20 border-t border-border/40 sm:justify-end">
          <Button 
            type="button" 
            onClick={handleClose} 
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider px-6 h-9 text-[10px] rounded-lg shadow-sm transition-all active:scale-95"
          >
            Entendido, li a mensagem
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
