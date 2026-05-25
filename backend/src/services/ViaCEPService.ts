import axios from 'axios';

export interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

export class ViaCEPService {
  private static BASE_URL = 'https://viacep.com.br/ws';

  static async getAddressByCep(cep: string): Promise<ViaCEPResponse | null> {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      throw new Error('CEP inválido. Deve conter 8 dígitos.');
    }

    try {
      const response = await axios.get<ViaCEPResponse>(`${this.BASE_URL}/${cleanCep}/json/`);
      if (response.data.erro) {
        return null;
      }
      return response.data;
    } catch (error) {
      console.error('[ViaCEPService] Erro ao buscar CEP:', error);
      throw new Error('Falha ao consultar o serviço ViaCEP.');
    }
  }
}
