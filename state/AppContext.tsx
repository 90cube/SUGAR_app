
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppStatus, UserProfile, MatchDetail, Match, RecapStats, MatchResult, AnomalyReport, PageContent, AuthUser, CommunityUserProfile } from '../types';
import { nexonService } from '../services/nexonService';
import { cloudStorageService } from '../services/cloudStorageService';
import { geminiService } from '../services/geminiService';
import { authService } from '../services/authService';
import { UI_STRINGS } from '../constants';
import { jwtDecode } from "jwt-decode";
import { communityService } from '../services/communityService';

interface AppContextType {
  status: AppStatus;
  setStatus: (status: AppStatus) => void;
  isLoggedIn: boolean;
  
  // Login Methods
  authUser: AuthUser | null;
  handleGoogleLoginSuccess: (credential: string) => void;
  login: (id: string, pw: string) => Promise<boolean>; // Updated signature
  register: (data: { email: string; pw: string; nickname: string; phone: string }) => Promise<boolean>; // New
  logout: () => void;
  isAdminUser: boolean; 
  
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  
  userProfile: UserProfile | null;
  searchUser: (nickname: string) => Promise<void>;
  
  // Content / CMS State
  pageContent: PageContent;
  updatePageContent: (newContent: PageContent) => Promise<void>;
  isAdminEditorOpen: boolean;
  openAdminEditor: () => void;
  closeAdminEditor: () => void;
  isSavingContent: boolean;

  // Admin Specific Modals
  isAdminHiddenBoardOpen: boolean;
  openAdminHiddenBoard: () => void;
  closeAdminHiddenBoard: () => void;
  isAdminGuillotineOpen: boolean;
  openAdminGuillotine: () => void;
  closeAdminGuillotine: () => void;

  // Community User Profile
  selectedCommunityUser: CommunityUserProfile | null;
  openCommunityUserProfile: (nickname: string) => void;
  closeCommunityUserProfile: () => void;

  // Match List & Pagination Logic
  visibleMatchCount: number;
  loadMoreMatches: () => Promise<void>;
  isLoadingMore: boolean;
  
  // Match Detail Logic
  activeMatch: Match | null;
  activeMatchDetail: MatchDetail | null;
  isMatchDetailLoading: boolean;
  openMatchDetail: (match: Match) => void;
  closeMatchDetail: () => void;

  // Recap Logic
  isRecapModalOpen: boolean;
  openRecapModal: () => void;
  closeRecapModal: () => void;
  recapStats: RecapStats | null;
  calculateRecap: (date: string) => Promise<void>;
  isRecapLoading: boolean;

  // Analysis Logic
  isAnalysisModalOpen: boolean;
  openAnalysisModal: () => void;
  closeAnalysisModal: () => void;
  
  // Anomaly Logic
  performAnomalyCheck: () => Promise<void>;
  anomalyReport: AnomalyReport | null;
  isAnomalyLoading: boolean;

  // Community Logic
  isCommunityOpen: boolean;
  openCommunity: () => void;
  closeCommunity: () => void;

  // Virtual Matching Logic
  isVirtualMatchingModalOpen: boolean;
  openVirtualMatchingModal: () => void;
  closeVirtualMatchingModal: () => void;

  // Direct Message Logic
  isDMModalOpen: boolean;
  openDMModal: (username: string) => void;
  closeDMModal: () => void;
  activeDMUser: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Content State
  const [pageContent, setPageContent] = useState<PageContent>(cloudStorageService.getDefaultContent());
  const [isAdminEditorOpen, setIsAdminEditorOpen] = useState(false);
  const [isSavingContent, setIsSavingContent] = useState(false);

  // Admin Modals State
  const [isAdminHiddenBoardOpen, setIsAdminHiddenBoardOpen] = useState(false);
  const [isAdminGuillotineOpen, setIsAdminGuillotineOpen] = useState(false);

  // Community User Profile State
  const [selectedCommunityUser, setSelectedCommunityUser] = useState<CommunityUserProfile | null>(null);

  // Pagination State
  const [visibleMatchCount, setVisibleMatchCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Match Detail State
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [activeMatchDetail, setActiveMatchDetail] = useState<MatchDetail | null>(null);
  const [isMatchDetailLoading, setIsMatchDetailLoading] = useState(false);

  // Recap State
  const [isRecapModalOpen, setIsRecapModalOpen] = useState(false);
  const [recapStats, setRecapStats] = useState<RecapStats | null>(null);
  const [isRecapLoading, setIsRecapLoading] = useState(false);

  // Analysis State
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [anomalyReport, setAnomalyReport] = useState<AnomalyReport | null>(null);
  const [isAnomalyLoading, setIsAnomalyLoading] = useState(false);

  // Community State
  const [isCommunityOpen, setIsCommunityOpen] = useState(false);

  // Virtual Matching State
  const [isVirtualMatchingModalOpen, setIsVirtualMatchingModalOpen] = useState(false);

  // Direct Message State
  const [isDMModalOpen, setIsDMModalOpen] = useState(false);
  const [activeDMUser, setActiveDMUser] = useState<string | null>(null);

  // Load Content on Mount & Restore Session
  useEffect(() => {
     // 1. Content
     cloudStorageService.fetchContentConfig().then(setPageContent);
     
     // 2. Auth Session
     authService.getSession().then((user) => {
         if (user) {
             console.log("[AppContext] Restored session for", user.name);
             setAuthUser(user);
             setIsLoggedIn(true);
             setIsAdminUser(user.role === 'admin');
         }
     });
  }, []);

  // --- Login Logic ---

  const handleGoogleLoginSuccess = (credential: string) => {
    try {
      const decoded: any = jwtDecode(credential);
      const user: AuthUser = {
        id: decoded.sub,
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture,
        role: 'user',
        isEmailVerified: true
      };
      setAuthUser(user);
      setIsLoggedIn(true);
      setIsAuthModalOpen(false);
    } catch (e) {
      console.error("Failed to decode Google Credential", e);
      alert("Failed to verify Google Login.");
    }
  };

  const login = async (id: string, pw: string) => {
      try {
          const user = await authService.login(id, pw);
          setAuthUser(user);
          setIsLoggedIn(true);
          setIsAdminUser(user.role === 'admin');
          setIsAuthModalOpen(false);
          return true;
      } catch (e: any) {
          throw e; // Pass error to UI
      }
  };

  const register = async (data: { email: string; pw: string; nickname: string; phone: string }) => {
      try {
          const user = await authService.register(data);
          setAuthUser(user);
          setIsLoggedIn(true);
          setIsAdminUser(false);
          setIsAuthModalOpen(false);
          return true;
      } catch (e: any) {
          throw e;
      }
  };

  const logout = async () => {
    await authService.logout();
    setIsLoggedIn(false);
    setIsAdminUser(false);
    setAuthUser(null);
    setStatus(AppStatus.IDLE);
    setIsCommunityOpen(false);
    setIsAdminHiddenBoardOpen(false);
    setIsAdminGuillotineOpen(false);
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  // --- CMS & Admin Logic ---
  const openAdminEditor = () => setIsAdminEditorOpen(true);
  const closeAdminEditor = () => setIsAdminEditorOpen(false);
  
  const updatePageContent = async (newContent: PageContent) => {
      setIsSavingContent(true);
      const success = await cloudStorageService.saveContentConfig(newContent);
      if (success) {
          setPageContent(newContent);
      }
      setIsSavingContent(false);
  };

  const openAdminHiddenBoard = () => setIsAdminHiddenBoardOpen(true);
  const closeAdminHiddenBoard = () => setIsAdminHiddenBoardOpen(false);

  const openAdminGuillotine = () => setIsAdminGuillotineOpen(true);
  const closeAdminGuillotine = () => setIsAdminGuillotineOpen(false);

  // --- Community User Profile ---
  const openCommunityUserProfile = async (nickname: string) => {
      const profile = await communityService.getCommunityUserProfile(nickname);
      setSelectedCommunityUser(profile);
  };
  const closeCommunityUserProfile = () => setSelectedCommunityUser(null);

  // --- Existing Logic ---
  
  const openRecapModal = () => setIsRecapModalOpen(true);
  const closeRecapModal = () => {
    setIsRecapModalOpen(false);
    setRecapStats(null); 
  };

  const openAnalysisModal = () => setIsAnalysisModalOpen(true);
  const closeAnalysisModal = () => {
    setIsAnalysisModalOpen(false);
    setAnomalyReport(null); 
  };

  const openCommunity = () => setIsCommunityOpen(true);
  const closeCommunity = () => setIsCommunityOpen(false);

  const openVirtualMatchingModal = () => setIsVirtualMatchingModalOpen(true);
  const closeVirtualMatchingModal = () => setIsVirtualMatchingModalOpen(false);

  const openDMModal = (username: string) => {
    setActiveDMUser(username);
    setIsDMModalOpen(true);
  };
  const closeDMModal = () => {
    setIsDMModalOpen(false);
    setActiveDMUser(null);
  };

  const openMatchDetail = async (match: Match) => {
    setActiveMatch(match);
    setIsMatchDetailLoading(true);
    setActiveMatchDetail(null); 
    try {
      const detailData = await nexonService.getMatchDetail(match.id);
      const fullDetail: MatchDetail = { ...match, RawData: detailData };
      setActiveMatchDetail(fullDetail);
    } catch (e) {
      console.error("Error fetching match detail", e);
      setActiveMatchDetail({ ...match }); 
    } finally {
      setIsMatchDetailLoading(false);
    }
  };

  const closeMatchDetail = () => {
    setActiveMatch(null);
    setActiveMatchDetail(null);
  };

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const searchUser = async (nickname: string) => {
    setStatus(AppStatus.LOADING);
    setVisibleMatchCount(10); 
    setAnomalyReport(null);
    try {
      const profile = await nexonService.fetchFullProfile(nickname);
      await wait(600);
      if (profile) {
        setUserProfile(profile);
        setStatus(AppStatus.SUCCESS);
      } else {
        setUserProfile(null);
        setStatus(AppStatus.ERROR);
      }
    } catch (e) {
      console.error(e);
      setStatus(AppStatus.ERROR);
    }
  };

  const loadMoreMatches = async () => {
    if (!userProfile) return;
    if (visibleMatchCount >= userProfile.recentMatches.length) return;
    setIsLoadingMore(true);
    await wait(500);
    setVisibleMatchCount(prev => prev + 10);
    setIsLoadingMore(false);
  };

  const calculateRecap = async (date: string) => {
    if (!userProfile) return;
    setIsRecapLoading(true);
    setRecapStats(null);
    
    try {
      const G_today = userProfile.recentMatches.filter(m => m.rawDate.startsWith(date));
      const G_rest = userProfile.recentMatches.filter(m => !m.rawDate.startsWith(date));
      const G_ranked = userProfile.recentMatches.filter(m => 
        m.matchType.includes("랭크") || m.matchMode.includes("랭크")
      );
      
      const stats: RecapStats = {
          date,
          totalMatches: G_today.length,
          winRate: calculateWinRate(G_today),
          kd: calculateKD(G_today),
          topWeapon: "N/A (API Limit)",
          comparison: {
              restWinRate: calculateWinRate(G_rest),
              restKd: calculateKD(G_rest),
              rankedWinRate: calculateWinRate(G_ranked),
              rankedKd: calculateKD(G_ranked)
          }
      };

      if (G_today.length > 0) {
          // Send summarized stats to Gemini for qualitative analysis
          try {
             const analysis = await geminiService.analyzeDailyRecap(stats);
             stats.aiAnalysis = analysis;
          } catch (aiErr) {
             console.error("AI Analysis Failed", aiErr);
             stats.aiAnalysis = "AI Analysis unavailable.";
          }
      } else {
          stats.aiAnalysis = "No matches played on this date.";
      }
      
      setRecapStats(stats);

    } catch (e) {
      console.error("Recap failed", e);
    } finally {
      setIsRecapLoading(false);
    }
  };

  const performAnomalyCheck = async () => {
    if (!userProfile) return;
    setIsAnomalyLoading(true);
    setAnomalyReport(null);
    openAnalysisModal(); 
    try {
        await wait(1500);
        let selectedDateKST = new Date().toISOString().split('T')[0];
        if (userProfile.recentMatches.length > 0) {
            selectedDateKST = userProfile.recentMatches[0].rawDate.split('T')[0];
        }
        const report = await nexonService.runAnomalyDetection(
            userProfile.nickname, selectedDateKST, userProfile.recentMatches
        );
        setAnomalyReport(report);
    } catch (e) {
        console.error("Anomaly Check Error", e);
        setAnomalyReport({
            status: "ERROR", label: "Normal", suspicion_score: 0, deviation_level: 0,
            message: "An unexpected error occurred.", reasons: [],
            evidence: { last10_kd: 0, today_kd: 0, baseline_kd_mean: 0, baseline_kd_std: 0, today_match_count: 0 }
        });
    } finally {
        setIsAnomalyLoading(false);
    }
  };

  const calculateWinRate = (matches: Match[]) => {
    if (matches.length === 0) return 0;
    const wins = matches.filter(m => m.result === MatchResult.WIN).length;
    return parseFloat(((wins / matches.length) * 100).toFixed(1));
  };

  const calculateKD = (matches: Match[]) => {
    let kills = 0; let deaths = 0;
    matches.forEach(m => { kills += m.kill; deaths += m.death; });
    if (deaths === 0) return kills > 0 ? 100 : 0;
    return parseFloat(((kills / deaths) * 100).toFixed(1));
  };

  useEffect(() => {
    const anyModalOpen = isAuthModalOpen || !!activeMatch || isRecapModalOpen || isAnalysisModalOpen || isCommunityOpen || isVirtualMatchingModalOpen || isDMModalOpen || isAdminEditorOpen || isAdminHiddenBoardOpen || isAdminGuillotineOpen || !!selectedCommunityUser;
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAuthModalOpen, activeMatch, isRecapModalOpen, isAnalysisModalOpen, isCommunityOpen, isVirtualMatchingModalOpen, isDMModalOpen, isAdminEditorOpen, isAdminHiddenBoardOpen, isAdminGuillotineOpen, selectedCommunityUser]);

  return (
    <AppContext.Provider value={{ 
      status, setStatus, 
      isLoggedIn, authUser, handleGoogleLoginSuccess, login, register, logout, isAdminUser,
      isAuthModalOpen, openAuthModal, closeAuthModal,
      userProfile, searchUser,
      activeMatch, activeMatchDetail, isMatchDetailLoading, openMatchDetail, closeMatchDetail,
      visibleMatchCount, loadMoreMatches, isLoadingMore,
      isRecapModalOpen, openRecapModal, closeRecapModal, recapStats, calculateRecap, isRecapLoading,
      isAnalysisModalOpen, openAnalysisModal, closeAnalysisModal,
      performAnomalyCheck, anomalyReport, isAnomalyLoading,
      isCommunityOpen, openCommunity, closeCommunity,
      isVirtualMatchingModalOpen, openVirtualMatchingModal, closeVirtualMatchingModal,
      isDMModalOpen, openDMModal, closeDMModal, activeDMUser,
      pageContent, updatePageContent, isAdminEditorOpen, openAdminEditor, closeAdminEditor, isSavingContent,
      isAdminHiddenBoardOpen, openAdminHiddenBoard, closeAdminHiddenBoard,
      isAdminGuillotineOpen, openAdminGuillotine, closeAdminGuillotine,
      selectedCommunityUser, openCommunityUserProfile, closeCommunityUserProfile
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
