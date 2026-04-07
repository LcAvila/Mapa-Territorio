import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, requirePermission } from '../middlewares/auth';
import { logUserActivity } from '../utils/logger';
import { geocodeAddress } from '../utils/geocoding';

const router = Router();

// Protege todas as rotas de clientes com a autenticação padrão
router.use(authenticate);

// ---------------------------------------------------------
// GET /api/clientes - Listar todos os clientes
// ---------------------------------------------------------
router.get('/', requirePermission('clients', 'view'), async (req, res) => {
  try {
    const { repCode, supervisorName } = req.query;
    const where: any = {};
    
    // Isolamento de dados: Representantes veem apenas os próprios clientes
    const user = (req as any).user;
    if (user && user.role === 'representante') {
      where.repCode = user.repCode;
    } else {
      if (repCode) where.repCode = repCode.toString();
      if (supervisorName) where.supervisorName = supervisorName.toString();
    }

    const clientes = await prisma.cliente.findMany({
      where,
      orderBy: { nome_cliente: 'asc' },
    });

    // Log Consulta
    if (user) await logUserActivity(user.id, 'query', 'Usuário consultou a base de clientes', req, 'Cliente');

    res.json(clientes);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ message: 'Erro ao buscar clientes no banco de dados' });
  }
});

// ---------------------------------------------------------
// POST /api/clientes - Cadastrar um novo cliente
// ---------------------------------------------------------
router.post('/', requirePermission('clients', 'edit'), async (req, res) => {
  try {
    let { 
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
      numero,
      latitude,
      longitude
    } = req.body;

    // Se latitude ou longitude não forem informados, tentar geocodificar automatimente
    if ((!latitude || !longitude) && (endereco_completo || (cidade && uf))) {
      // Build a more precise search address including the number if available
      const searchAddress = `${endereco_completo || ""}${numero ? ", " + numero : ""}${bairro ? ", " + bairro : ""}, ${cidade || ""}, ${uf || ""}`;
      const coords = await geocodeAddress(searchAddress.trim());
      
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
        console.log(`[Geocode] Coordenadas obtidas para "${searchAddress}": ${latitude}, ${longitude}`);
      } else {
        console.warn(`[Geocode] Não foi possível encontrar coordenadas para "${searchAddress}"`);
      }
    }

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
        numero: numero ? numero.toString() : null,
        latitude: latitude ? parseFloat(latitude.toString()) : null,
        longitude: longitude ? parseFloat(longitude.toString()) : null,
        repCode: req.body.repCode || null,
        supervisorName: req.body.supervisorName || null,
        classificacao: req.body.classificacao || null,
        semana: req.body.semana || null,
        prioridade: req.body.prioridade || null,
        status_ativo: true
      }
    });

    res.status(201).json({ message: 'Cliente cadastrado com sucesso!', cliente: novoCliente });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ message: 'Erro ao cadastrar o cliente.' });
  }
});

// ---------------------------------------------------------
// PUT /api/clientes/:id - Atualizar um cliente
// ---------------------------------------------------------
router.put('/:id', requirePermission('clients', 'edit'), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    let { 
      codigo_cliente, nome_cliente, nome_abreviado, cnpj, regiao, uf, cidade, bairro, cep, 
      endereco_completo, numero, latitude, longitude, repCode, supervisorName, 
      classificacao, semana, prioridade, status_ativo 
    } = req.body;

    // FORCAR recalculação se endereço ou número foram enviados (evita usar coordenadas antigas e imprecisas)
    if (endereco_completo || numero || cidade || uf || bairro) {
      const searchAddress = `${endereco_completo || ""}${numero ? ", " + numero : ""}${bairro ? ", " + bairro : ""}, ${cidade || ""}, ${uf || ""}, Brasil`;
      console.log(`[Geocode Update] Recalculando para: ${searchAddress.trim()}`);
      const coords = await geocodeAddress(searchAddress.trim());
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
        console.log(`[Geocode Update] Novas coordenadas: ${latitude}, ${longitude}`);
      }
    }

    const clienteAtualizado = await prisma.cliente.update({
      where: { id_cliente: id },
      data: {
        codigo_cliente, nome_cliente, nome_abreviado, cnpj, regiao, uf, cidade, bairro, cep,
        endereco_completo,
        numero: numero ? numero.toString() : null,
        latitude: latitude ? parseFloat(latitude.toString()) : null,
        longitude: longitude ? parseFloat(longitude.toString()) : null,
        repCode, supervisorName, classificacao, semana, prioridade,
        status_ativo: status_ativo !== undefined ? status_ativo : true
      }
    });

    res.json({ message: 'Cliente atualizado com sucesso!', cliente: clienteAtualizado });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ message: 'Erro ao atualizar o cliente.' });
  }
});

// ---------------------------------------------------------
// DELETE /api/clientes/:id - Remover um cliente
// ---------------------------------------------------------
router.delete('/:id', requirePermission('clients', 'edit'), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    await prisma.cliente.delete({ where: { id_cliente: id } });
    res.json({ message: 'Cliente removido com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    res.status(500).json({ message: 'Erro ao remover o cliente.' });
  }
});

export default router;
