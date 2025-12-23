import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppStatus, UserProfile, MatchDetail, Match, RecapStats, MatchResult, AnomalyReport } from '../types';
import { nexonService } from '../services/nexonService';

interface AppContextType {
  status: AppStatus;
  setStatus: (status: AppStatus) => void;
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  userProfile: UserProfile | null;
  searchUser: (nickname: string) => Promise<void>;
  
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

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

  const login = () => {
    setIsLoggedIn(true);
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUserProfile(null);
    setStatus(AppStatus.IDLE);
    setIsCommunityOpen(false); // Close community on logout
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);
  
  const openRecapModal = () => setIsRecapModalOpen(true);
  const closeRecapModal = () => {
    setIsRecapModalOpen(false);
    setRecapStats(null); // Reset on close
  };

  const openAnalysisModal = () => setIsAnalysisModalOpen(true);
  const closeAnalysisModal = () => {
    setIsAnalysisModalOpen(false);
    setAnomalyReport(null); // Reset on close
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
    setActiveMatchDetail(null); // Reset prev

    try {
      const detailData = await nexonService.getMatchDetail(match.id);
      // Combine list info with detail info
      const fullDetail: MatchDetail = {
        ...match,
        RawData: detailData
      };
      setActiveMatchDetail(fullDetail);
    } catch (e) {
      console.error("Error fetching match detail", e);
      // Fallback: just show what we have
      setActiveMatchDetail({ ...match }); 
    } finally {
      setIsMatchDetailLoading(false);
    }
  };

  const closeMatchDetail = () => {
    setActiveMatch(null);
    setActiveMatchDetail(null);
  };

  // Helper utility for artificial delay
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const searchUser = async (nickname: string) => {
    setStatus(AppStatus.LOADING);
    setVisibleMatchCount(10); // Reset pagination on new search
    setAnomalyReport(null);
    
    try {
      const profile = await nexonService.fetchFullProfile(nickname);
      
      // Artificial Delay for search (300-600ms)
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
    // Artificial delay for loading more
    await wait(500);
    
    setVisibleMatchCount(prev => prev + 10);
    setIsLoadingMore(false);
  };

  const calculateRecap = async (date: string) => {
    if (!userProfile) return;
    setIsRecapLoading(true);
    setRecapStats(null);

    try {
      // 1. Groups Logic
      const G_today = userProfile.recentMatches.filter(m => m.rawDate.startsWith(date));
      const G_rest = userProfile.recentMatches.filter(m => !m.rawDate.startsWith(date));
      const G_ranked = userProfile.recentMatches.filter(m => 
        m.matchType.includes("랭크") || m.matchMode.includes("랭크")
      );

      if (G_today.length === 0) {
        setIsRecapLoading(false);
        setRecapStats({
            date,
            totalMatches: 0,
            winRate: 0,
            kd: 0,
            topWeapon: "N/A",
            comparison: {
                restWinRate: calculateWinRate(G_rest),
                restKd: calculateKD(G_rest),
                rankedWinRate: calculateWinRate(G_ranked),
                rankedKd: calculateKD(G_ranked)
            }
        });
        return;
      }

      const detailPromises = G_today.map(m => nexonService.getMatchDetail(m.id));
      await Promise.all(detailPromises);
      
      const todayWinRate = calculateWinRate(G_today);
      const todayKD = calculateKD(G_today);
      
      setRecapStats({
        date,
        totalMatches: G_today.length,
        winRate: todayWinRate,
        kd: todayKD,
        topWeapon: "N/A (API Limit)", 
        comparison: {
            restWinRate: calculateWinRate(G_rest),
            restKd: calculateKD(G_rest),
            rankedWinRate: calculateWinRate(G_ranked),
            rankedKd: calculateKD(G_ranked)
        }
      });

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
            userProfile.nickname,
            selectedDateKST,
            userProfile.recentMatches
        );
        
        setAnomalyReport(report);

    } catch (e) {
        console.error("Anomaly Check Error", e);
        setAnomalyReport({
            status: "ERROR",
            label: "Normal",
            suspicion_score: 0,
            deviation_level: 0,
            message: "An unexpected error occurred.",
            reasons: [],
            evidence: { 
                 last10_kd: 0, today_kd: 0, baseline_kd_mean: 0, baseline_kd_std: 0, today_match_count: 0 
             }
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
    let kills = 0;
    let deaths = 0;
    matches.forEach(m => {
        kills += m.kill;
        deaths += m.death;
    });
    if (deaths === 0) return kills > 0 ? 100 : 0;
    return parseFloat(((kills / deaths) * 100).toFixed(1));
  };

  // Scroll Lock Effect
  useEffect(() => {
    const anyModalOpen = isAuthModalOpen || !!activeMatch || isRecapModalOpen || isAnalysisModalOpen || isCommunityOpen || isVirtualMatchingModalOpen || isDMModalOpen;
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAuthModalOpen, activeMatch, isRecapModalOpen, isAnalysisModalOpen, isCommunityOpen, isVirtualMatchingModalOpen, isDMModalOpen]);

  return (
    <AppContext.Provider value={{ 
      status, setStatus, 
      isLoggedIn, login, logout,
      isAuthModalOpen, openAuthModal, closeAuthModal,
      userProfile, searchUser,
      activeMatch, activeMatchDetail, isMatchDetailLoading, openMatchDetail, closeMatchDetail,
      visibleMatchCount, loadMoreMatches, isLoadingMore,
      isRecapModalOpen, openRecapModal, closeRecapModal, recapStats, calculateRecap, isRecapLoading,
      isAnalysisModalOpen, openAnalysisModal, closeAnalysisModal,
      performAnomalyCheck, anomalyReport, isAnomalyLoading,
      isCommunityOpen, openCommunity, closeCommunity,
      isVirtualMatchingModalOpen, openVirtualMatchingModal, closeVirtualMatchingModal,
      isDMModalOpen, openDMModal, closeDMModal, activeDMUser
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