import { useState } from 'react';
import { X, HandHeart, MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const API = 'http://localhost:3001';

interface InterestModalProps {
    municipio: string;
    uf: string;
    onClose: () => void;
}

export default function InterestModal({ municipio, uf, onClose }: InterestModalProps) {
    const [form, setForm] = useState({
        nome: '', email: '', telefone: '', empresa: '',
        modo: 'planejamento', observacoes: '',
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const field = (f: string, v: string) => setForm(prev => ({ ...prev, [f]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/interest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, municipio, uf }),
            });
            if (res.ok) {
                setSuccess(true);
            } else {
                const err = await res.json();
                toast.error(err.message || 'Erro ao enviar interesse');
            }
        } catch {
            toast.error('Erro de conexão com o servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">

                {/* Header gradient bar */}
                <div className="h-1 w-full bg-gradient-to-r from-primary via-emerald-400 to-primary/50" />

                {/* Header */}
                <div className="px-6 py-4 flex items-start justify-between border-b border-border/60">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                            <HandHeart className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground">Manifestar Interesse</h2>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <MapPin className="w-3 h-3 text-primary" />
                                <p className="text-xs text-muted-foreground font-medium">
                                    {municipio} · {uf}
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                    >
                        <X className="w-4.5 h-4.5" />
                    </button>
                </div>

                {success ? (
                    /* Success state */
                    <div className="px-6 py-12 flex flex-col items-center gap-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-base font-bold text-foreground">Interesse registrado!</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Seu interesse em <strong className="text-foreground">{municipio}</strong> foi enviado com sucesso. Entraremos em contato em breve.
                            </p>
                        </div>
                        <Button onClick={onClose} className="mt-2 gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Fechar
                        </Button>
                    </div>
                ) : (
                    /* Form */
                    <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3.5">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Preencha os dados abaixo e sua solicitação será analisada pela equipe administrativa.
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2 space-y-1">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Nome completo *</label>
                                <Input
                                    placeholder="Seu nome"
                                    value={form.nome}
                                    onChange={e => field('nome', e.target.value)}
                                    required
                                    className="h-9 text-sm"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">E-mail</label>
                                <Input
                                    type="email"
                                    placeholder="contato@exemplo.com"
                                    value={form.email}
                                    onChange={e => field('email', e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Telefone</label>
                                <Input
                                    placeholder="(11) 99999-9999"
                                    value={form.telefone}
                                    onChange={e => field('telefone', e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>

                            <div className="col-span-2 space-y-1">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Empresa / Representação</label>
                                <Input
                                    placeholder="Nome da sua empresa ou representação"
                                    value={form.empresa}
                                    onChange={e => field('empresa', e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Modo de interesse *</label>
                            <div className="flex gap-2">
                                {(['planejamento', 'atendimento'] as const).map(m => (
                                    <button
                                        key={m} type="button"
                                        onClick={() => field('modo', m)}
                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${form.modo === m
                                                ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                                                : 'border-border text-muted-foreground hover:border-primary/50'
                                            }`}
                                    >
                                        {m === 'planejamento' ? 'Planejamento' : 'Atendimento'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Observações</label>
                            <textarea
                                placeholder="Informações adicionais sobre sua atuação nesta região..."
                                value={form.observacoes}
                                onChange={e => field('observacoes', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none text-foreground placeholder:text-muted-foreground"
                            />
                        </div>

                        <div className="flex gap-2 pt-1">
                            <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-9">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading} className="flex-1 h-9 gap-2">
                                {loading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                                ) : (
                                    <><HandHeart className="w-4 h-4" /> Enviar Interesse</>
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
