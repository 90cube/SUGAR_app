
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../state/AppContext';
import { communityService } from '../services/communityService';
import { geminiService } from '../services/geminiService';
import { CommunityPost, BoardType, CommunityComment, StreamingRequest } from '../types';
import { marked } from 'marked';

type TabType = 'balance' | 'keuk' | 'stream' | 'temp';

export const CommunityPanel: React.FC = () => {
  const { 
    isCommunityOpen, closeCommunity, isLoggedIn, authUser, userProfile, isAdmin, 
    openCommunityUserProfile, openAuthModal,
    communityViewMode: viewMode, setCommunityViewMode: setViewMode,
    isCommunityWriteFormOpen: isWriteFormOpen, setIsCommunityWriteFormOpen: setIsWriteFormOpen,
    selectedCommunityPost: selectedPost, setSelectedCommunityPost: setSelectedPost
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<TabType>('balance');
  const [updatePosts, setUpdatePosts] = useState<CommunityPost[]>([]);
  const [activeUpdateIdx, setActiveUpdateIdx] = useState(0);
  const [tabPosts, setTabPosts] = useState<CommunityPost[]>([]);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openAdminMenuId, setOpenAdminMenuId] = useState<string | null>(null);
  
  // Streaming UI
  const [streamSubTab, setStreamSubTab] = useState<'LIST' | 'MY_REQUESTS' | 'ADMIN_PENDING'>('LIST');
  const [myRequests, setMyRequests] = useState<StreamingRequest[]>([]);
  const [adminRequests, setAdminRequests] = useState<StreamingRequest[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rawRejectReason, setRawRejectReason] = useState('');

  // Form State
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [writeMode, setWriteMode] = useState<BoardType>('balance');
  const [writeTitle, setWriteTitle] = useState('');
  const [writeContent, setWriteContent] = useState('');
  const [writeThumbnail, setWriteThumbnail] = useState('');
  const [blueOption, setBlueOption] = useState('');
  const [redOption, setRedOption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Streaming Specialized
  const [streamPlatform, setStreamPlatform] = useState<'CHZZK' | 'SOOP' | 'YOUTUBE'>('CHZZK');
  const [streamUrl, setStreamUrl] = useState('');
  const [streamPrUrl, setStreamPrUrl] = useState('');
  const [streamDescription, setStreamDescription] = useState('');

  // File State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  
  // AI Parser
  const [rawUpdateText, setRawUpdateText] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [masterPrompt, setMasterPrompt] = useState('당신은 서든어택 업데이트 전문 요약가입니다. 가독성을 극대화하기 위해 Markdown 표(Table)를 사용하세요.');
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);

  // Comment
  const [commentInput, setCommentInput] = useState('');
  const [commentTeam, setCommentTeam] = useState<'BLUE' | 'RED' | 'GRAY'>('GRAY');

  useEffect(() => {
    if (isCommunityOpen) {
      communityService.getPosts('update').then((posts) => {
        setUpdatePosts(posts);
        setActiveUpdateIdx(0);
      });
      fetchTabContent(activeTab);
    }
  }, [isCommunityOpen, activeTab]);

  useEffect(() => {
    if (selectedPost && (viewMode === 'POST_DETAIL')) {
        communityService.getComments(selectedPost.id).then(setComments);
    }
  }, [selectedPost, viewMode]);

  useEffect(() => {
    if (activeTab === 'stream') {
        if (streamSubTab === 'MY_REQUESTS') communityService.getMyStreamingRequests().then(setMyRequests);
        else if (streamSubTab === 'ADMIN_PENDING' && isAdmin) communityService.getPendingStreamingRequests().then(setAdminRequests);
    }
  }, [activeTab, streamSubTab, isAdmin]);

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
    } catch (e) {
      alert("AI 요약 중 오류가 발생했습니다.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleAdminAction = async (postId: string, action: 'DELETE' | 'TEMP') => {
    if (!window.confirm("정말 처리하시겠습니까?")) return;
    const success = action === 'DELETE' ? await communityService.deletePost(postId) : await communityService.movePostToTemp(postId);
    if (success) { 
        fetchTabContent(activeTab); 
        communityService.getPosts('update').then(setUpdatePosts);
        if (selectedPost?.id === postId) setViewMode('MAIN'); 
    }
    setOpenAdminMenuId(null);
  };

  const handleStreamApproval = async (requestId: string) => {
      if (!window.confirm("승인하시겠습니까?")) return;
      setIsProcessing(true);
      const success = await communityService.processStreamingRequest(requestId, 'APPROVED', '승인되었습니다.');
      if (success) {
          communityService.getPendingStreamingRequests().then(setAdminRequests);
          fetchTabContent('stream');
      }
      setIsProcessing(false);
  };

  const handleStreamRejection = async (requestId: string) => {
      if (!rawRejectReason.trim()) { alert("반려 사유를 입력해주세요."); return; }
      setIsProcessing(true);
      try {
          const formalMessage = await geminiService.generateFormalRejection(rawRejectReason);
          const success = await communityService.processStreamingRequest(requestId, 'REJECTED', formalMessage);
          if (success) {
              setRejectingRequestId(null);
              setRawRejectReason('');
              communityService.getPendingStreamingRequests().then(setAdminRequests);
          }
      } catch (e) {
          alert("AI 처리 중 오류 발생");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleVote = async (type: 'HEAD' | 'HALF') => {
    if (!selectedPost || !isLoggedIn) { if(!isLoggedIn) openAuthModal(); return; }
    if (selectedPost.authorId === authUser?.id) return alert("본인의 글에는 할 수 없습니다.");
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
    if (selectedPost.authorId === authUser?.id) return alert("본인의 글에는 할 수 없습니다.");
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
    if (!isLoggedIn) return openAuthModal();
    setIsSubmitting(true);
    const newComment = await communityService.addComment(selectedPost.id, commentInput, commentTeam);
    if (newComment) {
        setCommentInput('');
        setComments(prev => [...prev, newComment]);
    }
    setIsSubmitting(false);
  };

  const handleCommentDelete = async (commentId: string) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
    const success = await communityService.softDeleteComment(commentId);
    if (success) {
      if (selectedPost) communityService.getComments(selectedPost.id).then(setComments);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) { 
        alert("이미지 용량은 500KB 이하만 업로드할 수 있습니다."); 
        e.target.value = ""; 
        return; 
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert("허용되지 않는 파일 형식입니다. (jpg, png, webp, gif)");
      e.target.value = "";
      return;
    }
    
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setFilePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || uploadProgress) return;

    if (writeMode === 'stream') {
        if (!selectedFile) return alert("썸네일 이미지를 업로드해주세요.");
        if (!streamUrl.trim()) return alert("방송 링크를 입력해주세요.");
        setIsSubmitting(true);
        setUploadProgress(true);
        try {
            const urls = await communityService.uploadLabUpdateImage(selectedFile);
            if (urls) {
                const success = await communityService.createStreamingRequest({
                    platform: streamPlatform,
                    stream_url: streamUrl,
                    pr_url: streamPrUrl,
                    description: streamDescription,
                    thumbnail_url: urls.thumbnailUrl
                });
                if (success) {
                    alert("요청 완료! 승인 후 리스트에 노출됩니다.");
                    resetWriteForm();
                    setStreamSubTab('MY_REQUESTS');
                }
            }
        } catch (err: any) { alert(err.message); }
        finally { setUploadProgress(false); setIsSubmitting(false); }
        return;
    }

    if (writeMode === 'balance' && (!blueOption.trim() || !redOption.trim())) return alert("양쪽 선택지를 입력하세요.");
    if ((writeMode === 'fun' || writeMode === 'update') && !selectedFile && !editingPostId) return alert("이미지 파일을 업로드하세요.");
    if (writeMode !== 'balance' && !writeTitle.trim()) return alert("제목을 입력하세요.");
    
    setIsSubmitting(true);
    let imageUrl = ''; let thumbnailUrl = '';
    
    if ((writeMode === 'fun' || writeMode === 'update') && selectedFile) {
        setUploadProgress(true);
        try { 
          const urls = writeMode === 'update' 
            ? await communityService.uploadLabUpdateImage(selectedFile)
            : await communityService.uploadKukkukImage(selectedFile); 
          if (urls) { imageUrl = urls.imageUrl; thumbnailUrl = urls.thumbnailUrl; } 
        }
        catch (err: any) { alert(err.message); setIsSubmitting(false); setUploadProgress(false); return; }
        setUploadProgress(false);
    }
    
    const postData = { 
      title: writeTitle, content: writeContent, boardType: writeMode, 
      thumbnail: writeMode === 'update' ? (thumbnailUrl || writeThumbnail) : (writeThumbnail || null), 
      blueOption, redOption, imageUrl, thumbnailUrl 
    };
    
    let result;
    if (editingPostId) result = await communityService.updatePost(editingPostId, postData);
    else { const author = userProfile?.nickname || authUser?.name || 'Unknown'; result = await communityService.createPost({ ...postData, author }); }
    
    if (result) { 
      resetWriteForm(); 
      if (writeMode === 'update') communityService.getPosts('update').then(setUpdatePosts); 
      fetchTabContent(activeTab); 
      if (selectedPost?.id === result.id) setSelectedPost(result);
    }
    setIsSubmitting(false);
  };

  const resetWriteForm = () => {
    setWriteTitle(''); setWriteContent(''); setWriteThumbnail(''); setBlueOption(''); setRedOption(''); setRawUpdateText('');
    setStreamUrl(''); setStreamPrUrl(''); setStreamDescription(''); setStreamPlatform('CHZZK');
    setEditingPostId(null); setSelectedFile(null); setFilePreview(null); setIsWriteFormOpen(false);
  };

  const openWriteForm = (mode: BoardType) => {
    if (!isLoggedIn) return openAuthModal();
    setWriteMode(mode); setEditingPostId(null); setIsWriteFormOpen(true);
  };

  const openEditForm = (post: CommunityPost) => {
    setEditingPostId(post.id); setWriteMode(post.boardType); setWriteTitle(post.title); setWriteContent(post.content); setWriteThumbnail(post.thumbnail || '');
    setBlueOption(post.blueOption || ''); setRedOption(post.redOption || ''); setIsWriteFormOpen(true); setOpenAdminMenuId(null);
  };

  const handleShare = () => { navigator.clipboard.writeText(window.location.href); alert("링크 복사 완료!"); };

  const AdminPostMenu = ({ post }: { post: CommunityPost }) => {
    const isOpen = openAdminMenuId === post.id;
    if (!(isAdmin || post.authorId === authUser?.id)) return null;
    return (
      <div className="relative">
        <button onClick={(e) => { e.stopPropagation(); setOpenAdminMenuId(isOpen ? null : post.id); }} className="w-8 h-8 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-white/40"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg></button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
            <button onClick={() => openEditForm(post)} className="w-full px-4 py-3 text-left text-[11px] font-bold text-slate-600 hover:bg-slate-50 border-b">📝 수정하기</button>
            {isAdmin && <button onClick={() => handleAdminAction(post.id, 'TEMP')} className="w-full px-4 py-3 text-left text-[11px] font-bold text-slate-600 hover:bg-slate-50 border-b">📁 격리(TEMP)</button>}
            <button onClick={() => handleAdminAction(post.id, 'DELETE')} className="w-full px-4 py-3 text-left text-[11px] font-bold text-red-500 hover:bg-red-50">🗑️ 삭제</button>
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
           <button onClick={closeCommunity} className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-full text-slate-500"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pb-32 space-y-10">
           {(viewMode === 'MAIN' || viewMode === 'UPDATE_ARCHIVE') && (
             <>
               <section className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><span className="w-1 h-1 bg-yellow-400 rounded-full"></span>Official Notice</h3>
                     <div className="flex gap-2">
                        {isAdmin && <button onClick={() => openWriteForm('update')} className="text-[9px] font-black bg-cyan-500 text-slate-950 px-3 py-1.5 rounded-xl shadow-lg">NEW NOTICE</button>}
                        <button onClick={() => setViewMode(viewMode === 'MAIN' ? 'UPDATE_ARCHIVE' : 'MAIN')} className="text-[9px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-lg transition-all active:scale-95">{viewMode === 'MAIN' ? '목록보기' : '메인으로'}</button>
                     </div>
                  </div>
                  {viewMode === 'MAIN' ? (
                    updatePosts.length > 0 && (
                        <div className="relative flex items-center justify-center w-full gap-4 overflow-hidden py-4 min-h-[220px]">
                           {activeUpdateIdx < updatePosts.length - 1 && (
                               <div onClick={() => setActiveUpdateIdx(activeUpdateIdx + 1)} className="absolute left-[-15%] w-1/2 aspect-video rounded-[1.5rem] overflow-hidden shadow-lg border border-white/20 cursor-pointer transition-all duration-500 opacity-30 scale-75 blur-[1px]">
                                  {updatePosts[activeUpdateIdx + 1].thumbnail ? <img src={updatePosts[activeUpdateIdx + 1].thumbnail} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800" />}
                               </div>
                           )}
                           <div onClick={() => { setSelectedPost(updatePosts[activeUpdateIdx]); setViewMode('POST_DETAIL'); }} className="relative w-2/3 aspect-video rounded-[1.5rem] overflow-hidden shadow-2xl border border-white/20 cursor-pointer transition-all duration-500 transform scale-100 z-10">
                              {updatePosts[activeUpdateIdx].thumbnail ? <img src={updatePosts[activeUpdateIdx].thumbnail} className="absolute inset-0 w-full h-full object-cover" /> : <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-white/5 font-black text-2xl italic">NOTICE</div>}
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                              <div className="absolute bottom-0 left-0 p-4 w-full"><span className="inline-block px-2 py-0.5 bg-cyan-500 text-slate-950 text-[7px] font-black rounded-lg uppercase tracking-widest mb-1">System Update</span><h4 className="text-white text-sm font-black leading-tight line-clamp-2">{updatePosts[activeUpdateIdx].title}</h4></div>
                              <div className="absolute top-3 right-3 z-20" onClick={e => e.stopPropagation()}><AdminPostMenu post={updatePosts[activeUpdateIdx]} /></div>
                              <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg text-[7px] font-black text-white/70 uppercase">{activeUpdateIdx + 1} / {updatePosts.length}</div>
                           </div>
                           {activeUpdateIdx > 0 && (
                               <div onClick={() => setActiveUpdateIdx(activeUpdateIdx - 1)} className="absolute right-[-15%] w-1/2 aspect-video rounded-[1.5rem] overflow-hidden shadow-lg border border-white/20 cursor-pointer transition-all duration-500 opacity-30 scale-75 blur-[1px]">
                                  {updatePosts[activeUpdateIdx - 1].thumbnail ? <img src={updatePosts[activeUpdateIdx - 1].thumbnail} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800" />}
                               </div>
                           )}
                        </div>
                    )
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right duration-500">
                        {updatePosts.map((post) => (
                            <div key={post.id} onClick={() => { setSelectedPost(post); setViewMode('POST_DETAIL'); }} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-md flex gap-4 items-center cursor-pointer active:scale-95 transition-all">
                                {post.thumbnail && <div className="w-16 h-16 rounded-2xl overflow-hidden border bg-slate-100 flex-shrink-0"><img src={post.thumbnail} className="w-full h-full object-cover" /></div>}
                                <div className="flex-1"><span className="text-[8px] font-black text-slate-400 block mb-1 uppercase tracking-widest">{post.createdAt.split('T')[0]}</span><h4 className="font-black text-slate-800 line-clamp-2 text-sm">{post.title}</h4></div>
                                <div onClick={e => e.stopPropagation()}><AdminPostMenu post={post} /></div>
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
                              <button key={tab} onClick={() => setActiveTab(tab as TabType)} className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}>{tab === 'balance' ? '밸런스' : tab === 'keuk' ? '큭큭' : tab === 'stream' ? '홍보' : '임시'}</button>
                          ))}
                       </div>
                     </div>
                     <div className="space-y-4 min-h-[400px]">
                        {isLoading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div></div> : (
                            tabPosts.map((post) => (
                                <div key={post.id} onClick={() => { setSelectedPost(post); setViewMode('POST_DETAIL'); }} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl relative transition-all active:scale-[0.98] group overflow-hidden">
                                    <div className="absolute top-6 right-6 z-20" onClick={e => e.stopPropagation()}><AdminPostMenu post={post} /></div>
                                    {post.boardType === 'fun' ? (
                                        <div className="flex gap-4 items-center">
                                            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-md flex-shrink-0">{post.thumbnailUrl ? <img src={post.thumbnailUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-slate-300 uppercase">No_Img</div>}</div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-black text-slate-800 text-sm mb-1 group-hover:text-blue-600 truncate">{post.title}</h4>
                                                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400">
                                                   <span className="text-blue-600">🎯 {post.heads}</span>
                                                   <span onClick={e => { e.stopPropagation(); openCommunityUserProfile(post.author, post.authorId); }} className="hover:underline">{post.author}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <><h4 className="font-black text-slate-800 text-base mb-4 line-clamp-2 leading-tight group-hover:text-blue-600">{post.boardType === 'balance' ? `${post.blueOption} vs ${post.redOption}` : post.title}</h4><div className="pt-5 border-t border-slate-50 flex items-center justify-between text-[10px] font-black text-slate-400"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px] font-black">{post.author[0].toUpperCase()}</div><span onClick={e => { e.stopPropagation(); openCommunityUserProfile(post.author, post.authorId); }} className="text-slate-900 hover:underline">{post.author}</span></div><span>{post.createdAt.split('T')[0]}</span></div></>
                                    )}
                                </div>
                            ))
                        )}
                     </div>
                 </section>
               )}
             </>
           )}
        </div>

        {viewMode === 'POST_DETAIL' && selectedPost && (
            <div className="absolute inset-0 bg-white z-[200] flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden">
                <div className="flex-shrink-0 h-16 border-b flex items-center justify-between px-4 sticky top-0 z-50 bg-white/80 backdrop-blur-md">
                    <button onClick={() => setViewMode(selectedPost.boardType === 'update' ? 'UPDATE_ARCHIVE' : 'MAIN')} className="p-2 -ml-2 text-slate-500"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
                    <h3 className="text-xs font-black text-slate-800 truncate px-4">{selectedPost.boardType === 'balance' ? '밸런스 게임' : selectedPost.title}</h3>
                    <AdminPostMenu post={selectedPost} />
                </div>
                <div className="flex-1 overflow-y-auto pb-32">
                    {selectedPost.imageUrl ? <div className="w-full bg-slate-100"><img src={selectedPost.imageUrl} className="w-full h-auto" /></div> : selectedPost.thumbnail && <div className="w-full aspect-video bg-slate-100"><img src={selectedPost.thumbnail} className="w-full h-full object-cover" /></div>}
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">{selectedPost.author[0]}</div><div><div className="text-xs font-black text-slate-900">{selectedPost.author}</div><div className="text-[9px] text-slate-400 font-bold">{selectedPost.createdAt.split('T')[0]}</div></div></div>
                        {selectedPost.boardType === 'balance' && <div className="mb-8 space-y-4"><div className="grid grid-cols-2 gap-3 relative"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] z-10 border-2 border-white shadow-xl italic">VS</div><button onClick={() => handleBalanceVote('BLUE')} className="bg-gradient-to-br from-blue-600 to-blue-400 p-6 rounded-3xl text-center shadow-xl border border-white/20 active:scale-95 transition-transform"><div className="text-[9px] font-black text-blue-100 uppercase mb-2 opacity-60">TEAM BLUE</div><div className="text-white font-black text-base break-words leading-tight">{selectedPost.blueOption}</div><div className="mt-2 text-[8px] font-black text-blue-200">Votes: {selectedPost.blueVotes}</div></button><button onClick={() => handleBalanceVote('RED')} className="bg-gradient-to-br from-red-600 to-red-400 p-6 rounded-3xl text-center shadow-xl border border-white/20 active:scale-95 transition-transform"><div className="text-[9px] font-black text-red-100 uppercase mb-2 opacity-60">TEAM RED</div><div className="text-white font-black text-base break-words leading-tight">{selectedPost.redOption}</div><div className="mt-2 text-[8px] font-black text-red-200">Votes: {selectedPost.redVotes}</div></button></div></div>}
                        {selectedPost.boardType !== 'balance' && <h1 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">{selectedPost.title}</h1>}
                        <div className="prose prose-slate max-w-none text-slate-600 font-medium leading-relaxed text-sm mb-12" dangerouslySetInnerHTML={{ __html: marked.parse(selectedPost.content) }}></div>
                    </div>
                    <div className="px-6 space-y-12">
                        <div className="flex gap-2"><button onClick={() => handleVote('HEAD')} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] shadow-xl active:scale-95">🎯 헤드샷 {selectedPost.heads}</button>{selectedPost.boardType !== 'fun' && <button onClick={() => handleVote('HALF')} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[11px] active:scale-95">🛡️ 반샷 {selectedPost.halfshots}</button>}<button onClick={handleShare} className="w-14 py-4 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-100 transition-all"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 12.684a3 3 0 100-2.684 3 3 0 000 2.684z" /></svg></button></div>
                    </div>
                </div>
            </div>
        )}

        {viewMode === 'MAIN' && (
            <div className="absolute bottom-8 right-6 z-40">
                <button onClick={() => openWriteForm(activeTab === 'keuk' ? 'fun' : activeTab === 'stream' ? 'stream' : 'balance')} className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center border-4 border-white active:scale-90 transition-all hover:bg-blue-700 shadow-blue-500/20"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></button>
            </div>
        )}
        
        {isWriteFormOpen && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl relative border border-white/20 max-h-[95vh] overflow-y-auto scrollbar-hide">
                    <div className="mb-8 text-center"><span className={`inline-block px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${writeMode === 'balance' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>{writeMode === 'balance' ? 'Balance Game' : 'Post Content'}</span><h3 className="text-xl font-black text-slate-900 mt-4 tracking-tighter">{editingPostId ? '수정하기' : '작성하기'}</h3></div>
                    
                    <form onSubmit={submitPost} className="space-y-4">
                        {writeMode !== 'balance' && ( 
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Subject Data Upload (Max 500KB)</label>
                            <div className={`relative p-2 bg-slate-50 border-2 border-dashed rounded-3xl text-center transition-all ${filePreview ? 'border-cyan-500 bg-cyan-50/20' : 'border-slate-200'}`}>
                                <input type="file" id="fileInput" onChange={handleFileChange} accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" />
                                <label htmlFor="fileInput" className="cursor-pointer block">
                                    {filePreview ? (
                                        <div className="relative group overflow-hidden rounded-2xl aspect-video bg-slate-900 shadow-xl">
                                            <img src={filePreview} className="w-full h-full object-contain opacity-80" alt="Preview" />
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-white font-black text-[10px] uppercase tracking-widest">Change Image</span>
                                            </div>
                                            <div className="absolute top-2 left-2 px-2 py-0.5 bg-cyan-500 text-slate-950 text-[7px] font-black rounded uppercase">LAB_READY</div>
                                        </div>
                                    ) : (
                                        <div className="py-8 flex flex-col items-center justify-center gap-2">
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Drop Image Data Here</span>
                                        </div>
                                    )}
                                </label>
                            </div>
                          </div>
                        )}
                        {writeMode === 'balance' ? ( 
                          <div className="space-y-4">
                            <div className="space-y-1"><label className="text-[10px] font-black text-blue-500 uppercase ml-2">Team Blue Option</label><input type="text" value={blueOption} onChange={(e) => setBlueOption(e.target.value)} placeholder="파란색 팀 선택지" className="w-full p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl text-sm font-black focus:border-blue-500 outline-none" /></div>
                            <div className="text-center font-black italic text-slate-300 text-xs">VS</div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-red-500 uppercase ml-2">Team Red Option</label><input type="text" value={redOption} onChange={(e) => setRedOption(e.target.value)} placeholder="빨간색 팀 선택지" className="w-full p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-sm font-black focus:border-red-500 outline-none" /></div>
                          </div>
                        ) : ( 
                          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Title</label><input type="text" value={writeTitle} onChange={(e) => setWriteTitle(e.target.value)} placeholder="제목 (필수)" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black outline-none focus:bg-white" /></div>
                        )}
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Content</label><textarea value={writeContent} onChange={(e) => setWriteContent(e.target.value)} placeholder="내용을 입력하세요 (Markdown 지원)" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium h-40 resize-none outline-none focus:bg-white transition-all"></textarea></div>

                        <div className="flex gap-2 pt-4">
                            <button type="button" onClick={resetWriteForm} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black text-[10px] rounded-2xl">취소</button>
                            <button type="submit" disabled={isSubmitting || uploadProgress} className="flex-[1.5] py-4 bg-slate-900 text-white font-black text-[10px] rounded-2xl shadow-xl active:scale-95 disabled:opacity-50">
                                {uploadProgress ? '전송 중...' : isSubmitting ? '처리 중...' : '등록하기'}
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
