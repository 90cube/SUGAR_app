
import React, { useState, useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { communityService } from '../services/communityService';
import { CommunityPost, BoardType } from '../types';

type TabType = 'balance' | 'keuk' | 'stream';

export const CommunityPanel: React.FC = () => {
  const { isCommunityOpen, closeCommunity, isLoggedIn, openAuthModal, userProfile } = useApp();
  
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

  // Stream Form State
  const [isStreamFormOpen, setIsStreamFormOpen] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDesc, setStreamDesc] = useState('');
  const [isSubmittingStream, setIsSubmittingStream] = useState(false);

  // Check Admin Role (Mock: checks if nickname is 'sugar' or starts with 'GM')
  const isAdmin = isLoggedIn && userProfile && (userProfile.nickname === 'sugar' || userProfile.nickname.startsWith('GM'));

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
    if (!isLoggedIn) {
        closeCommunity();
        openAuthModal();
    } else {
        alert("Virtual Matching feature is coming soon!");
    }
  };

  const handleRegisterStream = () => {
      if (!isLoggedIn) {
          closeCommunity();
          openAuthModal();
          return;
      }
      setIsStreamFormOpen(true);
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
      alert("Stream request submitted! It will be reviewed by an admin.");
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const HeadshotCounter = ({ count, type }: { count: number, type: 'head' | 'half' }) => {
     const isHead = type === 'head';
     return (
         <div className={`flex items-center gap-1 text-[10px] font-bold ${isHead ? 'text-orange-600 bg-orange-50' : 'text-slate-500 bg-slate-100'} px-1.5 py-0.5 rounded`}>
             {isHead ? '🎯 Head' : '🛡️ Half'}
             <span>{count > 999 ? (count/1000).toFixed(1)+'k' : count}</span>
         </div>
     );
  };

  // --- Sub-Components for this Panel ---

  const DetailView = () => {
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
                  <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                          {selectedPost.author[0].toUpperCase()}
                      </span>
                      <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900">{selectedPost.author}</span>
                          <span className="text-[10px] text-slate-500">{selectedPost.createdAt.split('T')[0]}</span>
                      </div>
                  </div>
                  <HeadshotCounter count={selectedPost.heads} type="head" />
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

        {/* Detail Footer CTA */}
        <div className="p-4 border-t border-slate-100 bg-white sticky bottom-0 z-10 flex justify-between items-center">
             <div className="flex gap-2">
                 <button className="flex items-center gap-1.5 px-4 py-2 bg-orange-50 text-orange-600 font-bold text-xs rounded-xl active:scale-95 transition-transform">
                    <span>🎯 Headshot</span>
                 </button>
                 <button className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl active:scale-95 transition-transform">
                    <span>🛡️ Halfshot</span>
                 </button>
             </div>
             <button className="p-2 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
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
        {/* Main View Header (Hidden if Detail is open, but simple z-index handling works too) */}
        <div className="flex-shrink-0 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 shadow-sm z-30 relative">
           <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
             <span className="text-yellow-500 text-2xl">●</span> 
             COMMUNITY
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

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 pb-32 space-y-6">
           
           {/* 2. Sudden Attack Update News */}
           <section>
              <div className="flex items-center justify-between mb-3 px-1">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Official Updates</h3>
                 
                 <div className="flex items-center gap-2">
                     {/* ADMIN WRITE BUTTON for Update Board */}
                     {isAdmin && (
                        <button className="text-[10px] font-bold text-white bg-slate-900 px-3 py-1 rounded-full active:scale-95 transition-transform flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                            Write
                        </button>
                     )}
                     
                     {/* EXPAND/COLLAPSE BUTTON */}
                     <button 
                       onClick={() => setIsUpdatesExpanded(!isUpdatesExpanded)}
                       className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors active:scale-95"
                       title={isUpdatesExpanded ? "Show Latest" : "Show All"}
                     >
                        {isUpdatesExpanded ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        )}
                     </button>
                 </div>
              </div>
              
              {/* CONTENT */}
              {isUpdatesExpanded ? (
                  // EXPANDED: Horizontal Scroll List of ALL Updates
                  <div className="flex overflow-x-auto gap-4 -mx-5 px-5 pb-4 scrollbar-hide snap-x snap-mandatory animate-in fade-in slide-in-from-top-2 duration-300">
                      {updatePosts.map((post) => (
                          <div 
                            key={post.id} 
                            onClick={() => setSelectedPost(post)}
                            className="snap-center shrink-0 w-[280px] flex flex-col bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 active:scale-[0.98] transition-transform"
                          >
                              {/* 16:9 Thumbnail */}
                              <div className="w-full aspect-video bg-slate-200 relative">
                                  {post.thumbnail ? (
                                      <img src={post.thumbnail} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Image</div>
                                  )}
                              </div>
                              {/* Content: Title + Date Only (Per requirement) */}
                              <div className="p-3">
                                  <h4 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2 mb-2 h-10">
                                      {post.title}
                                  </h4>
                                  <div className="text-[10px] text-slate-500">
                                      {post.createdAt.split('T')[0]}
                                  </div>
                              </div>
                          </div>
                      ))}
                      {updatePosts.length === 0 && (
                          <div className="w-full h-32 flex items-center justify-center text-slate-400 text-xs">Loading Updates...</div>
                      )}
                  </div>
              ) : (
                  // COLLAPSED: Single Latest Post Card
                  <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                     {updatePosts.length > 0 ? (
                        (() => {
                            const post = updatePosts[0];
                            return (
                                <div 
                                    onClick={() => setSelectedPost(post)}
                                    className="w-full flex flex-col bg-white rounded-xl overflow-hidden shadow-md border border-slate-200 active:scale-[0.99] transition-transform"
                                >
                                    {/* 16:9 Thumbnail (Larger) */}
                                    <div className="w-full aspect-video bg-slate-200 relative">
                                        {post.thumbnail ? (
                                            <img src={post.thumbnail} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Image</div>
                                        )}
                                        <span className="absolute top-3 left-3 px-2 py-0.5 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold rounded">
                                            LATEST
                                        </span>
                                    </div>
                                    <div className="p-4">
                                        <h4 className="font-bold text-slate-900 text-base leading-tight mb-2">
                                            {post.title}
                                        </h4>
                                        <div className="text-xs text-slate-500">
                                            {post.createdAt.split('T')[0]}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()
                     ) : (
                        <div className="w-full h-40 bg-slate-100 rounded-xl animate-pulse flex items-center justify-center text-slate-400 text-xs">Loading Latest Update...</div>
                     )}
                  </div>
              )}
           </section>

           {/* 3. Navigation Tabs */}
           <div className="sticky top-0 z-20 py-2 bg-slate-50/95 backdrop-blur-sm -mx-1 px-1">
             <div className="flex p-1.5 bg-white border border-slate-200 rounded-xl shadow-sm items-center">
                {(['balance', 'keuk', 'stream'] as const).map((tab) => {
                    const isActive = activeTab === tab;
                    const label = tab === 'balance' ? 'Balance' : tab === 'keuk' ? '큭큭' : 'Stream';
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all relative overflow-hidden ${
                                isActive
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {label}
                        </button>
                    );
                })}
             </div>
             
             {/* REGISTER STREAM BUTTON (Only visible in Stream Tab) */}
             {activeTab === 'stream' && (
                 <div className="mt-2 text-right px-1 animate-in fade-in duration-300">
                     <button 
                        onClick={handleRegisterStream}
                        className="text-[10px] font-bold bg-red-600 text-white px-3 py-1.5 rounded-full shadow-sm hover:bg-red-500 active:scale-95 transition-all flex items-center gap-1 ml-auto"
                     >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                           <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l4 2A1 1 0 0020 14V6a1 1 0 00-1.447-.894l-4 2z" />
                         </svg>
                         Register Stream
                     </button>
                 </div>
             )}
           </div>

           {/* 4. Tab Content List */}
           <div className="space-y-3 min-h-[300px]">
              {isLoading ? (
                  <div className="space-y-3">
                      {[1,2,3].map(i => <div key={i} className="h-24 bg-white border border-slate-100 rounded-xl animate-pulse"/>)}
                  </div>
              ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-3">
                      {/* POPULAR POSTS SECTION (Only for balance/fun) */}
                      {popularPosts.length > 0 && (
                          <div className="mb-4 space-y-2">
                              <div className="flex items-center gap-1.5 px-1 mb-2">
                                  <span className="text-sm">🔥</span>
                                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Weekly Hot</h3>
                              </div>
                              <div className="grid gap-3">
                                  {popularPosts.map(post => (
                                      <div 
                                          key={`hot-${post.id}`} 
                                          onClick={() => setSelectedPost(post)}
                                          className="bg-orange-50/50 p-3 rounded-xl border border-orange-100 shadow-sm active:scale-[0.99] transition-transform flex items-start gap-3 relative overflow-hidden group"
                                      >
                                          {/* Shine effect */}
                                          <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 group-hover:animate-shine pointer-events-none" />
                                          
                                          <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 mb-1">
                                                <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[9px] font-bold rounded">HOT</span>
                                                <span className="text-[10px] text-orange-700 font-bold">{(post.heads - post.halfshots)} pts</span>
                                              </div>
                                              <h4 className="font-bold text-slate-900 text-sm leading-tight line-clamp-1">{post.title}</h4>
                                          </div>
                                          <HeadshotCounter count={post.heads} type="head" />
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      {/* REGULAR LIST */}
                      {tabPosts.length === 0 ? (
                          <div className="text-center py-10 text-slate-400 text-sm">No posts yet.</div>
                      ) : tabPosts.map(post => {
                          const isPending = post.status === 'PENDING';
                          return (
                          <div 
                            key={post.id} 
                            onClick={() => setSelectedPost(post)}
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm active:scale-[0.99] transition-transform"
                          >
                              {activeTab === 'stream' ? (
                                  // Stream Card Layout
                                  <>
                                    <div className="aspect-video bg-slate-800 rounded-lg mb-3 relative overflow-hidden flex items-center justify-center">
                                         {/* Thumbnail Logic */}
                                         {post.thumbnail && post.thumbnail !== 'stream_pending' ? (
                                             <img src={`https://placehold.co/600x338/1e293b/FFF?text=Live+Stream`} alt="" className="w-full h-full object-cover opacity-80" />
                                         ) : isPending ? (
                                             <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
                                                 <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                 <span className="text-[10px]">Processing</span>
                                             </div>
                                         ) : null}

                                         {/* Overlays */}
                                         {!isPending && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                </div>
                                            </div>
                                         )}
                                         
                                         {/* Badge */}
                                         {isPending ? (
                                            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-yellow-400 text-slate-900 text-[10px] font-bold rounded shadow-sm">게시 판단 중</span>
                                         ) : (
                                            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded shadow-sm animate-pulse">LIVE</span>
                                         )}
                                    </div>
                                    <h4 className={`font-bold text-sm mb-1 line-clamp-1 ${isPending ? 'text-slate-500' : 'text-slate-800'}`}>{post.title}</h4>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-xs text-slate-500 font-medium">{post.author}</span>
                                        {!isPending && (
                                            <div className="flex gap-2">
                                                <HeadshotCounter count={post.heads} type="head" />
                                            </div>
                                        )}
                                    </div>
                                  </>
                              ) : (
                                  // Standard/Fun Card Layout
                                  <>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${
                                            activeTab === 'keuk' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                                        }`}>
                                            {activeTab === 'keuk' ? 'Humor' : 'Discussion'}
                                        </span>
                                        <span className="text-xs text-slate-400">{formatTime(post.createdAt)}</span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-sm mb-1">{post.title}</h4>
                                    <p className="text-xs text-slate-500 line-clamp-2">{post.content}</p>
                                    
                                    {/* Footer Stats */}
                                    <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                                            <span>{post.author}</span>
                                            <span>•</span>
                                            <span>{post.views > 999 ? (post.views/1000).toFixed(1)+'k' : post.views} views</span>
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

        {/* 5. Fixed Bottom CTA (Virtual Matching) - Visible only on Main View */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-6 bg-white/80 backdrop-blur-xl border-t border-white/50 z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
            <button
                onClick={handleVirtualMatching}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-2xl shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
            >
                {/* Shine effect */}
                <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:animate-shine" />
                
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Virtual Matching Start</span>
            </button>
        </div>

        {/* STREAM REGISTRATION FORM MODAL (Simple Overlay) */}
        {isStreamFormOpen && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[180] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                    <h3 className="text-lg font-black text-slate-800 mb-4">Register Stream</h3>
                    <form onSubmit={submitStreamRequest} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Stream Title</label>
                            <input 
                                type="text" 
                                value={streamTitle}
                                onChange={(e) => setStreamTitle(e.target.value)}
                                placeholder="e.g. Ranked Climb with Viewers"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Description / URL</label>
                            <textarea 
                                value={streamDesc}
                                onChange={(e) => setStreamDesc(e.target.value)}
                                placeholder="Twitch/Youtube URL and short description..."
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 h-24 resize-none"
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button 
                                type="button" 
                                onClick={() => setIsStreamFormOpen(false)}
                                className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl active:scale-95 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={isSubmittingStream || !streamTitle.trim()}
                                className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isSubmittingStream ? 'Submitting...' : 'Register'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* DETAIL VIEW OVERLAY */}
        <DetailView />

      </div>
    </>
  );
};
