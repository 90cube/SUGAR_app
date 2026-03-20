
import React, { useState, useEffect } from 'react';
import { useUI } from '../state/UIContext';
import { updatesService } from '../services/updatesService';
import { GameUpdate, UpdateSearchResult } from '../types';
import { marked } from 'marked';

type SourceFilter = 'all' | 'dcinside' | 'nexon';
type SortMode = 'latest' | 'analyzed';

// ─── 감정 뱃지 ───
const SentimentBadge: React.FC<{ sentiment: string }> = ({ sentiment }) => {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    positive: { label: '호평', bg: 'bg-emerald-900/60', text: 'text-emerald-400' },
    negative: { label: '비판', bg: 'bg-red-900/60', text: 'text-red-400' },
    neutral:  { label: '중립', bg: 'bg-gray-800/60', text: 'text-gray-400' },
    mixed:    { label: '혼재', bg: 'bg-amber-900/60', text: 'text-amber-400' },
  };
  const s = map[sentiment] || map.neutral;
  return (
    <span className={`${s.bg} ${s.text} px-2 py-0.5 rounded-sm font-code text-[10px] font-bold`}>
      {s.label}
    </span>
  );
};

// ─── 소스 뱃지 ───
const SourceBadge: React.FC<{ source: string }> = ({ source }) => {
  const isNexon = source === 'nexon';
  return (
    <span className={`px-1.5 py-0.5 font-pixel text-[9px] ${isNexon ? 'bg-blue-600 text-white' : 'bg-orange-500 text-white'}`}>
      {isNexon ? 'NEXON' : 'DC'}
    </span>
  );
};

// ─── 피드 카드 ───
const FeedCard: React.FC<{ update: GameUpdate; score?: number; onOpen: (u: GameUpdate) => void }> = ({ update, score, onOpen }) => {
  const timeAgo = getTimeAgo(update.published_at || update.crawled_at);

  return (
    <button
      onClick={() => onOpen(update)}
      className="w-full text-left bg-gray-950 border border-gray-800 active:border-acid-green active:bg-gray-900 transition-colors"
    >
      {/* Card Header */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <SourceBadge source={update.source} />
        <span className="text-gray-500 font-code text-[11px]">{timeAgo}</span>
        {update.analysis && <SentimentBadge sentiment={update.analysis.sentiment} />}
        {score !== undefined && (
          <span className="ml-auto text-acid-cyan font-code text-[10px]">{(score * 100).toFixed(0)}%</span>
        )}
      </div>

      {/* Title */}
      <div className="px-4 pb-2">
        <h3 className="font-code text-white text-[15px] leading-snug line-clamp-2">{update.title}</h3>
      </div>

      {/* AI Summary */}
      {update.analysis && (
        <div className="px-4 pb-3">
          <p className="text-gray-400 font-code text-[12px] leading-relaxed line-clamp-3">
            {update.analysis.summary}
          </p>
          {update.analysis.key_changes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {update.analysis.key_changes.slice(0, 3).map((c, i) => (
                <span key={i} className="bg-gray-800 text-acid-green font-code text-[10px] px-2 py-0.5">
                  {c.length > 20 ? c.slice(0, 20) + '...' : c}
                </span>
              ))}
              {update.analysis.key_changes.length > 3 && (
                <span className="text-gray-600 font-code text-[10px] px-1">+{update.analysis.key_changes.length - 3}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* No Analysis */}
      {!update.analysis && (
        <div className="px-4 pb-3">
          <p className="text-gray-600 font-code text-[12px] italic">AI 분석 대기중...</p>
        </div>
      )}

      {/* Footer */}
      {update.author && (
        <div className="px-4 pb-3 border-t border-gray-800/50 pt-2">
          <span className="text-gray-600 font-code text-[10px]">by {update.author}</span>
        </div>
      )}
    </button>
  );
};

// ─── 상세 뷰 (슬라이드 인) ───
const DetailView: React.FC<{ update: GameUpdate; onBack: () => void }> = ({ update, onBack }) => {
  const dateStr = update.published_at
    ? new Date(update.published_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="animate-in slide-in-from-right duration-200 h-full overflow-y-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="sticky top-0 z-10 w-full bg-black/90 backdrop-blur-sm border-b border-gray-800 px-4 py-3 flex items-center gap-2 active:bg-gray-900"
      >
        <span className="text-acid-green font-screen text-xl">&lt;</span>
        <span className="text-white font-code text-sm">돌아가기</span>
      </button>

      {/* Article Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <SourceBadge source={update.source} />
          {update.analysis && <SentimentBadge sentiment={update.analysis.sentiment} />}
          <span className="text-gray-500 font-code text-[11px]">{dateStr}</span>
        </div>
        <h1 className="font-code text-white text-lg font-bold leading-snug">{update.title}</h1>
        <div className="flex items-center gap-3 mt-2">
          {update.author && <span className="text-gray-500 font-code text-xs">{update.author}</span>}
          {update.url && (
            <a href={update.url} target="_blank" rel="noopener noreferrer" className="text-acid-cyan font-code text-xs active:underline">
              원문 보기 &gt;
            </a>
          )}
        </div>
      </div>

      {/* AI Analysis Card */}
      {update.analysis && (
        <div className="mx-3 mt-4 bg-gray-950 border border-acid-pink/30 overflow-hidden">
          <div className="bg-acid-pink/10 px-4 py-2 border-b border-acid-pink/20">
            <span className="font-pixel text-acid-pink text-[10px]">AI ANALYSIS REPORT</span>
          </div>
          <div className="px-4 py-3 space-y-4">
            {/* Summary */}
            <div>
              <p className="text-white font-code text-[13px] leading-relaxed">{update.analysis.summary}</p>
            </div>

            {/* Key Changes */}
            {update.analysis.key_changes.length > 0 && (
              <div>
                <span className="font-pixel text-[9px] text-gray-500 mb-2 block">KEY CHANGES</span>
                <div className="space-y-1.5">
                  {update.analysis.key_changes.map((change, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-acid-green font-code text-xs mt-0.5 shrink-0">&gt;</span>
                      <span className="text-gray-300 font-code text-xs leading-relaxed">{change}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Community Reaction */}
            {update.analysis.community_reaction && (
              <div className="bg-gray-900 -mx-4 px-4 py-3 border-t border-gray-800">
                <span className="font-pixel text-[9px] text-gray-500 mb-1.5 block">COMMUNITY REACTION</span>
                <p className="text-yellow-300/80 font-code text-xs leading-relaxed">{update.analysis.community_reaction}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Raw Content */}
      <div className="px-4 py-4">
        <span className="font-pixel text-[9px] text-gray-600 mb-3 block">ORIGINAL CONTENT</span>
        <div
          className="font-code text-gray-400 text-xs leading-relaxed [&_p]:mb-3 [&_ul]:ml-4 [&_ul]:mb-3 [&_li]:list-disc [&_h1]:text-white [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-white [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-gray-300 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:mb-1 [&_strong]:text-white [&_a]:text-acid-cyan"
          dangerouslySetInnerHTML={{ __html: marked.parse(update.content.slice(0, 8000)) as string }}
        />
      </div>

      {/* Bottom spacer for mobile safe area */}
      <div className="h-20" />
    </div>
  );
};

// ─── 메인 커뮤니티 페이지 ───
export const CommunityPage: React.FC = () => {
  const { isCommunityOpen, closeCommunity } = useUI();

  const [source, setSource] = useState<SourceFilter>('all');
  const [sort, setSort] = useState<SortMode>('latest');
  const [updates, setUpdates] = useState<GameUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UpdateSearchResult[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Detail
  const [selectedUpdate, setSelectedUpdate] = useState<GameUpdate | null>(null);

  // Stats
  const [stats, setStats] = useState<{ totalUpdates: number; totalAnalyzed: number } | null>(null);

  useEffect(() => {
    if (isCommunityOpen) {
      loadUpdates(1, true);
      loadStats();
    }
  }, [isCommunityOpen, source]);

  const loadUpdates = async (p: number, reset = false) => {
    setLoading(true);
    try {
      const src = source === 'all' ? undefined : source;
      const result = await updatesService.fetchUpdates(p, src);
      if (reset) {
        setUpdates(result.updates);
      } else {
        setUpdates(prev => [...prev, ...result.updates]);
      }
      setPage(p);
      setHasMore(p < result.pagination.totalPages);
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const s = await updatesService.fetchStats();
      setStats(s);
    } catch {}
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setIsSearchMode(false);
      return;
    }
    setIsSearching(true);
    setIsSearchMode(true);
    try {
      const src = source === 'all' ? undefined : source;
      const result = await updatesService.searchUpdates(searchQuery, src, 15);
      setSearchResults(result.results);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchMode(false);
    setSearchResults([]);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) loadUpdates(page + 1);
  };

  if (!isCommunityOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      {/* ─── Top Bar ─── */}
      <div className="shrink-0 bg-black border-b-2 border-gray-800 safe-area-top">
        <div className="flex items-center justify-between px-3 py-2.5">
          <button onClick={closeCommunity} className="flex items-center gap-1.5 active:opacity-60">
            <span className="text-acid-green font-screen text-2xl">&lt;</span>
            <span className="text-white font-pixel text-[11px]">SULAB</span>
          </button>

          <span className="font-pixel text-white text-xs tracking-wider">COMMUNITY</span>

          <div className="flex items-center gap-1">
            {stats && (
              <span className="text-gray-600 font-code text-[10px]">
                {stats.totalUpdates} posts
              </span>
            )}
          </div>
        </div>

        {/* ─── Search Bar ─── */}
        <div className="px-3 pb-2.5">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색 (예: 밸런스 패치, 신규 무기...)"
                className="w-full h-9 bg-gray-900 border border-gray-700 text-white font-code text-sm px-3 pr-8 focus:outline-none focus:border-acid-green placeholder:text-gray-600 placeholder:text-xs"
              />
              {isSearchMode && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 active:text-white text-lg font-code"
                >
                  x
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="h-9 px-4 bg-acid-green text-black font-screen text-lg font-bold border border-black active:bg-acid-green/70 disabled:opacity-50"
            >
              {isSearching ? '...' : 'GO'}
            </button>
          </form>
        </div>

        {/* ─── Filter Tabs ─── */}
        <div className="flex border-t border-gray-800">
          {([
            { key: 'all', label: 'ALL' },
            { key: 'nexon', label: 'NEXON' },
            { key: 'dcinside', label: 'HOT ISSUE' },
          ] as { key: SourceFilter; label: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => { setSource(tab.key); clearSearch(); }}
              className={`flex-1 py-2 font-pixel text-[10px] text-center border-b-2 transition-colors ${
                source === tab.key
                  ? 'border-acid-green text-acid-green'
                  : 'border-transparent text-gray-500 active:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
        {selectedUpdate ? (
          <DetailView update={selectedUpdate} onBack={() => setSelectedUpdate(null)} />
        ) : (
          <div className="pb-safe">
            {/* Search Results */}
            {isSearchMode && (
              <div className="px-3 py-2 bg-gray-900/50 border-b border-gray-800">
                <span className="font-code text-gray-500 text-[11px]">
                  검색결과: {searchResults.length}건 "{searchQuery}"
                </span>
              </div>
            )}

            {/* Loading Skeleton */}
            {loading && updates.length === 0 && (
              <div className="space-y-px">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-gray-950 border-b border-gray-800 px-4 py-4 animate-pulse">
                    <div className="flex gap-2 mb-3">
                      <div className="w-12 h-4 bg-gray-800 rounded-sm" />
                      <div className="w-16 h-4 bg-gray-800 rounded-sm" />
                    </div>
                    <div className="w-3/4 h-4 bg-gray-800 rounded-sm mb-2" />
                    <div className="w-full h-3 bg-gray-900 rounded-sm" />
                  </div>
                ))}
              </div>
            )}

            {/* Feed List */}
            {!isSearchMode && !loading && updates.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 px-6">
                <span className="font-pixel text-gray-600 text-sm mb-2">NO_DATA</span>
                <p className="font-code text-gray-700 text-xs text-center">
                  N8N 크롤링 워크플로우가 데이터를 수집하면 여기에 표시됩니다
                </p>
              </div>
            )}

            {/* Feed */}
            <div className="divide-y divide-gray-800/50">
              {isSearchMode
                ? searchResults.map(r => (
                    <FeedCard key={r.update.id} update={r.update} score={r.score} onOpen={setSelectedUpdate} />
                  ))
                : updates.map(u => (
                    <FeedCard key={u.id} update={u} onOpen={setSelectedUpdate} />
                  ))
              }
            </div>

            {/* Load More */}
            {!isSearchMode && hasMore && updates.length > 0 && (
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="w-full py-4 text-center font-code text-gray-500 text-xs active:text-acid-green active:bg-gray-900 disabled:opacity-50"
              >
                {loading ? '로딩중...' : '더 보기'}
              </button>
            )}

            {/* Bottom safe area */}
            <div className="h-8" />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── 유틸리티 ───
function getTimeAgo(dateStr: string): string {
  try {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '방금';
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
    return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}
