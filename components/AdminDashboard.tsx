import React, { useState, useMemo } from 'react';
import { CargoQuoteRequest, LogisticsPartner, RequestStatus, AvailabilityStatus, PaymentMethod } from '../types';
import { CARGO_TYPES } from '../constants';
import CargoIcon from './CargoIcon';

interface AdminDashboardProps {
  requests: CargoQuoteRequest[];
  partners: LogisticsPartner[];
  onBulkUpdate?: (ids: string[], status: RequestStatus) => void;
  onUpdatePartner?: (partnerId: string, updates: Partial<LogisticsPartner>) => void;
  paymentMethods: PaymentMethod[];
  setPaymentMethods: React.Dispatch<React.SetStateAction<PaymentMethod[]>>;
  defaultBrokerageFee: number;
  setDefaultBrokerageFee: (fee: number) => void;
  blockedPartnerIds: string[];
  onToggleBlockPartner: (id: string) => void;
}

const RatingHistogram: React.FC<{ partner: LogisticsPartner }> = ({ partner }) => {
  const distribution = useMemo(() => {
    const total = Math.min(partner.historicalTotalShipments, 100);
    return [
      Math.max(1, Math.round(total * 0.05)),
      Math.max(2, Math.round(total * 0.05)),
      Math.max(5, Math.round(total * 0.15)),
      Math.max(10, Math.round(total * 0.25)),
      Math.max(20, Math.round(total * 0.50)),
    ].reverse();
  }, [partner]);
  const max = Math.max(...distribution);
  return (
    <div className="space-y-2 w-full">
      {distribution.map((count, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-[9px] font-black text-slate-400 w-4">{5 - i}★</span>
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-amber-400 rounded-full transition-all duration-1000 ease-out" style={{ width: `${(count / max) * 100}%` }}></div>
          </div>
        </div>
      ))}
    </div>
  );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  requests, 
  partners, 
  onBulkUpdate, 
  onUpdatePartner, 
  paymentMethods, 
  setPaymentMethods,
  defaultBrokerageFee,
  setDefaultBrokerageFee,
  blockedPartnerIds,
  onToggleBlockPartner
}) => {
  const [activeTab, setActiveTab] = useState<'shipments' | 'partners' | 'settings'>('shipments');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [simValue, setSimValue] = useState(10000);

  const stats = useMemo(() => {
    const accepted = requests.filter(r => r.status === RequestStatus.ACCEPTED || r.status === RequestStatus.DELIVERED);
    const totalPlatformRevenue = accepted.reduce((sum, r) => sum + (r.brokerFee || 0), 0);
    const totalWeightKg = requests.reduce((sum, r) => sum + (r.weight * (r.weightUnit === 't' ? 1000 : 1)), 0);
    return { 
      totalRevenue: totalPlatformRevenue, 
      totalWeight: totalWeightKg, 
      activeTracking: accepted.length, 
      totalRequests: requests.length 
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const statusMatch = filterStatus === 'ALL' || r.status === filterStatus;
      const searchMatch = r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || r.id.toLowerCase().includes(searchTerm.toLowerCase());
      return statusMatch && searchMatch;
    });
  }, [requests, filterStatus, searchTerm]);

  const StatCard = ({ label, value, sub, icon, color }: any) => (
    <div className="relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl transition-all hover:scale-[1.02] overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <div className={`p-2 rounded-xl ${color} bg-opacity-10 text-opacity-100`}>{icon}</div>
      </div>
      <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
      {sub && <p className="text-[10px] font-bold text-slate-500 mt-2">{sub}</p>}
    </div>
  );

  // Unified high-accessibility input style
  const adminInputClasses = "bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-xs font-bold outline-none transition-all duration-300 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Platform Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} sub={`${stats.activeTracking} active flows`} color="bg-emerald-500 text-emerald-600" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2"/></svg>} />
        <StatCard label="Tonnage" value={`${(stats.totalWeight / 1000).toFixed(1)}t`} sub="Total managed mass" color="bg-blue-500 text-blue-600" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 6l3 1m0 0l-3 9"/></svg>} />
        <StatCard label="Partners" value={partners.length} sub="Verified carrier nodes" color="bg-indigo-500 text-indigo-600" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 20h5v-2"/></svg>} />
        <StatCard label="Requests" value={stats.totalRequests} sub="All time interactions" color="bg-amber-500 text-amber-600" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>} />
      </div>

      <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto scrollbar-hide shadow-sm">
        {['shipments', 'partners', 'settings'].map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab as any)} 
            className={`flex-1 min-w-[100px] py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'shipments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
             <input 
               type="text" 
               placeholder="Search by client or ID..." 
               value={searchTerm} 
               onChange={(e) => setSearchTerm(e.target.value)} 
               className={`flex-1 ${adminInputClasses}`}
             />
             <div className="flex gap-2">
                {['ALL', 'PENDING', 'ACCEPTED', 'DELIVERED'].map(s => (
                  <button 
                    key={s} 
                    onClick={() => setFilterStatus(s)} 
                    className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === s ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-400'}`}
                  >
                    {s}
                  </button>
                ))}
             </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="hidden sm:table-header-group">
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Route</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Quote</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all flex flex-col sm:table-row">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-500"><CargoIcon type={req.cargoType} className="w-4 h-4" /></div>
                        <div><p className="text-xs font-black">{req.clientName}</p><p className="text-[9px] font-bold text-slate-400">ID: {req.id.split('-').pop()}</p></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold">{req.origin} &rarr; {req.destination}</p>
                      <p className="text-[9px] text-slate-400 uppercase font-black">{req.weight}{req.weightUnit || 'kg'} · {req.cargoType}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${req.status === RequestStatus.ACCEPTED ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{req.status}</span>
                    </td>
                    <td className="px-6 py-4 text-left sm:text-right">
                      <p className="text-sm font-black text-emerald-600">${(req.quotedPrice || 0).toLocaleString()}</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase">Fee: ${(req.brokerFee || 0).toLocaleString()}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'partners' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
          {partners.map(p => {
            const isBlocked = blockedPartnerIds.includes(p.id);
            return (
              <div key={p.id} className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col group hover:shadow-xl transition-all duration-300 ${isBlocked ? 'opacity-60 saturate-50' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <img src={p.logo} className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm" alt="" />
                    <div>
                      <h4 className="text-lg font-black tracking-tight">{p.name}</h4>
                      <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{p.specialization}</p>
                    </div>
                  </div>
                  {isBlocked && (
                    <span className="px-2 py-1 bg-rose-500 text-white text-[8px] font-black uppercase rounded-lg shadow-lg shadow-rose-500/20">Suspended</span>
                  )}
                </div>
                <RatingHistogram partner={p} />
                
                <div className="mt-6 space-y-3">
                   <div className="flex gap-2">
                    {(['AVAILABLE', 'LIMITED', 'UNAVAILABLE'] as AvailabilityStatus[]).map(status => (
                      <button
                        key={status}
                        disabled={isBlocked}
                        onClick={() => onUpdatePartner?.(p.id, { availability: status })}
                        className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                          p.availability === status
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-2 border-slate-900 dark:border-white shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-200'
                        } ${isBlocked ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        {status.slice(0, 5)}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => onToggleBlockPartner(p.id)}
                    className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                      isBlocked 
                      ? 'bg-blue-50 text-blue-600 border-2 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/40' 
                      : 'bg-rose-50 text-rose-600 border-2 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/40 hover:bg-rose-600 hover:text-white'
                    }`}
                  >
                    {isBlocked ? 'Reactivate Carrier' : 'Suspend Carrier Node'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in duration-300">
          <div className="bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="flex flex-col md:flex-row justify-between gap-8 mb-10 relative z-10">
               <div>
                  <h3 className="text-2xl font-black tracking-tight">System Settings</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Platform-wide Global Defaults</p>
               </div>
               <div className="bg-blue-600 text-white px-8 py-5 rounded-3xl shadow-xl shadow-blue-500/20 text-center min-w-[160px]">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-1">Brokerage Margin</p>
                  <p className="text-3xl font-black">{defaultBrokerageFee}%</p>
               </div>
            </div>

            <div className="space-y-12 relative z-10">
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Fee Multiplier</label>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border-2 ${defaultBrokerageFee > 15 ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-emerald-100 text-emerald-600 border-emerald-200'}`}>
                    {defaultBrokerageFee > 15 ? 'High Yield Zone' : 'Market Competitive'}
                  </span>
                </div>
                
                <input 
                  type="range" 
                  min="1" 
                  max="40" 
                  step="0.5"
                  value={defaultBrokerageFee} 
                  onChange={(e) => {
                    if (navigator.vibrate) navigator.vibrate(5);
                    setDefaultBrokerageFee(Number(e.target.value));
                  }} 
                  className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                />
                
                <div className="flex justify-between px-1">
                  {[1, 5, 10, 15, 20, 30, 40].map(val => (
                    <button 
                      key={val} 
                      onClick={() => setDefaultBrokerageFee(val)} 
                      className={`text-[9px] font-black transition-all ${defaultBrokerageFee === val ? 'text-blue-600 scale-125' : 'text-slate-400'}`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-10 border-t border-slate-50 dark:border-slate-800">
                <div className="space-y-6">
                   <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                     Live Revenue Simulation
                   </h4>
                   <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-[10px] font-black uppercase mb-3 text-slate-400">
                          <span>Sample Quote Value</span>
                          <span className="text-slate-900 dark:text-white">${simValue.toLocaleString()}</span>
                        </div>
                        <input 
                          type="range" 
                          min="1000" 
                          max="100000" 
                          step="1000"
                          value={simValue} 
                          onChange={(e) => setSimValue(Number(e.target.value))} 
                          className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-slate-400"
                        />
                      </div>
                      <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl space-y-3">
                         <div className="flex justify-between text-[10px] font-black uppercase">
                            <span className="text-slate-400">Carrier Net Payment:</span>
                            <span className="text-slate-900 dark:text-white">${simValue.toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between text-[10px] font-black uppercase">
                            <span className="text-slate-400">Platform Margin ({defaultBrokerageFee}%):</span>
                            <span className="text-blue-600">+${((simValue * defaultBrokerageFee) / 100).toLocaleString()}</span>
                         </div>
                         <div className="h-px bg-slate-200 dark:bg-slate-700"></div>
                         <div className="flex justify-between text-xs font-black uppercase">
                            <span className="text-slate-900 dark:text-white">Billed to Client:</span>
                            <span className="text-emerald-600">${(simValue + (simValue * defaultBrokerageFee) / 100).toLocaleString()}</span>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                     Policy Guardrails
                   </h4>
                   <div className="space-y-4">
                      <div className="flex gap-4 p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl">
                         <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center text-[10px] font-black">1</div>
                         <p className="text-[10px] font-medium text-slate-500 leading-relaxed uppercase tracking-tight">Brokerage fees are applied globally and cannot be negotiated by partner carriers.</p>
                      </div>
                      <div className="flex gap-4 p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl">
                         <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center text-[10px] font-black">2</div>
                         <p className="text-[10px] font-medium text-slate-500 leading-relaxed uppercase tracking-tight">Margins are automatically calculated on top of base carrier rates to protect partner profit.</p>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Administrative protocol enforced globally</p>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;