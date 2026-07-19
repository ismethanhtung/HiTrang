import React, { useState } from 'react';
import { User, LogOut, Key, Globe, Shield, UserCheck, Loader2 } from 'lucide-react';
import { User as UserType } from '../types';
import { updateProfileName, updatePassword, signOutAllDevices } from '../lib/supabaseService';

interface SettingsViewProps {
  user: UserType;
  onUpdateUser: (updatedUser: UserType) => void;
  onLogout: () => void;
}

export default function SettingsView({ user, onUpdateUser, onLogout }: SettingsViewProps) {
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
    <div className="flex-1 bg-white overflow-y-auto select-none">
      {/* Title Header */}
      <div className="max-w-4xl mx-auto pt-8 pb-6 px-6 border-b border-slate-100">
        <h1 className="text-xl font-semibold text-slate-900">My Profile</h1>
        <p className="text-xs text-slate-500 mt-1">
          Update your personal details and account information.
        </p>
      </div>

      {/* Main Settings Grid */}
      <div className="max-w-4xl mx-auto px-6 pb-20 divide-y divide-slate-100/70">
        
        {/* Profile Photo Row */}
        <div className="grid grid-cols-12 gap-6 py-6 items-center">
          <div className="col-span-12 md:col-span-4 space-y-1">
            <h4 className="text-sm font-semibold text-slate-800">Profile photo</h4>
            <p className="text-xs text-slate-400">Your avatar shown across the app.</p>
          </div>
          <div className="col-span-12 md:col-span-8 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-pink-50 text-pink-500 flex items-center justify-center font-bold text-lg border border-pink-100/30">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div className="text-xs text-slate-400 font-medium">
              {user.avatarUrl ? 'Liên kết qua tài khoản Google' : 'Đăng nhập thủ công (Mặc định)'}
            </div>
          </div>
        </div>

        {/* Full Name Row */}
        <div className="grid grid-cols-12 gap-6 py-6">
          <div className="col-span-12 md:col-span-4 space-y-1">
            <h4 className="text-sm font-semibold text-slate-800">Full name</h4>
            <p className="text-xs text-slate-400">Your display name across HiTrang.</p>
          </div>
          <div className="col-span-12 md:col-span-8 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 max-w-lg">
              <div className="flex-1 space-y-1">
                <span className="text-[10px] font-medium text-slate-400 uppercase">First name</span>
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-pink-500 focus:bg-white transition-all placeholder:text-slate-400"
                />
              </div>
              <div className="flex-1 space-y-1">
                <span className="text-[10px] font-medium text-slate-400 uppercase">Last name</span>
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-pink-500 focus:bg-white transition-all placeholder:text-slate-400"
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
              className="py-1.5 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {updatingName && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Lưu họ tên</span>
            </button>
          </div>
        </div>

        {/* Email Address Row */}
        <div className="grid grid-cols-12 gap-6 py-6">
          <div className="col-span-12 md:col-span-4 space-y-1">
            <h4 className="text-sm font-semibold text-slate-800">Email address (soon)</h4>
            <p className="text-xs text-slate-400">Used for notifications and login.</p>
          </div>
          <div className="col-span-12 md:col-span-8 flex items-center gap-3">
            <input
              type="text"
              readOnly
              value={user.avatarUrl ? 'Đăng nhập Google' : `${user.username}@hocvientinhte.edu.vn`}
              className="w-full max-w-xs px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-medium text-slate-400 select-none outline-none"
            />
            <button
              type="button"
              disabled
              className="py-2 px-3.5 bg-white border border-slate-200 text-slate-400 rounded-lg text-xs font-semibold cursor-not-allowed"
            >
              Change email
            </button>
          </div>
        </div>

        {/* Username Row */}
        <div className="grid grid-cols-12 gap-6 py-6">
          <div className="col-span-12 md:col-span-4 space-y-1">
            <h4 className="text-sm font-semibold text-slate-800">Username (soon)</h4>
            <p className="text-xs text-slate-400">Unique identifier in the platform.</p>
          </div>
          <div className="col-span-12 md:col-span-8">
            <input
              type="text"
              readOnly
              value={user.username}
              className="w-full max-w-xs px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-medium text-slate-400 select-none outline-none"
            />
          </div>
        </div>

        {/* Timezone Row */}
        <div className="grid grid-cols-12 gap-6 py-6">
          <div className="col-span-12 md:col-span-4 space-y-1">
            <h4 className="text-sm font-semibold text-slate-800">Timezone (soon)</h4>
            <p className="text-xs text-slate-400">Used for time-based alerts and reports.</p>
          </div>
          <div className="col-span-12 md:col-span-8">
            <input
              type="text"
              readOnly
              value="GMT+7 — Indochina Time"
              className="w-full max-w-xs px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-medium text-slate-400 select-none outline-none"
            />
          </div>
        </div>

        {/* ACCOUNT SECURITY SECTION */}
        <div className="pt-8 pb-4">
          <h3 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase select-none">
            ACCOUNT SECURITY
          </h3>
        </div>

        {/* Password Row */}
        <div className="grid grid-cols-12 gap-6 py-6">
          <div className="col-span-12 md:col-span-4 space-y-1">
            <h4 className="text-sm font-semibold text-slate-800">Password (soon)</h4>
            <p className="text-xs text-slate-400">Last changed 3 months ago.</p>
          </div>
          <div className="col-span-12 md:col-span-8 space-y-4">
            {!showPasswordForm ? (
              <div className="flex items-center gap-3">
                <input
                  type="password"
                  readOnly
                  value="••••••••••••"
                  className="w-full max-w-xs px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-medium text-slate-400 select-none outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordForm(true)}
                  className="py-2 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
                >
                  Change password
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdatePassword} className="space-y-3 max-w-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-slate-400 uppercase">Mật khẩu mới</span>
                  <input
                    type="password"
                    placeholder="Mật khẩu mới"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-pink-500 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-slate-400 uppercase">Xác nhận mật khẩu mới</span>
                  <input
                    type="password"
                    placeholder="Xác nhận mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-pink-500 focus:bg-white transition-all"
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
                    className="py-1.5 px-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center gap-1"
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
                    className="py-1.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-all"
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
            <h4 className="text-sm font-semibold text-slate-800">2-Step verification</h4>
            <p className="text-xs text-slate-400">Add an extra layer of security to your account during login.</p>
          </div>
          <div className="col-span-12 md:col-span-8">
            <button
              type="button"
              className="py-2 px-3.5 bg-white border border-slate-200 text-slate-400 rounded-lg text-xs font-semibold cursor-not-allowed"
            >
              Manage 2FA
            </button>
          </div>
        </div>

        {/* DANGER ZONE SECTION */}
        <div className="pt-8 pb-4">
          <h3 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase select-none">
            DANGER ZONE
          </h3>
        </div>

        {/* Log Out All Devices Row */}
        <div className="grid grid-cols-12 gap-6 py-6">
          <div className="col-span-12 md:col-span-4 space-y-1">
            <h4 className="text-sm font-semibold text-slate-800">Log out of all devices</h4>
            <p className="text-xs text-slate-400">Log out of all other active sessions on other devices besides this one.</p>
          </div>
          <div className="col-span-12 md:col-span-8 space-y-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSignOutAll}
                disabled={loggingOutAll}
                className="py-2 px-3.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {loggingOutAll && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Log out all</span>
              </button>
            </div>
            
            {globalError && (
              <div className="text-xs text-red-600 font-medium">{globalError}</div>
            )}

            <div className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-lg text-[10px] text-slate-400 font-medium max-w-md leading-relaxed">
              No session info yet. It will appear after you use the app.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
