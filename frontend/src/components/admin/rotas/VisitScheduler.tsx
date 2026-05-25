import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar as CalendarIcon, 
  Search, 
  Plus, 
  MapPin, 
  Loader2, 
  CheckCircle2, 
  ArrowRight,
  User as UserIcon,
  Trash2,
  Sparkles,
  Home,
  Navigation,
  Bookmark
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-base';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context-core';

interface Cliente {
  id_cliente: number;
  nome_cliente: string;
  cidade: string;
  uf: string;
  bairro: string;
  userId: number | null;
}

interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
  userTypeId?: number | string;
  managedUsers?: { id: number }[];
}

interface UserType {
  id: number;
  name: string;
  canVisit: boolean;
}

export const VisitScheduler: React.FC = () => {
  const { token, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUF, setFilterUF] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [startPoint, setStartPoint] = useState<'base' | 'current'>('base');
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);
  const [loadingCoords, setLoadingCoords] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Memoized list of allowed user IDs (recursive hierarchy)
  const allowedUserIds = React.useMemo(() => {
    if (!selectedUserId) return [];
    
    const getIdsRecursive = (id: number): number[] => {
      const user = users.find(u => u.id === id);
      if (!user) return [id];
      
      let ids = [id];
      if (user.managedUsers) {
        user.managedUsers.forEach(sub => {
          ids = [...ids, ...getIdsRecursive(sub.id)];
        });
      }
      return ids;
    };
    
    return Array.from(new Set(getIdsRecursive(Number(selectedUserId))));
  }, [selectedUserId, users]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchSuggestions(selectedUserId);
    } else {
      setSuggestions([]);
    }
  }, [selectedUserId]);

  const fetchSuggestions = async (userId: string) => {
    try {
      setLoadingSuggestions(true);
      const res = await fetch(`${API_BASE_URL}/api/visit-route/suggestions?userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSuggestions(await res.json());
      }
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, clientsRes, typesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/clientes`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/admin/user-types`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (usersRes.ok && clientsRes.ok && typesRes.ok) {
        setUsers(await usersRes.json());
        setClientes(await clientsRes.json());
        setUserTypes(await typesRes.json());
      } else if (usersRes.status === 401 || clientsRes.status === 401 || typesRes.status === 401) {
        toast.error('Sessão expirada. Faça login novamente.');
        logout();
      }
    } catch (error) {
      toast.error('Erro ao carregar dados para agendamento.');
    } finally {
      setLoading(false);
    }
  };

  const visitableUserTypeIds = userTypes.filter(t => t.canVisit).map(t => t.id);
  const filteredUsers = users.filter(u => 
    visitableUserTypeIds.includes(Number(u.userTypeId)) || (u as any).canVisit
  );

  const allUFs = Array.from(new Set(clientes.map(c => c.uf))).sort();
  const citiesForUF = Array.from(new Set(clientes.filter(c => filterUF === 'all' || c.uf === filterUF).map(c => c.cidade))).sort();

  const filteredClientes = clientes.filter(c => {
    const matchesSearch = c.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.cidade.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUF = filterUF === 'all' || c.uf === filterUF;
    const matchesCity = filterCity === 'all' || c.cidade === filterCity;
    
    // Filtro por hierarquia do usuário selecionado
    let matchesUser = true;
    if (selectedUserId) {
      matchesUser = c.userId !== null && allowedUserIds.includes(c.userId);
    }

    return matchesSearch && matchesUF && matchesCity && matchesUser;
  });

  const toggleClient = (id: number) => {
    setSelectedClientIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    setLoadingCoords(true);
    setStartPoint('current');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLoadingCoords(false);
        toast.success('Localização capturada com sucesso!');
      },
      (error) => {
        setLoadingCoords(false);
        setStartPoint('base');
        console.error('Erro ao capturar localização:', error);
        switch(error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Permissão de localização negada pelo usuário.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Informações de localização indisponíveis.');
            break;
          case error.TIMEOUT:
            toast.error('Tempo esgotado ao tentar obter localização.');
            break;
          default:
            toast.error('Erro desconhecido ao obter localização.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCreateRoute = async () => {
    if (!selectedUserId || selectedClientIds.length === 0) {
      return toast.error('Selecione um representante e ao menos um cliente.');
    }

    try {
      setSubmitting(true);
      
      let lat = currentCoords?.lat;
      let lng = currentCoords?.lng;

      if (startPoint === 'current' && !lat) {
        if (navigator.geolocation) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
          } catch (e) {
            console.warn('Falha ao capturar localização no envio, enviando sem coordenadas de início.');
          }
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/visit-route/manual`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          supervisorId: selectedUserId,
          date: selectedDate,
          semana: selectedWeek || undefined,
          clientIds: selectedClientIds,
          startPoint,
          startLat: lat,
          startLng: lng
        })
      });

      if (response.ok) {
        toast.success('Roteiro criado com sucesso!', {
          description: 'A lista foi ordenada de forma inteligente pelo percurso mais curto.'
        });
        setSelectedClientIds([]);
        setSelectedUserId('');
        setSelectedWeek('');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao criar roteiro.');
      }
    } catch (error) {
      toast.error('Erro de conexão ao criar roteiro.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 w-full h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col xl:flex-row gap-6 p-4 md:p-6 w-full max-w-7xl mx-auto">
      {/* Coluna Principal: Clientes */}
      <div className="flex-1 space-y-6 min-w-0">
        <Card className="border border-border/40 shadow-xl overflow-hidden bg-card/40 backdrop-blur-xl rounded-2xl">
          <CardHeader className="pb-4 border-b border-border/20 bg-muted/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-base font-black uppercase tracking-wider flex items-center gap-2 text-foreground">
                  <MapPin className="w-4 h-4 text-primary" />
                  Agendamento de Visitas
                </CardTitle>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[9px] flex items-center justify-center font-black">1</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Filtrar Equipe</span>
                  </div>
                  <div className="hidden sm:block w-3 h-px bg-border/40" />
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[9px] flex items-center justify-center font-black">2</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Selecionar Clientes</span>
                  </div>
                  <div className="hidden sm:block w-3 h-px bg-border/40" />
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[9px] flex items-center justify-center font-black">3</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Definir Semana</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {/* Filtros Responsivos */}
            <div className="p-4 bg-muted/5 border-b border-border/20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Buscar cliente..." 
                  className="pl-9 h-10 text-xs bg-background/50 border-border/80 focus-visible:ring-1 focus-visible:ring-primary/50" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <select
                className="w-full h-10 px-3 bg-background/50 border border-border/80 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary/40 transition-colors hover:bg-background/80"
                value={filterUF}
                onChange={(e) => { setFilterUF(e.target.value); setFilterCity('all'); }}
              >
                <option value="all">Todos os Estados</option>
                {allUFs.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>

              <select
                className="w-full h-10 px-3 bg-background/50 border border-border/80 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary/40 transition-colors hover:bg-background/80"
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
              >
                <option value="all">Todas as Cidades</option>
                {citiesForUF.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>

              <Button 
                variant="ghost" 
                className="h-10 text-[9px] font-black uppercase tracking-widest gap-2 hover:bg-destructive/10 hover:text-destructive transition-all" 
                onClick={() => {setSearchTerm(''); setFilterUF('all'); setFilterCity('all');}}
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpar Filtros
              </Button>
            </div>

            {/* Tabela Responsiva */}
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead className="bg-muted/10 sticky top-0 z-10 border-b border-border/20">
                  <tr>
                    <th className="p-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-border/40 cursor-pointer text-primary focus:ring-primary/40"
                        checked={filteredClientes.length > 0 && filteredClientes.every(c => selectedClientIds.includes(c.id_cliente))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const newIds = [...selectedClientIds];
                            filteredClientes.forEach(c => {
                              if (!newIds.includes(c.id_cliente)) newIds.push(c.id_cliente);
                            });
                            setSelectedClientIds(newIds);
                          } else {
                            const filteredIds = filteredClientes.map(c => c.id_cliente);
                            setSelectedClientIds(selectedClientIds.filter(id => !filteredIds.includes(id)));
                          }
                        }}
                      />
                    </th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Cliente</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Bairro</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Cidade / UF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  {filteredClientes.map((client) => {
                    const isSelected = selectedClientIds.includes(client.id_cliente);
                    return (
                      <tr 
                        key={client.id_cliente} 
                        className={`hover:bg-primary/5 cursor-pointer transition-all duration-200 border-l-2 ${isSelected ? 'bg-primary/5 border-l-primary' : 'border-l-transparent'}`}
                        onClick={() => toggleClient(client.id_cliente)}
                      >
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={isSelected} 
                            onCheckedChange={() => toggleClient(client.id_cliente)}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all duration-200"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground transition-colors hover:text-primary">{client.nome_cliente}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider bg-secondary/50 px-2 py-0.5 rounded border border-border/30">
                            {client.bairro || 'Sem Bairro'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-foreground/80">{client.cidade}</span>
                            <span className="text-[10px] text-muted-foreground/60 font-black uppercase">{client.uf}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredClientes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-muted-foreground italic text-xs">
                        Nenhum cliente encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coluna Lateral: Configurações e Resumo */}
      <div className="w-full xl:w-96 flex flex-col gap-6 shrink-0">
        {/* Card de Configuração */}
        <Card className="border border-border/40 bg-card/40 backdrop-blur-xl shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/10 bg-muted/10">
            <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-foreground">
              <CalendarIcon className="w-4 h-4 text-primary" />
              Configurar Roteiro
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Representante</Label>
              <select 
                className="w-full h-10 px-3 bg-background/50 border border-border/85 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary/40 transition-colors hover:bg-background/85"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">Selecione o Representante</option>
                {filteredUsers.map(u => (
                  <option key={u.id} value={u.id.toString()}>{u.full_name || u.username}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Semana da Visita</Label>
              <select 
                className="w-full h-10 px-3 bg-background/50 border border-border/85 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary/40 transition-colors hover:bg-background/85"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
              >
                <option value="">Nenhuma / Sem Semana definida</option>
                <option value="Semana 1">Semana 1</option>
                <option value="Semana 2">Semana 2</option>
                <option value="Semana 3">Semana 3</option>
                <option value="Semana 4">Semana 4</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Data da Visita</Label>
                <Input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-10 text-xs bg-background/50 border-border/85 focus-visible:ring-1 focus-visible:ring-primary/50"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Ponto de Partida</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStartPoint('base')}
                    className={`flex items-center justify-center gap-2 h-10 rounded-md border text-[9px] font-black uppercase transition-all duration-200 ${
                      startPoint === 'base' 
                        ? 'bg-primary/10 border-primary text-primary shadow-sm' 
                        : 'bg-background/50 border-border text-muted-foreground hover:bg-secondary/70'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" /> Base
                  </button>
                  <button
                    type="button"
                    onClick={handleCaptureLocation}
                    disabled={loadingCoords}
                    className={`flex items-center justify-center gap-2 h-10 rounded-md border text-[9px] font-black uppercase transition-all duration-200 ${
                      startPoint === 'current' 
                        ? 'bg-primary/10 border-primary text-primary shadow-sm' 
                        : 'bg-background/50 border-border text-muted-foreground hover:bg-secondary/70'
                    }`}
                  >
                    {loadingCoords ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />} 
                    {loadingCoords ? 'Obtendo...' : 'Atual'}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/10">
              <Button 
                className="w-full h-11 gap-2 font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
                disabled={selectedClientIds.length === 0 || !selectedUserId || submitting}
                onClick={handleCreateRoute}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Gerar Roteiro Inteligente ({selectedClientIds.length})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resumo da Ordem de Visita ou Sugestões */}
        <div className="flex-1 flex flex-col min-h-[350px]">
          {selectedClientIds.length > 0 ? (
            <Card className="border border-primary/20 bg-primary/5 flex-1 overflow-hidden flex flex-col shadow-lg shadow-primary/5 rounded-2xl">
              <CardHeader className="p-4 border-b border-primary/10 bg-primary/[0.02] shrink-0">
                <CardTitle className="text-[10px] uppercase font-black tracking-widest flex items-center gap-2 text-primary">
                  <ArrowRight className="w-3.5 h-3.5" />
                  Ordem de Percurso Recomendada
                </CardTitle>
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter mt-1">
                  Os clientes serão ordenados do mais próximo ao mais distante.
                </p>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar max-h-[400px] xl:max-h-none">
                <div className="relative pl-7 pr-3 py-3 space-y-4">
                  {/* Linha vertical conectando os pontos */}
                  <div className="absolute left-[23px] top-6 bottom-8 w-0.5 border-l-2 border-dashed border-primary/30 z-0" />
                  
                  {selectedClientIds.map((id, index) => {
                    const client = clientes.find(c => c.id_cliente === id);
                    return (
                      <div key={id} className="relative z-10 flex items-center justify-between gap-3 group">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 shrink-0 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-black shadow-md shadow-primary/30">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase truncate group-hover:text-primary transition-colors text-foreground">{client?.nome_cliente}</p>
                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">{client?.cidade} - {client?.uf}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-destructive shrink-0 hover:bg-destructive/10 rounded-full"
                          onClick={() => toggleClient(id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-border/40 bg-card/40 backdrop-blur-xl flex-1 overflow-hidden flex flex-col shadow-xl rounded-2xl">
              <CardHeader className="p-4 border-b border-border/10 shrink-0 flex flex-row items-center justify-between bg-muted/10">
                <CardTitle className="text-[10px] uppercase font-black flex items-center gap-2 tracking-widest text-foreground">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" /> 
                  Sugestões Inteligentes
                </CardTitle>
                <div className="flex items-center gap-2">
                  {suggestions.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2.5 text-[8px] font-black uppercase tracking-tighter bg-primary/5 hover:bg-primary/10 text-primary rounded-full transition-all"
                      onClick={() => {
                        const ids = suggestions.map(s => s.id_cliente);
                        setSelectedClientIds(prev => Array.from(new Set([...prev, ...ids])));
                      }}
                    >
                      Adicionar Todas
                    </Button>
                  )}
                  {loadingSuggestions && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar max-h-[400px] xl:max-h-none">
                {!selectedUserId ? (
                  <div className="p-12 text-center opacity-50 flex flex-col items-center justify-center h-full min-h-[250px]">
                    <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mb-3 border border-border/20">
                      <UserIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-widest max-w-[170px] leading-relaxed text-muted-foreground">
                      Selecione um representante para carregar as melhores sugestões
                    </p>
                  </div>
                ) : suggestions.length === 0 && !loadingSuggestions ? (
                  <div className="p-12 text-center opacity-50 flex flex-col items-center justify-center h-full min-h-[250px]">
                    <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mb-3 border border-green-500/20">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Tudo em dia para este usuário!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/10">
                    {suggestions.map((s) => (
                      <div 
                        key={s.id_cliente} 
                        className="p-4 hover:bg-primary/5 cursor-pointer transition-all duration-200 border-l-2 border-l-transparent hover:border-l-primary"
                        onClick={() => toggleClient(s.id_cliente)}
                      >
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black uppercase truncate pr-1 group-hover:text-primary transition-colors text-foreground">
                              {s.nome_cliente}
                            </p>
                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">
                              {s.cidade} - {s.uf}
                            </p>
                          </div>
                          <div className="h-5 text-[8px] px-2 font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase shrink-0 rounded-full flex items-center">
                            {s.prioridade || 'Normal'}
                          </div>
                        </div>
                        <div className="flex items-center justify-between bg-muted/40 p-2 rounded-md border border-border/10 mt-2">
                          <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1">
                            <Bookmark className="w-3 h-3 text-primary/70" />
                            {s.reason}
                          </p>
                          <div className="flex items-center gap-1 text-primary">
                            <span className="text-[8px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity">Adicionar</span>
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
