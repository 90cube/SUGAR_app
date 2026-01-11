
import { AuthUser } from "../types";
import { supabase } from "./supabaseClient";

class AuthService {
  // 관리자 사칭 방지 키워드 목록
  private RESERVED_KEYWORDS = [
    'admin', 'administrator', 'manager', 'operator', 'gm', 'system', 'root', 'cube',
    '운영자', '관리자', '매니저'
  ];

  /**
   * 닉네임 유효성 검사 (사칭 방지 포함)
   * 일반 유저가 예약어를 포함하면 false 반환
   */
  private checkReservedNickname(nickname: string, isAdmin: boolean): boolean {
    if (isAdmin) return true; // 관리자는 제한 없음
    
    const lower = nickname.toLowerCase();
    // 예약어가 포함되어 있는지 검사
    const isReserved = this.RESERVED_KEYWORDS.some(keyword => lower.includes(keyword));
    return !isReserved;
  }

  async fetchMyProfile(): Promise<AuthUser | null> {
    if (!supabase) return null;

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) return null;

      const user = session.user;
      const meta = user.user_metadata || {};

      // 일반적인 프로필 조회는 기존대로 View 사용
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

    // 회원가입 시 닉네임 사칭 검사 (가입 시점엔 무조건 일반 유저 취급)
    if (!this.checkReservedNickname(data.nickname, false)) {
        throw new Error("이미 사용 중인 닉네임입니다. (관리자 사칭 불가)");
    }

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

  async updateNickname(newNickname: string): Promise<void> {
    if (!supabase) throw new Error("서버 연결 실패");
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다.");

    // 1. 유효성 검사
    const nickRegex = /^[a-zA-Z0-9가-힣]{2,10}$/;
    if (!nickRegex.test(newNickname)) {
      throw new Error("닉네임은 2~10자의 한글, 영문, 숫자만 가능합니다.");
    }

    // 2. 현재 프로필 정보 조회 (권한 확인 및 24시간 체크용)
    const { data: profile, error: fetchError } = await supabase
        .from('profiles') 
        .select('last_nickname_update, nickname, role')
        .eq('id', user.id)
        .single();

    if (fetchError || !profile) throw new Error("프로필 정보를 불러올 수 없습니다.");

    // 3. 사칭 방지 검사 (Admin 권한이 있으면 통과)
    const isAdmin = profile.role === 'admin';
    if (!this.checkReservedNickname(newNickname, isAdmin)) {
        // 보안상 이유로 예약어 사용 시에도 "이미 사용 중" 메시지 출력
        throw new Error("이미 사용 중인 닉네임입니다. (관리자 사칭 불가)");
    }

    // 4. 24시간 제한 체크
    if (profile.last_nickname_update) {
        const lastUpdate = new Date(profile.last_nickname_update);
        const now = new Date();
        const diffMs = now.getTime() - lastUpdate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours < 24) {
            const remainingHours = Math.ceil(24 - diffHours);
            throw new Error(`닉네임은 하루에 한 번만 변경 가능합니다. (약 ${remainingHours}시간 남음)`);
        }
    }

    // 5. 중복 검사 (자신의 현재 닉네임과 같다면 패스)
    if (profile.nickname !== newNickname) {
        const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('nickname', newNickname)
            .maybeSingle();
        
        if (existing) throw new Error("이미 사용 중인 닉네임입니다.");
    } else {
        throw new Error("현재 닉네임과 동일합니다.");
    }

    // 6. 업데이트 실행
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
            nickname: newNickname,
            last_nickname_update: new Date().toISOString()
        })
        .eq('id', user.id);

    if (updateError) {
        // SQL Constraint 위반 시 여기서도 잡힘 (메시지 통일)
        if (updateError.message.includes('check_nickname_blacklist')) {
             throw new Error("이미 사용 중인 닉네임입니다. (관리자 사칭 불가)");
        }
        throw new Error("닉네임 변경 중 오류가 발생했습니다.");
    }

    // 7. Supabase Auth 메타데이터도 업데이트
    await supabase.auth.updateUser({
        data: { nickname: newNickname }
    });
  }
}

export const authService = new AuthService();
