
import { AuthUser } from "../types";
import { supabase } from "./supabaseClient";

class AuthService {
  /**
   * 본인 정보 조회 및 세션 동기화
   * DB 조회 실패 시에도 세션이 유효하면 'user' 권한으로 Fallback 처리하여 로그인이 튕기는 것을 방지합니다.
   */
  async fetchMyProfile(): Promise<AuthUser | null> {
    if (!supabase) return null;

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return null;
      }

      const user = session.user;
      const meta = user.user_metadata || {};

      // DB 조회 시도 (public_profiles)
      const { data: dbData, error: dbError } = await supabase
        .from('public_profiles')
        .select('nickname, role') 
        .eq('id', user.id)
        .single();

      // DB 데이터가 없거나 에러가 나더라도 세션 기반으로 기본 사용자 정보 반환 (Fallback)
      if (dbError || !dbData) {
        console.warn('[AuthService] DB Profile sync failed. Using session fallback.', dbError?.message);
        return {
          id: user.id,
          loginId: meta.login_id || '',
          email: user.email || '',
          name: meta.nickname || user.email?.split('@')[0] || 'Unknown Subject',
          role: 'user', // 기본 권한 부여
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
      console.error('[AuthService] fetchMyProfile Exception:', e);
      return null;
    }
  }

  async signInWithGoogle() {
    if (!supabase) throw new Error("DB 연결 불가");
    
    // 환경변수 VITE_SITE_URL 우선 사용, 없으면 현재 origin 사용
    // Safe access to environment variables
    const metaEnv = (import.meta as any).env;
    const processEnv = (window as any).process?.env || (typeof process !== 'undefined' ? process.env : null);
    const redirectTo = metaEnv?.VITE_SITE_URL || processEnv?.VITE_SITE_URL || window.location.origin;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });
    if (error) throw error;
  }

  async login(idOrEmail: string, pw: string): Promise<AuthUser> {
    if (!supabase) throw new Error("서버 연결 실패");

    const { error } = await supabase.auth.signInWithPassword({
      email: idOrEmail,
      password: pw,
    });

    if (error) throw new Error("아이디 또는 비밀번호가 일치하지 않습니다.");
    
    const profile = await this.fetchMyProfile();
    if (!profile) throw new Error("인증 성공 후 프로필 로딩 실패");
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
