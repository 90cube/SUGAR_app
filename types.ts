
// Global application types
declare global {
  interface Window {
    google: any;
  }
}

export enum AppStatus {
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

export interface MatchDetail extends Match {
  RawData?: any; 
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

export type BoardType = 'update' | 'balance' | 'fun' | 'stream' | 'hidden';

export interface CommunityPost {
  id: string;
  boardType: BoardType;
  title: string;
  content: string;
  author: string;
  authorRole: 'admin' | 'user';
  createdAt: string;
  heads: number; // 추천 (헤드샷)
  halfshots: number; // 비추천 (반샷)
  blueVotes: number; // 밸런스 투표 BLUE
  redVotes: number; // 밸런스 투표 RED
  views: number;
  thumbnail?: string;
  commentCount: number;
  status: 'APPROVED' | 'PENDING' | 'HIDDEN'; 
  isHidden?: boolean;
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
