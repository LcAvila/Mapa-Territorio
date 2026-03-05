import { useEffect, useRef } from 'react';
import { MapPin, Eye, Copy, Navigation, Layers, HandHeart } from 'lucide-react';

export interface ContextMenuState {
    x: number;
    y: number;
    type: 'state' | 'municipio';
    nome: string;
    uf: string;
}

interface MapContextMenuProps {
    menu: ContextMenuState;
    onClose: () => void;
    onViewDetails: () => void;
    onSelectState: () => void;
    onViewBairros: () => void;
    onRegisterInterest: () => void;
    onCopyName: () => void;
}

export default function MapContextMenu({
    menu, onClose, onViewDetails, onSelectState, onViewBairros, onRegisterInterest, onCopyName,
}: MapContextMenuProps) {
    const ref = useRef<HTMLDivElement>(null);

    // Close on click outside or Escape
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [onClose]);

    // Adjust position so menu doesn't overflow screen
    const menuWidth = 230;
    const estimatedHeight = menu.type === 'state' ? 120 : 170;
    const x = Math.min(menu.x, window.innerWidth - menuWidth - 12);
    const y = Math.min(menu.y, window.innerHeight - estimatedHeight - 12);

    const Item = ({
        icon: Icon, label, onClick, highlight = false, danger = false,
    }: {
        icon: React.ElementType; label: string; onClick: () => void;
        highlight?: boolean; danger?: boolean;
    }) => (
        <button
            onClick={() => { onClick(); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded-md transition-all
                ${highlight
                    ? 'text-primary hover:bg-primary/10 font-medium'
                    : danger
                        ? 'text-destructive hover:bg-destructive/10'
                        : 'text-foreground hover:bg-secondary/60'}
            `}
        >
            <Icon className={`w-3.5 h-3.5 shrink-0 ${highlight ? 'text-primary' : danger ? 'text-destructive' : 'text-muted-foreground'}`} />
            {label}
        </button>
    );

    return (
        <div
            ref={ref}
            style={{ left: x, top: y, position: 'fixed', zIndex: 9999 }}
            className="w-[230px] bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
        >
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-border/60 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{menu.nome}</p>
                    <p className="text-[10px] text-muted-foreground">
                        {menu.type === 'state' ? 'Estado' : `Município · ${menu.uf}`}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="p-1.5 space-y-0.5">
                {menu.type === 'state' ? (
                    <>
                        <Item icon={Navigation} label="Ver municípios" onClick={onSelectState} />
                        <Item icon={Copy} label="Copiar nome" onClick={onCopyName} />
                    </>
                ) : (
                    <>
                        <Item icon={Eye} label="Ver detalhes" onClick={onViewDetails} />
                        <Item icon={Layers} label="Ver bairros/distritos" onClick={onViewBairros} />
                        <Item icon={Copy} label="Copiar nome" onClick={onCopyName} />
                        <div className="border-t border-border/50 my-1" />
                        <Item icon={HandHeart} label="Manifestar interesse aqui" onClick={onRegisterInterest} highlight />
                    </>
                )}
            </div>
        </div>
    );
}
