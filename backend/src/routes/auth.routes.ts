import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { authenticate } from '../middlewares/auth';
import type { AuthRequest } from '../middlewares/auth';
import { logUserActivity } from '../utils/logger';

const router = Router();
const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-key';
const PUBLIC_USER_FIELDS = { 
  id: true, username: true, role: true, repCode: true, code: true, tipo: true, 
  full_name: true, cpf_cnpj: true, telefone: true, cargo: true, company_name: true, groupId: true,
  cep: true, logradouro: true, numero: true, 
  complemento: true, bairro_end: true, cidade: true, estado_end: true, photo: true, 
  created_at: true, default_workspace: true, inactivity_limit: true,
  notif_email: true, notif_sms: true, notif_push: true,
  last_active: true
};

router.post('/register', async (req, res) => {
  try {
    const { username, password, full_name, code, birth_date, telefone, cpf_cnpj, cargo, company_name, groupId } = req.body;
    
    if (!code || !password || !full_name) {
      return res.status(400).json({ message: 'Campos obrigatórios: código, senha e nome completo' });
    }

    // Password validation
    const { validatePasswordStrength } = require('../middlewares/security');
    if (!validatePasswordStrength(password)) {
      return res.status(400).json({ message: 'A senha deve conter letras maiúsculas, minúsculas, números e símbolos.' });
    }

    const existing = await prisma.user.findFirst({ 
      where: { code } 
    });
    if (existing) {
      return res.status(409).json({ message: `Este Código já está em uso` });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({ 
      data: { 
        username: username || code, // still need a unique username for schema if not changed
        password: hashedPassword,
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
    res.status(201).json({ message: 'Usuário registrado com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Suporte para login insensível a maiúsculas/minúsculas tanto em 'username' quanto em 'code'
    const user = await prisma.user.findFirst({ 
      where: { 
        OR: [
          { code: username },
          { username: username },
          { code: username.toUpperCase() },
          { username: username.toLowerCase() },
          { code: username.toLowerCase() },
          { username: username.toUpperCase() }
        ]
      } 
    });
    if (!user) return res.status(401).json({ message: 'Credenciais inválidas' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Credenciais inválidas' });
    
    const token = jwt.sign(
      // @ts-ignore
      { id: user.id, username: user.username, role: user.role, type: user.tipo, repCode: user.repCode, token_version: user.token_version }, 
      SECRET_KEY, 
      { expiresIn: '24h' }
    );
    
    // Log Activity
    await logUserActivity(user.id, 'login', 'Usuário realizou login no sistema', req);

    res.json({ 
      token, 
      role: user.role, 
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        type: user.tipo, 
        repCode: user.repCode, 
        estado_end: user.estado_end,
        full_name: user.full_name,
        // @ts-ignore
        default_workspace: user.default_workspace,
        // @ts-ignore
        inactivity_limit: user.inactivity_limit,
        // @ts-ignore
        notif_email: user.notif_email,
        // @ts-ignore
        notif_sms: user.notif_sms,
        // @ts-ignore
        notif_push: user.notif_push
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error authenticating user' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: PUBLIC_USER_FIELDS });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword, photo, full_name, cpf_cnpj, telefone, birth_date, cep, logradouro, numero, complemento, bairro_end, cidade, estado_end } = req.body;
    const existing = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!existing) return res.status(404).json({ message: 'Usuário não encontrado' });
    
    let updatedData: any = { photo, full_name, cpf_cnpj, telefone, birth_date: birth_date ? new Date(birth_date) : undefined, cep, logradouro, numero, complemento, bairro_end, cidade, estado_end };
    
    if (newPassword) {
      if (!currentPassword || !(await bcrypt.compare(currentPassword, existing.password))) {
        return res.status(401).json({ message: 'Senha atual incorreta' });
      }
      
      const { validatePasswordStrength } = require('../middlewares/security');
      if (!validatePasswordStrength(newPassword)) {
        return res.status(400).json({ message: 'A senha deve conter letras maiúsculas, minúsculas, números e símbolos.' });
      }

      updatedData.password = await bcrypt.hash(newPassword, 10);
      // @ts-ignore
      updatedData.token_version = (existing.token_version || 0) + 1;
    }
    
    const user = await prisma.user.update({ where: { id: req.user!.id }, data: updatedData, select: PUBLIC_USER_FIELDS });
    
    // Log Activity
    await logUserActivity(user.id, 'profile_update', 'Usuário atualizou os próprios dados de perfil', req);

    res.json({ message: 'Perfil atualizado com sucesso', user });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
});

export default router;
