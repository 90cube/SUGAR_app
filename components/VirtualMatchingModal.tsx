
import React, { useState, useEffect } from 'react';
import { useUI } from '../state/UIContext';
import { nexonService } from '../services/nexonService';
import { geminiService } from '../services/geminiService';
import { UserProfile } from '../types';
import { marked } from 'marked';

interface PlayerCardProps {
  profile: UserProfile;
  side: 'A' | 'B';
  onRemove: (nickname: string, side: 'A' | 'B') => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ profile, side, onRemove }) => (
    <div className={`flex items-center justify-between p-3 rounded-2xl border mb-2 animate-in slide-in-from-top-2 duration-300 bg-white shadow-sm hover:shadow-md ${side === 'A' ? 'border-blue-100 hover:border-blue-300' : 'border-red-100 hover:border-red-300'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-md ${side === 'A' ? 'bg-blue-500' : 'bg-red-500'}`}>
                 {profile.soloTier.tierName.substring(0,1)}
             </div>
             <div className="flex flex-col min-w-0">
                 <span className="text-sm font-black text-slate-800 truncate font-mono tracking-tight">{profile.nickname}</span>
                 <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${side === 'A' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                        승률 {Math.floor(profile.recentStats?.winRate || 0)}%
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        KD {profile.recentStats?.kd}%
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold ml-1">{profile.soloTier.tierName}</span>
                 </div>
             </div>
        </div>
        <button onClick={() => onRemove(profile.nickname, side)} className="text-slate-300 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
    </div>
);

export const VirtualMatchingModal: React.FC = () => {
  const { isVirtualMatchingModalOpen, closeVirtualMatchingModal } = useUI();
  
  const [step, setStep] = useState<'INPUT' | 'ANALYZING' | 'RESULT'>('INPUT');
  
  // Team States
  const [teamA, setTeamA] = useState<UserProfile[]>([]);
  const [teamB, setTeamB] = useState<UserProfile[]>([]);
  
  // Input States
  const [inputA, setInputA] = useState('');
  const [inputB, setInputB] = useState('');
  
  // Loading States for Verification
  const [isLoadingA, setIsLoadingA] = useState(false);
  const [isLoadingB, setIsLoadingB] = useState(false);
  
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  // Reset when closed
  useEffect(() => {
    if (!isVirtualMatchingModalOpen) {
        setStep('INPUT');
        setTeamA([]);
        setTeamB([]);
        setInputA('');
        setInputB('');
        setAnalysisResult('');
        setErrorMsg('');
    }
  }, [isVirtualMatchingModalOpen]);

  // Add Player Logic (Verification)
  const addPlayer = async (nickname: string, side: 'A' | 'B') => {
      if (!nickname.trim()) return;
      const currentTeam = side === 'A' ? teamA : teamB;
      
      // Max 5 Check
      if (currentTeam.length >= 5) {
          setErrorMsg(`팀 ${side}은 최대 5명까지 가능합니다.`);
          return;
      }
      
      // Duplicate Check (Global)
      const allPlayers = [...teamA, ...teamB];
      if (allPlayers.find(p => p.nickname.toLowerCase() === nickname.toLowerCase())) {
          setErrorMsg("이미 추가된 플레이어입니다.");
          return;
      }

      setErrorMsg('');
      if (side === 'A') setIsLoadingA(true);
      else setIsLoadingB(true);

      try {
          const profile = await nexonService.fetchFullProfile(nickname);
          
          if (!profile) {
              setErrorMsg(`'${nickname}' 유저를 찾을 수 없습니다.`);
          } else if (!profile.recentStats) {
              setErrorMsg(`'${nickname}' 유저의 데이터가 부족합니다.`);
          } else {
              // Valid Player -> Add to Team Cache
              if (side === 'A') setTeamA(prev => [...prev, profile]);
              else setTeamB(prev => [...prev, profile]);
              
              // Clear Input
              if (side === 'A') setInputA('');
              else setInputB('');
          }
      } catch (e) {
          setErrorMsg("유저 검증 실패");
      } finally {
          if (side === 'A') setIsLoadingA(false);
          else setIsLoadingB(false);
      }
  };

  const removePlayer = (nickname: string, side: 'A' | 'B') => {
      if (side === 'A') {
          setTeamA(prev => prev.filter(p => p.nickname !== nickname));
      } else {
          setTeamB(prev => prev.filter(p => p.nickname !== nickname));
      }
  };

  const handleStartAnalysis = async () => {
    // Check API Key
    if (window.aistudio && window.aistudio.hasSelectedApiKey && !(await window.aistudio.hasSelectedApiKey())) {
        try {
            await window.aistudio.openSelectKey();
        } catch (e) {
             setErrorMsg("API 키 선택 창을 여는데 실패했습니다.");
             return;
        }
    }

    if (teamA.length === 0 || teamB.length === 0) {
        setErrorMsg("양 팀 모두 최소 1명의 플레이어가 필요합니다.");
        return;
    }

    setStep('ANALYZING');
    setErrorMsg('');

    try {
        // Send Mastered Data to Gemini
        const result = await geminiService.analyzeTeamMatchup(teamA, teamB);
        setAnalysisResult(result);
        setStep('RESULT');
    } catch (err: any) {
        console.error(err);
        if (err.message?.includes("400") || err.message?.includes("API key")) {
             setErrorMsg("API 키가 유효하지 않습니다. 다시 선택해주세요.");
             // Trigger key selection if possible
             if (window.aistudio && window.aistudio.openSelectKey) {
                 await window.aistudio.openSelectKey();
             }
        } else {
             setErrorMsg("AI 분석 중 오류가 발생했습니다.");
        }
        setStep('INPUT');
    }
  };

  const renderMarkdown = (text: string) => {
      return { __html: marked.parse(text) as string };
  };

  if (!isVirtualMatchingModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-200/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-4xl bg-white/95 backdrop-blur-2xl rounded-[3rem] overflow-hidden flex flex-col shadow-2xl border-2 border-white/50 relative animate-in zoom-in-95 duration-300 max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-slate-100 bg-white/50">
            <div>
                <h2 className="text-slate-900 font-black italic tracking-tighter text-2xl flex items-center gap-2">
                    <span className="text-cyan-600">AI</span> VIRTUAL MATCH
                </h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></span>
                    <p className="text-slate-400 text-[10px] font-mono tracking-[0.2em] uppercase">Tactical_Simulation_Unit</p>
                </div>
            </div>
            <button onClick={closeVirtualMatchingModal} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
            
            {/* STEP 1: INPUT SQUAD */}
            {step === 'INPUT' && (
                <div className="flex flex-col h-full max-w-3xl mx-auto">
                     <div className="text-center mb-8 space-y-2">
                        <div className="inline-block px-4 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 border border-slate-200">
                            Pre-Match Setup
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">스쿼드 구성 (Squad Configuration)</h3>
                        <p className="text-xs text-slate-500 font-medium">5vs5 가상 매치업을 위한 플레이어를 등록하세요.</p>
                     </div>

                     <div className="flex flex-col md:flex-row gap-6 items-start min-h-0">
                        {/* Team A (Blue) */}
                        <div className="flex-1 w-full bg-slate-50 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden relative group hover:border-blue-200 transition-all duration-300">
                            <div className="p-4 bg-white border-b border-slate-100 flex justify-between items-center">
                                <span className="font-black text-blue-600 uppercase tracking-widest text-xs flex items-center gap-2">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span> Alpha (Blue)
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{teamA.length}/5</span>
                            </div>
                            <div className="p-4 border-b border-slate-100/50 bg-white/50">
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={inputA}
                                        onChange={(e) => setInputA(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addPlayer(inputA, 'A')}
                                        placeholder="닉네임 입력..." 
                                        className="flex-1 px-4 py-3 bg-slate-100 rounded-xl text-xs font-bold text-slate-900 border-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all placeholder:text-slate-400"
                                        disabled={isLoadingA}
                                    />
                                    <button 
                                        onClick={() => addPlayer(inputA, 'A')}
                                        disabled={isLoadingA || !inputA}
                                        className="bg-blue-600 text-white px-4 rounded-xl text-xs font-bold hover:bg-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                                    >
                                        {isLoadingA ? '...' : 'ADD'}
                                    </button>
                                </div>
                            </div>
                            <div className={`overflow-y-auto px-3 custom-scrollbar transition-all duration-300 ${teamA.length > 0 ? 'py-3 max-h-[300px]' : 'py-0 h-0'}`}>
                                {teamA.map(p => <PlayerCard key={p.nickname} profile={p} side="A" onRemove={removePlayer} />)}
                            </div>
                            {teamA.length === 0 && (
                                <div className="p-4 text-center">
                                     <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">No Active Unit</span>
                                </div>
                            )}
                        </div>

                        {/* VS Divider */}
                        <div className="flex items-center justify-center pt-8 md:pt-10">
                            <div className="bg-slate-900 text-white font-black rounded-2xl w-10 h-10 flex items-center justify-center text-xs shadow-xl italic z-10">VS</div>
                        </div>

                        {/* Team B (Red) */}
                        <div className="flex-1 w-full bg-slate-50 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden relative group hover:border-red-200 transition-all duration-300">
                            <div className="p-4 bg-white border-b border-slate-100 flex justify-between items-center">
                                <span className="font-black text-red-600 uppercase tracking-widest text-xs flex items-center gap-2">
                                    <span className="w-2 h-2 bg-red-500 rounded-full"></span> Bravo (Red)
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{teamB.length}/5</span>
                            </div>
                            <div className="p-4 border-b border-slate-100/50 bg-white/50">
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={inputB}
                                        onChange={(e) => setInputB(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addPlayer(inputB, 'B')}
                                        placeholder="닉네임 입력..." 
                                        className="flex-1 px-4 py-3 bg-slate-100 rounded-xl text-xs font-bold text-slate-900 border-none focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all placeholder:text-slate-400"
                                        disabled={isLoadingB}
                                    />
                                    <button 
                                        onClick={() => addPlayer(inputB, 'B')}
                                        disabled={isLoadingB || !inputB}
                                        className="bg-red-600 text-white px-4 rounded-xl text-xs font-bold hover:bg-red-500 disabled:opacity-50 transition-all shadow-lg shadow-red-500/20 active:scale-95"
                                    >
                                        {isLoadingB ? '...' : 'ADD'}
                                    </button>
                                </div>
                            </div>
                            <div className={`overflow-y-auto px-3 custom-scrollbar transition-all duration-300 ${teamB.length > 0 ? 'py-3 max-h-[300px]' : 'py-0 h-0'}`}>
                                {teamB.map(p => <PlayerCard key={p.nickname} profile={p} side="B" onRemove={removePlayer} />)}
                            </div>
                            {teamB.length === 0 && (
                                <div className="p-4 text-center">
                                     <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">No Active Unit</span>
                                </div>
                            )}
                        </div>
                     </div>

                     {errorMsg && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-center animate-pulse">
                            <p className="text-red-500 text-xs font-bold font-mono">⚠️ ERROR: {errorMsg}</p>
                        </div>
                     )}

                     <div className="mt-8">
                        <button 
                            onClick={handleStartAnalysis}
                            disabled={teamA.length === 0 || teamB.length === 0}
                            className="w-full h-16 bg-cyan-500 text-slate-950 font-black rounded-[2rem] active:scale-[0.98] transition-all hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] disabled:opacity-50 flex items-center justify-center border-b-4 border-cyan-700 tracking-[0.2em] text-sm uppercase gap-3"
                        >
                             <span className="text-xl">💠</span>
                             INITIALIZE_SIMULATION
                        </button>
                     </div>
                </div>
            )}

            {/* STEP 2: ANALYZING */}
            {step === 'ANALYZING' && (
                <div className="flex flex-col items-center justify-center h-[50vh]">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                        <span className="text-4xl animate-bounce">🧠</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mt-8 tracking-tight uppercase">Processing Data</h3>
                    <div className="flex items-center gap-2 mt-3">
                        <span className="w-2 h-2 bg-cyan-500 rounded-full animate-ping"></span>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                            AI Engine Connected...
                        </p>
                    </div>
                </div>
            )}

            {/* STEP 3: RESULT */}
            {step === 'RESULT' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
                    
                    {/* Roster Summary */}
                    <div className="flex items-center justify-center gap-6 p-5 bg-white rounded-3xl border border-slate-200 shadow-sm font-mono text-xs">
                         <div className="text-right">
                             <span className="text-blue-600 font-black block mb-1">TEAM ALPHA</span>
                             <span className="text-slate-500 font-bold">{teamA.map(p=>p.nickname).join(', ')}</span>
                         </div>
                         <div className="bg-slate-900 px-3 py-1 rounded text-[10px] font-black text-white italic">VS</div>
                         <div className="text-left">
                             <span className="text-red-600 font-black block mb-1">TEAM BRAVO</span>
                             <span className="text-slate-500 font-bold">{teamB.map(p=>p.nickname).join(', ')}</span>
                         </div>
                    </div>

                    {/* Gemini Analysis Report */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl relative">
                        <div className="h-2 bg-gradient-to-r from-blue-500 via-cyan-400 to-red-500"></div>
                        
                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
                                <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center border border-cyan-100 text-2xl">
                                    📊
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-lg">Strategic Analysis Report</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Powered by Gemini-Pro-Vision-3</p>
                                </div>
                            </div>
                            
                            <div 
                                className="prose prose-slate max-w-none prose-p:text-slate-600 prose-headings:font-black prose-headings:text-slate-900 prose-headings:uppercase prose-strong:text-slate-900 prose-strong:font-black prose-li:text-slate-600"
                                dangerouslySetInnerHTML={renderMarkdown(analysisResult)}
                            />
                        </div>
                    </div>
                    
                    <div className="flex justify-center pt-4">
                        <button 
                            onClick={() => setStep('INPUT')}
                            className="px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all border border-slate-200 uppercase text-xs tracking-widest shadow-sm active:scale-95"
                        >
                            Reset Simulation
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};