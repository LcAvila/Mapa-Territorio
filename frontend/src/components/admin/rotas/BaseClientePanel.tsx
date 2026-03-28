import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Database, Filter, Search, Plus, MapPin, Loader2, Briefcase, MoreVertical, Pencil, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

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
  repCode: string | null;
  supervisorName: string | null;
  classificacao: string | null;
  semana: string | null;
  prioridade: string | null;
  status_ativo: boolean;
}

export function BaseClientePanel({ onSwitchToReps }: { onSwitchToReps?: () => void }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);

  const [filterUF, setFilterUF] = useState('');
  const [filterRep, setFilterRep] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');

  const API_URL = 'http://localhost:3001/api/clientes';

  const [formData, setFormData] = useState({
    codigo_cliente: '',
    nome_cliente: '',
    nome_abreviado: '',
    cnpj: '',
    cep: '',
    endereco_completo: '',
    bairro: '',
    cidade: '',
    uf: '',
    regiao: '',
    repCode: '',
    supervisorName: '',
    classificacao: '',
    semana: '',
    prioridade: ''
  });
  const [reps, setReps] = useState<{ code: string, name: string }[]>([]);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(API_URL, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Falha ao buscar clientes');
      const data = await res.json();
      setClientes(data);
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível carregar a lista de clientes.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReps = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/admin/reps', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setReps(await res.json());
    } catch (e) { console.error('Erro ao buscar representantes', e); }
  };

  useEffect(() => {
    fetchClientes();
    fetchReps();
  }, []);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      const method = editingClientId ? 'PUT' : 'POST';
      const url = editingClientId ? `${API_URL}/${editingClientId}` : API_URL;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
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
        cep: '', endereco_completo: '', bairro: '', cidade: '', uf: '', regiao: '',
        repCode: '', supervisorName: '', classificacao: '', semana: '', prioridade: ''
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
      bairro: client.bairro || '',
      cidade: client.cidade || '',
      uf: client.uf || '',
      regiao: client.regiao || '',
      repCode: client.repCode || '',
      supervisorName: client.supervisorName || '',
      classificacao: client.classificacao || '',
      semana: client.semana || '',
      prioridade: client.prioridade || ''
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClient = async (id: number, name: string) => {
    if (!window.confirm(`Tem certeza que deseja apagar o cliente "${name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao apagar cliente');
      toast.success('Cliente apagado com sucesso!');
      fetchClientes();
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Erro ao apagar.';
      toast.error(message);
      setLoading(false);
    }
  };

  const filteredClientes = clientes.filter(c => {
    if (filterStatus === 'Ativos' && !c.status_ativo) return false;
    if (filterStatus === 'Inativos' && c.status_ativo) return false;
    if (filterUF && c.uf !== filterUF) return false;
    if (filterRep && c.repCode !== filterRep) return false;
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Base Cliente</h2>
          <p className="text-sm text-muted-foreground">Gerencie sua carteira de clientes, pesquise pela base e cadastre manualmente.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4" /> Cadastrar Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <div className="grid grid-cols-2 gap-4">
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
                  <div className="col-span-2 mt-2 border-t pt-4">
                    <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
                      <MapPin className="w-4 h-4" /> Dados de Localização e Endereço
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP</Label>
                    <Input id="cep" name="cep" value={formData.cep} onChange={handleInputChange} placeholder="00000-000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endereco_completo">Endereço Completo</Label>
                    <Input id="endereco_completo" name="endereco_completo" value={formData.endereco_completo} onChange={handleInputChange} placeholder="Rua, número, complemento" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input id="bairro" name="bairro" value={formData.bairro} onChange={handleInputChange} placeholder="Nome do Bairro" />
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

                  <div className="col-span-2 mt-2 border-t pt-4">
                    <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
                      <Briefcase className="w-4 h-4" /> Vínculos e Classificação
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="repCode">Representante</Label>
                    <div className="flex gap-2">
                      <select id="repCode" name="repCode" value={formData.repCode} onChange={handleSelectChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                        <option value="">— Selecione —</option>
                        {reps.map(r => <option key={r.code} value={r.code}>{r.code} — {r.name}</option>)}
                      </select>
                      {onSwitchToReps && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon" 
                          className="shrink-0" 
                          title="Cadastrar novo representante"
                          onClick={onSwitchToReps}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supervisorName">Supervisor</Label>
                    <Input id="supervisorName" name="supervisorName" value={formData.supervisorName} onChange={handleInputChange} placeholder="Nome do supervisor" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="classificacao">Classificação</Label>
                    <select id="classificacao" name="classificacao" value={formData.classificacao} onChange={handleSelectChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="">— Selecione —</option>
                      <option value="Estratégico">Estratégico</option>
                      <option value="Forte">Forte</option>
                      <option value="Médio">Médio</option>
                      <option value="Pontual">Pontual</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="semana">Semana de Visita</Label>
                    <select id="semana" name="semana" value={formData.semana} onChange={handleSelectChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="">— Selecione —</option>
                      <option value="Semana 1">Semana 1</option>
                      <option value="Semana 2">Semana 2</option>
                      <option value="Semana 3">Semana 3</option>
                      <option value="Semana 4">Semana 4</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prioridade">Prioridade</Label>
                    <select id="prioridade" name="prioridade" value={formData.prioridade} onChange={handleSelectChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="">— Selecione —</option>
                      <option value="Alta">Alta</option>
                      <option value="Média">Média</option>
                      <option value="Baixa">Baixa</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end pt-4 mt-6 border-t">
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Salvar Cadastro'}
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40 bg-card/50 space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Lista de Clientes ({filteredClientes.length} / {clientes.length})</CardTitle>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome, código ou CNPJ..." 
                className="pl-9 h-9 w-full text-sm bg-background/50 focus:bg-background transition-colors" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              {(['Todos', 'Ativos', 'Inativos'] as const).map(f => (
                <Button
                  key={f}
                  variant={filterStatus === f ? 'default' : 'outline'}
                  size="sm"
                  className="h-9 text-xs font-semibold"
                  onClick={() => setFilterStatus(f)}
                >
                  {f}
                </Button>
              ))}
              <select
                value={filterUF}
                onChange={e => setFilterUF(e.target.value)}
                className="h-9 px-3 rounded-md text-xs border border-input bg-background/50 text-foreground"
              >
                <option value="">Todos UF</option>
                {[...new Set(clientes.map(c => c.uf).filter(Boolean))].sort().map(uf => (
                  <option key={uf} value={uf!}>{uf}</option>
                ))}
              </select>
              <select
                value={filterRep}
                onChange={e => setFilterRep(e.target.value)}
                className="h-9 px-3 rounded-md text-xs border border-input bg-background/50 text-foreground max-w-[150px]"
              >
                <option value="">Todos Reps</option>
                {reps.map(r => (
                  <option key={r.code} value={r.code}>{r.code}</option>
                ))}
              </select>
              {(searchTerm || filterStatus !== 'Todos' || filterUF || filterRep) && (
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => { setSearchTerm(''); setFilterStatus('Todos'); setFilterUF(''); setFilterRep(''); }}>
                  <X className="w-4 h-4" />
                </Button>
              )}
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
            <div className="overflow-auto max-h-[calc(100vh-280px)]">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10 font-semibold backdrop-blur-sm">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="whitespace-nowrap h-10 w-[100px]">Cod.</TableHead>
                    <TableHead className="whitespace-nowrap h-10 min-w-[250px]">Razão Social / Fantasia</TableHead>
                    <TableHead className="whitespace-nowrap h-10">CNPJ</TableHead>
                    <TableHead className="whitespace-nowrap h-10">Cidade / UF</TableHead>
                    <TableHead className="whitespace-nowrap h-10">Representante</TableHead>
                    <TableHead className="whitespace-nowrap h-10">Supervisor</TableHead>
                    <TableHead className="whitespace-nowrap h-10">Classif.</TableHead>
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
                        <TableCell className="text-xs py-2">
                          <span className="font-semibold">{row.repCode || '-'}</span>
                        </TableCell>
                        <TableCell className="text-xs py-2">{row.supervisorName || '-'}</TableCell>
                        <TableCell className="text-xs py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${row.classificacao === 'Estratégico' ? 'bg-purple-500/10 text-purple-600' : 'bg-blue-500/10 text-blue-600'}`}>
                            {row.classificacao || '-'}
                          </span>
                        </TableCell>
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
                  {filteredClientes.length > 100 && (
                     <TableRow>
                       <TableCell colSpan={9} className="text-center py-4 text-xs text-muted-foreground bg-muted/20">
                         Mostrando as 100 primeiras linhas de {filteredClientes.length} registros. Use a busca para filtrar.
                       </TableCell>
                     </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
