import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Check, ChevronDown, Loader2 } from 'lucide-react';

interface SearchableSelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
}

export function SearchableSelect({ options, value, onChange, placeholder, disabled = false, loading = false }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const filtered = useMemo(
    () => (query ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase())) : options),
    [options, query]
  );
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => { setOpen(!open); setQuery(''); }}
        className={`w-full flex items-center justify-between px-3 py-2.5 bg-background border rounded-md text-sm transition-colors ${
          disabled || loading ? 'opacity-50 cursor-not-allowed border-border' : 'border-input hover:border-primary/50 cursor-pointer'
        } ${open ? 'ring-1 ring-primary border-primary/50' : ''}`}
      >
        <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
          {loading ? 'Carregando...' : (selected ? selected.label : placeholder)}
        </span>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>
      {open && (
        <div className="absolute z-[10000] w-full mt-1 bg-popover border border-border rounded-md shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Pesquisar..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-background rounded border border-border focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="py-4 text-center text-xs text-muted-foreground">Nenhum resultado</li>
            ) : (
              filtered.map(opt => (
                <li key={opt.value}>
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center gap-2 ${
                      opt.value === value ? 'text-primary bg-primary/5' : 'text-foreground'
                    }`}
                    onClick={() => { onChange(opt.value); setOpen(false); setQuery(''); }}
                  >
                    {opt.value === value && <Check className="w-3.5 h-3.5 shrink-0" />}
                    <span className={opt.value === value ? '' : 'pl-5'}>{opt.label}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

interface CustomSelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
}

export function CustomSelect({ options, value, onChange, placeholder, disabled = false, className = '' }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => String(o.value) === String(value));

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`w-full h-10 flex items-center justify-between px-3 py-2 bg-background border rounded-md text-sm transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed border-border' : 'border-border/50 hover:border-primary/50 cursor-pointer'
        } ${open ? 'ring-1 ring-primary border-primary/50' : ''}`}
      >
        <span className={selected ? 'text-foreground font-medium' : 'text-muted-foreground'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-[100] w-full mt-1 bg-popover/95 backdrop-blur-md border border-border shadow-2xl rounded-md overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <ul className="max-h-60 overflow-y-auto py-1">
            {options.map(opt => (
              <li key={opt.value}>
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary/80 flex items-center justify-between transition-colors ${
                    String(opt.value) === String(value) ? 'text-primary bg-primary/10 font-bold' : 'text-foreground'
                  }`}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                >
                  <span>{opt.label}</span>
                  {String(opt.value) === String(value) && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
