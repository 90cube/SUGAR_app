
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../state/AppContext';
import { communityService } from '../services/communityService';
import { CommunityPost, BoardType, CommunityComment } from '../types';

type TabType = 'balance' | 'keuk' | 'stream';

export const CommunityPanel: React.FC = () => {
  const { 
    isCommunityOpen, closeCommunity, isLoggedIn, authUser, 
    userProfile, openVirtualMatchingModal, isAdmin, 
    openCommunityUserProfile, openAuthModal 
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<TabType>('balance');
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

  const [updatePosts, setUpdatePosts] = useState<CommunityPost[]>([]);
  const [tabPosts, setTabPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatesExpanded, setIsUpdatesExpanded] = useState(false);
  const [openAdminMenuId, setOpenAdminMenuId] = useState<string | null>(null);

  const [isWriteFormOpen, setIsWriteFormOpen] = useState(false);
  const [writeTitle, setWriteTitle] = useState('');
  const [writeContent, setWriteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isCommunityOpen) {
        communityService.getPosts('update').then((data) => setUpdatePosts(data));
        fetchTabContent(activeTab);
    }
  }, [isCommunityOpen]);

  useEffect(() => {
    if (isCommunityOpen) fetchTabContent(activeTab);
  }, [activeTab]);

  const fetchTabContent = (tab: TabType) => {
    setIsLoading(true);
    let queryType: BoardType = tab === 'keuk' ? 'fun' : tab === 'stream' ? 'stream' : 'balance';
    communityService.getPosts(queryType).then((data) => {
        setTabPosts(data);
        setIsLoading(false);
    });
  };

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) { openAuthModal(); return; }
    if (!writeTitle.trim() || !writeContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const author = userProfile?.nickname || authUser?.name || 'Unknown';
      const boardType: BoardType = activeTab === 'keuk' ? 'fun' : activeTab === 'stream' ? 'stream' : 'balance';
      const success = await communityService.createPost({ title: writeTitle, content: writeContent, author, boardType });

      if (success) {
          setWriteTitle(''); setWriteContent(''); setIsWriteFormOpen(false);
          fetchTabContent(activeTab);
      }
    } catch (error) { console.error(error); } finally { setIsSubmitting(false); }
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

  const AdminPostMenu = ({ postId }: { postId: string }) => {
      if (!isAdmin) return null;
      const isOpen = openAdminMenuId === postId;
      return (
          <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setOpenAdminMenuId(isOpen ? null : postId); }} className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${isOpen ? 'bg-slate-900 text-white shadow-lg' : 'bg-white/80 text-slate-400 border border-slate-200'}`}><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg></button>
              {isOpen && (
                  <div className="absolute right-0 mt-2 w-32 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[300] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <button onClick={async (e) => { e.stopPropagation(); await communityService.updatePostStatus(postId, 'HIDDEN'); fetchTabContent(activeTab); setOpenAdminMenuId(null); }} className="w-full px-4 py-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-50 flex items-center gap-2">임시조치</button>
                      <button onClick={async (e) => { e.stopPropagation(); if(window.confirm("삭제하시겠습니까?")) { await communityService.deletePost(postId); fetchTabContent(activeTab); setOpenAdminMenuId(null); } }} className="w-full px-4 py-3 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">삭제</button>
                  </div>
              )}
          </div>
      );
  };

  const DetailView = () => {
    const [postState, setPostState] = useState<CommunityPost | null>(selectedPost);
    const [balanceVote, setBalanceVote] = useState<'BLUE' | 'RED' | null>(null);
    const [comments, setComments] = useState<CommunityComment[]>([]);
    const [commentInput, setCommentInput] = useState('');
    const [isCommenting, setIsCommenting] = useState(false);

    useEffect(() => {
        if (selectedPost) {
            communityService.getComments(selectedPost.id).then((data) => setComments(data));
            communityService.getBalanceVoteStatus(selectedPost.id).then((vote) => setBalanceVote(vote));
            setPostState(selectedPost);
        }
    }, [selectedPost]);

    const handleReaction = async (type: 'HEAD' | 'HALF') => {
        if (!isLoggedIn) { openAuthModal(); return; }
        const result = await communityService.toggleReaction(postState!.id, type);
        setPostState((prev) => prev ? { ...prev, heads: result.heads, halfshots: result.halfs } : null);
        fetchTabContent(activeTab);
    };

    const handleBalanceVote = async (team: 'BLUE' | 'RED') => {
        if (!isLoggedIn) { openAuthModal(); return; }
        const result = await communityService.castBalanceVote(postState!.id, team);
        if (result.error) { alert(result.error); return; }
        
        setBalanceVote(result.userVote);
        setPostState((prev) => prev ? { ...prev, blueVotes: result.blue, redVotes: result.red } : null);
        fetchTabContent(activeTab);
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoggedIn) { openAuthModal(); return; }
        if (!commentInput.trim() || isCommenting) return;

        setIsCommenting(true);
        const nickname = userProfile?.nickname || authUser?.name || 'Unknown';
        const success = await communityService.createComment(postState!.id, commentInput, nickname);
        
        if (success) {
            setCommentInput('');
            const updated = await communityService.getComments(postState!.id);
            setComments(updated);
            fetchTabContent(activeTab);
        }
        setIsCommenting(false);
    };

    if (!selectedPost || !postState) return null;

    const isBalanceBoard = postState.boardType === 'balance';

    return (
      <div className="absolute inset-0 bg-white z-[170] flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-50 shadow-sm">
           <button onClick={() => setSelectedPost(null)} className="w-10 h-10 flex items-center justify-center -ml-2 text-slate-600 active:scale-90 transition-transform"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
           <h3 className="text-sm font-black text-slate-800 truncate max-w-[180px]">{postState.title}</h3>
           <div className="flex items-center gap-2">
               {isAdmin && <AdminPostMenu postId={postState.id} />}
           </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain pb-32">
           {postState.thumbnail && <div className="w-full aspect-video bg-slate-100 overflow-hidden border-b"><img src={postState.thumbnail} alt="" className="w-full h-full object-cover" /></div>}
           <div className="p-6">
              {/* Reactions */}
              <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2.5" onClick={() => openCommunityUserProfile(postState.author)}>
                      <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-sm font-black text-white cursor-pointer shadow-md">{postState.author[0].toUpperCase()}</div>
                      <div className="flex flex-col cursor-pointer"><span className="text-sm font-black text-slate-900 hover:underline">{postState.author}</span><span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{postState.createdAt.split('T')[0]}</span></div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                      <div className="flex gap-2">
                        <button onClick={() => handleReaction('HEAD')} title="헤드샷 (추천)" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-orange-50 transition-colors shadow-sm active:scale-90 flex items-center gap-1.5">
                            <span className="text-lg">🎯</span>
                            <span className="text-xs font-black text-slate-700">{postState.heads}</span>
                        </button>
                        <button onClick={() => handleReaction('HALF')} title="반샷 (비추천)" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shadow-sm active:scale-90 flex items-center gap-1.5">
                            <span className="text-lg">🛡️</span>
                            <span className="text-xs font-black text-slate-700">{postState.halfshots}</span>
                        </button>
                      </div>
                      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Post Quality</span>
                  </div>
              </div>

              <h1 className="text-2xl font-black text-slate-900 mb-6 leading-tight tracking-tight">{postState.title}</h1>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed font-medium mb-12 font-['Pretendard']"><div dangerouslySetInnerHTML={{ __html: postState.content }} /></div>
              
              {/* Vote Visualizer */}
              {isBalanceBoard && (
                <div className="mb-12 p-8 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 flex shadow-lg">
                        <div className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_15px_rgba(59,130,246,0.5)]" style={{ width: `${(postState.blueVotes / (postState.blueVotes + postState.redVotes || 1)) * 100}%` }} />
                        <div className="h-full bg-red-500 transition-all duration-1000 shadow-[0_0_15px_rgba(239,68,68,0.5)]" style={{ width: `${(postState.redVotes / (postState.blueVotes + postState.redVotes || 1)) * 100}%` }} />
                    </div>
                    <div className="flex justify-between items-center mt-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">BLUE TEAM</span>
                            <div className="text-3xl font-black">{postState.blueVotes} <span className="text-xs text-slate-500 font-bold tracking-tighter uppercase">Votes</span></div>
                        </div>
                        <div className="text-xs font-black italic text-slate-600">VERSUS</div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">RED TEAM</span>
                            <div className="text-3xl font-black">{postState.redVotes} <span className="text-xs text-slate-500 font-bold tracking-tighter uppercase">Votes</span></div>
                        </div>
                    </div>
                    <div className="text-center mt-6 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] animate-pulse">투표 시 댓글에 팀 배지가 자동으로 부여됩니다.</div>
                </div>
              )}

              {/* Discussion */}
              <div className="border-t border-slate-100 pt-8">
                  <h4 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-tighter">
                      <svg className="w-4 h-4 text-slate-300" fill="currentColor" viewBox="0 0 20 20"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" /></svg>
                      Discussion ({comments.length})
                  </h4>
                  
                  <div className="space-y-4 mb-10">
                      {comments.map((comment) => (
                          <div key={comment.id} className={`p-4 rounded-[2rem] relative group border shadow-sm transition-all ${comment.teamType === 'BLUE' ? 'bg-blue-50/70 border-blue-100' : comment.teamType === 'RED' ? 'bg-red-50/70 border-red-100' : 'bg-white border-slate-100'}`}>
                              <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full text-white shadow-sm uppercase tracking-tighter ${comment.teamType === 'BLUE' ? 'bg-blue-600' : comment.teamType === 'RED' ? 'bg-red-600' : 'bg-slate-400'}`}>
                                          {comment.teamType} TEAM
                                      </span>
                                      <span className="text-xs font-black text-slate-900">{comment.authorNickname}</span>
                                  </div>
                                  <span className="text-[9px] text-slate-400 font-bold">{formatTime(comment.createdAt)}</span>
                              </div>
                              <p className="text-sm text-slate-700 leading-relaxed font-medium pl-1">{comment.content}</p>
                          </div>
                      ))}
                      {comments.length === 0 && <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-[3rem] font-black text-slate-300 uppercase text-[10px] tracking-widest">No conversation yet.</div>}
                  </div>

                  <form onSubmit={handleCommentSubmit} className="relative">
                      <textarea 
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder={isLoggedIn ? (balanceVote ? `${balanceVote} TEAM으로 자동 배정됩니다.` : "밸런스 투표를 마치면 팀 배지가 부여됩니다.") : "로그인 후 토론에 참여하세요."}
                        disabled={!isLoggedIn}
                        className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-medium h-32 resize-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all outline-none border-dashed"
                      />
                      <button 
                        type="submit"
                        disabled={!commentInput.trim() || isCommenting}
                        className="absolute bottom-5 right-5 px-8 py-3.5 bg-slate-900 text-white text-[11px] font-black rounded-2xl shadow-xl disabled:opacity-50 active:scale-95 transition-transform"
                      >
                        {isCommenting ? '...' : 'REGISTER'}
                      </button>
                  </form>
              </div>
           </div>
        </div>

        {isBalanceBoard && (
            <div className="p-6 border-t border-slate-100 bg-white/95 backdrop-blur-2xl sticky bottom-0 z-[60] flex items-center gap-4">
                <button 
                    onClick={() => handleBalanceVote('BLUE')} 
                    disabled={!!balanceVote}
                    className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-5 rounded-[2.5rem] border transition-all shadow-xl ${balanceVote === 'BLUE' ? 'bg-blue-600 border-blue-700 text-white' : 'bg-blue-50 border-blue-100 text-blue-600 active:scale-95 disabled:grayscale disabled:opacity-60'}`}
                >
                    <span className="text-[10px] font-black uppercase tracking-tighter opacity-80">{balanceVote === 'BLUE' ? 'Selected' : 'Blue'}</span>
                    <span className="text-base font-black uppercase">좋다 (BLUE)</span>
                </button>
                <div className="text-xs font-black text-slate-300 italic">VS</div>
                <button 
                    onClick={() => handleBalanceVote('RED')} 
                    disabled={!!balanceVote}
                    className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-5 rounded-[2.5rem] border transition-all shadow-xl ${balanceVote === 'RED' ? 'bg-red-600 border-red-700 text-white' : 'bg-red-50 border-red-100 text-red-600 active:scale-95 disabled:grayscale disabled:opacity-60'}`}
                >
                    <span className="text-[10px] font-black uppercase tracking-tighter opacity-80">{balanceVote === 'RED' ? 'Selected' : 'Red'}</span>
                    <span className="text-base font-black uppercase">안좋다 (RED)</span>
                </button>
            </div>
        )}
      </div>
    );
  };

  const displayUpdates = isUpdatesExpanded ? updatePosts : updatePosts.slice(0, 1);

  return (
    <>
      <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] transition-opacity duration-500 ${isCommunityOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={closeCommunity} />

      <div className={`fixed inset-0 z-[160] flex flex-col bg-slate-50/95 transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isCommunityOpen ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex-shrink-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-30 relative shadow-sm">
           <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2"><span className="text-yellow-500 text-2xl">●</span> 커뮤니티</h2>
           <button onClick={closeCommunity} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 active:scale-90 transition-transform"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-5 pb-32 space-y-6">
           <section>
              <div className="flex items-center justify-between mb-4 px-1">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">오늘의 업데이트</h3>
                 <button onClick={() => setIsUpdatesExpanded(!isUpdatesExpanded)} className="text-[9px] font-black bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full uppercase hover:bg-slate-300 transition-colors">{isUpdatesExpanded ? '접기' : '전체보기'}</button>
              </div>
              <div className="space-y-3">
                {displayUpdates.map((post) => (
                    <div key={post.id} onClick={() => setSelectedPost(post)} className="w-full flex flex-col bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200/50 group relative animate-in fade-in duration-500">
                        {isAdmin && <div className="absolute top-4 right-4 z-20"><AdminPostMenu postId={post.id} /></div>}
                        {post.thumbnail && <div className="w-full aspect-video bg-slate-200 overflow-hidden"><img src={post.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" /></div>}
                        <div className="p-6">
                            <h4 className="font-black text-slate-900 text-lg mb-2 group-hover:text-blue-600 transition-colors">{post.title}</h4>
                            <div className="flex items-center justify-between">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{post.createdAt.split('T')[0]}</div>
                                <div className="flex gap-2">
                                    <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 rounded-lg text-slate-500">🎯 {post.heads}</span>
                                    <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 rounded-lg text-slate-500">🛡️ {post.halfshots}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
              </div>
           </section>

           <div className="sticky top-0 z-20 py-2 bg-slate-50/95 backdrop-blur-sm">
             <div className="flex p-1.5 bg-white border border-slate-200 rounded-[1.5rem] shadow-lg ring-1 ring-black/5">
                {(['balance', 'keuk', 'stream'] as const).map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}>{tab === 'balance' ? '밸런스' : tab === 'keuk' ? '큭큭' : '홍보'}</button>
                ))}
             </div>
           </div>

           <div className="space-y-4 min-h-[400px]">
              {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-32 space-y-4">
                      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Feed Loading...</p>
                  </div>
              ) : tabPosts.length === 0 ? (
                  <div className="text-center py-24 border-2 border-dashed border-slate-200 rounded-3xl font-black text-slate-300 uppercase text-xs">작성된 글이 없습니다.</div>
              ) : tabPosts.map((post, idx) => (
                  <div 
                    key={post.id} 
                    onClick={() => setSelectedPost(post)} 
                    style={{ animationDelay: `${idx * 50}ms` }}
                    className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-md hover:shadow-xl hover:border-slate-300 transition-all active:scale-[0.98] group relative animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards"
                  >
                      {isAdmin && <div className="absolute top-6 right-6 z-20"><AdminPostMenu postId={post.id} /></div>}
                      <div className="flex justify-between items-start mb-4">
                          <span className={`px-3 py-1.5 text-[9px] font-black rounded-full uppercase tracking-tighter ${activeTab === 'keuk' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{activeTab === 'keuk' ? 'FUN' : 'DEBATE'}</span>
                          <span className="text-[10px] font-bold text-slate-400">{formatTime(post.createdAt)}</span>
                      </div>
                      <h4 className="font-black text-slate-800 text-lg mb-4 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">{post.title}</h4>
                      <div className="pt-5 border-t border-slate-50 flex items-center justify-between">
                          <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400">
                              <span onClick={(e) => { e.stopPropagation(); openCommunityUserProfile(post.author); }} className="text-slate-900 hover:text-blue-600 cursor-pointer underline underline-offset-4 decoration-2 decoration-slate-200">{post.author}</span>
                              <span className="opacity-30">•</span>
                              <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" /></svg>{post.commentCount}</span>
                          </div>
                          <div className="flex gap-2">
                              {post.boardType === 'balance' ? (
                                  <div className="flex gap-1.5">
                                      <span className="text-[9px] font-black px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded border border-blue-200">B {post.blueVotes}</span>
                                      <span className="text-[9px] font-black px-1.5 py-0.5 bg-red-100 text-red-700 rounded border border-red-200">R {post.redVotes}</span>
                                  </div>
                              ) : (
                                  <div className="flex gap-1.5">
                                      <span className="text-[9px] font-bold text-slate-400 tracking-tighter">🎯 {post.heads}</span>
                                      <span className="text-[9px] font-bold text-slate-400 tracking-tighter">🛡️ {post.halfshots}</span>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              ))}
           </div>
        </div>

        <div className="absolute bottom-10 right-6 z-40">
            <button onClick={() => { if(!isLoggedIn) openAuthModal(); else setIsWriteFormOpen(true); }} className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-4 border-white/20">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            </button>
        </div>

        {isWriteFormOpen && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 relative">
                    <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                        <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                        New Story
                    </h3>
                    <form onSubmit={submitPost} className="space-y-5">
                        <input type="text" value={writeTitle} onChange={(e) => setWriteTitle(e.target.value)} placeholder="제목" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all" />
                        <textarea value={writeContent} onChange={(e) => setWriteContent(e.target.value)} placeholder="내용" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium h-56 resize-none outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all" />
                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={() => setIsWriteFormOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black text-sm rounded-2xl hover:bg-slate-200 transition-colors">CANCEL</button>
                            <button type="submit" disabled={!writeTitle || !writeContent || isSubmitting} className="flex-[1.5] py-4 bg-slate-900 text-white font-black text-sm rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50">SUBMIT</button>
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
