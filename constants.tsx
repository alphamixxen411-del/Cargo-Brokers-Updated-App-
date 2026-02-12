
import { LogisticsPartner } from './types';

export const INITIAL_PARTNERS: LogisticsPartner[] = [
  {
    id: 'p1',
    name: 'Blue Horizon Logistics',
    specialization: 'Ocean Freight & Global Containers',
    rating: 4.8,
    availability: 'LIMITED',
    fleetSize: 120,
    location: 'Rotterdam, NL',
    logo: 'https://picsum.photos/seed/p1/100/100',
    email: 'contact@bluehorizon.logistics',
    phone: '+31 10 456 7890',
    serviceAreas: ['Europe', 'North America', 'East Asia'],
    testimonials: [
      { author: 'Global Tech Corp', text: 'Unbeatable reliability for our overseas shipments.', rating: 5 },
      { author: 'Euro Retailers', text: 'Great tracking system, though customs took a bit longer.', rating: 4 }
    ],
    avgDeliveryTime: '18.5 days',
    clientSatisfaction: 96,
    onTimeDeliveryRate: 94,
    historicalTotalShipments: 14200
  },
  {
    id: 'p2',
    name: 'RapidWings Air Cargo',
    specialization: 'Express Air Mail & Priority Shipping',
    rating: 4.9,
    availability: 'AVAILABLE',
    fleetSize: 45,
    location: 'Chicago, US',
    logo: 'https://picsum.photos/seed/p2/100/100',
    email: 'ops@rapidwings.com',
    phone: '+1 312 555 0199',
    serviceAreas: ['Global Express', 'Domestic US'],
    testimonials: [
      { author: 'Swift Health', text: 'Saved our medical supplies delivery deadline!', rating: 5 },
      { author: 'Precision Parts', text: 'Fastest air cargo we have used in a decade.', rating: 5 }
    ],
    avgDeliveryTime: '2.1 days',
    clientSatisfaction: 99,
    onTimeDeliveryRate: 98,
    historicalTotalShipments: 8900
  },
  {
    id: 'p3',
    name: 'RoadRunner Trucking',
    specialization: 'Domestic Haulage & LTL',
    rating: 4.5,
    availability: 'AVAILABLE',
    fleetSize: 250,
    location: 'Munich, DE',
    logo: 'https://picsum.photos/seed/p3/100/100',
    email: 'info@roadrunner-trucks.de',
    phone: '+49 89 1234 5678',
    serviceAreas: ['DACH Region', 'Benelux', 'Northern Italy'],
    testimonials: [
      { author: 'Bavarian Motors', text: 'Solid regional partner for heavy machinery.', rating: 4 },
      { author: 'Fresh Produce Ltd', text: 'Dependable daily routes.', rating: 4.5 }
    ],
    avgDeliveryTime: '3.4 days',
    clientSatisfaction: 92,
    onTimeDeliveryRate: 89,
    historicalTotalShipments: 32500
  }
];

export const CARGO_TYPES = [
  'General Goods',
  'Perishables (Refrigerated)',
  'Hazardous Materials',
  'Heavy Machinery',
  'Electronics',
  'Textiles'
];
