/**
 * @file BaseClientePanel.tsx
 * @description Esse aqui é o formulário brabo onde a gente cadastra a clientela.
 * Tu joga o CEP lá, ele busca o básico (rua, bairro, cidade), mas o segredo da precisão 
 * tá em preencher o número certinho. Sem número, o mapa fica "perdido na curva".
 * 
 * Papo de visão: O CEP ajuda a não ter que digitar tudo, mas o mapa só se acha mesmo
 * quando a gente manda a Latitude e Longitude (que o servidor calcula sozinho baseado no endereço).
 * 
 * @author Cria de Nova Iguaçu
 */

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Database, Filter, Search, Plus, MapPin, Loader2, Briefcase, MoreVertical, Pencil, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AddressMapPicker } from './AddressMapPicker';
import { API_BASE_URL } from '@/lib/api-base';
import { useAuth } from '@/contexts/auth-context-core';

interface Cliente {
  id_cliente: number;
  codigo_cliente: string | null;
  nome_cliente: string;
  nome_abreviado: string | null;
  cnpj: string | null;
  regiao: string | null;
  uf: string | null;
  cidade: string | null;
  bairro: string | null;
  cep: string | null;
  endereco_completo: string | null;
  numero: string | null;
  latitude: number | null;
  longitude: number | null;
  userId: number | null;
  user?: {
    id: number;
    username: string;
    full_name: string | null;
  };
  semana: string | null;
  prioridade: string | null;
  status_ativo: boolean;
}

export function BaseClientePanel({ 
  onSwitchToReps, 
  canCreate = false, 
  isMobileFilterOpen = false,
  initialData = [],
  loading: externalLoading = false,
  onRefresh
}: { 
  onSwitchToReps?: () => void, 
  canCreate?: boolean, 
  isMobileFilterOpen?: boolean,
  initialData?: Cliente[],
  loading?: boolean,
  onRefresh?: () => Promise<void>
}) {
  const { role: currentUserRole, userId: currentUserId } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>(initialData);
  const [internalLoading, setInternalLoading] = useState(initialData.length === 0);
  const loading = externalLoading || internalLoading;

  // Sincronizar com dados externos se fornecidos
  useEffect(() => {
    if (initialData.length > 0) {
      setClientes(initialData);
      setInternalLoading(false);
    }
  }, [initialData]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);

  const [filterUF, setFilterUF] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');

  const API_URL = `${API_BASE_URL}/api/clientes`;

  const [formData, setFormData] = useState({
    codigo_cliente: '',
    nome_cliente: '',
    nome_abreviado: '',
    cnpj: '',
    cep: '',
    endereco_completo: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: '',
    regiao: '',
    latitude: null as number | null,
    longitude: null as number | null,
    userId: '' as string | number,
    semana: '',
    prioridade: ''
  });
  const [systemUsers, setSystemUsers] = useState<{ id: number, username: string, full_name: string | null }[]>([]);
  const [fetchingCep, setFetchingCep] = useState(false);
  const [bairrosLocais, setBairrosLocais] = useState<string[]>([]);

  useEffect(() => {
    if (formData.cidade && formData.uf) {
      const fetchBairros = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/location/bairros/${encodeURIComponent(formData.cidade)}/${encodeURIComponent(formData.uf)}`);
          if (res.ok) {
            const data = await res.json();
            setBairrosLocais(data.map((b: { id: number, bairro: string }) => b.bairro));
          }
        } catch (e) {
          console.error('Erro ao buscar bairros locais', e);
        }
      };
      fetchBairros();
    } else {
      setBairrosLocais([]);
    }
  }, [formData.cidade, formData.uf]);

  const formatCNPJ = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 14) v = v.substring(0, 14);
    v = v.replace(/^(\d{2})(\d)/, '$1.$2');
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
    v = v.replace(/(\d{4})(\d)/, '$1-$2');
    return v;
  };

  const formatCEP = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 8) v = v.substring(0, 8);
    v = v.replace(/^(\d{5})(\d)/, '$1-$2');
    return v;
  };

  const fetchCepData = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    
    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco_completo: data.logradouro + (data.complemento ? `, ${data.complemento}` : ''),
          bairro: data.bairro,
          cidade: data.localidade,
          uf: data.uf,
        }));
        toast.success('Endereço preenchido via CEP! Agora bote o número pra gente achar no mapa.');
      } else {
        toast.error('CEP não encontrado.');
      }
    } catch (e) {
      toast.error('Erro ao buscar o CEP.');
    } finally {
      setFetchingCep(false);
    }
  };

  /**
   * handleGeocode - Aqui é onde a gente pergunta pro servidor "onde fica esse lugar?".
   * Ele usa o endereço e o número pra tentar achar o ponto exato no globo.
   */
  const handleGeocode = async () => {
    const { endereco_completo, numero, bairro, cidade, uf } = formData;
    
    // Se não tiver o básico do básico, nem tenta que é perda de tempo.
    if (!endereco_completo || !cidade || !uf) {
      toast.info('Preencha o endereço, cidade e UF primeiro, mestre!');
      return;
    }

    setFetchingCep(true);
    try {
      const searchAddress = `${endereco_completo}${numero ? ', ' + numero : ''}${bairro ? ', ' + bairro : ''}, ${cidade}, ${uf}, Brasil`;
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/geocode?address=${encodeURIComponent(searchAddress)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const coords = await res.json();
        setFormData(prev => ({ ...prev, latitude: coords.lat, longitude: coords.lng }));
        toast.success('Ponto achado com sucesso! Confere aí no mapa.');
      } else {
        toast.error('Não achei esse endereço exato não... tenta ajustar o pino no mapa na mão.');
      }
    } catch (e) {
      toast.error('O GPS deu tela azul. Tenta de novo!');
    } finally {
      setFetchingCep(false);
    }
  };

  const fetchClientes = async () => {
    try {
      setInternalLoading(true);
      const token = localStorage.getItem('token');
      const tokenVersion = localStorage.getItem('tokenVersion') || '0';
      const res = await fetch(API_URL, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-token-version': tokenVersion
        }
      });
      if (!res.ok) throw new Error('Falha ao buscar clientes');
      const data = await res.json();
      setClientes(data);
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível carregar a lista de clientes.');
    } finally {
      setInternalLoading(false);
    }
  };

  const fetchSystemUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const tokenVersion = localStorage.getItem('tokenVersion') || '0';
      const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-user-token-version': tokenVersion
        }
      });
      if (res.ok) setSystemUsers(await res.json());
    } catch (e) { console.error('Erro ao buscar usuários', e); }
  };

  const handleRefresh = async () => {
    if (onRefresh) await onRefresh();
    else await fetchClientes();
  };

  useEffect(() => {
    if (initialData.length === 0) {
      fetchClientes();
    }
    fetchSystemUsers();
  }, []);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    let { value } = e.target;
    if (name === 'cnpj') value = formatCNPJ(value);
    if (name === 'cep') value = formatCEP(value);
    setFormData({ ...formData, [name]: value });
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome_cliente) {
      toast.error('O nome do cliente é obrigatório.');
      return;
    }
    
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const tokenVersion = localStorage.getItem('tokenVersion') || '0';
      const url = editingClientId ? `${API_URL}/${editingClientId}` : API_URL;

      const res = await fetch(url, {
        method: editingClientId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-token-version': tokenVersion
        },
        body: JSON.stringify({
          ...formData,
          userId: currentUserRole === 'admin' ? (formData.userId || null) : currentUserId
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Erro ao cadastrar/atualizar cliente');
      }

      toast.success(editingClientId ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!');
      setIsDialogOpen(false);
      setEditingClientId(null);
      setFormData({
        codigo_cliente: '', nome_cliente: '', nome_abreviado: '', cnpj: '',
        cep: '', endereco_completo: '', numero: '', bairro: '', cidade: '', uf: '', regiao: '',
        latitude: null, longitude: null,
        userId: '', semana: '', prioridade: ''
      });
      fetchClientes();
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Ocorreu um erro ao salvar o cliente.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClient = (client: Cliente) => {
    setEditingClientId(client.id_cliente);
    setFormData({
      codigo_cliente: client.codigo_cliente || '',
      nome_cliente: client.nome_cliente || '',
      nome_abreviado: client.nome_abreviado || '',
      cnpj: client.cnpj || '',
      cep: client.cep || '',
      endereco_completo: client.endereco_completo || '',
      numero: client.numero || '',
      bairro: client.bairro || '',
      cidade: client.cidade || '',
      uf: client.uf || '',
      regiao: client.regiao || '',
      latitude: client.latitude || null,
      longitude: client.longitude || null,
      userId: client.userId || '',
      semana: client.semana || '',
      prioridade: client.prioridade || ''
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClient = async (id: number, name: string) => {
    if (!window.confirm(`Tem certeza que deseja apagar o cliente "${name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      setInternalLoading(true);
      const token = localStorage.getItem('token');
      const tokenVersion = localStorage.getItem('tokenVersion') || '0';
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-user-token-version': tokenVersion
        }
      });
      if (!res.ok) throw new Error('Erro ao apagar cliente');
      toast.success('Cliente apagado com sucesso!');
      fetchClientes();
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Erro ao apagar.';
      toast.error(message);
      setInternalLoading(false);
    }
  };

  const filteredClientes = clientes.filter(c => {
    if (filterStatus === 'Ativos' && !c.status_ativo) return false;
    if (filterStatus === 'Inativos' && c.status_ativo) return false;
    if (filterUF && filterUF !== 'all' && c.uf !== filterUF) return false;
    if (filterUser && filterUser !== 'all' && c.userId?.toString() !== filterUser) return false;
    const q = searchTerm.toLowerCase();
    if (q) return (
      c.nome_cliente?.toLowerCase().includes(q) || 
      c.cnpj?.includes(q) ||
      c.codigo_cliente?.toLowerCase().includes(q) ||
      c.cidade?.toLowerCase().includes(q) ||
      c.nome_abreviado?.toLowerCase().includes(q)
    );
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Base Cliente</h2>
          <p className="text-sm text-muted-foreground">Gerencie sua carteira de clientes, pesquise pela base e cadastre manualmente.</p>
        </div>
        <div className="flex w-full sm:w-auto gap-2">
          {canCreate && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-none gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="w-4 h-4" /> Cadastrar Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    {editingClientId ? <Pencil className="w-5 h-5 text-primary" /> : <Database className="w-5 h-5 text-primary" />}
                    {editingClientId ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    {editingClientId ? `Atualizando informações do cliente.` : 'Preencha os dados para registrar um novo cliente na base.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveClient} className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="codigo_cliente">Código do Cliente (Matriz)</Label>
                      <Input id="codigo_cliente" name="codigo_cliente" value={formData.codigo_cliente} onChange={handleInputChange} placeholder="Ex: CLI-1020" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nome_cliente">Nome do Cliente (Razão Social) *</Label>
                      <Input id="nome_cliente" name="nome_cliente" value={formData.nome_cliente} onChange={handleInputChange} placeholder="Nome completo" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nome_abreviado">Nome Abreviado (Fantasia)</Label>
                      <Input id="nome_abreviado" name="nome_abreviado" value={formData.nome_abreviado} onChange={handleInputChange} placeholder="Nome fantasia" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input id="cnpj" name="cnpj" value={formData.cnpj} onChange={handleInputChange} placeholder="00.000.000/0000-00" />
                    </div>
                    <div className="sm:col-span-2 mt-2 border-t pt-4">
                      <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
                        <MapPin className="w-4 h-4" /> Dados de Localização e Endereço
                      </div>
                    </div>
                    <div className="space-y-2 relative">
                      <Label htmlFor="cep">CEP</Label>
                      <div className="relative">
                        <Input id="cep" name="cep" value={formData.cep} onChange={handleInputChange} onBlur={() => fetchCepData(formData.cep)} placeholder="00000-000" />
                        {fetchingCep && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-muted-foreground" />}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endereco_completo">Logradouro (Rua/Av)</Label>
                      <Input id="endereco_completo" name="endereco_completo" value={formData.endereco_completo} onChange={handleInputChange} placeholder="Ex: Rua das Flores" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numero">Número</Label>
                      <Input id="numero" name="numero" value={formData.numero} onChange={handleInputChange} placeholder="Ex: 123 ou S/N" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bairro">Bairro</Label>
                      <Input 
                        id="bairro" 
                        name="bairro" 
                        value={formData.bairro} 
                        onChange={handleInputChange} 
                        placeholder="Nome do Bairro" 
                        list="bairros-list"
                      />
                      <datalist id="bairros-list">
                        {bairrosLocais.map(b => (
                          <option key={b} value={b} />
                        ))}
                      </datalist>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input id="cidade" name="cidade" value={formData.cidade} onChange={handleInputChange} placeholder="Nome da Cidade" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="uf">UF</Label>
                      <Input id="uf" name="uf" value={formData.uf} onChange={handleInputChange} placeholder="Ex: SP" maxLength={2} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="regiao">Região</Label>
                      <Input id="regiao" name="regiao" value={formData.regiao} onChange={handleInputChange} placeholder="Ex: SUL, NORTE" />
                    </div>

                    <div className="sm:col-span-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" /> Visualização no Mapa (Mó Precisão)
                        </Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={handleGeocode}
                          className="h-8 text-[10px] gap-2 font-bold"
                          disabled={fetchingCep}
                        >
                          {fetchingCep ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                          BUSCAR NO MAPA
                        </Button>
                      </div>
                      
                      <AddressMapPicker 
                        lat={formData.latitude} 
                        lng={formData.longitude} 
                        onChange={(lat, lng) => setFormData(p => ({ ...p, latitude: lat, longitude: lng }))}
                      />
                      <p className="text-[10px] text-muted-foreground italic">
                        * Se o pino tiver no lugar errado, é só tocar no mapa pra ajustar.
                      </p>
                    </div>

                    <div className="sm:col-span-2 mt-2 border-t pt-4">
                      <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
                        <Briefcase className="w-4 h-4" /> Vínculo
                      </div>
                    </div>

                    {currentUserRole === 'admin' && (
                      <div className="space-y-2">
                        <Label htmlFor="userId">Usuário Responsável</Label>
                        <div className="flex gap-2">
                          <select id="userId" name="userId" value={formData.userId} onChange={handleSelectChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                            <option value="">— Selecione —</option>
                            {systemUsers.map(u => <option key={u.id} value={u.id}>{u.full_name || u.username}</option>)}
                          </select>
                        </div>
                      </div>
                    )}


                  </div>
                  <div className="flex justify-end pt-4 mt-6 border-t gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Salvar Cadastro'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      
      <Card className="border-border/40 shadow-xl overflow-hidden bg-card/30 backdrop-blur-md">
        <CardHeader className={`pb-4 border-b border-border/40 bg-muted/20 space-y-4 ${!isMobileFilterOpen ? 'hidden lg:block' : 'block animate-in slide-in-from-top-4 duration-300'}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                Base de Clientes
              </CardTitle>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                Total de {clientes.length} registros encontrados
              </p>
            </div>
            
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome, código ou CNPJ..." 
                className="pl-9 h-10 w-full text-sm bg-background/50 border-border/40 focus:ring-primary/20 transition-all shadow-inner" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center bg-background/50 border border-border/40 p-1 rounded-lg shadow-sm">
              {(['Todos', 'Ativos', 'Inativos'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`h-8 px-4 text-[10px] font-black uppercase tracking-tighter rounded-md transition-all ${
                    filterStatus === f 
                    ? 'bg-primary text-primary-foreground shadow-lg scale-105' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="h-8 w-px bg-border/40 mx-1 hidden sm:block" />

            <div className="flex flex-wrap items-center gap-2 flex-1">
              <Select value={filterUF} onValueChange={setFilterUF}>
                <SelectTrigger className="h-9 w-[110px] text-[10px] font-bold uppercase bg-background/50 border-border/40">
                  <SelectValue placeholder="Todas UFs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as UFs</SelectItem>
                  {[...new Set(clientes.map(c => c.uf).filter(Boolean))].sort().map(uf => (
                    <SelectItem key={uf} value={uf || 'empty'}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {currentUserRole === 'admin' && ( 
                <Select value={filterUser} onValueChange={setFilterUser}>
                  <SelectTrigger className="h-9 w-[160px] text-[10px] font-bold uppercase bg-background/50 border-border/40">
                    <SelectValue placeholder="Todos Usuários" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Usuários</SelectItem>
                    {systemUsers.map(u => (
                      <SelectItem key={u.id} value={u.id.toString()}>{u.full_name || u.username}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {(searchTerm || (filterStatus !== 'Todos') || (filterUF && filterUF !== 'all') || (filterUser && filterUser !== 'all')) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-9 px-3 text-[10px] font-bold uppercase gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors" 
                  onClick={() => { setSearchTerm(''); setFilterStatus('Todos'); setFilterUF('all'); setFilterUser('all'); }}
                >
                  <X className="w-3" />
                  Limpar
                </Button>
              )}
            </div>
            
            <div className="ml-auto hidden xl:block">
              <span className="text-[10px] font-bold text-muted-foreground bg-muted/40 px-2 py-1 rounded-full border border-border/20">
                {filteredClientes.length} resultados
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary/50" />
              <p className="text-sm font-medium animate-pulse">Carregando base de clientes...</p>
            </div>
          ) : clientes.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium">Nenhum cliente cadastrado na base.</p>
              <p className="text-xs mt-1">Sincronize ou clique em "Cadastrar Cliente" para adicionar.</p>
            </div>
          ) : (
            <div className="overflow-auto custom-scrollbar">
              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader className="bg-card sticky top-0 z-10 font-semibold border-b border-border/20 shadow-sm">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="whitespace-nowrap h-10 w-[100px]">Cod.</TableHead>
                      <TableHead className="whitespace-nowrap h-10 min-w-[250px]">Razão Social / Fantasia</TableHead>
                      <TableHead className="whitespace-nowrap h-10">CNPJ</TableHead>
                      <TableHead className="whitespace-nowrap h-10">Cidade / UF</TableHead>
                      {currentUserRole === 'admin' && <TableHead className="whitespace-nowrap h-10">Usuário Responsável</TableHead>}
                      <TableHead className="whitespace-nowrap h-10 text-center">Status</TableHead>
                      <TableHead className="whitespace-nowrap h-10 text-right pr-4">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClientes.slice(0, 100).map((row, idx) => (
                      <TableRow key={row.id_cliente || idx} className="hover:bg-secondary/20 transition-colors">
                          <TableCell className="font-medium text-xs py-2">{row.codigo_cliente || '-'}</TableCell>
                          <TableCell className="py-2">
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm text-foreground/90">{row.nome_cliente}</span>
                              {row.nome_abreviado && <span className="text-xs text-muted-foreground">{row.nome_abreviado}</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap">{row.cnpj || '-'}</TableCell>
                          <TableCell className="text-xs py-2">
                            <div className="flex flex-col">
                              <span className="text-foreground/80">{row.cidade || '-'}</span>
                              <span className="text-muted-foreground">{row.uf}</span>
                            </div>
                          </TableCell>
                          {currentUserRole === 'admin' && (
                            <TableCell className="text-xs py-2">
                              <span className="font-semibold">{row.user?.full_name || row.user?.username || 'Não vinculado'}</span>
                            </TableCell>
                          )}
                          <TableCell className="text-xs py-2 text-center">
                            {row.status_ativo ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive border border-destructive/20">
                                Inativo
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-2 text-right pr-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-secondary/80">
                                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClient(row)} className="gap-2 cursor-pointer font-medium text-xs">
                                  <Pencil className="w-3.5 h-3.5" /> Editar Cliente
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteClient(row.id_cliente, row.nome_cliente)} className="gap-2 cursor-pointer text-destructive focus:text-destructive font-medium text-xs">
                                  <Trash2 className="w-3.5 h-3.5" /> Apagar Cliente
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden divide-y divide-border/40">
                {filteredClientes.slice(0, 100).map((row, idx) => (
                  <div 
                    key={row.id_cliente || idx} 
                    className="p-4 active:bg-secondary/20 transition-colors flex items-center justify-between gap-4"
                    onClick={() => { setSelectedClient(row); setIsDetailOpen(true); }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          {row.codigo_cliente || 'S/ COD'}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium">{row.uf}</span>
                      </div>
                      <h4 className="text-sm font-bold text-foreground truncate">{row.nome_cliente}</h4>
                      <p className="text-xs text-muted-foreground truncate">{row.nome_abreviado || row.cidade || 'Sem mais info'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${row.status_ativo ? 'bg-emerald-500' : 'bg-destructive'}`} />
                      <MoreVertical className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                  </div>
                ))}
              </div>

              {filteredClientes.length > 100 && (
                <div className="text-center py-4 text-xs text-muted-foreground bg-muted/20">
                  Mostrando as 100 primeiras linhas de {filteredClientes.length} registros. Use a busca para filtrar.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Detail Dialog (Mobile) */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {selectedClient && (
            <>
              <DialogHeader className="p-6 bg-secondary/30 border-b border-border/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded uppercase tracking-widest">
                    {selectedClient.codigo_cliente || 'SEM CÓDIGO'}
                  </span>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${selectedClient.status_ativo ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${selectedClient.status_ativo ? 'bg-emerald-500' : 'bg-destructive'}`} />
                    {selectedClient.status_ativo ? 'ATIVO' : 'INATIVO'}
                  </div>
                </div>
                <DialogTitle className="text-xl font-black leading-tight">{selectedClient.nome_cliente}</DialogTitle>
                <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
                  {selectedClient.nome_abreviado || 'Razão Social'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">CNPJ</p>
                    <p className="text-sm font-medium">{selectedClient.cnpj || 'Não informado'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Região</p>
                    <p className="text-sm font-medium">{selectedClient.regiao || 'Não informado'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest">Localização</span>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Endereço</p>
                      <p className="text-sm font-medium">
                        {selectedClient.endereco_completo}{selectedClient.numero ? `, ${selectedClient.numero}` : ''}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Bairro</p>
                        <p className="text-sm font-medium">{selectedClient.bairro || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Cidade/UF</p>
                        <p className="text-sm font-medium">{selectedClient.cidade} / {selectedClient.uf}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">CEP</p>
                        <p className="text-sm font-medium">{selectedClient.cep || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {currentUserRole === 'admin' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                      <Briefcase className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-widest">Responsável</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {selectedClient.user?.full_name || selectedClient.user?.username || 'Não vinculado'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-secondary/20 border-t border-border/40 flex gap-2">
                <Button 
                  className="flex-1 gap-2 font-bold text-xs h-10" 
                  onClick={() => { setIsDetailOpen(false); handleEditClient(selectedClient); }}
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar Cliente
                </Button>
                <Button 
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 text-destructive hover:bg-destructive/10"
                  onClick={() => { setIsDetailOpen(false); handleDeleteClient(selectedClient.id_cliente, selectedClient.nome_cliente); }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
