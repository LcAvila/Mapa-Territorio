import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, requirePermission, AuthRequest } from '../middlewares/auth';
import { logUserActivity } from '../utils/logger';

const router = Router();

// Get notification history
router.get('/', authenticate, requirePermission('notifications', 'view'), async (req: AuthRequest, res) => {
  try {
    console.log(`[NOTIF] User ${req.user?.id} requesting notifications history`);
    // Usando queryRaw para evitar problemas com o Prisma Client desatualizado no node_modules
    const allNotifications: any[] = await prisma.$queryRawUnsafe(`
      SELECT "id", "title", "message", "targetAll", "targetUserIds", "senderName", "createdAt"
      FROM "notifications"
      ORDER BY "createdAt" DESC
      LIMIT 80
    `);
    
    const currentUserId = Number(req.user?.id || 0);
    const isAdminLike = req.user?.role === 'admin' || req.user?.role === 'supervisor';

    const notifications = isAdminLike
      ? allNotifications
      : allNotifications.filter((n) => {
          if (n.targetAll) return true;
          const raw = n.targetUserIds;
          if (!raw || !currentUserId) return false;
          
          // Trata JSONB do Postgres
          const targetIds = Array.isArray(raw) ? raw : [];
          return targetIds.map((id: any) => Number(id)).includes(currentUserId);
        });

    res.json(notifications.slice(0, 50));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Erro ao buscar notificações' });
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
