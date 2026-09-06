import React, { useState, useRef, useEffect } from "react";
import { User, UserPlan, Quiz } from "../types";
import { matchesQuiz } from "../lib/searchUtils";
import { getNotifications } from "../lib/supabaseService";
import {
    Home,
    LogOut,
    Bolt,
    Shield,
    ChevronDown,
    ChevronRight,
    History,
    Search,
    Crown,
    Calendar1,
    CalendarDays,
    User as UserIcon,
    Palette,
    GraduationCap,
    Bell,
    Menu,
    X,
} from "lucide-react";
import { Podium } from "./PodiumIcon";
import { ExamIcon } from "./ExamIcon";
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

    // Mobile state
    const [showGradeModal, setShowGradeModal] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [isHeaderHidden, setIsHeaderHidden] = useState(false);
    const [unreadNotiCount, setUnreadNotiCount] = useState(0);

    const lastScrollYRef = useRef(0);

    // Track scroll direction for mobile smart auto-hide header
    useEffect(() => {
        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const currentScrollY = window.scrollY;
                    if (currentScrollY < 30) {
                        setIsHeaderHidden(false);
                    } else if (currentScrollY > lastScrollYRef.current + 8) {
                        // Scrolling down -> hide top header on mobile
                        setIsHeaderHidden(true);
                    } else if (currentScrollY < lastScrollYRef.current - 8) {
                        // Scrolling up -> reveal top header on mobile
                        setIsHeaderHidden(false);
                    }
                    lastScrollYRef.current = currentScrollY;
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Periodic check for notification count on mobile tab bar
    useEffect(() => {
        if (!user) return;
        const fetchUnread = async () => {
            try {
                const data = await getNotifications();
                setUnreadNotiCount(data.unreadCount || 0);
            } catch {
                // Ignore network errors
            }
        };
        fetchUnread();
        const interval = setInterval(() => {
            if (!document.hidden) fetchUnread();
        }, 45000);
        return () => clearInterval(interval);
    }, [user]);

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

    // Active status flags for mobile tab bar
    const isHomeActive =
        (currentPath === "/" || currentPath === "") &&
        !selectedGrade &&
        activeTab === "student-dashboard";
    const isGradeActive =
        selectedGrade !== null || currentPath.startsWith("/grade");
    const isScheduleActive =
        currentPath === "/schedule" || currentPath === "/lich";
    const isLeaderboardActive = currentPath === "/leaderboard";
    const isNotiActive =
        currentPath.includes("/notifications") || currentPath.includes("/noti");
    const isSettingsActive = currentPath.startsWith("/settings");
    const isResultReview = currentPath.startsWith("/result");

    return (
        <>
            {/* STICKY TOPBAR HEADER */}
            <header
                className={`${
                    isHomeActive ? "block" : "hidden md:block"
                } sticky top-0 z-50 w-full bg-bg-card/95 backdrop-blur-md border-b border-border-primary transition-transform duration-300 ease-in-out ${
                    isHeaderHidden
                        ? "-translate-y-full md:translate-y-0"
                        : "translate-y-0"
                }`}
            >
                {/* BRAND LOGO + TOP ACTIONS (Desktop: 54px; Mobile: 48px) */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[48px] md:h-[54px] flex items-center justify-between">
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

                        {/* NAV LINKS - CLASS/GRADE SELECTION (DESKTOP ONLY) */}
                        {user && (
                            <nav className="hidden md:flex items-center lg:gap-1.5 gap-0.5">
                                {grades.map((grade) => (
                                    <div
                                        key={grade.id}
                                        className="relative py-2"
                                        onMouseEnter={() =>
                                            setHoveredGradeId(grade.id)
                                        }
                                        onMouseLeave={() =>
                                            setHoveredGradeId(null)
                                        }
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
                                                            setHoveredGradeId(
                                                                null,
                                                            );
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
                                                        gradeCategories[
                                                            grade.id
                                                        ] || []
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
                                                            <span>
                                                                {category}
                                                            </span>
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
                        {/* SEARCH BOX (DESKTOP) */}
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
                                            {filteredSearchQuizzes.length >
                                            0 ? (
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
                                                                    {
                                                                        quiz.subject
                                                                    }
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
                                                    Không tìm thấy đề thi phù
                                                    hợp
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
                                        onClick={() => {
                                            if (window.innerWidth < 768) {
                                                setShowMobileMenu(true);
                                            } else {
                                                setUserDropdownOpen(
                                                    !userDropdownOpen,
                                                );
                                            }
                                        }}
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
                                            className={`hidden md:block w-3.5 h-3.5 text-text-tertiary flex-shrink-0 transition-transform duration-200 ${
                                                userDropdownOpen
                                                    ? "rotate-180"
                                                    : ""
                                            }`}
                                        />
                                    </button>

                                    {/* DESKTOP USER DROPDOWN MENU */}
                                    {userDropdownOpen && (
                                        <div className="hidden md:block absolute right-0 mt-2 w-56 bg-bg-card rounded-lg shadow-xl border border-border-primary py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
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
                                                        setUserDropdownOpen(
                                                            false,
                                                        );
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
                                                    onNavigateSettings(
                                                        "profile",
                                                    );
                                                }}
                                                className="w-full px-4 py-2 text-left text-xs text-text-secondary hover:text-text-primary hover:bg-brand-50/50 dark:hover:bg-brand-500/10 flex items-center gap-2 font-medium cursor-pointer"
                                            >
                                                <Bolt className="w-4 h-4 text-text-tertiary" />
                                                Cài đặt cá nhân
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setUserDropdownOpen(false);
                                                    onNavigateSettings(
                                                        "security",
                                                    );
                                                }}
                                                className="w-full px-4 py-2 text-left text-xs text-text-secondary hover:text-text-primary hover:bg-brand-50/50 dark:hover:bg-brand-500/10 flex items-center gap-2 font-medium cursor-pointer"
                                            >
                                                <Shield className="w-4 h-4 text-text-tertiary" />
                                                Bảo mật tài khoản
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setUserDropdownOpen(false);
                                                    onNavigateSettings(
                                                        "appearance",
                                                    );
                                                }}
                                                className="w-full px-4 py-2 text-left text-xs text-text-secondary hover:text-text-primary hover:bg-brand-50/50 dark:hover:bg-brand-500/10 flex items-center gap-2 font-medium cursor-pointer"
                                            >
                                                <Palette className="w-4 h-4 text-text-tertiary" />
                                                Tùy chỉnh giao diện
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setUserDropdownOpen(false);
                                                    onNavigateSettings(
                                                        "history",
                                                    );
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
            </header>

            {/* FACEBOOK-STYLE MOBILE BOTTOM NAVIGATION BAR (FIXED AT BOTTOM OF SCREEN) */}
            {user && !isResultReview && (
                <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border-primary/80 bg-bg-card/95 backdrop-blur-md flex items-center justify-around h-[52px] pb-[env(safe-area-inset-bottom,0px)] px-1 transition-colors shadow-[0_-4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.2)]">
                    {/* 1. Trang chủ */}
                    <button
                        onClick={onNavigateHome}
                        className="flex-1 flex flex-col items-center justify-center h-full relative cursor-pointer group"
                        title="Trang chủ"
                    >
                        <div
                            className={`flex items-center justify-center rounded-full transition-all duration-200 ${
                                isHomeActive
                                    ? "w-10 h-7.5 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300"
                                    : "w-10 h-7.5 text-text-secondary/70 hover:text-text-primary"
                            }`}
                        >
                            <Home
                                className={`w-[21px] h-[21px] ${
                                    isHomeActive
                                        ? "stroke-[2.5]"
                                        : "stroke-[1.75]"
                                }`}
                            />
                        </div>
                        {isHomeActive && (
                            <span className="absolute bottom-0 w-8 h-[2.5px] bg-brand-600 dark:bg-brand-300 rounded-full" />
                        )}
                    </button>

                    {/* 2. Đề thi / Khối lớp */}
                    <button
                        onClick={() => {
                            if (user.grade) {
                                onSelectGrade(user.grade);
                            } else {
                                setShowGradeModal(true);
                            }
                        }}
                        className="flex-1 flex flex-col items-center justify-center h-full relative cursor-pointer group"
                        title="Đề thi"
                    >
                        <div
                            className={`flex items-center justify-center rounded-full transition-all duration-200 relative ${
                                isGradeActive
                                    ? "w-10 h-7.5 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300"
                                    : "w-10 h-7.5 text-text-secondary/70 hover:text-text-primary"
                            }`}
                        >
                            <ExamIcon
                                className={`w-[21px] h-[21px] ${
                                    isGradeActive
                                        ? "stroke-[2.5]"
                                        : "stroke-[1.75]"
                                }`}
                            />
                        </div>
                        {isGradeActive && (
                            <span className="absolute bottom-0 w-8 h-[2.5px] bg-brand-600 dark:bg-brand-300 rounded-full" />
                        )}
                    </button>

                    {/* 3. Lịch học */}
                    <button
                        onClick={onNavigateSchedule}
                        className="flex-1 flex flex-col items-center justify-center h-full relative cursor-pointer group"
                        title="Lịch học"
                    >
                        <div
                            className={`flex items-center justify-center rounded-full transition-all duration-200 ${
                                isScheduleActive
                                    ? "w-10 h-7.5 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300"
                                    : "w-10 h-7.5 text-text-secondary/70 hover:text-text-primary"
                            }`}
                        >
                            <Calendar1
                                className={`w-[21px] h-[21px] ${
                                    isScheduleActive
                                        ? "stroke-[2.5]"
                                        : "stroke-[1.75]"
                                }`}
                            />
                        </div>
                        {isScheduleActive && (
                            <span className="absolute bottom-0 w-8 h-[2.5px] bg-brand-600 dark:bg-brand-300 rounded-full" />
                        )}
                    </button>

                    {/* 4. Bảng xếp hạng (BXH) */}
                    <button
                        onClick={onNavigateLeaderboard}
                        className="flex-1 flex flex-col items-center justify-center h-full relative cursor-pointer group"
                        title="Bảng xếp hạng"
                    >
                        <div
                            className={`flex items-center justify-center rounded-full transition-all duration-200 ${
                                isLeaderboardActive
                                    ? "w-10 h-7.5 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300"
                                    : "w-10 h-7.5 text-text-secondary/70 hover:text-text-primary"
                            }`}
                        >
                            <Podium
                                className={`w-[21px] h-[21px] ${
                                    isLeaderboardActive
                                        ? "stroke-[2.5] text-amber-500"
                                        : "stroke-[1.75]"
                                }`}
                            />
                        </div>
                        {isLeaderboardActive && (
                            <span className="absolute bottom-0 w-8 h-[2.5px] bg-brand-600 dark:bg-brand-300 rounded-full" />
                        )}
                    </button>

                    {/* 5. Thông báo */}
                    <button
                        onClick={() => onNavigateSettings("notifications")}
                        className="flex-1 flex flex-col items-center justify-center h-full relative cursor-pointer group"
                        title="Thông báo"
                    >
                        <div
                            className={`flex items-center justify-center rounded-full transition-all duration-200 relative ${
                                isNotiActive
                                    ? "w-10 h-7.5 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300"
                                    : "w-10 h-7.5 text-text-secondary/70 hover:text-text-primary"
                            }`}
                        >
                            <Bell
                                className={`w-[21px] h-[21px] ${
                                    isNotiActive
                                        ? "stroke-[2.5]"
                                        : "stroke-[1.75]"
                                }`}
                            />
                            {unreadNotiCount > 0 && (
                                <span className="absolute -top-0.5 -right-1 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-0.5 shadow-xs">
                                    {unreadNotiCount > 99
                                        ? "99+"
                                        : unreadNotiCount}
                                </span>
                            )}
                        </div>
                        {isNotiActive && (
                            <span className="absolute bottom-0 w-8 h-[2.5px] bg-brand-600 dark:bg-brand-300 rounded-full" />
                        )}
                    </button>

                    {/* 6. Tài khoản / Menu */}
                    <button
                        onClick={() => setShowMobileMenu(true)}
                        className="flex-1 flex flex-col items-center justify-center h-full relative cursor-pointer group"
                        title="Tài khoản"
                    >
                        <div
                            className={`flex items-center justify-center rounded-full transition-all duration-200 relative ${
                                showMobileMenu || isSettingsActive
                                    ? "ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-slate-900"
                                    : ""
                            }`}
                        >
                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                                {user.avatarUrl ? (
                                    <img
                                        src={user.avatarUrl}
                                        alt={user.name}
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                )}
                            </div>
                            <div className="absolute -bottom-0.5 -right-1 w-3.5 h-3.5 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-full flex items-center justify-center shadow-xs border border-white dark:border-slate-900">
                                <Menu className="w-2 h-2 stroke-[3]" />
                            </div>
                        </div>
                    </button>
                </nav>
            )}

            {/* MOBILE GRADE SELECTOR BOTTOM SHEET */}
            {showGradeModal && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                        onClick={() => setShowGradeModal(false)}
                    />
                    <div className="relative w-full max-w-lg bg-bg-card border-t sm:border border-border-primary rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden z-10 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-250">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary">
                            <div>
                                <h3 className="text-base font-black text-text-primary">
                                    Chọn Khối Lớp Luyện Đề
                                </h3>
                                <p className="text-xs text-text-tertiary mt-0.5">
                                    Lựa chọn khối lớp để xem danh sách đề thi
                                    môn Toán
                                </p>
                            </div>
                            <button
                                onClick={() => setShowGradeModal(false)}
                                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Grade list */}
                        <div className="p-4 overflow-y-auto space-y-2.5">
                            {[
                                {
                                    id: "8",
                                    title: "Khối Lớp 8",
                                    desc: "Chương trình Toán THCS Lớp 8",
                                    badge: "THCS",
                                },
                                {
                                    id: "9",
                                    title: "Khối Lớp 9",
                                    desc: "Toán 9 & Bộ đề Luyện thi vào 10",
                                    badge: "Ôn thi vào 10",
                                },
                                {
                                    id: "10",
                                    title: "Khối Lớp 10",
                                    desc: "Chương trình Toán THPT Lớp 10 (GDPT mới)",
                                    badge: "THPT",
                                },
                                {
                                    id: "11",
                                    title: "Khối Lớp 11",
                                    desc: "Chương trình Toán THPT Lớp 11",
                                    badge: "THPT",
                                },
                                {
                                    id: "12",
                                    title: "Khối Lớp 12",
                                    desc: "Toán 12 & Luyện thi Tốt nghiệp THPT",
                                    badge: "Thi thử TN THPT",
                                },
                            ].map((g) => {
                                const isCurrent =
                                    selectedGrade === g.id ||
                                    currentPath.includes(`/grade/${g.id}`);
                                const isUserGrade = user?.grade === g.id;
                                return (
                                    <button
                                        key={g.id}
                                        onClick={() => {
                                            if (user && !user.grade) {
                                                user.grade = g.id;
                                                try {
                                                    const savedUserStr =
                                                        localStorage.getItem(
                                                            "hvt_user",
                                                        );
                                                    if (savedUserStr) {
                                                        const parsed =
                                                            JSON.parse(
                                                                savedUserStr,
                                                            );
                                                        parsed.grade = g.id;
                                                        localStorage.setItem(
                                                            "hvt_user",
                                                            JSON.stringify(
                                                                parsed,
                                                            ),
                                                        );
                                                    }
                                                } catch (e) {
                                                    console.error(
                                                        "Lỗi khi lưu lớp:",
                                                        e,
                                                    );
                                                }
                                            }
                                            onSelectGrade(g.id);
                                            setShowGradeModal(false);
                                        }}
                                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer group ${
                                            isCurrent
                                                ? "bg-brand-50/70 dark:bg-brand-900/20 border-brand-500 dark:border-brand-500/50 shadow-xs"
                                                : "bg-white dark:bg-bg-surface border-border-primary hover:border-brand-300 dark:hover:border-brand-800"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                                                    isCurrent
                                                        ? "bg-brand-600 text-white shadow-xs"
                                                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-brand-100 dark:group-hover:bg-brand-950/40"
                                                }`}
                                            >
                                                {g.id}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-extrabold text-sm text-text-primary">
                                                        {g.title}
                                                    </span>
                                                    {isUserGrade && (
                                                        <span className="text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded-full">
                                                            Lớp của bạn
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-text-tertiary truncate mt-0.5">
                                                    {g.desc}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    g.id === "9" ||
                                                    g.id === "12"
                                                        ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                                }`}
                                            >
                                                {g.badge}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* MOBILE USER MENU BOTTOM SHEET */}
            {showMobileMenu && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                        onClick={() => setShowMobileMenu(false)}
                    />
                    <div className="relative w-full max-w-lg bg-bg-card border-t sm:border border-border-primary rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-250">
                        {/* User Profile Card Header */}
                        <div className="p-4 border-b border-border-primary bg-bg-surface/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-border-primary shadow-xs flex items-center justify-center">
                                        {user.avatarUrl ? (
                                            <img
                                                src={user.avatarUrl}
                                                alt={user.name}
                                                referrerPolicy="no-referrer"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-base">
                                                {user.name
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-extrabold text-text-primary">
                                            {user.name}
                                        </h3>
                                        <p className="text-xs text-text-tertiary">
                                            @{user.username}
                                        </p>
                                        <div className="mt-1 flex items-center gap-2">
                                            {getPlanBadge(user.plan)}
                                            {user.grade && (
                                                <span className="text-[10px] font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 px-2 py-0.5 rounded-full">
                                                    Lớp {user.grade}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowMobileMenu(false)}
                                    className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-card transition-colors cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Action list */}
                        <div className="p-3 overflow-y-auto space-y-1 divide-y divide-border-primary/50">
                            <div className="space-y-1 pb-2">
                                <button
                                    onClick={() => {
                                        setShowMobileMenu(false);
                                        setShowGradeModal(true);
                                    }}
                                    className="w-full px-3 py-2.5 rounded-xl hover:bg-brand-50/50 dark:hover:bg-brand-500/10 flex items-center justify-between text-left text-xs font-semibold text-text-primary cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                            <GraduationCap className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span>Đổi khối lớp luyện đề</span>
                                            <p className="text-[10px] text-text-tertiary font-normal">
                                                {selectedGrade
                                                    ? `Đang chọn: Lớp ${selectedGrade}`
                                                    : "Chọn lớp 8, 9, 10, 11, 12"}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-text-tertiary" />
                                </button>

                                {(user.role === "admin" ||
                                    user.username === "admin") && (
                                    <button
                                        onClick={() => {
                                            setShowMobileMenu(false);
                                            onNavigateAdmin();
                                        }}
                                        className="w-full px-3 py-2.5 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center justify-between text-left text-xs font-bold text-amber-700 dark:text-amber-300 cursor-pointer transition-colors border border-amber-200/50 dark:border-amber-800/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                                <Shield className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <span>
                                                    Trang quản trị (Admin Panel)
                                                </span>
                                                <p className="text-[10px] text-amber-600/70 font-normal">
                                                    Quản lý đề thi, học sinh, hệ
                                                    thống
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-amber-500" />
                                    </button>
                                )}
                            </div>

                            <div className="space-y-1 py-2">
                                <button
                                    onClick={() => {
                                        setShowMobileMenu(false);
                                        onNavigateSettings("profile");
                                    }}
                                    className="w-full px-3 py-2 rounded-xl hover:bg-brand-50/50 dark:hover:bg-brand-500/10 flex items-center justify-between text-left text-xs font-semibold text-text-primary cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                                            <Bolt className="w-4 h-4" />
                                        </div>
                                        <span>Cài đặt thông tin cá nhân</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-text-tertiary" />
                                </button>

                                <button
                                    onClick={() => {
                                        setShowMobileMenu(false);
                                        onNavigateSettings("security");
                                    }}
                                    className="w-full px-3 py-2 rounded-xl hover:bg-brand-50/50 dark:hover:bg-brand-500/10 flex items-center justify-between text-left text-xs font-semibold text-text-primary cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                                            <Shield className="w-4 h-4" />
                                        </div>
                                        <span>
                                            Bảo mật tài khoản & mật khẩu
                                        </span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-text-tertiary" />
                                </button>

                                <button
                                    onClick={() => {
                                        setShowMobileMenu(false);
                                        onNavigateSettings("appearance");
                                    }}
                                    className="w-full px-3 py-2 rounded-xl hover:bg-brand-50/50 dark:hover:bg-brand-500/10 flex items-center justify-between text-left text-xs font-semibold text-text-primary cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                                            <Palette className="w-4 h-4" />
                                        </div>
                                        <span>
                                            Tùy chỉnh giao diện Sáng / Tối
                                        </span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-text-tertiary" />
                                </button>

                                <button
                                    onClick={() => {
                                        setShowMobileMenu(false);
                                        onNavigateSettings("history");
                                    }}
                                    className="w-full px-3 py-2 rounded-xl hover:bg-brand-50/50 dark:hover:bg-brand-500/10 flex items-center justify-between text-left text-xs font-semibold text-text-primary cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                                            <History className="w-4 h-4" />
                                        </div>
                                        <span>Lịch sử làm bài thi</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-text-tertiary" />
                                </button>
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={() => {
                                        setShowMobileMenu(false);
                                        onLogout();
                                    }}
                                    className="w-full px-3 py-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center justify-between text-left text-xs font-bold text-rose-600 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                                            <LogOut className="w-4 h-4" />
                                        </div>
                                        <span>Đăng xuất khỏi hệ thống</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
