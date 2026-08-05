import React, { useState } from "react";
import { User, UserPlan } from "../types";
import {
    LogOut,
    Shield,
    Settings,
    ChevronDown,
    History,
    Search,
    Trophy,
} from "lucide-react";

interface TopbarProps {
    user: User | null;
    selectedGrade: string | null;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onSelectGrade: (grade: string | null) => void;
    onOpenAuth: (mode?: "login" | "register") => void;
    onLogout: () => void;
    onNavigateAdmin: () => void;
    onNavigateHome: () => void;
    onNavigateSettings: (tab?: "profile" | "history") => void;
    currentPath: string;
    onNavigateLeaderboard: () => void;
    activeTab: string;
}

export default function Topbar({
    user,
    selectedGrade,
    searchQuery,
    onSearchChange,
    onSelectGrade,
    onOpenAuth,
    onLogout,
    onNavigateAdmin,
    onNavigateHome,
    onNavigateSettings,
    currentPath,
    onNavigateLeaderboard,
    activeTab,
}: TopbarProps) {
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);

    const grades = [
        { id: "8", label: "Lớp 8" },
        { id: "9", label: "Lớp 9" },
        { id: "10", label: "Lớp 10" },
        { id: "11", label: "Lớp 11" },
        { id: "12", label: "Lớp 12" },
    ];

    const getPlanBadge = (plan?: UserPlan) => {
        switch (plan) {
            case "vip":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/30 rounded-full uppercase shadow-2xs">
                        VIP
                    </span>
                );
            case "basic":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/20 border border-sky-150 dark:border-sky-900/30 rounded-full uppercase">
                        Basic
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-text-tertiary bg-bg-surface border border-border-primary rounded-full uppercase">
                        Thường
                    </span>
                );
        }
    };

    const navButtonClass = (isActive: boolean) =>
        `px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
            isActive
                ? "bg-brand-100/80 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300 font-bold shadow-2xs"
                : "text-text-secondary hover:text-text-primary hover:bg-brand-50/50 dark:hover:bg-brand-500/10"
        }`;

    return (
        <header className="sticky top-0 z-50 w-full bg-bg-card/95 backdrop-blur-md border-b border-border-primary transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                {/* BRAND LOGO */}
                <div className="flex items-center gap-8">
                    <button
                        onClick={onNavigateHome}
                        className="flex items-center gap-2 group cursor-pointer focus:outline-none"
                    >
                        <span className="font-calligraphy text-2xl sm:text-3xl text-brand-400 dark:text-brand-300 font-bold tracking-tight group-hover:opacity-90 transition-opacity">
                            HiTrang
                        </span>
                    </button>

                    {/* NAV LINKS - CLASS/GRADE SELECTION */}
                    <nav className="hidden md:flex items-center gap-1.5">
                        <button
                            onClick={() => onSelectGrade(null)}
                            className={navButtonClass(
                                selectedGrade === null && currentPath === "/",
                            )}
                        >
                            Tất cả
                        </button>
                        {grades.map((grade) => (
                            <button
                                key={grade.id}
                                onClick={() => {
                                    onSelectGrade(grade.id);
                                }}
                                className={navButtonClass(
                                    selectedGrade === grade.id &&
                                        currentPath === "/",
                                )}
                            >
                                {grade.label}
                            </button>
                        ))}
                        {user && (
                            <button
                                onClick={onNavigateLeaderboard}
                                className={navButtonClass(
                                    activeTab === "leaderboard" &&
                                        currentPath === "/",
                                )}
                            >
                                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                                <span>BXH</span>
                            </button>
                        )}
                    </nav>
                </div>

                {/* RIGHT ACTIONS (ADMIN & AUTH) */}
                <div className="flex items-center gap-3">
                    {/* SEARCH BOX */}
                    <div className="relative hidden sm:block w-40 md:w-56 lg:w-64 flex-shrink-0">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                            <Search className="h-3.5 w-3.5 text-text-tertiary" />
                        </span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Tìm đề thi..."
                            className="w-full pl-8 pr-3.5 py-1.5 text-[11px] bg-bg-surface border border-border-primary rounded-xl focus:bg-bg-card focus:border-brand-400 focus:outline-none transition-all placeholder:text-text-tertiary text-text-primary font-medium"
                        />
                    </div>

                    {/* LEADERBOARD ROUTE BUTTON */}

                    {/* ADMIN ROUTE BUTTON */}
                    <button
                        onClick={onNavigateAdmin}
                        className={navButtonClass(currentPath === "/admin")}
                    >
                        <Shield className="w-3.5 h-3.5 text-text-tertiary" />
                        <span>Admin</span>
                    </button>

                    {!user ? (
                        /* UNAUTHENTICATED ACTION BUTTONS */
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onOpenAuth("login")}
                                className="px-3.5 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary bg-bg-surface hover:bg-brand-50 border border-border-primary rounded-xl transition-all cursor-pointer"
                            >
                                Đăng nhập
                            </button>
                            <button
                                onClick={() => onOpenAuth("register")}
                                className="px-4 py-1.5 text-xs font-bold text-white dark:text-slate-900 bg-brand-600 hover:bg-brand-700 dark:bg-brand-300 dark:hover:bg-brand-200 rounded-xl transition-all shadow-xs active:scale-98 cursor-pointer"
                            >
                                Đăng ký
                            </button>
                        </div>
                    ) : (
                        /* AUTHENTICATED USER DROPDOWN */
                        <div className="relative">
                            <button
                                onClick={() =>
                                    setUserDropdownOpen(!userDropdownOpen)
                                }
                                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-brand-50/50 dark:hover:bg-brand-500/10 transition-all cursor-pointer"
                            >
                                <div className="hidden sm:flex flex-col text-right">
                                    <span className="text-xs font-bold text-text-primary leading-tight">
                                        {user.name}
                                    </span>
                                    <span className="text-[10px] text-text-tertiary">
                                        @{user.username}
                                    </span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-brand-600 dark:bg-brand-300 text-white dark:text-slate-900 flex items-center justify-center font-extrabold text-xs flex-shrink-0 shadow-2xs">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <ChevronDown className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                            </button>

                            {userDropdownOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() =>
                                            setUserDropdownOpen(false)
                                        }
                                    />
                                    <div className="absolute right-0 mt-2 w-56 bg-bg-card rounded-2xl shadow-xl border border-border-primary py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                                        <div className="px-4 py-2 border-b border-border-primary mb-1">
                                            <p className="text-xs font-bold text-text-primary">
                                                {user.name}
                                            </p>
                                            <p className="text-[11px] text-text-secondary truncate">
                                                @{user.username}
                                            </p>
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="text-[10px] uppercase font-semibold text-text-tertiary">
                                                    Gói tài khoản
                                                </span>
                                                {getPlanBadge(user.plan)}
                                            </div>
                                        </div>

                                        {(user.role === "teacher" ||
                                            user.username === "admin") && (
                                            <button
                                                onClick={() => {
                                                    setUserDropdownOpen(false);
                                                    onNavigateAdmin();
                                                }}
                                                className="w-full px-4 py-2 text-left text-xs text-text-primary hover:bg-brand-50/50 dark:hover:bg-brand-500/10 flex items-center gap-2 font-semibold border-b border-border-primary pb-2 mb-1 cursor-pointer"
                                            >
                                                <Shield className="w-4 h-4 text-brand-500" />
                                                Quản lý đề thi (Admin)
                                            </button>
                                        )}

                                        <button
                                            onClick={() => {
                                                setUserDropdownOpen(false);
                                                onNavigateSettings("profile");
                                            }}
                                            className="w-full px-4 py-2 text-left text-xs text-text-secondary hover:text-text-primary hover:bg-brand-50/50 dark:hover:bg-brand-500/10 flex items-center gap-2 font-medium cursor-pointer"
                                        >
                                            <Settings className="w-4 h-4 text-text-tertiary" />
                                            Cài đặt cá nhân
                                        </button>

                                        <button
                                            onClick={() => {
                                                setUserDropdownOpen(false);
                                                onNavigateSettings("history");
                                            }}
                                            className="w-full px-4 py-2 text-left text-xs text-text-secondary hover:text-text-primary hover:bg-brand-50/50 dark:hover:bg-brand-500/10 flex items-center gap-2 font-medium cursor-pointer"
                                        >
                                            <History className="w-4 h-4 text-text-tertiary" />
                                            Lịch sử làm bài
                                        </button>

                                        <button
                                            onClick={() => {
                                                setUserDropdownOpen(false);
                                                onLogout();
                                            }}
                                            className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 font-semibold border-t border-border-primary mt-1 cursor-pointer"
                                        >
                                            <LogOut className="w-4 h-4 text-rose-500" />
                                            Đăng xuất
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* MOBILE GRADE NAVIGATION BAR */}
            <div className="md:hidden flex items-center gap-2 px-4 py-2 overflow-x-auto border-t border-border-primary bg-bg-surface/90">
                <button
                    onClick={() => onSelectGrade(null)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                        selectedGrade === null && currentPath === "/"
                            ? "bg-brand-100 dark:bg-brand-500/25 text-brand-600 dark:text-brand-300 font-bold shadow-2xs"
                            : "text-text-secondary bg-bg-card border border-border-primary hover:text-text-primary hover:bg-brand-50/50"
                    }`}
                >
                    Tất cả
                </button>
                {grades.map((grade) => (
                    <button
                        key={grade.id}
                        onClick={() => {
                            onSelectGrade(grade.id);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                            selectedGrade === grade.id && currentPath === "/"
                                ? "bg-brand-100 dark:bg-brand-500/25 text-brand-600 dark:text-brand-300 font-bold shadow-2xs"
                                : "text-text-secondary bg-bg-card border border-border-primary hover:text-text-primary hover:bg-brand-50/50"
                        }`}
                    >
                        {grade.label}
                    </button>
                ))}
            </div>
        </header>
    );
}
