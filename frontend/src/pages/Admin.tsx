import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
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
  Database, Layers, Grid3X3, Calendar, FileSpreadsheet, Camera
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { REP_COLOR_PALETTE, getNextColorIndex } from '@/data/representatives';
import { UF_DATA } from '@/data/uf-codes';

import { BaseClientePanel } from '../components/admin/rotas/BaseClientePanel';
import { ClustersPanel } from '../components/admin/rotas/ClustersPanel';
import { BlocosPanel } from '../components/admin/rotas/BlocosPanel';
import { RoteirosPanel } from '../components/admin/rotas/RoteirosPanel';
import { AgendaPanel } from '../components/admin/rotas/AgendaPanel';
import { DensidadePanel } from '../components/admin/rotas/DensidadePanel';
import { LeituraPlanilhaPanel } from '../components/admin/rotas/LeituraPlanilhaPanel';
import { RotasProvider } from '../contexts/RotasContext';

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface Representative { code: string; name: string; fullName: string; isVago: boolean; colorIndex: number; }
interface Territory { id: number; municipio: string; uf: string; repCode: string; modo: string; }
interface SystemUser { id: number; username: string; role: string; repCode: string | null; fullName?: string; full_name?: string; document?: string; cpf_cnpj?: string; documentType?: 'cpf' | 'cnpj'; companyName?: string; age?: number; email?: string; photo?: string; }
interface InterestRequest { id: number; nome: string; email: string | null; telefone: string | null; empresa: string | null; municipio: string; uf: string; modo: string | null; observacoes: string | null; status: 'pending' | 'accepted' | 'rejected'; created_at: string; }

interface Group { id: string; name: string; repCodes: string[]; createdAt: string; }
interface Notification { id: string; title: string; message: string; targetAll: boolean; targetReps: string[]; sentAt: string; readBy: string[]; }
interface AuditLog { id: string; action: string; entity: string; entityId: string; details: string; repCode?: string; uf?: string; municipio?: string; performedBy: string; timestamp: string; }

const API = 'http://localhost:3001';
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

// ─── MultiSelect for reps ─────────────────────────────────────────────────────
function MultiRepSelect({ reps, value, onChange }: { reps: Representative[]; value: string[]; onChange: (v: string[]) => void; }) {
  const toggle = (code: string) => onChange(value.includes(code) ? value.filter(c => c !== code) : [...value, code]);
  return (
    <div className="border border-border rounded-md max-h-44 overflow-y-auto">
      {reps.map(r => (
        <label key={r.code} className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/40 cursor-pointer">
          <input type="checkbox" className="rounded" checked={value.includes(r.code)} onChange={() => toggle(r.code)} />
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.isVago ? '#555' : (REP_COLOR_PALETTE[r.colorIndex] || '#888') }} />
          <span className="text-sm">{r.code} — {r.name}</span>
        </label>
      ))}
    </div>
  );
}

export default function Admin() {
  const { token, logout, repCode: myRepCode } = useAuth();
  const navigate = useNavigate();

  // ── Core API data ──────────────────────────────────────────────────────────
  const [reps, setReps] = useState<Representative[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [interests, setInterests] = useState<InterestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  type TabId = 'dashboard' | 'users' | 'reps' | 'territories' | 'groups' | 'notifications' | 'audit' | 'interests' | 'personal' | 'rotas' | 'baserotas' | 'clusters' | 'blocos' | 'roteiros' | 'agenda' | 'densidade' | 'leituraplanilha';
  
  const { role } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabId>(role === 'supervisor' ? 'baserotas' : 'dashboard');
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['settings', 'rotas_menu']);

  // ── Brand / Personalização ────────────────────────────────────────────────
  const [brandLogo, setBrandLogo] = useState<string>(() => localStorage.getItem('brand_logo') || '');
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
  const [editForm, setEditForm] = useState({ name: '', fullName: '', isVago: false });
  const [newRep, setNewRep] = useState({ code: '', name: '', fullName: '', isVago: false });

  // ── Users form (enhanced) ─────────────────────────────────────────────────
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', confirmPassword: '', role: 'user', repCode: '', documentType: 'cpf' as 'cpf' | 'cnpj', document: '', companyName: '', age: '', photo: '' });
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUserForm, setEditUserForm] = useState({ username: '', fullName: '', document: '', password: '', confirmPassword: '', role: 'user', repCode: '', photo: '' });
  const [showEditPwd, setShowEditPwd] = useState(false);

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

  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  // ── Fetch all API data ─────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [rR, tR, uR, iR] = await Promise.all([
        fetch(`${API}/api/admin/reps`),
        fetch(`${API}/api/admin/territories`),
        fetch(`${API}/api/admin/users`, { headers: authHeaders }),
        fetch(`${API}/api/interest`, { headers: authHeaders }),
      ]);
      if (rR.ok) setReps(await rR.json());
      if (tR.ok) setTerritories(await tR.json());
      if (uR.ok) setUsers(await uR.json());
      if (iR.ok) setInterests(await iR.json());
    } catch { toast.error('Erro ao carregar dados'); }
    finally { setLoading(false); }
  };
  
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAll(); }, []);

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
    Promise.all([
      fetch(`${IBGE}/municipios/${selectedMunicipio}/subdistritos`).then(r => r.ok ? r.json() : []),
      fetch(`${IBGE}/municipios/${selectedMunicipio}/distritos`).then(r => r.ok ? r.json() : []),
    ]).then(([s, d]) => { const all = [...s, ...d].sort((a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome)); setSubdistritos(all); })
      .catch(() => toast.error('Erro ao carregar bairros')).finally(() => setLoadingSubdistritos(false));
  }, [selectedMunicipio, includeBairro]);

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
    const colorIndex = newRep.isVago ? 0 : getNextColorIndex(reps);
    const res = await fetch(`${API}/api/admin/reps`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ ...newRep, fullName: newRep.fullName || newRep.name, colorIndex }) });
    if (res.ok) { toast.success(`Representante ${newRep.code} cadastrado!`); addAudit('create_rep', 'Representante', newRep.code, `Criou rep ${newRep.code} — ${newRep.name}`); setNewRep({ code: '', name: '', fullName: '', isVago: false }); fetchAll(); }
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
    const res = await fetch(`${API}/api/admin/reps/${code}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(editForm) });
    if (res.ok) { toast.success('Atualizado!'); addAudit('update_rep', 'Representante', code, `Editou rep ${code}`); setEditingCode(null); fetchAll(); }
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
      if (res.ok) { ok++; addAudit('assign_territory', 'Território', item.municipio, `Atribuiu ${item.municipio}/${item.uf} → ${item.repCode}`, { repCode: item.repCode, uf: item.uf, municipio: item.municipio }); }
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
    if (!newUser.fullName.trim() || !newUser.email.trim() || !newUser.password.trim()) { toast.error('Nome, email e senha são obrigatórios'); return; }
    if (!newUser.document.trim()) { toast.error('Documento é obrigatório'); return; }
    if (newUser.password !== newUser.confirmPassword) { toast.error('As senhas não coincidem!'); return; }
    const body: Record<string, string> = { username: newUser.email, password: newUser.password, role: newUser.role, fullName: newUser.fullName, email: newUser.email, document: newUser.document, documentType: newUser.documentType, age: newUser.age };
    if (newUser.documentType === 'cnpj' && newUser.companyName) body.companyName = newUser.companyName;
    if (newUser.repCode) body.repCode = newUser.repCode;
    if (newUser.photo) body.photo = newUser.photo;
    const res = await fetch(`${API}/api/admin/users`, { method: 'POST', headers: authHeaders, body: JSON.stringify(body) });
    if (res.ok) { toast.success(`Usuário "${newUser.fullName}" criado!`); addAudit('create_user', 'Usuário', newUser.email, `Criou usuário ${newUser.fullName} (${newUser.email})`); setNewUser({ fullName: '', email: '', password: '', confirmPassword: '', role: 'user', repCode: '', documentType: 'cpf', document: '', companyName: '', age: '', photo: '' }); fetchAll(); }
    else { const err = await res.json(); toast.error(err.message || 'Erro'); }
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
    if (res.ok) { toast.success('Usuário atualizado!'); addAudit('update_user', 'Usuário', String(id), `Atualizou usuário ${editUserForm.username}`); setEditingUserId(null); fetchAll(); }
    else { const err = await res.json(); toast.error(err.message || 'Erro'); }
  };

  const handleInterestStatus = async (id: number, status: 'accepted' | 'rejected') => {
    const res = await fetch(`${API}/api/interest/${id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify({ status }) });
    if (res.ok) { toast.success(status === 'accepted' ? 'Aceito!' : 'Recusado'); addAudit(status === 'accepted' ? 'accept_interest' : 'reject_interest', 'Interesse', String(id), `${status === 'accepted' ? 'Aceitou' : 'Recusou'} interesse #${id}`); fetchAll(); }
    else toast.error('Erro');
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

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin w-10 h-10 text-primary" />
        <p className="text-sm text-muted-foreground">Carregando painel administrativo...</p>
      </div>
    </div>
  );

  const pendingInterests = interests.filter(i => i.status === 'pending').length;

  const navItems: { id: TabId | 'settings' | 'rotas_menu'; label: string; icon: React.ElementType; count?: number; badge?: boolean; restrict?: string[]; subItems?: { id: TabId; label: string; icon: React.ElementType; count?: number; }[] }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, restrict: ['admin'] },
    { id: 'reps', label: 'Representantes', icon: Briefcase, count: reps.length, restrict: ['admin'] },
    { id: 'territories', label: 'Territórios', icon: MapPin, count: territories.length, restrict: ['admin'] },
    { id: 'rotas_menu', label: 'Rotas', icon: Truck, restrict: ['admin', 'supervisor'], subItems: [
        { id: 'leituraplanilha', label: 'Leitura Excel', icon: FileSpreadsheet },
        { id: 'baserotas', label: 'Base Cliente', icon: Database },
        { id: 'clusters', label: 'Clusters', icon: Layers },
        { id: 'blocos', label: 'Blocos', icon: Grid3X3 },
        { id: 'roteiros', label: 'Roteiros', icon: Map },
        { id: 'agenda', label: 'Agenda', icon: Calendar },
        { id: 'densidade', label: 'Densidade', icon: Activity },
    ]},
    { id: 'interests', label: 'Interesses', icon: HandHeart, count: pendingInterests, badge: pendingInterests > 0, restrict: ['admin'] },
    { id: 'notifications', label: 'Enviar Alerta', icon: Bell, count: notifications.length, restrict: ['admin'] },
    { id: 'settings', label: 'Configurações', icon: Settings, restrict: ['admin'], subItems: [
        { id: 'users', label: 'Usuários', icon: UserPlus, count: users.length },
        { id: 'groups', label: 'Grupos', icon: UsersRound, count: groups.length },
        { id: 'personal', label: 'Personalização', icon: Palette },
        { id: 'audit', label: 'Auditoria', icon: ScrollText, count: auditLogs.length },
    ]}
  ];

  return (<>
    <ConfirmDialog open={confirmDialog.open} title={confirmDialog.title} description={confirmDialog.description} confirmLabel="Confirmar" onConfirm={confirmDialog.onConfirm} onCancel={closeConfirm} />

    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside className="w-64 shrink-0 flex flex-col border-r border-border/40 bg-card/60 backdrop-blur">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-border/40 bg-gradient-to-r from-primary/10 to-transparent">
          {brandLogo ? (
            <img src={brandLogo} alt="Logo" className="w-8 h-8 rounded-lg object-contain shrink-0 ring-1 ring-primary/30" />
          ) : (
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center shrink-0 ring-1 ring-primary/30">
              <Map className="w-4 h-4 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground leading-none">{brandName}</p>
            <p className="text-[10px] text-primary/70 mt-0.5 font-semibold uppercase tracking-widest">Painel Admin</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {navItems.map(item => {
            // Role restriction implementation
            if (item.restrict && !item.restrict.includes(role || '')) return null;

            const Icon = item.icon; 
            const active = activeTab === item.id || item.subItems?.some(s => s.id === activeTab);
            const isExpanded = expandedMenus.includes(item.id);

            return (
              <div key={item.id} className="space-y-0.5">
                <button onClick={() => {
                  if (item.subItems) {
                    setExpandedMenus(prev => prev.includes(item.id) ? prev.filter(m => m !== item.id) : [...prev, item.id]);
                  } else {
                    setActiveTab(item.id as TabId);
                  }
                }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${active && !item.subItems ? 'bg-primary/15 text-primary shadow-sm ring-1 ring-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}>
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  <span className={`flex-1 text-sm font-medium ${active && item.subItems ? 'text-foreground' : ''}`}>{item.label}</span>
                  {item.count !== undefined && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active && !item.subItems ? 'bg-primary/20 text-primary' : item.badge ? 'bg-amber-500/20 text-amber-400' : 'bg-muted text-muted-foreground'}`}>{item.count}</span>
                  )}
                  {item.subItems && (
                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform text-muted-foreground group-hover:text-foreground ${isExpanded ? 'rotate-180' : ''}`} />
                  )}
                </button>
                {item.subItems && isExpanded && (
                  <div className="pl-9 space-y-0.5 mt-1 border-l-2 border-border/40 ml-4 py-1">
                    {item.subItems.map(sub => {
                      const SubIcon = sub.icon;
                      const subActive = activeTab === sub.id;
                      return (
                        <button key={sub.id} onClick={() => setActiveTab(sub.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all group ${subActive ? 'bg-primary/15 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'}`}>
                          <SubIcon className={`w-3.5 h-3.5 shrink-0 ${subActive ? 'text-primary' : 'text-muted-foreground/70 group-hover:text-foreground'}`} />
                          <span className="flex-1 text-sm font-medium">{sub.label}</span>
                          {sub.count !== undefined && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${subActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>{sub.count}</span>
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

        <div className="p-3 border-t border-border/40 space-y-1">
          <button onClick={() => { logout(); navigate('/login'); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all text-sm">
            <LogOut className="w-4 h-4 shrink-0" /><span>Sair do sistema</span>
          </button>
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all text-sm">
            <Map className="w-4 h-4 shrink-0" /><span>Ver Mapa</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 px-6 flex items-center justify-between border-b border-border/40 bg-card/30 shrink-0">
          <div className="flex items-center gap-3">
            {navItems.find(n => n.id === activeTab) && React.createElement(navItems.find(n => n.id === activeTab)!.icon, { className: 'w-5 h-5 text-primary' })}
            <div>
              <h1 className="text-base font-semibold text-foreground">{navItems.find(n => n.id === activeTab)?.label}</h1>
              <p className="text-xs text-muted-foreground">Painel Administrativo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={fetchAll} className="p-2 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-all" title="Recarregar dados">
              <RefreshCw className="w-4 h-4" />
            </button>
            <Button onClick={handleDownloadLogisticsPlan} disabled={isGeneratingPlan} variant="outline" className="gap-2 shrink-0 border-primary/30 hover:bg-primary/5 text-primary">
              {isGeneratingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {isGeneratingPlan ? 'Gerando...' : 'Gerar Plano Logístico'}
            </Button>
            {pendingInterests > 0 && <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5"><AlertCircle className="w-3.5 h-3.5 text-amber-400" /><span className="text-xs font-semibold text-amber-400">{pendingInterests} pendente(s)</span></div>}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">

          {/* ══ DASHBOARD ══ */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Usuários', value: users.length, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', tab: 'users' as TabId },
                  { label: 'Representantes', value: reps.length, icon: Briefcase, color: 'text-purple-400', bg: 'bg-purple-500/10', tab: 'reps' as TabId },
                  { label: 'Territórios', value: territories.length, icon: MapPin, color: 'text-green-400', bg: 'bg-green-500/10', tab: 'territories' as TabId },
                  { label: 'Pendentes', value: pendingInterests, icon: HandHeart, color: 'text-amber-400', bg: 'bg-amber-500/10', tab: 'interests' as TabId },
                  { label: 'Grupos', value: groups.length, icon: UsersRound, color: 'text-cyan-400', bg: 'bg-cyan-500/10', tab: 'groups' as TabId },
                  { label: 'Notificações', value: notifications.length, icon: Bell, color: 'text-pink-400', bg: 'bg-pink-500/10', tab: 'notifications' as TabId },
                  { label: 'Logs Auditoria', value: auditLogs.length, icon: ScrollText, color: 'text-orange-400', bg: 'bg-orange-500/10', tab: 'audit' as TabId },
                  { label: 'Interesses', value: interests.length, icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-500/10', tab: 'interests' as TabId },
                ].map(s => (
                  <button key={s.label} onClick={() => setActiveTab(s.tab)}
                    className="bg-card border border-border/40 rounded-xl p-4 text-left hover:border-primary/30 hover:bg-card/80 transition-all group">
                    <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <p className="text-2xl font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </button>
                ))}
              </div>

              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><ScrollText className="w-4 h-4 text-primary" />Atividade Recente</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {auditLogs.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground"><Activity className="w-8 h-8 mx-auto mb-2 opacity-20" /><p className="text-sm">Nenhuma atividade registrada</p></div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {auditLogs.slice(0, 8).map(log => (
                        <div key={log.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20">
                          <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                            <BadgeCheck className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{log.details}</p>
                            <p className="text-[10px] text-muted-foreground">{auditActionLabel[log.action] || log.action}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{new Date(log.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ══ USUÁRIOS ══ */}
          {activeTab === 'users' && (
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
              <div className="xl:col-span-2">
                <Card className="border-border/40">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <div className="w-7 h-7 bg-primary/15 rounded-md flex items-center justify-center"><UserPlus className="w-3.5 h-3.5 text-primary" /></div>
                      Novo Usuário
                    </CardTitle>
                    <CardDescription className="text-xs">Crie logins para acessar o sistema</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateUser} className="space-y-3">
                      <div className="flex items-center gap-4 mb-2">
                        <label className="shrink-0 cursor-pointer group relative w-16 h-16 rounded-xl bg-secondary border border-border/40 flex items-center justify-center overflow-hidden hover:border-primary/50 transition-colors">
                          {newUser.photo ? <img src={newUser.photo} alt="Avatar" className="w-full h-full object-cover" /> : <Camera className="w-5 h-5 text-muted-foreground" />}
                          <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-all"><Camera className="w-4 h-4 text-white" /></div>
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleUserPhotoUpload(e, false)} />
                        </label>
                        <div className="text-xs text-muted-foreground"><p className="font-medium text-foreground">Foto de Perfil</p><p>Máx. 2MB (opcional)</p></div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Nome Completo *</label>
                        <Input placeholder="Ex: João da Silva" value={newUser.fullName} onChange={e => setNewUser({ ...newUser, fullName: e.target.value })} required />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Tipo de Documento</label>
                        <div className="flex gap-2">
                          {(['cpf', 'cnpj'] as const).map(t => (
                            <button key={t} type="button" onClick={() => setNewUser({ ...newUser, documentType: t, document: '' })}
                              className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold border transition-all ${newUser.documentType === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                              {t.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{newUser.documentType === 'cpf' ? 'CPF' : 'CNPJ'} *</label>
                        <Input placeholder={newUser.documentType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'} value={newUser.document}
                          onChange={e => setNewUser({ ...newUser, document: maskDoc(e.target.value, newUser.documentType) })} required />
                      </div>
                      {newUser.documentType === 'cnpj' && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" />Nome da Empresa *</label>
                          <Input placeholder="Razão social" value={newUser.companyName} onChange={e => setNewUser({ ...newUser, companyName: e.target.value })} required />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Idade</label>
                          <Input type="number" min="1" max="120" placeholder="Ex: 35" value={newUser.age} onChange={e => setNewUser({ ...newUser, age: e.target.value })} />
                        </div>
                        {role === 'admin' && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Papel *</label>
                          <div className="flex gap-1.5 h-9">
                            {(['user', 'supervisor'] as const).map(r => (
                              <button key={r} type="button" onClick={() => setNewUser({ ...newUser, role: r })}
                                className={`flex-1 rounded-md text-[11px] font-semibold border transition-all flex items-center justify-center gap-1 ${newUser.role === r ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
                                {r === 'supervisor' ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}{r === 'supervisor' ? 'Supervisor' : 'User'}
                              </button>
                            ))}
                          </div>
                        </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Email *</label>
                        <Input type="email" placeholder="email@exemplo.com" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Senha *</label>
                          <div className="relative">
                            <Input type={showNewPwd ? 'text' : 'password'} placeholder="Senha de acesso" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="pr-10" required />
                            <button type="button" tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowNewPwd(v => !v)}>
                              {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Confirmar Senha *</label>
                          <Input type={showNewPwd ? 'text' : 'password'} placeholder="Confirme a senha" value={newUser.confirmPassword} onChange={e => setNewUser({ ...newUser, confirmPassword: e.target.value })} required />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Vincular Representante <span className="font-normal">(opcional)</span></label>
                        <select className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" value={newUser.repCode} onChange={e => setNewUser({ ...newUser, repCode: e.target.value })}>
                          <option value="">— Nenhum —</option>
                          {reps.map(r => <option key={r.code} value={r.code}>{r.code} — {r.name}</option>)}
                        </select>
                      </div>
                      <Button className="w-full gap-2" type="submit"><Plus className="w-4 h-4" />Criar Usuário</Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              <div className="xl:col-span-3">
                <Card className="border-border/40">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-sm"><Users className="w-4 h-4 text-primary" />Usuários do Sistema</CardTitle>
                      <span className="text-xs text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full">{users.length} total</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {users.length === 0 ? (
                      <div className="py-16 text-center text-muted-foreground"><Users className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="text-sm">Nenhum usuário</p></div>
                    ) : (
                      <div className="overflow-hidden rounded-b-lg">
                        <Table>
                          <TableHeader><TableRow className="hover:bg-transparent border-border/40">
                            <TableHead className="pl-4">Usuário</TableHead>
                            <TableHead className="w-20">Papel</TableHead>
                            <TableHead>Representante</TableHead>
                            <TableHead className="w-20 pr-4"></TableHead>
                          </TableRow></TableHeader>
                          <TableBody>
                            {users.map(u => (
                              <React.Fragment key={u.id}>
                                <TableRow className={`border-border/30 ${editingUserId === u.id ? 'bg-primary/5' : 'hover:bg-secondary/30'}`}>
                                  <TableCell className="pl-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-full bg-secondary border border-border/50 shrink-0 overflow-hidden flex items-center justify-center">
                                        {u.photo ? <img src={u.photo} alt={u.username} className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-muted-foreground" />}
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold">{u.full_name || u.fullName || u.username}</p>
                                        <p className="text-[10px] text-muted-foreground">{u.username} • ID #{u.id}</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 w-fit ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : u.role === 'supervisor' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                      {u.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : u.role === 'supervisor' ? <Briefcase className="w-3 h-3" /> : <User className="w-3 h-3" />}{u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{u.repCode ? (() => { const r = reps.find(r => r.code === u.repCode); return r ? `${r.code} — ${r.name}` : u.repCode; })() : '—'}</TableCell>
                                  <TableCell className="pr-4">
                                    <div className="flex gap-1 justify-end">
                                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 hover:text-primary" onClick={() => editingUserId === u.id ? setEditingUserId(null) : (setEditingUserId(u.id), setEditUserForm({ username: u.username, fullName: u.full_name || u.fullName || '', document: u.document || u.cpf_cnpj || '', password: '', confirmPassword: '', role: u.role, repCode: u.repCode || '', photo: u.photo || '' }))}>
                                        {editingUserId === u.id ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteUser(u.id, u.username)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                                {editingUserId === u.id && (
                                  <TableRow className="bg-primary/5 border-border/30">
                                    <TableCell colSpan={4} className="py-3 px-6">
                                      <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-4">
                                          <label className="shrink-0 cursor-pointer group relative w-12 h-12 rounded-full bg-secondary border border-border/40 flex items-center justify-center overflow-hidden hover:border-primary/50 transition-colors">
                                            {editUserForm.photo ? <img src={editUserForm.photo} alt="Avatar" className="w-full h-full object-cover" /> : <Camera className="w-4 h-4 text-muted-foreground" />}
                                            <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-all"><Camera className="w-3 h-3 text-white" /></div>
                                            <input type="file" accept="image/*" className="hidden" onChange={e => handleUserPhotoUpload(e, true)} />
                                          </label>
                                          <span className="text-xs text-muted-foreground font-medium">Trocar Foto</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                          <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Nome (Username)</label><Input value={editUserForm.fullName} onChange={e => setEditUserForm(f => ({ ...f, fullName: e.target.value }))} className="h-8 text-xs" /></div>
                                          <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Email</label><Input value={editUserForm.username} onChange={e => setEditUserForm(f => ({ ...f, username: e.target.value }))} className="h-8 text-xs" /></div>
                                          <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Nova Senha</label>
                                            <div className="relative"><Input type={showEditPwd ? 'text' : 'password'} value={editUserForm.password} onChange={e => setEditUserForm(f => ({ ...f, password: e.target.value }))} className="h-8 text-xs pr-8" placeholder="Opcional" />
                                              <button type="button" tabIndex={-1} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowEditPwd(v => !v)}>{showEditPwd ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}</button>
                                            </div>
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[10px] text-muted-foreground">Confirmar Senha</label>
                                            <Input type={showEditPwd ? 'text' : 'password'} value={editUserForm.confirmPassword} onChange={e => setEditUserForm(f => ({ ...f, confirmPassword: e.target.value }))} className="h-8 text-xs" placeholder="Confirmação" />
                                          </div>
                                          {role === 'admin' && (
                                          <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Papel</label>
                                            <select className="w-full h-8 text-xs px-2 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary" value={editUserForm.role} onChange={e => setEditUserForm(f => ({ ...f, role: e.target.value }))}>
                                              <option value="user">User</option>
                                              <option value="supervisor">Supervisor</option>
                                              <option value="admin">Admin</option>
                                            </select>
                                          </div>
                                          )}
                                        </div>
                                      <div className="flex gap-2 mt-2">
                                        <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={() => handleUpdateUser(u.id)}><Save className="w-3 h-3" />Salvar</Button>
                                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingUserId(null)}>Cancelar</Button>
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
            </div>
          )}

          {/* ══ REPRESENTANTES ══ */}
          {activeTab === 'reps' && (
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
              <div className="xl:col-span-2">
                <Card className="border-border/40">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-sm"><div className="w-7 h-7 bg-primary/15 rounded-md flex items-center justify-center"><Briefcase className="w-3.5 h-3.5 text-primary" /></div>Novo Representante</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateRep} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Código *</label><Input placeholder="Ex: REP001" value={newRep.code} onChange={e => setNewRep({ ...newRep, code: e.target.value })} required /></div>
                        <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Nome Curto *</label><Input placeholder="Ex: AVILA" value={newRep.name} onChange={e => setNewRep({ ...newRep, name: e.target.value })} required /></div>
                      </div>
                      <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Nome da Representação</label><Input placeholder="Nome completo ou razão social" value={newRep.fullName} onChange={e => setNewRep({ ...newRep, fullName: e.target.value })} /></div>
                      <label className="flex items-center gap-2.5 text-sm text-muted-foreground cursor-pointer select-none p-3 rounded-lg border border-border/50 hover:bg-secondary/30 transition-colors">
                        <input type="checkbox" checked={newRep.isVago} onChange={e => setNewRep({ ...newRep, isVago: e.target.checked })} className="rounded" />
                        <div><p className="text-xs font-medium text-foreground">Marcar como Vago</p><p className="text-[10px] text-muted-foreground">Territórios sem representante ativo</p></div>
                      </label>
                      <Button className="w-full gap-2" type="submit"><Plus className="w-4 h-4" />Cadastrar Representante</Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
              <div className="xl:col-span-3">
                <Card className="border-border/40">
                  <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm">Representantes Cadastrados</CardTitle><span className="text-xs text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full">{reps.length} total</span></div></CardHeader>
                  <CardContent className="p-0">
                    {reps.length === 0 ? (<div className="py-16 text-center text-muted-foreground"><Briefcase className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="text-sm">Nenhum representante</p></div>) : (
                      <div className="overflow-hidden rounded-b-lg"><Table>
                        <TableHeader><TableRow className="hover:bg-transparent border-border/40"><TableHead className="w-8 pl-4"></TableHead><TableHead className="w-20">Código</TableHead><TableHead>Nome</TableHead><TableHead className="w-14 text-center">Terr.</TableHead><TableHead className="w-20 pr-4"></TableHead></TableRow></TableHeader>
                        <TableBody>{reps.map(rep => (
                          <React.Fragment key={rep.code}>
                            <TableRow className={`border-border/30 ${editingCode === rep.code ? 'bg-primary/5' : 'hover:bg-secondary/30'}`}>
                              <TableCell className="pl-4"><div className="w-3 h-3 rounded-full" style={{ background: rep.isVago ? '#555' : (REP_COLOR_PALETTE[rep.colorIndex] || '#888') }} /></TableCell>
                              <TableCell className="font-mono text-xs font-bold text-primary">{rep.code}</TableCell>
                              <TableCell><p className="text-xs font-medium">{rep.name}</p>{rep.isVago && <span className="text-[10px] text-orange-400 font-semibold">VAGO</span>}</TableCell>
                              <TableCell className="text-center text-xs text-muted-foreground">{territories.filter(t => t.repCode === rep.code).length}</TableCell>
                              <TableCell className="pr-4"><div className="flex gap-1 justify-end">
                                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 hover:text-primary" onClick={() => editingCode === rep.code ? setEditingCode(null) : (setEditingCode(rep.code), setEditForm({ name: rep.name, fullName: rep.fullName, isVago: rep.isVago }))}>{editingCode === rep.code ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}</Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteRep(rep.code, rep.name)}><Trash2 className="w-3.5 h-3.5" /></Button>
                              </div></TableCell>
                            </TableRow>
                            {editingCode === rep.code && (<TableRow className="bg-primary/5 border-border/30"><TableCell colSpan={5} className="py-3 px-6">
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Editando {rep.code}</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Nome Curto</label><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-xs" /></div>
                                  <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Nome Completo</label><Input value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} className="h-8 text-xs" /></div>
                                </div>
                                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer"><input type="checkbox" checked={editForm.isVago} onChange={e => setEditForm(f => ({ ...f, isVago: e.target.checked }))} />Marcar como Vago</label>
                                <div className="flex gap-2"><Button size="sm" className="gap-1.5 h-7 text-xs" onClick={() => handleUpdateRep(rep.code)}><Save className="w-3 h-3" />Salvar</Button><Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingCode(null)}>Cancelar</Button></div>
                              </div>
                            </TableCell></TableRow>)}
                          </React.Fragment>
                        ))}</TableBody>
                      </Table></div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ══ TERRITÓRIOS ══ */}
          {activeTab === 'territories' && (
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
              <div className="xl:col-span-2 space-y-4">
                <Card className="border-border/40">
                  <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-sm"><div className="w-7 h-7 bg-primary/15 rounded-md flex items-center justify-center"><MapPin className="w-3.5 h-3.5 text-primary" /></div>Atribuir Território</CardTitle><CardDescription className="text-xs">Selecione representante, estado e município</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    {reps.length === 0 ? (<p className="text-sm text-muted-foreground text-center py-4">Cadastre representantes primeiro</p>) : (<>
                      <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Representante *</label><SearchableSelect options={repOptions} value={selectedRep} onChange={setSelectedRep} placeholder="Selecione..." /></div>
                      <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Modo *</label>
                        <div className="flex gap-2">{(['planejamento', 'atendimento'] as const).map(m => (<button key={m} type="button" onClick={() => setSelectedModo(m)} className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold border transition-all ${selectedModo === m ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>{m === 'planejamento' ? 'Planejamento' : 'Atendimento'}</button>))}</div>
                      </div>
                      <div className="border-t border-border/40 pt-4 space-y-3">
                        <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado *</label><SearchableSelect options={ufOptions} value={selectedUF} onChange={v => { setSelectedUF(v); setSelectedMunicipio(''); setSelectedMunicipioName(''); setSelectedBairro(''); }} placeholder="Selecione o estado..." /></div>
                        <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Município *</label><SearchableSelect options={municipioOptions} value={selectedMunicipio} onChange={handleSelectMunicipio} placeholder={selectedUF ? 'Selecione...' : 'Selecione o estado primeiro'} disabled={!selectedUF} loading={loadingMunicipios} /></div>
                        <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-lg border border-border/40 hover:bg-secondary/30 transition-colors">
                          <div className={`w-9 h-5 rounded-full transition-colors relative ${includeBairro ? 'bg-primary' : 'bg-secondary'}`} onClick={() => { setIncludeBairro(!includeBairro); setSelectedBairro(''); }}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${includeBairro ? 'translate-x-4' : 'translate-x-0.5'}`} /></div>
                          <div><p className="text-xs font-medium">Especificar Bairro</p><p className="text-[10px] text-muted-foreground">Dados via IBGE</p></div>
                        </label>
                        {includeBairro && (<div className="space-y-1.5 pl-2 border-l-2 border-primary/30"><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bairro</label><SearchableSelect options={bairroOptions} value={selectedBairro} onChange={setSelectedBairro} placeholder={selectedMunicipio ? 'Selecione...' : 'Selecione o município primeiro'} disabled={!selectedMunicipio} loading={loadingSubdistritos} /></div>)}
                      </div>
                      <Button type="button" variant="outline" className="w-full gap-2 border-primary/30 hover:bg-primary/5" onClick={handleAddToStaged} disabled={!selectedRep || !selectedUF || !selectedMunicipioName}><Plus className="w-4 h-4" />Adicionar à Lista</Button>
                    </>)}
                  </CardContent>
                </Card>
                {staged.length > 0 && (<Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Check className="w-4 h-4 text-primary" />Lista ({staged.length})</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {staged.map((item, i) => { const r = reps.find(r => r.code === item.repCode); return (<div key={i} className="flex items-center gap-2 bg-card rounded-md px-3 py-2 border border-border/50"><div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate">{item.municipio}/{item.uf}</p><p className="text-[10px] text-primary">{r ? r.name : item.repCode} · {item.modo === 'planejamento' ? 'Plan.' : 'Atend.'}</p></div><button onClick={() => setStaged(s => s.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button></div>); })}
                    <Button className="w-full gap-2 mt-2" onClick={handleConfirmStaged}><Check className="w-4 h-4" />Confirmar Todos ({staged.length})</Button>
                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-destructive" onClick={() => setStaged([])}>Limpar Lista</Button>
                  </CardContent>
                </Card>)}
              </div>
              <div className="xl:col-span-3">
                <Card className="border-border/40">
                  <CardHeader className="pb-3"><div className="flex items-center justify-between flex-wrap gap-2"><CardTitle className="text-sm">Territórios Atribuídos</CardTitle><div className="flex gap-2"><div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" /><Input placeholder="Filtrar UF..." value={filterUF} onChange={e => setFilterUF(e.target.value)} className="h-8 text-xs pl-7 w-28" /></div><select className="h-8 px-2 bg-background border border-input rounded-md text-xs" value={filterRep} onChange={e => setFilterRep(e.target.value)}><option value="">Todos</option>{reps.map(r => <option key={r.code} value={r.code}>{r.code} - {r.name}</option>)}</select></div></div></CardHeader>
                  <CardContent className="p-0">
                    {filteredTerritories.length === 0 ? (<div className="py-16 text-center text-muted-foreground"><MapPin className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="text-sm">Nenhum território encontrado</p></div>) : (
                      <div className="overflow-auto max-h-[calc(100vh-300px)] rounded-b-lg"><Table>
                        <TableHeader><TableRow className="hover:bg-transparent border-border/40"><TableHead className="pl-4">Município</TableHead><TableHead className="w-12">UF</TableHead><TableHead>Representante</TableHead><TableHead className="w-20">Modo</TableHead><TableHead className="w-10 pr-4"></TableHead></TableRow></TableHeader>
                        <TableBody>{filteredTerritories.map(t => {
                          const r = reps.find(r => r.code === t.repCode); return (<TableRow key={t.id} className="border-border/30 hover:bg-secondary/30">
                            <TableCell className="text-xs font-medium pl-4">{t.municipio}</TableCell><TableCell className="text-xs font-mono text-muted-foreground">{t.uf}</TableCell>
                            <TableCell><div className="flex items-center gap-2">{r && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.isVago ? '#555' : (REP_COLOR_PALETTE[r.colorIndex] || '#888') }} />}<span className="text-xs">{r ? `${r.code} — ${r.name}` : t.repCode}</span></div></TableCell>
                            <TableCell><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.modo === 'planejamento' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>{t.modo === 'planejamento' ? 'Plan.' : 'Atend.'}</span></TableCell>
                            <TableCell className="pr-4"><Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteTerritory(t.id, t.municipio, t.repCode, t.uf)}><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>
                          </TableRow>);
                        })}</TableBody>
                      </Table></div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ══ GRUPOS ══ */}
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
                              <div><p className="text-sm font-semibold">{g.name}</p><p className="text-[10px] text-muted-foreground">{g.repCodes.length} representante(s) · {new Date(g.createdAt).toLocaleDateString('pt-BR')}</p></div>
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

          {/* ══ NOTIFICAÇÕES ══ */}
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

          {/* ══ AUDITORIA ══ */}
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

          {/* ══ INTERESSES ══ */}
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
                          <TableCell className="pl-4"><p className="text-sm font-medium">{req.nome}</p><div className="flex flex-wrap gap-x-3 mt-0.5">{req.empresa && <span className="text-[10px] text-muted-foreground">{req.empresa}</span>}{req.email && <span className="text-[10px] text-primary/80">{req.email}</span>}{req.telefone && <span className="text-[10px] text-muted-foreground">{req.telefone}</span>}</div></TableCell>
                          <TableCell><div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-primary shrink-0" /><div><p className="text-xs font-medium">{req.municipio}</p><p className="text-[10px] text-muted-foreground font-mono">{req.uf}</p></div></div></TableCell>
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

          {/* ══ PERSONALIZAÇÃO ══ */}
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

          {/* ══ ROTAS (com contexto) ══ */}
          {['baserotas', 'clusters', 'blocos', 'roteiros', 'agenda', 'densidade', 'leituraplanilha'].includes(activeTab) && (
            <RotasProvider>
              {activeTab === 'baserotas' && <BaseClientePanel />}
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

