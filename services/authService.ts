
import { AuthUser } from "../types";
import { supabase } from "./supabaseClient";

class AuthService {
  async fetchMyProfile(): Promise<AuthUser | null> {
    if (!supabase) return null;

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) return null;

      const user = session.user;
      const meta = user.user_metadata || {};

      // 지침: profiles 대신 public_profiles 사용
      const { data: dbData, error: dbError } = await supabase
        .from('public_profiles')
        .select('nickname, role') 
        .eq('id', user.id)
        .single();

      if (dbError || !dbData) {
        return {
          id: user.id,
          loginId: meta.login_id || '',
          email: user.email || '',
          name: meta.nickname || user.email?.split('@')[0] || 'Unknown Subject',
          role: 'user',
          isEmailVerified: !!user.email_confirmed_at
        };
      }

      return {
        id: user.id,
        loginId: meta.login_id || '',
        email: user.email || '',
        name: dbData.nickname || meta.nickname || 'Unknown',
        role: dbData.role === 'admin' ? 'admin' : 'user',
        isEmailVerified: !!user.email_confirmed_at
      };
    } catch (e) {
      return null;
    }
  }

  async signInWithGoogle() {
    if (!supabase) {
      throw new Error("Supabase 클라이언트가 초기화되지 않았습니다.");
    }
    
    const redirectTo = window.location.origin;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });
    
    if (error) throw error;
  }

  async login(idOrEmail: string, pw: string): Promise<AuthUser> {
    if (!supabase) throw new Error("서버 연결 실패 (Supabase 미설정)");

    const { error } = await supabase.auth.signInWithPassword({
      email: idOrEmail,
      password: pw,
    });

    if (error) throw new Error("아이디 또는 비밀번호가 일치하지 않습니다.");
    
    const profile = await this.fetchMyProfile();
    if (!profile) throw new Error("프로필 정보를 불러올 수 없습니다.");
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
      const { data } = await supabase.from('public_profiles').select('login_id').eq('login_id', loginId).maybeSingle();
      return { available: !data, message: data ? "이미 사용 중인 아이디" : "사용 가능" };
    } catch { return { available: true, message: "검증 불가" }; }
  }

  async isEmailAvailable(email: string): Promise<{available: boolean, message: string}> {
    return { available: true, message: "사용 가능" };
  }
}

export const authService = new AuthService();
