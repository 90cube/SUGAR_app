
import React from 'react';
import { RecentStats } from '../types';

interface RecentTrendProps {
  stats: RecentStats | null;
}

export const RecentTrend: React.FC<RecentTrendProps> = ({ stats }) => {
  if (!stats) return null;

  const items = [
    { label: 'WIN', value: stats.winRate },
    { label: 'K/D', value: stats.kd },
    { label: 'AR', value: stats.assaultRate },
    { label: 'SR', value: stats.sniperRate },
  ];

  return (
    <div className="w-full font-code text-xs">
      {items.map((item) => (
        <div key={item.label} className="flex justify-between items-center mb-2 hover:bg-white hover:text-black cursor-crosshair px-1 transition-colors">
          <span className="font-bold">[{item.label}]</span>
          <div className="flex items-center gap-2">
            {/* Progress Bar ASCII style */}
            <div className="hidden md:block text-[8px] tracking-tighter text-gray-500">
              {'|'.repeat(Math.floor((typeof item.value === 'number' ? item.value : 0) / 10))}
            </div>
            <span className="font-pixel text-lg text-acid-pink">
              {typeof item.value === 'number' ? item.value.toFixed(1) : item.value}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
