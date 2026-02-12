
import { CargoQuoteRequest, LogisticsPartner } from '../types';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const STORAGE_KEYS = {
  REQUESTS: 'cb_db_requests',
  PARTNERS: 'cb_db_partners'
};

interface StoredItem<T> {
  data: T;
  timestamp: number;
}

/**
 * AppDatabase Service
 * Handles persistence with 7-day TTL expiration
 */
export const AppDatabase = {
  /**
   * Saves data with a current timestamp
   */
  save: <T>(key: string, data: T) => {
    try {
      const payload: StoredItem<T> = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (error) {
      console.error(`Database Save Error (${key}):`, error);
    }
  },

  /**
   * Loads data and checks for 7-day expiry
   */
  load: <T>(key: string): T | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const payload: StoredItem<T> = JSON.parse(raw);
      const isExpired = Date.now() - payload.timestamp > SEVEN_DAYS_MS;

      if (isExpired) {
        console.info(`Database: Data for ${key} expired (7-day rule). Purging.`);
        localStorage.removeItem(key);
        return null;
      }

      return payload.data;
    } catch (error) {
      console.error(`Database Load Error (${key}):`, error);
      return null;
    }
  },

  /**
   * Specifically handles the requests collection with individual item expiry
   */
  saveRequests: (requests: CargoQuoteRequest[]) => {
    // We store requests with their creation date used as the individual TTL check
    AppDatabase.save(STORAGE_KEYS.REQUESTS, requests);
  },

  loadRequests: (): CargoQuoteRequest[] => {
    const data = AppDatabase.load<CargoQuoteRequest[]>(STORAGE_KEYS.REQUESTS);
    if (!data) return [];
    
    // Scrub individual requests that might be older than 7 days based on their createdAt property
    return data.filter(req => {
      const created = new Date(req.createdAt).getTime();
      return Date.now() - created < SEVEN_DAYS_MS;
    });
  },

  savePartners: (partners: LogisticsPartner[]) => {
    AppDatabase.save(STORAGE_KEYS.PARTNERS, partners);
  },

  loadPartners: (): LogisticsPartner[] | null => {
    return AppDatabase.load<LogisticsPartner[]>(STORAGE_KEYS.PARTNERS);
  }
};

export { STORAGE_KEYS };
