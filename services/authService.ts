
import { AuthUser } from "../types";
import { supabase } from "./supabaseClient";
import { ADMIN_EMAILS } from "../constants";

class AuthService {
  /**
   * Supabase Auth 유저 정보를 바탕으로 프로필 정보를 가져옵니다.
   * 특정 컬럼이 없어서 발생하는 400 에러를 방지하기 위해 유연하게 대처합니다.
   */
  async fetchMyProfile(): Promise<AuthUser | null> {
    if (!supabase) return null;

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return null;

      const isAdmin = ADMIN_EMAILS.includes(user.email || "");

      // 400 에러 방지: 존재하는 컬럼만 안전하게 가져오기 위해 먼저 전체 조회 시도
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      // 프로필이 없거나 에러가 나더라도 Auth 세션 정보로 최소한의 유저 객체 반환
      return {
        id: user.id,
        loginId: data?.login_id || user.user_metadata?.login_id || '',
        email: user.email || '',
        name: data?.nickname || user.user_metadata?.nickname || user.user_metadata?.full_name || 'Unknown',
        role: (data?.role as 'admin' | 'user') || (isAdmin ? 'admin' : 'user'),
        isEmailVerified: !!user.email_confirmed_at
      };
    } catch (e) {
      console.error("[AuthService] fetchMyProfile failed, returning session defaults:", e);
      return null;
    }
  }

  async signInWithGoogle() {
    if (!supabase) throw new Error("DB 연결 불가");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  }

  async login(idOrEmail: string, pw: string): Promise<AuthUser> {
    if (!supabase) throw new Error("서버 연결 실패");

    let emailToUse = idOrEmail;
    // 아이디 로그인 대응: 이메일이 아닌 경우 profiles에서 이메일 조회
    if (!idOrEmail.includes('@')) {
      const { data } = await supabase
        .from('profiles')
        .select('email')
        .eq('login_id', idOrEmail)
        .maybeSingle();
      if (!data) throw new Error("존재하지 않는 아이디입니다.");
      emailToUse = data.email;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: pw,
    });

    if (error) throw new Error("아이디 또는 비밀번호가 일치하지 않습니다.");
    const profile = await this.fetchMyProfile();
    if (!profile) throw new Error("사용자 정보를 불러올 수 없습니다.");
    return profile;
  }

  async register(data: { loginId: string; email: string; pw: string; nickname: string }): Promise<{needsEmailConfirm: boolean}> {
    if (!supabase) throw new Error("DB 연결 불가");
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.pw,
      options: {
        data: { 
          login_id: data.loginId, 
          nickname: data.nickname 
        }
      }
    });
    if (authError) throw new Error(authError.message);
    return { needsEmailConfirm: !authData.session };
  }

  async logout(): Promise<void> {
    if (supabase) await supabase.auth.signOut();
  }

  async isIdAvailable(loginId: string): Promise<{available: boolean, message: string}> {
    if (!supabase) return { available: true, message: "Offline" };
    try {
      const { data } = await supabase.from('profiles').select('login_id').eq('login_id', loginId).maybeSingle();
      return { available: !data, message: data ? "이미 사용 중인 아이디" : "사용 가능" };
    } catch {
      return { available: true, message: "검증 불가" };
    }
  }

  async isEmailAvailable(email: string): Promise<{available: boolean, message: string}> {
    if (!supabase) return { available: true, message: "Offline" };
    try {
      const { data } = await supabase.from('profiles').select('email').eq('email', email).maybeSingle();
      return { available: !data, message: data ? "이미 가입된 이메일" : "사용 가능" };
    } catch {
      return { available: true, message: "검증 불가" };
    }
  }
}

export const authService = new AuthService();
