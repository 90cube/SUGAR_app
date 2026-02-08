
import React from 'react';
import { RankMatchState } from '../types';

interface TierCardProps {
  type: "Solo" | "Party";
  tier: RankMatchState;
}

export const TierCard: React.FC<TierCardProps> = ({ type, tier }) => {
  const isUnranked = tier.tierName === "UNRANK";

  return (
    <div className={`h-full flex flex-col justify-between py-2 text-center relative overflow-hidden group
       ${isUnranked ? 'opacity-50 grayscale' : ''}
    `}>
      {/* Scanline overlay for card */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMiIvPgo8L3N2Zz4=')] opacity-30 pointer-events-none"></div>

      <div className="relative z-10 text-acid-green font-screen text-3xl font-bold mb-2 drop-shadow-md">
        {tier.tierName}
      </div>

      <div className="relative z-10 text-white font-code text-xs">
        {isUnranked ? (
          <span className="animate-pulse">NO_DATA</span>
        ) : (
          <span>{tier.score.toLocaleString()} RP</span>
        )}
      </div>

      <div className="absolute bottom-0 right-0 opacity-20 group-hover:opacity-100 transition-opacity">
        <img src={tier.tierImage} className="w-10 h-10 object-contain pixelated" alt="tier" style={{ imageRendering: 'pixelated' }} />
      </div>
    </div>
  );
};
