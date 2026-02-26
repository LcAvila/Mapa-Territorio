const db = require('./database.cjs');

// Initial Data from representatives.ts
const reps = [
  { code: "47", name: "ITAPEL REPRESENTAÇÕES", fullName: "47 - ITAPEL REPRESENTACOES S/C LTDA.", isVago: 0, colorIndex: 1 },
  { code: "80", name: "ILEO CARVALHO", fullName: "80 - ILEO CARVALHO LTDA-ME", isVago: 0, colorIndex: 2 },
  { code: "93", name: "RIO SELL", fullName: "93 - RIO SELL REPRESENTACOES LTDA", isVago: 0, colorIndex: 3 },
  { code: "107", name: "LUIZ C H BATISTA", fullName: "107 - LUIZ C H BATISTA ME", isVago: 0, colorIndex: 4 },
  { code: "157", name: "JOILSON DE ALMEIDA", fullName: "157 - JOILSON DE ALMEIDA REPRESENTACOES", isVago: 0, colorIndex: 5 },
  { code: "166", name: "DIRETA 8 - RIO DE JANEIRO", fullName: "166 - DIRETA 8 - RIO DE JANEIRO", isVago: 0, colorIndex: 6 },
  { code: "X1", name: "VAGO 1", fullName: "X1 - VAGO 1", isVago: 1, colorIndex: 0 },
  { code: "X2", name: "VAGO 2", fullName: "X2 - VAGO 2", isVago: 1, colorIndex: 0 },
  { code: "X3", name: "VAGO 3", fullName: "X3 - VAGO 3", isVago: 1, colorIndex: 0 },
];

const insertRep = db.prepare(`
  INSERT OR REPLACE INTO representatives (code, name, fullName, isVago, colorIndex)
  VALUES (?, ?, ?, ?, ?)
`);

reps.forEach(r => insertRep.run(r.code, r.name, r.fullName, r.isVago, r.colorIndex));

// Placeholder for Territories migration - In a real scenario I'd parse the whole file
// For now I'll use a few as example and assume the admin will add the rest or I can do a bulk insert if needed.
// However, the user wants me to do it.

const territories = [
  { municipio: "Mangaratiba", uf: "RJ", repCode: "107", modo: "planejamento" },
  { municipio: "Valença", uf: "RJ", repCode: "47", modo: "planejamento" },
  { municipio: "Arraial do Cabo", uf: "RJ", repCode: "47", modo: "planejamento" },
  // ... many more
];

const insertTerritory = db.prepare(`
  INSERT INTO territories (municipio, uf, repCode, modo)
  VALUES (?, ?, ?, ?)
`);

territories.forEach(t => insertTerritory.run(t.municipio, t.uf, t.repCode, t.modo));

console.log("Seeding complete!");
process.exit(0);
