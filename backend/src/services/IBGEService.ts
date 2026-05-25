import axios from 'axios';

export interface IBGEEstado {
  id: number;
  sigla: string;
  nome: string;
}

export interface IBGEMunicipio {
  id: number;
  nome: string;
}

export class IBGEService {
  private static BASE_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades';

  static async getEstados(): Promise<IBGEEstado[]> {
    try {
      const response = await axios.get<IBGEEstado[]>(`${this.BASE_URL}/estados?orderBy=nome`);
      return response.data;
    } catch (error) {
      console.error('[IBGEService] Erro ao buscar estados:', error);
      return [];
    }
  }

  static async getMunicipiosByEstado(uf: string): Promise<IBGEMunicipio[]> {
    try {
      const response = await axios.get<IBGEMunicipio[]>(`${this.BASE_URL}/estados/${uf}/municipios?orderBy=nome`);
      return response.data;
    } catch (error) {
      console.error('[IBGEService] Erro ao buscar municípios:', error);
      return [];
    }
  }

  static async validarLocalidade(uf: string, municipio: string): Promise<boolean> {
    const municipios = await this.getMunicipiosByEstado(uf);
    return municipios.some(m => m.nome.toLowerCase() === municipio.toLowerCase());
  }
}
