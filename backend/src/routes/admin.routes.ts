import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { authenticate, requireAdmin, requirePermission } from '../middlewares/auth';
import { logUserActivity } from '../utils/logger';
import type { AuthRequest } from '../middlewares/auth';

const router = Router();
router.use(authenticate);

// Middleware to require admin for write operations
const requireAdminMiddleware = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso restrito a administradores' });
  }
  next();
};

const PUBLIC_USER_FIELDS = { 
  id: true, username: true, role: true, repCode: true, tipo: true, 
  full_name: true, cpf_cnpj: true, telefone: true, photo: true, 
  created_at: true, last_active: true 
};

// --- KICK USER ---
router.post('/users/:id/kick', requireAdminMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const user = await prisma.user.update({
      where: { id },
      // @ts-ignore
      data: { token_version: { increment: 1 } }
    });
    
    await logUserActivity((req as any).user.id, 'kick_user', `Administrador derrubou a sessão do usuário ${user.username}`, req, 'User', String(id));
    
    res.json({ message: `Sessão do usuário ${user.username} encerrada com sucesso` });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao derrubar sessão' });
  }
});

router.get('/users', requirePermission('users', 'view'), async (req, res) => {
  const users = await prisma.user.findMany({ select: PUBLIC_USER_FIELDS, orderBy: { id: 'asc' } });
  res.json(users);
});

router.post('/users', requireAdminMiddleware, async (req, res) => {
  const { username, password, role, tipo, full_name, repCode, photo } = req.body;
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return res.status(409).json({ message: 'Username já existe' });
  
  const hashedPassword = password ? await bcrypt.hash(password, 10) : await bcrypt.hash('123456', 10);
  const user = await prisma.user.create({ data: { username, password: hashedPassword, role: role || 'user', tipo: tipo || 'representante', full_name, repCode, photo }, select: PUBLIC_USER_FIELDS });
  res.status(201).json(user);
});

router.put('/users/:id', requireAdminMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const { username, password, role, repCode, tipo, full_name, photo } = req.body;
  
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: 'Usuário não encontrado' });
  
  const usernameCheck = await prisma.user.findFirst({ where: { username, id: { not: id } } });
  if (usernameCheck) return res.status(409).json({ message: 'Username já em uso' });
  
  const data: any = { username, role, repCode, tipo, full_name };
  if (password) {
    data.password = await bcrypt.hash(password, 10);
    // @ts-ignore
    data.token_version = { increment: 1 };
  }
  if (photo !== undefined) data.photo = photo;
  
  const user = await prisma.user.update({ where: { id }, data, select: PUBLIC_USER_FIELDS });
  res.json(user);
});

router.delete('/users/:id', requireAdminMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: 'Usuário não encontrado' });
  
  await prisma.user.delete({ where: { id } });
  res.json({ message: 'Usuário excluído com sucesso' });
});

// --- REPS ---
router.post('/reps', requireAdminMiddleware, async (req, res) => {
  const { code, name, fullName, email, contato, endereco, bairro, cidade, uf, cep, comissao, isVago } = req.body;
  if (!code) return res.status(400).json({ message: 'Código é obrigatório' });
  
  try {
    const rep = await prisma.representative.create({ 
      data: { 
        code, 
        name, 
        fullName, 
        email, 
        contato, 
        endereco, 
        bairro, 
        cidade, 
        uf, 
        cep, 
        comissao: comissao ? parseFloat(comissao) : null,
        isVago: isVago ? 1 : 0, 
        colorIndex: req.body.colorIndex !== undefined ? Number(req.body.colorIndex) : Math.floor(Math.random() * 12) + 1
      } 
    });
    res.json(rep);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar representante' });
  }
});

router.get('/reps', requirePermission('reps', 'view'), async (req, res) => {
  const user = (req as any).user;
  const where: any = {};
  if (user && user.role === 'representante' && user.repCode) {
    where.code = user.repCode;
  }

  const reps = await prisma.representative.findMany({ 
    where,
    include: {
      _count: {
        select: { clientes: true, territories: true }
      }
    },
    orderBy: { code: 'asc' } 
  });
  res.json(reps);
});

router.put('/reps/:code', requireAdminMiddleware, async (req, res) => {
  const { code } = req.params;
  const { name, fullName, email, contato, endereco, bairro, cidade, uf, cep, comissao, isVago } = req.body;
  
  try {
    const rep = await prisma.representative.update({
      where: { code },
      data: { 
        name, 
        fullName, 
        email, 
        contato, 
        endereco, 
        bairro, 
        cidade, 
        uf, 
        cep, 
        comissao: comissao ? parseFloat(comissao) : null,
        isVago: isVago ? 1 : 0,
        colorIndex: req.body.colorIndex !== undefined ? Number(req.body.colorIndex) : undefined
      }
    });
    res.json(rep);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar representante' });
  }
});

// --- TERRITORIES ---
router.get('/territories', requirePermission('territories', 'view'), async (req, res) => {
  const user = (req as any).user;
  const where: any = {};
  if (user && user.role === 'representante' && user.repCode) {
    where.repCode = user.repCode;
  }

  const ter = await prisma.territory.findMany({ where, orderBy: [{ uf: 'asc' }, { municipio: 'asc' }] });
  res.json(ter);
});

router.post('/territories/import', requireAdminMiddleware, async (req, res) => {
  const { mappings } = req.body;
  if (!Array.isArray(mappings)) return res.status(400).json({ message: 'Formato inválido' });
  
  await prisma.$transaction(
    mappings.map((m: any) => prisma.territory.create({ data: { municipio: m.municipio, uf: m.uf, repCode: m.repCode, modo: m.modo || 'planejamento' } }))
  );
  
  res.json({ message: `${mappings.length} territórios importados.` });
});

router.post('/bairros/import', requireAdminMiddleware, async (req, res) => {
  const { mappings } = req.body;
  if (!Array.isArray(mappings)) return res.status(400).json({ message: 'Formato inválido' });
  
  await prisma.$transaction(
    mappings.map((m: any) => prisma.bairro.create({ data: { bairro: m.bairro, regiao: m.regiao, municipio: m.municipio, uf: m.uf, repCode: m.repCode, modo: m.modo || 'atendimento' } }))
  );
  
  res.json({ message: `${mappings.length} bairros importados.` });
});

// --- MODULES & PERMISSIONS ---
router.get('/modules', async (req, res) => {
  const modules = await (prisma as any).module.findMany({ orderBy: { name: 'asc' } });
  res.json(modules);
});

router.get('/users/:id/permissions', async (req, res) => {
  const userId = Number(req.params.id);
  const permissions = await (prisma as any).userPermission.findMany({
    where: { userId },
    include: { module: true }
  });
  res.json(permissions);
});

router.post('/users/:id/permissions', requireAdminMiddleware, async (req, res) => {
  const userId = Number(req.params.id);
  const { permissions } = req.body; // Array of { moduleId, canView, canEdit }

  if (!Array.isArray(permissions)) return res.status(400).json({ message: 'Formato inválido' });

  try {
    await prisma.$transaction([
      (prisma as any).userPermission.deleteMany({ where: { userId } }),
      (prisma as any).userPermission.createMany({
        data: permissions.map((p: any) => ({
          userId,
          moduleId: p.moduleId,
          canView: !!p.canView,
          canEdit: !!p.canEdit
        }))
      })
    ]);
    res.json({ message: 'Permissões atualizadas com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar permissões' });
  }
});

// --- USER ACTIVITIES & CONFIG ---
router.get('/users/:id/activities', requirePermission('users', 'view'), async (req, res) => {
  const userId = Number(req.params.id);
  try {
    // @ts-ignore - Prisma client maybe not updated yet
    const activities = await prisma.userActivity.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 50
    });
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar atividades' });
  }
});

router.put('/users/:id/config', requirePermission('users', 'edit'), async (req, res) => {
  const userId = Number(req.params.id);
  const { default_workspace, inactivity_limit } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      // @ts-ignore
      data: { default_workspace, inactivity_limit }
    });
    
    await logUserActivity((req as any).user.id, 'config_update', `Atualizou configurações do usuário ${user.username}`, req, 'User', String(userId));
    res.json({ message: 'Configurações atualizadas', user });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar configurações' });
  }
});

router.put('/users/:id/notif-prefs', requirePermission('users', 'edit'), async (req, res) => {
  const userId = Number(req.params.id);
  const { notif_email, notif_sms, notif_push } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      // @ts-ignore
      data: { notif_email, notif_sms, notif_push }
    });

    await logUserActivity((req as any).user.id, 'notif_prefs_update', `Atualizou preferências de notificação do usuário ${user.username}`, req, 'User', String(userId));
    res.json({ message: 'Preferências atualizadas', user });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar notificações' });
  }
});

export default router;
