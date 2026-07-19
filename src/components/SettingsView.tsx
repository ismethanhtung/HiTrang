import React, { useState } from 'react';
import { User, LogOut, Key, Globe, Shield, UserCheck, Loader2 } from 'lucide-react';
import { User as UserType } from '../types';
import { updateProfileName, updatePassword, signOutAllDevices } from '../lib/supabaseService';

interface SettingsViewProps {
  user: UserType;
  onUpdateUser: (updatedUser: UserType) => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
}

export default function SettingsView({ user, onUpdateUser, onLogout, theme }: SettingsViewProps) {
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

  return (
    <div className="flex-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-200 overflow-y-auto select-none">
      {/* Title Header */}
      <div className="max-w-4xl mx-auto pt-8 pb-6 px-6 border-b border-slate-100 dark:border-slate-800/80">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">My Profile</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Update your personal details and account information.
        </p>
      </div>

      {/* Main Settings Grid */}
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
    </div>
  );
}
