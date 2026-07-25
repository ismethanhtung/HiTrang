import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  // 1. Lấy thông tin profiles trước
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, name').limit(5);
  if (pErr) {
    console.error('Error profiles:', pErr);
    return;
  }
  console.log('Profiles found:', profiles);

  // 2. Gọi RPC lấy danh sách submissions bỏ qua RLS (bằng cách lấy đề thi rồi tìm submission liên quan nếu có)
  // Để đơn giản, ta tìm các lượt thi trong exam_attempts bằng RPC hoặc view nếu có quyền, 
  // hoặc select trực tiếp bảng quizzes để xem danh sách câu hỏi
  const { data: quizzes, error: qErr } = await supabase.rpc('get_quizzes_for_client');
  if (qErr) {
    console.error('Error fetching quizzes:', qErr);
    return;
  }
  console.log('Quizzes found count:', quizzes?.length);

  // 3. Truy vấn các lượt thi exam_attempts gần đây (vì bảng này cho phép select nếu thuộc học sinh, 
  // nhưng ta chạy không auth nên có thể bị trống. Để kiểm tra, ta gọi thử)
  const { data: attempts, error: aErr } = await supabase.from('exam_attempts').select('*').limit(3);
  console.log('Attempts (unauthenticated):', attempts, aErr?.message);
}

test();
