/** Verdes padrão do tema antigo — resetados ao trocar o fundo principal. */
const LEGACY_GREEN_PRESETS = new Set([
  '#155e21',
  '#1a7a2a',
  '#065f46',
  '#166534',
  '#14532d',
  '#134e28',
]);

export function normalizeHex(color: string): string {
  const c = color.trim().toLowerCase();
  if (!c.startsWith('#')) return c;
  if (c.length === 4) {
    return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
  }
  return c;
}

export function isLegacyGreenSidebarColor(color: string | null | undefined): boolean {
  if (!color) return false;
  return LEGACY_GREEN_PRESETS.has(normalizeHex(color));
}

/** Fundo do item pai quando um filho está ativo (tom mais escuro que o fundo). */
export function deriveParentActiveBg(baseColor: string): string {
  const hex = normalizeHex(baseColor);
  if (!hex.startsWith('#')) return `color-mix(in srgb, ${baseColor} 72%, black)`;
  return `color-mix(in srgb, ${hex} 72%, black)`;
}

/** Hover dos itens da sidebar. */
export function deriveSidebarHoverBg(baseColor: string): string {
  const hex = normalizeHex(baseColor);
  if (!hex.startsWith('#')) return `color-mix(in srgb, ${baseColor} 85%, black)`;
  return `color-mix(in srgb, ${hex} 85%, black)`;
}
