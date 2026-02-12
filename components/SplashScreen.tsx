
import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
      {/* Background stylized elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <pattern id="splash-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#splash-grid)" />
        </svg>
      </div>

      <div className="relative flex flex-col items-center">
        {/* Animated Logo */}
        <div className="w-24 h-24 bg-[#84cc16] rounded-3xl flex items-center justify-center shadow-2xl shadow-lime-500/40 animate-in zoom-in-50 duration-700 border-4 border-white dark:border-slate-800">
          <svg className="w-14 h-14 text-black animate-pulse" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
          </svg>
        </div>

        <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white font-serif">
            CARGO BROKERS
          </h1>
          <p className="text-[10px] font-black text-lime-600 dark:text-lime-500 uppercase tracking-[0.4em] mt-2">
            Logistics Intelligence
          </p>
        </div>

        {/* Loading Bar */}
        <div className="absolute -bottom-24 w-48 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-lime-500 animate-[loading_2s_ease-in-out_infinite]"></div>
        </div>
      </div>

      <div className="absolute bottom-12 text-center">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
          Secured by Gemini AI
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
};

export default SplashScreen;
