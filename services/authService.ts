
import { AuthUser } from "../types";

// Simulated Database
const USERS_DB: AuthUser[] = [
  { id: 'admin_sugar', email: 'admin@sugar.com', name: '슈가 어드민', role: 'admin', isEmailVerified: true, isPhoneVerified: true },
  { id: 'user_1', email: 'test@user.com', name: '테스터', role: 'user', isEmailVerified: true, isPhoneVerified: true },
  // Requested Test User
  { id: 'user_sugest', email: 'sugest', name: '일반 서든러', role: 'user', isEmailVerified: true, isPhoneVerified: true }
];

// Mock Verification Codes Storage
const VERIFICATION_CODES: Record<string, string> = {};

class AuthService {
  
  // --- Helpers ---
  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
  }

  // --- Email Verification ---
  
  // Returns the generated code for demo purposes
  async sendEmailVerification(email: string): Promise<string> {
    await this.delay(800);
    if (!email.includes('@')) throw new Error("유효하지 않은 이메일 형식입니다.");
    
    // Check duplication (Simulated)
    const exists = USERS_DB.find(u => u.email === email);
    if (exists) throw new Error("이미 가입된 이메일입니다.");

    const code = this.generateCode();
    VERIFICATION_CODES[`email_${email}`] = code;
    
    console.log(`[AuthService] Email Verification Code for ${email}: ${code}`);
    return code;
  }

  async verifyEmailCode(email: string, code: string): Promise<boolean> {
    await this.delay(500);
    const validCode = VERIFICATION_CODES[`email_${email}`];
    if (validCode && validCode === code) {
      delete VERIFICATION_CODES[`email_${email}`];
      return true;
    }
    return false;
  }

  // --- Phone Verification (Korea) ---

  // Returns the generated code for demo purposes
  async sendPhoneVerification(phone: string): Promise<string> {
    await this.delay(1000); // SMS takes longer
    const phoneRegex = /^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/;
    if (!phoneRegex.test(phone)) throw new Error("휴대전화 번호 형식이 올바르지 않습니다. (예: 010-1234-5678)");

    const code = this.generateCode();
    VERIFICATION_CODES[`phone_${phone}`] = code;
    
    console.log(`[AuthService] SMS Verification Code for ${phone}: ${code}`);
    return code;
  }

  async verifyPhoneCode(phone: string, code: string): Promise<boolean> {
    await this.delay(500);
    const validCode = VERIFICATION_CODES[`phone_${phone}`];
    if (validCode && validCode === code) {
      delete VERIFICATION_CODES[`phone_${phone}`];
      return true;
    }
    return false;
  }

  // --- Auth Flow ---

  async login(idOrEmail: string, pw: string): Promise<AuthUser> {
    await this.delay(800);
    
    // 1. Admin Backdoor
    if (idOrEmail === 'sugar' && pw === 'attack@@') {
       return USERS_DB[0];
    }

    // 2. Test User (sugest) Backdoor
    if (idOrEmail === 'sugest' && pw === 'attack!!') {
        return USERS_DB[2];
    }

    // 3. Normal Login Simulation
    const user = USERS_DB.find(u => u.email === idOrEmail || u.id === idOrEmail);
    
    if (user) {
        if (pw.length < 4) throw new Error("비밀번호를 확인해주세요.");
        return user;
    }

    throw new Error("아이디 또는 비밀번호가 일치하지 않습니다.");
  }

  async register(data: { email: string; pw: string; nickname: string; phone: string }): Promise<AuthUser> {
    await this.delay(1200);

    const newUser: AuthUser = {
        id: `user_${Date.now()}`,
        email: data.email,
        name: data.nickname,
        phone: data.phone,
        role: 'user',
        isEmailVerified: true,
        isPhoneVerified: true
    };

    USERS_DB.push(newUser);
    return newUser;
  }
}

export const authService = new AuthService();
