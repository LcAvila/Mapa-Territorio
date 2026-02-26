import * as XLSX from "xlsx";
import { allTerritories } from "@/data/territories";
import { getRepByCode } from "@/data/representatives";

export function exportTerritoriesToExcel() {
    const data = allTerritories.map((t) => {
        const rep = getRepByCode(t.repCode);
        return {
            Município: t.municipio,
            UF: t.uf,
            Modo: t.modo === "planejamento" ? "Planejamento" : "Atendimento",
            "Código do Representante": t.repCode,
            "Nome do Representante": rep ? rep.name : "N/A",
            Status: rep?.isVago ? "VAGO" : "Ativo",
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Territórios");

    // Fix column widths
    const wscols = [
        { wch: 25 }, // Município
        { wch: 5 },  // UF
        { wch: 15 }, // Modo
        { wch: 15 }, // Código
        { wch: 30 }, // Nome
        { wch: 10 }, // Status
    ];
    worksheet["!cols"] = wscols;

    XLSX.writeFile(workbook, `Relatorio_Territorios_${new Date().toISOString().split('T')[0]}.xlsx`);
}
