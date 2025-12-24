
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

// Supabase 클라이언트 초기화
// URL과 Key가 있을 때만 실제 인스턴스를 생성하고, 없으면 null을 반환하여 Mock 모드로 유도합니다.
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;
