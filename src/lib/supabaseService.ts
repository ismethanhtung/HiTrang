import { Quiz, Submission, User, Question, QuizLeaderboardEntry, OverallLeaderboardEntry } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Helper to build auth headers
 */
function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('hitrang_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * Standard fetch wrapper
 */
async function apiRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...getAuthHeader(),
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new ApiError(errBody.error || `Lỗi API (${res.status})`, res.status);
  }

  return res.json().catch(() => null) as Promise<T>;
}

/**
 * ----------------------------------------------------
 * 1. QUẢN LÝ ĐĂNG KÝ & ĐĂNG NHẬP (AUTH OPERATIONS)
 * ----------------------------------------------------
 */

export async function initializeSession(): Promise<void> {
  // Session is handled via localStorage token, no active handshake needed on boot
  return;
}

export async function signUpUser(
  name: string,
  username: string,
  password: string,
  role: 'admin' | 'student',
  grade?: string | null
): Promise<User> {
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, username, password, role, grade })
  });
  localStorage.setItem('hitrang_token', data.token);
  return data.user;
}

export async function signInUser(username: string, password: string): Promise<User> {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  localStorage.setItem('hitrang_token', data.token);
  return data.user;
}

export async function getCurrentUser(): Promise<User | null> {
  const token = localStorage.getItem('hitrang_token');
  if (!token) return null;

  try {
    const data = await apiRequest<User>('/auth/me');
    return data;
  } catch (err: any) {
    console.warn('Lỗi đồng bộ session cũ:', err);
    if (err.status === 401) {
      console.warn('Mã xác thực hết hạn hoặc không hợp lệ. Xóa token.');
      localStorage.removeItem('hitrang_token');
    }
    return null;
  }
}

export async function getAllProfiles(): Promise<User[]> {
  try {
    return await apiRequest<User[]>('/admin/users');
  } catch (err) {
    console.error('Lỗi khi tải danh sách người dùng:', err);
    return [];
  }
}

export async function updateUserPlan(userId: string, newPlan: 'nothing' | 'basic' | 'vip'): Promise<void> {
  await apiRequest(`/admin/users/${userId}/plan`, {
    method: 'PUT',
    body: JSON.stringify({ plan: newPlan })
  });
}

export async function updateUserProfile(
  userId: string, 
  updatedData: { name: string; username: string; role: 'admin' | 'student'; plan: 'nothing' | 'basic' | 'vip'; grade?: string | null }
): Promise<void> {
  await apiRequest(`/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(updatedData)
  });
}

export async function updateUserGrade(userId: string, newGrade: string | null): Promise<void> {
  await apiRequest(`/admin/users/${userId}/grade`, {
    method: 'PUT',
    body: JSON.stringify({ grade: newGrade })
  });
}

export async function deleteUserProfile(userId: string): Promise<void> {
  await apiRequest(`/admin/users/${userId}`, {
    method: 'DELETE'
  });
}

export async function signInWithGoogle(): Promise<void> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    alert("Hệ thống chưa cấu hình VITE_GOOGLE_CLIENT_ID trong file .env!");
    return;
  }
  
  const redirectUri = `${window.location.origin}/auth/google/callback`;
  const scope = "email profile";
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
  
  window.location.href = authUrl;
}

export async function signOutUser(): Promise<void> {
  localStorage.removeItem('hitrang_token');
}

/**
 * ----------------------------------------------------
 * 2. QUẢN LÝ ĐỀ THI (QUIZZES OPERATIONS)
 * ----------------------------------------------------
 */

export async function getQuizzes(): Promise<Quiz[]> {
  try {
    return await apiRequest<Quiz[]>('/quizzes');
  } catch (err) {
    console.error('Lỗi khi tải danh sách đề thi:', err);
    return [];
  }
}

export async function getQuiz(quizId: string): Promise<Quiz> {
  return await apiRequest<Quiz>(`/quizzes/${quizId}`);
}

export async function createQuiz(quiz: Quiz, creatorId?: string): Promise<void> {
  await apiRequest('/quizzes', {
    method: 'POST',
    body: JSON.stringify(quiz)
  });
}

export async function updateQuiz(quizId: string, updatedData: Partial<Quiz>): Promise<void> {
  await apiRequest(`/quizzes/${quizId}`, {
    method: 'PUT',
    body: JSON.stringify(updatedData)
  });
}

export async function verifyAdminPasswordWithEdgeFunction(password: string): Promise<boolean> {
  try {
    const data = await apiRequest('/auth/verify-admin', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
    return data?.success === true;
  } catch (err) {
    console.error('Lỗi kiểm tra mật khẩu admin:', err);
    return false;
  }
}

export async function deleteQuiz(quizId: string): Promise<void> {
  await apiRequest(`/quizzes/${quizId}`, {
    method: 'DELETE'
  });
}

/**
 * ----------------------------------------------------
 * 3. QUẢN LÝ BÀI NỘP (SUBMISSIONS OPERATIONS)
 * ----------------------------------------------------
 */

export async function getSubmissions(role: 'admin' | 'student', studentId?: string): Promise<Submission[]> {
  try {
    return await apiRequest<Submission[]>('/submissions');
  } catch (err) {
    console.error('Lỗi khi tải bài nộp:', err);
    return [];
  }
}

export async function createSubmission(sub: Submission): Promise<void> {
  // Syncing is handled by server on attempt finalize, no client side creation needed
  return;
}

/**
 * ----------------------------------------------------
 * 4. CẬP NHẬT THÔNG TIN TÀI KHOẢN (SETTINGS OPERATIONS)
 * ----------------------------------------------------
 */

export async function updateProfileName(userId: string, newName: string): Promise<void> {
  await apiRequest('/auth/me/name', {
    method: 'PUT',
    body: JSON.stringify({ name: newName })
  });
}

export async function updatePassword(password: string): Promise<void> {
  await apiRequest('/auth/me/password', {
    method: 'PUT',
    body: JSON.stringify({ password })
  });
}

export async function signOutAllDevices(): Promise<void> {
  localStorage.removeItem('hitrang_token');
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

export async function getActiveAttempt(quizId: string): Promise<any | null> {
  try {
    return await apiRequest(`/attempts/active?quizId=${quizId}`);
  } catch (err) {
    console.error('Lỗi tải lượt thi đang làm:', err);
    return null;
  }
}

export async function getAnyActiveAttempt(): Promise<any | null> {
  try {
    return await apiRequest('/attempts/any-active');
  } catch (err) {
    console.error('Lỗi tải lượt thi đang làm bất kỳ:', err);
    return null;
  }
}

export async function getOrCreateAttempt(quizId: string, durationMinutes: number): Promise<ExamAttempt> {
  const data = await apiRequest('/attempts', {
    method: 'POST',
    body: JSON.stringify({ p_quiz_id: quizId, p_duration_minutes: durationMinutes })
  });

  if (Array.isArray(data) && data.length > 0) {
    return data[0] as ExamAttempt;
  }
  return data as ExamAttempt;
}

export async function updateAttemptAnswers(attemptId: string, answers: Record<string, any>): Promise<void> {
  await apiRequest(`/attempts/${attemptId}`, {
    method: 'PUT',
    body: JSON.stringify({ answers })
  });
}

export async function finalizeAndSubmitAttempt(
  attemptId: string,
  answers: Record<string, any>
): Promise<{ score: number; totalQuestions: number }> {
  return await apiRequest(`/attempts/${attemptId}/finalize`, {
    method: 'POST',
    body: JSON.stringify({ answers })
  });
}

export async function getStudentQuestions(quizId: string): Promise<Question[]> {
  return await apiRequest<Question[]>(`/attempts/student-questions?p_quiz_id=${quizId}`);
}

export async function getReviewQuestions(submissionId: string): Promise<Question[]> {
  return await apiRequest<Question[]>(`/attempts/review-questions?p_submission_id=${submissionId}`);
}

export async function getQuizLeaderboard(quizId: string): Promise<QuizLeaderboardEntry[]> {
  return await apiRequest<QuizLeaderboardEntry[]>(`/leaderboard/quiz?p_quiz_id=${quizId}`);
}

export async function getOverallLeaderboard(grade: string): Promise<OverallLeaderboardEntry[]> {
  return await apiRequest<OverallLeaderboardEntry[]>(`/leaderboard/overall?p_grade=${grade}`);
}

export async function refreshOverallLeaderboard(): Promise<void> {
  await apiRequest('/leaderboard/refresh', {
    method: 'POST'
  });
}

export async function getRecentSubmissionsByGrade(grade: string): Promise<any[]> {
  try {
    return await apiRequest<any[]>(`/leaderboard/recent?p_grade=${grade}`);
  } catch (err) {
    console.error('Lỗi khi tải bảng hoạt động gần đây:', err);
    return [];
  }
}

export async function getBackendVersion(): Promise<string> {
  try {
    const data = await apiRequest<{ version: string }>('/version');
    return data.version;
  } catch (err) {
    console.error('Lỗi khi lấy version backend:', err);
    return 'unknown';
  }
}

export async function uploadAvatar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('avatar', file);

  const data = await apiRequest<{ avatarUrl: string }>('/auth/me/avatar', {
    method: 'POST',
    body: formData,
  });

  return data.avatarUrl;
}

export interface BugReport {
  id: string;
  userId: string | null;
  reporterName: string;
  description: string;
  createdAt: string;
  username: string | null;
  userRole: string | null;
}

export async function submitBugReport(reporterName: string, description: string): Promise<void> {
  await apiRequest('/bugs', {
    method: 'POST',
    body: JSON.stringify({ reporterName, description })
  });
}

export async function getBugReports(): Promise<BugReport[]> {
  try {
    return await apiRequest<BugReport[]>('/admin/bugs');
  } catch (err) {
    console.error('Lỗi khi tải danh sách báo cáo lỗi:', err);
    return [];
  }
}

export interface ScheduleSlot {
  id: string;
  timeSlot: string;
  dayOfWeek: number;
  content: string;
}

export async function getSchedule(): Promise<ScheduleSlot[]> {
  try {
    return await apiRequest<ScheduleSlot[]>('/schedule');
  } catch (err) {
    console.error('Lỗi khi tải lịch học:', err);
    return [];
  }
}

export async function updateSchedule(slots: ScheduleSlot[]): Promise<void> {
  await apiRequest('/admin/schedule', {
    method: 'PUT',
    body: JSON.stringify(slots),
  });
}
