
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../state/AppContext';
import { communityService } from '../services/communityService';
import { CommunityPost, BoardType, CommunityComment } from '../types';

type TabType = 'balance' | 'keuk' | 'stream' | 'temp';
type ViewMode = 'MAIN' | 'UPDATE_ARCHIVE' | 'POST_DETAIL';

export const CommunityPanel: React.FC = () => {
  const { isCommunityOpen, closeCommunity, isLoggedIn, authUser, userProfile, isAdmin, openCommunityUserProfile, openAuthModal } = useApp();
  
  const [viewMode, setViewMode] = useState<ViewMode>('MAIN');
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
        communityService.getPosts('update').then(setUpdatePosts);
        fetchTabContent(activeTab);
      }
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  const AdminPostMenu = ({ postId }: { postId: string }) => {
    const isOpen = openAdminMenuId === postId;
    return (
      <div className="relative">
        <button onClick={(e) => { e.stopPropagation(); setOpenAdminMenuId(isOpen ? null : postId); }} className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${isOpen ? 'bg-slate-900 text-white shadow-lg' : 'bg-white/90 backdrop-blur-md border border-slate-200'}`}>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
        </button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[300] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button onClick={(e) => { e.stopPropagation(); handleAdminAction(postId, 'TEMP'); }} className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-slate-50 border-b flex items-center gap-2">📦 임시 이동</button>
            <button onClick={(e) => { e.stopPropagation(); handleAdminAction(postId, 'DELETE'); }} className="w-full px-4 py-3 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">🗑️ 영구 삭제</button>
          </div>
        )}
      </div>
    );
  };

  const latestUpdate = updatePosts[0];
  const tabs: TabType[] = ['balance', 'keuk', 'stream'];

  return (
    <>
      <div className={`fixed inset-0 bg-black/70 backdrop-blur-md z-[150] transition-opacity duration-500 ${isCommunityOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={closeCommunity}></div>

      <div className={`fixed inset-0 z-[160] flex flex-col bg-slate-50 transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isCommunityOpen ? 'translate-y-0' : '-translate-y-full'}`}>
        {/* Header */}
        <div className="flex-shrink-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-30 shadow-sm">
           <div className="flex items-center gap-3">
              {viewMode !== 'MAIN' && (
                  <button onClick={() => setViewMode('MAIN')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  </button>
              )}
              <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span className="text-yellow-500 text-2xl">●</span> 
                {viewMode === 'UPDATE_ARCHIVE' ? '업데이트 히스토리' : '커뮤니티'}
              </h2>
           </div>
           <button onClick={closeCommunity} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 active:scale-90 transition-transform">
             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pb-32 space-y-10">
           {viewMode === 'MAIN' ? (
             <>
               {/* 16:9 Hero Update Section (ADMIN ONLY WRITE) */}
               <section className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                     <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                        OFFICIAL NOTICE
                     </h3>
                     <div className="flex gap-2">
                        {isAdmin && (
                            <button onClick={() => openWriteForm('update')} className="text-[10px] font-black bg-yellow-400 text-slate-900 px-4 py-2 rounded-xl shadow-lg shadow-yellow-500/20 active:scale-95 transition-all">POST UPDATE</button>
                        )}
                        <button onClick={() => setViewMode('UPDATE_ARCHIVE')} className="text-[10px] font-black bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg active:scale-95 transition-all">목록보기</button>
                     </div>
                  </div>
                  
                  {latestUpdate ? (
                      <div onClick={() => { setSelectedPost(latestUpdate); setViewMode('POST_DETAIL'); }} className="relative aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white group cursor-pointer transition-transform active:scale-[0.98]">
                          {latestUpdate.thumbnail ? (
                              <img src={latestUpdate.thumbnail} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="" />
                          ) : (
                              <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-white/10 font-black text-4xl italic">SUGAR</div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                          <div className="absolute bottom-0 left-0 p-8 w-full translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                              <span className="inline-block px-3 py-1.5 bg-yellow-400 text-slate-900 text-[9px] font-black rounded-lg uppercase tracking-widest mb-4 shadow-xl">New Update</span>
                              <h4 className="text-white text-2xl font-black leading-tight drop-shadow-2xl line-clamp-2 transition-all group-hover:text-yellow-100">{latestUpdate.title}</h4>
                          </div>
                          {isAdmin && (
                            <div className="absolute top-6 right-6 z-20" onClick={(e) => e.stopPropagation()}>
                                <AdminPostMenu postId={latestUpdate.id} />
                            </div>
                          )}
                      </div>
                  ) : (
                      <div className="aspect-video rounded-[2.5rem] bg-slate-200 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 gap-2">
                          <svg className="w-10 h-10 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 2v4a2 2 0 002 2h4" /></svg>
                          <span className="font-black text-sm uppercase tracking-tighter">No Active Notices</span>
                      </div>
                  )}
               </section>

               {/* Community Tabs Section */}
               <section className="space-y-6 pt-4">
                   <div className="sticky top-0 z-20 py-2 bg-slate-50/95 backdrop-blur-md">
                     <div className="flex p-1.5 bg-white border border-slate-200 rounded-[1.5rem] shadow-xl">
                        {tabs.map((tab) => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3.5 rounded-2xl text-[11px] font-black transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}>
                              {tab === 'balance' ? '밸런스' : tab === 'keuk' ? '큭큭' : tab === 'stream' ? '홍보' : '임시'}
                            </button>
                        ))}
                     </div>
                   </div>

                   <div className="space-y-4 min-h-[400px]">
                      {isLoading ? (
                          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                              <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4"></div>
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Accessing Database...</p>
                          </div>
                      ) : tabPosts.length === 0 ? (
                          <div className="text-center py-32 text-slate-300 font-black text-sm bg-white/40 border-4 border-dashed border-slate-200 rounded-[3rem]">게시글이 없습니다.</div>
                      ) : tabPosts.map((post) => (
                          <div key={post.id} onClick={() => { setSelectedPost(post); setViewMode('POST_DETAIL'); }} className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 relative transition-all active:scale-[0.98] group hover:border-slate-300">
                              {isAdmin && <div className="absolute top-7 right-7 z-20" onClick={(e) => e.stopPropagation()}><AdminPostMenu postId={post.id} /></div>}
                              <h4 className="font-black text-slate-800 text-lg mb-6 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">{post.title}</h4>
                              <div className="pt-6 border-t border-slate-50 flex items-center justify-between text-[11px] font-black text-slate-400">
                                  <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px]">{post.author[0]}</div>
                                      <span onClick={(e) => { e.stopPropagation(); openCommunityUserProfile(post.author); }} className="text-slate-900 hover:underline cursor-pointer">{post.author}</span>
                                  </div>
                                  <div className="flex gap-3">
                                    {post.boardType === 'balance' ? (
                                        <div className="flex gap-2">
                                            <span className="text-blue-500">B:{post.blueVotes}</span>
                                            <span className="text-red-500">R:{post.redVotes}</span>
                                        </div>
                                    ) : (
                                        <span>🎯 {post.heads}</span>
                                    )}
                                  </div>
                              </div>
                          </div>
                      ))}
                   </div>
               </section>
             </>
           ) : viewMode === 'UPDATE_ARCHIVE' ? (
             <div className="space-y-4 animate-in fade-in slide-in-from-right duration-500">
                {updatePosts.map((post) => (
                    <div key={post.id} onClick={() => { setSelectedPost(post); setViewMode('POST_DETAIL'); }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md flex gap-4 items-center group cursor-pointer active:scale-95 transition-all">
                        {post.thumbnail && <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border"><img src={post.thumbnail} className="w-full h-full object-cover" alt="" /></div>}
                        <div className="flex-1">
                            <span className="text-[9px] font-black text-slate-400 block mb-1 uppercase tracking-widest">{post.createdAt.split('T')[0]}</span>
                            <h4 className="font-black text-slate-800 line-clamp-2 leading-snug group-hover:text-yellow-600">{post.title}</h4>
                        </div>
                    </div>
                ))}
             </div>
           ) : null}
        </div>

        {/* Floating Write Button (Always active for regular boards) */}
        {viewMode === 'MAIN' && (
            <div className="absolute bottom-10 right-6 z-40">
                <button 
                    onClick={() => openWriteForm(activeTab === 'keuk' ? 'fun' : activeTab === 'stream' ? 'stream' : 'balance')} 
                    className="w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center border-4 border-white active:scale-90 transition-all hover:bg-blue-700"
                >
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>
        )}

        {/* Post Detail Sub-View */}
        {viewMode === 'POST_DETAIL' && selectedPost && (
            <div className="absolute inset-0 bg-white z-[200] flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden">
                <div className="flex-shrink-0 h-16 border-b flex items-center justify-between px-4 sticky top-0 z-50 bg-white/80 backdrop-blur-md">
                    <button onClick={() => setViewMode(selectedPost.boardType === 'update' && viewMode !== 'POST_DETAIL' ? 'UPDATE_ARCHIVE' : 'MAIN')} className="p-2 -ml-2 text-slate-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h3 className="text-sm font-black text-slate-800 truncate px-4">{selectedPost.title}</h3>
                    <div className="w-10"></div>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain pb-32">
                    {selectedPost.thumbnail && <div className="w-full aspect-video bg-slate-100"><img src={selectedPost.thumbnail} className="w-full h-full object-cover" /></div>}
                    <div className="p-8">
                        <div className="flex items-center gap-3 mb-8">
                             <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black">{selectedPost.author[0]}</div>
                             <div>
                                 <div className="text-sm font-black text-slate-900">{selectedPost.author}</div>
                                 <div className="text-[10px] text-slate-400 font-bold">{selectedPost.createdAt.split('T')[0]}</div>
                             </div>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 mb-8 leading-tight">{selectedPost.title}</h1>
                        <div className="prose prose-slate max-w-none text-slate-600 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedPost.content }}></div>
                        
                        {/* Discussion / Interaction would go here (Simplified for clarity) */}
                    </div>
                </div>
            </div>
        )}

        {/* Write Form Modal */}
        {isWriteFormOpen && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl relative border border-white/20">
                    <div className="mb-10 text-center">
                        <span className={`inline-block px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${writeMode === 'update' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                           {writeMode === 'update' ? '관리자 공식 공지' : '커뮤니티 글쓰기'}
                        </span>
                        <h3 className="text-2xl font-black text-slate-900 mt-4 tracking-tighter">새로운 소식 전하기</h3>
                    </div>
                    <form onSubmit={submitPost} className="space-y-5">
                        <input type="text" value={writeTitle} onChange={(e) => setWriteTitle(e.target.value)} placeholder="제목을 입력하세요" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black outline-none focus:bg-white focus:ring-4 focus:ring-slate-100 transition-all" />
                        {writeMode === 'update' && (
                            <input type="text" value={writeThumbnail} onChange={(e) => setWriteThumbnail(e.target.value)} placeholder="썸네일 이미지 URL (16:9)" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white" />
                        )}
                        <textarea value={writeContent} onChange={(e) => setWriteContent(e.target.value)} placeholder="내용을 입력하세요 (HTML 지원)" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium h-48 resize-none outline-none focus:bg-white focus:ring-4 focus:ring-slate-100 transition-all"></textarea>
                        <div className="flex gap-3 pt-6">
                            <button type="button" onClick={() => setIsWriteFormOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 font-black text-xs rounded-2xl active:scale-95 transition-all">취소</button>
                            <button type="submit" disabled={!writeTitle || !writeContent || isSubmitting} className={`flex-[1.5] py-5 text-white font-black text-xs rounded-2xl shadow-2xl active:scale-95 transition-all ${writeMode === 'update' ? 'bg-yellow-600' : 'bg-slate-900'}`}>
                                {isSubmitting ? '전송 중...' : '등록하기'}
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
