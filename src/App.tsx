import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Link, ArrowLeftRight, Sparkles, GraduationCap } from "lucide-react";
import { Quiz, Submission, User } from "./types";
import { INITIAL_QUIZZES, INITIAL_SUBMISSIONS } from "./data";
import Auth from "./components/Auth";
import Sidebar from "./components/Sidebar";
import AdminDashboard from "./components/AdminDashboard";
import StudentDashboard from "./components/StudentDashboard";
import SettingsView from "./components/SettingsView";
import { getCurrentUser, signOutUser } from "./lib/supabaseService";

export default function App() {
    // Theme state (Dark/Light)
    const [theme, setTheme] = useState<"light" | "dark">(() => {
        const saved = localStorage.getItem("hitrang_theme");
        if (saved === "dark" || saved === "light") return saved;
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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

    // Sync router path state
    const [currentPath, setCurrentPath] = useState<"/" | "/trang">(() => {
        const pathname = window.location.pathname;
        return pathname === "/trang" ? "/trang" : "/";
    });

    // Local Storage state hooks for state persistence
    const [quizzes, setQuizzes] = useState<Quiz[]>(() => {
        const saved = localStorage.getItem("hvt_quizzes");
        return saved ? JSON.parse(saved) : INITIAL_QUIZZES;
    });

    const [submissions, setSubmissions] = useState<Submission[]>(() => {
        const saved = localStorage.getItem("hvt_submissions");
        return saved ? JSON.parse(saved) : INITIAL_SUBMISSIONS;
    });

    // User Authentication state
    const [user, setUser] = useState<User | null>(() => {
        const saved = localStorage.getItem("hvt_user");
        return saved ? JSON.parse(saved) : null;
    });

    // Sidebar toggle state (mobile)
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Active Tab within selected dashboard
    const [activeTab, setActiveTab] = useState<string>(() => {
        const pathname = window.location.pathname;
        const isTeacher = pathname === "/trang";
        return isTeacher ? "overview" : "student-dashboard";
    });

    // Sync to local storage
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
        const fetchSession = async () => {
            try {
                const currentUser = await getCurrentUser();
                if (currentUser) {
                    setUser(currentUser);
                    if (currentUser.role === "teacher") {
                        navigateToPath("/trang");
                    } else {
                        navigateToPath("/");
                    }
                }
            } catch (err) {
                console.error("Lỗi kiểm tra phiên đăng nhập:", err);
            }
        };
        fetchSession();
    }, []);

    // Sync URL path changes
    useEffect(() => {
        const handleUrlChange = () => {
            const pathname = window.location.pathname;
            if (pathname === "/trang") {
                setCurrentPath("/trang");
                setActiveTab("overview");
            } else {
                setCurrentPath("/");
                setActiveTab("student-dashboard");
            }
        };

        window.addEventListener("popstate", handleUrlChange);
        return () => {
            window.removeEventListener("popstate", handleUrlChange);
        };
    }, []);

    // Update URL manually
    const navigateToPath = (path: "/" | "/trang") => {
        setCurrentPath(path);
        window.history.pushState(null, "", path);

        // Auto align active tab based on new path
        if (path === "/trang") {
            setActiveTab("overview");
            // If user is student, we switch them to teacher role for easy previewing, or prompt login
            if (user && user.role !== "teacher") {
                // Log out or adapt role for ease of testing
                setUser({
                    id: "tch_test",
                    name: "Cô Nguyễn Mai Hoa",
                    username: "maihoa_teacher",
                    role: "teacher",
                });
            }
        } else {
            setActiveTab("student-dashboard");
            if (user && user.role !== "student") {
                setUser({
                    id: "std_test",
                    name: "Nguyễn Văn An",
                    username: "vanan",
                    role: "student",
                });
            }
        }
    };

    // State mutation actions
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

        // Force path redirection based on logged in role
        if (loggedInUser.role === "teacher") {
            navigateToPath("/trang");
        } else {
            navigateToPath("/");
        }
    };

    const handleLogout = async () => {
        try {
            await signOutUser();
        } catch (err) {
            console.error("Lỗi khi đăng xuất khỏi Supabase:", err);
        }
        setUser(null);
        localStorage.removeItem("hvt_user");
    };

    return (
        <div className="min-h-screen bg-bg-surface dark:bg-bg-base font-sans antialiased flex flex-col">
            {/* Dynamic Route Indicator / Path Swapper Panel */}

            {/* Main Core Layout Wrapper */}
            {!user ? (
                // Auth login/register view
                <Auth
                    onLogin={handleLogin}
                    initialRole={
                        currentPath === "/trang" ? "teacher" : "student"
                    }
                />
            ) : (
                // Logged-in full layout view
                <div className="flex-1 flex flex-col lg:flex-row bg-bg-base text-text-primary transition-colors duration-200">
                    {/* Universal Left Sidebar component */}
                    <Sidebar
                        user={user}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        onLogout={handleLogout}
                        isOpen={sidebarOpen}
                        setIsOpen={setSidebarOpen}
                        theme={theme}
                        setTheme={setTheme}
                    />

                    {/* Main Dashboard Panel */}
                    <main className="flex-1 flex flex-col min-w-0 bg-bg-surface dark:bg-bg-base text-text-primary transition-colors duration-200">
                        {activeTab === "settings" ? (
                            <SettingsView
                                user={user}
                                onUpdateUser={(updatedUser) => setUser(updatedUser)}
                                onLogout={handleLogout}
                                theme={theme}
                            />
                        ) : user.role === "teacher" ? (
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
                    </main>
                </div>
            )}
        </div>
    );
}
