import React from 'react';

// ─── Interfaces compartilhadas do Admin ────────────────────────────────────────

export interface Territory {
  id: number;
  municipio: string;
  uf: string;
  modo: string;
  userId?: number;
  userIds?: number[];
  clientCount?: number;
}

export interface UserType {
  id: number;
  name: string;
  color: string;
  icon: string;
  showInMenu: boolean;
  active: boolean;
  isAdmin: boolean;
  isSystemDefault: boolean;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  userIds: number[];
  createdAt: string;
}

export interface SystemNotification {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  targetAll?: boolean;
  targetUserIds?: number[];
  seen?: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  uf?: string;
  municipio?: string;
  performedBy: string;
  timestamp: string;
  ipAddress?: string;
}

export interface ModulePermission {
  userId: number;
  moduleId: string;
  canView: boolean;
  canEdit: boolean;
}

export interface ClienteData {
  id_cliente?: number;
  codigo_cliente?: string;
  nome_cliente?: string;
  nome_abreviado?: string;
  uf?: string;
  cidade?: string;
  userId?: number;
  [key: string]: unknown;
}

export type TabId =
  | 'dashboard'
  | 'ajuda'
  | 'visitas'
  | 'visitas_agendar'
  | 'users'
  | 'territories'
  | 'groups'
  | 'notifications'
  | 'audit'
  | 'personal'
  | 'rotas'
  | 'baserotas'
  | 'clusters'
  | 'blocos'
  | 'roteiros'
  | 'agenda'
  | 'densidade'
  | 'cycles'
  | 'roteiro_seq'
  | 'resumo_roteiro'
  | 'user_types'
  | 'system'
  | 'reps'
  | `user_type_${number}`;

export interface NavItem {
  id: TabId | 'settings' | 'rotas_menu' | 'users_menu' | 'visitas_menu' | 'ajuda';
  label: string;
  icon: React.ElementType;
  count?: number;
  badge?: boolean;
  restrict?: string[];
  subItems?: { id: TabId; label: string; icon: React.ElementType; count?: number }[];
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
export const LS = {
  get: <T,>(key: string, def: T): T => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : def;
    } catch {
      return def;
    }
  },
  set: <T,>(key: string, val: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      /* ignore */
    }
  },
};

// ─── CPF / CNPJ mask ─────────────────────────────────────────────────────────
export function maskDoc(val: string, type: 'cpf' | 'cnpj') {
  const d = val.replace(/\D/g, '');
  if (type === 'cpf') {
    return d.slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, e) =>
      e ? `${a}.${b}.${c}-${e}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a
    );
  }
  return d.slice(0, 14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, a, b, c, e, f) =>
    f ? `${a}.${b}.${c}/${e}-${f}` : e ? `${a}.${b}.${c}/${e}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a
  );
}

export function maskPhone(val: string) {
  const d = val.replace(/\D/g, '');
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, (_, a, b, c) =>
      c ? `(${a}) ${b}-${c}` : b ? `(${a}) ${b}` : a ? `(${a})` : ''
    );
  }
  return d.slice(0, 11).replace(/(\d{2})(\d{5})(\d{0,4})/, (_, a, b, c) =>
    c ? `(${a}) ${b}-${c}` : b ? `(${a}) ${b}` : a ? `(${a})` : ''
  );
}

export function maskCEP(val: string) {
  const d = val.replace(/\D/g, '').slice(0, 8);
  return d.replace(/(\d{5})(\d{0,3})/, (_, a, b) => (b ? `${a}-${b}` : a));
}

// ─── Constants ────────────────────────────────────────────────────────────────
export const API = process.env.VITE_API_URL || '';
export const IBGE = 'https://servicodados.ibge.gov.br/api/v1/localidades';
export const NOTIF_FONT_WHITELIST = ['inter', 'roboto', 'open-sans', 'lato', 'montserrat', 'poppins', 'nunito', 'source-sans', 'merriweather', 'playfair'];
export const NOTIF_SIZE_WHITELIST = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
