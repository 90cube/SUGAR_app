
import React, { useState, useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { communityService } from '../services/communityService';
import { CommunityPost, BoardType } from '../types';

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
    
    communityService.getPosts(queryType, authUser?.id).then((data) => {
      setTabPosts(data);
      setIsLoading(false);
    });
  };

  const handleAdminAction = async (postId: string, action: 'DELETE' | 'TEMP') => {
    if (!isAdmin) {
        alert("관리자 권한이 없습니다.");
        return;
    }
    const confirmMsg = action === 'DELETE' 
      ? "이 게시글을 영구 삭제하시겠습니까? 복구할 수 없습니다." 
      : "이 게시글을 임시 보관함으로 이동하여 격리하시겠습니까?";
    
    if (!window.confirm(confirmMsg)) return;
    
    const success = action === 'DELETE' 
      ? await communityService.deletePost(postId) 
      : await communityService.movePostToTemp(postId);
      
    if (success) {
        alert("처리가 완료되었습니다.");
        fetchTabContent(activeTab);
        communityService.getPosts('update').then(setUpdatePosts);
        // 상세페이지에서 액션 시 목록으로 돌아가기
        if (viewMode === 'POST_DETAIL') setViewMode('MAIN');
        setSelectedPost(null);
    } else {
        alert("서버 통신 중 오류가 발생했습니다. 권한 설정을 확인하세요.");
    }
    setOpenAdminMenuId(null);
  };

  const AdminPostMenu = ({ postId }: { postId: string }) => {
    const isOpen = openAdminMenuId === postId;
    if (!isAdmin) return null;

    return (
      <div className="relative">
        <button 
          onClick={(e) => { e.stopPropagation(); setOpenAdminMenuId(isOpen ? null : postId); }} 
          className="w-8 h-8 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all border border-white/10 shadow-lg"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
        </button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button 
                onClick={(e) => { e.stopPropagation(); handleAdminAction(postId, 'TEMP'); }} 
                className="w-full px-4 py-3 text-left text-[11px] font-bold text-slate-600 hover:bg-slate-50 border-b border-slate-100 flex items-center gap-2"
            >
                📁 임시 보관함 이동
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); handleAdminAction(postId, 'DELETE'); }} 
                className="w-full px-4 py-3 text-left text-[11px] font-bold text-red-500 hover:bg-red-50 flex items-center gap-2"
            >
                🗑️ 영구 삭제
            </button>
          </div>
        )}
      </div>
    );
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

  const latestUpdate = updatePosts[0];
  // 관리자일 경우에만 임시 게시판 탭이 활성화됩니다.
  const generalTabs: TabType[] = isAdmin ? ['balance', 'keuk', 'stream', 'temp'] : ['balance', 'keuk', 'stream'];

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
              <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span className="text-yellow-500 text-xl">●</span> 
                {viewMode === 'UPDATE_ARCHIVE' ? 'Notice Archive' : 'Community'}
              </h2>
           </div>
           <button onClick={closeCommunity} className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 active:scale-90 transition-transform">
             <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pb-32 space-y-10">
           {viewMode === 'MAIN' ? (
             <>
               {/* Update Hero */}
               <section className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1 h-1 bg-yellow-400 rounded-full"></span>
                        Official Notice
                     </h3>
                     <div className="flex gap-2">
                        {isAdmin && (
                            <button onClick={() => openWriteForm('update')} className="text-[9px] font-black bg-yellow-400 text-slate-900 px-3 py-1.5 rounded-xl shadow-lg active:scale-95 transition-all">POST UPDATE</button>
                        )}
                        <button onClick={() => setViewMode('UPDATE_ARCHIVE')} className="text-[9px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-lg active:scale-95 transition-all">목록보기</button>
                     </div>
                  </div>
                  
                  {latestUpdate ? (
                      <div onClick={() => { setSelectedPost(latestUpdate); setViewMode('POST_DETAIL'); }} className="relative aspect-video rounded-[2rem] overflow-hidden shadow-2xl border border-white/20 group cursor-pointer transition-transform active:scale-[0.98]">
                          {latestUpdate.thumbnail ? (
                              <img src={latestUpdate.thumbnail} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="" />
                          ) : (
                              <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-white/5 font-black text-2xl italic">SUGAR NOTICE</div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                          <div className="absolute bottom-0 left-0 p-6 w-full">
                              <span className="inline-block px-3 py-1 bg-yellow-400 text-slate-900 text-[8px] font-black rounded-lg uppercase tracking-widest mb-2">New Update</span>
                              <h4 className="text-white text-xl font-black leading-tight drop-shadow-2xl line-clamp-2">{latestUpdate.title}</h4>
                          </div>
                          <div className="absolute top-4 right-4 z-20" onClick={e => e.stopPropagation()}>
                                <AdminPostMenu postId={latestUpdate.id} />
                          </div>
                      </div>
                  ) : (
                      <div className="aspect-video rounded-[2rem] bg-slate-200 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 gap-2">
                          <span className="font-black text-[10px] uppercase tracking-tighter opacity-50">등록된 공지가 없습니다.</span>
                      </div>
                  )}
               </section>

               {/* Tabs */}
               <section className="space-y-6 pt-2">
                   <div className="sticky top-0 z-20 py-2 bg-slate-50/95 backdrop-blur-md">
                     <div className="flex p-1.5 bg-white border border-slate-200 rounded-[1.5rem] shadow-xl">
                        {generalTabs.map((tab) => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}>
                              {tab === 'balance' ? '밸런스' : tab === 'keuk' ? '큭큭' : tab === 'stream' ? '홍보' : '임시'}
                            </button>
                        ))}
                     </div>
                   </div>

                   <div className="space-y-4 min-h-[400px]">
                      {isLoading ? (
                          <div className="flex flex-col items-center justify-center py-20 opacity-30">
                              <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
                          </div>
                      ) : tabPosts.length === 0 ? (
                          <div className="text-center py-24 text-slate-300 font-black text-xs uppercase tracking-widest bg-white/40 border-2 border-dashed border-slate-200 rounded-[2.5rem]">No Feed Found</div>
                      ) : tabPosts.map((post) => (
                          <div key={post.id} onClick={() => { setSelectedPost(post); setViewMode('POST_DETAIL'); }} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl relative transition-all active:scale-[0.98] group hover:border-slate-300">
                              <div className="absolute top-6 right-6 z-20" onClick={e => e.stopPropagation()}>
                                    <AdminPostMenu postId={post.id} />
                              </div>
                              <h4 className="font-black text-slate-800 text-base mb-4 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">{post.title}</h4>
                              <div className="pt-5 border-t border-slate-50 flex items-center justify-between text-[10px] font-black text-slate-400">
                                  <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[7px] font-black text-slate-500 border border-slate-200">
                                        {post.author[0].toUpperCase()}
                                      </div>
                                      <span onClick={e => { e.stopPropagation(); openCommunityUserProfile(post.author); }} className="text-slate-900 hover:underline">{post.author}</span>
                                  </div>
                                  <span>{post.createdAt.split('T')[0]}</span>
                              </div>
                          </div>
                      ))}
                   </div>
               </section>
             </>
           ) : viewMode === 'UPDATE_ARCHIVE' ? (
             <div className="space-y-4 animate-in fade-in slide-in-from-right duration-500">
                {updatePosts.map((post) => (
                    <div key={post.id} onClick={() => { setSelectedPost(post); setViewMode('POST_DETAIL'); }} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-md flex gap-4 items-center group cursor-pointer active:scale-95 transition-all">
                        {post.thumbnail && <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border bg-slate-100"><img src={post.thumbnail} className="w-full h-full object-cover" alt="" /></div>}
                        <div className="flex-1">
                            <span className="text-[8px] font-black text-slate-400 block mb-1 uppercase tracking-widest">{post.createdAt.split('T')[0]}</span>
                            <h4 className="font-black text-slate-800 line-clamp-2 leading-snug group-hover:text-yellow-600 text-sm">{post.title}</h4>
                        </div>
                    </div>
                ))}
                {updatePosts.length === 0 && <div className="text-center py-20 text-slate-400 font-bold text-xs">기록된 공지가 없습니다.</div>}
             </div>
           ) : null}
        </div>

        {/* Post Detail Sub-View */}
        {viewMode === 'POST_DETAIL' && selectedPost && (
            <div className="absolute inset-0 bg-white z-[200] flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden">
                <div className="flex-shrink-0 h-16 border-b flex items-center justify-between px-4 sticky top-0 z-50 bg-white/80 backdrop-blur-md">
                    <button onClick={() => setViewMode(selectedPost.boardType === 'update' ? 'UPDATE_ARCHIVE' : 'MAIN')} className="p-2 -ml-2 text-slate-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h3 className="text-xs font-black text-slate-800 truncate px-4">{selectedPost.title}</h3>
                    <div className="w-10"></div>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain pb-32">
                    {selectedPost.thumbnail && <div className="w-full aspect-video bg-slate-100"><img src={selectedPost.thumbnail} className="w-full h-full object-cover" /></div>}
                    <div className="p-8">
                        <div className="flex items-center gap-3 mb-8">
                             <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">{selectedPost.author[0]}</div>
                             <div>
                                 <div className="text-xs font-black text-slate-900">{selectedPost.author}</div>
                                 <div className="text-[9px] text-slate-400 font-bold">{selectedPost.createdAt.split('T')[0]}</div>
                             </div>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 mb-8 leading-tight tracking-tight">{selectedPost.title}</h1>
                        <div className="prose prose-slate max-w-none text-slate-600 font-medium leading-relaxed text-sm" dangerouslySetInnerHTML={{ __html: selectedPost.content }}></div>
                        
                        {/* 관리자 전용 대형 액션 버튼 */}
                        {isAdmin && (
                          <div className="mt-12 space-y-3 pt-8 border-t border-slate-100">
                             <button 
                                onClick={() => handleAdminAction(selectedPost.id, 'TEMP')} 
                                className="w-full py-4 bg-slate-100 text-slate-600 font-black text-xs rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                             >
                                📁 임시 보관함으로 이동 (격리)
                             </button>
                             <button 
                                onClick={() => handleAdminAction(selectedPost.id, 'DELETE')} 
                                className="w-full py-4 bg-red-50 text-red-500 font-black text-xs rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                             >
                                🗑️ 게시글 영구 삭제
                             </button>
                          </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Global Floating Write Button */}
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
        
        {/* Write Form Modal */}
        {isWriteFormOpen && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl relative border border-white/20">
                    <div className="mb-8 text-center">
                        <span className={`inline-block px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${writeMode === 'update' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                           {writeMode === 'update' ? 'Admin Official Notice' : 'Community Post'}
                        </span>
                        <h3 className="text-xl font-black text-slate-900 mt-4 tracking-tighter">소식 공유하기</h3>
                    </div>
                    <form onSubmit={submitPost} className="space-y-4">
                        <input type="text" value={writeTitle} onChange={(e) => setWriteTitle(e.target.value)} placeholder="제목" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black outline-none focus:bg-white transition-all" />
                        {writeMode === 'update' && (
                            <input type="text" value={writeThumbnail} onChange={(e) => setWriteThumbnail(e.target.value)} placeholder="썸네일 URL (16:9 이미지 권장)" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:bg-white" />
                        )}
                        <textarea value={writeContent} onChange={(e) => setWriteContent(e.target.value)} placeholder="내용을 입력하세요 (HTML 가능)" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium h-40 resize-none outline-none focus:bg-white transition-all"></textarea>
                        <div className="flex gap-2 pt-4">
                            <button type="button" onClick={() => setIsWriteFormOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black text-[10px] rounded-2xl active:scale-95 transition-all">취소</button>
                            <button type="submit" disabled={!writeTitle || !writeContent || isSubmitting} className={`flex-[1.5] py-4 text-white font-black text-[10px] rounded-2xl shadow-xl active:scale-95 transition-all ${writeMode === 'update' ? 'bg-yellow-600' : 'bg-slate-900'}`}>
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
