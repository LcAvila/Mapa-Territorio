import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { authenticate, requireAdmin } from '../middlewares/auth';
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

const PUBLIC_USER_FIELDS = { id: true, username: true, role: true, repCode: true, tipo: true, full_name: true, cpf_cnpj: true, telefone: true, cep: true, logradouro: true, numero: true, complemento: true, bairro_end: true, cidade: true, estado_end: true, photo: true, created_at: true };

// --- USERS ---
router.get('/users', async (req, res) => {
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
  if (password) data.password = await bcrypt.hash(password, 10);
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
        colorIndex: Math.floor(Math.random() * 20) 
      } 
    });
    res.json(rep);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar representante' });
  }
});

router.get('/reps', async (req, res) => {
  const reps = await prisma.representative.findMany({ 
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
        isVago: isVago ? 1 : 0 
      }
    });
    res.json(rep);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar representante' });
  }
});

// --- TERRITORIES ---
router.get('/territories', async (req, res) => {
  const ter = await prisma.territory.findMany({ orderBy: [{ uf: 'asc' }, { municipio: 'asc' }] });
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

export default router;
