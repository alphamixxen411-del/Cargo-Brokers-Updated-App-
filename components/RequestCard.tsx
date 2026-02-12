
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CargoQuoteRequest, RequestStatus, LogisticsPartner, Testimonial, PaymentMethod } from '../types';
import { generateQuotePDF } from '../services/pdfService';
import { generateAIQuote, getCurrencyInfoForLocation, simulateTrackingPosition, geocodeLocation } from '../services/geminiService';
import CargoIcon from './CargoIcon';

declare const L: any;

interface RequestCardProps {
  request: CargoQuoteRequest;
  partnerName: string;
  partner?: LogisticsPartner;
  showActions?: boolean;
  showClientActions?: boolean;
  onAccept?: (price: number, currency: string, notes: string, terms: string, logo: string, detailsOrder: string[], includePartnerLogo?: boolean, brokerFee?: number, brokerFeePercent?: number, paymentMethod?: string) => void;
  onDeny?: () => void;
  onUpdateStatus?: (status: RequestStatus, basePrice?: number, currency?: string, notes?: string, terms?: string, logo?: string, detailsOrder?: string[], includePartnerLogo?: boolean, brokerFee?: number, brokerFeePercent?: number, paymentMethod?: string) => void;
  onAddFeedback?: (partnerId: string, testimonial: Testimonial, requestId: string) => void;
  paymentMethods: PaymentMethod[];
}

const DEFAULT_DETAILS_ORDER = [
  { id: 'origin', label: 'Origin' },
  { id: 'destination', label: 'Destination' },
  { id: 'cargoType', label: 'Cargo Type' },
  { id: 'weight', label: 'Weight' },
  { id: 'dimensions', label: 'Dimensions' },
  { id: 'preferredDate', label: 'Preferred Date' }
];

const RequestCard: React.FC<RequestCardProps> = ({ 
  request, 
  partnerName,
  partner,
  showActions = false, 
  showClientActions = false,
  onAccept, 
  onDeny,
  onUpdateStatus,
  paymentMethods
}) => {
  const [basePrice, setBasePrice] = useState<number>(0);
  const [brokeragePercent, setBrokeragePercent] = useState<number>(10);
  const [partnerCurrency, setPartnerCurrency] = useState<string>('USD');
  const [localCurrency, setLocalCurrency] = useState<{code: string, symbol: string, rate: number}>({ code: 'USD', symbol: '$', rate: 1.0 });
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>(paymentMethods[0]?.id || '');
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [detailsOrder, setDetailsOrder] = useState(DEFAULT_DETAILS_ORDER);
  
  // Tracking states
  const [showTrackingMap, setShowTrackingMap] = useState(false);
  const [trackingData, setTrackingData] = useState<{ lat: number, lng: number, status: string } | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ origin?: {lat: number, lng: number}, dest?: {lat: number, lng: number} }>({});
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    const fetchLocalCurrency = async () => {
      const info = await getCurrencyInfoForLocation(request.destination);
      if (info) {
        setLocalCurrency({ code: info.code, symbol: info.symbol, rate: info.rateToUsd });
      }
    };
    fetchLocalCurrency();
  }, [request.destination]);

  const brokerFeeAmount = useMemo(() => (basePrice * brokeragePercent) / 100, [basePrice, brokeragePercent]);
  const clientTotalUSD = useMemo(() => basePrice, [basePrice]);
  const partnerNetPayout = useMemo(() => basePrice - brokerFeeAmount, [basePrice, brokerFeeAmount]);
  
  const localizedClientTotal = useMemo(() => {
    return (clientTotalUSD * localCurrency.rate).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }, [clientTotalUSD, localCurrency]);

  const handleAiSuggest = async () => {
    setIsAiSuggesting(true);
    if ('vibrate' in navigator) navigator.vibrate(10);
    const suggestion = await generateAIQuote(request.origin, request.destination, request.cargoType, request.weight);
    if (suggestion) {
      setBasePrice(suggestion.price);
      setPartnerCurrency(suggestion.currency);
    }
    setIsAiSuggesting(false);
  };

  const initTrackingMap = async () => {
    if (showTrackingMap) {
      setShowTrackingMap(false);
      return;
    }

    setIsTrackingLoading(true);
    setShowTrackingMap(true);
    
    // Concurrently fetch current position and geocode origin/dest for the full route
    const [currentPos, originCoords, destCoords] = await Promise.all([
      simulateTrackingPosition(request.origin, request.destination, request.trackingId || request.id),
      geocodeLocation(request.origin),
      geocodeLocation(request.destination)
    ]);

    setTrackingData(currentPos);
    setRouteCoords({ 
      origin: originCoords || undefined, 
      dest: destCoords || undefined 
    });
    setIsTrackingLoading(false);
    
    if ('vibrate' in navigator) navigator.vibrate(5);
  };

  useEffect(() => {
    if (showTrackingMap && trackingData && mapContainerRef.current && !mapRef.current) {
      try {
        const map = L.map(mapContainerRef.current, { 
          zoomControl: false, 
          attributionControl: false 
        }).setView([trackingData.lat, trackingData.lng], 4);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        const markers: any[] = [];

        // 1. Destination Marker (Final Goal)
        if (routeCoords.dest) {
          const destIcon = L.divIcon({
            className: 'dest-icon',
            html: `<div class="w-6 h-6 bg-slate-900 dark:bg-white rounded-full border-4 border-emerald-500 shadow-lg flex items-center justify-center text-[8px] font-black text-white dark:text-black">B</div>`,
            iconSize: [24, 24]
          });
          markers.push(L.marker([routeCoords.dest.lat, routeCoords.dest.lng], { icon: destIcon }).addTo(map).bindPopup("Final Destination"));
        }

        // 2. Origin Marker
        if (routeCoords.origin) {
          const originIcon = L.divIcon({
            className: 'origin-icon',
            html: `<div class="w-6 h-6 bg-white dark:bg-slate-900 rounded-full border-4 border-blue-500 shadow-lg flex items-center justify-center text-[8px] font-black text-black dark:text-white">A</div>`,
            iconSize: [24, 24]
          });
          markers.push(L.marker([routeCoords.origin.lat, routeCoords.origin.lng], { icon: originIcon }).addTo(map).bindPopup("Origin Port"));
        }

        // 3. Current Live Marker
        const trackIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="relative flex items-center justify-center">
                   <div class="absolute w-12 h-12 bg-blue-500/20 rounded-full animate-ping"></div>
                   <div class="relative w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-2xl"></div>
                 </div>`,
          iconSize: [48, 48],
          iconAnchor: [24, 24]
        });

        markers.push(L.marker([trackingData.lat, trackingData.lng], { icon: trackIcon }).addTo(map)
          .bindPopup(`<div class="p-1"><p class="text-[10px] font-black uppercase text-slate-800">${trackingData.status}</p></div>`, { closeButton: false })
          .openPopup());

        // 4. Draw Route Path (Dashed)
        if (routeCoords.origin && routeCoords.dest) {
          const path = L.polyline([
            [routeCoords.origin.lat, routeCoords.origin.lng],
            [trackingData.lat, trackingData.lng],
            [routeCoords.dest.lat, routeCoords.dest.lng]
          ], {
            color: '#3b82f6',
            weight: 2,
            opacity: 0.5,
            dashArray: '8, 12'
          }).addTo(map);

          // Auto-fit bounds to see the whole journey
          const group = new L.featureGroup(markers);
          map.fitBounds(group.getBounds(), { padding: [40, 40] });
        }
        
        mapRef.current = map;
      } catch (e) {
        console.error("Map initialization failed", e);
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [showTrackingMap, trackingData, routeCoords]);

  const statusStyles = {
    [RequestStatus.PENDING]: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200',
    [RequestStatus.ACCEPTED]: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200',
    [RequestStatus.DELIVERED]: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200',
    [RequestStatus.CANCELLED]: 'bg-slate-100 dark:bg-slate-900/20 text-slate-700 dark:text-slate-400 border-slate-200',
    [RequestStatus.DENIED]: 'bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200',
  };

  const labelClasses = "text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5";
  const inputClasses = "w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-black text-slate-900 dark:text-white focus:border-blue-500 outline-none transition-all duration-300 shadow-sm";

  return (
    <div className={`group relative bg-white dark:bg-slate-900 rounded-[2rem] border transition-all duration-500 h-full flex flex-col hover:shadow-2xl hover:-translate-y-1 ${request.status === RequestStatus.PENDING ? 'border-amber-200 dark:border-amber-900/40 shadow-xl shadow-amber-500/5' : 'border-slate-100 dark:border-slate-800 shadow-sm'}`}>
      <div className="p-8 flex-grow">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-blue-600 shadow-sm transform transition-transform group-hover:scale-110">
              <CargoIcon type={request.cargoType} className="w-6 h-6" />
            </div>
            <div>
              <span className={`px-3 py-1 rounded-full text-[9px] font-black border transition-colors ${statusStyles[request.status]}`}>{request.status}</span>
              <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">ID: {request.id.split('-').pop()}</p>
            </div>
          </div>
          {request.quotedPrice && (
            <div className="text-right animate-in fade-in slide-in-from-right-4">
              <p className="text-sm font-black text-emerald-600">
                {request.quotedPrice.toLocaleString()} {request.quotedCurrency}
              </p>
              <button onClick={() => partner && generateQuotePDF(request, partner, false)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors mt-1 flex items-center gap-1 justify-end">
                <span>PDF Document</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16l-4-4m0 0l4-4m-4 4h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6 mb-8">
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-center gap-1 py-1">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-500"></div>
              <div className="w-0.5 h-10 border-l-2 border-dashed border-slate-100 dark:border-slate-800"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-white"></div>
            </div>
            <div className="flex-1 space-y-4">
              <div><p className={labelClasses}>Origin Point</p><p className="text-xs font-black tracking-tight">{request.origin}</p></div>
              <div><p className={labelClasses}>Final Destination</p><p className="text-xs font-black tracking-tight">{request.destination}</p></div>
            </div>
          </div>
        </div>

        {/* Enhanced Live Tracking Section */}
        {(request.status === RequestStatus.ACCEPTED || request.status === RequestStatus.DELIVERED) && (
          <div className="mb-8 animate-in slide-in-from-bottom-2 duration-500">
            <button 
              onClick={initTrackingMap}
              className="w-full flex items-center justify-between p-5 bg-slate-900 text-white dark:bg-white dark:text-black rounded-3xl shadow-xl transition-all active:scale-[0.98] group/track"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${showTrackingMap ? 'bg-blue-500' : 'bg-white/10 dark:bg-black/10'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2.5"/></svg>
                </div>
                <div className="text-left">
                   <p className="text-[11px] font-black uppercase tracking-[0.1em]">{showTrackingMap ? 'Close Pipeline Feed' : 'Launch Tracking Hub'}</p>
                   <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest">ID: {request.trackingId || 'CB-PENDING'}</p>
                </div>
              </div>
              <svg className={`w-5 h-5 opacity-40 transition-transform duration-500 ${showTrackingMap ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            {showTrackingMap && (
              <div className="mt-4 space-y-4 animate-in zoom-in-95 duration-500">
                <div className="relative rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-800 h-64 sm:h-80 shadow-2xl bg-slate-50 dark:bg-slate-900">
                  {isTrackingLoading && (
                    <div className="absolute inset-0 z-30 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
                      <div className="relative w-16 h-16 mb-6">
                        <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Neural Telemetry Sync</p>
                      <p className="text-[8px] text-blue-400 mt-2 font-bold uppercase tracking-widest">Locking Satellite Feed...</p>
                    </div>
                  )}
                  
                  <div ref={mapContainerRef} className="w-full h-full" />
                  
                  {trackingData && !isTrackingLoading && (
                    <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
                      <div className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-w-[180px] pointer-events-auto">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Status</p>
                        </div>
                        <p className="text-[11px] font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tighter">{trackingData.status}</p>
                      </div>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); initTrackingMap(); }}
                        className="p-3 bg-blue-600 text-white rounded-xl shadow-lg pointer-events-auto active:scale-95 transition-all hover:bg-blue-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth="2.5"/></svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Simulated Telemetry Log */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Pipeline Milestones</h5>
                  <div className="space-y-6">
                    <div className="flex gap-4 items-start relative">
                       <div className="absolute left-[7px] top-6 bottom-[-24px] w-0.5 bg-blue-500/20"></div>
                       <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shrink-0 z-10"><div className="w-1.5 h-1.5 bg-white rounded-full"></div></div>
                       <div className="flex-1">
                          <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase">In Transit - Crossing Region</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Live Telemetry · {new Date().toLocaleTimeString()}</p>
                       </div>
                    </div>
                    <div className="flex gap-4 items-start relative opacity-60">
                       <div className="absolute left-[7px] top-6 bottom-[-24px] w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                       <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0 z-10"></div>
                       <div className="flex-1">
                          <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">Customs Document Approval</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Registry Verified · T-2 Hours</p>
                       </div>
                    </div>
                    <div className="flex gap-4 items-start opacity-40">
                       <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0 z-10"></div>
                       <div className="flex-1">
                          <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">Departure from {request.origin}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Load Confirmed · T-6 Hours</p>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {showActions && request.status === RequestStatus.PENDING && (
          <div className="mt-4 p-6 bg-blue-50/40 dark:bg-blue-900/5 rounded-3xl border border-blue-100/50 dark:border-blue-900/20 animate-in zoom-in-95 duration-500">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Market Precision</h4>
              <button 
                onClick={handleAiSuggest} 
                disabled={isAiSuggesting}
                className={`px-4 py-2 bg-white dark:bg-slate-900 border border-blue-100 rounded-xl text-[9px] font-black text-blue-600 uppercase shadow-sm transition-all flex items-center gap-2 active:scale-95 ${isAiSuggesting ? 'opacity-50 animate-pulse' : 'hover:bg-blue-50'}`}
              >
                {isAiSuggesting ? 'Neural Sync...' : '⚡ AI Prediction'}
              </button>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Base Rate (USD)</label>
                  <input 
                    type="number" 
                    value={basePrice || ''} 
                    onChange={(e) => setBasePrice(Number(e.target.value))} 
                    className={inputClasses}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className={labelClasses}>Broker Margin (%)</label>
                  <input 
                    type="number" 
                    value={brokeragePercent} 
                    onChange={(e) => setBrokeragePercent(Number(e.target.value))} 
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/5 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20 shadow-sm transition-all">
                <p className={labelClasses}>Local Settlement Price ({localCurrency.code})</p>
                <div className="flex items-baseline gap-2">
                   <p className="text-2xl font-black text-emerald-600 tracking-tighter">{localCurrency.symbol}{localizedClientTotal}</p>
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Live FX Detected</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 pt-0 mt-auto">
        {showActions && request.status === RequestStatus.PENDING ? (
          <div className="flex gap-4">
            <button onClick={onDeny} className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-2 border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95">Decline</button>
            <button 
              onClick={() => onAccept && onAccept(partnerNetPayout, partnerCurrency, '', '', '', [], true, brokerFeeAmount, brokeragePercent, selectedPaymentId)}
              disabled={basePrice <= 0}
              className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-2xl transition-all active:scale-95 ${basePrice > 0 ? 'bg-blue-600 text-white shadow-blue-500/30 hover:bg-blue-700' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
            >
              Confirm Dispatch
            </button>
          </div>
        ) : showClientActions && request.status === RequestStatus.ACCEPTED ? (
          <button onClick={() => onUpdateStatus && onUpdateStatus(RequestStatus.DELIVERED)} className="w-full py-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all">Confirm Cargo Reception</button>
        ) : (
          <div className="text-center py-2 flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse"></div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Transaction Encrypted</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestCard;
