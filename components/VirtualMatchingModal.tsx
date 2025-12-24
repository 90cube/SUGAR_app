
import React, { useState, useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { nexonService } from '../services/nexonService';
import { geminiService } from '../services/geminiService';
import { UserProfile } from '../types';

interface PlayerCardProps {
  profile: UserProfile;
  side: 'A' | 'B';
  onRemove: (nickname: string, side: 'A' | 'B') => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ profile, side, onRemove }) => (
    <div className={`flex items-center justify-between p-2 rounded-lg border mb-2 animate-in slide-in-from-bottom-2 ${side === 'A' ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
        <div className="flex items-center gap-2 overflow-hidden">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${side === 'A' ? 'bg-blue-500' : 'bg-red-500'}`}>
                 {profile.soloTier.tierName.substring(0,1)}
             </div>
             <div className="flex flex-col min-w-0">
                 <span className="text-xs font-bold text-slate-900 truncate">{profile.nickname}</span>
                 <span className="text-[10px] text-slate-500">KD: {profile.recentStats?.kd}%</span>
             </div>
        </div>
        <button onClick={() => onRemove(profile.nickname, side)} className="text-slate-400 hover:text-slate-600 p-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
    </div>
);

export const VirtualMatchingModal: React.FC = () => {
  const { isVirtualMatchingModalOpen, closeVirtualMatchingModal } = useApp();
  
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
    } catch (err) {
        console.error(err);
        setErrorMsg("AI 분석 중 오류가 발생했습니다.");
        setStep('INPUT');
    }
  };

  if (!isVirtualMatchingModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/20 relative animate-in zoom-in-95 duration-300 max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 flex items-center justify-between shadow-lg flex-shrink-0">
            <div>
                <h2 className="text-white font-black italic tracking-widest text-lg flex items-center gap-2">
                    <span className="text-yellow-400">가상</span> 매칭 (Virtual Matching)
                </h2>
                <p className="text-slate-400 text-xs font-mono">5vs5 Squad 전력 분석기</p>
            </div>
            <button onClick={closeVirtualMatchingModal} className="text-slate-400 hover:text-white bg-white/10 p-2 rounded-full">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
            
            {/* STEP 1: INPUT SQUAD */}
            {step === 'INPUT' && (
                <div className="flex flex-col h-full">
                     <div className="text-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800">스쿼드 구성하기</h3>
                        <p className="text-xs text-slate-500">각 팀당 최대 5명까지 추가할 수 있습니다. 닉네임은 실시간 검증됩니다.</p>
                     </div>

                     <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
                        {/* Team A (Blue) */}
                        <div className="flex-1 bg-white rounded-2xl border border-blue-200 shadow-sm flex flex-col overflow-hidden">
                            <div className="p-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                                <span className="font-black text-blue-700">블루팀 (BLUE)</span>
                                <span className="text-xs font-bold text-blue-400">{teamA.length}/5</span>
                            </div>
                            <div className="p-3 bg-white border-b border-slate-100">
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={inputA}
                                        onChange={(e) => setInputA(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addPlayer(inputA, 'A')}
                                        placeholder="닉네임 입력" 
                                        className="flex-1 px-3 py-2 bg-slate-50 rounded-lg text-sm border focus:border-blue-500 focus:outline-none"
                                        disabled={isLoadingA}
                                    />
                                    <button 
                                        onClick={() => addPlayer(inputA, 'A')}
                                        disabled={isLoadingA || !inputA}
                                        className="bg-blue-600 text-white px-3 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {isLoadingA ? '...' : '+'}
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3">
                                {teamA.map(p => <PlayerCard key={p.nickname} profile={p} side="A" onRemove={removePlayer} />)}
                                {teamA.length === 0 && <div className="text-center text-slate-300 text-xs py-10">선수 없음</div>}
                            </div>
                        </div>

                        {/* VS Divider (Mobile: Horizontal, Desktop: Vertical) */}
                        <div className="flex items-center justify-center">
                            <div className="bg-slate-200 text-slate-500 font-black rounded-full w-8 h-8 flex items-center justify-center text-xs">VS</div>
                        </div>

                        {/* Team B (Red) */}
                        <div className="flex-1 bg-white rounded-2xl border border-red-200 shadow-sm flex flex-col overflow-hidden">
                            <div className="p-3 bg-red-50 border-b border-red-100 flex justify-between items-center">
                                <span className="font-black text-red-700">레드팀 (RED)</span>
                                <span className="text-xs font-bold text-red-400">{teamB.length}/5</span>
                            </div>
                            <div className="p-3 bg-white border-b border-slate-100">
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={inputB}
                                        onChange={(e) => setInputB(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addPlayer(inputB, 'B')}
                                        placeholder="닉네임 입력" 
                                        className="flex-1 px-3 py-2 bg-slate-50 rounded-lg text-sm border focus:border-red-500 focus:outline-none"
                                        disabled={isLoadingB}
                                    />
                                    <button 
                                        onClick={() => addPlayer(inputB, 'B')}
                                        disabled={isLoadingB || !inputB}
                                        className="bg-red-600 text-white px-3 rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50"
                                    >
                                        {isLoadingB ? '...' : '+'}
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3">
                                {teamB.map(p => <PlayerCard key={p.nickname} profile={p} side="B" onRemove={removePlayer} />)}
                                {teamB.length === 0 && <div className="text-center text-slate-300 text-xs py-10">선수 없음</div>}
                            </div>
                        </div>
                     </div>

                     {errorMsg && <p className="text-red-500 text-xs font-bold text-center mt-4 animate-pulse">{errorMsg}</p>}

                     <div className="mt-6">
                        <button 
                            onClick={handleStartAnalysis}
                            disabled={teamA.length === 0 || teamB.length === 0}
                            className="w-full py-4 bg-slate-900 text-white font-black rounded-xl shadow-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                            AI 전력 분석 시작
                        </button>
                     </div>
                </div>
            )}

            {/* STEP 2: ANALYZING */}
            {step === 'ANALYZING' && (
                <div className="flex flex-col items-center justify-center h-full py-10">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl">🧠</span>
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mt-6 animate-pulse">데이터 마스터링 중...</h3>
                    <p className="text-sm text-slate-500 mt-2 text-center max-w-xs">
                        블루팀 {teamA.length}명 vs 레드팀 {teamB.length}명 데이터를 비교 중입니다.<br/>
                        팀 시너지, 포지션, 맵 상성 등을 분석합니다.
                    </p>
                </div>
            )}

            {/* STEP 3: RESULT */}
            {step === 'RESULT' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Roster Summary */}
                    <div className="flex gap-2 text-center text-xs font-bold text-slate-500 justify-center">
                         <span className="text-blue-600">{teamA.map(p=>p.nickname).join(', ')}</span>
                         <span>vs</span>
                         <span className="text-red-600">{teamB.map(p=>p.nickname).join(', ')}</span>
                    </div>

                    {/* Gemini Analysis Report */}
                    <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500"></div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-lg">🤖</span>
                            <h3 className="font-black text-slate-800 uppercase">AI 전략 리포트</h3>
                        </div>
                        
                        <div className="prose prose-sm prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-line text-sm">
                            {analysisResult}
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setStep('INPUT')}
                        className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold rounded-xl transition-colors"
                    >
                        새로운 매치 구성하기
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
