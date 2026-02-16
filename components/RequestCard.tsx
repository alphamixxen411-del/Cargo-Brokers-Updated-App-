import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CargoQuoteRequest, RequestStatus, LogisticsPartner, Testimonial, PaymentMethod } from '../types';
import { generateQuotePDF } from '../services/pdfService';
import { generateAIQuote, getCurrencyInfoForLocation, simulateTrackingPosition, geocodeLocation } from '../services/geminiService';
import CargoIcon from './CargoIcon';
import PartnerProfileModal from './PartnerProfileModal';

declare const L: any;

interface RequestCardProps {
  request: CargoQuoteRequest;
  partnerName: string;
  partner?: LogisticsPartner;
  showActions?: boolean;
  showClientActions?: boolean;
  onAccept?: (price: number, currency: string, notes: string, terms: string, logo: string, detailsOrder: string[], includePartnerLogo?: boolean, brokerFee?: number, brokerFeePercent?: number, paymentMethod?: string, headerImage?: string, headerMessage?: string) => void;
  onDeny?: () => void;
  onUpdateStatus?: (status: RequestStatus, basePrice?: number, currency?: string, notes?: string, terms?: string, logo?: string, detailsOrder?: string[], includePartnerLogo?: boolean, brokerFee?: number, brokerFeePercent?: number, paymentMethod?: string, headerImage?: string, headerMessage?: string) => void;
  onAddFeedback?: (partnerId: string, testimonial: Testimonial, requestId: string) => void;
  paymentMethods: PaymentMethod[];
  defaultBrokerageFee?: number;
  requests?: CargoQuoteRequest[];
  blockedPartnerIds?: string[];
  onToggleBlockPartner?: (id: string) => void;
}

const DEFAULT_DETAILS_ORDER = [
  { id: 'origin', label: 'Origin' },
  { id: 'destination', label: 'Destination' },
  { id: 'cargoType', label: 'Cargo Type' },
  { id: 'weight', label: 'Weight' },
  { id: 'dimensions', label: 'Dimensions' },
  { id: 'preferredDate', label: 'Preferred Date' }
];

const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'KES', 'TZS', 'UGX', 'INR', 'CNY', 'JPY'];

const RequestCard: React.FC<RequestCardProps> = ({ 
  request, 
  partnerName,
  partner,
  showActions = false, 
  showClientActions = false,
  onAccept, 
  onDeny,
  onUpdateStatus,
  onAddFeedback,
  paymentMethods,
  defaultBrokerageFee = 10,
  requests = [],
  blockedPartnerIds = [],
  onToggleBlockPartner
}) => {
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [brokeragePercent, setBrokeragePercent] = useState<number>(defaultBrokerageFee);
  const [partnerCurrency, setPartnerCurrency] = useState<string>(request.suggestedCurrency || 'USD');
  const [localCurrency, setLocalCurrency] = useState<{code: string, symbol: string, rate: number}>({ code: 'USD', symbol: '$', rate: 1.0 });
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>(paymentMethods[0]?.id || '');
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [detailsOrder, setDetailsOrder] = useState(DEFAULT_DETAILS_ORDER);
  const [showDocConfig, setShowDocConfig] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // PDF customization states
  const [headerImage, setHeaderImage] = useState<string>('');
  const [headerMessage, setHeaderMessage] = useState<string>('');
  const [customTerms, setCustomTerms] = useState<string>('');
  const [customNotes, setCustomNotes] = useState<string>('');
  
  // Feedback states
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Tracking states
  const [showTrackingMap, setShowTrackingMap] = useState(false);
  const [trackingData, setTrackingData] = useState<{ lat: number, lng: number, status: string } | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ origin?: {lat: number, lng: number}, dest?: {lat: number, lng: number} }>({});
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    setBrokeragePercent(defaultBrokerageFee);
  }, [defaultBrokerageFee]);

  useEffect(() => {
    const fetchLocalCurrency = async () => {
      const info = await getCurrencyInfoForLocation(request.destination);
      if (info) {
        setLocalCurrency({ code: info.code, symbol: info.symbol, rate: info.rateToUsd });
      }
    };
    fetchLocalCurrency();
  }, [request.destination]);

  const brokerFeeAmount = useMemo(() => (totalPrice * brokeragePercent) / 100, [totalPrice, brokeragePercent]);
  const partnerNetShare = useMemo(() => totalPrice - brokerFeeAmount, [totalPrice, brokerFeeAmount]);
  
  const handleAiSuggest = async () => {
    setIsAiSuggesting(true);
    if ('vibrate' in navigator) navigator.vibrate(10);
    const suggestion = await generateAIQuote(request.origin, request.destination, request.cargoType, request.weight);
    if (suggestion) {
      setTotalPrice(suggestion.price);
      setPartnerCurrency(suggestion.currency);
    }
    setIsAiSuggesting(false);
  };

  const handleFeedbackSubmit = () => {
    if (!onAddFeedback || !partner) return;
    setIsSubmittingFeedback(true);
    onAddFeedback(partner.id, {
      author: request.clientName,
      text: feedbackText || 'Delivered successfully.',
      rating: feedbackRating
    }, request.id);
    setIsSubmittingFeedback(false);
  };

  const initTrackingMap = async () => {
    if (showTrackingMap) {
      setShowTrackingMap(false);
      return;
    }
    setIsTrackingLoading(true);
    setShowTrackingMap(true);
    const [currentPos, originCoords, destCoords] = await Promise.all([
      simulateTrackingPosition(request.origin, request.destination, request.trackingId || request.id),
      geocodeLocation(request.origin),
      geocodeLocation(request.destination)
    ]);
    setTrackingData(currentPos);
    setRouteCoords({ origin: originCoords || undefined, dest: destCoords || undefined });
    setIsTrackingLoading(false);
    if ('vibrate' in navigator) navigator.vibrate(5);
  };

  useEffect(() => {
    if (showTrackingMap && trackingData && mapContainerRef.current && !mapRef.current) {
      try {
        const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false }).setView([trackingData.lat, trackingData.lng], 4);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        const markers: any[] = [];
        if (routeCoords.dest) {
          const destIcon = L.divIcon({ className: 'dest-icon', html: `<div class="w-6 h-6 bg-slate-900 dark:bg-white rounded-full border-4 border-emerald-500 shadow-lg flex items-center justify-center text-[8px] font-black text-white dark:text-black">B</div>`, iconSize: [24, 24] });
          markers.push(L.marker([routeCoords.dest.lat, routeCoords.dest.lng], { icon: destIcon }).addTo(map));
        }
        if (routeCoords.origin) {
          const originIcon = L.divIcon({ className: 'origin-icon', html: `<div class="w-6 h-6 bg-white dark:bg-slate-900 rounded-full border-4 border-blue-500 shadow-lg flex items-center justify-center text-[8px] font-black text-black dark:text-white">A</div>`, iconSize: [24, 24] });
          markers.push(L.marker([routeCoords.origin.lat, routeCoords.origin.lng], { icon: originIcon }).addTo(map));
        }
        const trackIcon = L.divIcon({ className: 'custom-div-icon', html: `<div class="relative flex items-center justify-center"><div class="absolute w-12 h-12 bg-blue-500/20 rounded-full animate-ping"></div><div class="relative w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-2xl"></div></div>`, iconSize: [48, 48], iconAnchor: [24, 24] });
        markers.push(L.marker([trackingData.lat, trackingData.lng], { icon: trackIcon }).addTo(map).bindPopup(`<p class="text-[10px] font-black uppercase text-slate-800">${trackingData.status}</p>`, { closeButton: false }).openPopup());
        if (routeCoords.origin && routeCoords.dest) {
          L.polyline([[routeCoords.origin.lat, routeCoords.origin.lng], [trackingData.lat, trackingData.lng], [routeCoords.dest.lat, routeCoords.dest.lng]], { color: '#3b82f6', weight: 2, opacity: 0.5, dashArray: '8, 12' }).addTo(map);
          const group = new L.featureGroup(markers);
          map.fitBounds(group.getBounds(), { padding: [40, 40] });
        }
        mapRef.current = map;
      } catch (e) { console.error("Map failed", e); }
    }
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [showTrackingMap, trackingData, routeCoords]);

  const statusStyles = {
    [RequestStatus.PENDING]: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200',
    [RequestStatus.ACCEPTED]: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200',
    [RequestStatus.DELIVERED]: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200',
    [RequestStatus.CANCELLED]: 'bg-slate-100 dark:bg-slate-900/20 text-slate-700 dark:text-slate-400 border-slate-200',
    [RequestStatus.DENIED]: 'bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200',
  };

  const labelClasses = "text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1.5 px-1";
  
  // High-accessibility border-2 input styling matched to ClientView
  const inputClasses = "w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 dark:text-white focus:border-blue-600 dark:focus:border-blue-500 outline-none transition-all duration-300 shadow-sm placeholder:opacity-30 focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300 dark:hover:border-slate-700";

  return (
    <div className={`group relative bg-white dark:bg-slate-900 rounded-[2rem] border transition-all duration-500 h-full flex flex-col hover:shadow-2xl hover:-translate-y-1 ${request.status === RequestStatus.PENDING ? 'border-amber-200 dark:border-amber-900/40 shadow-xl shadow-amber-500/5' : 'border-slate-100 dark:border-slate-800 shadow-sm'}`}>
      {showProfile && partner && (
        <PartnerProfileModal 
          partner={partner} 
          requests={requests} 
          onClose={() => setShowProfile(false)}
          isBlocked={blockedPartnerIds.includes(partner.id)}
          onToggleBlock={() => onToggleBlockPartner?.(partner.id)}
        />
      )}

      <div className="p-8 flex-grow">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => partner && setShowProfile(true)}
              className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-blue-600 shadow-sm transform transition-transform group-hover:scale-110 overflow-hidden border border-slate-100 dark:border-slate-700 active:scale-95"
            >
              {partner?.logo ? <img src={partner.logo} alt="" className="w-full h-full object-cover" /> : <CargoIcon type={request.cargoType} className="w-6 h-6" />}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black border transition-colors ${statusStyles[request.status]}`}>{request.status}</span>
                {partner && (
                  <button 
                    onClick={() => setShowProfile(true)}
                    className="text-[9px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors flex items-center gap-1"
                  >
                    {partner.name} dossiers ⓘ
                  </button>
                )}
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">ID: {request.id.split('-').pop()}</p>
            </div>
          </div>
          {request.quotedPrice && (
            <div className="text-right animate-in fade-in slide-in-from-right-4">
              <p className="text-sm font-black text-emerald-600">{request.quotedPrice.toLocaleString()} {request.quotedCurrency}</p>
              <button onClick={() => partner && generateQuotePDF(request, partner, false)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors mt-1 flex items-center gap-1 justify-end">
                <span>PDF Document</span>
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6 mb-8">
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-center gap-1 py-1 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-500"></div>
              <div className="w-0.5 h-10 border-l-2 border-dashed border-slate-100 dark:border-slate-800"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-white"></div>
            </div>
            <div className="flex-1 min-w-0 space-y-4">
              <div className="truncate"><p className={labelClasses}>Origin Point</p><p className="text-xs font-black tracking-tight truncate">{request.origin}</p></div>
              <div className="truncate"><p className={labelClasses}>Final Destination</p><p className="text-xs font-black tracking-tight truncate">{request.destination}</p></div>
            </div>
          </div>
        </div>

        {showActions && request.status === RequestStatus.PENDING && (
          <div className="mt-4 space-y-4">
            <div className="p-6 bg-blue-50/40 dark:bg-blue-900/5 rounded-3xl border border-blue-100/50 dark:border-blue-900/20 animate-in zoom-in-95 duration-500">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">Quote Setup</h4>
                  {request.suggestedCurrency && <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Client Preferred: {request.suggestedCurrency}</p>}
                </div>
                <button 
                  onClick={handleAiSuggest} 
                  disabled={isAiSuggesting}
                  className={`px-4 py-2 bg-white dark:bg-slate-900 border border-blue-100 rounded-xl text-[9px] font-black text-blue-600 uppercase shadow-sm transition-all flex items-center gap-2 active:scale-95 ${isAiSuggesting ? 'opacity-50 animate-pulse' : 'hover:bg-blue-50'}`}
                >
                  {isAiSuggesting ? 'Neural Sync...' : '⚡ AI Pred.'}
                </button>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={labelClasses}>Full Quote Price</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={totalPrice || ''} 
                        onChange={(e) => setTotalPrice(Number(e.target.value))} 
                        className={`${inputClasses} flex-grow`}
                        placeholder="0.00"
                      />
                      <select 
                        value={partnerCurrency} 
                        onChange={(e) => setPartnerCurrency(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-4 text-[10px] font-black text-blue-600 uppercase outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      >
                        {COMMON_CURRENCIES.map(curr => <option key={curr} value={curr}>{curr}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-blue-100/50 dark:border-blue-900/20">
                   <div>
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Carrier Settle</p>
                     <p className="text-xs font-black text-slate-900 dark:text-white">${partnerNetShare.toLocaleString()} {partnerCurrency}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Protocol Fee ({brokeragePercent}%)</p>
                     <p className="text-xs font-black text-blue-600">-${brokerFeeAmount.toLocaleString()} {partnerCurrency}</p>
                   </div>
                </div>
              </div>
            </div>

            {/* Document Config Expandable Section */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
               <button 
                 onClick={() => setShowDocConfig(!showDocConfig)}
                 className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
               >
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">PDF Doc Customization</span>
                 <svg className={`w-4 h-4 transition-transform ${showDocConfig ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5"/></svg>
               </button>
               {showDocConfig && (
                 <div className="px-6 pb-6 space-y-4 animate-in slide-in-from-top-2">
                    <div>
                       <label className={labelClasses}>Custom Header Image (URL)</label>
                       <input 
                         type="text" 
                         value={headerImage} 
                         onChange={(e) => setHeaderImage(e.target.value)} 
                         className={inputClasses}
                         placeholder="https://brand.com/banner.png"
                       />
                    </div>
                    <div>
                       <label className={labelClasses}>Custom Header Message</label>
                       <input 
                         type="text" 
                         value={headerMessage} 
                         onChange={(e) => setHeaderMessage(e.target.value)} 
                         className={inputClasses}
                         placeholder="Priority Cargo Hub Statement"
                       />
                    </div>
                    <div>
                       <label className={labelClasses}>Operational Notes</label>
                       <textarea 
                         value={customNotes} 
                         onChange={(e) => setCustomNotes(e.target.value)} 
                         className={`${inputClasses} h-24 resize-none`}
                         placeholder="Handling instructions..."
                       />
                    </div>
                    <div>
                       <label className={labelClasses}>Terms & Conditions</label>
                       <textarea 
                         value={customTerms} 
                         onChange={(e) => setCustomTerms(e.target.value)} 
                         className={`${inputClasses} h-24 resize-none`}
                         placeholder="Payment due in 7 days..."
                       />
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}

        {(request.status === RequestStatus.ACCEPTED || request.status === RequestStatus.DELIVERED) && (
          <div className="mt-4">
             <button 
              onClick={initTrackingMap}
              className="w-full flex items-center justify-between p-4 bg-slate-900 text-white dark:bg-white dark:text-black rounded-2xl shadow-lg transition-all active:scale-[0.98]"
            >
               <div className="flex items-center gap-3">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2.5"/></svg>
                 <span className="text-[10px] font-black uppercase tracking-widest">{showTrackingMap ? 'Close Tracker' : 'Live Tracking'}</span>
               </div>
               <svg className={`w-4 h-4 transition-transform ${showTrackingMap ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
            </button>
            {showTrackingMap && (
              <div className="mt-4 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 h-56 relative animate-in zoom-in-95 duration-300">
                {isTrackingLoading && <div className="absolute inset-0 bg-slate-100/80 dark:bg-slate-900/80 flex items-center justify-center z-10 animate-pulse text-[10px] font-black uppercase">Syncing Satellite...</div>}
                <div ref={mapContainerRef} className="w-full h-full" />
              </div>
            )}
          </div>
        )}

        {showClientActions && request.status === RequestStatus.DELIVERED && !request.feedbackProvided && (
          <div className="mt-4 p-5 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20">
            <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3 text-center">Review Carrier</h4>
            <div className="flex justify-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setFeedbackRating(star)} className={`text-xl ${star <= feedbackRating ? 'text-amber-500' : 'text-slate-200'}`}>★</button>
              ))}
            </div>
            <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Delivery experience..." className={`${inputClasses} h-20 resize-none mb-3`} />
            <button onClick={handleFeedbackSubmit} disabled={isSubmittingFeedback} className="w-full py-2 bg-amber-500 text-white rounded-lg text-[9px] font-black uppercase">Submit Evaluation</button>
          </div>
        )}
      </div>

      <div className="p-8 pt-0 mt-auto">
        {showActions && request.status === RequestStatus.PENDING ? (
          <div className="flex gap-3">
            <button onClick={onDeny} className="flex-1 py-3 text-[10px] font-black text-slate-400 uppercase border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-all">Decline</button>
            <button 
              onClick={() => onAccept && onAccept(totalPrice, partnerCurrency, customNotes, customTerms, partner?.logo || '', detailsOrder.map(d => d.id), true, brokerFeeAmount, brokeragePercent, selectedPaymentId, headerImage, headerMessage)}
              disabled={totalPrice <= 0}
              className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl shadow-xl transition-all ${totalPrice > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-300'}`}
            >
              Dispatch Quote
            </button>
          </div>
        ) : showClientActions && request.status === RequestStatus.ACCEPTED ? (
          <button onClick={() => onUpdateStatus && onUpdateStatus(RequestStatus.DELIVERED)} className="w-full py-3.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl hover:bg-emerald-700 active:scale-95 transition-all">Confirm Cargo Reception</button>
        ) : request.status === RequestStatus.DELIVERED && request.feedbackProvided ? (
          <div className="text-center py-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border-2 border-emerald-100 dark:border-emerald-800">
            <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">✓ Evaluation Recorded</p>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">Transaction Finalized</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestCard;