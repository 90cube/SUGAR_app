
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../state/AppContext';
import { GOOGLE_CLIENT_ID } from '../constants';
import { authService } from '../services/authService';

type AuthMode = 'LOGIN' | 'SIGNUP' | 'VERIFY_SENT';
type Status = 'NONE' | 'VALID' | 'INVALID';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, handleGoogleLoginSuccess } = useApp();
  
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Form States
  const [loginId, setLoginId] = useState(''); 
  const [loginPw, setLoginPw] = useState('');
  
  const [signupId, setSignupId] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPw, setSignupPw] = useState('');
  const [signupPwConfirm, setSignupPwConfirm] = useState('');
  const [signupNickname, setSignupNickname] = useState('');

  // Status & Feedback Messages
  const [idStatus, setIdStatus] = useState<Status>('NONE');
  const [idMessage, setIdMessage] = useState('');
  
  const [emailStatus, setEmailStatus] = useState<Status>('NONE');
  const [emailMessage, setEmailMessage] = useState('');
  
  const [nickStatus, setNickStatus] = useState<Status>('NONE');
  const [pwStatus, setPwStatus] = useState<Status>('NONE');

  useEffect(() => {
    if (!isAuthModalOpen || mode !== 'LOGIN') return;
    const renderGoogleButton = () => {
        if (window.google && googleButtonRef.current) {
             if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes("YOUR_GOOGLE_CLIENT_ID")) return;
             try {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: (response: any) => handleGoogleLoginSuccess(response.credential),
                });
                window.google.accounts.id.renderButton(googleButtonRef.current, { 
                    theme: "outline", size: "large", width: 350, text: "signin_with", shape: "pill"
                });
             } catch (e) { console.error(e); }
        }
    };
    renderGoogleButton();
  }, [isAuthModalOpen, mode]);

  // 실시간 유효성 & 중복 체크
  useEffect(() => {
    if (mode !== 'SIGNUP') return;

    const checkAvailability = async () => {
        // ID Check
        if (!signupId) {
            setIdStatus('NONE');
            setIdMessage('');
        } else {
            const res = await authService.isIdAvailable(signupId);
            setIdStatus(res.available ? 'VALID' : 'INVALID');
            setIdMessage(res.message);
        }

        // Email Check
        if (!signupEmail) {
            setEmailStatus('NONE');
            setEmailMessage('');
        } else {
            const res = await authService.isEmailAvailable(signupEmail);
            setEmailStatus(res.available ? 'VALID' : 'INVALID');
            setEmailMessage(res.message);
        }

        // Nickname Check
        const nickRegex = /^[a-zA-Z0-9가-힣]{2,10}$/;
        if (!signupNickname) setNickStatus('NONE');
        else setNickStatus(nickRegex.test(signupNickname) ? 'VALID' : 'INVALID');
    };

    const timer = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timer);
  }, [signupId, signupEmail, signupNickname, mode]);

  // 비밀번호 일치 체크
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
      if (status === 'VALID') return color === 'green' ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.15)]' : 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.15)]';
      return 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.15)]';
  };

  if (!isAuthModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/50">
        
        {mode !== 'VERIFY_SENT' && (
            <div className="flex border-b border-slate-100">
                <button onClick={() => {setMode('LOGIN'); setError('');}} className={`flex-1 py-4 text-xs font-bold transition-all ${mode === 'LOGIN' ? 'text-slate-900 border-b-2 border-slate-900 bg-white' : 'bg-slate-50 text-slate-400'}`}>로그인</button>
                <button onClick={() => {setMode('SIGNUP'); setError('');}} className={`flex-1 py-4 text-xs font-bold transition-all ${mode === 'SIGNUP' ? 'text-slate-900 border-b-2 border-slate-900 bg-white' : 'bg-slate-50 text-slate-400'}`}>회원가입</button>
            </div>
        )}

        <div className="p-8">
            {mode === 'LOGIN' && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                    <div className="w-full flex justify-center" ref={googleButtonRef}></div>
                    <div className="flex items-center gap-3"><div className="h-px bg-slate-100 flex-1"></div><span className="text-[10px] text-slate-300 font-bold">OR</span><div className="h-px bg-slate-100 flex-1"></div></div>
                    <form onSubmit={handleLoginSubmit} className="space-y-3">
                        <input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="아이디" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" />
                        <input type="password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} placeholder="비밀번호" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" />
                        {error && <p className="text-red-500 text-[11px] font-bold text-center">{error}</p>}
                        <button type="submit" disabled={isLoading} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl active:scale-95 transition-all">
                            {isLoading ? '로그인 중...' : '로그인'}
                        </button>
                    </form>
                </div>
            )}

            {mode === 'SIGNUP' && (
                <div className="space-y-3 animate-in slide-in-from-left duration-300">
                    <div className="space-y-2.5">
                        <div className="relative">
                            <input type="text" value={signupId} onChange={(e) => setSignupId(e.target.value)} placeholder="아이디 (4-15자, 영문/숫자)" className={`w-full p-3.5 bg-slate-50 border-2 rounded-2xl text-sm font-bold outline-none transition-all ${borderClass(idStatus)}`} />
                            {idMessage && <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase whitespace-nowrap ${idStatus === 'VALID' ? 'text-blue-500' : 'text-red-500'}`}>{idMessage === "사용 가능한 아이디" ? "OK" : idMessage}</span>}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <input type="password" value={signupPw} onChange={(e) => setSignupPw(e.target.value)} placeholder="비밀번호 (6자+)" className={`w-full p-3.5 bg-slate-50 border-2 rounded-2xl text-sm font-bold outline-none transition-all ${borderClass(pwStatus, 'green')}`} />
                            <input type="password" value={signupPwConfirm} onChange={(e) => setSignupPwConfirm(e.target.value)} placeholder="비밀번호 확인" className={`w-full p-3.5 bg-slate-50 border-2 rounded-2xl text-sm font-bold outline-none transition-all ${borderClass(pwStatus, 'green')}`} />
                        </div>

                        <div className="relative">
                            <input type="text" value={signupNickname} onChange={(e) => setSignupNickname(e.target.value)} placeholder="닉네임 (2-10자, 특수문자 불가)" className={`w-full p-3.5 bg-slate-50 border-2 rounded-2xl text-sm font-bold outline-none transition-all ${borderClass(nickStatus)}`} />
                        </div>

                        <div className="relative">
                            <input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="이메일 (인증용)" className={`w-full p-3.5 bg-slate-50 border-2 rounded-2xl text-sm font-bold outline-none transition-all ${borderClass(emailStatus)}`} />
                            {emailMessage && <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase whitespace-nowrap ${emailStatus === 'VALID' ? 'text-blue-500' : 'text-red-500'}`}>{emailMessage === "사용 가능한 이메일" ? "OK" : emailMessage}</span>}
                        </div>
                    </div>
                    
                    {error && <p className="text-red-500 text-[11px] font-bold text-center py-1">{error}</p>}

                    <button 
                        onClick={handleRegisterSubmit} 
                        disabled={isLoading || !canSubmit} 
                        className={`w-full py-4 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 ${canSubmit ? 'bg-blue-600' : 'bg-slate-300 cursor-not-allowed'}`}
                    >
                        {isLoading ? '가입 요청 중...' : '가입하기'}
                    </button>
                    <p className="text-[10px] text-slate-400 text-center">모든 항목이 올바르게 입력되어야 가입이 가능합니다.</p>
                </div>
            )}

            {mode === 'VERIFY_SENT' && (
                <div className="text-center space-y-6 py-4 animate-in zoom-in-95 duration-300">
                    <div className="relative">
                        <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full mx-auto flex items-center justify-center text-4xl">📧</div>
                        <div className="absolute -bottom-1 -right-1 bg-green-500 w-7 h-7 rounded-full border-4 border-white flex items-center justify-center text-white text-[10px]">✓</div>
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800">이메일을 확인해주세요!</h3>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                            <span className="font-bold text-blue-600">{signupEmail}</span>(으)로<br/>인증 링크를 발송했습니다.
                        </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl text-[11px] text-slate-500 text-left space-y-1.5 border border-slate-100">
                        <p>• 메일함 또는 스팸함을 확인해주세요.</p>
                        <p>• <strong>이메일 인증</strong>을 마쳐야 로그인이 가능합니다.</p>
                    </div>
                    <button onClick={() => setMode('LOGIN')} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-slate-800 transition-all">인증 완료 후 로그인하러 가기</button>
                </div>
            )}
        </div>

        <button onClick={closeAuthModal} className="p-4 w-full text-center text-xs font-bold text-slate-400 hover:text-slate-800 border-t border-slate-100 bg-white">닫기</button>
      </div>
    </div>
  );
};
