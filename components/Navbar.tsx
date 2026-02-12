
import React, { useState, useEffect } from 'react';
import { UserRole, LogisticsPartner, CargoQuoteRequest } from '../types';

interface NavbarProps {
  role: UserRole;
  setRole: (role: UserRole) => void;
  activePartnerId: string;
  setActivePartnerId: (id: string) => void;
  partners: LogisticsPartner[];
  notificationsCount: number;
  expiringRequests: CargoQuoteRequest[];
  onInstall?: () => void;
  onToggleAiAssistant: () => void;
  isAiAssistantOpen: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ 
  role, 
  setRole, 
  activePartnerId, 
  setActivePartnerId, 
  partners,
  notificationsCount,
  expiringRequests,
  onInstall,
  onToggleAiAssistant,
  isAiAssistantOpen
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors">
      <div className="container mx-auto px-4 h-auto min-h-[4.5rem] py-3 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 self-start lg:self-center">
          <div className="w-12 h-12 bg-[#84cc16] rounded-xl flex items-center justify-center shadow-lg shadow-lime-500/20 flex-shrink-0 overflow-hidden border-2 border-white dark:border-slate-800">
            <svg className="w-7 h-7 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none font-serif">
              CARGO BROKERS
            </span>
            <span className="text-[10px] font-bold text-[#4d7c0f] dark:text-lime-500 uppercase tracking-[0.2em] mt-1">
              {role === UserRole.ADMIN ? 'Administrator Console' : 'Safe & Reliable'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 scrollbar-hide justify-between sm:justify-end">
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleAiAssistant}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${isAiAssistantOpen ? 'bg-indigo-600 text-white shadow-indigo-500/30' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeWidth="2.5"/></svg>
              AI Oracle
            </button>

            {onInstall && (
              <button
                onClick={onInstall}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Install App
              </button>
            )}

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-lime-600 dark:hover:text-lime-400 transition-all flex-shrink-0"
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>

            <div className="relative flex-shrink-0">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-lime-600 dark:hover:text-lime-400 transition-all relative"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {notificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce shadow-sm">
                    {notificationsCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-72 xs:w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-[100] overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">System Alerts</h4>
                    <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    {expiringRequests.length === 0 ? (
                      <div className="p-8 text-center"><p className="text-xs text-slate-400">System status optimal.</p></div>
                    ) : (
                      expiringRequests.map(req => (
                        <div key={req.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 transition-colors last:border-0">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0 text-orange-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Quote Expiry</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Ref: {req.id} for {req.cargoType} expires soon.</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex-shrink-0">
            {[UserRole.CLIENT, UserRole.PARTNER, UserRole.ADMIN].map((r) => (
              <button
                key={r}
                onClick={() => { setRole(r); setShowNotifications(false); }}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                  role === r 
                  ? 'bg-white dark:bg-slate-700 text-[#4d7c0f] dark:text-lime-400 shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {r === UserRole.CLIENT ? 'Client' : r === UserRole.PARTNER ? 'Partner' : 'Admin'}
              </button>
            ))}
          </div>

          {role === UserRole.PARTNER && (
            <select
              value={activePartnerId}
              onChange={(e) => setActivePartnerId(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 sm:px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500 transition-colors max-w-[120px] sm:max-w-none flex-shrink-0"
            >
              {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
