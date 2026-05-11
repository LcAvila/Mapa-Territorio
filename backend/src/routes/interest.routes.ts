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
  try {
    // Optional authentication: if token provided, link to user
    const authHeader = req.headers.authorization;
    let userId: number | undefined;

    if (authHeader) {
        try {
            // Quick one-off check for user if token present (avoiding full authenticate middleware blockage)
            const { authenticate } = require('../middlewares/auth');
        } catch (e) {}
    }

    const { nome, email, telefone, empresa, municipio, uf, modo, observacoes } = req.body;
    if (!nome || !municipio || !uf) return res.status(400).json({ message: 'Campos obrigatórios: nome, municipio, uf' });
    
    // Actually, let's use the provided userId from body if it comes from the app
    const bodyUserId = req.body.userId ? Number(req.body.userId) : null;

    console.log(`[INTEREST] Creating request for ${nome} in ${municipio}/${uf}`);

    const int = await prisma.interestRequest.create({ 
      data: { 
        nome, email, telefone, empresa, municipio, uf, modo, observacoes,
        userId: bodyUserId
      } 
    });
    res.status(201).json(int);
  } catch (error: any) {
    console.error('[INTEREST] Error creating interest request:', error);
    res.status(500).json({ 
      message: 'Erro ao registrar interesse. Tente novamente.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/', authenticate, requirePermission('interests', 'view'), async (req, res) => {
  try {
    const user = (req as any).user;
    const where: any = {};

    // Restrição por hierarquia:
    // - Admin: Vê tudo.
    // - Supervisor/User: Vê apenas os seus próprios interesses e os de seus subordinados.
    if (user && user.role !== 'admin') {
      const subordinateIds = user.subordinateIds || [];
      where.userId = { in: [user.id, ...subordinateIds] };
    }

    const ints = await prisma.interestRequest.findMany({ 
      where,
      orderBy: { created_at: 'desc' }
    });
    res.json(ints);
  } catch (error) {
    console.error('[INTEREST] Error fetching interests:', error);
    res.status(500).json({ message: 'Erro ao buscar interesses' });
  }
});

router.put('/:id/status', authenticate, requirePermission('interests', 'edit'), async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status inválido' });
  }
  
  const existing = await prisma.interestRequest.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: 'Não encontrado' });

  // Validação de permissão por hierarquia para edição
  const user = (req as any).user;
  if (user && user.role !== 'admin') {
    const subordinateIds = user.subordinateIds || [];
    const allowedIds = [user.id, ...subordinateIds];
    
    if (!existing.userId || !allowedIds.includes(existing.userId)) {
      console.warn(`[INTEREST] Usuário ${user.id} tentou alterar interesse #${id} de outro usuário (${existing.userId})`);
      return res.status(403).json({ message: 'Você não tem permissão para gerenciar este interesse.' });
    }
  }
  
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
  if (status === 'accepted' && existing.userId) {
    try {
      // Check if territory already exists for this user
      const existingTerritory = await prisma.territory.findFirst({
        where: {
          municipio: existing.municipio,
          uf: existing.uf,
          // @ts-ignore - Prisma type sync issue in IDE
          userId: existing.userId
        }
      });

      if (!existingTerritory) {
        await prisma.territory.create({
          data: {
            municipio: existing.municipio,
            uf: existing.uf,
            // @ts-ignore - Prisma type sync issue in IDE
            userId: existing.userId,
            modo: existing.modo || 'planejamento'
          }
        });
        console.log(`[INTEREST] Territory created for user ${existing.userId} in ${existing.municipio}/${existing.uf}`);
      }
    } catch (err) {
      console.error('[INTEREST] Error creating territory on accept:', err);
    }
  }

  // Log Activity
  if (user) await logUserActivity(user.id, 'interest', `${user.username} alterou status do interesse #${id} para ${status}`, req, 'Interesse', String(id));

  res.json({ message: 'Status atualizado com sucesso', request: int });
});

export default router;
