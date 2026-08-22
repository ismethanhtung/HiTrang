import React, { useState, useEffect } from "react";
import { Quiz, Submission, User } from "./types";
import { INITIAL_QUIZZES, INITIAL_SUBMISSIONS } from "./data";
import Topbar from "./components/Topbar";
import LandingPage from "./components/LandingPage";
import Auth from "./components/Auth";
import StudentDashboard from "./components/StudentDashboard";
import AdminDashboard from "./components/AdminDashboard";
import AdminPanel from "./components/AdminPanel";
import SettingsView from "./components/SettingsView";
import Footer from "./components/Footer";
import GoogleCallback from "./components/GoogleCallback";
import {
    getCurrentUser,
    signOutUser,
    getQuizzes,
    getSubmissions,
    deleteQuiz,
    createSubmission,
    getAnyActiveAttempt,
    initializeSession,
    getOverallLeaderboard,
    submitBugReport,
} from "./lib/supabaseService";
import GradeView from "./components/GradeView";
import LeaderboardView from "./components/LeaderboardView";
import ScheduleView from "./components/ScheduleView";
import {
    HelpCircle,
    X,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    ArrowRight,
} from "lucide-react";

export default function App() {
    // 1. Force Light Mode by Default
    const [theme, setTheme] = useState<"light" | "dark">(() => {
        const saved = localStorage.getItem("hitrang_theme");
        return saved === "dark" ? "dark" : "light";
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === "dark") {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }
        localStorage.setItem("hitrang_theme", theme);
    }, [theme]);

    // 2. Navigation & Route States
    const [currentPath, setCurrentPath] = useState<string>(() => {
        return window.location.pathname + window.location.search;
    });

    const matchRoute = (path: string) => {
        const cleanPath = path.split("?")[0];
        if (cleanPath === "/") return { route: "home" };
        if (cleanPath === "/auth/google/callback")
            return { route: "google-callback" };
        if (cleanPath === "/settings")
            return { route: "settings", tab: "profile" };
        if (cleanPath === "/history")
            return { route: "settings", tab: "history" };
        if (cleanPath === "/trang" || cleanPath === "/teacher")
            return { route: "teacher" };
        if (cleanPath === "/admin") return { route: "admin" };
        if (cleanPath === "/leaderboard") return { route: "leaderboard" };
        if (cleanPath === "/lich" || cleanPath === "/schedule")
            return { route: "schedule" };

        const gradeMatch = cleanPath.match(/^\/grade\/([a-zA-Z0-9_-]+)$/);
        if (gradeMatch) return { route: "grade", gradeId: gradeMatch[1] };

        const quizMatch = cleanPath.match(/^\/quiz\/([a-zA-Z0-9_-]+)$/);
        if (quizMatch) return { route: "quiz", quizId: quizMatch[1] };

        const resultMatch = cleanPath.match(/^\/result\/([a-zA-Z0-9_-]+)$/);
        if (resultMatch) return { route: "result", subId: resultMatch[1] };

        return { route: "home" };
    };

    const routeInfo = matchRoute(currentPath);
    const activeQuizId = routeInfo.route === "quiz" ? routeInfo.quizId : null;
    const reviewSubmissionId =
        routeInfo.route === "result" ? routeInfo.subId : null;
    const selectedGrade =
        routeInfo.route === "grade" ? routeInfo.gradeId : null;
    const isTakingOrReviewing =
        routeInfo.route === "quiz" || routeInfo.route === "result";

    // Auth modal state
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [authMode, setAuthMode] = useState<"login" | "register">("login");

    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [prefetchedLeaderboard, setPrefetchedLeaderboard] = useState<
        any[] | null
    >(null);
    const [loading, setLoading] = useState(true);
    const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);

    // User Session State
    const [user, setUser] = useState<User | null>(() => {
        const saved = localStorage.getItem("hvt_user");
        return saved ? JSON.parse(saved) : null;
    });

    const filteredQuizzes = quizzes;

    const [activeTab, setActiveTab] = useState<string>("student-dashboard");
    const [isTakingQuiz, setIsTakingQuiz] = useState(false);
    const [ongoingAttempt, setOngoingAttempt] = useState<any | null>(null);
    const [isOngoingAttemptDismissed, setIsOngoingAttemptDismissed] =
        useState(false);
    const [isSupportDismissed, setIsSupportDismissed] =
        useState<boolean>(false);
    const [globalContactModalOpen, setGlobalContactModalOpen] =
        useState<boolean>(false);
    const [globalBugModalOpen, setGlobalBugModalOpen] =
        useState<boolean>(false);
    const [bugTitle, setBugTitle] = useState<string>("");
    const [bugSenderName, setBugSenderName] = useState<string>("");
    const [bugContent, setBugContent] = useState<string>("");
    const [bugSubmitted, setBugSubmitted] = useState<boolean>(false);
    const [settingsInitialTab, setSettingsInitialTab] = useState<
        "profile" | "history"
    >("profile");

    const confirmNavigation = () => {
        if (isTakingQuiz) {
            return window.confirm("ê bé, đang làm mà chuyển đi đâu thế.");
        }
        return true;
    };

    useEffect(() => {
        localStorage.setItem("hvt_submissions", JSON.stringify(submissions));
    }, [submissions]);

    useEffect(() => {
        if (user) {
            localStorage.setItem("hvt_user", JSON.stringify(user));
            setBugSenderName(user.name);
        } else {
            localStorage.removeItem("hvt_user");
            setBugSenderName("");
        }
    }, [user]);

    // Check Supabase session on mount
    useEffect(() => {
        const fetchInitialData = async () => {
            const startTime = performance.now();
            setLoading(true);
            try {
                // Wait for local session token recovery to load auth headers
                await initializeSession();

                const hasToken = !!localStorage.getItem("hitrang_token");
                const savedUserStr = localStorage.getItem("hvt_user");
                let parsedUser: User | null = null;
                if (savedUserStr) {
                    try {
                        parsedUser = JSON.parse(savedUserStr);
                    } catch (e) {}
                }

                if (hasToken && parsedUser) {
                    const userGrade =
                        parsedUser.role === "student"
                            ? parsedUser.grade || "10"
                            : "10";
                    const isLeaderboardPath =
                        window.location.pathname === "/leaderboard";

                    // Fetch everything in parallel to eliminate network latency bottlenecks
                    if (isLeaderboardPath) {
                        const [
                            dbQuizzes,
                            currentUser,
                            dbSubmissions,
                            dbLeaderboard,
                        ] = await Promise.all([
                            getQuizzes().catch((e) => {
                                console.warn("Lỗi tải đề thi:", e);
                                return [] as Quiz[];
                            }),
                            getCurrentUser().catch((e) => {
                                console.warn("Lỗi đồng bộ user:", e);
                                return null;
                            }),
                            getSubmissions(
                                parsedUser.role,
                                parsedUser.id,
                            ).catch((e) => {
                                console.warn("Lỗi tải bài nộp:", e);
                                return [] as Submission[];
                            }),
                            getOverallLeaderboard(userGrade).catch((e) => {
                                console.warn("Lỗi tải BXH:", e);
                                return null;
                            }),
                        ]);

                        if (dbQuizzes && dbQuizzes.length > 0) {
                            setQuizzes(dbQuizzes);
                        }
                        if (dbSubmissions && dbSubmissions.length > 0) {
                            setSubmissions(dbSubmissions);
                        }
                        if (dbLeaderboard) {
                            setPrefetchedLeaderboard(dbLeaderboard);
                        }
                        if (currentUser) {
                            setUser(currentUser);
                            localStorage.setItem(
                                "hvt_user",
                                JSON.stringify(currentUser),
                            );
                            if (currentUser.role === "admin") {
                                setActiveTab("student-dashboard");
                            } else {
                                setActiveTab("student-dashboard");
                            }
                        }
                    } else {
                        const [dbQuizzes, currentUser, dbSubmissions] =
                            await Promise.all([
                                getQuizzes().catch((e) => {
                                    console.warn("Lỗi tải đề thi:", e);
                                    return [] as Quiz[];
                                }),
                                getCurrentUser().catch((e) => {
                                    console.warn("Lỗi đồng bộ user:", e);
                                    return null;
                                }),
                                getSubmissions(
                                    parsedUser.role,
                                    parsedUser.id,
                                ).catch((e) => {
                                    console.warn("Lỗi tải bài nộp:", e);
                                    return [] as Submission[];
                                }),
                            ]);

                        if (dbQuizzes && dbQuizzes.length > 0) {
                            setQuizzes(dbQuizzes);
                        }
                        if (dbSubmissions && dbSubmissions.length > 0) {
                            setSubmissions(dbSubmissions);
                        }
                        if (currentUser) {
                            setUser(currentUser);
                            localStorage.setItem(
                                "hvt_user",
                                JSON.stringify(currentUser),
                            );
                            if (currentUser.role === "admin") {
                                setActiveTab("student-dashboard");
                            } else {
                                setActiveTab("student-dashboard");
                            }
                        }
                    }
                    setLoading(false);
                } else {
                    // Guest user or no session cache: check session and fetch quizzes in parallel
                    const [dbQuizzes, currentUser] = await Promise.all([
                        getQuizzes().catch((e) => {
                            console.warn("Lỗi tải đề thi:", e);
                            return [] as Quiz[];
                        }),
                        getCurrentUser().catch((e) => {
                            console.warn("Lỗi đồng bộ user:", e);
                            return null;
                        }),
                    ]);

                    if (dbQuizzes && dbQuizzes.length > 0) {
                        setQuizzes(dbQuizzes);
                    }

                    if (currentUser) {
                        setUser(currentUser);
                        localStorage.setItem(
                            "hvt_user",
                            JSON.stringify(currentUser),
                        );
                        if (currentUser.role === "admin") {
                            setActiveTab("student-dashboard");
                        } else {
                            setActiveTab("student-dashboard");
                        }
                    } else {
                        setUser(null);
                        localStorage.removeItem("hvt_user");
                        localStorage.removeItem("hvt_submissions");
                    }
                    setLoading(false);
                }
            } catch (err) {
                console.error("Lỗi khởi tạo dữ liệu:", err);
                setLoading(false);
            } finally {
                const endTime = performance.now();
                setLoadTimeMs(Math.round(endTime - startTime));
            }
        };
        fetchInitialData();
    }, []);
    // Sync URL popstate events
    useEffect(() => {
        const handleUrlChange = () => {
            setCurrentPath(window.location.pathname + window.location.search);
        };

        window.addEventListener("popstate", handleUrlChange);
        return () => window.removeEventListener("popstate", handleUrlChange);
    }, []);

    // Scroll to top on navigation/path change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [currentPath]);

    // Periodic check for any ongoing/unfinished attempt
    useEffect(() => {
        if (!user || user.role === "admin") {
            setOngoingAttempt(null);
            return;
        }

        const checkOngoing = async () => {
            try {
                const attempt = await getAnyActiveAttempt();
                setOngoingAttempt(attempt);
            } catch (err) {
                console.warn(
                    "Không thể kiểm tra lượt thi dang dở toàn cục:",
                    err,
                );
            }
        };

        checkOngoing();

        // Check every 10 seconds
        const interval = setInterval(checkOngoing, 10000);
        return () => clearInterval(interval);
    }, [user, currentPath]);

    // Exit browser fullscreen mode when student stops taking test
    useEffect(() => {
        if (!isTakingQuiz) {
            try {
                if (document.fullscreenElement && document.exitFullscreen) {
                    document.exitFullscreen();
                }
            } catch (err) {
                console.warn("Lỗi khi thoát chế độ toàn màn hình:", err);
            }
        }
    }, [isTakingQuiz]);

    const navigateTo = (path: string, bypassConfirm = false) => {
        if (!bypassConfirm && !confirmNavigation()) return;
        setCurrentPath(path);
        window.history.pushState(null, "", path);
    };

    // Use replaceState so that after quiz submission, pressing Back won't return to the quiz page
    const navigateReplace = (path: string) => {
        setCurrentPath(path);
        window.history.replaceState(null, "", path);
    };

    // State Mutation Handlers
    const handleAddQuiz = (newQuiz: Quiz) => {
        setQuizzes([newQuiz, ...quizzes]);
    };

    const handleUpdateQuiz = (updatedQuiz: Quiz) => {
        setQuizzes((prev) =>
            prev.map((q) => (q.id === updatedQuiz.id ? updatedQuiz : q)),
        );
    };

    const handleDeleteQuiz = async (quizId: string) => {
        try {
            await deleteQuiz(quizId);
            setQuizzes(quizzes.filter((q) => q.id !== quizId));
        } catch (err: any) {
            console.error("Failed to delete quiz:", err);
            alert(`Lỗi khi xóa đề thi: ${err.message}`);
        }
    };

    const handleAddSubmission = (newSub: Submission) => {
        // Tránh gọi API createSubmission trùng lặp vì Trigger DB đã tự động đồng bộ từ exam_attempts sang submissions
        setSubmissions([newSub, ...submissions]);
    };

    const handleLogin = async (loggedInUser: User) => {
        setUser(loggedInUser);
        setAuthModalOpen(false);
        if (loggedInUser.role === "admin") {
            setActiveTab("student-dashboard");
            navigateTo("/");
        } else {
            setActiveTab("student-dashboard");
            navigateTo("/");
        }
        try {
            setLoading(true);
            const [dbQuizzes, dbSubmissions] = await Promise.all([
                getQuizzes(),
                getSubmissions(loggedInUser.role, loggedInUser.id),
            ]);
            if (dbQuizzes && dbQuizzes.length > 0) {
                setQuizzes(dbQuizzes);
            }
            if (dbSubmissions && dbSubmissions.length > 0) {
                setSubmissions(dbSubmissions);
            }
        } catch (err) {
            console.error("Lỗi khi tải dữ liệu sau đăng nhập:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOutUser();
        } catch (err) {
            console.error("Lỗi khi đăng xuất:", err);
        }
        setUser(null);
        localStorage.removeItem("hvt_user");
        navigateTo("/");
    };

    return (
        <div
            className={`${isTakingOrReviewing ? "h-screen overflow-hidden" : "min-h-screen"} bg-[#F9F8F6] dark:bg-bg-base text-[#222B38] dark:text-text-primary font-sans antialiased flex flex-col selection:bg-brand-200`}
        >
            {/* TOPBAR NAVIGATION HEADER */}
            {!isTakingQuiz && (
                <Topbar
                    user={user}
                    selectedGrade={selectedGrade}
                    quizzes={quizzes}
                    onSelectGrade={(grade, category) => {
                        if (confirmNavigation()) {
                            setActiveTab("student-dashboard");
                            if (grade) {
                                let path = "/grade/" + grade;
                                if (category) {
                                    path +=
                                        "?category=" +
                                        encodeURIComponent(category);
                                }
                                navigateTo(path);
                            } else {
                                navigateTo("/");
                            }
                        }
                    }}
                    onOpenAuth={(mode = "login") => {
                        if (confirmNavigation()) {
                            setAuthMode(mode);
                            setAuthModalOpen(true);
                        }
                    }}
                    onLogout={() => {
                        if (confirmNavigation()) {
                            handleLogout();
                        }
                    }}
                    onNavigateAdmin={() => navigateTo("/admin")}
                    onNavigateHome={() => {
                        if (confirmNavigation()) {
                            setActiveTab("student-dashboard");
                            navigateTo("/");
                        }
                    }}
                    onNavigateSettings={(tab = "profile") => {
                        if (confirmNavigation()) {
                            navigateTo(
                                tab === "history" ? "/history" : "/settings",
                            );
                        }
                    }}
                    onNavigateLeaderboard={() => {
                        if (confirmNavigation()) {
                            navigateTo("/leaderboard");
                        }
                    }}
                    onNavigateSchedule={() => {
                        if (confirmNavigation()) {
                            navigateTo("/lich");
                        }
                    }}
                    activeTab={activeTab}
                    currentPath={currentPath}
                />
            )}

            {/* AUTH MODAL OVERLAY */}
            {authModalOpen && !user && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="relative w-full max-w-[420px] bg-white rounded-2xl shadow-xl overflow-hidden">
                        <button
                            onClick={() => setAuthModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center z-10"
                        >
                            ✕
                        </button>
                        <Auth
                            onLogin={handleLogin}
                            initialRole={
                                authMode === "register" ? "student" : "student"
                            }
                        />
                    </div>
                </div>
            )}

            {/* MAIN CONTENT CANVAS */}
            <main
                className={`flex-1 flex flex-col min-w-0 ${isTakingOrReviewing || currentPath === "/admin" ? "min-h-0 overflow-hidden" : ""}`}
            >
                <div
                    className={
                        isTakingOrReviewing || currentPath === "/admin"
                            ? "flex-1 flex flex-col min-h-0 overflow-hidden"
                            : "flex-1 flex flex-col min-h-[calc(100vh-30px)]"
                    }
                >
                    {/* 1. ADMIN PANEL ROUTE */}
                    {currentPath === "/admin" ? (
                        user && user.role === "admin" ? (
                            <AdminPanel
                                quizzes={quizzes}
                                submissions={submissions}
                                onAddQuiz={handleAddQuiz}
                                onDeleteQuiz={handleDeleteQuiz}
                                onUpdateQuiz={handleUpdateQuiz}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center p-6 bg-bg-base">
                                <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                        className="w-8 h-8"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z"
                                        />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                    Không có quyền truy cập
                                </h2>
                                <p className="text-xs text-slate-500 max-w-sm">
                                    Bạn không có quyền truy cập vào trang quản
                                    trị. Vui lòng đăng nhập với tài khoản Admin.
                                </p>
                                <button
                                    onClick={() => navigateTo("/")}
                                    className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                                >
                                    Quay lại Trang chủ
                                </button>
                            </div>
                        )
                    ) : routeInfo.route === "google-callback" ? (
                        <GoogleCallback
                            onLogin={handleLogin}
                            navigateTo={navigateTo}
                        />
                    ) : routeInfo.route === "schedule" ? (
                        <ScheduleView
                            user={user}
                            onNavigate={navigateTo}
                            onOpenContactModal={() => setGlobalContactModalOpen(true)}
                            onOpenBugModal={() => setGlobalBugModalOpen(true)}
                        />
                    ) : !user ? (
                        /* 2. UNAUTHENTICATED LANDING PAGE (100% MATCH TO DESIGN IMAGE) */
                        <LandingPage
                            onOpenAuth={(mode = "login") => {
                                setAuthMode(mode);
                                setAuthModalOpen(true);
                            }}
                        />
                    ) : (
                        /* 3. AUTHENTICATED USER DASHBOARD VIEW (TOPBAR BASED) */
                        <div
                            className={`flex-1 bg-transparent flex flex-col ${isTakingOrReviewing ? "min-h-0 overflow-hidden" : ""}`}
                        >
                            {(() => {
                                if (
                                    currentPath === "/settings" ||
                                    currentPath === "/history"
                                ) {
                                    return (
                                        <SettingsView
                                            user={user}
                                            onUpdateUser={(updatedUser) =>
                                                setUser(updatedUser)
                                            }
                                            onLogout={handleLogout}
                                            theme={theme}
                                            submissions={submissions}
                                            quizzes={quizzes}
                                            initialTab={
                                                currentPath === "/history"
                                                    ? "history"
                                                    : "profile"
                                            }
                                            onTabChange={(tab) => {
                                                window.history.pushState(
                                                    null,
                                                    "",
                                                    tab === "history"
                                                        ? "/history"
                                                        : "/settings",
                                                );
                                                setCurrentPath(
                                                    tab === "history"
                                                        ? "/history"
                                                        : "/settings",
                                                );
                                            }}
                                            onNavigate={navigateTo}
                                        />
                                    );
                                }

                                if (isTakingOrReviewing) {
                                    return (
                                        <StudentDashboard
                                            user={user}
                                            quizzes={filteredQuizzes}
                                            submissions={submissions}
                                            onAddSubmission={
                                                handleAddSubmission
                                            }
                                            activeTab={activeTab}
                                            selectedGrade={selectedGrade}
                                            onSelectGrade={(
                                                grade,
                                                category,
                                            ) => {
                                                if (confirmNavigation()) {
                                                    if (grade) {
                                                        let path =
                                                            "/grade/" + grade;
                                                        if (category) {
                                                            path +=
                                                                "?category=" +
                                                                encodeURIComponent(
                                                                    category,
                                                                );
                                                        }
                                                        navigateTo(path);
                                                    } else {
                                                        navigateTo("/");
                                                    }
                                                }
                                            }}
                                            onQuizStateChange={setIsTakingQuiz}
                                            activeQuizId={activeQuizId}
                                            reviewSubmissionId={
                                                reviewSubmissionId
                                            }
                                            onNavigate={navigateTo}
                                            navigateReplace={navigateReplace}
                                            ongoingAttempt={ongoingAttempt}
                                            loading={loading}
                                            currentPath={currentPath}
                                        />
                                    );
                                }

                                if (currentPath === "/leaderboard") {
                                    return (
                                        <LeaderboardView
                                            user={user}
                                            quizzes={quizzes}
                                            submissions={submissions}
                                            onNavigate={navigateTo}
                                            initialData={prefetchedLeaderboard}
                                        />
                                    );
                                }

                                if (
                                    (user.role === "admin" ||
                                        currentPath === "/trang" ||
                                        currentPath === "/teacher") &&
                                    activeTab !== "student-dashboard"
                                ) {
                                    return (
                                        <AdminDashboard
                                            quizzes={quizzes}
                                            submissions={submissions}
                                            onAddQuiz={handleAddQuiz}
                                            onDeleteQuiz={handleDeleteQuiz}
                                            activeTab={activeTab}
                                        />
                                    );
                                }

                                return (
                                    <StudentDashboard
                                        user={user}
                                        quizzes={filteredQuizzes}
                                        submissions={submissions}
                                        onAddSubmission={handleAddSubmission}
                                        activeTab={activeTab}
                                        selectedGrade={selectedGrade}
                                        onSelectGrade={(grade, category) => {
                                            if (confirmNavigation()) {
                                                if (grade) {
                                                    let path =
                                                        "/grade/" + grade;
                                                    if (category) {
                                                        path +=
                                                            "?category=" +
                                                            encodeURIComponent(
                                                                category,
                                                            );
                                                    }
                                                    navigateTo(path);
                                                } else {
                                                    navigateTo("/");
                                                }
                                            }
                                        }}
                                        onQuizStateChange={setIsTakingQuiz}
                                        activeQuizId={activeQuizId}
                                        reviewSubmissionId={reviewSubmissionId}
                                        onNavigate={navigateTo}
                                        navigateReplace={navigateReplace}
                                        ongoingAttempt={ongoingAttempt}
                                        loading={loading}
                                        currentPath={currentPath}
                                    />
                                );
                            })()}
                        </div>
                    )}
                </div>
                {!isTakingOrReviewing &&
                    currentPath !== "/admin" &&
                    currentPath !== "/trang" &&
                    currentPath !== "/teacher" && (
                        <Footer
                            onSelectGrade={(grade, category) => {
                                setActiveTab("student-dashboard");
                                if (grade) {
                                    let path = "/grade/" + grade;
                                    if (category) {
                                        path +=
                                            "?category=" +
                                            encodeURIComponent(category);
                                    }
                                    navigateTo(path);
                                } else {
                                    navigateTo("/");
                                }
                            }}
                            onNavigate={navigateTo}
                            onOpenContactModal={() =>
                                setGlobalContactModalOpen(true)
                            }
                            onOpenBugModal={() => setGlobalBugModalOpen(true)}
                            userLoggedIn={!!user}
                        />
                    )}
            </main>
            {!isSupportDismissed && (
                <div className="fixed bottom-4 left-4 z-40 w-46 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/60 dark:border-slate-800 rounded-xl p-3.5 shadow-lg space-y-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-blue-500 dark:text-blue-300">
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                Cần trợ giúp?
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setIsSupportDismissed(true);
                            }}
                            className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 transition-colors cursor-pointer flex items-center justify-center p-0.5 rounded-full hover:bg-slate-200/50"
                            title="Đóng"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>

                    {/* Text */}
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-normal font-medium">
                        Báo cáo sự cố hoặc đăng ký học cô Trang 🌸
                    </p>

                    {/* Buttons Row - Horizontal */}
                    <div className="flex gap-1.5">
                        <button
                            type="button"
                            onClick={() => setGlobalContactModalOpen(true)}
                            className="flex-1 py-1.5 bg-emerald-50/80 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-bold text-center block transition-colors duration-150 cursor-pointer"
                        >
                            Đăng ký
                        </button>
                        <button
                            type="button"
                            onClick={() => setGlobalBugModalOpen(true)}
                            className="flex-1 py-1.5 bg-rose-50/80 hover:bg-rose-100/80 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 border border-rose-100/30 dark:border-rose-900/40 text-rose-655 dark:text-rose-455 rounded-md text-[10px] font-bold text-center block transition-colors duration-150 cursor-pointer"
                        >
                            Có lỗi?
                        </button>
                    </div>
                </div>
            )}

            {/* Floating Unfinished Attempt Widget */}
            {ongoingAttempt &&
                !isOngoingAttemptDismissed &&
                currentPath !== `/quiz/${ongoingAttempt.quiz_id}` && (
                    <div className="fixed bottom-6 right-6 z-40 w-48 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-blue-100 dark:border-blue-900 rounded-xl p-3 shadow-lg space-y-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400 font-extrabold">
                                <span className="text-[10px] font-bold uppercase tracking-wider">
                                    Bài thi chưa nộp!
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOngoingAttemptDismissed(true);
                                }}
                                className="text-slate-400 hover:text-slate-655 transition-colors cursor-pointer flex items-center justify-center p-0.5 rounded-full hover:bg-slate-200/50"
                                title="Đóng thông báo"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="space-y-1">
                            <h4 className="text-[11px] font-bold text-slate-800 leading-snug truncate block w-full">
                                {quizzes.find(
                                    (q) => q.id === ongoingAttempt.quiz_id,
                                )?.title || "Bài làm dang dở"}
                            </h4>
                            <p className="text-[9px] text-slate-400 font-medium">
                                Hệ thống đang bảo lưu bài làm.
                            </p>
                        </div>

                        {/* Action Button */}
                        <button
                            type="button"
                            onClick={() => {
                                navigateTo(`/quiz/${ongoingAttempt.quiz_id}`);
                            }}
                            className="w-full py-2 bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-700 hover:to-blue-800 text-white rounded-md text-[10px] font-extrabold text-center flex items-center justify-center gap-1 transition-all duration-150 cursor-pointer shadow-sm shadow-blue-500/10 active:scale-98"
                        >
                            <span>Tiếp tục làm bài</span>
                            <ArrowRight className="w-3 h-3 animate-pulse" />
                        </button>
                    </div>
                )}

            {/* Global Contact Modal */}
            {globalContactModalOpen && (
                <div
                    onClick={() => setGlobalContactModalOpen(false)}
                    className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs flex items-center justify-center z-[100] animate-in fade-in duration-200 cursor-pointer"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl p-6 w-full max-w-xs border border-slate-100 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-150 relative cursor-default"
                    >
                        {/* Close button X */}
                        <button
                            type="button"
                            onClick={() => setGlobalContactModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 hover:bg-slate-100 p-1 rounded-full transition-all cursor-pointer flex items-center justify-center"
                            title="Đóng"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>

                        <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mt-2">
                            <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-lg relative z-10 bg-amber-50">
                                <img
                                    src="/images/trang.jpg"
                                    alt="Cô Trang"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Liên hệ cô Trang
                            </h3>
                            <p className="text-[11px] text-slate-400">
                                Chọn phương thức liên hệ thuận tiện nhất:
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 pt-1 text-left">
                            <a
                                href="https://zalo.me/0914765601"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                                <span>Zalo (Cô Trang)</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                    Mở Zalo →
                                </span>
                            </a>
                            <a
                                href="https://m.me/nguyen.trang.724265"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                                <span>Messenger</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                    Mở chat →
                                </span>
                            </a>
                            <a
                                href="https://www.facebook.com/nguyen.trang.724265"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                                <span>Facebook Cô Trang</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                    Ghé thăm →
                                </span>
                            </a>
                            <a
                                href="tel:0914765601"
                                className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                                <span>Hotline / SĐT</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                    Gọi ngay →
                                </span>
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Bug Report Modal */}
            {globalBugModalOpen && (
                <div
                    onClick={() => {
                        setGlobalBugModalOpen(false);
                        setBugSubmitted(false);
                    }}
                    className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs flex items-center justify-center z-[100] animate-in fade-in duration-200 cursor-pointer"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl p-6 w-full max-w-sm border border-slate-100 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-150 relative cursor-default"
                    >
                        {/* Close button X */}
                        <button
                            type="button"
                            onClick={() => {
                                setGlobalBugModalOpen(false);
                                setBugSubmitted(false);
                            }}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 hover:bg-slate-100 p-1 rounded-full transition-all cursor-pointer flex items-center justify-center"
                            title="Đóng"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>

                        {bugSubmitted ? (
                            <div className="text-center space-y-4 py-4">
                                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle2 className="w-6 h-6 animate-bounce" />
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="text-sm font-bold text-slate-800">
                                        Gửi thành công!
                                    </h3>
                                    <p className="text-[11px] text-slate-500 leading-relaxed px-2 font-medium">
                                        Cảm ơn đóng góp của bạn! Thông tin lỗi
                                        đã được ghi nhận để kiểm tra và sửa đổi
                                        sớm nhất.
                                    </p>
                                </div>
                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setGlobalBugModalOpen(false);
                                            setBugSubmitted(false);
                                            setBugTitle("");
                                            setBugContent("");
                                        }}
                                        className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                    >
                                        Đóng lại
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (
                                        !bugTitle.trim() ||
                                        !bugContent.trim()
                                    ) {
                                        return;
                                    }
                                    try {
                                        const fullDesc = `Tiêu đề: ${bugTitle.trim()}\n\nChi tiết: ${bugContent.trim()}`;
                                        await submitBugReport(bugSenderName.trim() || "Ẩn danh", fullDesc);
                                        setBugSubmitted(true);
                                    } catch (err: any) {
                                        alert("Lỗi khi gửi báo cáo: " + (err.message || err));
                                    }
                                }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-1.5 text-rose-300 dark:text-rose-400">
                                    <span className="text-xs font-bold uppercase">
                                        Báo cáo lỗi hệ thống 🌸
                                    </span>
                                </div>

                                <div className="space-y-3 text-left">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-450 uppercase">
                                            Tiêu đề lỗi
                                        </label>
                                        <input
                                            type="text"
                                            value={bugTitle}
                                            onChange={(e) =>
                                                setBugTitle(e.target.value)
                                            }
                                            placeholder="Ví dụ: Lỗi hiển thị công thức Toán ở câu số 5"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-rose-100 focus:border-rose-450 outline-none bg-slate-50/30"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-450 uppercase">
                                            Tên người gửi
                                        </label>
                                        <input
                                            type="text"
                                            value={bugSenderName}
                                            onChange={(e) =>
                                                setBugSenderName(e.target.value)
                                            }
                                            placeholder="Nhập họ và tên của bạn nếu muốn"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-rose-100 focus:border-rose-450 outline-none bg-slate-50/30"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-450 uppercase">
                                            Chi tiết lỗi gặp phải
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={bugContent}
                                            onChange={(e) =>
                                                setBugContent(e.target.value)
                                            }
                                            placeholder="Mô tả chi tiết lỗi để cô Trang hỗ trợ bạn tốt nhất..."
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-rose-100 focus:border-rose-450 outline-none bg-slate-50/30 resize-none"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Lời cảm ơn */}
                                <p className="text-[10px] text-slate-500 leading-normal italic text-left font-medium">
                                    🌸 Lời cảm ơn: Cảm ơn bạn rất nhiều!
                                </p>

                                <div className="pt-1">
                                    <button
                                        type="submit"
                                        className="w-full py-2 bg-rose-400 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                                    >
                                        Gửi báo cáo
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Performance / Latency Indicator */}
            {loadTimeMs !== null && (
                <div className="fixed bottom-1.5 right-4 z-40 flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono text-slate-400 dark:text-slate-500 select-none pointer-events-none">
                    <span
                        className={`w-1 h-1 rounded-full ${
                            loadTimeMs < 300
                                ? "bg-emerald-500"
                                : loadTimeMs < 800
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                        }`}
                    />
                    <span>{loadTimeMs}ms</span>
                </div>
            )}
        </div>
    );
}
