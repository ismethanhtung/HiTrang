const safeParseDate = (dateVal: any): Date => {
    if (!dateVal) return new Date(NaN);
    if (dateVal instanceof Date) return dateVal;
    if (typeof dateVal === "string") {
        const normalized = dateVal.includes(" ")
            ? dateVal.replace(" ", "T")
            : dateVal;
        return new Date(normalized);
    }
    return new Date(dateVal);
};

import React, { useState } from "react";
import {
    User,
    LogOut,
    Key,
    Globe,
    Shield,
    UserCheck,
    Loader2,
    Clock,
    BookOpen,
    Lightbulb,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    History,
    Award,
    BookOpenCheck,
    ShieldCheck,
    ShieldAlert,
    Copy,
    Check,
    KeyRound,
    QrCode,
    X,
    Laptop,
    Smartphone,
    Tablet,
    Trash2,
    Eye,
    EyeOff,
    Bell,
    CheckCheck,
    ExternalLink,
    Palette,
    Sun,
    Moon,
    Monitor,
    Type,
    Search,
    Sparkles,
    AlertTriangle,
    Mail,
    MailCheck,
    MailX,
} from "lucide-react";
import { User as UserType, Quiz, Submission, AppNotification } from "../types";
import { PREDEFINED_AVATARS } from "../constants/avatars";
import { GoogleIcon, isUserGoogleAccount } from "./GoogleIcon";
import {
    updateProfileName,
    updateUsername,
    updatePassword,
    signOutAllDevices,
    uploadAvatar,
    updateAvatarUrl,
    setup2FA,
    enable2FA,
    disable2FA,
    setRequire2FALogin,
    ActiveSession,
    getActiveSessions,
    revokeSession,
    revokeAllOtherSessions,
    deleteUserAccount,
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    sendEmailVerificationOTP,
    verifyAndLinkEmail,
    unlinkEmail,
} from "../lib/supabaseService";
import { renderMathHtml } from "../lib/math";

interface SettingsViewProps {
    user: UserType;
    onUpdateUser: (updatedUser: UserType) => void;
    onLogout: () => void;
    theme: "light" | "dark" | "system";
    onThemeChange?: (theme: "light" | "dark" | "system") => void;
    submissions: Submission[];
    quizzes: Quiz[];
    initialTab?:
        | "profile"
        | "security"
        | "appearance"
        | "history"
        | "notifications";
    onTabChange?: (
        tab:
            | "profile"
            | "security"
            | "appearance"
            | "history"
            | "notifications",
    ) => void;
    onNavigate?: (path: string) => void;
}

export default function SettingsView({
    user,
    onUpdateUser,
    onLogout,
    theme,
    onThemeChange,
    submissions,
    quizzes,
    initialTab,
    onTabChange,
    onNavigate,
}: SettingsViewProps) {
    // Helper to split full name into first name and last name
    const parseName = (fullName: string) => {
        const parts = fullName.trim().split(/\s+/);
        if (parts.length <= 1) {
            return { firstName: "", lastName: fullName };
        }
        const lastName = parts.pop() || "";
        const firstName = parts.join(" ");
        return { firstName, lastName };
    };

    const initialName = parseName(user.name);
    const isGoogleUser = isUserGoogleAccount(user);
    const [firstName, setFirstName] = useState(initialName.firstName);
    const [lastName, setLastName] = useState(initialName.lastName);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] =
        useState(false);
    const [showCurrentPwd, setShowCurrentPwd] = useState(false);
    const [showNewPwd, setShowNewPwd] = useState(false);
    const [showConfirmPwd, setShowConfirmPwd] = useState(false);

    // UI states
    const [updatingName, setUpdatingName] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);
    const [loggingOutAll, setLoggingOutAll] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
    const [selectingPredefined, setSelectingPredefined] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [activeSettingsTab, setActiveSettingsTab] = useState<
        "profile" | "security" | "appearance" | "history" | "notifications"
    >(initialTab || "profile");
    const [historyFilter, setHistoryFilter] = useState<
        "all" | "high" | "medium" | "low"
    >("all");
    const [historySearch, setHistorySearch] = useState("");
    const [selectedFont, setSelectedFont] = useState<string>(() => {
        return localStorage.getItem("hitrang_font_family") || "plus-jakarta";
    });

    const fontOptions = [
        {
            id: "plus-jakarta",
            name: "Plus Jakarta Sans",
            cssVal: "'Plus Jakarta Sans', sans-serif",
            desc: "Hiện đại, thanh lịch & cân đối (Mặc định)",
        },
        {
            id: "be-vietnam",
            name: "Be Vietnam Pro",
            cssVal: "'Be Vietnam Pro', sans-serif",
            desc: "Tối ưu hóa hiển thị dấu tiếng Việt hoàn hảo",
        },
        {
            id: "inter",
            name: "Inter",
            cssVal: "'Inter', sans-serif",
            desc: "Tối giản, trung tính, cấu trúc chuẩn quốc tế",
        },
        {
            id: "jetbrains-mono",
            name: "JetBrains Mono",
            cssVal: "'JetBrains Mono', monospace",
            desc: "Chuyên dụng cho ký hiệu & kỹ thuật",
        },
    ];

    const handleSelectFont = (fontId: string) => {
        setSelectedFont(fontId);
        localStorage.setItem("hitrang_font_family", fontId);
        const opt = fontOptions.find((f) => f.id === fontId);
        if (opt) {
            document.body.style.fontFamily = opt.cssVal;
            document.documentElement.style.setProperty(
                "--font-sans",
                opt.cssVal,
            );
        }
    };

    const handleSelectTheme = (newTheme: "light" | "dark" | "system") => {
        if (onThemeChange) {
            onThemeChange(newTheme);
        } else {
            const root = window.document.documentElement;
            if (newTheme === "system") {
                const systemPrefersDark = window.matchMedia(
                    "(prefers-color-scheme: dark)",
                ).matches;
                if (systemPrefersDark) root.classList.add("dark");
                else root.classList.remove("dark");
            } else if (newTheme === "dark") {
                root.classList.add("dark");
            } else {
                root.classList.remove("dark");
            }
            localStorage.setItem("hitrang_theme", newTheme);
        }
    };

    const [reviewSubmission, setReviewSubmission] = useState<Submission | null>(
        null,
    );

    // Notifications tab state
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadNotifCount, setUnreadNotifCount] = useState(0);
    const [loadingNotifs, setLoadingNotifs] = useState(false);
    const [markingAllNotifs, setMarkingAllNotifs] = useState(false);
    const [notifFilter, setNotifFilter] = useState<"all" | "unread">("all");

    const fetchNotifs = async () => {
        setLoadingNotifs(true);
        try {
            const data = await getNotifications();
            setNotifications(data.notifications || []);
            setUnreadNotifCount(data.unreadCount || 0);
        } catch (err) {
            console.error("Lỗi khi tải thông báo:", err);
        } finally {
            setLoadingNotifs(false);
        }
    };

    React.useEffect(() => {
        fetchNotifs();
    }, []);

    const handleReadNotification = async (notif: AppNotification) => {
        if (!notif.isRead) {
            try {
                await markNotificationAsRead(notif.id);
                setNotifications((prev) =>
                    prev.map((n) =>
                        n.id === notif.id ? { ...n, isRead: true } : n,
                    ),
                );
                setUnreadNotifCount((c) => Math.max(0, c - 1));
            } catch (err) {
                console.error("Lỗi:", err);
            }
        }
        if (notif.quizId) {
            if (onNavigate) {
                onNavigate(`/quiz/${notif.quizId}`);
            } else {
                window.history.pushState({}, "", `/quiz/${notif.quizId}`);
                window.dispatchEvent(new Event("popstate"));
            }
        } else if (notif.link) {
            if (onNavigate) {
                onNavigate(notif.link);
            } else {
                window.history.pushState({}, "", notif.link);
                window.dispatchEvent(new Event("popstate"));
            }
        }
    };

    const handleMarkAllNotifs = async () => {
        if (unreadNotifCount === 0 || markingAllNotifs) return;
        setMarkingAllNotifs(true);
        try {
            await markAllNotificationsAsRead();
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, isRead: true })),
            );
            setUnreadNotifCount(0);
        } catch (err) {
            console.error("Lỗi:", err);
        } finally {
            setMarkingAllNotifs(false);
        }
    };

    const formatNotifTimeAgo = (dateStr: string) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "";
        const now = new Date();
        const diffMs = Math.max(0, now.getTime() - d.getTime());
        const diffMin = Math.floor(diffMs / 60000);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffMin < 2) return "Vừa xong";
        if (diffMin < 60) return `${diffMin} phút trước`;
        if (diffHour < 24) return `${diffHour} giờ trước`;
        if (diffDay === 1) return "Hôm qua";
        if (diffDay < 30) return `${diffDay} ngày trước`;
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    };

    // Email Linking states
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailInput, setEmailInput] = useState("");
    const [emailOTP, setEmailOTP] = useState("");
    const [emailStep, setEmailStep] = useState<"input" | "verify">("input");
    const [sendingEmailOTP, setSendingEmailOTP] = useState(false);
    const [verifyingEmailOTP, setVerifyingEmailOTP] = useState(false);
    const [unlinkingEmailState, setUnlinkingEmailState] = useState(false);
    const [emailModalError, setEmailModalError] = useState("");
    const [emailModalSuccess, setEmailModalSuccess] = useState("");
    const [emailCountdown, setEmailCountdown] = useState(0);

    // Email countdown timer effect
    React.useEffect(() => {
        if (emailCountdown > 0) {
            const timer = setTimeout(
                () => setEmailCountdown(emailCountdown - 1),
                1000,
            );
            return () => clearTimeout(timer);
        }
    }, [emailCountdown]);

    const handleOpenLinkEmailModal = () => {
        setEmailInput(user.email || "");
        setEmailOTP("");
        setEmailStep("input");
        setEmailModalError("");
        setEmailModalSuccess("");
        setIsEmailModalOpen(true);
    };

    const handleSendEmailOTP = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setEmailModalError("");
        setEmailModalSuccess("");

        const cleanEmail = emailInput.trim().toLowerCase();
        if (
            !cleanEmail ||
            !cleanEmail.includes("@") ||
            !cleanEmail.includes(".")
        ) {
            setEmailModalError("Vui lòng nhập địa chỉ email hợp lệ.");
            return;
        }

        setSendingEmailOTP(true);
        try {
            const res = await sendEmailVerificationOTP(cleanEmail);
            setEmailStep("verify");
            setEmailModalSuccess(
                res.message || "Đã gửi mã xác thực 6 số đến email của bạn.",
            );
            setEmailCountdown(60);
        } catch (err: any) {
            setEmailModalError(
                err.message ||
                    "Không thể gửi mã xác thực email. Vui lòng kiểm tra lại cấu hình SMTP.",
            );
        } finally {
            setSendingEmailOTP(false);
        }
    };

    const handleVerifyEmailOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailModalError("");
        setEmailModalSuccess("");

        const cleanEmail = emailInput.trim().toLowerCase();
        const cleanCode = emailOTP.trim();

        if (cleanCode.length !== 6) {
            setEmailModalError("Mã xác thực phải gồm đúng 6 chữ số.");
            return;
        }

        setVerifyingEmailOTP(true);
        try {
            const res = await verifyAndLinkEmail(cleanEmail, cleanCode);
            onUpdateUser({
                ...user,
                email: res.email || cleanEmail,
            });
            alert(
                "Đã liên kết email thành công! Bạn có thể sử dụng email này để khôi phục mật khẩu khi cần.",
            );
            setIsEmailModalOpen(false);
        } catch (err: any) {
            setEmailModalError(
                err.message || "Mã xác thực không chính xác hoặc đã hết hạn.",
            );
        } finally {
            setVerifyingEmailOTP(false);
        }
    };

    const handleUnlinkEmailAction = async () => {
        if (
            !confirm(
                "Bạn có chắc chắn muốn gỡ liên kết email khỏi tài khoản không?",
            )
        ) {
            return;
        }

        setUnlinkingEmailState(true);
        try {
            await unlinkEmail();
            onUpdateUser({
                ...user,
                email: undefined,
            });
            alert("Đã gỡ liên kết email thành công.");
        } catch (err: any) {
            alert(
                `Lỗi gỡ liên kết email: ${err.message || "Vui lòng thử lại"}`,
            );
        } finally {
            setUnlinkingEmailState(false);
        }
    };

    // 2-Step Verification (Google Authenticator) states
    const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
    const [isDisable2FAModalOpen, setIsDisable2FAModalOpen] = useState(false);
    const [setup2FAData, setSetup2FAData] = useState<{
        secret: string;
        otpauthUri: string;
    } | null>(null);
    const [loading2FASetup, setLoading2FASetup] = useState(false);
    const [verify2FACode, setVerify2FACode] = useState("");
    const [enabling2FA, setEnabling2FA] = useState(false);
    const [enable2FAError, setEnable2FAError] = useState("");
    const [copied2FASecret, setCopied2FASecret] = useState(false);
    const [disable2FACodeOrPassword, setDisable2FACodeOrPassword] =
        useState("");
    const [disabling2FA, setDisabling2FA] = useState(false);
    const [disable2FAError, setDisable2FAError] = useState("");

    const handleStartSetup2FA = async () => {
        setLoading2FASetup(true);
        setEnable2FAError("");
        setVerify2FACode("");
        try {
            const data = await setup2FA();
            setSetup2FAData(data);
            setIs2FAModalOpen(true);
        } catch (err: any) {
            alert(`Lỗi khởi tạo 2FA: ${err.message || "Vui lòng thử lại"}`);
        } finally {
            setLoading2FASetup(false);
        }
    };

    const handleConfirmEnable2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        if (verify2FACode.trim().length !== 6) {
            setEnable2FAError("Mã xác thực phải gồm đúng 6 chữ số.");
            return;
        }
        setEnabling2FA(true);
        setEnable2FAError("");
        try {
            await enable2FA(verify2FACode.trim());
            onUpdateUser({
                ...user,
                totpEnabled: true,
                totpLinked: true,
                require2FALogin: false,
            });
            setIs2FAModalOpen(false);
            alert(
                "Đã liên kết Google Authenticator thành công! Bạn có thể dùng mã để khôi phục mật khẩu.",
            );
        } catch (err: any) {
            setEnable2FAError(
                err.message || "Mã xác thực không chính xác. Vui lòng thử lại.",
            );
        } finally {
            setEnabling2FA(false);
        }
    };

    const handleConfirmDisable2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!disable2FACodeOrPassword.trim()) {
            setDisable2FAError("Vui lòng nhập mật khẩu hoặc mã OTP 6 số.");
            return;
        }
        setDisabling2FA(true);
        setDisable2FAError("");
        try {
            await disable2FA(
                disable2FACodeOrPassword.trim(),
                disable2FACodeOrPassword.trim(),
            );
            onUpdateUser({
                ...user,
                totpEnabled: false,
                totpLinked: false,
                require2FALogin: false,
            });
            setIsDisable2FAModalOpen(false);
            setDisable2FACodeOrPassword("");
            alert("Đã hủy liên kết Google Authenticator thành công.");
        } catch (err: any) {
            setDisable2FAError(
                err.message ||
                    "Không thể hủy liên kết. Vui lòng kiểm tra lại thông tin.",
            );
        } finally {
            setDisabling2FA(false);
        }
    };

    const handleCopy2FASecret = async () => {
        if (!setup2FAData?.secret) return;
        try {
            await navigator.clipboard.writeText(setup2FAData.secret);
            setCopied2FASecret(true);
            setTimeout(() => setCopied2FASecret(false), 2500);
        } catch (e) {
            setCopied2FASecret(true);
            setTimeout(() => setCopied2FASecret(false), 2500);
        }
    };

    const [toggling2FALogin, setToggling2FALogin] = useState(false);
    const handleToggle2FALogin = async (enabled: boolean) => {
        setToggling2FALogin(true);
        try {
            await setRequire2FALogin(enabled);
            onUpdateUser({ ...user, require2FALogin: enabled });
        } catch (err: any) {
            alert(
                `Không thể cập nhật cấu hình: ${err.message || "Vui lòng thử lại"}`,
            );
        } finally {
            setToggling2FALogin(false);
        }
    };

    // Active Sessions & Account Deletion states
    const [sessions, setSessions] = useState<ActiveSession[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [loggingOutAllSessions, setLoggingOutAllSessions] = useState(false);
    const [revokingSessionId, setRevokingSessionId] = useState<string | null>(
        null,
    );

    // Delete Account states
    const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] =
        useState(false);
    const [deleteAccountPassword, setDeleteAccountPassword] = useState("");
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [deleteAccountError, setDeleteAccountError] = useState("");

    const loadSessions = async () => {
        setLoadingSessions(true);
        try {
            const data = await getActiveSessions();
            setSessions(data);
        } catch (err) {
            console.error("Lỗi tải danh sách phiên đăng nhập:", err);
        } finally {
            setLoadingSessions(false);
        }
    };

    const handleRevokeSession = async (sessionId: string) => {
        setRevokingSessionId(sessionId);
        try {
            await revokeSession(sessionId);
            setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        } catch (err: any) {
            alert(
                `Không thể đăng xuất thiết bị: ${err.message || "Vui lòng thử lại"}`,
            );
        } finally {
            setRevokingSessionId(null);
        }
    };

    const handleLogOutAllOtherSessions = async () => {
        setLoggingOutAllSessions(true);
        try {
            await revokeAllOtherSessions();
            setSessions((prev) => prev.filter((s) => s.isCurrent));
        } catch (err: any) {
            alert(
                `Không thể đăng xuất tất cả: ${err.message || "Vui lòng thử lại"}`,
            );
        } finally {
            setLoggingOutAllSessions(false);
        }
    };

    const handleDeleteAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setDeletingAccount(true);
        setDeleteAccountError("");
        try {
            await deleteUserAccount(deleteAccountPassword);
            setIsDeleteAccountModalOpen(false);
            alert("Tài khoản của bạn đã được xóa vĩnh viễn.");
            onLogout();
        } catch (err: any) {
            setDeleteAccountError(
                err.message ||
                    "Không thể xóa tài khoản. Vui lòng kiểm tra lại mật khẩu.",
            );
        } finally {
            setDeletingAccount(false);
        }
    };

    const formatLastSeen = (isoStr: string) => {
        if (!isoStr) return "";
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        const seconds = String(d.getSeconds()).padStart(2, "0");
        const day = d.getDate();
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
    };

    const formatExpires = (isoStr: string) => {
        if (!isoStr) return "";
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;
        const day = d.getDate();
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        return `Expires ${day}/${month}/${year}`;
    };

    const formatPasswordAge = (dateStr?: string | null) => {
        if (!dateStr) return "Never changed since account creation.";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "Never changed since account creation.";
        const now = new Date();
        const diffMs = Math.max(0, now.getTime() - d.getTime());
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        const diffMonth = Math.floor(diffDay / 30);
        const diffYear = Math.floor(diffDay / 365);

        if (diffMin < 2) return "Last changed just now.";
        if (diffMin < 60) return `Last changed ${diffMin} minutes ago.`;
        if (diffHour < 24)
            return `Last changed ${diffHour} ${diffHour === 1 ? "hour" : "hours"} ago.`;
        if (diffDay === 1) return "Last changed yesterday.";
        if (diffDay < 30) return `Last changed ${diffDay} days ago.`;
        if (diffMonth === 1) return "Last changed 1 month ago.";
        if (diffMonth < 12) return `Last changed ${diffMonth} months ago.`;
        if (diffYear === 1) return "Last changed 1 year ago.";
        return `Last changed ${diffYear} years ago.`;
    };

    React.useEffect(() => {
        if (activeSettingsTab === "security") {
            loadSessions();
        }
    }, [activeSettingsTab]);

    React.useEffect(() => {
        if (initialTab) {
            setActiveSettingsTab(initialTab);
        }
    }, [initialTab]);

    const handleAvatarChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setAvatarError("Kích thước ảnh vượt quá giới hạn 2MB");
            return;
        }

        setAvatarError(null);
        setUploadingAvatar(true);
        try {
            const avatarUrl = await uploadAvatar(file);
            const updatedUser = { ...user, avatarUrl };
            onUpdateUser(updatedUser);
            localStorage.setItem("hvt_user", JSON.stringify(updatedUser));
        } catch (err: any) {
            console.error("Lỗi khi tải ảnh lên:", err);
            setAvatarError(
                err.message || "Không thể tải ảnh lên, vui lòng thử lại",
            );
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSelectPredefinedAvatar = async (avatarUrl: string) => {
        setAvatarError(null);
        setSelectingPredefined(true);
        try {
            const savedUrl = await updateAvatarUrl(avatarUrl);
            const updatedUser = { ...user, avatarUrl: savedUrl };
            onUpdateUser(updatedUser);
            localStorage.setItem("hvt_user", JSON.stringify(updatedUser));
            setIsAvatarPickerOpen(false);
        } catch (err: any) {
            console.error("Lỗi khi chọn ảnh đại diện:", err);
            setAvatarError(
                err.message || "Không thể cập nhật ảnh đại diện mẫu",
            );
        } finally {
            setSelectingPredefined(false);
        }
    };

    const handleTabClick = (
        tab:
            | "profile"
            | "security"
            | "appearance"
            | "history"
            | "notifications",
    ) => {
        setActiveSettingsTab(tab);
        if (onTabChange) {
            onTabChange(tab);
        }
        if (tab === "notifications") {
            fetchNotifs();
        }
        if (tab === "security") {
            loadSessions();
        }
    };

    const [expandedQuizzes, setExpandedQuizzes] = useState<
        Record<string, boolean>
    >({});

    const toggleQuizExpand = (quizId: string) => {
        setExpandedQuizzes((prev) => {
            const current = prev[quizId] !== false;
            return {
                ...prev,
                [quizId]: !current,
            };
        });
    };

    const getScoreTextColor = (score: number) => {
        if (score >= 8) return "text-emerald-600 dark:text-emerald-400";
        if (score >= 5) return "text-amber-600 dark:text-amber-400";
        return "text-rose-600 dark:text-rose-400";
    };

    // Helper functions
    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
    };

    const cleanTrueFalseQuestionText = (html: string) => {
        if (!html) return "";
        let clean = html.replace(
            /<table[^>]*>([\s\S]*?)<\/table>/gi,
            (match) => {
                if (
                    match.includes("Khẳng định") ||
                    match.includes("Đúng") ||
                    match.includes("Sai")
                ) {
                    return "";
                }
                return match;
            },
        );

        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = clean;

        const items = Array.from(tempDiv.querySelectorAll("p, li, div"));
        items.forEach((item) => {
            const text = item.textContent?.trim() || "";
            if (/^[a-f][\)\.\:\-]/i.test(text)) {
                item.remove();
            }
        });

        return tempDiv.innerHTML;
    };

    // Feedback alerts
    const [nameError, setNameError] = useState("");
    const [nameSuccess, setNameSuccess] = useState("");
    const [usernameInput, setUsernameInput] = useState(user.username || "");
    const [updatingUsername, setUpdatingUsername] = useState(false);
    const [usernameError, setUsernameError] = useState("");
    const [usernameSuccess, setUsernameSuccess] = useState("");
    const [isConfirmUsernameModalOpen, setIsConfirmUsernameModalOpen] =
        useState(false);
    const [pwdError, setPwdError] = useState("");
    const [pwdSuccess, setPwdSuccess] = useState("");
    const [globalError, setGlobalError] = useState("");

    // Sync username input if user changes
    React.useEffect(() => {
        setUsernameInput(user.username || "");
    }, [user.username]);

    // Validate and initiate username update modal
    const handleInitiateUpdateUsername = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setUsernameError("");
        setUsernameSuccess("");

        const clean = usernameInput.trim().toLowerCase();
        if (clean === (user.username || "").toLowerCase()) {
            setUsernameError("Tên đăng nhập mới không có sự thay đổi.");
            return;
        }

        if (clean.length < 4 || clean.length > 30) {
            setUsernameError("Tên đăng nhập phải từ 4 đến 30 ký tự.");
            return;
        }

        if (/\s/.test(clean)) {
            setUsernameError("Tên đăng nhập không được chứa khoảng trắng.");
            return;
        }

        if (clean.includes("@")) {
            setUsernameError(
                "Tên đăng nhập không được chứa ký tự '@' (không nhập email).",
            );
            return;
        }

        if (!/^[a-z0-9_.]+$/.test(clean)) {
            setUsernameError(
                "Tên đăng nhập chỉ gồm chữ cái không dấu (a-z), số (0-9), dấu gạch dưới (_) hoặc dấu chấm (.). Không dùng tiếng Việt có dấu.",
            );
            return;
        }

        // Open confirmation modal
        setIsConfirmUsernameModalOpen(true);
    };

    // Confirmed username update execution
    const handleConfirmUpdateUsername = async () => {
        setUsernameError("");
        setUsernameSuccess("");
        const clean = usernameInput.trim().toLowerCase();

        setUpdatingUsername(true);
        try {
            const res = await updateUsername(clean);
            onUpdateUser({
                ...user,
                username: res.username || clean,
            });
            setUsernameSuccess("Đã đổi tên đăng nhập thành công!");
            setIsConfirmUsernameModalOpen(false);

            // Log out user as session ends with username change
            setTimeout(() => {
                alert(
                    isGoogleUser
                        ? `Đổi tên định danh thành công sang @${clean}.\nPhiên làm việc đã kết thúc. Vui lòng đăng nhập lại bằng tài khoản Google.`
                        : `Đổi tên đăng nhập thành công sang @${clean}.\nPhiên đăng nhập hiện tại đã kết thúc. Vui lòng đăng nhập lại bằng tên mới.`,
                );
                onLogout();
            }, 300);
        } catch (err: any) {
            setUsernameError(err.message || "Lỗi khi đổi tên đăng nhập.");
            setIsConfirmUsernameModalOpen(false);
        } finally {
            setUpdatingUsername(false);
        }
    };

    // Handle name update
    const handleUpdateName = async () => {
        setNameError("");
        setNameSuccess("");
        const newFullName = [firstName.trim(), lastName.trim()]
            .filter(Boolean)
            .join(" ");

        if (!newFullName) {
            setNameError("Họ và tên không được để trống.");
            return;
        }

        setUpdatingName(true);
        try {
            await updateProfileName(user.id, newFullName);
            onUpdateUser({
                ...user,
                name: newFullName,
            });
            setNameSuccess("Đã cập nhật họ tên thành công!");
        } catch (err: any) {
            setNameError(err.message || "Lỗi khi cập nhật họ tên.");
        } finally {
            setUpdatingName(false);
        }
    };

    // Handle password update
    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwdError("");
        setPwdSuccess("");

        if (!password) {
            setPwdError("Vui lòng nhập mật khẩu mới.");
            return;
        }
        if (password.length < 6) {
            setPwdError("Mật khẩu phải chứa ít nhất 6 ký tự.");
            return;
        }
        if (password !== confirmPassword) {
            setPwdError("Mật khẩu xác nhận không khớp.");
            return;
        }

        setUpdatingPassword(true);
        try {
            const res = await updatePassword(password, currentPassword);
            const updatedDate =
                res?.passwordUpdatedAt || new Date().toISOString();
            setPwdSuccess("Đổi mật khẩu thành công!");
            onUpdateUser({
                ...user,
                passwordUpdatedAt: updatedDate,
            });
            setTimeout(() => {
                setIsChangePasswordModalOpen(false);
                setCurrentPassword("");
                setPassword("");
                setConfirmPassword("");
                setPwdSuccess("");
                setPwdError("");
            }, 1200);
        } catch (err: any) {
            setPwdError(err.message || "Lỗi khi cập nhật mật khẩu.");
        } finally {
            setUpdatingPassword(false);
        }
    };

    // Handle global sign out
    const handleSignOutAll = async () => {
        if (
            !confirm(
                "Bạn có chắc chắn muốn đăng xuất khỏi tất cả các thiết bị khác?",
            )
        ) {
            return;
        }
        setGlobalError("");
        setLoggingOutAll(true);
        try {
            await signOutAllDevices();
            alert(
                "Đăng xuất thành công khỏi tất cả thiết bị. Bạn sẽ được chuyển về trang đăng nhập.",
            );
            onLogout();
        } catch (err: any) {
            setGlobalError(
                err.message || "Không thể đăng xuất khỏi các thiết bị.",
            );
        } finally {
            setLoggingOutAll(false);
        }
    };

    if (reviewSubmission) {
        const quiz = quizzes.find((q) => q.id === reviewSubmission.quizId);

        // Determine number of correct questions
        const correctAnswersCount = quiz
            ? quiz.questions.filter((q) => {
                  const chosen = reviewSubmission.answers[q.id];
                  if (!q.type || q.type === "single_choice") {
                      return (
                          chosen !== undefined &&
                          chosen === q.correctAnswerIndex
                      );
                  } else if (q.type === "true_false") {
                      const correctTf = q.correctAnswers || [
                          false,
                          false,
                          false,
                          false,
                      ];
                      const studentTf = (chosen as (boolean | null)[]) || [
                          null,
                          null,
                          null,
                          null,
                      ];
                      return q.options.every(
                          (_, oIdx) => studentTf[oIdx] === correctTf[oIdx],
                      );
                  } else if (q.type === "short_answer") {
                      return (
                          String(chosen || "")
                              .trim()
                              .toLowerCase() ===
                          String(q.shortAnswerKey || "")
                              .trim()
                              .toLowerCase()
                      );
                  }
                  return false;
              }).length
            : 0;

        return (
            <div className="flex-1 bg-white dark:bg-bg-card text-slate-800 dark:text-slate-100 transition-colors duration-200 overflow-y-auto select-none p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    {quiz ? (
                        <>
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold bg-[#3B6D85]/10 text-[#3B6D85] px-2 py-0.5 rounded uppercase tracking-wider">
                                            Chi tiết bài thi
                                        </span>
                                        <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-350 px-2 py-0.5 rounded uppercase">
                                            {quiz.subject}
                                        </span>
                                    </div>
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2">
                                        {reviewSubmission.quizTitle}
                                    </h2>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-455 mt-1 flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        Nộp bài lúc:{" "}
                                        {reviewSubmission.submittedAt}
                                    </p>
                                </div>
                                <div className="flex items-center gap-6 self-stretch md:self-auto justify-between border-t md:border-t-0 border-slate-100 dark:border-slate-700 pt-4 md:pt-0">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col items-center justify-center bg-brand-50 dark:bg-brand-500/10 text-[#3B6D85] dark:text-brand-400 w-14 h-14 rounded-full border border-brand-200 dark:border-brand-500/30 shadow-2xs">
                                            <span className="text-base font-extrabold leading-none">
                                                {reviewSubmission.score}
                                            </span>
                                            <span className="text-[7px] font-bold text-slate-400 mt-0.5">
                                                ĐIỂM
                                            </span>
                                        </div>
                                        <div className="text-xs">
                                            <div className="font-bold text-slate-800 dark:text-slate-200">
                                                Kết quả bài làm
                                            </div>
                                            <div className="text-slate-500 dark:text-slate-455 text-[11px] mt-0.5">
                                                {correctAnswersCount} /{" "}
                                                {quiz.questions.length} câu đúng
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setReviewSubmission(null)
                                        }
                                        className="px-3.5 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-all shadow-3xs cursor-pointer active:scale-95 flex items-center gap-1 flex-shrink-0"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        <span>Quay lại</span>
                                    </button>
                                </div>
                            </div>

                            {/* Questions */}
                            <div className="space-y-6">
                                {quiz.questions.map((q, qIndex) => {
                                    const chosen =
                                        reviewSubmission.answers[q.id];

                                    // Determine grading accuracy
                                    let isQCorrect = false;
                                    let isQPartial = false;
                                    let tfStatusList: {
                                        text: string;
                                        correct: boolean;
                                        studentVal: boolean | null;
                                        correctVal: boolean;
                                    }[] = [];

                                    if (!q.type || q.type === "single_choice") {
                                        isQCorrect =
                                            chosen !== undefined &&
                                            chosen === q.correctAnswerIndex;
                                    } else if (q.type === "true_false") {
                                        const correctTf = q.correctAnswers || [
                                            false,
                                            false,
                                            false,
                                            false,
                                        ];
                                        const studentTf = (chosen as (
                                            | boolean
                                            | null
                                        )[]) || [null, null, null, null];

                                        let matchCount = 0;
                                        tfStatusList = q.options.map(
                                            (opt, oIdx) => {
                                                const sVal = studentTf[oIdx];
                                                const cVal = correctTf[oIdx];
                                                const match = sVal === cVal;
                                                if (match) matchCount++;
                                                return {
                                                    text: opt,
                                                    correct: match,
                                                    studentVal: sVal,
                                                    correctVal: cVal,
                                                };
                                            },
                                        );

                                        isQCorrect = matchCount === 4;
                                        isQPartial =
                                            matchCount > 0 && matchCount < 4;
                                    } else if (q.type === "short_answer") {
                                        const cKey = (q.shortAnswerKey || "")
                                            .trim()
                                            .toLowerCase();
                                        const sKey = String(chosen || "")
                                            .trim()
                                            .toLowerCase();
                                        isQCorrect = cKey && sKey === cKey;
                                    }

                                    // Determine card border accent style
                                    let cardAccentClass =
                                        "border-l-4 border-l-rose-500";
                                    let statusBadgeClass =
                                        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50";
                                    let statusText = "Sai";

                                    if (isQCorrect) {
                                        cardAccentClass =
                                            "border-l-4 border-l-emerald-500";
                                        statusBadgeClass =
                                            "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50";
                                        statusText = "Đúng";
                                    } else if (isQPartial) {
                                        cardAccentClass =
                                            "border-l-4 border-l-amber-500";
                                        statusBadgeClass =
                                            "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50";
                                        statusText = "Đúng một phần";
                                    }

                                    const displayQuestionText =
                                        q.type === "true_false"
                                            ? cleanTrueFalseQuestionText(q.text)
                                            : q.text;

                                    return (
                                        <div
                                            key={q.id}
                                            className={`bg-white dark:bg-slate-800/50 border-y border-r border-slate-200 dark:border-slate-700/80 ${cardAccentClass} rounded-xl p-5 space-y-4 shadow-3xs`}
                                        >
                                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-extrabold text-brand-700 bg-brand-100 dark:bg-brand-500/20 dark:text-brand-400 px-2 py-0.5 rounded">
                                                        Câu {qIndex + 1}
                                                    </span>
                                                    <span
                                                        className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                                                            q.type ===
                                                            "true_false"
                                                                ? "bg-amber-50 text-amber-800 border-amber-250 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50"
                                                                : q.type ===
                                                                    "short_answer"
                                                                  ? "bg-purple-50 text-purple-800 border-purple-250 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50"
                                                                  : "bg-sky-50 text-sky-800 border-sky-250 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/50"
                                                        }`}
                                                    >
                                                        {q.type === "true_false"
                                                            ? "Đúng / Sai"
                                                            : q.type ===
                                                                "short_answer"
                                                              ? "Điền đáp án"
                                                              : "Trắc nghiệm"}
                                                    </span>
                                                </div>
                                                <span
                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${statusBadgeClass}`}
                                                >
                                                    {statusText}
                                                </span>
                                            </div>

                                            {/* Question text */}
                                            <div
                                                className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 leading-relaxed overflow-x-auto [&_img]:mx-auto [&_img]:block [&_img]:my-4"
                                                dangerouslySetInnerHTML={{
                                                    __html: renderMathHtml(
                                                        displayQuestionText,
                                                    ),
                                                }}
                                            />

                                            {/* 1. Single Choice Options Review */}
                                            {(!q.type ||
                                                q.type === "single_choice") && (
                                                <div className="space-y-2.5">
                                                    {q.options.map(
                                                        (opt, oIdx) => {
                                                            const isChosen =
                                                                chosen === oIdx;
                                                            const isCorrectOpt =
                                                                q.correctAnswerIndex ===
                                                                oIdx;
                                                            const cleanedOpt =
                                                                opt.replace(
                                                                    /^\s*[a-f][\)\.\:\-]\s*/i,
                                                                    "",
                                                                );

                                                            let cardStyle =
                                                                "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300";
                                                            let badge = null;

                                                            if (isCorrectOpt) {
                                                                cardStyle =
                                                                    "border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/15 text-emerald-800 dark:text-emerald-400";
                                                                badge = (
                                                                    <span className="text-[9px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded ml-auto">
                                                                        Đáp án
                                                                        đúng
                                                                    </span>
                                                                );
                                                            } else if (
                                                                isChosen &&
                                                                !isCorrectOpt
                                                            ) {
                                                                cardStyle =
                                                                    "border-rose-300 dark:border-rose-800/80 bg-rose-50/20 dark:bg-rose-950/15 text-rose-800 dark:text-rose-400";
                                                                badge = (
                                                                    <span className="text-[9px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded ml-auto">
                                                                        Lựa chọn
                                                                        của bạn
                                                                    </span>
                                                                );
                                                            } else if (
                                                                isChosen
                                                            ) {
                                                                badge = (
                                                                    <span className="text-[9px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded ml-auto">
                                                                        Lựa chọn
                                                                        của bạn
                                                                    </span>
                                                                );
                                                            }

                                                            return (
                                                                <div
                                                                    key={oIdx}
                                                                    className={`flex items-center gap-3 p-3 border rounded-xl text-xs font-medium ${cardStyle}`}
                                                                >
                                                                    <span
                                                                        className={`w-5 h-5 rounded-xl flex items-center justify-center font-bold text-[10px] ${
                                                                            isCorrectOpt
                                                                                ? "bg-emerald-500 text-white"
                                                                                : isChosen
                                                                                  ? "bg-rose-50 text-white"
                                                                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                                        }`}
                                                                    >
                                                                        {String.fromCharCode(
                                                                            65 +
                                                                                oIdx,
                                                                        )}
                                                                    </span>
                                                                    <span
                                                                        className="[&_img]:mx-auto [&_img]:block [&_img]:my-2"
                                                                        dangerouslySetInnerHTML={{
                                                                            __html: renderMathHtml(
                                                                                cleanedOpt,
                                                                            ),
                                                                        }}
                                                                    />
                                                                    {badge}
                                                                </div>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            )}

                                            {/* 2. True/False Statement Grid Review */}
                                            {q.type === "true_false" && (
                                                <div className="space-y-2.5">
                                                    {tfStatusList.map(
                                                        (item, oIdx) => {
                                                            const sText =
                                                                item.studentVal ===
                                                                null
                                                                    ? "Chưa chọn"
                                                                    : item.studentVal
                                                                      ? "Đúng"
                                                                      : "Sai";
                                                            const cText =
                                                                item.correctVal
                                                                    ? "Đúng"
                                                                    : "Sai";
                                                            const cleanedOpt =
                                                                item.text.replace(
                                                                    /^\s*[a-f][\)\.\:\-]\s*/i,
                                                                    "",
                                                                );

                                                            return (
                                                                <div
                                                                    key={oIdx}
                                                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-700/80 rounded-xl text-xs"
                                                                >
                                                                    <div className="font-medium text-slate-800 dark:text-slate-200 flex gap-2 [&_img]:mx-auto [&_img]:block [&_img]:my-2">
                                                                        <span className="font-extrabold text-slate-500">
                                                                            {String.fromCharCode(
                                                                                97 +
                                                                                    oIdx,
                                                                            )}
                                                                            )
                                                                        </span>
                                                                        <span
                                                                            dangerouslySetInnerHTML={{
                                                                                __html: renderMathHtml(
                                                                                    cleanedOpt,
                                                                                ),
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                                                                        <span
                                                                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                                                                item.studentVal ===
                                                                                null
                                                                                    ? "bg-slate-200 text-slate-600 border border-slate-300"
                                                                                    : item.correct
                                                                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                                                      : "bg-rose-100 text-rose-800 border border-rose-250 dark:bg-rose-950/20 dark:text-rose-400"
                                                                            }`}
                                                                        >
                                                                            Bạn
                                                                            chọn:{" "}
                                                                            {
                                                                                sText
                                                                            }
                                                                        </span>
                                                                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-250 dark:bg-emerald-950/10 dark:text-emerald-400">
                                                                            Đáp
                                                                            án:{" "}
                                                                            {
                                                                                cText
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            )}

                                            {/* 3. Short Answer Review */}
                                            {q.type === "short_answer" && (
                                                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-700 rounded-xl flex flex-wrap gap-4 text-xs font-semibold">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-500">
                                                            Đáp án của bạn:
                                                        </span>
                                                        <span
                                                            className={`px-2.5 py-0.5 rounded font-extrabold ${
                                                                isQCorrect
                                                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                                    : "bg-rose-100 text-rose-800 border border-rose-250 dark:bg-rose-950/20 dark:text-rose-400"
                                                            }`}
                                                        >
                                                            {chosen !==
                                                                undefined &&
                                                            chosen !== ""
                                                                ? String(chosen)
                                                                : "(Để trống)"}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                                                        <span className="text-slate-500">
                                                            Đáp án đúng:
                                                        </span>
                                                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-250 dark:bg-emerald-950/10 dark:text-emerald-400 px-2.5 py-0.5 rounded font-extrabold">
                                                            {q.shortAnswerKey}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Rich HTML Explanation */}
                                            {q.explanation && (
                                                <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 text-xs space-y-2 mt-4">
                                                    <div className="flex items-center gap-1.5 text-[#3B6D85] dark:text-brand-400 font-extrabold">
                                                        <img
                                                            src="/icons/lightbulb.png"
                                                            alt="Lời giải"
                                                            className="w-4 h-4 object-contain select-none flex-shrink-0"
                                                        />
                                                        <span>
                                                            Lời giải chi tiết:
                                                        </span>
                                                    </div>
                                                    <div
                                                        className="text-slate-700 dark:text-slate-300 overflow-x-auto leading-relaxed pl-5 border-l-2 border-[#3B6D85]/30 dark:border-brand-500/30 [&_img]:mx-auto [&_img]:block [&_img]:my-4"
                                                        dangerouslySetInnerHTML={{
                                                            __html: renderMathHtml(
                                                                q.explanation,
                                                            ),
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-gray-400 italic">
                            Không tìm thấy dữ liệu đề thi tương ứng.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const userSubmissions = React.useMemo(() => {
        return submissions
            .filter((sub) => sub.studentId === user.id)
            .sort(
                (a, b) =>
                    safeParseDate(b.submittedAt).getTime() -
                    safeParseDate(a.submittedAt).getTime(),
            );
    }, [submissions, user.id]);

    // Group submissions by quizId, sorted by latest submission time
    const groupedSubmissions = React.useMemo(() => {
        const groups: Record<string, typeof userSubmissions> = {};

        // Sort chronologically (oldest first) to assign attempt numbers (Lượt 1, Lượt 2, ...)
        const chronological = [...userSubmissions].sort((a, b) => {
            const timeA = safeParseDate(a.submittedAt).getTime();
            const timeB = safeParseDate(b.submittedAt).getTime();
            return timeA - timeB;
        });

        chronological.forEach((sub) => {
            if (!groups[sub.quizId]) {
                groups[sub.quizId] = [];
            }
            groups[sub.quizId].push(sub);
        });

        const groupedArray = Object.entries(groups).map(
            ([quizId, attempts]) => {
                const latestAttempt = attempts[attempts.length - 1];
                const maxScore = Math.max(...attempts.map((a) => a.score));
                return {
                    quizId,
                    quizTitle: latestAttempt.quizTitle,
                    latestTime: safeParseDate(
                        latestAttempt.submittedAt,
                    ).getTime(),
                    latestSubmittedAt: latestAttempt.submittedAt,
                    maxScore,
                    attempts, // chronological: [0] is Lượt 1, [1] is Lượt 2, etc.
                };
            },
        );

        return groupedArray.sort((a, b) => b.latestTime - a.latestTime);
    }, [userSubmissions]);

    const highCount = React.useMemo(
        () => groupedSubmissions.filter((g) => g.maxScore >= 8).length,
        [groupedSubmissions],
    );
    const mediumCount = React.useMemo(
        () =>
            groupedSubmissions.filter((g) => g.maxScore >= 5 && g.maxScore < 8)
                .length,
        [groupedSubmissions],
    );
    const lowCount = React.useMemo(
        () => groupedSubmissions.filter((g) => g.maxScore < 5).length,
        [groupedSubmissions],
    );

    const filteredGroups = React.useMemo(() => {
        return groupedSubmissions.filter((group) => {
            if (historyFilter === "high" && group.maxScore < 8) return false;
            if (
                historyFilter === "medium" &&
                (group.maxScore < 5 || group.maxScore >= 8)
            )
                return false;
            if (historyFilter === "low" && group.maxScore >= 5) return false;

            if (historySearch.trim()) {
                const q = historySearch.toLowerCase().trim();
                return group.quizTitle.toLowerCase().includes(q);
            }
            return true;
        });
    }, [groupedSubmissions, historyFilter, historySearch]);

    return (
        <div className="flex-1 bg-white dark:bg-bg-card text-slate-800 dark:text-slate-100 transition-colors duration-200 overflow-y-auto select-none">
            {/* Title Header with Tabs */}
            <div className="max-w-4xl mx-auto pt-8 pb-6 px-6   dark:border-slate-800/80">
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    {activeSettingsTab === "profile"
                        ? "Hồ sơ cá nhân"
                        : activeSettingsTab === "security"
                          ? "Bảo mật tài khoản"
                          : activeSettingsTab === "appearance"
                            ? "Tùy chỉnh giao diện"
                            : activeSettingsTab === "history"
                              ? "Lịch sử làm bài"
                              : "Thông báo"}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {activeSettingsTab === "profile"
                        ? "Cập nhật thông tin tài khoản và định danh cá nhân."
                        : activeSettingsTab === "security"
                          ? "Quản lý mật khẩu, xác thực hai bước và các thiết bị đăng nhập."
                          : activeSettingsTab === "appearance"
                            ? "Tùy chỉnh phông chữ, chủ đề màu sắc và phong cách hiển thị."
                            : activeSettingsTab === "history"
                              ? "Xem lại danh sách và chi tiết các đề thi bạn đã hoàn thành."
                              : "Xem lại toàn bộ thông báo và cập nhật mới dành cho bạn."}
                </p>

                {/* Tabs navigation */}
                <div className="flex gap-6 mt-6 border-b border-slate-100 dark:border-slate-800/50">
                    <button
                        onClick={() => handleTabClick("profile")}
                        className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
                            activeSettingsTab === "profile"
                                ? "text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white"
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        }`}
                    >
                        Hồ sơ cá nhân
                    </button>
                    <button
                        onClick={() => handleTabClick("security")}
                        className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer flex items-center gap-1.5 ${
                            activeSettingsTab === "security"
                                ? "text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white"
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        }`}
                    >
                        <span>Bảo mật</span>
                    </button>
                    <button
                        onClick={() => handleTabClick("appearance")}
                        className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer flex items-center gap-1.5 ${
                            activeSettingsTab === "appearance"
                                ? "text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white"
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        }`}
                    >
                        <span>Giao diện</span>
                    </button>
                    <button
                        onClick={() => handleTabClick("history")}
                        className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer flex items-center gap-1.5 ${
                            activeSettingsTab === "history"
                                ? "text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white"
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        }`}
                    >
                        <span>Lịch sử làm bài</span>
                    </button>
                    <button
                        onClick={() => handleTabClick("notifications")}
                        className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer flex items-center gap-1.5 ${
                            activeSettingsTab === "notifications"
                                ? "text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white"
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        }`}
                    >
                        <span>Thông báo</span>
                        {unreadNotifCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold leading-none animate-in zoom-in-50">
                                {unreadNotifCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {activeSettingsTab === "profile" ? (
                /* Profile Settings Grid */
                <div className="max-w-4xl mx-auto px-6 pb-20 divide-y divide-slate-100/70 dark:divide-slate-800/80">
                    {/* Profile Photo Row */}
                    <div className="grid grid-cols-12 gap-6 py-6 items-center">
                        <div className="col-span-12 md:col-span-4 space-y-1">
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                Ảnh đại diện
                            </h4>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                Ảnh đại diện hiển thị trên trang cá nhân và bảng
                                xếp hạng.
                            </p>
                        </div>
                        <div className="col-span-12 md:col-span-8 flex flex-col sm:flex-row sm:items-center gap-5">
                            <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                                {user.avatarUrl ? (
                                    <img
                                        src={user.avatarUrl}
                                        alt={user.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-2xl font-bold uppercase select-none text-slate-500 dark:text-slate-400">
                                        {(user.name || "U")[0]}
                                    </span>
                                )}
                                {(uploadingAvatar || selectingPredefined) && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsAvatarPickerOpen(true)
                                        }
                                        disabled={
                                            uploadingAvatar ||
                                            selectingPredefined
                                        }
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                                    >
                                        <span>Chọn ảnh có sẵn</span>
                                    </button>
                                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs">
                                        <span>Tải ảnh từ máy</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            disabled={
                                                uploadingAvatar ||
                                                selectingPredefined
                                            }
                                            onChange={handleAvatarChange}
                                        />
                                    </label>
                                </div>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                    Chọn ảnh có sẵn hoặc tải ảnh định dạng JPG,
                                    PNG, WebP (tối đa 2MB).
                                </p>
                                {avatarError && (
                                    <p className="text-xs text-rose-500 font-medium mt-1">
                                        {avatarError}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* First & Last Name Row */}
                    <div className="grid grid-cols-12 gap-6 py-6">
                        <div className="col-span-12 md:col-span-4 space-y-1">
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                Họ và Tên
                            </h4>
                            <p className="text-xs text-slate-400 dark:text-slate-550">
                                Họ tên hiển thị trên bảng xếp hạng.
                            </p>
                        </div>
                        <div className="col-span-12 md:col-span-8 space-y-3">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 max-w-xl">
                                <div className="space-y-1.5 flex-1 min-w-[140px]">
                                    <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                        Họ và tên lót
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Nguyễn Văn"
                                        value={firstName}
                                        onChange={(e) =>
                                            setFirstName(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleUpdateName();
                                            }
                                        }}
                                        className="w-full px-3.5 py-2 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-400 focus:bg-white dark:focus:bg-slate-800/80 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-550"
                                    />
                                </div>
                                <div className="space-y-1.5 w-full sm:w-28 shrink-0">
                                    <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                        Tên
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="A"
                                        value={lastName}
                                        onChange={(e) =>
                                            setLastName(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleUpdateName();
                                            }
                                        }}
                                        className="w-full px-3.5 py-2 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-400 focus:bg-white dark:focus:bg-slate-800/80 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-550"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleUpdateName}
                                    disabled={
                                        updatingName ||
                                        (firstName === initialName.firstName &&
                                            lastName === initialName.lastName)
                                    }
                                    className="py-2 px-4 bg-slate-950 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs shrink-0"
                                >
                                    {updatingName && (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    )}
                                    <span>Lưu họ tên</span>
                                </button>
                            </div>

                            {nameError && (
                                <div className="text-xs text-red-600 font-medium">
                                    {nameError}
                                </div>
                            )}
                            {nameSuccess && (
                                <div className="text-xs text-emerald-600 font-medium">
                                    {nameSuccess}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Linked Google Account Row */}
                    {isGoogleUser && (
                        <div className="grid grid-cols-12 gap-6 py-6 items-center">
                            <div className="col-span-12 md:col-span-4 space-y-1">
                                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <GoogleIcon className="w-4 h-4 shrink-0" />
                                    <span>Tài khoản Google</span>
                                </h4>
                                <p className="text-xs text-slate-400 dark:text-slate-550">
                                    Phương thức đăng nhập chính của bạn.
                                </p>
                            </div>
                            <div className="col-span-12 md:col-span-8">
                                <div className="p-3.5 dark:bg-slate-800/40 dark:border-slate-700/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="min-w-0">
                                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                                {user.email ||
                                                    "Tài khoản Google"}
                                            </div>
                                            <div className="text-[11px] text-slate-400 dark:text-slate-550">
                                                Đã xác thực & bảo mật qua Google
                                                OAuth
                                            </div>
                                        </div>
                                    </div>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50 shrink-0 self-start sm:self-center">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Đang kết nối
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Username Row */}
                    <div className="grid grid-cols-12 gap-6 py-6">
                        <div className="col-span-12 md:col-span-4 space-y-1">
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    {isGoogleUser
                                        ? "Tên định danh (Username)"
                                        : "Tên đăng nhập (Username)"}
                                </h4>
                                {isGoogleUser && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/50">
                                        Mã định danh
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-550">
                                {isGoogleUser
                                    ? "Tên tag (@tag) hiển thị trên hệ thống và bảng xếp hạng."
                                    : "Dùng để đăng nhập vào tài khoản của bạn."}
                            </p>
                        </div>
                        <div className="col-span-12 md:col-span-8 space-y-3">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 max-w-lg">
                                <input
                                    type="text"
                                    placeholder={
                                        isGoogleUser
                                            ? "Nhập tên định danh mới"
                                            : "Nhập tên đăng nhập mới"
                                    }
                                    value={usernameInput}
                                    onChange={(e) =>
                                        setUsernameInput(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleInitiateUpdateUsername();
                                        }
                                    }}
                                    className="w-full sm:max-w-xs px-3.5 py-2 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-400 focus:bg-white dark:focus:bg-slate-800/80 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-550"
                                />
                                <button
                                    type="button"
                                    onClick={handleInitiateUpdateUsername}
                                    disabled={
                                        updatingUsername ||
                                        usernameInput.trim().toLowerCase() ===
                                            (user.username || "").toLowerCase()
                                    }
                                    className="py-2 px-4 bg-slate-950 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                >
                                    {updatingUsername && (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    )}
                                    <span>
                                        {isGoogleUser
                                            ? "Lưu tên định danh"
                                            : "Lưu tên đăng nhập"}
                                    </span>
                                </button>
                            </div>

                            <p className="text-[10px] text-slate-400 dark:text-slate-550 font-medium">
                                Quy tắc: 4-30 ký tự (a-z, 0-9, dấu _ hoặc .).
                                Không dấu, không khoảng trắng, không kí tự đặc
                                biệt.
                            </p>

                            {/* Warning Note */}
                            <div className="flex items-start gap-2.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-300 max-w-lg">
                                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div className="text-[11px] leading-relaxed">
                                    <span className="font-bold">Lưu ý:</span>{" "}
                                    {isGoogleUser ? (
                                        <>
                                            Bạn đang đăng nhập bằng Google. Đổi
                                            tên định danh sẽ làm mới phiên đăng
                                            nhập và bạn có thể tiếp tục đăng
                                            nhập lại bình thường bằng tài khoản
                                            Google.
                                        </>
                                    ) : (
                                        <>
                                            Đổi tên đăng nhập sẽ{" "}
                                            <span className="font-semibold text-amber-900 dark:text-amber-200">
                                                kết thúc phiên làm việc
                                            </span>{" "}
                                            hiện tại. Bạn sẽ cần đăng nhập lại
                                            với tên đăng nhập mới.
                                        </>
                                    )}
                                </div>
                            </div>

                            {usernameError && (
                                <div className="text-xs text-red-600 font-medium">
                                    {usernameError}
                                </div>
                            )}
                            {usernameSuccess && (
                                <div className="text-xs text-emerald-600 font-medium">
                                    {usernameSuccess}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Timezone Row */}
                    <div className="grid grid-cols-12 gap-6 py-6">
                        <div className="col-span-12 md:col-span-4 space-y-1">
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                Timezone
                            </h4>
                            <p className="text-xs text-slate-400 dark:text-slate-550">
                                Used for time-based alerts and reports.
                            </p>
                        </div>
                        <div className="col-span-12 md:col-span-8">
                            <input
                                type="text"
                                readOnly
                                value="GMT+7 — Indochina Time"
                                className="w-full max-w-xs px-3.5 py-2 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-450 dark:text-slate-550 select-none outline-none"
                            />
                        </div>
                    </div>
                </div>
            ) : activeSettingsTab === "security" ? (
                /* Security Settings Grid */
                <div className="max-w-4xl mx-auto px-6 pb-20 divide-y divide-slate-100 dark:divide-slate-800/80">
                    {/* Password Row */}
                    <div className="grid grid-cols-12 gap-6 py-6">
                        <div className="col-span-12 md:col-span-4 space-y-1">
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                Mật khẩu (Password)
                            </h4>
                            <p className="text-xs text-slate-400 dark:text-slate-550">
                                {isGoogleUser
                                    ? "Tài khoản bảo mật qua Google."
                                    : formatPasswordAge(
                                          user.passwordUpdatedAt ||
                                              user.createdAt,
                                      )}
                            </p>
                        </div>
                        <div className="col-span-12 md:col-span-8 space-y-2">
                            <div className="flex items-center gap-3">
                                <input
                                    type="password"
                                    readOnly
                                    value="•••••••••••••"
                                    className="w-full max-w-xs px-3.5 py-2 bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-400 dark:text-slate-550 select-none outline-none tracking-widest cursor-default"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCurrentPassword("");
                                        setPassword("");
                                        setConfirmPassword("");
                                        setPwdError("");
                                        setPwdSuccess("");
                                        setIsChangePasswordModalOpen(true);
                                    }}
                                    className="py-2 px-3.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer shrink-0 shadow-2xs"
                                >
                                    {isGoogleUser
                                        ? "Đặt / Đổi mật khẩu"
                                        : "Đổi mật khẩu"}
                                </button>
                            </div>
                            {isGoogleUser && (
                                <p className="text-[11px] text-slate-400 dark:text-slate-550 leading-relaxed">
                                    💡 Bạn đăng nhập trực tiếp qua Google OAuth
                                    nên không bắt buộc phải dùng mật khẩu riêng.
                                    Bạn có thể đặt mật khẩu nếu muốn đăng nhập
                                    bằng cả tên định danh.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Recovery Email Row */}
                    <div className="grid grid-cols-12 gap-6 py-6">
                        <div className="col-span-12 md:col-span-4 space-y-1">
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <span>Email khôi phục</span>
                            </h4>
                            <p className="text-xs text-slate-400 dark:text-slate-550 leading-relaxed">
                                Dùng để nhận mã OTP lấy lại mật khẩu khi quên.
                            </p>
                        </div>
                        <div className="col-span-12 md:col-span-8">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-1">
                                <div className="flex items-center gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                {user.email ||
                                                    "Chưa liên kết email khôi phục"}
                                            </span>
                                            {user.email && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                                    {isGoogleUser
                                                        ? "Google OAuth"
                                                        : "Đã xác thực"}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                            {user.email
                                                ? "Mã OTP 6 số sẽ được gửi về hộp thư này khi bạn yêu cầu quên mật khẩu."
                                                : "Liên kết email để dễ dàng nhận mã OTP đặt lại mật khẩu khi cần."}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                                    {isGoogleUser ? (
                                        <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                                            Tự động qua Google
                                        </span>
                                    ) : user.email ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={
                                                    handleOpenLinkEmailModal
                                                }
                                                className="py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                                            >
                                                Đổi email
                                            </button>
                                            <button
                                                type="button"
                                                disabled={unlinkingEmailState}
                                                onClick={
                                                    handleUnlinkEmailAction
                                                }
                                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                                                title="Gỡ liên kết email"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleOpenLinkEmailModal}
                                            className="py-1.5 px-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs"
                                        >
                                            <Mail className="w-3.5 h-3.5" />
                                            <span>Liên kết Email</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Google Authenticator & 2-Step Row */}
                    <div className="grid grid-cols-12 gap-6 py-6">
                        <div className="col-span-12 md:col-span-4 space-y-1">
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <span>Two-factor Authenticator</span>
                            </h4>
                            <p className="text-xs text-slate-400 dark:text-slate-550 leading-relaxed">
                                Dùng ứng dụng Google Authenticator để tự khôi
                                phục mật khẩu khi quên hoặc bảo vệ 2 bước khi
                                đăng nhập.
                            </p>
                        </div>
                        <div className="col-span-12 md:col-span-8 space-y-4">
                            {/* Main 2FA Status Row */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-1">
                                <div className="flex items-center gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                {user.totpEnabled
                                                    ? "Google Authenticator"
                                                    : "Chưa liên kết"}
                                            </span>
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                                    user.totpEnabled
                                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                                }`}
                                            >
                                                {user.totpEnabled
                                                    ? "Đã liên kết"
                                                    : "Chưa liên kết"}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                            {user.totpEnabled
                                                ? "Bạn có thể dùng mã 6 số từ ứng dụng để đổi mật khẩu và bảo mật đăng nhập."
                                                : "Khuyên dùng để có thể tự khôi phục mật khẩu khi quên."}
                                        </p>
                                    </div>
                                </div>

                                {user.totpEnabled ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDisable2FAError("");
                                            setDisable2FACodeOrPassword("");
                                            setIsDisable2FAModalOpen(true);
                                        }}
                                        className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 dark:text-rose-400 rounded-lg text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer shrink-0"
                                    >
                                        Hủy liên kết
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={loading2FASetup}
                                        onClick={handleStartSetup2FA}
                                        className="py-1.5 px-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                                    >
                                        {loading2FASetup ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <QrCode className="w-3.5 h-3.5" />
                                        )}
                                        Liên kết Authenticator
                                    </button>
                                )}
                            </div>

                            {/* Sub-toggle for 2-Step Login */}
                            {user.totpEnabled && (
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4">
                                    <div className="space-y-0.5">
                                        <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                            Bắt buộc xác thực 2 bước khi đăng
                                            nhập
                                        </h5>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-550">
                                            Yêu cầu mã 6 chữ số từ ứng dụng mỗi
                                            khi đăng nhập vào hệ thống.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={toggling2FALogin}
                                        onClick={() =>
                                            handleToggle2FALogin(
                                                !user.require2FALogin,
                                            )
                                        }
                                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            user.require2FALogin
                                                ? "bg-brand-600"
                                                : "bg-slate-200 dark:bg-slate-700"
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                                user.require2FALogin
                                                    ? "translate-x-5"
                                                    : "translate-x-0"
                                            }`}
                                        />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Active Sessions Section */}
                    <div className="py-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-0.5">
                                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    Phiên hoạt động (Active sessions)
                                </h4>
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                    Hiện có {sessions.length}{" "}
                                    {sessions.length === 1 ? "phiên" : "phiên"}{" "}
                                    đăng nhập tài khoản.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleLogOutAllOtherSessions}
                                disabled={
                                    loggingOutAllSessions ||
                                    sessions.filter((s) => !s.isCurrent)
                                        .length === 0
                                }
                                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-2xs shrink-0 self-start sm:self-auto"
                            >
                                {loggingOutAllSessions && (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                                )}
                                <span>Đăng xuất tất cả phiên khác</span>
                            </button>
                        </div>

                        {/* Active Sessions List (Borderless with horizontal dividers) */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border-t border-b border-slate-100 dark:border-slate-800/80">
                            {loadingSessions && sessions.length === 0 ? (
                                <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                                    <span>Đang tải danh sách thiết bị...</span>
                                </div>
                            ) : sessions.length === 0 ? (
                                <div className="py-6 text-center text-xs text-slate-400 italic">
                                    Không có phiên đăng nhập nào.
                                </div>
                            ) : (
                                sessions.map((sess) => {
                                    const isRevoking =
                                        revokingSessionId === sess.id;
                                    return (
                                        <div
                                            key={sess.id}
                                            className="py-4 flex items-start justify-between gap-4 transition-colors"
                                        >
                                            <div className="flex items-start gap-3.5 min-w-0">
                                                {/* Device icon box */}
                                                <div className="w-9 h-9 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300">
                                                    {sess.device ===
                                                    "Mobile" ? (
                                                        <Smartphone className="w-4 h-4 stroke-[1.5]" />
                                                    ) : sess.device ===
                                                      "Tablet" ? (
                                                        <Tablet className="w-4 h-4 stroke-[1.5]" />
                                                    ) : (
                                                        <Laptop className="w-4 h-4 stroke-[1.5]" />
                                                    )}
                                                </div>

                                                {/* Device details */}
                                                <div className="space-y-0.5 min-w-0">
                                                    <div className="flex items-center flex-wrap gap-2">
                                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                            {sess.browser ||
                                                                "Trình duyệt"}
                                                        </span>
                                                        {sess.isCurrent && (
                                                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold text-[9px] tracking-wider uppercase">
                                                                THIẾT BỊ NÀY
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                                                        {sess.os ||
                                                            "Hệ điều hành"}{" "}
                                                        ·{" "}
                                                        {sess.device ||
                                                            "Máy tính"}
                                                    </p>

                                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                                                        {sess.location
                                                            ? `${sess.location} · `
                                                            : ""}
                                                        {sess.ipAddress ||
                                                            "127.0.0.1"}{" "}
                                                        · Lần cuối{" "}
                                                        {formatLastSeen(
                                                            sess.lastSeen,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Right side: Expires & Log out button */}
                                            {sess.isCurrent ? (
                                                <div className="text-right shrink-0 pt-0.5">
                                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                                                        {formatExpires(
                                                            sess.expiresAt,
                                                        )}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
                                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                                                        {formatExpires(
                                                            sess.expiresAt,
                                                        )}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleRevokeSession(
                                                                sess.id,
                                                            )
                                                        }
                                                        disabled={isRevoking}
                                                        className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:underline dark:hover:bg-rose-950/30 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                                    >
                                                        {isRevoking && (
                                                            <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                                                        )}
                                                        <span>Đăng xuất</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* DANGER ZONE SECTION */}
                    <div className="pt-8 pb-2">
                        <h3 className="text-[10px] font-bold tracking-widest text-rose-500/80 uppercase select-none">
                            DANGER ZONE
                        </h3>
                    </div>

                    {/* Delete account Row */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-5">
                        <div className="space-y-0.5">
                            <h4 className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                                Xóa tài khoản
                            </h4>
                            <p className="text-xs text-slate-400 dark:text-slate-550">
                                Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu lịch
                                sử liên quan.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setDeleteAccountError("");
                                setDeleteAccountPassword("");
                                setIsDeleteAccountModalOpen(true);
                            }}
                            className="px-3.5 py-1.5 border border-rose-200 dark:border-rose-900/60 hover:border-rose-300 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer shadow-2xs"
                        >
                            Xóa tài khoản
                        </button>
                    </div>
                </div>
            ) : activeSettingsTab === "appearance" ? (
                /* Appearance Settings Grid */
                <div className="max-w-4xl mx-auto px-6 pb-20 divide-y divide-slate-100/70 dark:divide-slate-800/80">
                    {/* Font Family Selection Row */}
                    <div className="grid grid-cols-12 gap-6 py-6">
                        <div className="col-span-12 md:col-span-4 space-y-1">
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <Type className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                Phông chữ giao diện
                            </h4>
                            <p className="text-xs text-slate-400 dark:text-slate-550 leading-relaxed">
                                Chọn kiểu phông chữ hiển thị phù hợp nhất với
                                mắt bạn trên toàn hệ thống.
                            </p>
                        </div>
                        <div className="col-span-12 md:col-span-8 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {fontOptions.map((f) => {
                                    const isSelected = selectedFont === f.id;
                                    return (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() =>
                                                handleSelectFont(f.id)
                                            }
                                            style={{ fontFamily: f.cssVal }}
                                            className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                                                isSelected
                                                    ? "border-brand-600 bg-brand-50/30 dark:bg-brand-950/20 shadow-xs ring-1 ring-brand-600"
                                                    : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                    {f.name}
                                                </span>
                                                {isSelected && (
                                                    <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs">
                                                        <Check className="w-3 h-3 stroke-[2.5]" />
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-normal">
                                                {f.desc}
                                            </p>
                                            {/*<div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium">
                                                Học Toán cùng cô Huyền Trang 123
                                            </div>*/}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Dark Mode / Theme Row */}
                    <div className="grid grid-cols-12 gap-6 py-6">
                        <div className="col-span-12 md:col-span-4 space-y-1">
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    <Sun className="w-4 h-4 text-amber-500" />
                                    Theme - Đang phát triển
                                </h4>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-550 leading-relaxed">
                                Tùy chọn giao diện Sáng (Flat Sage-White), Tối
                                (Midnight Steel Navy) hoặc tự động.
                            </p>
                        </div>
                        <div className="col-span-12 md:col-span-8">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* Light Mode card */}
                                <button
                                    type="button"
                                    onClick={() => handleSelectTheme("light")}
                                    className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[120px] cursor-pointer ${
                                        theme === "light"
                                            ? "border-amber-500/80 bg-white dark:bg-slate-800 shadow-xs ring-2 ring-amber-500/20"
                                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Sun className="w-4 h-4 text-amber-500" />
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                Giao diện Sáng
                                            </span>
                                        </div>
                                        {theme === "light" && (
                                            <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs shadow-xs">
                                                <Check className="w-3 h-3 stroke-[2.5]" />
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-normal">
                                        Flat Sage-White thanh lịch, sáng sủa và
                                        tập trung.
                                    </p>
                                    <div className="mt-3 flex items-center justify-between">
                                        <span
                                            className={`text-[10px] font-bold ${
                                                theme === "light"
                                                    ? "text-amber-600 dark:text-amber-400"
                                                    : "text-slate-400"
                                            }`}
                                        >
                                            {theme === "light"
                                                ? "Đang sử dụng"
                                                : "Nhấn để bật"}
                                        </span>
                                    </div>
                                </button>

                                {/* Dark Mode card */}
                                <button
                                    type="button"
                                    onClick={() => handleSelectTheme("dark")}
                                    className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[120px] cursor-pointer ${
                                        theme === "dark"
                                            ? "border-indigo-400 bg-[#233448] shadow-xs ring-2 ring-indigo-500/30 text-white"
                                            : "border-slate-700/80 bg-[#233448]/90 text-white hover:border-indigo-400"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Moon className="w-4 h-4 text-indigo-300" />
                                            <span className="text-xs font-bold text-white">
                                                Giao diện Tối
                                            </span>
                                        </div>
                                        {theme === "dark" && (
                                            <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs shadow-xs">
                                                <Check className="w-3 h-3 stroke-[2.5]" />
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-300 mt-2 font-normal">
                                        Midnight Steel Navy dịu mắt ban đêm
                                        (Đang phát triển).
                                    </p>
                                    <div className="mt-3 flex items-center justify-between">
                                        <span
                                            className={`text-[10px] font-bold ${
                                                theme === "dark"
                                                    ? "text-indigo-300"
                                                    : "text-slate-400"
                                            }`}
                                        >
                                            {theme === "dark"
                                                ? "Đang sử dụng"
                                                : "Nhấn để bật"}
                                        </span>
                                    </div>
                                </button>

                                {/* Auto System card */}
                                <button
                                    type="button"
                                    onClick={() => handleSelectTheme("system")}
                                    className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[120px] cursor-pointer ${
                                        theme === "system"
                                            ? "border-brand-500 bg-brand-50/40 dark:bg-brand-950/30 shadow-xs ring-2 ring-brand-500/20"
                                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Monitor className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                Theo thiết bị
                                            </span>
                                        </div>
                                        {theme === "system" && (
                                            <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs shadow-xs">
                                                <Check className="w-3 h-3 stroke-[2.5]" />
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-normal">
                                        Tự động đồng bộ theo hệ điều hành.
                                    </p>
                                    <div className="mt-3 flex items-center justify-between">
                                        <span
                                            className={`text-[10px] font-bold ${
                                                theme === "system"
                                                    ? "text-brand-600 dark:text-brand-400"
                                                    : "text-slate-400"
                                            }`}
                                        >
                                            {theme === "system"
                                                ? "Đang sử dụng"
                                                : "Nhấn để bật"}
                                        </span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : activeSettingsTab === "history" ? (
                /* History tab content */
                <div className="max-w-4xl mx-auto px-6 pb-20 space-y-4">
                    {/* Action & Filter Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-slate-100 dark:border-slate-800/60">
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 select-none">
                            <button
                                type="button"
                                onClick={() => setHistoryFilter("all")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                                    historyFilter === "all"
                                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                }`}
                            >
                                Tất cả ({userSubmissions.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setHistoryFilter("high")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                    historyFilter === "high"
                                        ? "bg-emerald-600 text-white shadow-xs"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                }`}
                            >
                                <span>Điểm ≥ 8.0</span>
                                {highCount > 0 && (
                                    <span
                                        className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                            historyFilter === "high"
                                                ? "bg-white/25 text-white"
                                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                        }`}
                                    >
                                        {highCount}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setHistoryFilter("medium")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                    historyFilter === "medium"
                                        ? "bg-amber-600 text-white shadow-xs"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                }`}
                            >
                                <span>Điểm 5.0 - 7.9</span>
                                {mediumCount > 0 && (
                                    <span
                                        className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                            historyFilter === "medium"
                                                ? "bg-white/25 text-white"
                                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                        }`}
                                    >
                                        {mediumCount}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setHistoryFilter("low")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                    historyFilter === "low"
                                        ? "bg-rose-600 text-white shadow-xs"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                }`}
                            >
                                <span>Điểm &lt; 5.0</span>
                                {lowCount > 0 && (
                                    <span
                                        className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                            historyFilter === "low"
                                                ? "bg-white/25 text-white"
                                                : "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                                        }`}
                                    >
                                        {lowCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        {userSubmissions.length > 3 && (
                            <div className="relative w-full sm:w-56">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                                <input
                                    type="text"
                                    value={historySearch}
                                    onChange={(e) =>
                                        setHistorySearch(e.target.value)
                                    }
                                    placeholder="Tìm bài thi đã làm..."
                                    className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                            </div>
                        )}
                    </div>

                    {/* Grouped Quiz List */}
                    {groupedSubmissions.length === 0 ? (
                        <div className="text-center py-16 space-y-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                            <BookOpenCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                                Bạn chưa thực hiện bài thi nào.
                            </p>
                            <button
                                type="button"
                                onClick={() => onNavigate && onNavigate("/")}
                                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                            >
                                <span>Làm bài thi ngay</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : filteredGroups.length === 0 ? (
                        <div className="text-center py-16 space-y-3">
                            <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                                Không tìm thấy bài làm phù hợp với điều kiện
                                lọc.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                            {filteredGroups.map((group) => {
                                const isExpanded =
                                    expandedQuizzes[group.quizId] !== false;
                                const maxScoreColor = getScoreTextColor(
                                    group.maxScore,
                                );

                                return (
                                    <div
                                        key={group.quizId}
                                        className="py-4 space-y-2.5 transition-colors"
                                    >
                                        {/* Quiz Group Header */}
                                        <div
                                            onClick={() =>
                                                toggleQuizExpand(group.quizId)
                                            }
                                            className="flex items-start justify-between gap-4 cursor-pointer group select-none -mx-2 px-2 py-1.5 rounded-xl hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                                        >
                                            <div className="space-y-1 min-w-0 flex-1">
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors line-clamp-1">
                                                    {group.quizTitle}
                                                </h4>
                                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400 dark:text-slate-500 font-medium">
                                                    <span className="font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                                                        {group.attempts.length}{" "}
                                                        lượt làm
                                                    </span>
                                                    <span className="opacity-40">
                                                        •
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                        Mới nhất:{" "}
                                                        {
                                                            group.latestSubmittedAt
                                                        }
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 sm:gap-4 shrink-0 pt-0.5">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                                        Điểm cao nhất
                                                    </span>
                                                    <div
                                                        className={`text-xs sm:text-sm font-black ${maxScoreColor}`}
                                                    >
                                                        <span>
                                                            {group.maxScore}
                                                        </span>
                                                        <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                                                            /10
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="p-1 rounded-lg text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                                                    <ChevronDown
                                                        className={`w-4 h-4 transition-transform duration-200 ${
                                                            isExpanded
                                                                ? "rotate-180"
                                                                : ""
                                                        }`}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Attempts Sub-list */}
                                        {isExpanded && (
                                            <div className="space-y-1 pl-2 sm:pl-4 border-l-2 border-slate-100 dark:border-slate-800/80 ml-2">
                                                {group.attempts.map(
                                                    (attempt, index) => {
                                                        const attemptScoreColor =
                                                            getScoreTextColor(
                                                                attempt.score,
                                                            );

                                                        return (
                                                            <div
                                                                key={attempt.id}
                                                                onClick={() =>
                                                                    onNavigate &&
                                                                    onNavigate(
                                                                        "/result/" +
                                                                            attempt.id,
                                                                    )
                                                                }
                                                                className="py-2.5 px-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 rounded-xl transition-colors cursor-pointer group/attempt"
                                                            >
                                                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 min-w-0 flex-1">
                                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0">
                                                                        Lượt #
                                                                        {index +
                                                                            1}
                                                                    </span>
                                                                    <span className="opacity-30">
                                                                        •
                                                                    </span>
                                                                    <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 font-medium">
                                                                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                                                        {
                                                                            attempt.submittedAt
                                                                        }
                                                                    </span>
                                                                    {attempt.timeSpent !==
                                                                        undefined &&
                                                                        attempt.timeSpent >
                                                                            0 && (
                                                                            <>
                                                                                <span className="opacity-30 hidden sm:inline">
                                                                                    •
                                                                                </span>
                                                                                <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
                                                                                    Thời
                                                                                    gian:{" "}
                                                                                    {formatTime(
                                                                                        attempt.timeSpent,
                                                                                    )}
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                </div>

                                                                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                                                                    {/* Score without border or bg */}
                                                                    <div
                                                                        className={`text-xs sm:text-sm font-black ${attemptScoreColor}`}
                                                                    >
                                                                        <span>
                                                                            {
                                                                                attempt.score
                                                                            }
                                                                        </span>
                                                                        <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                                                                            /10
                                                                        </span>
                                                                    </div>

                                                                    <span className="text-xs font-bold text-brand-600 dark:text-brand-300 group-hover/attempt:underline flex items-center gap-0.5 whitespace-nowrap">
                                                                        <span>
                                                                            Xem
                                                                            lại
                                                                        </span>
                                                                        <ChevronRight className="w-3.5 h-3.5 group-hover/attempt:translate-x-0.5 transition-transform" />
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                /* Notifications tab content */
                <div className="max-w-4xl mx-auto px-6 pb-20 space-y-4">
                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-slate-100 dark:border-slate-800/60">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setNotifFilter("all")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                                    notifFilter === "all"
                                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                }`}
                            >
                                Tất cả ({notifications.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setNotifFilter("unread")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                                    notifFilter === "unread"
                                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                }`}
                            >
                                <span>Chưa đọc</span>
                                {unreadNotifCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                                        {unreadNotifCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleMarkAllNotifs}
                            disabled={
                                unreadNotifCount === 0 || markingAllNotifs
                            }
                            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed transition-colors select-none"
                        >
                            {markingAllNotifs ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <CheckCheck className="w-4 h-4" />
                            )}
                            <span>Đã đọc tất cả</span>
                        </button>
                    </div>

                    {/* Notifications List */}
                    {loadingNotifs && notifications.length === 0 ? (
                        <div className="text-center py-16 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                            <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                            <span>Đang tải thông báo...</span>
                        </div>
                    ) : (
                        (() => {
                            const list =
                                notifFilter === "unread"
                                    ? notifications.filter((n) => !n.isRead)
                                    : notifications;

                            if (list.length === 0) {
                                return (
                                    <div className="text-center py-16 space-y-3">
                                        <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                                            {notifFilter === "unread"
                                                ? "Bạn đã đọc hết tất cả thông báo!"
                                                : "Chưa có thông báo nào."}
                                        </p>
                                    </div>
                                );
                            }

                            return (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                    {list.map((notif) => (
                                        <div
                                            key={notif.id}
                                            onClick={() =>
                                                handleReadNotification(notif)
                                            }
                                            className={`py-4 px-2 sm:px-3 -mx-2 sm:-mx-3 flex items-start justify-between gap-4 transition-colors cursor-pointer group ${
                                                !notif.isRead
                                                    ? "bg-brand-50/40 dark:bg-brand-950/20 hover:bg-brand-50/70 dark:hover:bg-brand-950/40"
                                                    : "hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
                                            }`}
                                        >
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div
                                                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                                        !notif.isRead
                                                            ? "bg-brand-500 animate-pulse"
                                                            : "bg-slate-300 dark:bg-slate-700"
                                                    }`}
                                                />
                                                <div className="space-y-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4
                                                            className={`text-sm ${
                                                                !notif.isRead
                                                                    ? "font-bold text-slate-900 dark:text-slate-100"
                                                                    : "font-medium text-slate-700 dark:text-slate-300"
                                                            }`}
                                                        >
                                                            {notif.title}
                                                        </h4>
                                                        {notif.targetGrade && (
                                                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                                                Lớp{" "}
                                                                {
                                                                    notif.targetGrade
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                        {notif.message}
                                                    </p>
                                                    {notif.quizId && (
                                                        <div className="pt-1 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 group-hover:underline">
                                                            <span>
                                                                Vào làm bài ngay
                                                            </span>
                                                            <ExternalLink className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0 pt-0.5">
                                                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                                    {formatNotifTimeAgo(
                                                        notif.createdAt,
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()
                    )}
                </div>
            )}

            {/* 2FA SETUP MODAL */}
            {is2FAModalOpen && setup2FAData && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-bg-card rounded-xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                        Cài Đặt Google Authenticator
                                    </h3>
                                    <p className="text-[10px] text-slate-400">
                                        Xác thực 2 bước an toàn (TOTP)
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIs2FAModalOpen(false)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Instructions */}
                        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                                1. Mở ứng dụng <b>Google Authenticator</b> trên
                                điện thoại.
                            </p>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                                2. Quét mã QR bên dưới hoặc nhập Khóa bí mật:
                            </p>
                        </div>

                        {/* QR Code display */}
                        <div className="p-4 bg-white dark:bg-slate-800   border border-slate-200/80 dark:border-slate-700 flex flex-col items-center justify-center">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setup2FAData.otpauthUri)}`}
                                alt="QR Code Google Authenticator"
                                className="w-40 h-40 object-contain   bg-white p-2"
                            />
                        </div>

                        {/* Secret Key with Copy */}
                        <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-slate-500">
                                Khóa bí mật (Secret Key - nếu không quét được
                                QR):
                            </label>
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="text"
                                    readOnly
                                    value={setup2FAData.secret}
                                    className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold tracking-wider text-brand-700 dark:text-brand-300 select-all text-center"
                                />
                                <button
                                    type="button"
                                    onClick={handleCopy2FASecret}
                                    className={`px-3 py-2 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                        copied2FASecret
                                            ? "bg-green-300 text-white"
                                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
                                    }`}
                                >
                                    {copied2FASecret ? (
                                        <Check className="w-3.5 h-3.5" />
                                    ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                    )}
                                    <span>
                                        {copied2FASecret
                                            ? "Đã chép"
                                            : "Sao chép"}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Step 3: Enter 6 digit code */}
                        <form
                            onSubmit={handleConfirmEnable2FA}
                            className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800"
                        >
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                    3. Nhập mã 6 chữ số từ app Google
                                    Authenticator để xác nhận:
                                </label>
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="000000"
                                    value={verify2FACode}
                                    onChange={(e) =>
                                        setVerify2FACode(
                                            e.target.value.replace(/\D/g, ""),
                                        )
                                    }
                                    className="w-full py-2.5 px-4 text-center font-mono text-xl tracking-[0.3em] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand-400 text-slate-800 dark:text-slate-100"
                                />
                            </div>

                            {enable2FAError && (
                                <div className="p-2.5 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 rounded-xl font-medium">
                                    {enable2FAError}
                                </div>
                            )}

                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setIs2FAModalOpen(false)}
                                    className="flex-1 py-2 px-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        enabling2FA ||
                                        verify2FACode.trim().length !== 6
                                    }
                                    className="flex-1 py-2 px-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    <span>Xác nhận & Bật 2FA</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 2FA DISABLE CONFIRMATION MODAL */}
            {isDisable2FAModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-bg-card rounded-xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    Tắt Xác Thực 2 Bước
                                </h3>
                                <p className="text-[11px] text-slate-400">
                                    Bạn có chắc chắn muốn tắt 2FA?
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed">
                            Khi tắt 2FA, bạn sẽ không thể tự khôi phục mật khẩu
                            bằng Google Authenticator khi quên.
                        </p>

                        <form
                            onSubmit={handleConfirmDisable2FA}
                            className="space-y-3"
                        >
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Mật khẩu hoặc mã OTP 6 số:
                                </label>
                                <input
                                    type="password"
                                    placeholder="Nhập mật khẩu tài khoản"
                                    value={disable2FACodeOrPassword}
                                    onChange={(e) =>
                                        setDisable2FACodeOrPassword(
                                            e.target.value,
                                        )
                                    }
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-brand-400 text-slate-800 dark:text-slate-100"
                                />
                            </div>

                            {disable2FAError && (
                                <div className="p-2.5 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 rounded-xl font-medium">
                                    {disable2FAError}
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsDisable2FAModalOpen(false)
                                    }
                                    className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        disabling2FA ||
                                        !disable2FACodeOrPassword.trim()
                                    }
                                    className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    {disabling2FA && (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    )}
                                    <span>Tắt 2FA</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE ACCOUNT CONFIRMATION MODAL */}
            {isDeleteAccountModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-bg-card rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-rose-100 dark:border-rose-950 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    Xóa Vĩnh Viễn Tài Khoản
                                </h3>
                                <p className="text-[11px] text-rose-500 font-medium">
                                    Hành động này không thể hoàn tác
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Toàn bộ dữ liệu tài khoản <b>@{user.username}</b>,
                            kết quả thi, lịch sử bài làm và cài đặt liên quan sẽ
                            bị xóa vĩnh viễn khỏi hệ thống.
                        </p>

                        <form
                            onSubmit={handleDeleteAccount}
                            className="space-y-3 pt-1"
                        >
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Nhập mật khẩu để xác nhận xóa:
                                </label>
                                <input
                                    type="password"
                                    placeholder="Nhập mật khẩu của bạn"
                                    value={deleteAccountPassword}
                                    onChange={(e) =>
                                        setDeleteAccountPassword(e.target.value)
                                    }
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-rose-400 text-slate-800 dark:text-slate-100"
                                />
                            </div>

                            {deleteAccountError && (
                                <div className="p-2.5 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 rounded-xl font-medium">
                                    {deleteAccountError}
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsDeleteAccountModalOpen(false)
                                    }
                                    className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={deletingAccount}
                                    className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    {deletingAccount && (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    )}
                                    <span>Xóa vĩnh viễn</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CHANGE PASSWORD MODAL */}
            {isChangePasswordModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-bg-card rounded-xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                        Đổi Mật Khẩu
                                    </h3>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                        Cập nhật mật khẩu tài khoản của bạn
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    setIsChangePasswordModalOpen(false)
                                }
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form
                            onSubmit={handleUpdatePassword}
                            className="space-y-3 pt-1"
                        >
                            {/* Current Password */}
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Mật khẩu hiện tại:
                                </label>
                                <div className="relative">
                                    <input
                                        type={
                                            showCurrentPwd ? "text" : "password"
                                        }
                                        placeholder="Nhập mật khẩu hiện tại"
                                        value={currentPassword}
                                        onChange={(e) =>
                                            setCurrentPassword(e.target.value)
                                        }
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-brand-400 text-slate-800 dark:text-slate-100 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowCurrentPwd(!showCurrentPwd)
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showCurrentPwd ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Mật khẩu mới:
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNewPwd ? "text" : "password"}
                                        placeholder="Tối thiểu 6 ký tự"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-brand-400 text-slate-800 dark:text-slate-100 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowNewPwd(!showNewPwd)
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showNewPwd ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm New Password */}
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Xác nhận mật khẩu mới:
                                </label>
                                <div className="relative">
                                    <input
                                        type={
                                            showConfirmPwd ? "text" : "password"
                                        }
                                        placeholder="Nhập lại mật khẩu mới"
                                        value={confirmPassword}
                                        onChange={(e) =>
                                            setConfirmPassword(e.target.value)
                                        }
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-brand-400 text-slate-800 dark:text-slate-100 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowConfirmPwd(!showConfirmPwd)
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showConfirmPwd ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {pwdError && (
                                <div className="p-2.5 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 rounded-xl font-medium">
                                    {pwdError}
                                </div>
                            )}

                            {pwdSuccess && (
                                <div className="p-2.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 rounded-xl font-medium">
                                    {pwdSuccess}
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsChangePasswordModalOpen(false);
                                        setPwdError("");
                                        setPwdSuccess("");
                                    }}
                                    className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        updatingPassword || !password.trim()
                                    }
                                    className="flex-1 py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    {updatingPassword && (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    )}
                                    <span>Lưu mật khẩu</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PREDEFINED AVATAR SELECTION MODAL */}
            {isAvatarPickerOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-bg-card rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-200 font-sans">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                        Ảnh đại diện
                                    </h3>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                        Chọn linh vật yêu thích để làm ảnh đại
                                        diện của bạn
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsAvatarPickerOpen(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[60vh] overflow-y-auto p-1">
                            {PREDEFINED_AVATARS.map((item) => {
                                const isSelected = user.avatarUrl === item.url;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() =>
                                            handleSelectPredefinedAvatar(
                                                item.url,
                                            )
                                        }
                                        disabled={selectingPredefined}
                                        className={`group relative p-2.5  border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                                            isSelected
                                                ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 ring-2 ring-brand-500/20 shadow-xs"
                                                : "border-slate-200/80 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 bg-slate-50/40 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800/60"
                                        }`}
                                    >
                                        <div className="w-12 h-12 overflow-hidden dark:bg-slate-900 p-1 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <img
                                                src={item.url}
                                                alt={item.name}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <span
                                            className={`text-[11px] font-bold truncate max-w-full ${
                                                isSelected
                                                    ? "text-brand-600 dark:text-brand-300"
                                                    : "text-slate-700 dark:text-slate-300"
                                            }`}
                                        >
                                            {item.name}
                                        </span>
                                        {isSelected && (
                                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-brand-500 text-white flex items-center justify-center text-[9px] shadow-xs">
                                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsAvatarPickerOpen(false)}
                                className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Username Change Modal */}
            {isConfirmUsernameModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-bg-card rounded-2xl w-full max-w-md p-6 shadow-2xl border border-amber-200/80 dark:border-amber-900/50 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-3.5">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    {isGoogleUser
                                        ? "Xác nhận đổi tên định danh"
                                        : "Xác nhận đổi tên đăng nhập"}
                                </h3>
                                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                                    {isGoogleUser
                                        ? "Bạn có chắc chắn muốn đổi mã định danh (@username)?"
                                        : "Bạn có chắc chắn muốn đổi tên đăng nhập?"}
                                </p>
                            </div>
                            <button
                                onClick={() =>
                                    !updatingUsername &&
                                    setIsConfirmUsernameModalOpen(false)
                                }
                                disabled={updatingUsername}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3 pt-1">
                            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl space-y-2 text-xs">
                                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                                    <span>
                                        {isGoogleUser
                                            ? "Tên định danh hiện tại:"
                                            : "Tên đăng nhập hiện tại:"}
                                    </span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        @{user.username || "chưa có"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-brand-600 dark:text-brand-400 font-semibold border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                                    <span>
                                        {isGoogleUser
                                            ? "Tên định danh mới:"
                                            : "Tên đăng nhập mới:"}
                                    </span>
                                    <span className="font-bold text-sm">
                                        @{usernameInput.trim().toLowerCase()}
                                    </span>
                                </div>
                            </div>

                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5">
                                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                                    {isGoogleUser ? (
                                        <>
                                            <b>Làm mới phiên đăng nhập:</b> Sau
                                            khi xác nhận, hệ thống sẽ kết thúc
                                            phiên hiện tại để cập nhật tên định
                                            danh mới (
                                            <b>
                                                @
                                                {usernameInput
                                                    .trim()
                                                    .toLowerCase()}
                                            </b>
                                            ). Bạn có thể tiếp tục đăng nhập lại
                                            bình thường bằng{" "}
                                            <b>tài khoản Google</b>.
                                        </>
                                    ) : (
                                        <>
                                            <b>Thoát phiên đăng nhập:</b> Sau
                                            khi xác nhận, tài khoản sẽ tự động{" "}
                                            <b>đăng xuất</b>. Bạn cần đăng nhập
                                            lại bằng tên mới (
                                            <b>
                                                @
                                                {usernameInput
                                                    .trim()
                                                    .toLowerCase()}
                                            </b>
                                            ).
                                        </>
                                    )}
                                </div>
                            </div>

                            {usernameError && (
                                <div className="p-2.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200/50 rounded-xl font-medium">
                                    {usernameError}
                                </div>
                            )}

                            <div className="flex gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsConfirmUsernameModalOpen(false)
                                    }
                                    disabled={updatingUsername}
                                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmUpdateUsername}
                                    disabled={updatingUsername}
                                    className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm transition-all"
                                >
                                    {updatingUsername && (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    )}
                                    <span>Xác nhận & Đăng xuất</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LINK / VERIFY EMAIL MODAL */}
            {isEmailModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-bg-card rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200 font-sans">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                        {user.email
                                            ? "Thay đổi Email khôi phục"
                                            : "Liên kết Email khôi phục"}
                                    </h3>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                        {emailStep === "input"
                                            ? "Nhập email của bạn để nhận mã OTP xác thực"
                                            : `Nhập mã OTP 6 số đã gửi tới ${emailInput}`}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsEmailModalOpen(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {emailStep === "input" ? (
                            <form
                                onSubmit={handleSendEmailOTP}
                                className="space-y-4"
                            >
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Địa chỉ Email của bạn:
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="vidu@gmail.com"
                                        required
                                        value={emailInput}
                                        onChange={(e) =>
                                            setEmailInput(e.target.value)
                                        }
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-slate-400"
                                    />
                                    <p className="text-[10px] text-slate-400 dark:text-slate-550">
                                        Hệ thống sẽ gửi một mã OTP 6 số để xác
                                        minh bạn là chủ sở hữu email này.
                                    </p>
                                </div>

                                {emailModalError && (
                                    <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 rounded-xl font-medium">
                                        {emailModalError}
                                    </div>
                                )}

                                <div className="flex gap-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsEmailModalOpen(false)
                                        }
                                        className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={
                                            sendingEmailOTP ||
                                            !emailInput.trim()
                                        }
                                        className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm transition-all"
                                    >
                                        {sendingEmailOTP && (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        )}
                                        <span>Gửi mã xác thực</span>
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form
                                onSubmit={handleVerifyEmailOTP}
                                className="space-y-4"
                            >
                                {/*<div className="p-3 bg-brand-50/60 dark:bg-brand-950/30 border border-brand-200/60 dark:border-brand-800/50 rounded-xl space-y-1">
                                    <div className="text-[11px] text-brand-800 dark:text-brand-300 font-medium">
                                        Mã OTP 6 số đã được gửi đến:
                                    </div>
                                    <div className="text-xs font-bold font-mono text-brand-900 dark:text-brand-200">
                                        {emailInput}
                                    </div>
                                </div>*/}

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Nhập mã OTP 6 số:
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        placeholder="000000"
                                        value={emailOTP}
                                        onChange={(e) =>
                                            setEmailOTP(
                                                e.target.value.replace(
                                                    /\D/g,
                                                    "",
                                                ),
                                            )
                                        }
                                        className="w-full px-3.5 py-2 text-center text-xl tracking-[6px]  font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700  text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-slate-300"
                                    />
                                    <div className="flex items-center justify-between text-[11px] pt-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setEmailStep("input")
                                            }
                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline cursor-pointer"
                                        >
                                            Đổi email khác
                                        </button>
                                        <button
                                            type="button"
                                            disabled={
                                                emailCountdown > 0 ||
                                                sendingEmailOTP
                                            }
                                            onClick={() => handleSendEmailOTP()}
                                            className="text-brand-600 dark:text-brand-400 hover:underline font-medium cursor-pointer disabled:opacity-50 disabled:no-underline"
                                        >
                                            {emailCountdown > 0
                                                ? `Gửi lại sau (${emailCountdown}s)`
                                                : "Gửi lại mã"}
                                        </button>
                                    </div>
                                </div>

                                {emailModalError && (
                                    <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 rounded-xl font-medium">
                                        {emailModalError}
                                    </div>
                                )}

                                <div className="flex gap-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsEmailModalOpen(false)
                                        }
                                        className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={
                                            verifyingEmailOTP ||
                                            emailOTP.trim().length !== 6
                                        }
                                        className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm transition-all"
                                    >
                                        {verifyingEmailOTP && (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        )}
                                        <span>Xác nhận & Liên kết</span>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
