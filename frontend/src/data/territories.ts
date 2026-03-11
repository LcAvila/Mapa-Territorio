// Territories are now managed via the Admin panel and stored in SQLite.
// This file only exports types. All data comes from the backend API.

export interface TerritoryAssignment {
  id?: number;
  municipio: string;
  uf: string;
  repCode: string;
  modo: "planejamento" | "atendimento";
}

export interface BairroAssignment {
  bairro: string;
  regiao: string;
  municipio: string;
  uf: string;
  repCode: string;
  modo: "planejamento" | "atendimento";
}

// Static arrays are empty — all data is fetched from the backend at runtime.
export const allTerritories: TerritoryAssignment[] = [];
export const allBairros: BairroAssignment[] = [];

// Helper functions now accept a data array parameter (passed in from API data)
export function getMunicipioResponsaveis(
  municipio: string,
  uf: string,
  modo: "planejamento" | "atendimento",
  territories: TerritoryAssignment[] = []
): string[] {
  return territories
    .filter(t =>
      t.municipio.toLowerCase() === municipio.toLowerCase() &&
      t.uf === uf &&
      t.modo === modo
    )
    .map(t => t.repCode);
}

export function getBairroResponsaveis(
  bairro: string,
  municipio: string,
  uf: string,
  modo: "planejamento" | "atendimento",
  bairros: BairroAssignment[] = []
): string[] {
  return bairros
    .filter(b =>
      b.bairro.toLowerCase() === bairro.toLowerCase() &&
      b.municipio.toLowerCase() === municipio.toLowerCase() &&
      b.uf === uf &&
      b.modo === modo
    )
    .map(b => b.repCode);
}

export function hasBairros(municipio: string, uf: string, bairros: BairroAssignment[] = []): boolean {
  return bairros.some(b =>
    b.municipio.toLowerCase() === municipio.toLowerCase() && b.uf === uf
  );
}
