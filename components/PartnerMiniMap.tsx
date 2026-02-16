import React, { useEffect, useRef, useState } from 'react';
import { geocodeLocation } from '../services/geminiService';

declare const L: any;

interface PartnerMiniMapProps {
  location: string;
  name: string;
}

const PartnerMiniMap: React.FC<PartnerMiniMapProps> = ({ location, name }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Intersection Observer for Lazy Loading
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let isMounted = true;

    const initMap = async () => {
      setIsLoading(true);
      setError(false);
      
      const coords = await geocodeLocation(location);
      
      if (!isMounted || !containerRef.current) return;

      if (coords) {
        try {
          if (mapRef.current) {
            mapRef.current.remove();
          }

          const map = L.map(containerRef.current, {
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            touchZoom: false,
            keyboard: false,
            boxZoom: false
          }).setView([coords.lat, coords.lng], 10);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

          const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `
              <div class="relative flex items-center justify-center">
                <div class="absolute w-8 h-8 bg-blue-500/20 rounded-full animate-ping"></div>
                <div class="relative w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-sm"></div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          L.marker([coords.lat, coords.lng], { icon: customIcon }).addTo(map);
          
          mapRef.current = map;
          setIsLoading(false);
        } catch (err) {
          console.error("Map initialization failed:", err);
          setError(true);
          setIsLoading(false);
        }
      } else {
        setError(true);
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [location, retryCount, isVisible]);

  return (
    <div className="relative w-full h-full bg-slate-50 dark:bg-slate-900 transition-colors cursor-default">
      {(isLoading || !isVisible) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden">
          {/* Finer Tactical Grid */}
          <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08]">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <pattern id="mini-map-grid-finer" width="15" height="15" patternUnits="userSpaceOnUse">
                <path d="M 15 0 L 0 0 0 15" fill="none" stroke="currentColor" strokeWidth="0.5"/>
              </pattern>
              <rect width="100%" height="100%" fill="url(#mini-map-grid-finer)" />
            </svg>
          </div>
          
          <div className="relative flex flex-col items-center">
            {/* Orbital Sonar Pulse */}
            <div className="absolute w-32 h-32 border-2 border-blue-500/10 rounded-full animate-ping duration-[3000ms]"></div>
            <div className="absolute w-20 h-20 border border-blue-400/20 rounded-full animate-pulse"></div>
            
            <div className="relative flex flex-col items-center">
              <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
              <div className="mt-4 flex flex-col items-center">
                <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] animate-pulse">
                  {!isVisible ? 'Standby' : 'Syncing Hub'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {error && !isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 p-2 text-center">
          <svg className="w-6 h-6 text-slate-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A2 2 0 013 15.485V6.415a2 2 0 011.553-1.944L9 3m0 17l5.447-2.724A2 2 0 0015 15.485V6.415a2 2 0 00-1.553-1.944L9 3m0 17V3" />
          </svg>
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mb-1">Map Unavailable</p>
          <button 
            onClick={() => setRetryCount(prev => prev + 1)}
            className="text-[8px] font-black text-blue-600 hover:text-blue-700 uppercase underline"
          >
            Retry
          </button>
        </div>
      )}

      <div ref={containerRef} className={`w-full h-full grayscale-[0.2] contrast-[1.1] transition-opacity duration-700 ${error || !isVisible || isLoading ? 'opacity-0' : 'opacity-100'}`} />
      
      <div className="absolute bottom-1.5 right-1.5 z-10">
        <span className="text-[8px] font-black text-white bg-slate-900/50 backdrop-blur-md px-2 py-1 rounded-lg uppercase tracking-tighter border border-white/10">
          {error ? 'Hub Locked' : `Hub: ${location}`}
        </span>
      </div>
    </div>
  );
};

export default PartnerMiniMap;