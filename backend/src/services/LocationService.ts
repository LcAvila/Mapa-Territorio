// backend/src/services/LocationService.ts

import osmtogeojson from 'osmtogeojson';
import type { FeatureCollection } from 'geojson';

// Base oficial do IBGE
const IBGE_BASE_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades';

// Endpoint público do Overpass
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Ajuste os tipos conforme já existirem no seu projeto
export interface IbgeState {
  id: number;
  sigla: string;
  nome: string;
  [key: string]: any;
}

export interface IbgeCity {
  id: number;
  nome: string;
  microrregiao?: any;
  [key: string]: any;
}

export interface IbgeDistrict {
  id: number;
  nome: string;
  [key: string]: any;
}

export class LocationService {
  /**
   * Lista todos os estados (UFs) via API oficial do IBGE.
   * https://servicodados.ibge.gov.br/api/docs/localidades
   */
  static async getStates(): Promise<IbgeState[]> {
    const resp = await fetch(`${IBGE_BASE_URL}/estados?orderBy=nome`);

    if (!resp.ok) {
      throw new Error(`IBGE estados error: ${resp.status} ${resp.statusText}`);
    }

    const data = (await resp.json()) as IbgeState[];
    return data;
  }

  /**
   * Lista municípios de uma UF (sigla) via API do IBGE.
   */
  static async getCities(ufSigla: string): Promise<IbgeCity[]> {
    if (!ufSigla) throw new Error('UF inválida');

    const sigla = ufSigla.toUpperCase();
    const resp = await fetch(`${IBGE_BASE_URL}/estados/${sigla}/municipios`);

    if (!resp.ok) {
      throw new Error(
        `IBGE municipios error [${sigla}]: ${resp.status} ${resp.statusText}`
      );
    }

    const data = (await resp.json()) as IbgeCity[];
    return data;
  }

  /**
   * Lista distritos de um município a partir do código IBGE do MUNICÍPIO.
   * Usa /municipios/{id}/distritos como endpoint principal.
   */
  static async getDistricts(
    municipioIbgeCode: number
  ): Promise<IbgeDistrict[]> {
    if (!municipioIbgeCode) {
      throw new Error('Código IBGE do município inválido');
    }

    const resp = await fetch(
      `${IBGE_BASE_URL}/municipios/${municipioIbgeCode}/distritos`
    );

    if (!resp.ok) {
      throw new Error(
        `IBGE distritos error [${municipioIbgeCode}]: ${resp.status} ${resp.statusText}`
      );
    }

    const data = (await resp.json()) as IbgeDistrict[];
    return data;
  }

  /**
   * Retorna GeoJSON de bairros / subdivisões administrativas para um município (IBGE).
   *
   * Estratégia:
   * 1. Encontra a área do município (admin_level=8) pela tag IBGE:GEOCODIGO = código do município.
   * 2. Dentro dessa área, busca boundaries admin_level 9 ou 10 (bairros / subdistritos).
   * 3. Converte o JSON cru do Overpass para GeoJSON com osmtogeojson.
   */
  static async getNeighborhoodsGeoJSON(
    municipioIbgeCode: number
  ): Promise<FeatureCollection> {
    if (!municipioIbgeCode) {
      throw new Error('Código IBGE do município inválido');
    }

    const ibgeStr = String(municipioIbgeCode);

    const overpassQuery = `
      [out:json][timeout:60];

      // Município pelo código IBGE (admin_level 8)
      rel
        ["boundary"="administrative"]
        ["admin_level"="8"]
        ["IBGE:GEOCODIGO"="${ibgeStr}"];
      map_to_area->.mun;

      // Bairros / subdistritos dentro da área do município
      (
        rel(area.mun)
          ["boundary"="administrative"]
          ["admin_level"~"^(9|10)$"];
        way(area.mun)
          ["boundary"="administrative"]
          ["admin_level"~"^(9|10)$"];
      );
      out geom;
    `.trim();

    const resp = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        Accept: 'application/json',
        // Overpass exige UA identificável
        'User-Agent': 'MapaTerritorio/1.0 (+https://mapaterritorio.com)',
        Referer: 'https://mapaterritorio.com/'
      },
      body: overpassQuery
    });

    if (!resp.ok) {
      // Log detalhado no backend para depuração
      const text = await resp.text().catch(() => '');
      console.error(
        '[Location] Overpass response error:',
        resp.status,
        resp.statusText,
        text?.slice(0, 500)
      );

      // Mantém contrato da API: nunca quebra o cliente, só volta coleção vazia
      return {
        type: 'FeatureCollection',
        features: []
      };
    }

    const raw = await resp.json();

    const geojson = osmtogeojson(raw) as FeatureCollection;

    if (!geojson || geojson.type !== 'FeatureCollection') {
      return {
        type: 'FeatureCollection',
        features: []
      };
    }

    // Filtra features sem geometria válida
    geojson.features = geojson.features.filter(
      (f) => !!f.geometry && !!(f as any).geometry.coordinates
    );

    return geojson;
  }
}