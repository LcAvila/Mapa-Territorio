// Representatives are now managed via the Admin panel and stored in SQLite.
// This file only exports the type and helper functions used across the app.

export interface SystemUser {
  id: number;
  username: string;
  role: string;
  full_name?: string;
  fullName?: string;
  photo?: string;
  birth_date?: string;
  birthDate?: string;
  telefone?: string;
  code?: string;
  cpf_cnpj?: string;
  document?: string;
  documentType?: 'cpf' | 'cnpj';
  default_workspace?: string;
  inactivity_limit?: number;
  notif_email?: boolean;
  notif_sms?: boolean;
  notif_push?: boolean;
  colorIndex: number;
  comissao?: number;
  isVago?: number;
  email?: string;
  cargo?: string;
  company_name?: string;
  companyName?: string;
  groupId?: number;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro_end?: string;
  cidade?: string;
  estado_end?: string;
  assigned_state?: string;
  area_atuacao?: string;
  base_logistica?: string;
  userTypeId?: number;
  tipo?: string;
  canVisit?: boolean; 
  created_at?: string;
  createdAt?: string;
  last_active?: string;
  managedUsers?: { id: number; username: string; [key: string]: any }[];
  managedUserIds?: number[];
  permissions?: { moduleId: string; canView: boolean; canEdit: boolean; module?: { id: string; name: string } }[];
}

// These are populated at runtime by the API (see BrazilMap.tsx, Admin.tsx)
// The static array is empty — all data comes from the backend.
export const systemUsers: SystemUser[] = [];

// Color palette used to assign colors by index - Extended to 48 colors
export const USER_COLOR_PALETTE: Record<number, string> = {
  1: "hsl(200, 80%, 55%)",  // Blue
  2: "hsl(340, 75%, 55%)",  // Pink/Red
  3: "hsl(45, 90%, 55%)",   // Amber
  4: "hsl(270, 65%, 60%)",  // Purple
  5: "hsl(150, 70%, 45%)",  // Green
  6: "hsl(25, 85%, 55%)",   // Orange
  7: "hsl(190, 75%, 50%)",  // Cyan
  8: "hsl(10, 80%, 55%)",   // Red
  9: "hsl(85, 65%, 45%)",   // Lime
  10: "hsl(300, 60%, 55%)", // Magenta
  11: "hsl(60, 85%, 45%)",  // Yellow
  12: "hsl(240, 70%, 60%)", // Indigo
  // New vibrant colors
  13: "hsl(170, 85%, 40%)", // Teal
  14: "hsl(320, 80%, 50%)", // Deep Pink
  15: "hsl(215, 90%, 50%)", // Royal Blue
  16: "hsl(130, 60%, 50%)", // Forest Green
  17: "hsl(40, 95%, 50%)",  // Gold
  18: "hsl(285, 75%, 55%)", // Violet
  19: "hsl(10, 90%, 45%)",  // Dark Red
  20: "hsl(180, 100%, 35%)", // Dark Cyan
  21: "hsl(75, 80%, 45%)",  // Olive
  22: "hsl(330, 85%, 45%)", // Crimson
  23: "hsl(210, 100%, 40%)", // Azure
  24: "hsl(155, 80%, 40%)", // Mint
  25: "hsl(20, 100%, 45%)", // Burnt Orange
  26: "hsl(260, 80%, 65%)", // Lavender
  27: "hsl(195, 90%, 45%)", // Sky Blue
  28: "hsl(350, 85%, 50%)", // Rose
  29: "hsl(50, 100%, 45%)", // Sunflower
  30: "hsl(140, 70%, 40%)", // Emerald
  31: "hsl(230, 75%, 55%)", // Periwinkle
  32: "hsl(30, 90%, 50%)",  // Pumpkin
  33: "hsl(185, 80%, 45%)", // Turquoise
  34: "hsl(345, 80%, 55%)", // Strawberry
  35: "hsl(205, 85%, 50%)", // Cerulean
  36: "hsl(145, 65%, 45%)", // Seafoam
  37: "hsl(35, 95%, 45%)",  // Bronze
  38: "hsl(275, 70%, 50%)", // Plum
  39: "hsl(5, 85%, 60%)",   // Coral
  40: "hsl(175, 75%, 35%)", // Pine
  41: "hsl(65, 80%, 50%)",  // Chartreuse
  42: "hsl(315, 70%, 55%)", // Orchid
  43: "hsl(225, 80%, 55%)", // Cornflower
  44: "hsl(165, 70%, 45%)", // Aquamarine
  45: "hsl(15, 90%, 50%)",  // Rust
  46: "hsl(295, 65%, 50%)", // Grape
  47: "hsl(200, 100%, 30%)", // Navy
  48: "hsl(120, 60%, 40%)", // Leaf Green
};

export const REP_COLOR_PALETTE = USER_COLOR_PALETTE; // Alias for backward compatibility

export function getUserById(id: number, users: SystemUser[] = []): SystemUser | undefined {
  return users.find(u => u.id === id);
}

export function getRepByCode(id: string | number, users: SystemUser[] = []): SystemUser | undefined {
  return users.find(u => String(u.id) === String(id));
}

export function getUserColor(user: SystemUser): string {
  if (user.isVago) return "hsl(0, 0%, 40%)";
  const color = USER_COLOR_PALETTE[user.colorIndex];
  if (color) return color;
  
  // Deterministic fallback based on id
  const idStr = String(user.id || "");
  const hash = idStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = (hash % 48) + 1;
  return USER_COLOR_PALETTE[index] || "hsl(200, 80%, 55%)";
}

export const getRepColor = getUserColor; // Alias

export function getNextColorIndex(users: SystemUser[]): number {
  const usedIndices = users.filter(u => !u.isVago).map(u => u.colorIndex);
  for (let i = 1; i <= 48; i++) {
    if (!usedIndices.includes(i)) return i;
  }
  return (users.length % 48) + 1;
}
