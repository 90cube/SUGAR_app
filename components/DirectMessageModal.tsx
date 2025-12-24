
import React from 'react';
import { useApp } from '../state/AppContext';

export const DirectMessageModal: React.FC = () => {
  const { isDMModalOpen, closeDMModal, activeDMUser } = useApp();

  if (!isDMModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4 animate-in fade-in duration-300 pointer-events-auto">
      <div className="w-full sm:max-w-md h-[80vh] sm:h-[600px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Header */}
        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-4 bg-white/80 backdrop-blur-xl rounded-t-3xl z-10">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold">
                 {activeDMUser ? activeDMUser[0].toUpperCase() : '?'}
              </div>
              <div>
                  <h3 className="font-bold text-slate-900 text-sm">{activeDMUser || 'Unknown User'}</h3>
                  <div className="flex items-center gap-1">
                     <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                     <span className="text-xs text-slate-400">접속 중</span>
                  </div>
              </div>
           </div>
           <button onClick={closeDMModal} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        {/* Chat Body (Scrollable) */}
        <div className="flex-1 bg-slate-50 p-4 overflow-y-auto space-y-4">
            <div className="text-center text-xs text-slate-400 my-4">오늘</div>
            
            {/* Incoming Message Skeleton */}
            <div className="flex justify-start">
               <div className="bg-white text-slate-700 px-4 py-2.5 rounded-2xl rounded-tl-none max-w-[75%] text-sm shadow-sm border border-slate-100">
                  <div className="w-24 h-2 bg-slate-100 rounded mb-2"></div>
                  <p>안녕하세요, 랭크전 같이 하실래요?</p>
               </div>
            </div>

            {/* Outgoing Message Skeleton */}
            <div className="flex justify-end">
               <div className="bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-none max-w-[75%] text-sm shadow-sm shadow-blue-500/20">
                  <p>좋아요! 몇 시쯤 가능하세요?</p>
               </div>
            </div>

             {/* Incoming Message Skeleton 2 */}
            <div className="flex justify-start">
               <div className="bg-white text-slate-700 px-4 py-2.5 rounded-2xl rounded-tl-none max-w-[75%] text-sm shadow-sm border border-slate-100">
                  <p>8시쯤 접속할 예정입니다.</p>
               </div>
            </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100 z-10 pb-8 sm:pb-4 rounded-b-3xl">
           <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-full border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
              <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
              <input 
                 type="text" 
                 placeholder="메시지 입력..." 
                 className="flex-1 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              <button className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                 <svg className="w-5 h-5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};
