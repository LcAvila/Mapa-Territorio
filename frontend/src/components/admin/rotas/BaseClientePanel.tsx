import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Database, Filter, Search, Plus, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  status_ativo: boolean;
}

export function BaseClientePanel() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    regiao: ''
  });

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

  useEffect(() => {
    fetchClientes();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome_cliente) {
      toast.error('O nome do cliente é obrigatório.');
      return;
    }
    
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Erro ao cadastrar cliente');
      }

      toast.success('Cliente cadastrado com sucesso!');
      setIsDialogOpen(false);
      setFormData({ // reseta o form
        codigo_cliente: '', nome_cliente: '', nome_abreviado: '', cnpj: '',
        cep: '', endereco_completo: '', bairro: '', cidade: '', uf: '', regiao: ''
      });
      fetchClientes(); // Recarrega a base
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Ocorreu um erro ao salvar o cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.nome_cliente?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.cnpj?.includes(searchTerm) ||
    c.codigo_cliente?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  <Database className="w-5 h-5 text-primary" />
                  Cadastrar Novo Cliente
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateClient} className="space-y-4 mt-4">
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
        <CardHeader className="pb-3 border-b border-border/40 bg-card/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Lista de Clientes ({filteredClientes.length} / {clientes.length})</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome, código ou CNPJ..." 
                className="pl-9 h-9 w-72 text-sm bg-background/50 focus:bg-background transition-colors" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                    <TableHead className="whitespace-nowrap h-10 min-w-[300px]">Razão Social / Fantasia</TableHead>
                    <TableHead className="whitespace-nowrap h-10">CNPJ</TableHead>
                    <TableHead className="whitespace-nowrap h-10">Cidade / UF</TableHead>
                    <TableHead className="whitespace-nowrap h-10">Bairro</TableHead>
                    <TableHead className="whitespace-nowrap h-10">Região</TableHead>
                    <TableHead className="whitespace-nowrap h-10 text-right pr-4">Status</TableHead>
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
                        <TableCell className="text-xs py-2 max-w-[150px] truncate" title={row.bairro || undefined}>{row.bairro || '-'}</TableCell>
                        <TableCell className="text-xs py-2">{row.regiao || '-'}</TableCell>
                        <TableCell className="text-xs py-2 text-right pr-4">
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
                    </TableRow>
                  ))}
                  {filteredClientes.length > 100 && (
                     <TableRow>
                       <TableCell colSpan={7} className="text-center py-4 text-xs text-muted-foreground bg-muted/20">
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
