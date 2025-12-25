
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../state/AppContext';
import { GOOGLE_CLIENT_ID } from '../constants';
import { authService } from '../services/authService';

type AuthMode = 'LOGIN' | 'SIGNUP' | 'VERIFY_SENT';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, handleGoogleLoginSuccess } = useApp();
  
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState('');
  
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Form States
  const [loginId, setLoginId] = useState(''); 
  const [loginPw, setLoginPw] = useState('');
  
  const [signupId, setSignupId] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPw, setSignupPw] = useState('');
  const [signupPwConfirm, setSignupPwConfirm] = useState('');
  const [signupNickname, setSignupNickname] = useState('');

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

  // 클라이언트 측 유효성 검사
  const validateSignup = () => {
    const idRegex = /^[a-zA-Z0-9_]{4,15}$/; // 영문, 숫자, 언더바만
    const nickRegex = /^[a-zA-Z0-9가-힣]{2,10}$/; // 한글, 영문, 숫자만
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!idRegex.test(signupId)) {
        return "아이디는 4~15자의 영문, 숫자, 언더바(_)만 가능합니다.";
    }
    if (signupPw.length < 6) {
        return "비밀번호는 최소 6자 이상이어야 합니다.";
    }
    if (signupPw !== signupPwConfirm) {
        return "비밀번호 확인이 일치하지 않습니다.";
    }
    if (!nickRegex.test(signupNickname)) {
        return "닉네임은 2~10자의 한글, 영문, 숫자만 가능하며 특수문자는 불가능합니다.";
    }
    if (!emailRegex.test(signupEmail)) {
        return "올바른 이메일 형식을 입력해주세요.";
    }
    return null;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError('');
      try {
          await login(loginId, loginPw);
      } catch (err: any) {
          setError(err.message || "로그인 실패");
      } finally {
          setIsLoading(false);
      }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const validationError = validateSignup();
      if (validationError) {
          setError(validationError);
          return;
      }

      setIsLoading(true);
      setError('');
      setErrorType('');
      
      try {
          const result = await authService.register({ 
              loginId: signupId, 
              email: signupEmail, 
              pw: signupPw, 
              nickname: signupNickname, 
              phone: ''
          });
          
          if (result.needsEmailConfirm) {
              setMode('VERIFY_SENT');
          } else {
              window.location.reload();
          }
      } catch (e: any) {
          if (e.message === "SUPABASE_EMAIL_LIMIT_REACHED") {
              setErrorType('EMAIL_LIMIT');
              setError("이메일 발송 제한(시간당 3건)에 도달했습니다. 잠시 후 다시 시도하거나 관리자에게 문의하세요.");
          } else {
              setError(e.message || "가입 중 오류가 발생했습니다.");
          }
      } finally {
          setIsLoading(false);
      }
  };

  if (!isAuthModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/50">
        
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
                        <input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="아이디" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200" />
                        <input type="password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} placeholder="비밀번호" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200" />
                        {error && <p className="text-red-500 text-[11px] font-bold text-center animate-pulse">{error}</p>}
                        <button type="submit" disabled={isLoading} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl active:scale-95 transition-all">
                            {isLoading ? '로그인 중...' : '로그인'}
                        </button>
                    </form>
                </div>
            )}

            {mode === 'SIGNUP' && (
                <div className="space-y-3 animate-in slide-in-from-left duration-300">
                    <div className="space-y-2.5">
                        <input type="text" value={signupId} onChange={(e) => setSignupId(e.target.value)} placeholder="아이디 (영문/숫자, 4자 이상)" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" />
                        
                        <div className="grid grid-cols-2 gap-2">
                            <input type="password" value={signupPw} onChange={(e) => setSignupPw(e.target.value)} placeholder="비밀번호" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" />
                            <input type="password" value={signupPwConfirm} onChange={(e) => setSignupPwConfirm(e.target.value)} placeholder="비밀번호 확인" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" />
                        </div>

                        <input type="text" value={signupNickname} onChange={(e) => setSignupNickname(e.target.value)} placeholder="닉네임 (한글/영문/숫자, 2자 이상)" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" />
                        <input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="이메일 (인증용)" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>
                    
                    {error && (
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-2">
                             <p className="text-red-600 text-[11px] font-bold text-center">{error}</p>
                             {errorType === 'EMAIL_LIMIT' && (
                                 <div className="text-[10px] text-red-500/80 space-y-1 mt-1 border-t border-red-200 pt-2">
                                     <p className="font-bold">⚠️ 개발자 참고 (SMTP 이슈):</p>
                                     <p>Supabase 대시보드 -> Authentication -> Providers -> Email에서 <span className="underline">Confirm Email</span> 설정을 확인하거나 SMTP 서버를 직접 연결하세요.</p>
                                 </div>
                             )}
                        </div>
                    )}

                    <button onClick={handleRegisterSubmit} disabled={isLoading} className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all">
                        {isLoading ? '요청 중...' : '회원가입 및 인증 메일 발송'}
                    </button>
                </div>
            )}

            {mode === 'VERIFY_SENT' && (
                <div className="text-center space-y-6 py-4 animate-in zoom-in-95 duration-300">
                    <div className="relative">
                        <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full mx-auto flex items-center justify-center text-4xl shadow-inner">📧</div>
                        <div className="absolute -bottom-1 -right-1 bg-green-500 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center text-white text-xs">✓</div>
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800">이메일을 확인해주세요!</h3>
                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                            <span className="font-bold text-blue-600">{signupEmail}</span>(으)로<br/>인증 링크를 발송했습니다.
                        </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl text-xs text-slate-500 text-left space-y-2 border border-slate-100">
                        <p>• 인증 링크를 클릭한 후 아래 로그인 버튼을 눌러주세요.</p>
                        <p>• 메일이 오지 않았다면 스팸함도 확인해보세요.</p>
                    </div>
                    <button onClick={() => setMode('LOGIN')} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-slate-800 transition-all">인증 완료 후 로그인</button>
                </div>
            )}
        </div>

        <button onClick={closeAuthModal} className="p-4 w-full text-center text-xs font-bold text-slate-400 hover:text-slate-800 border-t border-slate-100 bg-white">닫기</button>
      </div>
    </div>
  );
};
