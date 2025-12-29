
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SearchStatus, UserProfile, MatchDetail, Match, RecapStats, MatchResult, AnomalyReport, PageContent } from '../types';
import { nexonService } from '../services/nexonService';
import { cloudStorageService } from '../services/cloudStorageService';
import { geminiService } from '../services/geminiService';
import { communityService } from '../services/communityService';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';

interface AppContextType {
  searchStatus: SearchStatus;
  setSearchStatus: (status: SearchStatus) => void;
  userProfile: UserProfile | null;
  searchUser: (nickname: string) => Promise<void>;
  pageContent: PageContent;
  updatePageContent: (newContent: PageContent) => Promise<void>;
  isSavingContent: boolean;
  openCommunityUserProfile: (nickname: string, authorId?: string) => void;
  visibleMatchCount: number;
  loadMoreMatches: () => Promise<void>;
  isLoadingMore: boolean;
  activeMatch: Match | null;
  activeMatchDetail: MatchDetail | null;
  isMatchDetailLoading: boolean;
  openMatchDetail: (match: Match) => void;
  closeMatchDetail: () => void;
  recapStats: RecapStats | null;
  calculateRecap: (date: string) => Promise<void>;
  isRecapLoading: boolean;
  performAnomalyCheck: () => Promise<void>;
  anomalyReport: AnomalyReport | null;
  isAnomalyLoading: boolean;
  openKeySelector: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { authUser } = useAuth();
  const { setSelectedCommunityUser, openAnalysisModal } = useUI();
  
  const [searchStatus, setSearchStatus] = useState<SearchStatus>(SearchStatus.IDLE);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [pageContent, setPageContent] = useState<PageContent>(cloudStorageService.getDefaultContent());
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [visibleMatchCount, setVisibleMatchCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [activeMatchDetail, setActiveMatchDetail] = useState<MatchDetail | null>(null);
  const [isMatchDetailLoading, setIsMatchDetailLoading] = useState(false);
  const [recapStats, setRecapStats] = useState<RecapStats | null>(null);
  const [isRecapLoading, setIsRecapLoading] = useState(false);
  const [anomalyReport, setAnomalyReport] = useState<AnomalyReport | null>(null);
  const [isAnomalyLoading, setIsAnomalyLoading] = useState(false);

  useEffect(() => {
     cloudStorageService.fetchContentConfig().then(setPageContent);
  }, []);

  const updatePageContent = async (newContent: PageContent) => {
      setIsSavingContent(true);
      const success = await cloudStorageService.saveContentConfig(newContent);
      if (success) setPageContent(newContent);
      setIsSavingContent(false);
  };

  const openCommunityUserProfile = async (nickname: string, authorId?: string) => {
      const targetId = authorId || (nickname === authUser?.name ? authUser?.id : undefined);
      const profile = await communityService.getCommunityUserProfile(nickname, targetId);
      setSelectedCommunityUser({ ...profile, authorId: targetId });
  };

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
    setSearchStatus(SearchStatus.LOADING);
    setVisibleMatchCount(10); 
    setAnomalyReport(null);
    try {
      const profile = await nexonService.fetchFullProfile(nickname);
      if (profile) {
        setUserProfile(profile);
        setSearchStatus(SearchStatus.SUCCESS);
      } else {
        setUserProfile(null);
        setSearchStatus(SearchStatus.ERROR);
      }
    } catch (e) {
      setSearchStatus(SearchStatus.ERROR);
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

  const openKeySelector = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
    }
  };

  return (
    <AppContext.Provider value={{ 
      searchStatus, setSearchStatus, userProfile, searchUser,
      activeMatch, activeMatchDetail, isMatchDetailLoading, openMatchDetail, closeMatchDetail,
      visibleMatchCount, loadMoreMatches, isLoadingMore,
      recapStats, calculateRecap, isRecapLoading,
      performAnomalyCheck, anomalyReport, isAnomalyLoading,
      pageContent, updatePageContent, isSavingContent,
      openCommunityUserProfile,
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
