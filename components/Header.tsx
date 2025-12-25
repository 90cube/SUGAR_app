
import React, { useState, useRef, useEffect } from 'react';
import { NEXON_SA_LOGO_URL, UI_STRINGS } from '../constants';
import { useApp } from '../state/AppContext';
import AdminGuard from './AdminGuard';

export const Header: React.FC = () => {
  const { 
    openAuthModal, 
    openCommunity, 
    openAdminHiddenBoard, 
    openAdminGuillotine,
    isLoggedIn,
    authUser,
    logout,
    openCommunityUserProfile
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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
    if (authUser?.name) {
      openCommunityUserProfile(authUser.name);
      setIsUserMenuOpen(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm("로그아웃 하시겠습니까?")) {
      logout();
      setIsUserMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-[140] w-full bg-slate-900/80 backdrop-blur-xl border-b border-white/10 shadow-lg">
      <div className="container max-w-md mx-auto h-16 flex items-center justify-between px-4 relative">
        {/* Left: Brand */}
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="text-xl font-black tracking-wider z-10 flex items-center group active:scale-95 transition-transform"
        >
          <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">S</span>
          <span className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]">U</span>
          <span className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]">G</span>
          <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">A</span>
          <span className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]">R</span>
        </button>

        {/* Center: SA Logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img src={NEXON_SA_LOGO_URL} alt="SA" className="h-8 w-auto opacity-80" />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 z-10">
          <button 
            onClick={openCommunity}
            className="text-xs font-black text-slate-300 hover:text-white transition-colors uppercase tracking-widest"
          >
            Comm.
          </button>

          <div className="w-px h-4 bg-white/10 mx-1"></div>

          {isLoggedIn ? (
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 p-1 pr-3 rounded-full transition-all active:scale-95 border border-white/5"
              >
                <div className="w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] font-black text-slate-900 shadow-inner">
                  {authUser?.name?.[0].toUpperCase()}
                </div>
                <span className="text-xs font-bold text-white max-w-[60px] truncate">{authUser?.name}</span>
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-3 w-44 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-3 border-b border-white/5 bg-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Signed in as</p>
                    <p className="text-xs font-bold text-white truncate">{authUser?.email}</p>
                  </div>
                  <button onClick={handleMyInfo} className="w-full px-4 py-3 text-left text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    내 정보 보기
                  </button>
                  <AdminGuard>
                    <button onClick={() => { openAdminHiddenBoard(); setIsUserMenuOpen(false); }} className="w-full px-4 py-3 text-left text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2 border-t border-white/5">
                      🕵️ 비밀 게시판
                    </button>
                    <button onClick={() => { openAdminGuillotine(); setIsUserMenuOpen(false); }} className="w-full px-4 py-3 text-left text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2">
                      ⚔️ 길로틴 관리
                    </button>
                  </AdminGuard>
                  <button onClick={handleLogout} className="w-full px-4 py-3 text-left text-xs font-black text-slate-500 hover:text-red-400 border-t border-white/5 transition-colors">
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={openAuthModal}
              className="px-4 py-2 bg-yellow-400 text-slate-900 text-xs font-black rounded-full shadow-lg shadow-yellow-400/20 active:scale-95 transition-all"
            >
              LOGIN
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
