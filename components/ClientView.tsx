
import React, { useState, useMemo, useEffect } from 'react';
import { LogisticsPartner, CargoQuoteRequest, RequestStatus, AvailabilityStatus, Testimonial, PaymentMethod } from '../types';
import { CARGO_TYPES } from '../constants';
import { analyzeCargoRequest, getCurrencyInfoForLocation, preFlightRouteCheck } from '../services/geminiService';
import RequestCard from './RequestCard';
import PartnerProfileModal from './PartnerProfileModal';
import CargoIcon from './CargoIcon';

interface ClientViewProps {
  partners: LogisticsPartner[];
  requests: CargoQuoteRequest[];
  onSubmit: (request: CargoQuoteRequest) => void;
  blockedPartnerIds: string[];
  onToggleBlockPartner: (id: string) => void;
  onUpdateStatus: (id: string, status: RequestStatus, ...args: any[]) => void;
  onAddFeedback: (partnerId: string, testimonial: Testimonial, requestId: string) => void;
  paymentMethods: PaymentMethod[];
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
  paymentMethods
}) => {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [currentStep, setCurrentStep] = useState<Step>('contact');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [localCurrency, setLocalCurrency] = useState<{code: string, symbol: string}>({ code: 'USD', symbol: '$' });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [preFlightData, setPreFlightData] = useState<{ difficulty: number, estimatedDays: string, warning: string } | null>(null);
  const [isPreFlightLoading, setIsPreFlightLoading] = useState(false);

  const [formData, setFormData] = useState({
    clientName: '', clientEmail: '', clientPhone: '',
    origin: '', destination: '', cargoType: CARGO_TYPES[0],
    weight: 0, dimensions: '', preferredDate: tomorrow,
    partnerId: partners.find(p => !blockedPartnerIds.includes(p.id))?.id || partners[0].id
  });

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
    { id: 'contact', label: 'Contact', icon: '👤' },
    { id: 'route', label: 'Route', icon: '📍' },
    { id: 'cargo', label: 'Cargo', icon: '📦' },
    { id: 'partner', label: 'Partner', icon: '🚛' },
    { id: 'review', label: 'Review', icon: '✅' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const activePartners = useMemo(() => partners.filter(p => !blockedPartnerIds.includes(p.id)), [partners, blockedPartnerIds]);

  const validateStep = (step: Step): boolean => {
    const newErrors: Partial<Record<string, string>> = {};
    if (step === 'contact') {
      if (!formData.clientName.trim()) newErrors.clientName = "Required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clientEmail)) newErrors.clientEmail = "Invalid";
    } else if (step === 'route') {
      if (!formData.origin.trim()) newErrors.origin = "Required";
      if (!formData.destination.trim()) newErrors.destination = "Required";
    } else if (step === 'cargo') {
      if (formData.weight <= 0) newErrors.weight = "Required";
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
      const isTonnes = formData.weight >= 1000;
      const submittedWeight = isTonnes ? formData.weight / 1000 : formData.weight;
      const submittedUnit: 'kg' | 't' = isTonnes ? 't' : 'kg';

      const newRequest: CargoQuoteRequest = {
        ...formData,
        weight: submittedWeight, weightUnit: submittedUnit,
        id: `req-${Math.random().toString(36).substr(2, 9)}`,
        clientId: 'client-001', status: RequestStatus.PENDING,
        aiNotes: aiInsight, createdAt: new Date().toISOString()
      };
      
      onSubmit(newRequest);
      setIsSubmitted(true);
      setTimeout(() => setIsSubmitted(false), 2000);
      setCurrentStep('contact');
      setFormData({ ...formData, clientName: '', clientEmail: '', clientPhone: '', origin: '', destination: '', weight: 0, dimensions: '', preferredDate: tomorrow, cargoType: CARGO_TYPES[0], partnerId: activePartners[0]?.id || partners[0].id });
      setPreFlightData(null);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const inputClasses = (field: string) => `w-full rounded-2xl border-2 px-4 py-3.5 text-sm font-bold transition-all duration-300 outline-none ${
    errors[field] 
    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/10' 
    : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 focus:border-blue-500'
  }`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start max-w-[1400px] mx-auto">
      <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-2xl relative overflow-hidden transition-all">
        {isAiProcessing && (
          <div className="absolute inset-0 z-50 bg-white/95 dark:bg-slate-900/95 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-12 h-12 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-800 dark:text-white">Analyzing Route...</h3>
          </div>
        )}

        <div className="flex justify-between mb-10 relative px-2">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0"></div>
          <div className="absolute top-1/2 left-0 h-0.5 bg-blue-500 -translate-y-1/2 z-0 transition-all duration-500" style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}></div>
          {steps.map((s, i) => (
            <div key={s.id} className={`relative z-10 w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black border-2 transition-all duration-500 ${i <= currentStepIndex ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-300'}`}>
              {i < currentStepIndex ? '✓' : s.icon}
            </div>
          ))}
        </div>

        <div className="min-h-[340px] flex flex-col justify-center">
          <div key={currentStep} className="animate-in fade-in slide-in-from-right-8 duration-500 flex flex-col">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">{steps[currentStepIndex].label}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-8">Phase {currentStepIndex + 1}</p>

            <div className="space-y-4">
              {currentStep === 'contact' && (
                <>
                  <input type="text" placeholder="Contact Name" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className={inputClasses('clientName')} />
                  <input type="email" placeholder="Email Address" value={formData.clientEmail} onChange={e => setFormData({...formData, clientEmail: e.target.value})} className={inputClasses('clientEmail')} />
                  <input type="tel" placeholder="Phone" value={formData.clientPhone} onChange={e => setFormData({...formData, clientPhone: e.target.value})} className={inputClasses('clientPhone')} />
                </>
              )}
              {currentStep === 'route' && (
                <>
                  <input type="text" placeholder="Origin" value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})} className={inputClasses('origin')} />
                  <input type="text" placeholder="Destination" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} className={inputClasses('destination')} />
                  {(isPreFlightLoading || preFlightData) && (
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/20">
                      {isPreFlightLoading ? <p className="text-[9px] font-black animate-pulse">Checking...</p> : <p className="text-[9px] font-bold text-indigo-800 dark:text-indigo-300 italic">{preFlightData?.warning}</p>}
                    </div>
                  )}
                </>
              )}
              {currentStep === 'cargo' && (
                <>
                  <select value={formData.cargoType} onChange={e => setFormData({...formData, cargoType: e.target.value})} className={inputClasses('cargoType')}>
                    {CARGO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input type="number" placeholder="Weight (KG)" value={formData.weight || ''} onChange={e => setFormData({...formData, weight: Number(e.target.value)})} className={inputClasses('weight')} />
                </>
              )}
              {currentStep === 'partner' && (
                <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar">
                  {activePartners.map(p => (
                    <button key={p.id} onClick={() => setFormData({...formData, partnerId: p.id})} className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${formData.partnerId === p.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-800'}`}>
                      <p className="text-xs font-black">{p.name}</p>
                    </button>
                  ))}
                </div>
              )}
              {currentStep === 'review' && (
                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl space-y-2">
                  <p className="text-xs font-bold">{formData.origin} &rarr; {formData.destination}</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase">{formData.cargoType} · {formData.weight}kg</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 flex gap-4">
          {currentStepIndex > 0 && (
            <button onClick={() => setCurrentStep(steps[currentStepIndex - 1].id)} className="px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500">Back</button>
          )}
          <button 
            onClick={currentStep === 'review' ? handleSubmit : handleNext} 
            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
          >
            {currentStep === 'review' ? 'Finalize' : 'Continue'}
          </button>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">Active Pipeline</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {requests.map(req => (
            <RequestCard 
              key={req.id} 
              request={req} 
              partnerName={partners.find(p => p.id === req.partnerId)?.name || 'Carrier'} 
              partner={partners.find(p => p.id === req.partnerId)} 
              showClientActions={true} 
              onUpdateStatus={onUpdateStatus} 
              paymentMethods={paymentMethods}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientView;
