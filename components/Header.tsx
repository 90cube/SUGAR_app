import React from 'react';
import { NEXON_SA_LOGO_URL, UI_STRINGS } from '../constants';
import { useApp } from '../state/AppContext';

export const Header: React.FC = () => {
  const { isLoggedIn, openAuthModal, openCommunity } = useApp();

  const handleCommunityClick = () => {
    if (!isLoggedIn) {
      openAuthModal();
    } else {
      openCommunity();
    }
  };

  const resetHome = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/70 backdrop-blur-xl border-b border-white/10 shadow-lg supports-[backdrop-filter]:bg-slate-900/60">
      <div className="container max-w-md mx-auto h-16 flex items-center justify-between px-4 relative">
        {/* Left: SUGAR Home Link with Glow */}
        <button 
          onClick={resetHome}
          className="text-xl font-black tracking-wider focus:outline-none select-none flex items-center z-10 group transition-all duration-300 active:scale-95"
        >
          <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">S</span>
          <span className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)] group-hover:brightness-125 transition-all">U</span>
          <span className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)] group-hover:brightness-125 transition-all delay-75">G</span>
          <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">A</span>
          <span className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)] group-hover:brightness-125 transition-all delay-100">R</span>
        </button>

        {/* Center: Logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img 
            src={NEXON_SA_LOGO_URL} 
            alt="Sudden Attack" 
            className="h-10 w-auto object-contain opacity-90 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* Right: Community Link */}
        <button 
          onClick={handleCommunityClick}
          className="text-sm font-bold text-slate-200 hover:text-white transition-all z-10 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] active:scale-95"
        >
          {UI_STRINGS.community}
        </button>
      </div>
    </header>
  );
};