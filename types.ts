
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
  date: string; // KST formatted string
  rawDate: string; // UTC string from API
  kill: number;
  death: number;
  assist: number;
}

export interface PlayerMatchDetail {
  team_id: string;
  match_result: string; // "1": Win, "2": Loss
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

export type BoardType = 'update' | 'balance' | 'fun' | 'stream' | 'hidden' | 'TEMP';

export interface StreamingRequest {
  id: string;
  requester_id: string;
  platform: 'CHZZK' | 'SOOP' | 'YOUTUBE';
  stream_url: string;
  pr_url: string;
  description: string;
  thumbnail_url: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_message?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  profiles?: { nickname: string };
}

export interface CommunityPost {
  id: string;
  boardType: BoardType;
  title: string;
  content: string;
  author: string;
  authorId: string; 
  authorRole: 'admin' | 'user';
  createdAt: string;
  heads: number; 
  halfshots: number; 
  blueVotes: number; 
  redVotes: number; 
  views: number;
  thumbnail?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  commentCount: number;
  status: 'APPROVED' | 'PENDING' | 'HIDDEN' | 'DELETED'; 
  isHidden?: boolean;
  blueOption?: string;
  redOption?: string;
  // Streaming specific
  streamUrl?: string;
  prUrl?: string;
  platform?: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  authorNickname: string;
  content: string;
  createdAt: string;
  teamType: 'BLUE' | 'RED' | 'GRAY';
  isDeleted?: boolean;
  deletedBy?: string; // ID of the person who deleted
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
