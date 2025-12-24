
import React, { useEffect, useState } from 'react';
import { useApp } from '../state/AppContext';
import { communityService } from '../services/communityService';
import { CommunityPost, CommunityUserProfile } from '../types';

export const AdminGuillotineModal: React.FC = () => {
    const { isAdminGuillotineOpen, closeAdminGuillotine } = useApp();
    const [users, setUsers] = useState<CommunityUserProfile[]>([]);
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [tab, setTab] = useState<'USERS' | 'POSTS'>('USERS');

    useEffect(() => {
        if (isAdminGuillotineOpen) {
            communityService.getHighGuillotineUsers().then(setUsers);
            communityService.getHighHalfshotPosts().then(setPosts);
        }
    }, [isAdminGuillotineOpen]);

    if (!isAdminGuillotineOpen) return null;

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/80 backdrop-blur-lg p-4 animate-in fade-in duration-300">
             <div className="w-full max-w-lg bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                         </div>
                         <h2 className="text-slate-900 font-bold uppercase tracking-wider">길로틴 관리 (Guillotine)</h2>
                    </div>
                    <button onClick={closeAdminGuillotine} className="text-slate-400 hover:text-slate-600">닫기</button>
                </div>

                <div className="flex p-2 bg-slate-100 gap-2">
                    <button 
                        onClick={() => setTab('USERS')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${tab === 'USERS' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:bg-white/50'}`}
                    >
                        신고 누적 유저
                    </button>
                    <button 
                        onClick={() => setTab('POSTS')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${tab === 'POSTS' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:bg-white/50'}`}
                    >
                        비추천 게시글
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                    {tab === 'USERS' && (
                        users.length === 0 ? <div className="text-center text-slate-400 text-sm py-10">제재 대상 유저가 없습니다.</div> :
                        users.map((u, i) => (
                            <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-slate-900">{u.nickname}</div>
                                    <div className="text-xs text-slate-500">가입일: {u.joinDate}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-red-600">{u.guillotineCount}</div>
                                    <div className="text-[10px] font-bold text-red-400 uppercase">누적 신고</div>
                                </div>
                            </div>
                        ))
                    )}
                    {tab === 'POSTS' && (
                        posts.length === 0 ? <div className="text-center text-slate-400 text-sm py-10">비추천 게시글이 없습니다.</div> :
                        posts.map(p => (
                             <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200">
                                <div className="flex justify-between items-start mb-2">
                                     <div className="text-xs font-bold text-slate-400">{p.author}</div>
                                     <div className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded flex items-center gap-1">
                                         🛡️ {p.halfshots}
                                     </div>
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm mb-1">{p.title}</h3>
                            </div>
                        ))
                    )}
                </div>
             </div>
        </div>
    );
};
