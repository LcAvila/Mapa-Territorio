import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { authenticate } from '../middlewares/auth';
import type { AuthRequest } from '../middlewares/auth';

const router = Router();
const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-key';
const PUBLIC_USER_FIELDS = { id: true, username: true, role: true, repCode: true, tipo: true, full_name: true, cpf_cnpj: true, telefone: true, cep: true, logradouro: true, numero: true, complemento: true, bairro_end: true, cidade: true, estado_end: true, photo: true, created_at: true };

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(409).json({ message: 'User already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { username, password: hashedPassword } });
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ message: 'Credenciais inválidas' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Credenciais inválidas' });
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, type: user.tipo, repCode: user.repCode }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, role: user.role, user: { id: user.id, username: user.username, role: user.role, type: user.tipo, repCode: user.repCode, full_name: user.full_name } });
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
    const { currentPassword, newPassword, photo, full_name, cpf_cnpj, telefone, cep, logradouro, numero, complemento, bairro_end, cidade, estado_end } = req.body;
    const existing = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!existing) return res.status(404).json({ message: 'Usuário não encontrado' });
    
    let updatedData: any = { photo, full_name, cpf_cnpj, telefone, cep, logradouro, numero, complemento, bairro_end, cidade, estado_end };
    
    if (newPassword) {
      if (!currentPassword || !(await bcrypt.compare(currentPassword, existing.password))) {
        return res.status(401).json({ message: 'Senha atual incorreta' });
      }
      updatedData.password = await bcrypt.hash(newPassword, 10);
    }
    
    const user = await prisma.user.update({ where: { id: req.user!.id }, data: updatedData, select: PUBLIC_USER_FIELDS });
    res.json({ message: 'Perfil atualizado com sucesso', user });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
});

export default router;
