import { supabase } from './supabase';
import { Quiz, Submission, User } from '../types';

/**
 * ----------------------------------------------------
 * 1. QUẢN LÝ ĐĂNG KÝ & ĐĂNG NHẬP (AUTH OPERATIONS)
 * ----------------------------------------------------
 */

/**
 * Đăng ký tài khoản người dùng mới (Học sinh hoặc Giáo viên)
 * Vì không yêu cầu nhập Email, hệ thống tự động sinh Email ẩn dưới dạng [username]@hocvientinhte.edu.vn
 */
export async function signUpUser(
  name: string,
  username: string,
  password: string,
  role: 'teacher' | 'student'
): Promise<User> {
  const cleanUsername = username.trim().toLowerCase();
  const email = `${cleanUsername}@hocvientinhte.edu.vn`;

  // 1. Gọi API đăng ký của Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name.trim(),
        username: cleanUsername,
        role: role
      }
    }
  });

  if (authError) {
    // Xử lý một số thông báo lỗi thân thiện bằng tiếng Việt
    if (authError.message.includes('User already registered') || authError.status === 422) {
      throw new Error('Tên đăng nhập này đã tồn tại trong hệ thống.');
    }
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error('Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.');
  }

  // 2. Ghi thông tin hồ sơ bổ sung vào bảng profiles
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      name: name.trim(),
      username: cleanUsername,
      role: role
    });

  if (profileError) {
    throw new Error(`Đăng ký Auth thành công nhưng lỗi khởi tạo hồ sơ: ${profileError.message}`);
  }

  return {
    id: authData.user.id,
    name: name.trim(),
    username: cleanUsername,
    role: role
  };
}

/**
 * Đăng nhập bằng tài khoản username và mật khẩu
 */
export async function signInUser(username: string, password: string): Promise<User> {
  const cleanUsername = username.trim().toLowerCase();
  const email = `${cleanUsername}@hocvientinhte.edu.vn`;

  // 1. Gọi API đăng nhập bằng email ẩn
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    if (authError.message.includes('Invalid login credentials')) {
      throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác.');
    }
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error('Đăng nhập không thành công. Hãy thử lại.');
  }

  // 2. Lấy thông tin vai trò và tên từ bảng profiles
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profileData) {
    // Phương án dự phòng nếu không lấy được bảng profile (sử dụng metadata)
    const meta = authData.user.user_metadata || {};
    return {
      id: authData.user.id,
      name: meta.name || username,
      username: cleanUsername,
      role: (meta.role as 'teacher' | 'student') || 'student',
      avatarUrl: meta.avatar_url || meta.picture
    };
  }

  return {
    id: profileData.id,
    name: profileData.name,
    username: profileData.username,
    role: profileData.role as 'teacher' | 'student',
    avatarUrl: authData.user.user_metadata?.avatar_url || authData.user.user_metadata?.picture
  };
}

/**
 * Lấy thông tin người dùng đang đăng nhập hiện tại
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session || !session.user) return null;

  const user = session.user;

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profileData) {
    const meta = user.user_metadata || {};
    const name = meta.full_name || meta.name || user.email?.split('@')[0] || 'Người dùng Google';
    const username = meta.username || user.email?.split('@')[0] || `user_${user.id.substring(0, 5)}`;
    const role = (meta.role as 'teacher' | 'student') || 'student';
    const avatarUrl = meta.avatar_url || meta.picture;

    // Tự động tạo hồ sơ người dùng trong bảng profiles nếu chưa tồn tại (ví dụ: đăng nhập qua Google lần đầu)
    try {
      await supabase.from('profiles').insert({
        id: user.id,
        name,
        username,
        role
      });
    } catch (err) {
      console.error('Không thể tự động tạo profile cho người dùng mới:', err);
    }

    return {
      id: user.id,
      name,
      username,
      role,
      avatarUrl
    };
  }

  return {
    id: profileData.id,
    name: profileData.name,
    username: profileData.username,
    role: profileData.role as 'teacher' | 'student',
    avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture
  };
}

/**
 * Đăng nhập bằng Google OAuth
 */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Đăng xuất tài khoản
 */
export async function signOutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * ----------------------------------------------------
 * 2. QUẢN LÝ ĐỀ THI (QUIZZES OPERATIONS)
 * ----------------------------------------------------
 */

/**
 * Lấy toàn bộ danh sách đề thi
 */
export async function getQuizzes(): Promise<Quiz[]> {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Lỗi khi tải đề thi từ Supabase:', error);
    return [];
  }

  return (data || []).map(item => ({
    id: item.id,
    title: item.title,
    description: item.description,
    subject: item.subject,
    duration: item.duration,
    questions: item.questions,
    createdAt: item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : ''
  }));
}

/**
 * Thêm mới một đề thi
 */
export async function createQuiz(quiz: Quiz, creatorId: string): Promise<void> {
  const { error } = await supabase
    .from('quizzes')
    .insert({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      subject: quiz.subject,
      duration: quiz.duration,
      questions: quiz.questions,
      created_by: creatorId
    });

  if (error) {
    throw new Error(`Không thể lưu đề thi lên Supabase: ${error.message}`);
  }
}

/**
 * Xóa một đề thi theo ID
 */
export async function deleteQuiz(quizId: string): Promise<void> {
  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', quizId);

  if (error) {
    throw new Error(`Không thể xóa đề thi trên Supabase: ${error.message}`);
  }
}

/**
 * ----------------------------------------------------
 * 3. QUẢN LÝ BÀI NỘP (SUBMISSIONS OPERATIONS)
 * ----------------------------------------------------
 */

/**
 * Lấy danh sách bài nộp dựa trên vai trò của người dùng
 */
export async function getSubmissions(role: 'teacher' | 'student', studentId?: string): Promise<Submission[]> {
  let query = supabase.from('submissions').select('*');

  if (role === 'student' && studentId) {
    query = query.eq('student_id', studentId);
  }

  const { data, error } = await query.order('submitted_at', { ascending: false });

  if (error) {
    console.error('Lỗi khi tải bài nộp từ Supabase:', error);
    return [];
  }

  return (data || []).map(item => ({
    id: item.id,
    quizId: item.quiz_id,
    quizTitle: item.quiz_title,
    studentId: item.student_id,
    studentName: item.student_name,
    score: Number(item.score),
    totalQuestions: item.total_questions,
    answers: item.answers,
    submittedAt: item.submitted_at ? new Date(item.submitted_at).toLocaleString('sv-SE').slice(0, 16) : ''
  }));
}

/**
 * Ghi nhận một kết quả làm bài thi mới
 */
export async function createSubmission(sub: Submission): Promise<void> {
  const { error } = await supabase
    .from('submissions')
    .insert({
      quiz_id: sub.quizId,
      quiz_title: sub.quizTitle,
      student_id: sub.studentId,
      student_name: sub.studentName,
      score: sub.score,
      total_questions: sub.totalQuestions,
      answers: sub.answers
    });

  if (error) {
    throw new Error(`Không thể nộp bài lên Supabase: ${error.message}`);
  }
}

/**
 * ----------------------------------------------------
 * 4. CẬP NHẬT THÔNG TIN TÀI KHOẢN (SETTINGS OPERATIONS)
 * ----------------------------------------------------
 */

/**
 * Cập nhật họ tên hiển thị của người dùng
 */
export async function updateProfileName(userId: string, newName: string): Promise<void> {
  // 1. Cập nhật bảng profiles
  const { error: dbError } = await supabase
    .from('profiles')
    .update({ name: newName })
    .eq('id', userId);

  if (dbError) {
    throw new Error(`Lỗi cập nhật CSDL: ${dbError.message}`);
  }

  // 2. Cập nhật auth metadata
  const { error: authError } = await supabase.auth.updateUser({
    data: { name: newName }
  });

  if (authError) {
    throw new Error(`Lỗi cập nhật metadata: ${authError.message}`);
  }
}

/**
 * Cập nhật mật khẩu mới
 */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Đăng xuất tài khoản trên mọi thiết bị
 */
export async function signOutAllDevices(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) {
    throw new Error(error.message);
  }
}
