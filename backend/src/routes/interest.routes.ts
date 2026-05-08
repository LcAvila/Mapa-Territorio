import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, requirePermission } from '../middlewares/auth';
import { logUserActivity } from '../utils/logger';
import rateLimit from 'express-rate-limit';

const router = Router();

const interestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { message: 'Muitas solicitações detectadas. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', interestLimiter, async (req, res) => {
  // Optional authentication: if token provided, link to user
  const authHeader = req.headers.authorization;
  let userId: number | undefined;
  let repCode: string | undefined;

  if (authHeader) {
      try {
          // Quick one-off check for user if token present (avoiding full authenticate middleware blockage)
          const { authenticate } = require('../middlewares/auth');
          // Actually, we can just use the middleware logic manually or just wrap it.
          // For simplicity, let's just make it a normal route if we want mandatory, 
          // but user might want anonymous too.
      } catch (e) {}
  }

  const { nome, email, telefone, empresa, municipio, uf, modo, observacoes } = req.body;
  if (!nome || !municipio || !uf) return res.status(400).json({ message: 'Campos obrigatórios: nome, municipio, uf' });
  
  // Actually, let's use the provided userId/repCode from body if it comes from the app
  const bodyUserId = req.body.userId ? Number(req.body.userId) : null;
  const bodyRepCode = req.body.repCode || null;

  const int = await prisma.interestRequest.create({ 
    data: { 
      nome, email, telefone, empresa, municipio, uf, modo, observacoes,
      userId: bodyUserId,
      repCode: bodyRepCode
    } 
  });
  res.status(201).json(int);
});

router.get('/', authenticate, requirePermission('interests', 'view'), async (req, res) => {
  const ints = await prisma.interestRequest.findMany({ 
    orderBy: { created_at: 'desc' }
  });
  res.json(ints);
});

router.put('/:id/status', authenticate, requirePermission('interests', 'edit'), async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status inválido' });
  }
  
  const existing = await prisma.interestRequest.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: 'Não encontrado' });
  
  const int = await prisma.interestRequest.update({ where: { id }, data: { status } });

  // Notify requester user about status update
  if (existing.userId) {
    try {
      const title = status === 'accepted' ? 'Interesse Aceito' : 'Interesse Recusado';
      const message = status === 'accepted'
        ? `Seu interesse em <strong>${existing.municipio}/${existing.uf}</strong> foi <strong>aceito</strong>.`
        : `Seu interesse em <strong>${existing.municipio}/${existing.uf}</strong> foi <strong>recusado</strong>.`;

      await prisma.notification.create({
        data: {
          title,
          message,
          targetAll: false,
          targetUserIds: [existing.userId],
        },
      });
    } catch (err) {
      console.error('[INTEREST] Error creating status notification:', err);
    }
  }
  
  // Automated Territory Creation on ACCEPT
  if (status === 'accepted' && existing.repCode) {
    try {
      // Check if territory already exists for this rep
      const existingTerritory = await prisma.territory.findFirst({
        where: {
          municipio: existing.municipio,
          uf: existing.uf,
          repCode: existing.repCode
        }
      });

      if (!existingTerritory) {
        await prisma.territory.create({
          data: {
            municipio: existing.municipio,
            uf: existing.uf,
            repCode: existing.repCode,
            modo: existing.modo || 'atendimento'
          }
        });
        console.log(`[INTEREST] Territory auto-created for rep ${existing.repCode}: ${existing.municipio}/${existing.uf}`);
      }
    } catch (err) {
      console.error('[INTEREST] Error auto-creating territory:', err);
    }
  }

  // Log Activity
  const user = (req as any).user;
  if (user) await logUserActivity(user.id, 'interest', `${user.username} alterou status do interesse #${id} para ${status}`, req, 'Interesse', String(id));

  res.json({ message: 'Status atualizado com sucesso', request: int });
});

export default router;
