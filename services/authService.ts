
import { AuthUser } from "../types";
import { supabase } from "./supabaseClient";
import { ADMIN_EMAILS } from "../constants";

// --- Mock Data (Fallback & Dev Backdoor) ---
const USERS_DB: AuthUser[] = [];

class AuthService {
  
  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --- Verification Flow (Simulation for UI) ---
  async sendEmailVerification(email: string): Promise<string> {
    await this.delay(800);
    const code = "123456";
    console.log(`[AuthService] Email Verification Code for ${email}: ${code}`);
    return code; 
  }

  async verifyEmailCode(email: string, code: string): Promise<boolean> {
    await this.delay(500);
    return code === "123456"; 
  }

  async sendPhoneVerification(phone: string): Promise<string> {
    await this.delay(800);
    const code = "123456";
    console.log(`[AuthService] Phone Verification Code for ${phone}: ${code}`);
    return code;
  }

  async verifyPhoneCode(phone: string, code: string): Promise<boolean> {
    await this.delay(500);
    return code === "123456";
  }

  // --- Auth Flow ---

  private isAdminEmail(email: string): boolean {
      return ADMIN_EMAILS.includes(email);
  }

  async login(idOrEmail: string, pw: string): Promise<AuthUser> {
    
    // 1. Dev Backdoor (Master Account)
    if (idOrEmail === 'sugar' && (pw === 'attack' || pw === 'attack@@')) {
       // Try to get a real session if possible
       if (supabase) {
           try {
               await supabase.auth.signInWithPassword({
                   email: 'admin@sugar.com',
                   password: pw
               });
           } catch (e) {}
       }
       return {
           id: 'admin_sugar',
           loginId: 'sugar',
           email: 'admin@sugar.com',
           name: '슈가 어드민',
           role: 'admin',
           isEmailVerified: true,
           isPhoneVerified: true
       };
    }

    // 2. Real DB Login (Supabase)
    if (supabase) {
        let emailToUse = idOrEmail;

        // A. If input looks like an ID (not email), lookup
        if (!idOrEmail.includes('@')) {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('email')
                .eq('login_id', idOrEmail)
                .single();
            
            if (profileError || !profileData) {
                throw new Error("존재하지 않는 아이디입니다.");
            }
            emailToUse = profileData.email;
        }

        // B. Authenticate
        const { data, error } = await supabase.auth.signInWithPassword({
            email: emailToUse,
            password: pw,
        });

        if (error) {
            if (error.message.includes("Invalid login credentials")) {
                throw new Error("비밀번호가 일치하지 않습니다.");
            }
            throw new Error(error.message);
        }

        if (data.user) {
            let profile = null;
            try {
                const { data: p } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();
                profile = p;
            } catch (e) {}

            // Determine Role: DB Role OR Hardcoded Constant
            const isHardcodedAdmin = this.isAdminEmail(data.user.email || '');
            const finalRole = (profile?.role === 'admin' || isHardcodedAdmin) ? 'admin' : 'user';

            return {
                id: data.user.id,
                loginId: profile?.login_id || 'N/A',
                email: data.user.email || emailToUse,
                name: profile?.nickname || data.user.user_metadata?.nickname || 'Unknown',
                role: finalRole,
                isEmailVerified: true,
                isPhoneVerified: true
            };
        }
    }

    // 3. Fallback to Mock DB
    const user = USERS_DB.find(u => u.email === idOrEmail || u.loginId === idOrEmail);
    if (user && pw.length >= 6) return user;

    throw new Error("로그인에 실패했습니다.");
  }

  async register(data: { loginId: string; email: string; pw: string; nickname: string; phone: string }): Promise<AuthUser> {
    
    // 1. Real DB Register
    if (supabase) {
        // A. Check duplicate ID
        const { data: existingId } = await supabase
            .from('profiles')
            .select('login_id')
            .eq('login_id', data.loginId)
            .maybeSingle();
        
        if (existingId) {
            throw new Error("이미 사용 중인 아이디입니다.");
        }

        // B. Create Auth User
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email,
            password: data.pw,
            options: {
                data: { 
                    login_id: data.loginId,
                    nickname: data.nickname,
                    phone: data.phone
                } 
            }
        });

        if (authError) {
            if (authError.message.includes("already registered")) {
                throw new Error("이미 가입된 이메일입니다.");
            }
            throw new Error(authError.message);
        }

        if (!authData.user) throw new Error("회원가입 실패 (응답 없음)");

        if (authData.user && !authData.session) {
            throw new Error("인증 메일이 발송되었습니다. 이메일 확인 후 로그인해주세요.");
        }

        // C. Create Profile Row
        if (authData.session) {
            // Check if this email is in our ADMIN_EMAILS list
            const role = this.isAdminEmail(data.email) ? 'admin' : 'user';

            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: authData.user.id,
                    login_id: data.loginId,
                    email: data.email,
                    nickname: data.nickname,
                    phone: data.phone,
                    role: role // Try to set admin role on creation
                });

            if (profileError) {
                console.warn("Profile creation failed (likely RLS). User created in Auth only.");
            }
        }

        return {
            id: authData.user.id,
            loginId: data.loginId,
            email: authData.user.email || data.email,
            name: data.nickname,
            phone: data.phone,
            role: this.isAdminEmail(data.email) ? 'admin' : 'user',
            isEmailVerified: true,
            isPhoneVerified: true
        };
    }

    // 2. Fallback
    const newUser: AuthUser = {
        id: `user_${Date.now()}`,
        loginId: data.loginId,
        email: data.email,
        name: data.nickname,
        role: 'user',
        isEmailVerified: true
    };
    USERS_DB.push(newUser);
    return newUser;
  }

  // Restore Session
  async getSession(): Promise<AuthUser | null> {
      if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
             let profile = null;
             try {
                const { data: p } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', data.session.user.id)
                    .single();
                profile = p;
             } catch {}

             const isHardcodedAdmin = this.isAdminEmail(data.session.user.email || '');
             const finalRole = (profile?.role === 'admin' || isHardcodedAdmin) ? 'admin' : 'user';

             return {
                id: data.session.user.id,
                loginId: profile?.login_id || 'Unknown',
                email: data.session.user.email!,
                name: profile?.nickname || data.session.user.user_metadata.nickname || 'Unknown',
                role: finalRole,
                isEmailVerified: true
             };
          }
      }
      return null;
  }

  async logout(): Promise<void> {
      if (supabase) {
          await supabase.auth.signOut();
      }
  }
}

export const authService = new AuthService();
