const XLSX = require('xlsx');
const path = require('path');

const excelPath = 'C:\\Users\\Avila\\Documents\\Mapa-Territorio\\frontend\\public\\Cad Representantes\\Login Rep.xlsx';

try {
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Imprime as primeiras 5 linhas para ver o cabeçalho e estrutura
  console.log('--- ESTRUTURA DA PLANILHA ---');
  data.slice(0, 5).forEach((row, i) => {
    console.log(`Linha ${i}:`, row);
  });
  
  // Tenta mapear o cabeçalho
  const headers = data[0];
  console.log('\n--- CABEÇALHOS DETECTADOS ---');
  headers.forEach((h, i) => console.log(`${i}: ${h}`));

} catch (error) {
  console.error('Erro ao ler a planilha:', error.message);
}
