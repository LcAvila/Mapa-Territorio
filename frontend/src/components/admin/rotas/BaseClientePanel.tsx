import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Database, Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRotas } from '@/contexts/RotasContext';

export function BaseClientePanel() {
  const { planilhaData, planilhaSummary } = useRotas();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Base Cliente</h2>
          <p className="text-sm text-muted-foreground">Gerencie sua carteira de clientes, filtros de negativação e categorias.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2"><Filter className="w-4 h-4" /> Filtros</Button>
          <Button className="gap-2"><Database className="w-4 h-4" /> Importar Base</Button>
        </div>
      </div>
      
      <Card className="border-border/40">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Lista de Clientes ({planilhaData.length})</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por CNPJ ou nome..." className="pl-9 h-9 w-64 text-sm" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {planilhaData.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium">Nenhum cliente cadastrado na base ainda.</p>
              <p className="text-xs mt-1">Sincronize ou importe sua base pela aba Leitura Excel.</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-280px)]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {planilhaSummary?.columns.map(c => <TableHead key={c} className="whitespace-nowrap text-xs h-9">{c}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planilhaData.slice(0, 50).map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-secondary/30">
                       {planilhaSummary?.columns.map(c => (
                         <TableCell key={c} className="whitespace-nowrap py-1.5 text-xs text-muted-foreground max-w-[200px] truncate">
                           {row[c] !== null && row[c] !== undefined ? String(row[c]) : '-'}
                         </TableCell>
                       ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
