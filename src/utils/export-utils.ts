import * as XLSX from "xlsx";

const API = "http://localhost:3001";

interface Representative {
    code: string;
    name: string;
    fullName: string;
    isVago: boolean;
    colorIndex: number;
}

interface Territory {
    id: number;
    municipio: string;
    uf: string;
    repCode: string;
    modo: string;
}

// Fetches live data from the API and exports to Excel
export async function exportTerritoriesToExcel(): Promise<void> {
    const [repsRes, terrRes] = await Promise.all([
        fetch(`${API}/api/representatives`),
        fetch(`${API}/api/territories`),
    ]);

    const reps: Representative[] = repsRes.ok ? await repsRes.json() : [];
    const territories: Territory[] = terrRes.ok ? await terrRes.json() : [];

    const repMap = new Map(reps.map(r => [r.code, r]));

    if (territories.length === 0) {
        throw new Error("Nenhum território cadastrado para exportar");
    }

    // ── Sheet 1: Territories ────────────────────────────────────────────────
    const terrData = territories.map(t => {
        const rep = repMap.get(t.repCode);
        return {
            "Município": t.municipio,
            "UF": t.uf,
            "Modo": t.modo === "planejamento" ? "Planejamento" : "Atendimento",
            "Cód. Representante": t.repCode,
            "Nome Representante": rep ? rep.name : "N/A",
            "Nome Completo": rep ? rep.fullName : "N/A",
            "Status": rep?.isVago ? "VAGO" : "Ativo",
        };
    });

    const wsTerritorios = XLSX.utils.json_to_sheet(terrData);
    wsTerritorios["!cols"] = [
        { wch: 28 }, // Município
        { wch: 6 },  // UF
        { wch: 16 }, // Modo
        { wch: 16 }, // Cód
        { wch: 32 }, // Nome
        { wch: 40 }, // Nome Completo
        { wch: 10 }, // Status
    ];

    // ── Sheet 2: Representantes ─────────────────────────────────────────────
    const repData = reps.map(r => {
        const count = territories.filter(t => t.repCode === r.code).length;
        const planej = territories.filter(t => t.repCode === r.code && t.modo === "planejamento").length;
        const atend = territories.filter(t => t.repCode === r.code && t.modo === "atendimento").length;
        return {
            "Código": r.code,
            "Nome": r.name,
            "Nome Completo": r.fullName,
            "Status": r.isVago ? "VAGO" : "Ativo",
            "Total Municípios": count,
            "Planejamento": planej,
            "Atendimento": atend,
        };
    });

    const wsRepresentantes = XLSX.utils.json_to_sheet(repData);
    wsRepresentantes["!cols"] = [
        { wch: 10 }, // Código
        { wch: 28 }, // Nome
        { wch: 40 }, // Nome Completo
        { wch: 10 }, // Status
        { wch: 16 }, // Total
        { wch: 16 }, // Planejamento
        { wch: 16 }, // Atendimento
    ];

    // ── Sheet 3: Summary by UF ──────────────────────────────────────────────
    const ufGroups = new Map<string, Territory[]>();
    territories.forEach(t => {
        const existing = ufGroups.get(t.uf) || [];
        existing.push(t);
        ufGroups.set(t.uf, existing);
    });

    const ufData = Array.from(ufGroups.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([uf, terrs]) => ({
            "UF": uf,
            "Total Municípios": terrs.length,
            "Planejamento": terrs.filter(t => t.modo === "planejamento").length,
            "Atendimento": terrs.filter(t => t.modo === "atendimento").length,
            "Representantes": [...new Set(terrs.map(t => t.repCode))].join(", "),
        }));

    const wsSummary = XLSX.utils.json_to_sheet(ufData);
    wsSummary["!cols"] = [
        { wch: 8 },  // UF
        { wch: 18 }, // Total
        { wch: 16 }, // Planejamento
        { wch: 16 }, // Atendimento
        { wch: 50 }, // Representantes
    ];

    // ── Build workbook ───────────────────────────────────────────────────────
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsTerritorios, "Territórios");
    XLSX.utils.book_append_sheet(workbook, wsRepresentantes, "Representantes");
    XLSX.utils.book_append_sheet(workbook, wsSummary, "Resumo por UF");

    const date = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `Relatorio_Territorios_${date}.xlsx`);
}
