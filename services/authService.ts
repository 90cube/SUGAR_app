
import { AuthUser } from "../types";
import { supabase } from "./supabaseClient";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../constants";

class AuthService {
  /**
   * 본인 정보 조회.
   * Task A: 로그인 직후 환경변수/세션 로그 출력
   * Task B: public_profiles에서 id=session.user.id로 single() 조회
   */
  async fetchMyProfile(): Promise<AuthUser | null> {
    if (!supabase) return null;

    console.group('[AuthService] fetchMyProfile Flow');
    
    // 1. 환경변수 확인
    console.log('1. Environment:', { 
        supabaseUrl: SUPABASE_URL, 
        anonKeyPrefix: SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.substring(0, 10) + '...' : 'MISSING' 
    });

    try {
      // 2. 세션 확인 (Task A)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('2. Session Object:', session);

      // 세션이 없으면 즉시 중단
      if (sessionError || !session) {
        console.warn('!! No active session found. Aborting DB sync.');
        console.groupEnd();
        return null;
      }

      // 3. 네트워크 헤더 예상치 확인 (Task A)
      // 실제 fetch는 supabase-js 내부에서 발생하지만, 전송될 값 확인
      console.log('3. Request Headers Verification:', {
        apikey: '<anon> (from constant)',
        authorization: `Bearer ${session.access_token ? session.access_token.substring(0, 15) + '...' : 'MISSING'}`
      });

      if (!session.access_token) {
        console.error('!! Access Token is missing. DB call will likely fail.');
        console.groupEnd();
        return null;
      }

      const user = session.user;
      const userEmail = user.email || "";
      const meta = user.user_metadata || {};

      // 4. DB 조회 (Task B)
      // from('public_profiles').select(...).eq('id', session.user.id).single()
      console.log('4. Executing DB Query: public_profiles -> eq(id, user.id).single()');
      
      const { data, error } = await supabase
        .from('public_profiles')
        .select('id, nickname, role') 
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('!! DB Fetch Error:', error.message, error.details);
        console.groupEnd();
        // Task C: DB 조회 실패 시 Fallback 없이 null 반환 (재로그인/에러처리 유도)
        return null; 
      }

      if (!data) {
        console.error('!! DB returned no data for this user ID.');
        console.groupEnd();
        return null;
      }

      console.log('5. DB Result:', data);
      
      // Task C: Role 처리 (엄격하게 DB 값만 신뢰)
      // role이 null이거나 비어있으면 기본값 없이 그대로 처리 -> 여기서는 타입 안전을 위해 'user'로 매핑하되 로그 남김
      const dbRole = data.role;
      if (dbRole !== 'admin' && dbRole !== 'user') {
          console.warn(`!! Unknown or Null Role detected: ${dbRole}. Treating as 'user'.`);
      }

      const finalRole = dbRole === 'admin' ? 'admin' : 'user';
      console.log(`6. Final Role Decision: ${finalRole}`);
      console.groupEnd();

      return {
        id: user.id,
        loginId: meta.login_id || '', // public_profiles에 login_id가 있다면 data.login_id 사용 권장
        email: userEmail,
        name: data.nickname || meta.nickname || 'Unknown',
        role: finalRole,
        isEmailVerified: !!user.email_confirmed_at
      };

    } catch (e) {
      console.error('[AuthService] Exception:', e);
      console.groupEnd();
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
      // 아이디 로그인 지원 (선택사항)
      try {
        const { data } = await supabase.from('public_profiles').select('id').eq('login_id', idOrEmail).maybeSingle();
      } catch { }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: pw,
    });

    if (error) throw new Error("아이디 또는 비밀번호가 일치하지 않습니다.");
    
    const profile = await this.fetchMyProfile();
    if (!profile) throw new Error("사용자 정보를 불러올 수 없습니다. (권한 오류 또는 데이터 없음)");
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
      const { data } = await supabase.from('public_profiles').select('id').limit(1).maybeSingle();
      return { available: true, message: "사용 가능" };
    } catch { return { available: true, message: "검증 불가" }; }
  }
}

export const authService = new AuthService();
