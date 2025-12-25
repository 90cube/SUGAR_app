
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../state/AppContext';
import { communityService } from '../services/communityService';
import { CommunityPost, BoardType, CommunityComment } from '../types';

type TabType = 'balance' | 'keuk' | 'stream' | 'temp';

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
    setPostState((prev) => ({ ...prev, heads: result.heads, halfshots: result.halfshots }));
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

  return (
    <div className="absolute inset-0 bg-white z-[170] flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden">
      <div className="flex-shrink-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-50 shadow-sm">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center -ml-2 text-slate-600 active:scale-90 transition-transform">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h3 className="text-sm font-black text-slate-800 truncate max-w-[180px]">{postState.title}</h3>
        <div className="flex items-center gap-2">{isAdmin && adminMenu}</div>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain pb-32">
        {postState.thumbnail && <div className="w-full aspect-video bg-slate-100 overflow-hidden border-b"><img src={postState.thumbnail} alt="" className="w-full h-full object-cover" /></div>}
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2.5" onClick={() => openProfile(postState.author)}>
              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-sm font-black text-white cursor-pointer shadow-md">{postState.author[0].toUpperCase()}</div>
              <div className="flex flex-col cursor-pointer">
                <span className="text-sm font-black text-slate-900 hover:underline">{postState.author}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{postState.createdAt.split('T')[0]}</span>
              </div>
            </div>
            <div className="flex gap-2">
               <button onClick={() => handleReaction('HEAD')} className="p-2 bg-white border border-slate-200 rounded-xl flex items-center gap-1.5"><span className="text-lg">🎯</span><span className="text-xs font-black">{postState.heads}</span></button>
               <button onClick={() => handleReaction('HALF')} className="p-2 bg-white border border-slate-200 rounded-xl flex items-center gap-1.5"><span className="text-lg">🛡️</span><span className="text-xs font-black">{postState.halfshots}</span></button>
            </div>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-6 leading-tight">{postState.title}</h1>
          <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed font-medium mb-12" dangerouslySetInnerHTML={{ __html: postState.content }}></div>
          
          {postState.boardType === 'balance' && (
            <div className="mb-12 p-8 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden text-center">
                <div className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">현재 투표 현황</div>
                <div className="flex justify-around items-center">
                    <div><div className="text-3xl font-black">{postState.blueVotes}</div><div className="text-[10px] font-bold opacity-50">BLUE</div></div>
                    <div className="w-px h-10 bg-white/10"></div>
                    <div><div className="text-3xl font-black">{postState.redVotes}</div><div className="text-[10px] font-bold opacity-50">RED</div></div>
                </div>
            </div>
          )}
          
          <div className="border-t border-slate-100 pt-8">
            <h4 className="text-sm font-black text-slate-900 mb-6 uppercase tracking-tighter">Discussion ({comments.length})</h4>
            <div className="space-y-4 mb-10">
              {comments.map((comment) => (
                <div key={comment.id} className="p-4 rounded-[2rem] bg-slate-50 border border-slate-100">
                  <div className="text-xs font-black text-slate-900 mb-1">{comment.authorNickname}</div>
                  <p className="text-sm text-slate-700 font-medium">{comment.content}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleCommentSubmit} className="relative">
              <textarea value={commentInput} onChange={(e) => setCommentInput(e.target.value)} placeholder="의견을 남겨주세요." className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm h-32 resize-none focus:bg-white outline-none" />
              <button type="submit" disabled={!commentInput.trim() || isCommenting} className="absolute bottom-5 right-5 px-8 py-3.5 bg-slate-900 text-white text-[11px] font-black rounded-2xl">POST</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CommunityPanel: React.FC = () => {
  const { isCommunityOpen, closeCommunity, isLoggedIn, authUser, userProfile, isAdmin, openCommunityUserProfile, openAuthModal } = useApp();
  
  const [activeTab, setActiveTab] = useState<TabType>('balance');
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [updatePosts, setUpdatePosts] = useState<CommunityPost[]>([]);
  const [tabPosts, setTabPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openAdminMenuId, setOpenAdminMenuId] = useState<string | null>(null);
  
  const [isWriteFormOpen, setIsWriteFormOpen] = useState(false);
  const [writeMode, setWriteMode] = useState<BoardType>('balance');
  const [writeTitle, setWriteTitle] = useState('');
  const [writeContent, setWriteContent] = useState('');
  const [writeThumbnail, setWriteThumbnail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isCommunityOpen) {
      communityService.getPosts('update').then(setUpdatePosts);
      fetchTabContent(activeTab);
    }
  }, [isCommunityOpen, activeTab]);

  const fetchTabContent = (tab: TabType) => {
    setIsLoading(true);
    let queryType: BoardType = 'balance';
    if (tab === 'keuk') queryType = 'fun';
    else if (tab === 'stream') queryType = 'stream';
    else if (tab === 'temp') queryType = 'TEMP';
    
    communityService.getPosts(queryType).then((data) => {
      setTabPosts(data);
      setIsLoading(false);
    });
  };

  const handleAdminAction = async (postId: string, action: 'DELETE' | 'TEMP') => {
    if (!window.confirm("정말 처리하시겠습니까?")) return;
    const success = action === 'DELETE' ? await communityService.deletePost(postId) : await communityService.movePostToTemp(postId);
    if (success) {
        alert("처리 완료");
        fetchTabContent(activeTab);
        communityService.getPosts('update').then(setUpdatePosts);
        if (selectedPost?.id === postId) setSelectedPost(null);
    }
    setOpenAdminMenuId(null);
  };

  const openWriteForm = (mode: BoardType) => {
    if (!isLoggedIn) { openAuthModal(); return; }
    setWriteMode(mode);
    setIsWriteFormOpen(true);
  };

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!writeTitle.trim() || !writeContent.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const author = userProfile?.nickname || authUser?.name || 'Unknown';
      const success = await communityService.createPost({ 
        title: writeTitle, content: writeContent, author, boardType: writeMode, thumbnail: writeThumbnail 
      });
      if (success) {
        setWriteTitle(''); setWriteContent(''); setWriteThumbnail(''); setIsWriteFormOpen(false);
        if (writeMode === 'update') communityService.getPosts('update').then(setUpdatePosts);
        else fetchTabContent(activeTab);
      }
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  const AdminPostMenu = ({ postId }: { postId: string }) => {
    const isOpen = openAdminMenuId === postId;
    return (
      <div className="relative">
        <button onClick={(e) => { e.stopPropagation(); setOpenAdminMenuId(isOpen ? null : postId); }} className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${isOpen ? 'bg-slate-900 text-white' : 'bg-white/80 backdrop-blur-md border border-slate-200'}`}>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
        </button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-xl z-[300] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button onClick={(e) => { e.stopPropagation(); handleAdminAction(postId, 'TEMP'); }} className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-slate-50 border-b flex items-center gap-2">📦 임시 이동</button>
            <button onClick={(e) => { e.stopPropagation(); handleAdminAction(postId, 'DELETE'); }} className="w-full px-4 py-3 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">🗑️ 영구 삭제</button>
          </div>
        )}
      </div>
    );
  };

  const baseTabs: TabType[] = ['balance', 'keuk', 'stream'];
  const tabs = isAdmin ? [...baseTabs, 'temp' as TabType] : baseTabs;
  const latestUpdate = updatePosts[0];

  return (
    <>
      <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] transition-opacity duration-500 ${isCommunityOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={closeCommunity}></div>

      <div className={`fixed inset-0 z-[160] flex flex-col bg-slate-50 transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isCommunityOpen ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex-shrink-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-30 shadow-sm">
           <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2"><span className="text-yellow-500 text-2xl">●</span> 커뮤니티</h2>
           <button onClick={closeCommunity} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 active:scale-90 transition-transform">
             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pb-32 space-y-8">
           {/* Section 1: Hero Update (16:9 관리자 전용) */}
           <section className="space-y-4">
              <div className="flex items-center justify-between">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">최신 업데이트</h3>
                 <div className="flex gap-2">
                    {isAdmin && (
                        <button onClick={() => openWriteForm('update')} className="text-[9px] font-black bg-yellow-400 text-slate-900 px-3 py-1.5 rounded-full uppercase shadow-lg shadow-yellow-500/20 transition-transform active:scale-95">NEW NOTICE</button>
                    )}
                    <button onClick={() => { setActiveTab('temp'); /* 임시로 목록 기능 연결 */ }} className="text-[9px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-full uppercase transition-transform active:scale-95">목록보기</button>
                 </div>
              </div>
              
              {latestUpdate ? (
                  <div onClick={() => setSelectedPost(latestUpdate)} className="relative aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 group cursor-pointer transition-transform active:scale-[0.98]">
                      {latestUpdate.thumbnail ? (
                          <img src={latestUpdate.thumbnail} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                      ) : (
                          <div className="absolute inset-0 bg-slate-900"></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                      <div className="absolute bottom-0 left-0 p-8 w-full">
                          <span className="inline-block px-3 py-1 bg-yellow-400 text-slate-900 text-[9px] font-black rounded-full uppercase tracking-widest mb-3">Official Notice</span>
                          <h4 className="text-white text-2xl font-black leading-tight drop-shadow-md line-clamp-2">{latestUpdate.title}</h4>
                      </div>
                      {isAdmin && <div className="absolute top-6 right-6 z-20"><AdminPostMenu postId={latestUpdate.id} /></div>}
                  </div>
              ) : (
                  <div className="aspect-video rounded-[2.5rem] bg-slate-200 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 font-bold text-sm">등록된 업데이트가 없습니다.</div>
              )}
           </section>

           {/* Section 2: General Community Tabs */}
           <div className="space-y-6">
               <div className="sticky top-0 z-20 py-2 bg-slate-50/95 backdrop-blur-sm">
                 <div className="flex p-1.5 bg-white border border-slate-200 rounded-[1.5rem] shadow-lg">
                    {tabs.map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 rounded-2xl text-[11px] font-black transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
                          {tab === 'balance' ? '밸런스' : tab === 'keuk' ? '큭큭' : tab === 'stream' ? '홍보' : '임시'}
                        </button>
                    ))}
                 </div>
               </div>

               <div className="space-y-4 min-h-[400px]">
                  {isLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 space-y-3">
                          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                          <p className="text-[10px] font-black text-slate-300 uppercase">Syncing Feed...</p>
                      </div>
                  ) : tabPosts.length === 0 ? (
                      <div className="text-center py-24 text-slate-300 font-bold text-sm bg-white/40 border-2 border-dashed border-slate-200 rounded-[2.5rem]">이 게시판에 글이 없습니다.</div>
                  ) : tabPosts.map((post) => (
                      <div key={post.id} onClick={() => setSelectedPost(post)} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-md relative transition-all active:scale-[0.98]">
                          {isAdmin && <div className="absolute top-6 right-6 z-20"><AdminPostMenu postId={post.id} /></div>}
                          <h4 className="font-black text-slate-800 text-lg mb-4 line-clamp-2">{post.title}</h4>
                          <div className="pt-5 border-t border-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-400">
                              <span onClick={(e) => { e.stopPropagation(); openCommunityUserProfile(post.author); }} className="text-slate-900 hover:underline cursor-pointer">{post.author}</span>
                              <div className="flex gap-2">
                                {post.boardType === 'balance' ? `B:${post.blueVotes} R:${post.redVotes}` : `🎯:${post.heads} 🛡️:${post.halfshots}`}
                              </div>
                          </div>
                      </div>
                  ))}
               </div>
           </div>
        </div>

        {/* Global Write Button (Based on active tab) */}
        {activeTab !== 'temp' && (
            <div className="absolute bottom-10 right-6 z-40">
                <button 
                    onClick={() => openWriteForm(activeTab === 'keuk' ? 'fun' : activeTab === 'stream' ? 'stream' : 'balance')} 
                    className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center border-4 border-white/20 active:scale-95 transition-all"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>
        )}

        {/* Write Post Form */}
        {isWriteFormOpen && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl relative">
                    <div className="mb-8">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest px-3 py-1 bg-blue-50 rounded-full">
                           {writeMode === 'update' ? '관리자 공지 작성' : '새 게시글 작성'}
                        </span>
                        <h3 className="text-2xl font-black text-slate-900 mt-2">Post Content</h3>
                    </div>
                    <form onSubmit={submitPost} className="space-y-4">
                        <input type="text" value={writeTitle} onChange={(e) => setWriteTitle(e.target.value)} placeholder="제목" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" />
                        {writeMode === 'update' && (
                            <input type="text" value={writeThumbnail} onChange={(e) => setWriteThumbnail(e.target.value)} placeholder="썸네일 이미지 URL (16:9 권장)" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" />
                        )}
                        <textarea value={writeContent} onChange={(e) => setWriteContent(e.target.value)} placeholder="내용 (HTML 지원)" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium h-48 resize-none outline-none"></textarea>
                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={() => setIsWriteFormOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black text-sm rounded-2xl">CANCEL</button>
                            <button type="submit" disabled={!writeTitle || !writeContent || isSubmitting} className="flex-[1.5] py-4 bg-slate-900 text-white font-black text-sm rounded-2xl shadow-xl">SUBMIT</button>
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
