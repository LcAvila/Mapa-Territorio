import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { 
  User, Briefcase, ShieldCheck, Bell, Settings, History, 
  Save, X, Camera, Check, Lock, Eye, EyeOff, Building2,
  Users, BadgeCheck, Mail, Phone, MapPin, Globe, Fingerprint
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

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

interface SystemUser {
  id: number;
  username: string;
  role: string;
  repCode: string | null;
  full_name?: string;
  fullName?: string;
  photo?: string;
  birth_date?: string;
  telefone?: string;
  code?: string;
  cpf_cnpj?: string;
  default_workspace?: string;
  inactivity_limit?: number;
  notif_email?: boolean;
  notif_sms?: boolean;
  notif_push?: boolean;
  colorIndex?: number;
  comissao?: number;
  isVago?: number;
  email?: string;
  cargo?: string;
  company_name?: string;
  groupId?: number;
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
  reps: { code: string; name: string }[];
}

const UserProfileManager: React.FC<UserProfileManagerProps> = ({ user, onClose, onUpdate, reps }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'org' | 'perms' | 'notif' | 'settings' | 'history'>('profile');
  const [loading, setLoading] = useState(false);
  
  // Forms State
  const [formData, setFormData] = useState({
    fullName: user.full_name || user.fullName || '',
    username: user.username || '',
    email: user.email || user.username || '',
    role: user.role || 'user',
    repCode: user.repCode || '',
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
  });

  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [showPwd, setShowPwd] = useState(false);
  
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

  const API = 'http://localhost:3001';
  const token = localStorage.getItem('token');
  const tokenVersion = localStorage.getItem('tokenVersion');
  const authHeaders = useMemo(() => ({ 
    'Content-Type': 'application/json', 
    'Authorization': `Bearer ${token}`,
    'x-user-token-version': tokenVersion || '0'
  }), [token, tokenVersion]);

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

  const handleSaveProfile = async () => {
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
          role: formData.role,
          repCode: formData.repCode,
          photo: formData.photo,
          colorIndex: formData.colorIndex,
          comissao: formData.comissao,
          isVago: formData.isVago,
          telefone: formData.telefone,
          birth_date: formData.birthDate,
          cpf_cnpj: formData.cpf_cnpj,
          password: formData.password || undefined
        })
      });

      if (res.ok) {
        toast.success('Perfil atualizado com sucesso!');
        onUpdate();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Erro ao atualizar');
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
      if (res.ok) toast.success('Permissões atualizadas!');
      else toast.error('Erro ao salvar permissões');
    } catch { toast.error('Erro de conexão'); }
    finally { setLoading(false); }
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
        return prev.map(p => p.moduleId === moduleId ? { ...p, [field]: !p[field] } : p);
      } else {
        return [...prev, { moduleId, canView: field === 'canView', canEdit: field === 'canEdit' }];
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
            <Button variant="outline" size="sm" className="mt-2 h-7 text-[10px] gap-1" onClick={() => setShowPwd(!showPwd)}>
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
                <Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value, username: e.target.value})} />
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
              
              {showPwd && (
                <div className="col-span-full grid grid-cols-2 gap-4 mt-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="field">
                    <Label>Nova Senha</Label>
                    <div className="relative">
                      <Input type={showPwd ? 'text' : 'password'} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    </div>
                  </div>
                  <div className="field">
                    <Label>Confirmar Senha</Label>
                    <Input type={showPwd ? 'text' : 'password'} value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
                  </div>
                </div>
              )}
            </FormGrid>
          )}

          {activeTab === 'org' && (
            <FormGrid>
              <div className="section-title">Dados Organizacionais</div>
              <div className="field">
                <Label>Cargo / Papel</Label>
                <select 
                  className="w-full h-10 px-3 bg-background border rounded-md text-sm"
                  value={formData.role} 
                  onChange={e => setFormData({...formData, role: e.target.value})}
                >
                  <option value="user">Representantes</option>
                  <option value="supervisor">Supervisores</option>
                  <option value="promotor">Promotores</option>
                </select>
              </div>
              <div className="field">
                <Label>Representante Vinculado</Label>
                <select 
                  className="w-full h-10 px-3 bg-background border rounded-md text-sm"
                  value={formData.repCode} 
                  onChange={e => setFormData({...formData, repCode: e.target.value})}
                >
                  <option value="">Nenhum</option>
                  {reps.map(r => <option key={r.code} value={r.code}>{r.code} — {r.name}</option>)}
                </select>
              </div>

              {formData.repCode && (
                <>
                  <div className="section-title mt-6">Dados do Representante</div>
                  <div className="field">
                    <Label>Comissão (%)</Label>
                    <Input 
                      type="number" 
                      value={formData.comissao} 
                      onChange={e => setFormData({...formData, comissao: parseFloat(e.target.value)})} 
                      step="0.01"
                    />
                  </div>
                  <div className="field">
                    <Label>Status de Vago</Label>
                    <select 
                      className="w-full h-10 px-3 bg-background border rounded-md text-sm"
                      value={formData.isVago} 
                      onChange={e => setFormData({...formData, isVago: parseInt(e.target.value)})}
                    >
                      <option value={0}>Ativo</option>
                      <option value={1}>Vago / Inativo</option>
                    </select>
                  </div>
                  <div className="field">
                    <Label>Cor no Mapa</Label>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded border" 
                        style={{ backgroundColor: `hsl(${(formData.colorIndex * 30) % 360}, 70%, 50%)` }} 
                      />
                      <Input 
                        type="number" 
                        value={formData.colorIndex} 
                        onChange={e => setFormData({...formData, colorIndex: parseInt(e.target.value)})} 
                        min={0} 
                        max={12}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">O índice de cor (1-12) define a cor das regiões no mapa.</p>
                  </div>
                </>
              )}
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
  overflow: hidden;

  img { width: 100%; height: 100%; object-cover: cover; }
  
  input { position: absolute; inset: 0; opacity: 0; cursor: pointer; z-index: 10; }

  .edit-overlay {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 24px;
    height: 24px;
    background: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    color: #444;
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
