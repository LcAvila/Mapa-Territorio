import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';

const ICON_LIST = {
  User: User,
  Users: Users,
  ShieldCheck: ShieldCheck,
  ShieldAlert: ShieldAlert,
  UserCog: UserCog,
  Contact: Contact,
  Briefcase: Briefcase,
  GraduationCap: GraduationCap,
  Microscope: Microscope,
  Stethoscope: Stethoscope,
  Headset: Headset,
  Construction: Construction,
  ShoppingBag: ShoppingBag,
  Truck: Truck,
  ChefHat: ChefHat,
  Coffee: Coffee,
  Plane: Plane,
  HeartPulse: HeartPulse,
  Hammer: Hammer,
  Wrench: Wrench,
  Camera: Camera,
  MapPin: MapPin,
  Bell: Bell,
  Activity: Activity,
  Database: Database
};

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
  Database, Layers, Grid3X3, Calendar, FileSpreadsheet, Camera, Percent, Mail, Phone, MapPinned,
  Route, BarChart2, ShieldAlert, UserCog, Contact, GraduationCap, Microscope, Stethoscope, 
  Headset, Construction, ShoppingBag, ChefHat, Coffee, Plane, HeartPulse, Hammer, Wrench, LucideIcon,
  Users2
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import Loader from '@/components/Loader';
import { REP_COLOR_PALETTE, getNextColorIndex, getRepColor, type SystemUser } from '@/data/representatives';
import { UF_DATA } from '@/data/uf-codes';

import { BaseClientePanel } from '../components/admin/rotas/BaseClientePanel';
import { ClustersPanel } from '../components/admin/rotas/ClustersPanel';
import { BlocosPanel } from '../components/admin/rotas/BlocosPanel';
import { RoteirosPanel } from '../components/admin/rotas/RoteirosPanel';
import { AgendaPanel } from '../components/admin/rotas/AgendaPanel';
import { DensidadePanel } from '../components/admin/rotas/DensidadePanel';
import { LeituraPlanilhaPanel } from '../components/admin/rotas/LeituraPlanilhaPanel';
import { RotaSequencialPanel } from '../components/admin/rotas/RotaSequencialPanel';
import { ResumoRoteiroPanel } from '../components/admin/rotas/ResumoRoteiroPanel';
import { RotasProvider } from '../contexts/RotasContext';
import MiniMapBrasil from '../components/admin/MiniMapBrasil';
import UserProfileManager from '../components/admin/users/UserProfileManager';
import SpaceButton from '../components/admin/SpaceButton';
import { API_BASE_URL } from '@/lib/api-base';

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface Territory { id: number; municipio: string; uf: string; modo: string; userId?: number; }
interface InterestRequest { id: number; nome: string; email: string | null; telefone: string | null; empresa: string | null; municipio: string; uf: string; modo: string | null; observacoes: string | null; status: 'pending' | 'accepted' | 'rejected'; created_at: string; userId?: number; }

interface UserType {
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

interface Group { id: string; name: string; userIds: number[]; createdAt: string; }
interface SystemNotification { id: number; title: string; message: string; createdAt: string; targetAll?: boolean; targetUserIds?: number[]; }
interface AuditLog { id: string; action: string; entity: string; entityId: string; details: string; uf?: string; municipio?: string; performedBy: string; timestamp: string; }
interface ModulePermission { userId: number; moduleId: string; canView: boolean; canEdit: boolean; }

type TabId = 'dashboard' | 'users' | 'territories' | 'groups' | 'notifications' | 'audit' | 'interests' | 'personal' | 'rotas' | 'baserotas' | 'clusters' | 'blocos' | 'roteiros' | 'agenda' | 'densidade' | 'leituraplanilha' | 'roteiro_seq' | 'resumo_roteiro' | 'user_types' | 'system' | 'reps' | `user_type_${number}`;

interface NavItem {
  id: TabId | 'settings' | 'rotas_menu' | 'users_menu';
  label: string;
  icon: React.ElementType;
  count?: number;
  badge?: boolean;
  restrict?: string[];
  subItems?: { id: TabId; label: string; icon: React.ElementType; count?: number; }[];
}

const API = API_BASE_URL;
const IBGE = 'https://servicodados.ibge.gov.br/api/v1/localidades';
const NOTIF_FONT_WHITELIST = ['inter', 'roboto', 'open-sans', 'lato', 'montserrat', 'poppins', 'nunito', 'source-sans', 'merriweather', 'playfair'];
const NOTIF_SIZE_WHITELIST = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];

const QuillFont = Quill.import('formats/font');
QuillFont.whitelist = NOTIF_FONT_WHITELIST;
Quill.register(QuillFont, true);
const QuillSize = Quill.import('attributors/style/size');
QuillSize.whitelist = NOTIF_SIZE_WHITELIST;
Quill.register(QuillSize, true);

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

export default function Admin() {
  const { token, logout, userId, tokenVersion } = useAuth();
  const navigate = useNavigate();
  const quillRef = React.useRef<ReactQuill | null>(null);

  // Security: redirect if no token
  useEffect(() => {
    if (!token) navigate('/login');
  }, [token, navigate]);

  // ── Core API data ──────────────────────────────────────────────────────────
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const reps = useMemo(() => users.filter(u => u.role === 'user' || u.role === 'supervisor'), [users]);
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [interests, setInterests] = useState<InterestRequest[]>([]);
  const [clientes, setClientes] = useState<ClienteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);


  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
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
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [seenNotifications, setSeenNotifications] = useState<number[]>(() => {
    const key = userId ? `seen_notifications_user_${userId}` : 'seen_notifications_guest';
    return LS.get<number[]>(key, []);
  });

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !seenNotifications.includes(n.id)).length;
  }, [notifications, seenNotifications]);

  const markAllAsSeen = useCallback(() => {
    if (notifications.length === 0) return;
    const key = userId ? `seen_notifications_user_${userId}` : 'seen_notifications_guest';
    const allIds = notifications.map(n => n.id);
    const updated = Array.from(new Set([...allIds, ...seenNotifications])).slice(0, 500);
    setSeenNotifications(updated);
    LS.set(key, updated);
  }, [notifications, seenNotifications, userId]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => LS.get('admin_audit', []));

  // ── Auth & Permissions ──────────────────────────────────────────────────
  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-user-token-version': String(tokenVersion || 0)
  }), [token, tokenVersion]);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoadingNotifications(true);
      const res = await fetch(`${API}/api/notifications`, { headers: authHeaders });
      if (res.ok) setNotifications(await res.json());
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [authHeaders]);

  const saveGroups = (g: Group[]) => { setGroups(g); LS.set('admin_groups', g); };
  const saveAuditLogs = (a: AuditLog[]) => { setAuditLogs(a); LS.set('admin_audit', a); };

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
  const [dashFilterUser, setDashFilterUser] = useState('');
  const [dashFilterUF, setDashFilterUF] = useState('');
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
    name: '', fullName: '', isVago: 0, colorIndex: 1, email: '', contato: '',
    endereco: '', bairro: '', cidade: '', uf: '', cep: '', comissao: ''
  });
  const [newRep, setNewRep] = useState({
    userId: '', code: '', name: '', fullName: '', isVago: 0, colorIndex: 1, email: '', contato: '',
    endereco: '', bairro: '', cidade: '', uf: '', cep: '', comissao: ''
  });

  const [newUser, setNewUser] = useState<{
    fullName: string; email: string; password: string; confirmPassword: string;
    role: 'user' | 'supervisor' | 'admin';
    code: string; documentType: 'cpf' | 'cnpj';
    document: string; companyName: string; birthDate: string; telefone: string; photo: string;
    cargo: string; groupId: string; tipo: 'normal' | 'representante' | 'promotor' | 'supervisor'; colorIndex: number;
    cep: string; logradouro: string; numero: string; complemento: string; bairro_end: string; cidade: string; estado_end: string; area_atuacao: string; base_logistica: string;
    userTypeId: string;
    managedUserIds: number[];
  }>({
    fullName: '', email: '', password: '', confirmPassword: '',
    role: 'user',
    code: '', documentType: 'cpf',
    document: '', companyName: '', birthDate: '', telefone: '', photo: '',
    cargo: '', groupId: '', tipo: 'normal', colorIndex: 0,
    cep: '', logradouro: '', numero: '', complemento: '', bairro_end: '', cidade: '', estado_end: '', area_atuacao: '', base_logistica: '',
    userTypeId: '',
    managedUserIds: []
  });

  // ── UserTypes form ────────────────────────────────────────────────────────
  const [isUserTypeModalOpen, setIsUserTypeModalOpen] = useState(false);
  const [editingUserTypeId, setEditingUserTypeId] = useState<number | null>(null);
  const [userTypeForm, setUserTypeForm] = useState({
    name: '',
    color: '#3b82f6',
    icon: 'User',
    showInMenu: false,
    active: true,
    isAdmin: false
  });

  const handleSaveUserType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userTypeForm.name) return toast.error('O nome é obrigatório');

    try {
      const url = editingUserTypeId 
        ? `${API}/api/admin/user-types/${editingUserTypeId}`
        : `${API}/api/admin/user-types`;
      
      const method = editingUserTypeId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(userTypeForm)
      });

      if (res.ok) {
        toast.success(editingUserTypeId ? 'Tipo atualizado!' : 'Tipo criado!');
        setIsUserTypeModalOpen(false);
        fetchUserTypes();
        addAudit(editingUserTypeId ? 'update_user_type' : 'create_user_type', 'UserType', String(editingUserTypeId || 'new'), `Tipo: ${userTypeForm.name}`);
      } else {
        const data = await res.json();
        toast.error(data.message || 'Erro ao salvar tipo');
      }
    } catch (error) {
      toast.error('Erro de conexão');
    }
  };

  const handleDeleteUserType = async (id: number, name: string) => {
    openConfirm(
      'Remover Tipo de Usuário?',
      `Isso removerá o tipo "${name}" e desvinculará todos os usuários deste tipo. Esta ação não pode ser desfeita.`,
      async () => {
        try {
          const res = await fetch(`${API}/api/admin/user-types/${id}`, {
            method: 'DELETE',
            headers: authHeaders
          });
          if (res.ok) {
            toast.success('Tipo removido');
            fetchUserTypes();
            addAudit('delete_user_type', 'UserType', String(id), `Tipo: ${name}`);
          } else {
            toast.error('Erro ao remover tipo');
          }
        } catch (error) {
          toast.error('Erro de conexão');
        } finally {
          closeConfirm();
        }
      }
    );
  };

  const [groupsData, setGroupsData] = useState<{ id: number, name: string }[]>([]);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUserForm, setEditUserForm] = useState<{
    username: string; fullName: string; document: string; password: string; confirmPassword: string;
    role: 'user' | 'supervisor' | 'admin';
    code: string; photo: string; telefone: string; birthDate: string;
    cargo: string; companyName: string; groupId: string;
    userTypeId: string;
    managedUserIds: number[];
  }>({
    username: '', fullName: '', document: '', password: '', confirmPassword: '',
    role: 'user',
    code: '', photo: '', telefone: '', birthDate: '',
    cargo: '', companyName: '', groupId: '',
    userTypeId: '',
    managedUserIds: []
  });
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRepModalOpen, setIsRepModalOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userFilterOnline, setUserFilterOnline] = useState(false);
  const [userSortBy, setUserSortBy] = useState<'name' | 'code' | 'date' | 'role'>('name');

  const filteredUsers = useMemo(() => {
    const filtered = users.filter(u => {
      // Filter by dynamic user type if applicable
      if (activeTab.startsWith('user_type_')) {
        const typeId = parseInt(activeTab.replace('user_type_', ''));
        // @ts-ignore
        if (Number(u.userTypeId) !== typeId) return false;
      }

      const name = (u.full_name || u.fullName || u.username).toLowerCase();
      const email = u.username.toLowerCase();
      const search = userSearch.toLowerCase();

      const matchesSearch = name.includes(search) || email.includes(search);
      if (!matchesSearch) return false;

      if (userFilterOnline) {
        const rawLastActive = u.last_active || (u as SystemUser & { lastActive?: string }).lastActive;
        if (!rawLastActive) return false;
        const lastDate = new Date(rawLastActive);
        // epoch (new Date(0)) = never logged in sentinel
        if (lastDate.getFullYear() <= 1970) return false;
        const isOnline = (u.id === userId) || (!isNaN(lastDate.getTime()) && (Date.now() - lastDate.getTime()) < 300000);
        return isOnline;
      }

      return true;
    });

    // Ordenação
    return [...filtered].sort((a, b) => {
      if (userSortBy === 'name') {
        const nameA = (a.full_name || a.fullName || a.username).toLowerCase();
        const nameB = (b.full_name || b.fullName || b.username).toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (userSortBy === 'code') {
        const codeA = (a.code || '').toLowerCase();
        const codeB = (b.code || '').toLowerCase();
        return codeA.localeCompare(codeB);
      }
      if (userSortBy === 'date') {
        const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
        const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
        return dateB - dateA; // Mais recentes primeiro
      }
      if (userSortBy === 'role') {
        const roleA = (a.role || 'user').toLowerCase();
        const roleB = (b.role || 'user').toLowerCase();
        return roleA.localeCompare(roleB);
      }
      return 0;
    });
  }, [users, userSearch, userFilterOnline, userId, userSortBy, activeTab]);


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
  const [selectedUserForTerritory, setSelectedUserForTerritory] = useState('');
  const [selectedModo, setSelectedModo] = useState<'planejamento' | 'atendimento'>('planejamento');
  const [municipios, setMunicipios] = useState<{ id: number; nome: string }[]>([]);
  const [subdistritos, setSubdistritos] = useState<{ id: number; nome: string }[]>([]);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [loadingSubdistritos, setLoadingSubdistritos] = useState(false);
  const [staged, setStaged] = useState<Array<{ municipio: string; uf: string; bairro?: string; userId: number; modo: string }>>([]);
  const [filterUF, setFilterUF] = useState('');
  const [filterUserForTerritory, setFilterUserForTerritory] = useState('');

  // ── Groups form ────────────────────────────────────────────────────────────
  const [newGroupName, setNewGroupName] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [groupAddUsers, setGroupAddUsers] = useState<number[]>([]);

  // ── Notifications form ─────────────────────────────────────────────────────
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTargetAll, setNotifTargetAll] = useState(true);
  const [notifTargetUsers, setNotifTargetUsers] = useState<number[]>([]);
  const [notifUserSearch, setNotifUserSearch] = useState('');

  // ── Audit filters ──────────────────────────────────────────────────────────
  const [auditFilterUser, setAuditFilterUser] = useState('');
  const [auditFilterAction, setAuditFilterAction] = useState('');
  const [auditFilterUF, setAuditFilterUF] = useState('');

  const filteredAudit = useMemo(() => {
    return auditLogs.filter(log => {
      if (auditFilterUser && (log.details).includes(auditFilterUser)) return false;
      if (auditFilterUF && (log.uf || log.details).includes(auditFilterUF)) return false;
      if (auditFilterAction && log.action !== auditFilterAction) return false;
      return true;
    });
  }, [auditLogs, auditFilterUser, auditFilterUF, auditFilterAction]);

  const auditActionLabel: Record<string, string> = {
    'create_user': 'Novo Usuário',
    'update_user': 'Editou Usuário',
    'delete_user': 'Removeu Usuário',
    'create_group': 'Novo Grupo',
    'delete_group': 'Removeu Grupo',
    'update_group': 'Editou Grupo',
    'accepted': 'Interesse Aceito',
    'rejected': 'Interesse Recusado',
    'clear_notifications': 'Limpar Notificações',
    'send_notification': 'Enviou Alerta'
  };

  // ── Fetch all API data ─────────────────────────────────────────────────────
  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/groups`, { headers: authHeaders });
      if (res.ok) setGroupsData(await res.json());
    } catch (error) { console.error('Error fetching groups:', error); }
  }, [authHeaders]);

  const fetchUserTypes = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/user-types`, { headers: authHeaders });
      if (res.ok) setUserTypes(await res.json());
    } catch (error) { console.error('Error fetching user types:', error); }
  }, [authHeaders]);

  const fetchAll = useCallback(async () => {
    if (!initialLoadDone) setLoading(true);
    try {
      const [tR, uR, iR, cR, utR] = await Promise.all([
        fetch(`${API}/api/admin/territories`, { headers: authHeaders }),
        fetch(`${API}/api/admin/users`, { headers: authHeaders }),
        fetch(`${API}/api/interest`, { headers: authHeaders }),
        fetch(`${API}/api/clientes`, { headers: authHeaders }),
        fetch(`${API}/api/admin/user-types`, { headers: authHeaders }),
      ]);

      const responses = [tR, uR, iR, cR, utR];
      const unauth = responses.find(r => r.status === 401);
      if (unauth) {
        toast.error('Sessão encerrada ou inválida. Faça login novamente.');
        logout();
        return;
      }

      if (tR.ok && uR.ok && iR.ok && cR.ok && utR.ok) {
        setTerritories(await tR.json());
        setUsers(await uR.json());
        setInterests(await iR.json());
        setClientes(await cR.json());
        setUserTypes(await utR.json());
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
      const res = await fetch(`${API}/api/planilha/generate-plan`, { headers: authHeaders });
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
    fetchNotifications();
  }, [fetchAll, fetchMyPermissions, fetchNotifications]);


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
  const repOptions = reps.map(r => ({ value: r.code || '', label: `${r.code || ''} — ${r.full_name || r.fullName || r.username}` }));

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
        userId: '', code: '', name: '', fullName: '', isVago: 0, colorIndex: 1, email: '', contato: '',
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
    if (!selectedUF || !selectedMunicipioName || !selectedUserForTerritory) { toast.error('Selecione estado, município e usuário'); return; }
    if (staged.find(s => s.municipio === selectedMunicipioName && s.uf === selectedUF && String(s.userId) === selectedUserForTerritory && s.modo === selectedModo)) { toast.warning('Já na lista'); return; }
    setStaged(prev => [...prev, { municipio: selectedMunicipioName, uf: selectedUF, bairro: includeBairro && selectedBairro ? subdistritos.find(s => String(s.id) === selectedBairro)?.nome : undefined, userId: Number(selectedUserForTerritory), modo: selectedModo }]);
    setSelectedMunicipio(''); setSelectedMunicipioName(''); setSelectedBairro('');
    toast.success('Adicionado!');
  };

  const handleConfirmStaged = async () => {
    if (!staged.length) { toast.error('Nada para confirmar'); return; }
    let ok = 0, fail = 0;
    for (const item of staged) {
      const res = await fetch(`${API}/api/admin/territories`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ municipio: item.municipio, uf: item.uf, userId: item.userId, modo: item.modo }) });
      if (res.ok) { ok++; addAudit('assign_territory', 'Território', item.municipio, `Atribuiu ${item.municipio}/${item.uf} → ${item.userId}`, { uf: item.uf, municipio: item.municipio }); }
      else fail++;
    }
    if (ok) toast.success(`${ok} território(s) atribuído(s)!`);
    if (fail) toast.error(`${fail} falhou`);
    setStaged([]); fetchAll();
  };

  const handleDeleteTerritory = async (id: number, municipio: string, userId: number, uf: string) => {
    const res = await fetch(`${API}/api/admin/territories/${id}`, { method: 'DELETE', headers: authHeaders });
    if (res.ok) { toast.success(`${municipio} removido!`); addAudit('delete_territory', 'Território', String(id), `Removeu ${municipio}/${uf}`, { uf, municipio }); fetchAll(); }
    else toast.error('Erro');
  };

  const filteredTerritories = territories.filter(t => {
    if (filterUF && !t.uf.toLowerCase().includes(filterUF.toLowerCase())) return false;
    if (filterUserForTerritory && String(t.userId) !== filterUserForTerritory) return false;
    return true;
  });

  // ── Users CRUD ────────────────────────────────────────────────────────────
  const fetchCepAdmin = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setNewUser(prev => ({
          ...prev,
          logradouro: data.logradouro,
          bairro_end: data.bairro,
          cidade: data.localidade,
          estado_end: data.uf
        }));
      }
    } catch (e) {
      console.error('Erro ao buscar CEP', e);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.code.trim() || !newUser.password.trim()) {
      toast.error('Código e Senha são obrigatórios'); return;
    }
    if (newUser.password !== newUser.confirmPassword) { toast.error('As senhas não coincidem!'); return; }

    // Mapeia tipo de cadastro → role do sistema
    const selectedType = userTypes.find(t => String(t.id) === newUser.userTypeId);

    const body: Record<string, string | number | null | boolean> = {
      code: newUser.code,
      full_name: newUser.fullName,
      username: newUser.email || newUser.code,
      password: newUser.password,
      role: selectedType?.isAdmin ? 'admin' : 'user',
      tipo: newUser.tipo || 'normal',
      telefone: newUser.telefone,
      cpf_cnpj: newUser.document,
      birth_date: newUser.birthDate || null,
      cargo: newUser.cargo,
      company_name: newUser.companyName,
      groupId: newUser.groupId ? Number(newUser.groupId) : null,
      photo: newUser.photo || null,
      cep: newUser.cep,
      logradouro: newUser.logradouro,
      numero: newUser.numero,
      complemento: newUser.complemento,
      bairro_end: newUser.bairro_end,
      cidade: newUser.cidade,
      estado_end: newUser.estado_end,
      area_atuacao: newUser.area_atuacao,
      base_logistica: newUser.base_logistica,
      userTypeId: newUser.userTypeId ? Number(newUser.userTypeId) : null,
      managedUserIds: newUser.managedUserIds
    };

    try {
      const res = await fetch(`${API}/api/admin/users`, { method: 'POST', headers: authHeaders, body: JSON.stringify(body) });
      if (res.ok) {
        toast.success(`Usuário "${newUser.fullName}" criado!`);
        addAudit('create_user', 'Usuário', newUser.code, `Criou usuário ${newUser.fullName} (${newUser.code})`);
        setNewUser({
          fullName: '', email: '', password: '', confirmPassword: '',
          role: 'user', code: '', documentType: 'cpf',
          document: '', companyName: '', birthDate: '', telefone: '', photo: '',
          cargo: '', groupId: '', tipo: 'normal', colorIndex: 0,
          cep: '', logradouro: '', numero: '', complemento: '', bairro_end: '', cidade: '', estado_end: '', area_atuacao: '', base_logistica: '',
          userTypeId: '',
          managedUserIds: []
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
    
    const selectedType = userTypes.find(t => String(t.id) === editUserForm.userTypeId);

    const body: Record<string, any> = { 
      username: editUserForm.username, 
      role: selectedType?.isAdmin ? 'admin' : 'user', 
      full_name: editUserForm.fullName,
      telefone: editUserForm.telefone,
      cpf_cnpj: editUserForm.document,
      birth_date: editUserForm.birthDate || null,
      cargo: editUserForm.cargo,
      company_name: editUserForm.companyName,
      groupId: editUserForm.groupId ? Number(editUserForm.groupId) : null,
      userTypeId: editUserForm.userTypeId ? Number(editUserForm.userTypeId) : null,
      managedUserIds: editUserForm.managedUserIds
    };

    if (editUserForm.password.trim()) body.password = editUserForm.password;
    if (editUserForm.photo) body.photo = editUserForm.photo;

    try {
      const res = await fetch(`${API}/api/admin/users/${id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(body) });
      if (res.ok) {
        toast.success('Usuário atualizado!');
        addAudit('update_user', 'Usuário', String(id), `Atualizou usuário ${editUserForm.username}`);
        setEditingUserId(null);
        setIsUserModalOpen(false);
        fetchAll();
      }
      else { const err = await res.json(); toast.error(err.message || 'Erro'); }
    } catch (err) {
      toast.error('Erro ao atualizar usuário');
    }
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
    const g: Group = { id: Date.now().toString(), name: newGroupName.trim(), userIds: [], createdAt: new Date().toISOString() };
    saveGroups([...groups, g]); addAudit('create_group', 'Grupo', g.id, `Criou grupo "${g.name}"`); setNewGroupName(''); toast.success('Grupo criado!');
  };

  const handleDeleteGroup = (g: Group) => {
    openConfirm('Remover grupo', `O grupo "${g.name}" será removido.`, () => { closeConfirm(); saveGroups(groups.filter(x => x.id !== g.id)); addAudit('delete_group', 'Grupo', g.id, `Removeu grupo "${g.name}"`); toast.success('Grupo removido!'); });
  };

  const handleSaveGroupUsers = (groupId: string) => {
    saveGroups(groups.map(g => g.id === groupId ? { ...g, userIds: groupAddUsers } : g));
    addAudit('update_group', 'Grupo', groupId, `Atualizou membros do grupo`);
    setExpandedGroup(null); toast.success('Grupo atualizado!');
  };

  // ── Notifications ─────────────────────────────────────────────────────────
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) { toast.error('Título e mensagem são obrigatórios'); return; }
    if (!notifTargetAll && notifTargetUsers.length === 0) { toast.error('Selecione ao menos um usuário destinatário'); return; }

    try {
      const res = await fetch(`${API}/api/notifications`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          title: notifTitle,
          message: notifMessage,
          targetAll: notifTargetAll,
          targetUserIds: notifTargetAll ? [] : notifTargetUsers
        })
      });

      if (res.ok) {
        toast.success(notifTargetAll
          ? 'Alerta enviado com sucesso para todos os usuários!'
          : `Alerta enviado com sucesso para ${notifTargetUsers.length} usuário(s)!`
        );
        setNotifTitle('');
        setNotifMessage('');
        setNotifTargetAll(true);
        setNotifTargetUsers([]);
        setNotifUserSearch('');
        fetchNotifications();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Erro ao enviar alerta');
      }
    } catch (error) {
      toast.error('Erro de conexão ao enviar alerta');
    }
  };

  const handleClearNotifications = async () => {
    openConfirm('Limpar Histórico', 'Deseja realmente apagar todo o histórico de alertas?', async () => {
      closeConfirm();
      try {
        const res = await fetch(`${API}/api/notifications/clear`, {
          method: 'DELETE',
          headers: authHeaders
        });
        if (res.ok) {
          toast.success('Histórico removido');
          setNotifications([]);
        } else {
          toast.error('Erro ao limpar histórico');
        }
      } catch (error) {
        toast.error('Erro de conexão');
      }
    });
  };

  const openImagePickerForEditor = useCallback(() => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        toast.error('Selecione um arquivo de imagem válido.');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        toast.error('Imagem muito grande. Limite de 8MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const range = quill.getSelection(true);
        const index = range ? range.index : quill.getLength();
        quill.insertEmbed(index, 'image', reader.result, 'user');
        quill.setSelection(index + 1, 0);
      };
      reader.readAsDataURL(file);
    };
  }, []);

  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ font: NOTIF_FONT_WHITELIST }],
        [{ size: NOTIF_SIZE_WHITELIST }],
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        ['link', 'image'],
        ['clean'],
      ],
      handlers: {
        image: openImagePickerForEditor,
      },
    },
  }), [openImagePickerForEditor]);

  const quillFormats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet', 'align',
    'link', 'image'
  ];

  const pendingInterests = interests.filter(i => i.status === 'pending').length;
  const dailyMessages = [
    "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
    "A persistência é o caminho do êxito.",
    "A única maneira de fazer um excelente trabalho é amar o que você faz.",
    "Grandes jornadas começam com um pequeno passo.",
    "Sua limitação é apenas sua imaginação.",
    "Pense positivo e coisas boas acontecerão.",
    "O melhor momento para plantar uma árvore foi há 20 anos. O segundo melhor é agora.",
    "Você é mais forte do que imagina.",
    "Acredite em si próprio e o resto virá naturalmente.",
    "O que você faz hoje pode melhorar todos os seus amanhãs."
  ];
  const getDayMessage = () => {
    const today = new Date();
    const index = (today.getFullYear() + today.getMonth() + today.getDate()) % dailyMessages.length;
    return dailyMessages[index];
  };

  // Current user info for sidebar profile
  const { userName: authUserName } = useAuth();
  const currentUser = users.find(u => u.id === userId);
  const displayName = authUserName || currentUser?.full_name || currentUser?.fullName || currentUser?.username || 'Admin';
  const displayEmail = currentUser?.username || '';
  const displayPhoto = currentUser?.photo || '';
  const displayCargo = currentUser?.cargo || role || 'usuário';

  const navItems: NavItem[] = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'users_menu' as const, label: 'Usuários', icon: UsersRound, restrict: ['admin'], subItems: [
        { id: 'users' as const, label: 'Todos os Usuários', icon: UserPlus, count: users.length },
        // Dynamic User Types submenus
        ...userTypes
          .filter(t => t.showInMenu && t.active)
          .map(t => ({
            id: `user_type_${t.id}` as TabId,
            label: t.name,
            icon: User,
            count: users.filter(u => u.userTypeId === t.id).length
          })),
        { id: 'groups' as const, label: 'Grupos', icon: UsersRound, count: groups.length },
      ]
    },
    { id: 'baserotas' as const, label: 'Base Cliente', icon: Database, restrict: ['admin', 'supervisor', 'user'] },
    { id: 'territories' as const, label: 'Territórios', icon: MapPin, count: territories.length, restrict: ['admin', 'supervisor'] },
    {
      id: 'rotas_menu' as const, label: 'Planejamento de Áreas', icon: Truck, restrict: ['admin'], subItems: [
        { id: 'leituraplanilha' as const, label: 'Leitura Excel', icon: FileSpreadsheet },
        { id: 'roteiro_seq' as const, label: 'Roteiro Sequencial', icon: Route },
        { id: 'resumo_roteiro' as const, label: 'Resumo Roteiro', icon: BarChart2 },
        { id: 'clusters' as const, label: 'Clusters', icon: Layers },
        { id: 'blocos' as const, label: 'Blocos', icon: Grid3X3 },
        { id: 'roteiros' as const, label: 'Roteiros HERE', icon: Map },
        { id: 'agenda' as const, label: 'Agenda', icon: Calendar },
        { id: 'densidade' as const, label: 'Densidade', icon: Activity },
      ]
    },
    { id: 'interests' as const, label: 'Interesses', icon: HandHeart, count: pendingInterests, badge: pendingInterests > 0, restrict: ['admin'] },
    { id: 'notifications' as const, label: 'Enviar Alerta', icon: Bell, count: unreadCount, badge: unreadCount > 0, restrict: ['admin'] },
    {
      id: 'settings' as const, label: 'Configurações', icon: Settings, restrict: ['admin'], subItems: [
        { id: 'system' as const, label: 'Sistema', icon: Settings },
        { id: 'audit' as const, label: 'Auditoria', icon: ScrollText, count: auditLogs.length },
      ]
    }
  ].filter(item => {
    // If it's a core section (like dashboard), allow or check specific permission if needed
    if (item.id === 'dashboard') return true;

    // Modular permission check
    const moduleMap: Record<string, string> = {
      'baserotas': 'clientes',
      'territories': 'territories',
      'rotas_menu': 'routes',
      'users_menu': 'users',
      'interests': 'interests',
      'notifications': 'notifications',
      'audit': 'audit',
      'users': 'users',
      'system': 'settings'
    };

    const moduleId = moduleMap[item.id as string];
    
    // If user has explicit modular permission, grant access regardless of role restriction
    if (moduleId && canAccess(moduleId)) return true;

    // Otherwise, check role-based restriction
    if (item.restrict && !item.restrict.includes(role || '')) return false;

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
            <Popover 
              open={showNotifMenu} 
              onOpenChange={(open) => {
                setShowNotifMenu(open);
                if (open) markAllAsSeen();
              }}
            >
              <PopoverTrigger asChild>
                <button className="admin-header-icon-btn relative" title="Notificações">
                  <Bell style={{ width: 15, height: 15 }} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-destructive text-[9px] leading-[15px] text-white font-bold text-center animate-in zoom-in duration-300">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[380px] p-0 shadow-2xl border-primary/10" align="end">
                <div className="px-4 py-4 bg-primary/5 border-b border-border/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold flex items-center gap-2">
                        Central de Notificações
                        {unreadCount > 0 && (
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {unreadCount} nova(s)
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">Últimos alertas do sistema</p>
                    </div>
                    <Bell className="w-4 h-4 text-primary/40" />
                  </div>
                </div>
                <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
                  {loadingNotifications ? (
                    <div className="py-12 flex flex-col items-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">Carregando alertas...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="w-12 h-12 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Bell className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                      <p className="text-xs text-muted-foreground">Nenhuma notificação por enquanto</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {notifications.map((n) => {
                        const isRead = seenNotifications.includes(n.id);
                        return (
                          <div key={n.id} className={`group px-5 py-4 transition-all duration-200 ${isRead ? 'opacity-80' : 'bg-primary/[0.02] border-l-2 border-l-primary shadow-[inset_0_0_20px_rgba(var(--primary),0.01)]'}`}>
                            <div className="flex justify-between items-start gap-3">
                              <p className={`text-xs font-bold leading-tight ${isRead ? 'text-foreground/70' : 'text-foreground'}`}>
                                {n.title}
                              </p>
                              {!isRead && (
                                <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1 shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                              )}
                            </div>
                            <div className="text-[11px] leading-relaxed text-muted-foreground mt-1.5 line-clamp-3 group-hover:line-clamp-none transition-all duration-300" 
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(n.message) }} 
                            />
                            <div className="flex items-center gap-2 mt-3">
                              <Clock className="w-3 h-3 text-muted-foreground/60" />
                              <p className="text-[10px] text-muted-foreground/70 font-medium">
                                {new Date(n.createdAt).toLocaleString('pt-BR', { 
                                  day: '2-digit', 
                                  month: '2-digit', 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="p-2 bg-secondary/20 border-t border-border/40 text-center">
                    <button 
                      onClick={() => { setActiveTab('notifications'); setShowNotifMenu(false); }}
                      className="text-[10px] font-bold text-primary hover:underline transition-all"
                    >
                      Ver histórico completo
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
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
            <Popover open={showUserMenu} onOpenChange={setShowUserMenu}>
              <PopoverTrigger asChild>
                <button className="hidden sm:flex items-center gap-2.5 px-2.5 py-1.5 bg-secondary/60 rounded-xl border border-border/40 hover:bg-secondary/80 transition-colors min-w-[175px] text-left">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center shrink-0 border border-primary/20">
                    {displayPhoto ? (
                      <img src={displayPhoto} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <User style={{ width: 14, height: 14 }} className="text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold leading-tight truncate">{displayName}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight capitalize truncate">{String(displayCargo).toLowerCase()}</p>
                  </div>
                  <ChevronDown style={{ width: 13, height: 13 }} className="text-muted-foreground ml-auto shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1.5" align="end">
                <div className="flex items-center justify-between px-2.5 py-2 border-b border-border/60 mb-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">Tema</span>
                  <ThemeToggle />
                </div>
                <button
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-md hover:bg-secondary/70 transition-colors"
                  onClick={() => { 
                    setShowUserMenu(false); 
                    // Use a fresh fetch to get current user data or find in list
                    const me = users.find(u => u.id === Number(userId));
                    if (me) {
                      setEditingUserId(me.id);
                      setIsUserModalOpen(true);
                    } else {
                      // Fallback if not in list yet
                      setEditingUserId(Number(userId));
                      setIsUserModalOpen(true);
                    }
                  }}
                >
                  <User style={{ width: 14, height: 14 }} />
                  Perfil
                </button>
                <button
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-md hover:bg-secondary/70 transition-colors"
                  onClick={() => { setShowUserMenu(false); navigate('/admin'); }}
                >
                  <Settings style={{ width: 14, height: 14 }} />
                  Painel
                </button>
                <button
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={() => { setShowUserMenu(false); logout(); navigate('/login'); }}
                >
                  <LogOut style={{ width: 14, height: 14 }} />
                  Sair
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        <main className="admin-content">

          {/* ━━ DASHBOARD ━━ */}
          {activeTab === 'dashboard' && (() => {
            // ── Derived / filtered data ──────────────────────────────────────
            const filteredClientes = clientes.filter(c => {
              if (dashFilterUser && String(c.userId) !== dashFilterUser) return false;
              if (dashFilterUF && c.uf !== dashFilterUF) return false;
              if (dashSearch) {
                const q = dashSearch.toLowerCase();
                const userName = users.find(u => u.id === c.userId)?.full_name?.toLowerCase() || '';
                if (!(c.nome_cliente || '').toLowerCase().includes(q) && !(c.cidade || '').toLowerCase().includes(q) && !(c.uf || '').toLowerCase().includes(q) && !userName.includes(q)) return false;
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

            // Unique UFs and users for dropdowns
            const allUFs = [...new Set([
              ...territories.map(t => (t.uf || '').trim().toUpperCase()),
              ...clientes.map(c => (c.uf || '').trim().toUpperCase()),
            ].filter(Boolean))].sort();
            const activeUsers = users.filter(u => !u.isVago);

            const clearFilters = () => { setDashFilterUser(''); setDashFilterUF(''); setDashSearch(''); };
            const hasFilters = dashFilterUser || dashFilterUF || dashSearch;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
                <div className="admin-card" style={{ padding: '14px 20px', borderLeft: '3px solid hsl(var(--admin-sidebar-accent))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <MessageSquare style={{ width: 14, height: 14, color: 'hsl(var(--admin-sidebar-accent))' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.02em' }}>Mensagem do Dia</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' }}>
                    "{getDayMessage()}"
                  </p>
                </div>

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

                    {/* User dropdown */}
                    <select
                      value={dashFilterUser}
                      onChange={e => setDashFilterUser(e.target.value)}
                      style={{
                        height: 36, padding: '0 12px', borderRadius: 8, fontSize: '0.8rem', flex: '1 1 140px',
                        border: '1.5px solid hsl(var(--border))', background: 'hsl(var(--background))',
                        color: 'hsl(var(--foreground))', outline: 'none', cursor: 'pointer',
                      }}
                    >
                      <option value="">Todos Usuários</option>
                      {users.filter(u => !u.isVago).map(u => <option key={u.id} value={String(u.id)}>{u.username} — {u.full_name || u.fullName}</option>)}
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
                      const uniqueUserIds = [...new Set(terrs.map(t => t.userId))];
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
                                {terrs.length} cliente(s) — {uniqueUserIds.length} usuário(s)
                              </p>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{
                                  fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10, letterSpacing: '0.03em',
                                  background: 'hsl(var(--admin-sidebar-accent) / 0.13)',
                                  color: 'hsl(var(--admin-sidebar-accent))',
                                  border: '1px solid hsl(var(--admin-sidebar-accent) / 0.25)',
                                  textTransform: 'uppercase',
                                }}>
                                  PRESENÇA ATIVA
                                </span>
                              </div>
                            </div>
                            {/* User avatars */}
                            <div style={{ display: 'flex', gap: -4 }}>
                              {uniqueUserIds.slice(0, 4).map((id, idx) => {
                                const user = users.find(u => u.id === id);
                                const color = user && !user.isVago ? REP_COLOR_PALETTE[user.colorIndex || 0] : 'hsl(0 0% 40%)';
                                const initials = (user?.full_name || user?.fullName || user?.username || 'SR').substring(0, 2).toUpperCase();
                                return (
                                  <div key={id} title={user?.full_name || user?.username || String(id)} style={{
                                    width: 28, height: 28, borderRadius: '50%', background: color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', fontSize: '0.65rem', fontWeight: 800,
                                    border: '2px solid hsl(var(--admin-card-bg))',
                                    marginLeft: idx > 0 ? -8 : 0, zIndex: 4 - idx,
                                    position: 'relative',
                                  }}>
                                    {initials}
                                  </div>
                                );
                              })}
                              {uniqueUserIds.length > 4 && (
                                <div style={{
                                  width: 28, height: 28, borderRadius: '50%', background: 'hsl(var(--muted))',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: 'hsl(var(--muted-foreground))', fontSize: '0.6rem', fontWeight: 700,
                                  border: '2px solid hsl(var(--admin-card-bg))', marginLeft: -8, position: 'relative',
                                }}>
                                  +{uniqueUserIds.length - 4}
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
                              const user = users.find(u => u.id === c.userId);
                              const color = user && !user.isVago ? REP_COLOR_PALETTE[user.colorIndex || 0] : 'hsl(0 0% 40%)';
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
                                    {user?.username || 'S/ USER'}
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
                          filterUF={dashFilterUF}
                          onClickUF={uf => setDashFilterUF(prev => prev === uf ? '' : uf)}
                        />
                      </div>
                    </div>

                    {/* User legend - Admin only */}
                    {role === 'admin' && (
                      <div className="admin-card" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid hsl(var(--admin-card-border))', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <UsersRound style={{ width: 14, height: 14, color: 'hsl(var(--admin-sidebar-accent))' }} />
                          <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>Usuários Ativos</span>
                        </div>
                        <div style={{ padding: '8px 0', maxHeight: 200, overflowY: 'auto' }}>
                          {users.filter(u => !u.isVago).length === 0 ? (
                            <p style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))' }}>
                              Nenhum usuário cadastrado
                            </p>
                          ) : users.filter(u => !u.isVago).map(user => {
                            const color = REP_COLOR_PALETTE[user.colorIndex || 0] || 'hsl(220 15% 40%)';
                            const count = clientes.filter(c => c.userId === user.id).length;
                            const isActive = dashFilterUser === String(user.id);
                            return (
                              <button
                                key={user.id}
                                onClick={() => setDashFilterUser(prev => prev === String(user.id) ? '' : String(user.id))}
                                style={{
                                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                  padding: '7px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                                  background: isActive ? `${color}18` : 'transparent',
                                  transition: 'background 0.15s',
                                  flexShrink: 0,
                                }}
                              >
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, border: isActive ? `2px solid ${color}` : 'none' }} />
                                <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: isActive ? 700 : 500 }}>{user.full_name || user.fullName || user.username}</span>
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
                    )}

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


          {/* ━━ USUÁRIOS ━━ */}
          {(activeTab === 'users' || activeTab.startsWith('user_type_')) && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between pb-2">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Users className="w-6 h-6 text-primary" /> 
                    {activeTab.startsWith('user_type_') 
                      ? userTypes.find(t => t.id === parseInt(activeTab.replace('user_type_', '')))?.name || 'Gestão de Usuários'
                      : 'Gestão de Usuários'}
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

                  {/* Filtro de Ordenação Estilizado */}
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-2.5 bg-secondary/40 px-4 py-2 rounded-lg border border-border/40 hover:bg-secondary/60 transition-all group">
                          <Filter className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
                          <div className="flex flex-col items-start leading-none">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter opacity-70">ORDENAR POR</span>
                            <span className="text-xs font-bold text-foreground">
                              {userSortBy === 'name' ? 'Nome' : 
                               userSortBy === 'code' ? 'Código' : 
                               userSortBy === 'role' ? 'Tipo de Usuário' : 'Data de Criação'}
                            </span>
                          </div>
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-1.5 shadow-2xl border-primary/10" align="end">
                        <div className="space-y-1">
                          {[
                            { id: 'name', label: 'Nome', icon: User },
                            { id: 'code', label: 'Código', icon: Database },
                            { id: 'role', label: 'Tipo de Usuário', icon: ShieldCheck },
                            { id: 'date', label: 'Data de Criação', icon: Calendar },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => setUserSortBy(opt.id as any)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-all ${userSortBy === opt.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
                            >
                              <div className="flex items-center gap-3">
                                <opt.icon className={`w-4 h-4 ${userSortBy === opt.id ? 'text-white' : 'text-primary/60'}`} />
                                <span className="text-xs font-bold">{opt.label}</span>
                              </div>
                              {userSortBy === opt.id && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
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
                      role: 'user', code: '', documentType: 'cpf',
                      document: '', companyName: '', birthDate: '', telefone: '', photo: '',
                      cargo: '', groupId: '', tipo: 'normal', colorIndex: 0,
                      cep: '', logradouro: '', numero: '', complemento: '', bairro_end: '', cidade: '', estado_end: '', area_atuacao: '', base_logistica: '',
                      userTypeId: '',
                      managedUserIds: []
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
                    const hasEverLoggedIn = lastDate !== null && !isNaN(lastDate.getTime()) && lastDate.getFullYear() > 1970;
                    const isOnline = hasEverLoggedIn && ((u.id === userId) || (Date.now() - lastDate!.getTime() < 300000));
                    const lastActive = hasEverLoggedIn ? lastDate : null;

                    const userType = userTypes.find(t => t.id === Number(u.userTypeId));
                    const isAdminType = userType?.isAdmin || u.role === 'admin';
                    
                    // Prioridade de cor:
                    // 1. Se for Admin (tipo ou role), usa amarelo
                    // 2. Se tiver um tipo personalizado com cor definida, usa a cor do tipo
                    // 3. Padrão: Azul
                    const cardColor = isAdminType ? '#fbbf24' : (userType?.color || '#3b82f6');
                    
                    const TypeIcon = userType?.icon && ICON_LIST[userType.icon as keyof typeof ICON_LIST] 
                      ? ICON_LIST[userType.icon as keyof typeof ICON_LIST] 
                      : (isAdminType ? ShieldCheck : (u.role === 'supervisor' ? Briefcase : User));

                    return (
                      <Card key={u.id} className="group relative overflow-hidden border-border/40 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 transform hover:-translate-y-1">
                        <div className="h-1.5 w-full absolute top-0 left-0" style={{ backgroundColor: cardColor }} />
                        <CardContent className="p-5">
                          <div className="flex flex-col items-center text-center space-y-3">
                            <div className="relative">
                              <div className="w-16 h-16 rounded-2xl bg-secondary border border-border/50 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 duration-300">
                                {u.photo ? <img src={u.photo} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-muted-foreground/30" />}
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 border-card shadow-sm text-white" style={{ backgroundColor: cardColor }}>
                                <TypeIcon className="w-3" />
                              </div>
                              <div className={`absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full border-2 border-card shadow-sm ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'}`} title={isOnline ? 'Online' : 'Offline'} />
                            </div>
                            <div className="space-y-0.5 w-full">
                              <h3 className="font-bold text-sm truncate" title={u.full_name || u.fullName || u.username}>{u.full_name || u.fullName || u.username}</h3>
                              <p className="text-[10px] text-muted-foreground truncate">{u.username}</p>
                              
                              <div className="flex flex-col gap-0.5 mt-1">
                                {u.created_at || u.createdAt ? (
                                  <p className="text-[9px] text-muted-foreground/60 flex items-center justify-center gap-1">
                                    <Calendar className="w-2.5 h-2.5" />
                                    Criado em: {new Date(u.created_at || u.createdAt || 0).toLocaleDateString('pt-BR')}
                                  </p>
                                ) : null}

                                {!isOnline && lastActive && (
                                  <p className="text-[9px] text-muted-foreground/60 italic">Visto em {lastActive.toLocaleDateString('pt-BR')} às {lastActive.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: `${cardColor}20`, color: cardColor }}>{userType?.name || u.role}</span>
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
                                code: u.code || '',
                                photo: u.photo || '',
                                telefone: u.telefone || '',
                                birthDate: u.birth_date || u.birthDate || '',
                                cargo: u.cargo || '',
                                companyName: u.company_name || u.companyName || '',
                                groupId: String(u.groupId || ''),
                                userTypeId: String(u.userTypeId || ''),
                                managedUserIds: (u as any).managedUsers?.map((m: any) => m.id) || []
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

            </div>
          )}

          {/* ━━ SISTEMA (Personalização e Tipos de Usuário) ━━ */}
          {activeTab === 'system' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {/* Seção de Personalização */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  <Palette className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold">Personalização do Sistema</h2>
                </div>
                
                <div className="max-w-3xl">
                  <Card className="border-border/40">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-sm">Identidade Visual</CardTitle>
                      <CardDescription className="text-xs">Configure a logo e o nome da sua empresa no sistema.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Logo Upload */}
                        <div className="space-y-3">
                          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Logo da Empresa</Label>
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-secondary/30 relative overflow-hidden group">
                              {brandLogo ? (
                                <>
                                  <img src={brandLogo} alt="Logo" className="w-full h-full object-contain p-2" />
                                  <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button variant="destructive" size="icon" className="w-7 h-7 rounded-full" onClick={handleRemoveLogo}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <ImageOff className="w-6 h-6 text-muted-foreground opacity-20" />
                              )}
                            </div>
                            <div className="flex-1 space-y-1.5">
                              <input type="file" id="logo-upload-sys" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                              <Button variant="outline" size="sm" className="gap-2" onClick={() => document.getElementById('logo-upload-sys')?.click()}>
                                <Upload className="w-3.5 h-3.5" /> Enviar Logo
                              </Button>
                              <p className="text-[10px] text-muted-foreground">Máximo 2MB. Recomendado PNG transparente.</p>
                            </div>
                          </div>
                        </div>

                        {/* Nome da Empresa */}
                        <div className="space-y-3">
                          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nome da Empresa</Label>
                          <div className="flex flex-col gap-2">
                            <Input value={brandNameDraft} onChange={e => setBrandNameDraft(e.target.value)} placeholder="Ex: Mapa Território" />
                            <Button onClick={handleSaveBrandName} size="sm" className="gap-2 self-start"><Save className="w-3.5 h-3.5" /> Salvar Nome</Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Seção de Tipos de Usuário */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold">Tipos de Usuário</h2>
                  </div>
                  <Button size="sm" className="gap-2" onClick={() => {
                    setEditingUserTypeId(null);
                    setUserTypeForm({ name: '', color: '#3b82f6', icon: 'User', showInMenu: false, active: true, isAdmin: false });
                    setIsUserTypeModalOpen(true);
                  }}>
                    <Plus className="w-3.5 h-3.5" /> Novo Tipo
                  </Button>
                </div>

                {userTypes.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/40 rounded-xl">
                    <ShieldCheck className="w-10 h-10 opacity-10 mb-2" />
                    <p className="text-sm font-medium">Nenhum tipo cadastrado</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {userTypes.map(type => {
                      const TypeIcon = ICON_LIST[type.icon as keyof typeof ICON_LIST] || User;
                      const isAdminType = type.isAdmin || type.name.toLowerCase() === 'admin';
                      const isDefaultUser = !isAdminType && type.name.toLowerCase() === 'usuário';
                      const cardColor = isAdminType ? '#fbbf24' : (isDefaultUser ? '#3b82f6' : type.color);

                      return (
                        <Card key={type.id} className={`group relative overflow-hidden border-border/40 hover:border-primary/50 transition-all duration-300 ${!type.active ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                          <div className="h-1 w-full absolute top-0 left-0" style={{ backgroundColor: cardColor }} />
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: cardColor }}>
                                <TypeIcon className="w-4 h-4" />
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                  setEditingUserTypeId(type.id);
                                  setUserTypeForm({ name: type.name, color: type.color, icon: type.icon || 'User', showInMenu: type.showInMenu, active: type.active, isAdmin: type.isAdmin });
                                  setIsUserTypeModalOpen(true);
                                }}><Pencil className="w-3.5 h-3.5" /></Button>
                                {!type.isSystemDefault && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteUserType(type.id, type.name)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                )}
                              </div>
                            </div>
                            <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
                              {type.name}
                              {isAdminType && <ShieldCheck className="w-3 h-3 text-amber-500" />}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-bold uppercase">
                                {users.filter(u => u.userTypeId === type.id).length} Usuários
                              </span>
                              {type.showInMenu && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase flex items-center gap-1">
                                  <Eye className="w-2.5 h-2.5" /> Sidebar
                                </span>
                              )}
                              {!type.active && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold uppercase">Inativo</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Novo/Editar Tipo */}
              <Dialog open={isUserTypeModalOpen} onOpenChange={setIsUserTypeModalOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingUserTypeId ? 'Editar Tipo' : 'Novo Tipo de Usuário'}</DialogTitle>
                    <DialogDescription className="text-xs">Defina as configurações de categorização para este tipo.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSaveUserType} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Nome do Tipo</Label>
                      <Input 
                        placeholder="Ex: Gerente, Vendedor..." 
                        value={userTypeForm.name}
                        onChange={e => setUserTypeForm({ ...userTypeForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Cor de Identificação</Label>
                      <div className="flex gap-2 items-center">
                        <Input 
                          type="color" 
                          className="w-10 h-9 p-1 cursor-pointer" 
                          value={userTypeForm.color}
                          onChange={e => setUserTypeForm({ ...userTypeForm, color: e.target.value })}
                        />
                        <Input 
                          placeholder="#000000" 
                          className="text-xs"
                          value={userTypeForm.color}
                          onChange={e => setUserTypeForm({ ...userTypeForm, color: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Ícone Representativo</Label>
                      <div className="grid grid-cols-5 gap-2 p-2 bg-secondary/20 rounded-lg border border-border/40 max-h-40 overflow-y-auto">
                        {Object.entries(ICON_LIST).map(([name, Icon]) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setUserTypeForm({ ...userTypeForm, icon: name })}
                            className={`flex flex-col items-center justify-center p-2 rounded-md transition-all hover:bg-primary/10 ${userTypeForm.icon === name ? 'bg-primary/20 ring-1 ring-primary' : ''}`}
                          >
                            <Icon className="w-5 h-5 mb-1" />
                            <span className="text-[8px] truncate w-full text-center opacity-60">{name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pt-2">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="showInMenu"
                          className="rounded border-border text-primary focus:ring-primary"
                          checked={userTypeForm.showInMenu}
                          onChange={e => setUserTypeForm({ ...userTypeForm, showInMenu: e.target.checked })}
                        />
                        <Label htmlFor="showInMenu" className="text-xs cursor-pointer">Exibir na sidebar?</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="active"
                          className="rounded border-border text-primary focus:ring-primary"
                          checked={userTypeForm.active}
                          onChange={e => setUserTypeForm({ ...userTypeForm, active: e.target.checked })}
                        />
                        <Label htmlFor="active" className="text-xs cursor-pointer">Ativo?</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="isAdmin"
                          className="rounded border-border text-primary focus:ring-primary"
                          checked={userTypeForm.isAdmin}
                          onChange={e => setUserTypeForm({ ...userTypeForm, isAdmin: e.target.checked })}
                        />
                        <Label htmlFor="isAdmin" className="text-xs cursor-pointer">Administrador?</Label>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-border/40 mt-4">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setIsUserTypeModalOpen(false)}>Cancelar</Button>
                      <Button type="submit" size="sm" className="gap-2">
                        <Save className="w-3.5 h-3.5" /> {editingUserTypeId ? 'Salvar' : 'Criar'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* ━━ TERRITÓRIOS ━━ */}
          {activeTab === 'territories' && (() => {
            const computedTerritories = (() => {
              const map = new globalThis.Map<string, { municipio: string, uf: string, userIds: Set<number>, clientCount: number }>();
              
              // Process clients
              clientes.forEach(c => {
                if (!c.cidade || !c.uf) return;
                const city = c.cidade.trim();
                const uf = c.uf.trim().toUpperCase();
                const key = `${city}-${uf}`;

                if (!map.has(key)) map.set(key, { municipio: city, uf, userIds: new Set(), clientCount: 0 });
                const entry = map.get(key)!;
                entry.clientCount++;
                if (c.userId) entry.userIds.add(c.userId);
              });

              // Process explicit territories from database
              territories.forEach(t => {
                if (!t.municipio || !t.uf) return;
                const city = t.municipio.trim();
                const uf = t.uf.trim().toUpperCase();
                const key = `${city}-${uf}`;
                
                if (!map.has(key)) {
                  map.set(key, { municipio: city, uf, userIds: new Set(), clientCount: 0 });
                }
              });

              return Array.from(map.values()).map((t, idx) => ({
                id: idx,
                municipio: t.municipio,
                uf: t.uf,
                userIds: Array.from(t.userIds),
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
                          <TableHeader><TableRow className="hover:bg-transparent border-border/40"><TableHead className="pl-4">Município</TableHead><TableHead className="w-12">UF</TableHead><TableHead className="text-center">Clientes</TableHead><TableHead>Usuários Responsáveis</TableHead></TableRow></TableHeader>
                          <TableBody>{filteredTerritories.map(t => (
                            <TableRow key={t.id} className="border-border/30 hover:bg-secondary/30">
                              <TableCell className="text-xs font-medium pl-4">{t.municipio}</TableCell>
                              <TableCell className="text-xs font-mono text-muted-foreground">{t.uf}</TableCell>
                              <TableCell className="text-center"><span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t.clientCount}</span></TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {t.userIds.length === 0 ? <span className="text-[10px] text-muted-foreground italic">Sem usuário</span> : t.userIds.map(id => {
                                    const u = users.find(u => u.id === id);
                                    return <span key={id} className="text-[10px] px-1.5 py-0.5 rounded-md border border-border/50 bg-background/50 flex items-center gap-1">{u ? u.full_name || u.username : `ID: ${id}`}</span>
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
                        <MiniMapBrasil territories={computedTerritories.flatMap(t => t.userIds.map(id => ({ id: t.id, municipio: t.municipio, uf: t.uf, userId: id, modo: 'atendimento' as const })))} filterUF={filterUF} filterRep="" onClickUF={uf => setFilterUF(prev => prev === uf ? '' : uf)} />
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
              <div className="xl:col-span-1">
                <Card className="border-border/40">
                  <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-sm"><div className="w-7 h-7 bg-primary/15 rounded-md flex items-center justify-center"><UsersRound className="w-3.5 h-3.5 text-primary" /></div>Novo Grupo</CardTitle><CardDescription className="text-xs">Agrupe representantes por região ou critério</CardDescription></CardHeader>
                  <CardContent><form onSubmit={handleCreateGroup} className="space-y-3"><div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Nome do Grupo *</label><Input placeholder="Ex: Rio de Janeiro" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} required /></div><Button className="w-full gap-2" type="submit"><Plus className="w-4 h-4" />Criar Grupo</Button></form></CardContent>
                </Card>
              </div>
              <div className="xl:col-span-4">
                <Card className="border-border/40">
                  <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm flex items-center gap-2"><UsersRound className="w-4 h-4 text-primary" />Grupos Criados</CardTitle><span className="text-xs text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full">{groups.length} total</span></div></CardHeader>
                  <CardContent className="p-0">
                    {groups.length === 0 ? (<div className="py-16 text-center text-muted-foreground"><UsersRound className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="text-sm">Nenhum grupo criado</p></div>) : (
                      <div className="divide-y divide-border/30">{groups.map(g => (
                        <div key={g.id} className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3"><div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center"><UsersRound className="w-4 h-4 text-primary" /></div>
                              <div><p className="text-sm font-semibold">{g.name}</p><p className="text-[10px] text-muted-foreground">{g.userIds.length} usuário(s) • {new Date(g.createdAt).toLocaleDateString('pt-BR')}</p></div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 hover:text-primary" onClick={() => { setExpandedGroup(expandedGroup === g.id ? null : g.id); setGroupAddUsers(g.userIds); }}><ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedGroup === g.id ? 'rotate-90' : ''}`} /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteGroup(g)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </div>
                          {expandedGroup === g.id && (<div className="mt-3 ml-11 space-y-3"><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Selecione os usuários</p>
                            <div className="border border-border rounded-md max-h-44 overflow-y-auto">
                              {users.map(u => (
                                <label key={u.id} className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/40 cursor-pointer">
                                  <input type="checkbox" className="rounded" checked={groupAddUsers.includes(u.id)} onChange={() => setGroupAddUsers(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])} />
                                  <span className="text-sm">{u.username} — {u.full_name || u.fullName}</span>
                                </label>
                              ))}
                            </div>
                            <div className="flex gap-2"><Button size="sm" className="gap-1.5 h-7 text-xs" onClick={() => handleSaveGroupUsers(g.id)}><Save className="w-3 h-3" />Salvar</Button><Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setExpandedGroup(null)}>Cancelar</Button></div></div>)}
                          {g.userIds.length > 0 && expandedGroup !== g.id && (<div className="mt-2 ml-11 flex flex-wrap gap-1">{g.userIds.map(id => { const u = users.find(u => u.id === id); return u ? (<span key={id} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full font-medium text-muted-foreground">{u.username} — {u.full_name || u.fullName}</span>) : null; })}</div>)}
                        </div>
                      ))}</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ━━ NOTIFICAÇÕES ━━ */}
          {activeTab === 'notifications' && (
            <div className="space-y-5">
              <form onSubmit={handleSendNotification} className="grid grid-cols-1 xl:grid-cols-[minmax(300px,0.9fr)_minmax(520px,1.6fr)] gap-5">
                <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-xl">
                  <CardHeader className="pb-3 border-b border-border/10">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" />
                      Meta do Alerta
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Defina o título e os destinatários do aviso.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-5">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Título do Aviso</Label>
                      <Input
                        placeholder="Ex: Atualização Importante"
                        value={notifTitle}
                        onChange={e => setNotifTitle(e.target.value)}
                        className="h-11 font-semibold text-base"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Destinatários</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => { setNotifTargetAll(true); setNotifTargetUsers([]); }}
                          className={`h-10 rounded-md border text-sm font-semibold transition-colors ${notifTargetAll
                            ? 'bg-primary/15 text-primary border-primary/40'
                            : 'bg-background text-muted-foreground border-border hover:text-foreground'}`}
                        >
                          Todos
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotifTargetAll(false)}
                          className={`h-10 rounded-md border text-sm font-semibold transition-colors ${!notifTargetAll
                            ? 'bg-primary/15 text-primary border-primary/40'
                            : 'bg-background text-muted-foreground border-border hover:text-foreground'}`}
                        >
                          Usuários Específicos
                        </button>
                      </div>
                    </div>

                    {!notifTargetAll && (
                      <div className="space-y-2">
                        <Input
                          value={notifUserSearch}
                          onChange={e => setNotifUserSearch(e.target.value)}
                          placeholder="Buscar usuário por nome ou login..."
                          className="h-9 text-sm"
                        />
                        <div className="rounded-md border border-border bg-background/40 max-h-52 overflow-y-auto custom-scrollbar divide-y divide-border/30">
                          {users
                            .filter(u => {
                              const q = notifUserSearch.trim().toLowerCase();
                              if (!q) return true;
                              const name = (u.full_name || u.fullName || '').toLowerCase();
                              const username = (u.username || '').toLowerCase();
                              return name.includes(q) || username.includes(q);
                            })
                            .slice(0, 120)
                            .map(u => {
                              const checked = notifTargetUsers.includes(u.id);
                              return (
                                <label key={u.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-secondary/50">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      setNotifTargetUsers(prev => checked ? prev.filter(id => id !== u.id) : [...prev, u.id]);
                                    }}
                                    className="accent-primary"
                                  />
                                  <span className="text-xs font-medium text-foreground truncate">
                                    {u.full_name || u.fullName || u.username}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground ml-auto truncate">{u.username}</span>
                                </label>
                              );
                            })}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {notifTargetUsers.length} usuário(s) selecionado(s)
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-xl flex flex-col">
                  <CardHeader className="pb-3 border-b border-border/10">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      Conteúdo do Alerta
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Campo de texto avançado para formatar o aviso.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-5 flex-1 flex flex-col">
                    <div className="quill-editor-wrapper quill-alert-editor flex-1 rounded-xl border border-border/60 overflow-hidden bg-background/70 shadow-inner">
                      <ReactQuill
                        ref={quillRef}
                        theme="snow"
                        value={notifMessage}
                        onChange={setNotifMessage}
                        modules={quillModules}
                        formats={quillFormats}
                        placeholder="Escreva sua mensagem aqui..."
                      />
                    </div>
                    <div className="pt-4">
                      <Button className="w-full gap-2 h-12 text-base font-bold shadow-lg shadow-primary/20" type="submit">
                        <Send className="w-5 h-5" /> Enviar Alerta Agora
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </form>

              <Card className="border-border/40 bg-card/50 backdrop-blur-sm flex flex-col shadow-xl">
                <CardHeader className="pb-3 border-b border-border/10 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      Histórico de Mensagens Enviadas
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Últimos alertas enviados pelo sistema.
                    </CardDescription>
                  </div>
                  {notifications.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 h-8 gap-1.5 font-bold"
                      onClick={handleClearNotifications}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Limpar Histórico
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden">
                  {loadingNotifications ? (
                    <div className="py-20 text-center flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
                      <p className="text-sm text-muted-foreground">Carregando histórico...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-24 text-center text-muted-foreground">
                      <Bell className="w-12 h-12 mx-auto mb-4 opacity-10" />
                      <p className="text-sm">Nenhuma mensagem enviada</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/20 overflow-y-auto max-h-[420px] custom-scrollbar">
                      {notifications.map(n => (
                        <div key={n.id} className="px-6 py-5 hover:bg-primary/5 transition-colors group">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">{n.title}</h4>
                              <div
                                className="text-sm text-muted-foreground mt-2 line-clamp-3 opacity-80"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(n.message) }}
                              />
                              <div className="mt-3 flex items-center gap-3">
                                <span className="text-[10px] uppercase font-black text-primary/40 tracking-widest">
                                  {n.targetAll ? 'Global' : `${Array.isArray(n.targetUserIds) ? n.targetUserIds.length : 0} usuário(s)`}
                                </span>
                                <div className="w-1 h-1 rounded-full bg-border" />
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                                  <Clock className="w-3 h-3" />
                                  {new Date(n.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ━━ AUDITORIA ━━ */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <Card className="border-border/40">
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Filter className="w-4 h-4 text-primary" />Filtros</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3 items-center">
                    <select className="h-9 px-3 bg-background border border-input rounded-md text-sm" value={auditFilterUser} onChange={e => setAuditFilterUser(e.target.value)}><option value="">Todos os Representantes</option>{reps.map(r => <option key={r.id} value={r.code || ''}>{r.code || ''} — {r.full_name || r.fullName || r.username}</option>)}</select>
                    <select className="h-9 px-3 bg-background border border-input rounded-md text-sm" value={auditFilterUF} onChange={e => setAuditFilterUF(e.target.value)}><option value="">Todos os Estados</option>{UF_DATA.map(u => <option key={u.sigla} value={u.sigla}>{u.sigla}</option>)}</select>
                    <select className="h-9 px-3 bg-background border border-input rounded-md text-sm" value={auditFilterAction} onChange={e => setAuditFilterAction(e.target.value)}><option value="">Todas as Ações</option>{Object.entries(auditActionLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => { setAuditFilterUser(''); setAuditFilterAction(''); setAuditFilterUF(''); }}><X className="w-3.5 h-3.5" />Limpar</Button>
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
                        <TableHead className="pl-4">Solicitante</TableHead><TableHead>Área</TableHead><TableHead className="w-20">Modo</TableHead><TableHead className="w-28">Data</TableHead>
                        {key === 'pending' && <TableHead className="w-36 pr-4">Ação</TableHead>}
                      </TableRow></TableHeader>
                      <TableBody>{items.map(req => (
                        <TableRow key={req.id} className="border-border/30 hover:bg-secondary/30">
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold">{req.nome}</p>
                              {req.userId && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono font-bold tracking-tight">ID: {req.userId}</span>}
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

          {/* ━━ PERSONALIZAÇÃO ━━ */}
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
          {activeTab === 'baserotas' && (
            <BaseClientePanel 
              onSwitchToReps={() => setActiveTab('reps')} 
              canCreate={role === 'admin' || (myPermissions.find(p => p.moduleId === 'baserotas')?.canEdit || false)}
            />
          )}

          {/* ━━ PLANEJAMENTO DE ÁREAS (com contexto) ━━ */}
          {['clusters', 'blocos', 'roteiros', 'agenda', 'densidade', 'leituraplanilha', 'roteiro_seq', 'resumo_roteiro'].includes(activeTab) && (
            <RotasProvider>
              {activeTab === 'clusters' && <ClustersPanel />}
              {activeTab === 'blocos' && <BlocosPanel />}
              {activeTab === 'roteiros' && <RoteirosPanel />}
              {activeTab === 'agenda' && <AgendaPanel />}
              {activeTab === 'densidade' && <DensidadePanel />}
              {activeTab === 'leituraplanilha' && <LeituraPlanilhaPanel />}
              {activeTab === 'roteiro_seq' && <RotaSequencialPanel />}
              {activeTab === 'resumo_roteiro' && <ResumoRoteiroPanel />}
            </RotasProvider>
          )}

          <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
                <DialogContent className={editingUserId ? "max-w-6xl p-0 border-none bg-transparent shadow-none" : "max-w-4xl"}>
                  {editingUserId ? (() => {
                    const editingUser = users.find(u => u.id === editingUserId);
                    if (!editingUser) {
                      return (
                        <div className="p-20 flex flex-col items-center justify-center bg-card rounded-xl border border-border">
                          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                          <p className="text-sm text-muted-foreground">Carregando dados do perfil...</p>
                        </div>
                      );
                    }
                    return (
                      <>
                        <DialogHeader className="sr-only">
                          <DialogTitle>Gerenciador de Perfil - {editingUser.full_name || editingUser.fullName || 'Usuário'}</DialogTitle>
                          <DialogDescription>Configurações de perfil, permissões e histórico do usuário.</DialogDescription>
                        </DialogHeader>
                        <UserProfileManager
                          user={editingUser}
                          userTypes={userTypes}
                          allUsers={users}
                          onUpdate={fetchAll}
                          onClose={() => setIsUserModalOpen(false)}
                        />
                      </>
                    );
                  })() : (
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
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nome Completo</Label><Input value={newUser.fullName} onChange={e => setNewUser({ ...newUser, fullName: e.target.value })} className="h-9 text-xs" /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">E-mail</Label><Input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="h-9 text-xs" /></div>
                        
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">Tipo de Usuário</Label>
                          <CustomSelect 
                            options={[ { value: '', label: '— Selecionar —' }, ...userTypes.map(t => ({ value: String(t.id), label: t.name })) ]} 
                            value={String(newUser.userTypeId)} 
                            onChange={v => setNewUser({ ...newUser, userTypeId: v })} 
                            placeholder="Selecione..." 
                            className="h-9" 
                          />
                        </div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-primary">Cargo</Label><Input value={newUser.cargo} onChange={e => setNewUser({ ...newUser, cargo: e.target.value })} placeholder="Ex: Gerente" className="h-9 text-xs" /></div>

                        {/* Hierarquia de Gerenciamento (Multi-Select) */}
                        <div className="space-y-1.5 md:col-span-3">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">Gerenciamento</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="outline" 
                                className="w-full justify-between h-9 text-xs bg-background/50 border-border hover:bg-background/80 transition-all"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <Users2 className="w-3.5 h-3.5 text-primary" />
                                  <span className="truncate">
                                    {newUser.managedUserIds.length === 0 
                                      ? "Nenhum usuário selecionado" 
                                      : `${newUser.managedUserIds.length} usuário(s) selecionado(s)`}
                                  </span>
                                </div>
                                <ChevronDown className="w-3 h-3 text-muted-foreground" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent 
                              className="w-[320px] p-0 bg-card border-border shadow-2xl z-[3000] overflow-hidden rounded-xl" 
                              align="start"
                              onWheel={(e) => e.stopPropagation()} // Fix for some scroll issues in popovers
                            >
                              <div className="p-3 border-b border-border/50 bg-secondary/20">
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                  <input
                                    type="text"
                                    placeholder="Buscar por nome ou código..."
                                    className="w-full bg-background text-xs pl-9 pr-8 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                                    onChange={(e) => {
                                      const q = e.target.value.toLowerCase();
                                      const items = document.querySelectorAll('.managed-user-item');
                                      items.forEach((item: any) => {
                                        const text = item.getAttribute('data-search').toLowerCase();
                                        item.style.display = text.includes(q) ? 'flex' : 'none';
                                      });
                                    }}
                                  />
                                </div>
                                <div className="flex items-center justify-between mt-2 px-1">
                                  <span className="text-[10px] text-muted-foreground font-medium">
                                    {newUser.managedUserIds.length} selecionados
                                  </span>
                                  <div className="flex gap-2">
                                    <button 
                                      type="button"
                                      onClick={() => setNewUser({ ...newUser, managedUserIds: users.filter(u => u.id !== 0).map(u => u.id) })}
                                      className="text-[10px] font-bold text-primary hover:underline"
                                    >
                                      Todos
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => setNewUser({ ...newUser, managedUserIds: [] })}
                                      className="text-[10px] font-bold text-destructive hover:underline"
                                    >
                                      Limpar
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div 
                                className="max-h-[280px] overflow-y-auto overflow-x-hidden py-1 custom-scrollbar select-none"
                                style={{ WebkitOverflowScrolling: 'touch' }}
                              >
                                {users.filter(u => u.id !== 0).map(u => {
                                  const isSelected = newUser.managedUserIds.includes(u.id);
                                  const displayName = u.full_name || u.fullName || u.username;
                                  return (
                                    <button
                                      key={u.id}
                                      type="button"
                                      data-search={`${u.code} ${displayName}`}
                                      className={`managed-user-item w-full flex items-center gap-3 px-3 py-2 text-xs transition-all hover:bg-secondary group ${isSelected ? 'bg-primary/5' : ''}`}
                                      onClick={() => {
                                        const ids = [...newUser.managedUserIds];
                                        if (isSelected) {
                                          setNewUser({ ...newUser, managedUserIds: ids.filter(id => id !== u.id) });
                                        } else {
                                          setNewUser({ ...newUser, managedUserIds: [...ids, u.id] });
                                        }
                                      }}
                                    >
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary text-white' : 'border-border group-hover:border-primary/50'}`}>
                                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                      </div>
                                      <div className="flex flex-col items-start truncate">
                                        <span className={`font-semibold truncate ${isSelected ? 'text-primary' : 'text-foreground/90'}`}>
                                          {displayName}
                                        </span>
                                        {u.code && (
                                          <span className="text-[10px] text-muted-foreground font-mono">
                                            {u.code}
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </PopoverContent>
                          </Popover>
                          <p className="text-[10px] text-muted-foreground italic mt-1">Este usuário poderá visualizar todos os clientes dos usuários selecionados acima.</p>
                          
                          {/* Visualização dos selecionados */}
                          {newUser.managedUserIds.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {newUser.managedUserIds.map(id => {
                                const u = users.find(user => user.id === id);
                                if (!u) return null;
                                return (
                                  <div 
                                    key={id} 
                                    className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] text-primary font-medium animate-in fade-in zoom-in duration-200"
                                  >
                                    <span className="opacity-70 font-mono">{u.code}</span>
                                    <span>{u.full_name || u.username}</span>
                                    <button 
                                      type="button"
                                      onClick={() => setNewUser({ ...newUser, managedUserIds: newUser.managedUserIds.filter(mid => mid !== id) })}
                                      className="hover:text-destructive transition-colors ml-0.5"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Linha 3 */}
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-primary">Nome da Empresa</Label><Input value={newUser.companyName} onChange={e => setNewUser({ ...newUser, companyName: e.target.value })} placeholder="Ex: Tech Soluções" className="h-9 text-xs" /></div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">Grupo</Label>
                          <CustomSelect options={[ { value: '', label: '— Nenhum —' }, ...groupsData.map(g => ({ value: String(g.id), label: g.name })) ]} value={String(newUser.groupId)} onChange={v => setNewUser({ ...newUser, groupId: v })} placeholder="Selecione..." className="h-9" />
                        </div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Telefone</Label><Input value={newUser.telefone} onChange={e => setNewUser({ ...newUser, telefone: e.target.value })} placeholder="(00) 00000-0000" className="h-9 text-xs" /></div>

                        {/* Linha 4 */}
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Data de Nasc.</Label><Input type="date" value={newUser.birthDate} onChange={e => setNewUser({ ...newUser, birthDate: e.target.value })} className="h-9 text-xs" /></div>
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
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{newUser.documentType.toUpperCase()}</Label><Input value={newUser.document} onChange={e => setNewUser({ ...newUser, document: maskDoc(e.target.value, newUser.documentType) })} className="h-9 text-xs" /></div>

                        {/* Linhas de Senha (movidas para baixo) */}
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

                    <div className="mt-6 pt-4 border-t border-border/40 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <h4 className="col-span-full text-xs font-bold text-primary mb-1">ENDEREÇO</h4>
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">CEP</Label><Input value={newUser.cep} onChange={e => setNewUser({ ...newUser, cep: e.target.value.replace(/\D/g, '') })} onBlur={() => fetchCepAdmin(newUser.cep)} maxLength={8} className="h-9 text-xs" /></div>
                      <div className="space-y-1.5 md:col-span-2"><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Logradouro / Rua</Label><Input value={newUser.logradouro} onChange={e => setNewUser({ ...newUser, logradouro: e.target.value })} className="h-9 text-xs" /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Número</Label><Input value={newUser.numero} onChange={e => setNewUser({ ...newUser, numero: e.target.value })} className="h-9 text-xs" /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Complemento</Label><Input value={newUser.complemento} onChange={e => setNewUser({ ...newUser, complemento: e.target.value })} className="h-9 text-xs" /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bairro</Label><Input value={newUser.bairro_end} onChange={e => setNewUser({ ...newUser, bairro_end: e.target.value })} className="h-9 text-xs" /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cidade</Label><Input value={newUser.cidade} onChange={e => setNewUser({ ...newUser, cidade: e.target.value })} className="h-9 text-xs" /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">UF</Label><Input value={newUser.estado_end} onChange={e => setNewUser({ ...newUser, estado_end: e.target.value })} maxLength={2} className="h-9 text-xs uppercase" /></div>
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

        </main>
      </div>
    </div>
  </>);
}

