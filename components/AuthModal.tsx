
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../state/AppContext';
import { UI_STRINGS, GOOGLE_CLIENT_ID } from '../constants';
import { authService } from '../services/authService';

type AuthMode = 'LOGIN' | 'SIGNUP';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, register, handleGoogleLoginSuccess } = useApp();
  
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Login Form State
  const [loginId, setLoginId] = useState(''); 
  const [loginPw, setLoginPw] = useState('');

  // Signup Form State
  const [signupId, setSignupId] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const [signupPw, setSignupPw] = useState('');
  const [signupPwConfirm, setSignupPwConfirm] = useState('');

  const [signupPhone, setSignupPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [isPhoneSent, setIsPhoneSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  const [signupNickname, setSignupNickname] = useState('');

  // Initialize Google Button
  useEffect(() => {
    if (!isAuthModalOpen || mode !== 'LOGIN') return;

    const renderGoogleButton = () => {
        if (window.google && googleButtonRef.current) {
             if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes("YOUR_GOOGLE_CLIENT_ID")) {
                console.warn("[Google Auth] Client ID가 설정되지 않았습니다.");
                return;
             }

             try {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: (response: any) => {
                        handleGoogleLoginSuccess(response.credential);
                    },
                    auto_select: false,
                });
                
                window.google.accounts.id.renderButton(
                    googleButtonRef.current,
                    { 
                        theme: "outline", 
                        size: "large", 
                        width: 350,
                        text: "signin_with",
                        shape: "pill"
                    }
                );
             } catch (e) {
                console.error("Google Sign-In Error", e);
             }
        }
    };

    renderGoogleButton();
    const timer = setTimeout(renderGoogleButton, 1000);
    
    return () => clearTimeout(timer);
  }, [isAuthModalOpen, mode]);

  // Reset state on open/mode change
  useEffect(() => {
    if (!isAuthModalOpen) {
        setMode('LOGIN');
        resetForms();
    }
  }, [isAuthModalOpen]);

  useEffect(() => {
      setError('');
      resetForms();
  }, [mode]);

  const resetForms = () => {
    setLoginId(''); setLoginPw('');
    setSignupId('');
    setSignupEmail(''); setEmailCode(''); setIsEmailSent(false); setIsEmailVerified(false);
    setSignupPw(''); setSignupPwConfirm('');
    setSignupPhone(''); setPhoneCode(''); setIsPhoneSent(false); setIsPhoneVerified(false);
    setSignupNickname('');
    setIsLoading(false);
  };

  const handleSafeError = (e: any) => {
      if (e instanceof Error) {
          setError(e.message);
      } else if (typeof e === 'string') {
          setError(e);
      } else {
          setError("알 수 없는 오류가 발생했습니다.");
          console.error("Unknown auth error:", e);
      }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError('');
      try {
          await login(loginId, loginPw);
      } catch (err: any) {
          handleSafeError(err);
      } finally {
          setIsLoading(false);
      }
  };

  const requestEmailCode = async () => {
      if (!signupEmail) return;
      setIsLoading(true);
      try {
          await authService.sendEmailVerification(signupEmail);
          setIsEmailSent(true);
          setError('');
          alert(`인증번호가 발송되었습니다. (콘솔 확인: 123456)`);
      } catch (e: any) {
          handleSafeError(e);
      } finally {
          setIsLoading(false);
      }
  };

  const verifyEmail = async () => {
      if (!emailCode) return;
      setIsLoading(true);
      try {
          const success = await authService.verifyEmailCode(signupEmail, emailCode);
          if (success) {
              setIsEmailVerified(true);
              setError('');
          } else {
              setError("인증번호가 올바르지 않습니다.");
          }
      } catch (e: any) {
          handleSafeError(e);
      } finally {
          setIsLoading(false);
      }
  };

  const requestPhoneCode = async () => {
      if (!signupPhone) return;
      setIsLoading(true);
      try {
          await authService.sendPhoneVerification(signupPhone);
          setIsPhoneSent(true);
          setError('');
          alert(`인증번호가 발송되었습니다. (콘솔 확인: 123456)`);
      } catch (e: any) {
          handleSafeError(e);
      } finally {
          setIsLoading(false);
      }
  };

  const verifyPhone = async () => {
      if (!phoneCode) return;
      setIsLoading(true);
      try {
          const success = await authService.verifyPhoneCode(signupPhone, phoneCode);
          if (success) {
              setIsPhoneVerified(true);
              setError('');
          } else {
              setError("인증번호가 올바르지 않습니다.");
          }
      } catch (e: any) {
          handleSafeError(e);
      } finally {
          setIsLoading(false);
      }
  };

  const handleRegisterSubmit = async () => {
      if (!signupId.trim()) {
          setError("아이디를 입력해주세요.");
          return;
      }
      if (!isEmailVerified || !isPhoneVerified) {
          setError("이메일과 휴대전화 인증을 완료해주세요.");
          return;
      }
      if (signupPw !== signupPwConfirm) {
          setError("비밀번호가 일치하지 않습니다.");
          return;
      }
      if (signupPw.length < 6) {
          setError("비밀번호는 6자리 이상이어야 합니다.");
          return;
      }
      if (!signupNickname) {
          setError("닉네임을 입력해주세요.");
          return;
      }

      setIsLoading(true);
      try {
          await register({
              loginId: signupId,
              email: signupEmail,
              pw: signupPw,
              nickname: signupNickname,
              phone: signupPhone
          });
      } catch (e: any) {
          handleSafeError(e);
      } finally {
          setIsLoading(false);
      }
  };

  if (!isAuthModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/50">
        
        {/* Toggle Header */}
        <div className="flex border-b border-slate-100">
            <button 
                onClick={() => setMode('LOGIN')}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === 'LOGIN' ? 'bg-white text-slate-900 border-b-2 border-slate-900' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
            >
                로그인 (Login)
            </button>
            <button 
                onClick={() => setMode('SIGNUP')}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === 'SIGNUP' ? 'bg-white text-slate-900 border-b-2 border-slate-900' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
            >
                회원가입 (Sign Up)
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {mode === 'LOGIN' ? UI_STRINGS.loginTitle : '계정 생성 (Sign Up)'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    {mode === 'LOGIN' ? 'Access advanced features & community' : 'SUGAR 커뮤니티에 오신 것을 환영합니다.'}
                </p>
            </div>
            
            {/* LOGIN FORM */}
            {mode === 'LOGIN' && (
                <div className="space-y-5 animate-in slide-in-from-right duration-300">
                    
                    {/* Google Login Button */}
                    <div className="w-full flex justify-center min-h-[40px]" ref={googleButtonRef}></div>

                    <div className="flex items-center gap-2">
                        <div className="h-px bg-slate-200 flex-1"></div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Or use account ID</span>
                        <div className="h-px bg-slate-200 flex-1"></div>
                    </div>

                    <form onSubmit={handleLoginSubmit} className="space-y-3">
                        <input 
                            type="text" 
                            value={loginId}
                            onChange={(e) => setLoginId(e.target.value)}
                            placeholder="아이디 (ID) 또는 이메일"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
                        />
                        <input 
                            type="password" 
                            value={loginPw}
                            onChange={(e) => setLoginPw(e.target.value)}
                            placeholder="비밀번호 (Password)"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
                        />
                        
                        {error && <p className="text-red-500 text-xs font-bold text-center animate-pulse">{error}</p>}
                        
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all hover:bg-slate-800 disabled:opacity-50"
                        >
                            {isLoading ? '로그인 중...' : '로그인 (Sign In)'}
                        </button>
                    </form>
                </div>
            )}

            {/* SIGNUP FORM */}
            {mode === 'SIGNUP' && (
                <div className="space-y-4 animate-in slide-in-from-left duration-300">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">1. 아이디 (ID)</label>
                        <input 
                            type="text" 
                            value={signupId}
                            onChange={(e) => setSignupId(e.target.value)}
                            placeholder="사용할 아이디를 입력하세요"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">2. 비밀번호 (Password)</label>
                        <input 
                            type="password" 
                            value={signupPw}
                            onChange={(e) => setSignupPw(e.target.value)}
                            placeholder="비밀번호 (6자 이상)"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                        />
                        <input 
                            type="password" 
                            value={signupPwConfirm}
                            onChange={(e) => setSignupPwConfirm(e.target.value)}
                            placeholder="비밀번호 확인"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 mt-2"
                        />
                    </div>
                    <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-500 uppercase">3. 닉네임 (Nickname)</label>
                         <input 
                            type="text" 
                            value={signupNickname} 
                            onChange={(e) => setSignupNickname(e.target.value)} 
                            placeholder="커뮤니티 활동명" 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                        />
                    </div>
                    <div className="border-t border-slate-100 my-2"></div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">4. 이메일 인증</label>
                        <div className="flex gap-2">
                            <input 
                                type="email" 
                                value={signupEmail} 
                                onChange={(e) => setSignupEmail(e.target.value)} 
                                placeholder="example@email.com" 
                                disabled={isEmailVerified}
                                className={`flex-1 p-3 bg-slate-50 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 ${isEmailVerified ? 'border-green-400 text-green-700 bg-green-50' : 'border-slate-200'}`}
                            />
                            <button 
                                type="button" 
                                onClick={requestEmailCode}
                                disabled={isEmailVerified || isLoading || !signupEmail}
                                className="px-3 bg-slate-900 text-white text-xs font-bold rounded-xl disabled:opacity-50 whitespace-nowrap"
                            >
                                {isEmailVerified ? '완료' : '인증요청'}
                            </button>
                        </div>
                    </div>
                    {error && <p className="text-red-500 text-xs font-bold text-center animate-pulse mt-2">{error}</p>}
                    <button 
                        onClick={handleRegisterSubmit}
                        disabled={isLoading || !signupId}
                        className="w-full py-3.5 bg-yellow-400 text-slate-900 font-bold rounded-xl shadow-[0_0_15px_rgba(250,204,21,0.4)] active:scale-95 transition-all hover:bg-yellow-300 disabled:opacity-50 disabled:shadow-none mt-4"
                    >
                        {isLoading ? 'Creating Account...' : '가입하기 (Join)'}
                    </button>
                </div>
            )}
        </div>

        <button 
          onClick={closeAuthModal}
          className="p-4 w-full text-center text-sm font-bold text-slate-400 hover:text-slate-800 transition-colors border-t border-slate-100 bg-white"
        >
          닫기 (Close)
        </button>
      </div>
    </div>
  );
};
