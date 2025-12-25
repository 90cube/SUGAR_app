
import { AuthUser } from "../types";
import { supabase } from "./supabaseClient";
import { ADMIN_EMAILS } from "../constants";

class AuthService {
  /**
   * Supabase Auth 유저 정보를 바탕으로 프로필 정보를 가져옵니다.
   * role(admin/user) 정보를 포함하며, DB 500 에러 발생 시 Metadata로 폴백합니다.
   */
  async fetchMyProfile(): Promise<AuthUser | null> {
    if (!supabase) return null;

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return null;

      // 관리자 이메일 목록 확인 (최우선순위/폴백용)
      const isEmailInAdminList = ADMIN_EMAILS.includes(user.email || "");
      const meta = user.user_metadata || {};
      
      // 기본 사용자 객체 구성 (DB 조회 실패 시 사용될 기본값)
      const defaultUser: AuthUser = {
        id: user.id,
        loginId: meta.login_id || '',
        email: user.email || '',
        name: meta.nickname || meta.full_name || user.email?.split('@')[0] || 'Unknown',
        role: isEmailInAdminList ? 'admin' : 'user',
        isEmailVerified: !!user.email_confirmed_at
      };

      try {
        // DB profiles 테이블에서 role 포함 정보 조회
        const { data, error } = await supabase
          .from('profiles')
          .select('login_id, nickname, role')
          .eq('id', user.id)
          .maybeSingle();

        // 500 에러 등 발생 시 세션 정보(이메일 기반 권한)로 즉시 전환
        if (error || !data) {
          if (error) console.warn("[AuthService] Profile fetch failed (500/RLS), using session fallback.");
          return defaultUser;
        }

        return {
          ...defaultUser,
          loginId: data.login_id || defaultUser.loginId,
          name: data.nickname || defaultUser.name,
          // DB에 명시된 role이 있으면 사용, 없으면 이메일 체크 결과 유지
          role: (data.role as 'admin' | 'user') || defaultUser.role
        };
      } catch (dbErr) {
        return defaultUser;
      }
    } catch (e) {
      return null;
    }
  }

  async signInWithGoogle() {
    if (!supabase) throw new Error("DB 연결 불가");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
  }

  async login(idOrEmail: string, pw: string): Promise<AuthUser> {
    if (!supabase) throw new Error("서버 연결 실패");

    let emailToUse = idOrEmail;
    if (!idOrEmail.includes('@')) {
      try {
        const { data } = await supabase.from('profiles').select('email').eq('login_id', idOrEmail).maybeSingle();
        if (data) emailToUse = data.email;
      } catch { }
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
        data: { login_id: data.loginId, nickname: data.nickname }
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
    } catch { return { available: true, message: "검증 불가" }; }
  }

  async isEmailAvailable(email: string): Promise<{available: boolean, message: string}> {
    if (!supabase) return { available: true, message: "Offline" };
    try {
      const { data } = await supabase.from('profiles').select('email').eq('email', email).maybeSingle();
      return { available: !data, message: data ? "이미 가입된 이메일" : "사용 가능" };
    } catch { return { available: true, message: "검증 불가" }; }
  }
}

export const authService = new AuthService();
