import * as xlsx from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const args = process.argv.slice(2);
const filePath = args[0] || 'C:\\Users\\lucas_avila\\Desktop\\Mapa-Territorio\\frontend\\public\\Clientes\\Clientes.xlsx';

const excelPath = path.resolve(filePath);
const workbook = xlsx.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

fs.writeFileSync('inspect_result.json', JSON.stringify(data.slice(0, 10), null, 2), 'utf8');
console.log(`Inspected ${filePath}. Results in inspect_result.json`);
