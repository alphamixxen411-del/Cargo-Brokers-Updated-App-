import React from 'react';
import { CargoQuoteRequest, RequestStatus, LogisticsPartner, AvailabilityStatus, PaymentMethod } from '../types';
import RequestCard from './RequestCard';

interface PartnerDashboardProps {
  partnerId: string;
  requests: CargoQuoteRequest[];
  onUpdateStatus: (
    id: string, 
    status: RequestStatus, 
    price?: number, 
    currency?: string,
    notes?: string,
    terms?: string,
    logo?: string,
    detailsOrder?: string[],
    includePartnerLogo?: boolean,
    brokerFee?: number,
    brokerFeePercent?: number,
    paymentMethod?: string,
    headerImage?: string,
    headerMessage?: string
  ) => void;
  onUpdatePartner: (partnerId: string, updates: Partial<LogisticsPartner>) => void;
  partner: LogisticsPartner;
  paymentMethods: PaymentMethod[];
  defaultBrokerageFee: number;
}

const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ 
  partnerId, 
  requests, 
  onUpdateStatus, 
  onUpdatePartner,
  partner,
  paymentMethods,
  defaultBrokerageFee
}) => {
  const pending = requests.filter(r => r.status === RequestStatus.PENDING);
  const others = requests.filter(r => r.status !== RequestStatus.PENDING);

  const setAvailability = (status: AvailabilityStatus) => {
    onUpdatePartner(partnerId, { availability: status });
  };

  const statusOptions: { status: AvailabilityStatus; color: string; label: string }[] = [
    { status: 'AVAILABLE', color: 'bg-emerald-500', label: 'Available' },
    { status: 'LIMITED', color: 'bg-amber-500', label: 'Limited' },
    { status: 'UNAVAILABLE', color: 'bg-rose-500', label: 'Unavailable' },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 transition-colors">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 w-full md:w-auto">
          <img src={partner.logo} alt={partner.name} className="w-20 h-20 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex-shrink-0" />
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">{partner.name}</h1>
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-x-3 gap-y-1 mt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">{partner.location}</span>
              <span className="hidden xs:inline text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center text-amber-500 font-black text-xs sm:text-sm">★ {partner.rating}</span>
            </div>
            
            <div className="mt-4 flex flex-col items-center sm:items-start gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Node Status</p>
              <div className="flex gap-1.5 p-1 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.status}
                    onClick={() => setAvailability(opt.status)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                      partner.availability === opt.status
                        ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full md:w-auto items-center md:items-end">
           <div className="flex space-x-6 border-slate-100 dark:border-slate-800">
             <div className="text-center">
               <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">In Transit</p>
               <p className="text-3xl font-black text-blue-600">{requests.filter(r => r.status === RequestStatus.ACCEPTED).length}</p>
             </div>
             <div className="text-center border-l border-slate-100 dark:border-slate-800 pl-6">
               <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">New Inquiries</p>
               <p className="text-3xl font-black text-emerald-600">{pending.length}</p>
             </div>
           </div>
           
           <div className="px-5 py-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 02 2 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2.5"/></svg>
              </div>
              <div>
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Platform Protocol Fee</p>
                <p className="text-xs font-black text-slate-900 dark:text-white leading-none">{defaultBrokerageFee}% <span className="text-[10px] opacity-40">(Managed by Admin)</span></p>
              </div>
           </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3 px-2">
          Pipeline Flow
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
        </h2>
        
        {pending.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-16 text-center text-slate-400 transition-colors">
            <p className="font-black uppercase tracking-widest text-xs">Awaiting new quote inquiries...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pending.map(req => (
              <RequestCard 
                key={req.id} 
                request={req} 
                partnerName={partner.name}
                partner={partner}
                showActions={true}
                onAccept={(price, currency, notes, terms, logo, detailsOrder, includePartnerLogo, brokerFee, brokerFeePercent, paymentMethod, headerImage, headerMessage) => 
                  onUpdateStatus(req.id, RequestStatus.ACCEPTED, price, currency, notes, terms, logo, detailsOrder, includePartnerLogo, brokerFee, brokerFeePercent, paymentMethod, headerImage, headerMessage)}
                onDeny={() => onUpdateStatus(req.id, RequestStatus.DENIED)}
                paymentMethods={paymentMethods}
                defaultBrokerageFee={defaultBrokerageFee}
              />
            ))}
          </div>
        )}
      </div>

      {others.length > 0 && (
        <div className="pt-10 border-t border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 px-2">Operational History</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {others.map(req => (
              <RequestCard 
                key={req.id} 
                request={req} 
                partnerName={partner.name}
                partner={partner}
                paymentMethods={paymentMethods}
                defaultBrokerageFee={defaultBrokerageFee}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerDashboard;