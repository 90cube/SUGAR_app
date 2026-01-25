
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../state/AppContext';
import { useUI } from '../state/UIContext';
import { marked } from 'marked';
import { ModeStat } from '../types';

const StatBox: React.FC<{ label: string, value: number, suffix?: string }> = ({ label, value, suffix = '' }) => {
    return (
        <div className="bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-white/60 text-center flex flex-col items-center justify-center h-full shadow-sm hover:shadow-md transition-shadow">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
            <span className="text-xl font-black text-slate-900 mt-1">{value.toFixed(1)}{suffix}</span>
        </div>
    );
};

const ResultView: React.FC<{ stat: ModeStat }> = ({ stat }) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {/* Summary Header */}
        <div className="text-center bg-slate-50/50 p-6 rounded-3xl border border-white/50">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Selected Match Analysis</span>
            <div className="text-2xl font-black text-slate-800 mt-3 mb-6">{stat.modeName}</div>

            <div className="text-6xl font-black text-slate-900 drop-shadow-sm">{stat.matchCount} Matches</div>

            <div className="grid grid-cols-2 gap-6 mt-8">
                <StatBox label="Win Rate" value={stat.winRate} suffix="%" />
                <StatBox label="K/D Rate" value={stat.kd} suffix="%" />
            </div>
        </div>

        {stat.aiAnalysis && (
            <div className="bg-slate-50 rounded-[2.5rem] p-8 lg:p-12 border border-slate-100 shadow-sm relative">
                <div className="flex items-center gap-3 mb-6">
                    <span className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse"></span>
                    <span className="text-xs font-black text-cyan-600 uppercase tracking-[0.2em]">AI_Tactical_Feedback_v2.5</span>
                </div>
                {/* 
                   Increased font size (approx 1.5x) for AI Feedback 
                   text-xs(12px) -> text-lg(18px)
                */}
                <div
                    className="text-lg text-slate-700 font-medium leading-relaxed prose prose-slate lg:prose-lg max-w-none 
                               [&_strong]:text-slate-900 [&_strong]:font-black [&_strong]:bg-cyan-100 [&_strong]:px-2 [&_strong]:rounded [&_strong]:text-xl
                               [&_p:first-child]:text-2xl [&_p:first-child]:font-black [&_p:first-child]:text-slate-900 [&_p:first-child]:mb-8"
                    dangerouslySetInnerHTML={{ __html: marked.parse(stat.aiAnalysis) as string }}
                />
            </div>
        )}
    </div>
);

export const RecapModal: React.FC = () => {
    const { isRecapModalOpen, closeRecapModal } = useUI();
    const { calculateRecap, recapStats, isRecapLoading, userProfile } = useApp();

    const getTodayKST = () => {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const kst = new Date(utc + (9 * 60 * 60 * 1000));
        return kst.toISOString().split('T')[0];
    };

    const [selectedDate, setSelectedDate] = useState(getTodayKST());
    const [selectedType, setSelectedType] = useState('');
    const [selectedMode, setSelectedMode] = useState('');

    const availableTypes = useMemo(() => {
        if (!userProfile) return [];
        const dateMatches = userProfile.recentMatches.filter(m => m.rawDate.startsWith(selectedDate));
        const types = Array.from(new Set(dateMatches.map(m => m.matchType)));
        return types;
    }, [userProfile, selectedDate]);

    const availableModes = useMemo(() => {
        if (!userProfile || !selectedType) return [];
        const dateMatches = userProfile.recentMatches.filter(m => m.rawDate.startsWith(selectedDate));
        const modes = Array.from(new Set(dateMatches.filter(m => m.matchType === selectedType).map(m => m.matchMode)));
        return modes;
    }, [userProfile, selectedDate, selectedType]);

    useEffect(() => {
        if (availableTypes.length > 0 && !availableTypes.includes(selectedType)) {
            setSelectedType(availableTypes[0]);
        } else if (availableTypes.length === 0) {
            setSelectedType('');
        }
    }, [availableTypes]);

    useEffect(() => {
        if (availableModes.length > 0 && !availableModes.includes(selectedMode)) {
            setSelectedMode(availableModes[0]);
        } else if (availableModes.length === 0) {
            setSelectedMode('');
        }
    }, [availableModes]);

    if (!isRecapModalOpen) return null;

    const handleAnalyze = () => {
        if (!selectedType || !selectedMode) return;
        calculateRecap(selectedDate, selectedType, selectedMode);
    };

    const handleDateClick = (e: React.MouseEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        try {
            if (typeof input.showPicker === 'function') {
                input.showPicker();
            } else {
                input.focus();
            }
        } catch (err) {
            console.warn("DatePicker open failed:", err);
            input.focus();
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={closeRecapModal}>
            <div
                className="w-full max-w-md md:max-w-2xl lg:max-w-4xl bg-white/90 backdrop-blur-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-5 duration-500 border border-white/50"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-slate-900/95 p-8 text-white text-center flex-shrink-0 backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute top-[-50%] left-[-20%] w-[300px] h-[300px] bg-blue-500/20 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-[-50%] right-[-20%] w-[300px] h-[300px] bg-purple-500/20 rounded-full blur-[100px]"></div>

                    <h2 className="text-2xl font-black uppercase tracking-tight relative z-10">Daily Match Report</h2>
                    <p className="text-sm text-slate-400 mt-2 relative z-10 font-mono">[ SYSTEM_DEEP_DIVE_MODULE_ACTIVE ]</p>
                </div>

                <div className="p-8 overflow-y-auto space-y-8 overscroll-contain flex-1">
                    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* 1. Date */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                        📅 Date
                                    </label>
                                    <button
                                        onClick={() => setSelectedDate(getTodayKST())}
                                        className="text-[9px] font-bold text-blue-500 hover:text-blue-600 hover:underline transition-colors"
                                    >
                                        오늘
                                    </button>
                                </div>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    onClick={handleDateClick}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                                />
                            </div>

                            {/* 2. Match Type */}
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                                    ⚔️ Type
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedType}
                                        onChange={(e) => setSelectedType(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                                    >
                                        {availableTypes.length > 0 ? availableTypes.map(t => <option key={t} value={t}>{t}</option>) : <option>데이터 없음</option>}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Match Mode */}
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                                    🎯 Mode
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedMode}
                                        onChange={(e) => setSelectedMode(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                                    >
                                        {availableModes.length > 0 ? availableModes.map(m => <option key={m} value={m}>{m}</option>) : <option>데이터 없음</option>}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleAnalyze}
                            disabled={isRecapLoading || !selectedType || !selectedMode}
                            className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl shadow-lg disabled:opacity-50 transition-all active:scale-[0.98] whitespace-nowrap text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-3"
                        >
                            {isRecapLoading ? (
                                <>
                                    <span className="w-4 h-4 border-3 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    <div className="flex flex-col items-start leading-tight">
                                        <span>Crunching Lab Data...</span>
                                        <span className="text-[8px] opacity-70 font-normal">NEXON OPEN API 기반 입니다.</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <span>🔬</span> Execute_Deep_Analysis
                                </>
                            )}
                        </button>
                    </div>

                    {recapStats ? (
                        <ResultView stat={recapStats.stat} />
                    ) : (
                        availableTypes.length > 0 && (
                            <div className="text-center py-16 text-slate-400 text-sm bg-slate-50/30 rounded-[2.5rem] border border-dashed border-slate-200">
                                <span className="block mb-4 text-4xl">🔎</span>
                                분석할 매치 유형과 모드를 상단에서 선택하십시오.
                            </div>
                        )
                    )}
                </div>

                <div className="p-6 border-t border-slate-100/50 bg-white/50 backdrop-blur-md flex-shrink-0 flex justify-center">
                    <button onClick={closeRecapModal} className="px-12 py-4 bg-white/80 border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-white transition-colors shadow-sm active:scale-95 uppercase text-xs tracking-widest">
                        Close_Report
                    </button>
                </div>
            </div>
        </div>
    );
};
