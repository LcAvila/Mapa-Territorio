import { z } from 'zod';

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export const profileUpdateSchema = z.object({
  photo: z.string().optional(),
  full_name: z.string().max(200).optional(),
  cpf_cnpj: z.string().max(18).optional(),
  telefone: z.string().max(20).optional(),
  birth_date: z.string().optional(),
  cep: z.string().max(10).optional(),
  logradouro: z.string().max(200).optional(),
  numero: z.string().max(20).optional(),
  complemento: z.string().max(200).optional(),
  bairro_end: z.string().max(100).optional(),
  cidade: z.string().max(100).optional(),
  estado_end: z.string().max(2).optional(),
});

// ─── User Management Schemas ──────────────────────────────────────────────────

export const createUserSchema = z.object({
  code: z.string().min(1, 'Código obrigatório').max(50),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  full_name: z.string().max(200).optional(),
  role: z.enum(['admin', 'supervisor', 'user']).optional().default('user'),
  tipo: z.string().max(50).optional(),
  email: z.string().email().optional(),
  telefone: z.string().max(20).optional(),
  cpf_cnpj: z.string().max(18).optional(),
  cargo: z.string().max(100).optional(),
  company_name: z.string().max(200).optional(),
  assigned_state: z.string().max(2).optional(),
  area_atuacao: z.string().max(200).optional(),
  base_logistica: z.string().max(500).optional(),
  colorIndex: z.number().int().min(0).optional(),
  comissao: z.union([z.number(), z.string(), z.null()]).optional(),
  isVago: z.boolean().optional(),
  groupId: z.number().int().optional().nullable(),
  userTypeId: z.number().int().optional().nullable(),
  birth_date: z.string().optional(),
  photo: z.string().optional(),
  cep: z.string().max(10).optional(),
  logradouro: z.string().max(200).optional(),
  numero: z.string().max(20).optional(),
  complemento: z.string().max(200).optional(),
  bairro_end: z.string().max(100).optional(),
  cidade: z.string().max(100).optional(),
  estado_end: z.string().max(2).optional(),
  default_screen: z.string().max(50).optional(),
  managedUserIds: z.array(z.number().int()).optional(),
  permissions: z.array(z.object({
    moduleId: z.string(),
    canView: z.boolean(),
    canEdit: z.boolean(),
  })).optional(),
});

export const updatePermissionsSchema = z.object({
  permissions: z.array(z.object({
    moduleId: z.string().min(1),
    canView: z.boolean(),
    canEdit: z.boolean(),
  })),
  role: z.enum(['admin', 'supervisor', 'user']).optional(),
});

// ─── Territory Schemas ────────────────────────────────────────────────────────

export const claimTerritorySchema = z.object({
  municipio: z.string().min(1, 'Município obrigatório'),
  uf: z.string().length(2, 'UF deve ter 2 caracteres'),
  modo: z.string().optional(),
});

export const importTerritoriesSchema = z.array(z.object({
  municipio: z.string().min(1),
  uf: z.string().length(2),
  modo: z.string().optional(),
  userId: z.number().int().optional(),
}));

// ─── Notification Schemas ─────────────────────────────────────────────────────

export const createNotificationSchema = z.object({
  title: z.string().min(1, 'Título obrigatório').max(200),
  message: z.string().min(1, 'Mensagem obrigatória').max(5000),
  targetAll: z.boolean().optional().default(true),
  targetUserIds: z.array(z.number().int()).optional(),
  senderName: z.string().max(100).optional(),
});

// ─── Route Planning Schemas ───────────────────────────────────────────────────

export const createCycleSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(200),
  start_date: z.string().min(1, 'Data de início obrigatória'),
  end_date: z.string().min(1, 'Data de fim obrigatória'),
  supervisor_user_id: z.number().int().positive('Supervisor obrigatório'),
});

// ─── Client Schemas ───────────────────────────────────────────────────────────

export const createClienteSchema = z.object({
  nome_cliente: z.string().min(1, 'Nome do cliente obrigatório').max(200),
  codigo_cliente: z.string().max(50).optional(),
  nome_abreviado: z.string().max(100).optional(),
  uf: z.string().max(2).optional(),
  cidade: z.string().max(100).optional(),
  bairro: z.string().max(100).optional(),
  cep: z.string().max(10).optional(),
  endereco_completo: z.string().max(500).optional(),
  cnpj: z.string().max(18).optional(),
  numero: z.string().max(20).optional(),
  semana: z.string().max(50).optional(),
  prioridade: z.string().max(50).optional(),
  userId: z.number().int().optional(),
});

// ─── Audit Schemas ────────────────────────────────────────────────────────────

export const clearAuditSchema = z.object({
  confirmToken: z.string().min(1, 'Token de confirmação obrigatório'),
  before: z.string().optional(), // ISO date string, optional filter
});

// ─── Validation helper ────────────────────────────────────────────────────────

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const messages = result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join('; ');
  return { success: false, error: messages };
}
