import React from 'react';

interface GradeCardProps {
  rank: number;
}

export const GradeCard: React.FC<GradeCardProps> = ({ rank }) => {
  return (
    <div className="bg-black border-2 border-acid-green p-4 flex items-center justify-between shadow-hard-green">
      <div>
        <span className="text-[10px] font-pixel text-acid-green uppercase">SERVER_RANKING</span>
        <div className="text-2xl font-pixel text-white mt-1">#{rank.toLocaleString()}</div>
      </div>
      <div className="h-10 w-10 bg-acid-green flex items-center justify-center border-2 border-black">
        <span className="text-xl">🏆</span>
      </div>
    </div>
  );
};
