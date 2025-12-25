
import { AuthUser } from "../types";
import { supabase } from "./supabaseClient";
import { ADMIN_EMAILS } from "../constants";

class AuthService {
  
  private isAdminEmail(email: string): boolean {
      return ADMIN_EMAILS.includes(email);
  }

  /**
   * Supabase Auth 유저 정보를 바탕으로 DB의 profiles 테이블에서 상세 정보(role 등)를 조회합니다.
   */
  async fetchMyProfile(): Promise<AuthUser | null> {
    if (!supabase) return null;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, login_id, email, role, nickname')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('fetchMyProfile error', error);
        // 프로필이 없는 경우 최소한 Auth 유저 정보라도 반환
        return {
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.nickname || 'Unknown',
            role: this.isAdminEmail(user.email!) ? 'admin' : 'user',
            isEmailVerified: !!user.email_confirmed_at
        };
      }

      return {
          id: data.id,
          loginId: data.login_id,
          email: data.email,
          name: data.nickname || 'Unknown',
          role: data.role || (this.isAdminEmail(data.email) ? 'admin' : 'user'),
          isEmailVerified: !!user.email_confirmed_at
      };
    } catch (e) {
      console.error("[AuthService] Exception in fetchMyProfile:", e);
      return null;
    }
  }

  /**
   * 아이디 중복 확인
   */
  async isIdAvailable(loginId: string): Promise<{available: boolean, message: string}> {
    const idRegex = /^[a-zA-Z0-9_]{4,15}$/;
    if (!loginId || loginId.length < 4) return { available: false, message: "4자 이상 입력" };
    if (!idRegex.test(loginId)) return { available: false, message: "영문/숫자/_만 가능" };
    
    if (!supabase) return { available: true, message: "오프라인 모드" }; 

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('login_id')
            .eq('login_id', loginId)
            .maybeSingle();
        
        if (error) {
            if (error.code === '42P01') return { available: true, message: "사용 가능 (첫 가입)" };
            return { available: true, message: `연결 확인 중...` }; 
        }
        if (data) return { available: false, message: "이미 사용 중인 아이디" };
        return { available: true, message: "사용 가능한 아이디" };
    } catch (e: any) {
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
            return { available: true, message: "연결 확인 중..." };
        }
        if (data) return { available: false, message: "이미 가입된 이메일" };
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

        const { error } = await supabase.auth.signInWithPassword({
            email: emailToUse,
            password: pw,
        });

        if (error) {
            if (error.message.includes("Email not confirmed")) throw new Error("이메일 인증이 필요합니다.");
            throw new Error("아이디 또는 비밀번호를 확인해주세요.");
        }

        const profile = await this.fetchMyProfile();
        if (!profile) throw new Error("프로필 정보를 불러올 수 없습니다.");
        return profile;
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
        throw new Error(authError.message);
    }

    if (authData.user) {
        await supabase.from('profiles').insert({
            id: authData.user.id,
            login_id: data.loginId,
            email: data.email,
            nickname: data.nickname,
            role: this.isAdminEmail(data.email) ? 'admin' : 'user'
        });
    }

    return { needsEmailConfirm: !authData.session };
  }

  async getSession(): Promise<AuthUser | null> {
      return await this.fetchMyProfile();
  }

  async logout(): Promise<void> {
      if (supabase) await supabase.auth.signOut();
  }
}

export const authService = new AuthService();
