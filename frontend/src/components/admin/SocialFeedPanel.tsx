import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import FeedPostInput from '@/components/FeedPostInput';
import FeedList from '@/components/FeedList';
import BirthdayWidget from '@/components/BirthdayWidget';

export function SocialFeedPanel() {
  const { userName, role } = useAuth();
  const [feedRefresh, setFeedRefresh] = useState(0);
  const [congratsText, setCongratsText] = useState('');

  const dailyMessages = [
    "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
    "A persistência é o caminho do êxito.",
    "A única maneira de fazer um excelente trabalho é amar o que você faz.",
    "Grandes jornadas começam com um pequeno passo.",
    "Sua limitação é apenas sua imaginação.",
    "Pense positivo e coisas boas acontecerão.",
    "O melhor momento para plantar uma árvore foi há 20 anos. O segundo melhor é agora.",
    "Você é mais forte do que imagina.",
    "Acredite em si próprio e o resto virá naturalmente.",
    "O que você faz hoje pode melhorar todos os seus amanhãs."
  ];

  const getDayMessage = () => {
    // Usa a data atual para escolher uma mensagem (muda a cada 24h)
    const today = new Date();
    const index = (today.getFullYear() + today.getMonth() + today.getDate()) % dailyMessages.length;
    return dailyMessages[index];
  };

  const handleCongratulate = (name: string) => {
    setCongratsText(`Parabéns ${name}! 🎉 Desejo muitas felicidades e sucesso!`);
    const inputElement = document.getElementById('feed-input-container');
    if (inputElement) {
      inputElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full max-w-[1700px] mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Coluna Esquerda: Perfil Rápido e Atividades */}
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-8">
          <div className="bg-card border border-border/50 rounded-3xl p-8 text-center shadow-xl shadow-black/5 backdrop-blur-sm">
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-tr from-primary/30 to-primary/10 flex items-center justify-center text-primary text-3xl font-bold uppercase shadow-inner rotate-3 hover:rotate-0 transition-transform duration-300">
                {userName?.charAt(0) || 'U'}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-card rounded-full shadow-sm" title="Online" />
            </div>
            <h2 className="font-bold text-xl tracking-tight max-w-full truncate mx-auto" title={userName || ''}>
              {userName}
            </h2>
            <p className="text-sm font-medium text-muted-foreground/80 capitalize mt-2 flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              {role}
            </p>

            <div className="mt-8 pt-8 border-t border-border/40 grid grid-cols-2 gap-4">
               <div className="text-center">
                  <p className="text-2xl font-bold tracking-tight">0</p>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">Posts</p>
               </div>
               <div className="text-center">
                  <p className="text-2xl font-bold tracking-tight">0</p>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">Reações</p>
               </div>
            </div>
          </div>

          <div className="bg-card/40 border border-border/30 rounded-3xl p-6 backdrop-blur-sm">
             <h3 className="font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2 opacity-60">
                <div className="w-1 h-1 rounded-full bg-primary" />
                Atividade recente
             </h3>
             <div className="space-y-4">
                <p className="text-[11px] text-muted-foreground italic text-center py-4">
                   Nenhuma atividade recente.
                </p>
             </div>
          </div>
        </div>

        {/* Feed Central */}
        <div className="lg:col-span-6 flex flex-col gap-10" id="feed-input-container">
          <FeedPostInput 
            defaultText={congratsText} 
            key={congratsText} 
            onPostCreated={() => {
              setFeedRefresh(r => r + 1);
              setCongratsText('');
            }} 
          />
          <FeedList refreshTrigger={feedRefresh} />
        </div>

        {/* Coluna Direita: Aniversariantes e Mensagem */}
        <div className="lg:col-span-3 flex flex-col gap-8">
          <div className="bg-card border border-border/50 rounded-3xl p-8 shadow-xl shadow-black/5 backdrop-blur-sm">
            <BirthdayWidget onCongratulate={handleCongratulate} />
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/10 rounded-3xl p-8 shadow-sm">
             <h3 className="font-bold text-xs uppercase tracking-widest mb-4 opacity-50 flex items-center gap-2">
                <div className="w-4 h-[1px] bg-primary/30" />
                Mensagem do Dia
             </h3>
             <p className="text-sm italic leading-relaxed text-muted-foreground/90 font-medium">
                "{getDayMessage()}"
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
