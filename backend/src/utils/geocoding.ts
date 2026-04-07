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
  // Se não houver HERE_API_KEY definida, usa o OpenStreetMap (Nominatim) gratuitamente
  if (!API_KEY) {
    try {
      console.log(`[Geocoding] HERE_API_KEY ausente. Usando Nominatim API (OSM) para: ${address}`);
      const endpoint = `https://nominatim.openstreetmap.org/search`;
      const response = await axios.get(endpoint, {
        params: {
          q: `${address}, Brasil`,
          format: 'json',
          limit: 1
        },
        headers: {
          'User-Agent': 'MapaTerritorio-App/1.0 (Integration)'
        }
      });
      
      const items = response.data;
      if (items && items.length > 0) {
        return {
          lat: parseFloat(items[0].lat),
          lng: parseFloat(items[0].lon),
          formattedAddress: items[0].display_name
        };
      }
      return null;
    } catch (error) {
      console.error('[Geocoding] Erro ao consultar API Nominatim (OSM):', error);
      return null;
    }
  }

  // Comportamento original da HERE Maps...
  try {
    const response = await axios.get<HereGeocodeResponse>(GEOCODE_URL, {
      params: {
        q: `${address}, Brasil`,
        apiKey: API_KEY,
        in: 'countryCode:BRA',
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

