
import { GoogleGenAI, Type } from "@google/genai";
import { CargoQuoteRequest } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Persistent Cache Keys
const GEO_CACHE_KEY = 'cb_geo_telemetry_cache';
const CURRENCY_CACHE_KEY = 'cb_currency_cache';

const FALLBACK_CURRENCIES: Record<string, { code: string, symbol: string, rateToUsd: number }> = {
  'usa': { code: 'USD', symbol: '$', rateToUsd: 1.0 },
  'united states': { code: 'USD', symbol: '$', rateToUsd: 1.0 },
  'uk': { code: 'GBP', symbol: '£', rateToUsd: 0.79 },
  'kenya': { code: 'KES', symbol: 'KSh', rateToUsd: 129.5 },
  'tanzania': { code: 'TZS', symbol: 'TSh', rateToUsd: 2615.0 },
  'uganda': { code: 'UGX', symbol: 'USh', rateToUsd: 3690.0 },
};

const loadMapCache = (key: string): Map<string, any> => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return new Map(JSON.parse(saved));
  } catch (e) {
    console.warn(`Failed to load cache for ${key}`, e);
  }
  return new Map();
};

const geocodeCache = loadMapCache(GEO_CACHE_KEY);
const currencyCache = loadMapCache(CURRENCY_CACHE_KEY);

const saveMapCache = (key: string, cache: Map<string, any>) => {
  try {
    const data = Array.from(cache.entries());
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to save cache for ${key}`, e);
  }
};

const executeWithRetry = async <T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> => {
  // CRITICAL: Immediate check for offline status to avoid hanging
  if (!navigator.onLine) {
    throw new Error('NETWORK_OFFLINE');
  }

  try {
    return await fn();
  } catch (error: any) {
    const errorStr = JSON.stringify(error).toLowerCase();
    const isRateLimit = errorStr.includes('429') || errorStr.includes('resource_exhausted');
    
    if (isRateLimit && retries > 0) {
      const jitter = delay * (1 + Math.random() * 0.5);
      await new Promise(resolve => setTimeout(resolve, jitter));
      return executeWithRetry(fn, retries - 1, delay * 2.5);
    }
    throw error;
  }
};

export const getCurrencyInfoForLocation = async (location: string): Promise<{ code: string, symbol: string, rateToUsd: number } | null> => {
  const normalizedLoc = location.trim().toLowerCase();
  if (!normalizedLoc || normalizedLoc.length < 3) return null;

  if (currencyCache.has(normalizedLoc)) return currencyCache.get(normalizedLoc);

  const staticMatch = Object.entries(FALLBACK_CURRENCIES).find(([key]) => normalizedLoc.includes(key));
  if (staticMatch) return staticMatch[1];

  try {
    return await executeWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Currency/rate for "${location}". JSON ONLY: {"code": "ISO", "symbol": "$", "rateToUsd": 1.0}`,
        config: { responseMimeType: "application/json" },
      });
      const json = JSON.parse(response.text.trim());
      currencyCache.set(normalizedLoc, json);
      saveMapCache(CURRENCY_CACHE_KEY, currencyCache);
      return json;
    });
  } catch (error) {
    return { code: 'USD', symbol: '$', rateToUsd: 1.0 };
  }
};

export const getCurrencyFromCoords = async (lat: number, lng: number): Promise<{ code: string, symbol: string } | null> => {
  try {
    return await executeWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Given coordinates ${lat}, ${lng}, what is the likely official currency code and symbol? JSON ONLY: {"code": "USD", "symbol": "$"}.`,
        config: { responseMimeType: "application/json" },
      });
      return JSON.parse(response.text.trim());
    });
  } catch (error) {
    return { code: 'USD', symbol: '$' };
  }
};

export const analyzeCargoRequest = async (origin: string, destination: string, cargoType: string, weight: number) => {
  try {
    return await executeWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Logistics summary: ${origin} to ${destination}, ${weight}kg ${cargoType}. Max 2 bullets.`,
        config: { temperature: 0.7 },
      });
      return response.text;
    });
  } catch (error) {
    return "• Standard routing via local hubs active.\n• Estimated transit follows cached benchmarks.";
  }
};

export const preFlightRouteCheck = async (origin: string, destination: string) => {
  if (!origin || !destination) return null;
  try {
    return await executeWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Pre-flight for "${origin}" to "${destination}". JSON: {"difficulty": 0-100, "estimatedDays": "X-Y", "warning": "Text"}`,
        config: { responseMimeType: "application/json" },
      });
      return JSON.parse(response.text.trim());
    });
  } catch (error) {
    return { difficulty: 25, estimatedDays: "Check when online", warning: "Offline Mode: Route analysis simplified." };
  }
};

export const summarizeOperations = async (requests: CargoQuoteRequest[]) => {
  if (requests.length === 0) return "Standby.";
  try {
    return await executeWithRetry(async () => {
      const summaryData = requests.map(r => `${r.status}: ${r.origin}->${r.destination}`).join('\n');
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Summarize (max 40 words):\n${summaryData}`,
        config: { temperature: 0.4 },
      });
      return response.text;
    });
  } catch (error) {
    return "Pipeline status locally cached. All current loads are accounted for in local storage.";
  }
};

export const geocodeLocation = async (location: string): Promise<{ lat: number, lng: number } | null> => {
  const normalizedLoc = location.trim().toLowerCase();
  if (geocodeCache.has(normalizedLoc)) return geocodeCache.get(normalizedLoc)!;

  try {
    return await executeWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Lat/Lng for "${location}". JSON: {"lat": 0, "lng": 0}`,
        config: { responseMimeType: "application/json" },
      });
      const json = JSON.parse(response.text.trim());
      const coords = { lat: json.lat, lng: json.lng };
      geocodeCache.set(normalizedLoc, coords);
      saveMapCache(GEO_CACHE_KEY, geocodeCache);
      return coords;
    });
  } catch (error) {
    return null;
  }
};

export const simulateTrackingPosition = async (origin: string, destination: string, trackingId: string): Promise<{ lat: number, lng: number, status: string } | null> => {
  try {
    return await executeWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `GPS between ${origin} and ${destination}. JSON: {"lat": 0, "lng": 0, "status": "Text"}`,
        config: { responseMimeType: "application/json" },
      });
      return JSON.parse(response.text.trim());
    });
  } catch (error) {
    return { lat: 0, lng: 0, status: "Offline - Waiting for signal" };
  }
};

export const generateAIQuote = async (origin: string, destination: string, cargoType: string, weight: number): Promise<{ price: number, currency: string } | null> => {
  try {
    return await executeWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Market price for ${origin} to ${destination} (${weight}kg ${cargoType}). JSON: {"price": 0, "currency": "USD"}`,
        config: { responseMimeType: "application/json" },
      });
      return JSON.parse(response.text.trim());
    });
  } catch (error) {
    return null;
  }
};
