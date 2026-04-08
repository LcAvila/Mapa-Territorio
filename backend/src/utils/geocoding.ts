/**
 * @file geocoding.ts
 * @description Esse aqui é o GPS do sistema, morou?
 * Ele pega o endereço que o usuário digitou e transforma em latitude e longitude (os números que o mapa entende).
 * Se não tiver a chave da API do HERE (o VIP das localizações), ele usa o Nominatim (do OpenStreetMap), 
 * que é 0800 mas às vezes dá uma vacilada se o endereço não tiver certinho.
 * 
 * @author Cria de Nova Iguaçu
 */

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
 * geocodeAddress - A mágica que acha o lugar no mapa.
 * Se o endereço tiver incompleto, a chance de 'dar ruim' e não voltar nada é grande!
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  // Se tu esqueceu de colocar a chave do HERE no .env, vamos de Nominatim (que é de graça).
  if (!API_KEY) {
    try {
      console.log(`[Geocoding] Chave do HERE sumiu! Usando o 'plano B' (Nominatim) para: ${address}`);
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
      console.error('[Geocoding] Nominatim deu erro, mó climão:', error);
      return null;
    }
  }

  // Se tiver a chave do HERE (o bagulho é doido!), usa ela que é mais certeira.
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
    console.error('[Geocoding] API do HERE chorou:', error);
    return null;
  }
}

