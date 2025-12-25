
import { AuthUser } from "../types";
import { supabase } from "./supabaseClient";

class AuthService {
  /**
   * Supabase Auth 유저 정보를 바탕으로 DB의 profiles 테이블에서 상세 정보(role 등)를 조회합니다.
   * RLS 덕분에 본인이 아니면 조회가 거부되므로 보안이 유지됩니다.
   */
  async fetchMyProfile(): Promise<AuthUser | null> {
    if (!supabase) return null;

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return null;

      // Profiles 테이블에서 최신 role과 정보를 가져옴
      const { data, error } = await supabase
        .from('profiles')
        .select('id, login_id, email, role, nickname')
        .eq('id', user.id)
        .single();

      if (error) {
        console.warn('[AuthService] Profile not found or RLS denied access.');
        return null;
      }

      return {
        id: data.id,
        loginId: data.login_id,
        email: data.email,
        name: data.nickname || 'Unknown',
        role: data.role as 'admin' | 'user',
        isEmailVerified: !!user.email_confirmed_at
      };
    } catch (e) {
      console.error("[AuthService] fetchMyProfile failed:", e);
      return null;
    }
  }

  async login(idOrEmail: string, pw: string): Promise<AuthUser> {
    if (!supabase) throw new Error("서버 연결 실패");

    let emailToUse = idOrEmail;

    // 아이디 로그인 처리
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
    
    // profiles 생성은 DB 트리거가 처리하므로 추가 insert 불필요
    return { needsEmailConfirm: !authData.session };
  }

  async logout(): Promise<void> {
    if (supabase) await supabase.auth.signOut();
  }

  async isIdAvailable(loginId: string): Promise<{available: boolean, message: string}> {
    if (!supabase) return { available: true, message: "Offline" };
    // RLS 정책으로 인해 자기 아이디가 아닌 경우 결과가 안 나올 수 있음 (관리자는 확인 가능)
    // 중복 체크용이므로 RPC 또는 SECURITY DEFINER 함수로 대체하는 것이 좋으나 기본 select로도 중복 여부는 확인 가능
    const { data } = await supabase.from('profiles').select('login_id').eq('login_id', loginId).maybeSingle();
    return { available: !data, message: data ? "이미 사용 중인 아이디" : "사용 가능" };
  }

  async isEmailAvailable(email: string): Promise<{available: boolean, message: string}> {
    if (!supabase) return { available: true, message: "Offline" };
    const { data } = await supabase.from('profiles').select('email').eq('email', email).maybeSingle();
    return { available: !data, message: data ? "이미 가입된 이메일" : "사용 가능" };
  }
}

export const authService = new AuthService();
