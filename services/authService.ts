
import { AuthUser } from "../types";
import { supabase } from "./supabaseClient";

// --- Mock Data (Fallback & Dev Backdoor) ---
const USERS_DB: AuthUser[] = [
  { id: 'admin_sugar', email: 'admin@sugar.com', name: '슈가 어드민', role: 'admin', isEmailVerified: true, isPhoneVerified: true },
  { id: 'user_sugest', email: 'sugest', name: '일반 서든러', role: 'user', isEmailVerified: true, isPhoneVerified: true },
  { id: 'user_guest', email: 'guest', name: '게스트 유저', role: 'user', isEmailVerified: true, isPhoneVerified: true }
];

class AuthService {
  
  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --- Verification Flow (Simulation for UI) ---
  async sendEmailVerification(email: string): Promise<string> {
    await this.delay(500);
    return "123456"; 
  }

  async verifyEmailCode(email: string, code: string): Promise<boolean> {
    await this.delay(300);
    return true; 
  }

  async sendPhoneVerification(phone: string): Promise<string> {
    await this.delay(500);
    return "123456";
  }

  async verifyPhoneCode(phone: string, code: string): Promise<boolean> {
    await this.delay(300);
    return true;
  }

  // --- Auth Flow (Real Supabase + Fallback) ---

  async login(idOrEmail: string, pw: string): Promise<AuthUser> {
    
    // 1. Dev Backdoor (Master Account) - Always works
    if (idOrEmail === 'sugar' && (pw === 'attack' || pw === 'attack@@')) {
       console.log("[Auth] Master login active.");
       return USERS_DB[0]; // Admin
    }

    // 2. Guest Backdoor - Always works for testing
    if (idOrEmail === 'guest' && (pw === 'attack' || pw === 'attack!!')) {
        console.log("[Auth] Guest login active.");
        return USERS_DB[2]; // Guest
    }

    // 3. Real DB Login (Supabase)
    if (supabase) {
        // A. Authenticate
        const { data, error } = await supabase.auth.signInWithPassword({
            email: idOrEmail,
            password: pw,
        });

        if (error) {
            console.error("Supabase Login Error:", error.message);
            throw new Error("아이디(이메일) 또는 비밀번호가 일치하지 않습니다.");
        }

        if (data.user) {
            // B. Fetch Profile Data (Role, Nickname)
            // If 'profiles' table is missing (PGRST205), we just proceed with metadata
            let profile = null;
            try {
                const { data: p, error: pErr } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();
                
                if (!pErr) profile = p;
                else console.warn("Profile fetch warning:", pErr.message);
            } catch (e) {
                console.warn("Profile table query failed, using metadata.");
            }

            return {
                id: data.user.id,
                email: data.user.email || idOrEmail,
                name: profile?.nickname || data.user.user_metadata?.nickname || 'Unknown',
                role: profile?.role === 'admin' ? 'admin' : 'user',
                isEmailVerified: true,
                isPhoneVerified: true
            };
        }
    }

    // 4. Fallback to Mock DB (Only if Supabase is offline/not configured)
    const user = USERS_DB.find(u => u.email === idOrEmail || u.id === idOrEmail);
    if (user && pw.length >= 4) return user;

    throw new Error("로그인에 실패했습니다.");
  }

  async register(data: { email: string; pw: string; nickname: string; phone: string }): Promise<AuthUser> {
    
    // 1. Real DB Register
    if (supabase) {
        // A. Create Auth User
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email,
            password: data.pw,
            options: {
                data: { nickname: data.nickname } // Stored in metadata as backup
            }
        });

        if (authError) throw new Error(authError.message);
        if (!authData.user) throw new Error("회원가입 실패 (No User Data)");

        // B. Create Profile Row (Critical for App Logic)
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: authData.user.id,
                nickname: data.nickname,
                phone: data.phone,
                role: 'user' // Default role
            });

        if (profileError) {
            console.error("Profile creation failed:", profileError);
            if (profileError.code === 'PGRST205' || profileError.code === '42P01') {
                // Table missing - but Auth User was created. Warn user.
                console.warn("Profiles table missing. User created in Auth only.");
            } else {
                throw new Error("프로필 생성 중 오류가 발생했습니다. (이미 존재하는 닉네임일 수 있습니다)");
            }
        }

        return {
            id: authData.user.id,
            email: authData.user.email || data.email,
            name: data.nickname,
            phone: data.phone,
            role: 'user',
            isEmailVerified: true,
            isPhoneVerified: true
        };
    }

    // 2. Fallback
    const newUser: AuthUser = {
        id: `user_${Date.now()}`,
        email: data.email,
        name: data.nickname,
        role: 'user',
        isEmailVerified: true
    };
    USERS_DB.push(newUser);
    return newUser;
  }

  // Restore Session on App Load
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

             return {
                id: data.session.user.id,
                email: data.session.user.email!,
                name: profile?.nickname || data.session.user.user_metadata.nickname || 'Unknown',
                role: profile?.role === 'admin' ? 'admin' : 'user',
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
