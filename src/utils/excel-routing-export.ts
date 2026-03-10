import * as XLSX from 'xlsx';
import { PlanningResult } from '../lib/routing-algorithm';

export async function exportPlanningToExcel(plan: PlanningResult, filename: string = 'Planejamento_Nacional.xlsx') {
  const wb = XLSX.utils.book_new();

  // 1. Base Clientes
  const wsClientes = XLSX.utils.json_to_sheet(plan.baseClientes.map(c => ({
    'Código': c.codigo,
    'Nome': c.nome,
    'Região': c.regiao,
    'UF': c.uf,
    'Cidade': c.cidade,
    'Endereço': c.endereco,
    'CEP': c.cep,
    'Representante': c.representante,
    'CNPJ': c.cnpj,
    'Supervisor ID': c.supervisorId
  })));
  XLSX.utils.book_append_sheet(wb, wsClientes, "Base Clientes");

  // 2. Território Supervisores
  const wsTerritorios = XLSX.utils.json_to_sheet(plan.territorios.map(t => ({
    'Supervisor': t.nome,
    'Base': t.base,
    'Estados Atendidos': t.estados.join(', '),
    'Clientes': t.clientesCount
  })));
  XLSX.utils.book_append_sheet(wb, wsTerritorios, "Território Supervisores");

  // 3. Clusters Cidades
  const wsClusters = XLSX.utils.json_to_sheet(plan.clusters.map(c => ({
    'Supervisor ID': c.supervisorId,
    'UF': c.uf,
    'Cidade': c.cidade,
    'Tamanho': c.size,
    'Classificação': c.classification
  })));
  XLSX.utils.book_append_sheet(wb, wsClusters, "Clusters Cidades");

  // 4. Blocos de Viagem
  const wsBlocos = XLSX.utils.json_to_sheet(plan.blocosViagem.map(b => ({
    'Supervisor ID': b.supervisorId,
    'Bloco': b.blockName,
    'Cidades': b.cities.join(', '),
    'Total Clientes': b.totalClients,
    'Dias Estimados': b.estimatedDays
  })));
  XLSX.utils.book_append_sheet(wb, wsBlocos, "Blocos de Viagem");

  // 5. Roteiro de Visitas
  const wsRoteiro = XLSX.utils.json_to_sheet(plan.roteiroVisitas.map(r => ({
    'Supervisor ID': r.supervisorId,
    'Semana': r.semana,
    'Dia': r.dia,
    'Ordem': r.ordem,
    'UF': r.client.uf,
    'Cidade': r.client.cidade,
    'Cliente': r.client.nome,
    'Endereço': r.client.endereco,
    'KM Estimado': r.kmEstimado,
    'Transporte': r.transporte
  })));
  XLSX.utils.book_append_sheet(wb, wsRoteiro, "Roteiro de Visitas");

  // 6. Agenda Semanal
  const wsAgenda = XLSX.utils.json_to_sheet(plan.agendaSemanal.map(a => ({
    'Supervisor': a.nome,
    'Semana': a.semana,
    'Nº de Visitas': a.visitasCount,
    'KM Total': a.kmTotal
  })));
  XLSX.utils.book_append_sheet(wb, wsAgenda, "Agenda Semanal");

  // 7. Densidade por Estado
  const wsDensidade = XLSX.utils.json_to_sheet(plan.densidadeEstado.map(d => ({
    'Estado': d.uf,
    'Nº de Clientes': d.clientesCount,
    '% da Base': d.percentagem.toFixed(2) + '%'
  })));
  XLSX.utils.book_append_sheet(wb, wsDensidade, "Densidade por Estado");

  // 8. Dashboard Executivo
  const wsDashboard = XLSX.utils.json_to_sheet([
    { Métrica: 'Total de Clientes', Valor: plan.dashboard.totalClientes },
    { Métrica: 'Supervisores em Campo', Valor: plan.dashboard.supervisoresAtivos },
    { Métrica: 'KM Total Estimada', Valor: plan.dashboard.kmTotalEstimada },
    { Métrica: 'Visitas Planejadas', Valor: plan.dashboard.visitasPlanejadas }
  ]);
  XLSX.utils.book_append_sheet(wb, wsDashboard, "Dashboard Executivo");

  // Salvar Arquivo
  XLSX.writeFile(wb, filename);
}
