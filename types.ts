
// Global application types
declare global {
  interface Window {
    google: any;
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

export interface AuthUser {
  id: string;
  loginId?: string;
  name: string;
  email: string;
  picture?: string;
  role: 'admin' | 'user';
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  phone?: string;
}

export interface UserProfile {
  ouid: string; 
  nickname: string;
  isAdmin?: boolean;
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

export interface RecapStats {
  date: string;
  totalMatches: number;
  winRate: number;
  kd: number;
  topWeapon: string;
  comparison: {
    restWinRate: number;
    restKd: number;
    rankedWinRate: number;
    rankedKd: number;
  };
  aiAnalysis?: string;
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

// SQL 스키마와 동일한 소문자 값 사용
export type BoardType = 'update' | 'balance' | 'kukkuk' | 'streaming' | 'temp' | 'hidden';

export interface CommunityPost {
  id: string;
  boardType: BoardType;
  title: string;
  content: string;
  author: string;
  authorId: string; 
  authorRole: 'admin' | 'user';
  createdAt: string;
  heads: number;      // 추천 (Headshot)
  halfshots: number;  // 비추천 (Halfshot)
  blueVotes: number;  // 투표 A (Blue)
  redVotes: number;   // 투표 B (Red)
  views: number;
  thumbnail?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  commentCount: number;
  status: 'APPROVED' | 'PENDING' | 'HIDDEN' | 'DELETED'; 
  isHidden?: boolean;
  blueOption?: string;
  redOption?: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  authorNickname: string;
  content: string;
  createdAt: string;
  teamType: 'BLUE' | 'RED' | 'GRAY';
}

export interface CommunityUserProfile {
  nickname: string;
  joinDate: string;
  postCount: number;
  commentCount: number;
  guillotineCount: number;
}

export interface PageContent {
    welcomeTitle: string;
    loadingText: string;
    errorText: string;
    anomalyButtonText: string;
    searchButtonText: string;
}