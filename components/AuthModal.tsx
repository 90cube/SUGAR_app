
import React from 'react';
import { useApp } from '../state/AppContext';
import { UI_STRINGS } from '../constants';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login } = useApp();

  if (!isAuthModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 transform transition-all animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-white/50 ring-1 ring-white/60">
        <h2 className="text-2xl font-black text-center text-slate-900 mb-8 tracking-tight drop-shadow-sm">{UI_STRINGS.loginTitle}</h2>
        
        <div className="space-y-4">
          <button 
            onClick={login}
            className="w-full py-4 px-4 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold rounded-2xl transition-all shadow-[0_0_15px_rgba(250,204,21,0.4)] hover:shadow-[0_0_25px_rgba(250,204,21,0.6)] active:scale-95"
          >
            Log In with Nexon
          </button>
          
          <button 
            onClick={login}
            className="w-full py-4 px-4 bg-white/50 hover:bg-white/80 text-slate-700 font-bold rounded-2xl transition-all border border-white/60 hover:shadow-lg active:scale-95"
          >
            Guest Access (Demo)
          </button>
        </div>

        <button 
          onClick={closeAuthModal}
          className="mt-8 w-full text-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
