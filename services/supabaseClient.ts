
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

// Supabase 클라이언트 초기화
const isConfigured = SUPABASE_URL && SUPABASE_ANON_KEY;

if (isConfigured) {
  console.group('[Supabase] Client Initialization');
  console.log(`Target URL: ${SUPABASE_URL}`);
  console.log(`Anon Key: ${SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.substring(0, 15) + '...' : 'MISSING'}`);
  console.groupEnd();
} else {
  console.warn(`%c[Supabase] Client NOT Configured - Using Mock Mode`, 'color: #f87171; font-weight: bold;');
}

export const supabase = isConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;
