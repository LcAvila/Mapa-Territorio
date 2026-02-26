// Representatives are now managed via the Admin panel and stored in SQLite.
// This file only exports the type and helper functions used across the app.

export interface Representative {
  code: string;
  name: string;
  fullName: string;
  isVago: boolean;
  colorIndex: number;
}

// These are populated at runtime by the API (see BrazilMap.tsx, Admin.tsx)
// The static array is empty — all data comes from the backend.
export const representatives: Representative[] = [];

// Color palette used to assign colors by index
export const REP_COLOR_PALETTE: Record<number, string> = {
  1: "hsl(200, 80%, 55%)",
  2: "hsl(340, 75%, 55%)",
  3: "hsl(45, 90%, 55%)",
  4: "hsl(270, 65%, 60%)",
  5: "hsl(150, 70%, 45%)",
  6: "hsl(25, 85%, 55%)",
  7: "hsl(190, 75%, 50%)",
  8: "hsl(10, 80%, 55%)",
  9: "hsl(85, 65%, 45%)",
  10: "hsl(300, 60%, 55%)",
  11: "hsl(60, 85%, 45%)",
  12: "hsl(240, 70%, 60%)",
};

export function getRepByCode(code: string, reps: Representative[] = []): Representative | undefined {
  return reps.find(r => r.code === code);
}

export function getRepColor(rep: Representative): string {
  if (rep.isVago) return "hsl(0, 0%, 40%)";
  return REP_COLOR_PALETTE[rep.colorIndex] || "hsl(0, 0%, 50%)";
}

export function getNextColorIndex(reps: Representative[]): number {
  const usedIndices = reps.filter(r => !r.isVago).map(r => r.colorIndex);
  for (let i = 1; i <= 12; i++) {
    if (!usedIndices.includes(i)) return i;
  }
  return (reps.length % 12) + 1;
}
