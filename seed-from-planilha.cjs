/**
 * seed-from-planilha.cjs
 * Imports real data from the spreadsheet into the SQLite database.
 * Run with: node seed-from-planilha.cjs
 */
const XLSX = require('xlsx');
const db = require('./database.cjs');

const REP_COLORS = [
    '#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6',
    '#EF4444', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

// ── Parse representative string "47 - ITAPEL REPRESENTACOES S/C LTDA." ──────
function parseRep(repStr) {
    const match = repStr.trim().match(/^(\d+)\s*-\s*(.+)$/);
    if (!match) return null;
    const code = match[1];
    const fullName = match[2].trim();
    // Short name: remove LTDAs, MEs, etc.
    const shortName = fullName
        .replace(/\s*(S\/C\s*LTDA\.?|LTDA\.?|EIRELI|ME|EPP|SA\.?)\s*$/i, '')
        .trim();
    return { code, name: shortName, fullName };
}

const wb = XLSX.readFile('public/Planilhas/Divisão base RJ 2026 - atendimento 12.02.2026.xlsx');

// ── Read cidade sheet ──────────────────────────────────────────────────────
const cidadeRaw = XLSX.utils.sheet_to_json(wb.Sheets['cidade'], { header: 1, defval: '' });
const bairroRaw = XLSX.utils.sheet_to_json(wb.Sheets['bairro'], { header: 1, defval: '' });

const cityAssignments = [];
const bairroAssignments = [];
const repsMap = new Map();

cidadeRaw.forEach(row => {
    const cidade = String(row[0] || '').trim();
    const repStr = String(row[1] || '').trim();
    if (!cidade || !repStr || cidade === 'Cidade' || cidade.toLowerCase().includes('abertura')) return;
    const rep = parseRep(repStr);
    if (!rep) return;
    repsMap.set(rep.code, rep);
    cityAssignments.push({ municipio: cidade, uf: 'RJ', repCode: rep.code, modo: 'atendimento' });
});

bairroRaw.forEach(row => {
    const bairro = String(row[0] || '').trim();
    const repStr = String(row[1] || '').trim();
    if (!bairro || !repStr || bairro.length < 2 || !repStr.includes(' - ')) return;
    const rep = parseRep(repStr);
    if (!rep) return;
    repsMap.set(rep.code, rep);
    bairroAssignments.push({ municipio: 'RIO DE JANEIRO', uf: 'RJ', bairro, repCode: rep.code, modo: 'atendimento' });
});

console.log(`Found ${repsMap.size} representatives, ${cityAssignments.length} city assignments, ${bairroAssignments.length} bairro assignments`);

// ── Insert/update representatives ──────────────────────────────────────────
let colorIdx = 0;
const insertRep = db.prepare(`
  INSERT OR IGNORE INTO representatives (code, name, fullName, isVago, colorIndex)
  VALUES (?, ?, ?, 0, ?)
`);

const repInsertMany = db.transaction(() => {
    for (const [code, rep] of repsMap.entries()) {
        const existing = db.prepare('SELECT code FROM representatives WHERE code = ?').get(code);
        if (!existing) {
            insertRep.run(code, rep.name, rep.fullName, colorIdx % REP_COLORS.length + 1);
            colorIdx++;
            console.log(`  ✓ Rep ${code}: ${rep.name}`);
        } else {
            console.log(`  ~ Rep ${code} already exists, skipping`);
        }
    }
});
repInsertMany();

// ── Insert territories ────────────────────────────────────────────────────
const insertTerritory = db.prepare(`
  INSERT OR IGNORE INTO territories (municipio, uf, repCode, modo)
  VALUES (?, ?, ?, ?)
`);

const insertTerritories = db.transaction(() => {
    let count = 0;
    for (const t of cityAssignments) {
        const result = insertTerritory.run(t.municipio, t.uf, t.repCode, t.modo);
        if (result.changes > 0) count++;
    }
    console.log(`  ✓ Inserted ${count} city territories`);
});
insertTerritories();

// ── Summary ───────────────────────────────────────────────────────────────
const totalReps = db.prepare('SELECT COUNT(*) as n FROM representatives').get().n;
const totalTerr = db.prepare('SELECT COUNT(*) as n FROM territories').get().n;
console.log(`\nDatabase now has: ${totalReps} representatives, ${totalTerr} territories`);
console.log('Done!');
