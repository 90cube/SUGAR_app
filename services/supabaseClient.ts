
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

/**
 * [Su-Lab Core] Supabase Client Initializer
 * constants.ts에 정의된 URL과 ANON_KEY를 사용하여 클라이언트를 생성합니다.
 */

const hasConfig = !!SUPABASE_URL && !!SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http');

if (hasConfig) {
  console.log(`%c[Su-Lab] 데이터 베이스 동기화 완료: ${SUPABASE_URL.split('//')[1].split('.')[0]}`, 'color: #22d3ee; font-weight: bold;');
} else {
  console.error(
    `%c[Su-Lab] CRITICAL ERROR: Config Missing %c\n'constants.ts' 파일의 값이 비어있습니다.`,
    'color: #ef4444; font-weight: bold;',
    'color: #94a3b8;'
  );
}

// 설정이 확인되면 클라이언트를 생성하고, 아니면 null을 반환합니다.
export const supabase = hasConfig 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;
