import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, requirePermission, AuthRequest } from '../middlewares/auth';
import { logUserActivity } from '../utils/logger';

const router = Router();

// Get notification history
router.get('/', authenticate, requirePermission('notifications', 'view'), async (req: AuthRequest, res) => {
  try {
    const currentUserId = Number(req.user?.id || 0);
    console.log(`[NOTIF] User ${currentUserId} requesting notifications history`);
    
    let allNotifications: any[] = [];
    try {
      const prismaAny = prisma as any;
      
      // 1. Buscar notificações
      const notificationsRaw = await prismaAny.notification.findMany({
        take: 80,
        orderBy: { createdAt: 'desc' }
      });

      // 2. Buscar IDs das notificações que este usuário já viu (Fallback Robusto)
      let seenIds: number[] = [];
      try {
        const seenRecords = await prismaAny.notificationSeen.findMany({
          where: { userId: currentUserId },
          select: { notificationId: true }
        });
        seenIds = seenRecords.map((r: any) => r.notificationId);
      } catch (err) {
        console.warn('[NOTIF] Prisma relation failed, trying raw query for seen status');
        try {
          const rawSeen: any[] = await prisma.$queryRawUnsafe(
            'SELECT "notificationId" FROM "notification_seen" WHERE "userId" = $1',
            currentUserId
          );
          seenIds = rawSeen.map(r => Number(r.notificationId));
        } catch (rawErr) {
          console.error('[NOTIF] All seen-check fallbacks failed', rawErr);
        }
      }
      
      allNotifications = notificationsRaw.map((n: any) => ({
        ...n,
        seen: seenIds.includes(n.id)
      }));
    } catch (e) {
      console.warn('[NOTIF] Prisma failed or timed out. Falling back to HTTP.');
      const { data, error } = await (req as any).supabaseAdmin
        .from('notifications')
        .select('*, notification_seen(id)')
        .order('createdAt', { ascending: false })
        .limit(80);
      
      if (error) throw error;
      allNotifications = (data || []).map((n: any) => ({
        ...n,
        seen: (n.notification_seen || []).some((s: any) => s.userId === currentUserId)
      }));
    }
    
    const isAdminLike = req.user?.role === 'admin' || req.user?.role === 'supervisor';

    const notifications = isAdminLike
      ? allNotifications
      : allNotifications.filter((n) => {
          if (n.targetAll) return true;
          const targetIds = Array.isArray(n.targetUserIds) ? n.targetUserIds : [];
          return targetIds.map((id: any) => Number(id)).includes(currentUserId);
        });

    res.json(notifications.slice(0, 50));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Erro ao buscar notificações' });
  }
});

// Mark notification as seen
router.post('/:id/seen', authenticate, async (req: AuthRequest, res) => {
  const notificationId = Number(req.params.id);
  const userId = Number(req.user?.id);

  if (!notificationId || !userId) {
    return res.status(400).json({ message: 'ID da notificação e usuário são obrigatórios' });
  }

  try {
    const prismaAny = prisma as any;
    
    // Check if notification exists first to avoid foreign key violations
    const exists = await prismaAny.notification.findUnique({
      where: { id: notificationId },
      select: { id: true }
    });

    if (!exists) {
      return res.status(404).json({ message: 'Notificação não encontrada' });
    }

    console.log(`[NOTIF] Marking notification ${notificationId} as seen for user ${userId}`);
    
    // Check if the model exists before calling upsert
    if (prismaAny.notificationSeen) {
      await prismaAny.notificationSeen.upsert({
        where: {
          notificationId_userId: {
            notificationId,
            userId
          }
        },
        update: {}, 
        create: {
          notificationId,
          userId
        }
      });
    } else {
      console.warn('[NOTIF] notificationSeen model not found in Prisma client, using raw query fallback');
      await prisma.$executeRawUnsafe(
        'INSERT INTO "notification_seen" ("notificationId", "userId", "seenAt") VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING',
        notificationId, userId
      );
    }

    res.json({ message: 'Notificação marcada como vista' });
  } catch (error: any) {
    console.error('Error marking notification as seen:', error);
    // Fallback total para raw query se o upsert falhar por qualquer motivo de schema
    try {
      console.log('[NOTIF] Upsert failed, trying final raw query fallbacks');
      
      // Tenta primeiro com o nome mapeado no schema
      try {
        await prisma.$executeRawUnsafe(
          'INSERT INTO "notification_seen" ("notificationId", "userId", "seenAt") VALUES ($1, $2, NOW()) ON CONFLICT ("notificationId", "userId") DO NOTHING',
          notificationId, userId
        );
        return res.json({ message: 'Notificação marcada como vista (fallback 1)' });
      } catch (err1) {
        console.warn('[NOTIF] Fallback 1 failed, trying fallback 2 (PascalCase table name)');
        // Tenta com o nome padrão do Prisma se o map falhar
        await prisma.$executeRawUnsafe(
          'INSERT INTO "NotificationSeen" ("notificationId", "userId", "seenAt") VALUES ($1, $2, NOW()) ON CONFLICT ("notificationId", "userId") DO NOTHING',
          notificationId, userId
        );
        return res.json({ message: 'Notificação marcada como vista (fallback 2)' });
      }
    } catch (innerError) {
      console.error('Final fallback failed:', innerError);
    }
    res.status(500).json({ message: 'Erro ao marcar notificação como vista', details: error.message });
  }
});

// Send new notification (Admin/Supervisor)
router.post('/', authenticate, requirePermission('notifications', 'edit'), async (req: AuthRequest, res) => {
  const { title, message, targetAll = true, targetUserIds = [] } = req.body;
  const senderName = req.user?.full_name || req.user?.fullName || req.user?.username || 'Administrador';

  console.log('[NOTIFICATIONS] Received POST request:', { title, targetAll, targetUserIds, senderName });

  if (!title || !message) {
    return res.status(400).json({ message: 'Título e mensagem são obrigatórios' });
  }

  try {
    const user = req.user;
    let finalTargetUserIds: number[] = [];

    // --- Lógica de Restrição por Hierarquia e Tipo ---
    if (user.role !== 'admin') {
      // Se não for admin, ele NÃO pode enviar para "Todos" (targetAll: true)
      if (targetAll) {
        return res.status(403).json({ message: 'Você não tem permissão para enviar notificações globais. Selecione destinatários específicos.' });
      }

      // Buscar IDs de quem ele gerencia
      const subordinateIds: number[] = user.subordinateIds || [];
      
      // Buscar IDs de quem tem o mesmo tipo de usuário (categoria)
      const sameTypeUsers: any[] = await prisma.$queryRawUnsafe(
        'SELECT id FROM "users" WHERE "userTypeId" = $1 AND "id" != $2',
        user.userTypeId, user.id
      );
      const sameTypeIds = sameTypeUsers.map(u => Number(u.id));

      const allowedTargetIds = new Set([...subordinateIds, ...sameTypeIds]);

      // Validar se os destinatários solicitados estão dentro do permitido
      const requestedIds = Array.isArray(targetUserIds) ? targetUserIds.map(id => Number(id)) : [];
      const invalidIds = requestedIds.filter(id => !allowedTargetIds.has(id));

      if (invalidIds.length > 0) {
        return res.status(403).json({ 
          message: 'Você só pode enviar alertas para seus subordinados ou usuários do mesmo tipo (categoria).',
          invalidIds 
        });
      }

      finalTargetUserIds = requestedIds;
    } else {
      // Admin pode tudo
      finalTargetUserIds = Array.isArray(targetUserIds) ? targetUserIds.map(id => Number(id)) : [];
    }

    if (!targetAll && finalTargetUserIds.length === 0) {
      return res.status(400).json({ message: 'Selecione ao menos um usuário destinatário válido' });
    }

    const targetUserIdsJson = JSON.stringify(targetAll ? [] : finalTargetUserIds);

    console.log('[NOTIFICATIONS] Executing Raw SQL insert...');
    
    await prisma.$executeRawUnsafe(
      `INSERT INTO "notifications" ("title", "message", "targetAll", "targetUserIds", "senderName", "createdAt")
       VALUES ($1, $2, $3, $4::jsonb, $5, NOW())`,
      title, message, !!targetAll, targetUserIdsJson, senderName
    );

    console.log('[NOTIFICATIONS] Insert successful');

    await logUserActivity(req.user.id, 'send_notification', `Enviou alerta: ${title}`, req, 'Notification');
    
    res.status(201).json({ message: 'Notificação enviada com sucesso' });
  } catch (error: any) {
    console.error('Error creating notification:', error);
    res.status(500).json({ 
      message: 'Erro ao enviar notificação', 
      details: error.message,
      code: error.code
    });
  }
});

// Clear history (Admin only)
router.delete('/clear', authenticate, requirePermission('notifications', 'edit'), async (req: AuthRequest, res) => {
  try {
    await prisma.$executeRawUnsafe('DELETE FROM "notifications"');
    await logUserActivity(req.user.id, 'clear_notifications', 'Limpou o histórico de notificações', req);
    res.json({ message: 'Histórico removido com sucesso' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ message: 'Erro ao limpar notificações' });
  }
});

export default router;
