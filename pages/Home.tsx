
import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { useUI } from '../state/UIContext';
import { SearchStatus } from '../types';
import { ProfileCard } from '../components/ProfileCard';
import { TierCard } from '../components/TierCard';
import { RecentTrend } from '../components/RecentTrend';
import { RecentMatches } from '../components/RecentMatches';
import { useTypingEffect } from '../hooks/useTypingEffect';

export const Home: React.FC = () => {
  const { searchStatus, userProfile, searchUser, performAnomalyCheck, pageContent } = useApp();
  const { openVirtualMatchingModal } = useUI();
  const [nickname, setNickname] = useState('');

  // Typing effect for loading text
  const loadingText = useTypingEffect('분석 중...', 150, searchStatus === SearchStatus.LOADING);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    searchUser(nickname);
  };

  const handleAnomalyClick = () => {
    performAnomalyCheck();
  };

  return (
    <div className="w-full min-h-screen relative flex flex-col items-center pb-20">

      {/* Marquee Bar */}
      <div className="w-full bg-acid-green border-b-4 border-black overflow-hidden py-1">
        <div className="whitespace-nowrap animate-marquee">
          <span className="text-black font-pixel font-bold text-xs">
            SYSTEM_READY... INITIALIZING SULAB_PROTOCOL_V2.0... ANOMALY_SCAN_ACTIVE... TARGET_LOCKED... WELCOME_USER...
          </span>
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto px-4 z-10 flex-grow flex flex-col pt-12">

        {/* Header Section */}
        <section className={`transition-all duration-500 ease-out flex flex-col items-center ${searchStatus === SearchStatus.SUCCESS ? 'pt-4 pb-8' : 'pt-24 pb-12'}`}>

          {/* Logo with Glitch Effect */}
          <div className="relative mb-12 group cursor-none">
            <h1 className="text-6xl md:text-8xl font-pixel text-white drop-shadow-[4px_4px_0_#ff00ff] relative z-10 tracking-tighter">
              SULAB
            </h1>
            <div className="absolute top-0 left-0 w-full h-full text-6xl md:text-8xl font-pixel text-acid-green opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-75 mix-blend-difference pointer-events-none">
              SULAB
            </div>
            <div className="absolute -bottom-6 w-full text-center">
              <span className="bg-acid-pink text-white px-2 py-0.5 font-code text-xs font-bold transform -skew-x-12 inline-block border-2 border-white shadow-hard">
                RESEARCH_SYSTEM_2000
              </span>
            </div>
          </div>

          <form onSubmit={handleSearch} className="w-full max-w-xl relative flex flex-col gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-black translate-x-2 translate-y-2"></div>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="ENTER_CODENAME..."
                className="relative w-full h-16 bg-black border-4 border-acid-green text-acid-green font-screen text-xl font-bold px-6 focus:outline-none focus:bg-acid-green/10 placeholder:text-acid-green/50 placeholder:font-screen placeholder:font-bold placeholder:text-xl"
              />
            </div>

            {/* Action Buttons: Brutalist Style */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={openVirtualMatchingModal}
                className="bg-metal-silver border-t-2 border-l-2 border-white border-b-2 border-r-2 border-black text-black font-screen text-xl py-2 active:border-t-black active:border-l-black active:border-b-white active:border-r-white active:bg-gray-400"
              >
                V_MATCH
              </button>
              <button
                type="button"
                onClick={performAnomalyCheck}
                disabled={!userProfile}
                className="bg-metal-silver border-t-2 border-l-2 border-white border-b-2 border-r-2 border-black text-black font-screen text-xl py-2 active:border-t-black active:border-l-black active:border-b-white active:border-r-white active:bg-gray-400 disabled:opacity-50 disabled:grayscale"
              >
                ANOMALY
              </button>
              <button
                type="submit"
                disabled={searchStatus === SearchStatus.LOADING}
                className="col-span-2 bg-acid-pink text-white font-pixel text-xs md:text-sm py-3 border-4 border-black shadow-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:bg-pink-700 disabled:bg-gray-500 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
              >
                {searchStatus === SearchStatus.LOADING ? (
                  <span className="font-screen text-lg">{loadingText || '_'}<span className="animate-blink">|</span></span>
                ) : "EXECUTE ANALYZE.EXE"}
              </button>
            </div>
          </form>
        </section>

        {/* Results Section - Windows 95 / Terminal Style */}
        {searchStatus === SearchStatus.SUCCESS && userProfile && (
          <div className="flex-1 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">

              {/* Left Column */}
              <div className="lg:col-span-4 space-y-6">
                {/* Profile "Window" */}
                <div className="bg-metal-silver border-2 border-white border-b-black border-r-black p-1 shadow-xl">
                  <div className="bg-blue-900 px-2 py-1 flex justify-between items-center mb-1">
                    <span className="text-white font-bold font-pixel text-xs">PROFILE.BAT</span>
                    <div className="flex gap-1">
                      <div className="w-3 h-3 bg-gray-300 border border-gray-500 text-[8px] flex items-center justify-center font-bold">_</div>
                      <div className="w-3 h-3 bg-gray-300 border border-gray-500 text-[8px] flex items-center justify-center font-bold">X</div>
                    </div>
                  </div>
                  <div className="border border-gray-500 border-t-black border-l-black bg-gray-200 p-2">
                    <ProfileCard profile={userProfile} />
                  </div>
                </div>

                {/* Tiers */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black border-2 border-acid-green p-2 shadow-hard-green relative">
                    <div className="absolute -top-3 left-2 bg-black px-1 text-acid-green font-pixel text-[10px]">SOLO_RANK</div>
                    <TierCard type="Solo" tier={userProfile.soloTier} />
                  </div>
                  <div className="bg-black border-2 border-acid-cyan p-2 shadow-hard-cyan relative">
                    <div className="absolute -top-3 left-2 bg-black px-1 text-acid-cyan font-pixel text-[10px]">PARTY_RANK</div>
                    <TierCard type="Party" tier={userProfile.partyTier} />
                  </div>
                </div>

                {/* Trends */}
                <div className="bg-black border-2 border-white p-4 shadow-hard">
                  <h3 className="font-pixel text-white mb-4 border-b border-white border-dashed pb-2">TREND ANALYSIS</h3>
                  <RecentTrend stats={userProfile.recentStats} />
                </div>
              </div>

              {/* Right Column */}
              <div className="lg:col-span-8">
                <div className="bg-black border-4 border-acid-green p-1 h-full min-h-[500px] shadow-hard-pink relative overflow-hidden">
                  {/* Terminal Header */}
                  <div className="bg-acid-green text-black px-4 py-2 font-pixel font-bold text-sm mb-4 flex justify-between">
                    <span>C:\SULAB\LOGS\HISTORY.TXT</span>
                    <span>REC_COUNT: {userProfile.recentMatches.length}</span>
                  </div>
                  <div className="p-2 h-full overflow-y-auto font-screen text-acid-green text-xl">
                    <RecentMatches matches={userProfile.recentMatches} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {searchStatus === SearchStatus.ERROR && (
          <div className="max-w-xl mx-auto mt-12 bg-blue-900 border-4 border-white text-white p-8 font-code shadow-2xl text-center">
            <h2 className="text-4xl font-pixel mb-4 bg-white text-blue-900 inline-block px-2">FATAL ERROR</h2>
            <p className="text-lg mb-6">A fatal exception 0E has occurred at 0028:C00068F8 in VXD VMM(01).</p>
            <p className="border-t border-white pt-4 text-sm">{pageContent.errorText}</p>
            <p className="mt-8 animate-blink text-xs">PRESS ANY KEY TO CONTINUE _</p>
          </div>
        )}

      </div>
    </div>
  );
};
