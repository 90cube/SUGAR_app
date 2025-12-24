
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

// Supabase 클라이언트 초기화
const isConfigured = SUPABASE_URL && SUPABASE_ANON_KEY;

if (isConfigured) {
  console.log(`%c[Supabase] Client Initialized`, 'color: #4ade80; font-weight: bold;');
  console.log(`[Supabase] URL: ${SUPABASE_URL}`);
} else {
  console.warn(`%c[Supabase] Client NOT Configured - Using Mock Mode`, 'color: #f87171; font-weight: bold;');
}

export const supabase = isConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;
