import React, { useState } from "react";
import { User, Quiz, Submission } from "../types";
import {
    getAllProfiles,
    verifyAdminPasswordWithEdgeFunction,
} from "../lib/supabaseService";
import {
    Shield,
    Lock,
    AlertCircle,
    Search,
    ChevronDown,
    Plus,
    BookOpen,
    BarChart3,
    UserCheck,
    User as UserIcon,
    Download,
    Upload,
    Activity,
} from "lucide-react";

import AdminPlansTab from "./AdminPlansTab";
import AdminCreateQuizTab from "./AdminCreateQuizTab";
import AdminQuizzesTab from "./AdminQuizzesTab";
import AdminStatsQuizzesTab from "./AdminStatsQuizzesTab";
import AdminStatsStudentsTab from "./AdminStatsStudentsTab";
import AdminSubmissionReviewer from "./AdminSubmissionReviewer";
import AdminApiTab from "./AdminApiTab";

interface AdminPanelProps {
    quizzes: Quiz[];
    submissions: Submission[];
    onAddQuiz: (newQuiz: Quiz) => void;
    onDeleteQuiz: (quizId: string) => void;
    onUpdateQuiz: (updatedQuiz: Quiz) => void;
}

export default function AdminPanel({
    quizzes,
    submissions,
    onAddQuiz,
    onDeleteQuiz,
    onUpdateQuiz,
}: AdminPanelProps) {
    // Persist admin verification across reloads
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        return sessionStorage.getItem("admin_verified") === "true";
    });
    const [passwordInput, setPasswordInput] = useState("");
    const [authError, setAuthError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);

    const [activeTab, setActiveTab] = useState<
        "plans" | "create-quiz" | "quizzes" | "stats-quizzes" | "stats-students" | "api-monitor"
    >("plans");

    const [antiCheatEnabled, setAntiCheatEnabled] = useState<boolean>(() => {
        return localStorage.getItem("hitrang_anti_cheat_enabled") !== "false";
    });

    const handleToggleAntiCheat = (val: boolean) => {
        setAntiCheatEnabled(val);
        localStorage.setItem(
            "hitrang_anti_cheat_enabled",
            val ? "true" : "false",
        );
    };

    const handleTabClick = (
        tab:
            | "plans"
            | "create-quiz"
            | "quizzes"
            | "stats-quizzes"
            | "stats-students"
            | "api-monitor",
    ) => {
        setActiveTab(tab);
        setAdminReviewSubmission(null);
    };

    const [userProfiles, setUserProfiles] = useState<User[]>([]);
    const [loadingProfiles, setLoadingProfiles] = useState(false);
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

    const [adminReviewSubmission, setAdminReviewSubmission] =
        useState<Submission | null>(null);

    // Fetch profiles on mount if already authenticated
    React.useEffect(() => {
        if (isAuthenticated) {
            fetchProfiles();
        }
    }, [isAuthenticated]);

    const [adminUser] = useState<User | null>(() => {
        const saved = localStorage.getItem("hvt_user");
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return null;
            }
        }
        return null;
    });

    const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");

    // Password verification via Supabase Edge Function 'verify-admin'
    const handleVerifyPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError(null);
        setVerifying(true);
        try {
            const isValid =
                await verifyAdminPasswordWithEdgeFunction(passwordInput);
            if (isValid) {
                setIsAuthenticated(true);
                sessionStorage.setItem("admin_verified", "true");
                fetchProfiles();
            } else {
                setAuthError(
                    "Xác thực thất bại qua Supabase Edge Function 'verify-admin'. Mật khẩu không đúng.",
                );
            }
        } catch (err: any) {
            setAuthError(`Lỗi xác thực Edge Function: ${err.message}`);
        } finally {
            setVerifying(false);
        }
    };

    // Load profiles from Supabase
    const fetchProfiles = async () => {
        setLoadingProfiles(true);
        try {
            const data = await getAllProfiles();
            setUserProfiles(data);
        } catch (err) {
            console.error("Lỗi khi tải danh sách hồ sơ:", err);
        } finally {
            setLoadingProfiles(false);
        }
    };

    const handleDownloadBackup = async () => {
        try {
            const token = localStorage.getItem("hitrang_token");
            const apiUrl = import.meta.env.VITE_API_URL || "/api";
            const response = await fetch(`${apiUrl}/admin/backup`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) throw new Error("Không thể tải file backup");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `hitrang_backup_${new Date().toISOString().slice(0, 10)}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err: any) {
            alert("Lỗi khi tải file backup: " + err.message);
        }
    };

    const handleUploadRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const file = files[0];
        if (
            !window.confirm(
                `Bạn có chắc chắn muốn phục hồi cơ sở dữ liệu từ file "${file.name}" không?\nHÀNH ĐỘNG NÀY SẼ XÓA TOÀN BỘ dữ liệu hiện tại trên database mới và thay thế bằng dữ liệu trong file backup!`,
            )
        ) {
            return;
        }

        const formData = new FormData();
        formData.append("backup_file", file);

        try {
            const token = localStorage.getItem("hitrang_token");
            const apiUrl = import.meta.env.VITE_API_URL || "/api";
            const response = await fetch(`${apiUrl}/admin/restore`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Lỗi khôi phục dữ liệu");
            alert("Phục hồi dữ liệu thành công!");
            fetchProfiles();
        } catch (err: any) {
            alert("Lỗi khi khôi phục dữ liệu: " + err.message);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="max-w-md mx-auto my-16 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl space-y-6 text-center animate-in fade-in duration-300">
                <div className="w-16 h-16 text-brand-600 rounded-2xl flex items-center justify-center mx-auto bg-slate-50 border border-slate-100">
                    <Shield className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                    Trang Quản Trị Hệ Thống (Admin)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                    Yêu cầu xác thực (ví dụ: admin123).
                </p>
                <form
                    onSubmit={handleVerifyPassword}
                    className="space-y-4 text-left"
                >
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                        Mật khẩu Admin:
                    </label>
                    <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                            type="password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            placeholder="Nhập mật khẩu"
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                        />
                    </div>
                    {authError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                            <span>{authError}</span>
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={verifying}
                        className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer"
                    >
                        {verifying
                            ? "Đang xác thực..."
                            : "Xác Nhận Truy Cập Admin"}
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-[#FDFDFD]">
            {/* LEFT SIDEBAR */}
            <aside className="w-64 bg-bg-card border-r border-border-primary flex flex-col justify-between h-full select-none shrink-0">
                <div className="flex flex-col min-h-0">
                    {/* Profile Section */}
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-border-primary bg-gray-50/20">
                        <div className="w-9 h-9 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 flex items-center justify-center text-[#1B72E8] dark:text-blue-400 shrink-0">
                            <UserIcon className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-slate-800 truncate leading-snug">
                                {adminUser?.name || "Giáo viên"}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5 truncate font-medium">
                                Quản trị viên
                            </span>
                        </div>
                    </div>

                    {/* Search settings input */}
                    <div className="px-6 py-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Tìm cài đặt..."
                                value={sidebarSearchQuery}
                                onChange={(e) =>
                                    setSidebarSearchQuery(e.target.value)
                                }
                                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-400 text-slate-705"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        </div>
                    </div>

                    {/* Nav Categories */}
                    <div className="flex-1 overflow-y-auto py-2">
                        {/* Group 1: General Settings */}
                        {(!sidebarSearchQuery ||
                            "quản lý account".includes(
                                sidebarSearchQuery.toLowerCase(),
                            )) && (
                            <div className="space-y-0.5 mb-4">
                                <div className="flex items-center justify-between px-6 py-2">
                                    <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase">
                                        QUẢN LÝ CHUNG
                                    </span>
                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                </div>
                                <button
                                    onClick={() => handleTabClick("plans")}
                                    className={`w-full flex items-center gap-3 py-2.5 text-xs transition-all cursor-pointer ${
                                        activeTab === "plans"
                                            ? "pl-5 pr-6 bg-[#EBF3FF]/60 text-[#1B72E8] border-l-4 border-[#1B72E8] font-bold"
                                            : "pl-[24px] pr-6 text-[#70757A] hover:text-slate-800 hover:bg-slate-50/50 font-medium"
                                    }`}
                                >
                                    <UserIcon className="w-4 h-4 shrink-0" />
                                    <span>Tài khoản</span>
                                </button>
                            </div>
                        )}

                        {/* Group 2: Workspace Settings */}
                        {(!sidebarSearchQuery ||
                            "tạo / sửa đề thi".includes(
                                sidebarSearchQuery.toLowerCase(),
                            ) ||
                            "danh sách đề thi".includes(
                                sidebarSearchQuery.toLowerCase(),
                            ) ||
                            "chống gian lận".includes(
                                sidebarSearchQuery.toLowerCase(),
                            )) && (
                            <div className="space-y-0.5 mb-4">
                                <div className="flex items-center justify-between px-6 py-2">
                                    <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase">
                                        QUẢN LÝ ĐỀ THI
                                    </span>
                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                </div>

                                {(!sidebarSearchQuery ||
                                    "tạo / sửa đề thi".includes(
                                        sidebarSearchQuery.toLowerCase(),
                                    )) && (
                                    <button
                                        onClick={() =>
                                            handleTabClick("create-quiz")
                                        }
                                        className={`w-full flex items-center gap-3 py-2.5 text-xs transition-all cursor-pointer ${
                                            activeTab === "create-quiz"
                                                ? "pl-5 pr-6 bg-[#EBF3FF]/60 text-[#1B72E8] border-l-4 border-[#1B72E8] font-bold"
                                                : "pl-[24px] pr-6 text-[#70757A] hover:text-slate-800 hover:bg-slate-50/50 font-medium"
                                        }`}
                                    >
                                        <Plus className="w-4 h-4 shrink-0" />
                                        <span>Tạo / Sửa Đề Thi</span>
                                    </button>
                                )}

                                {(!sidebarSearchQuery ||
                                    "danh sách đề thi".includes(
                                        sidebarSearchQuery.toLowerCase(),
                                    )) && (
                                    <button
                                        onClick={() =>
                                            handleTabClick("quizzes")
                                        }
                                        className={`w-full flex items-center gap-3 py-2.5 text-xs transition-all cursor-pointer ${
                                            activeTab === "quizzes"
                                                ? "pl-5 pr-6 bg-[#EBF3FF]/60 text-[#1B72E8] border-l-4 border-[#1B72E8] font-bold"
                                                : "pl-[24px] pr-6 text-[#70757A] hover:text-slate-800 hover:bg-slate-50/50 font-medium"
                                        }`}
                                    >
                                        <BookOpen className="w-4 h-4 shrink-0" />
                                        <span>Danh Sách Đề Thi</span>
                                    </button>
                                )}

                                {(!sidebarSearchQuery ||
                                    "chống gian lận".includes(
                                        sidebarSearchQuery.toLowerCase(),
                                    )) && (
                                    <div className="w-full flex items-center justify-between pr-4 py-2 hover:bg-slate-50/50 transition-all cursor-default">
                                        <div className="flex items-center gap-3 pl-[24px]">
                                            <Shield className="w-4 h-4 text-[#70757A] shrink-0" />
                                            <span className="text-xs font-semibold text-[#70757A]">
                                                Chống gian lận
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleToggleAntiCheat(
                                                    !antiCheatEnabled,
                                                )
                                            }
                                            className={`w-7 h-4 rounded-full p-0.5 transition-colors cursor-pointer relative flex-shrink-0 ${
                                                antiCheatEnabled
                                                    ? "bg-[#1B72E8]"
                                                    : "bg-slate-200"
                                            }`}
                                        >
                                            <div
                                                className={`w-3 h-3 bg-white rounded-full shadow-xs transition-transform transform ${
                                                    antiCheatEnabled
                                                        ? "translate-x-3"
                                                        : "translate-x-0"
                                                }`}
                                            />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Group 3: Connection (Stats) */}
                        {(!sidebarSearchQuery ||
                            "thống kê đề thi".includes(
                                sidebarSearchQuery.toLowerCase(),
                            ) ||
                            "thống kê học sinh".includes(
                                sidebarSearchQuery.toLowerCase(),
                            )) && (
                            <div className="space-y-0.5 mb-4">
                                <div className="flex items-center justify-between px-6 py-2">
                                    <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase">
                                        THỐNG KÊ & BÁO CÁO
                                    </span>
                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                </div>

                                {(!sidebarSearchQuery ||
                                    "thống kê đề thi".includes(
                                        sidebarSearchQuery.toLowerCase(),
                                    )) && (
                                    <button
                                        onClick={() =>
                                            handleTabClick("stats-quizzes")
                                        }
                                        className={`w-full flex items-center gap-3 py-2.5 text-xs transition-all cursor-pointer ${
                                            activeTab === "stats-quizzes"
                                                ? "pl-5 pr-6 bg-[#EBF3FF]/60 text-[#1B72E8] border-l-4 border-[#1B72E8] font-bold"
                                                : "pl-[24px] pr-6 text-[#70757A] hover:text-slate-800 hover:bg-slate-50/50 font-medium"
                                        }`}
                                    >
                                        <BarChart3 className="w-4 h-4 shrink-0" />
                                        <span>Thống kê đề thi</span>
                                    </button>
                                )}

                                {(!sidebarSearchQuery ||
                                    "thống kê học sinh".includes(
                                        sidebarSearchQuery.toLowerCase(),
                                    )) && (
                                    <button
                                        onClick={() =>
                                            handleTabClick("stats-students")
                                        }
                                        className={`w-full flex items-center gap-3 py-2.5 text-xs transition-all cursor-pointer ${
                                            activeTab === "stats-students"
                                                ? "pl-5 pr-6 bg-[#EBF3FF]/60 text-[#1B72E8] border-l-4 border-[#1B72E8] font-bold"
                                                : "pl-[24px] pr-6 text-[#70757A] hover:text-slate-800 hover:bg-slate-50/50 font-medium"
                                        }`}
                                    >
                                        <UserCheck className="w-4 h-4 shrink-0" />
                                        <span>Thống kê học sinh</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Group 4: System Administration (Backup/Restore/API) */}
                        {(!sidebarSearchQuery ||
                            "sao lưu dữ liệu".includes(
                                sidebarSearchQuery.toLowerCase(),
                            ) ||
                            "phục hồi dữ liệu".includes(
                                sidebarSearchQuery.toLowerCase(),
                            ) ||
                            "giám sát api".includes(
                                sidebarSearchQuery.toLowerCase(),
                            ) ||
                            "api".includes(
                                sidebarSearchQuery.toLowerCase(),
                            )) && (
                            <div className="space-y-0.5 mb-4">
                                <div className="flex items-center justify-between px-6 py-2">
                                    <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase">
                                        QUẢN TRỊ HỆ THỐNG
                                    </span>
                                </div>

                                {(!sidebarSearchQuery ||
                                    "giám sát api".includes(
                                        sidebarSearchQuery.toLowerCase(),
                                    ) ||
                                    "api".includes(
                                        sidebarSearchQuery.toLowerCase(),
                                    )) && (
                                    <button
                                        onClick={() =>
                                            handleTabClick("api-monitor")
                                        }
                                        className={`w-full flex items-center gap-3 py-2.5 text-xs transition-all cursor-pointer ${
                                            activeTab === "api-monitor"
                                                ? "pl-5 pr-6 bg-[#EBF3FF]/60 text-[#1B72E8] border-l-4 border-[#1B72E8] font-bold"
                                                : "pl-[24px] pr-6 text-[#70757A] hover:text-slate-800 hover:bg-slate-50/50 font-medium"
                                        }`}
                                    >
                                        <Activity className="w-4 h-4 shrink-0" />
                                        <span>Giám sát hệ thống API</span>
                                    </button>
                                )}

                                {(!sidebarSearchQuery ||
                                    "sao lưu dữ liệu".includes(
                                        sidebarSearchQuery.toLowerCase(),
                                    )) && (
                                    <button
                                        onClick={handleDownloadBackup}
                                        className="w-full flex items-center gap-3 py-2.5 text-xs text-[#70757A] hover:text-slate-850 hover:bg-slate-50/50 font-medium pl-[24px] pr-6 transition-all cursor-pointer text-left"
                                    >
                                        <Download className="w-4 h-4 shrink-0 text-[#70757A]" />
                                        <span>Tải bản sao lưu (Backup)</span>
                                    </button>
                                )}

                                {(!sidebarSearchQuery ||
                                    "phục hồi dữ liệu".includes(
                                        sidebarSearchQuery.toLowerCase(),
                                    )) && (
                                    <label className="w-full flex items-center gap-3 py-2.5 text-xs text-[#70757A] hover:text-slate-850 hover:bg-slate-50/50 font-medium pl-[24px] pr-6 transition-all cursor-pointer text-left">
                                        <Upload className="w-4 h-4 shrink-0 text-[#70757A]" />
                                        <span>Phục hồi dữ liệu (Restore)</span>
                                        <input
                                            type="file"
                                            accept=".zip"
                                            onChange={handleUploadRestore}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer divider and info */}
                <div className="py-4 border-t border-border-primary bg-bg-card">
                    <div className="px-6 text-center">
                        <span className="text-[9px] text-slate-400 font-medium leading-none">
                            HiTrang v1.2.7 - Admin
                        </span>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <section className="flex-1 p-6 overflow-y-auto relative">
                {adminReviewSubmission ? (
                    <AdminSubmissionReviewer
                        submission={adminReviewSubmission}
                        onBack={() => setAdminReviewSubmission(null)}
                        quizzes={quizzes}
                    />
                ) : (
                    <>
                        {activeTab === "plans" && (
                            <AdminPlansTab
                                userProfiles={userProfiles}
                                loadingProfiles={loadingProfiles}
                                updatingUserId={updatingUserId}
                                setUpdatingUserId={setUpdatingUserId}
                                fetchProfiles={fetchProfiles}
                            />
                        )}

                        {activeTab === "create-quiz" && (
                            <AdminCreateQuizTab
                                onAddQuiz={onAddQuiz}
                                setActiveTab={setActiveTab}
                            />
                        )}

                        {activeTab === "quizzes" && (
                            <AdminQuizzesTab
                                quizzes={quizzes}
                                submissions={submissions}
                                onDeleteQuiz={onDeleteQuiz}
                                onUpdateQuiz={onUpdateQuiz}
                            />
                        )}

                        {activeTab === "stats-quizzes" && (
                            <AdminStatsQuizzesTab
                                quizzes={quizzes}
                                submissions={submissions}
                                onReviewSubmission={setAdminReviewSubmission}
                            />
                        )}

                        {activeTab === "stats-students" && (
                            <AdminStatsStudentsTab
                                quizzes={quizzes}
                                userProfiles={userProfiles}
                                submissions={submissions}
                                onReviewSubmission={setAdminReviewSubmission}
                            />
                        )}

                        {activeTab === "api-monitor" && (
                            <AdminApiTab />
                        )}
                    </>
                )}
            </section>
        </div>
    );
}
