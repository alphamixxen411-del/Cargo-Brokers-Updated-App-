import React, { useState, useMemo, useEffect } from 'react';
import { LogisticsPartner, CargoQuoteRequest, RequestStatus, Testimonial, PaymentMethod, AvailabilityStatus } from '../types';
import { CARGO_TYPES } from '../constants';
import { analyzeCargoRequest, getCurrencyInfoForLocation, preFlightRouteCheck, getCurrencyFromCoords } from '../services/geminiService';
import RequestCard from './RequestCard';
import CargoIcon from './CargoIcon';
import PartnerProfileModal from './PartnerProfileModal';

interface ClientViewProps {
  partners: LogisticsPartner[];
  requests: CargoQuoteRequest[];
  onSubmit: (request: CargoQuoteRequest) => void;
  blockedPartnerIds: string[];
  onToggleBlockPartner: (id: string) => void;
  onUpdateStatus: (id: string, status: RequestStatus, ...args: any[]) => void;
  onAddFeedback: (partnerId: string, testimonial: Testimonial, requestId: string) => void;
  paymentMethods: PaymentMethod[];
  userLocation: { lat: number, lng: number } | null;
}

type Step = 'contact' | 'route' | 'cargo' | 'partner' | 'review';

const ClientView: React.FC<ClientViewProps> = ({ 
  partners, 
  requests, 
  onSubmit, 
  blockedPartnerIds, 
  onToggleBlockPartner,
  onUpdateStatus,
  onAddFeedback,
  paymentMethods,
  userLocation
}) => {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [currentStep, setCurrentStep] = useState<Step>('contact');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [localCurrency, setLocalCurrency] = useState<{code: string, symbol: string}>({ code: 'USD', symbol: '$' });
  const [clientDetectedCurrency, setClientDetectedCurrency] = useState<string>('USD');
  const [detectedRegion, setDetectedRegion] = useState<string>('');
  const [preFlightData, setPreFlightData] = useState<{ difficulty: number, estimatedDays: string, warning: string } | null>(null);
  const [isPreFlightLoading, setIsPreFlightLoading] = useState(false);
  const [selectedProfilePartner, setSelectedProfilePartner] = useState<LogisticsPartner | null>(null);

  // Filtering States
  const [partnerSearch, setPartnerSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AvailabilityStatus>('ALL');
  const [minRating, setMinRating] = useState(0);

  // Detect client's local currency based on coordinates
  useEffect(() => {
    if (userLocation) {
      const detectCurrency = async () => {
        const info = await getCurrencyFromCoords(userLocation.lat, userLocation.lng);
        if (info) {
          setClientDetectedCurrency(info.code);
          setDetectedRegion(info.region);
        }
      };
      detectCurrency();
    }
  }, [userLocation]);

  const filteredPartners = useMemo(() => {
    return partners.filter(p => {
      const isNotBlocked = !blockedPartnerIds.includes(p.id);
      const matchesSearch = p.name.toLowerCase().includes(partnerSearch.toLowerCase()) || 
                          p.specialization.toLowerCase().includes(partnerSearch.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || p.availability === statusFilter;
      const matchesRating = p.rating >= minRating;
      
      return isNotBlocked && matchesSearch && matchesStatus && matchesRating;
    });
  }, [partners, blockedPartnerIds, partnerSearch, statusFilter, minRating]);

  const [formData, setFormData] = useState({
    clientName: '', clientEmail: '', clientPhone: '',
    origin: '', destination: '', cargoType: CARGO_TYPES[0],
    weight: 0, weightUnit: 'kg' as 'kg' | 't', dimensions: '', preferredDate: tomorrow,
    partnerId: ''
  });

  // Set initial partner if none selected and filtered list changes
  useEffect(() => {
    if (!formData.partnerId && filteredPartners.length > 0) {
      setFormData(prev => ({ ...prev, partnerId: filteredPartners[0].id }));
    }
  }, [filteredPartners, formData.partnerId]);

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    if (!formData.destination || formData.destination.length < 3) return;
    const handler = setTimeout(async () => {
      const info = await getCurrencyInfoForLocation(formData.destination);
      if (info) setLocalCurrency({ code: info.code, symbol: info.symbol });
    }, 1500);
    return () => clearTimeout(handler);
  }, [formData.destination]);

  useEffect(() => {
    if (currentStep === 'route' && formData.origin.length > 3 && formData.destination.length > 3) {
      const handler = setTimeout(async () => {
        setIsPreFlightLoading(true);
        const data = await preFlightRouteCheck(formData.origin, formData.destination);
        setPreFlightData(data);
        setIsPreFlightLoading(false);
      }, 1000);
      return () => clearTimeout(handler);
    }
  }, [formData.origin, formData.destination, currentStep]);

  const steps: { id: Step; label: string; icon: string }[] = [
    { id: 'contact', label: 'Identity', icon: '👤' },
    { id: 'route', label: 'Logistics', icon: '📍' },
    { id: 'cargo', label: 'Payload', icon: '📦' },
    { id: 'partner', label: 'Carrier', icon: '🚛' },
    { id: 'review', label: 'Review', icon: '✅' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const validateStep = (step: Step): boolean => {
    const newErrors: Partial<Record<string, string>> = {};
    if (step === 'contact') {
      if (!formData.clientName.trim()) newErrors.clientName = "Required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clientEmail)) newErrors.clientEmail = "Invalid Email";
    } else if (step === 'route') {
      if (!formData.origin.trim()) newErrors.origin = "Required";
      if (!formData.destination.trim()) newErrors.destination = "Required";
    } else if (step === 'cargo') {
      if (formData.weight <= 0) newErrors.weight = "Required";
    } else if (step === 'partner') {
      if (!formData.partnerId) newErrors.partnerId = "Please select a carrier";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      const nextIdx = currentStepIndex + 1;
      if (nextIdx < steps.length) {
        setCurrentStep(steps[nextIdx].id);
        if ('vibrate' in navigator) navigator.vibrate(5);
      }
    }
  };

  const handleSubmit = async () => {
    setIsAiProcessing(true);
    try {
      const aiInsight = await analyzeCargoRequest(formData.origin, formData.destination, formData.cargoType, formData.weight);

      const newRequest: CargoQuoteRequest = {
        ...formData,
        id: `req-${Math.random().toString(36).substr(2, 9)}`,
        clientId: 'client-001', 
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        clientPhone: formData.clientPhone,
        status: RequestStatus.PENDING,
        aiNotes: aiInsight, 
        suggestedCurrency: clientDetectedCurrency, // Pass the detected local currency
        createdAt: new Date().toISOString()
      };
      
      onSubmit(newRequest);
      setCurrentStep('contact');
      setFormData({ 
        ...formData, 
        clientName: '', 
        clientEmail: '', 
        clientPhone: '', 
        origin: '', 
        destination: '', 
        weight: 0, 
        weightUnit: 'kg',
        dimensions: '', 
        preferredDate: tomorrow, 
        cargoType: CARGO_TYPES[0], 
        partnerId: '' 
      });
      setPreFlightData(null);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Enhanced input classes for better accessibility and focus states
  const inputClasses = (field: string) => `w-full rounded-2xl border-2 px-5 py-4 text-sm font-bold transition-all duration-300 outline-none shadow-sm appearance-none ${
    errors[field] 
    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/10 text-rose-900 dark:text-rose-100 placeholder:text-rose-400' 
    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
  }`;

  // Enhanced label with better legibility
  const Label = ({ htmlFor, children, error }: { htmlFor: string, children?: React.ReactNode, error?: string }) => (
    <div className="flex justify-between items-center mb-1.5 px-1">
      <label htmlFor={htmlFor} className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{children}</label>
      {error && <span className="text-[10px] font-black text-rose-600 dark:text-rose-50 uppercase tracking-tighter">{error}</span>}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start max-w-[1400px] mx-auto px-2">
      {selectedProfilePartner && (
        <PartnerProfileModal 
          partner={selectedProfilePartner} 
          requests={requests} 
          onClose={() => setSelectedProfilePartner(null)}
          isBlocked={blockedPartnerIds.includes(selectedProfilePartner.id)}
          onToggleBlock={() => onToggleBlockPartner(selectedProfilePartner.id)}
        />
      )}

      <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-2xl relative overflow-hidden transition-all flex flex-col min-h-[600px]">
        <div className="mb-10">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">New Quote</h2>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Logistics Request Form</p>
        </div>

        {isAiProcessing && (
          <div className="absolute inset-0 z-50 bg-white/95 dark:bg-slate-900/95 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-12 h-12 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-800 dark:text-white">Analyzing Logistics Flow...</h3>
          </div>
        )}

        <div className="flex justify-between mb-10 relative px-2">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0"></div>
          <div className="absolute top-1/2 left-0 h-0.5 bg-blue-500 -translate-y-1/2 z-0 transition-all duration-500" style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}></div>
          {steps.map((s, i) => (
            <div key={s.id} className={`relative z-10 w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black border-2 transition-all duration-500 ${i <= currentStepIndex ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-300'}`}>
              {i < currentStepIndex ? '✓' : s.icon}
            </div>
          ))}
        </div>

        <div className="flex-grow flex flex-col justify-center">
          <div key={currentStep} className="animate-in fade-in slide-in-from-right-8 duration-500 flex flex-col">
            <div className="space-y-5">
              {currentStep === 'contact' && (
                <>
                  <div>
                    <Label htmlFor="clientName" error={errors.clientName}>Client Identity</Label>
                    <input id="clientName" type="text" placeholder="Full name or Company" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className={inputClasses('clientName')} />
                  </div>
                  <div>
                    <Label htmlFor="clientEmail" error={errors.clientEmail}>Primary Email</Label>
                    <input id="clientEmail" type="email" placeholder="e.g. contact@hub.com" value={formData.clientEmail} onChange={e => setFormData({...formData, clientEmail: e.target.value})} className={inputClasses('clientEmail')} />
                  </div>
                  
                  {/* Regional Detection Confirmation UI */}
                  {detectedRegion && (
                    <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-2xl animate-in slide-in-from-bottom-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2.5"/></svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none">Regional Detection</p>
                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-1 truncate">Originating from {detectedRegion} · Preferred: {clientDetectedCurrency}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
              {currentStep === 'route' && (
                <>
                  <div>
                    <Label htmlFor="origin" error={errors.origin}>Origin Port/City</Label>
                    <input id="origin" type="text" placeholder="e.g. Rotterdam, NL" value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})} className={inputClasses('origin')} />
                  </div>
                  <div>
                    <Label htmlFor="destination" error={errors.destination}>Destination Hub</Label>
                    <input id="destination" type="text" placeholder="e.g. Chicago, US" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} className={inputClasses('destination')} />
                  </div>
                  {(isPreFlightLoading || preFlightData) && (
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/20">
                      {isPreFlightLoading ? <p className="text-[9px] font-black animate-pulse uppercase tracking-widest text-indigo-400">Consulting AI Oracle...</p> : <p className="text-[9px] font-bold text-indigo-800 dark:text-indigo-300 italic">{preFlightData?.warning}</p>}
                    </div>
                  )}
                </>
              )}
              {currentStep === 'cargo' && (
                <>
                  <div>
                    <Label htmlFor="cargoType">Cargo Classification</Label>
                    <select id="cargoType" value={formData.cargoType} onChange={e => setFormData({...formData, cargoType: e.target.value})} className={inputClasses('cargoType')}>
                      {CARGO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="weight" error={errors.weight}>Weight</Label>
                      <div className="flex gap-2">
                        <input 
                          id="weight" 
                          type="number" 
                          placeholder="0" 
                          value={formData.weight || ''} 
                          onChange={e => setFormData({...formData, weight: Number(e.target.value)})} 
                          className={`${inputClasses('weight')} flex-1`} 
                        />
                        <select 
                          value={formData.weightUnit} 
                          onChange={e => setFormData({...formData, weightUnit: e.target.value as 'kg' | 't'})}
                          className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-3 text-[10px] font-black text-blue-600 uppercase outline-none focus:border-blue-500"
                        >
                          <option value="kg">KG</option>
                          <option value="t">T</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="date">Ship Date</Label>
                      <input id="date" type="date" value={formData.preferredDate} onChange={e => setFormData({...formData, preferredDate: e.target.value})} className={inputClasses('date')} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="dimensions">Dimensions (Optional)</Label>
                    <input 
                      id="dimensions" 
                      type="text" 
                      placeholder="e.g. 120x80x100 cm" 
                      value={formData.dimensions} 
                      onChange={e => setFormData({...formData, dimensions: e.target.value})} 
                      className={inputClasses('dimensions')} 
                    />
                  </div>
                </>
              )}
              {currentStep === 'partner' && (
                <div className="flex flex-col h-[400px]">
                  <Label htmlFor="partnerSelect" error={errors.partnerId}>Carrier Selection Network</Label>
                  
                  {/* Partner Filters UI */}
                  <div className="mb-4 space-y-3">
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Search by name or specialty..." 
                        value={partnerSearch} 
                        onChange={e => setPartnerSearch(e.target.value)} 
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-10 py-2.5 text-[11px] font-bold outline-none focus:border-blue-500 transition-all" 
                      />
                      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5"/></svg>
                    </div>
                    
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                      {(['ALL', 'AVAILABLE', 'LIMITED', 'UNAVAILABLE'] as const).map(status => (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                            statusFilter === status 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' 
                            : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-200'
                          }`}
                        >
                          {status.replace('_', ' ')}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-1">Rating:</span>
                      {[0, 3, 4, 4.5].map(rating => (
                        <button
                          key={rating}
                          onClick={() => setMinRating(rating)}
                          className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all ${
                            minRating === rating 
                            ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/10 ring-1 ring-amber-200' 
                            : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {rating === 0 ? 'Any' : `${rating}+ ★`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1 flex-1">
                    {filteredPartners.length > 0 ? (
                      filteredPartners.map(p => (
                        <button 
                          key={p.id} 
                          onClick={() => {
                            setFormData({...formData, partnerId: p.id});
                            if ('vibrate' in navigator) navigator.vibrate(5);
                          }} 
                          className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center gap-4 group/card relative ${formData.partnerId === p.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 ring-4 ring-blue-500/10' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'}`}
                        >
                          <div className="relative">
                            <img src={p.logo} alt="" className="w-10 h-10 rounded-xl bg-slate-100 shadow-sm" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-2 truncate">
                                <p className="text-xs font-black text-slate-900 dark:text-white truncate">{p.name}</p>
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 animate-pulse ${
                                  p.availability === 'AVAILABLE' ? 'bg-emerald-500' : p.availability === 'LIMITED' ? 'bg-amber-500' : 'bg-rose-500'
                                }`}></div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                <span className="text-[10px] font-black text-amber-500">★ {p.rating}</span>
                              </div>
                            </div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter truncate">{p.specialization}</p>
                          </div>
                          
                          {/* Info Button Overlay */}
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProfilePartner(p);
                            }}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-blue-600"
                          >
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>

                          <div className={`w-4 h-4 rounded-full border-4 flex-shrink-0 ml-1 ${formData.partnerId === p.id ? 'border-blue-600 bg-blue-600' : 'border-slate-200 dark:border-slate-700'}`}></div>
                        </button>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full py-10 opacity-50 grayscale">
                        <svg className="w-10 h-10 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No Carrier Matches</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {currentStep === 'review' && (
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white"><CargoIcon type={formData.cargoType} className="w-5 h-5" /></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Payload</p>
                      <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{formData.cargoType}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Routing Hubs</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{formData.origin} &rarr; {formData.destination}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Mass</p>
                      <p className="text-xs font-black text-slate-900 dark:text-white">{formData.weight}{formData.weightUnit}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ETD</p>
                      <p className="text-xs font-black text-slate-900 dark:text-white">{formData.preferredDate}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Carrier</p>
                    <p className="text-xs font-black text-blue-600 uppercase mt-1">{partners.find(p => p.id === formData.partnerId)?.name}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Local Preference</p>
                    <p className="text-xs font-black text-emerald-600 uppercase mt-1">Settle in {clientDetectedCurrency} ({detectedRegion || 'Auto'})</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
          {currentStepIndex > 0 && (
            <button onClick={() => setCurrentStep(steps[currentStepIndex - 1].id)} className="px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Back</button>
          )}
          <button 
            onClick={currentStep === 'review' ? handleSubmit : handleNext} 
            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 hover:bg-blue-700 transition-all"
          >
            {currentStep === 'review' ? 'Transmit Request' : 'Continue'}
          </button>
        </div>
      </div>

      <div className="lg:col-span-7 xl:col-span-8 space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">Global Pipeline</h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Flow</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {requests.length === 0 ? (
            <div className="md:col-span-2 p-16 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-300">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <p className="text-slate-400 font-black uppercase text-xs tracking-[0.2em]">Pipeline Idle: No Active Shipments</p>
            </div>
          ) : (
            requests.map(req => (
              <RequestCard 
                key={req.id} 
                request={req} 
                partnerName={partners.find(p => p.id === req.partnerId)?.name || 'Carrier'} 
                partner={partners.find(p => p.id === req.partnerId)} 
                showClientActions={true} 
                onUpdateStatus={(status, ...args) => onUpdateStatus(req.id, status, ...args)} 
                onAddFeedback={onAddFeedback}
                paymentMethods={paymentMethods}
                requests={requests} // Added for history in profile modal
                blockedPartnerIds={blockedPartnerIds}
                onToggleBlockPartner={onToggleBlockPartner}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientView;