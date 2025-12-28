
import React, { useState, useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { communityService } from '../services/communityService';
import { CommunityPost, BoardType } from '../types';

/**
 * CommunityPanel: 공용 보관함 시스템 인터페이스입니다.
 * 아카이브된 게시글을 열람하고 필터링할 수 있는 사이드 패널입니다.
 */
export const CommunityPanel: React.FC = () => {
  const { 
    isCommunityOpen, 
    closeCommunity, 
    isLoggedIn,
    authUser,
    openCommunityUserProfile
  } = useApp();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [activeBoard, setActiveBoard] = useState<BoardType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);

  // 패널 활성화 상태나 선택된 보드 타입이 변경될 때 데이터를 갱신합니다.
  useEffect(() => {
    if (isCommunityOpen) {
      loadPosts();
    }
  }, [isCommunityOpen, activeBoard, authUser?.id]);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const board = activeBoard === 'all' ? undefined : activeBoard;
      const data = await communityService.getPosts(board, authUser?.id);
      setPosts(data);
    } catch (error) {
      console.error("[CommunityPanel] Data Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isCommunityOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[150] flex justify-end bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={closeCommunity}
    >
      <div 
        className="w-full max-w-md bg-slate-50 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Lab Header */}
        <div className="p-6 bg-slate-950 text-white flex items-center justify-between shadow-lg">
          <div>
            <h2 className="text-xl font-black italic tracking-tighter uppercase">Community_Archive</h2>
            <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Protocol: Shared_Data_Access</p>
          </div>
          <button 
            onClick={closeCommunity} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
            aria-label="Close Panel"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white overflow-x-auto no-scrollbar scroll-smooth">
          {(['all', 'update', 'balance', 'fun', 'stream'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveBoard(tab)}
              className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2 ${
                activeBoard === tab 
                  ? 'text-cyan-600 border-cyan-600 bg-cyan-50/50' 
                  : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Data Stream Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-cyan-500 rounded-full animate-spin"></div>
              <p className="text-[10px] text-slate-400 font-black animate-pulse uppercase tracking-[0.2em]">Fetching_Remote_Entries...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-100/30">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No records found in this segment</p>
            </div>
          ) : (
            posts.map((post) => (
              <div 
                key={post.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-default"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] font-black text-cyan-600 uppercase tracking-[0.2em]">{post.boardType}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">TS_{post.createdAt.split('T')[0]}</span>
                </div>
                <h3 className="text-sm font-black text-slate-900 group-hover:text-cyan-600 transition-colors line-clamp-2 uppercase italic mb-3">
                  {post.title}
                </h3>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                  <button 
                    onClick={() => openCommunityUserProfile(post.author, post.authorId)}
                    className="flex items-center gap-2 group/author active:scale-95 transition-transform"
                  >
                    <div className="w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center text-[9px] font-black text-white italic border border-white/20 group-hover/author:bg-cyan-600 transition-colors">
                      {post.author[0].toUpperCase()}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 group-hover/author:text-slate-900 transition-colors">{post.author}</span>
                  </button>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5" title="Heads (Votes)">
                      <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>
                      <span className="text-[10px] font-black text-slate-900">{post.heads}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Comments">
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                      <span className="text-[10px] font-black text-slate-900">{post.commentCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Global Action Terminal */}
        {isLoggedIn && (
          <div className="p-6 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
            <button className="w-full py-4 bg-slate-900 text-cyan-400 font-black text-[11px] rounded-2xl shadow-xl hover:bg-black active:scale-[0.98] transition-all uppercase tracking-[0.2em] border border-cyan-500/20">
              New_Entry_Protocol
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
