
import { AuthUser } from "../types";
import { supabase } from "./supabaseClient";
import { ADMIN_EMAILS } from "../constants";

class AuthService {
  /**
   * 본인 정보 조회 시에만 profiles 테이블을 직접 조회합니다 (RLS 허용됨).
   */
  async fetchMyProfile(): Promise<AuthUser | null> {
    if (!supabase) return null;

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return null;

      const userEmail = user.email || "";
      const isEmailInAdminList = ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail.toLowerCase());
      const meta = user.user_metadata || {};
      
      const fallbackUser: AuthUser = {
        id: user.id,
        loginId: meta.login_id || '',
        email: userEmail,
        name: meta.nickname || meta.full_name || userEmail.split('@')[0] || 'Unknown',
        role: isEmailInAdminList ? 'admin' : 'user',
        isEmailVerified: !!user.email_confirmed_at
      };

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('login_id, nickname, role')
          .eq('id', user.id)
          .maybeSingle();

        if (error || !data) {
          return fallbackUser;
        }

        return {
          ...fallbackUser,
          loginId: data.login_id || fallbackUser.loginId,
          name: data.nickname || fallbackUser.name,
          role: (data.role as 'admin' | 'user') || fallbackUser.role
        };
      } catch (dbErr) {
        return fallbackUser;
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
        // ID 조희 시에도 public_profiles 뷰 사용 권장 (하지만 본인 확인 로직상 profiles 접근 가능)
        const { data } = await supabase.from('public_profiles').select('email').eq('login_id', idOrEmail).maybeSingle();
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
    if (supabase) await supabase.signOut();
  }

  async isIdAvailable(loginId: string): Promise<{available: boolean, message: string}> {
    if (!supabase) return { available: true, message: "Offline" };
    try {
      // public_profiles 뷰 사용
      const { data } = await supabase.from('public_profiles').select('login_id').eq('login_id', loginId).maybeSingle();
      return { available: !data, message: data ? "이미 사용 중인 아이디" : "사용 가능" };
    } catch { return { available: true, message: "검증 불가" }; }
  }

  async isEmailAvailable(email: string): Promise<{available: boolean, message: string}> {
    if (!supabase) return { available: true, message: "Offline" };
    try {
      // public_profiles 뷰 사용
      const { data } = await supabase.from('public_profiles').select('email').eq('email', email).maybeSingle();
      return { available: !data, message: data ? "이미 가입된 이메일" : "사용 가능" };
    } catch { return { available: true, message: "검증 불가" }; }
  }
}

export const authService = new AuthService();
