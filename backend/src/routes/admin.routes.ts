import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, requirePermission } from '../middlewares/auth';
import { logUserActivity } from '../utils/logger';
import { supabaseAdmin } from '../lib/supabase';

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
  cep: true, logradouro: true, numero: true, complemento: true,
  bairro_end: true, cidade: true, estado_end: true, area_atuacao: true, base_logistica: true,
  created_at: true, last_active: true, token_version: true
};

// --- KICK USER ---
router.post('/users/:id/kick', requireAdminMiddleware, async (req: any, res) => {
  const id = Number(req.params.id);
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });

    // Increment token_version and reset last_active to force 'Offline' visually
    await prisma.user.update({
      where: { id },
      data: { 
        token_version: { increment: 1 },
        last_active: new Date(0) // 1970-01-01
      }
    });

    // Supabase session management: find user by email and revoke session
    const authEmail = user.username === 'admin' ? 'admin@mapaterritorio.com' : `${user.code || user.username}@mapaterritorio.com`;
    console.log(`[KICK] Tentando derrubar usuário por email: ${authEmail}`);
    
    try {
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
      const sbUser = authData?.users?.find(u => u.email === authEmail);
      
      if (sbUser) {
          console.log(`[KICK] Usuário Supabase encontrado (ID: ${sbUser.id}). Revogando sessões...`);
          await supabaseAdmin.auth.admin.signOut(sbUser.id);
      } else {
          console.warn(`[KICK] Usuário Supabase NÃO encontrado para o email: ${authEmail}`);
      }
    } catch (e) {
      console.error('[KICK] Erro crítico ao interagir com Supabase Admin:', e);
    }

    await logUserActivity(req.user.id, 'kick_user', `Administrador solicitou reset de sessão do usuário ${user.username}`, req, 'User', String(id));
    res.json({ message: `Sessão do usuário ${user.username} encerrada com sucesso` });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao derrubar sessão' });
  }
});

router.get('/users', requirePermission('users', 'view'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({ select: PUBLIC_USER_FIELDS, orderBy: { id: 'asc' } });
    res.json(users);
  } catch (error) {
    console.warn('[ADMIN] Prisma failed to fetch users list. Attempting HTTP Fallback...');
    const { data, error: httpError } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('id', { ascending: true });
    
    if (httpError) {
      console.error('[ADMIN] HTTP Fallback failed for users:', httpError.message);
      return res.status(500).json({ message: 'Erro ao listar usuários (Modo Offline)' });
    }
    res.json(data);
  }
});

router.post('/users', requirePermission('users', 'edit'), async (req: any, res) => {
  const { 
    password, role, tipo, full_name, repCode, code, photo, colorIndex, comissao, isVago, 
    telefone, cpf_cnpj, birth_date, cargo, company_name, groupId,
    cep, logradouro, numero, complemento, bairro_end, cidade, estado_end, area_atuacao, base_logistica 
  } = req.body;
  
  if (!code) return res.status(400).json({ message: 'Código é obrigatório' });

  const existing = await prisma.user.findFirst({ 
    where: { code } 
  });
  if (existing) {
    return res.status(409).json({ message: `Código já existe` });
  }
  
  try {
    // Step 1: Create in Supabase Auth via Admin API
    const authEmail = `${code}@mapaterritorio.com`;
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password: password || 'Mapa@123',
      email_confirm: true,
      user_metadata: { full_name, role: role || 'user' }
    });

    if (authError) {
        console.error('Supabase Auth error:', authError);
        return res.status(500).json({ message: `Erro no Supabase Auth: ${authError.message}` });
    }

    // Step 2: Create in our Prisma DB
    const user = await prisma.user.create({ 
      data: { 
        username: code, 
        password: 'SUPABASE_AUTH_ACTIVE', // We don't store plain passwords anymore
        role: role || 'user', 
        tipo: tipo || 'normal', 
        full_name, 
        repCode: (repCode === '' || repCode === null) ? null : repCode, 
        code,
        photo,
        telefone,
        cpf_cnpj,
        cargo,
        company_name,
        cep,
        logradouro,
        numero,
        complemento,
        bairro_end,
        cidade,
        estado_end,
        area_atuacao,
        base_logistica,
        groupId: groupId ? Number(groupId) : null,
        birth_date: birth_date ? new Date(birth_date) : null,
        colorIndex: colorIndex !== undefined ? Number(colorIndex) : 0,
        comissao: (comissao !== undefined && comissao !== '' && comissao !== null) ? parseFloat(comissao) : null,
        isVago: isVago ? 1 : 0,
        last_active: new Date(0), // Epoch = never logged in (sentinela)
      }, 
      select: PUBLIC_USER_FIELDS 
    });

    await logUserActivity(req.user.id, 'create_user', `Criou novo usuário ${code}`, req, 'User', String(user.id));
    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Erro ao criar usuário' });
  }
});

router.put('/users/:id', requirePermission('users', 'edit'), async (req: any, res) => {
  const id = Number(req.params.id);
  const { 
    password, role, repCode, tipo, full_name, photo, colorIndex, comissao, isVago, 
    telefone, cpf_cnpj, birth_date, cargo, company_name, groupId,
    cep, logradouro, numero, complemento, bairro_end, cidade, estado_end, area_atuacao, base_logistica 
  } = req.body;
  
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: 'Usuário não encontrado' });
  
  try {
    // 1. Optional password sync to Supabase (if provided)
    if (password && existing.code) {
      try {
        const authEmail = `${existing.code}@mapaterritorio.com`;
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const sbUser = users.find(u => u.email === authEmail);
        
        if (sbUser) {
          const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(sbUser.id, { password });
          if (updErr) console.error('[AUTH] Error syncing password to Supabase:', updErr);
        }
      } catch (authSyncError) {
        console.error('[AUTH] Supabase sync failed, continuing with local update:', authSyncError);
      }
    }

    // 2. Prepare data for Prisma update
    const data: any = { 
        role, 
        repCode: (repCode === '' || repCode === null) ? null : repCode, 
        tipo, 
        full_name, 
        telefone, 
        cpf_cnpj, 
        cargo, 
        company_name,
        cep, logradouro, numero, complemento, bairro_end, cidade, estado_end, area_atuacao, base_logistica,
        // Ensure groupId is not 0 if empty string is passed
        groupId: (groupId !== undefined && groupId !== '' && groupId !== null) ? Number(groupId) : (groupId === '' || groupId === null ? null : undefined),
        birth_date: birth_date ? new Date(birth_date) : undefined,
        colorIndex: colorIndex !== undefined ? Number(colorIndex) : undefined,
        isVago: isVago !== undefined ? (isVago ? 1 : 0) : undefined
    };

    // Safe Float parsing for comissao
    if (comissao !== undefined) {
      if (comissao === '' || comissao === null) {
        data.comissao = null;
      } else {
        const val = parseFloat(comissao);
        data.comissao = isNaN(val) ? null : val;
      }
    }

    if (photo !== undefined) data.photo = photo;
    
    // 3. Perform database update
    const user = await prisma.user.update({ 
      where: { id }, 
      data, 
      select: PUBLIC_USER_FIELDS 
    });

    await logUserActivity(req.user.id, 'update_user', `Atualizou usuário ${user.username}`, req, 'User', String(id));
    res.json(user);
  } catch (error: any) {
    console.error('Update user error:', error);
    
    // Specific check for Unique constraint (repCode or username)
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'campo único';
      return res.status(400).json({ 
        message: `O ${field} informado já está em uso por outro usuário.`,
        field 
      });
    }

    res.status(500).json({ 
      message: 'Erro ao atualizar usuário',
      details: error.message 
    });
  }
});

router.delete('/users/:id', requireAdminMiddleware, async (req: any, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: 'Usuário não encontrado' });
  
  try {
    // Sync delete to Supabase Auth
    const authEmail = `${existing.code}@mapaterritorio.com`;
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const sbUser = users.find(u => u.email === authEmail);
    if (sbUser) {
        await supabaseAdmin.auth.admin.deleteUser(sbUser.id);
    }

    await prisma.user.delete({ where: { id } });
    await logUserActivity(req.user.id, 'delete_user', `Excluiu usuário ${existing.username}`, req, 'User', String(id));
    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir usuário' });
  }
});

// --- REPS (Now based on Users filtering) ---
router.get('/reps', requirePermission('reps', 'view'), async (req, res) => {
  const user = (req as any).user;

  // Build base filter: must have a repCode AND be a representative by role or tipo
  let where: any = {
    repCode: { not: null },
    OR: [
      { role: 'representante' },
      { tipo: 'representante' }
    ]
  };

  // If the requester is a rep themselves, restrict to only their own record
  if (user && user.role === 'representante' && user.repCode) {
    where = { repCode: user.repCode };
  }

  try {
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
  } catch (error) {
    console.warn('[ADMIN] Prisma failed to fetch reps list. Attempting HTTP Fallback...');
    // Simple HTTP Fallback for reps
    let query = supabaseAdmin
      .from('users')
      .select('*')
      .not('repCode', 'is', null) // repCode != null
      .or('role.eq.representante,tipo.eq.representante')
      .order('repCode', { ascending: true });
    
    if (user && user.role === 'representante' && user.repCode) {
      query = query.eq('repCode', user.repCode);
    }

    const { data: repsData, error: httpError } = await query;
    
    if (httpError) return res.status(500).json({ message: 'Erro ao listar representantes (Modo Offline)' });

    const formatted = (repsData || []).map(r => ({
      code: r.repCode || '',
      name: r.full_name || r.username,
      fullName: r.full_name,
      colorIndex: r.colorIndex,
      isVago: r.isVago === 1,
      comissao: r.comissao,
      _count: { clientes: 0, territories: 0 } // Counts limited in fallback mode
    })).filter(r => r.code !== '');

    res.json(formatted);
  }
});

router.post('/reps', requireAdminMiddleware, async (req: any, res) => {
  const { userId, code, colorIndex } = req.body;
  if (!userId || !code) return res.status(400).json({ message: 'UserId e código são obrigatórios' });

  try {
    const user = await prisma.user.update({
      where: { id: Number(userId) },
      data: {
        repCode: code,
        role: 'representante',
        tipo: 'representante',
        colorIndex: colorIndex !== undefined ? Number(colorIndex) : undefined
      }
    });

    await logUserActivity(req.user.id, 'create_rep', `Promoveu usuário ${user.username} para representante (${code})`, req, 'User', String(userId));
    res.json({ message: 'Representante vinculado com sucesso', user });
  } catch (error: any) {
    if (error.code === 'P2002') {
        return res.status(400).json({ message: 'Este código de representante já está em uso.' });
    }
    res.status(500).json({ message: 'Erro ao vincular representante' });
  }
});

router.put('/reps/:code', requireAdminMiddleware, async (req: any, res) => {
  const code = req.params.code;
  const { name, colorIndex, isVago, comissao } = req.body;
  
  try {
    const user = await prisma.user.update({
      where: { repCode: code },
      data: {
        full_name: name,
        colorIndex: colorIndex !== undefined ? Number(colorIndex) : undefined,
        isVago: isVago !== undefined ? (isVago ? 1 : 0) : undefined,
        comissao: comissao ? parseFloat(comissao) : null
      }
    });

    await logUserActivity(req.user.id, 'update_rep', `Atualizou dados do rep ${code}`, req, 'User', String(user.id));
    res.json({ message: 'Atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar representante' });
  }
});

router.delete('/reps/:code', requireAdminMiddleware, async (req: any, res) => {
  const code = req.params.code;
  
  try {
    // We clear the repCode from the user, effectively "demoting" them
    const user = await prisma.user.update({
      where: { repCode: code },
      data: {
        repCode: null,
        role: 'user',
        tipo: 'normal'
      }
    });

    // Also remove their territories as requested in the frontend UI message
    await prisma.territory.deleteMany({ where: { repCode: code } });

    await logUserActivity(req.user.id, 'delete_rep', `Removeu vínculo de representante de ${code}`, req, 'User', String(user.id));
    res.json({ message: 'Representante removido com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover representante' });
  }
});

// --- TERRITORIES ---
router.get('/territories', requirePermission('territories', 'view'), async (req, res) => {
  const user = (req as any).user;
  const where: any = {};
  if (user && user.role === 'representante' && user.repCode) {
    where.repCode = user.repCode;
  }

  try {
    const ter = await prisma.territory.findMany({ where, orderBy: [{ uf: 'asc' }, { municipio: 'asc' }] });
    res.json(ter);
  } catch (error) {
    console.warn('[ADMIN] Prisma failed to fetch territories. Falling back to HTTP.');
    let query = supabaseAdmin
        .from('territories')
        .select('*')
        .order('uf', { ascending: true })
        .order('municipio', { ascending: true });
    
    if (user && user.role === 'representante' && user.repCode) {
        query = query.eq('repCode', user.repCode);
    }

    const { data, error: httpError } = await query;
    if (httpError) return res.status(500).json({ message: 'Erro ao listar territórios' });
    res.json(data || []);
  }
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
  try {
    const groups = await prisma.group.findMany({ orderBy: { name: 'asc' } });
    res.json(groups);
  } catch (error) {
    console.warn('[ADMIN] Prisma failed to fetch groups. Falling back to HTTP.');
    const { data, error: httpError } = await supabaseAdmin
        .from('groups')
        .select('*')
        .order('name', { ascending: true });
    
    if (httpError) return res.status(500).json({ message: 'Erro ao listar grupos' });
    res.json(data || []);
  }
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
