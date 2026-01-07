
import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { useAuth } from '../state/AuthContext';
import { useUI } from '../state/UIContext';
import { SearchStatus } from '../types';
import { ProfileCard } from '../components/ProfileCard';
import { TierCard } from '../components/TierCard';
import { RecentTrend } from '../components/RecentTrend';
import { RecentMatches } from '../components/RecentMatches';
import AdminGuard from '../components/AdminGuard';

export const Home: React.FC = () => {
  const { searchStatus, userProfile, searchUser, performAnomalyCheck, pageContent } = useApp();
  const { openAdminEditor, openVirtualMatchingModal } = useUI();
  const { isLoggedIn, openAuthModal } = useAuth();
  const [nickname, setNickname] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    searchUser(nickname);
  };

  const handleAnomalyClick = () => {
    if (!isLoggedIn) {
      openAuthModal();
    } else {
      performAnomalyCheck();
    }
  };

  return (
    <div className="w-full max-w-md lg:max-w-6xl mx-auto space-y-6 pb-12 relative flex flex-col min-h-[calc(100vh-8rem)]">
      <AdminGuard>
          <button 
            onClick={openAdminEditor}
            className="fixed bottom-24 right-4 z-50 w-12 h-12 bg-slate-950 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-90 border-2 border-cyan-500"
            title="Edit Page Content"
          >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
      </AdminGuard>
      
      <div className="flex-grow space-y-6">
        <section className="space-y-8 pt-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          {/* Main Logo Section with Hover Reveal */}
          <div className="relative flex flex-col items-center justify-center px-4 group z-30 lg:max-w-2xl lg:mx-auto">
             {/* Text Logo Container */}
             <div className="relative w-full flex justify-center py-12 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.05)] overflow-hidden transition-all duration-500 group-hover:shadow-cyan-500/10 group-hover:border-cyan-500/30 z-20">
                <div className="absolute inset-0 bg-cyan-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="relative flex-col items-center justify-center select-none cursor-default z-20 w-full font-mono">
                    <div className="flex justify-between items-center w-full px-10 sm:px-14 flex-nowrap">
                        <div className="text-6xl font-black text-slate-900 transition-all duration-500 group-hover:text-cyan-600 group-hover:scale-110">S</div>
                        <div className="text-6xl font-black text-slate-400 group-hover:text-slate-600 transition-all duration-500">U</div>
                        <div className="w-1.5 h-12 bg-slate-200 rotate-12 mx-2 opacity-50 group-hover:bg-cyan-200 transition-all duration-500"></div>
                        <div className="text-6xl font-black text-cyan-600 transition-all duration-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]">L</div>
                        <div className="text-6xl font-black text-slate-900 transition-all duration-500 group-hover:text-cyan-600 group-hover:scale-110">A</div>
                        <div className="text-6xl font-black text-slate-400 group-hover:text-slate-600 transition-all duration-500">B</div>
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-cyan-500/40 tracking-[1em] uppercase whitespace-nowrap">
                      Research_System
                    </div>
                </div>
             </div>

             <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm px-6 transition-all duration-500 opacity-0 scale-90 pointer-events-none group-hover:opacity-100 group-hover:scale-100 z-[100]">
                  <div className="flex flex-col items-center bg-white/95 backdrop-blur-2xl border-2 border-slate-100/50 p-8 rounded-[2.5rem] shadow-[0_20px_80px_rgba(34,211,238,0.2)]">
                      <div className="text-[11px] font-bold text-slate-500 flex flex-wrap justify-center gap-x-6 gap-y-3 text-center font-mono italic">
                          <span className="whitespace-nowrap"><span className="text-cyan-600 font-black not-italic mr-0.5">S</span>udden Attack</span>
                          <span className="whitespace-nowrap"><span className="text-cyan-600 font-black not-italic mr-0.5">U</span>ser</span>
                          <span className="whitespace-nowrap"><span className="text-cyan-600 font-black not-italic mr-0.5">L</span>aboratory</span>
                          <span className="whitespace-nowrap"><span className="text-cyan-600 font-black not-italic mr-0.5">A</span>dvanced</span>
                          <span className="whitespace-nowrap"><span className="text-cyan-600 font-black not-italic mr-0.5">B</span>ehavioral Analysis</span>
                      </div>
                  </div>
              </div>
          </div>
          
          <div className="h-4"></div>

          <form onSubmit={handleSearch} className="space-y-4 px-2 relative z-10 font-mono lg:max-w-2xl lg:mx-auto">
            <div className="flex gap-2">
              <div className="relative flex-1 group">
                <div className="absolute -inset-0.5 bg-cyan-400/20 rounded-[2rem] blur-sm opacity-25 group-hover:opacity-100 transition duration-500"></div>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="대상_닉네임_조회"
                  className="relative w-full h-16 px-6 rounded-[2rem] border-2 border-slate-200 bg-white/80 backdrop-blur-md text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-cyan-500 font-bold transition-all shadow-inner text-center tracking-wide"
                />
              </div>

              <button 
                  type="button"
                  onClick={openVirtualMatchingModal}
                  className="relative h-16 w-16 bg-slate-950 text-yellow-400 border border-yellow-500/30 font-bold rounded-[2rem] active:scale-95 transition-all shadow-lg flex items-center justify-center hover:bg-yellow-500/10 hover:shadow-yellow-500/20"
                  title="가상 매칭 (AI Matchmaking)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
              </button>
              
              <button 
                  type="button"
                  onClick={handleAnomalyClick}
                  disabled={!userProfile}
                  className="relative h-16 w-16 bg-slate-950 text-cyan-400 border border-cyan-500/30 font-bold rounded-[2rem] active:scale-95 transition-all shadow-lg flex items-center justify-center disabled:opacity-20 disabled:grayscale"
                  title="정밀 분석"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
            </div>
            
            <button 
              type="submit"
              disabled={searchStatus === SearchStatus.LOADING}
              className="w-full h-16 bg-cyan-500 text-slate-950 font-black rounded-[2rem] active:scale-[0.98] transition-all hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] disabled:opacity-50 flex items-center justify-center border-b-4 border-cyan-700 tracking-[0.2em] text-xs uppercase"
            >
              {searchStatus === SearchStatus.LOADING ? (
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 border-3 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                  <span className="animate-pulse">Analyzing...</span>
                </div>
              ) : "Execute Analysis"}
            </button>
          </form>
        </section>

        {searchStatus === SearchStatus.SUCCESS && userProfile && (
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 px-1">
            {/* Left Column: Profile & Stats */}
            <div className="lg:col-span-5 space-y-6">
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards" style={{ animationDelay: '100ms' }}>
                <ProfileCard profile={userProfile} />
              </div>
              <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards" style={{ animationDelay: '200ms' }}>
                <TierCard type="Solo" tier={userProfile.soloTier} />
                <TierCard type="Party" tier={userProfile.partyTier} />
              </div>
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards" style={{ animationDelay: '300ms' }}>
                <RecentTrend stats={userProfile.recentStats} />
              </div>
            </div>

            {/* Right Column: Match History */}
            <div className="lg:col-span-7 mt-6 lg:mt-0">
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards" style={{ animationDelay: '400ms' }}>
                <RecentMatches matches={userProfile.recentMatches} />
              </div>
            </div>
          </div>
        )}

        {searchStatus === SearchStatus.ERROR && (
          <div className="animate-in fade-in zoom-in-95 duration-500 p-8 bg-slate-950 text-red-500 rounded-[3rem] text-center text-[10px] font-black border border-red-500/50 shadow-2xl font-mono lg:max-w-2xl lg:mx-auto">
            [CRITICAL_ERROR]: {pageContent.errorText.toUpperCase()}
          </div>
        )}
      </div>

      <div className="mt-auto pt-10 pb-4 text-center animate-in fade-in duration-1000 fill-mode-backwards" style={{ animationDelay: '800ms' }}>
        <p className="text-[9px] font-black text-cyan-400/50 uppercase tracking-[0.4em] font-mono select-none drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]">
          Data based on NEXON Open API
        </p>
      </div>
    </div>
  );
};
