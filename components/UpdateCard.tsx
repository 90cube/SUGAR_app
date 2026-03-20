import React from 'react';
import { GameUpdate } from '../types';

interface UpdateCardProps {
  update: GameUpdate;
  onClick: (update: GameUpdate) => void;
  score?: number;
}

const sentimentConfig: Record<string, { label: string; color: string }> = {
  positive: { label: 'POSITIVE', color: 'text-acid-green' },
  negative: { label: 'NEGATIVE', color: 'text-red-400' },
  neutral: { label: 'NEUTRAL', color: 'text-gray-400' },
  mixed: { label: 'MIXED', color: 'text-yellow-400' },
};

export const UpdateCard: React.FC<UpdateCardProps> = ({ update, onClick, score }) => {
  const sentiment = update.analysis?.sentiment
    ? sentimentConfig[update.analysis.sentiment]
    : null;

  const sourceLabel = update.source === 'nexon' ? 'NEXON' : 'DC';
  const sourceBg = update.source === 'nexon' ? 'bg-blue-600' : 'bg-orange-600';

  const dateStr = update.published_at
    ? new Date(update.published_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '날짜 없음';

  return (
    <button
      onClick={() => onClick(update)}
      className="w-full text-left bg-black border-2 border-gray-700 hover:border-acid-green p-3 transition-all group cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`${sourceBg} text-white font-pixel text-[10px] px-1.5 py-0.5 shrink-0`}>
            {sourceLabel}
          </span>
          <h3 className="font-code text-white text-sm truncate group-hover:text-acid-green transition-colors">
            {update.title}
          </h3>
        </div>
        <span className="text-gray-500 font-code text-[10px] shrink-0">{dateStr}</span>
      </div>

      {update.analysis && (
        <div className="space-y-1">
          <p className="text-gray-400 font-code text-xs line-clamp-2">
            {update.analysis.summary}
          </p>
          <div className="flex items-center gap-3">
            {sentiment && (
              <span className={`font-pixel text-[10px] ${sentiment.color}`}>
                [{sentiment.label}]
              </span>
            )}
            {update.analysis.key_changes.length > 0 && (
              <span className="text-gray-500 font-code text-[10px]">
                {update.analysis.key_changes.length}개 변경사항
              </span>
            )}
            {score !== undefined && (
              <span className="text-acid-cyan font-code text-[10px]">
                MATCH: {(score * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      )}

      {!update.analysis && (
        <p className="text-gray-600 font-code text-xs italic">분석 대기중...</p>
      )}
    </button>
  );
};
