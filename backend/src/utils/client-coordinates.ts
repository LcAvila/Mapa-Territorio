/**
 * Validação e resolução de coordenadas de clientes no Brasil.
 * Corrige lat/lng invertidos e re-geocodifica quando o ponto está fora do estado cadastrado.
 */

import { geocodeAddress } from './geocoding';

/** Limites aproximados do Brasil */
const BR_LAT = { min: -34, max: 6 };
const BR_LNG = { min: -75, max: -32 };

/** Limites por UF (principais estados do app) */
const UF_BOUNDS: Record<string, { latMin: number; latMax: number; lngMin: number; lngMax: number }> = {
  MA: { latMin: -10.9, latMax: -0.8, lngMin: -48.9, lngMax: -40.8 },
  PI: { latMin: -11.1, latMax: -4.8, lngMin: -45.5, lngMax: -40.5 },
  CE: { latMin: -7.9, latMax: -2.8, lngMin: -41.5, lngMax: -37.0 },
  RN: { latMin: -6.9, latMax: -4.8, lngMin: -38.6, lngMax: -34.9 },
  PA: { latMin: -9.2, latMax: 2.6, lngMin: -58.9, lngMax: -46.0 },
  SP: { latMin: -25.4, latMax: -19.7, lngMin: -53.1, lngMax: -44.0 },
  RJ: { latMin: -23.4, latMax: -20.7, lngMin: -44.9, lngMax: -40.9 },
  MG: { latMin: -22.9, latMax: -14.1, lngMin: -51.1, lngMax: -39.8 },
  BA: { latMin: -18.4, latMax: -8.5, lngMin: -46.7, lngMax: -37.3 },
  GO: { latMin: -19.5, latMax: -12.4, lngMin: -53.3, lngMax: -45.9 },
  DF: { latMin: -16.0, latMax: -15.5, lngMin: -48.3, lngMax: -47.3 },
};

export interface ClientAddressFields {
  endereco_completo?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  numero?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export function normalizeBrazilCoordinates(
  lat: number,
  lng: number
): { lat: number; lng: number } | null {
  let la = Number(lat);
  let ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;

  // Erro comum: latitude e longitude trocadas
  if (Math.abs(la) > 20 && Math.abs(ln) <= 20) {
    [la, ln] = [ln, la];
  }

  if (la < BR_LAT.min || la > BR_LAT.max || ln < BR_LNG.min || ln > BR_LNG.max) {
    return null;
  }

  return { lat: la, lng: ln };
}

export function isInUfBounds(
  lat: number,
  lng: number,
  uf?: string | null
): boolean {
  if (!uf) return true;
  const bounds = UF_BOUNDS[uf.trim().toUpperCase()];
  if (!bounds) return true;
  return (
    lat >= bounds.latMin &&
    lat <= bounds.latMax &&
    lng >= bounds.lngMin &&
    lng <= bounds.lngMax
  );
}

export function buildGeocodeQuery(c: ClientAddressFields): string {
  const parts = [
    c.endereco_completo,
    c.numero ? `nº ${c.numero}` : null,
    c.bairro,
    c.cidade,
    c.uf,
    c.cep?.replace(/\D/g, '').length === 8
      ? `${c.cep.replace(/\D/g, '').slice(0, 5)}-${c.cep.replace(/\D/g, '').slice(5)}`
      : c.cep,
    'Brasil',
  ].filter(Boolean);
  return parts.join(', ');
}

export async function resolveClientCoordinates(
  c: ClientAddressFields
): Promise<{ lat: number; lng: number; source: 'stored' | 'geocoded' } | null> {
  const uf = c.uf?.trim().toUpperCase() || null;

  if (c.latitude != null && c.longitude != null) {
    const norm = normalizeBrazilCoordinates(c.latitude, c.longitude);
    if (norm && isInUfBounds(norm.lat, norm.lng, uf)) {
      return { lat: norm.lat, lng: norm.lng, source: 'stored' };
    }
  }

  const query = buildGeocodeQuery(c);
  if (query.length < 8) return null;

  const geo = await geocodeAddress(query);
  if (geo) {
    const norm = normalizeBrazilCoordinates(geo.lat, geo.lng);
    if (norm && isInUfBounds(norm.lat, norm.lng, uf)) {
      return { lat: norm.lat, lng: norm.lng, source: 'geocoded' };
    }
  }

  if (c.cidade && c.uf) {
    const cityQuery = `${c.cidade}, ${c.uf}, Brasil`;
    const cityGeo = await geocodeAddress(cityQuery);
    if (cityGeo) {
      const norm = normalizeBrazilCoordinates(cityGeo.lat, cityGeo.lng);
      if (norm && isInUfBounds(norm.lat, norm.lng, uf)) {
        return { lat: norm.lat, lng: norm.lng, source: 'geocoded' };
      }
    }
  }

  return null;
}
