import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, requirePermission, requireAdmin } from '../middlewares/auth';
import { logUserActivity } from '../utils/logger';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();
router.use(authenticate);

// ── USER TYPES ──────────────────────────────────────────────────────────────

// Get all user types
router.get('/user-types', authenticate, async (req, res) => {
  try {
    // @ts-ignore
    const types = await prisma.$queryRawUnsafe(`SELECT * FROM "user_types" ORDER BY "name" ASC`);
    res.json(types);
  } catch (error) {
    console.error('Error fetching user types:', error);
    res.status(500).json({ message: 'Erro ao buscar tipos de usuário' });
  }
});

// Create new user type
router.post('/user-types', authenticate, requirePermission('settings', 'edit'), async (req: any, res) => {
  const { name, color, icon, showInMenu, active, isAdmin } = req.body;
  if (!name) return res.status(400).json({ message: 'Nome é obrigatório' });

  try {
    // @ts-ignore
    await prisma.$executeRawUnsafe(
      `INSERT INTO "user_types" ("name", "color", "icon", "showInMenu", "active", "isAdmin", "isSystemDefault")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      name, color || '#3b82f6', icon || 'User', !!showInMenu, 
      active !== undefined ? !!active : true, !!isAdmin, false
    );
    
    // @ts-ignore
    const type = await prisma.$queryRawUnsafe(`SELECT * FROM "user_types" WHERE "name" = $1`, name);
    const createdType = Array.isArray(type) ? type[0] : null;
    
    await logUserActivity(req.user.id, 'create_user_type', `Criou tipo de usuário: ${name}`, req, 'UserType', createdType ? String(createdType.id) : 'N/A');
    res.status(201).json(createdType);
  } catch (error) {
    console.error('Error creating user type:', error);
    res.status(500).json({ message: 'Erro ao criar tipo de usuário' });
  }
});

// Update user type
router.put('/user-types/:id', authenticate, requirePermission('settings', 'edit'), async (req: any, res) => {
  const id = Number(req.params.id);
  const { name, color, icon, showInMenu, active, isAdmin } = req.body;

  try {
    // @ts-ignore
    await prisma.$executeRawUnsafe(
      `UPDATE "user_types" 
       SET "name" = COALESCE($1, "name"), 
           "color" = COALESCE($2, "color"), 
           "icon" = COALESCE($3, "icon"), 
           "showInMenu" = COALESCE($4, "showInMenu"), 
           "active" = COALESCE($5, "active"), 
           "isAdmin" = COALESCE($6, "isAdmin"),
           "updatedAt" = NOW()
       WHERE "id" = $7`,
      name, color, icon, showInMenu, active, isAdmin, id
    );

    await logUserActivity(req.user.id, 'update_user_type', `Atualizou tipo de usuário: ${name || id}`, req, 'UserType', String(id));
    res.json({ message: 'Tipo atualizado com sucesso' });
  } catch (error) {
    console.error('Error updating user type:', error);
    res.status(500).json({ message: 'Erro ao atualizar tipo de usuário' });
  }
});

// Delete user type
router.delete('/user-types/:id', authenticate, requirePermission('settings', 'edit'), async (req: any, res) => {
  const id = Number(req.params.id);
  try {
    // @ts-ignore
    const typeResults = await prisma.$queryRawUnsafe(`SELECT * FROM "user_types" WHERE "id" = $1`, id);
    const type = Array.isArray(typeResults) ? typeResults[0] : null;
    
    if (type?.isSystemDefault) {
      return res.status(403).json({ message: 'Tipos padrão do sistema não podem ser removidos' });
    }

    // Primeiro limpa as referências nos usuários
    await prisma.$executeRawUnsafe(`UPDATE "users" SET "userTypeId" = NULL WHERE "userTypeId" = $1`, id);
    
    // @ts-ignore
    await prisma.$executeRawUnsafe(`DELETE FROM "user_types" WHERE "id" = $1`, id);

    await logUserActivity(req.user.id, 'delete_user_type', `Removeu tipo de usuário ID: ${id}`, req, 'UserType', String(id));
    res.json({ message: 'Tipo removido com sucesso' });
  } catch (error) {
    console.error('Error deleting user type:', error);
    res.status(500).json({ message: 'Erro ao remover tipo' });
  }
});

const PUBLIC_USER_FIELDS = { 
  id: true, username: true, role: true, code: true, tipo: true, userTypeId: true,
  full_name: true, cpf_cnpj: true, telefone: true, cargo: true, company_name: true, groupId: true,
  photo: true, birth_date: true, colorIndex: true, comissao: true, isVago: true,
  email: true, // Incluído o campo email no SELECT
  cep: true, logradouro: true, numero: true, complemento: true,
  bairro_end: true, cidade: true, estado_end: true, area_atuacao: true, base_logistica: true,
  created_at: true, last_active: true, token_version: true
};

// --- KICK USER ---
router.post('/users/:id/kick', requireAdmin, async (req: any, res) => {
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
    password, role, tipo, userTypeId, full_name, code, photo, colorIndex, comissao, isVago, 
    telefone, cpf_cnpj, birth_date, cargo, company_name, groupId,
    cep, logradouro, numero, complemento, bairro_end, cidade, estado_end, area_atuacao, base_logistica,
    email
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

    const user: any = await prisma.user.create({ 
      data: { 
        username: code, 
        password: 'SUPABASE_AUTH_ACTIVE', // We don't store plain passwords anymore
        role: role || 'user', 
        tipo: tipo || 'normal', 
        full_name, 
        code,
        photo,
        telefone,
        cpf_cnpj,
        cargo,
        company_name,
        email: email || `${code}@mapaterritorio.com`, // Email obrigatório para sync
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
        // @ts-ignore
        userTypeId: userTypeId ? Number(userTypeId) : null,
        last_active: new Date(0), // Epoch = never logged in (sentinela)
      }, 
      select: PUBLIC_USER_FIELDS 
    });

    // Salva o supabase_id usando Raw SQL para evitar erro de tipo/cliente preso
    await prisma.$executeRawUnsafe('UPDATE "users" SET "supabase_id" = $1 WHERE "id" = $2', authUser.user.id, user.id);

    // Step 3: Initialize default permissions for all modules
    try {
      const modules: any[] = await prisma.$queryRawUnsafe('SELECT "id" FROM "modules"');
      if (modules.length > 0) {
        for (const m of modules) {
           await prisma.$executeRawUnsafe(
             'INSERT INTO "user_permissions" ("userId", "moduleId", "canView", "canEdit") VALUES ($1, $2, $3, $4)',
             user.id, m.id, role === 'admin' || role === 'supervisor', role === 'admin' || role === 'supervisor'
           );
        }
      }
    } catch (permError) {
      console.error('Error initializing default permissions:', permError);
    }

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
    password, role, tipo, userTypeId, full_name, photo, colorIndex, comissao, isVago, 
    telefone, cpf_cnpj, birth_date, cargo, company_name, groupId,
    cep, logradouro, numero, complemento, bairro_end, cidade, estado_end, area_atuacao, base_logistica,
    email 
  } = req.body;

  // Validação de e-mail no backend
  if (!email) {
    return res.status(400).json({ message: 'O e-mail é obrigatório.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'O formato do e-mail é inválido.' });
  }
  
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: 'Usuário não encontrado' });
  
  try {
    // 1. Password sync to Supabase
    if (password) {
      try {
        console.log(`[AUTH] Iniciando troca de senha para usuário ID local: ${id}`);
        
        // Busca o supabase_id via SQL puro para evitar erro de tipo no cliente
        const userDb: any[] = await prisma.$queryRawUnsafe('SELECT "supabase_id", "username", "code", "email" FROM "users" WHERE "id" = $1', id);
        const userData = userDb[0];
        
        if (!userData) throw new Error('Usuário não encontrado no banco de dados local.');

        let sbUserId = userData.supabase_id;
        console.log(`[AUTH] Supabase ID atual no banco: ${sbUserId || 'Nulo'}`);

        // Se não temos o supabase_id salvo, tentamos buscar no Supabase
        if (!sbUserId) {
          const email1 = `${userData.code || userData.username}@mapaterritorio.com`.toLowerCase();
          const email2 = userData.email?.toLowerCase();
          
          console.log(`[AUTH] Buscando ID no Supabase por e-mails: ${email1} ${email2 ? 'ou ' + email2 : ''}`);
          
          const { data: { users: sbUsers }, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
            perPage: 1000 // Aumenta o limite para encontrar usuários antigos
          });
          
          if (listErr) {
            console.error('[AUTH] Erro ao listar usuários no Supabase:', listErr);
            throw listErr;
          }

          const sbUser = sbUsers.find(u => 
            u.email?.toLowerCase() === email1 || (email2 && u.email?.toLowerCase() === email2)
          );
          
          if (sbUser) {
            sbUserId = sbUser.id;
            console.log(`[AUTH] Usuário localizado via busca: ${sbUserId}. Sincronizando ID...`);
            await prisma.$executeRawUnsafe('UPDATE "users" SET "supabase_id" = $1 WHERE "id" = $2', sbUserId, id);
          }
        }

        if (sbUserId) {
          console.log(`[AUTH] Chamando updateUserById para ID: ${sbUserId}`);
          const { data: updData, error: updErr } = await supabaseAdmin.auth.admin.updateUserById(sbUserId, { password });
          
          if (updErr) {
            console.error('[AUTH] Erro retornado pelo Supabase Auth:', updErr);
            // Erros comuns: senha curta, email não confirmado (se configurado), etc.
            throw new Error(`Erro Supabase: ${updErr.message}`);
          }
          
          console.log('[AUTH] Senha atualizada com sucesso para:', updData.user?.email);
        } else {
          console.error('[AUTH] Usuário não encontrado no Supabase Auth.');
          throw new Error('O cadastro deste usuário não existe no servidor de autenticação.');
        }
      } catch (authSyncError: any) {
        console.error('[AUTH] Falha na sincronização de senha:', authSyncError.message);
        return res.status(500).json({ 
          message: 'Não foi possível alterar a senha no servidor de autenticação.', 
          details: authSyncError.message 
        });
      }
    }

    // 2. Prepare data for Prisma update
    const data: any = { 
        role, 
        tipo, 
        // @ts-ignore
        userTypeId: (userTypeId !== undefined && userTypeId !== '' && userTypeId !== null) ? Number(userTypeId) : (userTypeId === '' || userTypeId === null ? null : undefined),
        full_name, 
        telefone, 
        cpf_cnpj, 
        cargo, 
        company_name,
        email, // Salvando o email no banco de dados
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

    console.log(`[ADMIN] Usuário ${user.username} (ID: ${id}) atualizado com sucesso no Prisma.`);

    await logUserActivity(req.user.id, 'update_user', `Atualizou usuário ${user.username}`, req, 'User', String(id));
    res.json(user);
  } catch (error: any) {
    console.error('Update user error:', error);
    
    // Specific check for Unique constraint (code or username)
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

router.delete('/users/:id', requireAdmin, async (req: any, res) => {
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

// --- TERRITORIES ---
router.get('/territories', requirePermission('territories', 'view'), async (req, res) => {
  const user = (req as any).user;
  const where: any = {};
  
  // If not admin, restrict to only their own territories
  if (user && user.role !== 'admin') {
    where.userId = user.id;
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
    
    if (user && user.role !== 'admin') {
        query = query.eq('userId', user.id);
    }

    const { data, error: httpError } = await query;
    if (httpError) return res.status(500).json({ message: 'Erro ao listar territórios' });
    res.json(data || []);
  }
});

router.post('/territories/import', requireAdmin, async (req: any, res) => {
  const { mappings } = req.body;
  if (!Array.isArray(mappings)) return res.status(400).json({ message: 'Formato inválido' });
  
  try {
    await prisma.$transaction(
      mappings.map((m: any) => prisma.territory.create({ data: { municipio: m.municipio, uf: m.uf, userId: m.userId ? Number(m.userId) : null, modo: m.modo || 'planejamento' } }))
    );
    
    await logUserActivity(req.user.id, 'import_territories', `Importou ${mappings.length} territórios`, req);
    res.json({ message: `${mappings.length} territórios importados.` });
  } catch (error) {
    console.error('Error importing territories:', error);
    res.status(500).json({ message: 'Erro ao importar territórios' });
  }
});

router.post('/bairros/import', requireAdmin, async (req, res) => {
  const { mappings } = req.body;
  if (!Array.isArray(mappings)) return res.status(400).json({ message: 'Formato inválido' });
  
  await prisma.$transaction(
    mappings.map((m: any) => prisma.bairro.create({ data: { bairro: m.bairro, regiao: m.regiao, municipio: m.municipio, uf: m.uf, userId: m.userId ? Number(m.userId) : null, modo: m.modo || 'atendimento' } }))
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

// Save user permissions and handle auto-promotion
router.post('/users/:id/permissions', authenticate, requirePermission('users', 'edit'), async (req: any, res) => {
  const userId = Number(req.params.id);
  const { permissions } = req.body;

  try {
    // 1. Save permissions using Raw Queries to ensure persistence
    await prisma.$executeRawUnsafe('DELETE FROM "user_permissions" WHERE "userId" = $1', userId);
    
    if (Array.isArray(permissions) && permissions.length > 0) {
      for (const p of permissions) {
        await prisma.$executeRawUnsafe(
          'INSERT INTO "user_permissions" ("userId", "moduleId", "canView", "canEdit") VALUES ($1, $2, $3, $4)',
          userId, p.moduleId, !!p.canView, !!p.canEdit
        );
      }
    }

    // 2. Check for auto-promotion to admin
    // Se marcou 'canEdit' nos módulos principais, promove a admin
    const coreModules = ['users', 'clientes', 'territories', 'notifications'];
    const hasCoreEdit = coreModules.every(slug => 
      permissions.find((p: any) => p.moduleId === slug)?.canEdit === true
    );

    let roleUpdated = false;
    if (hasCoreEdit) {
      await prisma.$executeRawUnsafe('UPDATE "users" SET "role" = \'admin\' WHERE "id" = $1', userId);
      
      // Sincroniza com Supabase Auth Metadata para o próximo login
      try {
        const { data: { users: sbUsers } } = await supabaseAdmin.auth.admin.listUsers();
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        const authEmail = `${targetUser?.code || targetUser?.username}@mapaterritorio.com`;
        const sbUser = sbUsers.find(u => u.email === authEmail);
        
        if (sbUser) {
          await supabaseAdmin.auth.admin.updateUserById(sbUser.id, {
            user_metadata: { ...sbUser.user_metadata, role: 'admin' }
          });
        }
      } catch (authErr) {
        console.error('[AUTH] Erro ao sincronizar role no Supabase:', authErr);
      }

      roleUpdated = true;
      console.log(`[ADMIN] Usuário ID ${userId} promovido a ADMIN automaticamente.`);
    }

    await logUserActivity(req.user.id, 'update_permissions', `Atualizou permissões do usuário ${userId}${roleUpdated ? ' (Promovido a ADMIN)' : ''}`, req);
    
    res.json({ 
      message: 'Permissões salvas com sucesso', 
      promoted: roleUpdated 
    });
  } catch (error) {
    console.error('Error saving permissions:', error);
    res.status(500).json({ message: 'Erro ao salvar permissões' });
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
