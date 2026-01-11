
import React, { useState } from 'react';
import { authService } from '../services/authService';
import { useAuth } from '../state/AuthContext';

interface NicknameChangeModalProps {
  onClose: () => void;
}

export const NicknameChangeModal: React.FC<NicknameChangeModalProps> = ({ onClose }) => {
  const { refreshAuthUser } = useAuth();
  const [newNickname, setNewNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNickname.trim()) return;

    setIsLoading(true);
    setError('');
    
    try {
      await authService.updateNickname(newNickname);
      await refreshAuthUser(); // 세션 정보 갱신
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-white/50 animate-in zoom-in-95 duration-300">
        
        <div className="bg-slate-950 p-6 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500"></div>
             <h2 className="text-white font-black text-lg uppercase tracking-tight">IDENTITY UPDATE</h2>
             <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mt-1">Modify Subject Alias</p>
        </div>

        <div className="p-6">
            {success ? (
                <div className="py-8 text-center animate-in fade-in zoom-in">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                        ✅
                    </div>
                    <h3 className="text-slate-900 font-black text-lg">변경 완료</h3>
                    <p className="text-slate-500 text-xs mt-1">새로운 닉네임이 적용되었습니다.</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">New Nickname</label>
                        <input 
                            type="text" 
                            value={newNickname} 
                            onChange={(e) => setNewNickname(e.target.value)} 
                            placeholder="2~10자 한글/영문/숫자"
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-center"
                            autoFocus
                        />
                    </div>

                    <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 flex gap-2 items-start">
                        <span className="text-yellow-600 mt-0.5">⚠️</span>
                        <p className="text-[10px] text-yellow-800 font-medium leading-relaxed">
                            닉네임은 <strong>24시간에 한 번만</strong> 변경할 수 있습니다.<br/>
                            신중하게 결정해 주세요.
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-center">
                            <p className="text-[10px] font-bold text-red-500">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="flex-1 py-3 bg-slate-100 text-slate-500 font-black text-xs rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            취소
                        </button>
                        <button 
                            type="submit" 
                            disabled={isLoading || !newNickname}
                            className="flex-1 py-3 bg-slate-900 text-cyan-400 font-black text-xs rounded-xl shadow-lg hover:bg-black active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isLoading ? '처리 중...' : '변경 실행'}
                        </button>
                    </div>
                </form>
            )}
        </div>
      </div>
    </div>
  );
};
