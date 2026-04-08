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
router.get('/', requirePermission('clients', 'view'), async (req, res) => {
  try {
    const { repCode, supervisorName } = req.query;
    const where: any = {};
    
    // Cada um no seu quadrado: Representante só vê os dele.
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

    // Anotando no caderninho quem andou bisbilhotando os clientes
    if (user) await logUserActivity(user.id, 'query', 'Usuário consultou a base de clientes', req, 'Cliente');

    res.json(clientes);
  } catch (error) {
    console.error('Deu ruim ao buscar clientes, mó zebra:', error);
    res.status(500).json({ message: 'Erro ao buscar clientes no banco de dados' });
  }
});

// ---------------------------------------------------------
// POST /api/clientes - Bota mais um cliente no jogo
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
        repCode: req.body.repCode || null,
        supervisorName: req.body.supervisorName || null,
        classificacao: req.body.classificacao || null,
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
router.put('/:id', requirePermission('clients', 'edit'), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    let { 
      codigo_cliente, nome_cliente, nome_abreviado, cnpj, regiao, uf, cidade, bairro, cep, 
      endereco_completo, numero, latitude, longitude, repCode, supervisorName, 
      classificacao, semana, prioridade, status_ativo 
    } = req.body;

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
        codigo_cliente, nome_cliente, nome_abreviado, cnpj, regiao, uf, cidade, bairro, cep,
        endereco_completo,
        numero: numero ? numero.toString() : null,
        latitude: latitude ? parseFloat(latitude.toString()) : null,
        longitude: longitude ? parseFloat(longitude.toString()) : null,
        repCode, supervisorName, classificacao, semana, prioridade,
        status_ativo: status_ativo !== undefined ? status_ativo : true
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
router.delete('/:id', requirePermission('clients', 'edit'), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    await prisma.cliente.delete({ where: { id_cliente: id } });
    res.json({ message: 'Cliente removido! Sumiu do mapa.' });
  } catch (error) {
    console.error('Erro ao deletar cliente, que fase:', error);
    res.status(500).json({ message: 'Erro ao remover o cliente.' });
  }
});

export default router;
