
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../state/AppContext';
import { useAuth } from '../state/AuthContext';
import { useUI } from '../state/UIContext';
import { communityService } from '../services/communityService';
import { geminiService } from '../services/geminiService';
import { CommunityPost, BoardType, CommunityComment } from '../types';
import { marked } from 'marked';

export const CommunityPanel: React.FC = () => {
  const { 
    closeCommunity,
  } = useUI();

  const {
    isLoggedIn,
    refreshAuthUser,
    openAuthModal,
    authUser,
    isAdmin
  } = useAuth();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [updatePost, setUpdatePost] = useState<CommunityPost | null>(null);
  const [activeBoard, setActiveBoard] = useState<Exclude<BoardType, 'hidden' | 'temp'>>('update');
  const [isLoading, setIsLoading] = useState(false);
  const [isWriteMode, setIsWriteMode] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  
  // Post States
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // Balance Board States
  const [blueOption, setBlueOption] = useState('');
  const [redOption, setRedOption] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Summarize States
  const [aiSource, setAiSource] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);

  // Interaction States
  const [hasVoted, setHasVoted] = useState<Record<string, boolean>>({}); // For Balance Vote (Blue/Red)
  const [hasInteracted, setHasInteracted] = useState<Record<string, boolean>>({}); // For Head/Half/Guillotine
  
  // Comments States
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isCommentLoading, setIsCommentLoading] = useState(false);

  useEffect(() => {
    loadEssentialData();
  }, [activeBoard]);

  // Load comments when a post is selected
  useEffect(() => {
    if (selectedPost) {
        setComments([]);
        communityService.getComments(selectedPost.id).then(setComments);
    }
  }, [selectedPost]);

  const loadEssentialData = async () => {
    setIsLoading(true);
    try {
      const updates = await communityService.getPosts('update');
      if (updates.length > 0) setUpdatePost(updates[0]);
      else setUpdatePost(null);

      const list = await communityService.getPosts(activeBoard);
      setPosts(list);
    } catch (e) {
      console.error("[CommunityPanel] Load Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAISummarize = async () => {
    if (!aiSource.trim()) {
      alert("요약할 공지사항 원문을 입력해주세요.");
      return;
    }
    
    setIsAiLoading(true);
    try {
      const masterPrompt = `
        당신은 서든어택 연구소 Su-Lab의 관리자 AI "CUBE"입니다.
        제공된 공지사항 원문을 분석하여 핵심 업데이트 사항을 요약하십시오.
        본문은 마크다운 형식을 사용하고, 가독성 있게 리스트와 표를 활용하십시오.
      `;
      
      const result = await geminiService.summarizeGameUpdate(aiSource, masterPrompt, false);
      
      setNewTitle(result.title);
      setNewContent(result.content);
      setShowAiInput(false);
      setAiSource('');
    } catch (err: any) {
      alert("AI 분석 실패: " + err.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleWriteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    if (activeBoard === 'balance' && (!blueOption.trim() || !redOption.trim())) {
        alert("밸런스 게시판은 A/B 선택지를 모두 입력해야 합니다.");
        return;
    }

    setIsLoading(true);
    try {
      let imageUrl = '';
      if (selectedFile) {
        const uploadedUrl = await communityService.uploadImage(selectedFile, activeBoard);
        if (uploadedUrl) imageUrl = uploadedUrl;
      }

      const success = await communityService.createPost({
        boardType: activeBoard,
        title: newTitle,
        content: newContent,
        imageUrl,
        blueOption: activeBoard === 'balance' ? blueOption : undefined,
        redOption: activeBoard === 'balance' ? redOption : undefined
      });

      if (success) {
        setNewTitle('');
        setNewContent('');
        setBlueOption('');
        setRedOption('');
        setSelectedFile(null);
        setIsWriteMode(false);
        await refreshAuthUser();
        await loadEssentialData();
      }
    } catch (err: any) {
      alert("포스팅 저장 실패: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 투표 핸들러 (Blue/Red Votes)
  const handleVote = async (side: 'BLUE' | 'RED') => {
      if (!selectedPost) return;

      // 1. 로그인 체크
      if (!isLoggedIn) {
          if (confirm("투표 기능은 로그인이 필요합니다. 로그인 하시겠습니까?")) {
              openAuthModal();
          }
          return;
      }

      // 2. 본인 게시글 체크
      if (authUser?.id === selectedPost.authorId) {
          alert("본인의 게시글에는 투표할 수 없습니다.");
          return;
      }

      // 3. 중복 투표 체크 (로컬 세션)
      if (hasVoted[selectedPost.id]) {
          alert("이미 투표에 참여하셨습니다.");
          return;
      }
      
      try {
          const result = await communityService.castVote(selectedPost.id, side);
          if (result) {
              // Update Selected Post State (Blue/Red)
              setSelectedPost(prev => prev ? ({
                  ...prev,
                  blueVotes: result.blue,
                  redVotes: result.red
              }) : null);
              
              // Sync with Posts List
              setPosts(prev => prev.map(p => p.id === selectedPost.id ? {
                  ...p,
                  blueVotes: result.blue,
                  redVotes: result.red
              } : p));

              // Sync with Update Post
              if (updatePost && updatePost.id === selectedPost.id) {
                  setUpdatePost(prev => prev ? ({
                      ...prev,
                      blueVotes: result.blue,
                      redVotes: result.red
                  }) : null);
              }

              setHasVoted(prev => ({ ...prev, [selectedPost.id]: true }));
          } else {
              alert("투표 처리에 실패했습니다. (서버 오류)");
          }
      } catch (e: any) {
          console.error(e);
          alert("투표 시스템 오류: " + e.message);
      }
  };

  // 반응 핸들러 (Headshot/Halfshot/Guillotine)
  const handleInteraction = async (type: 'HEADSHOT' | 'HALFSHOT' | 'GUILLOTINE') => {
    if (!selectedPost) return;
    if (!isLoggedIn) {
      openAuthModal();
      return;
    }
    if (hasInteracted[selectedPost.id]) {
      alert("이미 반응을 남겼습니다.");
      return;
    }

    if (type === 'GUILLOTINE') {
       if (!confirm("정말 이 게시글을 길로틴(신고) 처리하시겠습니까?")) return;
    }

    const result = await communityService.registerInteraction(selectedPost.id, type);
    
    if (result) {
      // Update Selected Post State (Heads/Halfshots)
      setSelectedPost(prev => prev ? ({
        ...prev,
        heads: result.heads,
        halfshots: result.halfshots
      }) : null);
      
      // Sync with Posts List
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? {
          ...p,
          heads: result.heads,
          halfshots: result.halfshots
      } : p));

      // Sync with Update Post
      if (updatePost && updatePost.id === selectedPost.id) {
          setUpdatePost(prev => prev ? ({
              ...prev,
              heads: result.heads,
              halfshots: result.halfshots
          }) : null);
      }
      
      setHasInteracted(prev => ({ ...prev, [selectedPost.id]: true }));
      
      if (type === 'GUILLOTINE') {
        alert("길로틴 시스템에 보고되었습니다.");
      }
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !newComment.trim()) return;
    if (!isLoggedIn) {
        openAuthModal();
        return;
    }

    setIsCommentLoading(true);
    try {
        await communityService.createComment(selectedPost.id, newComment);
        setNewComment('');
        // Reload comments
        const updated = await communityService.getComments(selectedPost.id);
        setComments(updated);
        // Update post comment count visually in selected view
        setSelectedPost(prev => prev ? ({ ...prev, commentCount: prev.commentCount + 1 }) : null);
        
        // Update comment count in list view
        setPosts(prev => prev.map(p => p.id === selectedPost.id ? {
            ...p,
            commentCount: p.commentCount + 1
        } : p));

    } catch (err: any) {
        alert(err.message);
    } finally {
        setIsCommentLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!selectedPost) return;
    if (!confirm("정말 이 게시글을 삭제하시겠습니까? (복구 불가)")) return;
    
    setIsLoading(true);
    try {
        const success = await communityService.deletePost(selectedPost.id);
        if (success) {
            alert("게시글이 삭제되었습니다.");
            setSelectedPost(null);
            loadEssentialData(); // Refresh list
        }
    } catch (e: any) {
        alert("삭제 실패: " + e.message);
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
      if (!selectedPost) return;
      if (!confirm("이 댓글을 삭제하시겠습니까?")) return;

      try {
          await communityService.deleteComment(commentId);
          // Success handling
          setComments(prev => prev.filter(c => c.id !== commentId));
          // Update local post comment count
           setSelectedPost(prev => prev ? ({ ...prev, commentCount: Math.max(0, prev.commentCount - 1) }) : null);
           setPosts(prev => prev.map(p => p.id === selectedPost.id ? {
              ...p,
              commentCount: Math.max(0, p.commentCount - 1)
          } : p));
      } catch (e: any) {
          // RLS Policy 에러 감지
          if (e.message?.includes("policy") || e.message?.includes("row-level security")) {
              alert("삭제 실패: 권한이 부족합니다. (RLS Policy 설정 필요)");
          } else {
              alert("삭제 오류: " + e.message);
          }
      }
  };

  const handleHidePost = async () => {
      if (!selectedPost) return;
      const newStatus = selectedPost.status === 'HIDDEN' ? 'APPROVED' : 'HIDDEN';
      const actionName = newStatus === 'HIDDEN' ? '숨김' : '공개';
      
      if (!confirm(`이 게시글을 ${actionName} 처리하시겠습니까?`)) return;

      setIsLoading(true);
      try {
          const success = await communityService.updatePostStatus(selectedPost.id, newStatus);
          if (success) {
              alert(`게시글이 ${actionName} 처리되었습니다.`);
              // Update local state
              setSelectedPost(prev => prev ? ({ ...prev, status: newStatus }) : null);
              // Refresh list to reflect status change if needed, or just update local list
               setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, status: newStatus } : p));
          }
      } catch (e: any) {
          alert("상태 변경 실패: " + e.message);
      } finally {
          setIsLoading(false);
      }
  };

  const renderContent = (content: string) => {
    try {
      return { __html: marked.parse(content) };
    } catch (e) {
      return { __html: content };
    }
  };

  const tabLabels: Record<string, string> = {
    update: '업데이트',
    balance: '밸런스',
    kukkuk: '전략/정보',
    streaming: '스트리밍'
  };

  // Helper for Balance Percentage
  const getVotePercent = (votes: number, total: number) => {
      if (total === 0) return 0;
      return Math.round((votes / total) * 100);
  };

  return (
    <div 
      className="fixed inset-0 z-[150] flex justify-center items-center bg-slate-950/70 backdrop-blur-md p-4 font-mono animate-in fade-in duration-300"
      onClick={closeCommunity}
    >
      <div 
        className="w-full max-w-xl bg-slate-50 h-[85vh] shadow-2xl flex flex-col rounded-[2.5rem] overflow-hidden border border-white/20 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 bg-slate-950 text-white flex items-center justify-between border-b border-cyan-500/20">
          <div className="flex flex-col">
            <h2 className="text-xl font-black italic tracking-tighter uppercase">Lab_Archive</h2>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
              <p className="text-[9px] text-cyan-400 font-bold uppercase tracking-[0.3em]">Querying_Database</p>
            </div>
          </div>
          <button onClick={() => { 
            if (selectedPost) setSelectedPost(null);
            else if (isWriteMode) setIsWriteMode(false);
            else closeCommunity();
          }} className="p-2 hover:bg-white/10 rounded-full transition-all text-slate-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain bg-slate-50 scrollbar-hide">
          {selectedPost ? (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <div className="p-6">
                <button 
                  onClick={() => setSelectedPost(null)}
                  className="mb-6 flex items-center gap-2 text-[10px] font-black text-cyan-600 uppercase tracking-widest hover:translate-x-[-4px] transition-transform"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                  Return_to_Archive
                </button>

                <div className="space-y-6">
                  <header>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                      ARCHIVE_REF: {selectedPost.id.substring(0,12)} | {selectedPost.createdAt.split('T')[0]}
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 uppercase italic leading-tight">
                      {selectedPost.title}
                    </h3>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-950 rounded-xl flex items-center justify-center text-[10px] font-black text-white italic border border-white/10 shadow-lg">
                        {selectedPost.author[0]?.toUpperCase()}
                      </div>
                      <span className="text-[11px] font-black text-slate-600 uppercase tracking-tighter">
                        Subject: {selectedPost.author}
                      </span>
                    </div>
                  </header>

                  <div className="h-px bg-slate-200"></div>

                  {/* Admin Controls */}
                  {isAdmin && (
                      <div className="mb-6 bg-red-950/5 border border-red-500/20 rounded-2xl p-4 animate-in slide-in-from-top-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                             <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Administrator_Override</span>
                          </div>
                          <div className="flex gap-2">
                             <button 
                               onClick={handleHidePost}
                               className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold rounded-lg hover:bg-slate-50 uppercase tracking-tight shadow-sm"
                             >
                                {selectedPost.status === 'HIDDEN' ? 'UNHIDE_POST' : 'HIDE_POST'}
                             </button>
                             <button 
                               onClick={handleDeletePost}
                               className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-700 uppercase tracking-tight shadow-sm shadow-red-500/20"
                             >
                                DELETE_PERMANENTLY
                             </button>
                          </div>
                        </div>
                      </div>
                  )}

                  {/* Balance Vote UI (Using blueVotes/redVotes) */}
                  {selectedPost.blueOption && selectedPost.redOption && (
                      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-lg mb-6">
                          <div className="text-center mb-4">
                              <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black rounded-full uppercase tracking-widest">Balance_Check</span>
                          </div>

                          {/* Self-Vote Warning */}
                          {authUser?.id === selectedPost.authorId && (
                              <div className="text-center mb-3 animate-in zoom-in-95">
                                  <span className="inline-block px-3 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded-lg border border-red-200 uppercase tracking-tight">
                                      ⚠️ 본인 게시글 투표 불가
                                  </span>
                              </div>
                          )}
                          
                          <div className="flex gap-2 h-32 relative">
                              {/* Blue Option */}
                              <button 
                                  onClick={() => handleVote('BLUE')}
                                  disabled={hasVoted[selectedPost.id] || authUser?.id === selectedPost.authorId}
                                  className={`flex-1 bg-blue-50 border-2 border-blue-100 rounded-2xl flex flex-col items-center justify-center p-2 relative overflow-hidden group transition-all active:scale-[0.98]
                                    ${(hasVoted[selectedPost.id] || authUser?.id === selectedPost.authorId) ? 'opacity-80 cursor-not-allowed' : 'hover:border-blue-300'}
                                  `}
                              >
                                  <div className="absolute bottom-0 left-0 w-full bg-blue-200/50 transition-all duration-1000 ease-out" style={{ height: `${getVotePercent(selectedPost.blueVotes, selectedPost.blueVotes + selectedPost.redVotes)}%` }}></div>
                                  <span className="relative z-10 text-xs font-black text-blue-700 uppercase mb-1">{selectedPost.blueOption}</span>
                                  <span className="relative z-10 text-2xl font-black text-blue-900">{getVotePercent(selectedPost.blueVotes, selectedPost.blueVotes + selectedPost.redVotes)}%</span>
                                  <span className="relative z-10 text-[9px] font-bold text-blue-400">{selectedPost.blueVotes} Votes</span>
                              </button>

                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border-2 border-white shadow-lg italic">VS</div>

                              {/* Red Option */}
                              <button 
                                  onClick={() => handleVote('RED')}
                                  disabled={hasVoted[selectedPost.id] || authUser?.id === selectedPost.authorId}
                                  className={`flex-1 bg-red-50 border-2 border-red-100 rounded-2xl flex flex-col items-center justify-center p-2 relative overflow-hidden group transition-all active:scale-[0.98]
                                    ${(hasVoted[selectedPost.id] || authUser?.id === selectedPost.authorId) ? 'opacity-80 cursor-not-allowed' : 'hover:border-red-300'}
                                  `}
                              >
                                  <div className="absolute bottom-0 left-0 w-full bg-red-200/50 transition-all duration-1000 ease-out" style={{ height: `${getVotePercent(selectedPost.redVotes, selectedPost.blueVotes + selectedPost.redVotes)}%` }}></div>
                                  <span className="relative z-10 text-xs font-black text-red-700 uppercase mb-1">{selectedPost.redOption}</span>
                                  <span className="relative z-10 text-2xl font-black text-red-900">{getVotePercent(selectedPost.redVotes, selectedPost.blueVotes + selectedPost.redVotes)}%</span>
                                  <span className="relative z-10 text-[9px] font-bold text-red-400">{selectedPost.redVotes} Votes</span>
                              </button>
                          </div>
                          {hasVoted[selectedPost.id] && (
                              <div className="text-center mt-3 text-[9px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">Vote_Confirmed</div>
                          )}
                      </div>
                  )}

                  {selectedPost.imageUrl && (
                    <div className="rounded-[2rem] overflow-hidden border border-slate-200 shadow-xl">
                      <img src={selectedPost.imageUrl} className="w-full h-auto" alt="attachment" />
                    </div>
                  )}

                  <article 
                    className="prose prose-slate max-w-none text-sm font-bold text-slate-700 leading-relaxed font-sans"
                    dangerouslySetInnerHTML={renderContent(selectedPost.content)}
                  />

                  {/* Interaction Bar (Headshot/Halfshot/Guillotine) - Using heads/halfshots */}
                  <div className="flex items-center justify-center gap-3 pt-8 pb-4">
                    <button 
                      onClick={() => handleInteraction('HEADSHOT')}
                      className="flex flex-col items-center gap-1 group"
                      title="HEADSHOT (추천)"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-xl shadow-sm group-hover:bg-cyan-100 group-active:scale-95 transition-all">
                        🔫
                      </div>
                      <span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">{selectedPost.heads}</span>
                    </button>
                    
                    <button 
                      onClick={() => handleInteraction('HALFSHOT')}
                      className="flex flex-col items-center gap-1 group"
                      title="HALFSHOT (비추천)"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-xl shadow-sm group-hover:bg-amber-100 group-active:scale-95 transition-all">
                        🩹
                      </div>
                      <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{selectedPost.halfshots}</span>
                    </button>

                    <button 
                      onClick={() => handleInteraction('GUILLOTINE')}
                      className="flex flex-col items-center gap-1 group ml-4 pl-4 border-l border-slate-200"
                      title="GUILLOTINE (신고)"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-xl shadow-sm group-hover:bg-red-100 group-active:scale-95 transition-all">
                        ☠️
                      </div>
                      <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">GUILLOTINE</span>
                    </button>
                  </div>

                  <div className="text-center pb-6">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.5em] select-none">END_OF_TRANSMISSION</p>
                  </div>
                </div>
              </div>

              {/* Comment Section (Log Style) */}
              <div className="bg-slate-900 border-t border-slate-800 p-6 pb-12">
                  <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span>
                    COMMUNICATION_LOGS ({comments.length})
                  </h4>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide mb-6">
                      {comments.length === 0 ? (
                          <div className="text-center py-6 text-[10px] text-slate-600 font-mono border border-dashed border-slate-800 rounded-xl">
                              NO_LOGS_FOUND
                          </div>
                      ) : (
                          comments.map((comment) => (
                              <div key={comment.id} className="font-mono text-xs">
                                  <div className="flex items-center gap-2 mb-1 justify-between">
                                      <div className="flex items-center gap-2">
                                          <span className="text-cyan-400 font-bold">{comment.authorNickname}</span>
                                          <span className="text-slate-600 text-[10px]">{comment.createdAt.split('T')[0]}</span>
                                      </div>
                                      {isAdmin && (
                                          <button 
                                              onClick={() => handleDeleteComment(comment.id)}
                                              className="text-[9px] text-red-500 hover:text-red-400 font-black uppercase tracking-wider"
                                          >
                                              [DELETE]
                                          </button>
                                      )}
                                  </div>
                                  <div className="text-slate-300 pl-2 border-l-2 border-slate-700 py-1">
                                      {comment.content}
                                  </div>
                              </div>
                          ))
                      )}
                  </div>

                  {isLoggedIn ? (
                      <form onSubmit={handleCommentSubmit} className="relative">
                          <textarea
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Insert_Data_Log..."
                              className="w-full bg-slate-800 text-slate-200 text-xs font-mono p-4 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500/50 resize-none h-20"
                              disabled={isCommentLoading}
                          />
                          <button 
                              type="submit"
                              disabled={isCommentLoading}
                              className="absolute bottom-3 right-3 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black rounded-lg uppercase tracking-widest disabled:opacity-50"
                          >
                              {isCommentLoading ? '...' : 'SEND'}
                          </button>
                      </form>
                  ) : (
                      <div 
                          onClick={openAuthModal}
                          className="w-full py-4 bg-slate-800 border border-slate-700 border-dashed rounded-xl text-center text-[10px] text-slate-500 font-black uppercase tracking-widest cursor-pointer hover:bg-slate-800/80 transition-colors"
                      >
                          Access_Denied: Login_Required_to_Log
                      </div>
                  )}
              </div>
            </div>
          ) : isWriteMode ? (
            <div className="p-6">
              <form onSubmit={handleWriteSubmit} className="bg-white p-6 rounded-[2.5rem] border border-cyan-500/20 shadow-2xl animate-in zoom-in-95 duration-300 space-y-4">
                
                {activeBoard !== 'balance' && (
                  <div className="bg-slate-950 rounded-2xl p-4 border border-cyan-500/20 shadow-inner overflow-hidden">
                      <button 
                          type="button"
                          onClick={() => setShowAiInput(!showAiInput)}
                          className="w-full flex items-center justify-between text-[10px] font-black text-cyan-400 uppercase tracking-widest"
                      >
                          <span>[ ✨ AI_Summarize_Assistant_Cube ]</span>
                          <span>{showAiInput ? 'CLOSE' : 'OPEN'}</span>
                      </button>
                      {showAiInput && (
                          <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
                              <textarea 
                                  value={aiSource}
                                  onChange={(e) => setAiSource(e.target.value)}
                                  placeholder="공식 공지사항 전문을 붙여넣으세요..."
                                  className="w-full p-4 bg-black/40 border border-white/5 rounded-xl text-[10px] font-bold text-slate-300 outline-none resize-none h-32 scrollbar-hide"
                              />
                              <button 
                                  type="button"
                                  onClick={handleAISummarize}
                                  disabled={isAiLoading}
                                  className="w-full py-3 bg-cyan-500 text-slate-950 font-black text-[9px] rounded-lg uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-cyan-400 transition-colors disabled:opacity-50"
                              >
                                  {isAiLoading ? "Processing..." : "Run_Gemini_Analysis"}
                              </button>
                          </div>
                      )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
                        {tabLabels[activeBoard]}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">MODE</span>
                </div>

                <input 
                  type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Subject_Title" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-500/20" required
                />

                {/* Balance Board Options Input */}
                {activeBoard === 'balance' && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <input 
                            type="text" value={blueOption} onChange={(e) => setBlueOption(e.target.value)}
                            placeholder="Option A (Blue)" className="w-full p-3 bg-white border border-blue-200 rounded-xl text-xs font-bold text-blue-800 placeholder:text-blue-300 outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <input 
                            type="text" value={redOption} onChange={(e) => setRedOption(e.target.value)}
                            placeholder="Option B (Red)" className="w-full p-3 bg-white border border-red-200 rounded-xl text-xs font-bold text-red-800 placeholder:text-red-300 outline-none focus:ring-2 focus:ring-red-500/20"
                        />
                    </div>
                )}

                <textarea 
                  value={newContent} onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Data_Logs_Content..." rows={8} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none resize-none focus:ring-2 focus:ring-cyan-500/20" required
                />
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">Visual_Evidence</label>
                  <input type="file" ref={fileInputRef} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="hidden" />
                  <div onClick={() => fileInputRef.current?.click()} className="w-full p-4 border-2 border-dashed border-slate-200 rounded-xl text-center cursor-pointer hover:bg-slate-50">
                    <span className="text-[9px] font-bold text-slate-400">{selectedFile ? selectedFile.name : "Attach_Visual_Evidence"}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={isLoading} className="flex-1 py-4 bg-cyan-500 text-slate-950 font-black text-[10px] rounded-xl uppercase tracking-widest">Store_Archive</button>
                  <button type="button" onClick={() => setIsWriteMode(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black text-[10px] rounded-xl uppercase tracking-widest">Abort</button>
                </div>
              </form>
            </div>
          ) : (
            <>
              <section className="p-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="text-cyan-500">▶</span> Critical_Update_Preview
                </h3>
                <div 
                  onClick={() => updatePost && setSelectedPost(updatePost)}
                  className="relative aspect-video w-full bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 group cursor-pointer active:scale-[0.98] transition-transform"
                >
                  {updatePost?.imageUrl ? (
                    <img src={updatePost.imageUrl} className="w-full h-full object-cover opacity-80" alt="update" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
                       <span className="text-cyan-500/20 text-[32px] font-black italic select-none uppercase tracking-tighter">Lab_Access_Ready</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 p-8 flex flex-col justify-end">
                    <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">
                      {updatePost ? `SYNC_${updatePost.createdAt.split('T')[0]}` : 'SEARCHING...'}
                    </span>
                    <h4 className="text-white text-lg font-black uppercase italic truncate">
                      {updatePost?.title || '수신된 최신 데이터가 없습니다.'}
                    </h4>
                  </div>
                </div>
              </section>

              <section className="px-6 sticky top-0 bg-slate-50 z-20 pt-2 pb-4">
                <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm gap-1 overflow-x-auto scrollbar-hide">
                  {(['update', 'balance', 'kukkuk', 'streaming'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { setActiveBoard(tab); }}
                      className={`flex-1 min-w-[80px] py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                        activeBoard === tab ? 'bg-slate-950 text-cyan-400 shadow-lg' : 'text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {tabLabels[tab]}
                    </button>
                  ))}
                </div>
              </section>

              <div className="px-6 pb-32 min-h-[300px]">
                <div className="space-y-3">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="w-8 h-8 border-4 border-slate-200 border-t-cyan-500 rounded-full animate-spin"></div>
                      <span className="text-[10px] font-black text-slate-300 uppercase animate-pulse tracking-widest">Syncing_Nodes...</span>
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-[2.5rem]">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sector_Empty</span>
                    </div>
                  ) : (
                    posts.map((post) => (
                      <div 
                        key={post.id} 
                        onClick={() => setSelectedPost(post)}
                        className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-cyan-200 hover:shadow-xl transition-all flex items-center justify-between group cursor-pointer active:scale-[0.98]"
                      >
                        <div className="flex flex-col min-w-0 pr-4">
                          <span className="text-[8px] font-black text-slate-400 mb-1 uppercase tracking-tighter">
                              REF_{post.id.substring(0,8)} | {post.createdAt.split('T')[0]}
                              {post.blueOption && <span className="ml-2 text-cyan-500 font-bold">VS_MATCH</span>}
                          </span>
                          <h4 className="text-xs font-black text-slate-900 group-hover:text-cyan-600 truncate uppercase italic">{post.title}</h4>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                           {/* HEADS (Like) Counter */}
                           <div className="text-right">
                             <div className="text-[8px] font-black text-cyan-400 uppercase leading-none">HEADS</div>
                             <div className="text-[12px] font-black text-cyan-600 italic">+{post.heads}</div>
                           </div>
                           <div className="text-right">
                             <div className="text-[8px] font-black text-slate-300 uppercase leading-none">Buffers</div>
                             <div className="text-[12px] font-black text-slate-900 italic">#{post.commentCount}</div>
                           </div>
                           <div className="w-10 h-10 bg-slate-950 rounded-2xl flex items-center justify-center text-[11px] font-black text-white italic border border-white/10 group-hover:border-cyan-500 transition-all shadow-lg">
                             {post.author[0]?.toUpperCase() || 'S'}
                           </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {!isWriteMode && !selectedPost && isLoggedIn && (
          <div className="absolute bottom-8 left-8 right-8 animate-in slide-in-from-bottom-4">
            <button 
              onClick={() => setIsWriteMode(true)}
              className="w-full py-4 bg-slate-950 text-cyan-400 font-black text-[11px] rounded-2xl shadow-2xl border border-cyan-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all uppercase tracking-[0.2em]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
              [ NEW_ARCHIVE_ENTRY ]
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
