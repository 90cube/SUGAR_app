
import React, { useEffect, useState } from 'react';
import { useApp } from '../state/AppContext';
import { useUI } from '../state/UIContext';

export const AnalysisModal: React.FC = () => {
  const { isAnalysisModalOpen, closeAnalysisModal } = useUI();
  const { anomalyReport, isAnomalyLoading } = useApp();
  const [logLines, setLogLines] = useState<{ id: number, text: string }[]>([]);

  useEffect(() => {
    if (isAnomalyLoading) {
      const logs = [
        "INITIALIZING_QUANTUM_SCAN...",
        "ACCESSING_NEXON_MAINFRAME...",
        "PARSING_MATCH_PKT_0x884...",
        "DECRYPTING_SUBJECT_OUID...",
        "ANALYZING_BEHAVIORAL_PATTERN...",
        "RUNNING_ABNORMAL_DETECT...",
        "COMPUTING_DEVIATION_SCORES...",
        "CALIBRATING_BASELINE_STATS...",
        "GENERATING_LAB_REPORT_V2.0..."
      ];
      let i = 0;
      const timer = setInterval(() => {
        setLogLines(prev => [...prev.slice(-3), { id: Date.now(), text: logs[i % logs.length] }]);
        i++;
      }, 700);
      return () => clearInterval(timer);
    }
  }, [isAnomalyLoading]);

  if (!isAnalysisModalOpen) return null;

  if (isAnomalyLoading || !anomalyReport) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black p-4">
        {/* CRT Grid */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#00ff00 1px, transparent 1px), linear-gradient(90deg, #00ff00 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

        <div className="relative flex flex-col items-center">
          <div className="relative w-40 h-40 mb-8 flex items-center justify-center border-4 border-acid-green">
            <div className="absolute inset-0 border-4 border-t-acid-pink border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            <span className="text-5xl animate-bounce">🖥️</span>
          </div>

          <div className="space-y-2 text-center">
            <h3 className="text-2xl font-pixel text-acid-green uppercase animate-pulse">
              ANALYZING_SUBJECT
            </h3>
            <p className="text-xs text-acid-pink font-code uppercase animate-blink">QUANTUM COMPUTING IN PROGRESS</p>
          </div>

          <div className="mt-8 w-80 bg-black border-2 border-acid-green p-4 font-code text-xs text-acid-green">
            {logLines.map((log) => (
              <div key={log.id} className="flex gap-2 mb-1 last:mb-0">
                <span className="opacity-50">0x{log.id.toString(16).slice(-3).toUpperCase()}</span>
                <span>{log.text}</span>
              </div>
            ))}
            {logLines.length === 0 && <div className="animate-pulse">BOOTING_CORE...</div>}
          </div>
        </div>
      </div>
    );
  }

  const { label, suspicion_score, message, reasons, evidence } = anomalyReport;
  const isSuspicious = label === "Suspicious";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={closeAnalysisModal}>
      <div
        className="w-full max-w-md md:max-w-2xl lg:max-w-3xl bg-metal-silver border-2 border-white border-b-black border-r-black shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title Bar */}
        <div className={`px-3 py-2 flex items-center justify-between ${isSuspicious ? 'bg-red-800' : 'bg-blue-900'}`}>
          <h2 className="text-white font-pixel text-sm uppercase">ANOMALY_REPORT.EXE</h2>
          <button
            onClick={closeAnalysisModal}
            className="bg-metal-silver border-t border-l border-white border-b-2 border-r-2 border-b-black border-r-black w-6 h-6 flex items-center justify-center font-bold text-black text-xs hover:bg-gray-300"
          >
            X
          </button>
        </div>

        {/* Header with Status */}
        <div className={`p-6 text-center ${isSuspicious ? 'bg-red-900' : 'bg-black'} border-b-2 border-white`}>
          <h2 className="text-2xl font-pixel text-white uppercase mb-2 italic">
            ANOMALY_REPORT
          </h2>
          <div className={`inline-block px-4 py-1 border-2 font-pixel text-xs uppercase ${isSuspicious ? 'bg-red-600 border-red-400 text-white' : 'bg-acid-green border-black text-black'}`}>
            {isSuspicious ? '!! DETECTION_CONFIRMED !!' : '>> PATTERN_NORMAL <<'}
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 bg-black flex-1">
          {/* Message */}
          <div className={`p-4 border-2 flex items-center gap-4 ${isSuspicious ? 'bg-red-900/30 border-red-500' : 'bg-acid-green/10 border-acid-green'}`}>
            <div className={`w-3 h-3 rounded-full animate-pulse ${isSuspicious ? 'bg-red-500' : 'bg-acid-green'}`}></div>
            <p className={`text-sm font-code uppercase ${isSuspicious ? 'text-red-300' : 'text-acid-green'}`}>
              {message}
            </p>
          </div>

          {/* Score Section */}
          <section className="bg-metal-dark border-2 border-white p-6">
            <span className="text-[10px] font-pixel text-gray-500 uppercase block mb-4 text-center">PROBABILITY_SCORE</span>

            <div className="relative mb-4">
              <div className="h-4 bg-black w-full border-2 border-gray-700">
                <div
                  className={`h-full transition-all duration-1000 ${isSuspicious ? 'bg-red-500' : 'bg-acid-green'}`}
                  style={{ width: `${Math.max(5, suspicion_score)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[10px] font-code text-gray-500 uppercase">
                <span>BASELINE</span>
                <span className={isSuspicious ? 'text-red-500 animate-blink' : ''}>CRITICAL_THRESHOLD</span>
              </div>
            </div>

            <div className="text-center">
              <div className="text-6xl font-pixel text-white inline-flex items-baseline">
                {suspicion_score.toFixed(1)}
                <span className="text-sm text-gray-500 ml-2 uppercase font-code">PTS</span>
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-acid-green animate-pulse"></div>
                <p className="text-[10px] font-code text-gray-500 uppercase">GLOBAL_DEV_MATRIX_CALIBRATED</p>
              </div>
            </div>
          </section>

          {/* Evidence Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-black border-2 border-white">
              <span className="block text-[10px] font-pixel text-acid-green uppercase mb-2">SUBJECT_KD_INDEX</span>
              <span className={`block text-3xl font-pixel ${evidence.today_kd > 2 ? 'text-red-500' : 'text-white'}`}>
                {evidence.today_kd.toFixed(2)}
              </span>
            </div>
            <div className="p-4 bg-black border-2 border-white">
              <span className="block text-[10px] font-pixel text-acid-green uppercase mb-2">LAB_SIGMA_BASELINE</span>
              <span className="block text-3xl font-pixel text-white">
                {evidence.baseline_kd_mean.toFixed(1)} <span className="text-sm text-gray-500">σ{evidence.baseline_kd_std.toFixed(1)}</span>
              </span>
            </div>
          </div>

          {/* Reasons */}
          {reasons.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-pixel text-acid-pink uppercase">DIAGNOSTIC_ANOMALIES_LOGGED</h4>
              <div className="space-y-2">
                {reasons.map((r, i) => (
                  <div key={i} className={`flex items-start gap-4 p-3 border-2 font-code text-sm ${isSuspicious ? 'bg-red-900/20 border-red-700 text-red-300' : 'bg-black border-gray-700 text-gray-400'}`}>
                    <span className="text-xs opacity-40 font-pixel">TRACE_0{i + 1}</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-metal-silver border-t-2 border-white flex justify-center">
          <button onClick={closeAnalysisModal} className="px-8 py-3 bg-black text-acid-green font-pixel text-xs border-4 border-acid-green shadow-hard-green hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all uppercase">
            TERMINATE_PROCESS_SYNC
          </button>
        </div>
      </div>
    </div>
  );
};
