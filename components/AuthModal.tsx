
import React, { useState, useEffect } from 'react';
import { useAuth } from '../state/AuthContext';
import { authService } from '../services/authService';
import { supabase } from '../services/supabaseClient';

type AuthMode = 'LOGIN' | 'SIGNUP' | 'VERIFY_SENT';
type Status = 'NONE' | 'VALID' | 'INVALID';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, signInWithGoogle } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [loginId, setLoginId] = useState(''); 
  const [loginPw, setLoginPw] = useState('');
  
  const [signupId, setSignupId] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPw, setSignupPw] = useState('');
  const [signupPwConfirm, setSignupPwConfirm] = useState('');
  const [signupNickname, setSignupNickname] = useState('');

  const [idStatus, setIdStatus] = useState<Status>('NONE');
  const [idMessage, setIdMessage] = useState('');
  const [emailStatus, setEmailStatus] = useState<Status>('NONE');
  const [emailMessage, setEmailMessage] = useState('');
  const [nickStatus, setNickStatus] = useState<Status>('NONE');
  const [pwStatus, setPwStatus] = useState<Status>('NONE');

  useEffect(() => {
    if (mode !== 'SIGNUP') return;
    const checkAvailability = async () => {
        if (!signupId) { setIdStatus('NONE'); setIdMessage(''); } 
        else {
            const res = await authService.isIdAvailable(signupId);
            setIdStatus(res.available ? 'VALID' : 'INVALID');
            setIdMessage(res.message);
        }
        if (!signupEmail) { setEmailStatus('NONE'); setEmailMessage(''); } 
        else {
            const res = await authService.isEmailAvailable(signupEmail);
            setEmailStatus(res.available ? 'VALID' : 'INVALID');
            setEmailMessage(res.message);
        }
        const nickRegex = /^[a-zA-Z0-9가-힣]{2,10}$/;
        if (!signupNickname) setNickStatus('NONE');
        else setNickStatus(nickRegex.test(signupNickname) ? 'VALID' : 'INVALID');
    };
    const timer = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timer);
  }, [signupId, signupEmail, signupNickname, mode]);

  useEffect(() => {
    if (!signupPw || !signupPwConfirm) setPwStatus('NONE');
    else setPwStatus(signupPw === signupPwConfirm && signupPw.length >= 6 ? 'VALID' : 'INVALID');
  }, [signupPw, signupPwConfirm]);

  const canSubmit = idStatus === 'VALID' && emailStatus === 'VALID' && nickStatus === 'VALID' && pwStatus === 'VALID';

  const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError('');
      try {
          await login(loginId, loginPw);
      } catch (err: any) {
          setError(err.message);
      } finally {
          setIsLoading(false);
      }
  };

  const handleGoogleLogin = async () => {
    if (!supabase) {
        setError("서버 환경 변수(Supabase)가 설정되지 않아 구글 로그인을 사용할 수 없습니다.");
        return;
    }
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError("Google 로그인 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      setIsLoading(true);
      setError('');
      try {
          const res = await authService.register({ 
              loginId: signupId, 
              email: signupEmail, 
              pw: signupPw, 
              nickname: signupNickname 
          });
          if (res.needsEmailConfirm) setMode('VERIFY_SENT');
          else window.location.reload();
      } catch (err: any) {
          setError(err.message);
      } finally {
          setIsLoading(false);
      }
  };

  const borderClass = (status: Status, color: 'blue' | 'green' = 'blue') => {
      if (status === 'NONE') return 'border-slate-200';
      if (status === 'VALID') return color === 'green' ? 'border-green-500' : 'border-blue-500';
      return 'border-red-500';
  };

  if (!isAuthModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/50">
        <div className="flex border-b border-slate-100">
            <button onClick={() => {setMode('LOGIN'); setError('');}} className={`flex-1 py-4 text-xs font-black transition-all ${mode === 'LOGIN' ? 'text-slate-900 bg-white border-b-2 border-slate-900' : 'bg-slate-50 text-slate-400'}`}>LOGIN</button>
            <button onClick={() => {setMode('SIGNUP'); setError('');}} className={`flex-1 py-4 text-xs font-black transition-all ${mode === 'SIGNUP' ? 'text-slate-900 bg-white border-b-2 border-slate-900' : 'bg-slate-50 text-slate-400'}`}>JOIN</button>
        </div>

        <div className="p-8">
            {mode === 'LOGIN' && (
                <div className="space-y-6">
                    <button 
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-700 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                        Sign in with Google
                    </button>
                    <div className="flex items-center gap-3"><div className="h-px bg-slate-100 flex-1"></div><span className="text-[10px] text-slate-300 font-bold">OR</span><div className="h-px bg-slate-100 flex-1"></div></div>
                    <form onSubmit={handleLoginSubmit} className="space-y-3">
                        <input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="Username" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:bg-white" />
                        <input type="password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} placeholder="Password" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:bg-white" />
                        {error && <p className="text-red-500 text-[10px] font-bold text-center">{error}</p>}
                        <button type="submit" disabled={isLoading} className="w-full py-4 bg-slate-900 text-white font-black text-xs rounded-2xl shadow-xl active:scale-95 transition-all">
                            {isLoading ? 'Processing...' : 'LOGIN'}
                        </button>
                    </form>
                </div>
            )}

            {mode === 'SIGNUP' && (
                <div className="space-y-3">
                    <input type="text" value={signupId} onChange={(e) => setSignupId(e.target.value)} placeholder="ID" className={`w-full p-4 bg-slate-50 border-2 rounded-2xl text-xs font-bold outline-none transition-all ${borderClass(idStatus)}`} />
                    <input type="text" value={signupNickname} onChange={(e) => setSignupNickname(e.target.value)} placeholder="Nickname" className={`w-full p-4 bg-slate-50 border-2 rounded-2xl text-xs font-bold outline-none transition-all ${borderClass(nickStatus)}`} />
                    <input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="Email" className={`w-full p-4 bg-slate-50 border-2 rounded-2xl text-xs font-bold outline-none transition-all ${borderClass(emailStatus)}`} />
                    <input type="password" value={signupPw} onChange={(e) => setSignupPw(e.target.value)} placeholder="Password (6+ chars)" className={`w-full p-4 bg-slate-50 border-2 rounded-2xl text-xs font-bold outline-none transition-all ${borderClass(pwStatus, 'green')}`} />
                    {error && <p className="text-red-500 text-[10px] font-bold text-center py-1">{error}</p>}
                    <button 
                        onClick={handleRegisterSubmit} 
                        disabled={isLoading || !canSubmit} 
                        className={`w-full py-4 text-white font-black text-xs rounded-2xl shadow-lg transition-all active:scale-95 ${canSubmit ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                        {isLoading ? 'Wait...' : 'SIGN UP'}
                    </button>
                </div>
            )}

            {mode === 'VERIFY_SENT' && (
                <div className="text-center space-y-4 py-4 animate-in zoom-in-95">
                    <div className="text-4xl">📧</div>
                    <h3 className="text-lg font-black text-slate-800">Check your Email</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        We sent a verification link to <br/> <strong>{signupEmail}</strong>.
                    </p>
                    <button onClick={() => setMode('LOGIN')} className="w-full py-4 bg-slate-900 text-white font-black text-xs rounded-2xl shadow-xl">Back to Login</button>
                </div>
            )}
        </div>

        <button onClick={closeAuthModal} className="p-4 w-full text-center text-[10px] font-black text-slate-400 hover:text-slate-800 border-t border-slate-50">CLOSE</button>
      </div>
    </div>
  );
};
