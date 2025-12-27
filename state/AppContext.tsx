
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppStatus, UserProfile, MatchDetail, Match, RecapStats, MatchResult, AnomalyReport, PageContent, AuthUser, CommunityUserProfile, CommunityPost } from '../types';
import { nexonService } from '../services/nexonService';
import { cloudStorageService } from '../services/cloudStorageService';
import { geminiService } from '../services/geminiService';
import { authService } from '../services/authService';
import { communityService } from '../services/communityService';
import { supabase } from '../services/supabaseClient';

export type CommunityViewMode = 'MAIN' | 'UPDATE_ARCHIVE' | 'POST_DETAIL';

interface AppContextType {
  status: AppStatus;
  setStatus: (status: AppStatus) => void;
  isLoggedIn: boolean;
  authUser: AuthUser | null;
  refreshAuthUser: () => Promise<void>;
  login: (id: string, pw: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isAdminToastOpen: boolean; 
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  userProfile: UserProfile | null;
  searchUser: (nickname: string) => Promise<void>;
  pageContent: PageContent;
  updatePageContent: (newContent: PageContent) => Promise<void>;
  isAdminEditorOpen: boolean;
  openAdminEditor: () => void;
  closeAdminEditor: () => void;
  isSavingContent: boolean;
  isAdminHiddenBoardOpen: boolean;
  openAdminHiddenBoard: () => void;
  closeAdminHiddenBoard: () => void;
  isAdminGuillotineOpen: boolean;
  openAdminGuillotine: () => void;
  closeAdminGuillotine: () => void;
  selectedCommunityUser: CommunityUserProfile & { authorId?: string } | null;
  openCommunityUserProfile: (nickname: string, authorId?: string) => void;
  closeCommunityUserProfile: () => void;
  visibleMatchCount: number;
  loadMoreMatches: () => Promise<void>;
  isLoadingMore: boolean;
  activeMatch: Match | null;
  activeMatchDetail: MatchDetail | null;
  isMatchDetailLoading: boolean;
  openMatchDetail: (match: Match) => void;
  closeMatchDetail: () => void;
  isRecapModalOpen: boolean;
  openRecapModal: () => void;
  closeRecapModal: () => void;
  recapStats: RecapStats | null;
  calculateRecap: (date: string) => Promise<void>;
  isRecapLoading: boolean;
  isAnalysisModalOpen: boolean;
  openAnalysisModal: () => void;
  closeAnalysisModal: () => void;
  performAnomalyCheck: () => Promise<void>;
  anomalyReport: AnomalyReport | null;
  isAnomalyLoading: boolean;
  isCommunityOpen: boolean;
  openCommunity: () => void;
  closeCommunity: () => void;
  isVirtualMatchingModalOpen: boolean;
  openVirtualMatchingModal: () => void;
  closeVirtualMatchingModal: () => void;
  isDMModalOpen: boolean;
  openDMModal: (username: string) => void;
  closeDMModal: () => void;
  activeDMUser: string | null;
  // Community Centralized States
  communityViewMode: CommunityViewMode;
  setCommunityViewMode: (mode: CommunityViewMode) => void;
  isCommunityWriteFormOpen: boolean;
  setIsCommunityWriteFormOpen: (open: boolean) => void;
  selectedCommunityPost: CommunityPost | null;
  setSelectedCommunityPost: React.Dispatch<React.SetStateAction<CommunityPost | null>>;
  // API Key Protocol
  openKeySelector: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAdminToastOpen, setIsAdminToastOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [pageContent, setPageContent] = useState<PageContent>(cloudStorageService.getDefaultContent());
  const [isAdminEditorOpen, setIsAdminEditorOpen] = useState(false);
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [isAdminHiddenBoardOpen, setIsAdminHiddenBoardOpen] = useState(false);
  const [isAdminGuillotineOpen, setIsAdminGuillotineOpen] = useState(false);
  const [selectedCommunityUser, setSelectedCommunityUser] = useState<CommunityUserProfile & { authorId?: string } | null>(null);
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

  // Community Specific
  const [communityViewMode, setCommunityViewMode] = useState<CommunityViewMode>('MAIN');
  const [isCommunityWriteFormOpen, setIsCommunityWriteFormOpen] = useState(false);
  const [selectedCommunityPost, setSelectedCommunityPost] = useState<CommunityPost | null>(null);

  // isAdmin 계산: authUser.role이 정확히 'admin'이어야 함.
  const isAdmin = authUser?.role === 'admin';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedCommunityUser) { closeCommunityUserProfile(); return; }
        if (isAdminGuillotineOpen) { closeAdminGuillotine(); return; }
        if (isAdminHiddenBoardOpen) { closeAdminHiddenBoard(); return; }
        if (isAdminEditorOpen) { closeAdminEditor(); return; }
        if (isAnalysisModalOpen) { closeAnalysisModal(); return; }
        if (isRecapModalOpen) { closeRecapModal(); return; }
        if (activeMatch) { closeMatchDetail(); return; }
        if (isVirtualMatchingModalOpen) { closeVirtualMatchingModal(); return; }
        if (isDMModalOpen) { closeDMModal(); return; }
        if (isAuthModalOpen) { closeAuthModal(); return; }
        if (isCommunityOpen) {
           if (isCommunityWriteFormOpen) { setIsCommunityWriteFormOpen(false); return; }
           if (communityViewMode === 'POST_DETAIL' || communityViewMode === 'UPDATE_ARCHIVE') { setCommunityViewMode('MAIN'); return; }
           closeCommunity();
           return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCommunityUser, isAdminGuillotineOpen, isAdminHiddenBoardOpen, isAdminEditorOpen, isAnalysisModalOpen, isRecapModalOpen, activeMatch, isVirtualMatchingModalOpen, isDMModalOpen, isAuthModalOpen, isCommunityOpen, isCommunityWriteFormOpen, communityViewMode]);

  const showAdminToast = () => {
    setIsAdminToastOpen(true);
    setTimeout(() => setIsAdminToastOpen(false), 3500);
  };

  const recoverSession = async () => {
    const profile = await authService.fetchMyProfile();
    
    // [Debug] 최종 적용되는 프로필 상태 확인
    if (profile) {
      console.log(`[AppContext] Session Recovered. User: ${profile.name}, Role: ${profile.role}`);
      setAuthUser(profile);
      setIsLoggedIn(true);
      if (profile.role === 'admin') showAdminToast();
    } else {
      console.log('[AppContext] No Active Session.');
      setAuthUser(null);
      setIsLoggedIn(false);
    }
  };

  const refreshAuthUser = async () => {
    await recoverSession();
  };

  const openKeySelector = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
    } else {
      console.warn("API Key Selector not available in this environment.");
    }
  };

  useEffect(() => {
     cloudStorageService.fetchContentConfig().then(setPageContent);
     recoverSession();
     if (supabase) {
       const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
         if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') recoverSession();
         else if (event === 'SIGNED_OUT') { setAuthUser(null); setIsLoggedIn(false); setIsAdminToastOpen(false); }
       });
       return () => subscription.unsubscribe();
     }
  }, []);

  const login = async (id: string, pw: string) => {
      const user = await authService.login(id, pw);
      setAuthUser(user);
      setIsLoggedIn(true);
      setIsAuthModalOpen(false);
      if (user.role === 'admin') showAdminToast();
      return true;
  };

  const logout = async () => {
    await authService.logout();
    setAuthUser(null);
    setIsLoggedIn(false);
    setIsCommunityOpen(false);
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

  const openCommunityUserProfile = async (nickname: string, authorId?: string) => {
      const targetId = authorId || (nickname === authUser?.name ? authUser?.id : undefined);
      const profile = await communityService.getCommunityUserProfile(nickname, targetId);
      setSelectedCommunityUser({ ...profile, authorId: targetId });
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
      setActiveMatchDetail({ ...match, RawData: detailData });
    } catch (e) {
      setActiveMatchDetail({ ...match }); 
    } finally {
      setIsMatchDetailLoading(false);
    }
  };

  const closeMatchDetail = () => { setActiveMatch(null); setActiveMatchDetail(null); };

  const searchUser = async (nickname: string) => {
    setStatus(AppStatus.LOADING);
    setVisibleMatchCount(10); 
    setAnomalyReport(null);
    try {
      const profile = await nexonService.fetchFullProfile(nickname);
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
      // FIX: Changed timezoneOffset() to getTimezoneOffset()
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const kstDate = new Date(utc + (9 * 60 * 60 * 1000)).toISOString().split('T')[0];
      const report = await nexonService.runAnomalyDetection(userProfile.nickname, kstDate, userProfile.recentMatches);
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
      status, setStatus, isLoggedIn, authUser, refreshAuthUser, login, logout, isAdmin, isAdminToastOpen,
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
      selectedCommunityUser, openCommunityUserProfile, closeCommunityUserProfile,
      communityViewMode, setCommunityViewMode,
      isCommunityWriteFormOpen, setIsCommunityWriteFormOpen,
      selectedCommunityPost, setSelectedCommunityPost,
      openKeySelector
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
