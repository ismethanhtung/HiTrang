import { Quiz, Submission, User, Question, QuizLeaderboardEntry, OverallLeaderboardEntry, AppNotification } from '../types';

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

export interface SignInResult {
  user?: User;
  token?: string;
  require2FA?: boolean;
  message?: string;
}

export async function signInUser(username: string, password: string, totpCode?: string): Promise<SignInResult> {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password, totpCode })
  });
  if (data.require2FA) {
    return { require2FA: true, message: data.message };
  }
  if (data.token) {
    localStorage.setItem('hitrang_token', data.token);
  }
  return { user: data.user, token: data.token };
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

export async function rescoreQuiz(quizId: string): Promise<{ message: string; rescoredCount: number }> {
  return await apiRequest<{ message: string; rescoredCount: number }>(`/quizzes/${quizId}/rescore`, {
    method: 'POST'
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

export async function updateUsername(newUsername: string): Promise<{ message: string; username: string; token?: string }> {
  const data = await apiRequest<{ message: string; username: string; token?: string }>('/auth/me/username', {
    method: 'PUT',
    body: JSON.stringify({ username: newUsername })
  });
  if (data && data.token) {
    localStorage.setItem('hitrang_token', data.token);
  }
  return data;
}

export async function updatePassword(
  password: string,
  currentPassword?: string
): Promise<{ message: string; passwordUpdatedAt?: string }> {
  return await apiRequest('/auth/me/password', {
    method: 'PUT',
    body: JSON.stringify({ password, currentPassword }),
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

export interface SystemStats {
  todayVisits: number;
  totalVisits: number;
  onlineCount: number;
  totalSubmissions: number;
  version: string;
}

export async function getSystemStats(): Promise<SystemStats> {
  return await apiRequest<SystemStats>('/stats/system');
}

export async function recordSiteVisit(): Promise<void> {
  try {
    await apiRequest('/stats/visit', { method: 'POST' });
  } catch {
    // Silent fail if backend offline
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
  avatarUrl?: string | null;
  grade?: string | null;
  email?: string | null;
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

export async function deleteBugReport(id: string): Promise<void> {
  await apiRequest(`/admin/bugs/${id}`, {
    method: 'DELETE',
  });
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

export interface GenerateResetTokenResponse {
  success: boolean;
  token: string;
  expiresAt: string;
  userId: string;
  username: string;
  name: string;
}

export interface VerifyResetTokenResponse {
  valid: boolean;
  username?: string;
  name?: string;
  error?: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export async function generatePasswordResetLink(userId: string): Promise<GenerateResetTokenResponse> {
  return await apiRequest<GenerateResetTokenResponse>(`/admin/users/${userId}/reset-token`, {
    method: 'POST',
  });
}

export async function verifyPasswordResetToken(token: string): Promise<VerifyResetTokenResponse> {
  return await apiRequest<VerifyResetTokenResponse>(`/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
}

export async function resetPasswordWithToken(token: string, password: string): Promise<ResetPasswordResponse> {
  return await apiRequest<ResetPasswordResponse>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

// ----------------------------------------------------
// 2-STEP VERIFICATION & FORGOT PASSWORD API
// ----------------------------------------------------

export interface ForgotPasswordCheckResult {
  exists: boolean;
  has2FA: boolean;
  username?: string;
  name?: string;
  message?: string;
}

export async function checkForgotPassword(username: string): Promise<ForgotPasswordCheckResult> {
  return await apiRequest<ForgotPasswordCheckResult>('/auth/forgot-password/check', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function resetPasswordWithTOTP(
  username: string,
  totpCode: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  return await apiRequest('/auth/forgot-password/reset-with-totp', {
    method: 'POST',
    body: JSON.stringify({ username, totpCode, password }),
  });
}

export interface Setup2FAResult {
  secret: string;
  otpauthUri: string;
}

export async function setup2FA(): Promise<Setup2FAResult> {
  return await apiRequest<Setup2FAResult>('/auth/2fa/setup', {
    method: 'POST',
  });
}

export async function enable2FA(code: string): Promise<{ success: boolean; message: string }> {
  return await apiRequest('/auth/2fa/enable', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function disable2FA(code?: string, password?: string): Promise<{ success: boolean; message: string }> {
  return await apiRequest('/auth/2fa/disable', {
    method: 'POST',
    body: JSON.stringify({ code, password }),
  });
}

export async function setRequire2FALogin(enabled: boolean): Promise<{ success: boolean; message: string; require2FALogin: boolean }> {
  return await apiRequest('/auth/2fa/login-required', {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  });
}

// ----------------------------------------------------
// ACTIVE SESSIONS & ACCOUNT DELETION
// ----------------------------------------------------

export interface ActiveSession {
  id: string;
  userId: string;
  browser: string;
  os: string;
  device: string;
  ipAddress: string;
  location: string;
  isCurrent: boolean;
  lastSeen: string;
  expiresAt: string;
  createdAt: string;
}

export async function getActiveSessions(): Promise<ActiveSession[]> {
  return await apiRequest<ActiveSession[]>('/auth/sessions');
}

export async function revokeSession(sessionId: string): Promise<{ success: boolean; message: string }> {
  return await apiRequest(`/auth/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}

export async function revokeAllOtherSessions(): Promise<{ success: boolean; message: string }> {
  return await apiRequest('/auth/sessions/logout-all', {
    method: 'POST',
  });
}

export async function deleteUserAccount(password?: string): Promise<{ success: boolean; message: string }> {
  return await apiRequest('/auth/account', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
}

// ----------------------------------------------------
// IN-APP NOTIFICATIONS
// ----------------------------------------------------

export async function getNotifications(): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
  return await apiRequest<{ notifications: AppNotification[]; unreadCount: number }>('/notifications', {
    method: 'GET',
  });
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await apiRequest(`/notifications/${id}/read`, {
    method: 'POST',
  });
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await apiRequest('/notifications/read-all', {
    method: 'POST',
  });
}

export interface SendAdminNotificationPayload {
  title: string;
  message: string;
  type: 'new_quiz' | 'teacher_message' | 'reminder' | 'system';
  targetGrade?: string;
  targetPlan?: string;
  userId?: string | null;
  link?: string;
  quizId?: string;
}

export async function sendAdminNotification(payload: SendAdminNotificationPayload): Promise<{ success: boolean; notification: AppNotification }> {
  return await apiRequest<{ success: boolean; notification: AppNotification }>('/admin/notifications', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getAdminNotifications(): Promise<{ notifications: AppNotification[] }> {
  return await apiRequest<{ notifications: AppNotification[] }>('/admin/notifications', {
    method: 'GET',
  });
}

export async function deleteAdminNotification(id: string): Promise<{ success: boolean }> {
  return await apiRequest<{ success: boolean }>(`/admin/notifications/${id}`, {
    method: 'DELETE',
  });
}

// ----------------------------------------------------
// BACKUP & RESTORE MANAGEMENT
// ----------------------------------------------------

export interface BackupSnapshot {
  id: string;
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  type: 'auto' | 'manual';
  checksumSha256: string;
  totalUsers: number;
  totalQuizzes: number;
  totalSubmissions: number;
  totalBugReports: number;
  isValid: boolean;
}

export interface BackupListResponse {
  backups: BackupSnapshot[];
  totalCount: number;
  maxLimit: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  autoInterval: string;
}

export async function getBackupList(): Promise<BackupListResponse> {
  return await apiRequest<BackupListResponse>('/admin/backups', {
    method: 'GET',
  });
}

export async function createManualBackup(): Promise<{ message: string; backup: BackupSnapshot }> {
  return await apiRequest<{ message: string; backup: BackupSnapshot }>('/admin/backups/create', {
    method: 'POST',
  });
}

export async function downloadBackupFile(filename: string, passkey: string): Promise<Blob> {
  const token = getToken();
  const apiUrl = getApiUrl();
  const res = await fetch(`${apiUrl}/admin/backups/${encodeURIComponent(filename)}/download?passkey=${encodeURIComponent(passkey)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Không thể tải file sao lưu' }));
    throw new Error(err.error || 'Mật khẩu cấp 2 không chính xác hoặc file không tồn tại');
  }
  return await res.blob();
}

export async function deleteBackupFile(filename: string, passkey: string): Promise<{ message: string }> {
  return await apiRequest<{ message: string }>(`/admin/backups/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    body: JSON.stringify({ passkey }),
  });
}

export async function restoreBackupFile(filename: string, passkey: string): Promise<{ message: string; metadata?: any }> {
  return await apiRequest<{ message: string; metadata?: any }>(`/admin/backups/${encodeURIComponent(filename)}/restore`, {
    method: 'POST',
    body: JSON.stringify({ passkey }),
  });
}

export async function uploadAndRestoreBackup(file: File, passkey: string): Promise<{ message: string; metadata?: any }> {
  const token = getToken();
  const apiUrl = getApiUrl();
  const formData = new FormData();
  formData.append('backup_file', file);
  formData.append('passkey', passkey);

  const res = await fetch(`${apiUrl}/admin/backups/upload-restore`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Không thể phục hồi từ file tải lên' }));
    throw new Error(err.error || 'Phục hồi dữ liệu thất bại');
  }

  return await res.json();
}


