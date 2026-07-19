import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { 
  Plus, 
  BookOpen, 
  Users, 
  BarChart3, 
  Clock, 
  PlusCircle, 
  Trash2, 
  Check, 
  ChevronRight, 
  Search, 
  Sparkles,
  HelpCircle,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { Quiz, Question, Submission, User } from '../types';
import { SYSTEM_CHART_DATA, STUDENT_LIST } from '../data';

interface AdminDashboardProps {
  quizzes: Quiz[];
  submissions: Submission[];
  onAddQuiz: (newQuiz: Quiz) => void;
  onDeleteQuiz: (quizId: string) => void;
  activeTab: string;
}

export default function AdminDashboard({
  quizzes,
  submissions,
  onAddQuiz,
  onDeleteQuiz,
  activeTab
}: AdminDashboardProps) {
  
  // Quiz creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizDesc, setNewQuizDesc] = useState('');
  const [newQuizSubject, setNewQuizSubject] = useState('Toán học');
  const [newQuizDuration, setNewQuizDuration] = useState(15);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Current question builder state
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);
  const [qPoints, setQPoints] = useState(2.5);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Add question to temporary builder list
  const handleAddQuestion = () => {
    if (!qText.trim()) return;
    if (qOptions.some(opt => !opt.trim())) return;

    const newQuestion: Question = {
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      text: qText.trim(),
      options: [...qOptions],
      correctAnswerIndex: qCorrect,
      points: qPoints
    };

    setQuestions([...questions, newQuestion]);
    // Reset question inputs
    setQText('');
    setQOptions(['', '', '', '']);
    setQCorrect(0);
  };

  // Submit the completed quiz
  const handleSaveQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuizTitle.trim()) return;
    if (questions.length === 0) {
      alert('Vui lòng thêm ít nhất một câu hỏi cho đề thi!');
      return;
    }

    const newQuiz: Quiz = {
      id: 'quiz_' + Date.now(),
      title: newQuizTitle.trim(),
      description: newQuizDesc.trim() || 'Không có mô tả.',
      subject: newQuizSubject,
      duration: Number(newQuizDuration),
      questions: [...questions],
      createdAt: new Date().toISOString().split('T')[0]
    };

    onAddQuiz(newQuiz);
    
    // Reset all forms
    setNewQuizTitle('');
    setNewQuizDesc('');
    setNewQuizSubject('Toán học');
    setNewQuizDuration(15);
    setQuestions([]);
    setShowCreateModal(false);
  };

  // Compute stats
  const totalQuizzes = quizzes.length;
  const totalSubmissions = submissions.length;
  const avgScore = totalSubmissions > 0 
    ? (submissions.reduce((acc, curr) => acc + curr.score, 0) / totalSubmissions).toFixed(1)
    : '0.0';

  // Render components based on activeTab
  return (
    <div className="flex-1 overflow-y-auto bg-bg-base dark:bg-bg-base text-text-primary min-h-screen transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header Title Block */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Tổng quan Hệ thống</h2>
                <p className="text-xs text-gray-500 mt-1">Báo cáo hiệu suất kiểm tra và hoạt động nộp bài của học sinh.</p>
              </div>
              <button
                type="button"
                id="btn-add-quiz-shortcut"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all duration-200 shadow-xs active:scale-98 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Đề kiểm tra mới</span>
              </button>
            </div>

            {/* Metrics cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-100 p-5 rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Tổng số Đề thi</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalQuizzes}</h3>
                  <div className="text-[10px] text-brand-600 font-medium mt-1.5 flex items-center gap-1">
                    <span>Mới cập nhật tháng này</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-gray-100 p-5 rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Lượt nộp bài</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalSubmissions}</h3>
                  <div className="text-[10px] text-brand-600 font-medium mt-1.5 flex items-center gap-1">
                    <span>+15% so với tuần trước</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-gray-100 p-5 rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Điểm trung bình</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{avgScore}/10</h3>
                  <div className="text-[10px] text-brand-600 font-medium mt-1.5 flex items-center gap-1">
                    <span>Đạt ngưỡng giỏi (Khá)</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-gray-100 p-5 rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Tỷ lệ Hoàn thành</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">92.4%</h3>
                  <div className="text-[10px] text-brand-600 font-medium mt-1.5 flex items-center gap-1">
                    <span>95% học sinh tham gia đầy đủ</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Chart and Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Visual Performance Chart */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs lg:col-span-2 flex flex-col justify-between">
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-slate-900 tracking-tight">Xu hướng Nộp bài & Hiệu suất</h4>
                  <p className="text-[11px] text-gray-500">Thống kê theo từng tháng của kỳ học năm 2026</p>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={SYSTEM_CHART_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: 'none', 
                          borderRadius: '8px', 
                          color: '#fff',
                          fontSize: '11px',
                          fontFamily: 'Inter, sans-serif'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="submissions" 
                        stroke="#10b981" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#colorSubmissions)" 
                        name="Số bài nộp"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Activity Card */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs flex flex-col">
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-slate-900 tracking-tight">Lượt nộp bài gần đây</h4>
                  <p className="text-[11px] text-gray-500">Các học sinh vừa nộp bài kiểm tra</p>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto max-h-[260px] pr-1">
                  {submissions.slice().reverse().map((sub) => (
                    <div 
                      key={sub.id} 
                      className="p-3 bg-bg-base dark:bg-bg-card hover:bg-slate-50 dark:hover:bg-slate-800 border border-border-primary dark:border-slate-800/60 rounded-xl flex items-center justify-between transition-colors duration-150"
                    >
                      <div className="min-w-0 flex-1 mr-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-slate-800 truncate">{sub.studentName}</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-brand-50 text-brand-700 border border-brand-200/40 rounded-full font-medium shrink-0">
                            {sub.score >= 8.0 ? 'Giỏi' : sub.score >= 5.0 ? 'Đạt' : 'Cần cố gắng'}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 truncate mt-0.5">{sub.quizTitle}</p>
                        <p className="text-[9px] text-gray-400 mt-1">{sub.submittedAt}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-slate-900 bg-white border border-gray-100 px-2 py-1 rounded-lg">
                          {sub.score}/10
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: QUIZZES */}
        {activeTab === 'quizzes' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Hệ thống Đề thi ({quizzes.length})</h2>
                <p className="text-xs text-gray-500 mt-1">Danh sách đề thi đang mở. Bạn có thể xóa hoặc thiết kế thêm đề thi.</p>
              </div>
              <button
                type="button"
                id="btn-open-create-quiz"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all duration-200 shadow-xs active:scale-98 self-start sm:self-auto"
              >
                <PlusCircle className="w-4.5 h-4.5" />
                <span>Tạo đề kiểm tra mới</span>
              </button>
            </div>

            {/* Quizzes List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {quizzes.map((quiz) => (
                <div 
                  key={quiz.id}
                  className="bg-white border border-gray-100/80 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:border-brand-300/30 transition-all duration-200"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[9px] font-bold tracking-wider uppercase bg-brand-50 text-brand-700 border border-brand-200 px-2.5 py-1 rounded-md">
                        {quiz.subject}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        Ngày tạo: {quiz.createdAt}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 min-h-[40px]">
                      {quiz.title}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-3 mt-2 min-h-[48px]">
                      {quiz.description}
                    </p>

                    <div className="flex items-center gap-4 border-t border-b border-gray-50 py-2.5 my-4 text-[11px] text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{quiz.duration} phút</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-gray-400" />
                        <span>{quiz.questions.length} câu hỏi</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-700">
                      Tổng điểm: 10.0
                    </span>
                    <button
                      type="button"
                      id={`btn-delete-quiz-${quiz.id}`}
                      onClick={() => {
                        if (confirm('Bạn có chắc chắn muốn xóa đề thi này không?')) {
                          onDeleteQuiz(quiz.id);
                        }
                      }}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all duration-150"
                      title="Xóa đề thi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* TAB 3: STUDENTS PROGRESS */}
        {activeTab === 'students' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Theo dõi Tiến độ học sinh</h2>
              <p className="text-xs text-gray-500 mt-1">Danh sách học sinh trong lớp và báo cáo thành tích trung bình.</p>
            </div>

            {/* Search Input Bar */}
            <div className="relative max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Tìm học sinh, lớp, mã số..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-brand-300 transition-colors placeholder:text-gray-400 shadow-xs"
              />
            </div>

            {/* Students List Table */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-4 px-6">Học sinh</th>
                      <th className="py-4 px-6">Lớp</th>
                      <th className="py-4 px-6">Số bài đã nộp</th>
                      <th className="py-4 px-6">Điểm TB học tập</th>
                      <th className="py-4 px-6">Tiến độ thi thử</th>
                      <th className="py-4 px-6 text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs text-slate-700">
                    {STUDENT_LIST
                      .filter(st => st.name.toLowerCase().includes(searchTerm.toLowerCase()) || st.group.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((student) => {
                        const scoreColor = student.avgScore >= 8.0 
                          ? 'text-brand-600 bg-brand-50/50' 
                          : student.avgScore >= 5.0 
                            ? 'text-blue-600 bg-blue-50/50' 
                            : 'text-brand-600 bg-brand-50/50';
                        return (
                          <tr key={student.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                                  {student.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">{student.name}</p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">{student.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 font-medium text-slate-500">{student.group}</td>
                            <td className="py-4 px-6 font-semibold text-slate-800">{student.quizzesCount}</td>
                            <td className="py-4 px-6">
                              <span className={`px-2 py-1 rounded-lg font-bold text-[11px] ${scoreColor}`}>
                                {student.avgScore.toFixed(1)}/10
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="w-32">
                                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                                  <span>Độ chăm chỉ</span>
                                  <span>{Math.round((student.quizzesCount / totalQuizzes) * 100)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-brand-300 rounded-full" 
                                    style={{ width: `${(student.quizzesCount / totalQuizzes) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedStudent(student)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                              >
                                <span>Xem</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* MODAL 1: ADD NEW QUIZ */}
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black"
                onClick={() => setShowCreateModal(false)}
              />

              {/* Modal Body */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-2xl w-full max-w-2xl border border-gray-100 shadow-2xl p-6 sm:p-8 z-10 max-h-[90vh] overflow-y-auto"
              >
                <div className="mb-6">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Thiết kế Đề thi mới</h3>
                  <p className="text-xs text-gray-500 mt-1">Điền cấu hình tổng quát và thêm danh sách câu hỏi trắc nghiệm bên dưới.</p>
                </div>

                <form onSubmit={handleSaveQuiz} className="space-y-6">
                  {/* General Configs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Tên đề thi</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Kiểm tra Đọc hiểu Tập 2"
                        value={newQuizTitle}
                        onChange={(e) => setNewQuizTitle(e.target.value)}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-brand-300 transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Môn học</label>
                      <select
                        value={newQuizSubject}
                        onChange={(e) => setNewQuizSubject(e.target.value)}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-brand-300 bg-white transition-colors"
                      >
                        <option value="Toán học">Toán học</option>
                        <option value="Vật lý">Vật lý</option>
                        <option value="Hóa học">Hóa học</option>
                        <option value="Ngữ văn">Ngữ văn</option>
                        <option value="Tiếng Anh">Tiếng Anh</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-700">Mô tả bài kiểm tra</label>
                      <textarea
                        placeholder="Nội dung tóm tắt, mục đích hoặc lưu ý phòng thi..."
                        value={newQuizDesc}
                        onChange={(e) => setNewQuizDesc(e.target.value)}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-brand-300 h-20 resize-none transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Thời gian làm bài (Phút)</label>
                      <input
                        type="number"
                        min="5"
                        max="180"
                        value={newQuizDuration}
                        onChange={(e) => setNewQuizDuration(Number(e.target.value))}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-brand-300 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  {/* Temporary Question Builder Card */}
                  <div className="border-t border-gray-100 pt-6">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-4">
                      <span>🛠️ Trình xây dựng câu hỏi</span>
                      <span className="text-[10px] text-gray-400 font-normal">({questions.length} câu đã thêm)</span>
                    </h4>

                    <div className="bg-bg-base dark:bg-bg-card border border-border-primary dark:border-slate-800 p-4 rounded-2xl space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-700">Nội dung câu hỏi</label>
                        <input
                          type="text"
                          placeholder="Nhập nội dung câu hỏi trắc nghiệm..."
                          value={qText}
                          onChange={(e) => setQText(e.target.value)}
                          className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-brand-300 transition-colors"
                        />
                      </div>

                      {/* 4 Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {qOptions.map((opt, idx) => (
                          <div key={idx} className="space-y-1">
                            <label className="text-[10px] font-medium text-gray-500">Lựa chọn {String.fromCharCode(65 + idx)}</label>
                            <input
                              type="text"
                              placeholder={`Nội dung phương án ${String.fromCharCode(65 + idx)}`}
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...qOptions];
                                newOpts[idx] = e.target.value;
                                setQOptions(newOpts);
                              }}
                              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-brand-300 transition-colors"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Answer Configs Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-gray-500">Đáp án đúng</label>
                          <select
                            value={qCorrect}
                            onChange={(e) => setQCorrect(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none"
                          >
                            <option value={0}>Phương án A</option>
                            <option value={1}>Phương án B</option>
                            <option value={2}>Phương án C</option>
                            <option value={3}>Phương án D</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-gray-500">Số điểm của câu hỏi</label>
                          <input
                            type="number"
                            step="0.5"
                            value={qPoints}
                            onChange={(e) => setQPoints(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        id="btn-add-question-to-list"
                        onClick={handleAddQuestion}
                        className="w-full py-2 bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200/40 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Thêm câu hỏi này vào đề thi</span>
                      </button>
                    </div>
                  </div>

                  {/* Temporary Questions Queue Table */}
                  {questions.length > 0 && (
                    <div className="border border-gray-100 rounded-xl overflow-hidden text-xs">
                      <div className="bg-slate-50 p-2.5 font-bold text-gray-500 border-b border-gray-100 uppercase tracking-wider text-[10px]">
                        Hàng đợi câu hỏi ({questions.length} câu)
                      </div>
                      <div className="divide-y divide-gray-50">
                        {questions.map((q, qidx) => (
                          <div key={q.id} className="p-3 bg-white flex items-center justify-between">
                            <div className="min-w-0 flex-1 mr-4">
                              <p className="font-semibold text-slate-800 truncate">Câu {qidx + 1}: {q.text}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                Đáp án đúng: {String.fromCharCode(65 + q.correctAnswerIndex)} | Điểm: {q.points}đ
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setQuestions(questions.filter(item => item.id !== q.id))}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Modal Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      id="btn-close-create-quiz-modal"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-slate-50 transition-colors"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      id="btn-submit-save-quiz"
                      disabled={questions.length === 0}
                      className="px-4 py-2.5 bg-gradient-to-r from-brand-300 to-brand-400 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-white font-medium hover:opacity-95 shadow-xs transition-all rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Hoàn tất & Lưu Đề thi</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 2: STUDENT DETAIL CARD */}
        <AnimatePresence>
          {selectedStudent && (
            <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black"
                onClick={() => setSelectedStudent(null)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-2xl w-full max-w-md border border-gray-100 shadow-2xl p-6 sm:p-8 z-10"
              >
                <div className="text-center pb-4 border-b border-gray-100">
                  <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xl mx-auto border border-brand-200">
                    {selectedStudent.name.charAt(0)}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-3">{selectedStudent.name}</h3>
                  <p className="text-[10px] text-gray-400">@{selectedStudent.username} • Lớp {selectedStudent.group}</p>
                </div>

                <div className="py-4 space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Email học tập:</span>
                    <span className="font-semibold text-slate-800">{selectedStudent.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Số bài đã nộp:</span>
                    <span className="font-semibold text-slate-800">{selectedStudent.quizzesCount} / {totalQuizzes}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Điểm trung bình hệ thống:</span>
                    <span className="px-2 py-0.5 bg-brand-50 text-brand-700 font-bold rounded-md">
                      {selectedStudent.avgScore.toFixed(1)}/10
                    </span>
                  </div>

                  <div className="space-y-2 pt-2">
                    <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider text-gray-400">Kết quả chi tiết</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                      {submissions
                        .filter(sub => sub.studentId === selectedStudent.id)
                        .map(sub => (
                          <div key={sub.id} className="p-2.5 bg-bg-base dark:bg-bg-card border border-border-primary dark:border-slate-800 rounded-xl flex justify-between items-center">
                            <span className="truncate font-medium text-slate-700 max-w-[200px]">{sub.quizTitle}</span>
                            <span className="font-bold text-slate-900">{sub.score}/10</span>
                          </div>
                        ))}
                      {submissions.filter(sub => sub.studentId === selectedStudent.id).length === 0 && (
                        <p className="text-gray-400 italic text-center py-2">Chưa ghi nhận bài nộp nào.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="w-full py-2.5 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-gray-100 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Đóng cửa sổ
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
