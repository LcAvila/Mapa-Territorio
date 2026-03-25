import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Settings, LogOut, Search, ChevronDown, MapPin, RotateCcw, FileDown, Loader2, User, Bell, Truck, Users, Flame, Filter, X, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UF_DATA } from "@/data/uf-codes";
import { Representative, Cliente, SearchSuggestion } from "@/hooks/use-api-data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ThemeToggle } from "./ThemeToggle";

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  targetAll: boolean;
  targetReps: string[];
  sentAt: string;
  readBy: string[];
}

interface MapHeaderProps {
  selectedUF: string | null;
  onSelectUF: (uf: string | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
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
  reps: Representative[];
  clients: Cliente[];
  filtroRepresentante: string | null;
  onFilterRep: (code: string | null) => void;
  onSelectClient?: (client: Cliente) => void;
}

export default function MapHeader({
  selectedUF, onSelectUF, 
  searchQuery, onSearchChange, isAuthenticated, role, logout,
  showClientes, onToggleClientes, showHeatmap, onToggleHeatmap,
  showReps, onToggleReps,
  onSearchEnter, suggestions, onSelectSuggestion,
  reps, clients, filtroRepresentante, onFilterRep, onSelectClient
}: MapHeaderProps) {
  const navigate = useNavigate();
  const { repCode, userName } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");

  // ── Notifications Logic ──
  const [notifications, setNotifications] = useState<AdminNotification[]>(() => {
    try { return JSON.parse(localStorage.getItem('admin_notifications') || '[]'); } catch { return []; }
  });

  const myNotifications = useMemo(() => {
    if (!repCode) return [];
    return notifications
      .filter(n => n.targetAll || (n.targetReps && n.targetReps.includes(repCode)))
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }, [notifications, repCode]);

  const unreadCount = myNotifications.filter(n => !n.readBy.includes(repCode)).length;

  const markAsRead = (id: string) => {
    if (!repCode) return;
    const updated = notifications.map(n => {
      if (n.id === id && !n.readBy.includes(repCode)) {
        return { ...n, readBy: [...n.readBy, repCode] };
      }
      return n;
    });
    setNotifications(updated);
    localStorage.setItem('admin_notifications', JSON.stringify(updated));
  };

  React.useEffect(() => {
    const handleStorage = () => {
      try { setNotifications(JSON.parse(localStorage.getItem('admin_notifications') || '[]')); } catch { /* ignore */ }
    };
    window.addEventListener('storage', handleStorage);
    return () => { window.removeEventListener('storage', handleStorage); };
  }, []);

  return (
    <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-4 flex-wrap">
      {/* Logo / Title */}
      <div className="flex items-center gap-2 mr-4">
        <MapPin className="w-5 h-5 text-primary" />
        <h1 className="text-base font-bold text-foreground tracking-tight">
          Territórios de Vendas
        </h1>
      </div>

      {/* UF Selector */}
      <div className="relative">
        <select
          value={selectedUF || ""}
          onChange={(e) => onSelectUF(e.target.value || null)}
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
      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto order-last sm:order-none w-full sm:w-auto mt-2 sm:mt-0 relative">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar município ou endereço..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onSearchEnter) {
                onSearchEnter(searchQuery);
              }
            }}
            className="w-full bg-secondary text-foreground text-sm pl-9 pr-3 py-2.5 rounded-md border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
      <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-1 border border-border/50">
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
            <span className="hidden md:inline text-xs font-semibold">Representantes</span>
          </Button>
        )}

        <div className="w-[1px] h-4 bg-border/50 mx-1" />

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
                  <Button variant="ghost" size="sm" onClick={() => onFilterRep(null)} className="h-6 text-[10px] text-destructive p-0">Limpar</Button>
                )}
              </div>

              {/* Rep Filter - Admins Only */}
              {role === 'admin' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Representante</label>
                  <div className="relative">
                    <select 
                      value={filtroRepresentante || ""}
                      onChange={(e) => onFilterRep(e.target.value || null)}
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

      {/* Auth / Admin */}
      <div className="flex items-center gap-2 ml-auto lg:ml-0">
        <ThemeToggle />
        {!isAuthenticated ? (
          <Button variant="outline" size="sm" onClick={() => navigate('/login')} className="gap-2 border-primary/20">
            <LogIn className="w-4 h-4" /> Entrar
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            {userName && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/80 rounded-full border border-border/50">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-3 h-3 text-primary" />
                </div>
                <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
                  {userName.split(' ')[0]}
                </span>
              </div>
            )}
            
            {role === 'admin' && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="gap-2 h-8 px-2">
                <Settings className="w-4 h-4" /> <span className="hidden sm:inline">Admin</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={logout} className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10">
              <LogOut className="w-4 h-4" />
            </Button>
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
