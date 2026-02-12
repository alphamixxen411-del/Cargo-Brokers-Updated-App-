
import React, { useState, useEffect } from 'react';

interface LocationPermissionGuardProps {
  children: React.ReactNode;
  onAuthorized: (coords: { lat: number; lng: number }) => void;
}

const LocationPermissionGuard: React.FC<LocationPermissionGuardProps> = ({ children, onAuthorized }) => {
  const [status, setStatus] = useState<'IDLE' | 'PROMPTING' | 'AUTHORIZED' | 'DENIED' | 'UNSUPPORTED'>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStatus('UNSUPPORTED');
      return;
    }

    setStatus('PROMPTING');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setStatus('AUTHORIZED');
        onAuthorized(coords);
        if ('vibrate' in navigator) navigator.vibrate(10);
      },
      (error) => {
        setStatus('DENIED');
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrorMessage("Access was declined. We can't optimize your logistics without your location.");
            break;
          case error.POSITION_UNAVAILABLE:
            setErrorMessage("Location information is unavailable at your current hub.");
            break;
          case error.TIMEOUT:
            setErrorMessage("The request to get your location timed out.");
            break;
          default:
            setErrorMessage("An unknown error occurred while verifying location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Auto-check on mount to see if permission is already granted
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          requestLocation();
        }
      });
    }
  }, []);

  if (status === 'AUTHORIZED') {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="max-w-md w-full">
        {/* Animated GPS Icon */}
        <div className="relative mb-8 flex justify-center">
          <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-ping duration-[3000ms]"></div>
          <div className="absolute inset-0 bg-blue-500/5 rounded-full animate-pulse scale-150"></div>
          <div className="relative w-24 h-24 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center">
            <svg className={`w-12 h-12 text-blue-600 dark:text-blue-400 ${status === 'PROMPTING' ? 'animate-bounce' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">
          Location Required
        </h2>
        
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed mb-8">
          To facilitate secure logistics and real-time route optimization, Cargo Brokers requires your current coordinates. This ensures accurate ETA calculations and matches clients with the most efficient local carriers.
        </p>

        {status === 'DENIED' && (
          <div className="mb-8 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl animate-in slide-in-from-bottom-2">
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
              {errorMessage}
            </p>
            <p className="text-[10px] text-rose-500/70 mt-2 uppercase font-black">
              Please check your browser's location settings and refresh.
            </p>
          </div>
        )}

        <button
          onClick={requestLocation}
          disabled={status === 'PROMPTING'}
          className={`w-full py-4 rounded-2xl font-black text-white transition-all shadow-xl shadow-blue-500/20 uppercase tracking-[0.1em] text-xs flex items-center justify-center gap-2 ${
            status === 'PROMPTING' ? 'bg-slate-300 dark:bg-slate-700' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
          }`}
        >
          {status === 'PROMPTING' ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Verifying Authorization...
            </>
          ) : (
            'Authorize Location Access'
          )}
        </button>

        <p className="mt-8 text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
          Secure Hub Verification Node
        </p>
      </div>
    </div>
  );
};

export default LocationPermissionGuard;
