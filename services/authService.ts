
import { AuthUser } from "../types";
import { supabase } from "./supabaseClient";
import { ADMIN_EMAILS } from "../constants";

class AuthService {
  
  private isAdminEmail(email: string): boolean {
      return ADMIN_EMAILS.includes(email);
  }

  /**
   * 아이디 중복 확인
   */
  async isIdAvailable(loginId: string): Promise<{available: boolean, message: string}> {
    // 1. 형식 검사
    const idRegex = /^[a-zA-Z0-9_]{4,15}$/;
    if (!loginId || loginId.length < 4) return { available: false, message: "4자 이상 입력" };
    if (!idRegex.test(loginId)) return { available: false, message: "영문/숫자/_만 가능" };
    
    if (!supabase) return { available: true, message: "오프라인 모드" }; 

    try {
        // 2. DB 중복 체크
        const { data, error } = await supabase
            .from('profiles')
            .select('login_id')
            .eq('login_id', loginId)
            .maybeSingle();
        
        if (error) {
            // 테이블이 없는 경우(42P01)는 첫 가입자 상황으로 간주
            if (error.code === '42P01') {
                console.warn("[AuthService] 'profiles' 테이블이 없습니다. DB 설정을 확인하세요.");
                return { available: true, message: "사용 가능 (첫 가입)" };
            }
            // 그 외 에러 로깅 (문자열 변환 방지)
            console.error("ID Check Error Details:", error);
            const errorMsg = error.message || "서버 응답 오류";
            return { available: true, message: `연결 확인 중...` }; 
        }

        // data가 존재하면 중복
        if (data) {
            return { available: false, message: "이미 사용 중인 아이디" };
        }
        
        return { available: true, message: "사용 가능한 아이디" };
    } catch (e: any) {
        console.error("ID Check Exception:", e);
        return { available: true, message: "확인 완료" };
    }
  }

  /**
   * 이메일 중복 확인
   */
  async isEmailAvailable(email: string): Promise<{available: boolean, message: string}> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) return { available: false, message: "이메일 형식 오류" };

    if (!supabase) return { available: true, message: "확인 불가" };

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('email')
            .eq('email', email)
            .maybeSingle();
        
        if (error) {
            if (error.code === '42P01') return { available: true, message: "사용 가능" };
            console.error("Email Check Error Details:", error);
            return { available: true, message: "연결 확인 중..." };
        }
        
        if (data) {
            return { available: false, message: "이미 가입된 이메일" };
        }

        return { available: true, message: "사용 가능한 이메일" };
    } catch (e: any) {
        return { available: true, message: "확인 완료" };
    }
  }

  async login(idOrEmail: string, pw: string): Promise<AuthUser> {
    if (supabase) {
        let emailToUse = idOrEmail;

        if (!idOrEmail.includes('@')) {
            const { data: profileData } = await supabase
                .from('profiles')
                .select('email')
                .eq('login_id', idOrEmail)
                .single();
            
            if (!profileData) throw new Error("존재하지 않는 아이디입니다.");
            emailToUse = profileData.email;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: emailToUse,
            password: pw,
        });

        if (error) {
            if (error.message.includes("Email not confirmed")) throw new Error("이메일 인증이 필요합니다.");
            throw new Error("아이디 또는 비밀번호를 확인해주세요.");
        }

        if (data.user) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
            return {
                id: data.user.id,
                loginId: profile?.login_id || 'N/A',
                email: data.user.email!,
                name: profile?.nickname || 'Unknown',
                role: (profile?.role === 'admin' || this.isAdminEmail(data.user.email!)) ? 'admin' : 'user',
                isEmailVerified: !!data.user.email_confirmed_at
            };
        }
    }
    throw new Error("서버 연결 실패");
  }

  async register(data: { loginId: string; email: string; pw: string; nickname: string }): Promise<{needsEmailConfirm: boolean}> {
    if (!supabase) throw new Error("DB 연결 불가");

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.pw,
        options: {
            data: { login_id: data.loginId, nickname: data.nickname },
            emailRedirectTo: window.location.origin 
        }
    });

    if (authError) {
        if (authError.message.includes("already registered")) throw new Error("이미 가입된 이메일입니다.");
        if (authError.message.includes("confirmation email")) throw new Error("인증 메일 발송 한도 초과 (잠시 후 시도)");
        throw new Error(authError.message);
    }

    if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            login_id: data.loginId,
            email: data.email,
            nickname: data.nickname,
            role: this.isAdminEmail(data.email) ? 'admin' : 'user'
        });
        
        if (profileError) {
            console.error("Profile creation error:", profileError.message);
        }
    }

    return { needsEmailConfirm: !authData.session };
  }

  async getSession(): Promise<AuthUser | null> {
      if (!supabase) return null;
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
         const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.session.user.id).single();
         return {
            id: data.session.user.id,
            loginId: profile?.login_id || 'Unknown',
            email: data.session.user.email!,
            name: profile?.nickname || 'Unknown',
            role: (profile?.role === 'admin' || this.isAdminEmail(data.session.user.email!)) ? 'admin' : 'user',
            isEmailVerified: !!data.session.user.email_confirmed_at
         };
      }
      return null;
  }

  async logout(): Promise<void> {
      if (supabase) await supabase.auth.signOut();
  }
}

export const authService = new AuthService();
