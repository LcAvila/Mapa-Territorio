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
    const fetchPromise = prisma.$queryRawUnsafe(`SELECT * FROM "user_types" ORDER BY "name" ASC`);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Prisma Timeout')), 5000));
    const types = await Promise.race([fetchPromise, timeoutPromise]);
    res.json(types);
  } catch (error) {
    console.warn('[ADMIN] Prisma failed or timed out to fetch user types. Falling back to HTTP.');
    const { data, error: httpError } = await supabaseAdmin
        .from('user_types')
        .select('*')
        .order('name', { ascending: true });
    
    if (httpError) return res.status(500).json({ message: 'Erro ao buscar tipos de usuário' });
    res.json(data || []);
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
  id: true,
  username: true,
  full_name: true,
  code: true,
  email: true,
  role: true,
  tipo: true,
  userTypeId: true,
  cpf_cnpj: true,
  telefone: true,
  birth_date: true,
  cargo: true,
  company_name: true,
  groupId: true,
  cep: true,
  logradouro: true,
  numero: true,
  complemento: true,
  bairro_end: true,
  cidade: true,
  estado_end: true,
  assigned_state: true,
  default_screen: true,
  area_atuacao: true,
  base_logistica: true,
  managedUsers: {
    select: {
      id: true,
      username: true,
      full_name: true,
      code: true
    }
  },
  photo: true,
  colorIndex: true,
  last_active: true,
  isVago: true,
  token_version: true,
  permissions: {
    include: {
      module: true
    }
  }
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
      let sbUserId = (user as any).supabase_id;
      
      if (!sbUserId) {
        const { data: authData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) {
          console.error('[KICK] Erro ao listar usuários no Supabase:', listError.message);
        } else if (authData && Array.isArray(authData.users)) {
          const sbUser = authData.users.find(u => u.email === authEmail);
          if (sbUser) {
            sbUserId = sbUser.id;
            await prisma.$executeRawUnsafe('UPDATE "users" SET "supabase_id" = $1 WHERE "id" = $2', sbUserId, id);
          }
        }
      }
      
      if (sbUserId) {
          console.log(`[KICK] Usuário Supabase encontrado (ID: ${sbUserId}). Revogando sessões...`);
          await supabaseAdmin.auth.admin.signOut(sbUserId);
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

// ── AUDIT LOGS ─────────────────────────────────────────────────────────────

// Get all audit logs
router.get('/audit', requirePermission('audit', 'view'), async (req, res) => {
  try {
    const fetchPromise = prisma.userActivity.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            full_name: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 500
    });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Prisma Timeout')), 5000));
    const logs = await Promise.race([fetchPromise, timeoutPromise]) as any[];
    
    // Map to frontend structure
    const mappedLogs = logs.map(log => ({
      id: String(log.id),
      action: log.action,
      entity: log.entity || 'Sistema',
      entityId: log.entityId || '',
      details: log.details,
      performedBy: log.user?.full_name || log.user?.username || 'Sistema',
      timestamp: log.timestamp instanceof Date ? log.timestamp.toISOString() : new Date(log.timestamp).toISOString(),
      ipAddress: log.ipAddress
    }));

    res.json(mappedLogs);
  } catch (error) {
    console.warn('[ADMIN] Prisma failed or timed out to fetch audit logs. Falling back to HTTP.');
    const { data, error: httpError } = await supabaseAdmin
        .from('user_activities')
        .select('*, user:users(id, username, full_name)')
        .order('timestamp', { ascending: false })
        .limit(500);
    
    if (httpError) {
      console.error('[ADMIN] HTTP Fallback failed for audit logs:', httpError.message);
      return res.status(500).json({ message: 'Erro ao buscar logs de auditoria' });
    }
    
    const mappedLogs = (data || []).map((log: any) => ({
      id: String(log.id),
      action: log.action,
      entity: log.entity || 'Sistema',
      entityId: log.entityId || '',
      details: log.details,
      performedBy: log.user?.full_name || log.user?.username || 'Sistema',
      timestamp: log.timestamp,
      ipAddress: log.ipAddress
    }));
    
    res.json(mappedLogs);
  }
});

// Clear audit logs (Admin only)
router.delete('/audit/clear', requireAdmin, async (req: any, res) => {
  try {
    await prisma.userActivity.deleteMany({});
    await logUserActivity(req.user.id, 'clear_audit', 'Administrador limpou o histórico de auditoria', req, 'Audit');
    res.json({ message: 'Histórico de auditoria removido com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao limpar auditoria' });
  }
});

router.get('/users/:id', requirePermission('users', 'view'), async (req, res) => {
  const id = Number(req.params.id);
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: PUBLIC_USER_FIELDS
    });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    res.json(user);
  } catch (error) {
    console.warn(`[ADMIN] Prisma failed for user ${id}. Falling back to HTTP.`);
    const { data, error: httpError } = await supabaseAdmin
      .from('users')
      .select('*, permissions:user_permissions(*, module:modules(*))')
      .eq('id', id)
      .single();
    
    if (httpError || !data) return res.status(404).json({ message: 'Usuário não encontrado' });
    
    // Adapt data to match PUBLIC_USER_FIELDS structure
    const mappedUser = {
      ...data,
      permissions: (data.permissions || []).map((p: any) => ({
        ...p,
        module: p.module || p.modules
      })),
      managedUsers: []
    };
    
    res.json(mappedUser);
  }
});

router.get('/users', requirePermission('users', 'view'), async (req, res) => {
  try {
    const findPromise = prisma.user.findMany({ select: PUBLIC_USER_FIELDS, orderBy: { id: 'asc' } });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Prisma Timeout')), 5000));
    const users = await Promise.race([findPromise, timeoutPromise]) as any[];
    res.json(users);
  } catch (error) {
    console.warn('[ADMIN] Prisma failed or timed out to fetch users list. Attempting HTTP Fallback...');
    const { data, error: httpError } = await supabaseAdmin
      .from('users')
      .select('*, permissions:user_permissions(*, module:modules(*))')
      .order('id', { ascending: true });
    
    if (httpError) {
      console.error('[ADMIN] HTTP Fallback failed for users:', httpError.message);
      return res.status(500).json({ message: 'Erro ao listar usuários (Modo Offline)' });
    }
    
    // Adapt data to match PUBLIC_USER_FIELDS structure
    const mappedUsers = (data || []).map((u: any) => ({
      ...u,
      permissions: (u.permissions || []).map((p: any) => ({
        ...p,
        module: p.module || p.modules // Supabase might return modules or module
      })),
      managedUsers: [] // Managed users join is complex via HTTP, returning empty to avoid crash
    }));
    
    res.json(mappedUsers);
  }
});

router.post('/users', requirePermission('users', 'edit'), async (req: any, res) => {
  const { 
      code, password, role, tipo, userTypeId, managedUserIds, full_name, photo, colorIndex, comissao, isVago, 
      telefone, cpf_cnpj, birth_date, cargo, company_name, groupId,
      cep, logradouro, numero, complemento, bairro_end, cidade, estado_end, assigned_state, area_atuacao, base_logistica,
      email, default_screen // Recebendo o email do frontend
    } = req.body;
  
  const permissions = req.body.permissions as { moduleId: string; canView: boolean; canEdit: boolean }[] | undefined;
  
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
        assigned_state,
        area_atuacao,
        base_logistica,
        // @ts-ignore
        default_screen: default_screen || 'mapa',
        groupId: groupId ? Number(groupId) : null,
        // @ts-ignore
        managedUsers: managedUserIds ? {
          connect: managedUserIds.map((id: number) => ({ id }))
        } : undefined,
        birth_date: birth_date ? new Date(birth_date) : null,
        colorIndex: colorIndex !== undefined ? Number(colorIndex) : 0,
        comissao: (comissao !== undefined && comissao !== '' && comissao !== null) ? parseFloat(comissao) : null,
        isVago: isVago ? 1 : 0,
        // @ts-ignore
        userTypeId: userTypeId ? Number(userTypeId) : null,
        last_active: new Date(0), // Epoch = never logged in (sentinela)
      } as any, 
      select: PUBLIC_USER_FIELDS 
    });

    // Salva o supabase_id usando Raw SQL para evitar erro de tipo/cliente preso
    await prisma.$executeRawUnsafe('UPDATE "users" SET "supabase_id" = $1 WHERE "id" = $2', authUser.user.id, user.id);

    // Step 3: Initialize permissions
    try {
      if (permissions && permissions.length > 0) {
        // Use custom permissions from request
        for (const p of permissions) {
          await prisma.$executeRawUnsafe(
            'INSERT INTO "user_permissions" ("userId", "moduleId", "canView", "canEdit") VALUES ($1, $2, $3, $4)',
            user.id, p.moduleId, p.canView, p.canEdit
          );
        }
      } else {
        // Fallback to default permissions for all modules
        const modules: any[] = await prisma.$queryRawUnsafe('SELECT "id" FROM "modules"');
        if (modules.length > 0) {
          for (const m of modules) {
             let canView = role === 'admin' || role === 'supervisor';
             let canEdit = role === 'admin' || role === 'supervisor';

             // Regra padrão: para não-admins, dashboard, clientes, territories e audit são somente visualizar
             if (role !== 'admin' && ['dashboard', 'clientes', 'territories', 'audit', 'settings'].includes(m.id)) {
               canView = true;
               canEdit = false;
             }

             await prisma.$executeRawUnsafe(
               'INSERT INTO "user_permissions" ("userId", "moduleId", "canView", "canEdit") VALUES ($1, $2, $3, $4)',
               user.id, m.id, canView, canEdit
             );
          }
        }
      }
    } catch (permError) {
      console.error('Error initializing permissions:', permError);
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
    password, role, tipo, userTypeId, managedUserIds, full_name, photo, colorIndex, comissao, isVago, 
    telefone, cpf_cnpj, birth_date, cargo, company_name, groupId,
    cep, logradouro, numero, complemento, bairro_end, cidade, estado_end, assigned_state, area_atuacao, base_logistica,
    email, default_screen, permissions // Adicionando permissions e default_screen aqui
  } = req.body;

  // Validação de e-mail no backend
  if (!email) {
    return res.status(400).json({ message: 'O e-mail é obrigatório.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'O formato do e-mail é inválido.' });
  }
  
  try {
    // 0. Fetch existing user with timeout and HTTP fallback
    let existing: any = null;
    try {
      const fetchPromise = prisma.user.findUnique({ where: { id } });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Prisma Timeout')), 5000));
      existing = await Promise.race([fetchPromise, timeoutPromise]);
    } catch (dbError) {
      console.warn(`[ADMIN] Prisma failed to fetch user ${id} for update. Using HTTP Fallback.`);
      const { data, error } = await supabaseAdmin.from('users').select('*').eq('id', id).single();
      if (!error && data) existing = data;
    }
    
    if (!existing) return res.status(404).json({ message: 'Usuário não encontrado' });
    
    // 1. Password sync to Supabase (mantendo lógica existente)
    if (password) {
      try {
        console.log(`[AUTH] Iniciando troca de senha para usuário ID local: ${id}`);
        
        // Busca o supabase_id
        let sbUserId = existing.supabase_id;
        
        // Se não temos o supabase_id salvo, tentamos buscar no Supabase
        if (!sbUserId) {
          const email1 = `${existing.code || existing.username}@mapaterritorio.com`.toLowerCase();
          const email2 = existing.email?.toLowerCase();
          
          console.log(`[AUTH] Buscando ID no Supabase por e-mails: ${email1} ${email2 ? 'ou ' + email2 : ''}`);
          
          const { data: authData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
            perPage: 1000
          });
          
          if (!listErr && authData && Array.isArray(authData.users)) {
            const sbUser = authData.users.find(u => 
              u.email?.toLowerCase() === email1 || (email2 && u.email?.toLowerCase() === email2)
            );
            
            if (sbUser) {
              sbUserId = sbUser.id;
              console.log(`[AUTH] Usuário localizado via busca: ${sbUserId}. Sincronizando ID...`);
              await prisma.$executeRawUnsafe('UPDATE "users" SET "supabase_id" = $1 WHERE "id" = $2', sbUserId, id).catch(() => {});
            }
          }
        }

        if (sbUserId) {
          const { data: updData, error: updErr } = await supabaseAdmin.auth.admin.updateUserById(sbUserId, { password });
          if (updErr) throw new Error(`Erro Supabase: ${updErr.message}`);
        } else {
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

    // 2. Perform database update with timeout and HTTP fallback
    const updateData: any = { 
      full_name, 
      photo,
      telefone,
      cpf_cnpj,
      cargo,
      company_name,
      email: email || undefined,
      cep,
      logradouro,
      numero,
      complemento,
      bairro_end,
      cidade,
      estado_end,
      assigned_state,
      area_atuacao,
      base_logistica,
      // @ts-ignore
      default_screen,
      birth_date: birth_date ? new Date(birth_date) : undefined,
      colorIndex: colorIndex !== undefined ? Number(colorIndex) : undefined,
      comissao: (comissao !== undefined && comissao !== '' && comissao !== null) ? parseFloat(String(comissao)) : (comissao === null ? null : undefined),
      isVago: isVago !== undefined ? (isVago ? 1 : 0) : undefined,
    };

    // Campos que só admin pode mudar ou que tem lógica de role
    if (role) updateData.role = role;
    if (tipo) updateData.tipo = tipo;
    if (groupId !== undefined) updateData.groupId = (groupId ? Number(groupId) : null);
    if (userTypeId) updateData.userTypeId = Number(userTypeId);

    let user: any = null;
    try {
      const updatePromise = prisma.user.update({ 
        where: { id },
        data: {
            ...updateData,
            managedUsers: managedUserIds ? {
                set: managedUserIds.map((id: number) => ({ id }))
            } : undefined,
        },
        select: { ...PUBLIC_USER_FIELDS, supabase_id: true } as any
      });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Prisma Timeout')), 5000));
      user = await Promise.race([updatePromise, timeoutPromise]);
    } catch (updateError) {
      console.warn(`[ADMIN] Prisma update failed for user ${id}. Using HTTP Fallback.`);
      const { data, error } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();
      
      if (error) {
          console.error('[ADMIN] HTTP Fallback update failed:', error.message);
          throw new Error('Falha ao atualizar no banco de dados (Modo Offline)');
      }
      user = data;
    }

    // 3. Update permissions if provided
    if (Array.isArray(permissions) && permissions.length > 0) {
      try {
        await prisma.$executeRawUnsafe('DELETE FROM "user_permissions" WHERE "userId" = $1', id);
        for (const p of permissions) {
          await prisma.$executeRawUnsafe(
            'INSERT INTO "user_permissions" ("userId", "moduleId", "canView", "canEdit") VALUES ($1, $2, $3, $4)',
            id, p.moduleId, !!p.canView, !!p.canEdit
          );
        }
      } catch (e) {
        console.warn('[ADMIN] Failed to update permissions via Prisma, attempting HTTP fallback...');
        await supabaseAdmin.from('user_permissions').delete().eq('userId', id);
        const sbPerms = permissions.map(p => ({
            userId: id,
            moduleId: p.moduleId,
            canView: !!p.canView,
            canEdit: !!p.canEdit
        }));
        await supabaseAdmin.from('user_permissions').insert(sbPerms);
      }
    }

    // 4. Sync Role to Supabase Auth Metadata
    if (role === 'admin' || user.role === 'admin') {
       try {
         let sbUserId = user.supabase_id || existing.supabase_id;
         if (sbUserId) {
           const { data: userData } = await supabaseAdmin.auth.admin.getUserById(sbUserId);
           if (userData?.user) {
             await supabaseAdmin.auth.admin.updateUserById(sbUserId, {
               user_metadata: { ...userData.user.user_metadata, role: 'admin' }
             });
           }
         }
       } catch (authErr) {
         console.error('[AUTH] Erro na sincronização de role:', authErr);
       }
    }

    console.log(`[ADMIN] Usuário ${user.username} (ID: ${id}) atualizado com sucesso.`);
    await logUserActivity(req.user.id, 'update_user', `Atualizou usuário ${user.username}`, req, 'User', String(id)).catch(() => {});
    
    const { supabase_id, ...clientUser } = user;
    res.json(clientUser);

  } catch (error: any) {
    console.error('Update user error:', error.message || error);
    
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'campo único';
      return res.status(400).json({ message: `O ${field} informado já está em uso por outro usuário.` });
    }

    // Erro amigável para o usuário, escondendo detalhes técnicos do Prisma
    const isConnError = error.message?.includes('Can\'t reach database') || error.message?.includes('Prisma Timeout');
    res.status(500).json({ 
      message: isConnError ? 'O banco de dados está temporariamente instável. Tente novamente em instantes.' : 'Erro ao atualizar usuário',
      details: isConnError ? undefined : error.message 
    });
  }
});

router.delete('/users/:id', requireAdmin, async (req: any, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: 'Usuário não encontrado' });
  
  try {
    // Sync delete to Supabase Auth
    let sbUserId = (existing as any).supabase_id;
    
    if (!sbUserId) {
      const authEmail = `${existing.code}@mapaterritorio.com`;
      const { data: authData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.error('[DELETE] Erro ao listar usuários no Supabase:', listError.message);
      } else if (authData && Array.isArray(authData.users)) {
        const sbUser = authData.users.find(u => u.email === authEmail);
        if (sbUser) sbUserId = sbUser.id;
      }
    }

    if (sbUserId) {
        await supabaseAdmin.auth.admin.deleteUser(sbUserId);
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
  
  // Restrição por hierarquia:
  // - Admin: Vê tudo.
  // - Supervisor/User: Vê apenas os seus próprios territórios e os de seus subordinados.
  if (user && user.role !== 'admin') {
    const subordinateIds = user.subordinateIds || [];
    where.userId = { in: [user.id, ...subordinateIds] };
  }

  try {
    const fetchPromise = prisma.territory.findMany({ where, orderBy: [{ uf: 'asc' }, { municipio: 'asc' }] });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Prisma Timeout')), 5000));
    const ter = await Promise.race([fetchPromise, timeoutPromise]) as any[];
    res.json(ter);
  } catch (error) {
    console.warn('[ADMIN] Prisma failed or timed out to fetch territories. Falling back to HTTP.');
    let query = supabaseAdmin
        .from('territories')
        .select('*')
        .order('uf', { ascending: true })
        .order('municipio', { ascending: true });
    
    if (user && user.role !== 'admin') {
        const subordinateIds = user.subordinateIds || [];
        query = query.in('userId', [user.id, ...subordinateIds]);
    }

    const { data, error: httpError } = await query;
    if (httpError) return res.status(500).json({ message: 'Erro ao listar territórios' });
    res.json(data || []);
  }
});

router.post('/territories/claim', authenticate, async (req: any, res) => {
  const { municipio, uf } = req.body;
  
  if (!municipio || !uf) return res.status(400).json({ message: 'Município e UF são obrigatórios' });

  let user: any = null;
  try {
    const fetchPromise = prisma.user.findUnique({ where: { id: req.user.id } });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Prisma Timeout')), 5000));
    user = await Promise.race([fetchPromise, timeoutPromise]);
  } catch (e) {
    console.warn('[CLAIM] Prisma failed to fetch user, using session user');
    user = req.user;
  }

  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });

  // 1. Verificar se o usuário tem um estado atribuído e se o UF coincide
  if (user.role !== 'admin' && user.assigned_state && user.assigned_state !== uf) {
    return res.status(403).json({ message: `Você só pode reivindicar municípios no estado ${user.assigned_state}` });
  }

  try {
    // 2. Verificar se o município já está ocupado com fallback HTTP se necessário
    let existing: any = null;
    try {
      const findPromise = prisma.territory.findFirst({
        where: {
          municipio: { equals: municipio, mode: 'insensitive' },
          uf: { equals: uf, mode: 'insensitive' }
        }
      });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Prisma Timeout')), 5000));
      existing = await Promise.race([findPromise, timeoutPromise]);
    } catch (e) {
      console.warn('[CLAIM] Prisma failed to find territory, checking via HTTP');
      const { data } = await supabaseAdmin
        .from('territories')
        .select('*')
        .ilike('municipio', municipio)
        .ilike('uf', uf)
        .single();
      existing = data;
    }

    if (existing && existing.userId) {
      return res.status(409).json({ message: 'Este município já foi reivindicado por outro usuário.' });
    }

    // 3. Criar ou atualizar o território com fallback HTTP
    try {
      if (existing) {
        await prisma.territory.update({
          where: { id: existing.id },
          data: { userId: user.id, modo: 'planejamento' }
        });
      } else {
        await prisma.territory.create({
          data: { municipio, uf, userId: user.id, modo: 'planejamento' }
        });
      }
    } catch (e) {
      console.warn('[CLAIM] Prisma failed to save territory, using HTTP fallback');
      const payload = { municipio, uf, userId: user.id, modo: 'planejamento' };
      if (existing) {
        await supabaseAdmin.from('territories').update(payload).eq('id', existing.id);
      } else {
        await supabaseAdmin.from('territories').insert(payload);
      }
    }

    logUserActivity(user.id, 'claim_territory', `Reivindicou o município ${municipio} - ${uf}`, req, 'Territory').catch(() => {});
    res.json({ message: 'Município reivindicado com sucesso!' });
  } catch (error) {
    console.error('Error claiming territory:', error);
    res.status(500).json({ message: 'Erro ao reivindicar município' });
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
  try {
    const fetchPromise = (prisma as any).module.findMany({ orderBy: { name: 'asc' } });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Prisma Timeout')), 5000));
    const modules = await Promise.race([fetchPromise, timeoutPromise]);
    res.json(modules);
  } catch (e) {
    console.warn('[ADMIN] Prisma failed or timed out to fetch modules. Falling back to HTTP.');
    const { data, error } = await supabaseAdmin.from('modules').select('*').order('name', { ascending: true });
    if (error) return res.status(500).json({ message: 'Erro ao listar módulos' });
    res.json(data || []);
  }
});

router.get('/groups', async (req, res) => {
  try {
    const fetchPromise = prisma.group.findMany({ orderBy: { name: 'asc' } });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Prisma Timeout')), 5000));
    const groups = await Promise.race([fetchPromise, timeoutPromise]);
    res.json(groups);
  } catch (error) {
    console.warn('[ADMIN] Prisma failed or timed out to fetch groups. Falling back to HTTP.');
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
  try {
    const fetchPromise = (prisma as any).userPermission.findMany({
      where: { userId },
      include: { module: true }
    });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Prisma Timeout')), 5000));
    const permissions = await Promise.race([fetchPromise, timeoutPromise]);
    res.json(permissions);
  } catch (error) {
    console.warn(`[ADMIN] Prisma failed or timed out for user ${userId} permissions. Falling back to HTTP.`);
    const { data, error: httpError } = await supabaseAdmin
      .from('user_permissions')
      .select('*')
      .eq('userId', userId);
    
    if (httpError) {
      console.error('[ADMIN] HTTP Fallback failed for permissions:', httpError.message);
      return res.status(500).json({ message: 'Erro ao buscar permissões' });
    }

    // Se precisamos dos módulos, buscamos separadamente para evitar erro de join no Supabase
    const { data: modules } = await supabaseAdmin.from('modules').select('*');
    const mapped = (data || []).map(p => ({
      ...p,
      module: modules?.find(m => m.id === p.moduleId)
    }));

    res.json(mapped);
  }
});

// Save user permissions and handle auto-promotion
router.post('/users/:id/permissions', authenticate, requirePermission('users', 'edit'), async (req: any, res) => {
  const userId = Number(req.params.id);
  const { permissions, role } = req.body;

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

    // 2. Handle role update (explicit or automatic)
    let finalRole = role;
    
    // Heurística de auto-promoção se não foi enviado um role específico
    if (!finalRole) {
      const coreModules = ['users', 'clientes', 'territories', 'notifications'];
      const hasCoreEdit = coreModules.every(slug => 
        permissions.find((p: any) => p.moduleId === slug)?.canEdit === true
      );
      if (hasCoreEdit) finalRole = 'admin';
    }

    let roleUpdated = false;
    if (finalRole) {
      await prisma.$executeRawUnsafe('UPDATE "users" SET "role" = $1 WHERE "id" = $2', finalRole, userId);
      
      // Sincroniza com Supabase Auth Metadata
      try {
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (targetUser?.supabase_id) {
          await supabaseAdmin.auth.admin.updateUserById(targetUser.supabase_id, {
            user_metadata: { role: finalRole }
          });
        }
      } catch (authErr) {
        console.error('[AUTH] Erro ao sincronizar role no Supabase:', authErr);
      }

      roleUpdated = true;
      console.log(`[ADMIN] Usuário ID ${userId} atualizado para ROLE: ${finalRole}`);
    }

    await logUserActivity(req.user.id, 'update_permissions', `Atualizou permissões do usuário ${userId}${roleUpdated ? ' (Role: ' + finalRole + ')' : ''}`, req);
    
    res.json({ 
      message: 'Permissões salvas com sucesso', 
      promoted: roleUpdated && finalRole === 'admin'
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
