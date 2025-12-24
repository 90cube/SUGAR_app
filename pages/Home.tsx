
import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { AppStatus } from '../types';
import { ProfileCard } from '../components/ProfileCard';
import { TierCard } from '../components/TierCard';
import { RecentTrend } from '../components/RecentTrend';
import { RecentMatches } from '../components/RecentMatches';

export const Home: React.FC = () => {
  const { status, userProfile, searchUser, isLoggedIn, openAuthModal, performAnomalyCheck, pageContent, isAdminUser, openAdminEditor } = useApp();
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
    <div className="w-full max-w-md mx-auto space-y-6 pb-24 relative">
      {/* Modals have been moved to Layout.tsx to ensure proper z-index layering */}

      {/* Admin Floating Action Button */}
      {isAdminUser && (
          <button 
            onClick={openAdminEditor}
            className="fixed bottom-24 right-4 z-50 w-12 h-12 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-90 border-2 border-yellow-400"
            title="Edit Page Content"
          >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
      )}
      
      {/* Section 0: Search Panel & Title */}
      <section className="space-y-8 pt-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Title Container - Group for hover effects */}
        <div className="group relative flex flex-col items-center justify-center select-none cursor-default z-20 w-full">
            
            {/* Letters: Maximized Spacing (justify-between), Forced Single Line (flex-nowrap) */}
            <div className="flex justify-between items-end w-full px-4 sm:px-10 flex-nowrap transition-transform duration-500 group-hover:scale-105">
                {/* S - White */}
                <div className="text-5xl sm:text-7xl font-[900] text-white drop-shadow-[0_5px_0_rgba(0,0,0,0.15)] transform -rotate-6 group-hover:-translate-y-2 transition-transform duration-300 flex-shrink-0">S</div>
                
                {/* U - Yellow */}
                <div className="text-5xl sm:text-7xl font-[900] text-yellow-400 drop-shadow-[0_5px_0_rgba(234,179,8,0.4)] transform rotate-3 group-hover:-translate-y-2 transition-transform duration-300 delay-75 flex-shrink-0">U</div>
                
                {/* G - Yellow */}
                <div className="text-5xl sm:text-7xl font-[900] text-yellow-400 drop-shadow-[0_5px_0_rgba(234,179,8,0.4)] transform -rotate-3 group-hover:-translate-y-2 transition-transform duration-300 delay-100 flex-shrink-0">G</div>
                
                {/* A - White */}
                <div className="text-5xl sm:text-7xl font-[900] text-white drop-shadow-[0_5px_0_rgba(0,0,0,0.15)] transform rotate-6 group-hover:-translate-y-2 transition-transform duration-300 delay-150 flex-shrink-0">A</div>
                
                {/* R - Yellow */}
                <div className="text-5xl sm:text-7xl font-[900] text-yellow-400 drop-shadow-[0_5px_0_rgba(234,179,8,0.4)] transform -rotate-2 group-hover:-translate-y-2 transition-transform duration-300 delay-200 flex-shrink-0">R</div>
            </div>
            
            {/* Interactive Description Animation */}
            {/* Positioned absolutely to drop down without reflow */}
            <div className="absolute top-[100%] left-1/2 -translate-x-1/2 mt-4 flex justify-center w-full px-2">
                <div className="
                    flex items-center justify-center overflow-hidden
                    bg-slate-300/60 backdrop-blur-sm
                    rounded-full
                    w-12 h-1.5
                    transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
                    group-hover:w-full sm:group-hover:w-auto
                    group-hover:h-auto group-hover:min-h-[36px]
                    group-hover:bg-slate-900/90 group-hover:border group-hover:border-white/20
                    group-hover:rounded-2xl
                    group-hover:shadow-xl
                    group-hover:translate-y-2
                ">
                    {/* Inner Text - Hidden by default, Reveals on Hover */}
                    <div className="
                        opacity-0 scale-90 translate-y-2
                        group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0
                        transition-all duration-300 delay-100
                        text-[9px] sm:text-xs font-bold tracking-widest uppercase
                        flex flex-nowrap items-center justify-center gap-x-2 sm:gap-x-3 p-2 sm:p-3
                    ">
                        <span className="whitespace-nowrap flex-shrink-0"><span className="text-white text-xs sm:text-sm">S</span><span className="text-slate-400">udden Attack</span></span>
                        <span className="whitespace-nowrap flex-shrink-0"><span className="text-yellow-400 text-xs sm:text-sm">U</span><span className="text-slate-400">ser</span></span>
                        <span className="whitespace-nowrap flex-shrink-0"><span className="text-yellow-400 text-xs sm:text-sm">G</span><span className="text-slate-400">ameplay</span></span>
                        <span className="whitespace-nowrap flex-shrink-0"><span className="text-white text-xs sm:text-sm">A</span><span className="text-slate-400">nalysis &</span></span>
                        <span className="whitespace-nowrap flex-shrink-0"><span className="text-yellow-400 text-xs sm:text-sm">R</span><span className="text-slate-400">ank</span></span>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Spacer for the dropped description to not overlap search bar too much if expanded */}
        <div className="h-4"></div>

        <form onSubmit={handleSearch} className="space-y-4 px-2 relative z-10">
          <div className="flex gap-3">
            <div className="relative flex-1 group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임을 입력하세요"
                className="relative w-full h-14 px-5 rounded-2xl border border-white/50 bg-white/60 backdrop-blur-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-bold transition-all shadow-sm text-center tracking-wide"
              />
            </div>
            
            <div className="relative group">
               <div className="absolute -inset-0.5 bg-red-400 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
               <button 
                type="button"
                onClick={handleAnomalyClick}
                disabled={!userProfile}
                className="relative h-14 w-14 bg-white/70 backdrop-blur-md text-red-500 border border-red-100 font-bold rounded-2xl active:scale-95 transition-all shadow-sm hover:shadow-red-500/20 flex items-center justify-center disabled:opacity-50 disabled:grayscale"
                aria-label={pageContent.anomalyButtonText}
                title={pageContent.anomalyButtonText}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </button>
            </div>
          </div>
          
          <button 
            type="submit"
            disabled={status === AppStatus.LOADING}
            className="w-full h-14 bg-slate-900/90 backdrop-blur-sm text-white font-bold rounded-2xl active:scale-[0.98] transition-all hover:bg-slate-800 hover:shadow-[0_0_20px_rgba(15,23,42,0.3)] disabled:opacity-70 flex items-center justify-center border border-white/10 shadow-lg"
          >
            {status === AppStatus.LOADING ? (
               <div className="flex items-center gap-2">
                 <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                 <span className="animate-pulse">{pageContent.loadingText}</span>
               </div>
            ) : pageContent.searchButtonText}
          </button>
        </form>
      </section>

      {/* Results Section - Staggered Animations */}
      {status === AppStatus.SUCCESS && userProfile && (
        <div className="space-y-5">
          
          {/* 2. Player Identity */}
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards" style={{ animationDelay: '100ms' }}>
            <ProfileCard profile={userProfile} />
          </div>
          
          {/* 3. Tier (Solo & Party) */}
          <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards" style={{ animationDelay: '200ms' }}>
            <TierCard type="Solo" tier={userProfile.soloTier} />
            <TierCard type="Party" tier={userProfile.partyTier} />
          </div>

          {/* 4. Recent Trend Stats */}
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards" style={{ animationDelay: '300ms' }}>
            <RecentTrend stats={userProfile.recentStats} />
          </div>
          
          {/* 5. Recent Matches */}
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards" style={{ animationDelay: '400ms' }}>
            <RecentMatches matches={userProfile.recentMatches} />
          </div>

        </div>
      )}

      {status === AppStatus.ERROR && (
        <div className="animate-in fade-in zoom-in-95 duration-500 p-6 bg-red-50/80 backdrop-blur-md text-red-600 rounded-2xl text-center text-sm font-bold border border-red-100 shadow-lg shadow-red-500/5">
          {pageContent.errorText}
        </div>
      )}
    </div>
  );
};
