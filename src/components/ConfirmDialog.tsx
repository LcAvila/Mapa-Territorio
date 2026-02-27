import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning';
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'danger',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
            if (e.key === 'Enter') onConfirm();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onCancel, onConfirm]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" />

            {/* Dialog */}
            <div className="relative z-10 w-full max-w-sm bg-card border border-border/60 rounded-xl shadow-2xl animate-in zoom-in-95 fade-in duration-200">
                {/* Close */}
                <button
                    onClick={onCancel}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="p-6">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${variant === 'danger'
                            ? 'bg-destructive/15'
                            : 'bg-amber-500/15'
                        }`}>
                        <AlertTriangle className={`w-6 h-6 ${variant === 'danger' ? 'text-destructive' : 'text-amber-400'
                            }`} />
                    </div>

                    {/* Text */}
                    <h2 className="text-base font-semibold text-foreground mb-1">{title}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

                    {/* Actions */}
                    <div className="flex gap-3 mt-6">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={onCancel}
                        >
                            {cancelLabel}
                        </Button>
                        <Button
                            className={`flex-1 ${variant === 'danger'
                                    ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                                }`}
                            onClick={onConfirm}
                        >
                            {confirmLabel}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
