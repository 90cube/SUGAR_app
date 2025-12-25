
import React from 'react';
import { RecentStats } from '../types';

interface RecentTrendProps {
  stats: RecentStats | null;
}

export const RecentTrend: React.FC<RecentTrendProps> = ({ stats }) => {
  if (!stats) return null;

  const items = [
    { label: '승률', value: stats.winRate, color: 'text-blue-600 drop-shadow-sm' },
    { label: 'K/D', value: stats.kd, color: 'text-slate-900' },
    { label: '돌격', value: stats.assaultRate, color: 'text-slate-500' },
    { label: '저격', value: stats.sniperRate, color: 'text-slate-500' },
    { label: '특수', value: stats.specialRate, color: 'text-slate-500' },
  ];

  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-2xl py-5 shadow-xl shadow-indigo-500/5 border border-white/60 ring-1 ring-white/50">
      <div className="grid grid-cols-5 divide-x divide-slate-200/50">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col items-center justify-center px-1 group cursor-default">
            <span className={`text-sm sm:text-base font-black transition-transform duration-300 group-hover:scale-110 ${item.color}`}>
              {typeof item.value === 'number' ? item.value.toFixed(1) : item.value}%
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-tight truncate w-full text-center group-hover:text-slate-600 transition-colors">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
