
import React from 'react';
import { UserProfile } from '../types';

interface ProfileCardProps {
  profile: UserProfile;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ profile }) => {
  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-indigo-500/5 border border-white/60 ring-1 ring-white/50 relative overflow-hidden group">
      {/* Shine effect */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

      <div className="w-full relative z-10">
        <div className="flex items-center justify-between mb-4">
           <h2 className="text-xl font-black text-slate-800 tracking-tight">{profile.nickname}</h2>
           {profile.clan && (
             <span className="px-3 py-1 rounded-full bg-slate-900/5 border border-slate-900/10 text-xs font-bold text-slate-600">
               {profile.clan}
             </span>
           )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Overall Grade Info */}
          <div className="bg-white/50 p-3 rounded-xl border border-white/60 text-center shadow-sm">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">통합 계급 (Grade)</span>
            <div className="font-bold text-slate-800 text-sm truncate">{profile.overallGrade}</div>
            <div className="text-xs text-slate-500 mt-0.5">#{profile.overallRanking.toLocaleString()}위</div>
          </div>

          {/* Season Grade Info */}
          <div className="bg-yellow-50/50 p-3 rounded-xl border border-yellow-100/60 text-center shadow-sm relative overflow-hidden">
             <div className="absolute inset-0 bg-yellow-400/5 blur-md"></div>
            <span className="block text-[10px] font-bold text-yellow-600 uppercase tracking-wider mb-1 relative z-10">시즌 계급 (Season)</span>
            <div className="font-bold text-slate-800 text-sm truncate relative z-10">{profile.seasonGrade}</div>
            <div className="text-xs text-slate-500 mt-0.5 relative z-10">#{profile.seasonRanking.toLocaleString()}위</div>
          </div>
        </div>
      </div>
    </div>
  );
};
