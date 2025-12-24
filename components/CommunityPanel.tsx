
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
  const { isCommunityOpen, closeCommunity, isLoggedIn, openAuthModal, logout, userProfile, openVirtualMatchingModal, isAdminUser, openCommunityUserProfile } = useApp();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<TabType>('balance');
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

  // Data State
  const [updatePosts, setUpdatePosts] = useState<CommunityPost[]>([]);
  const [tabPosts, setTabPosts] = useState<CommunityPost[]>([]);
  const [popularPosts, setPopularPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // View State for Updates
  const [isUpdatesExpanded, setIsUpdatesExpanded] = useState(false);

  // Write Form State (Stream is separate)
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

  // Stream Form State
  const [isStreamFormOpen, setIsStreamFormOpen] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDesc, setStreamDesc] = useState('');
  const [isSubmittingStream, setIsSubmittingStream] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Scroll State for Bottom CTA
  const [showBottomCTA, setShowBottomCTA] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);

  // Handle Scroll to hide/show CTA
  useEffect(() => {
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const currentScroll = scrollContainerRef.current.scrollTop;
        
        // Hide on scroll down, show on scroll up. Always show at very top.
        if (currentScroll < 20) {
            setShowBottomCTA(true);
        } else if (currentScroll > lastScrollTopRef.current) {
            setShowBottomCTA(false); // Scrolling down
        } else {
            setShowBottomCTA(true); // Scrolling up
        }
        
        lastScrollTopRef.current = currentScroll;
    };

    const container = scrollContainerRef.current;
    if (container) {
        container.addEventListener('scroll', handleScroll);
    }
    return () => {
        if (container) {
            container.removeEventListener('scroll', handleScroll);
        }
    };
  }, [isCommunityOpen]);

  // Fetch Data when open or tab changes
  useEffect(() => {
    if (isCommunityOpen) {
        // Fetch All Updates for the top slider
        communityService.getPosts('update').then(setUpdatePosts);
        
        // Fetch Tab Content
        fetchTabContent(activeTab);
    }
  }, [isCommunityOpen]);

  // Refetch when tab changes
  useEffect(() => {
    if (isCommunityOpen) {
        fetchTabContent(activeTab);
    }
  }, [activeTab]);

  // Check DB Connection when Admin Modal Opens
  useEffect(() => {
      if (isUpdateWriteFormOpen) {
          communityService.checkConnection().then(setDbConnected);
      }
  }, [isUpdateWriteFormOpen]);

  // Reset errors when modals close
  useEffect(() => {
      if (!isWriteFormOpen) setWriteError(null);
      if (!isUpdateWriteFormOpen) setUpdateError(null);
      if (!isStreamFormOpen) setStreamError(null);
  }, [isWriteFormOpen, isUpdateWriteFormOpen, isStreamFormOpen]);

  const fetchTabContent = (tab: TabType) => {
    setIsLoading(true);
    let queryType: BoardType = 'balance';
    if (tab === 'keuk') queryType = 'fun';
    if (tab === 'stream') queryType = 'stream';

    // Fetch Regular Posts
    communityService.getPosts(queryType).then(data => {
        setTabPosts(data);
        setIsLoading(false);
    });

    // Fetch Popular Posts for supported tabs
    if (tab === 'balance' || tab === 'keuk') {
        communityService.getPopularPosts(queryType).then(setPopularPosts);
    } else {
        setPopularPosts([]);
    }
  };

  const handleVirtualMatching = () => {
    openVirtualMatchingModal();
  };

  const handleLogout = () => {
      // Removed window.confirm for sandbox compatibility
      logout();
  };

  // --- Writing Logic ---

  const handleWriteClick = () => {
      if (!isLoggedIn) {
          openAuthModal();
          return;
      }
      if (activeTab === 'stream') {
          setIsStreamFormOpen(true);
      } else {
          setIsWriteFormOpen(true);
      }
  };

  const submitPost = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!userProfile) return;
      if (!writeTitle.trim()) return;

      setIsSubmitting(true);
      setWriteError(null);

      let boardType: BoardType = 'balance';
      if (activeTab === 'keuk') boardType = 'fun';

      const success = await communityService.createPost({
          title: writeTitle,
          content: writeContent,
          author: userProfile.nickname,
          boardType: boardType
      });

      if (!success) {
          setWriteError("저장 실패: DB가 연결되지 않았거나 권한이 없습니다.");
          // Do NOT close the form so the user doesn't lose content
      } else {
          // Success: Refresh list to get real ID and data from DB
          fetchTabContent(activeTab);
          setIsWriteFormOpen(false);
          setWriteTitle('');
          setWriteContent('');
      }

      setIsSubmitting(false);
  };

  // --- ADMIN UPDATE LOGIC ---
  const handleAiGenerateUpdate = async () => {
      if (!rawUpdateText.trim()) {
          setUpdateError("업데이트 원문을 입력해주세요.");
          return;
      }
      setIsAiGenerating(true);
      setUpdateError(null);
      try {
          const result = await geminiService.summarizeGameUpdate(rawUpdateText, masterPrompt);
          setUpdateTitle(result.title);
          setUpdateContent(result.content);
      } catch (e) {
          setUpdateError("AI 요약 중 오류가 발생했습니다.");
      } finally {
          setIsAiGenerating(false);
      }
  };

  const submitUpdatePost = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isAdminUser || !userProfile) return;
      if (!updateTitle.trim() || !updateContent.trim()) {
          setUpdateError("제목과 내용을 확인해주세요.");
          return;
      }
      
      setIsSubmittingUpdate(true);
      setUpdateError(null);
      
      // Strict DB Mode
      const success = await communityService.createPost({
          title: updateTitle,
          content: updateContent, // Uses the HTML generated by AI
          author: userProfile.nickname,
          boardType: 'update',
          thumbnail: updateThumbnail
      });

      setIsSubmittingUpdate(false);
      
      if (success) {
        setIsUpdateWriteFormOpen(false);
        // Reset Fields
        setUpdateTitle('');
        setUpdateContent('');
        setUpdateThumbnail('');
        setRawUpdateText('');
        // Refresh Updates from DB
        communityService.getPosts('update').then(setUpdatePosts);
      } else {
        setUpdateError("공지 등록 실패 (DB 연결/권한 확인)");
      }
  };

  const submitStreamRequest = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!userProfile) return;
      if (!streamTitle.trim()) return;

      setIsSubmittingStream(true);
      setStreamError(null);
      
      const result = await communityService.requestStreamPost({
          title: streamTitle,
          content: streamDesc,
          author: userProfile.nickname
      });

      setIsSubmittingStream(false);

      if (result) {
        setIsStreamFormOpen(false);
        setStreamTitle('');
        setStreamDesc('');
        fetchTabContent('stream'); // Refresh list to show pending post
      } else {
        setStreamError("신청 실패 (DB 연결 오류)");
      }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${diffDays}일 전`;
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

  // --- Sub-Components for this Panel ---

  const DetailView = () => {
    // Local State for Voting
    const [heads, setHeads] = useState(0);
    const [halfs, setHalfs] = useState(0);
    const [myVote, setMyVote] = useState<'head' | 'half' | null>(null);
    const [isReporting, setIsReporting] = useState(false);
    const [reportMessage, setReportMessage] = useState<string | null>(null);

    useEffect(() => {
        if (selectedPost) {
            setHeads(selectedPost.heads);
            setHalfs(selectedPost.halfshots);
            setMyVote(null); // Reset first
            setReportMessage(null);

            // If logged in, check if I voted
            if (isLoggedIn && userProfile) {
                communityService.getUserVote(selectedPost.id, userProfile.nickname)
                    .then(vote => setMyVote(vote));
            }
        }
    }, [selectedPost, isLoggedIn, userProfile]);

    const handleVote = async (type: 'head' | 'half') => {
        if (!selectedPost) return;
        if (!isLoggedIn || !userProfile) {
            openAuthModal();
            return;
        }

        const result = await communityService.toggleVote(selectedPost.id, userProfile.nickname, type);
        setHeads(result.heads);
        setHalfs(result.halfshots);
        setMyVote(result.userVote);
    };

    const handleReport = async () => {
        if (!selectedPost) return;
        if (!isLoggedIn || !userProfile) {
            openAuthModal();
            return;
        }
        // Removed window.confirm for sandbox compatibility.
        
        setIsReporting(true);
        await communityService.reportPost(selectedPost.id, userProfile.nickname);
        setIsReporting(false);
        setReportMessage("신고가 접수되었습니다.");
        setTimeout(() => setReportMessage(null), 3000);
    };

    if (!selectedPost) return null;

    return (
      <div className="absolute inset-0 bg-white z-[170] flex flex-col animate-in slide-in-from-right duration-300">
        {/* Detail Header */}
        <div className="flex-shrink-0 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-10">
           <button 
             onClick={() => setSelectedPost(null)}
             className="w-10 h-10 flex items-center justify-center -ml-2 text-slate-600 hover:text-slate-900"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
             </svg>
           </button>
           <h3 className="text-sm font-bold text-slate-800 truncate max-w-[200px]">{selectedPost.title}</h3>
           <div className="w-8"></div> {/* Spacer */}
        </div>

        {/* Detail Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain pb-24">
           {/* Hero Image for Update Posts - Forced 16:9 Cover */}
           {selectedPost.thumbnail && selectedPost.thumbnail !== 'stream_pending' && (
              <div className="w-full aspect-video bg-slate-100 overflow-hidden relative">
                  <img src={selectedPost.thumbnail} alt="" className="w-full h-full object-cover" />
              </div>
           )}
           
           <div className="p-6">
              {/* Meta */}
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2" onClick={() => openCommunityUserProfile(selectedPost.author)}>
                      <span className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-300">
                          {selectedPost.author[0].toUpperCase()}
                      </span>
                      <div className="flex flex-col cursor-pointer">
                          <span className="text-xs font-bold text-slate-900 hover:underline">{selectedPost.author}</span>
                          <span className="text-[10px] text-slate-500">{selectedPost.createdAt.split('T')[0]}</span>
                      </div>
                  </div>
                  <HeadshotCounter count={heads} type="head" />
              </div>

              {/* Title */}
              <h1 className="text-xl font-black text-slate-900 mb-6 leading-tight">{selectedPost.title}</h1>
              
              {/* Status Badge in Detail */}
              {selectedPost.status === 'PENDING' && (
                   <div className="mb-4 inline-block px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-lg border border-yellow-200">
                       🕒 게시 판단 중 (Pending Review)
                   </div>
              )}

              {/* Body (HTML Render) */}
              <div className="prose prose-sm prose-slate max-w-none text-slate-600">
                  <div dangerouslySetInnerHTML={{ __html: selectedPost.content }} />
              </div>
           </div>
        </div>

        {/* Report Feedback Toast */}
        {reportMessage && (
            <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs py-2 px-4 rounded-full shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2">
                {reportMessage}
            </div>
        )}

        {/* Detail Footer CTA */}
        <div className="p-4 border-t border-slate-100 bg-white sticky bottom-0 z-10 flex justify-end items-center gap-2">
             {/* Headshot (Like) */}
             <button 
                onClick={() => handleVote('head')}
                className={`flex items-center gap-1.5 px-4 py-2.5 font-bold text-xs rounded-xl active:scale-95 transition-all border ${
                    myVote === 'head' 
                    ? 'bg-orange-100 border-orange-200 text-orange-700' 
                    : 'bg-orange-50 border-orange-100 text-orange-600 hover:bg-orange-100'
                }`}
             >
                <span>🎯 헤드샷</span>
                <span className="bg-white/50 px-1.5 rounded text-[10px]">{heads}</span>
             </button>

             {/* Halfshot (Dislike) */}
             <button 
                onClick={() => handleVote('half')}
                className={`flex items-center gap-1.5 px-4 py-2.5 font-bold text-xs rounded-xl active:scale-95 transition-all border ${
                    myVote === 'half'
                    ? 'bg-slate-200 border-slate-300 text-slate-800'
                    : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                }`}
             >
                <span>🛡️ 반샷</span>
                <span className="bg-white/50 px-1.5 rounded text-[10px]">{halfs}</span>
             </button>

             <div className="w-px h-6 bg-slate-200 mx-1"></div>

             {/* Guillotine (Report) */}
             <button 
                onClick={handleReport}
                disabled={isReporting}
                className="flex items-center justify-center p-2.5 bg-red-50 text-red-500 border border-red-100 rounded-xl active:scale-95 transition-all hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                title="길로틴 (신고)"
             >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                <span className="sr-only">길로틴</span>
             </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] transition-opacity duration-500 ${isCommunityOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeCommunity}
      />

      {/* Main Panel Container */}
      <div 
        className={`fixed inset-0 z-[160] flex flex-col bg-slate-50/95 transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isCommunityOpen ? 'translate-y-0' : '-translate-y-full'}`}
      >
        {/* Main View Header */}
        <div className="flex-shrink-0 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 shadow-sm z-30 relative">
           <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
             <span className="text-yellow-500 text-2xl">●</span> 
             커뮤니티 (COMMUNITY)
           </h2>
           <div className="flex items-center gap-2">
             {isLoggedIn ? (
               <button 
                 onClick={handleLogout}
                 className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-colors active:scale-95 border border-red-200"
               >
                 로그아웃
               </button>
             ) : (
               <button 
                 onClick={openAuthModal}
                 className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors active:scale-95 border border-blue-200"
               >
                 로그인
               </button>
             )}
             <button 
               onClick={closeCommunity}
               className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors active:scale-95"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
               </svg>
             </button>
           </div>
        </div>

        {/* Main Content Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overscroll-contain p-5 pb-32 space-y-6">
           
           {/* Update News Section */}
           <section>
              <div className="flex items-center justify-between mb-3 px-1">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                     공지사항 (Updates)
                     <button onClick={() => fetchTabContent(activeTab)} title="새로고침" className="ml-2 text-slate-300 hover:text-slate-500 transition-colors">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                     </button>
                 </h3>
                 
                 <div className="flex items-center gap-2">
                     {/* Admin Only: Write Update */}
                     {isAdminUser && (
                         <button 
                            onClick={() => setIsUpdateWriteFormOpen(true)}
                            className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 active:scale-90 transition-all shadow-sm"
                            title="공지 작성"
                         >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                         </button>
                     )}

                     {/* EXPAND/COLLAPSE BUTTON */}
                     <button 
                       onClick={() => setIsUpdatesExpanded(!isUpdatesExpanded)}
                       className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors active:scale-95"
                     >
                        {isUpdatesExpanded ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        )}
                     </button>
                 </div>
              </div>
              
              {/* CONTENT LIST */}
              {isUpdatesExpanded ? (
                  <div className="flex overflow-x-auto gap-4 -mx-5 px-5 pb-4 scrollbar-hide snap-x snap-mandatory animate-in fade-in slide-in-from-top-2 duration-300">
                      {updatePosts.map((post) => (
                          <div key={post.id} onClick={() => setSelectedPost(post)} className="snap-center shrink-0 w-[280px] flex flex-col bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 active:scale-[0.98] transition-transform">
                              <div className="w-full aspect-video bg-slate-200 relative overflow-hidden">
                                  {post.thumbnail ? <img src={post.thumbnail} alt="" className="w-full h-full object-cover" /> : null}
                              </div>
                              <div className="p-3">
                                  <h4 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2 mb-2 h-10">{post.title}</h4>
                                  <div className="text-[10px] text-slate-500">{post.createdAt.split('T')[0]}</div>
                              </div>
                          </div>
                      ))}
                      {updatePosts.length === 0 && <div className="text-sm text-slate-400 p-4">등록된 공지가 없습니다.</div>}
                  </div>
              ) : (
                  <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                     {updatePosts.length > 0 ? (
                        <div onClick={() => setSelectedPost(updatePosts[0])} className="w-full flex flex-col bg-white rounded-xl overflow-hidden shadow-md border border-slate-200 active:scale-[0.99] transition-transform">
                             <div className="w-full aspect-video bg-slate-200 relative overflow-hidden">
                                 {updatePosts[0].thumbnail ? <img src={updatePosts[0].thumbnail} alt="" className="w-full h-full object-cover" /> : null}
                                 <span className="absolute top-3 left-3 px-2 py-0.5 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold rounded">LATEST</span>
                             </div>
                             <div className="p-4">
                                 <h4 className="font-bold text-slate-900 text-base leading-tight mb-2">{updatePosts[0].title}</h4>
                                 <div className="text-xs text-slate-500">{updatePosts[0].createdAt.split('T')[0]}</div>
                             </div>
                        </div>
                     ) : (
                         <div className="w-full p-4 bg-slate-100 rounded-xl text-center text-xs text-slate-400">등록된 공지가 없습니다.</div>
                     )}
                  </div>
              )}
           </section>

           {/* 3. Navigation Tabs */}
           <div className="sticky top-0 z-20 py-2 bg-slate-50/95 backdrop-blur-sm -mx-1 px-1">
             <div className="flex p-1.5 bg-white border border-slate-200 rounded-xl shadow-sm items-center">
                {(['balance', 'keuk', 'stream'] as const).map((tab) => {
                    const isActive = activeTab === tab;
                    const label = tab === 'balance' ? '밸런스 토론' : tab === 'keuk' ? '큭큭(유머)' : '방송 홍보';
                    return (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all relative overflow-hidden ${isActive ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                            {label}
                        </button>
                    );
                })}
             </div>
             
             {/* General WRITE Button */}
             <div className="mt-2 text-right px-1 animate-in fade-in duration-300">
                 <button 
                    onClick={handleWriteClick}
                    className="text-[10px] font-bold bg-blue-600 text-white px-3 py-1.5 rounded-full shadow-sm hover:bg-blue-500 active:scale-95 transition-all flex items-center gap-1 ml-auto"
                 >
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                     {activeTab === 'stream' ? '방송 등록' : '글쓰기'}
                 </button>
             </div>
           </div>

           {/* 4. Tab Content List */}
           <div className="space-y-3 min-h-[300px]">
              {isLoading ? (
                  <div className="space-y-3">
                      {[1,2,3].map(i => <div key={i} className="h-24 bg-white border border-slate-100 rounded-xl animate-pulse"/>)}
                  </div>
              ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-3">
                      {tabPosts.length === 0 ? (
                          <div className="text-center py-10 text-slate-400 text-sm">게시글이 없습니다.</div>
                      ) : tabPosts.map(post => {
                          const isPending = post.status === 'PENDING';
                          return (
                          <div key={post.id} onClick={() => setSelectedPost(post)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm active:scale-[0.99] transition-transform">
                              {activeTab === 'stream' ? (
                                  <>
                                    <div className="aspect-video bg-slate-800 rounded-lg mb-3 relative overflow-hidden flex items-center justify-center">
                                         {post.thumbnail && post.thumbnail !== 'stream_pending' ? <img src={`https://placehold.co/600x338/1e293b/FFF?text=Live+Stream`} alt="" className="w-full h-full object-cover opacity-80" /> : null}
                                         {!isPending && (
                                            <div className="absolute inset-0 flex items-center justify-center"><div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"><svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div></div>
                                         )}
                                         {isPending ? <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-yellow-400 text-slate-900 text-[10px] font-bold rounded shadow-sm">게시 판단 중</span> : <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded shadow-sm animate-pulse">LIVE</span>}
                                    </div>
                                    <h4 className={`font-bold text-sm mb-1 line-clamp-1 ${isPending ? 'text-slate-500' : 'text-slate-800'}`}>{post.title}</h4>
                                    <div className="flex justify-between items-center mt-2">
                                        <span 
                                            onClick={(e) => { e.stopPropagation(); openCommunityUserProfile(post.author); }} 
                                            className="text-xs text-slate-500 font-medium hover:underline cursor-pointer"
                                        >{post.author}</span>
                                        {!isPending && <HeadshotCounter count={post.heads} type="head" />}
                                    </div>
                                  </>
                              ) : (
                                  <>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${activeTab === 'keuk' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                                            {activeTab === 'keuk' ? '유머' : '토론'}
                                        </span>
                                        <span className="text-xs text-slate-400">{formatTime(post.createdAt)}</span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-sm mb-1">{post.title}</h4>
                                    <p className="text-xs text-slate-500 line-clamp-2">{post.content}</p>
                                    <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                                            <span 
                                                onClick={(e) => { e.stopPropagation(); openCommunityUserProfile(post.author); }}
                                                className="hover:text-slate-600 cursor-pointer"
                                            >{post.author}</span>
                                            <span>•</span>
                                            <span>조회 {post.views}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <HeadshotCounter count={post.heads} type="head" />
                                            <HeadshotCounter count={post.halfshots} type="half" />
                                        </div>
                                    </div>
                                  </>
                              )}
                          </div>
                      )})}
                  </div>
              )}
           </div>
        </div>

        {/* 5. Floating Bottom CTA - Only for Logged In Users (Virtual Matching) */}
        {isLoggedIn && (
            <div 
                className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 z-40 transition-all duration-500 ease-in-out ${showBottomCTA ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
            >
                <button onClick={handleVirtualMatching} className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-black rounded-full shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group relative overflow-hidden">
                    <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:animate-shine" />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    <span>가상 매칭</span>
                </button>
            </div>
        )}

        {/* WRITE POST FORM (Normal) */}
        {isWriteFormOpen && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[180] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                    <h3 className="text-lg font-black text-slate-800 mb-4">{activeTab === 'keuk' ? '유머' : '토론'} 글쓰기</h3>
                    <form onSubmit={submitPost} className="space-y-4">
                        <div>
                            <input type="text" value={writeTitle} onChange={(e) => setWriteTitle(e.target.value)} placeholder="제목" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10" autoFocus />
                        </div>
                        <div>
                            <textarea value={writeContent} onChange={(e) => setWriteContent(e.target.value)} placeholder="내용을 입력하세요..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 h-32 resize-none" />
                        </div>
                        
                        {writeError && <div className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded-lg border border-red-100">{writeError}</div>}

                        <div className="flex gap-2 pt-2">
                            <button type="button" onClick={() => setIsWriteFormOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl active:scale-95 transition-all">취소</button>
                            <button type="submit" disabled={isSubmitting || !writeTitle.trim()} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50">{isSubmitting ? '...' : '등록'}</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* UPDATE (NOTICE) WRITE FORM - AI ENHANCED */}
        {isUpdateWriteFormOpen && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[180] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-lg rounded-3xl p-0 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                    {/* Modal Header */}
                    <div className="bg-blue-600 p-5 flex justify-between items-center flex-shrink-0">
                         <div>
                            <h3 className="text-lg font-black text-white flex items-center gap-2">
                                📢 업데이트 공지 (AI)
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-bold rounded border border-white/20">ADMIN ONLY</span>
                                <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded ${dbConnected ? 'bg-green-500/20 text-green-100 border border-green-400/30' : 'bg-red-500/20 text-red-100 border border-red-400/30'}`}>
                                    <span className={`w-2 h-2 rounded-full ${dbConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
                                    {dbConnected ? 'DB Connected' : 'DB Disconnected'}
                                </span>
                            </div>
                         </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        
                        {/* 1. Input Section */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">1. 원문 붙여넣기 (Raw Text)</label>
                                <textarea 
                                    value={rawUpdateText} 
                                    onChange={(e) => setRawUpdateText(e.target.value)} 
                                    placeholder="서든어택 홈페이지 공지사항 내용을 복사해서 여기에 붙여넣으세요..." 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 h-24 resize-none" 
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">2. 마스터 프롬프트 (Template Config)</label>
                                <textarea 
                                    value={masterPrompt} 
                                    onChange={(e) => setMasterPrompt(e.target.value)} 
                                    className="w-full p-3 bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 h-24 resize-none"
                                />
                            </div>

                            <button 
                                type="button" 
                                onClick={handleAiGenerateUpdate}
                                disabled={isAiGenerating || !rawUpdateText}
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isAiGenerating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        AI 요약 생성 중...
                                    </>
                                ) : (
                                    <>
                                        <span>✨ AI 자동 생성 (Generate)</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="border-t border-slate-100 my-4"></div>

                        {/* 2. Result / Edit Section */}
                        <form id="admin-update-form" onSubmit={submitUpdatePost} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">제목 (Title)</label>
                                <input 
                                    type="text" 
                                    value={updateTitle} 
                                    onChange={(e) => setUpdateTitle(e.target.value)} 
                                    placeholder="AI가 생성한 제목 (수정 가능)" 
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-900/10" 
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">썸네일 이미지 (Thumbnail URL)</label>
                                <input 
                                    type="text" 
                                    value={updateThumbnail} 
                                    onChange={(e) => setUpdateThumbnail(e.target.value)} 
                                    placeholder="https://... (16:9 권장)" 
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10" 
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">내용 (Content HTML)</label>
                                <textarea 
                                    value={updateContent} 
                                    onChange={(e) => setUpdateContent(e.target.value)} 
                                    placeholder="AI가 생성한 HTML 내용..." 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 h-32 resize-none" 
                                />
                            </div>
                            
                            {updateError && <div className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded-lg border border-red-100">{updateError}</div>}
                        </form>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-5 bg-slate-50 border-t border-slate-200 flex gap-3 flex-shrink-0">
                        <button 
                            type="button" 
                            onClick={() => setIsUpdateWriteFormOpen(false)} 
                            className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl active:scale-95 transition-all"
                        >
                            취소
                        </button>
                        <button 
                            type="submit" 
                            form="admin-update-form"
                            disabled={isSubmittingUpdate || !updateTitle.trim()} 
                            className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-slate-900/10"
                        >
                            {isSubmittingUpdate ? '업로드 중...' : '공지 등록 (Upload)'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* STREAM REGISTRATION FORM MODAL */}
        {isStreamFormOpen && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[180] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                    <h3 className="text-lg font-black text-slate-800 mb-4">방송 홍보 등록</h3>
                    <form onSubmit={submitStreamRequest} className="space-y-4">
                        <div>
                            <input type="text" value={streamTitle} onChange={(e) => setStreamTitle(e.target.value)} placeholder="예: 랭크전 빡겜 방송" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10" autoFocus />
                        </div>
                        <div>
                            <textarea value={streamDesc} onChange={(e) => setStreamDesc(e.target.value)} placeholder="방송 링크 (Twitch/Youtube)..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 h-24 resize-none" />
                        </div>
                        
                        {streamError && <div className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded-lg border border-red-100">{streamError}</div>}

                        <div className="flex gap-2 pt-2">
                            <button type="button" onClick={() => setIsStreamFormOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl active:scale-95 transition-all">취소</button>
                            <button type="submit" disabled={isSubmittingStream || !streamTitle.trim()} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50">{isSubmittingStream ? '...' : '신청하기'}</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        <DetailView />
      </div>
    </>
  );
};
