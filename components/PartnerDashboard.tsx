
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
    paymentMethod?: string
  ) => void;
  onUpdatePartner: (partnerId: string, updates: Partial<LogisticsPartner>) => void;
  partner: LogisticsPartner;
  paymentMethods: PaymentMethod[];
}

const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ 
  partnerId, 
  requests, 
  onUpdateStatus, 
  onUpdatePartner,
  partner,
  paymentMethods
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 transition-colors">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 w-full md:w-auto">
          <img src={partner.logo} alt={partner.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex-shrink-0" />
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight">{partner.name}</h1>
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-x-3 gap-y-1 mt-1">
              <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">{partner.location}</span>
              <span className="hidden xs:inline text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center text-amber-500 font-bold text-xs sm:text-sm">
                <svg className="w-4 h-4 mr-1 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                {partner.rating}
              </span>
            </div>
            
            <div className="mt-4 flex flex-col items-center sm:items-start gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Business Status</p>
              <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.status}
                    onClick={() => setAvailability(opt.status)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${
                      partner.availability === opt.status
                        ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${opt.color} ${partner.availability === opt.status ? 'animate-pulse' : ''}`}></span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-6 sm:space-x-8 w-full sm:w-auto justify-center md:justify-end border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pt-4 sm:pt-0 sm:pl-8">
          <div className="text-center">
            <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold mb-1">Accepted</p>
            <p className="text-2xl sm:text-4xl font-black text-blue-600 dark:text-blue-400">{requests.filter(r => r.status === RequestStatus.ACCEPTED).length}</p>
          </div>
          <div className="text-center border-l border-slate-100 dark:border-slate-800 pl-6 sm:pl-8">
            <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold mb-1">New</p>
            <p className="text-2xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">{pending.length}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-slate-800 dark:text-white flex items-center">
          Pending Quote Requests
          <span className="ml-3 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
        </h2>
        {pending.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center text-slate-500 dark:text-slate-400 transition-colors">
            <p className="font-medium text-sm sm:text-base">No active inquiries at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {pending.map(req => (
              <RequestCard 
                key={req.id} 
                request={req} 
                partnerName={partner.name}
                partner={partner}
                showActions={true}
                onAccept={(price, currency, notes, terms, logo, detailsOrder, includePartnerLogo, brokerFee, brokerFeePercent, paymentMethod) => 
                  onUpdateStatus(req.id, RequestStatus.ACCEPTED, price, currency, notes, terms, logo, detailsOrder, includePartnerLogo, brokerFee, brokerFeePercent, paymentMethod)}
                onDeny={() => onUpdateStatus(req.id, RequestStatus.DENIED)}
                paymentMethods={paymentMethods}
              />
            ))}
          </div>
        )}
      </div>

      {others.length > 0 && (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-slate-800 dark:text-white">Transaction History</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {others.map(req => (
              <RequestCard 
                key={req.id} 
                request={req} 
                partnerName={partner.name}
                partner={partner}
                paymentMethods={paymentMethods}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerDashboard;
