import axios from 'axios';
import dotenv from 'dotenv';
import { prisma } from '../prisma';

dotenv.config();

const BRASIL_ABERTO_BASE = 'https://api.brasilaberto.com/v1';
const IBGE_LOC = 'https://servicodados.ibge.gov.br/api/v1/localidades';
const TOKEN = process.env.BRASIL_ABERTO_TOKEN;

// In-memory cache (24h TTL) - keep for very frequent hits
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24;

export interface State {
  id: number;
  name: string;
  shortname: string;
  region: string;
}

export interface City {
  id: number;
  name: string;
  stateId: number;
  ibgeCode: number;
}

export interface District {
  id: number;
  name: string;
  cityId: number;
}

export class LocationService {
  private static brasilAbertoHeaders() {
    return TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};
  }

  private static getCached<T>(key: string): T | null {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data as T;
    return null;
  }

  private static setCache(key: string, data: unknown) {
    cache.set(key, { data, timestamp: Date.now() });
  }

  // ── Persistent Cache Helpers (Database) ───────────────────────────────────
  private static async getFromDBCache(key: string): Promise<any | null> {
    try {
      const config = await prisma.configSistema.findUnique({
        where: { parametro: `geojson_cache_${key}` }
      });
      if (config && config.valor) {
        return JSON.parse(config.valor);
      }
    } catch (e) {
      console.error(`[LocationService] DB cache read failed for ${key}`, e);
    }
    return null;
  }

  private static async setToDBCache(key: string, data: any) {
    try {
      const valor = JSON.stringify(data);
      await prisma.configSistema.upsert({
        where: { parametro: `geojson_cache_${key}` },
        update: { valor, data_atualizacao: new Date() },
        create: { 
          parametro: `geojson_cache_${key}`, 
          valor, 
          descricao: `Cache de GeoJSON para localidade ${key}`
        }
      });
    } catch (e) {
      console.error(`[LocationService] DB cache write failed for ${key}`, e);
    }
  }

  // ── States ────────────────────────────────────────────────────────────────

  static async getStates(): Promise<State[]> {
    const cacheKey = 'states';
    const cached = this.getCached<State[]>(cacheKey);
    if (cached) return cached;

    // Try Brasil Aberto first (only if token exists)
    if (TOKEN) {
      try {
        const res = await axios.get(`${BRASIL_ABERTO_BASE}/states`, {
          headers: this.brasilAbertoHeaders(), timeout: 8000,
        });
        const states: State[] = res.data.result.map((s: { id: number; name: string; shortName: string; region: string }) => ({
          id: s.id, name: s.name, shortname: s.shortName, region: s.region,
        }));
        this.setCache(cacheKey, states);
        return states;
      } catch {
        console.warn('[LocationService] Brasil Aberto indisponível, usando IBGE...');
      }
    }

    // Fallback: IBGE
    const res = await axios.get(`${IBGE_LOC}/estados?orderBy=nome`, { timeout: 10000 });
    const states: State[] = res.data.map((s: { id: number; nome: string; sigla: string; regiao: { nome: string } }) => ({
      id: s.id, name: s.nome, shortname: s.sigla, region: s.regiao.nome,
    }));
    this.setCache(cacheKey, states);
    return states;
  }

  // ── Cities ─────────────────────────────────────────────────────────────────

  static async getCities(stateShortName: string): Promise<City[]> {
    const cacheKey = `cities_${stateShortName}`;
    const cached = this.getCached<City[]>(cacheKey);
    if (cached) return cached;

    // Try Brasil Aberto first
    if (TOKEN) {
      try {
        const res = await axios.get(`${BRASIL_ABERTO_BASE}/cities/${stateShortName}`, {
          headers: this.brasilAbertoHeaders(), timeout: 8000,
        });
        const cities: City[] = res.data.result.map((c: { id: number; name: string; stateId: number; ibgeCode: number }) => ({
          id: c.id, name: c.name, stateId: c.stateId, ibgeCode: c.ibgeCode,
        }));
        this.setCache(cacheKey, cities);
        return cities;
      } catch {
        console.warn(`[LocationService] Brasil Aberto indisponível para ${stateShortName}, usando IBGE...`);
      }
    }

    // Fallback: IBGE — find state id by sigla
    const statesRes = await axios.get(`${IBGE_LOC}/estados?orderBy=nome`, { timeout: 10000 });
    const state = statesRes.data.find((s: { sigla: string; id: number }) =>
      s.sigla.toUpperCase() === stateShortName.toUpperCase()
    );
    if (!state) throw new Error(`Estado "${stateShortName}" não encontrado`);

    const citiesRes = await axios.get(`${IBGE_LOC}/estados/${state.id}/municipios`, { timeout: 10000 });
    const cities: City[] = citiesRes.data.map((c: { id: number; nome: string }) => ({
      id: c.id, name: c.nome, stateId: state.id, ibgeCode: c.id,
    }));
    this.setCache(cacheKey, cities);
    return cities;
  }

  // ── Districts ──────────────────────────────────────────────────────────────

  static async getDistricts(ibgeCode: number): Promise<District[]> {
    const cacheKey = `districts_${ibgeCode}`;
    const cached = this.getCached<District[]>(cacheKey);
    if (cached) return cached;

    // Try Brasil Aberto
    if (TOKEN) {
      try {
        const res = await axios.get(`${BRASIL_ABERTO_BASE}/districts-by-ibge-code/${ibgeCode}`, {
          headers: this.brasilAbertoHeaders(), timeout: 8000,
        });
        const districts: District[] = res.data.result.map((d: { id: number; name: string; cityId: number }) => ({
          id: d.id, name: d.name, cityId: d.cityId,
        }));
        this.setCache(cacheKey, districts);
        return districts;
      } catch {
        console.warn(`[LocationService] Brasil Aberto indisponível para bairros ${ibgeCode}.`);
      }
    }

    // Fallback: IBGE subdistritos/distritos
    try {
      const [subsRes, distsRes] = await Promise.all([
        axios.get(`${IBGE_LOC}/municipios/${ibgeCode}/subdistritos`, { timeout: 10000 }),
        axios.get(`${IBGE_LOC}/municipios/${ibgeCode}/distritos`, { timeout: 10000 }),
      ]);
      const subs: { id: number; nome: string }[] = Array.isArray(subsRes.data) ? subsRes.data : [];
      const dists: { id: number; nome: string }[] = Array.isArray(distsRes.data) ? distsRes.data : [];
      const localities = subs.length > 0 ? subs : dists;
      const districts: District[] = localities.map(l => ({ id: l.id, name: l.nome, cityId: ibgeCode }));
      this.setCache(cacheKey, districts);
      return districts;
    } catch {
      console.warn(`[LocationService] IBGE também falhou para bairros ${ibgeCode}.`);
      return [];
    }
  }

  // ── Neighborhoods GeoJSON ──────────────────────────────────────────────────

  static async getNeighborhoodsGeoJSON(ibgeCode: number): Promise<any> {
    const cacheKey = `neighborhoods_geojson_${ibgeCode}`;
    
    // 1. Check Memory Cache
    const memoryCached = this.getCached<any>(cacheKey);
    if (memoryCached) return memoryCached;

    // 2. Check Database Cache
    const dbCached = await this.getFromDBCache(cacheKey);
    if (dbCached) {
      this.setCache(cacheKey, dbCached); // Fill memory cache
      return dbCached;
    }

    const IBGE_MALHAS = 'https://servicodados.ibge.gov.br/api/v3/malhas';
    const IBGE_LOC = 'https://servicodados.ibge.gov.br/api/v1/localidades';

    try {
      // Step 1: Get subdivisions metadata (subdistritos or distritos)
      const [subsRes, distsRes] = await Promise.all([
        axios.get(`${IBGE_LOC}/municipios/${ibgeCode}/subdistritos`, { timeout: 5000 }),
        axios.get(`${IBGE_LOC}/municipios/${ibgeCode}/distritos`, { timeout: 5000 }),
      ]);
      const subs = Array.isArray(subsRes.data) ? subsRes.data : [];
      const dists = Array.isArray(distsRes.data) ? distsRes.data : [];
      const localities = subs.length > 0 ? subs : dists;
      const level = subs.length > 0 ? 'subdistritos' : 'distritos';

      if (localities.length > 0) {
        // Optimized: Fetch all in parallel with limited concurrency (simple Promise.all here)
        const featureRequests = localities.map(async (loc: any) => {
          try {
            const url = `${IBGE_MALHAS}/${level}/${loc.id}?formato=application/vnd.geo+json&qualidade=minima`;
            const res = await axios.get(url, { timeout: 10000 });
            const data = res.data;
            const feats = Array.isArray(data?.features) ? data.features : [];
            
            return feats.map((feat: any) => ({
              ...feat,
              properties: { ...(feat.properties || {}), nome: loc.nome, localidadeId: loc.id }
            }));
          } catch { return []; }
        });

        const allFeatures = (await Promise.all(featureRequests)).flat().filter(Boolean);
        if (allFeatures.length > 0) {
          const result = { type: 'FeatureCollection', features: allFeatures };
          this.setCache(cacheKey, result);
          await this.setToDBCache(cacheKey, result);
          return result;
        }
      }
    } catch (e) {
      console.warn(`[LocationService] IBGE malhas failed for ${ibgeCode}, falling back to Overpass...`);
    }

    // Step 2: Overpass Fallback (Resilient Version)
    try {
      // Tenta primeiro admin_level 9 e 10, depois place=suburb/neighbourhood
      const overpassQuery = `[out:json][timeout:90];
(
  rel["ref:IBGE"="${ibgeCode}"]["boundary"="administrative"];
  way["ref:IBGE"="${ibgeCode}"]["boundary"="administrative"];
)->.m;
map_to_area .m->.searchArea;
(
  wr["boundary"~"administrative|postal_code"]["admin_level"~"9|10"](area.searchArea);
  wr["place"~"suburb|neighbourhood|district|quarter|city_district"](area.searchArea);
  wr["admin_level"="8"](area.searchArea);
);
out geom;`;
      
      const res = await axios.get(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`, { timeout: 60000 });
      const elements = res.data?.elements || [];
      
      const features = elements
        .filter((el: any) => {
          // Filtra para evitar que o próprio município (admin_level 8) seja incluído como bairro
          if (el.tags?.["ref:IBGE"] === String(ibgeCode)) return false;
          return true;
        })
        .map((el: any) => {
          let coordinates: any[] = [];
          
          if (el.type === 'way' && el.geometry) {
            coordinates = [el.geometry.map((g: any) => [g.lon, g.lat])];
          } else if (el.type === 'relation' && el.members) {
            // Coleta todos os caminhos que formam o polígono externo da relação
            const outerWays = el.members?.filter((m: any) => m.role === 'outer' || !m.role);
            if (outerWays && outerWays.length > 0) {
              coordinates = outerWays
                .filter((m: any) => m.type === 'way' && m.geometry && m.geometry.length > 2)
                .map((m: any) => m.geometry.map((g: any) => [g.lon, g.lat]));
            }
          }

          if (!coordinates || coordinates.length === 0) return null;

          return {
            type: 'Feature',
            properties: { 
              nome: el.tags?.name || el.tags?.official_name || el.tags?.description || el.tags?.name_en || 'Bairro', 
              osm_id: el.id,
              admin_level: el.tags?.admin_level,
              place: el.tags?.place
            },
            geometry: { 
              type: coordinates.length === 1 ? 'Polygon' : 'MultiPolygon', 
              coordinates: coordinates.length === 1 ? coordinates : [coordinates] 
            }
          };
        }).filter(Boolean);

      if (features.length > 0) {
        const result = { type: 'FeatureCollection', features };
        this.setCache(cacheKey, result);
        await this.setToDBCache(cacheKey, result);
        return result;
      }
    } catch (e) {
      console.error(`[LocationService] Overpass failed for ${ibgeCode}:`, e);
    }

    return { type: 'FeatureCollection', features: [] };
  }
}
