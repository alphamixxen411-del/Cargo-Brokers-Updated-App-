
import React, { useState, useEffect } from 'react';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSynced, setShowSynced] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      setShowSynced(true);
      setTimeout(() => setShowSynced(false), 3000);
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (isOnline && !showSynced) return null;

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 border transition-all duration-500 animate-in slide-in-from-bottom-4 ${
      isOnline 
      ? 'bg-emerald-600 border-emerald-500 text-white' 
      : 'bg-slate-900 border-slate-800 text-white'
    }`}>
      <div className="relative flex items-center justify-center">
        {isOnline ? (
          <div className="w-2 h-2 bg-white rounded-full"></div>
        ) : (
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
        )}
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
        {isOnline ? 'System Synchronized' : 'Offline - Running on Local Hub'}
      </p>
      {!isOnline && (
        <div className="w-4 h-4 text-slate-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;
