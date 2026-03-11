import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

router.post('/interests', async (req, res) => {
  const { nome, email, telefone, empresa, municipio, uf, modo, observacoes } = req.body;
  if (!nome || !municipio || !uf) return res.status(400).json({ message: 'Campos obrigatórios: nome, municipio, uf' });
  
  const int = await prisma.interestRequest.create({ data: { nome, email, telefone, empresa, municipio, uf, modo, observacoes } });
  res.status(201).json(int);
});

router.get('/interests', authenticate, requireAdmin, async (req, res) => {
  const ints = await prisma.interestRequest.findMany({ orderBy: { created_at: 'desc' } });
  res.json(ints);
});

router.put('/interests/:id/status', authenticate, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  
  const existing = await prisma.interestRequest.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: 'Não encontrado' });
  
  const int = await prisma.interestRequest.update({ where: { id }, data: { status } });
  res.json({ message: 'Status atualizado com sucesso', request: int });
});

export default router;
