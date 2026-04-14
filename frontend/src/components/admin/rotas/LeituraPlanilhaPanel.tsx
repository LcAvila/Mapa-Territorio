import React, { useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { UploadCloud, FileSpreadsheet, Loader2, ArrowRight, CheckCircle2, XCircle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRotas } from '@/contexts/RotasContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface PlanilhaRow {
  codigo_cliente: string | number;
  nome_cliente: string;
  nome_abreviado: string;
  supervisor: string;
  regiao: string;
  uf: string;
  representante: string;
  endereco: string;
  cidade: string;
  bairro: string;
  cep: string;
  classificacao: string;
  distancia_km: number | string;
  semana: string;
  prioridade: string;
  cnpj: string;
}

// Mapeamento das colunas do Excel para o modelo interno
const COLUMN_MAP: Record<string, keyof PlanilhaRow> = {
  'Cod Cliente - Matriz': 'codigo_cliente',
  'Cliente': 'nome_cliente',
  'Nome Abreviado - Matriz': 'nome_abreviado',
  'Supervisor': 'supervisor',
  'Região': 'regiao',
  'UF': 'uf',
  'Repres': 'representante',
  'Endereço': 'endereco',
  'Cidade': 'cidade',
  'Bairro': 'bairro',
  'CEP': 'cep',
  'Classificação': 'classificacao',
  'Distância (km)': 'distancia_km',
  'Semana': 'semana',
  'Prioridade': 'prioridade',
  'CNPJ': 'cnpj',
};

function parsePlanilha(workbook: XLSX.WorkBook): PlanilhaRow[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return raw.map(row => {
    const mapped: Partial<PlanilhaRow> = {};
    for (const [excelCol, internalKey] of Object.entries(COLUMN_MAP)) {
      if (excelCol in row) {
        (mapped as Record<string, unknown>)[internalKey] = row[excelCol];
      }
    }
    return mapped as PlanilhaRow;
  }).filter(r => r.nome_cliente);
}

const PRIORITY_COLORS: Record<string, string> = {
  Alta: 'bg-red-500/10 text-red-500 border-red-500/20',
  Média: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  Baixa: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
};

export function LeituraPlanilhaPanel() {
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<PlanilhaRow[]>([]);
  const [filename, setFilename] = useState('');
  const [filter, setFilter] = useState({ semana: '', uf: '', prioridade: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { setPlanilhaData, setPlanilhaSummary } = useRotas();

  const processFile = async (file: File) => {
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const rows = parsePlanilha(workbook);

      setParsed(rows);
      setFilename(file.name);
      setPlanilhaData(rows as unknown as Record<string, unknown>[]);
      setPlanilhaSummary({
        totalRows: rows.length,
        columns: Object.keys(COLUMN_MAP),
      });
      toast.success(`${rows.length} registros importados de "${file.name}"`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao processar planilha');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  };

  const handleLoadExample = async () => {
    try {
      setLoading(true);
      const response = await fetch('/Nova pasta/Planejamento_Rotas.xlsx');
      if (!response.ok) throw new Error('Arquivo de exemplo não encontrado na pasta public');
      const blob = await response.blob();
      const file = new File([blob], 'Planejamento_Rotas.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      await processFile(file);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar exemplo');
    } finally {
      setLoading(false);
    }
  };

  const semanas = [...new Set(parsed.map(r => r.semana).filter(Boolean))].sort();
  const ufs = [...new Set(parsed.map(r => r.uf).filter(Boolean))].sort();
  const prioridades = [...new Set(parsed.map(r => r.prioridade).filter(Boolean))].sort();

  const filtered = parsed.filter(r => {
    if (filter.semana && r.semana !== filter.semana) return false;
    if (filter.uf && r.uf !== filter.uf) return false;
    if (filter.prioridade && r.prioridade !== filter.prioridade) return false;
    return true;
  });

  const stats = {
    total: parsed.length,
    estrategicos: parsed.filter(r => r.classificacao === 'Estratégico').length,
    alta: parsed.filter(r => r.prioridade === 'Alta').length,
    ufs: new Set(parsed.map(r => r.uf).filter(Boolean)).size,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Leitura de Planilha de Planejamento</h2>
          <p className="text-sm text-muted-foreground">
            Importe a planilha Excel de rotas — substitui o workflow manual antigo.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleLoadExample} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          Carregar Exemplo (Planejamento_Rotas.xlsx)
        </Button>
      </div>

      {/* Upload Zone */}
      {parsed.length === 0 && (
        <Card className="border-border/40 border-dashed">
          <CardContent className="p-10 flex flex-col items-center justify-center text-center">
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
            <div className="w-16 h-16 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-center mb-4">
              <UploadCloud className="w-8 h-8 text-primary/40" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Arraste ou selecione o arquivo</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Suporta o formato da planilha <strong>Planejamento_Rotas.xlsx</strong>. O processamento é feito diretamente no navegador — sem upload para servidor.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => fileInputRef.current?.click()} disabled={loading} className="gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</> : <><UploadCloud className="w-4 h-4" /> Escolher Arquivo</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas pós-importação */}
      {parsed.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <p className="text-sm font-semibold text-foreground">
              <span className="text-emerald-600">{parsed.length} registros</span> importados de{' '}
              <span className="font-mono text-primary">{filename}</span>
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-xs text-destructive hover:bg-destructive/10 gap-1"
              onClick={() => { setParsed([]); setFilename(''); setPlanilhaData([]); setPlanilhaSummary(null); }}
            >
              <XCircle className="w-3.5 h-3.5" /> Limpar
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => fileInputRef.current?.click()}>
              <UploadCloud className="w-3.5 h-3.5" /> Nova Planilha
            </Button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Clientes', value: stats.total, color: 'text-foreground' },
              { label: 'Estratégicos', value: stats.estrategicos, color: 'text-blue-600' },
              { label: 'Prioridade Alta', value: stats.alta, color: 'text-red-500' },
              { label: 'Estados (UF)', value: stats.ufs, color: 'text-emerald-600' },
            ].map(s => (
              <Card key={s.label} className="border-border/40">
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{s.label}</CardTitle></CardHeader>
                <CardContent><p className={`text-3xl font-bold ${s.color}`}>{s.value}</p></CardContent>
              </Card>
            ))}
          </div>

          {/* Filtros */}
          <Card className="border-border/40">
            <CardHeader className="pb-3 border-b border-border/40 bg-secondary/10">
              <CardTitle className="text-sm">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-3">
                <select className="h-9 px-3 bg-background border border-input rounded-md text-sm min-w-[150px]"
                  value={filter.semana} onChange={e => setFilter(f => ({ ...f, semana: e.target.value }))}>
                  <option value="">Todas as Semanas</option>
                  {semanas.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="h-9 px-3 bg-background border border-input rounded-md text-sm min-w-[120px]"
                  value={filter.uf} onChange={e => setFilter(f => ({ ...f, uf: e.target.value }))}>
                  <option value="">Todos os Estados</option>
                  {ufs.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <select className="h-9 px-3 bg-background border border-input rounded-md text-sm min-w-[140px]"
                  value={filter.prioridade} onChange={e => setFilter(f => ({ ...f, prioridade: e.target.value }))}>
                  <option value="">Todas as Prioridades</option>
                  {prioridades.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {(filter.semana || filter.uf || filter.prioridade) && (
                  <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => setFilter({ semana: '', uf: '', prioridade: '' })}>
                    Limpar Filtros
                  </Button>
                )}
                <span className="ml-auto text-xs text-muted-foreground self-center">
                  {filtered.length} de {parsed.length} registros
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de dados */}
          <Card className="border-border/40 overflow-hidden">
            <CardHeader className="bg-secondary/20 pb-4 border-b border-border/40">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Registros Importados</span>
                <Button size="sm" variant="secondary" className="h-7 text-xs gap-1">
                  Enviar para Roteiro <ArrowRight className="w-3 h-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/40">
                      <TableHead className="pl-4 w-[80px]">Cód.</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="w-[100px]">UF / Cidade</TableHead>
                      <TableHead className="w-[100px]">Bairro</TableHead>
                      <TableHead className="w-[100px]">Representante</TableHead>
                      <TableHead className="w-[80px]">Dist. (km)</TableHead>
                      <TableHead className="w-[90px]">Semana</TableHead>
                      <TableHead className="w-[90px]">Prioridade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 100).map((row, idx) => (
                      <TableRow key={idx} className="border-border/30 hover:bg-secondary/30">
                        <TableCell className="pl-4 text-[11px] font-mono text-muted-foreground">{String(row.codigo_cliente)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-xs font-semibold">{row.nome_cliente}</p>
                            {row.nome_abreviado && <p className="text-[10px] text-muted-foreground italic">{row.nome_abreviado}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <p className="font-bold font-mono">{row.uf}</p>
                            <p className="text-muted-foreground text-[10px]">{row.cidade}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">{row.bairro}</TableCell>
                        <TableCell className="text-[11px]">{row.representante?.split('-')[0]?.trim()}</TableCell>
                        <TableCell className="text-[11px] text-center font-mono">{row.distancia_km}</TableCell>
                        <TableCell>
                          {row.semana && (
                            <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                              {row.semana}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.prioridade && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border whitespace-nowrap ${PRIORITY_COLORS[row.prioridade] || 'bg-secondary text-muted-foreground'}`}>
                              {row.prioridade}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filtered.length > 100 && (
                  <div className="p-3 text-center text-xs text-muted-foreground border-t border-border/40">
                    Exibindo 100 de {filtered.length} registros. Use os filtros para refinar.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
