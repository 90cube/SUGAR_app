
import React from 'react';
import { NEXON_SA_LOGO_URL, UI_STRINGS } from '../constants';
import { useApp } from '../state/AppContext';

export const Header: React.FC = () => {
  const { isLoggedIn, openAuthModal, openCommunity, isAdminUser, openAdminHiddenBoard, openAdminGuillotine } = useApp();

  const handleCommunityClick = () => {
    // Open community immediately regardless of login status
    openCommunity();
  };

  const resetHome = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/70 backdrop-blur-xl border-b border-white/10 shadow-lg supports-[backdrop-filter]:bg-slate-900/60">
      <div className="container max-w-md mx-auto h-16 flex items-center justify-between px-4 relative">
        {/* Left: SUGAR Home Link */}
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

        {/* Right: Admin Icons & Community */}
        <div className="flex items-center gap-3 z-10">
            {isAdminUser && (
                <>
                    {/* Hidden Board (Hood Icon) */}
                    <button 
                        onClick={openAdminHiddenBoard}
                        className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="비밀 게시판"
                    >
                         {/* Simple Hood/Spy Icon */}
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                    </button>

                    {/* Guillotine (Shield Icon) */}
                    <button 
                        onClick={openAdminGuillotine}
                        className="p-1.5 text-red-400 hover:text-red-200 hover:bg-red-900/30 rounded-lg transition-colors"
                        title="길로틴 관리"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </button>
                    
                    <div className="w-px h-4 bg-slate-700 mx-1"></div>
                </>
            )}

            <button 
              onClick={handleCommunityClick}
              className="text-sm font-bold text-slate-200 hover:text-white transition-all hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] active:scale-95"
            >
              {UI_STRINGS.community}
            </button>
        </div>
      </div>
    </header>
  );
};
