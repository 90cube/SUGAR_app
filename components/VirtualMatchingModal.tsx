import React, { useState, useEffect } from 'react';
import { useUI } from '../state/UIContext';
import { nexonService } from '../services/nexonService';
import { geminiService } from '../services/geminiService';
import { UserProfile } from '../types';
import { marked } from 'marked';
import { useTypingEffect } from '../hooks/useTypingEffect';

interface PlayerCardProps {
    profile: UserProfile;
    side: 'A' | 'B';
    onRemove: (nickname: string, side: 'A' | 'B') => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ profile, side, onRemove }) => (
    <div className={`flex items-center justify-between p-2 border-2 mb-2 ${side === 'A' ? 'border-blue-500 bg-blue-900/30' : 'border-red-500 bg-red-900/30'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
            <div className={`w-8 h-8 flex items-center justify-center font-pixel text-xs text-white ${side === 'A' ? 'bg-blue-600' : 'bg-red-600'}`}>
                {profile.soloTier.tierName.substring(0, 1)}
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white truncate font-code">{profile.nickname}</span>
                <div className="flex items-center gap-2 text-[10px] font-code">
                    <span className="text-acid-green">WR:{Math.floor(profile.recentStats?.winRate || 0)}%</span>
                    <span className="text-acid-pink">KD:{Math.floor(profile.recentStats?.kd || 0)}%</span>
                </div>
            </div>
        </div>
        <button onClick={() => onRemove(profile.nickname, side)} className="text-gray-400 hover:text-red-500 p-1 transition-colors font-pixel text-xs">
            [X]
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

    // Typing effect for analyzing state
    const analyzingText = useTypingEffect('분석 중...', 150, step === 'ANALYZING');

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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4">
            {/* Y2K Window Frame */}
            <div className="w-full max-w-4xl bg-metal-silver border-2 border-white border-b-black border-r-black shadow-2xl flex flex-col max-h-[90vh]">

                {/* Windows 95 Title Bar */}
                <div className="bg-blue-900 px-3 py-2 flex items-center justify-between">
                    <h2 className="text-white font-pixel text-sm flex items-center gap-2">
                        <span className="text-acid-green">AI</span> VIRTUAL_MATCH.EXE
                    </h2>
                    <button onClick={closeVirtualMatchingModal} className="bg-metal-silver border-t border-l border-white border-b-2 border-r-2 border-b-black border-r-black w-6 h-6 flex items-center justify-center font-bold text-black text-xs hover:bg-gray-300 active:border-t-black active:border-l-black active:border-b-white active:border-r-white">
                        X
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 bg-black border-t-2 border-l-2 border-black">

                    {/* STEP 1: INPUT SQUAD */}
                    {step === 'INPUT' && (
                        <div className="flex flex-col h-full">
                            <div className="text-center mb-6">
                                <div className="inline-block px-3 py-1 bg-acid-green text-black font-pixel text-[10px] uppercase mb-2">
                                    PRE-MATCH SETUP
                                </div>
                                <h3 className="text-xl font-pixel text-white">스쿼드 구성</h3>
                                <p className="text-xs text-gray-400 font-code mt-1">5vs5 가상 매치업을 위한 플레이어를 등록하세요.</p>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 items-stretch">
                                {/* Team A (Blue) */}
                                <div className="flex-1 border-2 border-blue-500 bg-black flex flex-col">
                                    <div className="bg-blue-900 px-3 py-2 flex justify-between items-center border-b border-blue-500">
                                        <span className="font-pixel text-blue-300 text-xs flex items-center gap-2">
                                            <span className="w-2 h-2 bg-blue-400 animate-pulse"></span> ALPHA [BLUE]
                                        </span>
                                        <span className="text-xs font-code text-blue-400">{teamA.length}/5</span>
                                    </div>
                                    <div className="p-3 border-b border-blue-800">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={inputA}
                                                onChange={(e) => setInputA(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && addPlayer(inputA, 'A')}
                                                placeholder="ENTER_CODENAME..."
                                                className="flex-1 px-3 py-2 bg-black border-2 border-blue-400 text-blue-300 font-screen text-base font-bold focus:outline-none focus:border-acid-green placeholder:text-blue-500 placeholder:font-screen placeholder:font-bold"
                                                disabled={isLoadingA}
                                            />
                                            <button
                                                onClick={() => addPlayer(inputA, 'A')}
                                                disabled={isLoadingA || !inputA}
                                                className="bg-blue-600 text-white px-3 font-pixel text-xs border-2 border-blue-400 hover:bg-blue-500 disabled:opacity-50 disabled:grayscale"
                                            >
                                                {isLoadingA ? '...' : 'ADD'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-1 p-2 overflow-y-auto min-h-[100px]">
                                        {teamA.map(p => <PlayerCard key={p.nickname} profile={p} side="A" onRemove={removePlayer} />)}
                                        {teamA.length === 0 && (
                                            <div className="h-full flex items-center justify-center">
                                                <span className="text-blue-800 font-code text-xs animate-pulse">NO_ACTIVE_UNIT</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* VS Divider */}
                                <div className="flex items-center justify-center py-4 md:py-0">
                                    <div className="bg-white text-black font-pixel text-sm w-12 h-12 flex items-center justify-center border-4 border-black shadow-hard">VS</div>
                                </div>

                                {/* Team B (Red) */}
                                <div className="flex-1 border-2 border-red-500 bg-black flex flex-col">
                                    <div className="bg-red-900 px-3 py-2 flex justify-between items-center border-b border-red-500">
                                        <span className="font-pixel text-red-300 text-xs flex items-center gap-2">
                                            <span className="w-2 h-2 bg-red-400 animate-pulse"></span> BRAVO [RED]
                                        </span>
                                        <span className="text-xs font-code text-red-400">{teamB.length}/5</span>
                                    </div>
                                    <div className="p-3 border-b border-red-800">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={inputB}
                                                onChange={(e) => setInputB(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && addPlayer(inputB, 'B')}
                                                placeholder="ENTER_CODENAME..."
                                                className="flex-1 px-3 py-2 bg-black border-2 border-red-400 text-red-300 font-screen text-base font-bold focus:outline-none focus:border-acid-green placeholder:text-red-500 placeholder:font-screen placeholder:font-bold"
                                                disabled={isLoadingB}
                                            />
                                            <button
                                                onClick={() => addPlayer(inputB, 'B')}
                                                disabled={isLoadingB || !inputB}
                                                className="bg-red-600 text-white px-3 font-pixel text-xs border-2 border-red-400 hover:bg-red-500 disabled:opacity-50 disabled:grayscale"
                                            >
                                                {isLoadingB ? '...' : 'ADD'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-1 p-2 overflow-y-auto min-h-[100px]">
                                        {teamB.map(p => <PlayerCard key={p.nickname} profile={p} side="B" onRemove={removePlayer} />)}
                                        {teamB.length === 0 && (
                                            <div className="h-full flex items-center justify-center">
                                                <span className="text-red-800 font-code text-xs animate-pulse">NO_ACTIVE_UNIT</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {errorMsg && (
                                <div className="mt-4 p-3 bg-red-900 border-2 border-red-500 text-center">
                                    <p className="text-red-300 text-xs font-code">⚠️ ERROR: {errorMsg}</p>
                                </div>
                            )}

                            <div className="mt-6">
                                <button
                                    onClick={handleStartAnalysis}
                                    disabled={teamA.length === 0 || teamB.length === 0}
                                    className="w-full h-14 bg-acid-green text-black font-pixel text-sm border-4 border-black shadow-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50 disabled:grayscale uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    💠 INITIALIZE_SIMULATION
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: ANALYZING */}
                    {step === 'ANALYZING' && (
                        <div className="flex flex-col items-center justify-center h-[50vh]">
                            <div className="relative w-24 h-24 flex items-center justify-center border-4 border-acid-green">
                                <div className="absolute inset-0 border-4 border-t-acid-pink border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                                <span className="text-4xl animate-bounce">🧠</span>
                            </div>
                            <h3 className="text-xl font-pixel text-acid-green mt-6 uppercase">
                                <span className="font-screen text-2xl">{analyzingText || '_'}</span>
                                <span className="animate-blink">|</span>
                            </h3>
                            <div className="flex items-center gap-2 mt-3">
                                <span className="w-2 h-2 bg-acid-pink animate-ping"></span>
                                <p className="text-xs text-gray-400 font-code uppercase">
                                    AI ENGINE CONNECTED...
                                </p>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: RESULT */}
                    {step === 'RESULT' && (
                        <div className="space-y-4">
                            {/* Roster Summary */}
                            <div className="flex items-center justify-center gap-4 p-4 border-2 border-white bg-black font-code text-xs">
                                <div className="text-right">
                                    <span className="text-blue-400 font-pixel block mb-1">TEAM_ALPHA</span>
                                    <span className="text-gray-400">{teamA.map(p => p.nickname).join(', ')}</span>
                                </div>
                                <div className="bg-white text-black px-2 py-1 font-pixel text-xs">VS</div>
                                <div className="text-left">
                                    <span className="text-red-400 font-pixel block mb-1">TEAM_BRAVO</span>
                                    <span className="text-gray-400">{teamB.map(p => p.nickname).join(', ')}</span>
                                </div>
                            </div>

                            {/* Gemini Analysis Report */}
                            <div className="border-2 border-acid-green bg-black">
                                <div className="h-2 bg-gradient-to-r from-blue-500 via-acid-green to-red-500"></div>

                                <div className="p-6">
                                    <div className="flex items-center gap-3 mb-6 border-b border-acid-green/30 pb-4">
                                        <div className="w-10 h-10 bg-acid-green text-black flex items-center justify-center font-pixel text-xl">
                                            📊
                                        </div>
                                        <div>
                                            <h3 className="font-pixel text-acid-green uppercase text-sm">STRATEGIC ANALYSIS REPORT</h3>
                                            <p className="text-[10px] text-gray-500 font-code uppercase">Powered by Gemini-Pro-Vision-3</p>
                                        </div>
                                    </div>

                                    <div
                                        className="prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:font-pixel prose-headings:text-acid-green prose-headings:uppercase prose-strong:text-white prose-li:text-gray-300 font-code text-sm"
                                        dangerouslySetInnerHTML={renderMarkdown(analysisResult)}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-center pt-4">
                                <button
                                    onClick={() => setStep('INPUT')}
                                    className="px-6 py-3 bg-metal-silver text-black font-pixel text-xs border-t-2 border-l-2 border-white border-b-2 border-r-2 border-b-black border-r-black hover:bg-gray-300 active:border-t-black active:border-l-black active:border-b-white active:border-r-white uppercase"
                                >
                                    RESET_SIMULATION
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
