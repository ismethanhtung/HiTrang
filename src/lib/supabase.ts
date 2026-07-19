import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Cảnh báo: Thiếu cấu hình biến môi trường Supabase URL hoặc Publishable Key.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
