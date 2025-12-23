import React from 'react';

interface GradeCardProps {
  rank: number;
}

export const GradeCard: React.FC<GradeCardProps> = ({ rank }) => {
  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-5 shadow-sm border border-slate-700 text-white flex items-center justify-between">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Server Ranking</span>
        <div className="text-2xl font-black mt-1 tracking-tight">#{rank.toLocaleString()}</div>
      </div>
      <div className="h-10 w-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg shadow-yellow-400/20">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-slate-900">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-6.75a1.125 1.125 0 01-1.125-1.125v-6.75C9.75 5.5 10.253 5 10.875 5h2.25c.621 0 1.125.504 1.125 1.125v6.75c0 .621.504 1.125 1.125 1.125H16.5a1.125 1.125 0 011.125 1.125v3.375z" />
        </svg>
      </div>
    </div>
  );
};
