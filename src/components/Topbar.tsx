import React, { useState, useRef, useEffect } from "react";
import { User, UserPlan, Quiz } from "../types";
import { matchesQuiz } from "../lib/searchUtils";
import {
    LogOut,
    Bolt,
    Shield,
    Settings,
    ChevronDown,
    History,
    Search,
    Crown,
    Calendar,
    User as UserIcon,
    Palette,
} from "lucide-react";
import NotificationBell from "./NotificationBell";

interface TopbarProps {
    user: User | null;
    selectedGrade: string | null;
    onSelectGrade: (grade: string | null, category?: string | null) => void;
    onOpenAuth: (mode?: "login" | "register") => void;
    onLogout: () => void;
    onNavigateAdmin: () => void;
    onNavigateHome: () => void;
    onNavigateSettings: (
        tab?:
            | "profile"
            | "security"
            | "appearance"
            | "history"
            | "notifications",
    ) => void;
    currentPath: string;
    onNavigateLeaderboard: () => void;
    onNavigateSchedule: () => void;
    activeTab: string;
    quizzes: Quiz[];
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
    onNavigateLeaderboard,
    onNavigateSchedule,
    activeTab,
    quizzes,
}: TopbarProps) {
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const [localSearchQuery, setLocalSearchQuery] = useState("");
    const [hoveredGradeId, setHoveredGradeId] = useState<string | null>(null);

    const gradeCategories: Record<string, string[]> = {
        "8": ["Giữa kì 1", "Cuối kì 1", "Giữa kì 2", "Cuối kì 2"],
        "9": ["Giữa kì 1", "Cuối kì 1", "Giữa kì 2", "Cuối kì 2", "Thi vào 10"],
        "10": ["Giữa kì 1", "Cuối kì 1", "Giữa kì 2", "Cuối kì 2"],
        "11": ["Giữa kì 1", "Cuối kì 1", "Giữa kì 2", "Cuối kì 2"],
        "12": ["Giữa kì 1", "Cuối kì 1", "Giữa kì 2", "Cuối kì 2", "Thi thử"],
    };

    const getCategoryFromPath = (path: string) => {
        try {
            const queryIdx = path.indexOf("?");
            if (queryIdx === -1) return null;
            const searchParams = new URLSearchParams(path.substring(queryIdx));
            return searchParams.get("category");
        } catch {
            return null;
        }
    };
    const currentCategory = getCategoryFromPath(currentPath);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    // Click outside handler for user profile dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setUserDropdownOpen(false);
            }
        }
        if (userDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [userDropdownOpen]);

    // Click outside handler for search quiz container
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                searchContainerRef.current &&
                !searchContainerRef.current.contains(event.target as Node)
            ) {
                setSearchFocused(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Filter quizzes matching search query
    const filteredSearchQuizzes = quizzes.filter((quiz) => {
        if (!localSearchQuery.trim()) return false;
        return matchesQuiz(quiz, localSearchQuery);
    });

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
        `px-2 py-0.5 rounded-lg text-[12.5px] transition-colors duration-150 cursor-pointer flex items-center gap-0.5 whitespace-nowrap flex-shrink-0 ${
            isActive
                ? "text-brand-700 dark:text-brand-300 font-black underline decoration-brand-500 dark:decoration-brand-300 decoration-2 underline-offset-[5px] opacity-100"
                : "text-text-secondary/65 dark:text-text-secondary/55 font-bold hover:text-text-primary hover:bg-brand-50/50 dark:hover:bg-brand-500/10"
        }`;

    return (
        <header className="sticky top-0 z-50 w-full bg-bg-card/95 backdrop-blur-md border-b border-border-primary transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[54px] flex items-center justify-between">
                {/* BRAND LOGO */}
                <div className="flex items-center lg:gap-6 gap-3 flex-shrink-0">
                    <button
                        onClick={onNavigateHome}
                        className="flex items-center gap-2 group cursor-pointer focus:outline-none"
                    >
                        <img
                            src="/logos/lotus.gif"
                            alt="Logo"
                            className="w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 object-contain"
                        />
                        <span className="font-calligraphy text-lg sm:text-lg text-brand-500 dark:text-brand-300 font-semibold tracking-tight group-hover:opacity-90 transition-opacity">
                            HiTrang
                        </span>
                    </button>

                    {/* NAV LINKS - CLASS/GRADE SELECTION */}
                    {user && (
                        <nav className="hidden md:flex items-center lg:gap-1.5 gap-0.5">
                            {grades.map((grade) => (
                                <div
                                    key={grade.id}
                                    className="relative py-2"
                                    onMouseEnter={() =>
                                        setHoveredGradeId(grade.id)
                                    }
                                    onMouseLeave={() => setHoveredGradeId(null)}
                                >
                                    <button
                                        onClick={() => {
                                            onSelectGrade(grade.id, null);
                                        }}
                                        className={navButtonClass(
                                            selectedGrade === grade.id,
                                        )}
                                    >
                                        <span>{grade.label}</span>
                                        <ChevronDown
                                            className={`w-3 h-3 text-text-tertiary transition-transform duration-200 ${
                                                hoveredGradeId === grade.id
                                                    ? "rotate-180"
                                                    : ""
                                            }`}
                                        />
                                    </button>

                                    {/* HOVER DROPDOWN MENU */}
                                    {hoveredGradeId === grade.id && (
                                        <div className="absolute top-full left-0 pt-2 z-50">
                                            <div className="w-44 bg-bg-card border border-border-primary rounded-lg shadow-xl py-2 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                                                <button
                                                    onClick={() => {
                                                        onSelectGrade(
                                                            grade.id,
                                                            null,
                                                        );
                                                        setHoveredGradeId(null);
                                                    }}
                                                    className={`w-full text-left px-4 py-2 text-[12px] font-bold hover:bg-brand-50/50 dark:hover:bg-brand-500/10 transition-colors cursor-pointer flex items-center justify-between ${
                                                        !currentCategory
                                                            ? "text-brand-700 dark:text-brand-300 font-black bg-brand-50/30 dark:bg-brand-500/5"
                                                            : "text-text-secondary/70 dark:text-text-secondary/60 font-semibold"
                                                    }`}
                                                >
                                                    <span>Tất cả</span>
                                                    {!currentCategory && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 dark:bg-brand-300" />
                                                    )}
                                                </button>

                                                {(
                                                    gradeCategories[grade.id] ||
                                                    []
                                                ).map((category) => (
                                                    <button
                                                        key={category}
                                                        onClick={() => {
                                                            onSelectGrade(
                                                                grade.id,
                                                                category,
                                                            );
                                                            setHoveredGradeId(
                                                                null,
                                                            );
                                                        }}
                                                        className={`w-full text-left px-4 py-2 text-[12px] font-bold hover:bg-brand-50/50 dark:hover:bg-brand-500/10 transition-colors cursor-pointer flex items-center justify-between ${
                                                            currentCategory ===
                                                            category
                                                                ? "text-brand-700 dark:text-brand-300 font-black bg-brand-50/30 dark:bg-brand-500/5"
                                                                : "text-text-secondary/70 dark:text-text-secondary/60 font-semibold"
                                                        }`}
                                                    >
                                                        <span>{category}</span>
                                                        {currentCategory ===
                                                            category && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 dark:bg-brand-300" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={onNavigateSchedule}
                                className={navButtonClass(
                                    currentPath === "/lich" ||
                                        currentPath === "/schedule",
                                )}
                            >
                                <span>Lịch học</span>
                            </button>

                            <button
                                onClick={onNavigateLeaderboard}
                                className={navButtonClass(
                                    currentPath === "/leaderboard",
                                )}
                            >
                                <Crown className="w-3.5 h-3.5 text-amber-500" />
                                <span>BXH</span>
                            </button>
                        </nav>
                    )}
                </div>

                {/* RIGHT ACTIONS (ADMIN & AUTH) */}
                <div className="flex items-center lg:gap-3 gap-1.5">
                    {/* SEARCH BOX */}
                    {user && (
                        <div
                            key="topbar-search-container"
                            ref={searchContainerRef}
                            className="relative hidden sm:block w-40 md:w-52 lg:w-64 flex-shrink-0"
                        >
                            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                                <Search className="h-3.5 w-3.5 text-text-tertiary" />
                            </span>
                            <input
                                type="text"
                                value={localSearchQuery}
                                onFocus={() => setSearchFocused(true)}
                                onChange={(e) => {
                                    setLocalSearchQuery(e.target.value);
                                    setSearchFocused(true);
                                }}
                                placeholder="Tìm đề thi..."
                                className="w-full h-[30px] pl-8 pr-3.5 text-[11px] bg-white dark:bg-bg-card border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors placeholder-slate-400 dark:placeholder-slate-500 text-text-primary font-medium"
                            />
                            {searchFocused &&
                                localSearchQuery.trim().length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 w-full max-h-60 overflow-y-auto bg-bg-card rounded-md shadow-lg border border-border-primary py-1.5 z-30 animate-in fade-in slide-in-from-top-1 duration-150">
                                        {filteredSearchQuizzes.length > 0 ? (
                                            filteredSearchQuizzes.map(
                                                (quiz) => (
                                                    <button
                                                        key={quiz.id}
                                                        onClick={() => {
                                                            onSelectGrade(
                                                                quiz.grade ||
                                                                    null,
                                                            );
                                                            setLocalSearchQuery(
                                                                "",
                                                            );
                                                            setSearchFocused(
                                                                false,
                                                            );
                                                        }}
                                                        className="w-full text-left px-3 py-2 hover:bg-brand-50/50 dark:hover:bg-brand-500/10 transition-colors flex flex-col gap-0.5 cursor-pointer"
                                                    >
                                                        <span className="text-xs font-semibold text-text-primary line-clamp-1">
                                                            {quiz.title}
                                                        </span>
                                                        <span className="text-[10px] text-text-tertiary flex items-center gap-1.5">
                                                            <span>
                                                                {quiz.subject}
                                                            </span>
                                                            {quiz.grade && (
                                                                <>
                                                                    <span className="w-1 h-1 rounded-full bg-border-secondary" />
                                                                    <span className="font-semibold text-brand-500 dark:text-brand-300">
                                                                        Lớp{" "}
                                                                        {
                                                                            quiz.grade
                                                                        }
                                                                    </span>
                                                                </>
                                                            )}
                                                        </span>
                                                    </button>
                                                ),
                                            )
                                        ) : (
                                            <div className="px-3 py-3 text-center text-xs text-text-tertiary italic">
                                                Không tìm thấy đề thi phù hợp
                                            </div>
                                        )}
                                    </div>
                                )}
                        </div>
                    )}

                    {/* AUTH ACTION / USER PROFILE BUTTON */}
                    {!user ? (
                        /* UNAUTHENTICATED ACTION BUTTONS */
                        <div
                            key="unauth-login-wrap"
                            className="flex items-center"
                        >
                            <button
                                key="btn-trigger-login"
                                type="button"
                                onClick={() => onOpenAuth("login")}
                                className="px-5 py-2 text-xs font-bold text-white dark:text-slate-900 bg-brand-600 hover:bg-brand-700 dark:bg-brand-300 dark:hover:bg-brand-200 rounded-lg shadow-xs active:scale-[0.98] transition-colors cursor-pointer"
                            >
                                Đăng nhập
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            {/* Notification Bell */}
                            <NotificationBell
                                onNavigate={(path) => {
                                    if (
                                        path === "/notifications" ||
                                        path === "/noti"
                                    ) {
                                        onNavigateSettings("notifications");
                                    }
                                }}
                            />

                            <div
                                key="user-profile-dropdown"
                                className="relative"
                                ref={dropdownRef}
                            >
                                <button
                                    key="btn-user-avatar-toggle"
                                    type="button"
                                    onClick={() =>
                                        setUserDropdownOpen(!userDropdownOpen)
                                    }
                                    className="flex items-center gap-1.5 p-1 rounded-lg cursor-pointer flex-shrink-0 group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center flex-shrink-0 shadow-2xs overflow-hidden border border-slate-200 dark:border-slate-700/50 transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
                                        {user.avatarUrl ? (
                                            <img
                                                src={user.avatarUrl}
                                                alt={user.name}
                                                referrerPolicy="no-referrer"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.style.display =
                                                        "none";
                                                    const fallback = e
                                                        .currentTarget
                                                        .nextElementSibling as HTMLElement;
                                                    if (fallback)
                                                        fallback.style.display =
                                                            "block";
                                                }}
                                            />
                                        ) : null}
                                        <UserIcon
                                            className="w-4 h-4 text-slate-400 dark:text-slate-500"
                                            style={{
                                                display: user.avatarUrl
                                                    ? "none"
                                                    : "block",
                                            }}
                                        />
                                    </div>
                                    <ChevronDown
                                        className={`w-3.5 h-3.5 text-text-tertiary flex-shrink-0 transition-transform duration-200 ${
                                            userDropdownOpen ? "rotate-180" : ""
                                        }`}
                                    />
                                </button>

                                {userDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-56 bg-bg-card rounded-lg shadow-xl border border-border-primary py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                                        <div className="px-4 py-2 border-b border-border-primary mb-1">
                                            <p className="text-xs font-bold text-text-primary">
                                                {user.name}
                                            </p>
                                            <p className="text-[11px] text-text-secondary truncate">
                                                @{user.username}
                                            </p>
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="text-[10px] uppercase font-semibold text-text-tertiary">
                                                    Tài khoản
                                                </span>
                                                {getPlanBadge(user.plan)}
                                            </div>
                                        </div>

                                        {(user.role === "admin" ||
                                            user.username === "admin") && (
                                            <button
                                                onClick={() => {
                                                    setUserDropdownOpen(false);
                                                    onNavigateAdmin();
                                                }}
                                                className="w-full px-4 py-2 text-left text-xs text-text-primary hover:bg-brand-50/50 dark:hover:bg-brand-500/10 flex items-center gap-2 font-semibold border-b border-border-primary pb-2 mb-1 cursor-pointer"
                                            >
                                                <Shield className="w-4 h-4 text-brand-500" />
                                                Quản lý (Admin)
                                            </button>
                                        )}

                                        <button
                                            onClick={() => {
                                                setUserDropdownOpen(false);
                                                onNavigateSettings("profile");
                                            }}
                                            className="w-full px-4 py-2 text-left text-xs text-text-secondary hover:text-text-primary hover:bg-brand-50/50 dark:hover:bg-brand-500/10 flex items-center gap-2 font-medium cursor-pointer"
                                        >
                                            <Bolt className="w-4 h-4 text-text-tertiary" />
                                            Cài đặt cá nhân
                                        </button>

                                        <button
                                            onClick={() => {
                                                setUserDropdownOpen(false);
                                                onNavigateSettings("security");
                                            }}
                                            className="w-full px-4 py-2 text-left text-xs text-text-secondary hover:text-text-primary hover:bg-brand-50/50 dark:hover:bg-brand-500/10 flex items-center gap-2 font-medium cursor-pointer"
                                        >
                                            <Shield className="w-4 h-4 text-text-tertiary" />
                                            Bảo mật tài khoản
                                        </button>

                                        <button
                                            onClick={() => {
                                                setUserDropdownOpen(false);
                                                onNavigateSettings("appearance");
                                            }}
                                            className="w-full px-4 py-2 text-left text-xs text-text-secondary hover:text-text-primary hover:bg-brand-50/50 dark:hover:bg-brand-500/10 flex items-center gap-2 font-medium cursor-pointer"
                                        >
                                            <Palette className="w-4 h-4 text-text-tertiary" />
                                            Tùy chỉnh giao diện
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
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MOBILE GRADE NAVIGATION BAR */}
            {user && (
                <div className="lg:hidden flex items-center gap-2 px-4 py-2 overflow-x-auto border-t border-border-primary bg-bg-surface/90">
                    {grades.map((grade) => (
                        <button
                            key={grade.id}
                            onClick={() => {
                                onSelectGrade(grade.id);
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                                selectedGrade === grade.id
                                    ? "text-brand-600 dark:text-brand-300 underline decoration-brand-500 dark:decoration-brand-300 decoration-2 underline-offset-2 bg-bg-card border border-border-primary"
                                    : "text-text-secondary bg-bg-card border border-border-primary hover:text-text-primary hover:bg-brand-50/50"
                            }`}
                        >
                            {grade.label}
                        </button>
                    ))}
                    {/* Mobile Schedule Link */}
                    <button
                        onClick={onNavigateSchedule}
                        className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                            currentPath === "/schedule"
                                ? "text-brand-600 dark:text-brand-300 underline decoration-brand-500 dark:decoration-brand-300 decoration-2 underline-offset-2 bg-bg-card border border-border-primary"
                                : "text-text-secondary bg-bg-card border border-border-primary hover:text-text-primary hover:bg-brand-50/50"
                        }`}
                    >
                        Lịch học
                    </button>
                    {/* Mobile Leaderboard Link */}
                    <button
                        onClick={onNavigateLeaderboard}
                        className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${
                            currentPath === "/leaderboard"
                                ? "text-brand-600 dark:text-brand-300 underline decoration-brand-500 dark:decoration-brand-300 decoration-2 underline-offset-2 bg-bg-card border border-border-primary"
                                : "text-text-secondary bg-bg-card border border-border-primary hover:text-text-primary hover:bg-brand-50/50"
                        }`}
                    >
                        <Crown className="w-3 h-3 text-amber-500" />
                        <span>BXH</span>
                    </button>
                </div>
            )}
        </header>
    );
}
