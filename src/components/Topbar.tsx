import React, { useState } from "react";
import { User, UserPlan } from "../types";
import { LogOut, User as UserIcon, Shield, Settings, ChevronDown, BookOpen, Crown, Zap } from "lucide-react";

interface TopbarProps {
    user: User | null;
    selectedGrade: string | null;
    onSelectGrade: (grade: string | null) => void;
    onOpenAuth: (mode?: "login" | "register") => void;
    onLogout: () => void;
    onNavigateAdmin: () => void;
    onNavigateHome: () => void;
    onNavigateSettings: () => void;
    currentPath: string;
}

export default function Topbar({
    user,
    selectedGrade,
    onSelectGrade,
    onOpenAuth,
    onLogout,
    onNavigateAdmin,
    onNavigateHome,
    onNavigateSettings,
    currentPath,
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
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-900 bg-amber-200 border border-amber-300 rounded-full uppercase shadow-2xs">
                        <Crown className="w-3 h-3 text-amber-700" /> VIP
                    </span>
                );
            case "basic":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold tracking-wider text-sky-900 bg-sky-200 border border-sky-300 rounded-full uppercase shadow-2xs">
                        <Zap className="w-3 h-3 text-sky-700" /> BASIC
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium tracking-wider text-slate-600 bg-slate-100 border border-slate-200 rounded-full uppercase">
                        FREE
                    </span>
                );
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                
                {/* BRAND LOGO */}
                <div className="flex items-center gap-8">
                    <button
                        onClick={onNavigateHome}
                        className="flex items-center gap-2 group cursor-pointer focus:outline-none"
                    >
                        <span className="font-calligraphy text-2xl sm:text-3xl text-brand-600 font-bold tracking-tight group-hover:opacity-90 transition-opacity">
                            HiTrang
                        </span>
                        <span className="hidden sm:inline-block text-[10px] font-bold tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md uppercase border border-brand-200">
                            Học Viện
                        </span>
                    </button>

                    {/* NAV LINKS - CLASS/GRADE SELECTION */}
                    <nav className="hidden md:flex items-center gap-1 sm:gap-2">
                        <button
                            onClick={() => onSelectGrade(null)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                selectedGrade === null && currentPath === "/"
                                    ? "bg-slate-900 text-white shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            }`}
                        >
                            Tất cả
                        </button>
                        {grades.map((grade) => (
                            <button
                                key={grade.id}
                                onClick={() => {
                                    onSelectGrade(grade.id);
                                    if (currentPath !== "/") onNavigateHome();
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    selectedGrade === grade.id && currentPath === "/"
                                        ? "bg-slate-900 text-white shadow-2xs"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                }`}
                            >
                                {grade.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* RIGHT ACTIONS (ADMIN & AUTH) */}
                <div className="flex items-center gap-3">
                    
                    {/* ADMIN ROUTE BUTTON */}
                    <button
                        onClick={onNavigateAdmin}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                            currentPath === "/admin"
                                ? "bg-brand-600 text-white shadow-2xs"
                                : "text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200"
                        }`}
                    >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Admin</span>
                    </button>

                    {!user ? (
                        /* UNAUTHENTICATED ACTION BUTTONS */
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onOpenAuth("login")}
                                className="px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                                Đăng nhập
                            </button>
                            <button
                                onClick={() => onOpenAuth("register")}
                                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-xs active:scale-98 cursor-pointer"
                            >
                                Đăng ký
                            </button>
                        </div>
                    ) : (
                        /* AUTHENTICATED USER DROPDOWN */
                        <div className="relative">
                            <button
                                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer"
                            >
                                <div className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-xs">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="hidden sm:flex flex-col text-left">
                                    <span className="text-xs font-bold text-slate-900 leading-tight">
                                        {user.name}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                        @{user.username}
                                    </span>
                                </div>
                                {getPlanBadge(user.plan)}
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            </button>

                            {userDropdownOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setUserDropdownOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                                        <div className="px-4 py-2 border-b border-slate-100 mb-1">
                                            <p className="text-xs font-bold text-slate-900">{user.name}</p>
                                            <p className="text-[11px] text-slate-500 truncate">@{user.username}</p>
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="text-[10px] uppercase font-semibold text-slate-400">Gói tài khoản</span>
                                                {getPlanBadge(user.plan)}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setUserDropdownOpen(false);
                                                onNavigateSettings();
                                            }}
                                            className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                                        >
                                            <Settings className="w-4 h-4 text-slate-400" />
                                            Cài đặt cá nhân
                                        </button>

                                        <button
                                            onClick={() => {
                                                setUserDropdownOpen(false);
                                                onLogout();
                                            }}
                                            className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold border-t border-slate-100 mt-1"
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
            <div className="md:hidden flex items-center gap-2 px-4 py-2 overflow-x-auto border-t border-slate-100 bg-slate-50/80">
                <button
                    onClick={() => onSelectGrade(null)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        selectedGrade === null && currentPath === "/"
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 bg-white border border-slate-200"
                    }`}
                >
                    Tất cả
                </button>
                {grades.map((grade) => (
                    <button
                        key={grade.id}
                        onClick={() => {
                            onSelectGrade(grade.id);
                            if (currentPath !== "/") onNavigateHome();
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            selectedGrade === grade.id && currentPath === "/"
                                ? "bg-slate-900 text-white"
                                : "text-slate-600 bg-white border border-slate-200"
                        }`}
                    >
                        {grade.label}
                    </button>
                ))}
            </div>
        </header>
    );
}
