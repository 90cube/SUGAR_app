
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
    openCommunityUserProfile, openAuthModal, refreshAuthUser,
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
  
  // AI Parser (Update 요약용)
  const [summaryInputMode, setSummaryInputMode] = useState<'TEXT' | 'URL'>('TEXT');
  const [rawUpdateSource, setRawUpdateSource] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [masterPrompt, setMasterPrompt] = useState('당신은 서든어택 업데이트 전문 요약관입니다. 공식 홈페이지의 공지 원문을 분석하여 핵심 내용(점검 시간, 신규 아이템, 이벤트 보상 등)만 간추려 안내해 주십시오. 보상이나 스케줄 정보는 반드시 마크다운 표(Markdown Table) 형식을 사용하여 일목요연하게 정리해야 합니다.');

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
        else if (streamSubTab === 'LIST') fetchTabContent('stream');
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

  /**
   * 프론트엔드 작성 시간 제한 체크 (1분)
   */
  const checkThrottle = (type: 'POST' | 'COMMENT'): boolean => {
    const lastKey = `last_${type.toLowerCase()}_ts`;
    const lastTs = localStorage.getItem(lastKey);
    const now = Date.now();
    
    if (lastTs && now - parseInt(lastTs) < 60000) {
        const remaining = Math.ceil((60000 - (now - parseInt(lastTs))) / 1000);
        alert(`과도한 데이터 요청 감지: ${remaining}초 후에 다시 시도하십시오.`);
        return false;
    }
    return true;
  };

  const updateThrottle = (type: 'POST' | 'COMMENT') => {
    localStorage.setItem(`last_${type.toLowerCase()}_ts`, Date.now().toString());
  };

  const handleAdminAction = async (postId: string, action: 'DELETE' | 'TEMP') => {
    if (!window.confirm("정말 처리하시겠습니까?")) return;
    try {
        const success = action === 'DELETE' ? await communityService.deletePost(postId) : await communityService.movePostToTemp(postId);
        if (success) { 
            fetchTabContent(activeTab); 
            communityService.getPosts('update').then(setUpdatePosts);
            if (selectedPost?.id === postId) setViewMode('MAIN'); 
        }
    } catch (e: any) {
        alert(e.message);
    }
    setOpenAdminMenuId(null);
  };

  const handleStreamApproval = async (requestId: string) => {
      if (!window.confirm("승인하시겠습니까? 승인 즉시 방송 목록에 노출됩니다.")) return;
      setIsProcessing(true);
      try {
          const success = await communityService.processStreamingRequest(requestId, 'APPROVED', '승인되었습니다.');
          if (success) {
              communityService.getPendingStreamingRequests().then(setAdminRequests);
              fetchTabContent('stream');
          }
      } catch (e: any) { alert(e.message); }
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
      } catch (e: any) {
          alert(e.message);
      } finally {
          setIsProcessing(false);
      }
  };

  const handleVote = async (type: 'HEAD' | 'HALF') => {
    if (!isLoggedIn) return openAuthModal();
    if (!selectedPost) return;
    if (selectedPost.authorId === authUser?.id) return alert("본인의 글에는 할 수 없습니다.");
    try {
        const success = await communityService.votePost(selectedPost.id, type);
        if (success) {
            setSelectedPost(prev => prev ? { 
                ...prev, 
                heads: type === 'HEAD' ? prev.heads + 1 : prev.heads,
                halfshots: type === 'HALF' ? prev.halfshots + 1 : prev.halfshots
            } : null);
        }
    } catch (e: any) { alert(e.message); }
  };

  const handleBalanceVote = async (side: 'BLUE' | 'RED') => {
    if (!isLoggedIn) return openAuthModal();
    if (!selectedPost) return;
    if (selectedPost.authorId === authUser?.id) return alert("본인의 글에는 할 수 없습니다.");
    try {
        const success = await communityService.voteBalance(selectedPost.id, side);
        if (success) {
            alert(`${side}팀에 투표하셨습니다!`);
            setSelectedPost(prev => prev ? { 
                ...prev, 
                blueVotes: side === 'BLUE' ? prev.blueVotes + 1 : prev.blueVotes,
                redVotes: side === 'RED' ? prev.redVotes + 1 : prev.redVotes
            } : null);
        }
    } catch (e: any) { alert(e.message); }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) return openAuthModal();
    if (!selectedPost || !commentInput.trim() || isSubmitting) return;

    if (!checkThrottle('COMMENT')) return;

    setIsSubmitting(true);
    try {
        const newComment = await communityService.addComment(selectedPost.id, commentInput, commentTeam);
        if (newComment) {
            setCommentInput('');
            setComments(prev => [...prev, newComment]);
            updateThrottle('COMMENT');
            await refreshAuthUser();
        }
    } catch (err: any) {
        alert(err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleCommentDelete = async (commentId: string, authorNickname: string) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
    try {
        const success = await communityService.softDeleteComment(commentId, isAdmin, authorNickname);
        if (success) {
          // 삭제 후 다시 목록 불러와서 상태 갱신
          if (selectedPost) communityService.getComments(selectedPost.id).then(setComments);
          await refreshAuthUser();
        }
    } catch (e: any) { alert(e.message); }
  };

  const handleAiSummarize = async () => {
    if (!rawUpdateSource.trim()) return alert("입력 정보가 없습니다.");
    setIsSummarizing(true);
    try {
        const result = await geminiService.summarizeGameUpdate(rawUpdateSource, masterPrompt);
        setWriteTitle(result.title);
        setWriteContent(result.content);
        setRawUpdateSource('');
    } catch (e) {
        alert("AI 분석 중 오류가 발생했습니다. 직접 텍스트를 복사해 붙여넣어보세요.");
    } finally {
        setIsSummarizing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. 용량 필터링 (512KB)
    if (file.size > 512 * 1024) { 
        alert("이미지 용량은 512KB 이하만 업로드할 수 있습니다."); 
        e.target.value = ""; 
        return; 
    }

    // 2. 타입 필터링
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
    if (!isLoggedIn) return openAuthModal();
    if (isSubmitting || uploadProgress) return;

    // 1분 간격 제한 체크
    if (!checkThrottle('POST')) return;

    if (writeMode === 'stream') {
        if (!selectedFile) return alert("방송 썸네일 이미지를 업로드해주세요.");
        if (!streamUrl.trim()) return alert("방송 링크를 입력해주세요.");
        setIsSubmitting(true);
        setUploadProgress(true);
        try {
            // 스트리밍 버킷으로 업로드
            const urls = await communityService.uploadImage(selectedFile, 'stream'); 
            if (urls) {
                await communityService.createStreamingRequest({
                    platform: streamPlatform,
                    stream_url: streamUrl,
                    pr_url: streamPrUrl,
                    description: streamDescription,
                    thumbnail_url: urls.thumbnailUrl
                });
                alert("홍보 요청 완료! 승인 후 리스트에 노출됩니다.");
                updateThrottle('POST');
                resetWriteForm();
                setStreamSubTab('MY_REQUESTS');
            }
        } catch (err: any) { alert(err.message); }
        finally { setUploadProgress(false); setIsSubmitting(false); }
        return;
    }

    if (writeMode === 'balance' && (!blueOption.trim() || !redOption.trim())) return alert("양쪽 선택지를 입력하세요.");
    if (writeMode !== 'balance' && !writeTitle.trim()) return alert("제목을 입력하세요.");
    
    setIsSubmitting(true);
    let imageUrl = ''; let thumbnailUrl = '';
    
    // 이미지는 필수가 아님 (선택시에만 업로드)
    if (selectedFile) {
        setUploadProgress(true);
        try { 
          const urls = await communityService.uploadImage(selectedFile, writeMode); 
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
    
    try {
        let result;
        if (editingPostId) result = await communityService.updatePost(editingPostId, postData);
        else { const author = userProfile?.nickname || authUser?.name || 'Unknown'; result = await communityService.createPost({ ...postData, author }); }
        
        if (result) { 
          updateThrottle('POST');
          resetWriteForm(); 
          if (writeMode === 'update') communityService.getPosts('update').then(setUpdatePosts); 
          fetchTabContent(activeTab); 
          if (selectedPost?.id === result.id) setSelectedPost(result);
          await refreshAuthUser();
        }
    } catch (err: any) {
        if (err.message.includes("quota") || err.message.includes("limit")) {
            alert("일일 작성 제한: 하루 최대 30회까지 작성 가능합니다.");
        } else {
            alert(err.message);
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  const resetWriteForm = () => {
    setWriteTitle(''); setWriteContent(''); setWriteThumbnail(''); setBlueOption(''); setRedOption(''); setRawUpdateSource('');
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
        <button onClick={(e) => { e.stopPropagation(); setOpenAdminMenuId(isOpen ? null : post.id); }} className="w-8 h-8 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-white/40 transition-colors"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg></button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-mono">
            {post.authorId === authUser?.id && <button onClick={() => openEditForm(post)} className="w-full px-4 py-3 text-left text-[11px] font-bold text-slate-600 hover:bg-slate-50 border-b uppercase">Edit_Record</button>}
            {isAdmin && <button onClick={() => handleAdminAction(post.id, 'TEMP')} className="w-full px-4 py-3 text-left text-[11px] font-bold text-slate-600 hover:bg-slate-50 border-b uppercase">Move_Temp</button>}
            <button onClick={() => handleAdminAction(post.id, 'DELETE')} className="w-full px-4 py-3 text-left text-[11px] font-bold text-red-500 hover:bg-red-50 uppercase">Delete_Pkt</button>
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
              <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2 font-mono"><span className="text-cyan-500 text-xl">●</span> ARCHIVE_TERMINAL</h2>
           </div>
           <button onClick={closeCommunity} className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pb-32 space-y-10 scrollbar-hide">
           {(viewMode === 'MAIN' || viewMode === 'UPDATE_ARCHIVE') && (
             <>
               <section className="space-y-4">
                  <div className="flex items-center justify-between px-1 font-mono">
                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>Official_Data_Feed</h3>
                     <div className="flex gap-2">
                        {isAdmin && <button onClick={() => openWriteForm('update')} className="text-[9px] font-black bg-cyan-500 text-slate-950 px-3 py-1.5 rounded-xl shadow-lg active:scale-95 transition-transform uppercase tracking-widest">New_Notice</button>}
                        <button onClick={() => setViewMode(viewMode === 'MAIN' ? 'UPDATE_ARCHIVE' : 'MAIN')} className="text-[9px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-lg transition-all active:scale-95 uppercase">{viewMode === 'MAIN' ? 'LIST_VIEW' : 'DASHBOARD'}</button>
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
                              <div className="absolute bottom-0 left-0 p-4 w-full"><span className="inline-block px-2 py-0.5 bg-cyan-500 text-slate-950 text-[7px] font-black rounded-lg uppercase tracking-widest mb-1 font-mono">System_Update</span><h4 className="text-white text-sm font-black leading-tight line-clamp-2">{updatePosts[activeUpdateIdx].title}</h4></div>
                              <div className="absolute top-3 right-3 z-20" onClick={e => e.stopPropagation()}><AdminPostMenu post={updatePosts[activeUpdateIdx]} /></div>
                              <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg text-[7px] font-black text-white/70 uppercase font-mono">{activeUpdateIdx + 1} / {updatePosts.length}</div>
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
                                <div className="flex-1 font-mono"><span className="text-[8px] font-black text-slate-400 block mb-1 uppercase tracking-widest">TS_{post.createdAt.split('T')[0]}</span><h4 className="font-black text-slate-800 line-clamp-2 text-sm">{post.title}</h4></div>
                                <div onClick={e => e.stopPropagation()}><AdminPostMenu post={post} /></div>
                            </div>
                        ))}
                    </div>
                  )}
               </section>
               {viewMode === 'MAIN' && (
                 <section className="space-y-6 pt-2 font-mono">
                     <div className="sticky top-0 z-20 py-2 bg-slate-50/95 backdrop-blur-md">
                       <div className="flex p-1.5 bg-white border border-slate-200 rounded-[1.5rem] shadow-xl">
                          {(isAdmin ? ['balance', 'keuk', 'stream', 'temp'] : ['balance', 'keuk', 'stream']).map((tab) => (
                              <button key={tab} onClick={() => setActiveTab(tab as TabType)} className={`flex-1 py-3 rounded-2xl text-[9px] font-black transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}>{tab === 'balance' ? 'BALANCE' : tab === 'keuk' ? 'KEUK' : tab === 'stream' ? 'STREAM' : 'TEMP'}</button>
                          ))}
                       </div>
                     </div>
                     
                     <div className="space-y-4 min-h-[400px]">
                        {isLoading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div></div> : (
                            activeTab === 'stream' && streamSubTab === 'ADMIN_PENDING' ? (
                                <div className="space-y-4">
                                   {adminRequests.map(req => (
                                       <div key={req.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 shadow-xl space-y-4">
                                           <div className="flex gap-4">
                                               <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-900 flex-shrink-0">
                                                   <img src={req.thumbnail_url} className="w-full h-full object-cover" />
                                               </div>
                                               <div className="flex-1">
                                                   <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">{req.platform}</span>
                                                   <h4 className="font-black text-slate-800 text-sm mb-1">{req.profiles?.nickname || 'Unknown'} 님의 요청</h4>
                                                   <p className="text-[11px] text-slate-500 line-clamp-2">{req.description}</p>
                                               </div>
                                           </div>
                                           <div className="flex gap-2">
                                               <button onClick={() => handleStreamApproval(req.id)} className="flex-1 py-3 bg-slate-900 text-white text-[10px] font-black rounded-xl active:scale-95 transition-all">승인</button>
                                               <button onClick={() => setRejectingRequestId(req.id)} className="flex-1 py-3 bg-red-50 text-red-600 text-[10px] font-black rounded-xl active:scale-95 transition-all">반려</button>
                                           </div>
                                           {rejectingRequestId === req.id && (
                                               <div className="space-y-3 pt-3 border-t border-slate-100 animate-in slide-in-from-top-2">
                                                   <textarea value={rawRejectReason} onChange={e => setRawRejectReason(e.target.value)} placeholder="반려 사유 입력 (AI 가공 전)" className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-medium h-24 outline-none border border-slate-200" />
                                                   <div className="flex gap-2">
                                                       <button onClick={() => handleStreamRejection(req.id)} className="flex-1 py-3 bg-red-600 text-white text-[10px] font-black rounded-xl">AI_REJECT</button>
                                                       <button onClick={() => setRejectingRequestId(null)} className="flex-1 py-3 bg-slate-100 text-slate-500 text-[10px] font-black rounded-xl">CANCEL</button>
                                                   </div>
                                               </div>
                                           )}
                                       </div>
                                   ))}
                                   {adminRequests.length === 0 && <div className="text-center py-20 text-slate-300 font-black text-xs uppercase tracking-widest">No_Requests_Found</div>}
                                </div>
                            ) : activeTab === 'stream' && streamSubTab === 'MY_REQUESTS' ? (
                                <div className="space-y-4">
                                    {myRequests.map(req => (
                                        <div key={req.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-md flex items-center gap-4 transition-all hover:border-cyan-200">
                                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 shadow-inner"><img src={req.thumbnail_url} className="w-full h-full object-cover" /></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black text-white ${req.status === 'PENDING' ? 'bg-slate-400' : req.status === 'APPROVED' ? 'bg-cyan-500' : 'bg-red-500'}`}>{req.status}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold">TS_{req.created_at.split('T')[0]}</span>
                                                </div>
                                                <p className="text-xs font-black text-slate-800 truncate">{req.description || 'No Description'}</p>
                                                {req.admin_message && <div className="mt-2 p-3 bg-slate-50 rounded-xl text-[9px] font-medium text-slate-500 border border-slate-100 italic">LOG: {req.admin_message}</div>}
                                            </div>
                                        </div>
                                    ))}
                                    {myRequests.length === 0 && <div className="text-center py-20 text-slate-300 font-black text-xs uppercase tracking-widest">No_Active_Requests</div>}
                                </div>
                            ) : (
                                tabPosts.map((post) => (
                                    <div key={post.id} onClick={() => { setSelectedPost(post); setViewMode('POST_DETAIL'); }} className="bg-white rounded-3xl border border-slate-200 shadow-xl relative transition-all active:scale-[0.98] group overflow-hidden hover:border-cyan-200">
                                        <div className="absolute top-4 right-4 z-20" onClick={e => e.stopPropagation()}><AdminPostMenu post={post} /></div>
                                        {post.boardType === 'fun' ? (
                                            <div className="flex h-32">
                                                <div className="w-32 h-32 bg-slate-100 border-r border-slate-100 flex-shrink-0 overflow-hidden">
                                                  {post.thumbnailUrl ? (
                                                    <img src={post.thumbnailUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                  ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-slate-300 uppercase italic">No_Subject</div>
                                                  )}
                                                </div>
                                                <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
                                                    <h4 className="font-black text-slate-800 text-base line-clamp-1 group-hover:text-cyan-600 transition-colors">{post.title}</h4>
                                                    <div className="flex items-center justify-between text-[10px] font-black">
                                                       <div className="flex items-center gap-2">
                                                          <span onClick={e => { e.stopPropagation(); openCommunityUserProfile(post.author, post.authorId); }} className="text-slate-900 hover:underline">{post.author}</span>
                                                          <span className="text-slate-300">•</span>
                                                          <span className="text-slate-400 font-bold">TS_{post.createdAt.split('T')[0]}</span>
                                                       </div>
                                                       <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-50 text-cyan-600 rounded-full shadow-sm border border-cyan-100/50">
                                                          <span className="text-[8px]">🎯</span>
                                                          <span>{post.heads}</span>
                                                       </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : post.boardType === 'stream' ? (
                                            <div className="p-6 flex items-center gap-5">
                                               <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-md flex-shrink-0"><img src={post.thumbnailUrl} className="w-full h-full object-cover" /></div>
                                               <div className="flex-1 min-w-0">
                                                   <div className="flex items-center gap-2 mb-1">
                                                       <span className={`px-2 py-0.5 rounded-lg text-[7px] font-black text-white ${post.platform === 'CHZZK' ? 'bg-emerald-500' : post.platform === 'SOOP' ? 'bg-blue-500' : 'bg-red-500'}`}>{post.platform}</span>
                                                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Live_Sync</span>
                                                   </div>
                                                   <h4 className="font-black text-slate-800 text-sm line-clamp-1 group-hover:text-cyan-600 transition-colors">{post.author} 님의 방송</h4>
                                                   <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-1">{post.content}</p>
                                               </div>
                                               <div className="flex flex-col items-center gap-1.5">
                                                   <div className="text-[10px] font-black text-cyan-600">🎯 {post.heads}</div>
                                                   <div className="w-1 h-4 bg-slate-100 rounded-full"></div>
                                               </div>
                                            </div>
                                        ) : (
                                            <div className="p-6">
                                                <h4 className="font-black text-slate-800 text-base mb-4 line-clamp-2 leading-tight group-hover:text-cyan-600 transition-colors">{post.boardType === 'balance' ? `${post.blueOption} vs ${post.redOption}` : post.title}</h4>
                                                <div className="pt-5 border-t border-slate-50 flex items-center justify-between text-[10px] font-black text-slate-400">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px] font-black">{post.author[0].toUpperCase()}</div>
                                                        <span onClick={e => { e.stopPropagation(); openCommunityUserProfile(post.author, post.authorId); }} className="text-slate-900 hover:underline">{post.author}</span>
                                                    </div>
                                                    <span>TS_{post.createdAt.split('T')[0]}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )
                        )}
                     </div>
                 </section>
               )}
             </>
           )}
        </div>

        {viewMode === 'POST_DETAIL' && selectedPost && (
            <div className="absolute inset-0 bg-white z-[200] flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden font-mono">
                <div className="flex-shrink-0 h-16 border-b flex items-center justify-between px-4 sticky top-0 z-50 bg-white/80 backdrop-blur-md">
                    <button onClick={() => setViewMode(selectedPost.boardType === 'update' ? 'UPDATE_ARCHIVE' : 'MAIN')} className="p-2 -ml-2 text-slate-500"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
                    <h3 className="text-[10px] font-black text-slate-800 truncate px-4 uppercase tracking-widest">{selectedPost.boardType === 'balance' ? 'B_Analysis' : selectedPost.boardType === 'stream' ? 'Subject_Broadcast' : 'Archived_Record'}</h3>
                    <AdminPostMenu post={selectedPost} />
                </div>
                <div className="flex-1 overflow-y-auto pb-32 scrollbar-hide">
                    <div className="w-full bg-slate-50 py-6 px-5 space-y-4 shadow-inner">
                      {selectedPost.imageUrl && (
                        <div className="rounded-[2rem] overflow-hidden shadow-2xl border border-white bg-white group">
                          <img src={selectedPost.imageUrl} className="w-full h-auto transition-transform duration-700 hover:scale-105" />
                          <div className="px-5 py-3 bg-slate-50/50 flex justify-between items-center border-t border-slate-100">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Research_Data_Viz_Active</span>
                              <span className="text-[8px] font-black text-cyan-500">HI-RES_ENCRYPTED</span>
                          </div>
                        </div>
                      )}
                      {selectedPost.thumbnailUrl && selectedPost.thumbnailUrl !== selectedPost.imageUrl && (
                        <div className="flex justify-center">
                            <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-lg border-4 border-white ring-1 ring-slate-100 flex-shrink-0">
                                <img src={selectedPost.thumbnailUrl} className="w-full h-full object-cover" />
                            </div>
                        </div>
                      )}
                    </div>

                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                           <div className="w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-lg">{selectedPost.author[0]}</div>
                           <div><div className="text-xs font-black text-slate-900">{selectedPost.author}</div><div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">TS_{selectedPost.createdAt.split('T')[0]}</div></div>
                        </div>
                        
                        {selectedPost.boardType === 'stream' && (
                            <div className="mb-8 p-6 bg-slate-950 rounded-[2.5rem] border border-cyan-500/20 shadow-2xl overflow-hidden relative">
                               <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl"></div>
                               <div className="flex items-center gap-3 mb-4">
                                  <span className={`px-3 py-1 rounded-full text-[9px] font-black text-white ${selectedPost.platform === 'CHZZK' ? 'bg-emerald-500' : selectedPost.platform === 'SOOP' ? 'bg-blue-500' : 'bg-red-500'}`}>{selectedPost.platform}</span>
                                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Protocol: Stream_Access</span>
                               </div>
                               <h2 className="text-white font-black text-xl mb-4 tracking-tight leading-tight uppercase italic">{selectedPost.author} Broadcast_Link</h2>
                               <a href={selectedPost.streamUrl} target="_blank" rel="noopener noreferrer" className="w-full py-4 bg-cyan-500 text-slate-950 rounded-2xl font-black text-[11px] flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all uppercase tracking-[0.2em]">Live_Terminal_Open</a>
                            </div>
                        )}

                        {selectedPost.boardType === 'balance' && <div className="mb-8 space-y-4"><div className="grid grid-cols-2 gap-3 relative"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] z-10 border-2 border-white shadow-xl italic">VS</div><button onClick={() => handleBalanceVote('BLUE')} className="bg-gradient-to-br from-blue-600 to-blue-400 p-6 rounded-3xl text-center shadow-xl border border-white/20 active:scale-95 transition-transform"><div className="text-[9px] font-black text-blue-100 uppercase mb-2 opacity-60">TEAM BLUE</div><div className="text-white font-black text-base break-words leading-tight uppercase">{selectedPost.blueOption}</div><div className="mt-2 text-[8px] font-black text-blue-200 uppercase">Load_Pkt: {selectedPost.blueVotes}</div></button><button onClick={() => handleBalanceVote('RED')} className="bg-gradient-to-br from-red-600 to-red-400 p-6 rounded-3xl text-center shadow-xl border border-white/20 active:scale-95 transition-transform"><div className="text-[9px] font-black text-red-100 uppercase mb-2 opacity-60">TEAM RED</div><div className="text-white font-black text-base break-words leading-tight uppercase">{selectedPost.redOption}</div><div className="mt-2 text-[8px] font-black text-red-200 uppercase">Load_Pkt: {selectedPost.redVotes}</div></button></div></div>}
                        
                        {selectedPost.boardType !== 'balance' && selectedPost.boardType !== 'stream' && <h1 className="text-2xl font-black text-slate-900 mb-6 tracking-tight uppercase italic">{selectedPost.title}</h1>}
                        <div className="prose prose-slate max-w-none text-slate-600 font-medium leading-relaxed text-sm mb-12 selection:bg-cyan-100" dangerouslySetInnerHTML={{ __html: marked.parse(selectedPost.content) }}></div>
                    </div>
                    <div className="px-6 space-y-12 pb-20">
                        <div className="flex gap-2"><button onClick={() => handleVote('HEAD')} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] shadow-xl active:scale-95 transition-all uppercase tracking-widest">HS_Confirm {selectedPost.heads}</button><button onClick={() => handleVote('HALF')} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] active:scale-95 transition-all uppercase tracking-widest">Low_Imp {selectedPost.halfshots}</button><button onClick={handleShare} className="w-14 py-4 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-100 active:scale-90 transition-all shadow-inner"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 12.684a3 3 0 100-2.684 3 3 0 000 2.684z" /></svg></button></div>
                        <div className="space-y-6">
                           <div className="flex items-center justify-between"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Live_Feedback_Buffer ({comments.length})</h4></div>
                           <form onSubmit={handleCommentSubmit} className="space-y-3">
                              <textarea value={commentInput} onChange={(e) => setCommentInput(e.target.value)} placeholder="분석 의견을 입력하십시오..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium h-24 outline-none focus:bg-white focus:border-cyan-300 transition-all shadow-inner"></textarea>
                              <div className="flex justify-between items-center">
                                 <div className="flex p-1 bg-slate-100 rounded-xl shadow-inner border border-slate-200">
                                    {['GRAY', 'BLUE', 'RED'].map(team => (
                                       <button key={team} type="button" onClick={() => setCommentTeam(team as any)} className={`px-3 py-1.5 rounded-lg text-[8px] font-black transition-all uppercase ${commentTeam === team ? 'bg-white shadow text-slate-900 border border-slate-100' : 'text-slate-400'}`}>{team}</button>
                                    ))}
                                 </div>
                                 <button type="submit" disabled={!commentInput.trim() || isSubmitting} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black disabled:opacity-30 active:scale-95 transition-transform uppercase tracking-widest shadow-lg">Commit</button>
                              </div>
                           </form>
                           <div className="space-y-4">
                              {comments.map(c => (
                                 <div key={c.id} className="group relative animate-in fade-in duration-300">
                                    <div className="flex items-center gap-2 mb-1"><span onClick={() => openCommunityUserProfile(c.authorNickname, c.authorId)} className="text-[10px] font-black text-slate-900 hover:text-cyan-600 cursor-pointer transition-colors">{c.authorNickname}</span>{c.teamType !== 'GRAY' && <span className={`px-1.5 py-0.5 rounded text-[7px] font-black text-white ${c.teamType === 'BLUE' ? 'bg-blue-600' : 'bg-red-600'}`}>{c.teamType}</span>}<span className="text-[8px] text-slate-300 font-bold uppercase">TS_{c.createdAt.split('T')[0]}</span></div>
                                    <div className={`p-4 rounded-2xl text-[11px] font-medium transition-colors ${c.isDeleted ? 'bg-slate-100 text-slate-400 border border-slate-100 italic' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                                      {c.isDeleted ? (
                                        c.deletedReason === 'ADMIN_ACTION' ? "관리자에 의한 댓글 삭제" : `${c.authorNickname} 자진 삭제`
                                      ) : c.content}
                                    </div>
                                    {(isAdmin || c.authorId === authUser?.id) && !c.isDeleted && <button onClick={() => handleCommentDelete(c.id, c.authorNickname)} className="absolute top-0 right-0 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>}
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
                <button onClick={() => openWriteForm(activeTab === 'keuk' ? 'fun' : activeTab === 'stream' ? 'stream' : 'balance')} className="w-14 h-14 bg-cyan-500 text-slate-950 rounded-full shadow-2xl flex items-center justify-center border-4 border-white active:scale-90 transition-all hover:bg-cyan-400 shadow-cyan-500/30 hover:rotate-90"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></button>
            </div>
        )}
        
        {isWriteFormOpen && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex items-center justify-center p-6 animate-in fade-in duration-300 font-mono">
                <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative border border-white/20 max-h-[95vh] overflow-y-auto scrollbar-hide">
                    <div className="mb-8 text-center">
                        <span className={`inline-block px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] shadow-inner ${writeMode === 'balance' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>{writeMode === 'balance' ? 'Pkt_Comparative' : writeMode === 'stream' ? 'Deploy_Stream' : 'Data_Archive'}</span>
                        <h3 className="text-lg font-black text-slate-900 mt-4 tracking-tighter italic uppercase">{editingPostId ? 'Edit_Record' : 'New_Archive_Sync'}</h3>
                    </div>
                    
                    <form onSubmit={submitPost} className="space-y-4">
                        {writeMode === 'stream' ? (
                            <div className="space-y-4">
                               <div className="space-y-1">
                                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Platform_Selector</label>
                                   <div className="flex gap-2 p-1 bg-slate-50 rounded-xl border border-slate-100">
                                       {['CHZZK', 'SOOP', 'YOUTUBE'].map(p => (
                                           <button key={p} type="button" onClick={() => setStreamPlatform(p as any)} className={`flex-1 py-2.5 text-[8px] font-black rounded-lg transition-all ${streamPlatform === p ? 'bg-slate-900 text-white shadow-lg' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}>{p}</button>
                                       ))}
                                   </div>
                               </div>
                               <div className="space-y-1">
                                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Broadcast_EP</label>
                                   <input type="text" value={streamUrl} onChange={e => setStreamUrl(e.target.value)} placeholder="https://..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold outline-none focus:border-cyan-300 transition-colors" />
                               </div>
                               <div className="space-y-1">
                                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Promotion_Meta (Optional)</label>
                                   <input type="text" value={streamPrUrl} onChange={e => setStreamPrUrl(e.target.value)} placeholder="COMM_Notice_URL" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold outline-none focus:border-cyan-300 transition-colors" />
                               </div>
                               <div className="space-y-1">
                                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Descr_Field</label>
                                   <textarea value={streamDescription} onChange={e => setStreamDescription(e.target.value)} placeholder="Sync Schedule & Concept" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-medium h-24 resize-none outline-none focus:border-cyan-300" />
                               </div>
                               <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Thumb_Pkt_Upload (Max 512KB)</label>
                                    <div className="p-2 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center relative transition-all hover:border-cyan-200">
                                        <input type="file" id="streamFile" onChange={handleFileChange} accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" />
                                        <label htmlFor="streamFile" className="cursor-pointer block py-6">
                                            {filePreview ? <img src={filePreview} className="max-h-32 mx-auto rounded-xl shadow-2xl" /> : <div className="flex flex-col items-center gap-2 text-slate-300"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span className="text-[8px] font-black uppercase tracking-widest">Select_Visual_Pkt</span></div>}
                                        </label>
                                    </div>
                               </div>
                            </div>
                        ) : (
                            <>
                                {writeMode === 'update' && (
                                    <div className="space-y-1 p-4 bg-cyan-50 border border-cyan-100 rounded-3xl mb-4">
                                        <div className="flex gap-2 mb-3">
                                            <button 
                                                type="button" 
                                                onClick={() => setSummaryInputMode('TEXT')}
                                                className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${summaryInputMode === 'TEXT' ? 'bg-cyan-500 text-slate-950' : 'bg-white text-slate-400'}`}
                                            >
                                                Pkt_Text
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => setSummaryInputMode('URL')}
                                                className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${summaryInputMode === 'URL' ? 'bg-cyan-500 text-slate-950' : 'bg-white text-slate-400'}`}
                                            >
                                                Pkt_Link
                                            </button>
                                        </div>

                                        <label className="text-[9px] font-black text-cyan-600 uppercase tracking-widest ml-2">AI_Notice_Master_Prompt</label>
                                        <textarea 
                                          value={masterPrompt} 
                                          onChange={e => setMasterPrompt(e.target.value)} 
                                          className="w-full p-3 bg-white border border-cyan-100 rounded-xl text-[9px] font-bold h-16 resize-none outline-none focus:border-cyan-400 mb-2 shadow-inner" 
                                        />
                                        
                                        <label className="text-[9px] font-black text-cyan-600 uppercase tracking-widest ml-2">
                                            {summaryInputMode === 'TEXT' ? 'Raw_Notice_Buffer (텍스트)' : 'Target_Notice_URL (링크)'}
                                        </label>
                                        <textarea 
                                          value={rawUpdateSource} 
                                          onChange={e => setRawUpdateSource(e.target.value)} 
                                          placeholder={summaryInputMode === 'TEXT' ? "공식 홈페이지 내용을 복사해오세요..." : "분석할 서든어택 공지사항 URL을 입력하세요..."}
                                          className="w-full p-4 bg-white border border-cyan-100 rounded-2xl text-[10px] font-medium h-24 resize-none outline-none focus:border-cyan-400 shadow-inner" 
                                        />
                                        <button 
                                          type="button" 
                                          onClick={handleAiSummarize} 
                                          disabled={isSummarizing || !rawUpdateSource.trim()}
                                          className="w-full mt-2 py-3 bg-cyan-500 text-slate-950 font-black text-[9px] rounded-xl shadow-lg active:scale-95 disabled:opacity-50 uppercase tracking-widest"
                                        >
                                          {isSummarizing ? 'Processing...' : summaryInputMode === 'TEXT' ? 'Execute_AI_Summarize' : 'Remote_Analyze_URL'}
                                        </button>
                                    </div>
                                )}
                                {writeMode !== 'balance' && ( 
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Visual_Buffer_Load (Max 512KB)</label>
                                    <div className={`relative p-2 bg-slate-50 border-2 border-dashed rounded-3xl text-center transition-all ${filePreview ? 'border-cyan-500 bg-cyan-50/20' : 'border-slate-200 hover:border-cyan-200'}`}>
                                        <input type="file" id="fileInput" onChange={handleFileChange} accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" />
                                        <label htmlFor="fileInput" className="cursor-pointer block">
                                            {filePreview ? (
                                                <div className="relative group overflow-hidden rounded-2xl aspect-video bg-slate-900 shadow-xl">
                                                    <img src={filePreview} className="w-full h-full object-contain opacity-80" alt="Preview" />
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-white font-black text-[9px] uppercase tracking-[0.2em]">Pkt_Replace</span>
                                                    </div>
                                                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-cyan-500 text-slate-950 text-[7px] font-black rounded uppercase tracking-widest">LAB_SYNC_RDY</div>
                                                </div>
                                            ) : (
                                                <div className="py-8 flex flex-col items-center justify-center gap-2">
                                                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 shadow-inner">
                                                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    </div>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Drop_Visual_Data (Optional)</span>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                  </div>
                                )}
                                {writeMode === 'balance' ? ( 
                                  <div className="space-y-4">
                                    <div className="space-y-1"><label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-2">Team_Blue_Pkt</label><input type="text" value={blueOption} onChange={(e) => setBlueOption(e.target.value)} placeholder="BLUE_IDENTIFIER" className="w-full p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl text-[11px] font-black focus:border-blue-500 outline-none uppercase shadow-inner" /></div>
                                    <div className="text-center font-black italic text-slate-300 text-xs">VS_PKT</div>
                                    <div className="space-y-1"><label className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-2">Team_Red_Pkt</label><input type="text" value={redOption} onChange={(e) => setRedOption(e.target.value)} placeholder="RED_IDENTIFIER" className="w-full p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-[11px] font-black focus:border-red-500 outline-none uppercase shadow-inner" /></div>
                                  </div>
                                ) : ( 
                                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Subject_UID</label><input type="text" value={writeTitle} onChange={(e) => setWriteTitle(e.target.value)} placeholder="DATA_TITLE_ENTRY" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black outline-none focus:border-cyan-300 uppercase shadow-inner" /></div>
                                )}
                                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Report_Body</label><textarea value={writeContent} onChange={(e) => setWriteContent(e.target.value)} placeholder="Markdown Protocol Supported" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-medium h-40 resize-none outline-none focus:border-cyan-300 shadow-inner"></textarea></div>
                            </>
                        )}

                        <div className="flex gap-2 pt-4">
                            <button type="button" onClick={resetWriteForm} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black text-[9px] rounded-2xl uppercase tracking-widest">Terminate</button>
                            <button type="submit" disabled={isSubmitting || uploadProgress} className="flex-[1.5] py-4 bg-slate-900 text-cyan-400 font-black text-[9px] rounded-2xl shadow-xl active:scale-95 disabled:opacity-50 uppercase tracking-[0.2em] border border-cyan-500/20">
                                {uploadProgress ? 'UPLOADING...' : isSubmitting ? 'SYNCING...' : 'COMMIT_ARCHIVE'}
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
