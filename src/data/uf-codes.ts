export interface UFInfo {
  sigla: string;
  nome: string;
  codigo: number;
  center: [number, number]; // [lat, lng]
  zoom: number;
}

export const UF_DATA: UFInfo[] = [
  { sigla: "AC", nome: "Acre", codigo: 12, center: [-9.0, -70.8], zoom: 7 },
  { sigla: "AL", nome: "Alagoas", codigo: 27, center: [-9.6, -36.6], zoom: 8 },
  { sigla: "AM", nome: "Amazonas", codigo: 13, center: [-3.4, -65.9], zoom: 6 },
  { sigla: "AP", nome: "Amapá", codigo: 16, center: [1.4, -51.8], zoom: 7 },
  { sigla: "BA", nome: "Bahia", codigo: 29, center: [-12.6, -41.7], zoom: 7 },
  { sigla: "CE", nome: "Ceará", codigo: 23, center: [-5.5, -39.3], zoom: 7 },
  { sigla: "DF", nome: "Distrito Federal", codigo: 53, center: [-15.8, -47.9], zoom: 10 },
  { sigla: "ES", nome: "Espírito Santo", codigo: 32, center: [-19.6, -40.5], zoom: 8 },
  { sigla: "GO", nome: "Goiás", codigo: 52, center: [-15.9, -49.3], zoom: 7 },
  { sigla: "MA", nome: "Maranhão", codigo: 21, center: [-5.1, -44.3], zoom: 7 },
  { sigla: "MG", nome: "Minas Gerais", codigo: 31, center: [-18.5, -44.6], zoom: 7 },
  { sigla: "MS", nome: "Mato Grosso do Sul", codigo: 50, center: [-20.8, -54.8], zoom: 7 },
  { sigla: "MT", nome: "Mato Grosso", codigo: 51, center: [-12.7, -56.1], zoom: 6 },
  { sigla: "PA", nome: "Pará", codigo: 15, center: [-3.5, -52.0], zoom: 6 },
  { sigla: "PB", nome: "Paraíba", codigo: 25, center: [-7.2, -36.8], zoom: 8 },
  { sigla: "PE", nome: "Pernambuco", codigo: 26, center: [-8.3, -37.9], zoom: 8 },
  { sigla: "PI", nome: "Piauí", codigo: 22, center: [-7.7, -42.7], zoom: 7 },
  { sigla: "PR", nome: "Paraná", codigo: 41, center: [-24.6, -51.3], zoom: 7 },
  { sigla: "RJ", nome: "Rio de Janeiro", codigo: 33, center: [-22.2, -43.2], zoom: 8 },
  { sigla: "RN", nome: "Rio Grande do Norte", codigo: 24, center: [-5.8, -36.5], zoom: 8 },
  { sigla: "RO", nome: "Rondônia", codigo: 11, center: [-10.9, -62.8], zoom: 7 },
  { sigla: "RR", nome: "Roraima", codigo: 14, center: [2.8, -61.4], zoom: 7 },
  { sigla: "RS", nome: "Rio Grande do Sul", codigo: 43, center: [-29.7, -53.5], zoom: 7 },
  { sigla: "SC", nome: "Santa Catarina", codigo: 42, center: [-27.2, -50.3], zoom: 8 },
  { sigla: "SE", nome: "Sergipe", codigo: 28, center: [-10.6, -37.4], zoom: 9 },
  { sigla: "SP", nome: "São Paulo", codigo: 35, center: [-22.2, -48.8], zoom: 7 },
  { sigla: "TO", nome: "Tocantins", codigo: 17, center: [-10.2, -48.3], zoom: 7 },
];

export function getUFByCode(codigo: number): UFInfo | undefined {
  return UF_DATA.find(u => u.codigo === codigo);
}

export function getUFBySigla(sigla: string): UFInfo | undefined {
  return UF_DATA.find(u => u.sigla === sigla);
}
