
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
      
      // Geocode the location
      const coords = await geocodeLocation(location);
      
      if (!isMounted || !containerRef.current) return;

      if (coords) {
        try {
          if (mapRef.current) {
            mapRef.current.remove();
          }

          // Initialize as a STATIC map (no interactions)
          const map = L.map(containerRef.current, {
            zoomControl: false,
            attributionControl: false,
            dragging: false, // Disabled for static feel
            scrollWheelZoom: false, // Disabled for static feel
            doubleClickZoom: false, // Disabled for static feel
            touchZoom: false, // Disabled for static feel
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
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {/* Pulsing Grid Background */}
            <svg className="absolute inset-0 w-full h-full opacity-10 dark:opacity-20" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
            
            {/* Stylized Radar/Scanning Effect */}
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping duration-[2000ms]"></div>
              <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-pulse duration-[1500ms] scale-150"></div>
              <svg className="w-8 h-8 text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            
            <div className="absolute bottom-4 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] animate-pulse">
              {!isVisible ? 'Waiting for View...' : 'Locking GPS...'}
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

      <div ref={containerRef} className={`w-full h-full grayscale-[0.2] contrast-[1.1] ${error || !isVisible ? 'opacity-0' : 'opacity-100'}`} />
      
      <div className="absolute bottom-1 right-1 z-10">
        <span className="text-[8px] font-black text-white bg-slate-900/40 backdrop-blur-sm px-1.5 py-0.5 rounded uppercase tracking-tighter">
          {error ? 'Hub Location Locked' : `Live Hub: ${location}`}
        </span>
      </div>
    </div>
  );
};

export default PartnerMiniMap;
