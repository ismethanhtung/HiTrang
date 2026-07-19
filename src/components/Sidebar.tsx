import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  BarChart3, 
  BookOpen, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  UserCheck, 
  Calendar,
  Sparkles
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ 
  user, 
  activeTab, 
  setActiveTab, 
  onLogout, 
  isOpen, 
  setIsOpen 
}: SidebarProps) {

  // Menu items for Teacher vs Student
  const teacherMenuItems = [
    { id: 'overview', label: 'Tổng quan', icon: BarChart3 },
    { id: 'quizzes', label: 'Quản lý Đề thi', icon: BookOpen },
    { id: 'students', label: 'Tiến độ Học sinh', icon: Users },
  ];

  const studentMenuItems = [
    { id: 'student-dashboard', label: 'Bảng điều khiển', icon: BarChart3 },
    { id: 'student-quizzes', label: 'Làm bài thi', icon: BookOpen },
    { id: 'student-results', label: 'Lịch sử học tập', icon: UserCheck },
  ];

  const menuItems = user.role === 'teacher' ? teacherMenuItems : studentMenuItems;

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsOpen(false); // Close mobile sidebar on select
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-100 py-6 px-4">
      {/* Brand Logo */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-900 tracking-tight leading-tight">
            Học Viện Tinh Tế
          </h1>
          <span className="text-[10px] text-gray-500 font-medium tracking-wide uppercase">
            {user.role === 'teacher' ? 'Giáo viên Admin' : 'Học viên'}
          </span>
        </div>
      </div>

      {/* Menu Options */}
      <nav className="flex-1 space-y-1 px-1">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-xs font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-slate-50 text-emerald-600 font-semibold border-l-2 border-emerald-500 pl-3'
                  : 'text-gray-500 hover:text-slate-900 hover:bg-slate-50/50 pl-3.5'
              }`}
            >
              <IconComponent className={`w-4.5 h-4.5 transition-colors ${isActive ? 'text-emerald-500' : 'text-gray-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Information and Actions */}
      <div className="pt-6 border-t border-gray-100 mt-auto px-1 space-y-4">
        {/* User Card */}
        <div className="flex items-center gap-3 p-2 bg-[#fcfbfa] border border-gray-100/60 rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm border border-emerald-100/40">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate leading-tight">
              {user.name}
            </p>
            <p className="text-[10px] text-gray-400 truncate mt-0.5">
              @{user.username}
            </p>
          </div>
        </div>

        {/* Logout Action */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50/40 transition-all duration-150"
        >
          <LogOut className="w-4.5 h-4.5 text-rose-500" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-900">Học Viện Tinh Tế</span>
        </div>
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-lg border border-gray-100 hover:bg-slate-50 text-gray-500"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Desktop Sidebar (Persistent) */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0 select-none">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer (Overlay) */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black z-40 lg:hidden"
            />
            {/* Sidebar Body */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-72 h-full z-50 lg:hidden shadow-xl"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
