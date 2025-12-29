
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { useUI } from '../state/UIContext';
import { useAuth } from '../state/AuthContext';
import AdminGuard from './AdminGuard';

export const Header: React.FC = () => {
  const { 
    openCommunityUserProfile,
    openKeySelector
  } = useApp();

  const {
    openCommunity,
    openAdminHiddenBoard,
    openAdminGuillotine
  } = useUI();

  const {
    openAuthModal,
    isLoggedIn,
    authUser,
    logout
  } = useAuth();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMyInfo = () => {
    if (authUser?.id) {
      openCommunityUserProfile(authUser.name, authUser.id);
      setIsUserMenuOpen(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm("로그아웃 하시겠습니까?")) {
      logout();
      setIsUserMenuOpen(false);
    }
  };

  const displayName = authUser?.name !== 'Unknown' ? authUser?.name : authUser?.email.split('@')[0];

  return (
    <header className="sticky top-0 z-[140] w-full bg-slate-950 border-b border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="container max-w-md mx-auto h-16 flex items-center justify-between px-5">
        
        {/* Logo Section */}
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-3 active:scale-95 transition-transform group"
        >
          {!logoError ? (
            <>
              <img 
                src="/logo/logo.png" 
                alt="Su-Lab Logo" 
                onError={() => setLogoError(true)}
                className="h-10 w-auto object-contain rounded-xl filter drop-shadow-[0_0_3px_rgba(34,211,238,0.5)]"
              />
              <div className="flex flex-col items-start -space-y-1 font-mono">
                <span className="text-white font-black tracking-tighter text-sm uppercase group-hover:text-cyan-400 transition-colors">Su-Lab</span>
                <span className="text-cyan-500 text-[8px] font-bold tracking-widest uppercase opacity-80">Research</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 bg-cyan-500/10 rounded-2xl px-3 py-1.5 border border-cyan-500/30">
               <span className="text-cyan-400 font-black text-xs tracking-tighter font-mono italic">SU-LAB</span>
               <div className="w-px h-3 bg-cyan-500/30"></div>
               <span className="text-cyan-500/60 text-[8px] font-bold tracking-widest uppercase font-mono">Research</span>
            </div>
          )}
        </button>

        <div className="flex items-center gap-4">
          <button 
            onClick={openCommunity}
            className="text-[9px] font-black text-slate-400 hover:text-cyan-400 transition-colors uppercase tracking-[0.2em] py-2 font-mono"
          >
            Archive
          </button>

          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={openKeySelector}
                className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl text-cyan-500 hover:bg-cyan-500/10 transition-colors shadow-lg"
                title="Repair Connection"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>

              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 pl-1.5 pr-3.5 py-1.5 rounded-2xl border border-white/10 shadow-lg transition-all"
                >
                  <div className="w-6 h-6 bg-slate-800 rounded-lg flex items-center justify-center text-[10px] font-black text-cyan-400 border border-cyan-500/30">
                    {displayName?.[0].toUpperCase()}
                  </div>
                  <span className="text-[11px] font-bold text-slate-300 max-w-[70px] truncate font-mono">
                    {displayName}
                  </span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-3 w-48 bg-slate-950 border border-cyan-500/20 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-5 py-4 border-b border-white/5 bg-white/5 font-mono">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Terminal Active</p>
                      <p className="text-[10px] font-bold text-white truncate">{authUser?.email}</p>
                    </div>
                    
                    <div className="py-1 font-mono">
                      <button onClick={handleMyInfo} className="w-full px-5 py-3 text-left text-[11px] font-bold text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/5 flex items-center gap-3 transition-colors">
                        <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        개인 실험 기록
                      </button>
                      
                      <AdminGuard>
                        <button onClick={() => { openAdminHiddenBoard(); setIsUserMenuOpen(false); }} className="w-full px-5 py-3 text-left text-[11px] font-bold text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-3">
                          <span>🕵️</span> 비밀 보관함
                        </button>
                        <button onClick={() => { openAdminGuillotine(); setIsUserMenuOpen(false); }} className="w-full px-5 py-3 text-left text-[11px] font-bold text-red-500 hover:bg-red-500/10 flex items-center gap-3">
                          <span>⚔️</span> 시스템 보안실
                        </button>
                      </AdminGuard>
                    </div>

                    <button onClick={handleLogout} className="w-full px-5 py-4 text-left text-[11px] font-black text-slate-500 hover:text-red-400 border-t border-white/5 transition-colors bg-black/20 font-mono">
                      TERMINATE
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button 
              onClick={openAuthModal}
              className="px-5 py-2 bg-cyan-500 text-slate-950 text-[10px] font-black rounded-2xl active:scale-95 transition-all font-mono shadow-[0_0_20px_rgba(34,211,238,0.3)]"
            >
              ACCESS
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
