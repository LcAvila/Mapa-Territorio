import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Camera, Save, ArrowLeft, User, MapPin, Phone, FileText, Lock, ShieldCheck, Loader2, Building2 } from 'lucide-react';

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
    admin: 'bg-amber-100 text-amber-700 border-amber-300',
    promotor: 'bg-violet-100 text-violet-700 border-violet-300',
    representante: 'bg-blue-100 text-blue-700 border-blue-300',
};

export default function Profile() {
    const { token, logout } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadingCep, setLoadingCep] = useState(false);

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
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-700 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-base font-bold text-slate-800">Meu Perfil</h1>
                        <p className="text-xs text-slate-500">Gerencie suas informações pessoais</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {profile && (
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${TIPO_COLORS[profile.tipo] || TIPO_COLORS.representante}`}>
                            {TIPO_LABELS[profile.tipo] || profile.tipo}
                        </span>
                    )}
                    {profile?.role === 'admin' && (
                        <button onClick={() => navigate('/admin')} className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 font-semibold hover:bg-amber-200 transition-colors flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" /> Painel Admin
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-6 space-y-6">
                <form onSubmit={handleSave} className="space-y-5">

                    {/* Photo + Identity */}
                    <Card className="border-slate-200 shadow-sm bg-white">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-6">
                                {/* Photo */}
                                <div className="shrink-0">
                                    <div
                                        className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center cursor-pointer relative overflow-hidden group shadow-lg"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {form.photo ? (
                                            <img src={form.photo} alt="Foto" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-10 h-10 text-white" />
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                                    <p className="text-[10px] text-slate-400 text-center mt-2">Máx. 2MB</p>
                                </div>

                                {/* Identity */}
                                <div className="flex-1 space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Código / Login</label>
                                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg border border-slate-200">
                                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-sm font-mono font-bold text-slate-700">{profile?.username}</span>
                                            <span className="text-[10px] text-slate-400 ml-auto">(não editável)</span>
                                        </div>
                                    </div>
                                    {profile?.repCode && (
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Código do Representante</label>
                                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg border border-slate-200">
                                                <span className="text-sm font-mono font-bold text-indigo-600">{profile.repCode}</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome Completo / Empresa *</label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                            <Input
                                                className="pl-9 border-slate-300"
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
                    <Card className="border-slate-200 shadow-sm bg-white">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm text-slate-700">
                                <FileText className="w-4 h-4 text-indigo-500" /> Identificação e Contato
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-500">CPF / CNPJ</label>
                                    <Input
                                        placeholder="000.000.000-00"
                                        value={form.cpf_cnpj}
                                        onChange={e => setForm(f => ({ ...f, cpf_cnpj: e.target.value }))}
                                        className="border-slate-300"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-500">Telefone</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                        <Input
                                            className="pl-9 border-slate-300"
                                            placeholder="(00) 00000-0000"
                                            value={form.telefone}
                                            onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Address */}
                    <Card className="border-slate-200 shadow-sm bg-white">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm text-slate-700">
                                <MapPin className="w-4 h-4 text-indigo-500" /> Endereço
                            </CardTitle>
                            <CardDescription className="text-xs">Digite o CEP para preenchimento automático</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-500">CEP</label>
                                    <div className="relative">
                                        <Input
                                            className="border-slate-300"
                                            placeholder="00000-000"
                                            value={form.cep}
                                            onChange={e => setForm(f => ({ ...f, cep: e.target.value }))}
                                            onBlur={handleCepBlur}
                                        />
                                        {loadingCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-indigo-500" />}
                                    </div>
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs font-medium text-slate-500">Logradouro</label>
                                    <Input className="border-slate-300" placeholder="Rua, Avenida…" value={form.logradouro} onChange={e => setForm(f => ({ ...f, logradouro: e.target.value }))} />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-500">Número</label>
                                    <Input className="border-slate-300" placeholder="Nº" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} />
                                </div>
                                <div className="col-span-3 space-y-1.5">
                                    <label className="text-xs font-medium text-slate-500">Complemento</label>
                                    <Input className="border-slate-300" placeholder="Apto, Bloco…" value={form.complemento} onChange={e => setForm(f => ({ ...f, complemento: e.target.value }))} />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-500">Bairro</label>
                                    <Input className="border-slate-300" value={form.bairro_end} onChange={e => setForm(f => ({ ...f, bairro_end: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-500">Cidade</label>
                                    <Input className="border-slate-300" value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-500">Estado</label>
                                    <Input className="border-slate-300" placeholder="UF" maxLength={2} value={form.estado_end} onChange={e => setForm(f => ({ ...f, estado_end: e.target.value.toUpperCase() }))} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Password */}
                    <Card className="border-slate-200 shadow-sm bg-white">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm text-slate-700">
                                <Lock className="w-4 h-4 text-indigo-500" /> Alterar Senha
                            </CardTitle>
                            <CardDescription className="text-xs">Deixe em branco para manter a senha atual</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-500">Nova Senha</label>
                                    <Input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="border-slate-300" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-500">Confirmar Senha</label>
                                    <Input type="password" placeholder="••••••••" value={form.confirm_password} onChange={e => setForm(f => ({ ...f, confirm_password: e.target.value }))} className="border-slate-300" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-3 pb-8">
                        <Button type="submit" disabled={saving} className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Salvar Alterações
                        </Button>
                        <Button type="button" variant="outline" onClick={() => navigate('/')} className="border-slate-300 text-slate-600">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
