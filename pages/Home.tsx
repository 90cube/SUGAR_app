
import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { UI_STRINGS } from '../constants';
import { AppStatus } from '../types';
import { ProfileCard } from '../components/ProfileCard';
import { TierCard } from '../components/TierCard';
import { RecentTrend } from '../components/RecentTrend';
import { RecentMatches } from '../components/RecentMatches';
import { AuthModal } from '../components/AuthModal';
import { MatchDetailModal } from '../components/MatchDetailModal';
import { RecapModal } from '../components/RecapModal';
import { AnalysisModal } from '../components/AnalysisModal';

export const Home: React.FC = () => {
  const { status, userProfile, searchUser, isLoggedIn, openAuthModal, performAnomalyCheck } = useApp();
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
    <div className="w-full max-w-md mx-auto space-y-6 pb-24">
      <AuthModal />
      <MatchDetailModal />
      <RecapModal />
      <AnalysisModal />
      
      {/* Section 0: Search Panel */}
      <section className="space-y-5 pt-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <h1 className="text-3xl font-black text-slate-800 text-center uppercase tracking-tighter drop-shadow-sm">
          {UI_STRINGS.welcome}
        </h1>
        
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1 group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter nickname"
                className="relative w-full h-14 px-5 rounded-xl border border-white/50 bg-white/60 backdrop-blur-md text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium transition-all shadow-sm"
              />
            </div>
            
            <div className="relative group">
               <div className="absolute -inset-0.5 bg-red-400 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
               <button 
                type="button"
                onClick={handleAnomalyClick}
                disabled={!userProfile}
                className="relative h-14 w-14 bg-white/70 backdrop-blur-md text-red-500 border border-red-100 font-bold rounded-xl active:scale-95 transition-all shadow-sm hover:shadow-red-500/20 flex items-center justify-center disabled:opacity-50 disabled:grayscale"
                aria-label={UI_STRINGS.anomaly}
                title={UI_STRINGS.anomaly}
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
            className="w-full h-14 bg-slate-900/90 backdrop-blur-sm text-white font-bold rounded-xl active:scale-[0.98] transition-all hover:bg-slate-800 hover:shadow-[0_0_20px_rgba(15,23,42,0.3)] disabled:opacity-70 flex items-center justify-center border border-white/10"
          >
            {status === AppStatus.LOADING ? (
               <div className="flex items-center gap-2">
                 <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                 <span className="animate-pulse">Searching...</span>
               </div>
            ) : UI_STRINGS.search}
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
          {UI_STRINGS.error}
        </div>
      )}
    </div>
  );
};
