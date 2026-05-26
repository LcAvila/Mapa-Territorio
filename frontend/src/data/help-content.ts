import {
  Map,
  Users,
  MapPin,
  Calendar,
  Route,
  Bell,
  UserCircle,
  LogIn,
  Database,
  Activity,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface HelpStep {
  title: string;
  description: string;
}

export interface HelpSection {
  id: string;
  title: string;
  icon: LucideIcon;
  summary: string;
  intro?: string;
  steps?: HelpStep[];
  tips?: string[];
  warnings?: string[];
}

export interface HelpFaq {
  question: string;
  answer: string;
}

export interface HelpGlossaryItem {
  term: string;
  definition: string;
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'inicio',
    title: 'Começando',
    icon: LogIn,
    summary: 'Como entrar no sistema e escolher sua tela inicial.',
    intro:
      'O Mapa Território funciona no navegador (Chrome, Edge ou Firefox). Você recebe um e-mail e senha da sua empresa — não precisa instalar nada no computador.',
    steps: [
      {
        title: 'Faça login',
        description:
          'Na tela de entrada, digite seu e-mail e senha. Se aparecer mensagem de sessão expirada, entre de novo — isso é normal após ficar muito tempo sem usar.',
      },
      {
        title: 'Escolha onde quer trabalhar',
        description:
          'Alguns usuários abrem direto no Mapa; outros no Painel Administrativo. Isso depende do seu perfil (representante, supervisor ou administrador).',
      },
      {
        title: 'Use o menu lateral',
        description:
          'No painel administrativo, o menu à esquerda leva às áreas: Dashboard, Ajuda, Base Cliente, Visitas, Territórios e outras opções conforme sua permissão.',
      },
    ],
    tips: [
      'Se não lembrar a senha, peça ao administrador da sua empresa para redefinir.',
      'Evite compartilhar sua senha — cada pessoa deve ter seu próprio acesso.',
    ],
  },
  {
    id: 'mapa',
    title: 'Mapa do Brasil',
    icon: Map,
    summary: 'Visualize estados, cidades e clientes no mapa interativo.',
    intro:
      'O mapa mostra onde estão seus clientes e quem cuida de cada região. As cores ajudam a identificar representantes e territórios.',
    steps: [
      {
        title: 'Clique em um estado',
        description:
          'Ao clicar em um estado no mapa do Brasil, você aproxima a visualização e vê os municípios daquela região.',
      },
      {
        title: 'Escolha uma cidade',
        description:
          'Depois de selecionar o estado, clique no município desejado para ver bairros e pontos de clientes (quando disponíveis).',
      },
      {
        title: 'Filtre por representante',
        description:
          'Use os filtros no topo para ver apenas os clientes de uma pessoa da equipe ou alternar entre os modos Planejamento e Atendimento.',
      },
      {
        title: 'Busque um cliente',
        description:
          'Na barra de pesquisa, digite o nome do cliente ou da cidade. O mapa leva você até o local automaticamente.',
      },
    ],
    tips: [
      'O mapa de calor (heatmap) mostra regiões com mais clientes concentrados — útil para planejar deslocamentos.',
      'Clique com o botão direito em algumas áreas para ações rápidas (quando disponível no seu perfil).',
    ],
  },
  {
    id: 'clientes',
    title: 'Base de Clientes',
    icon: Database,
    summary: 'Cadastre e mantenha os dados dos seus clientes atualizados.',
    intro:
      'Cada cliente precisa de nome e localização corretos para aparecer no mapa e entrar em roteiros de visita.',
    steps: [
      {
        title: 'Abra Base Cliente',
        description:
          'No menu lateral, clique em Base Cliente. Você verá a lista de todos os clientes que pode consultar ou editar.',
      },
      {
        title: 'Cadastre um novo cliente',
        description:
          'Use o botão de adicionar, preencha nome, endereço, cidade, estado (UF) e CEP. Quanto mais completo o endereço, melhor o sistema posiciona o cliente no mapa.',
      },
      {
        title: 'Confira no mapa',
        description:
          'Após salvar, volte ao Mapa e procure o cliente. Se o pin estiver no lugar errado, revise o endereço e o CEP.',
      },
      {
        title: 'Vincule a um representante',
        description:
          'Selecione qual pessoa da equipe é responsável por aquele cliente. Isso organiza territórios e roteiros.',
      },
    ],
    warnings: [
      'Cliente sem endereço ou com CEP errado pode aparecer em outro estado no mapa. Sempre confira cidade e UF.',
    ],
    tips: [
      'Use a busca e filtros por estado e cidade para achar clientes rapidamente na lista.',
    ],
  },
  {
    id: 'visitas',
    title: 'Visitas e Roteiros',
    icon: Route,
    summary: 'Agende visitas, acompanhe o progresso e veja o trajeto no mapa.',
    intro:
      'Um roteiro é a lista ordenada de clientes que alguém deve visitar em um dia (ou período), com o caminho mais eficiente entre eles.',
    steps: [
      {
        title: 'Agendar um roteiro',
        description:
          'Menu Visitas → Agendamento. Escolha o representante, dê um nome ao roteiro (ex.: "Região Norte — Maio"), a data, a semana e marque os clientes na lista. Defina se a saída é da base da empresa ou da localização atual.',
      },
      {
        title: 'Gerar o roteiro inteligente',
        description:
          'Clique em gerar. O sistema ordena as visitas pela menor distância entre os pontos, economizando tempo de deslocamento.',
      },
      {
        title: 'Acompanhar execução',
        description:
          'Em Visitas → Acompanhamento, veja todos os roteiros ativos, progresso (%), paradas concluídas e status (pendente, em execução, concluído).',
      },
      {
        title: 'Ver detalhes de um roteiro',
        description:
          'Clique no nome do roteiro na tabela. Abre um painel com endereço completo, CEP, motivo de cada visita e distância em km entre uma parada e outra.',
      },
      {
        title: 'Ver no mapa',
        description:
          'Use o ícone de mapa ou o botão dentro dos detalhes. Os alfinetes mostram cada parada; a linha tracejada indica o percurso sugerido.',
      },
      {
        title: 'Editar ou excluir',
        description:
          'No menu de três pontos (⋯) de cada roteiro: editar nome e data, ou excluir. Não é possível excluir roteiro que já está em execução.',
      },
    ],
    tips: [
      'Representantes podem executar o roteiro no celular pela tela de execução, fazendo check-in em cada cliente.',
      'Se os pinos do mapa estiverem longe demais, verifique o cadastro dos clientes — o sistema corrige coordenadas ao abrir o mapa.',
    ],
  },
  {
    id: 'territorios',
    title: 'Territórios',
    icon: MapPin,
    summary: 'Defina quem atende cada cidade ou região.',
    intro:
      'Território é a área geográfica (município ou estado) atribuída a um representante. Isso evita conflito entre equipes na mesma região.',
    steps: [
      {
        title: 'Acesse Territórios',
        description:
          'Disponível para administradores e supervisores. Você verá mapa e lista de áreas já atribuídas.',
      },
      {
        title: 'Atribuir uma cidade',
        description:
          'Selecione o município e o representante responsável. A partir daí, os clientes daquela área podem ser filtrados e planejados para essa pessoa.',
      },
      {
        title: 'Importar em lote',
        description:
          'Administradores podem importar vários territórios de uma vez por planilha — peça suporte à TI se precisar desse arquivo modelo.',
      },
    ],
  },
  {
    id: 'usuarios',
    title: 'Usuários e Equipe',
    icon: Users,
    summary: 'Como funcionam perfis, supervisores e representantes.',
    intro:
      'Cada pessoa da empresa tem um login próprio. O tipo de usuário define o que ela pode ver e alterar no sistema.',
    steps: [
      {
        title: 'Administrador',
        description:
          'Acesso amplo: usuários, territórios, alertas, configurações do sistema e auditoria.',
      },
      {
        title: 'Supervisor',
        description:
          'Acompanha equipe, roteiros, clientes e territórios da sua área. Pode agendar visitas para representantes.',
      },
      {
        title: 'Representante',
        description:
          'Foco em clientes e execução de visitas no campo. Vê mapa e roteiros atribuídos a ele.',
      },
    ],
    tips: [
      'Supervisores podem ter vários representantes subordinados na hierarquia — os roteiros respeitam essa estrutura.',
    ],
  },
  {
    id: 'alertas',
    title: 'Alertas e Notificações',
    icon: Bell,
    summary: 'Receba avisos importantes dentro do sistema.',
    intro:
      'Administradores enviam alertas para todos ou para pessoas específicas — por exemplo, novo roteiro disponível ou aviso da empresa.',
    steps: [
      {
        title: 'Ver notificações',
        description:
          'O ícone de sino no topo mostra alertas novos. Clique para ler e marcar como visto.',
      },
      {
        title: 'Enviar alerta (admin)',
        description:
          'Menu Enviar Alerta: escreva título e mensagem, escolha se vai para todos ou apenas usuários selecionados.',
      },
    ],
  },
  {
    id: 'perfil',
    title: 'Perfil e Segurança',
    icon: UserCircle,
    summary: 'Atualize seus dados e preferências pessoais.',
    steps: [
      {
        title: 'Acesse seu perfil',
        description:
          'Pelo menu do usuário (canto superior) ou pela rota Perfil. Atualize nome, telefone, foto e endereço.',
      },
      {
        title: 'Tema claro ou escuro',
        description:
          'Use o botão de sol/lua para alternar entre modo claro e escuro. A escolha fica salva no seu navegador.',
      },
      {
        title: 'Sessão e inatividade',
        description:
          'Por segurança, o sistema pode deslogar após um tempo sem uso. Basta entrar novamente com e-mail e senha.',
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: Activity,
    summary: 'Visão geral com números e atalhos rápidos.',
    intro:
      'A tela inicial do painel mostra resumos: quantidade de clientes, territórios, usuários e atalhos para as áreas mais usadas.',
    tips: [
      'Use os cartões coloridos para ir direto à seção desejada com um clique.',
      'Filtros no dashboard permitem analisar por estado ou representante.',
    ],
  },
];

export const HELP_FAQS: HelpFaq[] = [
  {
    question: 'Preciso instalar algum programa?',
    answer:
      'Não. Basta abrir o endereço do sistema no navegador. No celular, use o mesmo login pelo navegador (Chrome ou Safari).',
  },
  {
    question: 'Por que o cliente aparece em outro estado no mapa?',
    answer:
      'Quase sempre o endereço ou o CEP está incompleto ou incorreto. Edite o cadastro do cliente com cidade e UF corretos, salve e abra o mapa do roteiro de novo — o sistema tenta corrigir a localização automaticamente.',
  },
  {
    question: 'O que significa "roteiro pendente"?',
    answer:
      'O roteiro foi criado mas ainda não começou a ser executado no campo. Quando o representante iniciar as visitas, o status muda para "em execução".',
  },
  {
    question: 'Não consigo ver o menu de Usuários ou Territórios',
    answer:
      'Seu perfil pode não ter permissão para essas áreas. Fale com o administrador da sua empresa para liberar o acesso necessário.',
  },
  {
    question: 'Como altero a senha?',
    answer:
      'Peça ao administrador do sistema na sua empresa. A redefinição é feita pela gestão de usuários ou pelo suporte interno de TI.',
  },
  {
    question: 'Posso usar no celular?',
    answer:
      'Sim. O sistema se adapta à tela do celular. Para executar roteiros em campo, o representante usa a tela de execução do roteiro com check-in em cada cliente.',
  },
  {
    question: 'O que é check-in?',
    answer:
      'É o registro de que você chegou ao cliente, usando a localização do celular. Ajuda a comprovar que a visita foi feita no local correto.',
  },
];

export const HELP_GLOSSARY: HelpGlossaryItem[] = [
  { term: 'Roteiro', definition: 'Lista de clientes a visitar, em ordem, em uma data — com trajeto otimizado no mapa.' },
  { term: 'Parada', definition: 'Cada cliente incluído em um roteiro; equivale a uma visita programada.' },
  { term: 'Representante', definition: 'Profissional que visita clientes no campo.' },
  { term: 'Supervisor', definition: 'Responsável por acompanhar representantes e planejar visitas da equipe.' },
  { term: 'Território', definition: 'Cidade ou região atribuída a um representante.' },
  { term: 'CEP', definition: 'Código postal do endereço; ajuda o sistema a localizar o cliente no mapa.' },
  { term: 'Base Cliente', definition: 'Cadastro geral de todos os clientes da empresa.' },
  { term: 'Dashboard', definition: 'Tela inicial com resumo e números do sistema.' },
];

export const HELP_QUICK_LINKS = [
  { sectionId: 'visitas', label: 'Como criar um roteiro', icon: Calendar },
  { sectionId: 'mapa', label: 'Usar o mapa', icon: Map },
  { sectionId: 'clientes', label: 'Cadastrar cliente', icon: Database },
  { sectionId: 'inicio', label: 'Primeiro acesso', icon: LogIn },
];
