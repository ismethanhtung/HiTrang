import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User, UserCheck, GraduationCap, Eye, EyeOff, BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import { User as UserType } from '../types';
import { signUpUser, signInUser } from '../lib/supabaseService';

interface AuthProps {
  onLogin: (user: UserType) => void;
  initialRole?: 'teacher' | 'student';
}

export default function Auth({ onLogin, initialRole = 'student' }: AuthProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState<'teacher' | 'student'>(initialRole);
  
  // Fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim() || !password.trim()) {
      setError('Vui lòng điền đầy đủ thông tin đăng nhập.');
      return;
    }

    if (isRegister) {
      if (!name.trim()) {
        setError('Vui lòng nhập họ và tên.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không trùng khớp.');
        return;
      }
      if (password.length < 6) {
        setError('Mật khẩu phải chứa ít nhất 6 ký tự.');
        return;
      }

      setLoading(true);
      try {
        const newUser = await signUpUser(name.trim(), username.trim(), password, role);
        setSuccess('Đăng ký tài khoản thành công! Đang tự động đăng nhập...');
        setTimeout(() => {
          onLogin(newUser);
        }, 1500);
      } catch (err: any) {
        setError(err.message || 'Đã có lỗi xảy ra trong quá trình đăng ký.');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const loggedInUser = await signInUser(username.trim(), password);
        setSuccess('Đăng nhập thành công!');
        setTimeout(() => {
          onLogin(loggedInUser);
        }, 800);
      } catch (err: any) {
        setError(err.message || 'Tên đăng nhập hoặc mật khẩu không đúng.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div id="auth-container" className="min-h-screen flex items-center justify-center bg-[#fcfbfa] px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md bg-white border border-gray-100 rounded-2xl shadow-sm p-8"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 mb-4 border border-emerald-100/50">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Học Viện Tinh Tế
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Hệ thống quản lý và thực hiện bài kiểm tra hiện đại
          </p>
        </div>

        {/* Role Selection Tabs */}
        <div className="flex bg-[#fcfbfa] p-1 rounded-xl border border-gray-100/80 mb-6">
          <button
            type="button"
            id="tab-role-student"
            onClick={() => { setRole('student'); setError(''); }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
              role === 'student'
                ? 'bg-white text-slate-900 shadow-xs border border-gray-100'
                : 'text-gray-500 hover:text-slate-900'
            }`}
          >
            Học sinh
          </button>
          <button
            type="button"
            id="tab-role-teacher"
            onClick={() => { setRole('teacher'); setError(''); }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
              role === 'teacher'
                ? 'bg-white text-slate-900 shadow-xs border border-gray-100'
                : 'text-gray-500 hover:text-slate-900'
            }`}
          >
            Giáo viên (Admin)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-1.5"
            >
              <label className="text-xs font-medium text-gray-600">Họ và tên</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
                  <UserCheck className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  id="reg-name-input"
                  placeholder="Nhập họ và tên đầy đủ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25 transition-colors placeholder:text-gray-400"
                />
              </div>
            </motion.div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Tên đăng nhập (username)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                id="login-username-input"
                placeholder="Nhập tên tài khoản"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25 transition-colors placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Mật khẩu</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                id="login-password-input"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25 transition-colors placeholder:text-gray-400"
              />
              <button
                type="button"
                id="btn-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isRegister && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-1.5"
            >
              <label className="text-xs font-medium text-gray-600">Xác nhận mật khẩu</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="reg-confirm-password-input"
                  placeholder="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25 transition-colors placeholder:text-gray-400"
                />
              </div>
            </motion.div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-600 font-medium animate-pulse">
              {success}
            </div>
          )}

          <button
            type="submit"
            id="btn-submit-auth"
            disabled={loading}
            className={`w-full py-3 px-4 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-sm mt-2 flex items-center justify-center gap-2 ${
              loading 
                ? 'bg-emerald-400 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] shadow-emerald-600/10 hover:shadow-emerald-600/20'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <span>{isRegister ? 'Đăng ký tài khoản' : 'Đăng nhập'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
            <button
              type="button"
              id="btn-switch-auth-mode"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                setSuccess('');
              }}
              className="ml-1.5 text-emerald-600 font-medium hover:underline focus:outline-none"
            >
              {isRegister ? 'Đăng nhập ngay' : 'Đăng ký miễn phí'}
            </button>
          </p>
        </div>

        {/* Demo Guide Footer Info */}
        <div className="mt-8 p-3.5 bg-slate-50/50 rounded-xl border border-dashed border-slate-200/60 text-[11px] text-slate-500 leading-relaxed text-center">
          <span className="font-semibold text-slate-700 block mb-0.5">💡 Tài khoản thử nghiệm:</span>
          <span>Bấm <strong>Đăng nhập</strong> ngay để vào thẳng hệ thống bằng tài khoản mẫu.</span>
        </div>
      </motion.div>
    </div>
  );
}
