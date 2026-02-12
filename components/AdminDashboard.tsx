
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
}

const generateTrendData = (seed: string, length: number, base: number, volatility: number) => {
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return Array.from({ length }, (_, i) => {
    const variance = (Math.sin(hash + i) * volatility);
    return Math.max(0, Math.round(base + variance));
  });
};

const SimpleLineChart: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 40;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${points} ${width},${height} 0,${height}`;

  return (
    <div className="h-12 w-full">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
        <defs>
          <linearGradient id={`grad-${color.replace('#','')}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path d={`M ${areaPoints.split(' ')[0]} L ${areaPoints}`} fill={`url(#grad-${color.replace('#','')})`} className="animate-in fade-in duration-1000" />
        <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} className="transition-all duration-700 ease-in-out" />
      </svg>
    </div>
  );
};

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

const AdminDashboard: React.FC<AdminDashboardProps> = ({ requests, partners, onBulkUpdate, onUpdatePartner, paymentMethods, setPaymentMethods }) => {
  const [activeTab, setActiveTab] = useState<'shipments' | 'partners' | 'analytics' | 'settings'>('shipments');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPartner, setFilterPartner] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const stats = useMemo(() => {
    const accepted = requests.filter(r => r.status === RequestStatus.ACCEPTED || r.status === RequestStatus.DELIVERED);
    const totalPlatformRevenue = accepted.reduce((sum, r) => sum + (r.brokerFee || 0), 0);
    const totalWeightKg = requests.reduce((sum, r) => sum + (r.weight * (r.weightUnit === 't' ? 1000 : 1)), 0);
    return { totalRevenue: totalPlatformRevenue, totalWeight: totalWeightKg, activeTracking: accepted.length, totalRequests: requests.length };
  }, [requests]);

  const platformTrends = useMemo(() => ({
    revenue: generateTrendData('platform-revenue', 20, stats.totalRevenue / 20, 200),
    tonnage: generateTrendData('platform-tonnage', 20, stats.totalWeight / 20, 1000),
  }), [stats]);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const statusMatch = filterStatus === 'ALL' || r.status === filterStatus;
      const partnerMatch = filterPartner === 'ALL' || r.partnerId === filterPartner;
      const searchMatch = r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || r.id.toLowerCase().includes(searchTerm.toLowerCase());
      return statusMatch && partnerMatch && searchMatch;
    });
  }, [requests, filterStatus, filterPartner, searchTerm]);

  const StatCard = ({ label, value, sub, icon, color }: any) => (
    <div className="relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl transition-all hover:scale-[1.02] overflow-hidden">
      <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-[0.03] rounded-full -translate-y-1/2 translate-x-1/2`}></div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
        <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-opacity-100 shadow-sm`}>{icon}</div>
      </div>
      <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
      {sub && <p className="text-[10px] font-bold text-slate-500 mt-3 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Platform Net Fee" value={`$${stats.totalRevenue.toLocaleString()}`} sub={`${stats.activeTracking} In-Transit Flows`} color="bg-emerald-500 text-emerald-600" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2"/></svg>} />
        <StatCard label="Global Tonnage" value={`${(stats.totalWeight / 1000).toFixed(1)} tons`} sub="Consolidated Mass" color="bg-blue-500 text-blue-600" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 6l3 1m0 0l-3 9"/></svg>} />
        <StatCard label="Partner Nodes" value={partners.length} sub="Verified Hubs" color="bg-indigo-500 text-indigo-600" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 20h5v-2"/></svg>} />
        <StatCard label="Neural Precision" value="98.1%" sub="Optimized Rating" color="bg-amber-500 text-amber-600" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>} />
      </div>

      <div className="flex bg-white dark:bg-slate-900 p-2 rounded-3xl border border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto scrollbar-hide shadow-sm sticky top-20 z-40">
        {['shipments', 'partners', 'analytics', 'settings'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 min-w-[100px] py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'shipments' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
             <div className="relative w-full lg:w-72">
                <input type="text" placeholder="Search Invoices..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-12 py-3.5 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/10" />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
             </div>
             <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 lg:pb-0 w-full lg:w-auto">
                {['ALL', 'PENDING', 'ACCEPTED', 'DELIVERED'].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${filterStatus === s ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:border-blue-500'}`}>{s}</button>
                ))}
             </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="hidden lg:block">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo Identity</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Route Analysis</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Financials</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {filteredRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-all"><CargoIcon type={req.cargoType} className="w-5 h-5" /></div>
                           <div><p className="text-xs font-black text-slate-900 dark:text-white">{req.clientName}</p><p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">ID: {req.id.split('-').pop()}</p></div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{req.origin} &rarr; {req.destination}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-black mt-1.5">{req.weight} {req.weightUnit || 'kg'} · {req.cargoType}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${req.status === RequestStatus.ACCEPTED ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500'}`}>{req.status}</span>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-black text-emerald-600">${(req.quotedPrice || 0).toLocaleString()}</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase mt-1">Platform Fee: ${(req.brokerFee || 0).toLocaleString()}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Stacked Layout */}
            <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRequests.map(req => (
                <div key={req.id} className="p-6 space-y-4">
                   <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500"><CargoIcon type={req.cargoType} className="w-5 h-5" /></div>
                       <div><p className="text-xs font-black">{req.clientName}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {req.id.split('-').pop()}</p></div>
                     </div>
                     <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[9px] font-black uppercase tracking-widest">{req.status}</span>
                   </div>
                   <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                     <p className="text-xs font-bold">{req.origin} &rarr; {req.destination}</p>
                     <p className="text-[9px] text-slate-400 uppercase font-black mt-2">{req.weight} {req.weightUnit || 'kg'} · {req.cargoType}</p>
                   </div>
                   <div className="flex justify-between items-center px-1">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Settle</p>
                     <p className="text-sm font-black text-emerald-600">${(req.quotedPrice || 0).toLocaleString()}</p>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'partners' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-700">
          {partners.map(p => (
            <div key={p.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col group hover:shadow-2xl transition-all duration-500">
              <div className="flex items-center gap-5 mb-10">
                <img src={p.logo} className="w-16 h-16 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm group-hover:scale-110 transition-all" alt="" />
                <div><h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{p.name}</h4><p className="text-[9px] text-blue-600 font-black uppercase tracking-[0.2em]">{p.specialization}</p></div>
              </div>
              <RatingHistogram partner={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
