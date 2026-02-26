import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Trash2, MapPin, Loader2, ArrowLeftRight, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Representative {
    code: string;
    name: string;
    fullName: string;
    isVago: boolean;
    colorIndex: number;
}

export default function Admin() {
    const { token, logout } = useAuth();
    const navigate = useNavigate();
    const [reps, setReps] = useState<Representative[]>([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [newRep, setNewRep] = useState({ code: '', name: '', fullName: '', isVago: false, colorIndex: 1 });

    // Reallocation states
    const [realloc, setRealloc] = useState({ municipio: '', uf: '', repCode: '', modo: 'planejamento' });

    useEffect(() => {
        fetchReps();
    }, []);

    const fetchReps = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/representatives');
            if (res.ok) {
                const data = await res.json();
                setReps(data);
            }
        } catch (err) {
            toast.error('Erro ao buscar representantes');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRep = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:3001/api/representatives', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newRep),
            });
            if (res.ok) {
                toast.success('Representante cadastrado!');
                fetchReps();
                setNewRep({ code: '', name: '', fullName: '', isVago: false, colorIndex: reps.length + 1 });
            }
        } catch (err) {
            toast.error('Erro ao cadastrar');
        }
    };

    const handleDeleteRep = async (code: string) => {
        if (!confirm('Tem certeza?')) return;
        try {
            const res = await fetch(`http://localhost:3001/api/representatives/${code}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
                toast.success('Removido!');
                fetchReps();
            }
        } catch (err) {
            toast.error('Erro ao remover');
        }
    };

    const handleReallocate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:3001/api/territories/reallocate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(realloc),
            });
            if (res.ok) {
                toast.success('Território realocado!');
                setRealloc({ municipio: '', uf: '', repCode: '', modo: 'planejamento' });
            }
        } catch (err) {
            toast.error('Erro ao realocar');
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border/50 shadow-sm">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Painel Administrativo
                </h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
                        Ver Mapa
                    </Button>
                    <Button variant="ghost" onClick={logout} className="text-destructive gap-2">
                        <LogOut className="w-4 h-4" /> Sair
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Management Card */}
                <Card className="border-border/50 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="text-primary" /> Gerenciar Representantes
                        </CardTitle>
                        <CardDescription>Cadastre novos ou exclua representantes do sistema</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form onSubmit={handleCreateRep} className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border border-border/30">
                            <Input placeholder="Código (ex: 47)" value={newRep.code} onChange={e => setNewRep({ ...newRep, code: e.target.value })} required />
                            <Input placeholder="Nome Curto" value={newRep.name} onChange={e => setNewRep({ ...newRep, name: e.target.value })} required />
                            <Input className="col-span-2" placeholder="Nome Completo" value={newRep.fullName} onChange={e => setNewRep({ ...newRep, fullName: e.target.value })} required />
                            <div className="flex items-center gap-2 text-sm col-span-2">
                                <input type="checkbox" checked={newRep.isVago} onChange={e => setNewRep({ ...newRep, isVago: e.target.checked })} />
                                Marcar como Vago
                            </div>
                            <Button className="col-span-2" type="submit">Cadastrar Representante</Button>
                        </form>

                        <div className="overflow-hidden rounded-md border border-border/50">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Cód</TableHead>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reps.map(rep => (
                                        <TableRow key={rep.code}>
                                            <TableCell className="font-mono text-xs font-semibold">{rep.code}</TableCell>
                                            <TableCell className="text-xs">{rep.name}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRep(rep.code)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Reallocation Card */}
                <Card className="border-border/50 shadow-lg h-fit">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowLeftRight className="text-primary" /> Realocação de Território
                        </CardTitle>
                        <CardDescription>Mova um representante para um novo município ou estado</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleReallocate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium">Município</label>
                                    <Input placeholder="Ex: Niterói" value={realloc.municipio} onChange={e => setRealloc({ ...realloc, municipio: e.target.value })} required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium">UF</label>
                                    <Input placeholder="Ex: RJ" maxLength={2} value={realloc.uf} onChange={e => setRealloc({ ...realloc, uf: e.target.value.toUpperCase() })} required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium">Novo Representante (Selecionar Cód)</label>
                                <select
                                    className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm"
                                    value={realloc.repCode}
                                    onChange={e => setRealloc({ ...realloc, repCode: e.target.value })}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {reps.map(r => (
                                        <option key={r.code} value={r.code}>{r.code} - {r.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium">Modo</label>
                                <select
                                    className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm"
                                    value={realloc.modo}
                                    onChange={e => setRealloc({ ...realloc, modo: e.target.value })}
                                >
                                    <option value="planejamento">Planejamento</option>
                                    <option value="atendimento">Atendimento</option>
                                </select>
                            </div>
                            <Button className="w-full gap-2" type="submit">
                                <MapPin className="w-4 h-4" /> Confirmar Realocação
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
