
import React, { useState, useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { nexonService } from '../services/nexonService';
import { geminiService } from '../services/geminiService';
import { UserProfile } from '../types';

export const VirtualMatchingModal: React.FC = () => {
  const { isVirtualMatchingModalOpen, closeVirtualMatchingModal, userProfile } = useApp();
  
  const [step, setStep] = useState<'INPUT' | 'ANALYZING' | 'RESULT'>('INPUT');
  const [opponentName, setOpponentName] = useState('');
  const [opponentProfile, setOpponentProfile] = useState<UserProfile | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  // Reset when closed
  useEffect(() => {
    if (!isVirtualMatchingModalOpen) {
        setStep('INPUT');
        setOpponentName('');
        setOpponentProfile(null);
        setAnalysisResult('');
        setErrorMsg('');
    }
  }, [isVirtualMatchingModalOpen]);

  const handleAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    if (!opponentName.trim()) {
        setErrorMsg("Please enter a nickname.");
        return;
    }
    
    setStep('ANALYZING');
    setErrorMsg('');

    try {
        // 1. Fetch Opponent
        const opponent = await nexonService.fetchFullProfile(opponentName);
        if (!opponent) {
            setErrorMsg("User not found. Please check the nickname.");
            setStep('INPUT');
            return;
        }
        setOpponentProfile(opponent);

        // 2. Gemini Analysis
        const result = await geminiService.analyzeMatchup(userProfile, opponent);
        setAnalysisResult(result);
        setStep('RESULT');

    } catch (err) {
        console.error(err);
        setErrorMsg("An error occurred during analysis.");
        setStep('INPUT');
    }
  };

  if (!isVirtualMatchingModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-slate-50 rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/20 relative animate-in zoom-in-95 duration-300 max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 p-5 flex items-center justify-between shadow-lg flex-shrink-0">
            <div>
                <h2 className="text-white font-black italic tracking-widest text-lg flex items-center gap-2">
                    <span className="text-yellow-400">VS</span> MATCHUP
                </h2>
                <p className="text-slate-400 text-xs font-mono">AI-Powered Strategy Analysis</p>
            </div>
            <button onClick={closeVirtualMatchingModal} className="text-slate-400 hover:text-white bg-white/10 p-2 rounded-full">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
            
            {/* STEP 1: INPUT */}
            {step === 'INPUT' && (
                <div className="flex flex-col h-full justify-center space-y-6">
                    <div className="text-center space-y-2">
                         <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-sm">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
                         </div>
                         <h3 className="text-xl font-bold text-slate-800">Analyze Your Opponent</h3>
                         <p className="text-sm text-slate-500">Enter a nickname to compare stats and get Gemini-powered winning strategies.</p>
                    </div>

                    <form onSubmit={handleAnalysis} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Opponent Nickname</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={opponentName}
                                onChange={(e) => setOpponentName(e.target.value)}
                                placeholder="Target Player"
                                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                autoFocus
                            />
                        </div>
                        {errorMsg && <p className="text-red-500 text-xs font-bold mt-2 ml-1">{errorMsg}</p>}
                        
                        <button 
                            type="submit"
                            className="w-full mt-4 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            START ANALYSIS
                        </button>
                    </form>
                </div>
            )}

            {/* STEP 2: ANALYZING */}
            {step === 'ANALYZING' && (
                <div className="flex flex-col items-center justify-center h-full py-10">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mt-6 animate-pulse">Gathering Intelligence...</h3>
                    <p className="text-sm text-slate-500 mt-2">Comparing K/D, Map trends, and Weapon mastery</p>
                </div>
            )}

            {/* STEP 3: RESULT */}
            {step === 'RESULT' && userProfile && opponentProfile && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Head to Head Cards */}
                    <div className="grid grid-cols-2 gap-2 relative">
                        {/* VS Badge */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-yellow-400 rounded-full border-4 border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-900 shadow-sm z-10">
                            VS
                        </div>

                        {/* Me */}
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 text-center">
                             <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm mx-auto mb-2">ME</div>
                             <h4 className="font-bold text-slate-900 text-sm truncate">{userProfile.nickname}</h4>
                             <div className="text-[10px] font-bold text-slate-400 mt-1">{userProfile.soloTier.tierName}</div>
                             <div className="mt-3 space-y-1">
                                <div className="text-xs font-mono"><span className="text-slate-400">K/D</span> <span className="font-bold">{userProfile.recentStats?.kd}%</span></div>
                                <div className="text-xs font-mono"><span className="text-slate-400">Win</span> <span className="font-bold">{userProfile.recentStats?.winRate}%</span></div>
                             </div>
                        </div>

                        {/* Opponent */}
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-red-100 text-center relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-12 h-12 bg-red-500/10 rounded-bl-3xl"></div>
                             <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold text-sm mx-auto mb-2">OPP</div>
                             <h4 className="font-bold text-slate-900 text-sm truncate">{opponentProfile.nickname}</h4>
                             <div className="text-[10px] font-bold text-slate-400 mt-1">{opponentProfile.soloTier.tierName}</div>
                             <div className="mt-3 space-y-1">
                                <div className="text-xs font-mono"><span className="text-slate-400">K/D</span> <span className="font-bold">{opponentProfile.recentStats?.kd}%</span></div>
                                <div className="text-xs font-mono"><span className="text-slate-400">Win</span> <span className="font-bold">{opponentProfile.recentStats?.winRate}%</span></div>
                             </div>
                        </div>
                    </div>

                    {/* Gemini Analysis Report */}
                    <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-yellow-500"></div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-lg">🤖</span>
                            <h3 className="font-black text-slate-800 uppercase">Gemini Strategy Report</h3>
                        </div>
                        
                        <div className="prose prose-sm prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-line text-sm">
                            {analysisResult}
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setStep('INPUT')}
                        className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold rounded-xl transition-colors"
                    >
                        Analyze Another Player
                    </button>

                </div>
            )}
        </div>
      </div>
    </div>
  );
};
