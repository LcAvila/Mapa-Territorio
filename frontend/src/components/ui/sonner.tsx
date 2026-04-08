/**
 * @file sonner.tsx
 * @description Esse aqui é o maluco que faz brotar as notificações na tela.
 * Sabe aquele aviso de "Sucesso!" ou "Deu ruim!" que aparece do nada? É esse componente aqui que manda no pedaço.
 * 
 * Papo de visão: Removi a exportação do 'toast' daqui porque o React tava de deboche com o Fast Refresh.
 * Se precisar disparar um toast em outro lugar, importa direto da 'sonner', valeu?
 * 
 * @author Cria de Nova Iguaçu
 */

import { useTheme } from "@/contexts/ThemeContext";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toaster - O dono da festa das notificações.
 * Coloca esse cara no topo da aplicação pra ele ficar de olho em tudo.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  // Pegando o tema (claro/escuro) pra não ficar aquela luz no olho de madrugada
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
