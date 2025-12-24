
import React, { useState, useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { communityService } from '../services/communityService';
import { CommunityPost } from '../types';

export const CommunityUserProfileModal: React.FC = () => {
    const { selectedCommunityUser, closeCommunityUserProfile, userProfile } = useApp();
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [viewMode, setViewMode] = useState<'INFO' | 'POSTS' | 'COMMENTS'>('INFO');
    const [guillotineConfirm, setGuillotineConfirm] = useState(false);
    const [localGuillotineCount, setLocalGuillotineCount] = useState(0);

    useEffect(() => {
        if (selectedCommunityUser) {
            setLocalGuillotineCount(selectedCommunityUser.guillotineCount);
            setViewMode('INFO');
            setGuillotineConfirm(false);
            setPosts([]); // Clear prev
        }
    }, [selectedCommunityUser]);

    if (!selectedCommunityUser) return null;

    const handleFetchPosts = async () => {
        const p = await communityService.getPostsByAuthor(selectedCommunityUser.nickname);
        setPosts(p);
        setViewMode('POSTS');
    };

    const handleFetchComments = () => {
        // Mock Comments View
        setViewMode('COMMENTS');
    };

    const handleGuillotineClick = () => {
        setGuillotineConfirm(true);
    };

    const confirmGuillotine = async () => {
        const newCount = await communityService.executeGuillotine(selectedCommunityUser.nickname);
        setLocalGuillotineCount(newCount);
        setGuillotineConfirm(false);
        // Optional: Trigger a refresh in context if needed, but local state is fine for now
    };

    return (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                {/* Header Profile */}
                <div className="bg-slate-900 p-6 text-center relative">
                    <button 
                        onClick={closeCommunityUserProfile}
                        className="absolute top-4 right-4 text-slate-500 hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mx-auto flex items-center justify-center text-3xl font-bold text-white shadow-lg border-4 border-slate-800">
                        {selectedCommunityUser.nickname[0].toUpperCase()}
                    </div>
                    <h2 className="text-xl font-black text-white mt-3">{selectedCommunityUser.nickname}</h2>
                    <p className="text-xs text-slate-400 mt-1">가입일: {selectedCommunityUser.joinDate}</p>
                </div>

                {/* Stats Grid */}
                {viewMode === 'INFO' && (
                    <div className="p-6">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <button onClick={handleFetchPosts} className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-colors group">
                                <div className="text-2xl font-black text-slate-800 group-hover:text-blue-600">{selectedCommunityUser.postCount}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase">게시글</div>
                            </button>
                            <button onClick={handleFetchComments} className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-colors group">
                                <div className="text-2xl font-black text-slate-800 group-hover:text-blue-600">{selectedCommunityUser.commentCount}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase">댓글</div>
                            </button>
                        </div>
                        
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-center justify-between mb-6">
                            <div>
                                <div className="text-xs font-bold text-red-400 uppercase">길로틴 포인트</div>
                                <div className="text-2xl font-black text-red-600">{localGuillotineCount}</div>
                            </div>
                            <button 
                                onClick={handleGuillotineClick}
                                disabled={guillotineConfirm}
                                className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-lg shadow-sm hover:bg-red-700 active:scale-95 transition-all"
                            >
                                신고하기
                            </button>
                        </div>

                        {guillotineConfirm && (
                            <div className="bg-slate-900 text-white p-4 rounded-xl text-center animate-pulse">
                                <p className="text-sm font-bold mb-3">이 유저를 길로틴에 회부하시겠습니까?</p>
                                <div className="flex gap-2 justify-center">
                                    <button onClick={confirmGuillotine} className="px-4 py-1.5 bg-red-600 rounded-lg text-xs font-bold">예</button>
                                    <button onClick={() => setGuillotineConfirm(false)} className="px-4 py-1.5 bg-slate-700 rounded-lg text-xs font-bold">아니오</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Posts View */}
                {viewMode === 'POSTS' && (
                    <div className="flex flex-col h-[300px]">
                        <div className="p-3 border-b border-slate-100 flex items-center gap-2">
                             <button onClick={() => setViewMode('INFO')} className="text-slate-400 hover:text-slate-600">
                                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                             </button>
                             <span className="text-sm font-bold">작성 게시글</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {posts.length === 0 ? (
                                <div className="text-center text-slate-400 text-xs py-10">작성한 글이 없습니다.</div>
                            ) : posts.map(post => (
                                <div key={post.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="text-xs text-slate-500 mb-1">{post.createdAt.split('T')[0]}</div>
                                    <div className="text-sm font-bold text-slate-800 line-clamp-1">{post.title}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Comments View */}
                {viewMode === 'COMMENTS' && (
                    <div className="flex flex-col h-[300px]">
                        <div className="p-3 border-b border-slate-100 flex items-center gap-2">
                             <button onClick={() => setViewMode('INFO')} className="text-slate-400 hover:text-slate-600">
                                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                             </button>
                             <span className="text-sm font-bold">작성 댓글</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-center">
                            <div className="text-slate-400 text-xs py-10">
                                댓글 내역은 비공개입니다.
                                <br/>(Simulated View)
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
