import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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
  createdAt: string;
}

export default function NotificationSystem() {
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [isOpen, setIsOpen] = useState(false);

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
          setCurrentNotification(newNotif);
          setIsOpen(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
