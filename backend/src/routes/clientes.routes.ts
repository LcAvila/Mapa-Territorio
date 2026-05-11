/**
 * @file clientes.routes.ts
 * @description Aqui é onde a mágica dos clientes acontece. 
 * É o balcão de atendimento: tu pede pra listar, criar ou mudar algo e a gente desenrola aqui.
 * 
 * Papo reto: Se o cliente não carregar no mapa, confere se as coordenadas (lat/lng) foram geradas.
 * Se o endereço for muito 'vago', o GPS do sistema se perde e o cliente fica num 'limbo' sem aparecer no mapa.
 * 
 * @author Cria de Nova Iguaçu
 */

import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, requirePermission } from '../middlewares/auth';
import { logUserActivity } from '../utils/logger';
import { geocodeAddress } from '../utils/geocoding';

const router = Router();

// Só entra quem tem o crachá (autenticado)
router.use(authenticate);

// ---------------------------------------------------------
// GET /api/clientes - Traz a lista da rapaziada (clientes)
// ---------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    const where: any = {};
    
    // Cada um no seu quadrado: 
    // - Admin vê tudo (a menos que gerencie usuários específicos).
    // - Usuários comuns (Representantes) só vêem os seus próprios clientes e os de seus subordinados.
    const user = (req as any).user;
    const hasSettingsPerm = user.permissions?.some((p: any) => p.module?.id === 'settings' && p.canEdit);
    const isAdmin = user.role === 'admin' || hasSettingsPerm;

    if (isAdmin) {
      // Se for admin/settings mas gerencia usuários específicos, filtra por eles
      if (user.subordinateIds && user.subordinateIds.length > 0) {
        where.userId = { in: [user.id, ...user.subordinateIds] };
      }
      // Se não gerencia ninguém, where continua {} (vê tudo)

      // Override se houver query param userId explícito
      if (userId) {
        const ids = String(userId).split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
        if (ids.length > 1) {
          where.userId = { in: ids };
        } else if (ids.length === 1) {
          where.userId = ids[0];
        }
      }
    } else if (user && (user.role === 'user' || user.role === 'supervisor')) {
      const subordinateIds = user.subordinateIds || [];
      where.userId = { in: [user.id, ...subordinateIds] };
    }

    const clientes = await prisma.cliente.findMany({
      where,
      orderBy: { nome_cliente: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            username: true
          }
        }
      }
    });

    console.log(`[CLIENTES] Encontrados ${clientes.length} clientes para o filtro:`, JSON.stringify(where));

    // Anotando no caderninho quem andou bisbilhotando os clientes
    if (user) await logUserActivity(user.id, 'query', 'Usuário consultou a base de clientes', req, 'Cliente');

    res.json(clientes);
  } catch (error: any) {
    console.error('Deu ruim ao buscar clientes, mó zebra:', error);
    res.status(500).json({ 
      message: 'Erro ao buscar clientes no banco de dados',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ---------------------------------------------------------
// POST /api/clientes - Bota mais um cliente no jogo
// ---------------------------------------------------------
router.post('/', requirePermission('clientes', 'edit'), async (req, res) => {
  try {
    const user = (req as any).user;
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
      longitude,
      userId
    } = req.body;

    // --- Validação de Hierarquia para Cadastro ---
    // Se não for admin, ele só pode cadastrar clientes para SI MESMO ou para seus SUBORDINADOS.
    if (user && user.role !== 'admin') {
      const targetUserId = userId ? Number(userId) : user.id;
      const subordinateIds = user.subordinateIds || [];
      const allowedIds = [user.id, ...subordinateIds];

      if (!allowedIds.includes(targetUserId)) {
        console.warn(`[CLIENTES] Usuário ${user.id} tentou cadastrar cliente para usuário não autorizado: ${targetUserId}`);
        return res.status(403).json({ 
          message: 'Você só pode cadastrar clientes para você mesmo ou para sua equipe gerenciada.' 
        });
      }
      // Garante que o userId final seja o validado
      userId = targetUserId;
    }

    // Se o usuário não mandou a latitude ou longitude, a gente tenta achar no Google/Nominatim.
    if ((!latitude || !longitude) && (endereco_completo || (cidade && uf))) {
      const searchAddress = `${endereco_completo || ""}${numero ? ", " + numero : ""}${bairro ? ", " + bairro : ""}, ${cidade || ""}, ${uf || ""}`;
      const coords = await geocodeAddress(searchAddress.trim());
      
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
        console.log(`[Geocode] Achamos o lugar! "${searchAddress}": ${latitude}, ${longitude}`);
      } else {
        // Se cair aqui, o endereço tá muito zoado e o cliente vai ficar sem pino no mapa.
        console.warn(`[Geocode] Ih, rapaz! Não achei o endereço "${searchAddress}". O cliente vai ficar sem localização.`);
      }
    }

    if (!nome_cliente) {
      return res.status(400).json({ message: 'Qual é o nome do cliente? Não pode deixar em branco, pô.' });
    }

    // Se mandou um código, a gente checa se já não tem outro cliente 'clonado' com esse código.
    if (codigo_cliente) {
      const existing = await prisma.cliente.findUnique({
        where: { codigo_cliente }
      });

      if (existing) {
        return res.status(409).json({ message: 'Já tem um cliente com esse código aí, mexe nisso.' });
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
        userId: req.body.userId ? Number(req.body.userId) : null,
        semana: req.body.semana || null,
        prioridade: req.body.prioridade || null,
        status_ativo: true
      }
    });

    res.status(201).json({ message: 'Cliente cadastrado com sucesso! Já tá na conta.', cliente: novoCliente });
  } catch (error) {
    console.error('Deu erro ao criar cliente, mó vacilo:', error);
    res.status(500).json({ message: 'Erro ao cadastrar o cliente.' });
  }
});

// ---------------------------------------------------------
// PUT /api/clientes/:id - Atualiza os dados do cliente
// ---------------------------------------------------------
router.put('/:id', requirePermission('clientes', 'edit'), async (req, res) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id as string);
    let { 
      codigo_cliente, nome_cliente, nome_abreviado, cnpj, regiao, uf, cidade, bairro, cep, 
      endereco_completo, numero, latitude, longitude, userId, 
      semana, prioridade, status_ativo 
    } = req.body;

    const existingClient = await prisma.cliente.findUnique({ where: { id_cliente: id } });
    if (!existingClient) return res.status(404).json({ message: 'Cliente não encontrado.' });

    // --- Validação de Hierarquia para Edição ---
    if (user && user.role !== 'admin') {
      const subordinateIds = user.subordinateIds || [];
      const allowedIds = [user.id, ...subordinateIds];

      // 1. Validar se o cliente atual pertence a alguém da equipe
      if (existingClient.userId && !allowedIds.includes(existingClient.userId)) {
        return res.status(403).json({ message: 'Você não tem permissão para editar este cliente.' });
      }

      // 2. Se estiver tentando transferir o cliente para outro usuário, validar o novo dono
      if (userId && !allowedIds.includes(Number(userId))) {
        return res.status(403).json({ message: 'Você só pode atribuir clientes para você mesmo ou sua equipe.' });
      }
    }

    // Se mudar o endereço, a gente recalcula o lugar pra não ficar com o pino no lugar errado.
    if (endereco_completo || numero || cidade || uf || bairro) {
      const searchAddress = `${endereco_completo || ""}${numero ? ", " + numero : ""}${bairro ? ", " + bairro : ""}, ${cidade || ""}, ${uf || ""}, Brasil`;
      console.log(`[Geocode Update] Recalculando GPS para: ${searchAddress.trim()}`);
      const coords = await geocodeAddress(searchAddress.trim());
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
        console.log(`[Geocode Update] Novas coordenadas pegas: ${latitude}, ${longitude}`);
      }
    }

    const clienteAtualizado = await prisma.cliente.update({
      where: { id_cliente: id },
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
        numero: numero ? numero.toString() : undefined,
        latitude: latitude ? parseFloat(latitude.toString()) : undefined,
        longitude: longitude ? parseFloat(longitude.toString()) : undefined,
        userId: userId ? Number(userId) : undefined,
        semana,
        prioridade,
        status_ativo: status_ativo !== undefined ? !!status_ativo : undefined
      }
    });

    res.json({ message: 'Cliente atualizado! Tudo nos conformes.', cliente: clienteAtualizado });
  } catch (error) {
    console.error('Erro ao atualizar cliente, mó furada:', error);
    res.status(500).json({ message: 'Erro ao atualizar o cliente.' });
  }
});

// ---------------------------------------------------------
// DELETE /api/clientes/:id - Manda o cliente pra conta do Papa
// ---------------------------------------------------------
router.delete('/:id', requirePermission('clientes', 'edit'), async (req, res) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id as string);

    const existingClient = await prisma.cliente.findUnique({ where: { id_cliente: id } });
    if (!existingClient) return res.status(404).json({ message: 'Cliente não encontrado.' });

    // --- Validação de Hierarquia para Exclusão ---
    if (user && user.role !== 'admin') {
      const subordinateIds = user.subordinateIds || [];
      const allowedIds = [user.id, ...subordinateIds];

      if (existingClient.userId && !allowedIds.includes(existingClient.userId)) {
        return res.status(403).json({ message: 'Você não tem permissão para remover este cliente.' });
      }
    }

    await prisma.cliente.delete({ where: { id_cliente: id } });
    res.json({ message: 'Cliente removido! Sumiu do mapa.' });
  } catch (error) {
    console.error('Erro ao deletar cliente, que fase:', error);
    res.status(500).json({ message: 'Erro ao remover o cliente.' });
  }
});

export default router;
