
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../state/AppContext';
import { communityService } from '../services/communityService';
import { geminiService } from '../services/geminiService';
import { CommunityPost, BoardType } from '../types';

export const CommunityPanel: React.FC = () => {
  const { 
    isCommunityOpen, 
    closeCommunity, 
    isLoggedIn,
    refreshAuthUser,
    authUser
  } = useApp();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [updatePost, setUpdatePost] = useState<CommunityPost | null>(null);
  const [activeBoard, setActiveBoard] = useState<Exclude<BoardType, 'hidden' | 'temp'>>('update');
  const [isLoading, setIsLoading] = useState(false);
  const [isWriteMode, setIsWriteMode] = useState(false);
  
  // Post States
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Summarize States
  const [aiSource, setAiSource] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);

  useEffect(() => {
    if (isCommunityOpen) {
      loadEssentialData();
    }
  }, [isCommunityOpen, activeBoard]);

  const loadEssentialData = async () => {
    setIsLoading(true);
    try {
      // 1. UPDATE 게시판 최신 항목 (프리뷰용)
      const updates = await communityService.getPosts('update');
      if (updates.length > 0) setUpdatePost(updates[0]);
      else setUpdatePost(null);

      // 2. 현재 활성화된 탭 리스트 (대소문자 구분 없이 정확한 문자열 매칭)
      const list = await communityService.getPosts(activeBoard);
      setPosts(list);
    } catch (e) {
      console.error("[CommunityPanel] Load Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAISummarize = async () => {
    if (!aiSource.trim()) {
      alert("요약할 공지사항 원문을 입력해주세요.");
      return;
    }
    
    setIsAiLoading(true);
    try {
      const masterPrompt = `
        당신은 서든어택 연구소 Su-Lab의 관리자 AI "CUBE"입니다.
        제공된 공지사항 원문을 분석하여 핵심 업데이트 사항을 요약하십시오.
        본문은 마크다운 형식을 사용하고, 가독성 있게 리스트와 표를 활용하십시오.
      `;
      
      const result = await geminiService.summarizeGameUpdate(aiSource, masterPrompt, false);
      
      setNewTitle(result.title);
      setNewContent(result.content);
      setShowAiInput(false);
      setAiSource('');
    } catch (err: any) {
      alert("AI 분석 실패: " + err.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 512 * 1024) {
        alert("최대 512KB까지 업로드 가능합니다.");
        e.target.value = '';
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleWriteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      let imageUrl = '';
      if (selectedFile) {
        const uploadedUrl = await communityService.uploadImage(selectedFile, activeBoard);
        if (uploadedUrl) imageUrl = uploadedUrl;
      }

      const success = await communityService.createPost({
        boardType: activeBoard,
        title: newTitle,
        content: newContent,
        imageUrl
      });

      if (success) {
        setNewTitle('');
        setNewContent('');
        setSelectedFile(null);
        setIsWriteMode(false);
        await refreshAuthUser();
        await loadEssentialData();
      }
    } catch (err: any) {
      alert("포스팅 저장 실패: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const tabLabels: Record<string, string> = {
    update: '업데이트',
    balance: '밸런스',
    kukkuk: '전략/정보',
    streaming: '스트리밍'
  };

  if (!isCommunityOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[150] flex justify-center items-center bg-slate-950/70 backdrop-blur-md p-4 font-mono animate-in fade-in duration-300"
      onClick={closeCommunity}
    >
      <div 
        className="w-full max-w-xl bg-slate-50 h-[85vh] shadow-2xl flex flex-col rounded-[2.5rem] overflow-hidden border border-white/20 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-slate-950 text-white flex items-center justify-between border-b border-cyan-500/20">
          <div className="flex flex-col">
            <h2 className="text-xl font-black italic tracking-tighter uppercase">Lab_Archive</h2>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
              <p className="text-[9px] text-cyan-400 font-bold uppercase tracking-[0.3em]">Querying_Database</p>
            </div>
          </div>
          <button onClick={closeCommunity} className="p-2 hover:bg-white/10 rounded-full transition-all text-slate-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain bg-slate-50 scrollbar-hide">
          {/* 1. CENTRAL UPDATE STREAM - Always show the latest for the preview */}
          <section className="p-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="text-cyan-500">▶</span> Critical_Update_Preview
            </h3>
            <div className="relative aspect-video w-full bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 group">
              {updatePost?.imageUrl ? (
                <img src={updatePost.imageUrl} className="w-full h-full object-cover opacity-80" alt="update" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
                   <span className="text-cyan-500/20 text-[32px] font-black italic select-none uppercase tracking-tighter">Lab_Access_Ready</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 p-8 flex flex-col justify-end">
                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">
                  {updatePost ? `SYNC_${updatePost.createdAt.split('T')[0]}` : 'SEARCHING...'}
                </span>
                <h4 className="text-white text-lg font-black uppercase italic truncate">
                  {updatePost?.title || '수신된 최신 데이터가 없습니다.'}
                </h4>
              </div>
            </div>
          </section>

          {/* 2. TABS */}
          <section className="px-6 sticky top-0 bg-slate-50 z-20 pt-2 pb-4">
            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm gap-1 overflow-x-auto scrollbar-hide">
              {(['update', 'balance', 'kukkuk', 'streaming'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveBoard(tab); setIsWriteMode(false); }}
                  className={`flex-1 min-w-[80px] py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                    activeBoard === tab ? 'bg-slate-950 text-cyan-400 shadow-lg' : 'text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {tabLabels[tab]}
                </button>
              ))}
            </div>
          </section>

          {/* 3. FEED / WRITE MODE */}
          <div className="px-6 pb-32 min-h-[300px]">
            {isWriteMode ? (
              <form onSubmit={handleWriteSubmit} className="bg-white p-6 rounded-[2.5rem] border border-cyan-500/20 shadow-2xl animate-in zoom-in-95 duration-300 space-y-4">
                
                {/* AI Summary Tool Integration */}
                <div className="bg-slate-950 rounded-2xl p-4 border border-cyan-500/20 shadow-inner overflow-hidden">
                    <button 
                        type="button"
                        onClick={() => setShowAiInput(!showAiInput)}
                        className="w-full flex items-center justify-between text-[10px] font-black text-cyan-400 uppercase tracking-widest"
                    >
                        <span>[ ✨ AI_Summarize_Assistant_Cube ]</span>
                        <span>{showAiInput ? 'CLOSE' : 'OPEN'}</span>
                    </button>
                    {showAiInput && (
                        <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
                            <textarea 
                                value={aiSource}
                                onChange={(e) => setAiSource(e.target.value)}
                                placeholder="공식 공지사항 전문을 붙여넣으세요..."
                                className="w-full p-4 bg-black/40 border border-white/5 rounded-xl text-[10px] font-bold text-slate-300 outline-none resize-none h-32 scrollbar-hide"
                            />
                            <button 
                                type="button"
                                onClick={handleAISummarize}
                                disabled={isAiLoading}
                                className="w-full py-3 bg-cyan-500 text-slate-950 font-black text-[9px] rounded-lg uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-cyan-400 transition-colors disabled:opacity-50"
                            >
                                {isAiLoading ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"></div>
                                        Processing_Data...
                                    </>
                                ) : "Run_Gemini_Analysis"}
                            </button>
                        </div>
                    )}
                </div>

                <input 
                  type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="제목을 입력하세요 (Subject_Title)" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-500/20" required
                />
                <textarea 
                  value={newContent} onChange={(e) => setNewContent(e.target.value)}
                  placeholder="내용을 입력하세요 (Data_Logs_Content...)" rows={5} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none resize-none focus:ring-2 focus:ring-cyan-500/20" required
                />
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                     Visual_Evidence <span className="text-[8px] opacity-60">(Max 512KB)</span>
                  </label>
                  <input 
                    type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                    ref={fileInputRef} onChange={handleFileChange}
                    className="hidden"
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-cyan-300 transition-all group"
                  >
                    {selectedFile ? (
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-black text-cyan-600 truncate max-w-[200px]">{selectedFile.name}</span>
                         <span className="text-[8px] text-slate-400">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                         <svg className="w-6 h-6 text-slate-300 group-hover:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                         <span className="text-[9px] font-bold text-slate-400">Attach_Visual_Evidence</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={isLoading} className="flex-1 py-4 bg-cyan-500 text-slate-950 font-black text-[10px] rounded-xl uppercase tracking-widest shadow-lg active:scale-95 transition-all">Store_Archive</button>
                  <button type="button" onClick={() => { setIsWriteMode(false); setSelectedFile(null); }} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black text-[10px] rounded-xl uppercase tracking-widest">Abort</button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-cyan-500 rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black text-slate-300 uppercase animate-pulse tracking-widest">Syncing_Nodes...</span>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-[2.5rem]">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sector_Empty</span>
                  </div>
                ) : (
                  posts.map((post) => (
                    <div key={post.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-cyan-200 hover:shadow-xl transition-all flex items-center justify-between group cursor-pointer active:scale-[0.98]">
                      <div className="flex flex-col min-w-0 pr-4">
                        <span className="text-[8px] font-black text-slate-400 mb-1 uppercase tracking-tighter">REF_{post.id.substring(0,8)} | {post.createdAt.split('T')[0]}</span>
                        <h4 className="text-xs font-black text-slate-900 group-hover:text-cyan-600 truncate uppercase italic">{post.title}</h4>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                         <div className="text-right">
                           <div className="text-[8px] font-black text-slate-300 uppercase leading-none">Buffers</div>
                           <div className="text-[12px] font-black text-slate-900 italic">#{post.commentCount}</div>
                         </div>
                         <div className="w-10 h-10 bg-slate-950 rounded-2xl flex items-center justify-center text-[11px] font-black text-white italic border border-white/10 group-hover:border-cyan-500 transition-all shadow-lg">
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

        {/* FAB - Only shown when logged in */}
        {!isWriteMode && isLoggedIn && (
          <div className="absolute bottom-8 left-8 right-8">
            <button 
              onClick={() => setIsWriteMode(true)}
              className="w-full py-4 bg-slate-950 text-cyan-400 font-black text-[11px] rounded-2xl shadow-2xl border border-cyan-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all uppercase tracking-[0.2em]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
              [ NEW_ARCHIVE_ENTRY ]
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
