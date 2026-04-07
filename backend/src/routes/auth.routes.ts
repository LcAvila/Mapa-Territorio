import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate } from '../middlewares/auth';
import type { AuthRequest } from '../middlewares/auth';
import { logUserActivity } from '../utils/logger';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();
const PUBLIC_USER_FIELDS = { 
  id: true, username: true, role: true, repCode: true, code: true, tipo: true, 
  full_name: true, cpf_cnpj: true, telefone: true, cargo: true, company_name: true, groupId: true,
  cep: true, logradouro: true, numero: true, 
  complemento: true, bairro_end: true, cidade: true, estado_end: true, photo: true, 
  created_at: true, default_workspace: true, inactivity_limit: true,
  notif_email: true, notif_sms: true, notif_push: true,
  last_active: true,
  token_version: true
};

router.post('/register', async (req, res) => {
  try {
    const { password, full_name, code, birth_date, telefone, cpf_cnpj, cargo, company_name, groupId } = req.body;
    
    if (!code || !password || !full_name) {
      return res.status(400).json({ message: 'Campos obrigatórios: código, senha e nome completo' });
    }

    const existing = await prisma.user.findFirst({ where: { code } });
    if (existing) return res.status(409).json({ message: `Este Código já está em uso` });
    
    // Step 1: Create in Supabase Auth
    const authEmail = `${code}@mapaterritorio.com`;
    const { error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name }
    });

    if (authError) return res.status(500).json({ message: `Supabase Auth Error: ${authError.message}` });

    // Step 2: Create in Prisma
    const user = await prisma.user.create({ 
      data: { 
        username: code, 
        password: 'SUPABASE_AUTH_ACTIVE',
        full_name,
        code,
        telefone,
        cpf_cnpj,
        cargo,
        company_name,
        groupId: groupId ? Number(groupId) : null,
        birth_date: birth_date ? new Date(birth_date) : null,
        tipo: 'cliente',
        role: 'user'
      } 
    });

    await logUserActivity(user.id, 'register', 'Usuário se registrou no sistema', req);
    res.status(201).json({ message: 'Usuário registrado com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

router.post('/login', async (req, res) => {
    // This endpoint is now legacy as the frontend signs in via Supabase directly
    res.status(410).json({ message: 'Por favor, utilize a autenticação direta via Supabase no frontend.' });
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const isLoginRequest = req.query.login === 'true';

    if (isLoginRequest) {
      // Automatic Single Session Enforcement: 
      // Incrementing token_version on every fresh login 
      // will immediately 401 all other active sessions (kicking them).
      await prisma.user.update({
        where: { id: userId },
        data: { token_version: { increment: 1 } }
      });
      console.log(`[AUTH] User ${userId} logged in. Incrementing token_version to enforce single session.`);
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: PUBLIC_USER_FIELDS });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    res.json(user);
  } catch (error) {
    console.error('Error in /me:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const { photo, full_name, cpf_cnpj, telefone, birth_date, cep, logradouro, numero, complemento, bairro_end, cidade, estado_end } = req.body;
    
    let updatedData: any = { photo, full_name, cpf_cnpj, telefone, birth_date: birth_date ? new Date(birth_date) : undefined, cep, logradouro, numero, complemento, bairro_end, cidade, estado_end };
    
    const user = await prisma.user.update({ where: { id: req.user!.id }, data: updatedData, select: PUBLIC_USER_FIELDS });
    await logUserActivity(user.id, 'profile_update', 'Usuário atualizou os próprios dados de perfil', req);

    res.json({ message: 'Perfil atualizado com sucesso', user });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
});

export default router;
