import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Trash2, MapPin, Loader2, LogOut, Plus, Map, X, Check, ChevronDown, Search, Pencil, Save, Users, ShieldCheck, User, HandHeart, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { REP_COLOR_PALETTE, getNextColorIndex } from '@/data/representatives';
import { UF_DATA } from '@/data/uf-codes';

interface Representative {
    code: string;
    name: string;
    fullName: string;
    isVago: boolean;
    colorIndex: number;
}

interface Territory {
    id: number;
    municipio: string;
    uf: string;
    repCode: string;
    modo: string;
}

interface SystemUser {
    id: number;
    username: string;
    role: string;
    repCode: string | null;
}

interface InterestRequest {
    id: number;
    nome: string;
    email: string | null;
    telefone: string | null;
    empresa: string | null;
    municipio: string;
    uf: string;
    modo: string | null;
    observacoes: string | null;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
}

const API = 'http://localhost:3001';
const IBGE = 'https://servicodados.ibge.gov.br/api/v1/localidades';

// ─── Searchable Select Component ────────────────────────────────────────────
function SearchableSelect({
    options,
    value,
    onChange,
    placeholder,
    disabled = false,
    loading = false,
}: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
    disabled?: boolean;
    loading?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = React.useRef<HTMLDivElement>(null);

    const filtered = useMemo(() =>
        query ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase())) : options,
        [options, query]
    );

    const selected = options.find(o => o.value === value);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                disabled={disabled || loading}
                onClick={() => { setOpen(!open); setQuery(''); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 bg-background border rounded-md text-sm transition-colors ${disabled || loading ? 'opacity-50 cursor-not-allowed border-border' : 'border-input hover:border-primary/50 cursor-pointer'} ${open ? 'ring-1 ring-primary border-primary/50' : ''}`}
            >
                <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
                    {loading ? 'Carregando...' : (selected ? selected.label : placeholder)}
                </span>
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />}
            </button>

            {open && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-border">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                                autoFocus
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Pesquisar..."
                                className="w-full pl-8 pr-3 py-1.5 text-sm bg-background rounded border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>
                    <ul className="max-h-52 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <li className="py-4 text-center text-xs text-muted-foreground">Nenhum resultado</li>
                        ) : filtered.map(opt => (
                            <li key={opt.value}>
                                <button
                                    type="button"
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center gap-2 ${opt.value === value ? 'text-primary bg-primary/5' : 'text-foreground'}`}
                                    onClick={() => { onChange(opt.value); setOpen(false); setQuery(''); }}
                                >
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

// ─── Main Admin Page ─────────────────────────────────────────────────────────
export default function Admin() {
    const { token, logout } = useAuth();
    const navigate = useNavigate();

    const [reps, setReps] = useState<Representative[]>([]);
    const [territories, setTerritories] = useState<Territory[]>([]);
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [interests, setInterests] = useState<InterestRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'reps' | 'territories' | 'users' | 'interests'>('reps');

    // Confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean; title: string; description: string; onConfirm: () => void;
    }>({ open: false, title: '', description: '', onConfirm: () => {} });

    const openConfirm = useCallback((title: string, description: string, onConfirm: () => void) => {
        setConfirmDialog({ open: true, title, description, onConfirm });
    }, []);

    const closeConfirm = useCallback(() => {
        setConfirmDialog(d => ({ ...d, open: false }));
    }, []);

    // Edit representative state
    const [editingCode, setEditingCode] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: '', fullName: '', isVago: false });

    // New representative form
    const [newRep, setNewRep] = useState({ code: '', name: '', fullName: '', isVago: false });

    // Users tab state
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user', repCode: '' });
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [editUserForm, setEditUserForm] = useState({ username: '', password: '', role: 'user', repCode: '' });
    const [showNewUserPassword, setShowNewUserPassword] = useState(false);
    const [showEditUserPassword, setShowEditUserPassword] = useState(false);

    // Territory assignment form - IBGE cascading dropdowns
    const [selectedUF, setSelectedUF] = useState('');
    const [selectedMunicipio, setSelectedMunicipio] = useState('');
    const [selectedMunicipioName, setSelectedMunicipioName] = useState('');
    const [includeBairro, setIncludeBairro] = useState(false);
    const [selectedBairro, setSelectedBairro] = useState('');
    const [selectedRep, setSelectedRep] = useState('');
    const [selectedModo, setSelectedModo] = useState<'planejamento' | 'atendimento'>('planejamento');

    // IBGE data
    const [municipios, setMunicipios] = useState<{ id: number; nome: string }[]>([]);
    const [subdistritos, setSubdistritos] = useState<{ id: number; nome: string }[]>([]);
    const [loadingMunicipios, setLoadingMunicipios] = useState(false);
    const [loadingSubdistritos, setLoadingSubdistritos] = useState(false);

    // Staged assignments (multi-add before confirming)
    const [staged, setStaged] = useState<Array<{ municipio: string; uf: string; bairro?: string; repCode: string; modo: string }>>([]);

    // Territory filter
    const [filterUF, setFilterUF] = useState('');
    const [filterRep, setFilterRep] = useState('');

    const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [repsRes, terrRes, usersRes, interestsRes] = await Promise.all([
                fetch(`${API}/api/representatives`),
                fetch(`${API}/api/territories`),
                fetch(`${API}/api/users`, { headers: authHeaders }),
                fetch(`${API}/api/interest`, { headers: authHeaders }),
            ]);
            if (repsRes.ok) setReps(await repsRes.json());
            if (terrRes.ok) setTerritories(await terrRes.json());
            if (usersRes.ok) setUsers(await usersRes.json());
            if (interestsRes.ok) setInterests(await interestsRes.json());
        } catch { toast.error('Erro ao carregar dados do servidor'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    // Fetch municipalities when UF changes
    useEffect(() => {
        if (!selectedUF) { setMunicipios([]); setSelectedMunicipio(''); setSelectedMunicipioName(''); return; }
        const uf = UF_DATA.find(u => u.sigla === selectedUF);
        if (!uf) return;
        setLoadingMunicipios(true);
        setSelectedMunicipio(''); setSelectedMunicipioName('');
        fetch(`${IBGE}/estados/${uf.codigo}/municipios`)
            .then(r => r.json())
            .then(data => setMunicipios(data.sort((a: any, b: any) => a.nome.localeCompare(b.nome))))
            .catch(() => toast.error('Erro ao carregar municípios'))
            .finally(() => setLoadingMunicipios(false));
    }, [selectedUF]);

    // Fetch subdistritos when municipality changes
    useEffect(() => {
        if (!selectedMunicipio || !includeBairro) { setSubdistritos([]); setSelectedBairro(''); return; }
        setLoadingSubdistritos(true);
        setSelectedBairro('');
        Promise.all([
            fetch(`${IBGE}/municipios/${selectedMunicipio}/subdistritos`).then(r => r.ok ? r.json() : []),
            fetch(`${IBGE}/municipios/${selectedMunicipio}/distritos`).then(r => r.ok ? r.json() : []),
        ]).then(([subs, dists]) => {
            const all = [...subs, ...dists].sort((a: any, b: any) => a.nome.localeCompare(b.nome));
            setSubdistritos(all);
            if (all.length === 0) toast.info('Nenhum bairro/subdistrito encontrado via IBGE para este município');
        }).catch(() => toast.error('Erro ao carregar bairros'))
            .finally(() => setLoadingSubdistritos(false));
    }, [selectedMunicipio, includeBairro]);

    const ufOptions = UF_DATA.sort((a, b) => a.nome.localeCompare(b.nome)).map(u => ({
        value: u.sigla,
        label: `${u.sigla} — ${u.nome}`,
    }));

    const municipioOptions = municipios.map(m => ({ value: String(m.id), label: m.nome }));
    const bairroOptions = subdistritos.map(s => ({ value: String(s.id), label: s.nome }));
    const repOptions = reps.map(r => ({ value: r.code, label: `${r.code} — ${r.name}` }));

    const handleSelectMunicipio = (id: string) => {
        setSelectedMunicipio(id);
        const mun = municipios.find(m => String(m.id) === id);
        setSelectedMunicipioName(mun?.nome || '');
    };

    const handleAddToStaged = () => {
        if (!selectedUF || !selectedMunicipioName || !selectedRep) {
            toast.error('Selecione estado, município e representante'); return;
        }
        const alreadyStaged = staged.find(s => s.municipio === selectedMunicipioName && s.uf === selectedUF && s.repCode === selectedRep && s.modo === selectedModo);
        if (alreadyStaged) { toast.warning('Já adicionado na lista'); return; }

        setStaged(prev => [...prev, {
            municipio: selectedMunicipioName,
            uf: selectedUF,
            bairro: includeBairro && selectedBairro ? subdistritos.find(s => String(s.id) === selectedBairro)?.nome : undefined,
            repCode: selectedRep,
            modo: selectedModo,
        }]);
        // Reset municipality and bairro, keep state and rep for quick multi-add
        setSelectedMunicipio(''); setSelectedMunicipioName(''); setSelectedBairro('');
        toast.success('Adicionado à lista! Continue selecionando ou confirme.');
    };

    const handleConfirmStaged = async () => {
        if (staged.length === 0) { toast.error('Nada para confirmar'); return; }
        let success = 0, failed = 0;
        for (const item of staged) {
            const res = await fetch(`${API}/api/territories`, {
                method: 'POST', headers: authHeaders,
                body: JSON.stringify({ municipio: item.municipio, uf: item.uf, repCode: item.repCode, modo: item.modo }),
            });
            if (res.ok) success++; else failed++;
        }
        if (success > 0) toast.success(`${success} território(s) atribuído(s)!`);
        if (failed > 0) toast.error(`${failed} atribuição(ões) falhou (já existe?)`);
        setStaged([]);
        fetchAll();
    };

    const handleCreateRep = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRep.code.trim() || !newRep.name.trim()) { toast.error('Código e nome são obrigatórios'); return; }
        const colorIndex = newRep.isVago ? 0 : getNextColorIndex(reps);
        const res = await fetch(`${API}/api/representatives`, {
            method: 'POST', headers: authHeaders,
            body: JSON.stringify({ ...newRep, fullName: newRep.fullName || newRep.name, colorIndex }),
        });
        if (res.ok) {
            toast.success(`Representante ${newRep.code} cadastrado!`);
            setNewRep({ code: '', name: '', fullName: '', isVago: false });
            fetchAll();
        } else { const err = await res.json(); toast.error(err.message || 'Erro ao cadastrar'); }
    };

    const handleDeleteRep = (code: string, name: string) => {
        openConfirm(
            'Remover representante',
            `"${name}" e todos os seus territórios serão removidos. Esta ação não pode ser desfeita.`,
            async () => {
                closeConfirm();
                const res = await fetch(`${API}/api/representatives/${code}`, { method: 'DELETE', headers: authHeaders });
                if (res.ok) { toast.success('Representante removido!'); fetchAll(); }
                else toast.error('Erro ao remover');
            }
        );
    };

    const startEdit = (rep: Representative) => {
        setEditingCode(rep.code);
        setEditForm({ name: rep.name, fullName: rep.fullName, isVago: rep.isVago });
    };

    const cancelEdit = () => setEditingCode(null);

    const handleUpdateRep = async (code: string) => {
        if (!editForm.name.trim()) { toast.error('Nome é obrigatório'); return; }
        const res = await fetch(`${API}/api/representatives/${code}`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify(editForm),
        });
        if (res.ok) {
            toast.success('Representante atualizado!');
            setEditingCode(null);
            fetchAll();
        } else {
            toast.error('Erro ao atualizar');
        }
    };

    const handleDeleteTerritory = async (id: number, municipio: string) => {
        const res = await fetch(`${API}/api/territories/${id}`, { method: 'DELETE', headers: authHeaders });
        if (res.ok) { toast.success(`${municipio} removido!`); fetchAll(); }
        else toast.error('Erro ao remover território');
    };

    const filteredTerritories = territories.filter(t => {
        if (filterUF && !t.uf.toLowerCase().includes(filterUF.toLowerCase())) return false;
        if (filterRep && t.repCode !== filterRep) return false;
        return true;
    });

    // User handlers
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.username.trim() || !newUser.password.trim()) {
            toast.error('Username e senha são obrigatórios'); return;
        }
        const body: Record<string, string> = { username: newUser.username, password: newUser.password, role: newUser.role };
        if (newUser.repCode) body.repCode = newUser.repCode;
        const res = await fetch(`${API}/api/users`, { method: 'POST', headers: authHeaders, body: JSON.stringify(body) });
        if (res.ok) {
            toast.success(`Usuário "${newUser.username}" criado!`);
            setNewUser({ username: '', password: '', role: 'user', repCode: '' });
            fetchAll();
        } else { const err = await res.json(); toast.error(err.message || 'Erro ao criar usuário'); }
    };

    const startEditUser = (u: SystemUser) => {
        setEditingUserId(u.id);
        setEditUserForm({ username: u.username, password: '', role: u.role, repCode: u.repCode || '' });
    };

    const cancelEditUser = () => setEditingUserId(null);

    const handleUpdateUser = async (id: number) => {
        if (!editUserForm.username.trim()) { toast.error('Username é obrigatório'); return; }
        const body: Record<string, string> = { username: editUserForm.username, role: editUserForm.role, repCode: editUserForm.repCode };
        if (editUserForm.password.trim()) body.password = editUserForm.password;
        const res = await fetch(`${API}/api/users/${id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(body) });
        if (res.ok) { toast.success('Usuário atualizado!'); setEditingUserId(null); fetchAll(); }
        else { const err = await res.json(); toast.error(err.message || 'Erro ao atualizar'); }
    };

    const handleDeleteUser = (id: number, username: string) => {
        openConfirm(
            'Remover usuário',
            `O usuário "${username}" perderá o acesso ao sistema imediatamente. Esta ação não pode ser desfeita.`,
            async () => {
                closeConfirm();
                const res = await fetch(`${API}/api/users/${id}`, { method: 'DELETE', headers: authHeaders });
                if (res.ok) { toast.success('Usuário removido!'); fetchAll(); }
                else { const err = await res.json(); toast.error(err.message || 'Erro ao remover'); }
            }
        );
    };

    // Interest handlers
    const handleInterestStatus = async (id: number, status: 'accepted' | 'rejected') => {
        const res = await fetch(`${API}/api/interest/${id}`, {
            method: 'PUT', headers: authHeaders,
            body: JSON.stringify({ status }),
        });
        if (res.ok) {
            toast.success(status === 'accepted' ? 'Solicitação aceita!' : 'Solicitação recusada');
            fetchAll();
        } else toast.error('Erro ao atualizar status');
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin w-10 h-10 text-primary" />
                <p className="text-sm text-muted-foreground">Carregando painel administrativo...</p>
            </div>
        </div>
    );

    const navItems = [
        { id: 'reps' as const, label: 'Representantes', icon: UserPlus, count: reps.length, desc: 'Gerencie os representantes comerciais' },
        { id: 'territories' as const, label: 'Territórios', icon: MapPin, count: territories.length, desc: 'Atribua territórios por município' },
        { id: 'users' as const, label: 'Usuários', icon: Users, count: users.length, desc: 'Controle de acesso ao sistema' },
        { id: 'interests' as const, label: 'Interesses', icon: HandHeart, count: interests.filter(i => i.status === 'pending').length, desc: 'Solicitações de interesse por área', badge: interests.filter(i => i.status === 'pending').length > 0 },
    ];
    const current = navItems.find(n => n.id === activeTab)!;

    return (<>
        <ConfirmDialog
            open={confirmDialog.open}
            title={confirmDialog.title}
            description={confirmDialog.description}
            confirmLabel="Remover"
            onConfirm={confirmDialog.onConfirm}
            onCancel={closeConfirm}
        />

        <div className="flex h-screen bg-background overflow-hidden">

            {/* ── SIDEBAR ── */}
            <aside className="w-60 shrink-0 flex flex-col border-r border-border/40 bg-card/50">
                {/* Logo */}
                <div className="h-16 px-5 flex items-center gap-3 border-b border-border/40">
                    <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
                        <Map className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground leading-none">Mapa Território</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Painel Admin</p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const active = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
                                    active
                                        ? 'bg-primary/15 text-primary'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                                }`}
                            >
                                <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                                <span className="flex-1 text-sm font-medium">{item.label}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                                    active
                                        ? 'bg-primary/20 text-primary'
                                        : item.badge
                                            ? 'bg-amber-500/20 text-amber-400'
                                            : 'bg-muted text-muted-foreground'
                                }`}>
                                    {item.count}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                {/* Quick stats */}
                <div className="p-3 border-t border-border/40 space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Resumo</p>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-secondary/40 rounded-lg p-2.5 text-center">
                            <p className="text-lg font-bold text-foreground leading-none">{reps.length}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Representantes</p>
                        </div>
                        <div className="bg-secondary/40 rounded-lg p-2.5 text-center">
                            <p className="text-lg font-bold text-foreground leading-none">{territories.length}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Territórios</p>
                        </div>
                    </div>
                </div>

                {/* User / Logout */}
                <div className="p-3 border-t border-border/40">
                    <button
                        onClick={() => { logout(); navigate('/login'); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all text-sm"
                    >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>Sair do sistema</span>
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all text-sm mt-0.5"
                    >
                        <Map className="w-4 h-4 shrink-0" />
                        <span>Ver Mapa</span>
                    </button>
                </div>
            </aside>

            {/* ── MAIN AREA ── */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Top bar */}
                <header className="h-16 px-6 flex items-center justify-between border-b border-border/40 bg-card/30 shrink-0">
                    <div>
                        <h1 className="text-base font-semibold text-foreground">{current.label}</h1>
                        <p className="text-xs text-muted-foreground">{current.desc}</p>
                    </div>
                    {activeTab === 'interests' && interests.filter(i => i.status === 'pending').length > 0 && (
                        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                            <HandHeart className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-xs font-semibold text-amber-400">
                                {interests.filter(i => i.status === 'pending').length} pendente(s)
                            </span>
                        </div>
                    )}
                </header>

                {/* Scrollable content */}
                <main className="flex-1 overflow-y-auto p-6">

                    {/* ══ REPS TAB ══ */}
                    {activeTab === 'reps' && (
                        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
                            <div className="xl:col-span-2">
                                <Card className="border-border/40">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="flex items-center gap-2 text-sm">
                                            <div className="w-7 h-7 bg-primary/15 rounded-md flex items-center justify-center">
                                                <UserPlus className="w-3.5 h-3.5 text-primary" />
                                            </div>
                                            Novo Representante
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleCreateRep} className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-muted-foreground">Código *</label>
                                                    <Input placeholder="Ex: 47" value={newRep.code} onChange={e => setNewRep({ ...newRep, code: e.target.value })} required />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-muted-foreground">Nome Curto *</label>
                                                    <Input placeholder="Ex: ITAPEL" value={newRep.name} onChange={e => setNewRep({ ...newRep, name: e.target.value })} required />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-muted-foreground">Nome Completo</label>
                                                <Input placeholder="Nome completo ou razão social" value={newRep.fullName} onChange={e => setNewRep({ ...newRep, fullName: e.target.value })} />
                                            </div>
                                            <label className="flex items-center gap-2.5 text-sm text-muted-foreground cursor-pointer select-none p-3 rounded-lg border border-border/50 hover:bg-secondary/30 transition-colors">
                                                <input type="checkbox" checked={newRep.isVago} onChange={e => setNewRep({ ...newRep, isVago: e.target.checked })} className="rounded" />
                                                <div>
                                                    <p className="text-xs font-medium text-foreground">Marcar como Vago</p>
                                                    <p className="text-[10px] text-muted-foreground">Territórios aparecerão sem representante</p>
                                                </div>
                                            </label>
                                            <Button className="w-full gap-2" type="submit">
                                                <Plus className="w-4 h-4" /> Cadastrar Representante
                                            </Button>
                                        </form>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="xl:col-span-3">
                                <Card className="border-border/40">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-sm">Representantes Cadastrados</CardTitle>
                                            <span className="text-xs text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full">{reps.length} total</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {reps.length === 0 ? (
                                            <div className="py-16 text-center text-muted-foreground">
                                                <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                                <p className="text-sm">Nenhum representante cadastrado</p>
                                                <p className="text-xs mt-1">Use o formulário ao lado para adicionar</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-hidden rounded-b-lg">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="hover:bg-transparent border-border/40">
                                                            <TableHead className="w-8 pl-4"></TableHead>
                                                            <TableHead className="w-14">Cód</TableHead>
                                                            <TableHead>Nome</TableHead>
                                                            <TableHead className="w-14 text-center">Terr.</TableHead>
                                                            <TableHead className="w-20 pr-4"></TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {reps.map(rep => (
                                                            <React.Fragment key={rep.code}>
                                                                <TableRow className={`border-border/30 ${editingCode === rep.code ? 'bg-primary/5' : 'hover:bg-secondary/30'}`}>
                                                                    <TableCell className="pl-4">
                                                                        <div className="w-3 h-3 rounded-full" style={{ background: rep.isVago ? '#555' : (REP_COLOR_PALETTE[rep.colorIndex] || '#888') }} />
                                                                    </TableCell>
                                                                    <TableCell className="font-mono text-xs font-bold text-primary">{rep.code}</TableCell>
                                                                    <TableCell>
                                                                        <p className="text-xs font-medium">{rep.name}</p>
                                                                        {rep.isVago && <span className="text-[10px] text-orange-400 font-semibold">VAGO</span>}
                                                                    </TableCell>
                                                                    <TableCell className="text-center text-xs text-muted-foreground">
                                                                        {territories.filter(t => t.repCode === rep.code).length}
                                                                    </TableCell>
                                                                    <TableCell className="pr-4">
                                                                        <div className="flex gap-1 justify-end">
                                                                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 hover:text-primary" onClick={() => editingCode === rep.code ? cancelEdit() : startEdit(rep)}>
                                                                                {editingCode === rep.code ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                                                                            </Button>
                                                                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteRep(rep.code, rep.name)}>
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </Button>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                                {editingCode === rep.code && (
                                                                    <TableRow className="bg-primary/5 border-border/30">
                                                                        <TableCell colSpan={5} className="py-4 px-6">
                                                                            <div className="space-y-3">
                                                                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Editando {rep.code}</p>
                                                                                <div className="grid grid-cols-2 gap-2">
                                                                                    <div className="space-y-1">
                                                                                        <label className="text-[10px] text-muted-foreground">Nome Curto</label>
                                                                                        <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-xs" />
                                                                                    </div>
                                                                                    <div className="space-y-1">
                                                                                        <label className="text-[10px] text-muted-foreground">Nome Completo</label>
                                                                                        <Input value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} className="h-8 text-xs" />
                                                                                    </div>
                                                                                </div>
                                                                                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                                                                                    <input type="checkbox" checked={editForm.isVago} onChange={e => setEditForm(f => ({ ...f, isVago: e.target.checked }))} />
                                                                                    Marcar como Vago
                                                                                </label>
                                                                                <div className="flex gap-2">
                                                                                    <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={() => handleUpdateRep(rep.code)}><Save className="w-3 h-3" /> Salvar</Button>
                                                                                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={cancelEdit}>Cancelar</Button>
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

                    {/* ══ TERRITORIES TAB ══ */}
                    {activeTab === 'territories' && (
                        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
                            <div className="xl:col-span-2 space-y-4">
                                <Card className="border-border/40">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="flex items-center gap-2 text-sm">
                                            <div className="w-7 h-7 bg-primary/15 rounded-md flex items-center justify-center">
                                                <MapPin className="w-3.5 h-3.5 text-primary" />
                                            </div>
                                            Atribuir Território
                                        </CardTitle>
                                        <CardDescription className="text-xs">Selecione representante, estado e município</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {reps.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-4">Cadastre representantes primeiro</p>
                                        ) : (<>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Representante *</label>
                                                <SearchableSelect options={repOptions} value={selectedRep} onChange={setSelectedRep} placeholder="Selecione..." />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Modo de Venda *</label>
                                                <div className="flex gap-2">
                                                    {(['planejamento', 'atendimento'] as const).map(m => (
                                                        <button key={m} type="button" onClick={() => setSelectedModo(m)}
                                                            className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold border transition-all ${selectedModo === m ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                                                            {m === 'planejamento' ? 'Planejamento' : 'Atendimento'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="border-t border-border/40 pt-4 space-y-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado *</label>
                                                    <SearchableSelect options={ufOptions} value={selectedUF} onChange={v => { setSelectedUF(v); setSelectedMunicipio(''); setSelectedMunicipioName(''); setSelectedBairro(''); }} placeholder="Selecione o estado..." />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Município *</label>
                                                    <SearchableSelect options={municipioOptions} value={selectedMunicipio} onChange={handleSelectMunicipio} placeholder={selectedUF ? 'Selecione...' : 'Selecione o estado primeiro'} disabled={!selectedUF} loading={loadingMunicipios} />
                                                </div>
                                                <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-lg border border-border/40 hover:bg-secondary/30 transition-colors">
                                                    <div className={`w-9 h-5 rounded-full transition-colors relative ${includeBairro ? 'bg-primary' : 'bg-secondary'}`} onClick={() => { setIncludeBairro(!includeBairro); setSelectedBairro(''); }}>
                                                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${includeBairro ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium">Especificar Bairro</p>
                                                        <p className="text-[10px] text-muted-foreground">Dados via IBGE</p>
                                                    </div>
                                                </label>
                                                {includeBairro && (
                                                    <div className="space-y-1.5 pl-2 border-l-2 border-primary/30">
                                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bairro</label>
                                                        <SearchableSelect options={bairroOptions} value={selectedBairro} onChange={setSelectedBairro} placeholder={selectedMunicipio ? 'Selecione...' : 'Selecione o município primeiro'} disabled={!selectedMunicipio} loading={loadingSubdistritos} />
                                                    </div>
                                                )}
                                            </div>
                                            <Button type="button" variant="outline" className="w-full gap-2 border-primary/30 hover:bg-primary/5" onClick={handleAddToStaged} disabled={!selectedRep || !selectedUF || !selectedMunicipioName}>
                                                <Plus className="w-4 h-4" /> Adicionar à Lista
                                            </Button>
                                        </>)}
                                    </CardContent>
                                </Card>

                                {staged.length > 0 && (
                                    <Card className="border-primary/30 bg-primary/5">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm flex items-center gap-2">
                                                <Check className="w-4 h-4 text-primary" /> Lista para Confirmar ({staged.length})
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            {staged.map((item, i) => {
                                                const rep = reps.find(r => r.code === item.repCode);
                                                return (
                                                    <div key={i} className="flex items-center gap-2 bg-card rounded-md px-3 py-2 border border-border/50">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-semibold truncate">{item.municipio} / {item.uf}</p>
                                                            <p className="text-[10px] text-primary">{rep ? rep.name : item.repCode} · {item.modo === 'planejamento' ? 'Plan.' : 'Atend.'}</p>
                                                        </div>
                                                        <button onClick={() => setStaged(s => s.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors">
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                            <Button className="w-full gap-2 mt-2" onClick={handleConfirmStaged}><Check className="w-4 h-4" /> Confirmar Todos ({staged.length})</Button>
                                            <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-destructive" onClick={() => setStaged([])}>Limpar Lista</Button>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>

                            <div className="xl:col-span-3">
                                <Card className="border-border/40">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <CardTitle className="text-sm">Territórios Atribuídos</CardTitle>
                                            <div className="flex gap-2">
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                                    <Input placeholder="Filtrar UF..." value={filterUF} onChange={e => setFilterUF(e.target.value)} className="h-8 text-xs pl-7 w-28" />
                                                </div>
                                                <select className="h-8 px-2 bg-background border border-input rounded-md text-xs" value={filterRep} onChange={e => setFilterRep(e.target.value)}>
                                                    <option value="">Todos</option>
                                                    {reps.map(r => <option key={r.code} value={r.code}>{r.code} - {r.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {filteredTerritories.length === 0 ? (
                                            <div className="py-16 text-center text-muted-foreground">
                                                <MapPin className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                                <p className="text-sm">Nenhum território encontrado</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-auto max-h-[calc(100vh-280px)] rounded-b-lg">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="hover:bg-transparent border-border/40">
                                                            <TableHead className="pl-4">Município</TableHead>
                                                            <TableHead className="w-12">UF</TableHead>
                                                            <TableHead>Representante</TableHead>
                                                            <TableHead className="w-20">Modo</TableHead>
                                                            <TableHead className="w-10 pr-4"></TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredTerritories.map(t => {
                                                            const rep = reps.find(r => r.code === t.repCode);
                                                            return (
                                                                <TableRow key={t.id} className="border-border/30 hover:bg-secondary/30">
                                                                    <TableCell className="text-xs font-medium pl-4">{t.municipio}</TableCell>
                                                                    <TableCell className="text-xs font-mono text-muted-foreground">{t.uf}</TableCell>
                                                                    <TableCell>
                                                                        <div className="flex items-center gap-2">
                                                                            {rep && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: rep.isVago ? '#555' : (REP_COLOR_PALETTE[rep.colorIndex] || '#888') }} />}
                                                                            <span className="text-xs">{rep ? `${rep.code} — ${rep.name}` : t.repCode}</span>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.modo === 'planejamento' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                                                            {t.modo === 'planejamento' ? 'Plan.' : 'Atend.'}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="pr-4">
                                                                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteTerritory(t.id, t.municipio)}>
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* ══ USERS TAB ══ */}
                    {activeTab === 'users' && (
                        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
                            <div className="xl:col-span-2">
                                <Card className="border-border/40">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="flex items-center gap-2 text-sm">
                                            <div className="w-7 h-7 bg-primary/15 rounded-md flex items-center justify-center">
                                                <UserPlus className="w-3.5 h-3.5 text-primary" />
                                            </div>
                                            Novo Usuário
                                        </CardTitle>
                                        <CardDescription className="text-xs">Crie logins para representantes ou administradores</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleCreateUser} className="space-y-3">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-muted-foreground">Username *</label>
                                                <Input placeholder="Ex: joao.silva" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} autoComplete="off" required />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-muted-foreground">Senha *</label>
                                                <div className="relative">
                                                    <Input type={showNewUserPassword ? 'text' : 'password'} placeholder="Senha de acesso" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} autoComplete="new-password" required />
                                                    <button type="button" tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs" onClick={() => setShowNewUserPassword(v => !v)}>
                                                        {showNewUserPassword ? 'Ocultar' : 'Ver'}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-muted-foreground">Papel *</label>
                                                <div className="flex gap-2">
                                                    {(['user', 'admin'] as const).map(r => (
                                                        <button key={r} type="button" onClick={() => setNewUser({ ...newUser, role: r })}
                                                            className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${newUser.role === r ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                                                            {r === 'admin' ? <ShieldCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                                                            {r === 'admin' ? 'Admin' : 'Usuário'}
                                                        </button>
                                                    ))}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground">{newUser.role === 'admin' ? 'Acesso total ao painel e ao mapa' : 'Acesso somente ao mapa'}</p>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-muted-foreground">Vincular Representante <span className="font-normal">(opcional)</span></label>
                                                <select className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" value={newUser.repCode} onChange={e => setNewUser({ ...newUser, repCode: e.target.value })}>
                                                    <option value="">— Nenhum —</option>
                                                    {reps.map(r => <option key={r.code} value={r.code}>{r.code} — {r.name}</option>)}
                                                </select>
                                            </div>
                                            <Button className="w-full gap-2" type="submit"><Plus className="w-4 h-4" /> Criar Usuário</Button>
                                        </form>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="xl:col-span-3">
                                <Card className="border-border/40">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="flex items-center gap-2 text-sm"><Users className="w-4 h-4 text-primary" /> Usuários do Sistema</CardTitle>
                                            <span className="text-xs text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full">{users.length} total</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {users.length === 0 ? (
                                            <div className="py-16 text-center text-muted-foreground">
                                                <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                                <p className="text-sm">Nenhum usuário encontrado</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-hidden rounded-b-lg">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="hover:bg-transparent border-border/40">
                                                            <TableHead className="w-10 pl-4">ID</TableHead>
                                                            <TableHead>Login</TableHead>
                                                            <TableHead className="w-24">Papel</TableHead>
                                                            <TableHead>Representante</TableHead>
                                                            <TableHead className="w-20 pr-4"></TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {users.map(u => (
                                                            <React.Fragment key={u.id}>
                                                                <TableRow className={`border-border/30 ${editingUserId === u.id ? 'bg-primary/5' : 'hover:bg-secondary/30'}`}>
                                                                    <TableCell className="text-xs text-muted-foreground font-mono pl-4">{u.id}</TableCell>
                                                                    <TableCell className="font-medium text-sm">{u.username}</TableCell>
                                                                    <TableCell>
                                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 w-fit ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                                            {u.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                                                            {u.role === 'admin' ? 'Admin' : 'User'}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="text-xs text-muted-foreground">
                                                                        {u.repCode ? (() => { const rep = reps.find(r => r.code === u.repCode); return rep ? `${rep.code} — ${rep.name}` : u.repCode; })() : '—'}
                                                                    </TableCell>
                                                                    <TableCell className="pr-4">
                                                                        <div className="flex gap-1 justify-end">
                                                                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 hover:text-primary" onClick={() => editingUserId === u.id ? cancelEditUser() : startEditUser(u)}>
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
                                                                        <TableCell colSpan={5} className="py-4 px-6">
                                                                            <div className="space-y-3">
                                                                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Editando #{u.id} — {u.username}</p>
                                                                                <div className="grid grid-cols-2 gap-2">
                                                                                    <div className="space-y-1">
                                                                                        <label className="text-[10px] text-muted-foreground">Username</label>
                                                                                        <Input value={editUserForm.username} onChange={e => setEditUserForm(f => ({ ...f, username: e.target.value }))} className="h-8 text-xs" />
                                                                                    </div>
                                                                                    <div className="space-y-1">
                                                                                        <label className="text-[10px] text-muted-foreground">Nova Senha</label>
                                                                                        <div className="relative">
                                                                                            <Input type={showEditUserPassword ? 'text' : 'password'} value={editUserForm.password} onChange={e => setEditUserForm(f => ({ ...f, password: e.target.value }))} className="h-8 text-xs pr-12" placeholder="Deixe em branco para manter" />
                                                                                            <button type="button" tabIndex={-1} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]" onClick={() => setShowEditUserPassword(v => !v)}>{showEditUserPassword ? 'Ocultar' : 'Ver'}</button>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="grid grid-cols-2 gap-2">
                                                                                    <div className="space-y-1">
                                                                                        <label className="text-[10px] text-muted-foreground">Papel</label>
                                                                                        <div className="flex gap-1.5">
                                                                                            {(['user', 'admin'] as const).map(r => (
                                                                                                <button key={r} type="button" onClick={() => setEditUserForm(f => ({ ...f, role: r }))}
                                                                                                    className={`flex-1 py-1 px-2 rounded text-[10px] font-semibold border transition-all flex items-center justify-center gap-1 ${editUserForm.role === r ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
                                                                                                    {r === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                                                                                    {r === 'admin' ? 'Admin' : 'User'}
                                                                                                </button>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="space-y-1">
                                                                                        <label className="text-[10px] text-muted-foreground">Representante</label>
                                                                                        <select className="w-full h-8 px-2 bg-background border border-input rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary" value={editUserForm.repCode} onChange={e => setEditUserForm(f => ({ ...f, repCode: e.target.value }))}>
                                                                                            <option value="">— Nenhum —</option>
                                                                                            {reps.map(r => <option key={r.code} value={r.code}>{r.code} — {r.name}</option>)}
                                                                                        </select>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex gap-2">
                                                                                    <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={() => handleUpdateUser(u.id)}><Save className="w-3 h-3" /> Salvar</Button>
                                                                                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={cancelEditUser}>Cancelar</Button>
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

                    {/* ══ INTERESTS TAB ══ */}
                    {activeTab === 'interests' && (
                        <div className="space-y-4">
                            {interests.length === 0 ? (
                                <Card className="border-border/40">
                                    <CardContent className="py-20 text-center text-muted-foreground">
                                        <HandHeart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p className="text-sm font-medium">Nenhuma solicitação recebida</p>
                                        <p className="text-xs mt-1">As solicitações aparecerão aqui quando usuários manifestarem interesse pelo mapa</p>
                                    </CardContent>
                                </Card>
                            ) : (() => {
                                const groups = [
                                    { key: 'pending', label: 'Pendentes', icon: Clock, color: 'text-amber-400', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30', items: interests.filter(i => i.status === 'pending') },
                                    { key: 'accepted', label: 'Aceitas', icon: CheckCircle2, color: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', items: interests.filter(i => i.status === 'accepted') },
                                    { key: 'rejected', label: 'Recusadas', icon: XCircle, color: 'text-destructive', badge: 'bg-destructive/10 text-destructive border-destructive/30', items: interests.filter(i => i.status === 'rejected') },
                                ].filter(g => g.items.length > 0);
                                return (
                                    <div className="space-y-6">
                                        {groups.map(({ key, label, icon: Icon, color, badge, items }) => (
                                            <div key={key}>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Icon className={`w-4 h-4 ${color}`} />
                                                    <h3 className="text-sm font-semibold text-foreground">{label}</h3>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge}`}>{items.length}</span>
                                                </div>
                                                <Card className="border-border/40 overflow-hidden">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="hover:bg-transparent border-border/40">
                                                                <TableHead className="pl-4">Solicitante</TableHead>
                                                                <TableHead>Área</TableHead>
                                                                <TableHead className="w-20">Modo</TableHead>
                                                                <TableHead className="w-32">Data</TableHead>
                                                                {key === 'pending' && <TableHead className="w-36 pr-4">Ação</TableHead>}
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {items.map(req => (
                                                                <TableRow key={req.id} className="border-border/30 hover:bg-secondary/30">
                                                                    <TableCell className="pl-4">
                                                                        <p className="text-sm font-medium">{req.nome}</p>
                                                                        <div className="flex flex-wrap gap-x-3 mt-0.5">
                                                                            {req.empresa && <span className="text-[10px] text-muted-foreground">{req.empresa}</span>}
                                                                            {req.email && <span className="text-[10px] text-primary/80">{req.email}</span>}
                                                                            {req.telefone && <span className="text-[10px] text-muted-foreground">{req.telefone}</span>}
                                                                        </div>
                                                                        {req.observacoes && <p className="text-[10px] text-muted-foreground/60 mt-1 italic max-w-[260px] truncate" title={req.observacoes}>"{req.observacoes}"</p>}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <MapPin className="w-3 h-3 text-primary shrink-0" />
                                                                            <div>
                                                                                <p className="text-xs font-medium">{req.municipio}</p>
                                                                                <p className="text-[10px] text-muted-foreground font-mono">{req.uf}</p>
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {req.modo && <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${req.modo === 'planejamento' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>{req.modo === 'planejamento' ? 'Plan.' : 'Atend.'}</span>}
                                                                    </TableCell>
                                                                    <TableCell className="text-[10px] text-muted-foreground tabular-nums">
                                                                        {new Date(req.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                                    </TableCell>
                                                                    {key === 'pending' && (
                                                                        <TableCell className="pr-4">
                                                                            <div className="flex gap-1.5">
                                                                                <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white border-0" onClick={() => handleInterestStatus(req.id, 'accepted')}>
                                                                                    <CheckCircle2 className="w-3 h-3" /> Aceitar
                                                                                </Button>
                                                                                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10" onClick={() => handleInterestStatus(req.id, 'rejected')}>
                                                                                    <XCircle className="w-3 h-3" /> Recusar
                                                                                </Button>
                                                                            </div>
                                                                        </TableCell>
                                                                    )}
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </Card>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                </main>
            </div>
        </div>
    </>);
}
