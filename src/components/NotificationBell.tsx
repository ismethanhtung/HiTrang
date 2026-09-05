import React, { useState, useEffect, useRef } from "react";
import {
    Bell,
    CheckCheck,
    BookOpen,
    Sparkles,
    Megaphone,
    X,
    ExternalLink,
    Loader2,
    Check,
    ChevronRight,
} from "lucide-react";
import { AppNotification } from "../types";
import {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} from "../lib/supabaseService";

interface NotificationBellProps {
    onNavigateQuiz?: (quizId: string) => void;
    onNavigate?: (path: string) => void;
}

export default function NotificationBell({
    onNavigateQuiz,
    onNavigate,
}: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // Format relative time in Vietnamese
    const formatTimeAgo = (dateStr: string) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "";
        const now = new Date();
        const diffMs = Math.max(0, now.getTime() - d.getTime());
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffMin < 2) return "Vừa xong";
        if (diffMin < 60) return `${diffMin} phút trước`;
        if (diffHour < 24) return `${diffHour} giờ trước`;
        if (diffDay === 1) return "Hôm qua";
        if (diffDay < 30) return `${diffDay} ngày trước`;
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    };

    const fetchNotifications = async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const data = await getNotifications();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (err) {
            console.warn("Không thể tải thông báo:", err);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    // Initial fetch & Periodic polling every 45 seconds when window is active
    useEffect(() => {
        fetchNotifications(false);

        const interval = setInterval(() => {
            if (!document.hidden) {
                fetchNotifications(false);
            }
        }, 45000);

        return () => clearInterval(interval);
    }, []);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const handleToggle = () => {
        const next = !isOpen;
        setIsOpen(next);
        if (next) {
            fetchNotifications(false);
        }
    };

    const handleMarkAsRead = async (notif: AppNotification) => {
        if (!notif.isRead) {
            try {
                await markNotificationAsRead(notif.id);
                setNotifications((prev) =>
                    prev.map((n) =>
                        n.id === notif.id ? { ...n, isRead: true } : n,
                    ),
                );
                setUnreadCount((c) => Math.max(0, c - 1));
            } catch (err) {
                console.warn("Lỗi đánh dấu đã đọc:", err);
            }
        }

        // Navigate to quiz if applicable
        if (notif.quizId) {
            setIsOpen(false);
            if (onNavigateQuiz) {
                onNavigateQuiz(notif.quizId);
            } else {
                window.history.pushState({}, "", `/quiz/${notif.quizId}`);
                window.dispatchEvent(new Event("popstate"));
            }
        } else if (notif.link) {
            setIsOpen(false);
            window.history.pushState({}, "", notif.link);
            window.dispatchEvent(new Event("popstate"));
        }
    };

    const handleMarkAllRead = async () => {
        if (unreadCount === 0 || markingAll) return;
        setMarkingAll(true);
        try {
            await markAllNotificationsAsRead();
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, isRead: true })),
            );
            setUnreadCount(0);
        } catch (err) {
            console.warn("Lỗi đánh dấu tất cả đã đọc:", err);
        } finally {
            setMarkingAll(false);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            {/* Bell Button - Exact height and border radius as the search box (h-[30px] rounded-md) */}
            <button
                type="button"
                onClick={handleToggle}
                aria-label="Thông báo"
                className={`relative h-[30px] w-[30px] rounded-md flex items-center justify-center transition-colors cursor-pointer select-none bg-white dark:bg-bg-card border ${
                    isOpen
                        ? "border-brand-500 text-brand-600 dark:text-brand-300"
                        : "border-slate-200 dark:border-slate-800 text-text-secondary hover:text-text-primary hover:border-brand-300 dark:hover:border-brand-700"
                }`}
            >
                <Bell className="w-3.5 h-3.5" />

                {/* Unread Badge & Pulse */}
                {unreadCount > 0 && (
                    <>
                        <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 px-1 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white shadow-xs animate-in zoom-in-50">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    </>
                )}
            </button>

            {/* Notification Popover Dropdown */}
            {isOpen && (
                <div className="fixed left-3 right-3 top-[58px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-86 max-w-[calc(100vw-24px)] sm:max-w-none bg-bg-card rounded-xl shadow-2xl border border-border-primary overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Header */}
                    <div className="p-3.5 border-b border-border-primary flex items-center justify-between bg-bg-surface/50">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                                Thông báo
                            </h3>
                            {unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-[10px] font-bold">
                                    {unreadCount} chưa đọc
                                </span>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleMarkAllRead}
                            disabled={unreadCount === 0 || markingAll}
                            className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 flex items-center gap-1 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:text-brand-600 dark:disabled:hover:text-brand-400 transition-colors select-none"
                            title={
                                unreadCount === 0
                                    ? "Đã đọc tất cả thông báo"
                                    : "Đánh dấu tất cả đã đọc"
                            }
                        >
                            {markingAll ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <CheckCheck className="w-3.5 h-3.5" />
                            )}
                            <span>Đã đọc tất cả</span>
                        </button>
                    </div>

                    {/* Notification List Container */}
                    <div className="max-h-[calc(100vh-140px)] sm:max-h-[380px] overflow-y-auto divide-y divide-border-primary/40">
                        {loading && notifications.length === 0 ? (
                            <div className="py-12 text-center text-xs text-text-tertiary flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                                <span>Đang tải thông báo...</span>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-12 text-center space-y-2">
                                <div className="w-10 h-10 rounded-2xl mx-auto flex items-center justify-center text-text-tertiary">
                                    <img
                                        src="/icons/ghost.png"
                                        alt=""
                                        className="w-6 h-6 object-contain opacity-50 dark:opacity-60 select-none"
                                    />
                                </div>
                                <p className="text-xs text-text-secondary font-medium">
                                    Chưa có thông báo nào.
                                </p>
                                <p className="text-[11px] text-text-tertiary">
                                    Khi có thông báo mới, bạn sẽ nhận được tại
                                    đây.
                                </p>
                            </div>
                        ) : (
                            notifications.map((notif) => {
                                const isNewQuiz = notif.type === "new_quiz";
                                return (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleMarkAsRead(notif)}
                                        className={`p-2.5 sm:p-2.5 flex items-start gap-3 transition-colors cursor-pointer group ${
                                            !notif.isRead
                                                ? "bg-brand-50/75 dark:bg-brand-950/50 hover:bg-brand-100/70 dark:hover:bg-brand-900/60 border-l-[3px] border-l-brand-500"
                                                : "bg-transparent hover:bg-slate-50/80 dark:hover:bg-slate-800/50 opacity-80 hover:opacity-100 border-l-[3px] border-l-transparent"
                                        }`}
                                    >
                                        {/* Content */}
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <h4
                                                        className={`text-xs truncate ${
                                                            !notif.isRead
                                                                ? "font-bold text-text-primary"
                                                                : "font-medium text-text-secondary"
                                                        }`}
                                                    >
                                                        {notif.title}
                                                    </h4>
                                                </div>
                                                <span className="text-[10px] text-text-tertiary shrink-0 whitespace-nowrap">
                                                    {formatTimeAgo(
                                                        notif.createdAt,
                                                    )}
                                                </span>
                                            </div>

                                            <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-2">
                                                {notif.message}
                                            </p>

                                            {/* Action hint if linked to quiz */}
                                            {/*{notif.quizId && (
                                                <div className="pt-1 flex items-center gap-1 text-[11px] font-bold text-brand-600 dark:text-brand-400 group-hover:underline">
                                                    <span>
                                                        Vào làm bài ngay
                                                    </span>
                                                    <ExternalLink className="w-3 h-3" />
                                                </div>
                                            )}*/}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Popover Footer - View All */}
                    <div className=" border-t border-border-primary bg-bg-surface/50">
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                if (onNavigate) {
                                    onNavigate("/notifications");
                                } else {
                                    window.history.pushState(
                                        {},
                                        "",
                                        "/notifications",
                                    );
                                    window.dispatchEvent(new Event("popstate"));
                                }
                            }}
                            className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 hover:bg-brand-50/60 dark:hover:bg-brand-950/30 transition-colors flex items-center justify-center gap-1 cursor-pointer select-none"
                        >
                            <span>Xem tất cả thông báo</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
