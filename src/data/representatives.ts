export interface Representative {
  code: string;
  name: string;
  fullName: string;
  isVago: boolean;
  colorIndex: number;
}

export const representatives: Representative[] = [
  { code: "47", name: "ITAPEL REPRESENTAÇÕES", fullName: "47 - ITAPEL REPRESENTACOES S/C LTDA.", isVago: false, colorIndex: 1 },
  { code: "80", name: "ILEO CARVALHO", fullName: "80 - ILEO CARVALHO LTDA-ME", isVago: false, colorIndex: 2 },
  { code: "93", name: "RIO SELL", fullName: "93 - RIO SELL REPRESENTACOES LTDA", isVago: false, colorIndex: 3 },
  { code: "107", name: "LUIZ C H BATISTA", fullName: "107 - LUIZ C H BATISTA ME", isVago: false, colorIndex: 4 },
  { code: "157", name: "JOILSON DE ALMEIDA", fullName: "157 - JOILSON DE ALMEIDA REPRESENTACOES", isVago: false, colorIndex: 5 },
  { code: "166", name: "DIRETA 8 - RIO DE JANEIRO", fullName: "166 - DIRETA 8 - RIO DE JANEIRO", isVago: false, colorIndex: 6 },
  { code: "X1", name: "VAGO 1", fullName: "X1 - VAGO 1", isVago: true, colorIndex: 0 },
  { code: "X2", name: "VAGO 2", fullName: "X2 - VAGO 2", isVago: true, colorIndex: 0 },
  { code: "X3", name: "VAGO 3", fullName: "X3 - VAGO 3", isVago: true, colorIndex: 0 },
];

export function getRepByCode(code: string): Representative | undefined {
  return representatives.find(r => r.code === code);
}

export function getRepColor(rep: Representative): string {
  if (rep.isVago) return "hsl(0, 0%, 40%)";
  const colors: Record<number, string> = {
    1: "hsl(200, 80%, 55%)",
    2: "hsl(340, 75%, 55%)",
    3: "hsl(45, 90%, 55%)",
    4: "hsl(270, 65%, 60%)",
    5: "hsl(150, 70%, 45%)",
    6: "hsl(25, 85%, 55%)",
    7: "hsl(190, 75%, 50%)",
  };
  return colors[rep.colorIndex] || "hsl(0, 0%, 50%)";
}
