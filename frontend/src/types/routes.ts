export type RouteCycleStatus = 'rascunho' | 'calculando' | 'pronto_revisao' | 'publicado' | 'em_execucao' | 'finalizado' | 'cancelado';
export type VisitStatus = 'pendente' | 'agendada' | 'em_rota' | 'visitada' | 'nao_visitada' | 'remarcada' | 'sem_sucesso' | 'venda_feita';
export type ClientClassification = 'Estratégico' | 'Forte' | 'Médio' | 'Pontual';

export interface RouteCycle {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: RouteCycleStatus;
  supervisor_user_id: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface RouteCycleWeek {
  id: number;
  route_cycle_id: number;
  week_number: number;
  start_date: string;
  end_date: string;
  status: string;
}

export interface RouteClientSnapshot {
  id: number;
  route_cycle_id: number;
  client_id: number;
  owner_user_id: number;
  supervisor_user_id: number;
  client_name: string;
  trade_name?: string;
  cnpj?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  classification?: ClientClassification;
  latitude?: number;
  longitude?: number;
  distance_base_km?: number;
  source_base?: string;
  source_logistic_type?: string;
}

export interface RouteAssignment {
  id: number;
  route_cycle_id: number;
  week_id: number;
  client_snapshot_id: number;
  assigned_by: number;
  assigned_at: string;
  assignment_mode: 'automatic' | 'manual';
  notes?: string;
}

export interface RouteSequence {
  id: number;
  route_cycle_id: number;
  week_id: number;
  supervisor_user_id: number;
  route_date?: string;
  start_lat?: number;
  start_lng?: number;
  start_label?: string;
  end_lat?: number;
  end_lng?: number;
  end_label?: string;
  total_distance_km?: number;
  total_duration_minutes?: number;
  average_km_per_visit?: number;
  total_visits?: number;
  optimization_provider?: string;
  optimization_status?: string;
  raw_response_json?: any;
  created_at: string;
}

export interface RouteSequenceItem {
  id: number;
  route_sequence_id: number;
  sequence_number: number;
  client_snapshot_id: number;
  client_id: number;
  city?: string;
  state?: string;
  classification?: ClientClassification;
  stop_lat?: number;
  stop_lng?: number;
  distance_from_previous_km?: number;
  duration_from_previous_minutes?: number;
  logistic_note?: string;
  is_week_start: boolean;
  manually_changed: boolean;
  status: VisitStatus;
}

export interface RouteCluster {
  id: number;
  route_cycle_id: number;
  supervisor_user_id: number;
  week_id: number;
  state?: string;
  city?: string;
  cluster_name?: string;
  classification?: ClientClassification;
  total_clients?: number;
  average_distance_km?: number;
}

export interface RouteBlock {
  id: number;
  route_cycle_id: number;
  supervisor_user_id: number;
  week_id: number;
  block_name?: string;
  block_type?: string;
  state?: string;
  city?: string;
  total_clients?: number;
  notes?: string;
}

export interface RouteAuditLog {
  id: number;
  entity_name: string;
  entity_id: number;
  action: string;
  old_data?: any;
  new_data?: any;
  changed_by: number;
  changed_at: string;
}

export interface RouteExport {
  id: number;
  route_cycle_id: number;
  export_type: 'excel' | 'pdf';
  export_scope: 'base_clientes' | 'resumo_supervisores' | 'roteiro_sequencial' | 'resumo_roteiro' | 'clusters' | 'blocos' | 'agenda' | 'densidade';
  filters_json?: any;
  generated_by: number;
  generated_at: string;
  file_url?: string;
  file_name?: string;
}
