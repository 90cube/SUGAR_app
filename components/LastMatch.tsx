
import React, { useState, useEffect, useCallback } from 'react';
import { PlayerMatchDetail } from '../types';
import { nexonService } from '../services/nexonService';

interface LastMatchProps {
  matchId: string;
  userNickname: string;
  onSearchPlayer: (nickname: string) => void;
}

interface RawMatchData {
  match_id: string;
  match_type: string;
  match_mode: string;
  date_match: string;
  match_map: string;
  match_detail: PlayerMatchDetail[];
}

export const LastMatch: React.FC<LastMatchProps> = ({ matchId, userNickname, onSearchPlayer }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [rawData, setRawData] = useState<RawMatchData | null>(null);
  const [loadedMatchId, setLoadedMatchId] = useState<string | null>(null);
  const [freshMsg, setFreshMsg] = useState(false);

  const load = useCallback(async (id: string) => {
    setIsLoading(true);
    setFreshMsg(false);
    try {
      const data = await nexonService.getMatchDetail(id);
      setRawData(data);
      setLoadedMatchId(id);
    } catch {
      setRawData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(matchId);
  }, [matchId, load]);

  const handleRefresh = async () => {
    if (matchId === loadedMatchId && rawData) {
      setFreshMsg(true);
      setTimeout(() => setFreshMsg(false), 2500);
      return;
    }
    await load(matchId);
  };

  const players: PlayerMatchDetail[] = rawData?.match_detail ?? [];
  const myTeamId = players.find(p => p.user_name === userNickname)?.team_id;

  // If user found: split by team; otherwise fallback to team_id "0" vs "1"
  const allies = myTeamId != null
    ? players.filter(p => p.team_id === myTeamId)
    : players.filter(p => p.team_id === '0');
  const enemies = myTeamId != null
    ? players.filter(p => p.team_id !== myTeamId)
    : players.filter(p => p.team_id !== '0');

  return (
    <div className="bg-black border-2 border-white shadow-hard animate-in fade-in duration-500">
      {/* Terminal Header Strip */}
      <div className="bg-acid-green text-black px-3 py-1.5 font-pixel font-bold text-[10px] flex justify-between items-center">
        <span>C:\SUDDENLAB\LAST_MATCH.LOG</span>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="text-[9px] bg-black text-acid-green px-2 py-0.5 border border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50"
        >
          {isLoading ? 'SYNC...' : '↺ REFRESH'}
        </button>
      </div>

      <div className="p-3">
        {freshMsg && (
          <div className="text-acid-cyan font-code text-[10px] text-center mb-2 animate-pulse">
            // ALREADY_UP_TO_DATE
          </div>
        )}

        {isLoading ? (
          <div className="py-8 text-center text-acid-green font-code text-xs animate-pulse">
            FETCHING_MATCH_LOG...
          </div>
        ) : rawData ? (
          <div>
            {/* Match Meta */}
            <div className="font-code text-[9px] text-gray-500 text-center mb-3 border-b border-gray-800 pb-2 truncate">
              MAP: {rawData.match_map || '??'} &nbsp;|&nbsp; {nexonService.formatToKST(rawData.date_match)}
            </div>

            {/* Team Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Ally — Left */}
              <div>
                <div className="font-pixel text-[9px] text-acid-green border-b border-acid-green/40 pb-1 mb-1.5">
                  ◀ ALLY [{allies.length}]
                </div>
                <div className="space-y-0.5">
                  {allies.map((p, i) => (
                    <button
                      key={i}
                      disabled={p.user_name === userNickname}
                      onClick={() => onSearchPlayer(p.user_name)}
                      title={p.user_name === userNickname ? '나' : `${p.user_name} 전적 검색`}
                      className={`w-full text-left text-[11px] font-code px-1 py-0.5 truncate transition-colors ${
                        p.user_name === userNickname
                          ? 'text-acid-green font-bold cursor-default'
                          : 'text-white hover:bg-acid-green hover:text-black cursor-pointer'
                      }`}
                    >
                      {p.user_name === userNickname ? '▶ ' : '  '}{p.user_name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enemy — Right */}
              <div>
                <div className="font-pixel text-[9px] text-acid-pink border-b border-acid-pink/40 pb-1 mb-1.5 text-right">
                  [{enemies.length}] ENEMY ▶
                </div>
                <div className="space-y-0.5">
                  {enemies.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => onSearchPlayer(p.user_name)}
                      title={`${p.user_name} 전적 검색`}
                      className="w-full text-right text-[11px] font-code px-1 py-0.5 truncate text-acid-pink hover:bg-acid-pink hover:text-black transition-colors cursor-pointer"
                    >
                      {p.user_name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-gray-600 font-code text-xs">
            NO_DATA_FOUND
          </div>
        )}
      </div>
    </div>
  );
};
