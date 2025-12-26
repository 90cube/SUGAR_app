
import React from 'react';
import { UserProfile } from '../types';

interface ProfileCardProps {
  profile: UserProfile;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ profile }) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-2xl border-2 border-slate-200 relative overflow-hidden group font-mono">
      {/* Technical Accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full flex items-center justify-end p-4">
         <span className="text-[10px] font-black text-slate-200 rotate-45">LAB_UNIT_A</span>
      </div>

      <div className="w-full relative z-10">
        <div className="flex items-center justify-between mb-6">
           <div className="flex flex-col">
              <span className="text-[9px] font-black text-cyan-600 tracking-widest uppercase mb-1">Subject_Nickname</span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{profile.nickname}</h2>
           </div>
           {profile.clan && (
             <span className="px-3 py-1 rounded bg-slate-900 text-[10px] font-black text-cyan-400 border border-cyan-500/30">
               CLAN:{profile.clan}
             </span>
           )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Overall Grade Info */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 relative shadow-inner">
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Overall_Grade</span>
            <div className="font-black text-slate-800 text-xs truncate uppercase tracking-tight">{profile.overallGrade}</div>
            <div className="text-[10px] text-cyan-600 mt-2 font-bold flex items-center gap-1">
                <span className="w-1 h-1 bg-cyan-500 rounded-full"></span>
                RANK #{profile.overallRanking.toLocaleString()}
            </div>
          </div>

          {/* Season Grade Info */}
          <div className="bg-slate-950 p-4 rounded-lg border border-cyan-500/20 relative shadow-2xl overflow-hidden">
             <div className="absolute inset-0 bg-cyan-500/5 pulse"></div>
            <span className="block text-[8px] font-black text-cyan-400 uppercase tracking-widest mb-2 relative z-10">Season_Record</span>
            <div className="font-black text-white text-xs truncate relative z-10 uppercase tracking-tight">{profile.seasonGrade}</div>
            <div className="text-[10px] text-slate-400 mt-2 font-bold relative z-10">
                POS_NUM: #{profile.seasonRanking.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
