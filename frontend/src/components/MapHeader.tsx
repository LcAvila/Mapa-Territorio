import React, { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogIn, Settings, LogOut, Search, ChevronDown, MapPin, RotateCcw, FileDown, Loader2, User, Bell, Truck, Users, Flame, Filter, X, UserCheck, Check, RefreshCw, ShieldCheck, BadgeCheck } from "lucide-react";
import { useAuth } from "@/contexts/auth-context-core";
import { UF_DATA } from "@/data/uf-codes";
import { SystemUser, Cliente, SearchSuggestion } from "@/hooks/use-api-data";
import { REP_COLOR_PALETTE } from "@/data/representatives";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ThemeToggle } from "./ThemeToggle";
import { API_BASE_URL } from "@/lib/api-base";

interface UserNotification {
  id: number;
  title: string;
  message: string;
  targetAll?: boolean;
  targetUserIds?: number[] | null;
  createdAt: string;
  seen?: boolean;
}

interface MapHeaderProps {
  selectedUF?: string | null;
  onSelectUF?: (uf: string | null) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  isAuthenticated: boolean;
  role: string | null;
  logout: () => void;
  showClientes?: boolean;
  onToggleClientes?: () => void;
  showHeatmap?: boolean;
  onToggleHeatmap?: () => void;
  showUsuarios?: boolean;
  onToggleUsuarios?: () => void;
  onSearchEnter?: (q: string) => void;
  suggestions?: SearchSuggestion[];
  onSelectSuggestion?: (item: SearchSuggestion) => void;
  users?: SystemUser[];
  clients?: Cliente[];
  filtroUsuario?: string | null;
  onFilterUser?: (id: string | null) => void;
  onSelectClient?: (client: Cliente) => void;
  minimal?: boolean;
}

export default function MapHeader({
  selectedUF, onSelectUF, 
  searchQuery, onSearchChange, isAuthenticated, role, logout,
  showClientes, onToggleClientes, showHeatmap, onToggleHeatmap,
  showUsuarios, onToggleUsuarios,
  onSearchEnter, suggestions, onSelectSuggestion,
  users = [], clients = [], filtroUsuario, onFilterUser, onSelectClient,
  minimal = false
}: MapHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userName, userId, token, tokenVersion, assigned_state, assigned_states, role: authRole } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Notifications Logic ──
  const currentUserId = userId || Number(localStorage.getItem('userId') || 0) || null;
  const fullUserName = userName || localStorage.getItem('userName') || 'Usuário';
  const userCargo = localStorage.getItem('cargo') || localStorage.getItem('tipo') || role || 'usuário';
  const userPhoto = localStorage.getItem('photo') || '';

  const myNotifications = useMemo(() => {
    return notifications
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notifications]);

  const unreadCount = myNotifications.filter(n => !n.seen).length;

  const markAsRead = async (id: number) => {
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${id}/seen`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // Atualiza o estado local para refletir a mudança imediatamente
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, seen: true } : n));
    } catch (error) {
      console.error('Error marking as seen on server:', error);
    }
  };

  const fetchNotifications = React.useCallback(async () => {
    if (!token || !currentUserId) return;
    try {
      setLoadingNotifications(true);
      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-user-token-version': String(tokenVersion || 0),
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      // silent
    } finally {
      setLoadingNotifications(false);
    }
  }, [token, tokenVersion, currentUserId]);

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  React.useEffect(() => {
    if (!showNotifications) return;
    // mark all currently visible notifications as read when opening the center
    myNotifications.forEach(n => markAsRead(n.id));
  }, [showNotifications, myNotifications]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Find refresh buttons in different tabs and trigger them
    const refreshBtn = document.querySelector('button[title="Atualizar dados"]') as HTMLButtonElement;
    if (refreshBtn) {
      refreshBtn.click();
      // Wait a bit to show animation before resetting
      setTimeout(() => setIsRefreshing(false), 2000);
    } else {
      // Fallback for screens without the explicit refresh button
      toast.success("Mapa atualizado");
      setTimeout(() => window.location.reload(), 500);
    }
  };

  return (
    <header className="bg-card/95 backdrop-blur-sm border-b border-border px-2 md:px-4 py-2 flex items-center justify-between gap-2 md:gap-6 sticky top-0 z-[1000] shadow-sm overflow-hidden">
      {/* Logo / Brand */}
      <div className="flex items-center gap-2 shrink-0 cursor-pointer group" onClick={() => setShowAboutModal(true)}>
        <div className="relative">
          <img src="/Logo.png" alt="Logo" className="h-7 sm:h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105" />
          <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
      </div>

      <Dialog open={showAboutModal} onOpenChange={setShowAboutModal}>
        <DialogContent className="max-w-[90vw] sm:max-w-[400px] p-0 overflow-hidden border-border bg-card shadow-2xl z-[5001]">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 bg-secondary border-b border-border">
            <DialogTitle className="text-xs sm:text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Sobre o Sistema
            </DialogTitle>
            <DialogDescription className="sr-only">
              Informações sobre os desenvolvedores e a versão do sistema Mapa Território.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
            <div className="flex flex-col items-center text-center space-y-3 pb-4 border-b border-border">
              <img src="/Logo.png" alt="Logo" className="h-10 sm:h-12 w-auto object-contain" />
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-foreground">Mapa Território</h3>
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Versão 2.4.0 • Enterprise</p>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-xl bg-secondary border border-border hover:bg-secondary/80 transition-colors">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary/70 mb-0.5">Arquitetura & Design</p>
                  <p className="text-xs sm:text-sm font-bold text-foreground">Lucas Ávila</p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">Responsável por toda a estrutura visual, experiência do usuário e design do ecossistema.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-xl bg-secondary border border-border hover:bg-secondary/80 transition-colors">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                  <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-blue-500/70 mb-0.5">Idealização & Estratégia</p>
                  <p className="text-xs sm:text-sm font-bold text-foreground">Rafael Fortes</p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">Mente criativa por trás do conceito do projeto e direcionamento estratégico do produto.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-xl bg-secondary border border-border hover:bg-secondary/80 transition-colors">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20">
                  <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-orange-500/70 mb-0.5">DevOps & Engenharia</p>
                  <p className="text-xs sm:text-sm font-bold text-foreground">Clayton Pontes</p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">Especialista em infraestrutura, revisão de backend e garantia de qualidade técnica.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border text-center">
              <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Copyright © 2026 • Todos os direitos reservados
              </p>
            </div>
          </div>
          
          <div className="bg-secondary px-4 sm:px-6 py-3 flex justify-end border-t border-border">
            <Button size="sm" onClick={() => setShowAboutModal(false)} className="h-8 text-[10px] font-black uppercase tracking-widest shadow-none">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>



      {/* UF Selector & Search */}
      {!minimal && (
        <>
          <div className="relative shrink-0 hidden sm:block">
            <select
              value={selectedUF || ""}
              onChange={(e) => onSelectUF?.(e.target.value || null)}
              disabled={(!!assigned_state || (assigned_states && assigned_states.length > 0)) && authRole !== 'admin'}
              className="appearance-none bg-secondary text-foreground text-[10px] sm:text-sm pl-2 sm:pl-3 pr-6 sm:pr-8 py-1.5 sm:py-2 rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {(!assigned_state && (!assigned_states || assigned_states.length === 0)) && <option value="">Todos os Estados</option>}
              {UF_DATA
                .filter(uf => authRole === 'admin' || !assigned_states || assigned_states.length === 0 || assigned_states.includes(uf.sigla))
                .sort((a, b) => a.sigla.localeCompare(b.sigla))
                .map((uf) => (
                <option key={uf.sigla} value={uf.sigla}>
                  {uf.sigla} - {uf.nome}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground pointer-events-none" />
          </div>

          {/* General Search Bar */}
          <div className="flex-1 max-w-xl mx-auto hidden md:flex items-center relative">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar município ou endereço..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && onSearchEnter) {
                    onSearchEnter(searchQuery || "");
                  }
                }}
                className="w-full bg-secondary/80 text-foreground text-sm pl-9 pr-3 h-10 rounded-lg border border-border/50 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all group-hover:bg-secondary group-hover:border-border"
              />
            </div>

            {/* Suggestions Dropdown */}
            {suggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-[2000] overflow-hidden max-h-[300px] overflow-y-auto">
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectSuggestion?.(item)}
                    className="w-full text-left px-4 py-2.5 hover:bg-muted flex items-center gap-3 transition-colors border-b border-border/50 last:border-0"
                  >
                    <div className="p-1.5 bg-secondary rounded-md">
                      {item.type === 'city' || item.type === 'administrative' ? <MapPin className="w-3.5 h-3.5 text-blue-500" /> : <Search className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{item.display_name.split(',')[0]}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{item.display_name.split(',').slice(1).join(',').trim()}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map Layers & Advanced Filters */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-secondary/40 rounded-lg p-1 border border-border/40">
              <Button
                variant={showClientes ? "default" : "ghost"}
                size="sm"
                onClick={onToggleClientes}
                className={`h-8 gap-1.5 sm:gap-2 px-2 sm:px-3 ${showClientes ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-background'}`}
              >
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden md:inline text-xs font-semibold">Clientes</span>
              </Button>
              <Button
                variant={showHeatmap ? "default" : "ghost"}
                size="sm"
                onClick={onToggleHeatmap}
                className={`h-8 gap-1.5 sm:gap-2 px-2 sm:px-3 ${showHeatmap ? 'bg-orange-500 text-white shadow-sm hover:bg-orange-600' : 'text-muted-foreground hover:bg-background'}`}
              >
                <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden md:inline text-xs font-semibold">Calor</span>
              </Button>
              <Button
                variant={showUsuarios ? "default" : "ghost"}
                size="sm"
                onClick={onToggleUsuarios}
                className={`h-8 gap-1.5 sm:gap-2 px-2 sm:px-3 ${showUsuarios ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700' : 'text-muted-foreground hover:bg-background'}`}
              >
                <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden md:inline text-xs font-semibold">Usuários</span>
              </Button>
              <div className="w-[1px] h-4 bg-border/40 mx-0.5" />

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className={`h-8 gap-1.5 sm:gap-2 px-1.5 sm:px-2 hover:bg-background ${filtroUsuario ? 'text-primary' : 'text-muted-foreground'}`}>
                    <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {filtroUsuario && <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-primary/20 text-primary border-0">Filtrado</Badge>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 bg-card border-border shadow-2xl z-[3000]" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Filter className="w-4 h-4 text-primary" />
                        Filtros Avançados
                      </h3>
                      {filtroUsuario && (
                        <Button variant="ghost" size="sm" onClick={() => onFilterUser?.(null)} className="h-6 text-[10px] text-destructive p-0">Limpar</Button>
                      )}
                    </div>

                    {/* Mobile UF Selector */}
                    <div className="space-y-2 sm:hidden">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Estado (UF)</label>
                      <div className="relative">
                        <select
                          value={selectedUF || ""}
                          onChange={(e) => onSelectUF?.(e.target.value || null)}
                          disabled={(!!assigned_state || (assigned_states && assigned_states.length > 0)) && authRole !== 'admin'}
                          className="w-full appearance-none bg-secondary text-foreground text-xs pl-3 pr-8 py-2 rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {(!assigned_state && (!assigned_states || assigned_states.length === 0)) && <option value="">Todos os Estados</option>}
                          {UF_DATA
                            .filter(uf => authRole === 'admin' || !assigned_states || assigned_states.length === 0 || assigned_states.includes(uf.sigla))
                            .sort((a, b) => a.sigla.localeCompare(b.sigla))
                            .map((uf) => (
                            <option key={uf.sigla} value={uf.sigla}>
                              {uf.sigla} - {uf.nome}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                    {/* User Multi-Select Filter (Admin/Supervisor Only) */}
                    {(role === 'admin' || role === 'supervisor') && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Filtrar Usuários</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full justify-between h-9 text-xs bg-secondary/50 border-border hover:bg-secondary"
                            >
                              <span className="truncate max-w-[120px]">
                                {!filtroUsuario ? "Todos Usuários" : 
                                  !filtroUsuario.includes(',') ? 
                                    (users.find(u => String(u.id) === filtroUsuario)?.username || "1 Usuário") :
                                    `${filtroUsuario.split(',').length} Selecionados`}
                              </span>
                              <ChevronDown className="w-3 h-3 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[280px] p-2 bg-card border-border shadow-xl z-[3000]" align="start">
                            <div className="px-2 py-2 mb-2 sticky top-0 bg-card z-10">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <input
                                  type="text"
                                  placeholder="Pesquisar usuário..."
                                  value={userSearchQuery}
                                  onChange={(e) => setUserSearchQuery(e.target.value)}
                                  className="w-full bg-secondary/50 text-xs pl-8 pr-8 py-1.5 rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary/40"
                                />
                                {userSearchQuery && (
                                  <button 
                                    onClick={() => setUserSearchQuery("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                              <button
                                onClick={() => onFilterUser?.(null)}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors ${!filtroUsuario ? 'bg-primary/10 text-primary' : 'hover:bg-secondary'}`}
                              >
                                <Users size={14} /> Todos Usuários
                                {!filtroUsuario && <Check size={14} className="ml-auto" />}
                              </button>
                              <div className="h-px bg-border/50 my-1" />
                              {users
                                .filter(u => {
                                  if (!userSearchQuery) return true;
                                  const q = userSearchQuery.toLowerCase();
                                  return u.username.toLowerCase().includes(q) || 
                                         (u.full_name || u.fullName || "").toLowerCase().includes(q);
                                })
                                .map(u => {
                                const isSelected = filtroUsuario?.split(',').includes(String(u.id));
                                return (
                                  <button
                                    key={u.id}
                                    onClick={() => {
                                      const currentIds = filtroUsuario ? filtroUsuario.split(',') : [];
                                      let newIds: string[];
                                      if (isSelected) {
                                        newIds = currentIds.filter(id => id !== String(u.id));
                                      } else {
                                        newIds = [...currentIds, String(u.id)];
                                      }
                                      onFilterUser?.(newIds.length > 0 ? newIds.join(',') : null);
                                    }}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors ${isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-secondary'}`}
                                  >
                                    <div 
                                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                                      style={{ background: REP_COLOR_PALETTE[u.colorIndex || 0] || 'hsl(var(--primary))' }} 
                                    />
                                    <span className="truncate flex-1 text-left">{u.username} — {u.full_name || u.fullName}</span>
                                    {isSelected && <Check size={14} className="ml-auto shrink-0" />}
                                  </button>
                                );
                              })}
                              {users.filter(u => {
                                const q = userSearchQuery.toLowerCase();
                                return u.username.toLowerCase().includes(q) || 
                                       (u.full_name || u.fullName || "").toLowerCase().includes(q);
                              }).length === 0 && (
                                <div className="py-6 text-center text-[10px] text-muted-foreground italic">
                                  Nenhum usuário encontrado
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    {/* Municipality Filter */}
                    {selectedUF && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Município</label>
                        <div className="relative">
                          <select 
                            className="w-full bg-secondary text-foreground text-xs pl-3 pr-8 py-2 rounded-md border border-border appearance-none cursor-pointer"
                            onChange={(e) => {
                              if (e.target.value) onSelectSuggestion?.({ place_id: 0, display_name: `${e.target.value}, ${selectedUF}, Brasil`, lat: "0", lon: "0", type: "city" });
                            }}
                          >
                            <option value="">Todos os Municípios</option>
                            {Array.from(new Set(clients.filter(c => c.uf === selectedUF).map(c => c.bairro || ""))).sort().filter(Boolean).map(mun => (
                              <option key={mun} value={mun}>{mun}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                    )}

                    {/* Client Search */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Buscar Cliente</label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <input 
                          type="text"
                          placeholder="Nome ou código..."
                          value={clientSearchQuery}
                          className="w-full bg-secondary text-foreground text-xs pl-8 pr-3 py-2 rounded-md border border-border"
                          onChange={(e) => setClientSearchQuery(e.target.value)}
                        />
                        {clientSearchQuery && <button onClick={() => setClientSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="w-3 h-3" /></button>}
                      </div>
                      <ClientSearchList query={clientSearchQuery} onSelect={(c) => { onSelectClient?.(c); setClientSearchQuery(""); }} clients={clients} />
                    </div>

                    <p className="text-[10px] text-muted-foreground italic border-t border-border/50 pt-2">Filtros restringem a visualização de territórios e clientes no mapa.</p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </>
      )}

      {/* Auth / Admin */}
      <div className="flex items-center gap-2 lg:ml-0">
        {!isAuthenticated ? (
          <Button variant="outline" size="sm" onClick={() => navigate('/login')} className="gap-2 border-primary/20">
            <LogIn className="w-4 h-4" /> Entrar
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <Popover open={showNotifications} onOpenChange={setShowNotifications}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0 hover:bg-primary/5 hover:text-primary">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-[10px] leading-4 text-white font-bold text-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-0 bg-card border-border shadow-2xl z-[3000]" align="end">
                <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold">Central de Notificações</h4>
                    <p className="text-[11px] text-muted-foreground">Atualizações e respostas dos seus interesses</p>
                  </div>
                </div>
                <div className="max-h-[360px] overflow-y-auto custom-scrollbar divide-y divide-border/40">
                  {loadingNotifications ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">Carregando...</div>
                  ) : myNotifications.length === 0 ? (
                    <div className="py-10 text-center text-xs text-muted-foreground">Nenhuma notificação</div>
                  ) : (
                    myNotifications.map((n) => (
                      <div key={n.id} className={`px-4 py-3 hover:bg-secondary/40 transition-colors relative ${!n.seen ? 'bg-primary/[0.03] border-l-2 border-l-primary' : ''}`}>
                        <div className="flex justify-between items-start gap-2">
                          <p className={`text-xs font-semibold ${!n.seen ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                          {!n.seen && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1" />}
                        </div>
                        <div
                          className="text-[11px] text-muted-foreground mt-1 line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: n.message }}
                        />
                        <p className="text-[10px] text-muted-foreground/60 mt-2">
                          {new Date(n.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={showUserMenu} onOpenChange={setShowUserMenu}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-1 sm:px-2.5 py-1 sm:py-1.5 bg-secondary/60 rounded-full sm:rounded-xl border border-border/40 hover:bg-secondary/80 transition-colors sm:min-w-[165px] text-left">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center shrink-0 border border-primary/20">
                    {userPhoto ? (
                      <img src={userPhoto} alt={fullUserName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 hidden sm:block">
                    <p className="text-[11px] font-bold text-foreground leading-tight truncate">{fullUserName}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight capitalize truncate">{String(userCargo).toLowerCase()}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0 hidden sm:block" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1.5 bg-card border-border shadow-2xl z-[3000]" align="end">
                <div className="flex items-center justify-between px-2.5 py-2 border-b border-border/60 mb-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">Tema</span>
                  <ThemeToggle />
                </div>
                <div className="h-px bg-border/40 my-1" />
                <button
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-md hover:bg-secondary/70 transition-colors"
                  onClick={() => { setShowUserMenu(false); handleRefresh(); }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Atualizar Dados
                </button>
                <button
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-md hover:bg-secondary/70 transition-colors"
                  onClick={() => { setShowUserMenu(false); navigate('/admin'); }}
                >
                  <Settings className="w-3.5 h-3.5" />
                  Painel
                </button>
                <button
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={() => { setShowUserMenu(false); logout(); }}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair
                </button>
              </PopoverContent>
            </Popover>
            
          </div>
        )}
      </div>
    </header>
  );
}

function ClientSearchList({ query, onSelect, clients }: { query: string; onSelect?: (c: Cliente) => void; clients: Cliente[] }) {
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (q.length < 2) return [];
    return clients.filter(c => 
      c.nome_cliente.toLowerCase().includes(q) || 
      c.codigo_cliente.toLowerCase().includes(q) ||
      (c.nome_abreviado && c.nome_abreviado.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [query, clients]);

  if (filtered.length === 0) return null;

  return (
    <div className="mt-2 space-y-1 max-h-[160px] overflow-y-auto pr-1">
      {filtered.map(c => (
        <button key={c.id_cliente} onClick={() => onSelect?.(c)} className="w-full text-left p-2 rounded-lg hover:bg-primary/5 border border-transparent hover:border-primary/20 bg-muted/30">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-foreground truncate">{c.nome_cliente}</span>
            <span className="text-[9px] text-muted-foreground">#{c.codigo_cliente} • {c.uf}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
