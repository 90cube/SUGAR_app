
import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { AppStatus } from '../types';
import { ProfileCard } from '../components/ProfileCard';
import { TierCard } from '../components/TierCard';
import { RecentTrend } from '../components/RecentTrend';
import { RecentMatches } from '../components/RecentMatches';
import AdminGuard from '../components/AdminGuard';

export const Home: React.FC = () => {
  const { status, userProfile, searchUser, isLoggedIn, openAuthModal, performAnomalyCheck, pageContent, openAdminEditor } = useApp();
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
    <div className="w-full max-w-md mx-auto space-y-6 pb-12 relative flex flex-col min-h-[calc(100vh-8rem)]">
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
        {/* Section 0: Su-Lab Hero Branding */}
        <section className="space-y-8 pt-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          <div className="group relative flex flex-col items-center justify-center select-none cursor-default z-20 w-full font-mono">
              {/* Main Lab Logo Animation */}
              <div className="flex justify-between items-center w-full px-4 sm:px-12 flex-nowrap transition-transform duration-500 group-hover:scale-105">
                  <div className="text-6xl sm:text-7xl font-black text-slate-900 flex flex-col items-center">
                    <span className="group-hover:-translate-y-2 transition-transform duration-300">S</span>
                    <div className="h-1 w-full bg-cyan-500 rounded-full mt-2 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
                  </div>
                  <div className="text-6xl sm:text-7xl font-black text-slate-400 group-hover:text-cyan-500 transition-colors duration-300 delay-75">U</div>
                  <div className="w-1.5 h-12 bg-slate-200 rotate-12 mx-2 opacity-50"></div>
                  <div className="text-6xl sm:text-7xl font-black text-cyan-600 drop-shadow-[0_0_15px_rgba(8,145,178,0.2)] group-hover:text-slate-900 transition-colors duration-300 delay-150">L</div>
                  <div className="text-6xl sm:text-7xl font-black text-slate-900 delay-200">A</div>
                  <div className="text-6xl sm:text-7xl font-black text-slate-400 group-hover:text-cyan-500 transition-colors duration-300 delay-300">B</div>
              </div>
              
              {/* Acronym Expansion / Drawer Concept */}
              <div className="mt-8 w-full px-2">
                  <div className="flex flex-col items-center bg-slate-100/50 backdrop-blur-md border border-slate-200 p-4 rounded-2xl group-hover:border-cyan-500/50 group-hover:bg-cyan-50/30 transition-all duration-500">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Terminal Access Point</p>
                      <div className="h-[1px] w-8 bg-slate-300 group-hover:w-full transition-all duration-700"></div>
                      <div className="mt-3 text-[9px] font-bold text-slate-500 flex flex-wrap justify-center gap-x-4 gap-y-1 text-center opacity-60 group-hover:opacity-100 transition-opacity">
                          <span className="whitespace-nowrap"><span className="text-cyan-600 mr-0.5">S</span>udden Attack</span>
                          <span className="whitespace-nowrap"><span className="text-cyan-600 mr-0.5">U</span>ser</span>
                          <span className="whitespace-nowrap"><span className="text-cyan-600 mr-0.5">L</span>aboratory</span>
                          <span className="whitespace-nowrap"><span className="text-cyan-600 mr-0.5">A</span>dvanced</span>
                          <span className="whitespace-nowrap"><span className="text-cyan-600 mr-0.5">B</span>ehavioral Analysis</span>
                      </div>
                  </div>
              </div>
          </div>
          
          <div className="h-4"></div>

          {/* Console Search Bar */}
          <form onSubmit={handleSearch} className="space-y-4 px-2 relative z-10 font-mono">
            <div className="flex gap-3">
              <div className="relative flex-1 group">
                <div className="absolute -inset-0.5 bg-cyan-400/20 rounded-xl blur-sm opacity-25 group-hover:opacity-100 transition duration-500"></div>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="대상_닉네임_조회"
                  className="relative w-full h-14 px-5 rounded-xl border-2 border-slate-200 bg-white/80 backdrop-blur-md text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-cyan-500 font-bold transition-all shadow-inner text-center tracking-wide"
                />
              </div>
              
              <button 
                  type="button"
                  onClick={handleAnomalyClick}
                  disabled={!userProfile}
                  className="relative h-14 w-14 bg-slate-950 text-cyan-400 border border-cyan-500/30 font-bold rounded-xl active:scale-95 transition-all shadow-lg flex items-center justify-center disabled:opacity-20 disabled:grayscale"
                  title="정밀 분석"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
            </div>
            
            <button 
              type="submit"
              disabled={status === AppStatus.LOADING}
              className="w-full h-14 bg-cyan-500 text-slate-950 font-black rounded-xl active:scale-[0.98] transition-all hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] disabled:opacity-50 flex items-center justify-center border-b-4 border-cyan-700 tracking-widest text-xs"
            >
              {status === AppStatus.LOADING ? (
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 border-3 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                  <span className="animate-pulse">RUNNING_LAB_QUERIES...</span>
                </div>
              ) : "EXECUTE ANALYSIS"}
            </button>
          </form>
        </section>

        {/* Results Section - Laboratory Cards */}
        {status === AppStatus.SUCCESS && userProfile && (
          <div className="space-y-5">
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
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards" style={{ animationDelay: '400ms' }}>
              <RecentMatches matches={userProfile.recentMatches} />
            </div>
          </div>
        )}

        {status === AppStatus.ERROR && (
          <div className="animate-in fade-in zoom-in-95 duration-500 p-6 bg-slate-950 text-red-500 rounded-xl text-center text-[10px] font-black border border-red-500/50 shadow-2xl font-mono">
            [CRITICAL_ERROR]: {pageContent.errorText.toUpperCase()}
          </div>
        )}
      </div>

      {/* Light Blue NEXON Open API Attribution - Attached at bottom */}
      <div className="mt-auto pt-10 pb-4 text-center animate-in fade-in duration-1000 fill-mode-backwards" style={{ animationDelay: '800ms' }}>
        <p className="text-[7px] sm:text-[9px] font-black text-cyan-400/60 uppercase tracking-[0.3em] font-mono select-none drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]">
          Data based on NEXON Open API
        </p>
      </div>
    </div>
  );
};
