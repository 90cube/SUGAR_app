
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
  const [tabPosts, setTabPosts] = useState<CommunityPost[]>([]);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openAdminMenuId, setOpenAdminMenuId] = useState<string | null>(null);
  
  // Streaming Management UI State
  const [streamSubTab, setStreamSubTab] = useState<'LIST' | 'MY_REQUESTS' | 'ADMIN_PENDING'>('LIST');
  const [myRequests, setMyRequests] = useState<StreamingRequest[]>([]);
  const [adminRequests, setAdminRequests] = useState<StreamingRequest[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rawRejectReason, setRawRejectReason] = useState('');

  // Write Form Internal State
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [writeMode, setWriteMode] = useState<BoardType>('balance');
  const [writeTitle, setWriteTitle] = useState('');
  const [writeContent, setWriteContent] = useState('');
  const [writeThumbnail, setWriteThumbnail] = useState('');
  const [blueOption, setBlueOption] = useState('');
  const [redOption, setRedOption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Streaming Request Specialized State
  const [streamPlatform, setStreamPlatform] = useState<'CHZZK' | 'SOOP' | 'YOUTUBE'>('CHZZK');
  const [streamUrl, setStreamUrl] = useState('');
  const [streamPrUrl, setStreamPrUrl] = useState('');
  const [streamDescription, setStreamDescription] = useState('');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  
  // AI Summarizer State
  const [rawUpdateText, setRawUpdateText] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [masterPrompt, setMasterPrompt] = useState('당신은 서든어택 업데이트 전문 요약가입니다. 공지 원문의 모든 핵심 내용을 하나도 놓치지 마세요. 가독성을 극대화하기 위해 Markdown 문법을 사용하며, 특히 아이템 스펙이나 보상 목록은 반드시 Markdown 표(Table) 기능을 사용하여 일목요연하게 정리하세요. 제목은 공지 날짜를 포함하여 해당 패치의 핵심 항목들을 간결하게 요약하여 작성하세요. (예: [24.05.23] 신규 무기 마이건2 및 맵 개편)');
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
    if (selectedPost && (viewMode === 'POST_DETAIL')) {
        communityService.getComments(selectedPost.id).then(setComments);
    }
  }, [selectedPost, viewMode]);

  useEffect(() => {
    if (activeTab === 'stream') {
        if (streamSubTab === 'MY_REQUESTS') {
            communityService.getMyStreamingRequests().then(setMyRequests);
        } else if (streamSubTab === 'ADMIN_PENDING' && isAdmin) {
            communityService.getPendingStreamingRequests().then(setAdminRequests);
        }
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

  const handleStreamApproval = async (requestId: string) => {
      if (!window.confirm("이 스트리밍을 승인하시겠습니까?")) return;
      setIsProcessing(true);
      const success = await communityService.processStreamingRequest(requestId, 'APPROVED', '승인되었습니다. 전용 보관함에 게시되었습니다.');
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
          // AI-Powered Formalization
          const formalMessage = await geminiService.generateFormalRejection(rawRejectReason);
          const success = await communityService.processStreamingRequest(requestId, 'REJECTED', formalMessage);
          if (success) {
              setRejectingRequestId(null);
              setRawRejectReason('');
              communityService.getPendingStreamingRequests().then(setAdminRequests);
          }
      } catch (e) {
          console.error(e);
          alert("AI 처리 중 오류 발생");
      } finally {
          setIsProcessing(false);
      }
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

  const handleCommentDelete = async (commentId: string) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
    const success = await communityService.softDeleteComment(commentId);
    if (success) {
      if (selectedPost) {
        communityService.getComments(selectedPost.id).then(setComments);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { alert("파일 용량이 너무 큽니다. (500KB 이하만 가능)"); e.target.value = ""; return; }
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!ext || !allowed.includes(ext)) { alert("허용되지 않는 파일 형식입니다. (jpg, png, webp, gif)"); e.target.value = ""; return; }
    
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || uploadProgress) return;

    if (writeMode === 'stream') {
        if (!selectedFile) { alert("썸네일 이미지를 반드시 업로드해야 합니다."); return; }
        if (!streamUrl.trim()) { alert("방송 링크를 입력해주세요."); return; }
        
        setIsSubmitting(true);
        setUploadProgress(true);
        let thumbnailUrl = '';
        try {
            const urls = await communityService.uploadKukkukImage(selectedFile);
            if (urls) thumbnailUrl = urls.thumbnailUrl;
            
            const success = await communityService.createStreamingRequest({
                platform: streamPlatform,
                stream_url: streamUrl,
                pr_url: streamPrUrl,
                description: streamDescription,
                thumbnail_url: thumbnailUrl
            });

            if (success) {
                alert("게시 요청이 완료되었습니다. 관리자 승인 후 리스트에 노출됩니다.");
                resetWriteForm();
                setStreamSubTab('MY_REQUESTS');
            }
        } catch (err: any) {
            alert(`처리 중 오류 발생: ${err.message}`);
        } finally {
            setUploadProgress(false);
            setIsSubmitting(false);
        }
        return;
    }

    if (writeMode === 'balance' && (!blueOption.trim() || !redOption.trim())) { alert("양쪽 선택지를 모두 입력해주세요."); return; }
    if (writeMode === 'fun' && !selectedFile && !editingPostId) { alert("이미지 파일을 반드시 업로드해야 합니다."); return; }
    if (writeMode !== 'balance' && !writeTitle.trim()) { alert("제목을 입력해주세요."); return; }
    
    setIsSubmitting(true);
    let imageUrl = ''; let thumbnailUrl = '';
    
    if (writeMode === 'fun' && selectedFile) {
        setUploadProgress(true);
        try { 
          const urls = await communityService.uploadKukkukImage(selectedFile); 
          if (urls) { imageUrl = urls.imageUrl; thumbnailUrl = urls.thumbnailUrl; } 
        }
        catch (err: any) { alert(`이미지 업로드 실패: ${err.message}`); setIsSubmitting(false); setUploadProgress(false); return; }
        setUploadProgress(false);
    }
    
    const postData = { title: writeTitle, content: writeContent, boardType: writeMode, thumbnail: writeThumbnail, blueOption, redOption, imageUrl, thumbnailUrl };
    let result;
    if (editingPostId) { result = await communityService.updatePost(editingPostId, postData); }
    else { const author = userProfile?.nickname || authUser?.name || 'Unknown'; result = await communityService.createPost({ ...postData, author }); }
    
    if (result) { 
      resetWriteForm(); 
      if (writeMode === 'update') { communityService.getPosts('update').then(setUpdatePosts); } 
      fetchTabContent(activeTab); 
      if (selectedPost?.id === result.id) { setSelectedPost(result); } 
    }
    setIsSubmitting(false);
  };

  const resetWriteForm = () => {
    setWriteTitle(''); setWriteContent(''); setWriteThumbnail(''); setBlueOption(''); setRedOption(''); setRawUpdateText('');
    setStreamUrl(''); setStreamPrUrl(''); setStreamDescription(''); setStreamPlatform('CHZZK');
    setEditingPostId(null); setSelectedFile(null); setFilePreview(null); setIsWriteFormOpen(false);
  };

  const openWriteForm = (mode: BoardType) => {
    if (!isLoggedIn) { openAuthModal(); return; }
    setWriteMode(mode); setEditingPostId(null); setIsWriteFormOpen(true);
  };

  const openEditForm = (post: CommunityPost) => {
    setEditingPostId(post.id); setWriteMode(post.boardType); setWriteTitle(post.title); setWriteContent(post.content); setWriteThumbnail(post.thumbnail || '');
    setBlueOption(post.blueOption || ''); setRedOption(post.redOption || ''); setIsWriteFormOpen(true); setOpenAdminMenuId(null);
  };

  const handleShare = () => { navigator.clipboard.writeText(window.location.href); alert("링크가 복사되었습니다!"); };

  const AdminPostMenu = ({ post }: { post: CommunityPost }) => {
    const isOpen = openAdminMenuId === post.id;
    const canManage = isAdmin || post.authorId === authUser?.id;
    if (!canManage) return null;
    return (
      <div className="relative">
        <button onClick={(e) => { e.stopPropagation(); setOpenAdminMenuId(isOpen ? null : post.id); }} className="w-8 h-8 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 border border-white/10"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg></button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
            <button onClick={() => openEditForm(post)} className="w-full px-4 py-3 text-left text-[11px] font-bold text-slate-600 hover:bg-slate-50 border-b">📝 수정하기 (Edit)</button>
            {isAdmin && <button onClick={() => handleAdminAction(post.id, 'TEMP')} className="w-full px-4 py-3 text-left text-[11px] font-bold text-slate-600 hover:bg-slate-50 border-b">📁 격리(TEMP)</button>}
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
                        <button onClick={() => setViewMode(viewMode === 'MAIN' ? 'UPDATE_ARCHIVE' : 'MAIN')} className="text-[9px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-lg transition-all active:scale-95">{viewMode === 'MAIN' ? '목록보기' : '메인으로'}</button>
                     </div>
                  </div>
                  {viewMode === 'MAIN' ? (
                    updatePosts[0] && (
                        <div className="flex justify-center w-full">
                            <div onClick={() => { setSelectedPost(updatePosts[0]); setViewMode('POST_DETAIL'); }} className="relative w-2/3 aspect-video rounded-[1.5rem] overflow-hidden shadow-2xl border border-white/20 cursor-pointer transition-transform active:scale-[0.98]">
                                {updatePosts[0].thumbnail ? <img src={updatePosts[0].thumbnail} className="absolute inset-0 w-full h-full object-cover" alt="" /> : <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-white/5 font-black text-2xl italic">NOTICE</div>}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 p-4 w-full"><span className="inline-block px-2 py-0.5 bg-cyan-500 text-slate-950 text-[7px] font-black rounded-lg uppercase tracking-widest mb-1">System Update</span><h4 className="text-white text-sm font-black leading-tight line-clamp-2">{updatePosts[0].title}</h4></div>
                                <div className="absolute top-3 right-3 z-20" onClick={e => e.stopPropagation()}><AdminPostMenu post={updatePosts[0]} /></div>
                            </div>
                        </div>
                    )
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right duration-500">
                        {updatePosts.map((post) => (
                            <div key={post.id} onClick={() => { setSelectedPost(post); setViewMode('POST_DETAIL'); }} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-md flex gap-4 items-center group cursor-pointer active:scale-95 transition-all">
                                {post.thumbnail && <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border bg-slate-100"><img src={post.thumbnail} className="w-full h-full object-cover" alt="" /></div>}
                                <div className="flex-1"><span className="text-[8px] font-black text-slate-400 block mb-1 uppercase tracking-widest">{post.createdAt.split('T')[0]}</span><h4 className="font-black text-slate-800 line-clamp-2 leading-snug group-hover:text-cyan-600 text-sm">{post.title}</h4></div>
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
                              <button key={tab} onClick={() => setActiveTab(tab as TabType)} className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}>{tab === 'balance' ? '밸런스' : tab === 'keuk' ? '큭큭' : tab === 'stream' ? '홍보' : '임시'}</button>
                          ))}
                       </div>
                       
                       {activeTab === 'stream' && (
                         <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-1">
                            <button onClick={() => setStreamSubTab('LIST')} className={`whitespace-nowrap px-4 py-2 rounded-xl text-[9px] font-black border transition-all ${streamSubTab === 'LIST' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-200'}`}>활성 스트림</button>
                            <button onClick={() => setStreamSubTab('MY_REQUESTS')} className={`whitespace-nowrap px-4 py-2 rounded-xl text-[9px] font-black border transition-all ${streamSubTab === 'MY_REQUESTS' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-200'}`}>내 요청 상태</button>
                            {isAdmin && (
                              <button onClick={() => setStreamSubTab('ADMIN_PENDING')} className={`whitespace-nowrap px-4 py-2 rounded-xl text-[9px] font-black border transition-all ${streamSubTab === 'ADMIN_PENDING' ? 'bg-red-600 text-white border-red-600 shadow-lg' : 'bg-white text-red-400 border-red-200'}`}>대기 중인 요청</button>
                            )}
                         </div>
                       )}
                     </div>

                     <div className="space-y-4 min-h-[400px]">
                        {isLoading ? <div className="flex justify-center py-20 opacity-30"><div className="w-8 h-8 border-3 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div></div> : (
                            activeTab === 'stream' && streamSubTab === 'MY_REQUESTS' ? (
                                myRequests.length === 0 ? <div className="text-center py-24 text-slate-300 font-black text-xs uppercase tracking-widest bg-white/40 border-2 border-dashed border-slate-200 rounded-[2.5rem]">No Requests Sent</div> : 
                                myRequests.map(req => (
                                    <div key={req.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex justify-between items-center">
                                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700 border border-green-200' : req.status === 'REJECTED' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200 animate-pulse'}`}>{req.status}</span>
                                            <span className="text-[9px] font-bold text-slate-300">{req.created_at.split('T')[0]}</span>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="w-24 h-14 rounded-xl overflow-hidden bg-slate-100 border flex-shrink-0 shadow-inner"><img src={req.thumbnail_url} className="w-full h-full object-cover" /></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] font-black text-slate-400 mb-1">{req.platform}</div>
                                                <div className="text-xs font-black text-slate-800 truncate">{req.stream_url}</div>
                                            </div>
                                        </div>
                                        {req.admin_message && (
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative">
                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Laboratory Feedback</div>
                                                <div className="text-[11px] font-medium text-slate-600 leading-relaxed italic">"{req.admin_message}"</div>
                                                <div className="absolute top-4 right-4 text-slate-100">
                                                   <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017V14H15.017C14.4647 14 14.017 13.5523 14.017 13V11C14.017 10.4477 14.4647 10 15.017 10H20.017C20.5693 10 21.017 10.4477 21.017 11V18C21.017 19.6569 19.6739 21 18.017 21H14.017ZM3.017 21L3.017 18C3.017 16.8954 3.91243 16 5.017 16H8.017V14H4.017C3.46472 14 3.017 13.5523 3.017 13V11C3.017 10.4477 3.46472 10 4.017 10H9.017C9.56928 10 10.017 10.4477 10.017 11V18C10.017 19.6569 8.67386 21 7.017 21H3.017Z" /></svg>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : activeTab === 'stream' && streamSubTab === 'ADMIN_PENDING' && isAdmin ? (
                                adminRequests.length === 0 ? <div className="text-center py-24 text-slate-300 font-black text-xs uppercase tracking-widest bg-white/40 border-2 border-dashed border-slate-200 rounded-[2.5rem]">All Requests Processed</div> : 
                                adminRequests.map(req => (
                                    <div key={req.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl space-y-4 relative overflow-hidden group">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shadow-lg">
                                                    {req.profiles?.nickname[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-black text-slate-900">{req.profiles?.nickname}</div>
                                                    <div className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">{req.platform} ANALYZE_REQ</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleStreamApproval(req.id)} className="px-4 py-2 bg-green-500 text-white text-[10px] font-black rounded-xl shadow-lg active:scale-95 transition-all">APPROVE</button>
                                                <button onClick={() => setRejectingRequestId(req.id)} className="px-4 py-2 bg-red-500 text-white text-[10px] font-black rounded-xl shadow-lg active:scale-95 transition-all">REJECT</button>
                                            </div>
                                        </div>
                                        <div className="aspect-video rounded-3xl overflow-hidden bg-slate-100 border-2 border-slate-100 shadow-inner group-hover:border-cyan-200 transition-all"><img src={req.thumbnail_url} className="w-full h-full object-cover" /></div>
                                        <div className="text-[10px] font-mono text-cyan-600 break-all bg-cyan-50/50 p-3 rounded-2xl border border-cyan-100 shadow-sm">{req.stream_url}</div>
                                        <p className="text-xs text-slate-600 leading-relaxed font-medium px-1">{req.description || "No description provided."}</p>
                                        
                                        {rejectingRequestId === req.id && (
                                            <div className="mt-4 p-5 bg-slate-950 rounded-3xl animate-in slide-in-from-top-2 border-2 border-red-500/30">
                                                <label className="text-[9px] font-black text-red-400 uppercase mb-3 block tracking-widest flex items-center gap-2">
                                                   <span className="w-1 h-1 bg-red-500 rounded-full animate-ping"></span> Reject_Protocol_Input
                                                </label>
                                                <textarea value={rawRejectReason} onChange={(e) => setRawRejectReason(e.target.value)} className="w-full h-24 p-4 bg-slate-900 text-white border border-white/10 rounded-2xl text-xs focus:outline-none focus:border-red-500 font-medium mb-4 resize-none" placeholder="반려 사유를 입력하면 AI가 정중하게 다듬어줍니다..." />
                                                <div className="flex gap-3">
                                                    <button disabled={isProcessing} onClick={() => handleStreamRejection(req.id)} className="flex-[2] py-3.5 bg-red-600 text-white text-[11px] font-black rounded-2xl active:scale-95 disabled:opacity-50 shadow-xl shadow-red-900/20 flex items-center justify-center gap-2">
                                                        {isProcessing ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : '🚀 AI REJECT_PROCESS'}
                                                    </button>
                                                    <button onClick={() => setRejectingRequestId(null)} className="flex-1 py-3.5 bg-slate-800 text-white text-[11px] font-black rounded-2xl">CANCEL</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : tabPosts.length === 0 ? <div className="text-center py-24 text-slate-300 font-black text-xs uppercase tracking-widest bg-white/40 border-2 border-dashed border-slate-200 rounded-[2.5rem]">No Feed Found</div> : tabPosts.map((post) => (
                                <div key={post.id} onClick={() => { setSelectedPost(post); setViewMode('POST_DETAIL'); }} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl relative transition-all active:scale-[0.98] group hover:border-slate-300 overflow-hidden">
                                    <div className="absolute top-6 right-6 z-20" onClick={e => e.stopPropagation()}><AdminPostMenu post={post} /></div>
                                    {post.boardType === 'fun' ? (
                                        <div className="flex gap-4 items-center">
                                            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-md flex-shrink-0">{post.thumbnailUrl ? <img src={post.thumbnailUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-slate-300 uppercase">No_Img</div>}</div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-black text-slate-800 text-sm mb-1 group-hover:text-blue-600 transition-colors truncate">{post.title}</h4>
                                                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400">
                                                   <span className="text-blue-600">🎯 {post.heads}</span>
                                                   <span onClick={e => { e.stopPropagation(); openCommunityUserProfile(post.author, post.authorId); }} className="hover:underline">{post.author}</span>
                                                   <span>{post.createdAt.split('T')[0]}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : post.boardType === 'stream' ? (
                                        <div className="space-y-4">
                                            <div className="relative aspect-video rounded-3xl overflow-hidden bg-slate-900 border-2 border-white shadow-xl">
                                                <img src={post.thumbnailUrl} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
                                                <div className="absolute top-4 left-4"><span className={`px-2.5 py-1 rounded-lg text-[8px] font-black text-white shadow-lg ${post.platform === 'CHZZK' ? 'bg-[#00FFA3] text-black' : post.platform === 'SOOP' ? 'bg-[#2A65F0]' : 'bg-[#FF0000]'}`}>{post.platform} LIVE</span></div>
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-5">
                                                    <div className="text-white">
                                                        <div className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">{post.author} IS STREAMING</div>
                                                        <h4 className="text-base font-black truncate">{post.title}</h4>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <><h4 className="font-black text-slate-800 text-base mb-4 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">{post.boardType === 'balance' ? `${post.blueOption} vs ${post.redOption}` : post.title}</h4><div className="pt-5 border-t border-slate-50 flex items-center justify-between text-[10px] font-black text-slate-400"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px] font-black shadow-lg">{post.author[0].toUpperCase()}</div><span onClick={e => { e.stopPropagation(); openCommunityUserProfile(post.author, post.authorId); }} className="text-slate-900 hover:underline">{post.author}</span></div><span>{post.createdAt.split('T')[0]}</span></div></>
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
                    <h3 className="text-xs font-black text-slate-800 truncate px-4">{selectedPost.boardType === 'balance' ? '밸런스 게임' : selectedPost.boardType === 'update' ? 'System Update' : selectedPost.boardType === 'stream' ? 'Stream Broadcast' : selectedPost.title}</h3>
                    <AdminPostMenu post={selectedPost} />
                </div>
                <div className="flex-1 overflow-y-auto pb-32">
                    {selectedPost.boardType === 'stream' ? (
                        <div className="relative">
                            <div className="aspect-video bg-slate-900 relative">
                                <img src={selectedPost.thumbnailUrl} className="w-full h-full object-cover opacity-60" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <a 
                                        href={selectedPost.streamUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="px-8 py-4 bg-white text-slate-900 font-black rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.4)] flex items-center gap-3 active:scale-95 transition-all hover:bg-slate-50 ring-4 ring-white/10"
                                    >
                                        <span className="relative flex h-3 w-3">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                        </span>
                                        📡 ACCESS LIVE STREAM
                                    </a>
                                </div>
                                <div className="absolute bottom-6 left-6"><span className={`px-4 py-1.5 rounded-xl text-[10px] font-black text-white ${selectedPost.platform === 'CHZZK' ? 'bg-[#00FFA3] text-black' : selectedPost.platform === 'SOOP' ? 'bg-[#2A65F0]' : 'bg-[#FF0000]'}`}>{selectedPost.platform} CONNECTED</span></div>
                            </div>
                            <div className="p-8 space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-xl">{selectedPost.author[0].toUpperCase()}</div>
                                    <div><div className="text-xl font-black text-slate-900">{selectedPost.author}</div><div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Active Streamer</div></div>
                                </div>
                                <div><h1 className="text-3xl font-black text-slate-900 leading-tight tracking-tighter mb-4">{selectedPost.title}</h1><p className="text-slate-600 font-medium leading-relaxed">{selectedPost.content || "방송 소개 내용이 없습니다."}</p></div>
                                {selectedPost.prUrl && (<a href={selectedPost.prUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-5 bg-cyan-50 border-2 border-cyan-100 rounded-3xl group transition-all hover:bg-cyan-100"><div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-cyan-500 shadow-sm"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.823a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg></div><div className="flex-1"><div className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">PR & Community Link</div><div className="text-xs font-bold text-cyan-800 truncate">{selectedPost.prUrl}</div></div></a>)}
                            </div>
                        </div>
                    ) : (
                        <>
                            {selectedPost.imageUrl ? <div className="w-full bg-slate-100"><img src={selectedPost.imageUrl} className="w-full h-auto" /></div> : selectedPost.thumbnail && <div className="w-full aspect-video bg-slate-100"><img src={selectedPost.thumbnail} className="w-full h-full object-cover" /></div>}
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">{selectedPost.author[0]}</div><div><div className="text-xs font-black text-slate-900">{selectedPost.author}</div><div className="text-[9px] text-slate-400 font-bold">{selectedPost.createdAt.split('T')[0]}</div></div></div>
                                {selectedPost.boardType === 'balance' && <div className="mb-8 space-y-4"><div className="grid grid-cols-2 gap-3 relative"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] z-10 border-2 border-white shadow-xl italic">VS</div><button onClick={() => handleBalanceVote('BLUE')} className="bg-gradient-to-br from-blue-600 to-blue-400 p-6 rounded-3xl text-center shadow-xl border border-white/20 active:scale-95 transition-transform"><div className="text-[9px] font-black text-blue-100 uppercase tracking-widest mb-2 opacity-60">TEAM BLUE</div><div className="text-white font-black text-base break-words leading-tight">{selectedPost.blueOption}</div><div className="mt-2 text-[8px] font-black text-blue-200">Votes: {selectedPost.blueVotes}</div></button><button onClick={() => handleBalanceVote('RED')} className="bg-gradient-to-br from-red-600 to-red-400 p-6 rounded-3xl text-center shadow-xl border border-white/20 active:scale-95 transition-transform"><div className="text-[9px] font-black text-red-100 uppercase tracking-widest mb-2 opacity-60">TEAM RED</div><div className="text-white font-black text-base break-words leading-tight">{selectedPost.redOption}</div><div className="mt-2 text-[8px] font-black text-red-200">Votes: {selectedPost.redVotes}</div></button></div></div>}
                                {selectedPost.boardType !== 'balance' && <h1 className="text-2xl font-black text-slate-900 mb-6 leading-tight tracking-tight">{selectedPost.title}</h1>}
                                <div className="prose prose-slate max-w-none text-slate-600 font-medium leading-relaxed text-sm mb-12" dangerouslySetInnerHTML={{ __html: marked.parse(selectedPost.content) }}></div>
                            </div>
                        </>
                    )}
                    
                    {/* Common Bottom Interaction for all boardTypes */}
                    <div className="px-6 space-y-12">
                        <div className="flex gap-2"><button onClick={() => handleVote('HEAD')} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] shadow-xl active:scale-95 transition-all flex flex-col items-center gap-1"><span>🎯 헤드샷 {selectedPost.heads}</span></button>{selectedPost.boardType !== 'fun' && <button onClick={() => handleVote('HALF')} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[11px] active:scale-95 transition-all flex flex-col items-center gap-1"><span>🛡️ 반샷 {selectedPost.halfshots}</span></button>}<button onClick={handleShare} className="w-14 py-4 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-100 transition-all"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 12.684a3 3 0 100-2.684 3 3 0 000 2.684z" /></svg></button>{(isAdmin || selectedPost.authorId === authUser?.id) && <button onClick={() => handleAdminAction(selectedPost.id, 'DELETE')} className="w-14 py-4 bg-red-50 text-red-400 rounded-2xl flex items-center justify-center hover:bg-red-100" title="삭제">🗑️</button>}</div>
                        <div className="space-y-6 pb-20"><h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b pb-4">Comments ({comments.length})</h4><form onSubmit={handleCommentSubmit} className="space-y-3"><div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl"><button type="button" onClick={() => setCommentTeam('BLUE')} className={`flex-1 py-2 text-[9px] font-black rounded-xl transition-all ${commentTeam === 'BLUE' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>BLUE TEAM</button><button type="button" onClick={() => setCommentTeam('GRAY')} className={`flex-1 py-2 text-[9px] font-black rounded-xl transition-all ${commentTeam === 'GRAY' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>NONE</button><button type="button" onClick={() => setCommentTeam('RED')} className={`flex-1 py-2 text-[9px] font-black rounded-xl transition-all ${commentTeam === 'RED' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400'}`}>RED TEAM</button></div><div className={`relative p-1 bg-white border-2 rounded-2xl transition-all ${commentTeam === 'BLUE' ? 'border-blue-500' : commentTeam === 'RED' ? 'border-red-500' : 'border-slate-100'}`}><textarea value={commentInput} onChange={(e) => setCommentInput(e.target.value)} placeholder="매너 있는 댓글로 건전한 토론을 이어가세요" maxLength={2000} className="w-full p-4 text-sm font-medium focus:outline-none min-h-[100px] bg-transparent"></textarea><div className="flex justify-between items-center p-3"><span className="text-[10px] font-bold text-slate-300">{commentInput.length}/2000</span><button type="submit" disabled={!commentInput.trim() || isSubmitting} className="px-5 py-2.5 bg-slate-900 text-white text-[10px] font-black rounded-xl active:scale-95 disabled:opacity-50">SEND</button></div></div></form><div className="space-y-4 pt-4">{comments.map(comment => { const isCommentOwner = authUser?.id === comment.authorId; const canDeleteComment = isAdmin || isCommentOwner; return (<div key={comment.id} className={`p-4 bg-white border-2 rounded-2xl transition-colors ${comment.isDeleted ? 'border-slate-100 bg-slate-50/50' : comment.teamType === 'BLUE' ? 'border-blue-100 bg-blue-50/10' : comment.teamType === 'RED' ? 'border-red-100 bg-red-50/10' : 'border-slate-50'}`}><div className="flex justify-between items-center mb-2"><div className="flex items-center gap-2"><span className={`px-2 py-0.5 text-[8px] font-black rounded text-white ${comment.isDeleted ? 'bg-slate-300' : comment.teamType === 'BLUE' ? 'bg-blue-600' : comment.teamType === 'RED' ? 'bg-red-600' : 'bg-slate-400'}`}>{comment.isDeleted ? 'DELETED' : comment.teamType}</span><span className={`text-[10px] font-black ${comment.isDeleted ? 'text-slate-400' : 'text-slate-900'}`}>{comment.authorNickname}</span></div><div className="flex items-center gap-3"><span className="text-[8px] font-bold text-slate-300">{comment.createdAt.split('T')[0]}</span>{!comment.isDeleted && canDeleteComment && (<button onClick={() => handleCommentDelete(comment.id)} className="text-[10px] font-black text-red-400 hover:text-red-600 transition-colors">삭제</button>)}</div></div><p className={`text-sm leading-relaxed font-medium ${comment.isDeleted ? 'text-slate-400 italic' : 'text-slate-600'}`}>{comment.content}</p></div>); })}</div></div>
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
                    <div className="mb-8 text-center"><span className={`inline-block px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${writeMode === 'balance' ? 'bg-blue-100 text-blue-700' : writeMode === 'update' ? 'bg-cyan-100 text-cyan-700' : writeMode === 'fun' ? 'bg-yellow-100 text-yellow-700' : writeMode === 'stream' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>{writeMode === 'balance' ? 'Balance Game' : writeMode === 'update' ? 'Official Lab Update' : writeMode === 'fun' ? 'Keuk Keuk Board' : writeMode === 'stream' ? 'Streaming' : 'Post Content'}</span><h3 className="text-xl font-black text-slate-900 mt-4 tracking-tighter">{editingPostId ? '게시글 수정' : writeMode === 'balance' ? '밸런스 게임 토론' : writeMode === 'update' ? '새로운 업데이트 등록' : writeMode === 'fun' ? '큭큭 게시글 작성' : writeMode === 'stream' ? '방송 홍보 게시 요청' : '새로운 게시글 작성'}</h3></div>
                    
                    <form onSubmit={submitPost} className="space-y-4">
                        {writeMode === 'stream' ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Platform Selection</label>
                                    <div className="flex gap-2">
                                        {[
                                            { id: 'CHZZK', label: 'CHZZK', color: 'bg-[#00FFA3] text-black', icon: '🟢' },
                                            { id: 'SOOP', label: 'SOOP', color: 'bg-[#2A65F0] text-white', icon: '🔵' },
                                            { id: 'YOUTUBE', label: 'YOUTUBE', color: 'bg-[#FF0000] text-white', icon: '🔴' }
                                        ].map((p) => (
                                            <button 
                                                key={p.id} 
                                                type="button" 
                                                onClick={() => setStreamPlatform(p.id as any)}
                                                className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${streamPlatform === p.id ? `${p.color} ring-4 ring-slate-100 scale-[1.05]` : 'bg-slate-100 text-slate-400'}`}
                                            >
                                                <span>{p.icon}</span> {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stream URL (Required)</label>
                                    <input type="url" value={streamUrl} onChange={(e) => setStreamUrl(e.target.value)} placeholder="https://chzzk.naver.com/..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-mono outline-none focus:bg-white focus:border-cyan-500 transition-all shadow-inner" required />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PR Link (Optional)</label>
                                    <input type="url" value={streamPrUrl} onChange={(e) => setStreamPrUrl(e.target.value)} placeholder="홍보용 사이트 또는 SNS 링크" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-mono outline-none focus:bg-white focus:border-cyan-500 transition-all shadow-inner" />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Thumbnail Data (Required)</label>
                                    <div className={`relative p-2 bg-slate-50 border-2 border-dashed rounded-3xl text-center transition-all ${filePreview ? 'border-cyan-500 bg-cyan-50/20' : 'border-slate-200'}`}>
                                        <input type="file" id="fileInput" onChange={handleFileChange} accept=".jpg,.jpeg,.png,.webp" className="hidden" />
                                        <label htmlFor="fileInput" className="cursor-pointer block">
                                            {filePreview ? (
                                                <div className="relative group overflow-hidden rounded-2xl aspect-video bg-slate-900">
                                                    <img src={filePreview} className="w-full h-full object-contain opacity-80" alt="Preview" />
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-white font-black text-[10px] uppercase tracking-widest">Change Data</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="py-6 flex flex-col items-center justify-center gap-2">
                                                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload Stream Thumbnail</span>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                                    <textarea value={streamDescription} onChange={(e) => setStreamDescription(e.target.value)} placeholder="방송 시간, 콘텐츠 등을 설명해주세요." maxLength={1000} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium h-24 resize-none outline-none focus:bg-white transition-all shadow-inner"></textarea>
                                </div>
                            </div>
                        ) : (
                            <>
                                {writeMode === 'fun' && ( 
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Capture Data Upload (Max 500KB)</label>
                                    <div className={`relative p-2 bg-slate-50 border-2 border-dashed rounded-3xl text-center transition-all ${filePreview ? 'border-cyan-500 bg-cyan-50/20' : 'border-slate-200'}`}>
                                        <input type="file" id="fileInput" onChange={handleFileChange} accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" />
                                        <label htmlFor="fileInput" className="cursor-pointer block">
                                            {filePreview ? (
                                                <div className="relative group overflow-hidden rounded-2xl aspect-video bg-slate-900 shadow-xl">
                                                    <img src={filePreview} className="w-full h-full object-contain opacity-80" alt="Preview" />
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-white font-black text-[10px] uppercase tracking-widest">Change Image</span>
                                                    </div>
                                                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-cyan-500 text-slate-950 text-[7px] font-black rounded uppercase tracking-tighter">LAB_PREVIEW_READY</div>
                                                </div>
                                            ) : (
                                                <div className="py-8 flex flex-col items-center justify-center gap-2">
                                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Drop Subject Data Here</span>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                  </div>
                                )}
                                {writeMode === 'update' && !editingPostId && ( <div className="mb-6 p-4 bg-cyan-50 border border-cyan-100 rounded-2xl space-y-3"><div className="flex items-center justify-between"><label className="text-[10px] font-black text-cyan-600 uppercase tracking-widest block font-mono">Nexon Raw Data (Update Parser)</label><button type="button" onClick={() => setIsPromptEditorOpen(!isPromptEditorOpen)} className="text-[9px] font-black text-cyan-700 underline">{isPromptEditorOpen ? "닫기" : "마스터 프롬프트 설정"}</button></div>{isPromptEditorOpen && ( <div className="bg-white/50 border border-cyan-200 rounded-xl p-3 animate-in slide-in-from-top-2"><label className="text-[8px] font-black text-slate-400 mb-1 block uppercase">AI 마스터 지침 (Master Prompt)</label><textarea value={masterPrompt} onChange={(e) => setMasterPrompt(e.target.value)} className="w-full h-24 p-2 text-[10px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-500 font-medium leading-relaxed shadow-inner" placeholder="AI가 어떻게 요약할지 지침을 입력하세요..." /></div>)}<textarea value={rawUpdateText} onChange={(e) => setRawUpdateText(e.target.value)} placeholder="넥슨 공지 원문을 여기에 붙여넣으세요..." className="w-full h-24 p-3 text-xs bg-white border border-cyan-100 rounded-xl focus:outline-none focus:border-cyan-500 font-medium shadow-inner" /><button type="button" onClick={handleAISummarize} disabled={isSummarizing || !rawUpdateText.trim()} className="w-full py-2.5 bg-slate-950 text-cyan-400 text-[10px] font-black rounded-xl border border-cyan-500/30 hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">{isSummarizing ? (<><span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>EXTRACTING_KEY_INTEL...</>) : (<>⚡ AI 요약 실행 (Markdown)</>)}</button></div>)}
                                {writeMode === 'balance' ? ( <div className="space-y-4"><div className="space-y-1"><label className="text-[10px] font-black text-blue-500 uppercase ml-2">Team Blue Option</label><div className="relative"><input type="text" value={blueOption} onChange={(e) => setBlueOption(e.target.value)} placeholder="파란색 팀 선택지" maxLength={200} className="w-full p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl text-sm font-black text-blue-900 outline-none focus:border-blue-500 transition-all shadow-inner" /><span className="absolute bottom-3 right-3 text-[8px] font-black text-blue-300">{blueOption.length}/200</span></div></div><div className="text-center font-black italic text-slate-300 text-xs">VS</div><div className="space-y-1"><label className="text-[10px] font-black text-red-500 uppercase ml-2">Team Red Option</label><div className="relative"><input type="text" value={redOption} onChange={(e) => setRedOption(e.target.value)} placeholder="빨간색 팀 선택지" maxLength={200} className="w-full p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-sm font-black text-red-900 outline-none focus:border-red-500 transition-all shadow-inner" /><span className="absolute bottom-3 right-3 text-[8px] font-black text-red-300">{redOption.length}/200</span></div></div></div>) : ( <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Title</label><input type="text" value={writeTitle} onChange={(e) => setWriteTitle(e.target.value)} placeholder="제목 (필수)" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black outline-none focus:bg-white transition-all shadow-inner" /></div>)}
                                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-2">{writeMode === 'balance' ? 'Description' : 'Content'}</label><div className="relative"><textarea value={writeContent} onChange={(e) => setWriteContent(e.target.value)} placeholder={writeMode === 'balance' ? "설명을 입력하세요." : "내용을 입력하세요 (Markdown 지원)"} maxLength={5000} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium h-40 resize-none outline-none focus:bg-white transition-all shadow-inner"></textarea><span className="absolute bottom-3 right-3 text-[8px] font-black text-slate-300">{writeContent.length}/5000</span></div></div>
                                {writeMode !== 'fun' && (<div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Thumbnail URL (Optional)</label><input type="text" value={writeThumbnail} onChange={(e) => setWriteThumbnail(e.target.value)} placeholder="이미지 주소를 입력하세요" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-mono outline-none focus:bg-white transition-all shadow-inner" /></div>)}
                            </>
                        )}

                        <div className="flex gap-2 pt-4">
                            <button type="button" onClick={resetWriteForm} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black text-[10px] rounded-2xl active:scale-95 transition-all">취소</button>
                            <button type="submit" disabled={isSubmitting || isSummarizing || uploadProgress} className="flex-[1.5] py-4 bg-slate-900 text-white font-black text-[10px] rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50 shadow-slate-900/20">
                                {uploadProgress ? '데이터 전송 중...' : isSubmitting ? '전송 중...' : writeMode === 'stream' ? '게시 요청 (Request)' : editingPostId ? '수정하기' : '등록하기'}
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
