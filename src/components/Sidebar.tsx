import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    Flower,
    BarChart3,
    BookOpen,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    UserCheck,
    Calendar,
    Sparkles,
    Search,
} from "lucide-react";
import { User } from "../types";

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
    setIsOpen,
}: SidebarProps) {
    // Menu items for Teacher vs Student
    const teacherMenuItems = [
        { id: "overview", label: "Tổng quan", icon: BarChart3 },
        { id: "quizzes", label: "Quản lý Đề thi", icon: BookOpen },
        { id: "students", label: "Tiến độ Học sinh", icon: Users },
    ];

    const studentMenuItems = [
        { id: "student-dashboard", label: "Bảng điều khiển", icon: BarChart3 },
        { id: "student-quizzes", label: "Làm bài thi", icon: BookOpen },
        { id: "student-results", label: "Lịch sử học tập", icon: UserCheck },
    ];

    const menuItems =
        user.role === "teacher" ? teacherMenuItems : studentMenuItems;

    const handleTabClick = (tabId: string) => {
        setActiveTab(tabId);
        setIsOpen(false); // Close mobile sidebar on select
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-white border-r border-slate-100/85 py-6">
            {/* Brand Logo */}
            <div className="flex items-center gap-3 px-6 mb-6">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-100/40 to-pink-50/20 text-pink-500 flex items-center justify-center">
                    <Flower className="w-4.5 h-4.5 animate-pulse" />
                </div>
                <div>
                    <h1 className="text-sm font-bold text-slate-800 tracking-tight leading-tight">
                        Hi_Trang 🌸
                    </h1>
                    <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase mt-0.5 block">
                        {user.role === "teacher"
                            ? "Giáo viên Admin"
                            : "Học viên"}
                    </span>
                </div>
            </div>

            {/* Search Bar - styled exactly like reference */}
            <div className="px-4 mb-4">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                        <Search className="w-3.5 h-3.5" />
                    </span>
                    <input
                        type="text"
                        placeholder="Search..."
                        disabled
                        className="w-full pl-9 pr-4 py-1.5 bg-slate-50/30 border border-slate-100 rounded-lg text-xs focus:outline-none placeholder:text-slate-400 cursor-not-allowed"
                    />
                </div>
            </div>

            {/* Section Header */}
            <div className="px-6 py-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase flex items-center justify-between select-none">
                <span>{user.role === "teacher" ? "QUẢN TRỊ" : "CHUYÊN MỤC"}</span>
            </div>

            {/* Menu Options */}
            <nav className="w-full flex-1 space-y-0.5">
                {menuItems.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleTabClick(item.id)}
                            className={`w-full flex items-center gap-3 py-2.5 transition-all duration-150 ${
                                isActive
                                    ? "bg-pink-50/40 text-pink-600 font-semibold border-l-[3px] border-pink-500 pl-[21px] pr-4"
                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/60 pl-[24px] pr-4"
                            }`}
                        >
                            <IconComponent
                                className={`w-4.5 h-4.5 transition-colors ${isActive ? "text-pink-500" : "text-slate-400"}`}
                            />
                            <span className="text-xs">{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* User Information and Actions */}
            <div className="pt-6 border-t border-gray-100 mt-auto px-4 space-y-4">
                {/* User Card */}
                <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50/60 transition-all duration-150">
                    <div className="w-8.5 h-8.5 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center font-bold text-xs border border-pink-100/30">
                        {user.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                            {user.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            @{user.username}
                        </p>
                    </div>
                </div>

                {/* Logout Action */}
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50/40 transition-all duration-150"
                >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Đăng xuất</span>
                </button>

                {/* Version Info Footer */}
                <div className="text-center text-[9px] text-slate-300 font-medium select-none pt-2">
                    Hi_Trang + v1.0.0
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Header */}
            <header className="lg:hidden h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 z-30">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-500 border border-pink-100/40">
                        <Flower className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-900">
                        Hi_Trang 🌸
                    </span>
                </div>

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-1.5 rounded-lg border border-gray-100 hover:bg-slate-50 text-gray-500"
                >
                    {isOpen ? (
                        <X className="w-5 h-5" />
                    ) : (
                        <Menu className="w-5 h-5" />
                    )}
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
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{
                                type: "spring",
                                damping: 25,
                                stiffness: 220,
                            }}
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
