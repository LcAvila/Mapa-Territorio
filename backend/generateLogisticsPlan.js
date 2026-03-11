import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_PATH = path.join(__dirname, 'public/Planilha Base/Clientes - cluster B (faturamento 20 - 100 mil).xlsx');
const OUTPUT_PATH = path.join(__dirname, 'Planilha Logistica - Saida.xlsx');

const SUPERVISOR_ZONES = {
  'Supervisor 1': { base: 'RJ', states: ['RJ', 'ES'] },
  'Supervisor 2': { base: 'RJ', states: ['MG'] },
  'Supervisor 3': { base: 'RJ', states: ['MS', 'MT', 'GO', 'DF'] },
  'Supervisor 4': { base: 'SP', states: ['SP', 'PR', 'SC', 'RS'] },
  'Supervisor 5': { base: 'RECIFE', states: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE', 'AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'] }
};

function assignSupervisor(uf) {
  uf = uf ? uf.trim().toUpperCase() : '';
  for (const [sup, info] of Object.entries(SUPERVISOR_ZONES)) {
    if (info.states.includes(uf)) return sup;
  }
  return 'Não Alocado'; // Fallback
}

function getTransport(uf) {
  const ufDest = uf ? uf.trim().toUpperCase() : '';
  const carStates = ['SP', 'RJ', 'MG', 'ES', 'PR', 'SC', 'RS'];
  return carStates.includes(ufDest) ? 'Carro' : 'Voo + Carro Alugado';
}

function classifyCluster(count) {
  if (count >= 10) return 'Cluster estratégico';
  if (count >= 5) return 'Cluster forte';
  if (count >= 3) return 'Cluster médio';
  return 'Cluster pontual';
}

async function run() {
  console.log('Reading input file...');
  const xlsxLib = xlsx.readFile ? xlsx : xlsx.default;
  const workbook = xlsxLib.readFile(INPUT_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const utils = xlsxLib.utils;
  
  // Skip the first row which is just "Cluster B"
  const rawData = utils.sheet_to_json(worksheet, { header: 1, blankrows: false });
  const headers = rawData[1];
  const rows = rawData.slice(2);
  
  console.log(`Processing ${rows.length} customers...`);
  
  // 1. Process Base Clientes
  const baseClientes = [];
  const stateCounts = {};
  const cityClustersMap = {}; // supervisor -> uf -> cidade -> count
  let totalVisits = rows.length;
  
  rows.forEach(row => {
    let client = {};
    headers.forEach((h, idx) => {
      let val = row[idx];
      client[h ? h.trim() : `Col${idx}`] = typeof val === 'string' ? val.trim() : val;
    });
    
    // Fallback names if columns missing
    let uf = client['UF'] || '';
    let city = client['Cidade'] || '';
    let sup = assignSupervisor(uf);
    let transport = getTransport(uf);
    
    // Clean string values
    client['Supervisor Alocado'] = sup;
    client['Transporte Sugerido'] = transport;
    client['Estado'] = uf;
    client['Cidade Clean'] = city.toUpperCase();
    
    baseClientes.push(client);
    
    // For counts
    stateCounts[uf] = (stateCounts[uf] || 0) + 1;
    
    if (!cityClustersMap[sup]) cityClustersMap[sup] = {};
    if (!cityClustersMap[sup][uf]) cityClustersMap[sup][uf] = {};
    cityClustersMap[sup][uf][city.toUpperCase()] = (cityClustersMap[sup][uf][city.toUpperCase()] || 0) + 1;
  });
  
  // 2. Território Supervisores
  const territorioSupervisores = Object.entries(SUPERVISOR_ZONES).map(([sup, info]) => {
    let count = baseClientes.filter(c => c['Supervisor Alocado'] === sup).length;
    return {
      'Supervisor': sup,
      'Base Logística': info.base,
      'Estados Atendidos': info.states.join(', '),
      'Clientes': count
    };
  });
  
  // 3. Clusters Cidades
  const clustersCidades = [];
  const blocosViagem = [];
  
  for (const [sup, ufs] of Object.entries(cityClustersMap)) {
    for (const [uf, cities] of Object.entries(ufs)) {
      for (const [city, count] of Object.entries(cities)) {
        let classification = classifyCluster(count);
        clustersCidades.push({
          'Supervisor': sup,
          'Estado': uf,
          'Cidade': city,
          'Clientes': count,
          'Classificação': classification
        });
        
        if (count >= 5) {
          blocosViagem.push({
            'Supervisor': sup,
            'Estado': uf,
            'Bloco de Viagem (Cidade)': city,
            'Dias Estimados (3 clientes/dia)': Math.ceil(count / 3),
            'Qtd Clientes': count
          });
        }
      }
    }
  }
  
  // Sort clusters
  clustersCidades.sort((a, b) => b['Clientes'] - a['Clientes']);
  
  // 4. Roteiro de Visitas (Simulated Scheduling)
  const roteiroVisitas = [];
  let supervisorTotalKm = {};
  
  for (const sup of Object.keys(SUPERVISOR_ZONES)) {
    supervisorTotalKm[sup] = 0;
    let supClients = baseClientes.filter(c => c['Supervisor Alocado'] === sup);
    // Sort by state, then city
    supClients.sort((a, b) => {
      if (a['Estado'] !== b['Estado']) return a['Estado'].localeCompare(b['Estado']);
      return a['Cidade Clean'].localeCompare(b['Cidade Clean']);
    });
    
    let currentWeek = 1;
    let currentDay = 1;
    let visitsThisDay = 0;
    
    let lastState = null;
    let lastCity = null;
    
    supClients.forEach((client, idx) => {
      let kmEstimado = 0;
      let currentState = client['Estado'];
      let currentCity = client['Cidade Clean'];
      
      if (idx === 0) {
         kmEstimado = 350; // initial jump from base to state (simplified)
      } else {
         if (currentState !== lastState) kmEstimado = 350;
         else if (currentCity !== lastCity) kmEstimado = 90;
         else kmEstimado = 6;
      }
      
      supervisorTotalKm[sup] += kmEstimado;
      
      roteiroVisitas.push({
        'Supervisor': sup,
        'Semana': `Semana ${currentWeek}`,
        'Dia': `Dia ${currentDay}`,
        'Cliente': client['Cod Cliente - Matriz'] + ' - ' + client['Nome Abreviado - Matriz'],
        'Cidade': currentCity,
        'Estado': currentState,
        'KM Estimado': kmEstimado,
        'Transporte': client['Transporte Sugerido']
      });
      
      visitsThisDay++;
      if (visitsThisDay >= 4) { // max 4 visits per day
        visitsThisDay = 0;
        currentDay++;
        if (currentDay > 5) { // 5 days a week
          currentDay = 1;
          currentWeek++;
        }
      }
      
      lastState = currentState;
      lastCity = currentCity;
    });
  }
  
  // 5. Agenda Semanal (Aggregated)
  const agendaSemanal = [];
  for (const sup of Object.keys(SUPERVISOR_ZONES)) {
    let supRotas = roteiroVisitas.filter(r => r.Supervisor === sup);
    let weeks = [...new Set(supRotas.map(r => r.Semana))];
    
    weeks.forEach(week => {
      let weekRotas = supRotas.filter(r => r.Semana === week);
      let km = weekRotas.reduce((acc, curr) => acc + curr['KM Estimado'], 0);
      agendaSemanal.push({
        'Supervisor': sup,
        'Semana': week,
        'Nº de Visitas': weekRotas.length,
        'KM Total Estimado': km
      });
    });
  }
  
  // 6. Densidade por Estado
  const densidadeEstado = Object.entries(stateCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([state, count]) => ({
      'Estado': state,
      'Nº de Clientes': count,
      '% da Base': ((count / totalVisits) * 100).toFixed(2) + '%'
    }));
    
  // 7. Dashboard Executivo
  let totalKm = Object.values(supervisorTotalKm).reduce((a,b)=>a+b, 0);
  const dashboardExecutivo = [{
    'Total de Clientes': totalVisits,
    'Supervisores em Campo': 5,
    'KM Estimado Total': totalKm,
    'Custo Médio Transporte (R$ 1.5/km)': 'R$ ' + (totalKm * 1.5).toLocaleString('pt-BR'),
    'Visitas Planejadas': roteiroVisitas.length
  }];
  
  // Write Excel
  console.log('Generating Excel output...');
  const newWorkbook = xlsxLib.utils.book_new();
  
  xlsxLib.utils.book_append_sheet(newWorkbook, xlsxLib.utils.json_to_sheet(baseClientes), 'Base Clientes');
  xlsxLib.utils.book_append_sheet(newWorkbook, xlsxLib.utils.json_to_sheet(territorioSupervisores), 'Território Supervisores');
  xlsxLib.utils.book_append_sheet(newWorkbook, xlsxLib.utils.json_to_sheet(clustersCidades), 'Clusters Cidades');
  xlsxLib.utils.book_append_sheet(newWorkbook, xlsxLib.utils.json_to_sheet(blocosViagem), 'Blocos de Viagem');
  xlsxLib.utils.book_append_sheet(newWorkbook, xlsxLib.utils.json_to_sheet(roteiroVisitas), 'Roteiro de Visitas');
  xlsxLib.utils.book_append_sheet(newWorkbook, xlsxLib.utils.json_to_sheet(agendaSemanal), 'Agenda Semanal');
  xlsxLib.utils.book_append_sheet(newWorkbook, xlsxLib.utils.json_to_sheet(densidadeEstado), 'Densidade por Estado');
  xlsxLib.utils.book_append_sheet(newWorkbook, xlsxLib.utils.json_to_sheet(dashboardExecutivo), 'Dashboard Executivo');
  
  xlsxLib.writeFile(newWorkbook, OUTPUT_PATH);
  
  console.log(`Success! Logistical plan created at: ${OUTPUT_PATH}`);
}

run().catch(e => console.error("Script failed:", e));
