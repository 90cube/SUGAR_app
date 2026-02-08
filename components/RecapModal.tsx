
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../state/AppContext';
import { useUI } from '../state/UIContext';
import { marked } from 'marked';
import { ModeStat } from '../types';

const StatBox: React.FC<{ label: string, value: number, suffix?: string }> = ({ label, value, suffix = '' }) => {
    return (
        <div className="bg-black border-2 border-acid-green p-3 text-center">
            <span className="text-[10px] font-code text-gray-500 uppercase">{label}</span>
            <span className="text-2xl font-pixel text-acid-green block mt-1">{value.toFixed(1)}{suffix}</span>
        </div>
    );
};

const ResultView: React.FC<{ stat: ModeStat }> = ({ stat }) => (
    <div className="space-y-4">
        {/* Summary Header */}
        <div className="text-center bg-black border-2 border-white p-6">
            <span className="text-xs font-code text-gray-500 uppercase">SELECTED_MATCH_ANALYSIS</span>
            <div className="text-xl font-pixel text-white mt-2 mb-4">{stat.modeName}</div>

            <div className="text-5xl font-pixel text-acid-pink">{stat.matchCount} <span className="text-lg text-gray-400">MATCHES</span></div>

            <div className="grid grid-cols-2 gap-4 mt-6">
                <StatBox label="WIN_RATE" value={stat.winRate} suffix="%" />
                <StatBox label="K/D_RATE" value={stat.kd} suffix="%" />
            </div>
        </div>

        {stat.aiAnalysis && (
            <div className="bg-black border-4 border-acid-green relative overflow-hidden">
                {/* CRT Scanlines */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.1) 2px, rgba(0,255,0,0.1) 4px)'
                }}></div>

                {/* Terminal Header */}
                <div className="bg-acid-green/20 border-b-2 border-acid-green px-4 py-2 flex items-center gap-3">
                    <div className="flex gap-1">
                        <span className="w-2 h-2 bg-red-500"></span>
                        <span className="w-2 h-2 bg-yellow-500"></span>
                        <span className="w-2 h-2 bg-acid-green"></span>
                    </div>
                    <span className="text-xs font-pixel text-acid-green uppercase flex items-center gap-2">
                        <span className="animate-pulse">●</span> AI_TACTICAL_TERMINAL_V2.0
                    </span>
                </div>

                {/* Terminal Content */}
                <div className="p-6 relative z-10">
                    <div className="font-code text-xs text-acid-green/50 mb-4">
                        C:\SULAB\AI_ENGINE&gt; analyze --mode={stat.modeName} --deep
                    </div>
                    <div className="font-code text-xs text-acid-green/50 mb-4">
                        [OK] PARSING_MATCH_DATA...<br />
                        [OK] EXTRACTING_PATTERNS...<br />
                        [OK] GENERATING_TACTICAL_FEEDBACK...
                    </div>
                    <div className="border-t border-acid-green/30 pt-4">
                        <div
                            className="prose prose-invert max-w-none prose-p:text-acid-green/80 prose-p:font-code prose-p:text-sm prose-headings:font-pixel prose-headings:text-acid-pink prose-headings:text-base prose-strong:text-white prose-li:text-acid-green/70 prose-li:font-code prose-li:text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: marked.parse(stat.aiAnalysis) as string }}
                        />
                    </div>
                    <div className="mt-4 font-code text-xs text-acid-green/50 flex items-center gap-2">
                        <span className="animate-blink">_</span> END_OF_REPORT
                    </div>
                </div>
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4" onClick={closeRecapModal}>
            <div
                className="w-full max-w-md md:max-w-2xl lg:max-w-4xl bg-metal-silver border-2 border-white border-b-black border-r-black shadow-2xl flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Windows 95 Title Bar */}
                <div className="bg-blue-900 px-3 py-2 flex items-center justify-between flex-shrink-0">
                    <h2 className="text-white font-pixel text-sm uppercase">DAILY_MATCH_REPORT.EXE</h2>
                    <button onClick={closeRecapModal} className="bg-metal-silver border-t border-l border-white border-b-2 border-r-2 border-b-black border-r-black w-6 h-6 flex items-center justify-center font-bold text-black text-xs hover:bg-gray-300 active:border-t-black active:border-l-black active:border-b-white active:border-r-white">
                        X
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 bg-black border-t-2 border-l-2 border-black overflow-y-auto space-y-4 flex-1">
                    {/* Filter Section */}
                    <div className="border-2 border-white p-4 space-y-4">
                        <div className="grid md:grid-cols-3 gap-4">
                            {/* 1. Date */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-pixel text-acid-green uppercase">📅 DATE</label>
                                    <button
                                        onClick={() => setSelectedDate(getTodayKST())}
                                        className="text-[9px] font-code text-acid-pink hover:underline"
                                    >
                                        [TODAY]
                                    </button>
                                </div>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    onClick={handleDateClick}
                                    className="w-full px-3 py-2 bg-black border-2 border-acid-green font-code text-white text-sm focus:outline-none"
                                />
                            </div>

                            {/* 2. Match Type */}
                            <div>
                                <label className="text-[10px] font-pixel text-acid-green uppercase block mb-1">⚔️ TYPE</label>
                                <select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    className="w-full px-3 py-2 bg-black border-2 border-acid-green font-code text-white text-sm focus:outline-none appearance-none"
                                >
                                    {availableTypes.length > 0 ? availableTypes.map(t => <option key={t} value={t}>{t}</option>) : <option>NO_DATA</option>}
                                </select>
                            </div>

                            {/* 3. Match Mode */}
                            <div>
                                <label className="text-[10px] font-pixel text-acid-green uppercase block mb-1">🎯 MODE</label>
                                <select
                                    value={selectedMode}
                                    onChange={(e) => setSelectedMode(e.target.value)}
                                    className="w-full px-3 py-2 bg-black border-2 border-acid-green font-code text-white text-sm focus:outline-none appearance-none"
                                >
                                    {availableModes.length > 0 ? availableModes.map(m => <option key={m} value={m}>{m}</option>) : <option>NO_DATA</option>}
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleAnalyze}
                            disabled={isRecapLoading || !selectedType || !selectedMode}
                            className="w-full py-3 bg-acid-green text-black font-pixel text-sm border-4 border-black shadow-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50 disabled:grayscale uppercase tracking-widest"
                        >
                            {isRecapLoading ? (
                                <span className="animate-blink">CRUNCHING DATA...</span>
                            ) : (
                                <>🔬 EXECUTE_DEEP_ANALYSIS</>
                            )}
                        </button>
                    </div>

                    {recapStats ? (
                        <ResultView stat={recapStats.stat} />
                    ) : (
                        availableTypes.length > 0 && (
                            <div className="text-center py-12 text-gray-500 text-sm border-2 border-dashed border-gray-700 font-code">
                                <span className="block mb-4 text-3xl">🔎</span>
                                SELECT_MATCH_TYPE_AND_MODE_ABOVE
                            </div>
                        )
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 bg-metal-silver border-t-2 border-white flex justify-center flex-shrink-0">
                    <button onClick={closeRecapModal} className="px-8 py-2 bg-metal-silver border-t border-l border-white border-b-2 border-r-2 border-b-black border-r-black font-pixel text-black text-xs hover:bg-gray-300 active:border-t-black active:border-l-black active:border-b-white active:border-r-white uppercase">
                        CLOSE_REPORT
                    </button>
                </div>
            </div>
        </div>
    );
};
