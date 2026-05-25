import { prisma } from '../prisma';
import * as HereService from './HereRoutingService';

export interface CreateCycleDTO {
  name: string;
  start_date: string;
  end_date: string;
  supervisor_user_id: number;
  created_by: number;
}

export class RoutePlanningService {
  /**
   * Cria um novo ciclo de planejamento de 4 semanas.
   */
  async createCycle(data: CreateCycleDTO) {
    const { name, start_date, end_date, supervisor_user_id, created_by } = data;

    try {
      // Query subordinates and eligible clients outside the transaction block to reduce transaction scope and locks
      console.log(`[ROUTE_PLANNING] Generating snapshot for supervisor ${supervisor_user_id}...`);
      
      const subordinates = await prisma.user.findUnique({
        where: { id: supervisor_user_id },
        include: { managedUsers: { select: { id: true } } }
      });

      const subordinateIds = subordinates?.managedUsers.map(u => u.id) || [];
      console.log(`[ROUTE_PLANNING] Subordinate IDs:`, subordinateIds);
      
      const clients = await prisma.cliente.findMany({
        where: {
          OR: [
            { userId: supervisor_user_id },
            { userId: { in: subordinateIds } }
          ],
          status_ativo: true
        }
      });

      console.log(`[ROUTE_PLANNING] Found ${clients.length} eligible clients.`);

      return await prisma.$transaction(async (tx) => {
        // 1. Criar o ciclo
        const cycle = await tx.routeCycle.create({
          data: {
            name,
            start_date: new Date(start_date),
            end_date: new Date(end_date),
            supervisor_user_id,
            created_by,
            status: 'rascunho'
          }
        });

        // 2. Criar as 4 semanas
        const cycleStart = new Date(start_date);
        for (let i = 1; i <= 4; i++) {
          const weekStart = new Date(cycleStart);
          weekStart.setDate(cycleStart.getDate() + (i - 1) * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);

          await tx.routeCycleWeek.create({
            data: {
              route_cycle_id: cycle.id,
              week_number: i,
              start_date: weekStart,
              end_date: weekEnd,
              status: 'pendente'
            }
          });
        }

        // 3. Gerar Snapshot de Clientes (Base Oficial)
        if (clients.length > 0) {
          const snapshotData = clients.map(c => ({
            route_cycle_id: cycle.id,
            client_id: c.id_cliente,
            owner_user_id: c.userId || 0,
            supervisor_user_id,
            client_name: c.nome_cliente || 'Sem Nome',
            trade_name: c.nome_abreviado,
            cnpj: c.cnpj,
            address: c.endereco_completo,
            city: c.cidade,
            state: c.uf,
            zip_code: c.cep,
            classification: c.prioridade || 'Médio',
            latitude: c.latitude,
            longitude: c.longitude,
            distance_base_km: 0,
            source_base: 'internal'
          }));

          await tx.routeClientSnapshot.createMany({
            data: snapshotData
          });
          
          console.log(`[ROUTE_PLANNING] Snapshot created successfully.`);
        }

        return cycle;
      });
    } catch (err: any) {
      console.error('[ROUTE_PLANNING] Critical error in transaction:', err);
      throw new Error(`Falha ao processar ciclo no banco: ${err.message}`);
    }
  }

  /**
   * Distribuição heurística dos clientes nas 4 semanas.
   * Regras:
   * - Estratégicos: Prioridade nas primeiras semanas.
   * - Fortes: Em seguida.
   * - Médios/Pontuais: Distribuídos para equilibrar carga.
   * - Considera agrupamento geográfico simples (Cidade/UF).
   */
  async distributeClients(cycleId: number) {
    const snapshots = await prisma.routeClientSnapshot.findMany({
      where: { route_cycle_id: cycleId }
    });

    const weeks = await prisma.routeCycleWeek.findMany({
      where: { route_cycle_id: cycleId },
      orderBy: { week_number: 'asc' }
    });

    if (weeks.length !== 4) throw new Error('Ciclo deve possuir exatamente 4 semanas.');

    // Agrupamento por prioridade
    const groups = {
      'Estratégico': snapshots.filter(s => s.classification === 'Estratégico'),
      'Forte': snapshots.filter(s => s.classification === 'Forte'),
      'Médio': snapshots.filter(s => s.classification === 'Médio'),
      'Pontual': snapshots.filter(s => s.classification === 'Pontual')
    };

    const assignments: Array<{
      route_cycle_id: number;
      week_id: number;
      client_snapshot_id: number;
      assigned_by: number;
      assignment_mode: string;
    }> = [];

    // Lógica simplificada de distribuição equilibrada
    // 1. Estratégicos: Dividir entre semanas 1 e 2 prioritariamente
    groups['Estratégico'].forEach((s, i) => {
      const weekIdx = i % 2; // Semanas 1 e 2
      assignments.push({
        route_cycle_id: cycleId,
        week_id: weeks[weekIdx].id,
        client_snapshot_id: s.id,
        assigned_by: 0, // System
        assignment_mode: 'automatic'
      });
    });

    // 2. Fortes: Dividir entre semanas 2 e 3
    groups['Forte'].forEach((s, i) => {
      const weekIdx = 1 + (i % 2); // Semanas 2 e 3
      assignments.push({
        route_cycle_id: cycleId,
        week_id: weeks[weekIdx].id,
        client_snapshot_id: s.id,
        assigned_by: 0,
        assignment_mode: 'automatic'
      });
    });

    // 3. Médios e Pontuais: Distribuir entre todas as semanas para equilibrar
    const others = [...groups['Médio'], ...groups['Pontual']];
    others.forEach((s, i) => {
      const weekIdx = i % 4; // Todas as semanas
      assignments.push({
        route_cycle_id: cycleId,
        week_id: weeks[weekIdx].id,
        client_snapshot_id: s.id,
        assigned_by: 0,
        assignment_mode: 'automatic'
      });
    });

    await prisma.$transaction([
      prisma.routeAssignment.deleteMany({ where: { route_cycle_id: cycleId } }),
      prisma.routeAssignment.createMany({ data: assignments })
    ]);

    return { total: assignments.length };
  }

  /**
   * Gera o roteiro sequencial inicial para uma semana.
   */
  async generateSequence(cycleId: number, weekId: number, supervisorId: number) {
    const assignments = await prisma.routeAssignment.findMany({
      where: { route_cycle_id: cycleId, week_id: weekId },
      include: { clientSnapshot: true }
    });

    if (assignments.length === 0) return null;

    // Criar cabeçalho da sequência
    const sequence = await prisma.routeSequence.create({
      data: {
        route_cycle_id: cycleId,
        week_id: weekId,
        supervisor_user_id: supervisorId,
        total_visits: assignments.length,
        optimization_status: 'pending'
      }
    });

    // Criar itens da sequência (ordem inicial alfabética por cidade/cliente)
    const sorted = assignments.sort((a, b) => {
      const cityA = a.clientSnapshot.city || '';
      const cityB = b.clientSnapshot.city || '';
      if (cityA !== cityB) return cityA.localeCompare(cityB);
      return a.clientSnapshot.client_name.localeCompare(b.clientSnapshot.client_name);
    });

    const items = sorted.map((as, idx) => ({
      route_sequence_id: sequence.id,
      sequence_number: idx + 1,
      client_snapshot_id: as.client_snapshot_id,
      client_id: as.clientSnapshot.client_id,
      city: as.clientSnapshot.city,
      state: as.clientSnapshot.state,
      classification: as.clientSnapshot.classification,
      stop_lat: as.clientSnapshot.latitude,
      stop_lng: as.clientSnapshot.longitude,
      is_week_start: idx === 0,
      logistic_note: idx === 0 ? `INÍCIO Semana - Sair da base` : undefined
    }));

    await prisma.routeSequenceItem.createMany({ data: items });

    return sequence;
  }

  /**
   * Otimiza a rota de uma sequência usando a HERE API.
   */
  async optimizeRoute(sequenceId: number) {
    const sequence = await prisma.routeSequence.findUnique({
      where: { id: sequenceId },
      include: { 
        items: { include: { clientSnapshot: true }, orderBy: { sequence_number: 'asc' } },
        supervisor: true
      }
    });

    if (!sequence || sequence.items.length < 2) return null;

    // Validate start coordinates - warn if using fallback
    if (!sequence.start_lat || !sequence.start_lng) {
      console.warn(`[ROUTE_PLANNING] WARNING: Sequence ${sequenceId} has no start coordinates! ` +
        `Supervisor ${sequence.supervisor?.full_name || sequence.supervisor_user_id} needs a base_logistica configured. ` +
        `Cannot optimize route without a valid starting point.`);
      
      await prisma.routeSequence.update({
        where: { id: sequenceId },
        data: { optimization_status: 'failed' }
      });
      
      throw new Error('Base logística não configurada para o supervisor. Configure o endereço base antes de otimizar a rota.');
    }

    const startPoint = { 
      lat: sequence.start_lat,
      lng: sequence.start_lng
    };

    const waypoints = sequence.items.map(item => ({
      lat: item.stop_lat || 0,
      lng: item.stop_lng || 0,
      label: item.clientSnapshot?.client_name || 'Sem Nome'
    }));

    // 1. Otimizar sequência
    const { orderedIndices, raw } = await HereService.optimizeSequence(startPoint, waypoints);

    // 2. Calcular rota real com a nova ordem
    const orderedWaypoints = [startPoint, ...orderedIndices.map(i => waypoints[i])];
    const route = await HereService.calculateRoute(orderedWaypoints, 'car', true);

    // 3. Atualizar banco de dados
    return await prisma.$transaction(async (tx) => {
      // Atualizar cabeçalho
      await tx.routeSequence.update({
        where: { id: sequenceId },
        data: {
          total_distance_km: route.totalDistance / 1000,
          total_duration_minutes: Math.round(route.totalDuration / 60),
          average_km_per_visit: (route.totalDistance / 1000) / sequence.items.length,
          optimization_status: 'completed',
          raw_response_json: raw as any
        }
      });

      // Batch update items with new order and distances using raw SQL
      if (orderedIndices.length > 0) {
        const updates = orderedIndices.map((originalIdx, i) => {
          const item = sequence.items[originalIdx];
          const section = route.sections[i];
          return {
            id: item.id,
            sequence_number: i + 1,
            distance_km: section.summary.length / 1000,
            duration_min: Math.round(section.summary.duration / 60),
            is_week_start: i === 0
          };
        });

        // Use CASE statement for batch update
        const ids = updates.map(u => u.id);
        const seqCases = updates.map(u => `WHEN ${u.id} THEN ${u.sequence_number}`).join(' ');
        const distCases = updates.map(u => `WHEN ${u.id} THEN ${u.distance_km}`).join(' ');
        const durCases = updates.map(u => `WHEN ${u.id} THEN ${u.duration_min}`).join(' ');
        const weekCases = updates.map(u => `WHEN ${u.id} THEN ${u.is_week_start}`).join(' ');

        await tx.$executeRawUnsafe(`
          UPDATE "route_sequence_items" SET
            "sequence_number" = CASE "id" ${seqCases} END,
            "distance_from_previous_km" = CASE "id" ${distCases} END,
            "duration_from_previous_minutes" = CASE "id" ${durCases} END,
            "is_week_start" = CASE "id" ${weekCases} END
          WHERE "id" IN (${ids.join(',')})
        `);
      }

      return { success: true };
    });
  }

  /**
   * Retorna um resumo dos roteiros em execução para supervisão.
   */
  async getSummary() {
    const sequences = await prisma.routeSequence.findMany({
      where: {
        optimization_status: { in: ['completed', 'em_execucao'] }
      },
      include: {
        supervisor: { select: { full_name: true } },
        items: { select: { status: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    return sequences.map(s => {
      const totalVisits = s.total_visits || 0;
      return {
        id: s.id,
        name: `Roteiro #${s.id}`,
        representative: s.supervisor?.full_name || 'Sem Supervisor',
        date: s.created_at.toISOString().split('T')[0],
        total_stops: totalVisits,
        completed_stops: s.items.filter(i => i.status === 'visitada').length,
        status: s.optimization_status,
        completion_rate: totalVisits > 0 
          ? Math.round((s.items.filter(i => i.status === 'visitada').length / totalVisits) * 100) 
          : 0
      };
    });
  }
}
