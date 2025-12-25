
import React, { useState, useRef, useEffect } from 'react';
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

  // 닉네임이 없으면 이메일 앞부분 사용
  const displayName = authUser?.name !== 'Unknown' ? authUser?.name : authUser?.email.split('@')[0];

  return (
    <header className="sticky top-0 z-[140] w-full bg-slate-900/90 backdrop-blur-xl border-b border-white/5 shadow-2xl">
      <div className="container max-w-md mx-auto h-16 flex items-center justify-between px-5">
        
        {/* Left: Brand - 텍스트 로고만 남김 */}
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="text-xl font-black tracking-tighter flex items-center group active:scale-95 transition-transform"
        >
          <span className="text-white">S</span>
          <span className="text-yellow-400">U</span>
          <span className="text-yellow-400">G</span>
          <span className="text-white">A</span>
          <span className="text-yellow-400">R</span>
        </button>

        {/* Right: Actions - 겹침 방지를 위해 flex-1 justify-end 설정 */}
        <div className="flex items-center gap-4">
          <button 
            onClick={openCommunity}
            className="text-[11px] font-black text-slate-400 hover:text-white transition-colors uppercase tracking-widest py-2"
          >
            Comm.
          </button>

          {isLoggedIn ? (
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 pl-1.5 pr-3.5 py-1.5 rounded-full transition-all active:scale-95 border border-white/10"
              >
                <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] font-black text-slate-900">
                  {displayName?.[0].toUpperCase()}
                </div>
                <span className="text-[11px] font-bold text-white max-w-[70px] truncate">
                  {displayName}
                </span>
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-5 py-4 border-b border-white/5 bg-white/5">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Signed in as</p>
                    <p className="text-[11px] font-bold text-white truncate">{authUser?.email}</p>
                  </div>
                  
                  <div className="py-2">
                    <button onClick={handleMyInfo} className="w-full px-5 py-3 text-left text-[11px] font-bold text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-colors">
                      <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      내 정보 보기
                    </button>
                    
                    <AdminGuard>
                      <button onClick={() => { openAdminHiddenBoard(); setIsUserMenuOpen(false); }} className="w-full px-5 py-3 text-left text-[11px] font-bold text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-3">
                        <span>🕵️</span> 비밀 게시판
                      </button>
                      <button onClick={() => { openAdminGuillotine(); setIsUserMenuOpen(false); }} className="w-full px-5 py-3 text-left text-[11px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-3">
                        <span>⚔️</span> 길로틴 관리
                      </button>
                    </AdminGuard>
                  </div>

                  <button onClick={handleLogout} className="w-full px-5 py-4 text-left text-[11px] font-black text-slate-500 hover:text-red-400 border-t border-white/5 transition-colors bg-black/20">
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={openAuthModal}
              className="px-4 py-2 bg-yellow-400 text-slate-900 text-[11px] font-black rounded-full shadow-lg shadow-yellow-400/10 active:scale-95 transition-all"
            >
              LOGIN
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
