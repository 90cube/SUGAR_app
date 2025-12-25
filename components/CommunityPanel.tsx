
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../state/AppContext';
import { communityService } from '../services/communityService';
import { geminiService } from '../services/geminiService';
import { CommunityPost, BoardType } from '../types';

type TabType = 'balance' | 'keuk' | 'stream';

const DEFAULT_MASTER_PROMPT = `
당신은 서든어택 커뮤니티 'SUGAR'의 운영자입니다.
제공된 '서든어택 업데이트 공지사항' 원문을 바탕으로, 유저들이 읽기 쉬운 요약본을 작성해야 합니다.

**작성 가이드라인:**
1. **HTML 포맷 사용**: <h3>, <ul>, <li>, <p>, <strong> 태그만 사용하여 구조화하세요. (div, style 금지)
2. **핵심 요약**: 불필요한 인삿말을 제거하고, [주요 업데이트 / 변경 사항 / 이벤트] 위주로 요약하세요.
3. **톤앤매너**: 서든어택 유저들이 좋아하는 간결하고 명확한 말투 ("~습니다", "~함")를 사용하세요.
4. **강조**: 중요한 아이템 명, 맵 이름, 날짜는 <strong> 태그로 강조하세요.
5. **이모지 활용**: 각 섹션 제목에 적절한 이모지를 사용하세요. (예: 🔫 무기, 🗺️ 맵, 🎉 이벤트)
`.trim();

export const CommunityPanel: React.FC = () => {
  const { isCommunityOpen, closeCommunity, isLoggedIn, openAuthModal, logout, userProfile, openVirtualMatchingModal, isAdminUser, openCommunityUserProfile, authUser } = useApp();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<TabType>('balance');
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

  // Data State
  const [updatePosts, setUpdatePosts] = useState<CommunityPost[]>([]);
  const [tabPosts, setTabPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // View State for Updates
  const [isUpdatesExpanded, setIsUpdatesExpanded] = useState(false);

  // Admin Menu State
  const [openAdminMenuId, setOpenAdminMenuId] = useState<string | null>(null);

  // Write Form States
  const [isWriteFormOpen, setIsWriteFormOpen] = useState(false);
  const [writeTitle, setWriteTitle] = useState('');
  const [writeContent, setWriteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);

  // Update (Notice) Write Form State - Admin Only
  const [isUpdateWriteFormOpen, setIsUpdateWriteFormOpen] = useState(false);
  const [rawUpdateText, setRawUpdateText] = useState('');
  const [masterPrompt, setMasterPrompt] = useState(DEFAULT_MASTER_PROMPT);
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateContent, setUpdateContent] = useState('');
  const [updateThumbnail, setUpdateThumbnail] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Scroll State
  const [showBottomCTA, setShowBottomCTA] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const currentScroll = scrollContainerRef.current.scrollTop;
        if (currentScroll < 20) setShowBottomCTA(true);
        else if (currentScroll > lastScrollTopRef.current) setShowBottomCTA(false);
        else setShowBottomCTA(true);
        lastScrollTopRef.current = currentScroll;
    };
    const container = scrollContainerRef.current;
    if (container) container.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, [isCommunityOpen]);

  useEffect(() => {
    if (isCommunityOpen) {
        communityService.getPosts('update').then(setUpdatePosts);
        fetchTabContent(activeTab);
    }
  }, [isCommunityOpen]);

  useEffect(() => {
    if (isCommunityOpen) fetchTabContent(activeTab);
  }, [activeTab]);

  useEffect(() => {
      if (isUpdateWriteFormOpen) communityService.checkConnection().then(setDbConnected);
  }, [isUpdateWriteFormOpen]);

  const fetchTabContent = (tab: TabType) => {
    setIsLoading(true);
    let queryType: BoardType = 'balance';
    if (tab === 'keuk') queryType = 'fun';
    if (tab === 'stream') queryType = 'stream';

    communityService.getPosts(queryType).then(data => {
        setTabPosts(data);
        setIsLoading(false);
    });
  };

  const handleAdminAction = async (e: React.MouseEvent, postId: string, action: 'hide' | 'delete') => {
      e.stopPropagation();
      setOpenAdminMenuId(null);

      if (action === 'delete') {
          if (!window.confirm("이 게시글을 영구 삭제하시겠습니까?")) return;
          const success = await communityService.deletePost(postId);
          if (success) {
              setTabPosts(prev => prev.filter(p => p.id !== postId));
              setUpdatePosts(prev => prev.filter(p => p.id !== postId));
              if (selectedPost?.id === postId) setSelectedPost(null);
          }
      } else {
          const success = await communityService.updatePostStatus(postId, 'HIDDEN');
          if (success) {
              setTabPosts(prev => prev.filter(p => p.id !== postId));
              setUpdatePosts(prev => prev.filter(p => p.id !== postId));
              if (selectedPost?.id === postId) setSelectedPost(null);
          }
      }
  };

  const handleAiGenerateUpdate = async () => {
      if (!rawUpdateText.trim()) return;
      setIsAiGenerating(true);
      try {
          const result = await geminiService.summarizeGameUpdate(rawUpdateText, masterPrompt);
          setUpdateTitle(result.title);
          setUpdateContent(result.content);
      } catch (e) {
          setUpdateError("AI 요약 중 오류 발생");
      } finally {
          setIsAiGenerating(false);
      }
  };

  const submitUpdatePost = async (e: React.FormEvent) => {
      e.preventDefault();
      const authorName = userProfile?.nickname || authUser?.name;
      if (!isAdminUser || !authorName) return;
      setIsSubmittingUpdate(true);
      const success = await communityService.createPost({
          title: updateTitle, content: updateContent, author: authorName, boardType: 'update', thumbnail: updateThumbnail
      });
      if (success) {
        setIsUpdateWriteFormOpen(false);
        communityService.getPosts('update').then(setUpdatePosts);
      }
      setIsSubmittingUpdate(false);
  };

  const submitPost = async (e: React.FormEvent) => {
      e.preventDefault();
      const authorName = userProfile?.nickname || authUser?.name;
      if (!authorName) return;
      setIsSubmitting(true);
      let boardType: BoardType = activeTab === 'keuk' ? 'fun' : 'balance';
      const success = await communityService.createPost({ title: writeTitle, content: writeContent, author: authorName, boardType });
      if (success) {
          fetchTabContent(activeTab);
          setIsWriteFormOpen(false);
          setWriteTitle(''); setWriteContent('');
      }
      setIsSubmitting(false);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${Math.floor(diffHours / 24)}일 전`;
  };

  const HeadshotCounter = ({ count, type }: { count: number, type: 'head' | 'half' }) => {
     const isHead = type === 'head';
     return (
         <div className={`flex items-center gap-1 text-[10px] font-bold ${isHead ? 'text-orange-600 bg-orange-50' : 'text-slate-500 bg-slate-100'} px-1.5 py-0.5 rounded`}>
             {isHead ? '🎯 헤드' : '🛡️ 반샷'}
             <span>{count > 999 ? (count/1000).toFixed(1)+'k' : count}</span>
         </div>
     );
  };

  // --- Sub-Components ---
  
  const AdminPostMenu = ({ postId }: { postId: string }) => {
      if (!isAdminUser) return null;
      const isOpen = openAdminMenuId === postId;

      return (
          <div className="relative">
              <button 
                  onClick={(e) => { e.stopPropagation(); setOpenAdminMenuId(isOpen ? null : postId); }}
                  className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${isOpen ? 'bg-slate-900 text-white shadow-lg' : 'bg-white/80 backdrop-blur-md text-slate-400 hover:text-slate-900 border border-slate-200'}`}
              >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
              </button>
              
              {isOpen && (
                  <div className="absolute right-0 mt-2 w-32 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl z-[300] overflow-hidden animate-in zoom-in-95 duration-200 ring-4 ring-black/5">
                      <button 
                        onClick={(e) => handleAdminAction(e, postId, 'hide')}
                        className="w-full px-4 py-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-100 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88(9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                        임시조치
                      </button>
                      <button 
                        onClick={(e) => handleAdminAction(e, postId, 'delete')}
                        className="w-full px-4 py-3 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        삭제
                      </button>
                  </div>
              )}
          </div>
      );
  };

  const DetailView = () => {
    const [heads, setHeads] = useState(0);
    const [halfs, setHalfs] = useState(0);
    const [myVote, setMyVote] = useState<'head' | 'half' | null>(null);

    useEffect(() => {
        if (selectedPost) {
            setHeads(selectedPost.heads);
            setHalfs(selectedPost.halfshots);
            const viewerName = userProfile?.nickname || authUser?.name || 'Unknown';
            communityService.getUserVote(selectedPost.id, viewerName).then(setMyVote);
        }
    }, [selectedPost]);

    if (!selectedPost) return null;

    return (
      <div className="absolute inset-0 bg-white z-[170] flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex-shrink-0 h-16 bg-white/90 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-50">
           <button onClick={() => setSelectedPost(null)} className="w-10 h-10 flex items-center justify-center -ml-2 text-slate-600 hover:text-slate-900 active:scale-90 transition-transform"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
           <h3 className="text-sm font-black text-slate-800 truncate max-w-[180px]">{selectedPost.title}</h3>
           <div className="flex items-center gap-2">
               {isAdminUser && <AdminPostMenu postId={selectedPost.id} />}
           </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain pb-24">
           {selectedPost.thumbnail && selectedPost.thumbnail !== 'stream_pending' && (
              <div className="w-full aspect-video bg-slate-100 overflow-hidden relative border-b border-slate-100"><img src={selectedPost.thumbnail} alt="" className="w-full h-full object-cover" /></div>
           )}
           <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5" onClick={() => openCommunityUserProfile(selectedPost.author)}>
                      <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-xs font-black text-white cursor-pointer shadow-md">{selectedPost.author[0].toUpperCase()}</div>
                      <div className="flex flex-col cursor-pointer"><span className="text-sm font-black text-slate-900 hover:underline decoration-2 underline-offset-2">{selectedPost.author}</span><span className="text-[10px] text-slate-400 font-bold uppercase">{selectedPost.createdAt.split('T')[0]}</span></div>
                  </div>
                  <HeadshotCounter count={heads} type="head" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 mb-6 leading-[1.2] tracking-tight">{selectedPost.title}</h1>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed font-medium"><div dangerouslySetInnerHTML={{ __html: selectedPost.content }} /></div>
           </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white/80 backdrop-blur-xl sticky bottom-0 z-10 flex justify-end items-center gap-2">
             <button onClick={() => { if(!isLoggedIn) openAuthModal(); else communityService.toggleVote(selectedPost.id, userProfile?.nickname || authUser?.name!, 'head').then(r => {setHeads(r.heads); setHalfs(r.halfshots); setMyVote(r.userVote);}); }} className={`flex items-center gap-2 px-5 py-3 font-black text-xs rounded-2xl border transition-all active:scale-95 ${myVote === 'head' ? 'bg-orange-100 border-orange-200 text-orange-700 shadow-inner' : 'bg-orange-50 border-orange-100 text-orange-600 hover:bg-orange-100'}`}><span>🎯 헤드샷</span><span className="bg-white/60 px-2 py-0.5 rounded-lg text-[10px]">{heads}</span></button>
             <button onClick={() => { if(!isLoggedIn) openAuthModal(); else communityService.toggleVote(selectedPost.id, userProfile?.nickname || authUser?.name!, 'half').then(r => {setHeads(r.heads); setHalfs(r.halfshots); setMyVote(r.userVote);}); }} className={`flex items-center gap-2 px-5 py-3 font-black text-xs rounded-2xl border transition-all active:scale-95 ${myVote === 'half' ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'}`}><span>🛡️ 반샷</span><span className={`${myVote === 'half' ? 'bg-white/20' : 'bg-white/60'} px-2 py-0.5 rounded-lg text-[10px] font-bold`}>{halfs}</span></button>
        </div>
      </div>
    );
  };

  const displayedUpdates = isUpdatesExpanded ? updatePosts : updatePosts.slice(0, 1);

  return (
    <>
      <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] transition-opacity duration-500 ${isCommunityOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={closeCommunity} />

      <div className={`fixed inset-0 z-[160] flex flex-col bg-slate-50/95 transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isCommunityOpen ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex-shrink-0 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 shadow-sm z-30 relative">
           <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2"><span className="text-yellow-500 text-2xl">●</span> 커뮤니티 (COMMUNITY)</h2>
           <div className="flex items-center gap-2">
             {isLoggedIn ? <button onClick={logout} className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-full border border-red-200">로그아웃</button> : <button onClick={openAuthModal} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">로그인</button>}
             <button onClick={closeCommunity} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-500"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
           </div>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overscroll-contain p-5 pb-32 space-y-6">
           <section>
              <div className="flex items-center justify-between mb-3 px-1">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">공지사항 (Updates)</h3>
                 <div className="flex items-center gap-2">
                     {isAdminUser && <button onClick={() => setIsUpdateWriteFormOpen(true)} className="w-7 h-7 flex items-center justify-center bg-blue-600 text-white rounded-full shadow-lg active:scale-90 transition-transform"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></button>}
                     <button onClick={() => setIsUpdatesExpanded(!isUpdatesExpanded)} className="text-[10px] font-black bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg active:bg-slate-300 transition-colors uppercase tracking-wider">{isUpdatesExpanded ? '접기' : '모두보기'}</button>
                 </div>
              </div>
              
              <div className="space-y-3">
                {updatePosts.length > 0 ? (
                    displayedUpdates.map(post => (
                        <div key={post.id} onClick={() => setSelectedPost(post)} className="w-full flex flex-col bg-white rounded-2xl overflow-hidden shadow-md border border-slate-200 group relative animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {isAdminUser && <div className="absolute top-3 right-3 z-20"><AdminPostMenu postId={post.id} /></div>}
                            {post.thumbnail && <div className="w-full aspect-video bg-slate-200 overflow-hidden"><img src={post.thumbnail} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /></div>}
                            <div className="p-5">
                                <h4 className="font-black text-slate-900 text-lg mb-1 leading-tight">{post.title}</h4>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{post.createdAt.split('T')[0]}</div>
                            </div>
                        </div>
                    ))
                ) : <div className="p-8 bg-slate-100 rounded-2xl text-center text-xs font-bold text-slate-400 border-2 border-dashed border-slate-200">공지가 없습니다.</div>}
              </div>
           </section>

           <div className="sticky top-0 z-20 py-2 bg-slate-50/95 backdrop-blur-sm -mx-1 px-1">
             <div className="flex p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm items-center">
                {(['balance', 'keuk', 'stream'] as const).map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:bg-slate-50'}`}>{tab === 'balance' ? '밸런스 토론' : tab === 'keuk' ? '큭큭(유머)' : '방송 홍보'}</button>
                ))}
             </div>
             <div className="mt-3 text-right px-1"><button onClick={() => { if(!isLoggedIn) openAuthModal(); else setIsWriteFormOpen(true); }} className="text-xs font-black bg-blue-600 text-white px-5 py-2.5 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 ml-auto">글쓰기</button></div>
           </div>

           <div className="space-y-3 min-h-[300px]">
              {isLoading ? [1,2,3].map(i => <div key={i} className="h-28 bg-white border border-slate-100 rounded-2xl animate-pulse"/>) : (
                  tabPosts.map(post => (
                      <div key={post.id} onClick={() => setSelectedPost(post)} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative group hover:border-slate-300 transition-colors active:scale-[0.99]">
                          {isAdminUser && <div className="absolute top-4 right-4 z-20"><AdminPostMenu postId={post.id} /></div>}
                          <div className="flex justify-between items-start mb-3 pr-10">
                              <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider ${activeTab === 'keuk' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{activeTab === 'keuk' ? '유머' : '토론'}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{formatTime(post.createdAt)}</span>
                          </div>
                          <h4 className="font-black text-slate-800 text-base mb-2 leading-snug">{post.title}</h4>
                          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400"><span onClick={(e) => { e.stopPropagation(); openCommunityUserProfile(post.author); }} className="hover:text-slate-900 cursor-pointer underline decoration-slate-200 underline-offset-4">{post.author}</span><span>•</span><span>조회 {post.views}</span></div>
                              <div className="flex gap-2.5"><HeadshotCounter count={post.heads} type="head" /><HeadshotCounter count={post.halfshots} type="half" /></div>
                          </div>
                      </div>
                  ))
              )}
           </div>
        </div>

        {isLoggedIn && showBottomCTA && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-5"><button onClick={openVirtualMatchingModal} className="px-8 py-3 bg-gradient-to-r from-blue-700 to-indigo-700 text-white text-sm font-black rounded-2xl shadow-2xl active:scale-95 transition-transform ring-4 ring-white/10">가상 매칭 분석</button></div>
        )}

        {isWriteFormOpen && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4"><div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300"><h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2"><span className="w-2 h-6 bg-slate-900 rounded-full"></span> 글쓰기</h3><form onSubmit={submitPost} className="space-y-4"><input type="text" value={writeTitle} onChange={(e) => setWriteTitle(e.target.value)} placeholder="제목을 입력하세요" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-slate-900/5 transition-all outline-none" /><textarea value={writeContent} onChange={(e) => setWriteContent(e.target.value)} placeholder="자유롭게 내용을 작성해주세요" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium h-48 resize-none focus:bg-white focus:ring-2 focus:ring-slate-900/5 transition-all outline-none" /><div className="flex gap-3 pt-2"><button type="button" onClick={() => setIsWriteFormOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl active:scale-95 transition-transform">취소</button><button type="submit" disabled={isSubmitting || !writeTitle || !writeContent} className="flex-2 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-transform disabled:opacity-50">{isSubmitting ? '등록 중...' : '게시글 등록'}</button></div></form></div></div>
        )}

        {isUpdateWriteFormOpen && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4"><div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-300"><div className="bg-slate-900 p-6 text-white font-black flex items-center justify-between"><span>📢 공지 작성 (MASTER)</span><div className="text-[10px] text-slate-400">AI-POWERED</div></div><div className="p-6 overflow-y-auto space-y-5 bg-slate-50"><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">공지 원문 붙여넣기</label><textarea value={rawUpdateText} onChange={(e) => setRawUpdateText(e.target.value)} placeholder="넥슨 공지사항의 텍스트를 복사해서 붙여넣으세요" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs h-32 outline-none focus:ring-2 focus:ring-blue-500/20" /></div><button onClick={handleAiGenerateUpdate} disabled={isAiGenerating || !rawUpdateText} className={`w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 ${isAiGenerating ? 'opacity-50' : ''}`}>{isAiGenerating ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> 요약 중...</> : 'AI 요약 실행 (Gemini)'}</button><div className="space-y-4 pt-4 border-t border-slate-200"><input value={updateTitle} onChange={(e) => setUpdateTitle(e.target.value)} placeholder="요약된 제목" className="w-full p-4 border border-slate-200 rounded-2xl font-black text-sm outline-none bg-white" /><textarea value={updateContent} onChange={(e) => setUpdateContent(e.target.value)} placeholder="HTML 요약 내용" className="w-full p-4 border border-slate-200 rounded-2xl font-medium text-sm h-48 outline-none bg-white" /></div></div><div className="p-5 bg-white border-t flex gap-3"><button onClick={() => setIsUpdateWriteFormOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl">취소</button><button onClick={submitUpdatePost} disabled={isSubmittingUpdate || !updateTitle} className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl">{isSubmittingUpdate ? '저장 중...' : '최종 등록'}</button></div></div></div>
        )}

        <DetailView />
      </div>
    </>
  );
};
