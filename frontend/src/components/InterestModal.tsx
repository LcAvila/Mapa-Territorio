import { useState } from 'react';
import { X, HandHeart, MapPin, Loader2, CheckCircle2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context-core';
import { API_BASE_URL } from '@/lib/api-base';

const API = API_BASE_URL;

interface InterestModalProps {
    municipio: string;
    uf: string;
    onClose: () => void;
}

export default function InterestModal({ municipio, uf, onClose }: InterestModalProps) {
    const [motivo, setMotivo] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const { userId, repCode, userName, token } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!motivo.trim()) { toast.error('Descreva o motivo do seu interesse'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/interest`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ 
                    nome: userName || '-', // required by backend schema
                    userId,
                    repCode,
                    municipio, 
                    uf, 
                    observacoes: motivo,
                    modo: 'planejamento',
                }),
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
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">

                {/* Header gradient bar */}
                <div className="h-1 w-full bg-gradient-to-r from-primary via-emerald-400 to-primary/50" />

                {/* Header */}
                <div className="px-6 py-4 flex items-start justify-between border-b border-border/60">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                            <HandHeart className="w-4 h-4 text-primary" />
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
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors mt-0.5">
                        <X className="w-4 h-4" />
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
                                Seu interesse em <strong className="text-foreground">{municipio}</strong> ({uf}) foi enviado para análise.
                            </p>
                        </div>
                        <Button onClick={onClose} className="mt-2 gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Fechar
                        </Button>
                    </div>
                ) : (
                    /* Form */
                    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

                        {/* Read-only location info */}
                        <div className="flex gap-3">
                            <div className="flex-1 rounded-lg bg-muted/40 border border-border/60 px-3 py-2.5">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Estado</p>
                                <p className="text-sm font-semibold text-foreground">{uf}</p>
                            </div>
                            <div className="flex-1 rounded-lg bg-muted/40 border border-border/60 px-3 py-2.5">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Município</p>
                                <p className="text-sm font-semibold text-foreground truncate">{municipio}</p>
                            </div>
                        </div>

                        {/* Motivo textarea */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                <MessageSquare className="w-3 h-3" /> Motivo *
                            </label>
                            <textarea
                                placeholder="Descreva o motivo do seu interesse nessa região — ex: tenho contatos, conheço o mercado local, já atuo nos arredores..."
                                value={motivo}
                                onChange={e => setMotivo(e.target.value)}
                                rows={5}
                                required
                                autoFocus
                                className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none text-foreground placeholder:text-muted-foreground/60 leading-relaxed"
                            />
                            <p className="text-[10px] text-muted-foreground/60">{motivo.length} caractere{motivo.length !== 1 ? 's' : ''}</p>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-9">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading || !motivo.trim()} className="flex-1 h-9 gap-2">
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
