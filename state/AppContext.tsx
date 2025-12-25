
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppStatus, UserProfile, MatchDetail, Match, RecapStats, MatchResult, AnomalyReport, PageContent, AuthUser, CommunityUserProfile } from '../types';
import { nexonService } from '../services/nexonService';
import { cloudStorageService } from '../services/cloudStorageService';
import { geminiService } from '../services/geminiService';
import { authService } from '../services/authService';
import { supabase } from '../services/supabaseClient';
import { UI_STRINGS, ADMIN_EMAILS } from '../constants';
import { jwtDecode } from "jwt-decode";
import { communityService } from '../services/communityService';

interface AppContextType {
  status: AppStatus;
  setStatus: (status: AppStatus) => void;
  isLoggedIn: boolean;
  
  // Login Methods
  authUser: AuthUser | null;
  handleGoogleLoginSuccess: (credential: string) => void;
  login: (id: string, pw: string) => Promise<boolean>;
  register: (data: { loginId: string; email: string; pw: string; nickname: string; phone: string }) => Promise<boolean>;
  logout: () => void;
  isAdminUser: boolean; 
  isAdminToastOpen: boolean; 
  
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
  const [isAdminToastOpen, setIsAdminToastOpen] = useState(false);
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [pageContent, setPageContent] = useState<PageContent>(cloudStorageService.getDefaultContent());
  const [isAdminEditorOpen, setIsAdminEditorOpen] = useState(false);
  const [isSavingContent, setIsSavingContent] = useState(false);

  const [isAdminHiddenBoardOpen, setIsAdminHiddenBoardOpen] = useState(false);
  const [isAdminGuillotineOpen, setIsAdminGuillotineOpen] = useState(false);

  const [selectedCommunityUser, setSelectedCommunityUser] = useState<CommunityUserProfile | null>(null);

  const [visibleMatchCount, setVisibleMatchCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [activeMatchDetail, setActiveMatchDetail] = useState<MatchDetail | null>(null);
  const [isMatchDetailLoading, setIsMatchDetailLoading] = useState(false);

  const [isRecapModalOpen, setIsRecapModalOpen] = useState(false);
  const [recapStats, setRecapStats] = useState<RecapStats | null>(null);
  const [isRecapLoading, setIsRecapLoading] = useState(false);

  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [anomalyReport, setAnomalyReport] = useState<AnomalyReport | null>(null);
  const [isAnomalyLoading, setIsAnomalyLoading] = useState(false);

  const [isCommunityOpen, setIsCommunityOpen] = useState(false);
  const [isVirtualMatchingModalOpen, setIsVirtualMatchingModalOpen] = useState(false);
  const [isDMModalOpen, setIsDMModalOpen] = useState(false);
  const [activeDMUser, setActiveDMUser] = useState<string | null>(null);

  const showAdminToast = () => {
    setIsAdminToastOpen(true);
    setTimeout(() => setIsAdminToastOpen(false), 3500);
  };

  const recoverSession = async () => {
    try {
      const profile = await authService.fetchMyProfile();
      if (profile) {
          console.log("[AppContext] Auth Profile Restored:", profile.email);
          setAuthUser(profile);
          setIsLoggedIn(true);
          const isAdmin = profile.role === 'admin';
          setIsAdminUser(isAdmin);
          if (isAdmin) showAdminToast();
      } else {
          setAuthUser(null);
          setIsLoggedIn(false);
          setIsAdminUser(false);
      }
    } catch (e) {
      console.error("[AppContext] Session recovery failed", e);
    }
  };

  useEffect(() => {
     cloudStorageService.fetchContentConfig().then(setPageContent);
     recoverSession();

     if (supabase) {
       const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
         if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
            recoverSession();
         } else if (event === 'SIGNED_OUT') {
            setAuthUser(null);
            setIsLoggedIn(false);
            setIsAdminUser(false);
            setIsAdminToastOpen(false);
         }
       });
       return () => subscription.unsubscribe();
     }
  }, []);

  const handleGoogleLoginSuccess = async (credential: string) => {
    try {
      const decoded: any = jwtDecode(credential);
      const isAdmin = ADMIN_EMAILS.includes(decoded.email);
      
      const user: AuthUser = {
        id: decoded.sub,
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture,
        role: isAdmin ? 'admin' : 'user',
        isEmailVerified: true
      };
      
      setAuthUser(user);
      setIsLoggedIn(true);
      setIsAdminUser(isAdmin);
      setIsAuthModalOpen(false);
      if (isAdmin) showAdminToast();
    } catch (e) {
      console.error("[AppContext] Google Login Failed", e);
      alert("로그인 처리에 실패했습니다.");
    }
  };

  const login = async (id: string, pw: string) => {
      try {
          const user = await authService.login(id, pw);
          setAuthUser(user);
          setIsLoggedIn(true);
          const isAdmin = user.role === 'admin';
          setIsAdminUser(isAdmin);
          setIsAuthModalOpen(false);
          if (isAdmin) showAdminToast();
          return true;
      } catch (e: any) {
          throw e;
      }
  };

  const register = async (data: { loginId: string; email: string; pw: string; nickname: string; phone: string }) => {
      try {
          const result = await authService.register(data);
          if (result.needsEmailConfirm) return false;
          
          await recoverSession();
          setIsAuthModalOpen(false);
          return true;
      } catch (e: any) {
          throw e;
      }
  };

  const logout = async () => {
    try {
        await authService.logout();
    } finally {
        setIsLoggedIn(false);
        setIsAdminUser(false);
        setAuthUser(null);
        setStatus(AppStatus.IDLE);
        setIsCommunityOpen(false);
        setIsAdminHiddenBoardOpen(false);
        setIsAdminGuillotineOpen(false);
        setIsAdminEditorOpen(false);
        setIsAdminToastOpen(false);
    }
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);
  const openAdminEditor = () => setIsAdminEditorOpen(true);
  const closeAdminEditor = () => setIsAdminEditorOpen(false);
  
  const updatePageContent = async (newContent: PageContent) => {
      setIsSavingContent(true);
      const success = await cloudStorageService.saveContentConfig(newContent);
      if (success) setPageContent(newContent);
      setIsSavingContent(false);
  };

  const openAdminHiddenBoard = () => setIsAdminHiddenBoardOpen(true);
  const closeAdminHiddenBoard = () => setIsAdminHiddenBoardOpen(false);
  const openAdminGuillotine = () => setIsAdminGuillotineOpen(true);
  const closeAdminGuillotine = () => setIsAdminGuillotineOpen(false);

  const openCommunityUserProfile = async (nickname: string) => {
      const profile = await communityService.getCommunityUserProfile(nickname);
      setSelectedCommunityUser(profile);
  };
  const closeCommunityUserProfile = () => setSelectedCommunityUser(null);

  const openRecapModal = () => setIsRecapModalOpen(true);
  const closeRecapModal = () => { setIsRecapModalOpen(false); setRecapStats(null); };
  const openAnalysisModal = () => setIsAnalysisModalOpen(true);
  const closeAnalysisModal = () => { setIsAnalysisModalOpen(false); setAnomalyReport(null); };
  const openCommunity = () => setIsCommunityOpen(true);
  const closeCommunity = () => setIsCommunityOpen(false);
  const openVirtualMatchingModal = () => setIsVirtualMatchingModalOpen(true);
  const closeVirtualMatchingModal = () => setIsVirtualMatchingModalOpen(false);
  const openDMModal = (username: string) => { setActiveDMUser(username); setIsDMModalOpen(true); };
  const closeDMModal = () => { setIsDMModalOpen(false); setActiveDMUser(null); };

  const openMatchDetail = async (match: Match) => {
    setActiveMatch(match);
    setIsMatchDetailLoading(true);
    setActiveMatchDetail(null); 
    try {
      const detailData = await nexonService.getMatchDetail(match.id);
      const fullDetail: MatchDetail = { ...match, RawData: detailData };
      setActiveMatchDetail(fullDetail);
    } catch (e) {
      setActiveMatchDetail({ ...match }); 
    } finally {
      setIsMatchDetailLoading(false);
    }
  };

  const closeMatchDetail = () => { setActiveMatch(null); setActiveMatchDetail(null); };
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

  const calculateRecap = async (date: string) => {
    if (!userProfile) return;
    setIsRecapLoading(true);
    setRecapStats(null);
    try {
      const matchesOnDate = userProfile.recentMatches.filter(m => m.rawDate.startsWith(date));
      const restMatches = userProfile.recentMatches.filter(m => !m.rawDate.startsWith(date));
      const rankedMatches = userProfile.recentMatches.filter(m => m.matchType === "랭크전");

      const stats: RecapStats = {
        date,
        totalMatches: matchesOnDate.length,
        winRate: calculateWinRate(matchesOnDate),
        kd: calculateKD(matchesOnDate),
        topWeapon: "N/A",
        comparison: {
          restWinRate: calculateWinRate(restMatches),
          restKd: calculateKD(restMatches),
          rankedWinRate: calculateWinRate(rankedMatches),
          rankedKd: calculateKD(rankedMatches)
        }
      };

      if (stats.totalMatches > 0) {
        const feedback = await geminiService.analyzeDailyRecap(stats);
        stats.aiAnalysis = feedback;
      }
      setRecapStats(stats);
    } catch (e) {
      console.error("[AppContext] Recap calculation failed", e);
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
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const kstDate = new Date(utc + (9 * 60 * 60 * 1000)).toISOString().split('T')[0];
      
      const report = await nexonService.runAnomalyDetection(
        userProfile.nickname,
        kstDate,
        userProfile.recentMatches
      );
      setAnomalyReport(report);
    } catch (e) {
      console.error("[AppContext] Anomaly detection failed", e);
    } finally {
      setIsAnomalyLoading(false);
    }
  };

  useEffect(() => {
    const anyModalOpen = isAuthModalOpen || !!activeMatch || isRecapModalOpen || isAnalysisModalOpen || isCommunityOpen || isVirtualMatchingModalOpen || isDMModalOpen || isAdminEditorOpen || isAdminHiddenBoardOpen || isAdminGuillotineOpen || !!selectedCommunityUser;
    document.body.style.overflow = anyModalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isAuthModalOpen, activeMatch, isRecapModalOpen, isAnalysisModalOpen, isCommunityOpen, isVirtualMatchingModalOpen, isDMModalOpen, isAdminEditorOpen, isAdminHiddenBoardOpen, isAdminGuillotineOpen, selectedCommunityUser]);

  return (
    <AppContext.Provider value={{ 
      status, setStatus, isLoggedIn, authUser, handleGoogleLoginSuccess, login, register, logout, isAdminUser, isAdminToastOpen,
      isAuthModalOpen, openAuthModal, closeAuthModal, userProfile, searchUser,
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
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
