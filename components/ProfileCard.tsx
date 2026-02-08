
import React from 'react';
import { UserProfile } from '../types';

interface ProfileCardProps {
  profile: UserProfile;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ profile }) => {
  return (
    <div className="font-code text-black">
      <div className="flex gap-4 mb-4">
        <div className="w-16 h-16 bg-white border-2 border-black shadow-[2px_2px_0_#808080] flex items-center justify-center">
          {/* 8-bit User Icon Placeholder */}
          <div className="w-10 h-10 bg-black relative">
            <div className="absolute top-1 left-2 w-1 h-1 bg-white"></div>
            <div className="absolute top-1 right-2 w-1 h-1 bg-white"></div>
            <div className="absolute bottom-2 left-2 right-2 h-1 bg-white"></div>
          </div>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold font-pixel tracking-tighter mb-1">{profile.nickname}</h2>
          {profile.clan && (
            <div className="text-xs bg-black text-white inline-block px-2 py-0.5 font-bold">
              CLAN: {profile.clan}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between border-b border-black border-dotted pb-1">
          <span className="font-bold">TOTAL_RANK:</span>
          <span className="font-pixel text-lg">{profile.overallGrade}</span>
        </div>
        <div className="flex justify-between border-b border-black border-dotted pb-1">
          <span className="font-bold">SEASON_RANK:</span>
          <span className="font-pixel text-lg text-blue-800">{profile.seasonGrade}</span>
        </div>
        <div className="mt-2 text-[10px] text-gray-600">
          ID: {Math.floor(Math.random() * 99999).toString().padStart(5, '0')} // VERIFIED
        </div>
      </div>
    </div>
  );
};
