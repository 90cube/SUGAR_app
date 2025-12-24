
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../state/AppContext';
import { communityService } from '../services/communityService';
import { CommunityPost, BoardType } from '../types';

type TabType = 'balance' | 'keuk' | 'stream';

export const CommunityPanel: React.FC = () => {
  const { isCommunityOpen, closeCommunity, isLoggedIn, openAuthModal, userProfile, openVirtualMatchingModal, isAdminUser, openCommunityUserProfile } = useApp();
  
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

  // Stream Form State
  const [isStreamFormOpen, setIsStreamFormOpen] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDesc, setStreamDesc] = useState('');
  const [isSubmittingStream, setIsSubmittingStream] = useState(false);

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

  const handleLoginClick = () => {
    openAuthModal();
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
      let boardType: BoardType = 'balance';
      if (activeTab === 'keuk') boardType = 'fun';

      await communityService.createPost({
          title: writeTitle,
          content: writeContent,
          author: userProfile.nickname,
          boardType: boardType
      });

      setIsSubmitting(false);
      setIsWriteFormOpen(false);
      setWriteTitle('');
      setWriteContent('');
      fetchTabContent(activeTab);
  };

  const submitStreamRequest = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!userProfile) return;
      if (!streamTitle.trim()) return;

      setIsSubmittingStream(true);
      
      await communityService.requestStreamPost({
          title: streamTitle,
          content: streamDesc,
          author: userProfile.nickname
      });

      // Reset & Refresh
      setIsSubmittingStream(false);
      setIsStreamFormOpen(false);
      setStreamTitle('');
      setStreamDesc('');
      fetchTabContent('stream'); // Refresh list to show pending post
      alert("스트리머 신청이 완료되었습니다. 관리자 승인 후 게시됩니다.");
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

    useEffect(() => {
        if (selectedPost) {
            setHeads(selectedPost.heads);
            setHalfs(selectedPost.halfshots);
            setMyVote(null); // Reset first

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

        // Optimistic UI updates could go here, but since service mimics async, we'll wait for result
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
        if (!window.confirm("정말 이 게시물을 길로틴(신고) 시스템에 회부하시겠습니까? 허위 신고 시 불이익이 있을 수 있습니다.")) {
            return;
        }
        
        setIsReporting(true);
        await communityService.reportPost(selectedPost.id, userProfile.nickname);
        setIsReporting(false);
        alert("신고가 접수되었습니다. 운영진 검토 후 처리됩니다.");
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
           {/* Hero Image for Update Posts */}
           {selectedPost.thumbnail && selectedPost.thumbnail !== 'stream_pending' && (
              <div className="w-full aspect-video bg-slate-100">
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

              {/* Body */}
              <div className="prose prose-sm prose-slate max-w-none text-slate-600">
                  <div dangerouslySetInnerHTML={{ __html: selectedPost.content }} />
              </div>
           </div>
        </div>

        {/* Detail Footer CTA (Interactions) */}
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
                 {/* Scale Icon */}
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
           <button 
             onClick={closeCommunity}
             className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors active:scale-95"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
             </svg>
           </button>
        </div>

        {/* Main Content Area - Attach Ref Here */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overscroll-contain p-5 pb-32 space-y-6">
           
           {/* 2. Sudden Attack Update News (Admin Only Write) */}
           <section>
              <div className="flex items-center justify-between mb-3 px-1">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">공지사항 (Updates)</h3>
                 
                 <div className="flex items-center gap-2">
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
              
              {/* CONTENT */}
              {isUpdatesExpanded ? (
                  <div className="flex overflow-x-auto gap-4 -mx-5 px-5 pb-4 scrollbar-hide snap-x snap-mandatory animate-in fade-in slide-in-from-top-2 duration-300">
                      {updatePosts.map((post) => (
                          <div key={post.id} onClick={() => setSelectedPost(post)} className="snap-center shrink-0 w-[280px] flex flex-col bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 active:scale-[0.98] transition-transform">
                              <div className="w-full aspect-video bg-slate-200 relative">
                                  {post.thumbnail ? <img src={post.thumbnail} alt="" className="w-full h-full object-cover" /> : null}
                              </div>
                              <div className="p-3">
                                  <h4 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2 mb-2 h-10">{post.title}</h4>
                                  <div className="text-[10px] text-slate-500">{post.createdAt.split('T')[0]}</div>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                     {updatePosts.length > 0 && (
                        <div onClick={() => setSelectedPost(updatePosts[0])} className="w-full flex flex-col bg-white rounded-xl overflow-hidden shadow-md border border-slate-200 active:scale-[0.99] transition-transform">
                             <div className="w-full aspect-video bg-slate-200 relative">
                                 {updatePosts[0].thumbnail ? <img src={updatePosts[0].thumbnail} alt="" className="w-full h-full object-cover" /> : null}
                                 <span className="absolute top-3 left-3 px-2 py-0.5 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold rounded">LATEST</span>
                             </div>
                             <div className="p-4">
                                 <h4 className="font-bold text-slate-900 text-base leading-tight mb-2">{updatePosts[0].title}</h4>
                                 <div className="text-xs text-slate-500">{updatePosts[0].createdAt.split('T')[0]}</div>
                             </div>
                        </div>
                     )}
                  </div>
              )}
           </section>

           {/* 3. Navigation Tabs & WRITE Button */}
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
             
             {/* General WRITE Button for current tab */}
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

        {/* 5. Floating Bottom CTA (Dynamic Size & Scroll Aware) */}
        <div 
            className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 z-40 transition-all duration-500 ease-in-out ${showBottomCTA ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
        >
            {isLoggedIn ? (
                <button onClick={handleVirtualMatching} className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-black rounded-full shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group relative overflow-hidden">
                    <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:animate-shine" />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    <span>가상 매칭</span>
                </button>
            ) : (
                <button onClick={handleLoginClick} className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-black rounded-full shadow-lg shadow-slate-900/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 whitespace-nowrap">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span>SUGAR 로그인</span>
                </button>
            )}
        </div>

        {/* WRITE POST FORM */}
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
                        <div className="flex gap-2 pt-2">
                            <button type="button" onClick={() => setIsWriteFormOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl active:scale-95 transition-all">취소</button>
                            <button type="submit" disabled={isSubmitting || !writeTitle.trim()} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50">{isSubmitting ? '...' : '등록'}</button>
                        </div>
                    </form>
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
