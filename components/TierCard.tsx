
import React from 'react';
import { RankMatchState } from '../types';

interface TierCardProps {
  type: "Solo" | "Party";
  tier: RankMatchState;
}

export const TierCard: React.FC<TierCardProps> = ({ type, tier }) => {
  const isUnranked = tier.tierName === "UNRANK";

  return (
    <div className={`rounded-2xl p-5 shadow-lg border backdrop-blur-xl relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl
      ${isUnranked 
        ? 'bg-slate-100/50 border-white/40 shadow-slate-200/20' 
        : 'bg-white/60 border-white/60 shadow-indigo-500/5 ring-1 ring-white/50'}
    `}>
      {/* Subtle Gradient background for Ranked */}
      {!isUnranked && (
         <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-400/10 rounded-full blur-2xl"></div>
      )}

      <div className="relative z-10">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">{type} Match</span>
        <div className={`text-lg font-black leading-none ${isUnranked ? 'text-slate-400' : 'text-slate-900'}`}>
          {tier.tierName}
        </div>
        {!isUnranked && (
           <div className="text-sm font-medium text-slate-500 mt-1">{tier.score.toLocaleString()} RP</div>
        )}
        {isUnranked && (
          <div className="text-[10px] text-slate-400 mt-1 font-medium">Placement Needed</div>
        )}
      </div>
      
      <div className="absolute bottom-2 right-2 opacity-90 drop-shadow-sm transition-transform duration-500 hover:scale-110 hover:rotate-3">
        <img 
          src={tier.tierImage} 
          alt={`${tier.tierName} Tier`} 
          className={`w-14 h-14 object-contain ${isUnranked ? 'opacity-40 grayscale' : ''}`}
        />
      </div>
    </div>
  );
};
