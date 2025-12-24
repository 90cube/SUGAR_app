
import React, { useState, useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { UI_STRINGS, GOOGLE_CLIENT_ID } from '../constants';
import { authService } from '../services/authService';

type AuthMode = 'LOGIN' | 'SIGNUP';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, handleGoogleLoginSuccess, login, register } = useApp();
  
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPw, setLoginPw] = useState('');

  // Signup Form State
  const [signupEmail, setSignupEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [demoEmailCodeDisplay, setDemoEmailCodeDisplay] = useState(''); // To show the user the mock code
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const [signupPw, setSignupPw] = useState('');
  const [signupPwConfirm, setSignupPwConfirm] = useState('');

  const [signupPhone, setSignupPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [demoPhoneCodeDisplay, setDemoPhoneCodeDisplay] = useState(''); // To show the user the mock code
  const [isPhoneSent, setIsPhoneSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  const [signupNickname, setSignupNickname] = useState('');

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
    setLoginEmail(''); setLoginPw('');
    setSignupEmail(''); setEmailCode(''); setDemoEmailCodeDisplay(''); setIsEmailSent(false); setIsEmailVerified(false);
    setSignupPw(''); setSignupPwConfirm('');
    setSignupPhone(''); setPhoneCode(''); setDemoPhoneCodeDisplay(''); setIsPhoneSent(false); setIsPhoneVerified(false);
    setSignupNickname('');
    setIsLoading(false);
  };

  // Initialize Google Button
  useEffect(() => {
    if (window.google && isAuthModalOpen && mode === 'LOGIN') {
      try {
          // Only attempt if Client ID is configured, otherwise skip to prevent console errors
          if (GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.includes("YOUR_GOOGLE_CLIENT_ID")) {
              window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: (response: any) => {
                    if (response.credential) {
                        handleGoogleLoginSuccess(response.credential);
                    }
                }
              });
              
              const buttonDiv = document.getElementById("googleSignInDiv");
              if (buttonDiv) {
                  window.google.accounts.id.renderButton(
                    buttonDiv,
                    { theme: "outline", size: "large", width: "100%", text: "continue_with" }
                  );
              }
          }
      } catch (e) {
          console.error("GSI Initialization Error", e);
      }
    }
  }, [isAuthModalOpen, handleGoogleLoginSuccess, mode]);

  // --- Handlers: Login ---

  const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError('');
      try {
          await login(loginEmail, loginPw);
      } catch (err: any) {
          setError(err.message || 'Login failed');
      } finally {
          setIsLoading(false);
      }
  };

  // Auto-fill dev account helper
  const fillDevAccount = () => {
      setLoginEmail('sugar');
      setLoginPw('attack');
  };

  // --- Handlers: Email Verification ---

  const requestEmailCode = async () => {
      if (!signupEmail) return;
      setIsLoading(true);
      try {
          const code = await authService.sendEmailVerification(signupEmail);
          setDemoEmailCodeDisplay(code); // Show code for demo
          setIsEmailSent(true);
          setError('');
      } catch (e: any) {
          setError(e.message);
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
              setDemoEmailCodeDisplay(''); // Hide hint
              setError('');
          } else {
              setError("인증번호가 올바르지 않습니다.");
          }
      } catch (e: any) {
          setError(e.message);
      } finally {
          setIsLoading(false);
      }
  };

  // --- Handlers: Phone Verification ---

  const requestPhoneCode = async () => {
      if (!signupPhone) return;
      setIsLoading(true);
      try {
          const code = await authService.sendPhoneVerification(signupPhone);
          setDemoPhoneCodeDisplay(code); // Show code for demo
          setIsPhoneSent(true);
          setError('');
      } catch (e: any) {
          setError(e.message);
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
              setDemoPhoneCodeDisplay(''); // Hide hint
              setError('');
          } else {
              setError("인증번호가 올바르지 않습니다.");
          }
      } catch (e: any) {
          setError(e.message);
      } finally {
          setIsLoading(false);
      }
  };

  // --- Handlers: Register Submit ---

  const handleRegisterSubmit = async () => {
      if (!isEmailVerified || !isPhoneVerified) {
          setError("이메일과 휴대전화 인증을 완료해주세요.");
          return;
      }
      if (signupPw !== signupPwConfirm) {
          setError("비밀번호가 일치하지 않습니다.");
          return;
      }
      if (!signupNickname) {
          setError("닉네임을 입력해주세요.");
          return;
      }

      setIsLoading(true);
      try {
          await register({
              email: signupEmail,
              pw: signupPw,
              nickname: signupNickname,
              phone: signupPhone
          });
          // Register calls setAuthUser/setIsLoggedIn inside AppContext context
      } catch (e: any) {
          setError(e.message);
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
                    
                    {/* Google Button Container */}
                    <div className="w-full h-12 flex justify-center items-center">
                        <div id="googleSignInDiv" className="w-full">
                            {/* If Client ID is missing, show placeholder/warning */}
                            {(!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes("YOUR_GOOGLE_CLIENT_ID")) && (
                                <div className="w-full h-full border border-slate-200 rounded-md flex items-center justify-center bg-slate-50 text-slate-400 text-xs font-bold">
                                    Google Login Not Configured
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                        <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-slate-400 font-medium">or login with Email</span></div>
                    </div>

                    <form onSubmit={handleLoginSubmit} className="space-y-3">
                        <input 
                            type="text" 
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            placeholder="Email (ID)"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
                        />
                        <input 
                            type="password" 
                            value={loginPw}
                            onChange={(e) => setLoginPw(e.target.value)}
                            placeholder="Password"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
                        />
                        
                        {error && <p className="text-red-500 text-xs font-bold text-center animate-pulse">{error}</p>}
                        
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all hover:bg-slate-800 disabled:opacity-50"
                        >
                            {isLoading ? 'Processing...' : 'Sign In'}
                        </button>
                    </form>

                    {/* DEV LOGIN SHORTCUT */}
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200/60 rounded-xl text-xs text-yellow-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🚧</span>
                            <span className="font-bold">개발/테스트용 계정 안내</span>
                        </div>
                        <p className="mb-3 opacity-90 leading-relaxed">
                            구글 로그인을 설정하기 어려운 개발 환경(AI Studio 등)에서는 아래 마스터 계정을 사용하세요.
                        </p>
                        <div className="flex items-center justify-between bg-white/60 p-2.5 rounded-lg border border-yellow-200">
                             <div className="font-mono text-slate-600 flex gap-3">
                                 <span>ID: <strong className="text-slate-900">sugar</strong></span>
                                 <span>PW: <strong className="text-slate-900">attack</strong></span>
                             </div>
                             <button 
                                onClick={fillDevAccount}
                                className="px-2 py-1 bg-yellow-400 hover:bg-yellow-300 text-slate-900 text-[10px] font-bold rounded shadow-sm active:scale-95 transition-all"
                             >
                                자동입력
                             </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SIGNUP FORM */}
            {mode === 'SIGNUP' && (
                <div className="space-y-4 animate-in slide-in-from-left duration-300">
                    
                    {/* 1. Email Verification */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">1. 이메일 인증 (Email)</label>
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
                        {isEmailSent && !isEmailVerified && (
                             <div className="animate-in fade-in space-y-2">
                                 <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={emailCode}
                                        onChange={(e) => setEmailCode(e.target.value)}
                                        placeholder="인증코드 6자리"
                                        className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={verifyEmail}
                                        className="px-3 bg-blue-600 text-white text-xs font-bold rounded-xl"
                                    >
                                        확인
                                    </button>
                                 </div>
                                 <p className="text-xs text-blue-600 font-medium ml-1 bg-blue-50 p-2 rounded-lg border border-blue-100">
                                     [테스트 모드] 인증번호: <span className="font-bold select-all">{demoEmailCodeDisplay}</span>
                                 </p>
                             </div>
                        )}
                    </div>

                    {/* 2. Password */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">2. 비밀번호 (Password)</label>
                        <input 
                            type="password" 
                            value={signupPw}
                            onChange={(e) => setSignupPw(e.target.value)}
                            placeholder="비밀번호 (4자 이상)"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                        />
                        <input 
                            type="password" 
                            value={signupPwConfirm}
                            onChange={(e) => setSignupPwConfirm(e.target.value)}
                            placeholder="비밀번호 확인"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                        />
                    </div>

                    {/* 3. Phone Verification */}
                    <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase">3. 휴대전화 본인인증 (Phone)</label>
                         <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={signupPhone} 
                                onChange={(e) => setSignupPhone(e.target.value)} 
                                placeholder="010-1234-5678" 
                                disabled={isPhoneVerified}
                                className={`flex-1 p-3 bg-slate-50 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 ${isPhoneVerified ? 'border-green-400 text-green-700 bg-green-50' : 'border-slate-200'}`}
                            />
                            <button 
                                type="button" 
                                onClick={requestPhoneCode}
                                disabled={isPhoneVerified || isLoading || !signupPhone}
                                className="px-3 bg-slate-900 text-white text-xs font-bold rounded-xl disabled:opacity-50 whitespace-nowrap"
                            >
                                {isPhoneVerified ? '완료' : '전송'}
                            </button>
                        </div>
                         {isPhoneSent && !isPhoneVerified && (
                             <div className="animate-in fade-in space-y-2">
                                 <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={phoneCode}
                                        onChange={(e) => setPhoneCode(e.target.value)}
                                        placeholder="인증번호 6자리"
                                        className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={verifyPhone}
                                        className="px-3 bg-blue-600 text-white text-xs font-bold rounded-xl"
                                    >
                                        확인
                                    </button>
                                 </div>
                                 <p className="text-xs text-blue-600 font-medium ml-1 bg-blue-50 p-2 rounded-lg border border-blue-100">
                                     [테스트 모드] 인증번호: <span className="font-bold select-all">{demoPhoneCodeDisplay}</span>
                                 </p>
                             </div>
                        )}
                    </div>

                    {/* 4. Nickname */}
                    <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase">4. 닉네임 (Nickname)</label>
                         <input 
                            type="text" 
                            value={signupNickname} 
                            onChange={(e) => setSignupNickname(e.target.value)} 
                            placeholder="커뮤니티 활동명" 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                        />
                    </div>
                    
                    {error && <p className="text-red-500 text-xs font-bold text-center animate-pulse">{error}</p>}

                    <button 
                        onClick={handleRegisterSubmit}
                        disabled={isLoading || !isEmailVerified || !isPhoneVerified}
                        className="w-full py-3.5 bg-yellow-400 text-slate-900 font-bold rounded-xl shadow-[0_0_15px_rgba(250,204,21,0.4)] active:scale-95 transition-all hover:bg-yellow-300 disabled:opacity-50 disabled:shadow-none mt-2"
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
