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
  id: true, username: true, role: true, repCode: true, code: true, tipo: true, 
  full_name: true, cpf_cnpj: true, telefone: true, cargo: true, company_name: true, groupId: true,
  photo: true, birth_date: true, colorIndex: true, comissao: true, isVago: true,
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

router.post('/users', requirePermission('users', 'edit'), async (req, res) => {
  const { username, password, role, tipo, full_name, repCode, code, photo, colorIndex, comissao, isVago, telefone, cpf_cnpj, birth_date, cargo, company_name, groupId } = req.body;
  
  if (!code) return res.status(400).json({ message: 'Código é obrigatório' });

  const existing = await prisma.user.findFirst({ 
    where: { code } 
  });
  if (existing) {
    return res.status(409).json({ message: `Código já existe` });
  }
  
  // Password validation
  if (password) {
    const { validatePasswordStrength } = require('../middlewares/security');
    if (!validatePasswordStrength(password)) {
      return res.status(400).json({ message: 'A senha deve conter letras maiúsculas, minúsculas, números e símbolos.' });
    }
  }

  const hashedPassword = password ? await bcrypt.hash(password, 10) : await bcrypt.hash('Mapa@123', 10);
  const user = await prisma.user.create({ 
    data: { 
      username: username || code, 
      password: hashedPassword, 
      role: role || 'user', 
      tipo: tipo || 'cliente', 
      full_name, 
      repCode, 
      code,
      photo,
      telefone,
      cpf_cnpj,
      cargo,
      company_name,
      groupId: groupId ? Number(groupId) : null,
      birth_date: birth_date ? new Date(birth_date) : null,
      colorIndex: colorIndex !== undefined ? Number(colorIndex) : 0,
      comissao: comissao ? parseFloat(comissao) : null,
      isVago: isVago ? 1 : 0
    }, 
    select: PUBLIC_USER_FIELDS 
  });
  res.status(201).json(user);
});

router.put('/users/:id', requirePermission('users', 'edit'), async (req, res) => {
  const id = Number(req.params.id);
  const { username, password, role, repCode, tipo, full_name, photo, colorIndex, comissao, isVago, telefone, cpf_cnpj, birth_date, cargo, company_name, groupId } = req.body;
  
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: 'Usuário não encontrado' });
  
  const data: any = { 
    username, role, repCode, tipo, full_name, telefone, cpf_cnpj, cargo, company_name,
    groupId: groupId !== undefined ? (groupId ? Number(groupId) : null) : undefined,
    birth_date: birth_date ? new Date(birth_date) : undefined,
    colorIndex: colorIndex !== undefined ? Number(colorIndex) : undefined,
    comissao: comissao !== undefined ? (comissao ? parseFloat(comissao) : null) : undefined,
    isVago: isVago !== undefined ? (isVago ? 1 : 0) : undefined
  };

  // NOTE: 'code' is purposely excluded from data to prevent editing after creation.

  if (password) {
    const { validatePasswordStrength } = require('../middlewares/security');
    if (!validatePasswordStrength(password)) {
      return res.status(400).json({ message: 'A senha deve conter letras maiúsculas, minúsculas, números e símbolos.' });
    }
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

// --- REPS (Now based on Users filtering) ---
router.get('/reps', requirePermission('reps', 'view'), async (req, res) => {
  const user = (req as any).user;
  const where: any = {
    OR: [
      { tipo: 'representante' },
      { role: 'user' }, // Adjusting to return all potential representatives
      { NOT: { repCode: null } }
    ]
  };

  if (user && user.role === 'representante' && user.repCode) {
    where.repCode = user.repCode;
  }

  const reps = await prisma.user.findMany({ 
    where,
    select: {
      repCode: true,
      full_name: true,
      username: true,
      colorIndex: true,
      isVago: true,
      comissao: true,
      _count: {
        select: { clientes: true, territories: true }
      }
    },
    orderBy: { repCode: 'asc' } 
  });

  // Map to the Representative format the frontend expects
  const formattedReps = reps.map(r => ({
    code: r.repCode || '',
    name: r.full_name || r.username,
    fullName: r.full_name,
    colorIndex: r.colorIndex,
    isVago: r.isVago,
    comissao: r.comissao,
    _count: r._count
  })).filter(r => r.code !== ''); // Ensure only those with repCode are treated as reps

  res.json(formattedReps);
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

router.get('/groups', async (req, res) => {
  const groups = await prisma.group.findMany({ orderBy: { name: 'asc' } });
  res.json(groups);
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
