import React, { useState } from 'react';
import { 
  User, LogOut, Key, Globe, Shield, UserCheck, Loader2, 
  Clock, BookOpen, ChevronLeft, CheckCircle2, History, Award, BookOpenCheck 
} from 'lucide-react';
import { User as UserType, Quiz, Submission } from '../types';
import { updateProfileName, updatePassword, signOutAllDevices } from '../lib/supabaseService';
import { renderMathHtml } from '../lib/math';

interface SettingsViewProps {
  user: UserType;
  onUpdateUser: (updatedUser: UserType) => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  submissions: Submission[];
  quizzes: Quiz[];
  initialTab?: 'profile' | 'history';
  onTabChange?: (tab: 'profile' | 'history') => void;
  onNavigate?: (path: string) => void;
}

export default function SettingsView({ user, onUpdateUser, onLogout, theme, submissions, quizzes, initialTab, onTabChange, onNavigate }: SettingsViewProps) {
  // Helper to split full name into first name and last name
  const parseName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) {
      return { firstName: '', lastName: fullName };
    }
    const lastName = parts.pop() || '';
    const firstName = parts.join(' ');
    return { firstName, lastName };
  };

  const initialName = parseName(user.name);
  const [firstName, setFirstName] = useState(initialName.firstName);
  const [lastName, setLastName] = useState(initialName.lastName);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI states
  const [updatingName, setUpdatingName] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'history'>(initialTab || 'profile');
  const [reviewSubmission, setReviewSubmission] = useState<Submission | null>(null);

  React.useEffect(() => {
    if (initialTab) {
      setActiveSettingsTab(initialTab);
    }
  }, [initialTab]);

  const handleTabClick = (tab: 'profile' | 'history') => {
    setActiveSettingsTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Helper functions
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const cleanTrueFalseQuestionText = (html: string) => {
    if (!html) return "";
    let clean = html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match) => {
        if (
            match.includes("Khẳng định") ||
            match.includes("Đúng") ||
            match.includes("Sai")
        ) {
            return "";
        }
        return match;
    });

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = clean;

    const items = Array.from(tempDiv.querySelectorAll("p, li, div"));
    items.forEach((item) => {
        const text = item.textContent?.trim() || "";
        if (/^[a-f][\)\.\:\-]/i.test(text)) {
            item.remove();
        }
    });

    return tempDiv.innerHTML;
  };
  
  // Feedback alerts
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [globalError, setGlobalError] = useState('');

  // Handle name update
  const handleUpdateName = async () => {
    setNameError('');
    setNameSuccess('');
    const newFullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
    
    if (!newFullName) {
      setNameError('Họ và tên không được để trống.');
      return;
    }

    setUpdatingName(true);
    try {
      await updateProfileName(user.id, newFullName);
      onUpdateUser({
        ...user,
        name: newFullName
      });
      setNameSuccess('Đã cập nhật họ tên thành công!');
    } catch (err: any) {
      setNameError(err.message || 'Lỗi khi cập nhật họ tên.');
    } finally {
      setUpdatingName(false);
    }
  };

  // Handle password update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (password.length < 6) {
      setPwdError('Mật khẩu phải chứa ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setPwdError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setUpdatingPassword(true);
    try {
      await updatePassword(password);
      setPwdSuccess('Đổi mật khẩu thành công!');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => setShowPasswordForm(false), 2000);
    } catch (err: any) {
      setPwdError(err.message || 'Lỗi khi cập nhật mật khẩu.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Handle global sign out
  const handleSignOutAll = async () => {
    if (!confirm('Bạn có chắc chắn muốn đăng xuất khỏi tất cả các thiết bị khác?')) {
      return;
    }
    setGlobalError('');
    setLoggingOutAll(true);
    try {
      await signOutAllDevices();
      alert('Đăng xuất thành công khỏi tất cả thiết bị. Bạn sẽ được chuyển về trang đăng nhập.');
      onLogout();
    } catch (err: any) {
      setGlobalError(err.message || 'Không thể đăng xuất khỏi các thiết bị.');
    } finally {
      setLoggingOutAll(false);
    }
  };

  if (reviewSubmission) {
    const quiz = quizzes.find(q => q.id === reviewSubmission.quizId);
    
    // Determine number of correct questions
    const correctAnswersCount = quiz ? quiz.questions.filter((q) => {
        const chosen = reviewSubmission.answers[q.id];
        if (!q.type || q.type === 'single_choice') {
            return chosen !== undefined && chosen === q.correctAnswerIndex;
        } else if (q.type === 'true_false') {
            const correctTf = q.correctAnswers || [false, false, false, false];
            const studentTf = (chosen as (boolean | null)[]) || [null, null, null, null];
            return q.options.every((_, oIdx) => studentTf[oIdx] === correctTf[oIdx]);
        } else if (q.type === 'short_answer') {
            return String(chosen || "").trim().toLowerCase() === String(q.shortAnswerKey || "").trim().toLowerCase();
        }
        return false;
    }).length : 0;

    return (
      <div className="flex-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-200 overflow-y-auto select-none p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          {quiz ? (
            <>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold bg-[#2B5467]/10 text-[#2B5467] px-2 py-0.5 rounded uppercase tracking-wider">
                      Chi tiết bài thi
                    </span>
                    <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-350 px-2 py-0.5 rounded uppercase">
                      {quiz.subject}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2">
                    {reviewSubmission.quizTitle}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-455 mt-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Nộp bài lúc: {reviewSubmission.submittedAt}
                  </p>
                </div>
                <div className="flex items-center gap-6 self-stretch md:self-auto justify-between border-t md:border-t-0 border-slate-100 dark:border-slate-700 pt-4 md:pt-0">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center bg-brand-50 dark:bg-brand-500/10 text-[#2B5467] dark:text-brand-400 w-14 h-14 rounded-full border border-brand-200 dark:border-brand-500/30 shadow-2xs">
                      <span className="text-base font-extrabold leading-none">
                        {reviewSubmission.score}
                      </span>
                      <span className="text-[7px] font-bold text-slate-400 mt-0.5">ĐIỂM</span>
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-slate-800 dark:text-slate-200">Kết quả bài làm</div>
                      <div className="text-slate-500 dark:text-slate-455 text-[11px] mt-0.5">
                        {correctAnswersCount} / {quiz.questions.length} câu đúng
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReviewSubmission(null)}
                    className="px-3.5 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-all shadow-3xs cursor-pointer active:scale-95 flex items-center gap-1 flex-shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Quay lại</span>
                  </button>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-6">
                {quiz.questions.map((q, qIndex) => {
                  const chosen = reviewSubmission.answers[q.id];
                  
                  // Determine grading accuracy
                  let isQCorrect = false;
                  let isQPartial = false;
                  let tfStatusList: { text: string; correct: boolean; studentVal: boolean | null; correctVal: boolean }[] = [];
                  
                  if (!q.type || q.type === 'single_choice') {
                    isQCorrect = chosen !== undefined && chosen === q.correctAnswerIndex;
                  } else if (q.type === 'true_false') {
                    const correctTf = q.correctAnswers || [false, false, false, false];
                    const studentTf = (chosen as (boolean | null)[]) || [null, null, null, null];
                    
                    let matchCount = 0;
                    tfStatusList = q.options.map((opt, oIdx) => {
                      const sVal = studentTf[oIdx];
                      const cVal = correctTf[oIdx];
                      const match = sVal === cVal;
                      if (match) matchCount++;
                      return {
                        text: opt,
                        correct: match,
                        studentVal: sVal,
                        correctVal: cVal
                      };
                    });
                    
                    isQCorrect = matchCount === 4;
                    isQPartial = matchCount > 0 && matchCount < 4;
                  } else if (q.type === 'short_answer') {
                    const cKey = (q.shortAnswerKey || "").trim().toLowerCase();
                    const sKey = String(chosen || "").trim().toLowerCase();
                    isQCorrect = cKey && sKey === cKey;
                  }

                  // Determine card border accent style
                  let cardAccentClass = "border-l-4 border-l-rose-500";
                  let statusBadgeClass = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50";
                  let statusText = "Sai";
                  
                  if (isQCorrect) {
                    cardAccentClass = "border-l-4 border-l-emerald-500";
                    statusBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50";
                    statusText = "Đúng";
                  } else if (isQPartial) {
                    cardAccentClass = "border-l-4 border-l-amber-500";
                    statusBadgeClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50";
                    statusText = "Đúng một phần";
                  }

                  const displayQuestionText = q.type === 'true_false' 
                    ? cleanTrueFalseQuestionText(q.text) 
                    : q.text;

                  return (
                    <div key={q.id} className={`bg-white dark:bg-slate-800/50 border-y border-r border-slate-200 dark:border-slate-700/80 ${cardAccentClass} rounded-xl p-5 space-y-4 shadow-3xs`}>
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold text-brand-700 bg-brand-100 dark:bg-brand-500/20 dark:text-brand-400 px-2 py-0.5 rounded">
                            Câu {qIndex + 1}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                            q.type === "true_false"
                              ? "bg-amber-50 text-amber-800 border-amber-250 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50"
                              : q.type === "short_answer"
                              ? "bg-purple-50 text-purple-800 border-purple-250 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50"
                              : "bg-sky-50 text-sky-800 border-sky-250 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/50"
                          }`}>
                            {q.type === "true_false"
                              ? "Đúng / Sai"
                              : q.type === "short_answer"
                              ? "Điền đáp án"
                              : "Trắc nghiệm"}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${statusBadgeClass}`}>
                          {statusText}
                        </span>
                      </div>

                      {/* Question text */}
                      <div 
                        className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 leading-relaxed overflow-x-auto [&_img]:mx-auto [&_img]:block [&_img]:my-4" 
                        dangerouslySetInnerHTML={{ __html: renderMathHtml(displayQuestionText) }} 
                      />

                      {/* 1. Single Choice Options Review */}
                      {(!q.type || q.type === 'single_choice') && (
                        <div className="space-y-2.5">
                          {q.options.map((opt, oIdx) => {
                            const isChosen = chosen === oIdx;
                            const isCorrectOpt = q.correctAnswerIndex === oIdx;
                            const cleanedOpt = opt.replace(/^\s*[a-f][\)\.\:\-]\s*/i, "");
                            
                            let cardStyle = "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300";
                            let badge = null;
                            
                            if (isCorrectOpt) {
                              cardStyle = "border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/15 text-emerald-800 dark:text-emerald-400";
                              badge = <span className="text-[9px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded ml-auto">Đáp án đúng</span>;
                            } else if (isChosen && !isCorrectOpt) {
                              cardStyle = "border-rose-300 dark:border-rose-800/80 bg-rose-50/20 dark:bg-rose-950/15 text-rose-800 dark:text-rose-400";
                              badge = <span className="text-[9px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded ml-auto">Lựa chọn của bạn</span>;
                            } else if (isChosen) {
                              badge = <span className="text-[9px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded ml-auto">Lựa chọn của bạn</span>;
                            }

                            return (
                              <div key={oIdx} className={`flex items-center gap-3 p-3 border rounded-lg text-xs font-medium ${cardStyle}`}>
                                <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                                  isCorrectOpt ? "bg-emerald-500 text-white" : isChosen ? "bg-rose-50 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                }`}>
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span className="[&_img]:mx-auto [&_img]:block [&_img]:my-2" dangerouslySetInnerHTML={{ __html: renderMathHtml(cleanedOpt) }} />
                                {badge}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 2. True/False Statement Grid Review */}
                      {q.type === 'true_false' && (
                        <div className="space-y-2.5">
                          {tfStatusList.map((item, oIdx) => {
                            const sText = item.studentVal === null ? "Chưa chọn" : item.studentVal ? "Đúng" : "Sai";
                            const cText = item.correctVal ? "Đúng" : "Sai";
                            const cleanedOpt = item.text.replace(/^\s*[a-f][\)\.\:\-]\s*/i, "");

                            return (
                              <div key={oIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-700/80 rounded-lg text-xs">
                                <div className="font-medium text-slate-800 dark:text-slate-200 flex gap-2 [&_img]:mx-auto [&_img]:block [&_img]:my-2">
                                  <span className="font-extrabold text-slate-500">{String.fromCharCode(97 + oIdx)})</span>
                                  <span dangerouslySetInnerHTML={{ __html: renderMathHtml(cleanedOpt) }} />
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                    item.studentVal === null
                                      ? "bg-slate-200 text-slate-600 border border-slate-300"
                                      : item.correct
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400"
                                      : "bg-rose-100 text-rose-800 border border-rose-250 dark:bg-rose-950/20 dark:text-rose-400"
                                  }`}>
                                    Bạn chọn: {sText}
                                  </span>
                                  <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-250 dark:bg-emerald-950/10 dark:text-emerald-400">
                                    Đáp án: {cText}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 3. Short Answer Review */}
                      {q.type === 'short_answer' && (
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-700 rounded-lg flex flex-wrap gap-4 text-xs font-semibold">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Đáp án của bạn:</span>
                            <span className={`px-2.5 py-0.5 rounded font-extrabold ${
                              isQCorrect ? "bg-emerald-100 text-emerald-800 border border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400" : "bg-rose-100 text-rose-800 border border-rose-250 dark:bg-rose-950/20 dark:text-rose-400"
                            }`}>
                              {chosen !== undefined && chosen !== "" ? String(chosen) : "(Để trống)"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                            <span className="text-slate-500">Đáp án đúng:</span>
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-250 dark:bg-emerald-950/10 dark:text-emerald-400 px-2.5 py-0.5 rounded font-extrabold">
                              {q.shortAnswerKey}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Rich HTML Explanation */}
                      {q.explanation && (
                        <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/60 rounded-lg p-4 text-xs space-y-2 mt-4">
                          <div className="flex items-center gap-1.5 text-[#2B5467] dark:text-brand-400 font-extrabold">
                            <BookOpen className="w-4 h-4 text-[#2B5467] dark:text-brand-400" />
                            <span>Lời giải chi tiết:</span>
                          </div>
                          <div className="text-slate-700 dark:text-slate-300 overflow-x-auto leading-relaxed pl-5 border-l-2 border-[#2B5467]/30 dark:border-brand-500/30 [&_img]:mx-auto [&_img]:block [&_img]:my-4" dangerouslySetInnerHTML={{ __html: renderMathHtml(q.explanation) }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-gray-400 italic">
              Không tìm thấy dữ liệu đề thi tương ứng.
            </div>
          )}
        </div>
      </div>
    );
  }

  const userSubmissions = submissions
    .filter((sub) => sub.studentId === user.id)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  return (
    <div className="flex-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-200 overflow-y-auto select-none">
      {/* Title Header with Tabs */}
      <div className="max-w-4xl mx-auto pt-8 pb-6 px-6 border-b border-slate-100 dark:border-slate-800/80">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Cài đặt cá nhân</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Cập nhật thông tin tài khoản và xem lại các đề thi đã hoàn thành.
        </p>

        {/* Tabs navigation */}
        <div className="flex gap-6 mt-6 border-b border-slate-100 dark:border-slate-800/50">
          <button
            onClick={() => handleTabClick('profile')}
            className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
              activeSettingsTab === 'profile'
                ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            Hồ sơ cá nhân
          </button>
          <button
            onClick={() => handleTabClick('history')}
            className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer flex items-center gap-1.5 ${
              activeSettingsTab === 'history'
                ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Lịch sử làm bài</span>
          </button>
        </div>
      </div>

      {activeSettingsTab === 'profile' ? (
        /* Main Settings Grid */
        <div className="max-w-4xl mx-auto px-6 pb-20 divide-y divide-slate-100/70 dark:divide-slate-800/80">
        
        {/* Profile Photo Row */}
        <div className="grid grid-cols-12 gap-6 py-6 items-center">
          <div className="col-span-12 md:col-span-4 space-y-1">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Profile photo</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500">Your avatar shown across the app.</p>
          </div>
          <div className="col-span-12 md:col-span-8 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-brand-50 dark:bg-brand-500/10 text-brand-500 dark:text-brand-400 flex items-center justify-center font-bold text-lg border border-brand-100/30 dark:border-brand-500/20">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-550 font-medium">
              {user.avatarUrl ? 'Liên kết qua tài khoản Google' : 'Đăng nhập thủ công (Mặc định)'}
            </div>
          </div>
        </div>

        {/* Full Name Row */}
        <div className="grid grid-cols-12 gap-6 py-6">
          <div className="col-span-12 md:col-span-4 space-y-1">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Full name</h4>
            <p className="text-xs text-slate-400 dark:text-slate-550">Your display name across HiTrang.</p>
          </div>
          <div className="col-span-12 md:col-span-8 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 max-w-lg">
              <div className="flex-1 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">First name</span>
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-400 focus:bg-white dark:focus:bg-slate-800/80 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-550"
                />
              </div>
              <div className="flex-1 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Last name</span>
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-400 focus:bg-white dark:focus:bg-slate-800/80 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-550"
                />
              </div>
            </div>

            {nameError && (
              <div className="text-xs text-red-600 font-medium">{nameError}</div>
            )}
            {nameSuccess && (
              <div className="text-xs text-emerald-600 font-medium">{nameSuccess}</div>
            )}

            <button
              type="button"
              onClick={handleUpdateName}
              disabled={updatingName}
              className="py-1.5 px-3.5 bg-slate-950 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {updatingName && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Lưu họ tên</span>
            </button>
          </div>
        </div>

        {/* Email Address Row */}
        <div className="grid grid-cols-12 gap-6 py-6">
          <div className="col-span-12 md:col-span-4 space-y-1">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Email address (soon)</h4>
            <p className="text-xs text-slate-400 dark:text-slate-550">Used for notifications and login.</p>
          </div>
          <div className="col-span-12 md:col-span-8 flex items-center gap-3">
            <input
              type="text"
              readOnly
              value={user.avatarUrl ? 'Đăng nhập Google' : `${user.username}@hocvientinhte.edu.vn`}
              className="w-full max-w-xs px-3.5 py-2 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-450 dark:text-slate-500 select-none outline-none"
            />
            <button
              type="button"
              disabled
              className="py-2 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 rounded-lg text-xs font-semibold cursor-not-allowed"
            >
              Change email
            </button>
          </div>
        </div>

        {/* Username Row */}
        <div className="grid grid-cols-12 gap-6 py-6">
          <div className="col-span-12 md:col-span-4 space-y-1">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Username (soon)</h4>
            <p className="text-xs text-slate-400 dark:text-slate-550">Unique identifier in the platform.</p>
          </div>
          <div className="col-span-12 md:col-span-8">
            <input
              type="text"
              readOnly
              value={user.username}
              className="w-full max-w-xs px-3.5 py-2 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-450 dark:text-slate-500 select-none outline-none"
            />
          </div>
        </div>

        {/* Timezone Row */}
        <div className="grid grid-cols-12 gap-6 py-6">
          <div className="col-span-12 md:col-span-4 space-y-1">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Timezone (soon)</h4>
            <p className="text-xs text-slate-400 dark:text-slate-550">Used for time-based alerts and reports.</p>
          </div>
          <div className="col-span-12 md:col-span-8">
            <input
              type="text"
              readOnly
              value="GMT+7 — Indochina Time"
              className="w-full max-w-xs px-3.5 py-2 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-450 dark:text-slate-500 select-none outline-none"
            />
          </div>
        </div>

        {/* DESIGN SYSTEM SECTION */}
        <div className="pt-8 pb-4">
          <h3 className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase select-none">
            SYSTEM COLOR PALETTE
          </h3>
        </div>

        {/* Brand Colors Row */}
        <div className="grid grid-cols-12 gap-6 py-6">
          <div className="col-span-12 md:col-span-4 space-y-1">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Màu thương hiệu</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500">Bộ màu Soft Teal & Sage tươi mát, tự nhiên, tối giản và thanh lịch.</p>
          </div>
          <div className="col-span-12 md:col-span-8 space-y-3">
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {[
                { name: 'brand-50', hex: '#F0F6F3', bg: 'bg-brand-50' },
                { name: 'brand-100', hex: '#E1ECE7', bg: 'bg-brand-100' },
                { name: 'brand-200', hex: '#C8D9D2', bg: 'bg-brand-200' },
                { name: 'brand-300', hex: '#88BDA4', bg: 'bg-brand-300', active: true },
                { name: 'brand-400', hex: '#659287', bg: 'bg-brand-400' },
                { name: 'brand-500', hex: '#4B726B', bg: 'bg-brand-500' },
                { name: 'brand-600', hex: '#395953', bg: 'bg-brand-600' },
                { name: 'brand-700', hex: '#28403C', bg: 'bg-brand-700' },
              ].map((color) => (
                <div key={color.name} className="flex flex-col items-center gap-1">
                  <div className={`w-full h-10 rounded-lg ${color.bg} border border-slate-100 dark:border-slate-800 shadow-2xs relative`}>
                    {color.active && (
                      <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-white uppercase tracking-wider drop-shadow-xs">Active</span>
                    )}
                  </div>
                  <span className="text-[9px] font-semibold text-slate-700 dark:text-slate-350">{color.name}</span>
                  <span className="text-[8px] text-slate-400 dark:text-slate-500">{color.hex}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Semantic Colors Row */}
        <div className="grid grid-cols-12 gap-6 py-6">
          <div className="col-span-12 md:col-span-4 space-y-1">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Màu thích ứng giao diện</h4>
            <p className="text-xs text-slate-400 dark:text-slate-550">Các thẻ màu tự động điều chỉnh linh hoạt theo giao diện Sáng / Tối.</p>
          </div>
          <div className="col-span-12 md:col-span-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Base Background', className: 'bg-bg-base text-text-primary border border-border-secondary dark:border-slate-800', desc: 'Nền cơ sở' },
                { label: 'Surface Background', className: 'bg-bg-surface text-text-primary border border-border-primary dark:border-slate-800', desc: 'Nền bề mặt' },
                { label: 'Card Background', className: 'bg-bg-card text-text-primary border border-border-secondary dark:border-slate-850 shadow-2xs', desc: 'Nền thẻ' },
                { label: 'Primary Text', className: 'bg-bg-base text-text-primary border border-border-primary dark:border-slate-800 font-bold', desc: 'Chữ chính' },
              ].map((item, idx) => (
                <div key={idx} className={`p-3 rounded-lg text-center ${item.className} flex flex-col items-center justify-center gap-1 min-h-[70px]`}>
                  <span className="text-[9px] font-semibold leading-tight">{item.label}</span>
                  <span className="text-[8px] opacity-75">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ACCOUNT SECURITY SECTION */}
        <div className="pt-8 pb-4">
          <h3 className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase select-none">
            ACCOUNT SECURITY
          </h3>
        </div>

        {/* Password Row */}
        <div className="grid grid-cols-12 gap-6 py-6">
          <div className="col-span-12 md:col-span-4 space-y-1">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Password (soon)</h4>
            <p className="text-xs text-slate-400 dark:text-slate-550">Last changed 3 months ago.</p>
          </div>
          <div className="col-span-12 md:col-span-8 space-y-4">
            {!showPasswordForm ? (
              <div className="flex items-center gap-3">
                <input
                  type="password"
                  readOnly
                  value="••••••••••••"
                  className="w-full max-w-xs px-3.5 py-2 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-450 dark:text-slate-550 select-none outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordForm(true)}
                  className="py-2 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
                >
                  Change password
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdatePassword} className="space-y-3 max-w-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Mật khẩu mới</span>
                  <input
                    type="password"
                    placeholder="Mật khẩu mới"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-400 focus:bg-white dark:focus:bg-slate-800/80 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Xác nhận mật khẩu mới</span>
                  <input
                    type="password"
                    placeholder="Xác nhận mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-400 focus:bg-white dark:focus:bg-slate-800/80 transition-all"
                  />
                </div>

                {pwdError && (
                  <div className="text-xs text-red-600 font-medium">{pwdError}</div>
                )}
                {pwdSuccess && (
                  <div className="text-xs text-emerald-600 font-medium">{pwdSuccess}</div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="py-1.5 px-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    {updatingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Lưu mật khẩu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPwdError('');
                      setPwdSuccess('');
                    }}
                    className="py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* 2-Step Verification Row */}
        <div className="grid grid-cols-12 gap-6 py-6">
          <div className="col-span-12 md:col-span-4 space-y-1">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">2-Step verification</h4>
            <p className="text-xs text-slate-400 dark:text-slate-550">Add an extra layer of security to your account during login.</p>
          </div>
          <div className="col-span-12 md:col-span-8">
            <button
              type="button"
              className="py-2 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-450 dark:text-slate-500 rounded-lg text-xs font-semibold cursor-not-allowed"
            >
              Manage 2FA
            </button>
          </div>
        </div>

        {/* DANGER ZONE SECTION */}
        <div className="pt-8 pb-4">
          <h3 className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase select-none">
            DANGER ZONE
          </h3>
        </div>

        {/* Log Out All Devices Row */}
        <div className="grid grid-cols-12 gap-6 py-6">
          <div className="col-span-12 md:col-span-4 space-y-1">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Log out of all devices</h4>
            <p className="text-xs text-slate-400 dark:text-slate-550">Log out of all other active sessions on other devices besides this one.</p>
          </div>
          <div className="col-span-12 md:col-span-8 space-y-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSignOutAll}
                disabled={loggingOutAll}
                className="py-2 px-3.5 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {loggingOutAll && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Log out all</span>
              </button>
            </div>
            
            {globalError && (
              <div className="text-xs text-red-600 font-medium">{globalError}</div>
            )}

            <div className="p-3.5 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/50 rounded-lg text-[10px] text-slate-400 dark:text-slate-500 font-medium max-w-md leading-relaxed">
              No session info yet. It will appear after you use the app.
            </div>
          </div>
        </div>
      </div>
      ) : (
        /* History tab content */
        <div className="max-w-4xl mx-auto px-6 py-6 pb-20">
          {userSubmissions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-805/40 rounded-xl space-y-3">
              <BookOpenCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">Bạn chưa thực hiện bài thi nào.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {userSubmissions.map((sub) => {
                // Determine pill color depending on score
                let scoreColor = "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50";
                if (sub.score >= 8) {
                  scoreColor = "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50";
                } else if (sub.score >= 5) {
                  scoreColor = "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50";
                }

                return (
                  <div key={sub.id} className="bg-white dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:border-slate-350 dark:hover:border-slate-700 shadow-3xs">
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200">
                        {sub.quizTitle}
                      </h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-450">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-450" />
                          Nộp: {sub.submittedAt}
                        </span>
                        {sub.timeSpent !== undefined && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-450" />
                            Thời gian: {formatTime(sub.timeSpent)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between border-t sm:border-t-0 border-slate-100 dark:border-slate-700 pt-3 sm:pt-0">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${scoreColor}`}>
                        {sub.score} / 10
                      </span>
                      <button
                        type="button"
                        onClick={() => { if (onNavigate) onNavigate("/result/" + sub.id); }}
                        className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
                      >
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
