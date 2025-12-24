
import React, { useState, useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { PageContent } from '../types';

export const AdminEditor: React.FC = () => {
  const { isAdminEditorOpen, closeAdminEditor, pageContent, updatePageContent, isSavingContent } = useApp();
  
  const [formData, setFormData] = useState<PageContent>(pageContent);

  useEffect(() => {
    if (isAdminEditorOpen) {
        setFormData(pageContent);
    }
  }, [isAdminEditorOpen, pageContent]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      await updatePageContent(formData);
      closeAdminEditor();
  };

  if (!isAdminEditorOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 p-5 flex items-center justify-between">
            <h2 className="text-white font-black flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                페이지 에디터 <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] text-slate-300 font-normal">Connected to Cloud</span>
            </h2>
            <button onClick={closeAdminEditor} className="text-slate-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Form */}
        <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
            <form id="admin-form" onSubmit={handleSubmit} className="space-y-5">
                
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl mb-4">
                    <h3 className="text-xs font-black text-blue-600 uppercase mb-2">홈 페이지 설정 (Home Config)</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">환영 타이틀 (Welcome Title)</label>
                            <input 
                                type="text" 
                                name="welcomeTitle"
                                value={formData.welcomeTitle}
                                onChange={handleChange}
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">검색 버튼 텍스트</label>
                            <input 
                                type="text" 
                                name="searchButtonText"
                                value={formData.searchButtonText}
                                onChange={handleChange}
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none"
                            />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">이상 탐지 버튼 텍스트</label>
                            <input 
                                type="text" 
                                name="anomalyButtonText"
                                value={formData.anomalyButtonText}
                                onChange={handleChange}
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                    <h3 className="text-xs font-black text-orange-600 uppercase mb-2">시스템 메시지 (Messages)</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">로딩 텍스트</label>
                            <input 
                                type="text" 
                                name="loadingText"
                                value={formData.loadingText}
                                onChange={handleChange}
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-500/20 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">에러 텍스트</label>
                            <input 
                                type="text" 
                                name="errorText"
                                value={formData.errorText}
                                onChange={handleChange}
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-500/20 outline-none"
                            />
                        </div>
                    </div>
                </div>

            </form>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3">
             <button 
                type="button" 
                onClick={closeAdminEditor}
                className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
             >
                 취소
             </button>
             <button 
                type="submit" 
                form="admin-form"
                disabled={isSavingContent}
                className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
             >
                 {isSavingContent ? (
                     <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        저장 중...
                     </>
                 ) : '변경사항 저장'}
             </button>
        </div>
      </div>
    </div>
  );
};
