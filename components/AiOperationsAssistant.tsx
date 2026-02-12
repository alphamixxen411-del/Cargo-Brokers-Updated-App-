
import React, { useState, useEffect, useRef } from 'react';
import { CargoQuoteRequest } from '../types';
import { summarizeOperations } from '../services/geminiService';

interface AiOperationsAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  requests: CargoQuoteRequest[];
}

const AiOperationsAssistant: React.FC<AiOperationsAssistantProps> = ({ isOpen, onClose, requests }) => {
  const [summary, setSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [typedSummary, setTypedSummary] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Trigger summary when opened
  useEffect(() => {
    if (isOpen) {
      handleSummarize();
    }
  }, [isOpen]);

  const handleSummarize = async () => {
    setIsSummarizing(true);
    setTypedSummary('');
    const text = await summarizeOperations(requests);
    setSummary(text || '');
    setIsSummarizing(false);
    startTyping(text || '');
  };

  const startTyping = (text: string) => {
    setIsTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      setTypedSummary((prev) => prev + text.charAt(i));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 15);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed top-0 right-0 z-[101] h-screen w-full sm:w-[400px] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-500">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-indigo-600 text-white">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeWidth="2"/></svg>
             </div>
             <div>
               <h3 className="text-lg font-black tracking-tight uppercase">AI Oracle</h3>
               <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Operational Intelligence</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <div className="space-y-4">
             <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Status Report</h4>
                <button 
                  onClick={handleSummarize} 
                  disabled={isSummarizing || isTyping}
                  className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline disabled:opacity-50"
                >
                  Refresh Data
                </button>
             </div>

             <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 opacity-[0.03] rounded-full translate-x-1/2 -translate-y-1/2"></div>
                
                {isSummarizing ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                    <div className="h-2 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                    <div className="h-2 w-5/6 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                  </div>
                ) : (
                  <div className="relative text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed min-h-[100px]">
                    {typedSummary}
                    {isTyping && <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-1 animate-pulse align-middle"></span>}
                  </div>
                )}
             </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neural Insights</h4>
            <div className="grid grid-cols-1 gap-3">
               <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2"/></svg>
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Resource Concentration</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">Higher than usual load requests for heavy machinery routes identified.</p>
                  </div>
               </div>
               <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Throughput Stability</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">Average acceptance latency reduced by 14% over the last 24h.</p>
                  </div>
               </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800">
           <div className="relative">
              <input 
                type="text" 
                placeholder="Ask Oracle about your fleet..." 
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs font-bold focus:border-indigo-500 outline-none transition-all shadow-inner"
                disabled
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Pro Only</div>
           </div>
           <p className="text-[8px] text-center text-slate-400 font-bold uppercase tracking-widest mt-4">Powered by Gemini Pro Intelligence</p>
        </div>
      </div>
    </>
  );
};

export default AiOperationsAssistant;
