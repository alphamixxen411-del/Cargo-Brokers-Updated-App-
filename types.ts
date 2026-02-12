
export enum RequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DENIED = 'DENIED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export enum UserRole {
  CLIENT = 'CLIENT',
  PARTNER = 'PARTNER',
  ADMIN = 'ADMIN'
}

export interface Testimonial {
  author: string;
  text: string;
  rating: number;
}

export type AvailabilityStatus = 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE';

export interface LogisticsPartner {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  availability: AvailabilityStatus;
  fleetSize: number;
  location: string;
  logo: string;
  email: string;
  phone: string;
  serviceAreas: string[];
  testimonials: Testimonial[];
  // Performance Metrics
  avgDeliveryTime: string;
  clientSatisfaction: number; // 0-100
  onTimeDeliveryRate: number; // 0-100
  historicalTotalShipments: number;
}

export interface CargoQuoteRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  origin: string;
  destination: string;
  cargoType: string;
  weight: number; 
  weightUnit?: 'kg' | 't';
  dimensions: string;
  preferredDate: string;
  partnerId: string;
  status: RequestStatus;
  aiNotes?: string;
  quotedBasePrice?: number; // Partner's share
  brokerFee?: number;      // Platform's share
  brokerFeePercent?: number; // Percentage used
  quotedPrice?: number;     // Total (Base + Fee)
  quotedCurrency?: string;
  quotedNotes?: string;
  quotedTerms?: string;
  quotedLogo?: string;
  includePartnerLogo?: boolean;
  quotedDetailsOrder?: string[];
  createdAt: string;
  acceptedAt?: string;
  trackingId?: string;
  feedbackProvided?: boolean;
  paymentMethod?: string;
}

export interface UserContextType {
  role: UserRole;
  activePartnerId?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
}
