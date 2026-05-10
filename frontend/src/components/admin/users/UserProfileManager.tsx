import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { 
  User, Briefcase, ShieldCheck, Bell, Settings, History, 
  Save, X, Camera, Check, Lock, Eye, EyeOff, Building2,
  Users, BadgeCheck, Mail, Phone, MapPin, Globe, Fingerprint,
  Users2, Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api-base';
import { useAuth } from '@/contexts/auth-context-core';
import type { SystemUser } from '@/data/representatives';
import { REP_COLOR_PALETTE } from '@/data/representatives';
import { useApiClientes } from '@/hooks/use-api-data';

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
}

const UserProfileManager: React.FC<UserProfileManagerProps> = ({ user, onClose, onUpdate, userTypes = [] }) => {
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
    area_atuacao: user.area_atuacao || '',
    base_logistica: user.base_logistica || '',
    userTypeId: user.userTypeId || ''
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
      area_atuacao: user.area_atuacao || '',
      base_logistica: user.base_logistica || '',
      userTypeId: user.userTypeId || ''
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
      
      if (modulesRes.ok) setAvailableModules(await modulesRes.json());
      if (permsRes.ok) setPermissions(await permsRes.json());
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }
  }, [user.id, authHeaders]);

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

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          username: formData.username,
          full_name: formData.fullName,
          email: formData.email, // Incluindo o email no corpo da requisição
          role: formData.role,
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
          area_atuacao: formData.area_atuacao,
          base_logistica: formData.base_logistica,
          userTypeId: formData.userTypeId ? Number(formData.userTypeId) : null
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
        body: JSON.stringify({ permissions })
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

        <Nav>
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

        <ContentBody $scroll={true}>
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
                <Input value={formData.cpf_cnpj} onChange={e => setFormData({...formData, cpf_cnpj: e.target.value})} />
              </div>
              <div className="field">
                <Label>Telefone</Label>
                <Input value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} />
              </div>
              <div className="field">
                <Label>Data de Nascimento</Label>
                <Input type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
              </div>
              
              {showPwdFields && (
                <div className="col-span-full grid grid-cols-2 gap-4 mt-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
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
                <Input value={formData.cep} onChange={e => setFormData({...formData, cep: e.target.value.replace(/\D/g, '')})} onBlur={() => fetchCepProfile(formData.cep)} maxLength={8} />
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
              <div className="section-title">Dados Organizacionais</div>
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
            </FormGrid>
          )}

          {activeTab === 'perms' && (
            <div className="space-y-4">
              <div className="section-title">Permissões por Módulo</div>
              <p className="text-xs text-muted-foreground mb-4">Escolha quais módulos este usuário pode visualizar ou editar.</p>
              
              <PermissionTable>
                <thead>
                  <tr>
                    <th>Módulo</th>
                    <th className="text-center">Visualizar</th>
                    <th className="text-center">Editar/Gerenciar</th>
                  </tr>
                </thead>
                <tbody>
                  {availableModules.map(mod => {
                    const p = permissions.find(p => p.moduleId === mod.id);
                    return (
                      <tr key={mod.id}>
                        <td className="font-medium text-sm">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded bg-secondary/50 flex items-center justify-center">
                               <Fingerprint size={14} className="text-primary/60" />
                             </div>
                             {mod.name}
                           </div>
                        </td>
                        <td className="text-center">
                          <Checkbox checked={!!p?.canView} onClick={() => togglePermission(mod.id, 'canView')}>
                             {p?.canView && <Check size={14} />}
                          </Checkbox>
                        </td>
                        <td className="text-center">
                          <Checkbox checked={!!p?.canEdit} onClick={() => togglePermission(mod.id, 'canEdit')}>
                             {p?.canEdit && <Check size={14} />}
                          </Checkbox>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </PermissionTable>
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
                  <option value="reps">Representantes</option>
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
  box-shadow: 0 10px 40px -10px rgba(0,0,0,0.2);
  border: 1px solid hsl(var(--border) / 0.5);
`;

const Sidebar = styled.div`
  width: 240px;
  background: hsl(var(--secondary) / 0.3);
  border-right: 1px solid hsl(var(--border) / 0.5);
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.div`
  padding: 30px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border-bottom: 1px solid hsl(var(--border) / 0.3);
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
  }
`;

const UserInfoHome = styled.div`
  h3 { font-size: 0.95rem; font-weight: 800; color: hsl(var(--foreground)); margin: 0; }
  p { font-size: 0.65rem; color: hsl(var(--muted-foreground)); margin: 4px 0 0; font-weight: 600; }
`;

const Nav = styled.nav`
  padding: 20px 0;
  flex: 1;
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

  &:hover {
    background: ${props => props.$active ? 'hsl(var(--background))' : 'hsl(var(--secondary) / 0.5)'};
    color: ${props => props.$active ? 'hsl(var(--primary))' : 'hsl(var(--foreground))'};
  }
`;

const SidebarFooter = styled.div`
  padding: 10px;
  border-top: 1px solid hsl(var(--border) / 0.3);
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: hsl(var(--background));
`;

const ContentHeader = styled.div`
  padding: 15px 30px;
  border-bottom: 1px solid hsl(var(--border) / 0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;

  .breadcrumb {
    font-size: 0.7rem;
    color: hsl(var(--muted-foreground));
    font-weight: 500;
    span { color: hsl(var(--foreground)); font-weight: 700; }
  }
`;

const ContentBody = styled.div<{ $scroll?: boolean }>`
  padding: 30px;
  flex: 1;
  overflow-y: ${props => props.$scroll ? 'auto' : 'hidden'};
  min-height: 0;
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
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  max-width: 800px;

  .section-title {
    grid-column: span 2;
    font-size: 0.85rem;
    font-weight: 800;
    text-transform: uppercase;
    color: hsl(var(--primary));
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 2px solid hsl(var(--primary) / 0.1);
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
