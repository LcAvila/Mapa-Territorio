import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context-core';
import { Cake, Gift } from 'lucide-react';
import { Button } from './ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BirthdayUser {
  id: number;
  full_name: string;
  birth_date: string;
  tipo: string;
}

export default function BirthdayWidget({ onCongratulate }: { onCongratulate: (name: string) => void }) {
  const { token } = useAuth();
  const [birthdays, setBirthdays] = useState<BirthdayUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        const token = localStorage.getItem('token');
        const tokenVersion = localStorage.getItem('tokenVersion') || '0';
        const res = await fetch('http://localhost:3001/api/birthdays/month', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'x-user-token-version': tokenVersion
          }
        });
        if (res.ok) {
          const data = await res.json();
          setBirthdays(data);
        }
      } catch (error) {
        console.error('Erro ao buscar aniversariantes:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBirthdays();
  }, [token]);

  if (loading) return <div className="animate-pulse text-sm text-muted-foreground w-full text-center">Buscando aniversariantes...</div>;

  if (birthdays.length === 0) return (
    <div className="text-center w-full">
      <p className="text-sm text-muted-foreground">Nenhum aniversariante neste mês.</p>
    </div>
  );

  return (
    <div className="w-full">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <Cake className="w-5 h-5 text-orange-500" /> 
        Aniversariantes do Mês
      </h3>
      <div className="space-y-3">
        {birthdays.map(b => {
          // Add timezone safety for display purely day/month
          const dateObj = new Date(b.birth_date);
          const localDate = new Date(dateObj.getTime() + dateObj.getTimezoneOffset() * 60000);
          
          return (
            <div key={b.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors border border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 text-lg shadow-sm">
                  🎉
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">{b.full_name}</p>
                  <p className="text-xs text-muted-foreground">{format(localDate, 'dd/MM')}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10 shrink-0"
                onClick={() => onCongratulate(b.full_name)}
                title="Dar Parabéns nas Notícias"
              >
                <Gift className="w-4 h-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
