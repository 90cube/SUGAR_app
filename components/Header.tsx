
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { useUI } from '../state/UIContext';

export const Header: React.FC = () => {
  const { openKeySelector } = useApp();
  const { openVirtualMatchingModal } = useUI();

  const [logoError, setLogoError] = useState(false);

  return (
    <header className="sticky top-0 z-[140] w-full bg-slate-950 border-b border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="container max-w-md mx-auto h-16 flex items-center justify-between px-5">

        {/* Logo Section */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center active:scale-95 transition-transform"
        >
          {!logoError ? (
            <img
              src="/logo/logo.png"
              alt="Su-Lab Logo"
              onError={() => setLogoError(true)}
              className="h-10 w-auto object-contain rounded-2xl filter drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]"
            />
          ) : (
            <div className="flex items-center gap-2 bg-cyan-500/10 rounded-2xl px-3 py-1.5 border border-cyan-500/30 font-mono">
              <span className="text-cyan-400 font-black text-xs tracking-tighter italic">SU-LAB</span>
              <div className="w-px h-3 bg-cyan-500/30"></div>
              <span className="text-cyan-500/60 text-[8px] font-bold tracking-widest uppercase">Research</span>
            </div>
          )}
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={openKeySelector}
            className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl text-cyan-500 hover:bg-cyan-500/10 transition-colors shadow-lg"
            title="Repair Connection"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>

          <button
            onClick={openVirtualMatchingModal}
            className="px-4 py-2 bg-cyan-500/10 text-cyan-400 text-[10px] font-black rounded-2xl hover:bg-cyan-500/20 transition-all font-mono border border-cyan-500/30 uppercase"
          >
            가상 매칭
          </button>
        </div>
      </div>
    </header>
  );
};
