import React, { useState, useEffect, useMemo } from "react";
import { User, Quiz, AppNotification, UserPlan } from "../types";
import {
    sendAdminNotification,
    getAdminNotifications,
    deleteAdminNotification,
    SendAdminNotificationPayload,
} from "../lib/supabaseService";
import {
    Send,
    Bell,
    Megaphone,
    BookOpen,
    Clock,
    Trophy,
    Crown,
    Sparkles,
    Trash2,
    RefreshCw,
    Search,
    ExternalLink,
    CheckCircle2,
    AlertCircle,
    User as UserIcon,
    Users,
    ChevronDown,
    ArrowRight,
    Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AdminNotificationsTabProps {
    userProfiles: User[];
    quizzes: Quiz[];
}

interface NotificationTemplate {
    id: string;
    name: string;
    icon: React.ElementType;
    badgeColor: string;
    title: string;
    message: string;
    type: "new_quiz" | "teacher_message" | "reminder" | "system";
    suggestedLink: string;
    targetGrade?: string;
    targetPlan?: string;
}

const TEMPLATES: NotificationTemplate[] = [
    {
        id: "new_quiz",
        name: "Đề thi mới",
        icon: BookOpen,
        badgeColor: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
        title: "Đề thi mới từ Cô Trang 📝",
        message: "Cô Trang vừa đăng đề thi mới. Các em vào làm bài để rèn luyện kiến thức và leo bảng xếp hạng ngay nhé!",
        type: "new_quiz",
        suggestedLink: "/student-quizzes",
        targetGrade: "all",
        targetPlan: "all",
    },
    {
        id: "reminder",
        name: "Nhắc nhở làm bài",
        icon: Clock,
        badgeColor: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
        title: "Nhắc nhở hoàn thành bài tập ⏰",
        message: "Các em nhớ kiểm tra danh sách bài thi và hoàn thành các đề ôn tập còn lại trước 22:00 hôm nay nhé!",
        type: "reminder",
        suggestedLink: "/student-quizzes",
        targetGrade: "all",
        targetPlan: "all",
    },
    {
        id: "schedule",
        name: "Lịch học & Thông báo",
        icon: Megaphone,
        badgeColor: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
        title: "Thông báo lịch học từ Cô Trang 📢",
        message: "Cô Trang xin thông báo lịch học tuần này có một số cập nhật mới. Các em chú ý theo dõi lịch chi tiết nhé!",
        type: "teacher_message",
        suggestedLink: "/schedule",
        targetGrade: "all",
        targetPlan: "all",
    },
    {
        id: "leaderboard",
        name: "Vinh danh BXH",
        icon: Trophy,
        badgeColor: "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800",
        title: "Vinh danh Top Bảng Xếp Hạng tuần này 🏆",
        message: "Chúc mừng các học sinh xuất sắc nhất tuần qua đã bứt phá ngoạn mục trên BXH! Hãy tiếp tục duy trì phong độ nhé!",
        type: "teacher_message",
        suggestedLink: "/leaderboard",
        targetGrade: "all",
        targetPlan: "all",
    },
    {
        id: "vip_welcome",
        name: "Đặc quyền VIP",
        icon: Crown,
        badgeColor: "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
        title: "Chào mừng bạn đến với gói đặc quyền VIP! 👑",
        message: "Tài khoản của bạn đã được mở khóa trọn bộ tài liệu độc quyền và bộ đề thi chuyên sâu. Chúc bạn học thật tốt!",
        type: "system",
        suggestedLink: "/settings",
        targetGrade: "all",
        targetPlan: "vip",
    },
];

export default function AdminNotificationsTab({
    userProfiles,
    quizzes,
}: AdminNotificationsTabProps) {
    // Mode: "broadcast" (by group) or "direct" (single user)
    const [targetMode, setTargetMode] = useState<"broadcast" | "direct">("broadcast");

    // Form inputs
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [notifType, setNotifType] = useState<"new_quiz" | "teacher_message" | "reminder" | "system">("teacher_message");
    const [targetGrade, setTargetGrade] = useState<string>("all");
    const [targetPlan, setTargetPlan] = useState<string>("all");
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [userSearchText, setUserSearchText] = useState<string>("");
    const [link, setLink] = useState<string>("");
    const [selectedQuizId, setSelectedQuizId] = useState<string>("");

    // Selected template
    const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

    // Submission states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Sent notifications history
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Fetch sent notifications
    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await getAdminNotifications();
            setNotifications(res.notifications || []);
        } catch (err: any) {
            console.error("Lỗi tải lịch sử thông báo:", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    // Filter students only from userProfiles
    const students = useMemo(() => {
        return userProfiles.filter((u) => u.role === "student");
    }, [userProfiles]);

    // Live reach estimate calculation
    const estimatedReach = useMemo(() => {
        if (targetMode === "direct") {
            return selectedUserId ? 1 : 0;
        }
        return students.filter((s) => {
            const matchGrade = targetGrade === "all" || s.grade === targetGrade;
            const userPlan = s.plan || "nothing";
            const matchPlan = targetPlan === "all" || userPlan === targetPlan;
            return matchGrade && matchPlan;
        }).length;
    }, [students, targetMode, targetGrade, targetPlan, selectedUserId]);

    // Filtered student list for direct picker
    const filteredStudentOptions = useMemo(() => {
        if (!userSearchText.trim()) return students.slice(0, 15);
        const q = userSearchText.toLowerCase();
        return students
            .filter(
                (s) =>
                    s.name.toLowerCase().includes(q) ||
                    s.username.toLowerCase().includes(q)
            )
            .slice(0, 15);
    }, [students, userSearchText]);

    const selectedStudent = useMemo(() => {
        return students.find((s) => s.id === selectedUserId);
    }, [students, selectedUserId]);

    // Apply template
    const handleApplyTemplate = (tpl: NotificationTemplate) => {
        setActiveTemplateId(tpl.id);
        setTitle(tpl.title);
        setMessage(tpl.message);
        setNotifType(tpl.type);
        setLink(tpl.suggestedLink);
        if (tpl.targetGrade) setTargetGrade(tpl.targetGrade);
        if (tpl.targetPlan) setTargetPlan(tpl.targetPlan);
        setTargetMode("broadcast");
        setSelectedUserId("");
    };

    // Quick reset to custom
    const handleResetForm = () => {
        setActiveTemplateId(null);
        setTitle("");
        setMessage("");
        setNotifType("teacher_message");
        setLink("");
        setTargetGrade("all");
        setTargetPlan("all");
        setSelectedUserId("");
        setSelectedQuizId("");
        setUserSearchText("");
    };

    // Handle Quiz Selection for quick linking
    const handleSelectQuiz = (quizId: string) => {
        setSelectedQuizId(quizId);
        if (quizId) {
            const q = quizzes.find((x) => x.id === quizId);
            setLink(`/quiz/${quizId}`);
            if (!title) {
                setTitle(`Đề thi mới: ${q?.title || "Ôn tập"} 📝`);
            }
            if (!message) {
                setMessage(
                    `Cô Trang vừa đăng đề thi "${q?.title || "mới"}". Các em hãy vào hoàn thành bài sớm nhé!`
                );
            }
            setNotifType("new_quiz");
            if (q?.grade) {
                setTargetGrade(q.grade);
            }
        }
    };

    // Submit Send
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setSuccessMessage(null);

        if (!title.trim()) {
            setErrorMessage("Vui lòng nhập tiêu đề thông báo");
            return;
        }
        if (!message.trim()) {
            setErrorMessage("Vui lòng nhập nội dung thông báo");
            return;
        }
        if (targetMode === "direct" && !selectedUserId) {
            setErrorMessage("Vui lòng chọn học sinh nhận thông báo");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: SendAdminNotificationPayload = {
                title: title.trim(),
                message: message.trim(),
                type: notifType,
                targetGrade: targetMode === "broadcast" ? targetGrade : undefined,
                targetPlan: targetMode === "broadcast" ? targetPlan : undefined,
                userId: targetMode === "direct" ? selectedUserId : undefined,
                link: link.trim() || undefined,
                quizId: selectedQuizId || undefined,
            };

            await sendAdminNotification(payload);

            setSuccessMessage(
                targetMode === "direct"
                    ? `Đã gửi thông báo thành công đến ${selectedStudent?.name || "học sinh"}!`
                    : `Đã phát thông báo thành công đến ${estimatedReach} học sinh!`
            );
            handleResetForm();
            await fetchHistory();
        } catch (err: any) {
            console.error("Lỗi khi gửi thông báo:", err);
            setErrorMessage(err.message || "Gửi thông báo thất bại, vui lòng thử lại.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete Notification
    const handleDelete = async (id: string) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa/thu hồi thông báo này không?")) {
            return;
        }
        setDeletingId(id);
        try {
            await deleteAdminNotification(id);
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        } catch (err: any) {
            alert("Lỗi khi xóa: " + (err.message || "Thao tác không thành công"));
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-16">
            {/* TOP HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-primary pb-4">
                <div>
                    <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-brand-500" />
                        Quản Lý & Phát Thông Báo
                    </h1>
                    <p className="text-xs text-text-tertiary mt-1">
                        Soạn và gửi thông báo trực tiếp đến học sinh theo khối lớp, gói tài khoản hoặc gửi đích danh.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={fetchHistory}
                        disabled={loadingHistory}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border-primary bg-bg-card hover:bg-bg-surface text-text-secondary transition-colors cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
                        Làm mới
                    </button>
                </div>
            </div>

            {/* TEMPLATES CAROUSEL / ROW */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Mẫu thông báo gợi ý (Chọn để điền nhanh):
                    </span>
                    {activeTemplateId && (
                        <button
                            type="button"
                            onClick={handleResetForm}
                            className="text-xs text-brand-500 hover:underline cursor-pointer font-medium"
                        >
                            Xóa mẫu đã chọn
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {TEMPLATES.map((tpl) => {
                        const Icon = tpl.icon;
                        const isSelected = activeTemplateId === tpl.id;
                        return (
                            <button
                                key={tpl.id}
                                type="button"
                                onClick={() => handleApplyTemplate(tpl)}
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-2 relative ${
                                    isSelected
                                        ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 shadow-xs ring-1 ring-brand-500"
                                        : "border-border-primary bg-bg-card hover:bg-bg-surface hover:border-slate-300 dark:hover:border-slate-700"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${tpl.badgeColor}`}>
                                        <Icon className="w-3.5 h-3.5" />
                                    </div>
                                    {isSelected && (
                                        <CheckCircle2 className="w-4 h-4 text-brand-500" />
                                    )}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-text-primary line-clamp-1">
                                        {tpl.name}
                                    </div>
                                    <div className="text-[10px] text-text-tertiary line-clamp-2 mt-0.5">
                                        {tpl.title}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* MAIN DISPATCHER SECTION: FORM + LIVE PREVIEW */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT: COMPOSE FORM (7 Cols) */}
                <form
                    onSubmit={handleSend}
                    className="lg:col-span-7 bg-bg-card border border-border-primary rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs"
                >
                    <div className="border-b border-border-primary pb-3 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                            <Send className="w-4 h-4 text-brand-500" />
                            Soạn Thảo Thông Báo
                        </h2>
                        <span className="text-[11px] text-text-tertiary font-mono">
                            Đến: <strong className="text-brand-600 dark:text-brand-400">~{estimatedReach}</strong> người nhận
                        </span>
                    </div>

                    {/* Alerts */}
                    <AnimatePresence>
                        {successMessage && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2"
                            >
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>{successMessage}</span>
                            </motion.div>
                        )}
                        {errorMessage && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2"
                            >
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{errorMessage}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* 1. Chọn Đối Tượng (Audience Targeting) */}
                    <div className="space-y-3 bg-bg-surface p-4 rounded-xl border border-border-primary">
                        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                            1. Đối tượng nhận thông báo
                        </label>

                        {/* Mode Switcher */}
                        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setTargetMode("broadcast")}
                                className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                    targetMode === "broadcast"
                                        ? "bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs"
                                        : "text-text-tertiary hover:text-text-secondary"
                                }`}
                            >
                                <Users className="w-3.5 h-3.5" />
                                Nhóm học sinh (Khối / Gói)
                            </button>
                            <button
                                type="button"
                                onClick={() => setTargetMode("direct")}
                                className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                    targetMode === "direct"
                                        ? "bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs"
                                        : "text-text-tertiary hover:text-text-secondary"
                                }`}
                            >
                                <UserIcon className="w-3.5 h-3.5" />
                                Đích danh 1 học sinh
                            </button>
                        </div>

                        {/* Broadcast Mode: Filters */}
                        {targetMode === "broadcast" ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                {/* Khối Lớp */}
                                <div>
                                    <label className="text-[11px] font-medium text-text-secondary block mb-1">
                                        Khối lớp:
                                    </label>
                                    <select
                                        value={targetGrade}
                                        onChange={(e) => setTargetGrade(e.target.value)}
                                        className="w-full text-xs bg-bg-card border border-border-primary rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                    >
                                        <option value="all">Tất cả các khối (8, 9, 10, 11, 12)</option>
                                        <option value="8">Khối 8</option>
                                        <option value="9">Khối 9</option>
                                        <option value="10">Khối 10</option>
                                        <option value="11">Khối 11</option>
                                        <option value="12">Khối 12</option>
                                    </select>
                                </div>

                                {/* Gói Tài Khoản */}
                                <div>
                                    <label className="text-[11px] font-medium text-text-secondary block mb-1">
                                        Gói tài khoản:
                                    </label>
                                    <select
                                        value={targetPlan}
                                        onChange={(e) => setTargetPlan(e.target.value)}
                                        className="w-full text-xs bg-bg-card border border-border-primary rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                    >
                                        <option value="all">Tất cả các gói (Free + Basic + VIP)</option>
                                        <option value="nothing">Chưa kích hoạt / Miễn phí (Free)</option>
                                        <option value="basic">Tiêu chuẩn (Basic)</option>
                                        <option value="vip">VIP (Đặc quyền)</option>
                                    </select>
                                </div>
                            </div>
                        ) : (
                            /* Direct Mode: Single user picker */
                            <div className="space-y-2 pt-2">
                                <label className="text-[11px] font-medium text-text-secondary block">
                                    Tìm và chọn học sinh nhận:
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Gõ tên hoặc username học sinh..."
                                        value={userSearchText}
                                        onChange={(e) => setUserSearchText(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 text-xs bg-bg-card border border-border-primary rounded-lg text-text-primary focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                    />
                                    <Search className="w-3.5 h-3.5 text-text-tertiary absolute left-2.5 top-2.5" />
                                </div>

                                {/* Selected User Pill */}
                                {selectedStudent && (
                                    <div className="flex items-center justify-between p-2 rounded-lg bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-brand-500 text-white font-bold text-[10px] flex items-center justify-center">
                                                {selectedStudent.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <span className="font-bold text-text-primary">{selectedStudent.name}</span>
                                                <span className="text-[10px] text-text-tertiary ml-1.5">(@{selectedStudent.username})</span>
                                                <span className="text-[10px] text-brand-600 dark:text-brand-400 font-medium ml-1.5">
                                                    • Khối {selectedStudent.grade || "10"}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedUserId("")}
                                            className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                                        >
                                            Bỏ chọn
                                        </button>
                                    </div>
                                )}

                                {/* Suggestions list */}
                                {!selectedUserId && (
                                    <div className="max-h-36 overflow-y-auto border border-border-primary rounded-lg divide-y divide-border-primary bg-bg-card">
                                        {filteredStudentOptions.length === 0 ? (
                                            <div className="p-3 text-center text-xs text-text-tertiary italic">
                                                Không tìm thấy học sinh nào.
                                            </div>
                                        ) : (
                                            filteredStudentOptions.map((stu) => (
                                                <div
                                                    key={stu.id}
                                                    onClick={() => {
                                                        setSelectedUserId(stu.id);
                                                        setUserSearchText("");
                                                    }}
                                                    className="p-2 text-xs flex items-center justify-between hover:bg-bg-surface cursor-pointer transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] flex items-center justify-center">
                                                            {stu.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium text-text-primary">{stu.name}</span>
                                                            <span className="text-[10px] text-text-tertiary ml-1">(@{stu.username})</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        Lớp {stu.grade || "10"}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 2. Loại Thông Báo (Type) */}
                    <div>
                        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-2">
                            2. Loại thông báo
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                                { id: "teacher_message", label: "Lời nhắn Cô Trang", icon: Megaphone },
                                { id: "new_quiz", label: "Đề thi mới", icon: BookOpen },
                                { id: "reminder", label: "Nhắc nhở ôn tập", icon: Clock },
                                { id: "system", label: "Hệ thống / VIP", icon: Sparkles },
                            ].map((item) => {
                                const Icon = item.icon;
                                const isSelected = notifType === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setNotifType(item.id as any)}
                                        className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                                            isSelected
                                                ? "border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 ring-1 ring-brand-500"
                                                : "border-border-primary bg-bg-card text-text-secondary hover:bg-bg-surface"
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 3. Tiêu Đề & Nội Dung */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                            3. Nội dung thông báo
                        </label>

                        <div>
                            <input
                                type="text"
                                placeholder="Tiêu đề thông báo (VD: Đề thi mới từ Cô Trang 📝)"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                className="w-full px-3 py-2 text-xs bg-bg-surface border border-border-primary rounded-lg text-text-primary font-semibold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            />
                        </div>

                        <div>
                            <textarea
                                rows={3}
                                placeholder="Nhập nội dung chi tiết thông báo gửi đến học sinh..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                required
                                className="w-full px-3 py-2 text-xs bg-bg-surface border border-border-primary rounded-lg text-text-primary focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 leading-relaxed"
                            />
                        </div>
                    </div>

                    {/* 4. Đính Kèm Đề Thi / Đường Dẫn (Link) */}
                    <div className="space-y-3 bg-bg-surface p-4 rounded-xl border border-border-primary">
                        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                            4. Hành động liên kết (Đính kèm tùy chọn)
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Fast Quiz Picker */}
                            <div>
                                <label className="text-[11px] font-medium text-text-secondary block mb-1">
                                    Đính kèm đề thi có sẵn:
                                </label>
                                <select
                                    value={selectedQuizId}
                                    onChange={(e) => handleSelectQuiz(e.target.value)}
                                    className="w-full text-xs bg-bg-card border border-border-primary rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 truncate"
                                >
                                    <option value="">-- Không đính kèm đề thi --</option>
                                    {quizzes.map((q) => (
                                        <option key={q.id} value={q.id}>
                                            [{q.grade ? `K${q.grade}` : "Chung"}] {q.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Custom Action Link */}
                            <div>
                                <label className="text-[11px] font-medium text-text-secondary block mb-1">
                                    Đường dẫn mở khi học sinh click:
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="VD: /student-quizzes, /leaderboard..."
                                        value={link}
                                        onChange={(e) => setLink(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 text-xs bg-bg-card border border-border-primary rounded-lg text-text-primary focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                    />
                                    <ExternalLink className="w-3.5 h-3.5 text-text-tertiary absolute left-2.5 top-2.5" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SUBMIT BUTTON */}
                    <div className="pt-2 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={handleResetForm}
                            className="px-3 py-2 text-xs font-medium text-text-tertiary hover:text-text-secondary cursor-pointer"
                        >
                            Hủy / Soạn lại
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting || (targetMode === "direct" && !selectedUserId)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className={`w-3.5 h-3.5 ${isSubmitting ? "animate-spin" : ""}`} />
                            {isSubmitting ? "Đang phát thông báo..." : `Phát Thông Báo Ngay (~${estimatedReach} học sinh)`}
                        </button>
                    </div>
                </form>

                {/* RIGHT: LIVE REALTIME PREVIEW (5 Cols) */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="bg-bg-card border border-border-primary rounded-2xl p-5 shadow-xs space-y-4 sticky top-4">
                        <div className="flex items-center justify-between border-b border-border-primary pb-3">
                            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                                <Eye className="w-4 h-4 text-brand-500" />
                                Xem trước trực tiếp (Live Preview)
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                                Hộp thoại Chuông
                            </span>
                        </div>

                        <p className="text-[11px] text-text-tertiary">
                            Đây là giao diện thực tế mà học sinh sẽ nhìn thấy khi mở danh sách thông báo:
                        </p>

                        {/* Simulated Notification Item */}
                        <div className="rounded-xl border border-border-primary bg-bg-surface overflow-hidden shadow-xs">
                            <div className="p-4 flex items-start gap-3 bg-brand-50/75 dark:bg-brand-950/50 border-l-[3px] border-l-brand-500">
                                {/* Icon Badge */}
                                <div className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-900/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 shadow-xs">
                                    {notifType === "new_quiz" && <BookOpen className="w-4 h-4" />}
                                    {notifType === "teacher_message" && <Megaphone className="w-4 h-4" />}
                                    {notifType === "reminder" && <Clock className="w-4 h-4" />}
                                    {notifType === "system" && <Sparkles className="w-4 h-4" />}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <h4 className="text-xs font-bold text-text-primary truncate">
                                            {title || "Tiêu đề thông báo mẫu..."}
                                        </h4>
                                        <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider px-1.5 py-0.5 bg-brand-100/80 dark:bg-brand-900/50 rounded-md shrink-0">
                                            MỚI
                                        </span>
                                    </div>

                                    <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-3">
                                        {message || "Nội dung thông báo chi tiết của bạn sẽ hiển thị đầy đủ tại đây..."}
                                    </p>

                                    <div className="flex items-center justify-between pt-1 text-[10px] text-text-tertiary">
                                        <span>Vừa xong</span>
                                        {link && (
                                            <span className="text-brand-600 dark:text-brand-400 font-semibold inline-flex items-center gap-0.5 hover:underline">
                                                Bấm để xem <ArrowRight className="w-3 h-3" />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Audience Summary Box */}
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                            <div className="font-bold text-text-primary flex items-center justify-between">
                                <span>Phạm vi gửi:</span>
                                <span className="font-mono text-brand-600 dark:text-brand-400">
                                    {estimatedReach} học sinh
                                </span>
                            </div>
                            <div className="text-[11px] text-text-tertiary space-y-1">
                                {targetMode === "direct" ? (
                                    <div>
                                        • Người nhận đích danh:{" "}
                                        <strong className="text-text-primary">
                                            {selectedStudent ? `${selectedStudent.name} (@${selectedStudent.username})` : "Chưa chọn"}
                                        </strong>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            • Khối lớp:{" "}
                                            <strong className="text-text-primary">
                                                {targetGrade === "all" ? "Tất cả các khối" : `Lớp ${targetGrade}`}
                                            </strong>
                                        </div>
                                        <div>
                                            • Gói tài khoản:{" "}
                                            <strong className="text-text-primary">
                                                {targetPlan === "all"
                                                    ? "Tất cả các gói"
                                                    : targetPlan === "vip"
                                                    ? "VIP"
                                                    : targetPlan === "basic"
                                                    ? "Basic"
                                                    : "Miễn phí"}
                                            </strong>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 2: SENT NOTIFICATIONS HISTORY */}
            <div className="bg-bg-card border border-border-primary rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-primary pb-3">
                    <div>
                        <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                            <Bell className="w-4 h-4 text-brand-500" />
                            Lịch Sử Thông Báo Đã Gửi ({notifications.length})
                        </h2>
                        <p className="text-xs text-text-tertiary mt-0.5">
                            Theo dõi thống kê lượt đọc và quản lý/thu hồi các thông báo đã phát sóng trong hệ thống.
                        </p>
                    </div>
                </div>

                {loadingHistory ? (
                    <div className="py-12 text-center text-xs text-text-tertiary flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-brand-500" />
                        <span>Đang tải lịch sử thông báo...</span>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="py-12 text-center space-y-2 flex flex-col items-center justify-center">
                        <img
                            src="/icons/ghost.png"
                            alt=""
                            className="w-8 h-8 object-contain opacity-40 dark:opacity-60 select-none"
                        />
                        <p className="text-xs text-text-secondary font-medium">
                            Chưa có thông báo nào được gửi.
                        </p>
                        <p className="text-[11px] text-text-tertiary">
                            Các thông báo được bạn phát sóng sẽ hiển thị tại đây.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-border-primary text-text-tertiary uppercase text-[10px] tracking-wider font-bold">
                                    <th className="py-3 px-3">Loại & Tiêu đề</th>
                                    <th className="py-3 px-3">Đối tượng nhận</th>
                                    <th className="py-3 px-3 text-center">Lượt đã đọc</th>
                                    <th className="py-3 px-3">Thời gian</th>
                                    <th className="py-3 px-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-primary">
                                {notifications.map((notif) => {
                                    const notifDate = notif.createdAt ? new Date(notif.createdAt) : null;
                                    const dateStr = notifDate && !isNaN(notifDate.getTime())
                                        ? notifDate.toLocaleDateString("vi-VN", {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                              day: "2-digit",
                                              month: "2-digit",
                                              year: "numeric",
                                          })
                                        : "Vừa xong";

                                    return (
                                        <tr
                                            key={notif.id}
                                            className="hover:bg-bg-surface transition-colors"
                                        >
                                            {/* Title & Message preview */}
                                            <td className="py-3 px-3 max-w-sm">
                                                <div className="flex items-start gap-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                                                        {notif.type === "new_quiz" && <BookOpen className="w-3.5 h-3.5 text-blue-500" />}
                                                        {notif.type === "teacher_message" && <Megaphone className="w-3.5 h-3.5 text-emerald-500" />}
                                                        {notif.type === "reminder" && <Clock className="w-3.5 h-3.5 text-amber-500" />}
                                                        {notif.type === "system" && <Sparkles className="w-3.5 h-3.5 text-purple-500" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-text-primary line-clamp-1">
                                                            {notif.title}
                                                        </div>
                                                        <div className="text-[11px] text-text-secondary line-clamp-1 mt-0.5">
                                                            {notif.message}
                                                        </div>
                                                        {notif.link && (
                                                            <div className="text-[10px] text-brand-600 dark:text-brand-400 font-mono mt-0.5 truncate">
                                                                {notif.link}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Target Audience */}
                                            <td className="py-3 px-3 whitespace-nowrap">
                                                {notif.userId ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                        <UserIcon className="w-3 h-3" />
                                                        Đích danh
                                                    </span>
                                                ) : (
                                                    <div className="flex flex-wrap items-center gap-1">
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                            {notif.targetGrade === "all" || !notif.targetGrade ? "Toàn bộ khối" : `Khối ${notif.targetGrade}`}
                                                        </span>
                                                        {notif.targetPlan && notif.targetPlan !== "all" && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                                {notif.targetPlan.toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Read count */}
                                            <td className="py-3 px-3 text-center whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                    <Eye className="w-3 h-3" />
                                                    {notif.readCount || 0}
                                                </span>
                                            </td>

                                            {/* Created At */}
                                            <td className="py-3 px-3 text-text-tertiary whitespace-nowrap font-mono text-[11px]">
                                                {dateStr}
                                            </td>

                                            {/* Action: Delete */}
                                            <td className="py-3 px-3 text-right whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(notif.id)}
                                                    disabled={deletingId === notif.id}
                                                    title="Thu hồi / Xóa thông báo"
                                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
