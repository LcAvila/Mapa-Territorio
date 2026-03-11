import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Protege todas as rotas de clientes com a autenticação padrão
router.use(authenticate);

// ---------------------------------------------------------
// GET /api/clientes - Listar todos os clientes
// ---------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany({
      orderBy: { nome_cliente: 'asc' },
    });
    res.json(clientes);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ message: 'Erro ao buscar clientes no banco de dados' });
  }
});

// ---------------------------------------------------------
// POST /api/clientes - Cadastrar um novo cliente
// ---------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const { 
      codigo_cliente, 
      nome_cliente, 
      nome_abreviado, 
      cnpj, 
      regiao, 
      uf, 
      cidade, 
      bairro, 
      cep, 
      endereco_completo,
      latitude,
      longitude
    } = req.body;

    if (!nome_cliente) {
      return res.status(400).json({ message: 'O nome do cliente é obrigatório.' });
    }

    // Se informou um código de cliente, verificar se já não existe
    if (codigo_cliente) {
      const existing = await prisma.cliente.findUnique({
        where: { codigo_cliente }
      });

      if (existing) {
        return res.status(409).json({ message: 'Já existe um cliente com este código.' });
      }
    }

    const novoCliente = await prisma.cliente.create({
      data: {
        codigo_cliente,
        nome_cliente,
        nome_abreviado,
        cnpj,
        regiao,
        uf,
        cidade,
        bairro,
        cep,
        endereco_completo,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        status_ativo: true
      }
    });

    res.status(201).json({ message: 'Cliente cadastrado com sucesso!', cliente: novoCliente });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ message: 'Erro ao cadastrar o cliente.' });
  }
});

export default router;
