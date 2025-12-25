
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../state/AppContext';
import { communityService } from '../services/communityService';
import { CommunityPost, BoardType, CommunityComment } from '../types';

type TabType = 'update' | 'balance' | 'keuk' | 'stream' | 'temp';

const PostDetailView: React.FC<{
  post: CommunityPost;
  onBack: () => void;
  isAdmin: boolean;
  isLoggedIn: boolean;
  userNickname: string;
  openAuthModal: () => void;
  openProfile: (nick: string) => void;
  refreshFeed: () => void;
  adminMenu: React.ReactNode;
}> = ({ post, onBack, isAdmin, isLoggedIn, userNickname, openAuthModal, openProfile, refreshFeed, adminMenu }) => {
  const [postState, setPostState] = useState<CommunityPost>(post);
  const [balanceVote, setBalanceVote] = useState<'BLUE' | 'RED' | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  useEffect(() => {
    communityService.getComments(post.id).then((data) => setComments(data));
    communityService.getBalanceVoteStatus(post.id).then((vote) => setBalanceVote(vote));
    setPostState(post);
  }, [post]);

  const handleReaction = async (type: 'HEAD' | 'HALF') => {
    if (!isLoggedIn) { openAuthModal(); return; }
    const result = await communityService.toggleReaction(postState.id, type);
    setPostState((prev) => ({ ...prev, heads: result.heads, halfshots: result.halfs }));
    refreshFeed();
  };

  const handleBalanceVote = async (team: 'BLUE' | 'RED') => {
    if (!isLoggedIn) { openAuthModal(); return; }
    const result = await communityService.castBalanceVote(postState.id, team);
    if (result.error) { alert(result.error); return; }
    setBalanceVote(result.userVote);
    setPostState((prev) => ({ ...prev, blueVotes: result.blue, redVotes: result.red }));
    refreshFeed();
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) { openAuthModal(); return; }
    if (!commentInput.trim() || isCommenting) return;
    setIsCommenting(true);
    const success = await communityService.createComment(postState.id, commentInput, userNickname);
    if (success) {
      setCommentInput('');
      const updated = await communityService.getComments(postState.id);
      setComments(updated);
      refreshFeed();
    }
    setIsCommenting(false);
  };

  const isBalanceBoard = postState.boardType === 'balance';
  const totalVotes = postState.blueVotes + postState.redVotes || 1;
  const bluePercent = (postState.blueVotes / totalVotes) * 100;
  const redPercent = (postState.redVotes / totalVotes) * 100;

  return (
    <div className="absolute inset-0 bg-white z-[170] flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden">
      <div className="flex-shrink-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-50 shadow-sm">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center -ml-2 text-slate-600 active:scale-90 transition-transform">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h3 className="text-sm font-black text-slate-800 truncate max-w-[180px]">{postState.title}</h3>
        <div className="flex items-center gap-2">
          {isAdmin && adminMenu}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain pb-32">
        {postState.thumbnail && <div className="w-full aspect-video bg-slate-100 overflow-hidden border-b"><img src={postState.thumbnail} alt="" className="w-full h-full object-cover" /></div>}
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2.5" onClick={() => openProfile(postState.author)}>
              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-sm font-black text-white cursor-pointer shadow-md">
                {postState.author[0].toUpperCase()}
              </div>
              <div className="flex flex-col cursor-pointer">
                <span className="text-sm font-black text-slate-900 hover:underline">{postState.author}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{postState.createdAt.split('T')[0]}</span>
              </div>
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
          <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed font-medium mb-12">
            <div dangerouslySetInnerHTML={{ __html: postState.content }}></div>
          </div>

          {isBalanceBoard && (
            <div className="mb-12 p-8 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 flex shadow-lg">
                <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${bluePercent}%` }}></div>
                <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${redPercent}%` }}></div>
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
            </div>
          )}

          <div className="border-t border-slate-100 pt-8">
            <h4 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-tighter">
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
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium pl-1">{comment.content}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleCommentSubmit} className="relative">
              <textarea 
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={isLoggedIn ? (balanceVote ? `${balanceVote} TEAM으로 자동 배정됩니다.` : "밸런스 투표 후 팀 배지가 부여됩니다.") : "로그인 후 참여하세요."}
                disabled={!isLoggedIn}
                className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-medium h-32 resize-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 outline-none border-dashed"
              ></textarea>
              <button 
                type="submit"
                disabled={!commentInput.trim() || isCommenting}
                className="absolute bottom-5 right-5 px-8 py-3.5 bg-slate-900 text-white text-[11px] font-black rounded-2xl shadow-xl disabled:opacity-50 active:scale-95 transition-transform"
              >
                {isCommenting ? '...' : 'POST'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {isBalanceBoard && (
        <div className="p-6 border-t border-slate-100 bg-white/95 backdrop-blur-2xl sticky bottom-0 z-[60] flex items-center gap-4">
          <button onClick={() => handleBalanceVote('BLUE')} disabled={!!balanceVote} className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-5 rounded-[2.5rem] border transition-all shadow-xl ${balanceVote === 'BLUE' ? 'bg-blue-600 border-blue-700 text-white' : 'bg-blue-50 border-blue-100 text-blue-600 active:scale-95 disabled:grayscale disabled:opacity-60'}`}>
            <span className="text-base font-black uppercase">좋다 (BLUE)</span>
          </button>
          <button onClick={() => handleBalanceVote('RED')} disabled={!!balanceVote} className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-5 rounded-[2.5rem] border transition-all shadow-xl ${balanceVote === 'RED' ? 'bg-red-600 border-red-700 text-white' : 'bg-red-50 border-red-100 text-red-600 active:scale-95 disabled:grayscale disabled:opacity-60'}`}>
            <span className="text-base font-black uppercase">안좋다 (RED)</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const CommunityPanel: React.FC = () => {
  const { 
    isCommunityOpen, closeCommunity, isLoggedIn, authUser, 
    userProfile, isAdmin, openCommunityUserProfile, openAuthModal 
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<TabType>('balance');
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [tabPosts, setTabPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openAdminMenuId, setOpenAdminMenuId] = useState<string | null>(null);
  const [isWriteFormOpen, setIsWriteFormOpen] = useState(false);
  const [writeTitle, setWriteTitle] = useState('');
  const [writeContent, setWriteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isCommunityOpen) {
      fetchTabContent(activeTab);
    }
  }, [isCommunityOpen, activeTab]);

  const fetchTabContent = (tab: TabType) => {
    setIsLoading(true);
    let queryType: BoardType = 'balance';
    if (tab === 'update') queryType = 'update';
    else if (tab === 'keuk') queryType = 'fun';
    else if (tab === 'stream') queryType = 'stream';
    else if (tab === 'temp') queryType = 'TEMP';
    
    communityService.getPosts(queryType).then((data) => {
      setTabPosts(data);
      setIsLoading(false);
    });
  };

  const handleAdminDelete = async (postId: string) => {
    if (!window.confirm("이 게시글을 영구 삭제하시겠습니까?")) return;
    const success = await communityService.deletePost(postId);
    if (success) {
        alert("게시글이 삭제되었습니다.");
        if (selectedPost?.id === postId) setSelectedPost(null);
        fetchTabContent(activeTab);
    }
    setOpenAdminMenuId(null);
  };

  const handleAdminMoveTemp = async (postId: string) => {
    if (!window.confirm("이 게시글을 임시 게시판으로 이동하시겠습니까?")) return;
    const success = await communityService.movePostToTemp(postId);
    if (success) {
        alert("임시 게시판으로 이동되었습니다.");
        if (selectedPost?.id === postId) setSelectedPost(null);
        fetchTabContent(activeTab);
    }
    setOpenAdminMenuId(null);
  };

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) { openAuthModal(); return; }
    if (!writeTitle.trim() || !writeContent.trim() || isSubmitting) return;

    // 권한 체크: 'update' 게시판은 오직 어드민만 가능
    if (activeTab === 'update' && !isAdmin) {
        alert("업데이트 공지는 관리자만 작성 가능합니다.");
        return;
    }

    setIsSubmitting(true);
    try {
      const author = userProfile?.nickname || authUser?.name || 'Unknown';
      let boardType: BoardType = 'balance';
      if (activeTab === 'update') boardType = 'update';
      else if (activeTab === 'keuk') boardType = 'fun';
      else if (activeTab === 'stream') boardType = 'stream';
      else if (activeTab === 'temp') boardType = 'TEMP';

      const success = await communityService.createPost({ title: writeTitle, content: writeContent, author, boardType });
      if (success) {
        setWriteTitle(''); setWriteContent(''); setIsWriteFormOpen(false);
        fetchTabContent(activeTab);
      }
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  const AdminPostMenu = ({ postId }: { postId: string }) => {
    const isOpen = openAdminMenuId === postId;
    return (
      <div className="relative">
        <button onClick={(e) => { e.stopPropagation(); setOpenAdminMenuId(isOpen ? null : postId); }} className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${isOpen ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
        </button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-xl z-[300] overflow-hidden">
            <button onClick={(e) => { e.stopPropagation(); handleAdminMoveTemp(postId); }} className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-slate-50 border-b flex items-center gap-2">📦 임시 게시판 이동</button>
            <button onClick={(e) => { e.stopPropagation(); handleAdminDelete(postId); }} className="w-full px-4 py-3 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">🗑️ 영구 삭제</button>
          </div>
        )}
      </div>
    );
  };

  const baseTabs: TabType[] = ['update', 'balance', 'keuk', 'stream'];
  const tabs = isAdmin ? [...baseTabs, 'temp' as TabType] : baseTabs;

  // 글쓰기 권한 판별
  const canWriteOnCurrentTab = activeTab === 'update' || activeTab === 'temp' ? isAdmin : true;
  const currentBoardLabel = activeTab === 'update' ? '업데이트 공지' : activeTab === 'balance' ? '밸런스 토론' : activeTab === 'keuk' ? '큭큭 게시판' : activeTab === 'stream' ? '홍보 게시판' : '임시 게시판';

  return (
    <>
      <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] transition-opacity duration-500 ${isCommunityOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={closeCommunity}></div>

      <div className={`fixed inset-0 z-[160] flex flex-col bg-slate-50/95 transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isCommunityOpen ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex-shrink-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-30 relative shadow-sm">
           <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2"><span className="text-yellow-500 text-2xl">●</span> 커뮤니티</h2>
           <button onClick={closeCommunity} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 active:scale-90 transition-transform">
             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-5 pb-32 space-y-6">
           <div className="sticky top-0 z-20 py-2 bg-slate-50/95 backdrop-blur-sm">
             <div className="flex p-1.5 bg-white border border-slate-200 rounded-[1.5rem] shadow-lg overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-shrink-0 px-6 py-3 rounded-2xl text-[11px] font-black transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
                      {tab === 'update' ? '업데이트' : tab === 'balance' ? '밸런스' : tab === 'keuk' ? '큭큭' : tab === 'stream' ? '홍보' : '임시'}
                    </button>
                ))}
             </div>
           </div>

           <div className="space-y-4 min-h-[400px]">
              {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-32 space-y-4">
                      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Loading Feed...</p>
                  </div>
              ) : tabPosts.length === 0 ? (
                  <div className="text-center py-24 text-slate-300 font-bold text-sm bg-white/40 border-2 border-dashed border-slate-200 rounded-[2.5rem]">이 게시판에 글이 없습니다.</div>
              ) : tabPosts.map((post) => (
                  <div key={post.id} onClick={() => setSelectedPost(post)} className={`p-6 rounded-[2rem] border relative transition-all active:scale-[0.98] ${post.boardType === 'update' ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-800 border-slate-200 shadow-md'}`}>
                      {isAdmin && <div className="absolute top-6 right-6 z-20"><AdminPostMenu postId={post.id} /></div>}
                      {post.boardType === 'update' && <span className="text-[9px] font-black text-yellow-400 uppercase tracking-widest mb-2 block">Official Update</span>}
                      <h4 className={`font-black text-lg mb-4 line-clamp-2 ${post.boardType === 'update' ? 'text-white' : 'text-slate-800'}`}>{post.title}</h4>
                      <div className={`pt-5 border-t flex items-center justify-between text-[11px] font-bold ${post.boardType === 'update' ? 'border-white/10 text-slate-400' : 'border-slate-50 text-slate-400'}`}>
                          <span onClick={(e) => { e.stopPropagation(); openCommunityUserProfile(post.author); }} className={`${post.boardType === 'update' ? 'text-yellow-400' : 'text-slate-900'} hover:underline cursor-pointer`}>{post.author}</span>
                          <div className="flex gap-2">
                            {post.boardType === 'balance' ? `B:${post.blueVotes} R:${post.redVotes}` : `🎯:${post.heads} 🛡️:${post.halfshots}`}
                          </div>
                      </div>
                  </div>
              ))}
           </div>
        </div>

        {/* 탭별 권한이 적용된 유동적인 글쓰기 버튼 */}
        {canWriteOnCurrentTab && (
            <div className="absolute bottom-10 right-6 z-40">
                <button 
                    onClick={() => { if(!isLoggedIn) openAuthModal(); else setIsWriteFormOpen(true); }} 
                    className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center border-4 border-white/20 active:scale-95 transition-all ${activeTab === 'update' ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white'}`}
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>
        )}

        {isWriteFormOpen && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl relative">
                    <div className="mb-8">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest px-3 py-1 bg-blue-50 rounded-full">{currentBoardLabel}</span>
                        <h3 className="text-2xl font-black text-slate-900 mt-2">새 게시글 작성</h3>
                    </div>
                    <form onSubmit={submitPost} className="space-y-5">
                        <input type="text" value={writeTitle} onChange={(e) => setWriteTitle(e.target.value)} placeholder="제목을 입력하세요" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all" />
                        <textarea value={writeContent} onChange={(e) => setWriteContent(e.target.value)} placeholder="내용을 입력하세요" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium h-56 resize-none outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all"></textarea>
                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={() => setIsWriteFormOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black text-sm rounded-2xl hover:bg-slate-200 transition-colors">취소</button>
                            <button type="submit" disabled={!writeTitle || !writeContent || isSubmitting} className={`flex-[1.5] py-4 text-white font-black text-sm rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50 ${activeTab === 'update' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
                                {isSubmitting ? '전송 중...' : '등록하기'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {selectedPost && (
          <PostDetailView 
            post={selectedPost} 
            onBack={() => setSelectedPost(null)} 
            isAdmin={isAdmin} 
            isLoggedIn={isLoggedIn}
            userNickname={userProfile?.nickname || authUser?.name || 'Unknown'}
            openAuthModal={openAuthModal}
            openProfile={openCommunityUserProfile}
            refreshFeed={() => fetchTabContent(activeTab)}
            adminMenu={<AdminPostMenu postId={selectedPost.id} />}
          />
        )}
      </div>
    </>
  );
};
