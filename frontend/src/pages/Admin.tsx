import React, { useState, useEffect, useMemo, useCallback } from 'react';

export interface ClienteData {
  id_cliente?: number;
  codigo_cliente?: string;
  nome_cliente?: string;
  nome_abreviado?: string;
  uf?: string;
  cidade?: string;
  repCode?: string;
  [key: string]: unknown;
}
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuth } from '@/contexts/auth-context-core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  UserPlus, Trash2, MapPin, Loader2, LogOut, Plus, Map, X, Check, ChevronDown,
  Search, Pencil, Save, Users, ShieldCheck, User, HandHeart, CheckCircle2, XCircle,
  Clock, LayoutDashboard, Bell, ScrollText, UsersRound, Briefcase, Send, Eye, EyeOff,
  Building2, Filter, RefreshCw, ChevronRight, MessageSquare, Globe, Activity,
  TrendingUp, AlertCircle, BadgeCheck, Palette, Upload, ImageOff, Download, Truck, Settings,
  Database, Layers, Grid3X3, Calendar, FileSpreadsheet, Camera, Percent, Mail, Phone, MapPinned
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import Loader from '@/components/Loader';
import { REP_COLOR_PALETTE, getNextColorIndex, getRepColor } from '@/data/representatives';
import { UF_DATA } from '@/data/uf-codes';

import { BaseClientePanel } from '../components/admin/rotas/BaseClientePanel';
import { ClustersPanel } from '../components/admin/rotas/ClustersPanel';
import { BlocosPanel } from '../components/admin/rotas/BlocosPanel';
import { RoteirosPanel } from '../components/admin/rotas/RoteirosPanel';
import { AgendaPanel } from '../components/admin/rotas/AgendaPanel';
import { DensidadePanel } from '../components/admin/rotas/DensidadePanel';
import { LeituraPlanilhaPanel } from '../components/admin/rotas/LeituraPlanilhaPanel';
import { RotasProvider } from '../contexts/RotasContext';
import MiniMapBrasil from '../components/admin/MiniMapBrasil';
import UserProfileManager from '../components/admin/users/UserProfileManager';
import { SocialFeedPanel } from '../components/admin/SocialFeedPanel';
import SpaceButton from '../components/admin/SpaceButton';

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface Representative {
  code: string;
  name: string;
  fullName: string;
  isVago: boolean;
  colorIndex: number;
  email?: string;
  contato?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  comissao?: number;
  _count?: { clientes: number; territories: number; };
}
interface Territory { id: number; municipio: string; uf: string; repCode: string; modo: string; }
interface SystemUser { id: number; username: string; role: string; repCode: string | null; code?: string; fullName?: string; full_name?: string; document?: string; cpf_cnpj?: string; documentType?: 'cpf' | 'cnpj'; companyName?: string; company_name?: string; birth_date?: string; birthDate?: string; telefone?: string; email?: string; photo?: string; cargo?: string; groupId?: number; last_active?: string; tipo?: string; }
interface InterestRequest { id: number; nome: string; email: string | null; telefone: string | null; empresa: string | null; municipio: string; uf: string; modo: string | null; observacoes: string | null; status: 'pending' | 'accepted' | 'rejected'; created_at: string; userId?: number; repCode?: string; }

interface Group { id: string; name: string; repCodes: string[]; createdAt: string; }
interface Notification { id: string; title: string; message: string; targetAll: boolean; targetReps: string[]; sentAt: string; readBy: string[]; }
interface AuditLog { id: string; action: string; entity: string; entityId: string; details: string; repCode?: string; uf?: string; municipio?: string; performedBy: string; timestamp: string; }
interface ModulePermission { userId: number; moduleId: string; canView: boolean; canEdit: boolean; }

type TabId = 'comunidade' | 'dashboard' | 'users' | 'reps' | 'territories' | 'groups' | 'notifications' | 'audit' | 'interests' | 'personal' | 'rotas' | 'baserotas' | 'clusters' | 'blocos' | 'roteiros' | 'agenda' | 'densidade' | 'leituraplanilha';

interface NavItem {
  id: TabId | 'settings' | 'rotas_menu' | 'users_menu';
  label: string;
  icon: React.ElementType;
  count?: number;
  badge?: boolean;
  restrict?: string[];
  subItems?: { id: TabId; label: string; icon: React.ElementType; count?: number; }[];
}

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';
const IBGE = 'https://servicodados.ibge.gov.br/api/v1/localidades';

// ─── localStorage helpers ─────────────────────────────────────────────────────
const LS = {
  get: <T,>(key: string, def: T): T => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: <T,>(key: string, val: T) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ } },
};

// ─── CPF / CNPJ mask ─────────────────────────────────────────────────────────
function maskDoc(val: string, type: 'cpf' | 'cnpj') {
  const d = val.replace(/\D/g, '');
  if (type === 'cpf') {
    return d.slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, e) => e ? `${a}.${b}.${c}-${e}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a);
  }
  return d.slice(0, 14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, a, b, c, e, f) => f ? `${a}.${b}.${c}/${e}-${f}` : e ? `${a}.${b}.${c}/${e}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a);
}

// ─── SearchableSelect ─────────────────────────────────────────────────────────
function SearchableSelect({ options, value, onChange, placeholder, disabled = false, loading = false }:
  { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; placeholder: string; disabled?: boolean; loading?: boolean; }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = React.useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => query ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase())) : options, [options, query]);
  const selected = options.find(o => o.value === value);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  return (
    <div ref={ref} className="relative">
      <button type="button" disabled={disabled || loading} onClick={() => { setOpen(!open); setQuery(''); }}
        className={`w-full flex items-center justify-between px-3 py-2.5 bg-background border rounded-md text-sm transition-colors ${disabled || loading ? 'opacity-50 cursor-not-allowed border-border' : 'border-input hover:border-primary/50 cursor-pointer'} ${open ? 'ring-1 ring-primary border-primary/50' : ''}`}>
        <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>{loading ? 'Carregando...' : (selected ? selected.label : placeholder)}</span>
        {loading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-background rounded border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? <li className="py-4 text-center text-xs text-muted-foreground">Nenhum resultado</li> :
              filtered.map(opt => (
                <li key={opt.value}>
                  <button type="button" className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center gap-2 ${opt.value === value ? 'text-primary bg-primary/5' : 'text-foreground'}`}
                    onClick={() => { onChange(opt.value); setOpen(false); setQuery(''); }}>
                    {opt.value === value && <Check className="w-3.5 h-3.5 shrink-0" />}
                    <span className={opt.value === value ? '' : 'pl-5'}>{opt.label}</span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Custom Select (No Search) ────────────────────────────────────────────────
function CustomSelect({ options, value, onChange, placeholder, disabled = false, className = '' }:
  { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; placeholder: string; disabled?: boolean; className?: string; }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const selected = options.find(o => String(o.value) === String(value));
  
  useEffect(() => { 
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; 
    document.addEventListener('mousedown', h); 
    return () => document.removeEventListener('mousedown', h); 
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button 
        type="button" 
        disabled={disabled} 
        onClick={() => setOpen(!open)}
        className={`w-full h-10 flex items-center justify-between px-3 py-2 bg-background border rounded-md text-sm transition-colors ${disabled ? 'opacity-50 cursor-not-allowed border-border' : 'border-border/50 hover:border-primary/50 cursor-pointer'} ${open ? 'ring-1 ring-primary border-primary/50' : ''}`}
      >
        <span className={selected ? 'text-foreground font-medium' : 'text-muted-foreground'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      
      {open && (
        <div className="absolute z-[100] w-full mt-1 bg-popover/95 backdrop-blur-md border border-border shadow-2xl rounded-md overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <ul className="max-h-60 overflow-y-auto py-1">
            {options.map(opt => (
              <li key={opt.value}>
                <button 
                  type="button" 
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary/80 flex items-center justify-between transition-colors ${String(opt.value) === String(value) ? 'text-primary bg-primary/10 font-bold' : 'text-foreground'}`}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                >
                  <span>{opt.label}</span>
                  {String(opt.value) === String(value) && <Check className="w-4 h-4" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── MultiSelect for reps ─────────────────────────────────────────────────────
function MultiRepSelect({ reps, value, onChange }: { reps: Representative[]; value: string[]; onChange: (v: string[]) => void; }) {
  const toggle = (code: string) => onChange(value.includes(code) ? value.filter(c => c !== code) : [...value, code]);
  return (
    <div className="border border-border rounded-md max-h-44 overflow-y-auto">
      {reps.map(r => (
        <label key={r.code} className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/40 cursor-pointer">
          <input type="checkbox" className="rounded" checked={value.includes(r.code)} onChange={() => toggle(r.code)} />
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: getRepColor(r) }} />
          <span className="text-sm">{r.code} — {r.name}</span>
        </label>
      ))}
    </div>
  );
}

function ColorPicker({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 p-2 bg-secondary/10 rounded-lg border border-border/40">
      {Object.entries(REP_COLOR_PALETTE).map(([idx, color]) => (
        <button
          key={idx}
          type="button"
          disabled={disabled}
          onClick={() => onChange(Number(idx))}
          className={`w-6 h-6 rounded-full border-2 transition-all ${Number(idx) === value ? 'border-primary ring-2 ring-primary/20 scale-110 shadow-sm' : 'border-transparent hover:scale-110 opacity-60 hover:opacity-100'}`}
          style={{ background: color }}
          title={`Cor ${idx}`}
        />
      ))}
    </div>
  );
}

export default function Admin() {
  const { token, logout, repCode: myRepCode, userId, tokenVersion } = useAuth();
  const navigate = useNavigate();

  // Security: redirect if no token
  useEffect(() => {
    if (!token) navigate('/login');
  }, [token, navigate]);

  // ── Core API data ──────────────────────────────────────────────────────────
  const [reps, setReps] = useState<Representative[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [interests, setInterests] = useState<InterestRequest[]>([]);
  const [clientes, setClientes] = useState<ClienteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);


  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('comunidade');
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  // ── Brand / Personalização ────────────────────────────────────────────────
  const [brandLogo, setBrandLogo] = useState<string>(() => localStorage.getItem('brand_logo') || '/Logo.png');
  const [brandName, setBrandName] = useState<string>(() => localStorage.getItem('brand_name') || 'Mapa Território');
  const [brandNameDraft, setBrandNameDraft] = useState<string>(() => localStorage.getItem('brand_name') || 'Mapa Território');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione um arquivo de imagem'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagem muito grande (máx. 2 MB)'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      setBrandLogo(b64);
      localStorage.setItem('brand_logo', b64);
      toast.success('Logo atualizada com sucesso!');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBrandName = () => {
    const name = brandNameDraft.trim() || 'Mapa Território';
    setBrandName(name);
    localStorage.setItem('brand_name', name);
    toast.success('Nome da empresa salvo!');
  };

  const handleRemoveLogo = () => {
    setBrandLogo('');
    localStorage.removeItem('brand_logo');
    toast.success('Logo removida');
  };

  // ── LocalStorage state ────────────────────────────────────────────────────
  const [groups, setGroups] = useState<Group[]>(() => LS.get('admin_groups', []));
  const [notifications, setNotifications] = useState<Notification[]>(() => LS.get('admin_notifications', []));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => LS.get('admin_audit', []));

  const saveGroups = (g: Group[]) => { setGroups(g); LS.set('admin_groups', g); };
  const saveNotifications = (n: Notification[]) => { setNotifications(n); LS.set('admin_notifications', n); };
  const saveAuditLogs = (a: AuditLog[]) => { setAuditLogs(a); LS.set('admin_audit', a); };

  // ── Auth & Permissions ──────────────────────────────────────────────────
  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-user-token-version': String(tokenVersion || 0)
  }), [token, tokenVersion]);

  const [myPermissions, setMyPermissions] = useState<ModulePermission[]>([]);
  const fetchMyPermissions = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${API}/api/admin/users/${userId}/permissions`, { headers: authHeaders });
      if (res.ok) setMyPermissions(await res.json());
    } catch (error) { console.error('Error fetching permissions', error); }
  }, [userId, authHeaders]);

  const canAccess = (moduleId: string) => {
    if (role === 'admin') return true;
    const p = myPermissions.find(p => p.moduleId === moduleId);
    return p?.canView || false;
  };

  // ── Dashboard filters ─────────────────────────────────────────────────────
  const [dashFilterRep, setDashFilterRep] = useState('');
  const [dashFilterUF, setDashFilterUF] = useState('');
  const [dashFilterModo, setDashFilterModo] = useState('');
  const [dashSearch, setDashSearch] = useState('');

  const addAudit = useCallback((action: string, entity: string, entityId: string, details: string, extra?: Partial<AuditLog>) => {
    const entry: AuditLog = { id: Date.now().toString(), action, entity, entityId, details, performedBy: 'admin', timestamp: new Date().toISOString(), ...extra };
    const updated = [entry, ...LS.get<AuditLog[]>('admin_audit', [])].slice(0, 200);
    saveAuditLogs(updated);
  }, []);

  // ── Confirm dialog ─────────────────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({ open: false, title: '', description: '', onConfirm: () => { } });
  const openConfirm = useCallback((title: string, description: string, onConfirm: () => void) => setConfirmDialog({ open: true, title, description, onConfirm }), []);
  const closeConfirm = useCallback(() => setConfirmDialog(d => ({ ...d, open: false })), []);

  // ── Reps form ──────────────────────────────────────────────────────────────
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', fullName: '', isVago: false, colorIndex: 1, email: '', contato: '',
    endereco: '', bairro: '', cidade: '', uf: '', cep: '', comissao: ''
  });
  const [newRep, setNewRep] = useState({
    userId: '', code: '', name: '', fullName: '', isVago: false, colorIndex: 1, email: '', contato: '',
    endereco: '', bairro: '', cidade: '', uf: '', cep: '', comissao: ''
  });

  const [newUser, setNewUser] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    role: 'user' as 'user' | 'supervisor' | 'admin',
    repCode: '', code: '', documentType: 'cpf' as 'cpf' | 'cnpj',
    document: '', companyName: '', birthDate: '', telefone: '', photo: '',
    cargo: '', groupId: '', tipo: 'normal' as 'normal' | 'representante' | 'promotor' | 'supervisor', colorIndex: 0
  });
  const [groupsData, setGroupsData] = useState<{ id: number, name: string }[]>([]);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    username: '', fullName: '', document: '', password: '', confirmPassword: '',
    role: 'user' as 'user' | 'supervisor' | 'admin',
    repCode: '', code: '', photo: '', telefone: '', birthDate: '',
    cargo: '', companyName: '', groupId: ''
  });
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRepModalOpen, setIsRepModalOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userFilterOnline, setUserFilterOnline] = useState(false);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const name = (u.full_name || u.fullName || u.username).toLowerCase();
      const email = u.username.toLowerCase();
      const search = userSearch.toLowerCase();

      const matchesSearch = name.includes(search) || email.includes(search);
      if (!matchesSearch) return false;

      if (userFilterOnline) {
        const rawLastActive = u.last_active || (u as SystemUser & { lastActive?: string }).lastActive;
        const lastDate = rawLastActive ? new Date(rawLastActive) : null;
        const isOnline = (u.id === userId) || (lastDate && !isNaN(lastDate.getTime()) && (Date.now() - lastDate.getTime()) < 300000);
        return isOnline;
      }

      return true;
    });
  }, [users, userSearch, userFilterOnline, userId]);

  const handleUserPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Foto deve ter no máximo 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      if (isEdit) setEditUserForm(f => ({ ...f, photo: b64 }));
      else setNewUser(f => ({ ...f, photo: b64 }));
    };
    reader.readAsDataURL(file);
  };

  // ── Territories form ──────────────────────────────────────────────────────
  const [selectedUF, setSelectedUF] = useState('');
  const [selectedMunicipio, setSelectedMunicipio] = useState('');
  const [selectedMunicipioName, setSelectedMunicipioName] = useState('');
  const [includeBairro, setIncludeBairro] = useState(false);
  const [selectedBairro, setSelectedBairro] = useState('');
  const [selectedRep, setSelectedRep] = useState('');
  const [selectedModo, setSelectedModo] = useState<'planejamento' | 'atendimento'>('planejamento');
  const [municipios, setMunicipios] = useState<{ id: number; nome: string }[]>([]);
  const [subdistritos, setSubdistritos] = useState<{ id: number; nome: string }[]>([]);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [loadingSubdistritos, setLoadingSubdistritos] = useState(false);
  const [staged, setStaged] = useState<Array<{ municipio: string; uf: string; bairro?: string; repCode: string; modo: string }>>([]);
  const [filterUF, setFilterUF] = useState('');
  const [filterRep, setFilterRep] = useState('');

  // ── Groups form ────────────────────────────────────────────────────────────
  const [newGroupName, setNewGroupName] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [groupAddReps, setGroupAddReps] = useState<string[]>([]);

  // ── Notifications form ─────────────────────────────────────────────────────
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTargetAll, setNotifTargetAll] = useState(true);
  const [notifTargetReps, setNotifTargetReps] = useState<string[]>([]);

  // ── Audit filters ──────────────────────────────────────────────────────────
  const [auditFilterRep, setAuditFilterRep] = useState('');
  const [auditFilterAction, setAuditFilterAction] = useState('');
  const [auditFilterUF, setAuditFilterUF] = useState('');


  // ── Fetch all API data ─────────────────────────────────────────────────────
  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/groups`, { headers: authHeaders });
      if (res.ok) setGroupsData(await res.json());
    } catch (error) { console.error('Error fetching groups:', error); }
  }, [authHeaders]);

  const fetchAll = useCallback(async () => {
    if (!initialLoadDone) setLoading(true);
    try {
      const [rR, tR, uR, iR, cR] = await Promise.all([
        fetch(`${API}/api/admin/reps`, { headers: authHeaders }),
        fetch(`${API}/api/admin/territories`, { headers: authHeaders }),
        fetch(`${API}/api/admin/users`, { headers: authHeaders }),
        fetch(`${API}/api/interest`, { headers: authHeaders }),
        fetch(`${API}/api/clientes`, { headers: authHeaders }),
      ]);

      const responses = [rR, tR, uR, iR, cR];
      const unauth = responses.find(r => r.status === 401);
      if (unauth) {
        toast.error('Sessão encerrada ou inválida. Faça login novamente.');
        logout();
        return;
      }

      if (rR.ok && tR.ok && uR.ok && iR.ok && cR.ok) {
        setReps(await rR.json());
        setTerritories(await tR.json());
        setUsers(await uR.json());
        setInterests(await iR.json());
        setClientes(await cR.json());
      }
      // Also fetch groups
      await fetchGroups();
    } catch (error) {
      console.error('Fetch error:', error);
    } finally { 
      setLoading(false); 
      setInitialLoadDone(true);
    }
  }, [authHeaders, logout, fetchGroups, initialLoadDone]);

  const handleDownloadLogisticsPlan = async () => {
    try {
      setIsGeneratingPlan(true);
      toast.info('Gerando planilha lógistica. Isso pode demorar alguns segundos...');
      const res = await fetch(`${API}/api/generate-plan`, { headers: authHeaders });
      if (!res.ok) throw new Error('Falha ao gerar o arquivo');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Planilha_Logistica.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Download da planilha concluído!');
    } catch (error) {
      toast.error('Erro ao gerar/baixar a planilha logística.');
      console.error(error);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  useEffect(() => {
    fetchAll();
    fetchMyPermissions();
  }, [fetchAll, fetchMyPermissions]); // Now includes dependencies


  useEffect(() => {
    if (!selectedUF) { setMunicipios([]); setSelectedMunicipio(''); setSelectedMunicipioName(''); return; }
    const uf = UF_DATA.find(u => u.sigla === selectedUF); if (!uf) return;
    setLoadingMunicipios(true); setSelectedMunicipio(''); setSelectedMunicipioName('');
    fetch(`${IBGE}/estados/${uf.codigo}/municipios`).then(r => r.json())
      .then(d => setMunicipios(d.sort((a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome))))
      .catch(() => toast.error('Erro ao carregar municípios')).finally(() => setLoadingMunicipios(false));
  }, [selectedUF]);

  useEffect(() => {
    if (!selectedMunicipio || !includeBairro) { setSubdistritos([]); setSelectedBairro(''); return; }
    setLoadingSubdistritos(true); setSelectedBairro('');

    const muni = municipios.find(m => String(m.id) === selectedMunicipio);
    if (!muni) { setLoadingSubdistritos(false); return; }

    // Prioridade total pros bairros do nosso banco (os brabos que a gente povoou)
    fetch(`${API}/api/location/bairros/${encodeURIComponent(muni.nome)}/${encodeURIComponent(selectedUF)}`, { headers: authHeaders })
      .then(r => r.ok ? r.json() : [])
      .then(localData => {
        if (localData && localData.length > 0) {
          setSubdistritos(localData.map((b: { id: number, bairro: string }) => ({ id: b.id, nome: b.bairro })));
          setLoadingSubdistritos(false);
        } else {
          // Se não tiver local, apela pro IBGE (URGs e afins)
          Promise.all([
            fetch(`${IBGE}/municipios/${selectedMunicipio}/subdistritos`).then(r => r.ok ? r.json() : []),
            fetch(`${IBGE}/municipios/${selectedMunicipio}/distritos`).then(r => r.ok ? r.json() : []),
          ]).then(([s, d]) => { 
            const all = [...s, ...d].sort((a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome)); 
            setSubdistritos(all); 
          })
          .catch(() => toast.error('Erro ao carregar bairros do IBGE'))
          .finally(() => setLoadingSubdistritos(false));
        }
      })
      .catch(() => {
        // Fallback rápido se o nosso servidor der ruim
        fetch(`${IBGE}/municipios/${selectedMunicipio}/subdistritos`).then(r => r.json())
          .then(d => setSubdistritos(d.sort((a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome))))
          .finally(() => setLoadingSubdistritos(false));
      });
  }, [selectedMunicipio, includeBairro, selectedUF, municipios, authHeaders]);

  // ── Options ───────────────────────────────────────────────────────────────
  const ufOptions = UF_DATA.sort((a, b) => a.nome.localeCompare(b.nome)).map(u => ({ value: u.sigla, label: `${u.sigla} — ${u.nome}` }));
  const municipioOptions = municipios.map(m => ({ value: String(m.id), label: m.nome }));
  const bairroOptions = subdistritos.map(s => ({ value: String(s.id), label: s.nome }));
  const repOptions = reps.map(r => ({ value: r.code, label: `${r.code} — ${r.name}` }));

  const handleSelectMunicipio = (id: string) => { setSelectedMunicipio(id); setSelectedMunicipioName(municipios.find(m => String(m.id) === id)?.nome || ''); };

  // ── Reps CRUD ─────────────────────────────────────────────────────────────
  const handleCreateRep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRep.code.trim() || !newRep.name.trim()) { toast.error('Código e nome obrigatórios'); return; }
    const res = await fetch(`${API}/api/admin/reps`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        ...newRep,
        fullName: newRep.fullName || newRep.name
      })
    });
    if (res.ok) {
      toast.success(`Representante ${newRep.code} cadastrado!`);
      addAudit('create_rep', 'Representante', newRep.code, `Criou rep ${newRep.code} — ${newRep.name}`);
      setNewRep({
        userId: '', code: '', name: '', fullName: '', isVago: false, colorIndex: 1, email: '', contato: '',
        endereco: '', bairro: '', cidade: '', uf: '', cep: '', comissao: ''
      });
      setIsRepModalOpen(false);
      fetchAll();
    }
    else { const err = await res.json(); toast.error(err.message || 'Erro'); }
  };

  const handleDeleteRep = (code: string, name: string) => {
    openConfirm('Remover representante', `"${name}" e todos os seus territórios serão removidos.`, async () => {
      closeConfirm();
      const res = await fetch(`${API}/api/admin/reps/${code}`, { method: 'DELETE', headers: authHeaders });
      if (res.ok) { toast.success('Removido!'); addAudit('delete_rep', 'Representante', code, `Removeu rep ${code} — ${name}`); fetchAll(); }
      else toast.error('Erro ao remover');
    });
  };

  const handleUpdateRep = async (code: string) => {
    if (!editForm.name.trim()) { toast.error('Nome obrigatório'); return; }
    const res = await fetch(`${API}/api/admin/reps/${code}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        ...editForm,
        fullName: editForm.fullName || editForm.name
      })
    });
    if (res.ok) {
      toast.success('Atualizado!');
      addAudit('update_rep', 'Representante', code, `Editou rep ${code}`);
      setEditingCode(null);
      fetchAll();
    }
    else toast.error('Erro ao atualizar');
  };

  // ── Territory CRUD ────────────────────────────────────────────────────────
  const handleAddToStaged = () => {
    if (!selectedUF || !selectedMunicipioName || !selectedRep) { toast.error('Selecione estado, município e representante'); return; }
    if (staged.find(s => s.municipio === selectedMunicipioName && s.uf === selectedUF && s.repCode === selectedRep && s.modo === selectedModo)) { toast.warning('Já na lista'); return; }
    setStaged(prev => [...prev, { municipio: selectedMunicipioName, uf: selectedUF, bairro: includeBairro && selectedBairro ? subdistritos.find(s => String(s.id) === selectedBairro)?.nome : undefined, repCode: selectedRep, modo: selectedModo }]);
    setSelectedMunicipio(''); setSelectedMunicipioName(''); setSelectedBairro('');
    toast.success('Adicionado!');
  };

  const handleConfirmStaged = async () => {
    if (!staged.length) { toast.error('Nada para confirmar'); return; }
    let ok = 0, fail = 0;
    for (const item of staged) {
      const res = await fetch(`${API}/api/admin/territories`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ municipio: item.municipio, uf: item.uf, repCode: item.repCode, modo: item.modo }) });
      if (res.ok) { ok++; addAudit('assign_territory', 'Território', item.municipio, `Atribuiu ${item.municipio}/${item.uf} ÔåÆ ${item.repCode}`, { repCode: item.repCode, uf: item.uf, municipio: item.municipio }); }
      else fail++;
    }
    if (ok) toast.success(`${ok} território(s) atribuído(s)!`);
    if (fail) toast.error(`${fail} falhou`);
    setStaged([]); fetchAll();
  };

  const handleDeleteTerritory = async (id: number, municipio: string, repCode: string, uf: string) => {
    const res = await fetch(`${API}/api/admin/territories/${id}`, { method: 'DELETE', headers: authHeaders });
    if (res.ok) { toast.success(`${municipio} removido!`); addAudit('delete_territory', 'Território', String(id), `Removeu ${municipio}/${uf}`, { repCode, uf, municipio }); fetchAll(); }
    else toast.error('Erro');
  };

  const filteredTerritories = territories.filter(t => {
    if (filterUF && !t.uf.toLowerCase().includes(filterUF.toLowerCase())) return false;
    if (filterRep && t.repCode !== filterRep) return false;
    return true;
  });

  // ── Users CRUD ────────────────────────────────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.fullName.trim() || !newUser.password.trim() || !newUser.code.trim()) {
      toast.error('Código, Nome e Senha são obrigatórios'); return;
    }
    if (newUser.password !== newUser.confirmPassword) { toast.error('As senhas não coincidem!'); return; }

    const body: Record<string, string | number | null | boolean> = {
      code: newUser.code,
      full_name: newUser.fullName,
      username: newUser.email || newUser.code,
      password: newUser.password,
      role: 'user', // Default per specification
      tipo: 'cliente',
      repCode: newUser.repCode || null,
      telefone: newUser.telefone,
      cpf_cnpj: newUser.document,
      birth_date: newUser.birthDate || null,
      cargo: newUser.cargo,
      company_name: newUser.companyName,
      groupId: newUser.groupId ? Number(newUser.groupId) : null,
      photo: newUser.photo || null
    };

    try {
      const res = await fetch(`${API}/api/admin/users`, { method: 'POST', headers: authHeaders, body: JSON.stringify(body) });
      if (res.ok) {
        toast.success(`Usuário "${newUser.fullName}" criado!`);
        addAudit('create_user', 'Usuário', newUser.code, `Criou usuário ${newUser.fullName} (${newUser.code})`);
        setNewUser({
          fullName: '', email: '', password: '', confirmPassword: '',
          role: 'user', repCode: '', code: '', documentType: 'cpf',
          document: '', companyName: '', birthDate: '', telefone: '', photo: '',
          cargo: '', groupId: '', tipo: 'normal', colorIndex: 0
        });
        setIsUserModalOpen(false);
        fetchAll();
      }
      else { const err = await res.json(); toast.error(err.message || 'Erro'); }
    } catch (err) {
      toast.error('Erro ao criar usuário');
    }
  };

  const handleDeleteUser = (id: number, username: string) => {
    openConfirm('Remover usuário', `"${username}" perderá acesso imediatamente.`, async () => {
      closeConfirm();
      const res = await fetch(`${API}/api/admin/users/${id}`, { method: 'DELETE', headers: authHeaders });
      if (res.ok) { toast.success('Usuário removido!'); addAudit('delete_user', 'Usuário', String(id), `Removeu usuário ${username}`); fetchAll(); }
      else { const err = await res.json(); toast.error(err.message || 'Erro'); }
    });
  };

  const handleUpdateUser = async (id: number) => {
    if (!editUserForm.username.trim()) { toast.error('Email (Username) obrigatório'); return; }
    if (editUserForm.password && editUserForm.password !== editUserForm.confirmPassword) { toast.error('As senhas não coincidem!'); return; }
    const body: Record<string, string> = { username: editUserForm.username, role: editUserForm.role, repCode: editUserForm.repCode, full_name: editUserForm.fullName };
    if (editUserForm.password.trim()) body.password = editUserForm.password;
    if (editUserForm.photo) body.photo = editUserForm.photo;
    const res = await fetch(`${API}/api/admin/users/${id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(body) });
    if (res.ok) {
      toast.success('Usuário atualizado!');
      addAudit('update_user', 'Usuário', String(id), `Atualizou usuário ${editUserForm.username}`);
      setEditingUserId(null);
      setIsUserModalOpen(false);
      fetchAll();
    }
    else { const err = await res.json(); toast.error(err.message || 'Erro'); }
  };

  const handleInterestStatus = async (id: number, status: 'accepted' | 'rejected') => {
    const res = await fetch(`${API}/api/interest/${id}/status`, { method: 'PUT', headers: authHeaders, body: JSON.stringify({ status }) });
    if (res.ok) { toast.success(status === 'accepted' ? 'Aceito!' : 'Recusado'); addAudit(status === 'accepted' ? 'accept_interest' : 'reject_interest', 'Interesse', String(id), `${status === 'accepted' ? 'Aceitou' : 'Recusou'} interesse #${id}`); fetchAll(); }
    else toast.error('Erro');
  };

  const handleKickUser = async (user: SystemUser) => {
    openConfirm('Derrubar Sessão', `Tem certeza que deseja encerrar a sessão de ${user.full_name || user.fullName || user.username}? O usuário será desconectado imediatamente.`, async () => {
      closeConfirm();
      const res = await fetch(`${API}/api/admin/users/${user.id}/kick`, { method: 'POST', headers: authHeaders });
      if (res.ok) {
        toast.success(`Sessão de ${user.username} encerrada!`);
        fetchAll();
      } else {
        toast.error('Erro ao derrubar sessão');
      }
    });
  };

  // ── Groups CRUD ───────────────────────────────────────────────────────────
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) { toast.error('Nome do grupo obrigatório'); return; }
    const g: Group = { id: Date.now().toString(), name: newGroupName.trim(), repCodes: [], createdAt: new Date().toISOString() };
    saveGroups([...groups, g]); addAudit('create_group', 'Grupo', g.id, `Criou grupo "${g.name}"`); setNewGroupName(''); toast.success('Grupo criado!');
  };

  const handleDeleteGroup = (g: Group) => {
    openConfirm('Remover grupo', `O grupo "${g.name}" será removido.`, () => { closeConfirm(); saveGroups(groups.filter(x => x.id !== g.id)); addAudit('delete_group', 'Grupo', g.id, `Removeu grupo "${g.name}"`); toast.success('Grupo removido!'); });
  };

  const handleSaveGroupReps = (groupId: string) => {
    saveGroups(groups.map(g => g.id === groupId ? { ...g, repCodes: groupAddReps } : g));
    addAudit('update_group', 'Grupo', groupId, `Atualizou membros do grupo`);
    setExpandedGroup(null); toast.success('Grupo atualizado!');
  };

  // ── Notifications ─────────────────────────────────────────────────────────
  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) { toast.error('Título e mensagem obrigatórios'); return; }
    if (!notifTargetAll && !notifTargetReps.length) { toast.error('Selecione ao menos um representante'); return; }
    const n: Notification = { id: Date.now().toString(), title: notifTitle.trim(), message: notifMessage.trim(), targetAll: notifTargetAll, targetReps: notifTargetAll ? [] : notifTargetReps, sentAt: new Date().toISOString(), readBy: [] };
    saveNotifications([n, ...notifications]);
    addAudit('send_notification', 'Notificação', n.id, `Enviou "${n.title}" para ${notifTargetAll ? 'todos' : n.targetReps.join(',')}`);
    setNotifTitle(''); setNotifMessage(''); setNotifTargetReps([]); setNotifTargetAll(true);
    toast.success('Notificação enviada!');
  };

  // ── Audit filter ──────────────────────────────────────────────────────────
  const filteredAudit = auditLogs.filter(a => {
    if (auditFilterRep && a.repCode !== auditFilterRep) return false;
    if (auditFilterUF && a.uf !== auditFilterUF) return false;
    if (auditFilterAction && a.action !== auditFilterAction) return false;
    return true;
  });

  const auditActionLabel: Record<string, string> = {
    create_user: 'Criou usuário', delete_user: 'Removeu usuário', update_user: 'Editou usuário',
    create_rep: 'Criou rep.', delete_rep: 'Removeu rep.', update_rep: 'Editou rep.',
    assign_territory: 'Atribuiu território', delete_territory: 'Removeu território',
    create_group: 'Criou grupo', delete_group: 'Removeu grupo', update_group: 'Editou grupo',
    send_notification: 'Enviou notificação', accept_interest: 'Aceitou interesse', reject_interest: 'Recusou interesse',
  };


  const pendingInterests = interests.filter(i => i.status === 'pending').length;

  // Current user info for sidebar profile
  const { userName: authUserName } = useAuth();
  const currentUser = users.find(u => u.id === userId);
  const displayName = authUserName || currentUser?.full_name || currentUser?.fullName || currentUser?.username || 'Admin';
  const displayEmail = currentUser?.username || '';
  const displayPhoto = currentUser?.photo || '';

  const navItems: NavItem[] = [
    { id: 'comunidade' as const, label: 'Comunidade', icon: Users, restrict: ['admin', 'supervisor', 'representante'] },
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard, restrict: ['admin', 'supervisor', 'representante'] },
    {
      id: 'users_menu' as const, label: 'Usuários', icon: UsersRound, restrict: ['admin', 'supervisor'], subItems: [
        { id: 'users' as const, label: 'Lista de Usuários', icon: UserPlus, count: users.length },
        { id: 'reps' as const, label: 'Representantes', icon: Briefcase, count: reps.length },
        { id: 'groups' as const, label: 'Grupos', icon: UsersRound, count: groups.length },
      ]
    },
    { id: 'baserotas' as const, label: 'Base Cliente', icon: Database, restrict: ['admin', 'supervisor'] },
    { id: 'territories' as const, label: 'Territórios', icon: MapPin, count: territories.length, restrict: ['admin', 'supervisor'] },
    {
      id: 'rotas_menu' as const, label: 'Planejamento de Áreas', icon: Truck, restrict: ['admin', 'supervisor'], subItems: [
        { id: 'leituraplanilha' as const, label: 'Leitura Excel', icon: FileSpreadsheet },
        { id: 'clusters' as const, label: 'Clusters', icon: Layers },
        { id: 'blocos' as const, label: 'Blocos', icon: Grid3X3 },
        { id: 'roteiros' as const, label: 'Roteiros', icon: Map },
        { id: 'agenda' as const, label: 'Agenda', icon: Calendar },
        { id: 'densidade' as const, label: 'Densidade', icon: Activity },
      ]
    },
    { id: 'interests' as const, label: 'Interesses', icon: HandHeart, count: pendingInterests, badge: pendingInterests > 0, restrict: ['admin'] },
    { id: 'notifications' as const, label: 'Enviar Alerta', icon: Bell, count: notifications.length, restrict: ['admin'] },
    {
      id: 'settings' as const, label: 'Configurações', icon: Settings, restrict: ['admin'], subItems: [
        { id: 'personal' as const, label: 'Personalização', icon: Palette },
        { id: 'audit' as const, label: 'Auditoria', icon: ScrollText, count: auditLogs.length },
      ]
    }
  ].filter(item => {
    // If it's a core section (like dashboard), allow or check specific permission if needed
    if (item.id === 'dashboard') return true;

    // Check role-based restriction first
    if (item.restrict && !item.restrict.includes(role || '')) return false;

    // Check modular permission for specific areas
    const moduleMap: Record<string, string> = {
      'baserotas': 'clientes',
      'reps': 'reps',
      'territories': 'territories',
      'rotas_menu': 'routes',
      'users_menu': 'users',
      'interests': 'interests',
      'notifications': 'notifications',
      'audit': 'audit',
      'users': 'users'
    };

    const moduleId = moduleMap[item.id as string];
    if (moduleId && role !== 'admin') {
      return canAccess(moduleId);
    }

    return true;
  });

  // Update activeTab if current one is restricted after permissions load
  useEffect(() => {
    if (loading || role === 'admin') return;

    const isCurrentTabRestricted = !navItems.some(item => {
      if (item.id === activeTab) return true;
      if (item.subItems?.some(s => s.id === activeTab)) return true;
      return false;
    });

    if (isCurrentTabRestricted && navItems.length > 0) {
      const firstPermitted = navItems[0].subItems ? navItems[0].subItems[0].id : navItems[0].id;
      setActiveTab(firstPermitted as TabId);
    }
  }, [myPermissions, loading, navItems, activeTab, role]);

  // Find active tab label for header
  const findActiveLabel = () => {
    for (const item of navItems) {
      if (item.id === activeTab) return { label: item.label, icon: item.icon };
      if (item.subItems) {
        const sub = item.subItems.find(s => s.id === activeTab);
        if (sub) return { label: sub.label, icon: sub.icon };
      }
    }
    return null;
  };
  const activeNavInfo = findActiveLabel();

  if (loading) return (
    <div className="admin-layout items-center justify-center">
      <Loader />
    </div>
  );

  return (<>
    <ConfirmDialog open={confirmDialog.open} title={confirmDialog.title} description={confirmDialog.description} confirmLabel="Confirmar" onConfirm={confirmDialog.onConfirm} onCancel={closeConfirm} />

    <div className="admin-layout">

      {/* ━━ SIDEBAR ━━ */}
      <aside className="admin-sidebar">


        {/* User Profile */}
        <div className="admin-sidebar-profile">
          <div className="admin-sidebar-avatar">
            {displayPhoto
              ? <img src={displayPhoto} alt={displayName} />
              : <User style={{ width: 28, height: 28 }} />
            }
          </div>
          <p className="admin-sidebar-username">{displayName.toUpperCase()}</p>
          {displayEmail && <p className="admin-sidebar-email">{displayEmail}</p>}
        </div>

        {/* Navigation */}
        <nav className="admin-sidebar-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            const isParentActive = item.subItems?.some(s => s.id === activeTab);
            const isDirectActive = !item.subItems && activeTab === item.id;
            const isExpanded = expandedMenus.includes(item.id);

            const itemClass = [
              'admin-nav-item',
              isDirectActive ? 'active' : '',
              isParentActive ? 'parent-active' : '',
            ].filter(Boolean).join(' ');

            return (
              <div key={item.id}>
                <button
                  className={itemClass}
                  onClick={() => {
                    if (item.subItems) {
                      setExpandedMenus(prev =>
                        prev.includes(item.id) ? prev.filter(m => m !== item.id) : [...prev, item.id]
                      );
                    } else {
                      setActiveTab(item.id as TabId);
                    }
                  }}
                >
                  <Icon className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                  {item.count !== undefined && (
                    <span className={`admin-nav-badge${item.badge ? ' danger' : ''}`}>{item.count}</span>
                  )}
                  {item.subItems && (
                    <ChevronDown
                      style={{ width: 14, height: 14, flexShrink: 0, opacity: 0.6 }}
                      className={`admin-chevron${isExpanded ? ' open' : ''}`}
                    />
                  )}
                </button>

                {item.subItems && isExpanded && (
                  <div className="admin-nav-subitems">
                    {item.subItems.map(sub => {
                      const SubIcon = sub.icon;
                      const subActive = activeTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          className={`admin-nav-subitem${subActive ? ' active' : ''}`}
                          onClick={() => setActiveTab(sub.id)}
                        >
                          <SubIcon className="nav-icon" />
                          <span style={{ flex: 1 }}>{sub.label}</span>
                          {sub.count !== undefined && (
                            <span className="admin-nav-badge">{sub.count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer buttons removed to move logout to navbar */}
      </aside>

      {/* ━━ MAIN ━━ */}
      <div className="admin-main">

        {/* Top Header */}
        <header className="admin-header">
          <div className="admin-header-left">
            {activeNavInfo && (
              <div className="admin-header-icon">
                {React.createElement(activeNavInfo.icon, { style: { width: 17, height: 17 } })}
              </div>
            )}
            <div>
              <h1 className="admin-header-title">{activeNavInfo?.label ?? 'Painel'}</h1>
              <p className="admin-header-sub">Painel Administrativo</p>
            </div>
          </div>
          <div className="admin-header-right">
            <ThemeToggle />
            <button className="admin-header-icon-btn" onClick={fetchAll} title="Recarregar dados">
              <RefreshCw style={{ width: 15, height: 15 }} />
            </button>
            {['baserotas', 'clusters', 'blocos', 'roteiros', 'agenda', 'densidade', 'leituraplanilha'].includes(activeTab) && (
              <button
                className="admin-header-action-btn"
                onClick={handleDownloadLogisticsPlan}
                disabled={isGeneratingPlan}
              >
                {isGeneratingPlan
                  ? <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" />
                  : <Download style={{ width: 15, height: 15 }} />
                }
                {isGeneratingPlan ? 'Gerando...' : 'Gerar Plano Logístico'}
              </button>
            )}
            <SpaceButton 
              onClick={() => navigate('/mapa')} 
              label="Ver Mapa" 
            />
            {pendingInterests > 0 && (
              <div className="admin-pending-badge">
                <AlertCircle style={{ width: 13, height: 13 }} />
                <span>{pendingInterests} pendente(s)</span>
              </div>
            )}
            <button
              className="admin-header-action-btn text-destructive hover:bg-destructive/10 border-destructive/20"
              onClick={() => { logout(); navigate('/login'); }}
              title="Sair do sistema"
            >
              <LogOut style={{ width: 15, height: 15 }} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>

        <main className="admin-content">

          {/* ━━ COMUNIDADE (Social Feed) ━━ */}
          {activeTab === 'comunidade' && <SocialFeedPanel />}

          {/* ━━ DASHBOARD ━━ */}
          {activeTab === 'dashboard' && (() => {
            // ── Derived / filtered data ──────────────────────────────────────
            const filteredClientes = clientes.filter(c => {
              if (dashFilterRep && c.repCode !== dashFilterRep) return false;
              if (dashFilterUF && c.uf !== dashFilterUF) return false;
              // Ignore dashFilterModo for clients as it acts on territories mostly
              if (dashSearch) {
                const q = dashSearch.toLowerCase();
                const repName = reps.find(r => r.code === c.repCode)?.name?.toLowerCase() || '';
                if (!(c.nome_cliente || '').toLowerCase().includes(q) && !(c.cidade || '').toLowerCase().includes(q) && !(c.uf || '').toLowerCase().includes(q) && !repName.includes(q)) return false;
              }
              return true;
            });

            // Group by UF
            const byUF: Record<string, typeof filteredClientes> = {};
            for (const c of filteredClientes) {
              const uf = c.uf || 'Sem UF';
              if (!byUF[uf]) byUF[uf] = [];
              byUF[uf].push(c);
            }
            const ufEntries = Object.entries(byUF).sort((a, b) => b[1].length - a[1].length);

            // Unique UFs and reps for dropdowns
            const allUFs = [...new Set(territories.map(t => t.uf))].sort();
            const activeReps = reps.filter(r => !r.isVago);

            const clearFilters = () => { setDashFilterRep(''); setDashFilterUF(''); setDashFilterModo(''); setDashSearch(''); };
            const hasFilters = dashFilterRep || dashFilterUF || dashFilterModo || dashSearch;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>

                {/* ── FILTER BAR ── */}
                <div className="admin-card" style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: '1 1 160px', minWidth: 140 }}>
                      <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'hsl(var(--muted-foreground))' }} />
                      <input
                        value={dashSearch}
                        onChange={e => setDashSearch(e.target.value)}
                        placeholder="Buscar município, UF ou rep..."
                        style={{
                          width: '100%', paddingLeft: 32, paddingRight: 12, height: 36,
                          border: '1.5px solid hsl(var(--border))', borderRadius: 8,
                          background: 'hsl(var(--background))', color: 'hsl(var(--foreground))',
                          fontSize: '0.8rem', outline: 'none',
                        }}
                      />
                    </div>

                    {/* Rep dropdown */}
                    <select
                      value={dashFilterRep}
                      onChange={e => setDashFilterRep(e.target.value)}
                      style={{
                        height: 36, padding: '0 12px', borderRadius: 8, fontSize: '0.8rem', flex: '1 1 140px',
                        border: '1.5px solid hsl(var(--border))', background: 'hsl(var(--background))',
                        color: 'hsl(var(--foreground))', outline: 'none', cursor: 'pointer',
                      }}
                    >
                      <option value="">Todos Representantes</option>
                      {activeReps.map(r => <option key={r.code} value={r.code}>{r.code} — {r.name}</option>)}
                    </select>

                    {/* UF dropdown */}
                    <select
                      value={dashFilterUF}
                      onChange={e => setDashFilterUF(e.target.value)}
                      style={{
                        height: 36, padding: '0 12px', borderRadius: 8, fontSize: '0.8rem', flex: '1 1 110px',
                        border: '1.5px solid hsl(var(--border))', background: 'hsl(var(--background))',
                        color: 'hsl(var(--foreground))', outline: 'none', cursor: 'pointer',
                      }}
                    >
                      <option value="">Todos os Estados</option>
                      {allUFs.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>

                    {/* Modo buttons */}
                    <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1.5px solid hsl(var(--border))' }}>
                      {['', 'planejamento', 'atendimento'].map((m, i) => (
                        <button
                          key={m}
                          onClick={() => setDashFilterModo(m)}
                          style={{
                            height: 36, padding: '0 14px', fontSize: '0.75rem', fontWeight: 600,
                            background: dashFilterModo === m ? 'hsl(var(--admin-sidebar-bg))' : 'hsl(var(--background))',
                            color: dashFilterModo === m ? 'hsl(var(--admin-sidebar-accent))' : 'hsl(var(--muted-foreground))',
                            border: 'none', borderLeft: i > 0 ? '1.5px solid hsl(var(--border))' : 'none',
                            cursor: 'pointer', whiteSpace: 'nowrap',
                          }}
                        >
                          {m === '' ? 'Todos' : m === 'planejamento' ? 'Planejamento' : 'Atendimento'}
                        </button>
                      ))}
                    </div>

                    {/* Clear */}
                    {hasFilters && (
                      <button
                        onClick={clearFilters}
                        style={{
                          height: 36, padding: '0 14px', borderRadius: 8, fontSize: '0.8rem',
                          border: '1.5px solid hsl(var(--destructive) / 0.4)', color: 'hsl(var(--destructive))',
                          background: 'hsl(var(--destructive) / 0.06)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <X style={{ width: 13, height: 13 }} /> Limpar
                      </button>
                    )}
                  </div>

                  {/* Stat pills */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Clientes Fitrados', value: filteredClientes.length, color: '#EAB308', bg: '#FEFCE8' },
                      { label: 'Territórios (Global)', value: territories.length, color: '#22C55E', bg: '#F0FDF4' },
                      { label: 'Estados Visíveis', value: ufEntries.length, color: '#3B82F6', bg: '#EFF6FF' },
                      { label: 'Representantes', value: new Set(filteredClientes.map(c => c.repCode)).size, color: '#8B5CF6', bg: '#F5F3FF' },
                      { label: 'Pendentes', value: pendingInterests, color: '#F59E0B', bg: '#FFFBEB' },
                      { label: 'Usuários', value: users.length, color: '#06B6D4', bg: '#ECFEFF' },
                    ].map(s => (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 14px', borderRadius: 20, background: s.bg, border: `1.5px solid ${s.color}22` }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: s.color }}>{s.value}</span>
                        <span style={{ fontSize: '0.72rem', color: '#666', fontWeight: 500 }}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── 2-COLUMN: Results + Map ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, flex: 1, minHeight: 0 }}>

                  {/* LEFT: Territory result cards */}
                  <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {ufEntries.length === 0 ? (
                      <div className="admin-card" style={{ padding: 40, textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                        <MapPin style={{ width: 32, height: 32, margin: '0 auto 8px', opacity: 0.2 }} />
                        <p style={{ fontSize: '0.9rem' }}>Nenhum território encontrado</p>
                      </div>
                    ) : ufEntries.map(([uf, terrs]) => {
                      const uniqueReps = [...new Set(terrs.map(t => t.repCode))];
                      const modos = [...new Set(terrs.map(t => t.modo))];
                      return (
                        <div key={uf} className="admin-card" style={{ padding: 0, overflow: 'hidden', flexShrink: 0 }}>
                          {/* UF header */}
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 18px', background: 'hsl(var(--admin-sidebar-bg) / 0.04)',
                            borderBottom: '1px solid hsl(var(--admin-card-border))',
                          }}>
                            <div style={{
                              width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: 'hsl(var(--admin-sidebar-bg))', color: 'hsl(var(--admin-sidebar-accent))',
                              fontWeight: 900, fontSize: '0.95rem', letterSpacing: '0.05em', flexShrink: 0,
                            }}>
                              {uf}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>
                                {terrs.length} cliente(s) — {uniqueReps.length} rep(s)
                              </p>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{
                                  fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10, letterSpacing: '0.03em',
                                  background: 'hsl(var(--admin-sidebar-accent) / 0.13)',
                                  color: 'hsl(var(--admin-sidebar-accent))',
                                  border: '1px solid hsl(var(--admin-sidebar-accent) / 0.25)',
                                  textTransform: 'uppercase',
                                }}>
                                  PRESEN├çA ATIVA
                                </span>
                              </div>
                            </div>
                            {/* Rep avatars */}
                            <div style={{ display: 'flex', gap: -4 }}>
                              {uniqueReps.slice(0, 4).map((code, idx) => {
                                const rep = reps.find(r => r.code === code);
                                const color = rep && !rep.isVago ? REP_COLOR_PALETTE[rep.colorIndex] : 'hsl(0 0% 40%)';
                                return (
                                  <div key={code} title={rep?.name || code} style={{
                                    width: 28, height: 28, borderRadius: '50%', background: color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', fontSize: '0.65rem', fontWeight: 800,
                                    border: '2px solid hsl(var(--admin-card-bg))',
                                    marginLeft: idx > 0 ? -8 : 0, zIndex: 4 - idx,
                                    position: 'relative',
                                  }}>
                                    {(code || 'SR').substring(0, 2).toUpperCase()}
                                  </div>
                                );
                              })}
                              {uniqueReps.length > 4 && (
                                <div style={{
                                  width: 28, height: 28, borderRadius: '50%', background: 'hsl(var(--muted))',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: 'hsl(var(--muted-foreground))', fontSize: '0.6rem', fontWeight: 700,
                                  border: '2px solid hsl(var(--admin-card-bg))', marginLeft: -8, position: 'relative',
                                }}>
                                  +{uniqueReps.length - 4}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => { setDashFilterUF(uf === dashFilterUF ? '' : uf); }}
                              style={{
                                padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                                background: dashFilterUF === uf ? 'hsl(var(--admin-sidebar-accent))' : 'hsl(var(--admin-sidebar-bg))',
                                color: dashFilterUF === uf ? 'hsl(var(--admin-sidebar-bg))' : 'hsl(var(--admin-sidebar-accent))',
                                border: '1.5px solid hsl(var(--admin-sidebar-accent) / 0.4)',
                              }}
                            >
                              {dashFilterUF === uf ? 'Limpar' : 'Filtrar'}
                            </button>
                          </div>

                          {/* Municipality rows (collapsed by default, show top 5) */}
                          <div>
                            {terrs.slice(0, 5).map(c => {
                              const rep = reps.find(r => r.code === c.repCode);
                              const color = rep && !rep.isVago ? REP_COLOR_PALETTE[rep.colorIndex] : 'hsl(0 0% 40%)';
                              return (
                                <div key={c.codigo_cliente || c.id_cliente} style={{
                                  display: 'flex', alignItems: 'center', gap: 12,
                                  padding: '9px 18px', borderBottom: '1px solid hsl(var(--admin-card-border))',
                                }}>
                                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                                  <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 500 }} title={c.nome_cliente}>{c.nome_abreviado || c.nome_cliente}</span>
                                  <span style={{ fontSize: '0.72rem', color: 'hsl(var(--muted-foreground))' }}>{c.cidade}</span>
                                  <span style={{
                                    fontSize: '0.65rem', fontWeight: 700, padding: '1px 7px', borderRadius: 8,
                                    background: 'hsl(43 90% 55% / 0.12)',
                                    color: 'hsl(43 90% 38%)',
                                    textTransform: 'uppercase',
                                    minWidth: 50, textAlign: 'center'
                                  }}>
                                    {rep?.code || 'S/ REP'}
                                  </span>
                                </div>
                              );
                            })}
                            {terrs.length > 5 && (
                              <div style={{ padding: '8px 18px', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' }}>
                                + {terrs.length - 5} cliente(s) não exibido(s) — use filtro para ver todos
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* RIGHT: Mini map + legends */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Map card */}
                    <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid hsl(var(--admin-card-border))', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Map style={{ width: 14, height: 14, color: 'hsl(var(--admin-sidebar-accent))' }} />
                        <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>Mapa de Cobertura</span>
                        {dashFilterUF && (
                          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--admin-sidebar-accent))' }}>
                            Filtrado: {dashFilterUF}
                          </span>
                        )}
                      </div>
                      <div style={{ padding: '8px 8px 4px', background: 'hsl(var(--admin-sidebar-bg) / 0.03)' }}>
                        <MiniMapBrasil
                          territories={territories}
                          reps={reps}
                          filterUF={dashFilterUF}
                          filterRep={dashFilterRep}
                          onClickUF={uf => setDashFilterUF(prev => prev === uf ? '' : uf)}
                        />
                      </div>
                    </div>

                    {/* Rep legend */}
                    <div className="admin-card" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid hsl(var(--admin-card-border))', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Briefcase style={{ width: 14, height: 14, color: 'hsl(var(--admin-sidebar-accent))' }} />
                        <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>Representantes</span>
                      </div>
                      <div style={{ padding: '8px 0', maxHeight: 200, overflowY: 'auto' }}>
                        {activeReps.length === 0 ? (
                          <p style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))' }}>
                            Nenhum representante cadastrado
                          </p>
                        ) : activeReps.map(rep => {
                          const color = REP_COLOR_PALETTE[rep.colorIndex] || 'hsl(220 15% 40%)';
                          const count = clientes.filter(c => c.repCode === rep.code).length;
                          const isActive = dashFilterRep === rep.code;
                          return (
                            <button
                              key={rep.code}
                              onClick={() => setDashFilterRep(prev => prev === rep.code ? '' : rep.code)}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                padding: '7px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                                background: isActive ? `${color}18` : 'transparent',
                                transition: 'background 0.15s',
                                flexShrink: 0,
                              }}
                            >
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, border: isActive ? `2px solid ${color}` : 'none' }} />
                              <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: isActive ? 700 : 500 }}>{rep.name}</span>
                              <span style={{
                                fontSize: '0.68rem', fontWeight: 700, padding: '1px 8px', borderRadius: 10,
                                background: `${color}22`, color,
                              }}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick stats & Reports */}
                    <div className="admin-card" style={{ padding: '12px 16px' }}>
                      <div style={{ paddingBottom: 10, borderBottom: '1px solid hsl(var(--admin-card-border))', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Database style={{ width: 14, height: 14, color: 'hsl(var(--admin-sidebar-accent))' }} />
                        <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>Relatórios e Métricas</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                          { l: 'Clientes Total', v: clientes.length, t: 'baserotas' as TabId, c: '#EAB308' },
                          { l: 'Usuários', v: users.length, t: 'users' as TabId, c: '#3B82F6' },
                          { l: 'Interesses', v: interests.length, t: 'interests' as TabId, c: '#6366F1' },
                          { l: 'Grupos', v: groups.length, t: 'groups' as TabId, c: '#06B6D4' },
                        ].map(s => (
                          <button
                            key={s.l}
                            onClick={() => setActiveTab(s.t)}
                            style={{
                              padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${s.c}22`,
                              background: `${s.c}0A`, cursor: 'pointer', textAlign: 'left',
                            }}
                          >
                            <p style={{ fontWeight: 800, fontSize: '1.2rem', color: s.c }}>{s.v}</p>
                            <p style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>{s.l}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}


          {/* ━━ USU├üRIOS ━━ */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between pb-2">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Users className="w-6 h-6 text-primary" /> Gestão de Usuários
                  </h2>
                  <p className="text-sm text-muted-foreground">Controle de acesso e permissões.</p>
                </div>
                <div className="flex w-full md:w-auto items-center gap-3">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou email..."
                      className="pl-9 bg-background/50 border-border/40"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                  </div>
                  <Button
                    variant={userFilterOnline ? "default" : "outline"}
                    className={`gap-2 ${userFilterOnline ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white' : ''}`}
                    onClick={() => setUserFilterOnline(!userFilterOnline)}
                  >
                    <Activity className={`w-4 h-4 ${userFilterOnline ? 'animate-pulse' : ''}`} />
                    Online
                    {userFilterOnline && <X className="w-3 h-3 ml-1" />}
                  </Button>
                  <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => {
                    setEditingUserId(null);
                    setNewUser({
                      fullName: '', email: '', password: '', confirmPassword: '',
                      role: 'user', repCode: '', code: '', documentType: 'cpf',
                      document: '', companyName: '', birthDate: '', telefone: '', photo: '',
                      cargo: '', groupId: '', tipo: 'normal', colorIndex: 0
                    });
                    setIsUserModalOpen(true);
                  }}>
                    <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Novo Usuário</span>
                  </Button>
                </div>
              </div>

              {users.length === 0 ? (
                <Card className="border-dashed border-2 py-20 flex flex-col items-center justify-center text-muted-foreground bg-transparent">
                  <Users className="w-12 h-12 opacity-10 mb-4" /> <p>Nenhum usuário</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {filteredUsers.map(u => {
                    const rawLastActive = u.last_active || (u as SystemUser & { lastActive?: string }).lastActive;
                    const lastDate = rawLastActive ? new Date(rawLastActive) : null;
                    const isOnline = (u.id === userId) || (lastDate && !isNaN(lastDate.getTime()) && (Date.now() - lastDate.getTime()) < 300000);
                    const lastActive = (lastDate && !isNaN(lastDate.getTime())) ? lastDate : null;

                    return (
                      <Card key={u.id} className="group relative overflow-hidden border-border/40 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 transform hover:-translate-y-1">
                        <div className={`h-1.5 w-full absolute top-0 left-0 ${u.role === 'admin' ? 'bg-amber-500' : u.role === 'supervisor' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                        <CardContent className="p-5">
                          <div className="flex flex-col items-center text-center space-y-3">
                            <div className="relative">
                              <div className="w-16 h-16 rounded-2xl bg-secondary border border-border/50 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 duration-300">
                                {u.photo ? <img src={u.photo} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-muted-foreground/30" />}
                              </div>
                              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 border-card shadow-sm ${u.role === 'admin' ? 'bg-amber-500 text-white' : u.role === 'supervisor' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'}`}>
                                {u.role === 'admin' ? <ShieldCheck className="w-3" /> : u.role === 'supervisor' ? <Briefcase className="w-3" /> : <User className="w-3" />}
                              </div>
                              {/* Online/Offline status dot */}
                              <div className={`absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full border-2 border-card shadow-sm ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'}`} title={isOnline ? 'Online' : 'Offline'} />
                            </div>
                            <div className="space-y-0.5 w-full">
                              <h3 className="font-bold text-sm truncate" title={u.full_name || u.fullName || u.username}>{u.full_name || u.fullName || u.username}</h3>
                              <p className="text-[10px] text-muted-foreground truncate">{u.username}</p>
                              {!isOnline && lastActive && (
                                <p className="text-[9px] text-muted-foreground/60 italic mt-0.5">Visto em {lastActive.toLocaleDateString('pt-BR')} às {lastActive.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${u.role === 'admin' ? 'bg-amber-500/15 text-amber-500' : u.role === 'supervisor' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-blue-500/15 text-blue-500'}`}>{u.role}</span>
                              {u.repCode && <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-secondary text-muted-foreground">Rep: {u.repCode}</span>}
                            </div>
                          </div>
                          <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-border/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => {
                              setEditingUserId(u.id);
                              setEditUserForm({
                                username: u.username,
                                fullName: u.full_name || u.fullName || '',
                                document: u.document || u.cpf_cnpj || '',
                                password: '',
                                confirmPassword: '',
                                role: u.role as 'user' | 'supervisor' | 'admin',
                                repCode: u.repCode || '',
                                code: u.code || '',
                                photo: u.photo || '',
                                telefone: u.telefone || '',
                                birthDate: u.birth_date || u.birthDate || '',
                                cargo: u.cargo || '',
                                companyName: u.company_name || u.companyName || '',
                                groupId: String(u.groupId || '')
                              });
                              setIsUserModalOpen(true);
                            }}><Pencil className="w-4 h-4" /></Button>
                            {role === 'admin' && u.id !== userId && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-orange-500/10 hover:text-orange-500" title="Derrubar Sessão" onClick={() => handleKickUser(u)}><LogOut className="w-4 h-4" /></Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteUser(u.id, u.username)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
                <DialogContent className={editingUserId ? "max-w-6xl p-0 border-none bg-transparent shadow-none" : "max-w-4xl"}>
                  {editingUserId ? (
                    <>
                      <DialogHeader className="sr-only">
                        <DialogTitle>Gerenciador de Perfil - {users.find(u => u.id === editingUserId)?.full_name || 'Usuário'}</DialogTitle>
                        <DialogDescription>Configurações de perfil, permissões e histórico do usuário.</DialogDescription>
                      </DialogHeader>
                      <UserProfileManager
                        user={users.find(u => u.id === editingUserId)!}
                        reps={reps}
                        onUpdate={fetchAll}
                        onClose={() => setIsUserModalOpen(false)}
                      />
                    </>
                  ) : (
                    <>
                      <DialogHeader className="pb-3 border-b border-border/40">
                        <DialogTitle className="flex items-center gap-2 text-xl"><UserPlus className="w-5 h-5 text-primary" /> Novo Usuário</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={(e) => { handleCreateUser(e); setIsUserModalOpen(false); }} className="pt-2">
                        <div className="flex flex-col md:flex-row gap-6">
                          
                          {/* Coluna da Foto (menor) */}
                          <div className="flex flex-col items-center gap-2 w-32 shrink-0 pt-2">
                            <label className="cursor-pointer w-24 h-24 rounded-full bg-secondary border-2 border-dashed border-border/60 flex items-center justify-center overflow-hidden hover:border-primary/50 transition-all select-none group relative">
                              {newUser.photo ? (
                                <>
                                  <img src={newUser.photo} alt="Avatar" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="w-5 h-5 text-white" />
                                  </div>
                                </>
                              ) : (
                                <Camera className="w-8 h-8 text-muted-foreground opacity-40 group-hover:scale-110 transition-transform" />
                              )}
                              <input type="file" accept="image/*" className="hidden" onChange={e => handleUserPhotoUpload(e, false)} />
                            </label>
                            <div className="text-center">
                              <p className="text-[10px] font-bold text-foreground mt-1">FOTO DE PERFIL</p>
                              <p className="text-[9px] text-muted-foreground">Max 2MB</p>
                            </div>
                          </div>

                          {/* Resto do Formulário em Grid */}
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
                            
                            {/* Linha 1 */}
                            <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Código *</Label><Input value={newUser.code} onChange={e => setNewUser({ ...newUser, code: e.target.value.replace(/[^a-zA-Z0-9.-]/g, '') })} required className="h-9 text-xs" /></div>
                            <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nome Completo *</Label><Input value={newUser.fullName} onChange={e => setNewUser({ ...newUser, fullName: e.target.value })} required className="h-9 text-xs" /></div>
                            <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">E-mail</Label><Input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="h-9 text-xs" /></div>
                            
                            {/* Linha 2 */}
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">Tipo de Cadastro</Label>
                              <CustomSelect options={[ { value: 'normal', label: 'Normal' }, { value: 'representante', label: 'Representante' }, { value: 'promotor', label: 'Promotor' }, { value: 'supervisor', label: 'Supervisor' } ]} value={newUser.tipo} onChange={v => setNewUser({ ...newUser, tipo: v as typeof newUser.tipo, repCode: '', colorIndex: 0 })} placeholder="Selecione..." className="h-9" />
                            </div>
                            <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-primary">Cargo</Label><Input value={newUser.cargo} onChange={e => setNewUser({ ...newUser, cargo: e.target.value })} placeholder="Ex: Gerente" className="h-9 text-xs" /></div>
                            <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-primary">Nome da Empresa</Label><Input value={newUser.companyName} onChange={e => setNewUser({ ...newUser, companyName: e.target.value })} placeholder="Ex: Tech Soluções" className="h-9 text-xs" /></div>

                            {/* Linha 3 */}
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">Grupo</Label>
                              <CustomSelect options={[ { value: '', label: '— Nenhum —' }, ...groupsData.map(g => ({ value: String(g.id), label: g.name })) ]} value={String(newUser.groupId)} onChange={v => setNewUser({ ...newUser, groupId: v })} placeholder="Selecione..." className="h-9" />
                            </div>
                            <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Telefone</Label><Input value={newUser.telefone} onChange={e => setNewUser({ ...newUser, telefone: e.target.value })} placeholder="(00) 00000-0000" className="h-9 text-xs" /></div>
                            <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Data de Nasc.</Label><Input type="date" value={newUser.birthDate} onChange={e => setNewUser({ ...newUser, birthDate: e.target.value })} className="h-9 text-xs" /></div>

                            {/* Linha 4 */}
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tipo Doc</Label>
                              <div className="flex gap-1 h-9">
                                {(['cpf', 'cnpj'] as const).map(t => (
                                  <button key={t} type="button" onClick={() => setNewUser({ ...newUser, documentType: t, document: '' })} className={`flex-1 rounded-md text-[10px] font-bold border transition-colors ${newUser.documentType === t ? 'bg-primary border-primary text-white' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
                                    {t.toUpperCase()}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-1.5 md:col-span-2"><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{newUser.documentType.toUpperCase()} *</Label><Input value={newUser.document} onChange={e => setNewUser({ ...newUser, document: maskDoc(e.target.value, newUser.documentType) })} required className="h-9 text-xs" /></div>

                            {/* Linha 5 (Senhas) */}
                            <div className="space-y-1.5 md:col-start-1">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Senha *</Label>
                              <div className="relative">
                                <Input type={showNewPwd ? 'text' : 'password'} value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required className="h-9 text-xs pr-9" />
                                <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2" onClick={() => setShowNewPwd(!showNewPwd)}>{showNewPwd ? <EyeOff className="w-3.5 h-3.5 hover:text-primary transition-colors" /> : <Eye className="w-3.5 h-3.5 hover:text-primary transition-colors" />}</button>
                              </div>
                            </div>
                            <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Confirmar Senha *</Label><Input type={showNewPwd ? 'text' : 'password'} value={newUser.confirmPassword} onChange={e => setNewUser({ ...newUser, confirmPassword: e.target.value })} required className="h-9 text-xs" /></div>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-6 mt-4 border-t border-border/10 justify-end">
                          <Button variant="ghost" type="button" onClick={() => setIsUserModalOpen(false)} className="w-32">Cancelar</Button>
                          <Button type="submit" className="w-48 gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"><Save className="w-4 h-4" /> Cadastrar Usuário</Button>
                        </div>
                      </form>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* ━━ REPRESENTANTES ━━ */}
          {activeTab === 'reps' && (
            <div className="space-y-4">
              <Card className="border-border/40">
                <CardHeader className="pb-3 px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-primary" />
                        Representantes
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">Gerencie a equipe de representantes e suas informações de contato.</p>
                    </div>

                    <Dialog open={isRepModalOpen} onOpenChange={setIsRepModalOpen}>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <Plus className="w-4 h-4" />
                          Cadastrar Representante
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-primary" />
                            Novo Representante
                          </DialogTitle>
                          <DialogDescription>
                            Vincule um usuário do sistema para torná-lo um representante oficial.
                          </DialogDescription>
                        </DialogHeader>
                        
                        {(() => {
                          const availableUsers = users.filter(u => {
                            const hasRepLink = reps.some(r => r.code === u.code || r.code === u.repCode);
                            const isAlreadyRepRole = u.role === 'representante' || u.tipo === 'representante';
                            return !hasRepLink && !isAlreadyRepRole;
                          });

                          const usedColorIndices = reps.filter(r => !r.isVago).map(r => r.colorIndex);
                          const availableColors = Object.entries(REP_COLOR_PALETTE)
                            .filter(([idx]) => !usedColorIndices.includes(Number(idx)))
                            .map(([idx, color]) => ({ idx: Number(idx), color }));

                          return (
                            <form onSubmit={(e) => { handleCreateRep(e); }} className="space-y-6 pt-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Seleção de Usuário */}
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">Vincular Usuário *</Label>
                                  <CustomSelect 
                                    options={availableUsers.map(u => ({ 
                                      value: String(u.id), 
                                      label: `${u.code || u.username} — ${u.full_name || u.fullName || u.username}` 
                                    }))} 
                                    value={newRep.userId} 
                                    onChange={id => {
                                      const u = users.find(user => String(user.id) === id);
                                      if (u) {
                                        setNewRep({
                                          ...newRep,
                                          userId: id,
                                          code: u.code || '',
                                          name: (u.full_name || u.fullName || '').split(' ')[0] || u.username,
                                          fullName: u.full_name || u.fullName || '',
                                          email: u.email || u.username || '',
                                          contato: u.telefone || '',
                                          colorIndex: availableColors.length > 0 ? availableColors[0].idx : 1
                                        });
                                      }
                                    }} 
                                    placeholder="Selecione um usuário..." 
                                  />
                                  <p className="text-[10px] text-muted-foreground italic">Apenas usuários sem vínculo de representante aparecem aqui.</p>
                                </div>

                                {/* Seleção de Cor */}
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">Cor no Mapa *</Label>
                                  <div className="grid grid-cols-6 gap-2 p-2 bg-secondary/10 rounded-lg border border-border/40">
                                    {availableColors.length > 0 ? (
                                      availableColors.map(({ idx, color }) => (
                                        <button
                                          key={idx}
                                          type="button"
                                          onClick={() => setNewRep({ ...newRep, colorIndex: idx })}
                                          className={`w-6 h-6 rounded-full border-2 transition-all ${newRep.colorIndex === idx ? 'border-primary ring-2 ring-primary/20 scale-110 shadow-sm' : 'border-transparent hover:scale-110 opacity-60 hover:opacity-100'}`}
                                          style={{ background: color }}
                                          title={`Cor ${idx}`}
                                        />
                                      ))
                                    ) : (
                                      <p className="col-span-6 text-[10px] text-destructive font-medium p-1">Todas as cores estão em uso.</p>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground italic">Cores já utilizadas por outros representantes estão ocultas.</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 opacity-70">
                                <div className="space-y-1.5"><Label className="text-xs font-medium">Código</Label><Input disabled value={newRep.code} /></div>
                                <div className="space-y-1.5"><Label className="text-xs font-medium">Nome Curto</Label><Input disabled value={newRep.name} /></div>
                              </div>

                              <div className="flex justify-between items-center pt-4 border-t border-border/10">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className={newRep.userId && newRep.colorIndex ? "text-emerald-500 flex items-center gap-1" : "text-amber-500 flex items-center gap-1"}>
                                    {newRep.userId && newRep.colorIndex ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                    {newRep.userId && newRep.colorIndex ? "Pronto para cadastrar" : "Preencha os campos obrigatórios"}
                                  </span>
                                </div>
                                <div className="flex gap-3">
                                  <Button type="submit" disabled={!newRep.userId || !newRep.colorIndex} className="w-48 gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                    <Save className="w-4 h-4" /> Finalizar Cadastro
                                  </Button>
                                </div>
                              </div>
                            </form>
                          );
                        })()}
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {reps.length === 0 ? (
                    <div className="py-24 text-center text-muted-foreground">
                      <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-10" />
                      <p className="text-sm">Nenhum representante cadastrado</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-border/40">
                            <TableHead className="w-12 pl-6"></TableHead>
                            <TableHead className="w-24">Código</TableHead>
                            <TableHead>Representante</TableHead>
                            <TableHead>Contato</TableHead>
                            <TableHead>Localização</TableHead>
                            <TableHead className="w-24 text-center">Comissão</TableHead>
                            <TableHead className="w-24 text-center">Clientes</TableHead>
                            <TableHead className="w-24 text-center">Territórios</TableHead>
                            <TableHead className="w-20 pr-6 text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reps.map(rep => (
                            <React.Fragment key={rep.code}>
                              <TableRow className={`border-border/30 ${editingCode === rep.code ? 'bg-primary/5' : 'hover:bg-secondary/30 transition-colors'}`}>
                                <TableCell className="pl-6">
                                  <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ background: getRepColor(rep) }} />
                                </TableCell>
                                <TableCell className="font-mono text-xs font-bold text-primary">{rep.code}</TableCell>
                                <TableCell>
                                  <div className="max-w-[200px]">
                                    <p className="text-xs font-semibold truncate">{rep.name}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{rep.fullName || '—'}</p>
                                    {Boolean(rep.isVago) && <span className="text-[9px] bg-orange-500/10 text-orange-500 px-1 rounded font-bold uppercase tracking-tighter">VAGO</span>}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-0.5">
                                    {rep.email && <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Mail className="w-3 h-3 text-primary/60" />{rep.email}</div>}
                                    {rep.contato && <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Phone className="w-3 h-3 text-primary/60" />{rep.contato}</div>}
                                    {!rep.email && !rep.contato && <span className="text-[10px] text-muted-foreground/40 italic">Sem contato</span>}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {rep.cidade ? (
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                      <MapPinned className="w-3 h-3 text-primary/60" />
                                      <span>{rep.cidade}{rep.uf ? `/${rep.uf}` : ''}</span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground/40 italic">Não informada</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {rep.comissao !== null && rep.comissao !== undefined ? (
                                    <span className="text-xs font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">{rep.comissao}%</span>
                                  ) : '—'}
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className="text-xs font-bold text-emerald-600">{rep._count?.clientes || 0}</span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className="text-xs font-medium text-muted-foreground">{rep._count?.territories || 0}</span>
                                </TableCell>
                                <TableCell className="pr-6">
                                  <div className="flex gap-1 justify-end">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                                      onClick={() => editingCode === rep.code ? setEditingCode(null) : (setEditingCode(rep.code), setEditForm({
                                        name: rep.name,
                                        fullName: rep.fullName || '',
                                        isVago: !!rep.isVago,
                                        colorIndex: rep.colorIndex || 1,
                                        email: rep.email || '',
                                        contato: rep.contato || '',
                                        endereco: rep.endereco || '',
                                        bairro: rep.bairro || '',
                                        cidade: rep.cidade || '',
                                        uf: rep.uf || '',
                                        cep: rep.cep || '',
                                        comissao: rep.comissao?.toString() || ''
                                      }))}
                                    >
                                      {editingCode === rep.code ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors"
                                      onClick={() => handleDeleteRep(rep.code, rep.name)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>

                              {editingCode === rep.code && (
                                <TableRow className="bg-primary/5 border-border/30">
                                  <TableCell colSpan={9} className="py-6 px-8">
                                    <div className="space-y-4 max-w-4xl animate-in fade-in slide-in-from-top-1 duration-200">
                                      <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                                          <Pencil className="w-3 h-3" />
                                          Editando Representante: {rep.code}
                                        </h4>
                                        <div className="flex gap-2">
                                          <Button size="sm" className="gap-1.5 h-8 text-xs font-semibold" onClick={() => handleUpdateRep(rep.code)}>
                                            <Save className="w-3.5 h-3.5" /> Salvar Alterações
                                          </Button>
                                          <Button size="sm" variant="ghost" className="h-8 text-xs font-semibold" onClick={() => setEditingCode(null)}>
                                            Cancelar
                                          </Button>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Nome Curto</Label>
                                          <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="h-9 text-xs bg-background" />
                                        </div>
                                        <div className="md:col-span-2 space-y-1.5">
                                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Razão Social / Nome Completo</Label>
                                          <Input value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} className="h-9 text-xs bg-background" />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Email</Label>
                                          <Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="h-9 text-xs bg-background" />
                                        </div>
                                        <div className="space-y-1.5">
                                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Contato</Label>
                                          <Input value={editForm.contato} onChange={e => setEditForm(f => ({ ...f, contato: e.target.value }))} className="h-9 text-xs bg-background" />
                                        </div>
                                        <div className="space-y-1.5">
                                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Comissão %</Label>
                                          <Input type="number" step="0.01" value={editForm.comissao} onChange={e => setEditForm(f => ({ ...f, comissao: e.target.value }))} className="h-9 text-xs bg-background" />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-2 space-y-1.5">
                                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Endereço</Label>
                                          <Input value={editForm.endereco} onChange={e => setEditForm(f => ({ ...f, endereco: e.target.value }))} className="h-9 text-xs bg-background" />
                                        </div>
                                        <div className="space-y-1.5">
                                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Bairro</Label>
                                          <Input value={editForm.bairro} onChange={e => setEditForm(f => ({ ...f, bairro: e.target.value }))} className="h-9 text-xs bg-background" />
                                        </div>
                                        <div className="space-y-1.5">
                                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Cidade/UF</Label>
                                          <div className="flex gap-1">
                                            <Input value={editForm.cidade} onChange={e => setEditForm(f => ({ ...f, cidade: e.target.value }))} className="h-9 text-xs bg-background flex-1" />
                                            <Input value={editForm.uf} onChange={e => setEditForm(f => ({ ...f, uf: e.target.value?.toUpperCase() }))} className="h-9 text-xs bg-background w-12 text-center" maxLength={2} />
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                        <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors selection:bg-transparent">
                                          <input type="checkbox" checked={editForm.isVago} onChange={e => setEditForm(f => ({ ...f, isVago: e.target.checked }))} className="rounded border-border" />
                                          Marcar como Vago
                                        </label>

                                        <div className="flex-1 space-y-2">
                                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Escolher Cor no Mapa</Label>
                                          <ColorPicker
                                            value={editForm.colorIndex}
                                            onChange={v => setEditForm(f => ({ ...f, colorIndex: v }))}
                                            disabled={editForm.isVago}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ━━ TERRIT├ôRIOS ━━ */}
          {activeTab === 'territories' && (() => {
            const computedTerritories = (() => {
              const map = new globalThis.Map<string, { municipio: string, uf: string, repCodes: Set<string>, clientCount: number }>();
              
              // Process clients
              clientes.forEach(c => {
                if (!c.cidade || !c.uf) return;
                const city = c.cidade.trim();
                const uf = c.uf.trim().toUpperCase();
                const key = `${city}-${uf}`;

                if (!map.has(key)) map.set(key, { municipio: city, uf, repCodes: new Set(), clientCount: 0 });
                const entry = map.get(key)!;
                entry.clientCount++;
                if (c.repCode) entry.repCodes.add(c.repCode);
              });

              // Process explicit territories from database
              territories.forEach(t => {
                if (!t.municipio || !t.uf) return;
                const city = t.municipio.trim();
                const uf = t.uf.trim().toUpperCase();
                const key = `${city}-${uf}`;
                
                if (!map.has(key)) {
                  map.set(key, { municipio: city, uf, repCodes: new Set(), clientCount: 0 });
                }
                const entry = map.get(key)!;
                if (t.repCode) entry.repCodes.add(t.repCode);
              });

              return Array.from(map.values()).map((t, idx) => ({
                id: idx,
                municipio: t.municipio,
                uf: t.uf,
                repCodes: Array.from(t.repCodes),
                clientCount: t.clientCount
              })).sort((a, b) => a.uf.localeCompare(b.uf) || a.municipio.localeCompare(b.municipio));
            })();

            const allUFs = [...new Set(computedTerritories.map(t => t.uf))].sort();

            const filteredTerritories = filterUF
              ? computedTerritories.filter(t => t.uf === filterUF)
              : computedTerritories;

            return (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                {/* LISTA */}
                <div className="xl:col-span-2 space-y-4">
                  <Card className="border-border/40 flex flex-col h-full">
                    <CardHeader className="pb-3"><div className="flex items-center justify-between flex-wrap gap-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />Locais de Atuação</CardTitle><div className="flex gap-2"><div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" /><Input placeholder="Filtrar UF..." value={filterUF} onChange={e => setFilterUF(e.target.value.toUpperCase())} className="h-8 text-xs pl-7 w-28 uppercase" maxLength={2} /></div></div></div></CardHeader>
                    <CardContent className="p-0 flex-1 overflow-auto max-h-[calc(100vh-250px)]">
                      {filteredTerritories.length === 0 ? (<div className="py-16 text-center text-muted-foreground"><MapPin className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="text-sm">Nenhum território encontrado</p></div>) : (
                        <Table>
                          <TableHeader><TableRow className="hover:bg-transparent border-border/40"><TableHead className="pl-4">Município</TableHead><TableHead className="w-12">UF</TableHead><TableHead className="text-center">Clientes</TableHead><TableHead>Representantes Ativos</TableHead></TableRow></TableHeader>
                          <TableBody>{filteredTerritories.map(t => (
                            <TableRow key={t.id} className="border-border/30 hover:bg-secondary/30">
                              <TableCell className="text-xs font-medium pl-4">{t.municipio}</TableCell>
                              <TableCell className="text-xs font-mono text-muted-foreground">{t.uf}</TableCell>
                              <TableCell className="text-center"><span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t.clientCount}</span></TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {t.repCodes.length === 0 ? <span className="text-[10px] text-muted-foreground italic">Sem representante</span> : t.repCodes.map(code => {
                                    const r = reps.find(r => r.code === code);
                                    return <span key={code} className="text-[10px] px-1.5 py-0.5 rounded-md border border-border/50 bg-background/50 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ background: r && !r.isVago ? REP_COLOR_PALETTE[r.colorIndex] : '#888' }} /> {r ? r.name : code}</span>
                                  })}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}</TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
                {/* MAPA */}
                <div className="xl:col-span-1 space-y-4">
                  <Card className="border-border/40">
                    <CardHeader className="pb-3 border-b border-border/10">
                      <CardTitle className="text-sm flex items-center gap-2"><Map className="w-4 h-4 text-primary" />Mapa de Cobertura</CardTitle>
                      <CardDescription className="text-xs">Os estados pintados possuem clientes com representantes ativos.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 bg-primary/5 flex justify-center">
                      <div style={{ width: '100%', maxWidth: '350px' }}>
                        <MiniMapBrasil territories={computedTerritories.flatMap(t => t.repCodes.map(r => ({ id: t.id, municipio: t.municipio, uf: t.uf, repCode: r, modo: 'atendimento' as const })))} reps={reps} filterUF={filterUF} filterRep="" onClickUF={uf => setFilterUF(prev => prev === uf ? '' : uf)} />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="admin-card text-center py-4 rounded-xl border border-border/50 bg-card">
                      <p className="text-2xl font-black text-primary">{allUFs.length}</p>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Estados Atendidos</p>
                    </div>
                    <div className="admin-card text-center py-4 rounded-xl border border-border/50 bg-card">
                      <p className="text-2xl font-black text-primary">{computedTerritories.length}</p>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Cidades Atendidas</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ━━ GRUPOS ━━ */}
          {activeTab === 'groups' && (
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
              <div className="xl:col-span-2">
                <Card className="border-border/40">
                  <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-sm"><div className="w-7 h-7 bg-primary/15 rounded-md flex items-center justify-center"><UsersRound className="w-3.5 h-3.5 text-primary" /></div>Novo Grupo</CardTitle><CardDescription className="text-xs">Agrupe representantes por região ou critério</CardDescription></CardHeader>
                  <CardContent><form onSubmit={handleCreateGroup} className="space-y-3"><div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Nome do Grupo *</label><Input placeholder="Ex: Rio de Janeiro" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} required /></div><Button className="w-full gap-2" type="submit"><Plus className="w-4 h-4" />Criar Grupo</Button></form></CardContent>
                </Card>
              </div>
              <div className="xl:col-span-3">
                <Card className="border-border/40">
                  <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm flex items-center gap-2"><UsersRound className="w-4 h-4 text-primary" />Grupos Criados</CardTitle><span className="text-xs text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full">{groups.length} total</span></div></CardHeader>
                  <CardContent className="p-0">
                    {groups.length === 0 ? (<div className="py-16 text-center text-muted-foreground"><UsersRound className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="text-sm">Nenhum grupo criado</p></div>) : (
                      <div className="divide-y divide-border/30">{groups.map(g => (
                        <div key={g.id} className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3"><div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center"><UsersRound className="w-4 h-4 text-primary" /></div>
                              <div><p className="text-sm font-semibold">{g.name}</p><p className="text-[10px] text-muted-foreground">{g.repCodes.length} representante(s) ┬À {new Date(g.createdAt).toLocaleDateString('pt-BR')}</p></div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 hover:text-primary" onClick={() => { setExpandedGroup(expandedGroup === g.id ? null : g.id); setGroupAddReps(g.repCodes); }}><ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedGroup === g.id ? 'rotate-90' : ''}`} /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteGroup(g)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </div>
                          {expandedGroup === g.id && (<div className="mt-3 ml-11 space-y-3"><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Selecione os representantes</p><MultiRepSelect reps={reps} value={groupAddReps} onChange={setGroupAddReps} /><div className="flex gap-2"><Button size="sm" className="gap-1.5 h-7 text-xs" onClick={() => handleSaveGroupReps(g.id)}><Save className="w-3 h-3" />Salvar</Button><Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setExpandedGroup(null)}>Cancelar</Button></div></div>)}
                          {g.repCodes.length > 0 && expandedGroup !== g.id && (<div className="mt-2 ml-11 flex flex-wrap gap-1">{g.repCodes.map(code => { const r = reps.find(r => r.code === code); return r ? (<span key={code} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full font-medium text-muted-foreground">{r.code} — {r.name}</span>) : null; })}</div>)}
                        </div>
                      ))}</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ━━ NOTIFICA├çÕES ━━ */}
          {activeTab === 'notifications' && (
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
              <div className="xl:col-span-2">
                <Card className="border-border/40">
                  <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-sm"><div className="w-7 h-7 bg-primary/15 rounded-md flex items-center justify-center"><Bell className="w-3.5 h-3.5 text-primary" /></div>Enviar Mensagem</CardTitle><CardDescription className="text-xs">Envie notificações para representantes</CardDescription></CardHeader>
                  <CardContent>
                    <form onSubmit={handleSendNotification} className="space-y-3">
                      <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Título *</label><Input placeholder="Ex: Reunião amanhã" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} required /></div>
                      <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Mensagem *</label><textarea className="w-full min-h-[100px] px-3 py-2.5 bg-background border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" placeholder="Digite sua mensagem..." value={notifMessage} onChange={e => setNotifMessage(e.target.value)} required /></div>
                      <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Destinatários</label>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setNotifTargetAll(true)} className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${notifTargetAll ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}><Globe className="w-3.5 h-3.5" />Todos</button>
                          <button type="button" onClick={() => setNotifTargetAll(false)} className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${!notifTargetAll ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}><Users className="w-3.5 h-3.5" />Específicos</button>
                        </div>
                        {!notifTargetAll && (<div className="space-y-1 mt-2"><label className="text-[10px] text-muted-foreground">Selecione:</label><MultiRepSelect reps={reps} value={notifTargetReps} onChange={setNotifTargetReps} /></div>)}
                      </div>
                      <Button className="w-full gap-2" type="submit"><Send className="w-4 h-4" />Enviar Notificação</Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
              <div className="xl:col-span-3">
                <Card className="border-border/40">
                  <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" />Mensagens Enviadas</CardTitle><span className="text-xs text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full">{notifications.length} total</span></div></CardHeader>
                  <CardContent className="p-0">
                    {notifications.length === 0 ? (<div className="py-16 text-center text-muted-foreground"><Bell className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="text-sm">Nenhuma mensagem enviada</p></div>) : (
                      <div className="divide-y divide-border/30 max-h-[calc(100vh-320px)] overflow-y-auto">{notifications.map(n => (
                        <div key={n.id} className="px-4 py-3 hover:bg-secondary/20">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-foreground">{n.title}</p><p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                              <span className={`mt-1.5 inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${n.targetAll ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'}`}>{n.targetAll ? 'Todos os representantes' : `${n.targetReps.length} rep(s) específico(s)`}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{new Date(n.sentAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ))}</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ━━ AUDITORIA ━━ */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <Card className="border-border/40">
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Filter className="w-4 h-4 text-primary" />Filtros</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3 items-center">
                    <select className="h-9 px-3 bg-background border border-input rounded-md text-sm" value={auditFilterRep} onChange={e => setAuditFilterRep(e.target.value)}><option value="">Todos os Representantes</option>{reps.map(r => <option key={r.code} value={r.code}>{r.code} — {r.name}</option>)}</select>
                    <select className="h-9 px-3 bg-background border border-input rounded-md text-sm" value={auditFilterUF} onChange={e => setAuditFilterUF(e.target.value)}><option value="">Todos os Estados</option>{UF_DATA.map(u => <option key={u.sigla} value={u.sigla}>{u.sigla}</option>)}</select>
                    <select className="h-9 px-3 bg-background border border-input rounded-md text-sm" value={auditFilterAction} onChange={e => setAuditFilterAction(e.target.value)}><option value="">Todas as Ações</option>{Object.entries(auditActionLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => { setAuditFilterRep(''); setAuditFilterAction(''); setAuditFilterUF(''); }}><X className="w-3.5 h-3.5" />Limpar</Button>
                    <span className="ml-auto text-xs text-muted-foreground">{filteredAudit.length} de {auditLogs.length} registros</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/40">
                <CardContent className="p-0">
                  {filteredAudit.length === 0 ? (<div className="py-16 text-center text-muted-foreground"><ScrollText className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="text-sm">Nenhum registro encontrado</p></div>) : (
                    <div className="overflow-auto max-h-[calc(100vh-320px)]"><Table>
                      <TableHeader><TableRow className="hover:bg-transparent border-border/40"><TableHead className="pl-4">Data/Hora</TableHead><TableHead>Ação</TableHead><TableHead>Entidade</TableHead><TableHead>Detalhes</TableHead><TableHead className="w-20 pr-4">Por</TableHead></TableRow></TableHeader>
                      <TableBody>{filteredAudit.map(log => (
                        <TableRow key={log.id} className="border-border/30 hover:bg-secondary/30">
                          <TableCell className="pl-4 text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">{new Date(log.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</TableCell>
                          <TableCell><span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium whitespace-nowrap">{auditActionLabel[log.action] || log.action}</span></TableCell>
                          <TableCell className="text-xs font-medium">{log.entity}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">{log.details}</TableCell>
                          <TableCell className="text-xs text-muted-foreground pr-4">{log.performedBy}</TableCell>
                        </TableRow>
                      ))}</TableBody>
                    </Table></div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ━━ INTERESSES ━━ */}
          {activeTab === 'interests' && (
            <div className="space-y-4">
              {interests.length === 0 ? (<Card className="border-border/40"><CardContent className="py-20 text-center text-muted-foreground"><HandHeart className="w-12 h-12 mx-auto mb-4 opacity-20" /><p className="text-sm font-medium">Nenhuma solicitação recebida</p></CardContent></Card>) : (() => {
                const iGroups = [
                  { key: 'pending', label: 'Pendentes', icon: Clock, color: 'text-amber-400', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30', items: interests.filter(i => i.status === 'pending') },
                  { key: 'accepted', label: 'Aceitas', icon: CheckCircle2, color: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', items: interests.filter(i => i.status === 'accepted') },
                  { key: 'rejected', label: 'Recusadas', icon: XCircle, color: 'text-destructive', badge: 'bg-destructive/10 text-destructive border-destructive/30', items: interests.filter(i => i.status === 'rejected') },
                ].filter(g => g.items.length > 0);
                return (<div className="space-y-6">{iGroups.map(({ key, label, icon: Icon, color, badge, items }) => (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-3"><Icon className={`w-4 h-4 ${color}`} /><h3 className="text-sm font-semibold">{label}</h3><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge}`}>{items.length}</span></div>
                    <Card className="border-border/40 overflow-hidden"><Table>
                      <TableHeader><TableRow className="hover:bg-transparent border-border/40">
                        <TableHead className="pl-4">Solicitante</TableHead><TableHead>├ürea</TableHead><TableHead className="w-20">Modo</TableHead><TableHead className="w-28">Data</TableHead>
                        {key === 'pending' && <TableHead className="w-36 pr-4">Ação</TableHead>}
                      </TableRow></TableHeader>
                      <TableBody>{items.map(req => (
                        <TableRow key={req.id} className="border-border/30 hover:bg-secondary/30">
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold">{req.nome}</p>
                              {req.repCode && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono font-bold tracking-tight">{req.repCode}</span>}
                            </div>
                            <div className="flex flex-wrap gap-x-3 mt-0.5">
                              {req.empresa && <span className="text-[10px] text-muted-foreground">{req.empresa}</span>}
                              {req.email && <span className="text-[10px] text-primary/80">{req.email}</span>}
                            </div>
                            {req.observacoes && <p className="text-[10px] text-muted-foreground italic mt-1.5 border-l-2 border-primary/20 pl-2">“{req.observacoes}”</p>}
                          </TableCell>
                          <TableCell><div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-primary shrink-0" /><div><p className="text-xs font-semibold">{req.municipio}</p><p className="text-[10px] text-muted-foreground font-mono">{req.uf}</p></div></div></TableCell>
                          <TableCell>{req.modo && <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${req.modo === 'planejamento' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>{req.modo === 'planejamento' ? 'Plan.' : 'Atend.'}</span>}</TableCell>
                          <TableCell className="text-[10px] text-muted-foreground tabular-nums">{new Date(req.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</TableCell>
                          {key === 'pending' && (<TableCell className="pr-4"><div className="flex gap-1.5">
                            <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white border-0" onClick={() => handleInterestStatus(req.id, 'accepted')}><CheckCircle2 className="w-3 h-3" />Aceitar</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10" onClick={() => handleInterestStatus(req.id, 'rejected')}><XCircle className="w-3 h-3" />Recusar</Button>
                          </div></TableCell>)}
                        </TableRow>
                      ))}</TableBody>
                    </Table></Card>
                  </div>
                ))}</div>);
              })()}
            </div>
          )}

          {/* ━━ PERSONALIZA├ç├âO ━━ */}
          {activeTab === 'personal' && (
            <div className="max-w-3xl space-y-6">
              <Card className="border-border/40">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <div className="w-7 h-7 bg-primary/15 rounded-md flex items-center justify-center"><Palette className="w-3.5 h-3.5 text-primary" /></div>
                    Personalização da Marca
                  </CardTitle>
                  <CardDescription className="text-xs">Configure a identidade visual do sistema (Logo e Nome)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                  {/* Logo Upload */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground">Logo da Empresa</label>
                    <p className="text-xs text-muted-foreground">Esta logo aparecerá no menu lateral e na tela de login.</p>

                    <div className="flex items-center gap-6 mt-3">
                      <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-secondary/30 relative overflow-hidden group">
                        {brandLogo ? (
                          <>
                            <img src={brandLogo} alt="Logo" className="w-full h-full object-contain p-2" />
                            <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button variant="destructive" size="icon" className="w-8 h-8 rounded-full" onClick={handleRemoveLogo} title="Remover Logo">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <ImageOff className="w-8 h-8 mx-auto mb-1 opacity-20" />
                            <span className="text-[10px] font-medium">Sem Logo</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <input type="file" id="logo-upload" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => document.getElementById('logo-upload')?.click()}>
                          <Upload className="w-4 h-4" /> Enviar Nova Logo
                        </Button>
                        <p className="text-[10px] text-muted-foreground">Formatos suportados: PNG, JPG ou SVG. Tamanho máximo: 2MB.<br />Recomendado: Imagens com fundo transparente.</p>
                      </div>
                    </div>
                  </div>

                  <hr className="border-border/40" />

                  {/* Nome da Empresa */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground">Nome do Sistema / Empresa</label>
                    <p className="text-xs text-muted-foreground">Aparecerá junto com a logo em todo o sistema.</p>
                    <div className="flex max-w-sm gap-2">
                      <Input value={brandNameDraft} onChange={e => setBrandNameDraft(e.target.value)} placeholder="Ex: Mapa Território" className="flex-1" />
                      <Button onClick={handleSaveBrandName} className="gap-2"><Save className="w-4 h-4" /> Atualizar</Button>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </div>
          )}

          {/* ━━ BASE CLIENTE (Standalone) ━━ */}
          {activeTab === 'baserotas' && <BaseClientePanel onSwitchToReps={() => setActiveTab('reps')} />}

          {/* ━━ PLANEJAMENTO DE ÁREAS (com contexto) ━━ */}
          {['clusters', 'blocos', 'roteiros', 'agenda', 'densidade', 'leituraplanilha'].includes(activeTab) && (
            <RotasProvider>
              {activeTab === 'clusters' && <ClustersPanel />}
              {activeTab === 'blocos' && <BlocosPanel />}
              {activeTab === 'roteiros' && <RoteirosPanel />}
              {activeTab === 'agenda' && <AgendaPanel />}
              {activeTab === 'densidade' && <DensidadePanel />}
              {activeTab === 'leituraplanilha' && <LeituraPlanilhaPanel />}
            </RotasProvider>
          )}

        </main>
      </div>
    </div>
  </>);
}

