
import React, { useState, useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { communityService } from '../services/communityService';
import { geminiService } from '../services/geminiService';
import { CommunityPost, BoardType, CommunityComment } from '../types';
import { marked } from 'marked';

type TabType = 'balance' | 'keuk' | 'stream' | 'temp';
type ViewMode = 'MAIN' | 'UPDATE_ARCHIVE' | 'POST_DETAIL';

export const CommunityPanel: React.FC = () => {
  const { isCommunityOpen, closeCommunity, isLoggedIn, authUser, userProfile, isAdmin, openCommunityUserProfile, openAuthModal } = useApp();
  
  const [viewMode, setViewMode] = useState<ViewMode>('MAIN');
  const [activeTab, setActiveTab] = useState<TabType>('balance');
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [updatePosts, setUpdatePosts] = useState<CommunityPost[]>([]);
  const [tabPosts, setTabPosts] = useState<CommunityPost[]>([]);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openAdminMenuId, setOpenAdminMenuId] = useState<string | null>(null);
  
  // Write Form
  const [isWriteFormOpen, setIsWriteFormOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [writeMode, setWriteMode] = useState<BoardType>('balance');
  const [writeTitle, setWriteTitle] = useState('');
  const [writeContent, setWriteContent] = useState('');
  const [writeThumbnail, setWriteThumbnail] = useState('');
  const [blueOption, setBlueOption] = useState('');
  const [redOption, setRedOption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // AI Summarizer State
  const [rawUpdateText, setRawUpdateText] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [masterPrompt, setMasterPrompt] = useState('당신은 서든어택 업데이트 전문 요약가입니다. 공지 원문의 모든 핵심 내용을 하나도 놓치지 마세요. 가독성을 극대화하기 위해 Markdown 문법을 사용하며, 특히 아이템 스펙이나 보상 목록은 반드시 Markdown 표(Table) 기능을 사용하여 일목요연하게 정리하세요. 제목은 유저들의 관심을 끌 수 있도록 20자 이내로 핵심만 짚으세요.');
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);

  // Comment Form
  const [commentInput, setCommentInput] = useState('');
  const [commentTeam, setCommentTeam] = useState<'BLUE' | 'RED' | 'GRAY'>('GRAY');

  useEffect(() => {
    if (isCommunityOpen) {
      communityService.getPosts('update').then(setUpdatePosts);
      fetchTabContent(activeTab);
    }
  }, [isCommunityOpen, activeTab]);

  useEffect(() => {
    if (selectedPost && viewMode === 'POST_DETAIL') {
        communityService.getComments(selectedPost.id).then(setComments);
    }
  }, [selectedPost, viewMode]);

  const fetchTabContent = (tab: TabType) => {
    setIsLoading(true);
    let queryType: BoardType = 'balance';
    if (tab === 'keuk') queryType = 'fun';
    else if (tab === 'stream') queryType = 'stream';
    else if (tab === 'temp') queryType = 'TEMP';
    
    communityService.getPosts(queryType, authUser?.id).then((data) => {
      setTabPosts(data);
      setIsLoading(false);
    });
  };

  const handleAISummarize = async () => {
    if (!rawUpdateText.trim()) return;
    setIsSummarizing(true);
    try {
      const result = await geminiService.summarizeGameUpdate(rawUpdateText, masterPrompt);
      setWriteTitle(result.title);
      setWriteContent(result.content);
      alert("AI 전력 분석관이 요약을 완료했습니다.");
    } catch (e) {
      console.error(e);
      alert("AI 요약 중 오류가 발생했습니다.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleAdminAction = async (postId: string, action: 'DELETE' | 'TEMP') => {
    const postToAct = tabPosts.find(p => p.id === postId) || updatePosts.find(p => p.id === postId) || selectedPost;
    if (!postToAct) return;
    
    if (postToAct.authorId === authUser?.id && !isAdmin) {
        alert("자신의 글을 처리할 수 없습니다.");
        return;
    }
    if (!isAdmin && postToAct.authorId !== authUser?.id) return;
    if (!window.confirm("정말 처리하시겠습니까?")) return;
    const success = action === 'DELETE' ? await communityService.deletePost(postId) : await communityService.movePostToTemp(postId);
    if (success) { 
        fetchTabContent(activeTab); 
        communityService.getPosts('update').then(setUpdatePosts);
        if (selectedPost?.id === postId) setViewMode('MAIN'); 
    }
    setOpenAdminMenuId(null);
  };

  const handleVote = async (type: 'HEAD' | 'HALF') => {
    if (!selectedPost || !isLoggedIn) { if(!isLoggedIn) openAuthModal(); return; }
    if (selectedPost.authorId === authUser?.id) {
        alert("자신의 글에 추천, 비추천, 투표, 신고 할 수 없습니다.");
        return;
    }
    const success = await communityService.votePost(selectedPost.id, type);
    if (success) {
        setSelectedPost(prev => prev ? { 
            ...prev, 
            heads: type === 'HEAD' ? prev.heads + 1 : prev.heads,
            halfshots: type === 'HALF' ? prev.halfshots + 1 : prev.halfshots
        } : null);
    }
  };

  const handleBalanceVote = async (side: 'BLUE' | 'RED') => {
    if (!selectedPost || !isLoggedIn) { if(!isLoggedIn) openAuthModal(); return; }
    
    if (selectedPost.authorId === authUser?.id) {
        alert("자신의 글에 추천, 비추천, 투표, 신고 할 수 없습니다.");
        return;
    }
    
    const success = await communityService.voteBalance(selectedPost.id, side);
    if (success) {
        alert(`${side}팀에 투표하셨습니다!`);
        setSelectedPost(prev => prev ? { 
            ...prev, 
            blueVotes: side === 'BLUE' ? prev.blueVotes + 1 : prev.blueVotes,
            redVotes: side === 'RED' ? prev.redVotes + 1 : prev.redVotes
        } : null);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !commentInput.trim() || isSubmitting) return;
    if (!isLoggedIn) { openAuthModal(); return; }
    setIsSubmitting(true);
    const newComment = await communityService.addComment(selectedPost.id, commentInput, commentTeam);
    if (newComment) {
        setCommentInput('');
        setComments(prev => [...prev, newComment]);
    }
    setIsSubmitting(false);
  };

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (writeMode === 'balance' && (!blueOption.trim() || !redOption.trim())) {
      alert("양쪽 선택지를 모두 입력해주세요.");
      return;
    }
    if (writeMode !== 'balance' && !writeTitle.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }
    
    setIsSubmitting(true);
    
    const postData = { 
      title: writeTitle, content: writeContent, boardType: writeMode, 
      thumbnail: writeThumbnail, blueOption, redOption 
    };

    let result;
    if (editingPostId) {
        result = await communityService.updatePost(editingPostId, postData);
    } else {
        const author = userProfile?.nickname || authUser?.name || 'Unknown';
        result = await communityService.createPost({ ...postData, author });
    }
    
    if (result) {
      resetWriteForm();
      if (writeMode === 'update') {
          communityService.getPosts('update').then(setUpdatePosts);
      }
      fetchTabContent(activeTab);
      if (selectedPost?.id === result.id) {
          setSelectedPost(result);
      }
    }
    setIsSubmitting(false);
  };

  const resetWriteForm = () => {
    setWriteTitle(''); setWriteContent(''); setWriteThumbnail('');
    setBlueOption(''); setRedOption(''); setRawUpdateText('');
    setEditingPostId(null);
    setIsWriteFormOpen(false);
  };

  const openWriteForm = (mode: BoardType) => {
    if (!isLoggedIn) { openAuthModal(); return; }
    setWriteMode(mode);
    setEditingPostId(null);
    setIsWriteFormOpen(true);
  };

  const openEditForm = (post: CommunityPost) => {
    setEditingPostId(post.id);
    setWriteMode(post.boardType);
    setWriteTitle(post.title);
    setWriteContent(post.content);
    setWriteThumbnail(post.thumbnail || '');
    setBlueOption(post.blueOption || '');
    setRedOption(post.redOption || '');
    setIsWriteFormOpen(true);
    setOpenAdminMenuId(null);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("링크가 복사되었습니다!");
  };

  const AdminPostMenu = ({ post }: { post: CommunityPost }) => {
    const isOpen = openAdminMenuId === post.id;
    // 관리자이거나 작성자 본인인 경우 메뉴 표시
    const canManage = isAdmin || post.authorId === authUser?.id;
    if (!canManage) return null;

    return (
      <div className="relative">
        <button onClick={(e) => { e.stopPropagation(); setOpenAdminMenuId(isOpen ? null : post.id); }} className="w-8 h-8 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 border border-white/10"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg></button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
            <button onClick={() => openEditForm(post)} className="w-full px-4 py-3 text-left text-[11px] font-bold text-slate-600 hover:bg-slate-50 border-b">📝 수정하기 (Edit)</button>
            {isAdmin && (
                <button onClick={() => handleAdminAction(post.id, 'TEMP')} className="w-full px-4 py-3 text-left text-[11px] font-bold text-slate-600 hover:bg-slate-50 border-b">📁 격리(TEMP)</button>
            )}
            <button onClick={() => handleAdminAction(post.id, 'DELETE')} className="w-full px-4 py-3 text-left text-[11px] font-bold text-red-500 hover:bg-red-50">🗑️ 삭제 (Delete)</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className={`fixed inset-0 bg-black/70 backdrop-blur-md z-[150] transition-opacity duration-500 ${isCommunityOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={closeCommunity}></div>
      <div className={`fixed inset-0 z-[160] flex flex-col bg-slate-50 transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isCommunityOpen ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex-shrink-0 h-16 bg-white border-b flex items-center justify-between px-4 z-30 shadow-sm">
           <div className="flex items-center gap-3">
              {viewMode !== 'MAIN' && <button onClick={() => setViewMode('MAIN')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button>}
              <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2"><span className="text-yellow-500 text-xl">●</span> {viewMode === 'UPDATE_ARCHIVE' ? 'Archive' : 'Community'}</h2>
           </div>
           <button onClick={closeCommunity} className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 transition-transform active:scale-90"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pb-32 space-y-10">
           {(viewMode === 'MAIN' || viewMode === 'UPDATE_ARCHIVE') && (
             <>
               <section className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><span className="w-1 h-1 bg-yellow-400 rounded-full"></span>Official Notice</h3>
                     <div className="flex gap-2">
                        {isAdmin && <button onClick={() => openWriteForm('update')} className="text-[9px] font-black bg-cyan-500 text-slate-950 px-3 py-1.5 rounded-xl shadow-lg">NEW NOTICE</button>}
                        <button 
                          onClick={() => setViewMode(viewMode === 'MAIN' ? 'UPDATE_ARCHIVE' : 'MAIN')} 
                          className="text-[9px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-lg transition-all active:scale-95"
                        >
                          {viewMode === 'MAIN' ? '목록보기' : '메인으로'}
                        </button>
                     </div>
                  </div>

                  {viewMode === 'MAIN' ? (
                    updatePosts[0] && (
                        <div onClick={() => { setSelectedPost(updatePosts[0]); setViewMode('POST_DETAIL'); }} className="relative aspect-video rounded-[2rem] overflow-hidden shadow-2xl border border-white/20 cursor-pointer transition-transform active:scale-[0.98]">
                            {updatePosts[0].thumbnail ? <img src={updatePosts[0].thumbnail} className="absolute inset-0 w-full h-full object-cover" alt="" /> : <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-white/5 font-black text-2xl italic">NOTICE</div>}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 p-6 w-full">
                                <span className="inline-block px-3 py-1 bg-cyan-500 text-slate-950 text-[8px] font-black rounded-lg uppercase tracking-widest mb-2">System Update</span>
                                <h4 className="text-white text-xl font-black leading-tight line-clamp-2">{updatePosts[0].title}</h4>
                            </div>
                            <div className="absolute top-4 right-4 z-20" onClick={e => e.stopPropagation()}><AdminPostMenu post={updatePosts[0]} /></div>
                        </div>
                    )
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right duration-500">
                        {updatePosts.map((post) => (
                            <div key={post.id} onClick={() => { setSelectedPost(post); setViewMode('POST_DETAIL'); }} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-md flex gap-4 items-center group cursor-pointer active:scale-95 transition-all">
                                {post.thumbnail && <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border bg-slate-100"><img src={post.thumbnail} className="w-full h-full object-cover" alt="" /></div>}
                                <div className="flex-1">
                                    <span className="text-[8px] font-black text-slate-400 block mb-1 uppercase tracking-widest">{post.createdAt.split('T')[0]}</span>
                                    <h4 className="font-black text-slate-800 line-clamp-2 leading-snug group-hover:text-cyan-600 text-sm">{post.title}</h4>
                                </div>
                                <div className="flex-shrink-0" onClick={e => e.stopPropagation()}><AdminPostMenu post={post} /></div>
                            </div>
                        ))}
                    </div>
                  )}
               </section>

               {viewMode === 'MAIN' && (
                 <section className="space-y-6 pt-2">
                     <div className="sticky top-0 z-20 py-2 bg-slate-50/95 backdrop-blur-md">
                       <div className="flex p-1.5 bg-white border border-slate-200 rounded-[1.5rem] shadow-xl">
                          {(isAdmin ? ['balance', 'keuk', 'stream', 'temp'] : ['balance', 'keuk', 'stream']).map((tab) => (
                              <button key={tab} onClick={() => setActiveTab(tab as TabType)} className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}>
                                {tab === 'balance' ? '밸런스' : tab === 'keuk' ? '큭큭' : tab === 'stream' ? '홍보' : '임시'}
                              </button>
                          ))}
                       </div>
                     </div>
                     <div className="space-y-4 min-h-[400px]">
                        {isLoading ? <div className="flex justify-center py-20 opacity-30"><div className="w-8 h-8 border-3 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div></div> : tabPosts.length === 0 ? <div className="text-center py-24 text-slate-300 font-black text-xs uppercase tracking-widest bg-white/40 border-2 border-dashed border-slate-200 rounded-[2.5rem]">No Feed Found</div> : tabPosts.map((post) => (
                            <div key={post.id} onClick={() => { setSelectedPost(post); setViewMode('POST_DETAIL'); }} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl relative transition-all active:scale-[0.98] group hover:border-slate-300">
                                <div className="absolute top-6 right-6 z-20" onClick={e => e.stopPropagation()}><AdminPostMenu post={post} /></div>
                                <h4 className="font-black text-slate-800 text-base mb-4 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                                  {post.boardType === 'balance' ? `${post.blueOption} vs ${post.redOption}` : post.title}
                                </h4>
                                <div className="pt-5 border-t border-slate-50 flex items-center justify-between text-[10px] font-black text-slate-400">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[7px] font-black text-slate-500 border border-slate-200">{post.author[0].toUpperCase()}</div>
                                        <span onClick={e => { e.stopPropagation(); openCommunityUserProfile(post.author, post.authorId); }} className="text-slate-900 hover:underline">{post.author}</span>
                                    </div>
                                    <span>{post.createdAt.split('T')[0]}</span>
                                </div>
                            </div>
                        ))}
                     </div>
                 </section>
               )}
             </>
           )}
        </div>

        {/* Post Detail Sub-View */}
        {viewMode === 'POST_DETAIL' && selectedPost && (
            <div className="absolute inset-0 bg-white z-[200] flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden">
                <div className="flex-shrink-0 h-16 border-b flex items-center justify-between px-4 sticky top-0 z-50 bg-white/80 backdrop-blur-md">
                    <button onClick={() => setViewMode(selectedPost.boardType === 'update' ? 'UPDATE_ARCHIVE' : 'MAIN')} className="p-2 -ml-2 text-slate-500"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
                    <h3 className="text-xs font-black text-slate-800 truncate px-4">{selectedPost.boardType === 'balance' ? '밸런스 게임' : selectedPost.boardType === 'update' ? 'System Update' : selectedPost.title}</h3>
                    <div className="flex items-center gap-2">
                        <AdminPostMenu post={selectedPost} />
                        <div className="w-2"></div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto pb-32">
                    {selectedPost.thumbnail && <div className="w-full aspect-video bg-slate-100"><img src={selectedPost.thumbnail} className="w-full h-full object-cover" /></div>}
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                             <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">{selectedPost.author[0]}</div>
                             <div>
                                 <div className="text-xs font-black text-slate-900">{selectedPost.author}</div>
                                 <div className="text-[9px] text-slate-400 font-bold">{selectedPost.createdAt.split('T')[0]}</div>
                             </div>
                        </div>

                        {selectedPost.boardType === 'balance' && (
                            <div className="mb-8 space-y-4">
                                <div className="grid grid-cols-2 gap-3 relative">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] z-10 border-2 border-white shadow-xl italic">VS</div>
                                    <button 
                                        onClick={() => handleBalanceVote('BLUE')}
                                        className="bg-gradient-to-br from-blue-600 to-blue-400 p-6 rounded-3xl text-center shadow-xl border border-white/20 active:scale-95 transition-transform"
                                    >
                                        <div className="text-[9px] font-black text-blue-100 uppercase tracking-widest mb-2 opacity-60">TEAM BLUE</div>
                                        <div className="text-white font-black text-base break-words leading-tight">{selectedPost.blueOption}</div>
                                        <div className="mt-2 text-[8px] font-black text-blue-200">Votes: {selectedPost.blueVotes}</div>
                                    </button>
                                    <button 
                                        onClick={() => handleBalanceVote('RED')}
                                        className="bg-gradient-to-br from-red-600 to-red-400 p-6 rounded-3xl text-center shadow-xl border border-white/20 active:scale-95 transition-transform"
                                    >
                                        <div className="text-[9px] font-black text-red-100 uppercase tracking-widest mb-2 opacity-60">TEAM RED</div>
                                        <div className="text-white font-black text-base break-words leading-tight">{selectedPost.redOption}</div>
                                        <div className="mt-2 text-[8px] font-black text-red-200">Votes: {selectedPost.redVotes}</div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {selectedPost.boardType !== 'balance' && <h1 className="text-2xl font-black text-slate-900 mb-6 leading-tight tracking-tight">{selectedPost.title}</h1>}
                        
                        <div className="prose prose-slate max-w-none text-slate-600 font-medium leading-relaxed text-sm mb-12" dangerouslySetInnerHTML={{ __html: marked.parse(selectedPost.content) }}></div>
                        
                        <div className="flex gap-2 mb-12">
                            <button onClick={() => handleVote('HEAD')} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] shadow-xl active:scale-95 transition-all flex flex-col items-center gap-1">
                                <span>🎯 헤드샷 {selectedPost.heads}</span>
                            </button>
                            <button onClick={() => handleVote('HALF')} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[11px] active:scale-95 transition-all flex flex-col items-center gap-1">
                                <span>🛡️ 반샷 {selectedPost.halfshots}</span>
                            </button>
                            <button onClick={handleShare} className="w-14 py-4 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-100 transition-all"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 12.684a3 3 0 100-2.684 3 3 0 000 2.684z" /></svg></button>
                            {(isAdmin || selectedPost.authorId === authUser?.id) && (
                                <button onClick={() => handleAdminAction(selectedPost.id, 'DELETE')} className="w-14 py-4 bg-red-50 text-red-400 rounded-2xl flex items-center justify-center hover:bg-red-100" title="삭제">🗑️</button>
                            )}
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b pb-4">Comments ({comments.length})</h4>
                            
                            <form onSubmit={handleCommentSubmit} className="space-y-3">
                                <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                                    <button type="button" onClick={() => setCommentTeam('BLUE')} className={`flex-1 py-2 text-[9px] font-black rounded-xl transition-all ${commentTeam === 'BLUE' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>BLUE TEAM</button>
                                    <button type="button" onClick={() => setCommentTeam('GRAY')} className={`flex-1 py-2 text-[9px] font-black rounded-xl transition-all ${commentTeam === 'GRAY' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>NONE</button>
                                    <button type="button" onClick={() => setCommentTeam('RED')} className={`flex-1 py-2 text-[9px] font-black rounded-xl transition-all ${commentTeam === 'RED' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400'}`}>RED TEAM</button>
                                </div>
                                <div className={`relative p-1 bg-white border-2 rounded-2xl transition-all ${commentTeam === 'BLUE' ? 'border-blue-500' : commentTeam === 'RED' ? 'border-red-500' : 'border-slate-100'}`}>
                                    <textarea 
                                        value={commentInput} 
                                        onChange={(e) => setCommentInput(e.target.value)} 
                                        placeholder="매너 있는 댓글로 건전한 토론을 이어가세요 (최대 2000자)" 
                                        maxLength={2000}
                                        className="w-full p-4 text-sm font-medium focus:outline-none min-h-[100px] bg-transparent"
                                    ></textarea>
                                    <div className="flex justify-between items-center p-3">
                                        <span className="text-[10px] font-bold text-slate-300">{commentInput.length}/2000</span>
                                        <button type="submit" disabled={!commentInput.trim() || isSubmitting} className="px-5 py-2.5 bg-slate-900 text-white text-[10px] font-black rounded-xl active:scale-95 disabled:opacity-50">SEND</button>
                                    </div>
                                </div>
                            </form>

                            <div className="space-y-4 pt-4">
                                {comments.map(comment => (
                                    <div key={comment.id} className={`p-4 bg-white border-2 rounded-2xl transition-colors ${comment.teamType === 'BLUE' ? 'border-blue-100 bg-blue-50/10' : comment.teamType === 'RED' ? 'border-red-100 bg-red-50/10' : 'border-slate-50'}`}>
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 text-[8px] font-black rounded text-white ${comment.teamType === 'BLUE' ? 'bg-blue-600' : comment.teamType === 'RED' ? 'bg-red-600' : 'bg-slate-400'}`}>{comment.teamType}</span>
                                                <span className="text-[10px] font-black text-slate-900">{comment.authorNickname}</span>
                                            </div>
                                            <span className="text-[8px] font-bold text-slate-300">{comment.createdAt.split('T')[0]}</span>
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed font-medium">{comment.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {viewMode === 'MAIN' && (
            <div className="absolute bottom-8 right-6 z-40">
                <button 
                    onClick={() => openWriteForm(activeTab === 'keuk' ? 'fun' : activeTab === 'stream' ? 'stream' : 'balance')} 
                    className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center border-4 border-white active:scale-90 transition-all hover:bg-blue-700"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>
        )}
        
        {isWriteFormOpen && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl relative border border-white/20 max-h-[95vh] overflow-y-auto">
                    <div className="mb-8 text-center">
                        <span className={`inline-block px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            writeMode === 'balance' ? 'bg-blue-100 text-blue-700' : 
                            writeMode === 'update' ? 'bg-cyan-100 text-cyan-700' : 
                            writeMode === 'fun' ? 'bg-yellow-100 text-yellow-700' :
                            writeMode === 'stream' ? 'bg-purple-100 text-purple-700' :
                            'bg-slate-100 text-slate-700'
                        }`}>
                           {writeMode === 'balance' ? 'Balance Game' : 
                            writeMode === 'update' ? 'Official Lab Update' : 
                            writeMode === 'fun' ? 'Keuk Keuk Board' :
                            writeMode === 'stream' ? 'Streaming' :
                            'Post Content'}
                        </span>
                        <h3 className="text-xl font-black text-slate-900 mt-4 tracking-tighter">
                            {editingPostId ? '게시글 수정' : 
                             writeMode === 'balance' ? '밸런스 게임 토론' : 
                             writeMode === 'update' ? '새로운 업데이트 등록' : 
                             writeMode === 'fun' ? '큭큭 게시글 작성' :
                             writeMode === 'stream' ? '방송/클랜 홍보' :
                             '새로운 게시글 작성'}
                        </h3>
                    </div>
                    <form onSubmit={submitPost} className="space-y-4">
                        {writeMode === 'update' && !editingPostId && (
                            <div className="mb-6 p-4 bg-cyan-50 border border-cyan-100 rounded-2xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-cyan-600 uppercase tracking-widest block font-mono">Nexon Raw Data (Update Parser)</label>
                                    <button 
                                      type="button" 
                                      onClick={() => setIsPromptEditorOpen(!isPromptEditorOpen)}
                                      className="text-[9px] font-black text-cyan-700 underline"
                                    >
                                      {isPromptEditorOpen ? "닫기" : "마스터 프롬프트 설정"}
                                    </button>
                                </div>

                                {isPromptEditorOpen && (
                                  <div className="bg-white/50 border border-cyan-200 rounded-xl p-3 animate-in slide-in-from-top-2">
                                     <label className="text-[8px] font-black text-slate-400 mb-1 block uppercase">AI 마스터 지침 (Master Prompt)</label>
                                     <textarea 
                                        value={masterPrompt}
                                        onChange={(e) => setMasterPrompt(e.target.value)}
                                        className="w-full h-24 p-2 text-[10px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-500 font-medium leading-relaxed"
                                        placeholder="AI가 어떻게 요약할지 지침을 입력하세요..."
                                     />
                                  </div>
                                )}

                                <textarea 
                                    value={rawUpdateText}
                                    onChange={(e) => setRawUpdateText(e.target.value)}
                                    placeholder="넥슨 공지 원문을 여기에 붙여넣으세요..."
                                    className="w-full h-24 p-3 text-xs bg-white border border-cyan-100 rounded-xl focus:outline-none focus:border-cyan-500 font-medium"
                                />
                                <button
                                    type="button"
                                    onClick={handleAISummarize}
                                    disabled={isSummarizing || !rawUpdateText.trim()}
                                    className="w-full py-2.5 bg-slate-950 text-cyan-400 text-[10px] font-black rounded-xl border border-cyan-500/30 hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                >
                                    {isSummarizing ? (
                                        <>
                                            <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
                                            EXTRACTING_KEY_INTEL...
                                        </>
                                    ) : (
                                        <>⚡ AI 요약 실행 (Markdown)</>
                                    )}
                                </button>
                            </div>
                        )}

                        {writeMode === 'balance' ? (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-blue-500 uppercase ml-2">Team Blue Option</label>
                                    <div className="relative">
                                        <input type="text" value={blueOption} onChange={(e) => setBlueOption(e.target.value)} placeholder="파란색 팀 선택지" maxLength={200} className="w-full p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl text-sm font-black text-blue-900 outline-none focus:border-blue-500 transition-all" />
                                        <span className="absolute bottom-3 right-3 text-[8px] font-black text-blue-300">{blueOption.length}/200</span>
                                    </div>
                                </div>
                                <div className="text-center font-black italic text-slate-300 text-xs">VS</div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-red-500 uppercase ml-2">Team Red Option</label>
                                    <div className="relative">
                                        <input type="text" value={redOption} onChange={(e) => setRedOption(e.target.value)} placeholder="빨간색 팀 선택지" maxLength={200} className="w-full p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-sm font-black text-red-900 outline-none focus:border-red-500 transition-all" />
                                        <span className="absolute bottom-3 right-3 text-[8px] font-black text-red-300">{redOption.length}/200</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Title</label>
                                <input type="text" value={writeTitle} onChange={(e) => setWriteTitle(e.target.value)} placeholder="제목 (필수)" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black outline-none focus:bg-white transition-all" />
                            </div>
                        )}
                        
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">{writeMode === 'balance' ? 'Description' : 'Content'}</label>
                            <div className="relative">
                                <textarea value={writeContent} onChange={(e) => setWriteContent(e.target.value)} placeholder={writeMode === 'balance' ? "설명을 입력하세요." : "내용을 입력하세요 (Markdown 지원)"} maxLength={5000} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium h-40 resize-none outline-none focus:bg-white transition-all"></textarea>
                                <span className="absolute bottom-3 right-3 text-[8px] font-black text-slate-300">{writeContent.length}/5000</span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Thumbnail URL (Optional)</label>
                            <input type="text" value={writeThumbnail} onChange={(e) => setWriteThumbnail(e.target.value)} placeholder="이미지 주소를 입력하세요" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-mono outline-none focus:bg-white transition-all" />
                        </div>
                        
                        <div className="flex gap-2 pt-4">
                            <button type="button" onClick={resetWriteForm} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black text-[10px] rounded-2xl active:scale-95 transition-all">취소</button>
                            <button type="submit" disabled={isSubmitting || isSummarizing} className="flex-[1.5] py-4 bg-slate-900 text-white font-black text-[10px] rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50">
                                {isSubmitting ? '전송 중...' : editingPostId ? '수정하기' : '등록하기'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
      </div>
    </>
  );
};
