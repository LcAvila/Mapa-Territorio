import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { 
  User, Briefcase, ShieldCheck, Bell, Settings, History, 
  Save, X, Camera, Check, Lock, Eye, EyeOff, Building2,
  Users, BadgeCheck, Mail, Phone, MapPin, Globe, Fingerprint,
  Users2, Palette, ChevronDown, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api-base';
import { useAuth } from '@/contexts/auth-context-core';
import type { SystemUser } from '@/data/representatives';
import { REP_COLOR_PALETTE } from '@/data/representatives';
import { useApiClientes } from '@/hooks/use-api-data';
import { UF_DATA } from '@/data/uf-codes';

interface Module {
  id: string;
  name: string;
}

interface UserPermission {
  moduleId: string;
  canView: boolean;
  canEdit: boolean;
  module?: Module;
}

interface UserActivity {
  id: number;
  action: string;
  details: string;
  ipAddress: string | null;
  timestamp: string;
}

interface UserProfileManagerProps {
  user: SystemUser;
  onClose: () => void;
  onUpdate: () => void;
  userTypes?: { id: number; name: string; color: string }[];
  allUsers?: SystemUser[];
}

const UserProfileManager: React.FC<UserProfileManagerProps> = ({ user, onClose, onUpdate, userTypes = [], allUsers = [] }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'org' | 'perms' | 'notif' | 'settings' | 'history' | 'clients'>('profile');
  const [loading, setLoading] = useState(false);
  const { role: currentUserRole } = useAuth();
  
  // Clients hook
  const { data: userClients = [], isLoading: loadingClients } = useApiClientes(user.id);
  
  // Forms State
  const [formData, setFormData] = useState({
    fullName: user.full_name || user.fullName || '',
    username: user.username || '',
    email: user.email || '',
    role: user.role || 'user',
    photo: user.photo || '',
    colorIndex: user.colorIndex ?? 0,
    comissao: user.comissao ?? 0,
    isVago: user.isVago ?? 0,
    telefone: user.telefone || '',
    birthDate: user.birth_date ? new Date(user.birth_date).toISOString().split('T')[0] : '',
    code: user.code || '',
    cpf_cnpj: user.cpf_cnpj || '',
    password: '',
    confirmPassword: '',
    cep: user.cep || '',
    logradouro: user.logradouro || '',
    numero: user.numero || '',
    complemento: user.complemento || '',
    bairro_end: user.bairro_end || '',
    cidade: user.cidade || '',
    estado_end: user.estado_end || '',
    assigned_state: (user as any).assigned_state || '',
    area_atuacao: user.area_atuacao || '',
    base_logistica: user.base_logistica || '',
    userTypeId: user.userTypeId || '',
    default_screen: user.default_screen || 'mapa',
    managedUserIds: (user as any).managedUsers?.map((u: any) => u.id) || []
  });

  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [showPwd, setShowPwd] = useState(false);
  const [showPwdFields, setShowPwdFields] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  
  // New States
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [config, setConfig] = useState({
    default_workspace: user.default_workspace || 'dashboard',
    inactivity_limit: user.inactivity_limit || 30
  });
  const [notifPrefs, setNotifPrefs] = useState({
    email: user.notif_email ?? true,
    sms: user.notif_sms ?? false,
    push: user.notif_push ?? true
  });

  const API = API_BASE_URL;

function maskDoc(val: string, type: 'cpf' | 'cnpj') {
  const d = val.replace(/\D/g, '');
  if (type === 'cpf') {
    return d.slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, e) => e ? `${a}.${b}.${c}-${e}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a);
  }
  return d.slice(0, 14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, a, b, c, e, f) => f ? `${a}.${b}.${c}/${e}-${f}` : e ? `${a}.${b}.${c}/${e}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a);
}

function maskPhone(val: string) {
  const d = val.replace(/\D/g, '');
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, (_, a, b, c) => c ? `(${a}) ${b}-${c}` : b ? `(${a}) ${b}` : a ? `(${a})` : '');
  }
  return d.slice(0, 11).replace(/(\d{2})(\d{5})(\d{0,4})/, (_, a, b, c) => c ? `(${a}) ${b}-${c}` : b ? `(${a}) ${b}` : a ? `(${a})` : '');
}

function maskCEP(val: string) {
  const d = val.replace(/\D/g, '').slice(0, 8);
  return d.replace(/(\d{5})(\d{0,3})/, (_, a, b) => b ? `${a}-${b}` : a);
}
  const token = localStorage.getItem('token');
  const tokenVersion = localStorage.getItem('tokenVersion');
  const authHeaders = useMemo(() => ({ 
    'Content-Type': 'application/json', 
    'Authorization': `Bearer ${token}`,
    'x-user-token-version': tokenVersion || '0'
  }), [token, tokenVersion]);

  useEffect(() => {
    // Sync local form state when the user prop changes (e.g., after onUpdate fetches fresh data)
    setFormData({
      fullName: user.full_name || user.fullName || '',
      username: user.username || '',
      email: user.email || '',
      role: user.role || 'user',
      photo: user.photo || '',
      colorIndex: user.colorIndex ?? 0,
      comissao: user.comissao ?? 0,
      isVago: user.isVago ?? 0,
      telefone: user.telefone || '',
      birthDate: user.birth_date ? new Date(user.birth_date).toISOString().split('T')[0] : '',
      code: user.code || '',
      cpf_cnpj: user.cpf_cnpj || '',
      password: '',
      confirmPassword: '',
      cep: user.cep || '',
      logradouro: user.logradouro || '',
      numero: user.numero || '',
      complemento: user.complemento || '',
      bairro_end: user.bairro_end || '',
      cidade: user.cidade || '',
      estado_end: user.estado_end || '',
      assigned_state: (user as any).assigned_state || '',
      area_atuacao: user.area_atuacao || '',
      base_logistica: user.base_logistica || '',
      userTypeId: user.userTypeId || '',
      default_screen: user.default_screen || 'mapa',
      managedUserIds: (user as any).managedUsers?.map((u: any) => u.id) || []
    });
    
    setConfig({
      default_workspace: user.default_workspace || 'dashboard',
      inactivity_limit: user.inactivity_limit || 30
    });
    
    setNotifPrefs({
      email: user.notif_email ?? true,
      sms: user.notif_sms ?? false,
      push: user.notif_push ?? true
    });
  }, [user]);

  const fetchData = useCallback(async () => {
    try {
      const [modulesRes, permsRes] = await Promise.all([
        fetch(`${API}/api/admin/modules`, { headers: authHeaders }),
        fetch(`${API}/api/admin/users/${user.id}/permissions`, { headers: authHeaders })
      ]);
      
      if (modulesRes.ok) {
        const rawModules: Module[] = await modulesRes.ok ? await modulesRes.json() : [];
        
        // Mapeamento de nomes e filtragem conforme solicitado pelo usuário
        const moduleMap: Record<string, string> = {
          'clientes': 'base clientes',
          'notifications': 'Central de Alertas',
          'users': 'Gerenciamento de Usuários',
          'routes': 'Gestão de rotas',
          'audit': 'Auditoria',
          'settings': 'Editar sistema'
        };

        const filteredModules = rawModules
          .filter(m => moduleMap[m.id])
          .map(m => ({
            ...m,
            name: moduleMap[m.id]
          }));

        setAvailableModules(filteredModules);
      }
      
      if (permsRes.ok) setPermissions(await permsRes.json());
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }
  }, [user.id, authHeaders, API]);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/users/${user.id}/activities`, { headers: authHeaders });
      if (res.ok) setActivities(await res.json());
    } catch (error) {
       console.error('Error fetching activities:', error);
    }
  }, [user.id, authHeaders]);

  useEffect(() => {
    fetchData();
    if (activeTab === 'history') fetchActivities();
  }, [fetchData, fetchActivities, activeTab]);

  // Auto-admin flag when user type is admin
  useEffect(() => {
    if (!userTypes) return;
    const selectedType = userTypes.find(t => String(t.id) === String(formData.userTypeId));
    if (selectedType?.isAdmin) {
      setFormData(prev => ({ ...prev, role: 'admin' }));
      // Automatically set all permissions to true if admin
      if (availableModules.length > 0) {
        setPermissions(availableModules.map(m => ({ moduleId: m.id, canView: true, canEdit: true })));
      }
    }
  }, [formData.userTypeId, userTypes, availableModules]);

  const fetchCepProfile = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData(prev => ({
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

  const handleSaveProfile = async () => {
    // Validação de E-mail
    if (!formData.email) {
      toast.error('O campo E-mail é obrigatório.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Por favor, insira um e-mail válido (exemplo@dominio.com).');
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (formData.password) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{6,}$/;
      if (!passwordRegex.test(formData.password)) {
        toast.error('A senha deve conter letras maiúsculas, minúsculas, números e símbolos.');
        return;
      }
    }

    if (formData.role === 'admin' && user.role !== 'admin') {
      toast.info('Usuário promovido a ADMIN automaticamente!');
    }

    setLoading(true);
    try {
      // Se for administrador, garantir que enviamos o role 'admin'
      const finalRole = formData.role === 'admin' ? 'admin' : formData.role;

      const res = await fetch(`${API}/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          username: formData.username,
          full_name: formData.fullName,
          email: formData.email,
          role: finalRole,
          photo: formData.photo,
          colorIndex: formData.colorIndex,
          comissao: formData.comissao,
          isVago: formData.isVago,
          telefone: formData.telefone,
          birth_date: formData.birthDate,
          cpf_cnpj: formData.cpf_cnpj,
          password: formData.password || undefined,
          cep: formData.cep,
          logradouro: formData.logradouro,
          numero: formData.numero,
          complemento: formData.complemento,
          bairro_end: formData.bairro_end,
          cidade: formData.cidade,
          estado_end: formData.estado_end,
          assigned_state: formData.assigned_state,
          area_atuacao: formData.area_atuacao,
          base_logistica: formData.base_logistica,
          userTypeId: formData.userTypeId ? Number(formData.userTypeId) : null,
          default_screen: formData.default_screen,
          managedUserIds: formData.managedUserIds,
          // Se for admin, envia todas as permissões para o backend persistir
          permissions: finalRole === 'admin' ? availableModules.map(m => ({ moduleId: m.id, canView: true, canEdit: true })) : permissions
        })
      });

      if (res.ok) {
        toast.success('Perfil atualizado com sucesso!');
        onUpdate();
        // Limpa as senhas após salvar com sucesso para evitar re-uso acidental
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        setShowPwdFields(false);
      } else {
        const err = await res.json();
        toast.error(`${err.message}${err.details ? ': ' + err.details : ''}` || 'Erro ao atualizar');
      }
    } catch (error) {
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePermissions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/users/${user.id}/permissions`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ permissions, role: formData.role })
      });
      
      const result = await res.json();
      
      if (res.ok) {
        toast.success(result.message || 'Permissões atualizadas!');
        if (result.promoted) {
          toast.info('Usuário promovido a ADMIN automaticamente!');
          // Atualiza o estado local para refletir a nova role imediatamente
          setFormData(prev => ({ ...prev, role: 'admin' }));
        }
        // Dispara o fetchAll do Admin.tsx para atualizar o card na lista
        onUpdate();
      } else {
        toast.error(result.message || 'Erro ao salvar permissões');
      }
    } catch { 
      toast.error('Erro de conexão'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/users/${user.id}/config`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(config)
      });
      if (res.ok) toast.success('Configurações salvas!');
      else toast.error('Erro ao salvar configurações');
    } catch { toast.error('Erro de conexão'); }
    finally { setLoading(false); }
  };

  const handleSaveNotifPrefs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/users/${user.id}/notif-prefs`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          notif_email: notifPrefs.email,
          notif_sms: notifPrefs.sms,
          notif_push: notifPrefs.push
        })
      });
      if (res.ok) toast.success('Preferências de notificação salvas!');
      else toast.error('Erro ao salvar preferências');
    } catch { toast.error('Erro de conexão'); }
    finally { setLoading(false); }
  };

  const togglePermission = (moduleId: string, field: 'canView' | 'canEdit') => {
    setPermissions(prev => {
      const existing = prev.find(p => p.moduleId === moduleId);
      if (existing) {
        return prev.map(p => {
          if (p.moduleId === moduleId) {
            const newState = { ...p, [field]: !p[field] };
            
            // Se marcou 'Editar', obrigatoriamente marca 'Visualizar'
            if (field === 'canEdit' && newState.canEdit) {
              newState.canView = true;
            }
            
            // Se desmarcou 'Visualizar', obrigatoriamente desmarca 'Editar'
            if (field === 'canView' && !newState.canView) {
              newState.canEdit = false;
            }
            
            return newState;
          }
          return p;
        });
      } else {
        // Se for novo, e marcou editar, já nasce com visualizar
        const canViewInitial = field === 'canView' || field === 'canEdit';
        return [...prev, { moduleId, canView: canViewInitial, canEdit: field === 'canEdit' }];
      }
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('A foto deve ter no máximo 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setFormData(f => ({ ...f, photo: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  return (
    <Container className="animate-in fade-in zoom-in-95 duration-300">
      <Sidebar>
        <SidebarHeader>
          <UserAvatarHome>
             {formData.photo ? <img src={formData.photo} alt="Avatar" /> : <User size={40} className="opacity-20" />}
             <div className="edit-overlay"><Camera size={14} /></div>
             <input type="file" accept="image/*" onChange={handlePhotoUpload} />
          </UserAvatarHome>
          <UserInfoHome>
            <h3>{formData.fullName || 'Sem Nome'}</h3>
            <p>Usuário desde {new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase()}</p>
            <Button variant="outline" size="sm" className="mt-2 h-7 text-[10px] gap-1" onClick={() => setShowPwdFields(!showPwdFields)}>
              <Lock size={10} /> ALTERAR SENHA
            </Button>
          </UserInfoHome>
        </SidebarHeader>

        <Nav className="custom-scrollbar">
          <NavItem $active={activeTab === 'profile'} onClick={() => setActiveTab('profile')}>
            <User size={18} /> PERFIL
          </NavItem>
          <NavItem $active={activeTab === 'org'} onClick={() => setActiveTab('org')}>
            <Building2 size={18} /> ORGANIZACIONAL
          </NavItem>
          <NavItem $active={activeTab === 'perms'} onClick={() => setActiveTab('perms')}>
            <ShieldCheck size={18} /> PERMISSÕES
          </NavItem>
          <NavItem $active={activeTab === 'notif'} onClick={() => setActiveTab('notif')}>
            <Bell size={18} /> NOTIFICAÇÕES
          </NavItem>
          <NavItem $active={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>
            <Settings size={18} /> CONFIGURAÇÕES
          </NavItem>
          <NavItem $active={activeTab === 'clients'} onClick={() => setActiveTab('clients')}>
            <Users2 size={18} /> CLIENTES
          </NavItem>
          <NavItem $active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
            <History size={18} /> HISTÓRICO
          </NavItem>
        </Nav>

        <SidebarFooter>
           <Button variant="ghost" className="w-full justify-start gap-2 h-12 text-muted-foreground hover:text-foreground" onClick={onClose}>
             <X size={18} /> FECHAR
           </Button>
        </SidebarFooter>
      </Sidebar>

      <MainContent>
        <ContentHeader>
           <div className="breadcrumb">
             Início &gt; Administração &gt; Segurança &gt; Usuários &gt; <span>{formData.fullName}</span>
           </div>
        </ContentHeader>

        <ContentBody $scroll={true} className="custom-scrollbar">
          {activeTab === 'profile' && (
            <FormGrid>
              <div className="section-title">Informações Básicas</div>
              <div className="field">
                <Label>ID do Usuário</Label>
                <Input value={user.id} disabled className="bg-muted/30" />
              </div>
              <div className="field">
                <Label>Nome Completo *</Label>
                <Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
              </div>
              <div className="field">
                <Label>E-mail *</Label>
                <Input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  placeholder="exemplo@email.com"
                />
              </div>
              <div className="field">
                <Label>Código Único (ID)</Label>
                <Input value={formData.code} disabled className="bg-muted/30 font-bold text-primary" />
                <p className="text-[10px] text-muted-foreground italic">O código é imutável após a criação.</p>
              </div>
              <div className="field">
                <Label>CPF / CNPJ</Label>
                <Input value={formData.cpf_cnpj} onChange={e => {
                  const type = e.target.value.replace(/\D/g, '').length <= 11 ? 'cpf' : 'cnpj';
                  setFormData({...formData, cpf_cnpj: maskDoc(e.target.value, type)});
                }} />
              </div>
              <div className="field">
                <Label>Telefone</Label>
                <Input value={formData.telefone} onChange={e => setFormData({...formData, telefone: maskPhone(e.target.value)})} placeholder="(00) 00000-0000" />
              </div>
              <div className="field">
                <Label>Data de Nascimento</Label>
                <Input type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
              </div>

              <div className="field">
                <Label className="text-primary font-bold">Estado de Atuação</Label>
                <Input 
                  value={formData.assigned_state ? `${formData.assigned_state} - ${UF_DATA.find(uf => uf.sigla === formData.assigned_state)?.nome || ''}` : 'Brasil (Todos os Estados)'} 
                  disabled 
                  className="bg-muted/30 border-primary/20 font-medium"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Estado configurado na aba Territórios. Define a visão e reivindicação de municípios.</p>
              </div>

              {showPwdFields && (
                <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="field">
                    <Label>Nova Senha</Label>
                    <div className="relative">
                      <Input 
                        type={showPwd ? 'text' : 'password'} 
                        value={formData.password} 
                        onChange={e => setFormData({...formData, password: e.target.value})} 
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="field">
                    <Label>Confirmar Senha</Label>
                    <div className="relative">
                      <Input 
                        type={showConfirmPwd ? 'text' : 'password'} 
                        value={formData.confirmPassword} 
                        onChange={e => setFormData({...formData, confirmPassword: e.target.value})} 
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="section-title mt-4">Endereço</div>
              <div className="field">
                <Label>CEP</Label>
                <Input value={formData.cep} onChange={e => setFormData({...formData, cep: maskCEP(e.target.value)})} onBlur={() => fetchCepProfile(formData.cep.replace(/\D/g, ''))} maxLength={9} />
              </div>
              <div className="field">
                <Label>Logradouro / Rua</Label>
                <Input value={formData.logradouro} onChange={e => setFormData({...formData, logradouro: e.target.value})} />
              </div>
              <div className="field">
                <Label>Número</Label>
                <Input value={formData.numero} onChange={e => setFormData({...formData, numero: e.target.value})} />
              </div>
              <div className="field">
                <Label>Complemento</Label>
                <Input value={formData.complemento} onChange={e => setFormData({...formData, complemento: e.target.value})} />
              </div>
              <div className="field">
                <Label>Bairro</Label>
                <Input value={formData.bairro_end} onChange={e => setFormData({...formData, bairro_end: e.target.value})} />
              </div>
              <div className="field">
                <Label>Cidade</Label>
                <Input value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} />
              </div>
              <div className="field">
                <Label>UF</Label>
                <Input value={formData.estado_end} onChange={e => setFormData({...formData, estado_end: e.target.value})} maxLength={2} className="uppercase" />
              </div>
            </FormGrid>
          )}

          {activeTab === 'org' && (
            <FormGrid>
              <div className="section-title">Ambiente de Trabalho</div>
              <div className="field">
                <Label>Área de Trabalho Padrão</Label>
                <select 
                  className="w-full h-10 px-3 bg-background border rounded-md text-sm"
                  value={formData.default_screen} 
                  onChange={e => setFormData({...formData, default_screen: e.target.value})}
                >
                  <option value="mapa">Mapa Principal</option>
                  <option value="dashboard">Dashboard</option>
                  <option value="baserotas">Base Cliente</option>
                  <option value="territories">Territórios</option>
                  <option value="rotas_menu">Planejamento de Áreas</option>
                  <option value="settings">Configurações</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">Define qual tela será carregada automaticamente após o login do usuário.</p>
              </div>

              <div className="section-title mt-4">Dados Organizacionais</div>
              <div className="field">
                <Label>Tipo de Usuário (Categoria)</Label>
                <select 
                  className="w-full h-10 px-3 bg-background border rounded-md text-sm"
                  value={formData.userTypeId} 
                  onChange={e => setFormData({...formData, userTypeId: e.target.value})}
                >
                  <option value="">— Selecionar —</option>
                  {userTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">Categoria personalizada definida nas configurações de sistema. O nível de acesso é definido pelo tipo selecionado.</p>
              </div>

              <div className="field">
                <Label className="text-primary font-bold">Estado de Atuação</Label>
                <select 
                  className="w-full h-10 px-3 bg-background border border-primary/30 rounded-md text-sm focus:ring-2 focus:ring-primary/20"
                  value={formData.assigned_state || ''} 
                  onChange={e => setFormData({...formData, assigned_state: e.target.value})}
                >
                  <option value="">Brasil (Todos os Estados)</option>
                  {UF_DATA.map(uf => (
                    <option key={uf.sigla} value={uf.sigla}>{uf.sigla} - {uf.nome}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">Restringe a visão e a reivindicação de municípios a este estado específico.</p>
              </div>

              <div className="field col-span-2">
                <Label>Gerenciamento de Perfis</Label>
                {formData.role === 'admin' ? (
                  <div className="p-4 rounded-lg bg-secondary/20 border border-dashed border-border/60 flex flex-col items-center justify-center gap-2">
                    <ShieldCheck className="w-8 h-8 text-primary/40" />
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Gerenciamento Desnecessário</p>
                    <p className="text-[10px] text-muted-foreground/80 text-center max-w-xs">
                      Este usuário é um **Administrador**. Ele já possui acesso total a todos os clientes do sistema por padrão.
                    </p>
                  </div>
                ) : (
                  <>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full justify-between h-10 bg-background border rounded-md text-sm hover:bg-secondary/50 transition-all"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Users2 className="w-4 h-4 text-primary" />
                            <span className="truncate">
                              {formData.managedUserIds.length === 0 
                                ? "Nenhum usuário selecionado" 
                                : `${formData.managedUserIds.length} usuário(s) selecionado(s)`}
                            </span>
                          </div>
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-[350px] p-0 bg-card border-border shadow-2xl z-[3000] overflow-hidden rounded-xl" 
                        align="start"
                        onWheel={(e) => e.stopPropagation()}
                      >
                        <div className="p-3 border-b border-border/50 bg-secondary/20">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Pesquisar por nome ou código..."
                              className="w-full bg-background text-xs pl-10 pr-8 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                              onChange={(e) => {
                                const q = e.target.value.toLowerCase();
                                const items = document.querySelectorAll('.managed-user-item-edit');
                                items.forEach((item: any) => {
                                  const text = item.getAttribute('data-search').toLowerCase();
                                  item.style.display = text.includes(q) ? 'flex' : 'none';
                                });
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-2.5 px-1">
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {formData.managedUserIds.length} selecionados
                            </span>
                            <div className="flex gap-3">
                              <button 
                                type="button"
                                onClick={() => setFormData({ ...formData, managedUserIds: allUsers.filter(u => u.id !== user.id).map(u => u.id) })}
                                className="text-[10px] font-bold text-primary hover:underline"
                              >
                                Todos
                              </button>
                              <button 
                                type="button"
                                onClick={() => setFormData({ ...formData, managedUserIds: [] })}
                                className="text-[10px] font-bold text-destructive hover:underline"
                              >
                                Limpar
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div 
                          className="max-h-[300px] overflow-y-auto overflow-x-hidden py-1 custom-scrollbar select-none"
                          style={{ WebkitOverflowScrolling: 'touch' }}
                        >
                          {allUsers.filter(u => u.id !== user.id).map(u => {
                            const isSelected = formData.managedUserIds.includes(u.id);
                            const displayName = u.full_name || u.fullName || u.username;
                            return (
                              <button
                                key={u.id}
                                type="button"
                                data-search={`${u.code} ${displayName}`}
                                className={`managed-user-item-edit w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-all hover:bg-secondary group ${isSelected ? 'bg-primary/5' : ''}`}
                                onClick={() => {
                                  const ids = [...formData.managedUserIds];
                                  if (isSelected) {
                                    setFormData({ ...formData, managedUserIds: ids.filter(id => id !== u.id) });
                                  } else {
                                    setFormData({ ...formData, managedUserIds: [...ids, u.id] });
                                  }
                                }}
                              >
                                <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary text-white' : 'border-border group-hover:border-primary/50'}`}>
                                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
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
                          {allUsers.length === 0 && (
                            <p className="text-[10px] text-muted-foreground p-4 text-center italic">
                              Nenhum usuário disponível para seleção.
                            </p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <p className="text-[10px] text-muted-foreground mt-1">Este usuário poderá visualizar todos os clientes dos usuários selecionados.</p>
                    
                    {/* Visualização dos selecionados (UserProfileManager) */}
                    {formData.managedUserIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {formData.managedUserIds.map(id => {
                          const u = allUsers.find(user => user.id === id);
                          if (!u) return null;
                          return (
                            <div 
                              key={id} 
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] text-primary font-medium animate-in fade-in zoom-in duration-200"
                            >
                              <span className="opacity-70 font-mono">{u.code}</span>
                              <span>{u.full_name || u.username}</span>
                              <button 
                                type="button"
                                onClick={() => setFormData({ ...formData, managedUserIds: formData.managedUserIds.filter(mid => mid !== id) })}
                                className="hover:text-destructive transition-colors ml-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </FormGrid>
          )}

          {activeTab === 'perms' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1">
                <div className="section-title">Permissões de Acesso</div>
                <p className="text-[11px] text-muted-foreground">Configure quais áreas do sistema este usuário pode visualizar ou gerenciar.</p>
              </div>
              
              <div className="rounded-xl border border-border/50 bg-secondary/5 overflow-hidden shadow-sm">
                <PermissionTable>
                  <thead>
                    <tr className="bg-secondary/20">
                      <th className="w-[50%]">Módulo do Sistema</th>
                      <th className="text-center">Visualizar</th>
                      <th className="text-center">Editar / Gerenciar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableModules.map(mod => {
                      const p = permissions.find(p => p.moduleId === mod.id);
                      
                      // Definindo ícones por módulo
                      const getIcon = (id: string) => {
                        switch(id) {
                          case 'clientes': return <Users className="w-4 h-4" />;
                          case 'notifications': return <Bell className="w-4 h-4" />;
                          case 'users': return <User className="w-4 h-4" />;
                          case 'interests': return <BadgeCheck className="w-4 h-4" />;
                          case 'routes': return <MapPin className="w-4 h-4" />;
                          case 'audit': return <History className="w-4 h-4" />;
                          case 'settings': return <Settings className="w-4 h-4" />;
                          default: return <Fingerprint className="w-4 h-4" />;
                        }
                      };

                      const isFullAdmin = formData.role === 'admin';

                      return (
                        <tr key={mod.id} className={`transition-colors group ${isFullAdmin ? 'opacity-50 grayscale-[0.5] pointer-events-none bg-secondary/5' : 'hover:bg-primary/5'}`}>
                          <td className="font-medium text-sm" data-label="Módulo">
                             <div className="flex items-center gap-4">
                               <div className={`w-9 h-9 rounded-lg bg-background border border-border/40 flex items-center justify-center transition-all shadow-sm ${isFullAdmin ? 'text-muted-foreground' : 'text-primary/70 group-hover:text-primary group-hover:scale-110'}`}>
                                 {getIcon(mod.id)}
                               </div>
                               <div className="flex flex-col">
                                 <span className="font-bold text-foreground/90">{mod.name}</span>
                                 <span className="text-[10px] text-muted-foreground">
                                   {isFullAdmin ? 'Liberado via Acesso Total' : `Acesso ao módulo ${mod.id}`}
                                 </span>
                               </div>
                             </div>
                          </td>
                          <td className="text-center" data-label="Visualizar">
                            <div className="flex justify-center">
                              <Checkbox 
                                checked={isFullAdmin || !!p?.canView} 
                                onClick={() => !isFullAdmin && togglePermission(mod.id, 'canView')}
                                className={isFullAdmin ? 'cursor-default' : 'hover:scale-110 active:scale-95'}
                              >
                                {(isFullAdmin || p?.canView) && <Check className="w-3.5 h-3.5 stroke-[4]" />}
                              </Checkbox>
                            </div>
                          </td>
                          <td className="text-center" data-label="Editar/Gerenciar">
                            <div className="flex justify-center">
                              <Checkbox 
                                checked={isFullAdmin || !!p?.canEdit} 
                                onClick={() => {
                                  if (isFullAdmin) return;
                                  togglePermission(mod.id, 'canEdit');
                                  if (mod.id === 'clientes' && !p?.canEdit) {
                                    toast.info('Permissão de gerenciamento concedida. O botão de cadastro será habilitado após salvar.', { duration: 5000 });
                                  }
                                }}
                                className={isFullAdmin ? 'cursor-default' : 'hover:scale-110 active:scale-95'}
                              >
                                {(isFullAdmin || p?.canEdit) && <Check className="w-3.5 h-3.5 stroke-[4]" />}
                              </Checkbox>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </PermissionTable>
              </div>

              {/* Opção de Acesso Total (Administrador) */}
              <div className="mt-8 pt-6 border-t border-border/50">
                <div 
                  className={`p-5 rounded-xl border transition-all duration-300 flex items-center justify-between gap-6 ${formData.role === 'admin' 
                    ? 'bg-primary/10 border-primary/30 shadow-md' 
                    : 'bg-secondary/10 border-border/40 hover:border-primary/20'}`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-300 ${formData.role === 'admin' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-muted text-muted-foreground'}`}>
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-black text-sm uppercase tracking-tight text-foreground">Acesso Total (Administrador)</span>
                      <p className="text-[11px] text-muted-foreground max-w-md leading-relaxed">
                        Ao ativar esta opção, o usuário terá acesso irrestrito a todas as funções, configurações e dados do sistema, ignorando as permissões individuais acima.
                      </p>
                    </div>
                  </div>
                  <Switch 
                    $active={formData.role === 'admin'} 
                    onClick={() => {
                      const newIsAdmin = formData.role !== 'admin';
                      setFormData(prev => ({ ...prev, role: newIsAdmin ? 'admin' : 'user' }));
                      
                      if (newIsAdmin) {
                        // Marca TODAS as permissões automaticamente no estado local
                        const allPerms = availableModules.map(m => ({
                          moduleId: m.id,
                          canView: true,
                          canEdit: true
                        }));
                        setPermissions(allPerms);
                        toast.info('Perfil de Administrador preparado. Clique em "Salvar Perfil" para aplicar as mudanças.', {
                          icon: <ShieldCheck className="text-primary" />
                        });
                      }
                    }}
                    className="scale-110 shadow-sm"
                  >
                    <div className="handle shadow-sm" />
                  </Switch>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-500">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-amber-700">Nota de Segurança</p>
                  <p className="text-[10px] text-amber-600/80 leading-relaxed">
                    As permissões de edição geralmente incluem permissão de visualização. Ao conceder acesso de "Editar / Gerenciar", o usuário poderá alterar dados críticos neste módulo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notif' && (
            <FormGrid>
              <div className="section-title">Canais de Notificação</div>
              <p className="col-span-full text-xs text-muted-foreground mb-2">Configure por onde este usuário receberá os alertas do sistema.</p>
              
              <NotifToggle>
                <div className="info">
                   <Mail size={18} />
                   <div>
                     <div className="title">E-mail</div>
                     <div className="desc">Enviar notificações importantes por e-mail</div>
                   </div>
                </div>
                <Switch $active={notifPrefs.email} onClick={() => setNotifPrefs({...notifPrefs, email: !notifPrefs.email})}>
                  <div className="handle" />
                </Switch>
              </NotifToggle>

              <NotifToggle>
                <div className="info">
                   <Phone size={18} />
                   <div>
                     <div className="title">SMS</div>
                     <div className="desc">Enviar alertas urgentes via SMS (tarifado)</div>
                   </div>
                </div>
                <Switch $active={notifPrefs.sms} onClick={() => setNotifPrefs({...notifPrefs, sms: !notifPrefs.sms})}>
                  <div className="handle" />
                </Switch>
              </NotifToggle>

              <NotifToggle>
                <div className="info">
                   <Bell size={18} />
                   <div>
                     <div className="title">Notificação Push</div>
                     <div className="desc">Exibir alertas no navegador e aplicativo</div>
                   </div>
                </div>
                <Switch $active={notifPrefs.push} onClick={() => setNotifPrefs({...notifPrefs, push: !notifPrefs.push})}>
                  <div className="handle" />
                </Switch>
              </NotifToggle>
            </FormGrid>
          )}

          {activeTab === 'settings' && (
            <FormGrid>
              <div className="section-title">Ambiente de Trabalho</div>
              <div className="field">
                <Label>Área de Trabalho Padrão</Label>
                <select 
                  className="w-full h-10 px-3 bg-background border rounded-md text-sm"
                  value={config.default_workspace} 
                  onChange={e => setConfig({...config, default_workspace: e.target.value})}
                >
                  <option value="dashboard">Dashboard</option>
                  <option value="baserotas">Base Cliente</option>
                  <option value="reps">Equipe/Usuários</option>
                  <option value="territories">Territórios</option>
                  <option value="roteiros">Roteiros</option>
                </select>
              </div>
              
              <div className="section-title mt-6">Segurança da Sessão</div>
              <div className="field">
                <Label>Limite de Inatividade (Minutos)</Label>
                <Input 
                  type="number" 
                  value={config.inactivity_limit} 
                  onChange={e => setConfig({...config, inactivity_limit: parseInt(e.target.value)})} 
                  min={1} 
                  max={1440}
                />
                <p className="text-[10px] text-muted-foreground">O usuário será desconectado automaticamente após este período sem atividade.</p>
              </div>
            </FormGrid>
          )}

          {activeTab === 'clients' && (
            <div className="space-y-6">
              <div className="section-title">Clientes Vinculados</div>
              <p className="text-xs text-muted-foreground mb-4">
                Este usuário é o responsável direto pelos seguintes clientes na base de dados.
              </p>

              {currentUserRole === 'admin' && (
                <div className="bg-secondary/20 p-4 rounded-lg border border-border/50 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Palette size={16} className="text-primary" />
                    <span className="text-sm font-bold">Cor de Atuação no Mapa</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-4">
                    Selecione a cor que representará este usuário e seus territórios no mapa principal.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(REP_COLOR_PALETTE).map(([index, color]) => (
                      <button
                        key={index}
                        onClick={() => setFormData({ ...formData, colorIndex: Number(index) })}
                        style={{ 
                          width: 32, 
                          height: 32, 
                          borderRadius: '50%', 
                          background: color,
                          border: formData.colorIndex === Number(index) ? '3px solid #fff' : '1px solid rgba(0,0,0,0.1)',
                          boxShadow: formData.colorIndex === Number(index) ? '0 0 0 2px hsl(var(--primary))' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        title={`Cor ${index}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {loadingClients ? (
                  <div className="text-center py-10">
                    <div className="animate-spin inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                    <p className="text-xs text-muted-foreground mt-2">Carregando clientes...</p>
                  </div>
                ) : userClients.length === 0 ? (
                  <div className="text-center py-10 bg-secondary/10 rounded-lg border border-dashed border-border">
                    <Users size={24} className="mx-auto opacity-20 mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum cliente vinculado a este usuário.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {userClients.map(cliente => (
                      <div key={cliente.id_cliente} className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:border-primary/50 transition-colors">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
                          style={{ background: REP_COLOR_PALETTE[formData.colorIndex] || 'hsl(var(--primary))' }}
                        >
                          {cliente.nome_cliente.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{cliente.nome_cliente}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="bg-secondary px-1 rounded">#{cliente.codigo_cliente}</span>
                            <span className="flex items-center gap-0.5"><MapPin size={10} /> {cliente.cidade} - {cliente.uf}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
               <div className="section-title">Histórico de Atividade</div>
               <Timeline>
                 {activities.length === 0 ? (
                   <div className="text-center py-10 text-muted-foreground text-sm">Nenhuma atividade registrada ainda.</div>
                 ) : (
                   activities.map(act => (
                     <TimelineItem key={act.id}>
                        <div className="marker" />
                        <div className="content">
                           <div className="header">
                             <span className="action">{act.details}</span>
                             <span className="time">{new Date(act.timestamp).toLocaleString('pt-BR')}</span>
                           </div>
                           <div className="footer">
                             <span className="ip">IP: {act.ipAddress || 'Interno'}</span>
                             <span className="type">{act.action.toUpperCase()}</span>
                           </div>
                        </div>
                     </TimelineItem>
                   ))
                 )}
               </Timeline>
            </div>
          )}
        </ContentBody>

        {/* ─── Rodapé com botão Salvar para TODAS as abas ─── */}
        {activeTab !== 'history' && (
          <ContentFooter>
            <Button variant="ghost" onClick={onClose} className="gap-2 text-muted-foreground">
              <X size={16} /> Cancelar
            </Button>
            <Button
              onClick={
                activeTab === 'profile'   ? handleSaveProfile :
                activeTab === 'org'       ? handleSaveProfile :
                activeTab === 'perms'     ? handleSavePermissions :
                activeTab === 'notif'     ? handleSaveNotifPrefs :
                activeTab === 'settings'  ? handleSaveConfig :
                activeTab === 'clients'   ? handleSaveProfile :
                handleSaveProfile
              }
              disabled={loading}
              className="gap-2 min-w-[160px]"
            >
              {loading ? (
                <><span className="animate-spin">⟳</span> Salvando...</>
              ) : (
                <><Save size={16} />
                {activeTab === 'profile'  && 'Salvar Perfil'}
                {activeTab === 'org'      && 'Salvar Organizacional'}
                {activeTab === 'perms'    && 'Salvar Permissões'}
                {activeTab === 'notif'    && 'Salvar Preferências'}
                {activeTab === 'settings' && 'Salvar Configurações'}
                {activeTab === 'clients'  && 'Salvar Cor e Vínculos'}
                </>
              )}
            </Button>
          </ContentFooter>
        )}
      </MainContent>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  display: flex;
  background: hsl(var(--background));
  border-radius: 12px;
  overflow: hidden;
  height: 80vh;
  width: 95vw;
  max-width: 1200px;
  box-shadow: 0 10px 40px -10px rgba(0,0,0,0.2);
  border: 1px solid hsl(var(--border) / 0.5);
  margin: auto;

  @media (max-width: 1024px) {
    flex-direction: column;
    height: 95vh;
    width: 98vw;
    border-radius: 8px;
  }
`;

const Sidebar = styled.div`
  width: 240px;
  background: hsl(var(--secondary) / 0.3);
  border-right: 1px solid hsl(var(--border) / 0.5);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  @media (max-width: 1024px) {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid hsl(var(--border) / 0.5);
    max-height: 35%;
  }
`;

const SidebarHeader = styled.div`
  padding: 30px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border-bottom: 1px solid hsl(var(--border) / 0.3);

  @media (max-width: 1024px) {
    padding: 15px;
    flex-direction: row;
    text-align: left;
    gap: 15px;
  }
`;

const UserAvatarHome = styled.div`
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: hsl(var(--secondary));
  margin-bottom: 15px;
  position: relative;
  border: 3px solid #fff;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  @media (max-width: 1024px) {
    width: 60px;
    height: 60px;
    margin-bottom: 0;
  }

  img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  
  input { position: absolute; inset: 0; opacity: 0; cursor: pointer; z-index: 10; border-radius: 50%; }

  .edit-overlay {
    position: absolute;
    bottom: 0px;
    right: 0px;
    width: 26px;
    height: 26px;
    background: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    color: #444;
    z-index: 11;
    border: 1px solid hsl(var(--border) / 0.5);

    @media (max-width: 1024px) {
      width: 20px;
      height: 20px;
      svg { width: 10px; height: 10px; }
    }
  }
`;

const UserInfoHome = styled.div`
  h3 { font-size: 0.95rem; font-weight: 800; color: hsl(var(--foreground)); margin: 0; }
  p { font-size: 0.65rem; color: hsl(var(--muted-foreground)); margin: 4px 0 0; font-weight: 600; }

  @media (max-width: 1024px) {
    flex: 1;
    h3 { font-size: 0.85rem; }
    button { padding: 0 8px; height: 24px; font-size: 9px; }
  }
`;

const Nav = styled.nav`
  padding: 20px 0;
  flex: 1;
  overflow-y: auto;
  
  @media (max-width: 1024px) {
    padding: 0;
    display: flex;
    overflow-x: auto;
    overflow-y: hidden;
    white-space: nowrap;
    -webkit-overflow-scrolling: touch;
    border-bottom: 1px solid hsl(var(--border) / 0.3);
    
    &::-webkit-scrollbar {
      height: 4px;
    }
  }
`;

const NavItem = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 25px;
  border: none;
  background: ${props => props.$active ? 'hsl(var(--background))' : 'transparent'};
  color: ${props => props.$active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'};
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 4px solid ${props => props.$active ? 'hsl(var(--primary))' : 'transparent'};
  text-align: left;

  @media (max-width: 1024px) {
    width: auto;
    padding: 12px 20px;
    border-left: none;
    border-bottom: 3px solid ${props => props.$active ? 'hsl(var(--primary))' : 'transparent'};
    flex-shrink: 0;
  }

  &:hover {
    background: ${props => props.$active ? 'hsl(var(--background))' : 'hsl(var(--secondary) / 0.5)'};
    color: ${props => props.$active ? 'hsl(var(--primary))' : 'hsl(var(--foreground))'};
  }
`;

const SidebarFooter = styled.div`
  padding: 10px;
  border-top: 1px solid hsl(var(--border) / 0.3);

  @media (max-width: 1024px) {
    display: none;
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: hsl(var(--background));
  min-height: 0;
`;

const ContentHeader = styled.div`
  padding: 15px 30px;
  border-bottom: 1px solid hsl(var(--border) / 0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media (max-width: 768px) {
    padding: 10px 15px;
  }

  .breadcrumb {
    font-size: 0.7rem;
    color: hsl(var(--muted-foreground));
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    span { color: hsl(var(--foreground)); font-weight: 700; }
  }
`;

const ContentBody = styled.div<{ $scroll?: boolean }>`
  padding: 30px;
  flex: 1;
  overflow-y: ${props => props.$scroll ? 'auto' : 'hidden'};
  min-height: 0;

  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const ContentFooter = styled.div`
  padding: 14px 30px;
  border-top: 1px solid hsl(var(--border) / 0.3);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  background: hsl(var(--secondary) / 0.15);
  flex-shrink: 0;

  @media (max-width: 768px) {
    padding: 12px 15px;
    flex-direction: column-reverse;
    button { width: 100%; }
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  max-width: 800px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .section-title {
    grid-column: span 2;
    font-size: 0.85rem;
    font-weight: 800;
    text-transform: uppercase;
    color: hsl(var(--primary));
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 2px solid hsl(var(--primary) / 0.1);

    @media (max-width: 768px) {
      grid-column: span 1;
    }
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
`;

const PermissionTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  @media (max-width: 640px) {
    display: block;
    
    thead { display: none; }
    
    tbody, tr, td {
      display: block;
      width: 100%;
    }

    tr {
      padding: 15px 0;
      border-bottom: 1px solid hsl(var(--border) / 0.5);
    }

    td {
      padding: 5px 0;
      border: none;
      display: flex;
      justify-content: space-between;
      align-items: center;

      &:before {
        content: attr(data-label);
        font-size: 0.65rem;
        font-weight: 800;
        text-transform: uppercase;
        color: hsl(var(--muted-foreground));
      }
    }
  }

  th {
    text-align: left;
    padding: 12px 15px;
    font-size: 0.65rem;
    text-transform: uppercase;
    color: hsl(var(--muted-foreground));
    border-bottom: 1px solid hsl(var(--border) / 0.5);
    font-weight: 800;
    letter-spacing: 0.05em;
  }

  td {
    padding: 15px;
    border-bottom: 1px solid hsl(var(--border) / 0.2);
  }

  tr:last-child td { border-bottom: none; }
`;

const Checkbox = styled.button<{ checked: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid ${props => props.checked ? 'hsl(var(--primary))' : 'hsl(var(--border))'};
  background: ${props => props.checked ? 'hsl(var(--primary))' : 'transparent'};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin: 0 auto;
  transition: all 0.2s;

  @media (max-width: 640px) {
    margin: 0;
  }

  &:hover { border-color: hsl(var(--primary)); }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  items-center: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: hsl(var(--muted-foreground));

  .icon-box {
    margin-bottom: 20px;
    opacity: 0.2;
  }

  h3 { font-size: 1.1rem; font-weight: 700; color: hsl(var(--foreground)); margin-bottom: 5px; }
  p { font-size: 0.8rem; }
`;

const NotifToggle = styled.div`
  grid-column: span 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  background: hsl(var(--secondary) / 0.2);
  border-radius: 8px;
  border: 1px solid hsl(var(--border) / 0.3);

  @media (max-width: 768px) {
    grid-column: span 1;
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .info {
    display: flex;
    align-items: center;
    gap: 15px;
    color: hsl(var(--primary));

    .title { font-size: 0.85rem; font-weight: 700; color: hsl(var(--foreground)); }
    .desc { font-size: 0.75rem; color: hsl(var(--muted-foreground)); }
  }
`;

const Switch = styled.button<{ $active?: boolean }>`
  width: 40px;
  height: 20px;
  border-radius: 10px;
  background: ${props => props.$active ? 'hsl(var(--primary))' : 'hsl(var(--secondary))'};
  position: relative;
  border: none;
  cursor: pointer;
  transition: all 0.2s;

  @media (max-width: 768px) {
    align-self: flex-end;
  }

  .handle {
    position: absolute;
    top: 2px;
    left: ${props => props.$active ? '22px' : '2px'};
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    transition: all 0.2s;
  }
`;

const Timeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-left: 20px;
  border-left: 2px solid hsl(var(--border) / 0.5);
  margin-top: 20px;
`;

const TimelineItem = styled.div`
  position: relative;
  padding-bottom: 25px;
  padding-left: 25px;

  .marker {
    position: absolute;
    left: -31px;
    top: 0;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: hsl(var(--background));
    border: 4px solid hsl(var(--primary));
    z-index: 10;
  }

  .content {
    background: hsl(var(--secondary) / 0.1);
    padding: 15px;
    border-radius: 10px;
    border: 1px solid hsl(var(--border) / 0.3);

    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      
      .action { font-size: 0.85rem; font-weight: 700; color: hsl(var(--foreground)); }
      .time { font-size: 0.7rem; color: hsl(var(--muted-foreground)); }

      @media (max-width: 480px) {
        flex-direction: column;
        gap: 4px;
      }
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .ip { font-size: 0.65rem; color: hsl(var(--muted-foreground)); font-family: monospace; }
      .type { 
        font-size: 0.6rem; 
        font-weight: 800; 
        color: hsl(var(--primary)); 
        background: hsl(var(--primary) / 0.1);
        padding: 2px 6px;
        border-radius: 4px;
      }
    }
  }

  &:last-child { padding-bottom: 0; }
`;

export default UserProfileManager;
