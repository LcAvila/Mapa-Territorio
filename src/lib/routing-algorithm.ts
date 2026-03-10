export interface RawClient {
  'Código do cliente'?: string;
  'Nome do cliente'?: string;
  'Região'?: string;
  'UF'?: string;
  'Cidade'?: string;
  'Endereço'?: string;
  'CEP'?: string;
  'Representante'?: string;
  'CNPJ'?: string;
  [key: string]: any;
}

export interface Client {
  codigo: string;
  nome: string;
  regiao: string;
  uf: string;
  cidade: string;
  endereco: string;
  cep: string;
  representante: string;
  cnpj: string;
  supervisorId?: number;
}

export type ClusterClass = 'Estratégico' | 'Forte' | 'Médio' | 'Pontual';

export interface Cluster {
  uf: string;
  cidade: string;
  supervisorId: number;
  clients: Client[];
  size: number;
  classification: ClusterClass;
}

export interface RoutingBlock {
  supervisorId: number;
  blockName: string;
  cities: string[];
  totalClients: number;
  estimatedDays: number;
}

export interface VisitRoute {
  supervisorId: number;
  semana: number;
  dia: number;
  ordem: number;
  client: Client;
  kmEstimado: number;
  transporte: string;
}

export interface PlanningResult {
  baseClientes: Client[];
  territorios: { supervisorId: number; nome: string; base: string; estados: string[]; clientesCount: number }[];
  clusters: Cluster[];
  blocosViagem: RoutingBlock[];
  roteiroVisitas: VisitRoute[];
  agendaSemanal: { supervisorId: number; nome: string; semana: number; visitasCount: number; kmTotal: number }[];
  densidadeEstado: { uf: string; clientesCount: number; percentagem: number }[];
  dashboard: {
    totalClientes: number;
    supervisoresAtivos: number;
    kmTotalEstimada: number;
    visitasPlanejadas: number;
    custoMedioBase: number;
  };
}

export const ATRIBUICAO_ESTADOS: Record<string, number[]> = {
  // Supervisor 4 (SP)
  'SP': [4], 'PR': [4], 'SC': [4], 'RS': [4],
  // Supervisor 5 (Recife)
  'AL': [5], 'BA': [5], 'CE': [5], 'MA': [5], 'PB': [5], 'PE': [5], 'PI': [5], 'RN': [5], 'SE': [5],
  'AC': [5], 'AP': [5], 'AM': [5], 'PA': [5], 'RO': [5], 'RR': [5], 'TO': [5],
  // Supervisores 1, 2, 3 (RJ)
  'RJ': [1,2,3], 'MG': [1,2,3], 'ES': [1,2,3], 'MS': [1,2,3], 'MT': [1,2,3], 'GO': [1,2,3], 'DF': [1,2,3]
};

export function getModoTransporte(uf: string): string {
  const sudesteSul = ['SP', 'RJ', 'MG', 'ES', 'PR', 'SC', 'RS'];
  return sudesteSul.includes(uf) ? 'carro' : 'voo + carro alugado';
}

export function classifyCluster(size: number): ClusterClass {
  if (size >= 10) return 'Estratégico';
  if (size >= 5) return 'Forte';
  if (size >= 3) return 'Médio';
  return 'Pontual';
}

export function processPlanning(rawClients: RawClient[]): PlanningResult {
    // 1. Format clients
    let clients: Client[] = rawClients.map(c => ({
        codigo: c['Código do cliente']?.toString() || '',
        nome: c['Nome do cliente']?.toString() || '',
        regiao: c['Região']?.toString() || '',
        uf: (c['UF']?.toString() || '').trim().toUpperCase(),
        cidade: c['Cidade']?.toString() || '',
        endereco: c['Endereço']?.toString() || '',
        cep: c['CEP']?.toString() || '',
        representante: c['Representante']?.toString() || '',
        cnpj: c['CNPJ']?.toString() || '',
    })).filter(c => c.uf && c.cidade); // Must have at least State and City

    // 2. Territory Assignment
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    clients.forEach(c => {
        const possiveis = ATRIBUICAO_ESTADOS[c.uf] || [1]; // Default to RJ 1 if unknown state
        let escolhido = possiveis[0];
        if (possiveis.length > 1) {
            // Find the one with minimum load
            escolhido = possiveis.reduce((min, curr) => counts[curr as keyof typeof counts] < counts[min as keyof typeof counts] ? curr : min, possiveis[0]);
        }
        c.supervisorId = escolhido;
        counts[escolhido as keyof typeof counts]++;
    });

    // 3. Clustering
    const clusterMap: Record<string, Cluster> = {};
    clients.forEach(c => {
        const key = `${c.supervisorId}-${c.uf}-${c.cidade}`;
        if (!clusterMap[key]) {
            clusterMap[key] = {
                uf: c.uf,
                cidade: c.cidade,
                supervisorId: c.supervisorId!,
                clients: [],
                size: 0,
                classification: 'Pontual'
            };
        }
        clusterMap[key].clients.push(c);
        clusterMap[key].size++;
        clusterMap[key].classification = classifyCluster(clusterMap[key].size);
    });

    const clusters = Object.values(clusterMap).sort((a,b) => b.size - a.size);

    // 4. Blocks
    const blocosViagem: RoutingBlock[] = [];
    clusters.filter(cl => cl.size >= 5).forEach(cl => {
        blocosViagem.push({
            supervisorId: cl.supervisorId,
            blockName: `Missão ${cl.cidade} (${cl.uf})`,
            cities: [cl.cidade],
            totalClients: cl.size,
            estimatedDays: Math.ceil(cl.size / 5) // approx 5 visits per day
        });
    });

    // 5. Routing
    // Simple heuristic: sequence by Supervisor, then State, then City
    const roteiroVisitas: VisitRoute[] = [];
    
    // Group all clients by supervisor
    const supers = [1,2,3,4,5];
    supers.forEach(supId => {
        const supClients = clients.filter(c => c.supervisorId === supId);
        if (supClients.length === 0) return;

        // Sort clients logically: UF -> Cidade -> Nome
        supClients.sort((a, b) => a.uf.localeCompare(b.uf) || a.cidade.localeCompare(b.cidade) || a.nome.localeCompare(b.nome));

        let semana = 1;
        let dia = 1;
        let visitasNoDia = 0;
        let lastUf = '';
        let lastCidade = '';

        supClients.forEach((c, idx) => {
            let km = 0;
            if (idx === 0) {
                km = 50; // Initial start roughly
            } else {
                if (c.uf !== lastUf) km = 350;
                else if (c.cidade !== lastCidade) km = 90;
                else km = 6;
            }

            roteiroVisitas.push({
                supervisorId: supId,
                semana,
                dia,
                ordem: visitasNoDia + 1,
                client: c,
                kmEstimado: km,
                transporte: getModoTransporte(c.uf)
            });

            lastUf = c.uf;
            lastCidade = c.cidade;
            visitasNoDia++;

            // Assuming max 5 visits a day
            if (visitasNoDia >= 5) {
                visitasNoDia = 0;
                dia++;
                if (dia > 5) {
                    dia = 1;
                    semana++;
                }
            }
        });
    });

    // 6. Aggregate info
    const names = {
        1: "Supervisor 1 (RJ)",
        2: "Supervisor 2 (RJ)",
        3: "Supervisor 3 (RJ)",
        4: "Supervisor 4 (SP)",
        5: "Supervisor 5 (Recife)"
    };
    const bases = {
        1: "Rio de Janeiro", 2: "Rio de Janeiro", 3: "Rio de Janeiro",
        4: "São Paulo Capital", 5: "Recife"
    };

    const territorios = supers.map(id => {
        const cls = clients.filter(c => c.supervisorId === id);
        const ufs = Array.from(new Set(cls.map(c => c.uf)));
        return {
            supervisorId: id,
            nome: names[id as keyof typeof names],
            base: bases[id as keyof typeof bases],
            estados: ufs,
            clientesCount: cls.length
        };
    }).filter(t => t.clientesCount > 0);

    const agendaSemanal = [];
    for (const supId of supers) {
        const rotasSup = roteiroVisitas.filter(r => r.supervisorId === supId);
        if (rotasSup.length === 0) continue;
        const semanas = Array.from(new Set(rotasSup.map(r => r.semana)));
        for (const sem of semanas) {
            const rotasSem = rotasSup.filter(r => r.semana === sem);
            agendaSemanal.push({
                supervisorId: supId,
                nome: names[supId as keyof typeof names],
                semana: sem,
                visitasCount: rotasSem.length,
                kmTotal: rotasSem.reduce((acc, curr) => acc + curr.kmEstimado, 0)
            });
        }
    }

    const stateDensityMap: Record<string, number> = {};
    clients.forEach(c => {
        stateDensityMap[c.uf] = (stateDensityMap[c.uf] || 0) + 1;
    });
    const densidadeEstado = Object.entries(stateDensityMap)
        .map(([uf, count]) => ({ uf, clientesCount: count, percentagem: (count / clients.length) * 100 }))
        .sort((a,b) => b.clientesCount - a.clientesCount);

    const dashboard = {
        totalClientes: clients.length,
        supervisoresAtivos: territorios.length,
        kmTotalEstimada: roteiroVisitas.reduce((acc, r) => acc + r.kmEstimado, 0),
        visitasPlanejadas: roteiroVisitas.length,
        custoMedioBase: 0 // Optional placeholder
    };

    return {
        baseClientes: clients,
        territorios,
        clusters,
        blocosViagem,
        roteiroVisitas,
        agendaSemanal,
        densidadeEstado,
        dashboard
    };
}
