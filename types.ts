
// Global application types
declare global {
  interface Window {
    google: any;
    aistudio?: {
      hasSelectedApiKey?: () => Promise<boolean>;
      openSelectKey?: () => Promise<void>;
    };
  }
}

export enum SearchStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export enum MatchResult {
  WIN = 'WIN',
  LOSE = 'LOSE',
  DRAW = 'DRAW',
  NONE = 'N/A'
}

export interface Match {
  id: string;
  result: MatchResult;
  matchType: string;
  matchMode: string;
  kd: string;
  date: string;
  rawDate: string;
  kill: number;
  death: number;
  assist: number;
}

export interface PlayerMatchDetail {
  team_id: string;
  match_result: string;
  user_name: string;
  season_grade: string;
  guild_name: string | null;
  kill: number;
  death: number;
  headshot: number;
  damage: number;
  assist: number;
}

export interface MatchDetail extends Match {
  RawData?: {
    match_id: string;
    match_type: string;
    match_mode: string;
    date_match: string;
    match_map: string;
    match_detail: PlayerMatchDetail[];
  };
}

export interface RankMatchState {
  tierName: string;
  tierImage: string;
  score: number;
}

export interface RecentStats {
  winRate: number;
  kd: number;
  assaultRate: number;
  sniperRate: number;
  specialRate: number;
}

export interface UserProfile {
  ouid: string;
  nickname: string;
  overallGrade: string;
  overallExp: number;
  overallRanking: number;
  seasonGrade: string;
  seasonExp: number;
  seasonRanking: number;
  clan: string | null;
  soloTier: RankMatchState;
  partyTier: RankMatchState;
  recentMatches: Match[];
  recentStats: RecentStats | null;
}

// 상세 모드별 통계
export interface ModeStat {
  modeName: string;
  matchCount: number;
  winRate: number;
  kd: number;
  kills: number;
  deaths: number;
  aiAnalysis?: string;
}

export interface RecapStats {
  date: string;
  matchType: string;
  matchMode: string;
  stat: ModeStat;
}

export interface AnomalyReport {
  status: "OK" | "SKIPPED_LOW_IMPACT" | "ERROR";
  label: "Normal" | "Suspicious";
  suspicion_score: number;
  deviation_level: number;
  message: string;
  reasons: string[];
  evidence: {
    last10_kd: number;
    today_kd: number;
    baseline_kd_mean: number;
    baseline_kd_std: number;
    today_match_count: number;
    recent_win_rate?: number;
    recent_kill_death_rate?: number;
  };
}

export interface PageContent {
  welcomeText?: string;
  loadingText: string;
  errorText: string;
}
