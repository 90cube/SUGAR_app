
// Global application types

// Extend Window interface for Google Identity Services
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
  id: string; // match_id
  result: MatchResult;
  matchType: string; // match_type
  matchMode: string; // match_mode
  kd: string; // Formatted "K/D" string for display
  date: string; // Formatted date for display (MM-DD HH:mm)
  rawDate: string; // Original ISO/KST string for logic (YYYY-MM-DD...)
  kill: number;
  death: number;
  assist: number;
}

// Since the schema for Match Detail was not fully provided, 
// we will extend Match and allow for additional dynamic fields usually found in detail responses
export interface MatchDetail extends Match {
  // Add specific detail fields if known, otherwise we treat it as an extension of the list info
  // For the purpose of the UI, we will display the core stats in the modal
  RawData?: any; 
}

// Terminology: Tier is for Ranked Matches (Solo/Party)
export interface RankMatchState {
  tierName: string; // e.g., "GOLD I", "UNRANK"
  tierImage: string; // URL from metadata
  score: number;
}

export interface RecentStats {
  winRate: number;
  kd: number;
  assaultRate: number;
  sniperRate: number;
  specialRate: number; // Added per schema
}

// Authenticated Session User (Google or Admin)
export interface AuthUser {
  id: string;
  loginId?: string; // Custom Login ID (e.g. sugar123)
  name: string; // Nickname
  email: string;
  phone?: string; // New: Phone number
  picture?: string;
  role: 'admin' | 'user';
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
}

export interface UserProfile {
  ouid: string; 
  nickname: string;
  isAdmin?: boolean; // New Admin Flag
  
  // Grade System (EXP based)
  overallGrade: string; 
  overallExp: number;
  overallRanking: number;
  
  seasonGrade: string;
  seasonExp: number;
  seasonRanking: number;
  
  clan: string | null;
  
  // Rank Match System (Tier based)
  soloTier: RankMatchState;
  partyTier: RankMatchState;
  
  recentMatches: Match[]; // Acts as 'matchesAll'
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
  aiAnalysis?: string; // AI generated text
}

export interface AnomalyReport {
  status: "OK" | "SKIPPED_LOW_IMPACT" | "ERROR";
  label: "Normal" | "Suspicious";
  suspicion_score: number; // 0..100
  deviation_level: number; // 0..1
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

export interface UserState {
  isLoggedIn: boolean;
  profile: UserProfile | null;
}

// --- Community Types ---
export type BoardType = 'update' | 'balance' | 'fun' | 'stream' | 'hidden'; // Added 'hidden'
export type AuthorRole = 'admin' | 'user';
export type PostStatus = 'APPROVED' | 'PENDING' | 'HIDDEN'; // Added 'HIDDEN'

export interface CommunityPost {
  id: string;
  boardType: BoardType;
  title: string;
  content: string; // Text or HTML/Markdown stub
  author: string;
  authorRole: AuthorRole;
  createdAt: string; // ISO string
  heads: number; // Headshot (Like)
  halfshots: number; // Half-shot (Dislike)
  views: number;
  thumbnail?: string; // Optional for stream/fun
  commentCount: number;
  status: PostStatus; 
  isHidden?: boolean; // Explicit flag for hidden board
}

export interface CommunityUserProfile {
  nickname: string;
  joinDate: string;
  postCount: number;
  commentCount: number;
  guillotineCount: number;
}

// --- CMS / Admin Types ---
export interface PageContent {
    welcomeTitle: string;
    loadingText: string;
    errorText: string;
    anomalyButtonText: string;
    searchButtonText: string;
}
