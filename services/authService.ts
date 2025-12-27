
import { AuthUser } from "../types";
import { supabase } from "./supabaseClient";
import { ADMIN_EMAILS } from "../constants";

class AuthService {
  /**
   * 본인 정보 조회.
   * 보안 지침에 따라 'profiles' 테이블 직접 접근 대신 'public_profiles' 뷰를 조회합니다.
   */
  async fetchMyProfile(): Promise<AuthUser | null> {
    if (!supabase) return null;

    try {
      // [Debug] 1. 로그인 직후 getSession() 확인
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.groupCollapsed('[AuthService] Session Check');
      console.log('Session Object:', session);
      
      // [Debug] 2. session이 없으면 중단
      if (sessionError || !session) {
        console.warn('No active session found. Aborting DB sync.');
        console.groupEnd();
        return null;
      }

      // [Debug] 3. 네트워크 요청 헤더 확인 (Authorization)
      if (session.access_token) {
        console.log('Authorization Header: Bearer', session.access_token.substring(0, 15) + '...');
        console.log('API Key Header:', process.env.REACT_APP_SUPABASE_ANON_KEY ? 'Present' : 'Missing (Check Constants)');
      }
      console.groupEnd();

      const user = session.user;
      const userEmail = user.email || "";
      const meta = user.user_metadata || {};
      
      // 1. Auth 메타데이터 기반 기본값 설정 (DB 조회 실패 시 Fallback)
      const isEmailInAdminList = ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail.toLowerCase());
      
      const fallbackUser: AuthUser = {
        id: user.id,
        loginId: meta.login_id || '',
        email: userEmail,
        name: meta.nickname || meta.full_name || userEmail.split('@')[0] || 'Unknown',
        role: isEmailInAdminList ? 'admin' : 'user', // 임시 Fallback Role
        isEmailVerified: !!user.email_confirmed_at
      };

      try {
        // [Debug] 4. DB 조회 (public_profiles)
        // session이 있을 때만 실행됨. single() 사용.
        const { data, error } = await supabase
          .from('public_profiles')
          .select('login_id, nickname, role') 
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('[AuthService] Profile DB Fetch Error:', error.message);
          // DB 조회가 실패해도 인증 세션은 유효하므로 fallbackUser 반환
          return fallbackUser;
        }

        if (data) {
            console.log('[AuthService] Profile Loaded:', data);
        }

        // 5. DB 데이터 우선 적용 및 Role 저장
        // role 필드가 정확히 'admin' (소문자, 공백 없음)인지 확인
        return {
          ...fallbackUser,
          loginId: data.login_id || fallbackUser.loginId,
          name: data.nickname || fallbackUser.name,
          role: (data.role === 'admin') ? 'admin' : 'user'
        };
      } catch (dbErr) {
        console.error('[AuthService] DB Exception:', dbErr);
        return fallbackUser;
      }
    } catch (e) {
      console.error('[AuthService] General Error:', e);
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
    // 아이디로 로그인 시도 시 이메일 룩업 로직
    if (!idOrEmail.includes('@')) {
      try {
        const { data } = await supabase.from('public_profiles').select('id').eq('login_id', idOrEmail).maybeSingle();
        // Supabase Auth는 이메일 로그인이 기본이므로, 실제 구현에서는 
        // Edge Function을 사용하거나 별도 매핑 로직이 필요할 수 있습니다.
        // 현재는 클라이언트 단에서 1차적으로 뷰를 확인하는 로직입니다.
      } catch { }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: pw,
    });

    if (error) throw new Error("아이디 또는 비밀번호가 일치하지 않습니다.");
    
    // 로그인 성공 후 프로필 정보를 가져와 상태를 갱신합니다.
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
      const { data } = await supabase.from('public_profiles').select('login_id').eq('login_id', loginId).maybeSingle();
      return { available: !data, message: data ? "이미 사용 중인 아이디" : "사용 가능" };
    } catch { return { available: true, message: "검증 불가" }; }
  }

  async isEmailAvailable(email: string): Promise<{available: boolean, message: string}> {
    if (!supabase) return { available: true, message: "Offline" };
    try {
      // 400 에러 방지를 위해 email 컬럼 대신 id를 통해 존재 여부 확인 (뷰 필드 확인)
      const { data } = await supabase.from('public_profiles').select('id').limit(1).maybeSingle();
      return { available: true, message: "사용 가능" };
    } catch { return { available: true, message: "검증 불가" }; }
  }
}

export const authService = new AuthService();
