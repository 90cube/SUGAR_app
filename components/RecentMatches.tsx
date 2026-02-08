
import React from 'react';
import { Match, MatchResult } from '../types';
import { UI_STRINGS } from '../constants';
import { useApp } from '../state/AppContext';
import { useUI } from '../state/UIContext';

interface RecentMatchesProps {
  matches: Match[];
}

export const RecentMatches: React.FC<RecentMatchesProps> = ({ matches }) => {
  const { openMatchDetail, visibleMatchCount, loadMoreMatches, isLoadingMore } = useApp();
  const { openRecapModal } = useUI();

  const displayedMatches = matches.slice(0, visibleMatchCount);
  const hasMore = visibleMatchCount < matches.length;

  const handleRecapClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openRecapModal();
  };

  const handleMatchClick = (match: Match) => {
    openMatchDetail(match);
  };

  if (!matches || matches.length === 0) {
    return (
      <div className="p-8 text-center border-2 border-dashed border-acid-green/30 text-acid-green/50 animate-pulse">
        NO_RECORDS_FOUND_IN_DATABASE...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end mb-4 border-b border-acid-green/30 pb-2">
        <button onClick={handleRecapClick} className="text-xs bg-acid-green text-black px-2 py-1 font-bold hover:bg-white transition-colors">
          &gt; VIEW_DAILY_RECAP
        </button>
      </div>

      <div className="font-screen text-xl space-y-1">
        {displayedMatches.map((match, index) => (
          <div
            key={match.id}
            onClick={() => handleMatchClick(match)}
            className="group flex justify-between items-center border border-transparent hover:border-acid-green hover:bg-acid-green/10 p-2 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-4">
              <span className={`w-3 h-3 ${match.result === MatchResult.WIN ? 'bg-acid-green shadow-[0_0_5px_#ccff00]' :
                match.result === MatchResult.LOSE ? 'bg-acid-pink shadow-[0_0_5px_#ff00ff]' : 'bg-gray-500'
                }`}></span>
              <span className="text-acid-cyan text-lg">[{match.date}]</span>
              <span className="text-white group-hover:text-acid-green">{match.matchMode}</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-sm">KD:</span>
              <span className={`font-bold ${match.result === MatchResult.WIN ? 'text-acid-green' : 'text-acid-pink'
                }`}>
                {match.kd}
              </span>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={loadMoreMatches}
          disabled={isLoadingMore}
          className="w-full mt-4 border-2 border-acid-green border-dashed text-acid-green py-2 hover:bg-acid-green hover:text-black font-bold text-center transition-colors"
        >
          {isLoadingMore ? "DOWNLOADING_DATA..." : "LOAD_MORE_RECORDS [+]"}
        </button>
      )}
    </div>
  );
};
