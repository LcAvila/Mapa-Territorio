import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Settings, LogOut, Search, ChevronDown, MapPin, RotateCcw, FileDown, Loader2, User, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { exportTerritoriesToExcel } from "@/utils/export-utils";
import { UF_DATA } from "@/data/uf-codes";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ThemeToggle } from "./ThemeToggle";

interface MapHeaderProps {
  selectedUF: string | null;
  onSelectUF: (uf: string | null) => void;
  modo: "planejamento" | "atendimento";
  onSetModo: (modo: "planejamento" | "atendimento") => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isAuthenticated: boolean;
  role: string | null;
  logout: () => void;
}

export default function MapHeader({
  selectedUF, onSelectUF, modo, onSetModo,
  searchQuery, onSearchChange, isAuthenticated, role, logout
}: MapHeaderProps) {
  const navigate = useNavigate();
  const { repCode } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // ── Notifications Logic ──
  const [notifications, setNotifications] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('admin_notifications') || '[]'); } catch { return []; }
  });

  // Filter messages for this rep: targetAll is true OR targetReps includes repCode
  const myNotifications = React.useMemo(() => {
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

  // Refresh notifications periodically or when storage changes
  React.useEffect(() => {
    const handleStorage = () => {
      try { setNotifications(JSON.parse(localStorage.getItem('admin_notifications') || '[]')); } catch { }
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 5000); // Poll every 5s just in case
    return () => { window.removeEventListener('storage', handleStorage); clearInterval(interval); };
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportTerritoriesToExcel();
      toast.success("Relatório exportado com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao exportar relatório");
    } finally {
      setExporting(false);
    }
  };

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

      {/* Mode Tabs */}
      <div className="flex bg-secondary rounded-md p-0.5">
        <button
          onClick={() => onSetModo("planejamento")}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${modo === "planejamento"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"}`}
        >
          Planejamento
        </button>
        <button
          onClick={() => onSetModo("atendimento")}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${modo === "atendimento"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"}`}
        >
          Atendimento
        </button>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium rounded-md border border-border transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        title="Exportar todos os territórios para Excel"
      >
        {exporting
          ? <Loader2 className="w-4 h-4 text-primary animate-spin" />
          : <FileDown className="w-4 h-4 text-primary" />}
        <span>{exporting ? "Exportando..." : "Exportar"}</span>
      </button>

      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[320px] ml-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar município, bairro ou representante..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-secondary text-foreground text-sm pl-9 pr-3 py-2 rounded-md border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Reset */}
      {selectedUF && (
        <button
          onClick={() => onSelectUF(null)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Voltar ao Brasil
        </button>
      )}

      {/* Auth / Admin / Notifications Buttons */}
      <div className="flex items-center gap-2 ml-auto lg:ml-0">
        <ThemeToggle />

        {!isAuthenticated ? (
          <Button variant="outline" size="sm" onClick={() => navigate('/login')} className="gap-2 border-primary/20 hover:bg-primary/10">
            <LogIn className="w-4 h-4" /> Entrar
          </Button>
        ) : (
          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1 border border-border/50">

            {/* Notification Bell (Only for reps) */}
            {role === 'user' && repCode && (
              <div className="relative">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-background relative" title="Notificações" onClick={() => setShowNotifications(!showNotifications)}>
                  <Bell className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-background" />
                  )}
                </Button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 top-10 w-80 bg-popover border border-border rounded-xl shadow-lg shadow-black/5 z-50 overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-border/50 bg-muted/30 flex items-center justify-between pointer-events-none">
                      <span className="text-sm font-semibold">Notificações</span>
                      {unreadCount > 0 && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{unreadCount} novas</span>}
                    </div>
                    <div className="max-h-80 overflow-y-auto p-1 pointer-events-auto">
                      {myNotifications.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          <p className="text-sm">Nenhuma notificação</p>
                        </div>
                      ) : (
                        myNotifications.map(n => {
                          const isUnread = !n.readBy.includes(repCode);
                          return (
                            <button key={n.id} onClick={() => markAsRead(n.id)} className={`w-full text-left p-3 rounded-lg transition-colors hover:bg-muted/50 ${isUnread ? 'bg-primary/5' : ''}`}>
                              <div className="flex justify-between items-start gap-2 mb-1">
                                <span className={`text-sm ${isUnread ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>{n.title}</span>
                                {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />}
                              </div>
                              <p className={`text-xs ${isUnread ? 'text-muted-foreground' : 'text-muted-foreground/70'} line-clamp-2`}>{n.message}</p>
                              <span className="text-[10px] text-muted-foreground/60 mt-2 block">
                                {new Date(n.sentAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Admin link */}
            {role === 'admin' && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="gap-2 hover:bg-background h-8 px-2">
                <Settings className="w-4 h-4 text-primary" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            )}
            {/* Profile link */}
            <Button variant="ghost" size="sm" onClick={() => navigate('/perfil')} className="gap-2 hover:bg-background h-8 px-2" title="Meu Perfil">
              <User className="w-4 h-4 text-indigo-500" />
              <span className="hidden sm:inline text-xs">Perfil</span>
            </Button>
            {/* Logout link */}
            <Button variant="ghost" size="sm" onClick={() => { logout(); toast.info('Sessão encerrada'); }}
              className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
