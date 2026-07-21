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
import { getCurrentUser, signOutUser, getQuizzes, getSubmissions } from "./lib/supabaseService";

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
    const [currentPath, setCurrentPath] = useState<"/" | "/admin" | "/trang">(() => {
        const pathname = window.location.pathname;
        if (pathname === "/admin") return "/admin";
        if (pathname === "/trang") return "/trang";
        return "/";
    });

    const [selectedGrade, setSelectedGrade] = useState<string | null>(null);

    // Auth modal state
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [authMode, setAuthMode] = useState<"login" | "register">("login");

    // Local Data States
    const [quizzes, setQuizzes] = useState<Quiz[]>(() => {
        const saved = localStorage.getItem("hvt_quizzes");
        return saved ? JSON.parse(saved) : INITIAL_QUIZZES;
    });

    const [submissions, setSubmissions] = useState<Submission[]>(() => {
        const saved = localStorage.getItem("hvt_submissions");
        return saved ? JSON.parse(saved) : INITIAL_SUBMISSIONS;
    });

    // User Session State
    const [user, setUser] = useState<User | null>(() => {
        const saved = localStorage.getItem("hvt_user");
        return saved ? JSON.parse(saved) : null;
    });

    const [activeTab, setActiveTab] = useState<string>("student-dashboard");

    // Sync to localStorage
    useEffect(() => {
        localStorage.setItem("hvt_quizzes", JSON.stringify(quizzes));
    }, [quizzes]);

    useEffect(() => {
        localStorage.setItem("hvt_submissions", JSON.stringify(submissions));
    }, [submissions]);

    useEffect(() => {
        if (user) {
            localStorage.setItem("hvt_user", JSON.stringify(user));
        } else {
            localStorage.removeItem("hvt_user");
        }
    }, [user]);

    // Check Supabase session on mount
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const dbQuizzes = await getQuizzes();
                if (dbQuizzes.length > 0) {
                    setQuizzes(dbQuizzes);
                }

                const currentUser = await getCurrentUser();
                if (currentUser) {
                    setUser(currentUser);
                }
            } catch (err) {
                console.error("Lỗi khởi tạo dữ liệu:", err);
            }
        };
        fetchInitialData();
    }, []);

    // Sync URL popstate events
    useEffect(() => {
        const handleUrlChange = () => {
            const pathname = window.location.pathname;
            if (pathname === "/admin") setCurrentPath("/admin");
            else if (pathname === "/trang") setCurrentPath("/trang");
            else setCurrentPath("/");
        };

        window.addEventListener("popstate", handleUrlChange);
        return () => window.removeEventListener("popstate", handleUrlChange);
    }, []);

    const navigateTo = (path: "/" | "/admin" | "/trang") => {
        setCurrentPath(path);
        window.history.pushState(null, "", path);
    };

    // State Mutation Handlers
    const handleAddQuiz = (newQuiz: Quiz) => {
        setQuizzes([newQuiz, ...quizzes]);
    };

    const handleDeleteQuiz = (quizId: string) => {
        setQuizzes(quizzes.filter((q) => q.id !== quizId));
    };

    const handleAddSubmission = (newSub: Submission) => {
        setSubmissions([...submissions, newSub]);
    };

    const handleLogin = (loggedInUser: User) => {
        setUser(loggedInUser);
        setAuthModalOpen(false);
        if (loggedInUser.role === "teacher") {
            navigateTo("/trang");
        } else {
            navigateTo("/");
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
        <div className="min-h-screen bg-[#F9F8F6] text-[#222B38] font-sans antialiased flex flex-col selection:bg-brand-200">
            
            {/* TOPBAR NAVIGATION HEADER */}
            <Topbar
                user={user}
                selectedGrade={selectedGrade}
                onSelectGrade={setSelectedGrade}
                onOpenAuth={(mode = "login") => {
                    setAuthMode(mode);
                    setAuthModalOpen(true);
                }}
                onLogout={handleLogout}
                onNavigateAdmin={() => navigateTo("/admin")}
                onNavigateHome={() => navigateTo("/")}
                onNavigateSettings={() => {
                    setActiveTab("settings");
                    navigateTo("/");
                }}
                currentPath={currentPath}
            />

            {/* AUTH MODAL OVERLAY */}
            {authModalOpen && !user && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
                        <button
                            onClick={() => setAuthModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center z-10"
                        >
                            ✕
                        </button>
                        <Auth
                            onLogin={handleLogin}
                            initialRole={authMode === "register" ? "student" : "student"}
                        />
                    </div>
                </div>
            )}

            {/* MAIN CONTENT CANVAS */}
            <main className="flex-1 flex flex-col min-w-0">
                
                {/* 1. ADMIN PANEL ROUTE */}
                {currentPath === "/admin" ? (
                    <AdminPanel
                        quizzes={quizzes}
                        submissions={submissions}
                        onAddQuiz={handleAddQuiz}
                        onDeleteQuiz={handleDeleteQuiz}
                    />
                ) : !user ? (
                    /* 2. UNAUTHENTICATED LANDING PAGE (100% MATCH TO DESIGN IMAGE) */
                    <LandingPage
                        quizzes={quizzes}
                        selectedGrade={selectedGrade}
                        onSelectGrade={setSelectedGrade}
                        onOpenAuth={(mode = "login") => {
                            setAuthMode(mode);
                            setAuthModalOpen(true);
                        }}
                        onSelectQuizToPreview={(quiz) => {
                            setAuthMode("register");
                            setAuthModalOpen(true);
                        }}
                    />
                ) : (
                    /* 3. AUTHENTICATED USER DASHBOARD VIEW (TOPBAR BASED) */
                    <div className="flex-1 bg-white">
                        {activeTab === "settings" ? (
                            <SettingsView
                                user={user}
                                onUpdateUser={(updatedUser) => setUser(updatedUser)}
                                onLogout={handleLogout}
                                theme={theme}
                            />
                        ) : user.role === "teacher" || currentPath === "/trang" ? (
                            <AdminDashboard
                                quizzes={quizzes}
                                submissions={submissions}
                                onAddQuiz={handleAddQuiz}
                                onDeleteQuiz={handleDeleteQuiz}
                                activeTab={activeTab}
                            />
                        ) : (
                            <StudentDashboard
                                user={user}
                                quizzes={quizzes}
                                submissions={submissions}
                                onAddSubmission={handleAddSubmission}
                                activeTab={activeTab}
                            />
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
