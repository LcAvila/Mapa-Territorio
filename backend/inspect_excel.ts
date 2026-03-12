import * as xlsx from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const excelPath = path.resolve('C:\\Users\\lucas_avila\\Desktop\\Mapa-Territorio\\frontend\\public\\Representantes\\Tabela Representantes.xlsx');
const workbook = xlsx.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

fs.writeFileSync('inspect_result.json', JSON.stringify(data.slice(0, 5), null, 2), 'utf8');
