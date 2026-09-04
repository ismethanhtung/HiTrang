import React, { useState } from "react";
import { User, Quiz, Submission } from "../types";
import {
    getAllProfiles,
    verifyAdminPasswordWithEdgeFunction,
    getBackendVersion,
    getBugReports,
    BugReport,
} from "../lib/supabaseService";
import { FRONTEND_VERSION } from "../version";
import { matchesSearch } from "../lib/searchUtils";
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
    Bug,
    Calendar,
    Bell,
    Database,
    Server,
} from "lucide-react";

import AdminPlansTab from "./AdminPlansTab";
import AdminCreateQuizTab from "./AdminCreateQuizTab";
import AdminQuizzesTab from "./AdminQuizzesTab";
import AdminStatsQuizzesTab from "./AdminStatsQuizzesTab";
import AdminStatsStudentsTab from "./AdminStatsStudentsTab";
import AdminSubmissionReviewer from "./AdminSubmissionReviewer";
import AdminApiTab from "./AdminApiTab";
import AdminBugsTab from "./AdminBugsTab";
import AdminScheduleTab from "./AdminScheduleTab";
import AdminNotificationsTab from "./AdminNotificationsTab";
import AdminBackupTab from "./AdminBackupTab";
import AdminSystemTab from "./AdminSystemTab";

export type AdminTab =
    | "plans"
    | "create-quiz"
    | "quizzes"
    | "stats-quizzes"
    | "stats-students"
    | "api-monitor"
    | "bugs"
    | "schedule"
    | "notifications"
    | "backups"
    | "system";

const VALID_ADMIN_TABS: AdminTab[] = [
    "plans",
    "create-quiz",
    "quizzes",
    "stats-quizzes",
    "stats-students",
    "api-monitor",
    "bugs",
    "schedule",
    "notifications",
    "backups",
    "system",
];

interface AdminPanelProps {
    quizzes: Quiz[];
    submissions: Submission[];
    onAddQuiz: (newQuiz: Quiz) => void;
    onDeleteQuiz: (quizId: string) => void;
    onUpdateQuiz: (updatedQuiz: Quiz) => void;
    onReloadSubmissions?: () => Promise<void>;
    initialTab?: AdminTab;
    onTabChange?: (tab: AdminTab) => void;
}

export default function AdminPanel({
    quizzes,
    submissions,
    onAddQuiz,
    onDeleteQuiz,
    onUpdateQuiz,
    onReloadSubmissions,
    initialTab = "plans",
    onTabChange,
}: AdminPanelProps) {
    // Persist admin verification across reloads
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        return sessionStorage.getItem("admin_verified") === "true";
    });
    const [passwordInput, setPasswordInput] = useState("");
    const [authError, setAuthError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);

    const [activeTab, setActiveTab] = useState<AdminTab>(() => {
        if (initialTab && VALID_ADMIN_TABS.includes(initialTab)) {
            return initialTab;
        }
        return "plans";
    });

    React.useEffect(() => {
        if (
            initialTab &&
            VALID_ADMIN_TABS.includes(initialTab) &&
            initialTab !== activeTab
        ) {
            setActiveTab(initialTab);
            setAdminReviewSubmission(null);
            if (initialTab === "bugs") {
                fetchBugs();
            }
        }
    }, [initialTab]);

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

    const [bugReports, setBugReports] = useState<BugReport[]>([]);
    const [loadingBugs, setLoadingBugs] = useState(false);

    const fetchBugs = async () => {
        setLoadingBugs(true);
        try {
            const data = await getBugReports();
            setBugReports(data);
        } catch (err) {
            console.error("Lỗi khi tải danh sách báo cáo lỗi:", err);
        } finally {
            setLoadingBugs(false);
        }
    };

    const handleTabClick = (tab: AdminTab) => {
        setActiveTab(tab);
        setAdminReviewSubmission(null);
        if (tab === "bugs") {
            fetchBugs();
        }
        if (onTabChange) {
            onTabChange(tab);
        }
    };

    const [userProfiles, setUserProfiles] = useState<User[]>([]);
    const [loadingProfiles, setLoadingProfiles] = useState(false);
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
    const [backendVersion, setBackendVersion] = useState<string>("loading...");

    const [adminReviewSubmission, setAdminReviewSubmission] =
        useState<Submission | null>(null);
    const [selectedStudentForStats, setSelectedStudentForStats] = useState<
        string | null
    >(null);

    const handleSelectUserForStats = (userId: string) => {
        setSelectedStudentForStats(userId);
        handleTabClick("stats-students");
    };

    // Fetch profiles, bugs and version on mount or tab change if already authenticated
    React.useEffect(() => {
        if (isAuthenticated) {
            fetchProfiles();
            if (activeTab === "bugs") {
                fetchBugs();
            }
            getBackendVersion()
                .then(setBackendVersion)
                .catch(() => setBackendVersion("unknown"));
        }
    }, [isAuthenticated, activeTab]);

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

    if (!isAuthenticated) {
        return (
            <div className="max-w-md mx-auto my-16 p-8 bg-white border-none space-y-6 text-center animate-in fade-in duration-300">
                <h2 className="text-xl font-bold text-slate-900">
                    Trang Quản Trị Hệ Thống (Admin)
                </h2>
                <p className="text-xs text-slate-500 mt-1">Yêu cầu xác thực</p>
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

    const matchSetting = (keywords: string | string[]) => {
        if (!sidebarSearchQuery || !sidebarSearchQuery.trim()) return true;
        return matchesSearch(keywords, sidebarSearchQuery);
    };

    return (
        <div className="flex h-[calc(100vh-61px)] w-full overflow-hidden bg-[#FDFDFD]">
            {/* LEFT SIDEBAR */}
            <aside className="w-64 bg-bg-card border-r border-border-primary flex flex-col justify-between h-full select-none shrink-0">
                <div className="flex flex-col min-h-0">
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
                                className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-400 text-slate-705"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        </div>
                    </div>

                    {/* Nav Categories */}
                    <div className="flex-1 overflow-y-auto py-2">
                        {/* Group 1: General Settings */}
                        {matchSetting([
                            "quản lý chung",
                            "tài khoản",
                            "account",
                            "plans",
                            "người dùng",
                            "học sinh",
                        ]) && (
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

                                {matchSetting([
                                    "thông báo",
                                    "gửi thông báo",
                                    "notification",
                                    "notifications",
                                ]) && (
                                    <button
                                        onClick={() =>
                                            handleTabClick("notifications")
                                        }
                                        className={`w-full flex items-center gap-3 py-2.5 text-xs transition-all cursor-pointer ${
                                            activeTab === "notifications"
                                                ? "pl-5 pr-6 bg-[#EBF3FF]/60 text-[#1B72E8] border-l-4 border-[#1B72E8] font-bold"
                                                : "pl-[24px] pr-6 text-[#70757A] hover:text-slate-800 hover:bg-slate-50/50 font-medium"
                                        }`}
                                    >
                                        <Bell className="w-4 h-4 shrink-0" />
                                        <span>Gửi thông báo</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Group 2: Workspace Settings */}
                        {matchSetting([
                            "quản lý đề thi & lịch học",
                            "tạo / sửa đề thi",
                            "danh sách đề thi",
                            "quản lý lịch học",
                            "lịch học",
                            "lịch",
                            "chống gian lận",
                        ]) && (
                            <div className="space-y-0.5 mb-4">
                                <div className="flex items-center justify-between px-6 py-2">
                                    <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase">
                                        QUẢN LÝ ĐỀ THI & LỊCH HỌC
                                    </span>
                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                </div>

                                {matchSetting([
                                    "tạo / sửa đề thi",
                                    "tạo đề",
                                    "sửa đề",
                                    "create quiz",
                                ]) && (
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

                                {matchSetting([
                                    "danh sách đề thi",
                                    "danh sách đề",
                                    "quizzes",
                                ]) && (
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

                                {matchSetting([
                                    "quản lý lịch học",
                                    "lịch học",
                                    "lịch",
                                    "schedule",
                                ]) && (
                                    <button
                                        onClick={() =>
                                            handleTabClick("schedule")
                                        }
                                        className={`w-full flex items-center gap-3 py-2.5 text-xs transition-all cursor-pointer ${
                                            activeTab === "schedule"
                                                ? "pl-5 pr-6 bg-[#EBF3FF]/60 text-[#1B72E8] border-l-4 border-[#1B72E8] font-bold"
                                                : "pl-[24px] pr-6 text-[#70757A] hover:text-slate-800 hover:bg-slate-50/50 font-medium"
                                        }`}
                                    >
                                        <Calendar className="w-4 h-4 shrink-0" />
                                        <span>Quản Lý Lịch Học</span>
                                    </button>
                                )}

                                {matchSetting([
                                    "chống gian lận",
                                    "gian lận",
                                    "anti cheat",
                                ]) && (
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
                        {matchSetting([
                            "thống kê & báo cáo",
                            "thống kê đề thi",
                            "thống kê học sinh",
                            "báo cáo",
                            "stats",
                        ]) && (
                            <div className="space-y-0.5 mb-4">
                                <div className="flex items-center justify-between px-6 py-2">
                                    <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase">
                                        THỐNG KÊ & BÁO CÁO
                                    </span>
                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                </div>

                                {matchSetting([
                                    "thống kê đề thi",
                                    "thống kê đề",
                                    "stats quiz",
                                ]) && (
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

                                {matchSetting([
                                    "thống kê học sinh",
                                    "thống kê điểm",
                                    "stats students",
                                ]) && (
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
                        {matchSetting([
                            "quản trị hệ thống",
                            "báo cáo lỗi",
                            "lỗi",
                            "giám sát api",
                            "api",
                            "sao lưu",
                            "phục hồi",
                            "backup",
                            "restore",
                        ]) && (
                            <div className="space-y-0.5 mb-4">
                                <div className="flex items-center justify-between px-6 py-2">
                                    <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase">
                                        QUẢN TRỊ HỆ THỐNG
                                    </span>
                                </div>

                                {matchSetting([
                                    "báo cáo lỗi",
                                    "lỗi hệ thống",
                                    "bug",
                                    "lỗi",
                                ]) && (
                                    <button
                                        onClick={() => handleTabClick("bugs")}
                                        className={`w-full flex items-center gap-3 py-2.5 text-xs transition-all cursor-pointer ${
                                            activeTab === "bugs"
                                                ? "pl-5 pr-6 bg-[#EBF3FF]/60 text-[#1B72E8] border-l-4 border-[#1B72E8] font-bold"
                                                : "pl-[24px] pr-6 text-[#70757A] hover:text-slate-800 hover:bg-slate-50/50 font-medium"
                                        }`}
                                    >
                                        <Bug className="w-4 h-4 shrink-0" />
                                        <span>Báo cáo lỗi hệ thống</span>
                                    </button>
                                )}

                                {matchSetting([
                                    "giám sát api",
                                    "api",
                                    "hệ thống api",
                                    "monitor",
                                ]) && (
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

                                {matchSetting([
                                    "sao lưu & phục hồi",
                                    "sao lưu dữ liệu",
                                    "sao lưu",
                                    "phục hồi",
                                    "backup",
                                    "restore",
                                    "dữ liệu",
                                ]) && (
                                    <button
                                        onClick={() =>
                                            handleTabClick("backups")
                                        }
                                        className={`w-full flex items-center gap-3 py-2.5 text-xs transition-all cursor-pointer ${
                                            activeTab === "backups"
                                                ? "pl-5 pr-6 bg-[#EBF3FF]/60 text-[#1B72E8] border-l-4 border-[#1B72E8] font-bold"
                                                : "pl-[24px] pr-6 text-[#70757A] hover:text-slate-800 hover:bg-slate-50/50 font-medium"
                                        }`}
                                    >
                                        <Database className="w-4 h-4 shrink-0" />
                                        <span>Quản lý sao lưu & Phục hồi</span>
                                    </button>
                                )}

                                {matchSetting([
                                    "hạ tầng & máy chủ ec2",
                                    "hạ tầng máy chủ",
                                    "máy chủ ec2",
                                    "máy chủ",
                                    "hạ tầng",
                                    "ec2",
                                    "system",
                                    "server",
                                    "dung lượng",
                                    "ram",
                                    "cpu",
                                    "ổ đĩa",
                                ]) && (
                                    <button
                                        onClick={() => handleTabClick("system")}
                                        className={`w-full flex items-center gap-3 py-2.5 text-xs transition-all cursor-pointer ${
                                            activeTab === "system"
                                                ? "pl-5 pr-6 bg-[#EBF3FF]/60 text-[#1B72E8] border-l-4 border-[#1B72E8] font-bold"
                                                : "pl-[24px] pr-6 text-[#70757A] hover:text-slate-800 hover:bg-slate-50/50 font-medium"
                                        }`}
                                    >
                                        <Server className="w-4 h-4 shrink-0" />
                                        <span>Hạ tầng & Máy chủ</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer divider and info */}
                <div className="py-4 border-t border-border-primary bg-bg-card">
                    <div className="px-6 text-center">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] text-slate-400 font-medium">
                                Client v{FRONTEND_VERSION} • Core v
                                {backendVersion}
                            </span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <section
                className={`flex-1 relative ${
                    adminReviewSubmission
                        ? "p-3 sm:p-5 flex flex-col min-h-0 overflow-hidden h-full"
                        : "p-6 overflow-y-auto"
                }`}
            >
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
                                onSelectUserForStats={handleSelectUserForStats}
                            />
                        )}

                        {activeTab === "create-quiz" && (
                            <AdminCreateQuizTab
                                onAddQuiz={onAddQuiz}
                                setActiveTab={handleTabClick}
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
                                onReloadSubmissions={onReloadSubmissions}
                            />
                        )}

                        {activeTab === "stats-students" && (
                            <AdminStatsStudentsTab
                                quizzes={quizzes}
                                userProfiles={userProfiles}
                                submissions={submissions}
                                onReviewSubmission={setAdminReviewSubmission}
                                initialStudentId={selectedStudentForStats}
                            />
                        )}

                        {activeTab === "api-monitor" && <AdminApiTab />}

                        {activeTab === "bugs" && (
                            <AdminBugsTab
                                bugReports={bugReports}
                                loading={loadingBugs}
                                onRefreshBugs={fetchBugs}
                                onSelectUserForStats={handleSelectUserForStats}
                            />
                        )}

                        {activeTab === "schedule" && <AdminScheduleTab />}

                        {activeTab === "notifications" && (
                            <AdminNotificationsTab
                                userProfiles={userProfiles}
                                quizzes={quizzes}
                            />
                        )}

                        {activeTab === "backups" && <AdminBackupTab />}

                        {activeTab === "system" && <AdminSystemTab />}
                    </>
                )}
            </section>
        </div>
    );
}
