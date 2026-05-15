// Territories are now managed via the Admin panel and stored in SQLite.
// This file only exports types. All data comes from the backend API.

export interface TerritoryAssignment {
  id: number;
  municipio: string;
  uf: string;
  userId?: number;
  modo: "planejamento" | "atendimento";
}

export interface BairroAssignment {
  id: number;
  bairro: string;
  regiao: string;
  municipio: string;
  uf: string;
  userId?: number;
  modo: "planejamento" | "atendimento";
}

// Static arrays are empty — all data is fetched from the backend at runtime.
export const allTerritories: TerritoryAssignment[] = [];
export const allBairros: BairroAssignment[] = [];

// Helper functions now accept a data array parameter (passed in from API data)
const normalize = (s: string) => 
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export function getMunicipioResponsaveis(
  municipio: string,
  uf: string,
  modo: "planejamento" | "atendimento",
  territories: TerritoryAssignment[] = []
): number[] {
  const targetMun = normalize(municipio);
  return territories
    .filter(t =>
      t.municipio &&
      normalize(t.municipio) === targetMun &&
      t.uf === uf &&
      t.modo === modo &&
      t.userId !== undefined
    )
    .map(t => t.userId as number);
}

export function getBairroResponsaveis(
  bairro: string,
  municipio: string,
  uf: string,
  modo: "planejamento" | "atendimento",
  bairros: BairroAssignment[] = []
): number[] {
  return bairros
    .filter(b =>
      b.bairro.toLowerCase() === bairro.toLowerCase() &&
      b.municipio.toLowerCase() === municipio.toLowerCase() &&
      b.uf === uf &&
      b.modo === modo &&
      b.userId !== undefined
    )
    .map(b => b.userId as number);
}

export function hasBairros(municipio: string, uf: string, bairros: BairroAssignment[] = []): boolean {
  return bairros.some(b =>
    b.municipio.toLowerCase() === municipio.toLowerCase() && b.uf === uf
  );
}
