import React, { useState, useEffect } from 'react';
import { useUI } from '../state/UIContext';
import { updatesService } from '../services/updatesService';
import { GameUpdate, UpdateSearchResult, UpdatesPagination } from '../types';
import { UpdateCard } from './UpdateCard';
import { marked } from 'marked';

type SourceFilter = 'all' | 'dcinside' | 'nexon';
type ViewMode = 'list' | 'detail' | 'search';

export const UpdatesModal: React.FC = () => {
  const { isUpdatesModalOpen, closeUpdatesModal } = useUI();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [updates, setUpdates] = useState<GameUpdate[]>([]);
  const [pagination, setPagination] = useState<UpdatesPagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UpdateSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Detail
  const [selectedUpdate, setSelectedUpdate] = useState<GameUpdate | null>(null);

  // Load updates on mount and filter change
  useEffect(() => {
    if (isUpdatesModalOpen && viewMode === 'list') {
      loadUpdates(1);
    }
  }, [isUpdatesModalOpen, sourceFilter]);

  const loadUpdates = async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const source = sourceFilter === 'all' ? undefined : sourceFilter;
      const result = await updatesService.fetchUpdates(page, source);
      setUpdates(result.updates);
      setPagination(result.pagination);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setViewMode('search');
    setError(null);
    try {
      const source = sourceFilter === 'all' ? undefined : sourceFilter;
      const result = await updatesService.searchUpdates(searchQuery, source);
      setSearchResults(result.results);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCardClick = (update: GameUpdate) => {
    setSelectedUpdate(update);
    setViewMode('detail');
  };

  const handleBack = () => {
    if (viewMode === 'detail') {
      setSelectedUpdate(null);
      setViewMode(searchResults.length > 0 ? 'search' : 'list');
    } else {
      setSearchQuery('');
      setSearchResults([]);
      setViewMode('list');
    }
  };

  const handleClose = () => {
    setViewMode('list');
    setSelectedUpdate(null);
    setSearchQuery('');
    setSearchResults([]);
    closeUpdatesModal();
  };

  if (!isUpdatesModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-metal-silver border-2 border-white border-b-black border-r-black w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Title Bar */}
        <div className="bg-blue-900 px-3 py-1.5 flex justify-between items-center shrink-0">
          <span className="text-white font-pixel text-xs">C:\서든랩\UPDATES.EXE</span>
          <div className="flex gap-1">
            <button className="w-5 h-5 bg-gray-300 border border-gray-500 text-[10px] flex items-center justify-center font-bold hover:bg-gray-400">_</button>
            <button
              onClick={handleClose}
              className="w-5 h-5 bg-gray-300 border border-gray-500 text-[10px] flex items-center justify-center font-bold hover:bg-red-400 hover:text-white"
            >
              X
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-gray-200 border-b border-gray-400 px-3 py-2 flex flex-col gap-2 shrink-0">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="시맨틱 검색... (예: 밸런스 패치, 신규 무기)"
                className="w-full h-8 px-3 bg-white border border-gray-500 border-t-gray-800 border-l-gray-800 font-code text-sm focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 h-8 bg-gray-300 border-t border-l border-white border-b border-r border-black font-pixel text-[10px] hover:bg-gray-400 active:border-t-black active:border-l-black disabled:opacity-50"
            >
              {isSearching ? 'SCAN...' : 'SEARCH'}
            </button>
            {viewMode !== 'list' && (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 h-8 bg-gray-300 border-t border-l border-white border-b border-r border-black font-pixel text-[10px] hover:bg-gray-400"
              >
                BACK
              </button>
            )}
          </form>

          {/* Source Filters */}
          <div className="flex gap-1">
            {(['all', 'nexon', 'dcinside'] as SourceFilter[]).map(src => (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`px-3 py-1 font-pixel text-[10px] border transition-colors ${
                  sourceFilter === src
                    ? 'bg-blue-900 text-white border-blue-600'
                    : 'bg-gray-300 text-black border-gray-500 hover:bg-gray-400'
                }`}
              >
                {src === 'all' ? 'ALL' : src === 'nexon' ? 'NEXON_OFFICIAL' : 'DC_INSIDE'}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-800 p-3 min-h-0">
          {loading && (
            <div className="flex items-center justify-center h-32">
              <span className="font-screen text-acid-green text-xl animate-pulse">LOADING_DATA...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-900/50 border-2 border-red-500 p-4 text-center">
              <span className="font-pixel text-red-400 text-xs">ERROR: {error}</span>
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && !loading && !error && (
            <div className="space-y-2">
              {updates.length === 0 ? (
                <div className="text-center py-12">
                  <span className="font-pixel text-gray-500 text-sm">NO_DATA_FOUND</span>
                  <p className="font-code text-gray-600 text-xs mt-2">N8N 크롤링 후 데이터가 표시됩니다</p>
                </div>
              ) : (
                <>
                  {updates.map(u => (
                    <UpdateCard key={u.id} update={u} onClick={handleCardClick} />
                  ))}
                  {pagination && pagination.totalPages > 1 && (
                    <div className="flex justify-center gap-2 pt-4">
                      {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          onClick={() => loadUpdates(p)}
                          className={`w-8 h-8 font-pixel text-xs border ${
                            p === pagination.page
                              ? 'bg-acid-green text-black border-acid-green'
                              : 'bg-black text-gray-400 border-gray-600 hover:border-acid-green'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Search Results */}
          {viewMode === 'search' && !isSearching && !error && (
            <div className="space-y-2">
              <div className="text-gray-400 font-code text-xs mb-3">
                SEARCH_RESULTS: {searchResults.length}건 (query: "{searchQuery}")
              </div>
              {searchResults.length === 0 ? (
                <div className="text-center py-8">
                  <span className="font-pixel text-gray-500 text-sm">NO_MATCH</span>
                </div>
              ) : (
                searchResults.map(r => (
                  <UpdateCard key={r.update.id} update={r.update} onClick={handleCardClick} score={r.score} />
                ))
              )}
            </div>
          )}

          {/* Detail View */}
          {viewMode === 'detail' && selectedUpdate && (
            <DetailView update={selectedUpdate} />
          )}
        </div>

        {/* Status Bar */}
        <div className="bg-gray-200 border-t border-white px-3 py-1 flex justify-between shrink-0">
          <span className="font-code text-[10px] text-gray-600">
            {pagination ? `${pagination.total} records | Page ${pagination.page}/${pagination.totalPages}` : 'Ready'}
          </span>
          <span className="font-code text-[10px] text-gray-600">CRON: 08:00/20:00 KST</span>
        </div>
      </div>
    </div>
  );
};

// Detail sub-component
const DetailView: React.FC<{ update: GameUpdate }> = ({ update }) => {
  const dateStr = update.published_at
    ? new Date(update.published_at).toLocaleString('ko-KR')
    : '날짜 없음';

  const sourceLabel = update.source === 'nexon' ? '넥슨 공식' : '디시인사이드';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-black border-2 border-acid-green p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`${update.source === 'nexon' ? 'bg-blue-600' : 'bg-orange-600'} text-white font-pixel text-[10px] px-2 py-0.5`}>
            {sourceLabel}
          </span>
          <span className="text-gray-500 font-code text-xs">{dateStr}</span>
          {update.author && <span className="text-gray-400 font-code text-xs">by {update.author}</span>}
        </div>
        <h2 className="font-code text-acid-green text-lg font-bold">{update.title}</h2>
        {update.url && (
          <a href={update.url} target="_blank" rel="noopener noreferrer" className="text-acid-cyan font-code text-xs hover:underline mt-1 block">
            [원문 보기]
          </a>
        )}
      </div>

      {/* AI Analysis */}
      {update.analysis && (
        <div className="bg-black border-2 border-acid-pink p-4">
          <h3 className="font-pixel text-acid-pink text-xs mb-3 border-b border-acid-pink/30 pb-2">AI_ANALYSIS</h3>

          <div className="space-y-3">
            <div>
              <span className="font-pixel text-[10px] text-gray-500">SUMMARY:</span>
              <p className="font-code text-white text-sm mt-1">{update.analysis.summary}</p>
            </div>

            <div className="flex gap-4">
              <div>
                <span className="font-pixel text-[10px] text-gray-500">SENTIMENT:</span>
                <span className={`ml-2 font-pixel text-xs ${
                  update.analysis.sentiment === 'positive' ? 'text-acid-green' :
                  update.analysis.sentiment === 'negative' ? 'text-red-400' :
                  update.analysis.sentiment === 'mixed' ? 'text-yellow-400' : 'text-gray-400'
                }`}>
                  [{update.analysis.sentiment.toUpperCase()}]
                </span>
              </div>
            </div>

            {update.analysis.key_changes.length > 0 && (
              <div>
                <span className="font-pixel text-[10px] text-gray-500">KEY_CHANGES:</span>
                <ul className="mt-1 space-y-1">
                  {update.analysis.key_changes.map((change, i) => (
                    <li key={i} className="font-code text-acid-green text-xs flex items-start gap-2">
                      <span className="text-acid-pink shrink-0">&gt;</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {update.analysis.community_reaction && (
              <div>
                <span className="font-pixel text-[10px] text-gray-500">COMMUNITY_REACTION:</span>
                <p className="font-code text-yellow-300 text-xs mt-1">{update.analysis.community_reaction}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Raw Content */}
      <div className="bg-black border-2 border-gray-600 p-4">
        <h3 className="font-pixel text-gray-400 text-xs mb-3 border-b border-gray-700 pb-2">RAW_CONTENT</h3>
        <div
          className="font-code text-gray-300 text-xs leading-relaxed prose prose-invert prose-xs max-w-none"
          dangerouslySetInnerHTML={{ __html: marked.parse(update.content.slice(0, 5000)) as string }}
        />
      </div>
    </div>
  );
};
