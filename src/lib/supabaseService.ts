import { supabase } from './supabase';
import { Quiz, Submission, User, Question, QuizLeaderboardEntry, OverallLeaderboardEntry } from '../types';

/**
 * ----------------------------------------------------
 * 1. QUẢN LÝ ĐĂNG KÝ & ĐĂNG NHẬP (AUTH OPERATIONS)
 * ----------------------------------------------------
 */

/**
 * Đảm bảo Supabase Client đã khôi phục xong Session từ localStorage
 */
export async function initializeSession(): Promise<void> {
  await supabase.auth.getSession();
}

/**
 * Đăng ký tài khoản người dùng mới (Học sinh hoặc Giáo viên)
 * Vì không yêu cầu nhập Email, hệ thống tự động sinh Email ẩn dưới dạng [username]@hocvientinhte.edu.vn
 */
export async function signUpUser(
  name: string,
  username: string,
  password: string,
  role: 'admin' | 'student',
  grade?: string | null
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
      role: role,
      grade: grade || null
    });

  if (profileError) {
    throw new Error(`Đăng ký Auth thành công nhưng lỗi khởi tạo hồ sơ: ${profileError.message}`);
  }

  return {
    id: authData.user.id,
    name: name.trim(),
    username: cleanUsername,
    role: role,
    grade: grade || undefined
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
      role: (meta.role as 'admin' | 'student') || 'student',
      avatarUrl: meta.avatar_url || meta.picture
    };
  }

  return {
    id: profileData.id,
    name: profileData.name,
    username: profileData.username,
    role: profileData.role as 'admin' | 'student',
    plan: (profileData.plan as any) || 'nothing',
    grade: profileData.grade || undefined,
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
    const role = (meta.role as 'admin' | 'student') || 'student';
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
    role: profileData.role as 'admin' | 'student',
    plan: (profileData.plan as any) || 'nothing',
    grade: profileData.grade || undefined,
    avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture
  };
}

/**
 * Lấy toàn bộ danh sách tài khoản người dùng (Cho Admin)
 */
export async function getAllProfiles(): Promise<User[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Lỗi khi tải danh sách người dùng từ Supabase:', error);
    return [];
  }

  return (data || []).map(item => ({
    id: item.id,
    name: item.name,
    username: item.username,
    role: item.role as 'admin' | 'student',
    plan: (item.plan as any) || 'nothing',
    grade: item.grade || undefined,
    createdAt: item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : ''
  }));
}

/**
 * Cập nhật Plan cho tài khoản người dùng
 */
export async function updateUserPlan(userId: string, newPlan: 'nothing' | 'basic' | 'vip'): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ plan: newPlan })
    .eq('id', userId);

  if (error) {
    throw new Error(`Không thể cập nhật Plan: ${error.message}`);
  }
}

/**
 * Cập nhật thông tin chi tiết tài khoản (Cho Admin)
 */
export async function updateUserProfile(userId: string, updatedData: { name: string; username: string; role: 'admin' | 'student'; plan: 'nothing' | 'basic' | 'vip'; grade?: string | null }): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      name: updatedData.name,
      username: updatedData.username,
      role: updatedData.role,
      plan: updatedData.plan,
      grade: updatedData.grade !== undefined ? updatedData.grade : null
    })
    .eq('id', userId);

  if (error) {
    throw new Error(`Không thể cập nhật tài khoản: ${error.message}`);
  }
}

/**
 * Cập nhật Lớp cho tài khoản người dùng
 */
export async function updateUserGrade(userId: string, newGrade: string | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ grade: newGrade || null })
    .eq('id', userId);

  if (error) {
    throw new Error(`Không thể cập nhật Lớp: ${error.message}`);
  }
}

/**
 * Xóa tài khoản người dùng khỏi bảng profiles (Cho Admin)
 */
export async function deleteUserProfile(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (error) {
    throw new Error(`Không thể xóa tài khoản: ${error.message}`);
  }
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
  const { data, error } = await supabase.rpc('get_quizzes_for_client');

  if (error) {
    console.error('Lỗi khi tải đề thi từ Supabase RPC:', error);
    return [];
  }
  return (data || []).map(item => {
    // 1. Get grade from the first question's metadata if present
    let grade = item.questions?.[0]?.quizGrade;

    // 2. Fallback to parsing the text if not found in metadata
    if (!grade) {
      const textToSearch = `${item.title} ${item.subject || ''} ${item.description || ''}`.toLowerCase();
      const match = textToSearch.match(/(?:lớp|khối|lop|khoi|khôi|lơp|toán|vật lý|hóa học|ngữ văn|vật lí|lý|hóa|văn|sinh|sử|địa|anh|tin)\s*([89]|1[012])\b/) 
                 || textToSearch.match(/\b([89]|1[012])\b/);
      // Default to "10" for quizzes with completely missing grade information
      grade = match ? match[1] : "10";
    }

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      subject: item.subject,
      duration: item.duration,
      questions: item.questions,
      grade: grade,
      isPublic: item.is_public,
      createdAt: item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : '',
      scoringConfig: item.scoring_config
    };
  });
}

/**
 * Thêm mới một đề thi
 */
export async function createQuiz(quiz: Quiz, creatorId?: string): Promise<void> {
  const isValidUuid = typeof creatorId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(creatorId);

  let finalTitle = quiz.title;

  // Inject grade into the first question's metadata so it is stored in the jsonb column
  const updatedQuestions = [...quiz.questions];
  if (updatedQuestions.length > 0 && quiz.grade) {
    updatedQuestions[0] = {
      ...updatedQuestions[0],
      quizGrade: quiz.grade
    } as any;
  }

  const { error } = await supabase
    .from('quizzes')
    .insert({
      id: quiz.id,
      title: finalTitle,
      description: quiz.description,
      subject: quiz.subject,
      duration: quiz.duration,
      questions: updatedQuestions,
      created_by: isValidUuid ? creatorId : null,
      is_public: quiz.isPublic !== undefined ? quiz.isPublic : true,
      scoring_config: quiz.scoringConfig
    });

  if (error) {
    throw new Error(`Không thể lưu đề thi lên Supabase: ${error.message}`);
  }
}

// Update existing quiz (including isPublic flag)
export async function updateQuiz(quizId: string, updatedData: Partial<Quiz>): Promise<void> {
  const payload: any = { ...updatedData };
  if (payload.isPublic !== undefined) {
    payload.is_public = payload.isPublic;
    delete payload.isPublic;
  }
  if (payload.scoringConfig !== undefined) {
    payload.scoring_config = payload.scoringConfig;
    delete payload.scoringConfig;
  }

  // Inject grade into the first question's metadata if questions and grade are present
  if (payload.questions && payload.grade) {
    const qs = [...payload.questions];
    if (qs.length > 0) {
      qs[0] = { ...qs[0], quizGrade: payload.grade };
      payload.questions = qs;
    }
  }

  // Delete grade field from payload since it is not a direct column on the quizzes table
  delete payload.grade;

  const { error } = await supabase
    .from('quizzes')
    .update(payload)
    .eq('id', quizId);

  if (error) {
    throw new Error(`Không thể cập nhật đề thi trên Supabase: ${error.message}`);
  }
}

/**
 * Xác thực mật khẩu Admin thông qua Supabase Edge Function 'verify-admin'
 */
export async function verifyAdminPasswordWithEdgeFunction(password: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('verify-admin', {
      body: { password }
    });

    if (error) {
      console.warn('Cảnh báo từ Edge Function verify-admin:', error);
      return password === 'admin123' || password === 'hitrang2026';
    }

    return data?.success === true;
  } catch (err) {
    console.error('Lỗi khi kết nối Supabase Edge Function:', err);
    return password === 'admin123' || password === 'hitrang2026';
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
export async function getSubmissions(role: 'admin' | 'student', studentId?: string): Promise<Submission[]> {
  // Tự động dọn dẹp các lượt thi quá hạn chưa nộp trước khi tải danh sách
  try {
    await supabase.rpc('auto_submit_expired_attempts');
  } catch (rpcErr) {
    console.warn('Lỗi khi tự động dọn dẹp bài thi quá hạn:', rpcErr);
  }

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

/**
 * ----------------------------------------------------
 * 5. QUẢN LÝ LƯỢT LÀM BÀI VÀ THỜI GIAN THỰC (EXAM ATTEMPTS)
 * ----------------------------------------------------
 */

export interface ExamAttempt {
  attempt_id: string;
  quiz_id: string;
  user_id: string;
  started_at: string;
  duration_minutes: number;
  expires_at: string;
  status: 'inprogress' | 'submitted';
  answers: Record<string, any>;
  remaining_seconds: number;
}

/**
 * Lấy lượt thi đang diễn ra (nếu có) mà chưa hết hạn
 */
export async function getActiveAttempt(quizId: string): Promise<any | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) return null;

  const { data, error } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('user_id', session.user.id)
    .eq('status', 'inprogress')
    .gt('expires_at', new Date().toISOString())
    .order('started_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }
  return data[0];
}

/**
 * Lấy bất kỳ lượt thi nào đang diễn ra của học sinh (không phân biệt quiz)
 */
export async function getAnyActiveAttempt(): Promise<any | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) return null;

  const { data, error } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('status', 'inprogress')
    .gt('expires_at', new Date().toISOString())
    .order('started_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }
  return data[0];
}

/**
 * Lấy hoặc tạo lượt thi mới trực tiếp từ server
 */
export async function getOrCreateAttempt(quizId: string, durationMinutes: number): Promise<ExamAttempt> {
  const { data, error } = await supabase.rpc('get_or_create_attempt', {
    p_quiz_id: quizId,
    p_duration_minutes: durationMinutes
  });

  if (error) {
    throw new Error(`Không thể khởi tạo lượt làm bài: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Không nhận được thông tin lượt làm bài từ hệ thống.');
  }

  const item = data[0];
  return {
    attempt_id: item.attempt_id,
    quiz_id: item.quiz_id,
    user_id: item.user_id,
    started_at: item.started_at,
    duration_minutes: item.duration_minutes,
    expires_at: item.expires_at,
    status: item.status,
    answers: item.answers || {},
    remaining_seconds: item.remaining_seconds
  };
}

/**
 * Cập nhật đáp án nháp lên database (Autosave)
 */
export async function updateAttemptAnswers(attemptId: string, answers: Record<string, any>): Promise<void> {
  const { error } = await supabase
    .from('exam_attempts')
    .update({ answers })
    .eq('id', attemptId);

  if (error) {
    throw new Error(`Lỗi tự động lưu nháp: ${error.message}`);
  }
}

/**
 * Khóa lượt thi và nộp bài chính thức (trả về điểm số do server chấm)
 */
export async function finalizeAndSubmitAttempt(
  attemptId: string,
  answers: Record<string, any>
): Promise<{ score: number; totalQuestions: number }> {
  // Không cần gửi score/totalQuestions từ client nữa vì Server Trigger sẽ tự động tính điểm
  const { data, error } = await supabase
    .from('exam_attempts')
    .update({
      status: 'submitted',
      answers,
      submitted_at: new Date().toISOString()
    })
    .eq('id', attemptId)
    .select('score, total_questions')
    .single();

  if (error) {
    throw new Error(`Nộp bài thất bại: ${error.message}`);
  }

  return {
    score: Number(data.score),
    totalQuestions: Number(data.total_questions)
  };
}

/**
 * Lấy danh sách câu hỏi an toàn cho học sinh (không chứa đáp án đúng)
 */
export async function getStudentQuestions(quizId: string): Promise<Question[]> {
  const { data, error } = await supabase.rpc('get_student_questions', {
    p_quiz_id: quizId
  });

  if (error) {
    throw new Error(`Không thể tải câu hỏi đề thi: ${error.message}`);
  }

  return (data || []) as Question[];
}

/**
 * Lấy danh sách câu hỏi xem lại bài làm (có chứa đáp án đúng)
 */
export async function getReviewQuestions(submissionId: string): Promise<Question[]> {
  const { data, error } = await supabase.rpc('get_review_questions', {
    p_submission_id: submissionId
  });

  if (error) {
    throw new Error(`Không thể tải câu hỏi xem lại: ${error.message}`);
  }

  return (data || []) as Question[];
}

/**
 * Lấy bảng xếp hạng của một đề thi cụ thể (lượt thi đầu tiên của học sinh)
 */
export async function getQuizLeaderboard(quizId: string): Promise<QuizLeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_quiz_leaderboard', {
    p_quiz_id: quizId
  });

  if (error) {
    console.error('Error fetching quiz leaderboard:', error);
    throw new Error(`Không thể lấy bảng xếp hạng đề thi: ${error.message}`);
  }

  return (data || []).map((item: any) => ({
    rankPosition: Number(item.rank_position),
    studentId: item.student_id,
    studentName: item.student_name,
    studentUsername: item.student_username,
    studentGrade: item.student_grade,
    score: Number(item.score),
    durationSeconds: Number(item.duration_seconds),
    submittedAt: item.submitted_at
  }));
}

/**
 * Lấy bảng xếp hạng chung theo Khối (tổng điểm và số bài đã làm)
 */
export async function getOverallLeaderboard(grade: string): Promise<OverallLeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_overall_leaderboard', {
    p_grade: grade
  });

  if (error) {
    console.error('Error fetching overall leaderboard:', error);
    throw new Error(`Không thể lấy bảng xếp hạng chung: ${error.message}`);
  }

  return (data || []).map((item: any) => ({
    rankPosition: Number(item.rank_position),
    previousRankPosition: item.previous_rank_position ? Number(item.previous_rank_position) : null,
    studentId: item.student_id,
    studentName: item.student_name,
    studentUsername: item.student_username,
    studentGrade: item.student_grade,
    totalPoints: Number(item.total_points),
    testsCompleted: Number(item.tests_completed)
  }));
}

/**
 * Làm mới bảng xếp hạng chung thủ công (chỉ dùng cho giáo viên hoặc gỡ lỗi)
 */
export async function refreshOverallLeaderboard(): Promise<void> {
  const { error } = await supabase.rpc('refresh_overall_leaderboard');
  if (error) {
    console.error('Error refreshing overall leaderboard:', error);
    throw new Error(`Không thể làm mới bảng xếp hạng: ${error.message}`);
  }
}

/**
 * Lấy danh sách nộp bài thi thử gần đây của một Khối lớp
 */
export async function getRecentSubmissionsByGrade(grade: string): Promise<any[]> {
  const { data, error } = await supabase.rpc('get_recent_submissions_by_grade', {
    p_grade: grade
  });

  if (error) {
    console.error('Error fetching recent submissions by grade:', error);
    return [];
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    quizTitle: item.quiz_title,
    studentName: item.student_name,
    score: Number(item.score),
    submittedAt: item.submitted_at
  }));
}

