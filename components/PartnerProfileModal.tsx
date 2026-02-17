import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LogisticsPartner, CargoQuoteRequest, RequestStatus, AvailabilityStatus, Testimonial } from '../types';
import { geocodeLocation } from '../services/geminiService';
import CargoIcon from './CargoIcon';

declare const L: any;

interface PartnerProfileModalProps {
  partner: LogisticsPartner;
  requests: CargoQuoteRequest[];
  isBlocked?: boolean;
  onToggleBlock?: () => void;
  onClose: () => void;
}

const AvailabilityBadge = ({ status }: { status: AvailabilityStatus }) => {
  const config = {
    AVAILABLE: { 
      color: 'bg-emerald-500', 
      label: 'Capacity: Available',
      icon: (
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      )
    },
    LIMITED: { 
      color: 'bg-amber-500', 
      label: 'Capacity: Limited',
      icon: (
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2v20c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
        </svg>
      )
    },
    UNAVAILABLE: { 
      color: 'bg-rose-500', 
      label: 'Capacity: Full',
      icon: (
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      )
    }
  };
  const { color, label, icon } = config[status];
  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white ${color} shadow-lg shadow-black/5`}>
      {icon}
      {label}
    </div>
  );
};

const CoverageMap: React.FC<{ areas: string[], hub: string }> = ({ areas, hub }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const initCoverageMap = async () => {
      if (!mapContainerRef.current) return;
      setLoading(true);
      const hubCoords = await geocodeLocation(hub);
      const coordPromises = areas.map(async (area) => {
        const coords = await geocodeLocation(area);
        return coords ? { ...coords, name: area } : null;
      });
      const results = (await Promise.all(coordPromises)).filter((c): c is { lat: number, lng: number, name: string } => c !== null);
      if (!isMounted) return;
      
      try {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        
        if (!mapContainerRef.current) return;

        const map = L.map(mapContainerRef.current, { 
          zoomControl: true, 
          attributionControl: false,
          scrollWheelZoom: false
        }).setView([20, 0], 2);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        
        const markers: any[] = [];
        
        if (hubCoords) {
          const hubIcon = L.divIcon({ 
            className: 'custom-div-icon', 
            html: `<div class="relative flex items-center justify-center"><div class="absolute w-12 h-12 bg-lime-500/20 rounded-full animate-pulse"></div><div class="relative w-5 h-5 bg-lime-600 rounded-full border-2 border-white shadow-lg"></div></div>`, 
            iconSize: [40, 40], 
            iconAnchor: [20, 20] 
          });
          const hubMarker = L.marker([hubCoords.lat, hubCoords.lng], { icon: hubIcon }).addTo(map);
          hubMarker.bindPopup(`<div class="p-2 font-black text-xs uppercase tracking-widest text-slate-800">Primary Hub: ${hub}</div>`);
          markers.push(hubMarker);
        }

        results.forEach((res) => {
          const areaIcon = L.divIcon({ 
            className: 'custom-div-icon', 
            html: `<div class="relative flex items-center justify-center"><div class="absolute w-8 h-8 bg-blue-500/10 rounded-full"></div><div class="relative w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white shadow-md"></div></div>`, 
            iconSize: [32, 32], 
            iconAnchor: [16, 16] 
          });
          const areaMarker = L.marker([res.lat, res.lng], { icon: areaIcon }).addTo(map);
          areaMarker.bindPopup(`<div class="p-2 font-black text-xs uppercase tracking-widest text-blue-600">Service Area: ${res.name}</div>`);
          markers.push(areaMarker);
          
          if (hubCoords) {
            L.polyline([[hubCoords.lat, hubCoords.lng], [res.lat, res.lng]], { 
              color: '#3b82f6', 
              weight: 1.5, 
              opacity: 0.4, 
              dashArray: '5, 10' 
            }).addTo(map);
          }
        });

        if (markers.length > 0) {
          const group = new L.featureGroup(markers);
          map.fitBounds(group.getBounds(), { padding: [40, 40] });
        }
        
        mapRef.current = map;
      } catch (err) { 
        console.error("Map Error:", err); 
      } finally { 
        setLoading(false); 
      }
    };
    
    initCoverageMap();
    return () => { 
      isMounted = false; 
      if (mapRef.current) { 
        mapRef.current.remove(); 
        mapRef.current = null; 
      } 
    };
  }, [areas, hub]);

  return (
    <div className="relative w-full h-64 sm:h-80 bg-slate-50 dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner group transition-all">
      {loading && (
        <div className="absolute inset-0 z-[400] flex flex-col items-center justify-center bg-white dark:bg-slate-950">
          <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Plotting Coverage Nodes...</p>
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-full z-[300]" />
      <div className="absolute bottom-4 left-4 z-[401] flex flex-col gap-2">
         <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl pointer-events-none">
            <div className="flex items-center gap-2 mb-1">
               <div className="w-2 h-2 rounded-full bg-lime-500"></div>
               <span className="text-[8px] font-black uppercase text-slate-600 dark:text-slate-400">Headquarters</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-blue-600"></div>
               <span className="text-[8px] font-black uppercase text-slate-600 dark:text-slate-400">Regional Coverage</span>
            </div>
         </div>
      </div>
    </div>
  );
};

const PartnerProfileModal: React.FC<PartnerProfileModalProps> = ({ partner, requests, isBlocked, onToggleBlock, onClose }) => {
  const [activeTab, setActiveTab] = useState<'about' | 'history' | 'reviews'>('about');
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partner.location + ' ' + partner.name)}`;
  
  const recentHistory = useMemo(() => {
    return requests
      .filter(r => r.partnerId === partner.id && (r.status === RequestStatus.ACCEPTED || r.status === RequestStatus.DELIVERED))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [requests, partner.id]);

  const handleBlockClick = () => {
    if ('vibrate' in navigator) navigator.vibrate(10);
    setShowBlockConfirm(true);
  };

  const handleConfirmBlock = () => {
    if (onToggleBlock) {
      if ('vibrate' in navigator) navigator.vibrate(40);
      onToggleBlock();
      setShowBlockConfirm(false);
      onClose();
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'about':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-8 mb-8 sm:mb-10">
              <img src={partner.logo} alt={partner.name} className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border border-slate-200 shadow-sm" />
              <div className="text-center sm:text-left">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight">{partner.name}</h2>
                <p className="text-blue-600 dark:text-blue-400 font-bold tracking-wide mt-1 text-sm sm:text-base">{partner.specialization}</p>
                <div className="flex items-center justify-center sm:justify-start mt-3 space-x-3">
                  <span className="flex items-center text-amber-500 font-bold text-xs sm:text-sm">★ {partner.rating}</span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-semibold">{partner.fleetSize} assets</span>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interactive Network Coverage</h4>
                <div className="flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                   <span className="text-[9px] font-black text-blue-500 uppercase">Live Routing Mesh</span>
                </div>
              </div>
              <CoverageMap areas={partner.serviceAreas} hub={partner.location} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Base of Operations</h4>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-colors group">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{partner.location}</p>
                  <p className="text-[10px] text-blue-600 mt-1 uppercase font-black group-hover:translate-x-1 transition-transform">View Hub Details &rarr;</p>
                </a>
              </div>
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Node Connectivity</h4>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{partner.email}</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{partner.phone}</p>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-6 border-t border-slate-100 dark:border-slate-800">
              {!showBlockConfirm ? (
                <button 
                  onClick={handleBlockClick}
                  className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border-2 ${isBlocked ? 'text-blue-600 border-blue-100 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900/30' : 'text-slate-400 border-slate-100 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 dark:border-slate-800 dark:hover:bg-rose-900/10'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  {isBlocked ? 'Unblock Carrier' : 'Block Carrier'}
                </button>
              ) : (
                <div className="p-5 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl animate-in slide-in-from-bottom-4">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 flex-shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    </div>
                    <div>
                      <p className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider">Confirm Block Request</p>
                      <p className="text-[10px] text-rose-600/80 dark:text-rose-400/60 mt-1 font-medium leading-relaxed">
                        By blocking {partner.name}, they will no longer appear in your active partner list and cannot receive new quote inquiries from your account.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowBlockConfirm(false)}
                      className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      Nevermind
                    </button>
                    <button 
                      onClick={handleConfirmBlock}
                      className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-lg shadow-rose-500/20 transition-all active:scale-95"
                    >
                      Block Carrier
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 'history':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {recentHistory.length > 0 ? (
              recentHistory.map(req => (
                <div key={req.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:border-blue-200 transition-colors">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate max-w-[70%]">{req.origin} &rarr; {req.destination}</p>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded ring-1 ring-emerald-200/50">{req.status}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                     <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <CargoIcon type={req.cargoType} className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span className="text-[9px] text-slate-700 dark:text-slate-300 font-black uppercase tracking-tight">{req.cargoType}</span>
                     </div>
                     <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">• {req.weight}{req.weightUnit || 'kg'}</span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-50 dark:border-slate-800/50 text-[8px] font-bold text-slate-400 uppercase">
                    Completed on {new Date(req.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center bg-slate-50 dark:bg-slate-800/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-400 italic">No historical shipment data available.</p>
              </div>
            )}
          </div>
        );
      case 'reviews':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between px-2">
               <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Client Satisfaction</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Based on {partner.testimonials.length} reviews</p>
               </div>
               <div className="text-right">
                  <p className="text-2xl font-black text-amber-500">★ {partner.rating}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Avg Rating</p>
               </div>
            </div>

            <div className="space-y-4">
              {partner.testimonials.length > 0 ? (
                partner.testimonials.map((t, idx) => (
                  <div key={idx} className="p-5 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-black text-[10px] uppercase">
                          {t.author.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{t.author}</p>
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Verified Client</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg key={i} className={`w-3 h-3 ${i < t.rating ? 'fill-current' : 'fill-slate-200 dark:fill-slate-700'}`} viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic font-medium leading-relaxed">"{t.text}"</p>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center bg-slate-50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-400 italic">No reviews yet for this partner.</p>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md transition-opacity" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 relative">
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 p-4 sm:p-6 flex justify-between items-center z-50">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Partner Dossier</h3>
          <div className="flex items-center gap-3">
            <AvailabilityBadge status={partner.availability} />
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex bg-slate-50 dark:bg-slate-800/50 p-1 mx-4 sm:mx-6 mt-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <button onClick={() => { setActiveTab('about'); setShowBlockConfirm(false); }} className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'about' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}>About</button>
          <button onClick={() => { setActiveTab('history'); setShowBlockConfirm(false); }} className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}>History</button>
          <button onClick={() => { setActiveTab('reviews'); setShowBlockConfirm(false); }} className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'reviews' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}>Reviews</button>
        </div>
        
        <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar flex-1 pb-10">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default PartnerProfileModal;