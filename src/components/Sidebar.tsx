import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    Flower,
    LayoutDashboard,
    ClipboardList,
    Award,
    GraduationCap,
    Settings,
    LogOut,
    Menu,
    X,
    Calendar,
    Sparkles,
    Search,
    Globe,
    ChevronsUpDown,
    Sun,
    Moon,
} from "lucide-react";
import { User } from "../types";

interface SidebarProps {
    user: User;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onLogout: () => void;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    theme: "light" | "dark";
    setTheme: (theme: "light" | "dark") => void;
}

export default function Sidebar({
    user,
    activeTab,
    setActiveTab,
    onLogout,
    isOpen,
    setIsOpen,
    theme,
    setTheme,
}: SidebarProps) {
    const [showUserMenu, setShowUserMenu] = useState(false);

    // Menu items for Teacher vs Student
    const teacherMenuItems = [
        { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
        { id: "quizzes", label: "Quản lý Đề thi", icon: ClipboardList },
        { id: "students", label: "Tiến độ Học sinh", icon: GraduationCap },
    ];

    const studentMenuItems = [
        {
            id: "student-dashboard",
            label: "Bảng điều khiển",
            icon: LayoutDashboard,
        },
        { id: "student-quizzes", label: "Làm bài thi", icon: ClipboardList },
        { id: "student-results", label: "Lịch sử học tập", icon: Award },
    ];

    const menuItems =
        user.role === "teacher" ? teacherMenuItems : studentMenuItems;

    const handleTabClick = (tabId: string) => {
        setActiveTab(tabId);
        setIsOpen(false); // Close mobile sidebar on select
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-100/85 dark:border-slate-800/80 pt-6 pb-2.5 transition-colors duration-200">
            {/* Brand Logo */}
            <div className="px-6 mb-5 select-none">
                <h1 className="font-calligraphy text-4xl text-brand-300 tracking-wide">
                    HiTrang
                </h1>
            </div>

            {/* Search Bar - styled exactly like reference */}
            <div className="px-4 mb-4">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-black dark:text-slate-500 pointer-events-none">
                        <Search className="w-3.5 h-3.5" />
                    </span>
                    <input
                        type="text"
                        placeholder="Search..."
                        disabled
                        className="w-full pl-9 pr-4 py-1.5 bg-slate-50/30 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-lg text-xs focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 cursor-not-allowed text-slate-800 dark:text-slate-200"
                    />
                </div>
            </div>

            {/* Section Header */}
            <div className="px-6 py-2 text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase flex items-center justify-between select-none">
                <span>
                    {user.role === "teacher" ? "QUẢN TRỊ" : "CHUYÊN MỤC"}
                </span>
            </div>

            {/* Menu Options */}
            <nav className="w-full flex-1 space-y-1.5 px-3 select-none">
                {menuItems.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleTabClick(item.id)}
                            className={`w-full flex items-center gap-3 py-2 px-3.5 rounded-xl transition-all duration-150 cursor-pointer ${
                                isActive
                                    ? "bg-brand-50/70 dark:bg-brand-500/15 text-brand-500 dark:text-brand-300 font-semibold shadow-2xs"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50/40 dark:hover:bg-slate-800/40"
                            }`}
                        >
                            <IconComponent
                                className={`w-4 h-4 transition-colors ${isActive ? "text-brand-400 dark:text-brand-300" : "text-slate-450 dark:text-slate-550"}`}
                            />
                            <span className="text-xs">{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* User Information and Actions */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-auto px-2 relative">
                {/* Click outside backdrop */}
                {showUserMenu && (
                    <div
                        className="fixed inset-0 z-30 cursor-default"
                        onClick={() => setShowUserMenu(false)}
                    />
                )}

                {/* Popover Menu overlay */}
                <AnimatePresence>
                    {showUserMenu && (
                        <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            transition={{ duration: 0.12, ease: "easeOut" }}
                            className="absolute bottom-16 left-4 right-4 bg-white dark:bg-slate-800 border border-slate-100/90 dark:border-slate-700/80 rounded-xl shadow-lg dark:shadow-2xl p-1.5 z-40 space-y-0.5 flex flex-col select-none"
                        >
                            {/* Language selection item */}
                            <button
                                type="button"
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left cursor-pointer"
                            >
                                <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                <span className="flex-1">Ngôn ngữ</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                    Tiếng Việt
                                </span>
                            </button>

                            {/* Theme toggle item */}
                            <button
                                type="button"
                                onClick={() =>
                                    setTheme(
                                        theme === "light" ? "dark" : "light",
                                    )
                                }
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left cursor-pointer"
                            >
                                {theme === "light" ? (
                                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                                ) : (
                                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                                )}
                                <span className="flex-1">Giao diện</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                    {theme === "light" ? "Sáng" : "Tối"}
                                </span>
                            </button>

                            {/* Settings button */}
                            <button
                                type="button"
                                onClick={() => {
                                    setShowUserMenu(false);
                                    setActiveTab("settings");
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left cursor-pointer"
                            >
                                <Settings className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                <span>Cài đặt</span>
                            </button>

                            <div className="border-t border-slate-100/60 dark:border-slate-700/50 my-1" />

                            {/* Logout Action */}
                            <button
                                type="button"
                                onClick={() => {
                                    setShowUserMenu(false);
                                    onLogout();
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-500/10 dark:hover:bg-rose-500/15 transition-colors text-left cursor-pointer"
                            >
                                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                                <span>Đăng xuất</span>
                            </button>

                            <div className="border-t border-slate-100/60 dark:border-slate-700/50 my-1" />

                            {/* Version details */}
                            <div className="px-3 py-1.5 text-[9px] text-slate-300 dark:text-slate-500 font-semibold text-center">
                                HiTrang + v1.0.2
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* User Trigger Button */}
                <button
                    type="button"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-150 relative text-left outline-none cursor-pointer ${
                        showUserMenu
                            ? "bg-slate-50 dark:bg-slate-800"
                            : "hover:bg-slate-50/70 dark:hover:bg-slate-800/70"
                    }`}
                >
                    <div className="w-8.5 h-8.5 rounded-full overflow-hidden flex-shrink-0 bg-brand-50 dark:bg-brand-500/10 text-brand-500 dark:text-brand-400 flex items-center justify-center font-bold text-xs border border-brand-100/30 dark:border-brand-500/20">
                        {user.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt={user.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            user.name.charAt(0)
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
                            {user.name}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                            @{user.username}
                        </p>
                    </div>
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Header */}
            <header className="lg:hidden h-14 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between px-4 sticky top-0 z-30 transition-colors duration-200">
                <div className="flex items-center gap-2 select-none">
                    <span className="font-calligraphy text-2xl text-brand-300 tracking-wide">
                        HiTrang
                    </span>
                </div>

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 cursor-pointer"
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
