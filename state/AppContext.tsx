
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { SearchStatus, UserProfile, MatchDetail, Match, RecapStats, MatchResult, AnomalyReport, PageContent, ModeStat } from '../types';
import { nexonService } from '../services/nexonService';
import { geminiService, ComparativeStats } from '../services/geminiService';
import { useUI } from './UIContext';

// Default page content (previously from cloudStorageService)
const DEFAULT_PAGE_CONTENT: PageContent = {
  loadingText: "실험 데이터 로딩 중...",
  errorText: "피험자를 찾을 수 없습니다. (ID 확인 요망)",
  welcomeText: "전적 연구소"
};

interface AppContextType {
  searchStatus: SearchStatus;
  setSearchStatus: (status: SearchStatus) => void;
  userProfile: UserProfile | null;
  searchUser: (nickname: string) => Promise<void>;
  pageContent: PageContent;
  visibleMatchCount: number;
  loadMoreMatches: () => Promise<void>;
  isLoadingMore: boolean;
  activeMatch: Match | null;
  activeMatchDetail: MatchDetail | null;
  isMatchDetailLoading: boolean;
  openMatchDetail: (match: Match) => void;
  closeMatchDetail: () => void;
  recapStats: RecapStats | null;
  calculateRecap: (date: string, matchType: string, matchMode: string) => Promise<void>;
  isRecapLoading: boolean;
  performAnomalyCheck: () => Promise<void>;
  anomalyReport: AnomalyReport | null;
  isAnomalyLoading: boolean;
  openKeySelector: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { openAnalysisModal } = useUI();

  const [searchStatus, setSearchStatus] = useState<SearchStatus>(SearchStatus.IDLE);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [pageContent] = useState<PageContent>(DEFAULT_PAGE_CONTENT);
  const [visibleMatchCount, setVisibleMatchCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [activeMatchDetail, setActiveMatchDetail] = useState<MatchDetail | null>(null);
  const [isMatchDetailLoading, setIsMatchDetailLoading] = useState(false);
  const [recapStats, setRecapStats] = useState<RecapStats | null>(null);
  const [isRecapLoading, setIsRecapLoading] = useState(false);
  const [anomalyReport, setAnomalyReport] = useState<AnomalyReport | null>(null);
  const [isAnomalyLoading, setIsAnomalyLoading] = useState(false);

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

  const calculateRecap = async (date: string, matchType: string, matchMode: string) => {
    if (!userProfile) return;

    // API Key Check
    if (window.aistudio && window.aistudio.hasSelectedApiKey && !(await window.aistudio.hasSelectedApiKey())) {
      try {
        await window.aistudio.openSelectKey();
      } catch (e) {
        alert("API 키 설정이 필요합니다.");
        return;
      }
    }

    setIsRecapLoading(true);
    setRecapStats(null);

    try {
      // 1. Target Matches (Selected Date + Type + Mode)
      const targetMatches = userProfile.recentMatches.filter(m =>
        m.rawDate.startsWith(date) && m.matchType === matchType && m.matchMode === matchMode
      );

      // 2. All Matches (History + Type + Mode) for Baseline Comparison
      const allMatches = userProfile.recentMatches.filter(m =>
        m.matchType === matchType && m.matchMode === matchMode
      );

      // Helper for stat calculation
      const calcStats = (matches: Match[]): ModeStat => {
        if (matches.length === 0) {
          return { modeName: `${matchType}/${matchMode}`, matchCount: 0, winRate: 0, kd: 0, kills: 0, deaths: 0 };
        }
        const wins = matches.filter(m => m.result === MatchResult.WIN).length;
        const totalKills = matches.reduce((sum, m) => sum + m.kill, 0);
        const totalDeaths = matches.reduce((sum, m) => sum + m.death, 0);
        const winRate = parseFloat(((wins / matches.length) * 100).toFixed(1));
        const kd = totalDeaths === 0 ? (totalKills > 0 ? 100 : 0) : parseFloat(((totalKills / totalDeaths) * 100).toFixed(1));
        return {
          modeName: `${matchType}/${matchMode}`,
          matchCount: matches.length,
          winRate,
          kd,
          kills: totalKills,
          deaths: totalDeaths
        };
      };

      const dateStat = calcStats(targetMatches);
      const overallStat = calcStats(allMatches);

      if (targetMatches.length === 0) {
        setRecapStats({
          date,
          matchType,
          matchMode,
          stat: { ...dateStat, aiAnalysis: "해당 조건의 매치 기록이 없습니다." }
        });
        setIsRecapLoading(false);
        return;
      }

      // 3. Fetch Detailed Logs for Target Matches (Batch)
      const matchIds = targetMatches.map(m => m.id);
      let detailedLogsStr = "상세 정보 없음";

      try {
        const rawDetails = await nexonService.fetchMatchDetailsBatch(matchIds);

        detailedLogsStr = rawDetails.map((detail: any, idx) => {
          const myData = detail.match_detail.find((p: any) => p.user_name === userProfile.nickname);
          const mapName = detail.match_map || "알 수 없는 맵";
          const result = targetMatches[idx]?.result || "N/A"; // fallback

          if (!myData) return `- Match ${idx + 1}: 데이터 손상`;
          return `- [Match ${idx + 1}] 맵: ${mapName} | 결과: ${result} | 기록: ${myData.kill}K ${myData.death}D (${myData.headshot}HS) | 데미지: ${myData.damage}`;
        }).join("\n");

      } catch (err) {
        console.error("Failed to fetch batch details", err);
        detailedLogsStr = "상세 매치 로그 조회 실패 (API 오류)";
      }

      // 4. AI Analysis with Comparison & Details
      const analysisData: ComparativeStats = {
        dateStat,
        overallStat,
        details: detailedLogsStr
      };

      try {
        dateStat.aiAnalysis = await geminiService.analyzeDailyRecap(analysisData, matchType, matchMode);
      } catch (e: any) {
        console.error("Analysis Error:", e);
        dateStat.aiAnalysis = `분석 실패: ${e.message || "서버 응답 없음"}`;
      }

      setRecapStats({
        date,
        matchType,
        matchMode,
        stat: dateStat
      });

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
      pageContent,
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
