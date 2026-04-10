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

// The /register route has been removed. 
// Account creation is now exclusively handled by the Admin endpoint (/api/admin/users) for security reasons.

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
