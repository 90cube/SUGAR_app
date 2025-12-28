
import React, { useState, useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { communityService } from '../services/communityService';
import { CommunityPost, BoardType } from '../types';

export const CommunityPanel: React.FC = () => {
  const { 
    isCommunityOpen, 
    closeCommunity, 
    isLoggedIn,
    authUser
  } = useApp();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [updatePost, setUpdatePost] = useState<CommunityPost | null>(null);
  const [activeBoard, setActiveBoard] = useState<Exclude<BoardType, 'update' | 'hidden' | 'TEMP'>>('balance');
  const [isLoading, setIsLoading] = useState(false);
  const [isWriteMode, setIsWriteMode] = useState(false);
  
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  useEffect(() => {
    if (isCommunityOpen) {
      loadInitialData();
    }
  }, [isCommunityOpen, activeBoard]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // 1. UPDATE 게시판에서 최신글 1개를 가져와 Main_Update_Stream에 표시
      const updates = await communityService.getPosts('update');
      if (updates.length > 0) {
        setUpdatePost(updates[0]);
      } else {
        setUpdatePost(null);
      }

      // 2. 현재 선택된 탭 리스트 데이터 로드
      const list = await communityService.getPosts(activeBoard);
      setPosts(list);
    } catch (e) {
      console.error("[CommunityPanel] Data Fetch Failed:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWriteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      setIsLoading(true);
      const success = await communityService.createPost({
        boardType: activeBoard,
        title: newTitle,
        content: newContent
      });
      if (success) {
        setNewTitle('');
        setNewContent('');
        setIsWriteMode(false);
        await loadInitialData();
      }
    } catch (err: any) {
      alert("데이터 기록 실패: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isCommunityOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[150] flex justify-center items-center bg-slate-950/60 backdrop-blur-md p-4 font-mono animate-in fade-in duration-300"
      onClick={closeCommunity}
    >
      <div 
        className="w-full max-w-xl bg-slate-50 h-[85vh] shadow-2xl flex flex-col rounded-[2.5rem] overflow-hidden border border-white/20 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-slate-950 text-white flex items-center justify-between border-b border-cyan-500/20">
          <div>
            <h2 className="text-xl font-black italic tracking-tighter uppercase">Lab_Archive</h2>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
              <p className="text-[9px] text-cyan-400 font-bold uppercase tracking-[0.3em]">Database_Sync_Active</p>
            </div>
          </div>
          <button onClick={closeCommunity} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain bg-slate-50 scrollbar-hide">
          {/* 1. MAIN UPDATE STREAM (16:9) */}
          <section className="p-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="text-cyan-500">▶</span> Main_Update_Stream
            </h3>
            <div className="relative aspect-video w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
              {updatePost?.imageUrl || updatePost?.thumbnailUrl ? (
                <img 
                  src={updatePost.imageUrl || updatePost.thumbnailUrl} 
                  className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-1000" 
                  alt="update_visual" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
                   <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                   <span className="text-cyan-500/20 text-[50px] font-black italic select-none">SYSTEM_UPDATE</span>
                </div>
              )}
              {/* Overlay Content */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent p-6 flex flex-col justify-end">
                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-1">
                  {updatePost ? `TS_${updatePost.createdAt.split('T')[0]}` : 'LOG_PENDING'}
                </span>
                <h4 className="text-white text-lg font-black uppercase italic line-clamp-2 leading-tight">
                  {updatePost?.title || '수신된 최신 업데이트 데이터가 없습니다.'}
                </h4>
              </div>
            </div>
          </section>

          {/* 2. TAB SYSTEM */}
          <section className="px-6 sticky top-0 bg-slate-50 z-20 pt-2 pb-4">
            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm gap-1">
              {(['balance', 'fun', 'stream'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveBoard(tab); setIsWriteMode(false); }}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                    activeBoard === tab 
                      ? 'bg-slate-950 text-cyan-400 shadow-lg' 
                      : 'text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </section>

          {/* 3. LIST OR FORM */}
          <div className="px-6 pb-24 min-h-[300px]">
            {isWriteMode ? (
              <form onSubmit={handleWriteSubmit} className="bg-white p-6 rounded-[2.5rem] border border-cyan-500/20 shadow-xl animate-in zoom-in-95 duration-300">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping"></div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">New_Log: {activeBoard.toUpperCase()}</h3>
                </div>
                <div className="space-y-4">
                  <input 
                    type="text" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="로그 제목 (TITLE)" 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-cyan-500/20 outline-none"
                    required
                  />
                  <textarea 
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="데이터 본문 (CONTENT)" 
                    rows={6}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-cyan-500/20 outline-none resize-none"
                    required
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={isLoading} className="flex-1 py-4 bg-cyan-500 text-slate-950 font-black text-[10px] rounded-xl uppercase tracking-widest shadow-lg active:scale-95 transition-transform">Execute_Save</button>
                    <button type="button" onClick={() => setIsWriteMode(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black text-[10px] rounded-xl uppercase tracking-widest hover:bg-slate-200 transition-colors">Abort</button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-cyan-500 rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest animate-pulse">Syncing_with_Remote_Server...</span>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center gap-2">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Entry_Not_Found</span>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Database is currently empty in this sector.</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <div 
                      key={post.id} 
                      className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-cyan-200 hover:shadow-md transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex flex-col min-w-0 pr-4">
                        <span className="text-[8px] font-black text-slate-400 mb-1 uppercase tracking-tighter">LOG_{post.createdAt.split('T')[0]}</span>
                        <h4 className="text-xs font-black text-slate-900 group-hover:text-cyan-600 transition-colors uppercase italic truncate">{post.title}</h4>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                         <div className="text-right">
                           <div className="text-[8px] font-black text-slate-300 uppercase">Analysis</div>
                           <div className="text-[10px] font-black text-slate-900">H_{post.halfshots}</div>
                         </div>
                         <div className="w-8 h-8 bg-slate-950 rounded-full flex items-center justify-center text-[10px] font-black text-white italic border border-white/10 group-hover:border-cyan-500/50 transition-colors">
                           {post.author[0]?.toUpperCase() || 'S'}
                         </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* 4. FIXED ACTION BUTTON */}
        {!isWriteMode && isLoggedIn && (
          <div className="absolute bottom-6 left-6 right-6 p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-2xl z-30">
            <button 
              onClick={() => setIsWriteMode(true)}
              className="w-full py-4 bg-slate-950 text-cyan-400 font-black text-[11px] rounded-xl shadow-xl hover:bg-black transition-all uppercase tracking-[0.2em] border border-cyan-500/20 flex items-center justify-center gap-2 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
              [ NEW_ENTRY_RECORD ]
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
