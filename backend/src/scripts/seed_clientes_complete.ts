import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as path from 'path';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Map of state centers (fallback coordinates)
const stateCenters: Record<string, [number, number]> = {
  'AC': [-9.02, -70.81], 'AL': [-9.57, -36.78], 'AP': [1.41, -51.77], 'AM': [-3.41, -64.45],
  'BA': [-12.97, -39.64], 'CE': [-5.20, -39.53], 'DF': [-15.83, -47.86], 'ES': [-19.19, -40.34],
  'GO': [-15.82, -49.83], 'MA': [-5.42, -45.44], 'MT': [-12.64, -55.42], 'MS': [-20.51, -54.54],
  'MG': [-18.55, -44.55], 'PA': [-3.95, -49.67], 'PB': [-7.28, -36.72], 'PR': [-24.89, -51.55],
  'PE': [-8.28, -37.94], 'PI': [-7.73, -42.73], 'RJ': [-22.84, -43.15], 'RN': [-5.22, -36.52],
  'RS': [-30.01, -51.22], 'RO': [-11.22, -62.80], 'RR': [1.82, -61.30], 'SC': [-27.24, -50.21],
  'SP': [-23.55, -46.63], 'SE': [-10.90, -37.07], 'TO': [-10.17, -48.33]
};

async function main() {
  const filePath = path.resolve(__dirname, '../../../frontend/public/Planilha Base/Planejamento_Rotas.xlsx');
  console.log(`Lendo arquivo: ${filePath}`);
  
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);

  // 1. First Pass: Get unique supervisors and create accounts
  const sups = new Set<string>();
  (data as any[]).forEach(row => { if (row['Supervisor']) sups.add(row['Supervisor']); });
  
  console.log(`Criando contas para ${sups.size} supervisores...`);
  const hashedDefaultPwd = await bcrypt.hash('123456', 10);
  for (const supName of sups) {
    const username = supName.toLowerCase().replace(/\s+/g, '.');
    await prisma.user.upsert({
      where: { username },
      update: { full_name: supName, role: 'supervisor' },
      create: { 
        username, 
        password: hashedDefaultPwd, 
        full_name: supName, 
        role: 'supervisor' 
      }
    });
  }

  // 2. Second Pass: Import Clients
  console.log(`Importando ${data.length} clientes...`);

  let count = 0;
  for (const row of data as any[]) {
    const codCliente = String(row['Cod Cliente - Matriz'] || '');
    if (!codCliente) continue;

    const nome = row['Cliente'] || '';
    const uf = String(row['UF'] || '').trim().toUpperCase();
    const represRaw = String(row['Repres'] || '');
    
    // Extract repCode (e.g., "120 - EDSON..." -> "120")
    const repCodeMatch = represRaw.match(/^(\d+)/);
    let repCode = repCodeMatch ? repCodeMatch[1] : null;

    if (repCode) {
      const repExists = await prisma.user.findUnique({ where: { repCode } });
      if (!repExists) {
        // Try creating the representative via User model if it doesn't exist
        const namePart = represRaw.replace(/^\d+\s*-\s*/, '').trim();
        const defaultPassword = await bcrypt.hash('123456', 10);
        await prisma.user.create({
          data: { 
            repCode, 
            full_name: namePart,
            username: `rep_${repCode}`,
            password: defaultPassword,
            role: 'representante',
            tipo: 'representante'
          }
        });
      }
    }

    // Mock coordinates: state center + random offset
    const center = stateCenters[uf] || [-14.2, -51.9];
    const latitude = center[0] + (Math.random() - 0.5) * 5; 
    const longitude = center[1] + (Math.random() - 0.5) * 5;

    try {
      await prisma.cliente.upsert({
        where: { codigo_cliente: codCliente },
        update: {
          nome_cliente: nome,
          nome_abreviado: row['Nome Abreviado - Matriz'] || null,
          regiao: row['Região'] || null,
          uf: uf,
          cidade: row['Cidade'] || null,
          bairro: row['Bairro'] || null,
          cep: String(row['CEP'] || ''),
          endereco_completo: row['Endereço'] || null,
          cnpj: String(row['CNPJ'] || ''),
          repCode: repCode,
          latitude: latitude,
          longitude: longitude,
          // New fields
          supervisorName: row['Supervisor'] || null,
          classificacao: row['Classificação'] || null,
          semana: row['Semana'] || null,
          prioridade: row['Prioridade'] || null
        },
        create: {
          codigo_cliente: codCliente,
          nome_cliente: nome,
          nome_abreviado: row['Nome Abreviado - Matriz'] || null,
          regiao: row['Região'] || null,
          uf: uf,
          cidade: row['Cidade'] || null,
          bairro: row['Bairro'] || null,
          cep: String(row['CEP'] || ''),
          endereco_completo: row['Endereço'] || null,
          cnpj: String(row['CNPJ'] || ''),
          repCode: repCode,
          latitude: latitude,
          longitude: longitude,
          supervisorName: row['Supervisor'] || null,
          classificacao: row['Classificação'] || null,
          semana: row['Semana'] || null,
          prioridade: row['Prioridade'] || null
        }
      });
      count++;
    } catch (e) {
      console.error(`Erro ao upsert cliente ${codCliente}:`, e);
    }
  }

  console.log(`Sucesso: ${count} clientes importados.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
