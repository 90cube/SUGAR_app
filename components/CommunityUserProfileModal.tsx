
import React, { useState, useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { communityService } from '../services/communityService';
import { CommunityPost } from '../types';

export const CommunityUserProfileModal: React.FC = () => {
    const { selectedCommunityUser, closeCommunityUserProfile, authUser } = useApp();
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [viewMode, setViewMode] = useState<'INFO' | 'POSTS' | 'COMMENTS'>('INFO');
    const [guillotineConfirm, setGuillotineConfirm] = useState(false);
    const [localGuillotineCount, setLocalGuillotineCount] = useState(0);

    // Check if the viewed profile is ME (Using authorId if available)
    const isMe = selectedCommunityUser?.authorId === authUser?.id || authUser?.name === selectedCommunityUser?.nickname;

    useEffect(() => {
        if (selectedCommunityUser) {
            setLocalGuillotineCount(selectedCommunityUser.guillotineCount);
            setViewMode('INFO');
            setGuillotineConfirm(false);
            setPosts([]);
        }
    }, [selectedCommunityUser]);

    if (!selectedCommunityUser) return null;

    const handleFetchPosts = async () => {
        const idToQuery = selectedCommunityUser.authorId || "";
        if (idToQuery) {
            const p = await communityService.getPostsByAuthorId(idToQuery);
            setPosts(p);
        } else {
            const p = await communityService.getPostsByAuthor(selectedCommunityUser.nickname);
            setPosts(p);
        }
        setViewMode('POSTS');
    };

    const handleGuillotineClick = () => {
        setGuillotineConfirm(true);
    };

    const confirmGuillotine = async () => {
        const newCount = await communityService.executeGuillotine(selectedCommunityUser.nickname);
        setLocalGuillotineCount(newCount);
        setGuillotineConfirm(false);
    };

    return (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={closeCommunityUserProfile}>
            <div className="w-full max-w-sm bg-white rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-white/20" onClick={e => e.stopPropagation()}>
                {/* Header Profile */}
                <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent"></div>
                    <button onClick={closeCommunityUserProfile} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="w-24 h-24 bg-gradient-to-tr from-yellow-400 to-yellow-200 rounded-full mx-auto flex items-center justify-center text-3xl font-black text-slate-900 shadow-2xl border-4 border-slate-800 relative z-10">
                        {selectedCommunityUser.nickname[0].toUpperCase()}
                    </div>
                    <h2 className="text-2xl font-black text-white mt-4 relative z-10 tracking-tight">{selectedCommunityUser.nickname}</h2>
                    <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest relative z-10">Joined since {selectedCommunityUser.joinDate}</p>
                </div>

                {/* Content */}
                <div className="p-8">
                    {viewMode === 'INFO' ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={handleFetchPosts} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-slate-100 transition-all group text-center active:scale-95">
                                    <div className="text-2xl font-black text-slate-900">{selectedCommunityUser.postCount}</div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">게시글</div>
                                </button>
                                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                                    <div className="text-2xl font-black text-slate-900">{selectedCommunityUser.commentCount}</div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">댓글</div>
                                </div>
                            </div>
                            
                            <div className="p-6 bg-red-50 rounded-[2rem] border border-red-100 flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Guillotine Point</div>
                                    <div className="text-3xl font-black text-red-600">{localGuillotineCount}</div>
                                </div>
                                {!isMe && (
                                    <button 
                                        onClick={handleGuillotineClick}
                                        disabled={guillotineConfirm}
                                        className="px-5 py-2.5 bg-red-600 text-white font-black text-[11px] rounded-2xl shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                                    >
                                        신고하기
                                    </button>
                                )}
                            </div>

                            {guillotineConfirm && (
                                <div className="bg-slate-900 p-5 rounded-3xl animate-in zoom-in-95 duration-200 text-center">
                                    <p className="text-xs font-bold text-white mb-4">정말 길로틴에 회부하시겠습니까?</p>
                                    <div className="flex gap-2">
                                        <button onClick={confirmGuillotine} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[11px] font-black">확인</button>
                                        <button onClick={() => setGuillotineConfirm(false)} className="flex-1 py-3 bg-slate-700 text-white rounded-xl text-[11px] font-black">취소</button>
                                    </div>
                                </div>
                            )}

                            {isMe && (
                                <div className="text-center py-4 text-slate-300 font-bold text-[10px] uppercase tracking-widest">본인 프로필을 조회 중입니다</div>
                            )}
                        </div>
                    ) : (
                        <div className="h-[300px] flex flex-col">
                            <div className="flex items-center gap-3 mb-4">
                                <button onClick={() => setViewMode('INFO')} className="p-2 bg-slate-100 rounded-full text-slate-500">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <span className="text-sm font-black text-slate-800">작성한 글 목록</span>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                                {posts.length === 0 ? (
                                    <div className="text-center text-slate-300 text-xs py-10">작성한 글이 없습니다.</div>
                                ) : (
                                    posts.map(post => (
                                        <div key={post.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                            <h4 className="text-sm font-black text-slate-800 line-clamp-1 mb-1">{post.title}</h4>
                                            <span className="text-[10px] font-bold text-slate-400">{post.createdAt.split('T')[0]}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
