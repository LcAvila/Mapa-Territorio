import { prisma } from '../prisma';
import {
  resolveClientCoordinates,
  normalizeBrazilCoordinates,
} from '../utils/client-coordinates';

export interface CheckinDTO {
  route_sequence_item_id: number;
  lat: number;
  lng: number;
  notes?: string;
}

export interface CheckoutDTO {
  checkin_id: number;
  lat: number;
  lng: number;
  notes?: string;
}

export interface VisitResultDTO {
  route_sequence_item_id: number;
  status: string;
  sale_made?: boolean;
  sale_value?: number;
  notes?: string;
  media_url?: string;
  media_type?: 'photo' | 'video';
  userId: number;
}

export class VisitRouteService {
  /**
   * Inicia a execução de um roteiro.
   */
  async startRoute(sequenceId: number) {
    return await prisma.routeSequence.update({
      where: { id: sequenceId },
      data: { 
        optimization_status: 'em_execucao',
        items: {
          updateMany: {
            where: { status: 'pendente' },
            data: { status: 'em_rota' }
          }
        }
      }
    });
  }

  /**
   * Realiza check-in em uma parada.
   * Valida se a distância entre as coordenadas atuais e as do cliente estão dentro de um raio aceitável.
   */
  async checkin(data: CheckinDTO) {
    const item = await prisma.routeSequenceItem.findUnique({
      where: { id: data.route_sequence_item_id },
      include: { clientSnapshot: true }
    });

    if (!item) throw new Error('Parada do roteiro não encontrada.');

    // Validação de distância (ex: 500 metros)
    if (item.stop_lat && item.stop_lng) {
      const distance = this.calculateDistance(data.lat, data.lng, item.stop_lat, item.stop_lng);
      if (distance > 0.5) { // 0.5 km = 500m
        console.warn(`[CHECKIN] Usuário a ${distance.toFixed(2)}km do cliente. Possível check-in fora do local.`);
      }
    }

    const checkin = await prisma.visitCheckin.create({
      data: {
        route_sequence_item_id: data.route_sequence_item_id,
        checkin_at: new Date(),
        checkin_lat: data.lat,
        checkin_lng: data.lng,
        checkin_source: 'mobile_web',
        notes: data.notes
      }
    });

    // Atualiza status do item
    await prisma.routeSequenceItem.update({
      where: { id: data.route_sequence_item_id },
      data: { status: 'visitando' } // Status temporário enquanto está no cliente
    });

    return checkin;
  }

  /**
   * Realiza check-out de uma parada.
   */
  async checkout(data: CheckoutDTO) {
    return await prisma.visitCheckin.update({
      where: { id: data.checkin_id },
      data: {
        checkout_at: new Date(),
        checkout_lat: data.lat,
        checkout_lng: data.lng,
        notes: data.notes
      }
    });
  }

  /**
   * Registra o resultado final da visita.
   */
  async registerResult(data: VisitResultDTO) {
    const baseNotes = (data.notes || '').trim();
    const evidenceBlock = data.media_url
      ? `\n\n[comprovante_${data.media_type || 'photo'}]: ${data.media_url}`
      : '';
    const finalNotes = `${baseNotes}${evidenceBlock}`.trim() || undefined;

    const result = await prisma.visitResult.create({
      data: {
        route_sequence_item_id: data.route_sequence_item_id,
        result_status: data.status,
        sale_made: data.sale_made || false,
        sale_value: data.sale_value,
        notes: finalNotes,
        registered_by: data.userId,
        registered_at: new Date()
      }
    });

    // Atualiza status final do item na sequência
    await prisma.routeSequenceItem.update({
      where: { id: data.route_sequence_item_id },
      data: { status: data.status }
    });

    return result;
  }

  /**
   * Cria um roteiro manual sem necessidade de ciclos de planejamento.
   */
  async createManualRoute(data: { 
    supervisorId: number, 
    date: Date, 
    name?: string,
    semana?: string,
    clientIds: number[],
    startPoint?: 'base' | 'current',
    startLat?: number,
    startLng?: number
  }) {
    // 1. Buscar informações dos clientes e resolver coordenadas corretas
    const clientsRaw = await prisma.cliente.findMany({
      where: { id_cliente: { in: data.clientIds } },
    });

    const clients = await Promise.all(
      clientsRaw.map(async (c) => {
        const coords = await resolveClientCoordinates(c);
        if (coords) {
          if (coords.source === 'geocoded') {
            await prisma.cliente.update({
              where: { id_cliente: c.id_cliente },
              data: { latitude: coords.lat, longitude: coords.lng },
            });
          }
          return { ...c, latitude: coords.lat, longitude: coords.lng };
        }
        return c;
      })
    );

    const missingCoords = clients.filter(
      (c) => c.latitude == null || c.longitude == null
    );
    if (missingCoords.length > 0) {
      const names = missingCoords.map((c) => c.nome_cliente).join(', ');
      throw new Error(
        `Não foi possível localizar no mapa: ${names}. Verifique endereço, cidade, UF e CEP.`
      );
    }

    // Sort clients by distance to optimize route sequence (Nearest Neighbor)
    let sortedClients: typeof clients = [];
    const remainingClients = [...clients];
    
    // Determine start coordinates
    let currentLat = data.startLat;
    let currentLng = data.startLng;
    
    // If no start coordinates provided, try to find a client with coordinates as starting point
    if (currentLat === undefined || currentLng === undefined) {
      const firstWithCoords = remainingClients.find(c => c.latitude !== null && c.longitude !== null);
      if (firstWithCoords) {
        currentLat = firstWithCoords.latitude!;
        currentLng = firstWithCoords.longitude!;
      }
    }
    
    // Nearest neighbor algorithm
    while (remainingClients.length > 0) {
      if (currentLat !== undefined && currentLng !== undefined) {
        let nearestIndex = -1;
        let minDistance = Infinity;
        
        for (let i = 0; i < remainingClients.length; i++) {
          const c = remainingClients[i];
          if (c.latitude !== null && c.longitude !== null) {
            const dist = this.calculateDistance(currentLat, currentLng, c.latitude, c.longitude);
            if (dist < minDistance) {
              minDistance = dist;
              nearestIndex = i;
            }
          }
        }
        
        if (nearestIndex !== -1) {
          const nearestClient = remainingClients.splice(nearestIndex, 1)[0];
          sortedClients.push(nearestClient);
          currentLat = nearestClient.latitude!;
          currentLng = nearestClient.longitude!;
        } else {
          // No more clients with coordinates, append remaining
          sortedClients = [...sortedClients, ...remainingClients];
          break;
        }
      } else {
        // No starting coords and no clients have coords, just take them as is
        sortedClients = [...sortedClients, ...remainingClients];
        break;
      }
    }

    // 2. Criar a sequência principal
    const sequence = await prisma.routeSequence.create({
      data: {
        name: data.name?.trim() || null,
        supervisor_user_id: data.supervisorId,
        route_date: data.date,
        semana: data.semana,
        total_visits: clients.length,
        optimization_status: 'pending',
        start_lat: data.startLat,
        start_lng: data.startLng,
        start_label: data.startPoint === 'base' ? 'Base da Empresa' : 'Localização Atual'
      }
    });

    // 3. Criar os itens do roteiro com distância entre paradas
    let prevLat = data.startLat;
    let prevLng = data.startLng;
    let totalKm = 0;
    const startLabel = data.startPoint === 'base' ? 'Base da Empresa' : 'Localização Atual';

    const items = sortedClients.map((c, index) => {
      let distanceKm: number | null = null;
      if (
        prevLat != null &&
        prevLng != null &&
        c.latitude != null &&
        c.longitude != null
      ) {
        distanceKm = this.calculateDistance(prevLat, prevLng, c.latitude, c.longitude);
        totalKm += distanceKm;
      }
      if (c.latitude != null && c.longitude != null) {
        prevLat = c.latitude;
        prevLng = c.longitude;
      }

      return {
        route_sequence_id: sequence.id,
        sequence_number: index + 1,
        client_id: c.id_cliente,
        city: c.cidade,
        state: c.uf,
        stop_lat: c.latitude,
        stop_lng: c.longitude,
        distance_from_previous_km: distanceKm,
        logistic_note:
          index === 0 ? `Saída de ${startLabel}` : null,
        status: 'pendente',
      };
    });

    await prisma.routeSequenceItem.createMany({ data: items });

    if (totalKm > 0) {
      await prisma.routeSequence.update({
        where: { id: sequence.id },
        data: {
          total_distance_km: totalKm,
          average_km_per_visit: sortedClients.length > 0 ? totalKm / sortedClients.length : 0,
        },
      });
    }

    // 4. Notificar o representante
    try {
      const supervisor = await prisma.user.findUnique({
        where: { id: data.supervisorId },
        select: { full_name: true }
      });

      await prisma.notification.create({
        data: {
          title: 'Novo Roteiro Agendado',
          message: `Você tem um novo roteiro com ${clients.length} paradas agendado para o dia ${data.date.toLocaleDateString('pt-BR')}.`,
          targetAll: false,
          targetUserIds: [data.supervisorId],
          senderName: supervisor?.full_name || 'Sistema'
        }
      });
    } catch (err) {
      console.error('[NOTIFY] Erro ao criar notificação:', err);
    }

    return sequence;
  }

  /**
   * Detalhes completos do roteiro para supervisão (paradas, endereços, distâncias, motivos).
   */
  async getRouteDetails(sequenceId: number) {
    const sequence = await prisma.routeSequence.findUnique({
      where: { id: sequenceId },
      include: {
        supervisor: { select: { id: true, full_name: true, username: true } },
        cycle: { select: { id: true, name: true, start_date: true, end_date: true, status: true } },
        week: { select: { week_number: true, start_date: true, end_date: true } },
        items: { orderBy: { sequence_number: 'asc' } },
      },
    });

    if (!sequence) throw new Error('Roteiro não encontrado');

    const clientIds = sequence.items
      .map((i) => i.client_id)
      .filter((id): id is number => id != null);

    const clients =
      clientIds.length > 0
        ? await prisma.cliente.findMany({
            where: { id_cliente: { in: clientIds } },
            select: {
              id_cliente: true,
              nome_cliente: true,
              nome_abreviado: true,
              cep: true,
              endereco_completo: true,
              bairro: true,
              cidade: true,
              uf: true,
              numero: true,
              cnpj: true,
              prioridade: true,
              semana: true,
              historicos: {
                orderBy: { data_visita: 'desc' },
                take: 1,
                select: { data_visita: true, resultado: true, observacoes: true },
              },
            },
          })
        : [];

    const clientMap = new Map(clients.map((c) => [c.id_cliente, c]));

    const snapshotIds = sequence.items
      .map((i) => i.client_snapshot_id)
      .filter((id): id is number => id != null);

    const snapshots =
      snapshotIds.length > 0
        ? await prisma.routeClientSnapshot.findMany({
            where: { id: { in: snapshotIds } },
          })
        : [];
    const snapshotMap = new Map(snapshots.map((s) => [s.id, s]));

    let prevLat = sequence.start_lat;
    let prevLng = sequence.start_lng;
    let computedTotalKm = 0;

    const stops = sequence.items.map((item) => {
      const client = item.client_id ? clientMap.get(item.client_id) : undefined;
      const snapshot = item.client_snapshot_id
        ? snapshotMap.get(item.client_snapshot_id)
        : undefined;

      const lat = item.stop_lat ?? client?.latitude ?? snapshot?.latitude ?? null;
      const lng = item.stop_lng ?? client?.longitude ?? snapshot?.longitude ?? null;

      let distanceKm = item.distance_from_previous_km;
      if (
        distanceKm == null &&
        prevLat != null &&
        prevLng != null &&
        lat != null &&
        lng != null
      ) {
        distanceKm = this.calculateDistance(prevLat, prevLng, lat, lng);
      }
      if (distanceKm != null) computedTotalKm += distanceKm;
      if (lat != null && lng != null) {
        prevLat = lat;
        prevLng = lng;
      }

      const nome =
        client?.nome_cliente ?? snapshot?.client_name ?? 'Cliente não identificado';
      const cep = client?.cep ?? snapshot?.zip_code ?? null;
      const endereco =
        client?.endereco_completo ?? snapshot?.address ?? null;
      const bairro = client?.bairro ?? null;
      const cidade = item.city ?? client?.cidade ?? snapshot?.city ?? null;
      const uf = item.state ?? client?.uf ?? snapshot?.state ?? null;
      const numero = client?.numero ?? null;

      return {
        id: item.id,
        sequence_number: item.sequence_number,
        status: item.status,
        classification: item.classification ?? snapshot?.classification ?? null,
        logistic_note: item.logistic_note,
        visit_reason: this.buildVisitReason(client, item, snapshot),
        distance_from_previous_km: distanceKm,
        distance_from_start_km:
          item.sequence_number === 1 ? distanceKm : null,
        cliente: {
          id: item.client_id,
          nome,
          nome_abreviado: client?.nome_abreviado ?? snapshot?.trade_name ?? null,
          cnpj: client?.cnpj ?? snapshot?.cnpj ?? null,
          prioridade: client?.prioridade ?? null,
          semana_cliente: client?.semana ?? null,
        },
        endereco: {
          completo: endereco,
          logradouro: endereco,
          numero,
          bairro,
          cidade,
          uf,
          cep: cep ? this.formatCep(cep) : null,
          cep_raw: cep,
        },
        coordinates:
          lat != null && lng != null ? { lat, lng } : null,
      };
    });

    const totalKm = sequence.total_distance_km ?? computedTotalKm;

    return {
      id: sequence.id,
      name: sequence.name?.trim() || `Roteiro #${sequence.id}`,
      status: sequence.optimization_status,
      semana: sequence.semana,
      route_date: (sequence.route_date || sequence.created_at).toISOString().split('T')[0],
      created_at: sequence.created_at.toISOString(),
      representative: {
        id: sequence.supervisor.id,
        name: sequence.supervisor.full_name || sequence.supervisor.username,
      },
      cycle: sequence.cycle
        ? {
            id: sequence.cycle.id,
            name: sequence.cycle.name,
            status: sequence.cycle.status,
            period: `${sequence.cycle.start_date.toISOString().split('T')[0]} — ${sequence.cycle.end_date.toISOString().split('T')[0]}`,
          }
        : null,
      week: sequence.week
        ? {
            number: sequence.week.week_number,
            period: `${sequence.week.start_date.toISOString().split('T')[0]} — ${sequence.week.end_date.toISOString().split('T')[0]}`,
          }
        : null,
      start: {
        label: sequence.start_label || 'Ponto de partida não definido',
        lat: sequence.start_lat,
        lng: sequence.start_lng,
      },
      end: sequence.end_label
        ? { label: sequence.end_label, lat: sequence.end_lat, lng: sequence.end_lng }
        : null,
      motivo: this.buildRouteMotivo(sequence, stops.length),
      summary: {
        total_stops: sequence.total_visits ?? stops.length,
        completed_stops: stops.filter((s) => s.status === 'visitada').length,
        total_distance_km: Math.round(totalKm * 10) / 10,
        average_km_per_visit: sequence.average_km_per_visit
          ? Math.round(sequence.average_km_per_visit * 10) / 10
          : stops.length > 0
            ? Math.round((totalKm / stops.length) * 10) / 10
            : 0,
        total_duration_minutes: sequence.total_duration_minutes,
        optimization_provider: sequence.optimization_provider,
      },
      stops,
    };
  }

  private formatCep(cep: string): string {
    const digits = cep.replace(/\D/g, '');
    if (digits.length === 8) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    return cep;
  }

  private buildRouteMotivo(
    sequence: {
      name: string | null;
      semana: string | null;
      start_label: string | null;
      optimization_status: string | null;
      cycle?: { name: string } | null;
    },
    stopCount: number
  ): string {
    const parts: string[] = [];

    if (sequence.cycle?.name) {
      parts.push(`Ciclo de planejamento: ${sequence.cycle.name}`);
    }
    if (sequence.name?.trim()) {
      parts.push(`Roteiro nomeado: ${sequence.name.trim()}`);
    }
    if (sequence.semana) {
      parts.push(`Semana de visita: ${sequence.semana}`);
    }
    if (sequence.start_label) {
      parts.push(`Partida em ${sequence.start_label}`);
    }
    parts.push(
      `${stopCount} parada(s) ordenada(s) por menor distância entre os pontos (algoritmo vizinho mais próximo)`
    );
    if (sequence.optimization_status === 'pending') {
      parts.push('Aguardando otimização ou início da execução');
    } else if (sequence.optimization_status === 'em_execucao') {
      parts.push('Roteiro em execução no campo');
    } else if (sequence.optimization_status === 'completed') {
      parts.push('Roteiro concluído');
    }

    return parts.join('. ');
  }

  private buildVisitReason(
    client:
      | {
          prioridade: string | null;
          semana: string | null;
          historicos: Array<{
            data_visita: Date | null;
            resultado: string | null;
            observacoes: string | null;
          }>;
        }
      | undefined,
    item: { classification: string | null; logistic_note: string | null; status: string },
    snapshot: { classification: string | null } | undefined
  ): string {
    const reasons: string[] = [];

    if (item.logistic_note) reasons.push(item.logistic_note);

    const classification = item.classification ?? snapshot?.classification;
    if (classification) reasons.push(`Classificação: ${classification}`);

    if (client?.prioridade) reasons.push(`Prioridade: ${client.prioridade}`);
    if (client?.semana) reasons.push(`Semana do cliente: ${client.semana}`);

    const lastVisit = client?.historicos?.[0];
    if (!lastVisit?.data_visita) {
      reasons.push('Motivo: cliente nunca visitado ou sem histórico registrado');
    } else {
      const days = Math.floor(
        (Date.now() - new Date(lastVisit.data_visita).getTime()) / (1000 * 60 * 60 * 24)
      );
      reasons.push(
        `Última visita há ${days} dia(s)${lastVisit.resultado ? ` — resultado: ${lastVisit.resultado}` : ''}`
      );
      if (days >= 30) reasons.push('Inclusão sugerida: sem visita há mais de 30 dias');
      if (lastVisit.observacoes) reasons.push(`Obs.: ${lastVisit.observacoes}`);
    }

    if (reasons.length === 0) {
      return `Visita programada (status: ${item.status})`;
    }

    return reasons.join(' · ');
  }

  /**
   * Retorna os detalhes de uma sequência de roteiro para execução.
   */
  async getSequence(sequenceId: number) {
    return await prisma.routeSequence.findUnique({
      where: { id: sequenceId },
      include: {
        items: {
          include: { 
            clientSnapshot: true,
            // @ts-ignore
            client: {
              select: {
                nome_cliente: true,
                endereco_completo: true,
                cidade: true,
                uf: true
              }
            },
            checkins: {
              orderBy: { checkin_at: 'desc' },
              take: 1
            }
          },
          orderBy: { sequence_number: 'asc' }
        }
      }
    });
  }

  /**
   * Retorna um resumo dos roteiros em execução para supervisão.
   */
  async getSummary(userId?: number) {
    const sequences = await prisma.routeSequence.findMany({
      where: {
        optimization_status: { in: ['completed', 'em_execucao', 'pending'] },
        ...(userId ? { supervisor_user_id: userId } : {})
      },
      include: {
        supervisor: { select: { full_name: true } },
        items: { select: { status: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    return sequences.map(s => ({
      id: s.id,
      name: s.name?.trim() || `Roteiro #${s.id}`,
      representative: s.supervisor?.full_name || 'Sem Supervisor',
      date: (s.route_date || s.created_at).toISOString().split('T')[0],
      semana: s.semana,
      total_stops: s.total_visits || 0,
      completed_stops: s.items.filter(i => i.status === 'visitada').length,
      status: s.optimization_status,
      completion_rate: (s.total_visits || 0) > 0 
        ? Math.round((s.items.filter(i => i.status === 'visitada').length / (s.total_visits || 1)) * 100) 
        : 0
    }));
  }

  /**
   * Atualiza metadados do roteiro (nome, data, semana).
   */
  async updateRoute(
    sequenceId: number,
    data: { name?: string; route_date?: Date; semana?: string | null },
    actor: { id: number; role: string }
  ) {
    const existing = await prisma.routeSequence.findUnique({
      where: { id: sequenceId },
      select: { id: true, supervisor_user_id: true },
    });
    if (!existing) throw new Error('Roteiro não encontrado.');

    const isAdminLike = actor.role === 'admin' || actor.role === 'supervisor';
    if (!isAdminLike && existing.supervisor_user_id !== actor.id) {
      throw new Error('Sem permissão para editar este roteiro.');
    }

    const updateData: {
      name?: string | null;
      route_date?: Date;
      semana?: string | null;
    } = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim() || null;
    }
    if (data.route_date !== undefined) {
      updateData.route_date = data.route_date;
    }
    if (data.semana !== undefined) {
      updateData.semana = data.semana;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('Nenhum campo para atualizar.');
    }

    return prisma.routeSequence.update({
      where: { id: sequenceId },
      data: updateData,
      include: {
        supervisor: { select: { full_name: true } },
        items: { select: { status: true } },
      },
    });
  }

  /**
   * Remove um roteiro e seus itens (cascade).
   */
  async deleteRoute(sequenceId: number, actor: { id: number; role: string }) {
    const existing = await prisma.routeSequence.findUnique({
      where: { id: sequenceId },
      select: { id: true, supervisor_user_id: true, optimization_status: true },
    });
    if (!existing) throw new Error('Roteiro não encontrado.');

    const isAdminLike = actor.role === 'admin' || actor.role === 'supervisor';
    if (!isAdminLike && existing.supervisor_user_id !== actor.id) {
      throw new Error('Sem permissão para excluir este roteiro.');
    }

    if (existing.optimization_status === 'em_execucao') {
      throw new Error('Não é possível excluir um roteiro em execução.');
    }

    await prisma.routeSequence.delete({ where: { id: sequenceId } });

    // Também remover notificações geradas para o supervisor referentes a este roteiro.
    try {
      if (existing.supervisor_user_id) {
        // Deleta notificações direcionadas a este usuário que mencionem "Roteiro" no título
        await prisma.notification.deleteMany({
          where: {
            targetAll: false,
            title: { contains: 'Roteiro' },
            // `targetUserIds` é JSON; `contains` funciona para procurar um valor dentro do JSON
            targetUserIds: { contains: String(existing.supervisor_user_id) },
          },
        });
      }
    } catch (err) {
      console.error('[NOTIFY] Erro ao remover notificações relacionadas ao roteiro:', err);
    }

    return { success: true, id: sequenceId };
  }

  /**
   * Calcula distância entre dois pontos (Haversine Formula).
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Sugestão "Inteligente" de visitas baseada no histórico.
   * Procura clientes que não são visitados há mais de 30 dias ou nunca foram visitados.
   * Inclui clientes de subordinados na hierarquia.
   */
  async getSuggestions(userId: number) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Obter todos os IDs de usuários na hierarquia (recursivo)
    const allUserIds = await this.getAllSubordinateIds(userId);

    // Buscar clientes dos usuários da hierarquia que não tiveram visitas recentes concluídas
    const suggestions = await prisma.cliente.findMany({
      where: {
        userId: { in: allUserIds },
        status_ativo: true,
        OR: [
          {
            historicos: {
              none: {
                data_visita: { gte: thirtyDaysAgo }
              }
            }
          },
          {
            historicos: { none: {} }
          }
        ]
      },
      take: 15,
      orderBy: [
        { prioridade: 'desc' },
        { data_cadastro: 'asc' }
      ],
      select: {
        id_cliente: true,
        nome_cliente: true,
        cidade: true,
        uf: true,
        bairro: true,
        prioridade: true,
        historicos: {
          orderBy: { data_visita: 'desc' },
          take: 1,
          select: { data_visita: true }
        }
      }
    });

    return suggestions.map(s => ({
      ...s,
      last_visit: s.historicos[0]?.data_visita || null,
      reason: s.historicos.length === 0 ? 'Nunca visitado' : 'Sem visita há +30 dias'
    }));
  }

  /**
   * Helper privado para obter todos os IDs de subordinados de forma recursiva.
   */
  private async getAllSubordinateIds(userId: number): Promise<number[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        managedUsers: { select: { id: true } } 
      }
    });

    if (!user) return [userId];
    
    let ids = [userId];
    if (user.managedUsers && user.managedUsers.length > 0) {
      for (const sub of user.managedUsers) {
        const subIds = await this.getAllSubordinateIds(sub.id);
        ids = [...ids, ...subIds];
      }
    }
    return Array.from(new Set(ids));
  }

  /**
   * Retorna os pontos da rota em formato GeoJSON para visualização no mapa.
   */
  async getRouteGeoJSON(sequenceId: number) {
    const sequence = await prisma.routeSequence.findUnique({
      where: { id: sequenceId },
      include: {
        items: {
          orderBy: { sequence_number: 'asc' },
        },
      },
    });

    if (!sequence) throw new Error('Roteiro não encontrado');

    const clientIds = sequence.items
      .map((i) => i.client_id)
      .filter((id): id is number => id != null);

    const clients =
      clientIds.length > 0
        ? await prisma.cliente.findMany({
            where: { id_cliente: { in: clientIds } },
          })
        : [];
    const clientMap = new Map(clients.map((c) => [c.id_cliente, c]));

    const features: any[] = [];
    const lineCoordinates: number[][] = [];
    const resolvedStops: Array<{
      itemId: number;
      clientId: number | null;
      lat: number;
      lng: number;
      sequence: number;
      status: string;
      city: string | null;
      label: string;
      source: 'stored' | 'geocoded';
    }> = [];

    for (const item of sequence.items) {
      const client = item.client_id ? clientMap.get(item.client_id) : undefined;
      let lat: number | null = null;
      let lng: number | null = null;
      let label = item.city || 'Parada';
      let source: 'stored' | 'geocoded' = 'stored';

      if (client) {
        label = client.nome_cliente;
        const resolved = await resolveClientCoordinates(client);
        if (resolved) {
          lat = resolved.lat;
          lng = resolved.lng;
          source = resolved.source;
        }
      } else if (item.stop_lat != null && item.stop_lng != null) {
        const norm = normalizeBrazilCoordinates(item.stop_lat, item.stop_lng);
        if (norm) {
          lat = norm.lat;
          lng = norm.lng;
        }
      }

      if (lat == null || lng == null) continue;

      if (
        item.stop_lat !== lat ||
        item.stop_lng !== lng ||
        source === 'geocoded'
      ) {
        await prisma.routeSequenceItem.update({
          where: { id: item.id },
          data: { stop_lat: lat, stop_lng: lng, city: client?.cidade ?? item.city },
        });
        if (client && source === 'geocoded') {
          await prisma.cliente.update({
            where: { id_cliente: client.id_cliente },
            data: { latitude: lat, longitude: lng },
          });
        }
      }

      resolvedStops.push({
        itemId: item.id,
        clientId: item.client_id,
        lat,
        lng,
        sequence: item.sequence_number,
        status: item.status,
        city: client?.cidade ?? item.city,
        label,
        source,
      });
    }

    if (sequence.start_lat && sequence.start_lng) {
      const startNorm = normalizeBrazilCoordinates(sequence.start_lat, sequence.start_lng);
      if (startNorm) {
        features.push({
          type: 'Feature',
          properties: {
            type: 'start',
            label: sequence.start_label || 'Ponto de Partida',
          },
          geometry: {
            type: 'Point',
            coordinates: [startNorm.lng, startNorm.lat],
          },
        });
        lineCoordinates.push([startNorm.lng, startNorm.lat]);
      }
    } else if (resolvedStops.length > 0) {
      const first = resolvedStops[0];
      features.push({
        type: 'Feature',
        properties: {
          type: 'start',
          label: sequence.start_label || 'Primeira parada',
        },
        geometry: {
          type: 'Point',
          coordinates: [first.lng, first.lat],
        },
      });
    }

    for (const stop of resolvedStops) {
      features.push({
        type: 'Feature',
        properties: {
          type: 'stop',
          sequence: stop.sequence,
          status: stop.status,
          city: stop.city,
          label: stop.label,
        },
        geometry: {
          type: 'Point',
          coordinates: [stop.lng, stop.lat],
        },
      });
      lineCoordinates.push([stop.lng, stop.lat]);
    }

    if (lineCoordinates.length > 1) {
      features.push({
        type: 'Feature',
        properties: { type: 'route_line' },
        geometry: {
          type: 'LineString',
          coordinates: lineCoordinates,
        },
      });
    }

    return {
      type: 'FeatureCollection',
      features,
      bounds: this.computeBounds(resolvedStops),
    };
  }

  private computeBounds(
    stops: Array<{ lat: number; lng: number }>
  ): { south: number; north: number; west: number; east: number } | null {
    if (stops.length === 0) return null;
    let south = stops[0].lat;
    let north = stops[0].lat;
    let west = stops[0].lng;
    let east = stops[0].lng;
    for (const s of stops) {
      south = Math.min(south, s.lat);
      north = Math.max(north, s.lat);
      west = Math.min(west, s.lng);
      east = Math.max(east, s.lng);
    }
    return { south, north, west, east };
  }
}
