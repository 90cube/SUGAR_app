
import React, { useEffect, useState } from 'react';
import { useApp } from '../state/AppContext';
import { communityService } from '../services/communityService';
import { CommunityPost } from '../types';

export const AdminHiddenBoardModal: React.FC = () => {
    const { isAdminHiddenBoardOpen, closeAdminHiddenBoard } = useApp();
    const [posts, setPosts] = useState<CommunityPost[]>([]);

    useEffect(() => {
        if (isAdminHiddenBoardOpen) {
            communityService.getPosts('hidden').then(setPosts);
        }
    }, [isAdminHiddenBoardOpen]);

    if (!isAdminHiddenBoardOpen) return null;

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/80 backdrop-blur-lg p-4 animate-in fade-in duration-300">
             <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                         </div>
                         <h2 className="text-white font-bold uppercase tracking-wider">비밀 게시판 (Hidden)</h2>
                    </div>
                    <button onClick={closeAdminHiddenBoard} className="text-slate-500 hover:text-white">닫기</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/50">
                    {posts.length === 0 ? (
                        <div className="text-center text-slate-600 py-10">숨겨진 게시글이 없습니다.</div>
                    ) : posts.map(post => (
                        <div key={post.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">CONFIDENTIAL</span>
                                <span className="text-xs text-slate-500">{post.createdAt.split('T')[0]}</span>
                            </div>
                            <h3 className="text-white font-bold mb-1">{post.title}</h3>
                            <p className="text-slate-400 text-sm line-clamp-2">{post.content}</p>
                            <div className="mt-3 text-xs text-slate-600 font-mono">ID: {post.id} | Author: {post.author}</div>
                        </div>
                    ))}
                </div>
             </div>
        </div>
    );
};
