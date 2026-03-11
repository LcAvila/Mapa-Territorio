import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Camera, Save, ArrowLeft, User, MapPin, Phone, FileText, Lock, ShieldCheck, Loader2, Building2, ChevronDown } from 'lucide-react';

const API = 'http://localhost:3001';

interface UserProfile {
    id: number;
    username: string;
    role: string;
    tipo: string;
    repCode: string | null;
    full_name: string | null;
    cpf_cnpj: string | null;
    telefone: string | null;
    cep: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro_end: string | null;
    cidade: string | null;
    estado_end: string | null;
    photo: string | null;
    created_at: string;
}

const TIPO_LABELS: Record<string, string> = {
    admin: 'Administrador',
    promotor: 'Promotor',
    representante: 'Representante',
};

const TIPO_COLORS: Record<string, string> = {
    admin: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
    promotor: 'bg-violet-500/20 text-violet-500 border-violet-500/30',
    representante: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
};

export default function Profile() {
    const { token, logout } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadingCep, setLoadingCep] = useState(false);
    const [showAddress, setShowAddress] = useState(false);
    const [showContact, setShowContact] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [form, setForm] = useState({
        full_name: '', cpf_cnpj: '', telefone: '',
        cep: '', logradouro: '', numero: '', complemento: '',
        bairro_end: '', cidade: '', estado_end: '',
        password: '', confirm_password: '',
        photo: '',
    });

    const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    useEffect(() => {
        fetch(`${API}/api/profile`, { headers: authHeaders })
            .then(r => r.json())
            .then(data => {
                setProfile(data);
                setForm(f => ({
                    ...f,
                    full_name: data.full_name || '',
                    cpf_cnpj: data.cpf_cnpj || '',
                    telefone: data.telefone || '',
                    cep: data.cep || '',
                    logradouro: data.logradouro || '',
                    numero: data.numero || '',
                    complemento: data.complemento || '',
                    bairro_end: data.bairro_end || '',
                    cidade: data.cidade || '',
                    estado_end: data.estado_end || '',
                    photo: data.photo || '',
                }));
            })
            .catch(() => toast.error('Erro ao carregar perfil'))
            .finally(() => setLoading(false));
    }, []);

    const handleCepBlur = async () => {
        const cep = form.cep.replace(/\D/g, '');
        if (cep.length !== 8) return;
        setLoadingCep(true);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await res.json();
            if (!data.erro) {
                setForm(f => ({
                    ...f,
                    logradouro: data.logradouro || f.logradouro,
                    bairro_end: data.bairro || f.bairro_end,
                    cidade: data.localidade || f.cidade,
                    estado_end: data.uf || f.estado_end,
                }));
                toast.success('Endereço preenchido!');
            } else {
                toast.error('CEP não encontrado');
            }
        } catch {
            toast.error('Erro ao buscar CEP');
        } finally {
            setLoadingCep(false);
        }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error('Foto deve ter no máximo 2MB'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => setForm(f => ({ ...f, photo: ev.target?.result as string }));
        reader.readAsDataURL(file);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.password && form.password !== form.confirm_password) {
            toast.error('As senhas não coincidem'); return;
        }
        setSaving(true);
        const body: Record<string, string | null> = {
            full_name: form.full_name,
            cpf_cnpj: form.cpf_cnpj,
            telefone: form.telefone,
            cep: form.cep,
            logradouro: form.logradouro,
            numero: form.numero,
            complemento: form.complemento,
            bairro_end: form.bairro_end,
            cidade: form.cidade,
            estado_end: form.estado_end,
            photo: form.photo || null,
        };
        if (form.password) body.password = form.password;

        try {
            const res = await fetch(`${API}/api/profile`, {
                method: 'PUT', headers: authHeaders, body: JSON.stringify(body),
            });
            if (res.ok) {
                toast.success('Perfil atualizado!');
                setForm(f => ({ ...f, password: '', confirm_password: '' }));
            } else {
                const err = await res.json();
                toast.error(err.message || 'Erro ao salvar');
            }
        } catch {
            toast.error('Erro de conexão');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-background">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-card/30 backdrop-blur border-b border-border/40 px-6 py-4 flex items-center justify-between sticky top-0 z-10 transition-colors">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary/60">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-base font-bold text-foreground">Meu Perfil</h1>
                        <p className="text-xs text-muted-foreground">Gerencie suas informações pessoais</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    {profile && (
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${TIPO_COLORS[profile.tipo] || TIPO_COLORS.representante}`}>
                            {TIPO_LABELS[profile.tipo] || profile.tipo}
                        </span>
                    )}
                    {profile?.role === 'admin' && (
                        <button onClick={() => navigate('/admin')} className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                            <ShieldCheck className="w-3.5 h-3.5" /> Painel Admin
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-6 space-y-6">
                <form onSubmit={handleSave} className="space-y-6">

                    {/* Photo + Identity */}
                    <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-6">
                                {/* Photo */}
                                <div className="shrink-0">
                                    <div
                                        className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center cursor-pointer relative overflow-hidden group ring-1 ring-primary/20"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {form.photo ? (
                                            <img src={form.photo} alt="Foto" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-10 h-10 text-primary-foreground" />
                                        )}
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                                    <p className="text-[10px] text-muted-foreground text-center mt-2">Máx. 2MB</p>
                                </div>

                                {/* Identity */}
                                <div className="flex-1 space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Código / Login</label>
                                        <div className="flex items-center gap-2 px-3 py-2.5 bg-secondary/50 rounded-lg border border-border/40">
                                            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-sm font-mono font-bold text-foreground">{profile?.username}</span>
                                            <span className="text-[10px] text-muted-foreground ml-auto">(não editável)</span>
                                        </div>
                                    </div>
                                    {profile?.repCode && (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Código do Representante</label>
                                            <div className="flex items-center gap-2 px-3 py-2.5 bg-primary/5 rounded-lg border border-primary/20">
                                                <span className="text-sm font-mono font-bold text-primary">{profile.repCode}</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome Completo / Empresa *</label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                className="pl-9 bg-secondary border-border/40 focus-visible:ring-primary/50 text-foreground"
                                                placeholder="Seu nome ou razão social"
                                                value={form.full_name}
                                                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact + documents */}
                    <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur overflow-hidden">
                        <div
                            className="pb-3 pt-6 px-6 cursor-pointer hover:bg-secondary/30 transition-colors flex items-center justify-between group"
                            onClick={() => setShowContact(!showContact)}
                        >
                            <CardTitle className="flex items-center gap-2 text-sm text-foreground">
                                <FileText className="w-4 h-4 text-primary" /> Identificação e Contato
                            </CardTitle>
                            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${showContact ? 'rotate-180' : ''}`} />
                        </div>

                        <div className={`grid transition-all duration-200 ease-in-out ${showContact ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                                <CardContent className="space-y-4 pt-3 border-t border-border/20">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">CPF / CNPJ</label>
                                            <Input
                                                placeholder="000.000.000-00"
                                                value={form.cpf_cnpj}
                                                onChange={e => setForm(f => ({ ...f, cpf_cnpj: e.target.value }))}
                                                className="bg-secondary border-border/40 text-foreground focus-visible:ring-primary/50"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Telefone</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    className="pl-9 bg-secondary border-border/40 text-foreground focus-visible:ring-primary/50"
                                                    placeholder="(00) 00000-0000"
                                                    value={form.telefone}
                                                    onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </div>
                        </div>
                    </Card>

                    {/* Address */}
                    <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur overflow-hidden">
                        <div
                            className="pb-3 pt-6 px-6 cursor-pointer hover:bg-secondary/30 transition-colors flex items-center justify-between group"
                            onClick={() => setShowAddress(!showAddress)}
                        >
                            <div>
                                <CardTitle className="flex items-center gap-2 text-sm text-foreground">
                                    <MapPin className="w-4 h-4 text-primary" /> Endereço
                                </CardTitle>
                                <CardDescription className="text-xs text-muted-foreground mt-1.5">Digite o CEP para preenchimento automático</CardDescription>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${showAddress ? 'rotate-180' : ''}`} />
                        </div>

                        <div className={`grid transition-all duration-200 ease-in-out ${showAddress ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                                <CardContent className="space-y-4 pt-3 border-t border-border/20">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">CEP</label>
                                            <div className="relative">
                                                <Input
                                                    className="bg-secondary border-border/40 text-foreground focus-visible:ring-primary/50 uppercase"
                                                    placeholder="00000-000"
                                                    value={form.cep}
                                                    onChange={e => setForm(f => ({ ...f, cep: e.target.value }))}
                                                    onBlur={handleCepBlur}
                                                />
                                                {loadingCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-primary" />}
                                            </div>
                                        </div>
                                        <div className="col-span-2 space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Logradouro</label>
                                            <Input className="bg-secondary border-border/40 text-foreground focus-visible:ring-primary/50" placeholder="Rua, Avenida…" value={form.logradouro} onChange={e => setForm(f => ({ ...f, logradouro: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Número</label>
                                            <Input className="bg-secondary border-border/40 text-foreground focus-visible:ring-primary/50" placeholder="Nº" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} />
                                        </div>
                                        <div className="col-span-3 space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Complemento</label>
                                            <Input className="bg-secondary border-border/40 text-foreground focus-visible:ring-primary/50" placeholder="Apto, Bloco…" value={form.complemento} onChange={e => setForm(f => ({ ...f, complemento: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Bairro</label>
                                            <Input className="bg-secondary border-border/40 text-foreground focus-visible:ring-primary/50" value={form.bairro_end} onChange={e => setForm(f => ({ ...f, bairro_end: e.target.value }))} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Cidade</label>
                                            <Input className="bg-secondary border-border/40 text-foreground focus-visible:ring-primary/50" value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Estado</label>
                                            <Input className="bg-secondary border-border/40 text-foreground focus-visible:ring-primary/50" placeholder="UF" maxLength={2} value={form.estado_end} onChange={e => setForm(f => ({ ...f, estado_end: e.target.value.toUpperCase() }))} />
                                        </div>
                                    </div>
                                </CardContent>
                            </div>
                        </div>
                    </Card>

                    {/* Password */}
                    <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur overflow-hidden">
                        <div
                            className="pb-3 pt-6 px-6 cursor-pointer hover:bg-secondary/30 transition-colors flex items-center justify-between group"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            <div>
                                <CardTitle className="flex items-center gap-2 text-sm text-foreground">
                                    <Lock className="w-4 h-4 text-primary" /> Alterar Senha
                                </CardTitle>
                                <CardDescription className="text-xs text-muted-foreground mt-1.5">Deixe em branco para manter a senha atual</CardDescription>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${showPassword ? 'rotate-180' : ''}`} />
                        </div>

                        <div className={`grid transition-all duration-200 ease-in-out ${showPassword ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                                <CardContent className="space-y-4 pt-3 border-t border-border/20">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Nova Senha</label>
                                            <Input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="bg-secondary border-border/40 text-foreground focus-visible:ring-primary/50" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Confirmar Senha</label>
                                            <Input type="password" placeholder="••••••••" value={form.confirm_password} onChange={e => setForm(f => ({ ...f, confirm_password: e.target.value }))} className="bg-secondary border-border/40 text-foreground focus-visible:ring-primary/50" />
                                        </div>
                                    </div>
                                </CardContent>
                            </div>
                        </div>
                    </Card>

                    <div className="flex gap-4 pb-12 pt-4">
                        <Button type="submit" disabled={saving} className="flex-1 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-5 h-5" />}
                            Salvar Alterações
                        </Button>
                        <Button type="button" variant="outline" onClick={() => navigate('/')} className="h-11 px-6 border-border/40 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="w-5 h-5" /> Voltar
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
