import React, { useState, useMemo } from "react";
import { Quiz, Submission, User } from "../types";
import { deleteSubmission } from "../lib/supabaseService";
import { matchesSearch } from "../lib/searchUtils";
import { GoogleIcon, isUserGoogleAccount } from "./GoogleIcon";
import {
    Search,
    FileCheck,
    Award,
    TrendingUp,
    Clock,
    Download,
    RefreshCw,
    Eye,
    Trash2,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    BookOpen,
    AlertTriangle,
    X,
} from "lucide-react";

interface AdminSubmissionsTabProps {
    quizzes: Quiz[];
    submissions: Submission[];
    userProfiles: User[];
    onReviewSubmission: (submission: Submission) => void;
    onReloadSubmissions?: () => Promise<void>;
    onDeleteSubmissionSuccess?: (deletedId: string) => void;
}

// Student Avatar Helper Component
const SubmissionStudentAvatar: React.FC<{
    name: string;
    avatarUrl?: string;
}> = ({ name, avatarUrl }) => {
    const [imgFailed, setImgFailed] = useState(false);

    return (
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400 select-none border border-brand-500/20">
            {avatarUrl && !imgFailed ? (
                <img
                    src={avatarUrl}
                    alt={name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={() => setImgFailed(true)}
                />
            ) : (
                <span>{(name || "U").charAt(0).toUpperCase()}</span>
            )}
        </div>
    );
};

// Safe date parser helper
const parseDateSafe = (dateVal: any): Date => {
    if (!dateVal) return new Date(0);
    if (dateVal instanceof Date) return dateVal;
    if (typeof dateVal === "string") {
        const normalized = dateVal.includes(" ")
            ? dateVal.replace(" ", "T")
            : dateVal;
        const d = new Date(normalized);
        if (!isNaN(d.getTime())) return d;
    }
    return new Date(dateVal);
};

// Format seconds into MM:SS or X phút Y giây
const formatDuration = (seconds?: number): string => {
    if (seconds === undefined || seconds === null || seconds <= 0) {
        return "Chưa ghi nhận";
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} giây`;
    if (secs === 0) return `${mins} phút`;
    return `${mins}p ${secs}s`;
};

// Format submission timestamp
const formatTimestamp = (dateStr: string): { full: string; relative: string } => {
    const d = parseDateSafe(dateStr);
    if (isNaN(d.getTime()) || d.getTime() === 0) {
        return { full: dateStr || "N/A", relative: "" };
    }

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");

    const full = `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let relative = "";
    if (diffMins < 1) relative = "Vừa xong";
    else if (diffMins < 60) relative = `${diffMins} phút trước`;
    else if (diffHours < 24) relative = `${diffHours} giờ trước`;
    else if (diffDays === 1) relative = "Hôm qua";
    else if (diffDays < 7) relative = `${diffDays} ngày trước`;
    else relative = `${day}/${month}`;

    return { full, relative };
};

// Get score tier badge styling
const getScoreBadgeProps = (score: number) => {
    if (score >= 9.0) {
        return {
            label: "Xuất sắc",
            bgClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
            dotClass: "bg-emerald-500",
        };
    }
    if (score >= 8.0) {
        return {
            label: "Giỏi",
            bgClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
            dotClass: "bg-sky-500",
        };
    }
    if (score >= 6.5) {
        return {
            label: "Khá",
            bgClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
            dotClass: "bg-indigo-500",
        };
    }
    if (score >= 5.0) {
        return {
            label: "Trung bình",
            bgClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
            dotClass: "bg-amber-500",
        };
    }
    return {
        label: "Dưới TB",
        bgClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
        dotClass: "bg-rose-500",
    };
};

export default function AdminSubmissionsTab({
    quizzes,
    submissions: initialSubmissions,
    userProfiles,
    onReviewSubmission,
    onReloadSubmissions,
    onDeleteSubmissionSuccess,
}: AdminSubmissionsTabProps) {
    // Local submissions state so deleting immediately updates UI without waiting for parent reload
    const [localSubmissions, setLocalSubmissions] = useState<Submission[]>(initialSubmissions);
    React.useEffect(() => {
        setLocalSubmissions(initialSubmissions);
    }, [initialSubmissions]);

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [filterGrade, setFilterGrade] = useState<string>("all");
    const [filterQuizId, setFilterQuizId] = useState<string>("all");
    const [filterScoreTier, setFilterScoreTier] = useState<string>("all");
    const [filterTimeRange, setFilterTimeRange] = useState<string>("all");
    const [sortBy, setSortBy] = useState<
        "newest" | "oldest" | "score-desc" | "score-asc" | "time-fast" | "time-slow" | "student" | "quiz"
    >("newest");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    // Reloading state
    const [isReloading, setIsReloading] = useState(false);

    // Quick Detail Inspection Modal state
    const [inspectingSub, setInspectingSub] = useState<Submission | null>(null);

    // Deletion Modal state
    const [deletingSub, setDeletingSub] = useState<Submission | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Quick map of user profiles for fast enrichment
    const userProfileMap = useMemo(() => {
        const map = new Map<string, User>();
        userProfiles.forEach((u) => {
            map.set(u.id, u);
            if (u.username) map.set(u.username.toLowerCase(), u);
        });
        return map;
    }, [userProfiles]);

    // Quick map of quizzes
    const quizMap = useMemo(() => {
        const map = new Map<string, Quiz>();
        quizzes.forEach((q) => map.set(q.id, q));
        return map;
    }, [quizzes]);

    // Auto-dismiss toast
    React.useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), 3500);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    // Calculate Summary Metrics
    const metrics = useMemo(() => {
        const total = localSubmissions.length;
        if (total === 0) {
            return {
                total: 0,
                avgScore: 0,
                passRate: 0,
                passedCount: 0,
                todayCount: 0,
                weekCount: 0,
            };
        }

        let sumScore = 0;
        let passed = 0;
        let today = 0;
        let thisWeek = 0;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

        localSubmissions.forEach((s) => {
            sumScore += s.score || 0;
            if ((s.score || 0) >= 5.0) passed++;
            const subTime = parseDateSafe(s.submittedAt).getTime();
            if (subTime >= startOfToday) today++;
            if (subTime >= sevenDaysAgo) thisWeek++;
        });

        return {
            total,
            avgScore: Number((sumScore / total).toFixed(2)),
            passRate: Number(((passed / total) * 100).toFixed(1)),
            passedCount: passed,
            todayCount: today,
            weekCount: thisWeek,
        };
    }, [localSubmissions]);

    // Filter and Sort Submissions
    const filteredSubmissions = useMemo(() => {
        const now = new Date().getTime();
        const startOfToday = new Date().setHours(0, 0, 0, 0);

        return localSubmissions
            .filter((sub) => {
                // 1. Search Query
                if (searchQuery.trim()) {
                    const q = searchQuery.trim();
                    const profile = userProfileMap.get(sub.studentId);
                    const matchName = matchesSearch(sub.studentName, q);
                    const matchUser = matchesSearch(sub.studentUsername || profile?.username || "", q);
                    const matchQuiz = matchesSearch(sub.quizTitle, q);
                    const matchId = sub.id.toLowerCase().includes(q.toLowerCase());
                    if (!matchName && !matchUser && !matchQuiz && !matchId) {
                        return false;
                    }
                }

                // 2. Grade Filter
                if (filterGrade !== "all") {
                    const profile = userProfileMap.get(sub.studentId);
                    const quiz = quizMap.get(sub.quizId);
                    const studentGrade = profile?.grade;
                    const quizGrade = quiz?.grade;
                    if (studentGrade !== filterGrade && quizGrade !== filterGrade) {
                        return false;
                    }
                }

                // 3. Quiz Filter
                if (filterQuizId !== "all" && sub.quizId !== filterQuizId) {
                    return false;
                }

                // 4. Score Tier Filter
                if (filterScoreTier !== "all") {
                    const s = sub.score || 0;
                    if (filterScoreTier === "xuat-sac" && s < 9.0) return false;
                    if (filterScoreTier === "gioi" && (s < 8.0 || s >= 9.0)) return false;
                    if (filterScoreTier === "kha" && (s < 6.5 || s >= 8.0)) return false;
                    if (filterScoreTier === "trung-binh" && (s < 5.0 || s >= 6.5)) return false;
                    if (filterScoreTier === "duoi-tb" && s >= 5.0) return false;
                }

                // 5. Time Range Filter
                if (filterTimeRange !== "all") {
                    const subTime = parseDateSafe(sub.submittedAt).getTime();
                    if (filterTimeRange === "today" && subTime < startOfToday) return false;
                    if (filterTimeRange === "3days" && subTime < now - 3 * 24 * 60 * 60 * 1000) return false;
                    if (filterTimeRange === "7days" && subTime < now - 7 * 24 * 60 * 60 * 1000) return false;
                    if (filterTimeRange === "30days" && subTime < now - 30 * 24 * 60 * 60 * 1000) return false;
                }

                return true;
            })
            .sort((a, b) => {
                const timeA = parseDateSafe(a.submittedAt).getTime();
                const timeB = parseDateSafe(b.submittedAt).getTime();

                switch (sortBy) {
                    case "newest":
                        return timeB - timeA;
                    case "oldest":
                        return timeA - timeB;
                    case "score-desc":
                        return (b.score || 0) - (a.score || 0);
                    case "score-asc":
                        return (a.score || 0) - (b.score || 0);
                    case "time-fast":
                        return (a.timeSpent || 0) - (b.timeSpent || 0);
                    case "time-slow":
                        return (b.timeSpent || 0) - (a.timeSpent || 0);
                    case "student":
                        return (a.studentName || "").localeCompare(b.studentName || "");
                    case "quiz":
                        return (a.quizTitle || "").localeCompare(b.quizTitle || "");
                    default:
                        return timeB - timeA;
                }
            });
    }, [localSubmissions, searchQuery, filterGrade, filterQuizId, filterScoreTier, filterTimeRange, sortBy, userProfileMap, quizMap]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / pageSize));
    const paginatedSubmissions = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredSubmissions.slice(start, start + pageSize);
    }, [filteredSubmissions, currentPage, pageSize]);

    // Handle manual refresh
    const handleRefresh = async () => {
        if (!onReloadSubmissions || isReloading) return;
        setIsReloading(true);
        try {
            await onReloadSubmissions();
            setToastMessage({ type: "success", text: "Đã làm mới danh sách bài nộp thành công." });
        } catch {
            setToastMessage({ type: "error", text: "Không thể tải lại danh sách bài nộp." });
        } finally {
            setIsReloading(false);
        }
    };

    // Handle Delete Submission
    const handleConfirmDelete = async () => {
        if (!deletingSub) return;
        setIsDeleting(true);
        try {
            await deleteSubmission(deletingSub.id);
            setLocalSubmissions((prev) => prev.filter((s) => s.id !== deletingSub.id));
            if (onDeleteSubmissionSuccess) {
                onDeleteSubmissionSuccess(deletingSub.id);
            }
            setToastMessage({ type: "success", text: `Đã xóa bài nộp của học sinh "${deletingSub.studentName}" thành công.` });
            setDeletingSub(null);
            if (inspectingSub?.id === deletingSub.id) {
                setInspectingSub(null);
            }
        } catch (err: any) {
            setToastMessage({ type: "error", text: `Lỗi khi xóa bài nộp: ${err?.message || "Không xác định"}` });
        } finally {
            setIsDeleting(false);
        }
    };

    // Export CSV with UTF-8 BOM
    const handleExportCSV = () => {
        if (filteredSubmissions.length === 0) {
            alert("Không có dữ liệu bài nộp nào phù hợp để xuất.");
            return;
        }

        const headers = [
            "Mã bài nộp",
            "Mã học sinh",
            "Họ và tên học sinh",
            "Tên đăng nhập",
            "Khối lớp",
            "Gói tài khoản",
            "Mã đề thi",
            "Tên đề thi",
            "Điểm số (Thang 10)",
            "Xếp loại",
            "Số câu đúng",
            "Tổng số câu",
            "Tỉ lệ đúng (%)",
            "Thời gian làm bài (giây)",
            "Thời gian làm bài (định dạng)",
            "Thời điểm nộp bài",
        ];

        const rows = filteredSubmissions.map((s) => {
            const profile = userProfileMap.get(s.studentId);
            const score = s.score || 0;
            const badge = getScoreBadgeProps(score);
            const correctCount = s.answers ? Object.keys(s.answers).length : 0;
            const accuracy = s.totalQuestions > 0 ? ((score / 10) * 100).toFixed(1) : "0";
            const formattedTime = formatDuration(s.timeSpent);
            const formattedSubmit = formatTimestamp(s.submittedAt).full;

            return [
                `"${s.id}"`,
                `"${s.studentId}"`,
                `"${(s.studentName || "").replace(/"/g, '""')}"`,
                `"${(s.studentUsername || profile?.username || "").replace(/"/g, '""')}"`,
                `"${profile?.grade || "N/A"}"`,
                `"${profile?.plan || "FREE"}"`,
                `"${s.quizId}"`,
                `"${(s.quizTitle || "").replace(/"/g, '""')}"`,
                score.toFixed(2),
                `"${badge.label}"`,
                correctCount,
                s.totalQuestions,
                accuracy,
                s.timeSpent || 0,
                `"${formattedTime}"`,
                `"${formattedSubmit}"`,
            ].join(",");
        });

        const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `danh_sach_bai_nop_hitrang_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Toast Notification */}
            {toastMessage && (
                <div
                    className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold backdrop-blur-md transition-all animate-in slide-in-from-top-2 ${
                        toastMessage.type === "success"
                            ? "bg-emerald-500/90 text-white border-emerald-400"
                            : "bg-rose-500/90 text-white border-rose-400"
                    }`}
                >
                    {toastMessage.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{toastMessage.text}</span>
                </div>
            )}

            {/* Header & Main Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border-primary/80">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                            <FileCheck className="w-4 h-4" />
                        </div>
                        <h2 className="text-lg font-bold text-text-primary">Quản Lý Bài Nộp Học Sinh</h2>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                        Theo dõi, tra cứu toàn bộ lượt nộp bài, điểm số, thời gian làm và chi tiết câu trả lời của học sinh theo thời gian thực.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {onReloadSubmissions && (
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={isReloading}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-text-primary border border-border-primary transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                            title="Tải lại toàn bộ dữ liệu mới nhất"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? "animate-spin text-brand-500" : ""}`} />
                            <span>{isReloading ? "Đang tải..." : "Làm mới"}</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-all shadow-xs cursor-pointer active:scale-98"
                        title="Xuất file Excel / CSV đầy đủ thông tin"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Xuất CSV / Excel</span>
                    </button>
                </div>
            </div>

            {/* 4 Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Card 1: Total Submissions */}
                <div className="p-4 rounded-2xl bg-bg-card border border-border-primary/80 shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                            Tổng lượt nộp bài
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-text-primary tracking-tight">
                                {metrics.total.toLocaleString()}
                            </span>
                            <span className="text-[11px] font-medium text-text-secondary">bài làm</span>
                        </div>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <FileCheck className="w-5 h-5" />
                    </div>
                </div>

                {/* Card 2: Average Score */}
                <div className="p-4 rounded-2xl bg-bg-card border border-border-primary/80 shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                            Điểm trung bình
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                                {metrics.avgScore.toFixed(2)}
                            </span>
                            <span className="text-[11px] font-medium text-text-secondary">/ 10 điểm</span>
                        </div>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5" />
                    </div>
                </div>

                {/* Card 3: Pass Rate */}
                <div className="p-4 rounded-2xl bg-bg-card border border-border-primary/80 shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                            Tỉ lệ Đạt (≥ 5.0đ)
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-brand-600 dark:text-brand-400 tracking-tight">
                                {metrics.passRate}%
                            </span>
                            <span className="text-[11px] font-medium text-text-secondary">
                                ({metrics.passedCount} bài)
                            </span>
                        </div>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                </div>

                {/* Card 4: Submissions Today */}
                <div className="p-4 rounded-2xl bg-bg-card border border-border-primary/80 shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                            Lượt nộp hôm nay
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                                {metrics.todayCount}
                            </span>
                            <span className="text-[11px] font-medium text-text-secondary">
                                ({metrics.weekCount} trong tuần)
                            </span>
                        </div>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="p-4 rounded-2xl bg-bg-card border border-border-primary/80 shadow-xs space-y-3">
                <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="w-3.5 h-3.5 text-text-secondary absolute left-3 top-3 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Tìm học sinh, username, tên đề thi, mã bài..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-9 pr-8 py-2 bg-slate-100/80 dark:bg-slate-800/80 border border-transparent focus:border-brand-500 rounded-xl text-xs text-text-primary focus:outline-none transition-all placeholder:text-text-secondary"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    setCurrentPage(1);
                                }}
                                className="absolute right-2.5 top-2.5 text-text-secondary hover:text-text-primary p-0.5 rounded-full"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Filter Selects */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Filter Grade */}
                        <select
                            value={filterGrade}
                            onChange={(e) => {
                                setFilterGrade(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="px-2.5 py-2 bg-slate-100/80 dark:bg-slate-800/80 border border-transparent focus:border-brand-500 rounded-xl text-xs font-medium text-text-primary focus:outline-none cursor-pointer"
                        >
                            <option value="all">Tất cả khối lớp</option>
                            <option value="12">Khối 12</option>
                            <option value="11">Khối 11</option>
                            <option value="10">Khối 10</option>
                            <option value="9">Khối 9</option>
                            <option value="8">Khối 8</option>
                        </select>

                        {/* Filter Quiz */}
                        <select
                            value={filterQuizId}
                            onChange={(e) => {
                                setFilterQuizId(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="px-2.5 py-2 bg-slate-100/80 dark:bg-slate-800/80 border border-transparent focus:border-brand-500 rounded-xl text-xs font-medium text-text-primary focus:outline-none cursor-pointer max-w-[200px] truncate"
                        >
                            <option value="all">Tất cả đề thi</option>
                            {quizzes.map((q) => (
                                <option key={q.id} value={q.id}>
                                    {q.title}
                                </option>
                            ))}
                        </select>

                        {/* Filter Score Tier */}
                        <select
                            value={filterScoreTier}
                            onChange={(e) => {
                                setFilterScoreTier(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="px-2.5 py-2 bg-slate-100/80 dark:bg-slate-800/80 border border-transparent focus:border-brand-500 rounded-xl text-xs font-medium text-text-primary focus:outline-none cursor-pointer"
                        >
                            <option value="all">Tất cả mức điểm</option>
                            <option value="xuat-sac">Xuất sắc (≥ 9.0)</option>
                            <option value="gioi">Giỏi (8.0 - 8.9)</option>
                            <option value="kha">Khá (6.5 - 7.9)</option>
                            <option value="trung-binh">Trung bình (5.0 - 6.4)</option>
                            <option value="duoi-tb">Dưới trung bình (&lt; 5.0)</option>
                        </select>

                        {/* Filter Time Range */}
                        <select
                            value={filterTimeRange}
                            onChange={(e) => {
                                setFilterTimeRange(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="px-2.5 py-2 bg-slate-100/80 dark:bg-slate-800/80 border border-transparent focus:border-brand-500 rounded-xl text-xs font-medium text-text-primary focus:outline-none cursor-pointer"
                        >
                            <option value="all">Tất cả thời gian</option>
                            <option value="today">Hôm nay (24h)</option>
                            <option value="3days">3 ngày qua</option>
                            <option value="7days">7 ngày qua</option>
                            <option value="30days">30 ngày qua</option>
                        </select>

                        {/* Sort By */}
                        <select
                            value={sortBy}
                            onChange={(e: any) => {
                                setSortBy(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="px-2.5 py-2 bg-slate-100/80 dark:bg-slate-800/80 border border-transparent focus:border-brand-500 rounded-xl text-xs font-medium text-text-primary focus:outline-none cursor-pointer"
                        >
                            <option value="newest">Mới nhất</option>
                            <option value="oldest">Cũ nhất</option>
                            <option value="score-desc">Điểm cao nhất</option>
                            <option value="score-asc">Điểm thấp nhất</option>
                            <option value="time-fast">Làm nhanh nhất</option>
                            <option value="time-slow">Làm lâu nhất</option>
                            <option value="student">Tên học sinh (A-Z)</option>
                            <option value="quiz">Tên đề thi (A-Z)</option>
                        </select>
                    </div>
                </div>

                {/* Filter info badges */}
                <div className="flex items-center justify-between text-xs text-text-secondary pt-1 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        <span>
                            Hiển thị <strong className="text-text-primary">{filteredSubmissions.length}</strong> bài nộp
                            {filteredSubmissions.length !== localSubmissions.length && (
                                <> (lọc từ {localSubmissions.length} bài)</>
                            )}
                        </span>
                        {(searchQuery || filterGrade !== "all" || filterQuizId !== "all" || filterScoreTier !== "all" || filterTimeRange !== "all") && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    setFilterGrade("all");
                                    setFilterQuizId("all");
                                    setFilterScoreTier("all");
                                    setFilterTimeRange("all");
                                    setSortBy("newest");
                                    setCurrentPage(1);
                                }}
                                className="text-brand-600 hover:text-brand-700 dark:text-brand-400 text-xs font-semibold cursor-pointer underline ml-2"
                            >
                                Xóa toàn bộ bộ lọc
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[11px]">Số dòng / trang:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium text-text-primary focus:outline-none cursor-pointer border border-border-primary/50"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Submissions Data Table */}
            <div className="rounded-2xl bg-bg-card border border-border-primary/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border-primary/80 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                                <th className="py-3.5 px-4">Học sinh</th>
                                <th className="py-3.5 px-4">Đề thi</th>
                                <th className="py-3.5 px-4">Điểm số</th>
                                <th className="py-3.5 px-4">Thời gian làm</th>
                                <th className="py-3.5 px-4">Thời điểm nộp</th>
                                <th className="py-3.5 px-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-primary/60 text-xs">
                            {paginatedSubmissions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center text-text-secondary">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                <FileCheck className="w-6 h-6" />
                                            </div>
                                            <p className="font-semibold text-sm text-text-primary">Không tìm thấy bài nộp nào</p>
                                            <p className="text-xs text-text-secondary max-w-sm">
                                                Hãy thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh các tiêu chí bộ lọc.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedSubmissions.map((sub) => {
                                    const profile = userProfileMap.get(sub.studentId);
                                    const quiz = quizMap.get(sub.quizId);
                                    const score = sub.score || 0;
                                    const badgeProps = getScoreBadgeProps(score);
                                    const answeredCount = sub.answers ? Object.keys(sub.answers).length : 0;
                                    const timeInfo = formatTimestamp(sub.submittedAt);
                                    const isGoogle = profile ? isUserGoogleAccount(profile) : false;

                                    return (
                                        <tr
                                            key={sub.id}
                                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                                        >
                                            {/* 1. Student Column */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <SubmissionStudentAvatar
                                                        name={sub.studentName}
                                                        avatarUrl={profile?.avatarUrl}
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="font-bold text-text-primary truncate">
                                                                {sub.studentName}
                                                            </span>
                                                            {isGoogle && (
                                                                <span title="Tài khoản liên kết Google">
                                                                    <GoogleIcon className="w-3.5 h-3.5 inline-block" />
                                                                </span>
                                                            )}
                                                            {profile?.plan && profile.plan !== "FREE" && (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                                    {profile.plan}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[11px] text-text-secondary mt-0.5">
                                                            <span className="font-mono truncate">
                                                                @{sub.studentUsername || profile?.username || "student"}
                                                            </span>
                                                            {profile?.grade && (
                                                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-text-secondary">
                                                                    K{profile.grade}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 2. Quiz Column */}
                                            <td className="py-3.5 px-4 max-w-[260px]">
                                                <div className="space-y-1">
                                                    <p
                                                        className="font-bold text-text-primary line-clamp-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors"
                                                        title={sub.quizTitle}
                                                    >
                                                        {sub.quizTitle}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {quiz?.subject && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-500/10 text-brand-600 dark:text-brand-400">
                                                                {quiz.subject}
                                                            </span>
                                                        )}
                                                        {quiz?.grade && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-text-secondary">
                                                                Lớp {quiz.grade}
                                                            </span>
                                                        )}
                                                        <span className="text-[11px] text-text-secondary">
                                                            {sub.totalQuestions} câu hỏi
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 3. Score & Accuracy Column */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border font-black text-xs ${badgeProps.bgClass}`}
                                                    >
                                                        <span className={`w-1.5 h-1.5 rounded-full ${badgeProps.dotClass}`} />
                                                        <span>{score.toFixed(2)} đ</span>
                                                    </div>
                                                    <div className="text-[11px] text-text-secondary">
                                                        <span className="font-semibold text-text-primary">
                                                            {badgeProps.label}
                                                        </span>
                                                        <div className="text-[10px]">
                                                            Đã làm {answeredCount}/{sub.totalQuestions} câu
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 4. Duration Column */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 text-text-primary font-medium">
                                                    <Clock className="w-3.5 h-3.5 text-text-secondary" />
                                                    <span>{formatDuration(sub.timeSpent)}</span>
                                                </div>
                                                {sub.timeSpent !== undefined && sub.timeSpent > 0 && sub.totalQuestions > 0 && (
                                                    <span className="text-[10px] text-text-secondary">
                                                        ~{Math.round(sub.timeSpent / sub.totalQuestions)}s / câu
                                                    </span>
                                                )}
                                            </td>

                                            {/* 5. Timestamp Column */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <div className="font-medium text-text-primary">
                                                    {timeInfo.full}
                                                </div>
                                                {timeInfo.relative && (
                                                    <div className="text-[10px] text-text-secondary">
                                                        {timeInfo.relative}
                                                    </div>
                                                )}
                                            </td>

                                            {/* 6. Actions Column */}
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    {/* Quick View Modal */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setInspectingSub(sub)}
                                                        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                                        title="Xem tóm tắt thông số"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>

                                                    {/* Full KaTeX Reviewer */}
                                                    <button
                                                        type="button"
                                                        onClick={() => onReviewSubmission(sub)}
                                                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 transition-colors cursor-pointer flex items-center gap-1"
                                                        title="Mở phòng chấm chi tiết từng câu"
                                                    >
                                                        <span>Xem bài làm</span>
                                                    </button>

                                                    {/* Delete Submission */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeletingSub(sub)}
                                                        className="p-1.5 rounded-lg text-rose-500/80 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                                        title="Xóa kết quả bài nộp này"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {filteredSubmissions.length > 0 && (
                    <div className="px-4 py-3 border-t border-border-primary/80 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-secondary">
                        <div>
                            Đang hiển thị dòng{" "}
                            <strong className="text-text-primary">
                                {(currentPage - 1) * pageSize + 1}
                            </strong>{" "}
                            -{" "}
                            <strong className="text-text-primary">
                                {Math.min(currentPage * pageSize, filteredSubmissions.length)}
                            </strong>{" "}
                            trên tổng số <strong className="text-text-primary">{filteredSubmissions.length}</strong> bài nộp
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg border border-border-primary bg-bg-card text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                title="Trang trước"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-1 font-semibold text-text-primary px-2">
                                <span>Trang</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={totalPages}
                                    value={currentPage}
                                    onChange={(e) => {
                                        const p = parseInt(e.target.value, 10);
                                        if (p >= 1 && p <= totalPages) setCurrentPage(p);
                                    }}
                                    className="w-10 text-center py-0.5 bg-bg-card border border-border-primary rounded font-bold text-xs"
                                />
                                <span>/ {totalPages}</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-lg border border-border-primary bg-bg-card text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                title="Trang sau"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL 1: Quick Inspection Modal */}
            {inspectingSub && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
                    <div className="bg-bg-card rounded-2xl w-full max-w-xl border border-border-primary shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-5 py-4 border-b border-border-primary flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                                    <Eye className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-text-primary">Chi Tiết Lượt Nộp Bài</h3>
                                    <span className="text-[11px] font-mono text-text-secondary">
                                        Mã ID: {inspectingSub.id}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInspectingSub(null)}
                                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 space-y-4 overflow-y-auto">
                            {/* Student Card */}
                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-border-primary/60 space-y-2">
                                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                                    Thông tin học sinh
                                </span>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <SubmissionStudentAvatar
                                            name={inspectingSub.studentName}
                                            avatarUrl={userProfileMap.get(inspectingSub.studentId)?.avatarUrl}
                                        />
                                        <div>
                                            <p className="text-xs font-bold text-text-primary">
                                                {inspectingSub.studentName}
                                            </p>
                                            <p className="text-[11px] font-mono text-text-secondary">
                                                @{inspectingSub.studentUsername || userProfileMap.get(inspectingSub.studentId)?.username || "student"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {userProfileMap.get(inspectingSub.studentId)?.grade && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400">
                                                Khối {userProfileMap.get(inspectingSub.studentId)?.grade}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-text-secondary">
                                            ID: {inspectingSub.studentId.slice(0, 10)}...
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Quiz & Score Details Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-border-primary/60 space-y-1">
                                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                                        Điểm số đạt được
                                    </span>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-xl font-black text-brand-600 dark:text-brand-400">
                                            {(inspectingSub.score || 0).toFixed(2)}
                                        </span>
                                        <span className="text-[11px] text-text-secondary">/ 10 điểm</span>
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-border-primary/60 space-y-1">
                                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                                        Thời gian làm bài
                                    </span>
                                    <div className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-text-secondary" />
                                        <span>{formatDuration(inspectingSub.timeSpent)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Quiz info */}
                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-border-primary/60 space-y-2">
                                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                                    Thông tin đề thi
                                </span>
                                <div>
                                    <h4 className="text-xs font-bold text-text-primary">{inspectingSub.quizTitle}</h4>
                                    <div className="flex items-center gap-2 mt-1 text-[11px] text-text-secondary">
                                        <span>Tổng số câu: {inspectingSub.totalQuestions} câu</span>
                                        <span>•</span>
                                        <span>Mã đề: {inspectingSub.quizId}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Answers Breakdown */}
                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-border-primary/60 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                                        Dữ liệu câu trả lời
                                    </span>
                                    <span className="text-[11px] font-semibold text-text-primary">
                                        {inspectingSub.answers ? Object.keys(inspectingSub.answers).length : 0} câu đã phản hồi
                                    </span>
                                </div>
                                <div className="text-[11px] text-text-secondary leading-relaxed">
                                    Thời điểm nộp:{" "}
                                    <strong className="text-text-primary font-mono">
                                        {formatTimestamp(inspectingSub.submittedAt).full}
                                    </strong>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-5 py-3.5 border-t border-border-primary bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setInspectingSub(null)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-text-primary border border-border-primary transition-all cursor-pointer"
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const target = inspectingSub;
                                    setInspectingSub(null);
                                    onReviewSubmission(target);
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Mở phòng chấm bài chi tiết</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: Delete Confirmation Modal */}
            {deletingSub && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
                    <div className="bg-bg-card rounded-2xl w-full max-w-md border border-rose-500/20 shadow-2xl overflow-hidden">
                        <div className="p-5 space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                                <AlertTriangle className="w-6 h-6" />
                            </div>

                            <div className="text-center space-y-1">
                                <h3 className="text-base font-bold text-text-primary">
                                    Xác nhận xóa bài nộp?
                                </h3>
                                <p className="text-xs text-text-secondary">
                                    Hành động này sẽ xóa vĩnh viễn kết quả bài thi của học sinh{" "}
                                    <strong className="text-text-primary">
                                        "{deletingSub.studentName}"
                                    </strong>{" "}
                                    cho đề thi{" "}
                                    <strong className="text-text-primary">
                                        "{deletingSub.quizTitle}"
                                    </strong>
                                    . Điểm tích lũy và bảng xếp hạng của học sinh sẽ được tự động tính toán lại.
                                </p>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-text-secondary space-y-0.5">
                                <div>ID: {deletingSub.id}</div>
                                <div>Điểm số: {deletingSub.score} điểm</div>
                                <div>Thời điểm: {formatTimestamp(deletingSub.submittedAt).full}</div>
                            </div>
                        </div>

                        <div className="px-5 py-3.5 border-t border-border-primary bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-end gap-2.5">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setDeletingSub(null)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-text-primary border border-border-primary transition-all cursor-pointer disabled:opacity-50"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {isDeleting ? (
                                    <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>Đang xóa...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Xóa bài nộp</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
