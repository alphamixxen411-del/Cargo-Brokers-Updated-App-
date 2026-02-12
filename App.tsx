
import React, { useState, useEffect, Suspense, lazy, useMemo } from 'react';
import { UserRole, CargoQuoteRequest, RequestStatus, LogisticsPartner, Testimonial, PaymentMethod } from './types';
import { INITIAL_PARTNERS } from './constants';
import { AppDatabase } from './services/storageService';
import Navbar from './components/Navbar';
import SplashScreen from './components/SplashScreen';
import LocationPermissionGuard from './components/LocationPermissionGuard';
import AiOperationsAssistant from './components/AiOperationsAssistant';
import OfflineIndicator from './components/OfflineIndicator';

const ClientView = lazy(() => import('./components/ClientView'));
const PartnerDashboard = lazy(() => import('./components/PartnerDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

const ViewLoader = () => (
  <div className="space-y-6 animate-pulse p-4">
    <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-[2.5rem] w-full"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-[2rem]"></div>
      <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-[2rem]"></div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>(UserRole.CLIENT);
  const [requests, setRequests] = useState<CargoQuoteRequest[]>(() => AppDatabase.loadRequests());
  const [partners, setPartners] = useState<LogisticsPartner[]>(() => AppDatabase.loadPartners() || INITIAL_PARTNERS);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(() => {
    const saved = localStorage.getItem('cb_payment_methods');
    return saved ? JSON.parse(saved) : [
      { id: 'visa', name: 'Visa', icon: '💳' },
      { id: 'bank', name: 'Bank Transfer', icon: '🏦' },
      { id: 'm-pesa', name: 'M-Pesa / Mobile Money', icon: '📱' }
    ];
  });

  const [blockedPartnerIds, setBlockedPartnerIds] = useState<string[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string>(partners[0].id);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

  // Sync state to persistent local storage immediately
  useEffect(() => {
    AppDatabase.saveRequests(requests);
  }, [requests]);

  useEffect(() => {
    AppDatabase.savePartners(partners);
  }, [partners]);

  useEffect(() => {
    const timer = setTimeout(() => setIsAppLoading(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  // Haptic feedback utility
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success') => {
    if (!('vibrate' in navigator)) return;
    switch(type) {
      case 'light': navigator.vibrate(10); break;
      case 'medium': navigator.vibrate(30); break;
      case 'heavy': navigator.vibrate(60); break;
      case 'success': navigator.vibrate([20, 40, 20]); break;
    }
  };

  const handleRoleChange = (newRole: UserRole) => {
    triggerHaptic('light');
    setRole(newRole);
  };

  const handleAddRequest = (newRequest: CargoQuoteRequest) => {
    triggerHaptic('success');
    setRequests(prev => [newRequest, ...prev]);
  };

  const handleUpdateRequestStatus = (requestId: string, status: RequestStatus, ...args: any[]) => {
    triggerHaptic('medium');
    setRequests(prev => prev.map(req => req.id === requestId ? { ...req, status } : req));
  };

  const expiringRequests = useMemo(() => requests.filter(req => {
    if (req.status !== RequestStatus.ACCEPTED || !req.acceptedAt) return false;
    const expiryDate = new Date(new Date(req.acceptedAt).getTime() + 7 * 24 * 60 * 60 * 1000);
    return (expiryDate.getTime() - Date.now()) / (1000 * 3600 * 24) <= 2;
  }), [requests]);

  const renderContent = () => {
    switch (role) {
      case UserRole.CLIENT:
        return (
          <Suspense fallback={<ViewLoader />}>
            <ClientView 
              partners={partners} 
              requests={requests} 
              onSubmit={handleAddRequest} 
              blockedPartnerIds={blockedPartnerIds}
              onToggleBlockPartner={(id) => { triggerHaptic('light'); setBlockedPartnerIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]); }}
              onUpdateStatus={handleUpdateRequestStatus}
              onAddFeedback={() => triggerHaptic('success')}
              paymentMethods={paymentMethods}
            />
          </Suspense>
        );
      case UserRole.PARTNER:
        return (
          <Suspense fallback={<ViewLoader />}>
            <PartnerDashboard 
              partnerId={activePartnerId}
              requests={requests.filter(r => r.partnerId === activePartnerId)}
              onUpdateStatus={handleUpdateRequestStatus}
              onUpdatePartner={(id, updates) => setPartners(p => p.map(x => x.id === id ? {...x, ...updates} : x))}
              partner={partners.find(p => p.id === activePartnerId)!}
              paymentMethods={paymentMethods}
            />
          </Suspense>
        );
      case UserRole.ADMIN:
        return (
          <Suspense fallback={<ViewLoader />}>
            <AdminDashboard 
              requests={requests} 
              partners={partners} 
              onBulkUpdate={(ids, s) => { triggerHaptic('heavy'); setRequests(r => r.map(x => ids.includes(x.id) ? {...x, status: s} : x)); }}
              onUpdatePartner={(id, updates) => setPartners(p => p.map(x => x.id === id ? {...x, ...updates} : x))}
              paymentMethods={paymentMethods}
              setPaymentMethods={setPaymentMethods}
            />
          </Suspense>
        );
      default: return null;
    }
  };

  if (isAppLoading) return <SplashScreen />;

  return (
    <LocationPermissionGuard onAuthorized={() => triggerHaptic('light')}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
        <Navbar 
          role={role} 
          setRole={handleRoleChange} 
          activePartnerId={activePartnerId}
          setActivePartnerId={(id) => { triggerHaptic('light'); setActivePartnerId(id); }}
          partners={partners}
          notificationsCount={expiringRequests.length}
          expiringRequests={expiringRequests}
          onToggleAiAssistant={() => { triggerHaptic('medium'); setIsAiAssistantOpen(!isAiAssistantOpen); }}
          isAiAssistantOpen={isAiAssistantOpen}
        />
        
        <main className="flex-grow container mx-auto px-4 py-4 mb-20 lg:mb-0">
          {renderContent()}
        </main>

        <AiOperationsAssistant 
          isOpen={isAiAssistantOpen} 
          onClose={() => setIsAiAssistantOpen(false)} 
          requests={requests}
        />

        <OfflineIndicator />

        {/* Mobile Bottom Navigation Bar (Standard Android App Pattern) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe shadow-2xl flex justify-around items-center h-16 sm:h-20">
          {[
            { r: UserRole.CLIENT, icon: '📦', label: 'Client' },
            { r: UserRole.PARTNER, icon: '🚛', label: 'Partner' },
            { r: UserRole.ADMIN, icon: '🛡️', label: 'Admin' }
          ].map((item) => (
            <button
              key={item.r}
              onClick={() => handleRoleChange(item.r)}
              className={`flex flex-col items-center justify-center w-full h-full transition-all ${
                role === item.r 
                ? 'text-blue-600 dark:text-blue-400 font-black' 
                : 'text-slate-400 font-bold grayscale'
              }`}
            >
              <span className="text-lg mb-1">{item.icon}</span>
              <span className="text-[10px] uppercase tracking-widest">{item.label}</span>
              {role === item.r && <span className="w-1 h-1 bg-blue-600 rounded-full mt-1"></span>}
            </button>
          ))}
        </div>

        <footer className="hidden lg:block bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 mt-6">
          <div className="container mx-auto px-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            &copy; {new Date().getFullYear()} CargoBroker Enterprise · Node Enabled
          </div>
        </footer>
      </div>
    </LocationPermissionGuard>
  );
};

export default App;
