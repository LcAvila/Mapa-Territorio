import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, requirePermission } from '../middlewares/auth';
import { logUserActivity } from '../utils/logger';

const router = Router();

// Get notification history
router.get('/', authenticate, async (req, res) => {
  try {
    const allNotifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 80
    });
    const currentUserId = Number((req as any).user?.id || 0);
    const isAdminLike = (req as any).user?.role === 'admin' || (req as any).user?.role === 'supervisor';

    const notifications = isAdminLike
      ? allNotifications
      : allNotifications.filter((n) => {
          if (n.targetAll) return true;
          const raw = n.targetUserIds;
          if (!Array.isArray(raw) || !currentUserId) return false;
          return raw.map((id) => Number(id)).includes(currentUserId);
        });

    res.json(notifications.slice(0, 50));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Erro ao buscar notificações' });
  }
});

// Send new notification (Admin only)
router.post('/', authenticate, requirePermission('notifications', 'edit'), async (req: any, res) => {
  const { title, message, targetAll = true, targetUserIds = [] } = req.body;

  if (!title || !message) {
    return res.status(400).json({ message: 'Título e mensagem são obrigatórios' });
  }
  if (!targetAll && (!Array.isArray(targetUserIds) || targetUserIds.length === 0)) {
    return res.status(400).json({ message: 'Selecione ao menos um usuário destinatário' });
  }

  try {
    const normalizedTargetUserIds = Array.isArray(targetUserIds)
      ? targetUserIds
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0)
      : [];
    if (!targetAll && normalizedTargetUserIds.length === 0) {
      return res.status(400).json({ message: 'Selecione ao menos um usuário destinatário válido' });
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        targetAll: !!targetAll,
        targetUserIds: targetAll ? [] : normalizedTargetUserIds,
      }
    });

    await logUserActivity(req.user.id, 'send_notification', `Enviou alerta: ${title}`, req, 'Notification', String(notification.id));
    
    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Erro ao enviar notificação' });
  }
});

// Clear history (Admin only)
router.delete('/clear', authenticate, requirePermission('notifications', 'edit'), async (req: any, res) => {
  try {
    await prisma.notification.deleteMany({});
    await logUserActivity(req.user.id, 'clear_notifications', 'Limpou o histórico de notificações', req);
    res.json({ message: 'Histórico removido com sucesso' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ message: 'Erro ao limpar notificações' });
  }
});

export default router;
