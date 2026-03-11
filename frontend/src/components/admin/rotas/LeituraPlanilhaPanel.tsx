import React, { useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { UploadCloud, FileSpreadsheet, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRotas } from '@/contexts/RotasContext';
import { toast } from 'sonner';

export function LeituraPlanilhaPanel() {
  const [loading, setLoading] = useState(false);
  const { planilhaData: data, setPlanilhaData, planilhaSummary: summary, setPlanilhaSummary } = useRotas();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/upload-planilha', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || 'Erro no upload');
      
      setPlanilhaData(json.data);
      setPlanilhaSummary(json.summary);
      toast.success('Planilha processada via Python com sucesso!');
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao processar planilha');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLoadExample = async () => {
    try {
      setLoading(true);
      // Fetch o arquivo da pasta public
      const response = await fetch('/Planilha Base/rotas.xlsx');
      const blob = await response.blob();
      
      // Montar um arquivo fake com o blob
      const file = new File([blob], 'rotas.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const uploadRes = await fetch('http://localhost:3001/api/upload-planilha', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const json = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(json.message || json.error || 'Erro no processamento do exemplo');
      
      setPlanilhaData(json.data);
      setPlanilhaSummary(json.summary);
      toast.success('Planilha de Exemplo carregada com sucesso!');
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro carregar exemplo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Leitura de Planilhas</h2>
          <p className="text-sm text-muted-foreground">Processe as bases de clientes utilizando Python e Pandas no backend.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleLoadExample} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          Carregar Exemplo (rotas.xlsx)
        </Button>
      </div>

      <Card className="border-border/40">
        <CardContent className="p-10 flex flex-col items-center justify-center text-center">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
          <UploadCloud className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-1">Upload da sua Planilha</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">Selecione uma planilha em formato Excel para o Python ler as colunas automaticamente e transformar em base.</p>
          <Button onClick={() => fileInputRef.current?.click()} disabled={loading} className="gap-2">
             {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</> : <><UploadCloud className="w-4 h-4" /> Escolher Arquivo</>}
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border/40">
             <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total de Linhas (Registros)</CardTitle></CardHeader>
             <CardContent><p className="text-2xl font-bold">{summary.totalRows}</p></CardContent>
          </Card>
          <Card className="border-border/40 md:col-span-3">
             <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Colunas Identificadas pelo Pandas</CardTitle></CardHeader>
             <CardContent><p className="text-sm text-primary flex flex-wrap gap-1">
                {summary.columns.map((c: string) => <span key={c} className="bg-primary/10 px-2 py-0.5 rounded-full text-xs font-mono">{c}</span>)}
             </p></CardContent>
          </Card>
        </div>
      )}

      {data.length > 0 && summary && (
         <Card className="border-border/40 overflow-hidden">
           <CardHeader className="bg-secondary/20 pb-4 border-b border-border/40">
             <CardTitle className="text-sm flex items-center justify-between">
                <span>Pré-visualização dos Dados (10 primeiros)</span>
                <Button size="sm" variant="secondary" className="h-7 text-xs gap-1">Mapear Colunas <ArrowRight className="w-3 h-3" /></Button>
             </CardTitle>
           </CardHeader>
           <CardContent className="p-0">
             <div className="overflow-x-auto max-w-[calc(100vw-300px)]">
               <Table>
                 <TableHeader>
                   <TableRow className="hover:bg-transparent">
                     {summary.columns.map((c: string) => (
                       <TableHead key={c} className="whitespace-nowrap text-xs">{c}</TableHead>
                     ))}
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {data.slice(0, 10).map((row, idx) => (
                     <TableRow key={idx} className="hover:bg-secondary/30">
                        {summary.columns.map((c: string) => (
                          <TableCell key={c} className="whitespace-nowrap text-xs text-muted-foreground max-w-[200px] truncate">
                            {row[c] !== null ? String(row[c]) : '-'}
                          </TableCell>
                        ))}
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </div>
           </CardContent>
         </Card>
      )}
    </div>
  );
}
