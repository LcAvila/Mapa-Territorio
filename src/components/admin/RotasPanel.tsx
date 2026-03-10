import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Download, Loader2, LayoutDashboard, Truck, MapPin, Users, Briefcase, Network, CalendarDays, BarChart, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { processPlanning, PlanningResult } from '@/lib/routing-algorithm';
import { exportPlanningToExcel } from '@/utils/excel-routing-export';
import BrazilMap from '@/components/BrazilMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type TabId = 'dashboard' | 'base' | 'territorios' | 'clusters' | 'blocos' | 'roteiro' | 'agenda' | 'densidade' | 'mapa';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'base', label: 'Base Clientes', icon: Users },
  { id: 'territorios', label: 'Territórios', icon: Briefcase },
  { id: 'clusters', label: 'Clusters', icon: Network },
  { id: 'blocos', label: 'Blocos', icon: Briefcase },
  { id: 'roteiro', label: 'Roteiros', icon: Truck },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'densidade', label: 'Densidade', icon: BarChart },
  { id: 'mapa', label: 'Mapa', icon: Globe },
];

export function RotasPanel() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<PlanningResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  useEffect(() => {
    const loadDefaultPlan = async () => {
      setIsProcessing(true);
      try {
        const response = await fetch('/Planilha Base/rotas.xlsx');
        if (!response.ok) throw new Error('Não foi possível carregar a base rotas.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length === 0) {
          toast.error("O arquivo base está vazio.");
          setIsProcessing(false);
          return;
        }
        
        const plan = processPlanning(data as any[]);
        setResult(plan);
      } catch (err: any) {
        toast.error(err.message || "Erro ao carregar planejamento.");
      } finally {
        setIsProcessing(false);
      }
    };

    loadDefaultPlan();
  }, []);

  const handleDownload = () => {
    if (!result) return;
    exportPlanningToExcel(result, `Planejamento_Nacional_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success("Download iniciado.");
  };

  return (
    <div className="flex flex-col h-full fade-in">
        {/* Header Tabs Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none border-b border-border/40">
            {tabs.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-t-lg transition-all text-xs font-semibold whitespace-nowrap min-w-fit
                        ${active ? 'bg-primary/10 text-primary border-b-2 border-primary -mb-[1px]' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                    >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {tab.label}
                    </button>
                )
            })}
             <div className="ml-auto pl-2 flex items-center shrink-0">
                <Button onClick={handleDownload} disabled={!result} size="sm" variant="outline" className="h-8 gap-2 text-xs">
                    <Download className="w-3 h-3"/> Download Excel Completo
                </Button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
            {isProcessing ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                    <p className="text-muted-foreground text-sm">Processando planilha e gerando roteiros...</p>
                </div>
            ) : !result ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Truck className="w-8 h-8 text-muted-foreground mb-4 opacity-50" />
                    <p className="text-muted-foreground text-sm">Nenhum planejamento encontrado. Verifique `/public/Planilha Base/rotas.xlsx`.</p>
                </div>
            ) : (
                <div className="space-y-6 pb-20">
                     {/* TAB DASHBOARD */}
                    <div className={`${activeTab === 'dashboard' ? 'block' : 'hidden'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <Card className="bg-card shadow-sm"><CardContent className="p-4 flex flex-col justify-center">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total de Clientes</p>
                                <p className="text-2xl font-bold">{result.dashboard.totalClientes}</p>
                            </CardContent></Card>
                            <Card className="bg-card shadow-sm"><CardContent className="p-4 flex flex-col justify-center">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Supervisores Alocados</p>
                                <p className="text-2xl font-bold text-blue-500">{result.dashboard.supervisoresAtivos}</p>
                            </CardContent></Card>
                            <Card className="bg-card shadow-sm"><CardContent className="p-4 flex flex-col justify-center">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">KM Total Estimada</p>
                                <p className="text-2xl font-bold text-orange-500">{result.dashboard.kmTotalEstimada}</p>
                            </CardContent></Card>
                            <Card className="bg-card shadow-sm"><CardContent className="p-4 flex flex-col justify-center">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Visitas Planejadas</p>
                                <p className="text-2xl font-bold text-emerald-500">{result.dashboard.visitasPlanejadas}</p>
                            </CardContent></Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="border-border/40 shadow-sm">
                                <CardHeader className="pb-3 border-b border-border/40 bg-muted/20"><CardTitle className="text-sm flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary"/> Distribuição por Supervisor</CardTitle></CardHeader>
                                <CardContent className="p-0">
                                    <Table className="text-xs">
                                        <TableHeader><TableRow className="bg-secondary/50"><TableHead>Supervisor</TableHead><TableHead>Base</TableHead><TableHead className="text-right">Clientes</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {result.territorios.map(t => (
                                                <TableRow key={t.supervisorId}>
                                                    <TableCell className="font-medium">{t.nome}</TableCell>
                                                    <TableCell className="text-muted-foreground">{t.base}</TableCell>
                                                    <TableCell className="text-right font-bold text-primary">{t.clientesCount}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            <Card className="border-border/40 shadow-sm">
                                <CardHeader className="pb-3 border-b border-border/40 bg-muted/20"><CardTitle className="text-sm flex items-center gap-2"><Network className="w-4 h-4 text-primary"/> Top 10 Clusters</CardTitle></CardHeader>
                                <CardContent className="p-0">
                                    <Table className="text-xs">
                                        <TableHeader><TableRow className="bg-secondary/50"><TableHead>Cidade/UF</TableHead><TableHead>Classificação</TableHead><TableHead className="text-right">Tamanho</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {result.clusters.slice(0, 10).map((c, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="font-medium"><div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-muted-foreground"/>{c.cidade} - {c.uf}</div></TableCell>
                                                    <TableCell>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase ${c.classification === 'Estratégico' ? 'bg-purple-500/10 text-purple-500' : c.classification === 'Forte' ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-500/10 text-slate-500'}`}>{c.classification}</span>
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold">{c.size}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* TAB BASE */}
                    <div className={`${activeTab === 'base' ? 'block' : 'hidden'}`}>
                        <Card className="border-border/40 shadow-sm">
                            <Table className="text-xs whitespace-nowrap">
                                <TableHeader><TableRow className="bg-secondary/50">
                                    <TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>UF</TableHead><TableHead>Cidade</TableHead><TableHead>Supervisor</TableHead><TableHead>Representante</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {result.baseClientes.slice(0, 50).map((c, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-mono text-primary">{c.codigo}</TableCell>
                                            <TableCell className="font-medium truncate max-w-[200px]">{c.nome}</TableCell>
                                            <TableCell>{c.uf}</TableCell>
                                            <TableCell>{c.cidade}</TableCell>
                                            <TableCell className="text-muted-foreground">Sup. {c.supervisorId}</TableCell>
                                            <TableCell className="truncate max-w-[150px]">{c.representante}</TableCell>
                                        </TableRow>
                                    ))}
                                    {result.baseClientes.length > 50 && (
                                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4 bg-muted/10 text-xs font-medium">Mostrando os primeiros 50 registros. Baixe o Excel para ver todos.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>

                    {/* TAB TERRITORIOS */}
                    <div className={`${activeTab === 'territorios' ? 'block' : 'hidden'}`}>
                        <Card className="border-border/40 shadow-sm">
                            <Table className="text-xs whitespace-nowrap">
                                <TableHeader><TableRow className="bg-secondary/50">
                                    <TableHead>Supervisor</TableHead><TableHead>Base</TableHead><TableHead>Estados Atendidos</TableHead><TableHead className="text-right">Clientes</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {result.territorios.map((c, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{c.nome}</TableCell>
                                            <TableCell>{c.base}</TableCell>
                                            <TableCell className="text-muted-foreground whitespace-normal">{c.estados.join(', ')}</TableCell>
                                            <TableCell className="text-right font-bold">{c.clientesCount}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>

                    {/* TAB CLUSTERS */}
                    <div className={`${activeTab === 'clusters' ? 'block' : 'hidden'}`}>
                        <Card className="border-border/40 shadow-sm">
                            <Table className="text-xs whitespace-nowrap">
                                <TableHeader><TableRow className="bg-secondary/50">
                                    <TableHead>Supervisor ID</TableHead><TableHead>UF</TableHead><TableHead>Cidade</TableHead><TableHead>Classificação</TableHead><TableHead className="text-right">Tamanho</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {result.clusters.slice(0, 50).map((c, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium text-muted-foreground">Sup. {c.supervisorId}</TableCell>
                                            <TableCell>{c.uf}</TableCell>
                                            <TableCell>{c.cidade}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase ${c.classification === 'Estratégico' ? 'bg-purple-500/10 text-purple-500' : c.classification === 'Forte' ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-500/10 text-slate-500'}`}>{c.classification}</span>
                                            </TableCell>
                                            <TableCell className="text-right font-bold">{c.size}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>

                    {/* TAB BLOCOS */}
                    <div className={`${activeTab === 'blocos' ? 'block' : 'hidden'}`}>
                        <Card className="border-border/40 shadow-sm">
                            <Table className="text-xs whitespace-nowrap">
                                <TableHeader><TableRow className="bg-secondary/50">
                                    <TableHead>Supervisor</TableHead><TableHead>Bloco</TableHead><TableHead>Cidades</TableHead><TableHead className="text-right">Clientes</TableHead><TableHead className="text-right">Dias Estimados</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {result.blocosViagem.slice(0, 50).map((c, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium text-muted-foreground">Sup. {c.supervisorId}</TableCell>
                                            <TableCell className="font-semibold text-primary">{c.blockName}</TableCell>
                                            <TableCell className="whitespace-normal max-w-xs">{c.cities.join(', ')}</TableCell>
                                            <TableCell className="text-right font-bold text-emerald-500">{c.totalClients}</TableCell>
                                            <TableCell className="text-right font-bold">{c.estimatedDays}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>

                    {/* TAB ROTEIRO */}
                    <div className={`${activeTab === 'roteiro' ? 'block' : 'hidden'}`}>
                        <Card className="border-border/40 shadow-sm">
                            <Table className="text-xs whitespace-nowrap">
                                <TableHeader><TableRow className="bg-secondary/50">
                                    <TableHead>Sup. ID</TableHead><TableHead>Semana</TableHead><TableHead>Dia</TableHead><TableHead>Ordem</TableHead><TableHead>UF</TableHead><TableHead>Cidade</TableHead><TableHead>Cliente</TableHead><TableHead className="text-right">KM Est.</TableHead><TableHead className="text-center">Modo</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {result.roteiroVisitas.slice(0, 50).map((c, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium text-muted-foreground">Sup. {c.supervisorId}</TableCell>
                                            <TableCell>Sem{c.semana}</TableCell>
                                            <TableCell>Dia {c.dia}</TableCell>
                                            <TableCell className="font-mono text-primary font-bold">{c.ordem}º</TableCell>
                                            <TableCell>{c.client.uf}</TableCell>
                                            <TableCell>{c.client.cidade}</TableCell>
                                            <TableCell className="truncate max-w-[200px]">{c.client.nome}</TableCell>
                                            <TableCell className="text-right font-bold text-orange-500">{c.kmEstimado}</TableCell>
                                            <TableCell className="text-center"><span className="bg-secondary px-2 py-0.5 rounded text-[10px] text-muted-foreground uppercase">{c.transporte}</span></TableCell>
                                        </TableRow>
                                    ))}
                                    {result.roteiroVisitas.length > 50 && (
                                        <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-4 bg-muted/10 text-xs font-medium">Mostrando os primeiros 50 registros. Baixe o Excel para ver todos.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>

                    {/* TAB AGENDA */}
                    <div className={`${activeTab === 'agenda' ? 'block' : 'hidden'}`}>
                        <Card className="border-border/40 shadow-sm">
                            <Table className="text-xs whitespace-nowrap">
                                <TableHeader><TableRow className="bg-secondary/50">
                                    <TableHead>Supervisor</TableHead><TableHead>Semana</TableHead><TableHead className="text-right">Nº Visitas</TableHead><TableHead className="text-right">KM Total</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {result.agendaSemanal.map((c, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{c.nome}</TableCell>
                                            <TableCell>Semana {c.semana}</TableCell>
                                            <TableCell className="text-right font-bold text-emerald-500">{c.visitasCount}</TableCell>
                                            <TableCell className="text-right font-bold text-orange-500">{c.kmTotal}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>

                    {/* TAB DENSIDADE */}
                    <div className={`${activeTab === 'densidade' ? 'block' : 'hidden'}`}>
                        <Card className="border-border/40 shadow-sm md:w-1/2">
                            <Table className="text-xs whitespace-nowrap">
                                <TableHeader><TableRow className="bg-secondary/50">
                                    <TableHead>Estado (UF)</TableHead><TableHead className="text-right">Nº de Clientes</TableHead><TableHead className="text-right">% da Base</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {result.densidadeEstado.map((c, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium text-primary">{c.uf}</TableCell>
                                            <TableCell className="text-right font-bold">{c.clientesCount}</TableCell>
                                            <TableCell className="text-right text-muted-foreground">{c.percentagem.toFixed(2)}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>

                    {/* TAB MAPA */}
                    {activeTab === 'mapa' && (
                        <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden h-[600px] flex flex-col relative transition-all">
                            <div className="absolute inset-x-0 top-0 z-20 flex justify-center p-4 pointer-events-none">
                                <div className="bg-background/80 backdrop-blur border border-border/50 px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary"/><span className="text-sm font-semibold">Visualização dos {result.clusters.length} Clusters Logísticos</span>
                                </div>
                            </div>
                            <div className="absolute inset-0 z-0 opacity-80 mix-blend-screen pointer-events-none">
                                <BrazilMap selectedUF={null} modo="planejamento" filtroRepresentante={null} mostrarVagos={false} onSelectUF={()=>{}} onSelectMunicipio={()=>{}} searchQuery="" municipioCodeForBairros={null} onDeactivateBairros={()=>{}} selectedMunicipioName={undefined} />
                            </div>
                        </div>
                    )}

                </div>
            )}
        </div>
    </div>
  );
}
