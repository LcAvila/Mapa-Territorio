import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.HERE_API_KEY;
const GEOCODE_URL = 'https://geocode.search.hereapi.com/v1/geocode';

interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress?: string;
}

interface HereGeocodeResponse {
  items: Array<{
    position: {
      lat: number;
      lng: number;
    };
    address: {
      label: string;
    };
  }>;
}

/**
 * Converte um endereço textual em coordenadas (latitude e longitude)
 * usando a API do HERE Maps.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!API_KEY) {
    console.error('[Geocoding] Erro: HERE_API_KEY não configurada no .env');
    return null;
  }

  try {
    const response = await axios.get<HereGeocodeResponse>(GEOCODE_URL, {
      params: {
        q: `${address}, Brasil`, // Reforça o país na query
        apiKey: API_KEY,
        in: 'countryCode:BRA', // Restrição oficial por código de país (ISO 3166-1 alpha-3)
        limit: 1
      }
    });

    const items = response.data.items;
    if (items && items.length > 0) {
      const { lat, lng } = items[0].position;
      return {
        lat,
        lng,
        formattedAddress: items[0].address.label
      };
    }

    return null;
  } catch (error) {
    console.error('[Geocoding] Erro ao consultar API do HERE:', error);
    return null;
  }
}
