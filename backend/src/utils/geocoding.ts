/**
 * @file geocoding.ts
 * @description Geocoding service that converts addresses to coordinates.
 * Uses HERE API (primary) or Nominatim/OSM (fallback when no API key).
 * Includes in-memory cache and rate-limiting to comply with Nominatim usage policy.
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

// ─── Geocoding Cache ──────────────────────────────────────────────────────────
const geocodeCache = new Map<string, { result: GeocodeResult | null; expiresAt: number }>();
const GEOCODE_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const GEOCODE_CACHE_MAX = 5000;

function getCacheKey(address: string): string {
  return address.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getCached(address: string): GeocodeResult | null | undefined {
  const entry = geocodeCache.get(getCacheKey(address));
  if (entry && entry.expiresAt > Date.now()) return entry.result;
  return undefined; // undefined = not in cache
}

function setCache(address: string, result: GeocodeResult | null) {
  if (geocodeCache.size >= GEOCODE_CACHE_MAX) {
    const firstKey = geocodeCache.keys().next().value;
    if (firstKey) geocodeCache.delete(firstKey);
  }
  geocodeCache.set(getCacheKey(address), { result, expiresAt: Date.now() + GEOCODE_CACHE_TTL });
}

// ─── Rate Limiter (Nominatim: max 1 req/sec) ─────────────────────────────────
let lastNominatimCall = 0;
const NOMINATIM_MIN_INTERVAL = 1100; // 1.1s to be safe

async function waitForNominatimSlot(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastNominatimCall;
  if (elapsed < NOMINATIM_MIN_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, NOMINATIM_MIN_INTERVAL - elapsed));
  }
  lastNominatimCall = Date.now();
}

// ─── Input sanitization ───────────────────────────────────────────────────────
function sanitizeAddress(address: string): string {
  // Remove control characters and limit length
  return address.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 500);
}

/**
 * Geocode an address to coordinates.
 * Returns cached result if available, otherwise queries HERE or Nominatim.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || address.trim().length < 3) return null;

  const cleanAddress = sanitizeAddress(address);

  // Check cache first
  const cached = getCached(cleanAddress);
  if (cached !== undefined) {
    return cached;
  }

  // Use Nominatim if no HERE API key
  if (!API_KEY) {
    try {
      await waitForNominatimSlot();
      console.log(`[Geocoding] Using Nominatim for: ${cleanAddress}`);
      const endpoint = `https://nominatim.openstreetmap.org/search`;
      const response = await axios.get(endpoint, {
        params: {
          q: `${cleanAddress}, Brasil`,
          format: 'json',
          limit: 1
        },
        headers: {
          'User-Agent': 'MapaTerritorio-App/1.0 (Integration)'
        },
        timeout: 10000
      });
      
      const items = response.data;
      if (items && items.length > 0) {
        const result: GeocodeResult = {
          lat: parseFloat(items[0].lat),
          lng: parseFloat(items[0].lon),
          formattedAddress: items[0].display_name
        };
        setCache(cleanAddress, result);
        return result;
      }
      setCache(cleanAddress, null);
      return null;
    } catch (error) {
      console.error('[Geocoding] Nominatim error:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  // Use HERE API (primary)
  try {
    const response = await axios.get<HereGeocodeResponse>(GEOCODE_URL, {
      params: {
        q: `${cleanAddress}, Brasil`,
        apiKey: API_KEY,
        in: 'countryCode:BRA',
        limit: 1
      },
      timeout: 10000
    });

    const items = response.data.items;
    if (items && items.length > 0) {
      const { lat, lng } = items[0].position;
      const result: GeocodeResult = {
        lat,
        lng,
        formattedAddress: items[0].address.label
      };
      setCache(cleanAddress, result);
      return result;
    }

    setCache(cleanAddress, null);
    return null;
  } catch (error) {
    console.error('[Geocoding] HERE API error:', error instanceof Error ? error.message : error);
    return null;
  }
}
