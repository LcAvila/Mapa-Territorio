import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar as CalendarIcon, 
  Users, 
  Search, 
  Plus, 
  MapPin, 
  Loader2, 
  CheckCircle2, 
  ArrowRight,
  User as UserIcon,
  Trash2,
  Filter,
  Sparkles,
  Home,
  Navigation
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
}

interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
  userTypeId?: number | string;
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
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUF, setFilterUF] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [startPoint, setStartPoint] = useState<'base' | 'current'>('base');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchSuggestions(selectedUserId);
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
    return matchesSearch && matchesUF && matchesCity;
  });

  const toggleClient = (id: number) => {
    setSelectedClientIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCreateRoute = async () => {
    if (!selectedUserId || selectedClientIds.length === 0) {
      return toast.error('Selecione um representante e ao menos um cliente.');
    }

    try {
      setSubmitting(true);
      
      let lat, lng;
      if (startPoint === 'current' && navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
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
          clientIds: selectedClientIds,
          startPoint,
          startLat: lat,
          startLng: lng
        })
      });

      if (response.ok) {
        toast.success('Roteiro criado com sucesso!');
        setSelectedClientIds([]);
        setSelectedUserId('');
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
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-6 animate-in fade-in duration-500">
      <div className="flex-1 space-y-6 min-w-0">
        <Card className="border-border/40 shadow-xl overflow-hidden bg-card/30 backdrop-blur-md">
          <CardHeader className="pb-4 border-b border-border/40 bg-muted/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Agendamento de Visitas
                </CardTitle>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                  Selecione os clientes para montar o roteiro do representante
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4 bg-muted/10 border-b border-border/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar cliente..." 
                  className="pl-9 h-10 text-xs bg-background/50" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <select
                className="h-10 px-3 bg-background/50 border border-border rounded-md text-xs outline-none focus:ring-1 focus:ring-primary/40"
                value={filterUF}
                onChange={(e) => { setFilterUF(e.target.value); setFilterCity('all'); }}
              >
                <option value="all">Todos os Estados</option>
                {allUFs.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>

              <select
                className="h-10 px-3 bg-background/50 border border-border rounded-md text-xs outline-none focus:ring-1 focus:ring-primary/40"
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
              >
                <option value="all">Todas as Cidades</option>
                {citiesForUF.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>

              <Button variant="ghost" className="h-10 text-[10px] font-black uppercase tracking-widest gap-2" onClick={() => {setSearchTerm(''); setFilterUF('all'); setFilterCity('all');}}>
                <Trash2 className="w-3 h-3" /> Limpar
              </Button>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-card sticky top-0 z-10 border-b border-border/20 shadow-sm">
                  <tr>
                    <th className="p-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-border/40"
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
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/10">Cliente</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/10">Localização</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  {filteredClientes.map((client) => (
                    <tr 
                      key={client.id_cliente} 
                      className={`hover:bg-primary/5 cursor-pointer transition-colors ${selectedClientIds.includes(client.id_cliente) ? 'bg-primary/5' : ''}`}
                      onClick={() => toggleClient(client.id_cliente)}
                    >
                      <td className="p-4 text-center">
                        <Checkbox 
                          checked={selectedClientIds.includes(client.id_cliente)} 
                          onCheckedChange={() => toggleClient(client.id_cliente)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground">{client.nome_cliente}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{client.bairro}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-foreground/80">{client.cidade}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{client.uf}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredClientes.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-12 text-center text-muted-foreground italic text-xs">
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

      <div className="w-full lg:w-96 flex flex-col gap-4 shrink-0">
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-xl shrink-0">
          <CardHeader className="pb-3 border-b border-border/10">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" />
              Configurar Roteiro
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Representante</Label>
              <select 
                className="w-full h-10 px-3 bg-background/50 border border-border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary/40"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">Selecionar...</option>
                {filteredUsers.map(u => (
                  <option key={u.id} value={u.id.toString()}>{u.full_name || u.username}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Data da Visita</Label>
                <Input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Ponto de Partida</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStartPoint('base')}
                    className={`flex items-center justify-center gap-2 h-10 rounded-md border text-[10px] font-bold uppercase transition-all ${
                      startPoint === 'base' 
                        ? 'bg-primary/10 border-primary text-primary' 
                        : 'bg-background border-border text-muted-foreground hover:bg-secondary/50'
                    }`}
                  >
                    <Home className="w-3 h-3" /> Base
                  </button>
                  <button
                    type="button"
                    onClick={() => setStartPoint('current')}
                    className={`flex items-center justify-center gap-2 h-10 rounded-md border text-[10px] font-bold uppercase transition-all ${
                      startPoint === 'current' 
                        ? 'bg-primary/10 border-primary text-primary' 
                        : 'bg-background border-border text-muted-foreground hover:bg-secondary/50'
                    }`}
                  >
                    <Navigation className="w-3 h-3" /> Atual
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/10">
              <Button 
                className="w-full h-11 gap-2 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20"
                disabled={selectedClientIds.length === 0 || !selectedUserId || submitting}
                onClick={handleCreateRoute}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Gerar Roteiro ({selectedClientIds.length})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Selection List Summary */}
        <div className="flex-1 min-h-[400px] flex flex-col">
          {selectedClientIds.length > 0 ? (
            <Card className="border-primary/20 bg-primary/5 animate-in zoom-in-95 duration-300 flex-1 overflow-hidden flex flex-col shadow-lg shadow-primary/5">
              <CardHeader className="p-3 border-b border-primary/10 shrink-0">
                <CardTitle className="text-[10px] uppercase font-black flex items-center gap-2">
                  <ArrowRight className="w-3 h-3" />
                  Ordem das Visitas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar">
                <div className="divide-y divide-primary/10">
                  {selectedClientIds.map((id, index) => {
                    const client = clientes.find(c => c.id_cliente === id);
                    return (
                      <div key={id} className="p-3 flex items-center justify-between gap-3 hover:bg-primary/5 transition-colors group">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 shrink-0 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-black">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase truncate group-hover:text-primary transition-colors">{client?.nome_cliente}</p>
                            <p className="text-[9px] text-muted-foreground font-bold uppercase">{client?.cidade} - {client?.uf}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-destructive shrink-0 hover:bg-destructive/10"
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
            <Card className="border-border/40 bg-card/30 backdrop-blur-sm flex-1 overflow-hidden flex flex-col shadow-xl">
              <CardHeader className="p-4 border-b border-border/10 shrink-0 flex flex-row items-center justify-between bg-muted/20">
                <CardTitle className="text-[10px] uppercase font-black flex items-center gap-2 tracking-widest">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" /> 
                  Sugestão de Visita
                </CardTitle>
                <div className="flex items-center gap-2">
                  {suggestions.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2.5 text-[9px] font-black uppercase tracking-tighter bg-primary/5 hover:bg-primary/10 text-primary"
                      onClick={() => {
                        const ids = suggestions.map(s => s.id_cliente);
                        setSelectedClientIds(prev => Array.from(new Set([...prev, ...ids])));
                      }}
                    >
                      Selecionar Tudo
                    </Button>
                  )}
                  {loadingSuggestions && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar">
                {!selectedUserId ? (
                  <div className="p-12 text-center opacity-40 flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <UserIcon className="w-8 h-8" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest max-w-[150px] leading-relaxed">Selecione um representante para ver sugestões</p>
                  </div>
                ) : suggestions.length === 0 && !loadingSuggestions ? (
                  <div className="p-12 text-center opacity-40 flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Tudo em dia!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/10">
                    {suggestions.map((s) => (
                      <div 
                        key={s.id_cliente} 
                        className="p-4 hover:bg-primary/5 cursor-pointer transition-all group border-l-2 border-l-transparent hover:border-l-primary"
                        onClick={() => toggleClient(s.id_cliente)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-black uppercase truncate pr-2 group-hover:text-primary transition-colors">
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
                        <div className="flex items-center justify-between bg-muted/30 p-2 rounded-md border border-border/10">
                          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-tighter">
                            {s.reason}
                          </p>
                          <div className="flex items-center gap-1.5 text-primary">
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
