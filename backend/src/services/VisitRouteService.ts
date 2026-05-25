import { prisma } from '../prisma';

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
    const result = await prisma.visitResult.create({
      data: {
        route_sequence_item_id: data.route_sequence_item_id,
        result_status: data.status,
        sale_made: data.sale_made || false,
        sale_value: data.sale_value,
        notes: data.notes,
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
    clientIds: number[],
    startPoint?: 'base' | 'current',
    startLat?: number,
    startLng?: number
  }) {
    // 1. Buscar informações dos clientes
    const clients = await prisma.cliente.findMany({
      where: { id_cliente: { in: data.clientIds } }
    });

    // 2. Criar a sequência principal
    const sequence = await prisma.routeSequence.create({
      data: {
        supervisor_user_id: data.supervisorId,
        route_date: data.date,
        total_visits: clients.length,
        optimization_status: 'pending',
        start_lat: data.startLat,
        start_lng: data.startLng,
        start_label: data.startPoint === 'base' ? 'Base da Empresa' : 'Localização Atual'
      }
    });

    // 3. Criar os itens do roteiro
    const items = clients.map((c, index) => ({
      route_sequence_id: sequence.id,
      sequence_number: index + 1,
      client_id: c.id_cliente,
      city: c.cidade,
      state: c.uf,
      stop_lat: c.latitude,
      stop_lng: c.longitude,
      status: 'pendente'
    }));

    await prisma.routeSequenceItem.createMany({
      data: items
    });

    return sequence;
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

    return sequences.map(s => ({
      id: s.id,
      name: `Roteiro #${s.id}`,
      representative: s.supervisor?.full_name || 'Sem Supervisor',
      date: s.created_at.toISOString().split('T')[0],
      total_stops: s.total_visits || 0,
      completed_stops: s.items.filter(i => i.status === 'visitada').length,
      status: s.optimization_status,
      completion_rate: (s.total_visits || 0) > 0 
        ? Math.round((s.items.filter(i => i.status === 'visitada').length / (s.total_visits || 1)) * 100) 
        : 0
    }));
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
   */
  async getSuggestions(userId: number) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Buscar clientes do usuário que não tiveram visitas recentes concluídas
    const suggestions = await prisma.cliente.findMany({
      where: {
        userId: userId,
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
        { prioridade: 'desc' }, // Se houver campo de prioridade
        { data_cadastro: 'asc' } // Mais antigos primeiro
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
}
