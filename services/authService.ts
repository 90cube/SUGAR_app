
import { AuthUser } from "../types";
import { supabase } from "./supabaseClient";
import { ADMIN_EMAILS } from "../constants";

class AuthService {
  
  private isAdminEmail(email: string): boolean {
      return ADMIN_EMAILS.includes(email);
  }

  async login(idOrEmail: string, pw: string): Promise<AuthUser> {
    console.log(`[AuthService] 로그인 시도: ${idOrEmail}`);
    
    if (supabase) {
        let emailToUse = idOrEmail;

        if (!idOrEmail.includes('@')) {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('email')
                .eq('login_id', idOrEmail)
                .single();
            
            if (profileError || !profileData) {
                console.error(`[AuthService] 프로필 조회 실패:`, profileError);
                throw new Error("존재하지 않는 아이디입니다.");
            }
            emailToUse = profileData.email;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: emailToUse,
            password: pw,
        });

        if (error) {
            console.error(`[AuthService] Supabase 로그인 에러:`, error.message);
            if (error.message.includes("Email not confirmed")) {
                throw new Error("이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.");
            }
            if (error.message.includes("Invalid login credentials")) {
                throw new Error("아이디 또는 비밀번호가 일치하지 않습니다.");
            }
            throw new Error(error.message);
        }

        if (data.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            const isHardcodedAdmin = this.isAdminEmail(data.user.email || '');
            const finalRole = (profile?.role === 'admin' || isHardcodedAdmin) ? 'admin' : 'user';

            return {
                id: data.user.id,
                loginId: profile?.login_id || 'N/A',
                email: data.user.email || emailToUse,
                name: profile?.nickname || 'Unknown',
                role: finalRole,
                isEmailVerified: !!data.user.email_confirmed_at
            };
        }
    }
    throw new Error("서버 연결 실패");
  }

  async register(data: { loginId: string; email: string; pw: string; nickname: string; phone: string }): Promise<{needsEmailConfirm: boolean}> {
    console.log(`[AuthService] 회원가입 프로세스 시작: ${data.email}`);
    
    if (supabase) {
        // 1. 아이디 중복 체크 (DB)
        const { data: existingId } = await supabase
            .from('profiles')
            .select('login_id')
            .eq('login_id', data.loginId)
            .maybeSingle();
        
        if (existingId) {
            throw new Error("이미 사용 중인 아이디입니다.");
        }

        // 2. Auth 회원가입 시도
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email,
            password: data.pw,
            options: {
                data: { 
                    login_id: data.loginId,
                    nickname: data.nickname
                },
                emailRedirectTo: window.location.origin 
            }
        });

        if (authError) {
            console.error(`[AuthService] SignUp 에러:`, authError.message);
            
            // 이메일 발송 제한 또는 설정 오류 핸들링
            if (authError.message.includes("Error sending confirmation email")) {
                throw new Error("SUPABASE_EMAIL_LIMIT_REACHED");
            }
            throw new Error(authError.message);
        }

        // 3. 프로필 정보 DB 저장
        if (authData.user) {
            const role = this.isAdminEmail(data.email) ? 'admin' : 'user';
            const { error: insertError } = await supabase.from('profiles').insert({
                id: authData.user.id,
                login_id: data.loginId,
                email: data.email,
                nickname: data.nickname,
                role: role 
            });

            if (insertError) {
                console.error(`[AuthService] 프로필 DB 저장 실패:`, insertError.message);
            }
        }

        // 세션이 없으면 이메일 인증이 필요한 상태
        return { needsEmailConfirm: !authData.session };
    }
    throw new Error("서비스 연결 실패");
  }

  async getSession(): Promise<AuthUser | null> {
      if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
             const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.session.user.id)
                .single();

             const isHardcodedAdmin = this.isAdminEmail(data.session.user.email || '');
             return {
                id: data.session.user.id,
                loginId: profile?.login_id || 'Unknown',
                email: data.session.user.email!,
                name: profile?.nickname || 'Unknown',
                role: (profile?.role === 'admin' || isHardcodedAdmin) ? 'admin' : 'user',
                isEmailVerified: !!data.session.user.email_confirmed_at
             };
          }
      }
      return null;
  }

  async logout(): Promise<void> {
      if (supabase) await supabase.auth.signOut();
  }
}

export const authService = new AuthService();
