/** UFs permitidos no mapa: territórios atribuídos + estado de atuação do perfil. */
export function buildAssignedStates(
  assignedState: string | null | undefined,
  territories?: { uf: string }[] | string[] | null
): string[] {
  const fromTerritories = territories
    ? Array.from(
        new Set(
          territories
            .map((t) => (typeof t === 'string' ? t : t.uf))
            .filter(Boolean)
        )
      )
    : [];
  if (assignedState) {
    return Array.from(new Set([...fromTerritories, assignedState]));
  }
  return fromTerritories;
}

/** Chave estável para dependências de useEffect (evita loop por nova referência de array). */
export function assignedStatesKey(states: string[]): string {
  return states.length === 0 ? '' : [...states].sort().join(',');
}
