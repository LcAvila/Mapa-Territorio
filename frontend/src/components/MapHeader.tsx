import React, { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogIn, Settings, LogOut, Search, ChevronDown, MapPin, RotateCcw, FileDown, Loader2, User, Bell, Truck, Users, Flame, Filter, X, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/auth-context-core";
import { UF_DATA } from "@/data/uf-codes";
import { Representative, Cliente, SearchSuggestion } from "@/hooks/use-api-data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  showReps?: boolean;
  onToggleReps?: () => void;
  onSearchEnter?: (q: string) => void;
  suggestions?: SearchSuggestion[];
  onSelectSuggestion?: (item: SearchSuggestion) => void;
  reps?: Representative[];
  clients?: Cliente[];
  filtroRepresentante?: string | null;
  onFilterRep?: (code: string | null) => void;
  onSelectClient?: (client: Cliente) => void;
  minimal?: boolean;
}

export default function MapHeader({
  selectedUF, onSelectUF, 
  searchQuery, onSearchChange, isAuthenticated, role, logout,
  showClientes, onToggleClientes, showHeatmap, onToggleHeatmap,
  showReps, onToggleReps,
  onSearchEnter, suggestions, onSelectSuggestion,
  reps = [], clients = [], filtroRepresentante, onFilterRep, onSelectClient,
  minimal = false
}: MapHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { repCode, userName, userId, token, tokenVersion } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // ── Notifications Logic ──
  const currentUserId = userId || Number(localStorage.getItem('userId') || 0) || null;
  const seenKey = currentUserId ? `seen_notifications_user_${currentUserId}` : 'seen_notifications_guest';
  const fullUserName = userName || localStorage.getItem('userName') || 'Usuário';
  const userCargo = localStorage.getItem('cargo') || localStorage.getItem('tipo') || role || 'usuário';
  const userPhoto = localStorage.getItem('photo') || '';
  const seenIds = useMemo(() => {
    try {
      return new Set<number>(JSON.parse(localStorage.getItem(seenKey) || '[]'));
    } catch {
      return new Set<number>();
    }
  }, [seenKey, showNotifications]);

  const myNotifications = useMemo(() => {
    return notifications
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notifications]);

  const unreadCount = myNotifications.filter(n => !seenIds.has(n.id)).length;

  const markAsRead = (id: number) => {
    try {
      const raw = JSON.parse(localStorage.getItem(seenKey) || '[]') as number[];
      if (raw.includes(id)) return;
      localStorage.setItem(seenKey, JSON.stringify([id, ...raw].slice(0, 200)));
    } catch {
      localStorage.setItem(seenKey, JSON.stringify([id]));
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
    const intervalId = window.setInterval(fetchNotifications, 4000);
    return () => window.clearInterval(intervalId);
  }, [fetchNotifications]);

  React.useEffect(() => {
    if (!showNotifications) return;
    // mark all currently visible notifications as read when opening the center
    myNotifications.forEach(n => markAsRead(n.id));
  }, [showNotifications, myNotifications]);

  return (
    <header className="bg-card/95 backdrop-blur-sm border-b border-border px-4 py-2.5 flex items-center gap-3 md:gap-6 sticky top-0 z-[1000] shadow-sm">
      {/* Logo / Brand */}
      <div className="flex items-center gap-4 shrink-0 cursor-pointer group" onClick={() => navigate('/mapa')}>
        <div className="relative">
          <img src="/Logo.png" alt="Logo" className="h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-105" />
          <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
      </div>



      {/* UF Selector & Search */}
      {!minimal && (
        <>
          <div className="relative">
            <select
              value={selectedUF || ""}
              onChange={(e) => onSelectUF?.(e.target.value || null)}
              className="appearance-none bg-secondary text-foreground text-sm pl-3 pr-8 py-2 rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="">Todos os Estados</option>
              {UF_DATA.sort((a, b) => a.sigla.localeCompare(b.sigla)).map((uf) => (
                <option key={uf.sigla} value={uf.sigla}>
                  {uf.sigla} - {uf.nome}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
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
                className={`h-8 gap-2 px-3 ${showClientes ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-background'}`}
              >
                <Users className="w-4 h-4" />
                <span className="hidden md:inline text-xs font-semibold">Clientes</span>
              </Button>
              <Button
                variant={showHeatmap ? "default" : "ghost"}
                size="sm"
                onClick={onToggleHeatmap}
                className={`h-8 gap-2 px-3 ${showHeatmap ? 'bg-orange-500 text-white shadow-sm hover:bg-orange-600' : 'text-muted-foreground hover:bg-background'}`}
              >
                <Flame className="w-4 h-4" />
                <span className="hidden md:inline text-xs font-semibold">Calor</span>
              </Button>
              {role === 'admin' && (
                <Button
                  variant={showReps ? "default" : "ghost"}
                  size="sm"
                  onClick={onToggleReps}
                  className={`h-8 gap-2 px-3 ${showReps ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700' : 'text-muted-foreground hover:bg-background'}`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span className="hidden xl:inline text-[11px] font-bold">Representantes</span>
                </Button>
              )}

              <div className="w-[1px] h-4 bg-border/40 mx-0.5" />

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className={`h-8 gap-2 px-2 hover:bg-background ${filtroRepresentante ? 'text-primary' : 'text-muted-foreground'}`}>
                    <Filter className="w-4 h-4" />
                    {filtroRepresentante && <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-primary/20 text-primary border-0">{filtroRepresentante}</Badge>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 bg-card border-border shadow-2xl z-[3000]" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Filter className="w-4 h-4 text-primary" />
                        Filtros Avançados
                      </h3>
                      {filtroRepresentante && (
                        <Button variant="ghost" size="sm" onClick={() => onFilterRep?.(null)} className="h-6 text-[10px] text-destructive p-0">Limpar</Button>
                      )}
                    </div>

                    {/* Rep Filter - Admins Only */}
                    {role === 'admin' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Representante</label>
                        <div className="relative">
                          <select 
                            value={filtroRepresentante || ""}
                            onChange={(e) => onFilterRep?.(e.target.value || null)}
                            className="w-full bg-secondary text-foreground text-xs pl-3 pr-8 py-2 rounded-md border border-border appearance-none cursor-pointer"
                          >
                            <option value="">Todos os Representantes</option>
                            {reps.filter(r => !r.isVago).sort((a,b) => a.name.localeCompare(b.name)).map(r => (
                              <option key={r.code} value={r.code}>{r.code} — {r.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                        </div>
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
      <div className="flex items-center gap-2 ml-auto lg:ml-0">
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
                      <div key={n.id} className="px-4 py-3 hover:bg-secondary/40 transition-colors">
                        <p className="text-xs font-semibold text-foreground">{n.title}</p>
                        <div
                          className="text-[11px] text-muted-foreground mt-1 line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: n.message }}
                        />
                        <p className="text-[10px] text-muted-foreground mt-2">
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
                <button className="hidden sm:flex items-center gap-2.5 px-2.5 py-1.5 bg-secondary/60 rounded-xl border border-border/40 hover:bg-secondary/80 transition-colors min-w-[165px] text-left">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center shrink-0 border border-primary/20">
                    {userPhoto ? (
                      <img src={userPhoto} alt={fullUserName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-foreground leading-tight truncate">{fullUserName}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight capitalize truncate">{String(userCargo).toLowerCase()}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1.5 bg-card border-border shadow-2xl z-[3000]" align="end">
                <div className="flex items-center justify-between px-2.5 py-2 border-b border-border/60 mb-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">Tema</span>
                  <ThemeToggle />
                </div>
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
