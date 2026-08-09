import React, { useState, useEffect } from "react";
import {
    Trophy,
    Search,
    ChevronUp,
    ChevronDown,
    Minus,
    Sparkles,
    RefreshCw,
    Award,
    Filter,
    Clock,
    BookOpen,
    ArrowRight,
    User as UserIcon,
} from "lucide-react";
import { User, Quiz, Submission, OverallLeaderboardEntry } from "../types";
import {
    getOverallLeaderboard,
    refreshOverallLeaderboard,
} from "../lib/supabaseService";
import { motion, AnimatePresence } from "motion/react";

interface LeaderboardViewProps {
    user: User;
    quizzes: Quiz[];
    submissions: Submission[];
    onNavigate: (path: string) => void;
    initialData?: OverallLeaderboardEntry[] | null;
}

export default function LeaderboardView({
    user,
    quizzes,
    submissions,
    onNavigate,
    initialData,
}: LeaderboardViewProps) {
    // Grade states: students are locked to their profile grade (fallback to "10"), teachers default to "10"
    const [activeGrade, setActiveGrade] = useState<string>(() => {
        if (user.role === "student") {
            return user.grade || "10";
        }
        return "10";
    });

    const [overallData, setOverallData] = useState<OverallLeaderboardEntry[]>(
        () => {
            return initialData || [];
        },
    );
    const [loading, setLoading] = useState<boolean>(() => {
        return !initialData;
    });
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [refreshing, setRefreshing] = useState<boolean>(false);

    const grades = [
        { id: "8", label: "Khối 8" },
        { id: "9", label: "Khối 9" },
        { id: "10", label: "Khối 10" },
        { id: "11", label: "Khối 11" },
        { id: "12", label: "Khối 12" },
    ];

    // Filter quizzes to only match the active grade tab
    const gradeQuizzes = quizzes.filter(
        (q) => q.grade === activeGrade || (!q.grade && activeGrade === "10"),
    );
    const totalQuizzesForGrade = gradeQuizzes.length || 1;

    // Quiz IDs that the student has completed
    const submittedQuizIds = new Set(submissions.map((sub) => sub.quizId));

    // Quizzes not taken yet
    const untakenQuizzes = gradeQuizzes.filter(
        (q) => !submittedQuizIds.has(q.id),
    );

    // Fetch Overall Leaderboard for the active grade
    const fetchOverallRankings = async (showSilence = false) => {
        const silent = showSilence || overallData.length > 0;
        if (!silent) setLoading(true);
        setError(null);
        try {
            const data = await getOverallLeaderboard(activeGrade);
            setOverallData(data);
        } catch (err: any) {
            console.error("Lỗi khi tải bảng xếp hạng chung:", err);
            setError(err.message || "Không thể tải dữ liệu bảng xếp hạng.");
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchOverallRankings();
    }, [activeGrade]);

    // Handle manual refresh for teacher
    const handleManualRefresh = async () => {
        if (user.role !== "admin") return;
        setRefreshing(true);
        try {
            await refreshOverallLeaderboard();
            await fetchOverallRankings(true);
        } catch (err: any) {
            alert("Không thể làm mới: " + err.message);
        } finally {
            setRefreshing(false);
        }
    };

    // Mix in mock data if database has <= 1 user, to let the user preview the design.
    let displayData = overallData;
    if (overallData.length <= 1) {
        const currentUserId = user.id;
        const currentUserEntry = overallData.find(
            (u) => u.studentId === currentUserId,
        ) || {
            studentId: currentUserId,
            studentName: user.name || "Tung Khách",
            studentUsername: user.username || "tungkhach",
            studentGrade: activeGrade,
            totalPoints:
                submissions.length > 0
                    ? Number(
                          submissions
                              .reduce((acc, s) => acc + s.score, 0)
                              .toFixed(1),
                      )
                    : 10.0,
            testsCompleted: submissions.length,
            rankPosition: 1,
            previousRankPosition: null,
        };

        const mockUsers = [
            {
                studentId: "mock-1",
                studentName: "Nguyễn Thanh Tùng",
                studentUsername: "thanhtung",
                studentGrade: activeGrade,
                totalPoints: 125.5,
                testsCompleted: 14,
                rankPosition: 1,
                previousRankPosition: 2,
            },
            {
                studentId: "mock-2",
                studentName: "Lê Minh Triết",
                studentUsername: "minhtriet",
                studentGrade: activeGrade,
                totalPoints: 112.0,
                testsCompleted: 12,
                rankPosition: 2,
                previousRankPosition: 1,
            },
            {
                studentId: "mock-3",
                studentName: "Phạm Hải Đăng",
                studentUsername: "haidang",
                studentGrade: activeGrade,
                totalPoints: 98.4,
                testsCompleted: 11,
                rankPosition: 3,
                previousRankPosition: 4,
            },
            {
                studentId: "mock-4",
                studentName: "Trần Thị Hồng",
                studentUsername: "hongtran",
                studentGrade: activeGrade,
                totalPoints: 85.0,
                testsCompleted: 9,
                rankPosition: 4,
                previousRankPosition: 3,
            },
            {
                studentId: "mock-5",
                studentName: "Nguyễn Hoàng Nam",
                studentUsername: "namhoang",
                studentGrade: activeGrade,
                totalPoints: 72.8,
                testsCompleted: 8,
                rankPosition: 5,
                previousRankPosition: 5,
            },
            {
                studentId: "mock-6",
                studentName: "Vũ Bảo Ngọc",
                studentUsername: "baongoc",
                studentGrade: activeGrade,
                totalPoints: 5.2,
                testsCompleted: 3,
                rankPosition: 6,
                previousRankPosition: 7,
            },
        ];

        // Combine
        const combined = [
            currentUserEntry,
            ...mockUsers.filter(
                (mu) => mu.studentId !== currentUserEntry.studentId,
            ),
        ];

        // Sort by totalPoints descending
        combined.sort((a, b) => b.totalPoints - a.totalPoints);

        // Recalculate rank position
        displayData = combined.map((entry, index) => ({
            ...entry,
            rankPosition: index + 1,
            previousRankPosition: entry.previousRankPosition || index + 2,
        }));
    }

    // Filter overall data based on search input
    const filteredOverall = displayData.filter(
        (entry) =>
            entry.studentName
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
            entry.studentUsername
                .toLowerCase()
                .includes(searchQuery.toLowerCase()),
    );

    const myOverallStats = displayData.find(
        (entry) => entry.studentId === user.id,
    );
    const myOverallIndex = displayData.findIndex(
        (entry) => entry.studentId === user.id,
    );
    const nextUserAbove =
        myOverallIndex > 0 ? displayData[myOverallIndex - 1] : null;

    // Render Rank Trend Badge
    const renderTrend = (current: number, previous: number | null) => {
        if (previous === null) {
            return (
                <span className="text-[8px] font-black text-blue-650 bg-blue-50 dark:bg-blue-950/30 border border-blue-200/30 px-1 py-0.2 rounded-md uppercase tracking-wider scale-90">
                    Mới
                </span>
            );
        }
        const diff = previous - current;
        if (diff > 0) {
            return (
                <span className="flex items-center text-[11px] font-black text-emerald-600 dark:text-emerald-450 gap-0.5">
                    <ChevronUp className="w-3 h-3 stroke-[3]" />
                    <span>{diff}</span>
                </span>
            );
        } else if (diff < 0) {
            return (
                <span className="flex items-center text-[11px] font-black text-rose-500 gap-0.5">
                    <ChevronDown className="w-3 h-3 stroke-[3]" />
                    <span>{Math.abs(diff)}</span>
                </span>
            );
        }
        return (
            <span className="flex items-center text-slate-350 dark:text-slate-650">
                <Minus className="w-3.5 h-3.5" />
            </span>
        );
    };

    const top3 = filteredOverall.slice(0, 3);
    const podiumOrder = [
        top3[1] || null, // Hạng 2 (Trái)
        top3[0] || null, // Hạng 1 (Giữa)
        top3[2] || null, // Hạng 3 (Phải)
    ];

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 pb-32 animate-in fade-in duration-300">
            {/* 1. Header Vinh Danh */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-4">
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-serif flex items-center gap-2">
                            Bảng Xếp Hạng Học Tập 🏆
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Ghi lại nỗ lực và sự chăm chỉ của các học sinh lớp{" "}
                            {activeGrade}.
                        </p>
                    </div>
                </div>

                {user.role === "admin" && (
                    <button
                        onClick={handleManualRefresh}
                        disabled={refreshing || loading}
                        className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-250 rounded-xl text-xs font-bold flex items-center gap-2 shadow-3xs transition-all cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw
                            className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
                        />
                        <span>Đồng bộ điểm toàn khối</span>
                    </button>
                )}
            </div>

            {/* 3. Bố Cục Grid Hai Cột (Bảng Xếp Hạng Bên Trái | Góc Học Tập & Đề Thi Chưa Thi Bên Phải) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* CỘT TRÁI (Col-span 8): Podium & Danh sách thứ hạng */}
                <div className="lg:col-span-8 space-y-8 min-w-0">
                    {/* TOP 3 PODIUM - Tinh tế, có chiều sâu, cực kỳ sang trọng */}
                    {top3.length > 0 && (
                        <div className="grid grid-cols-3 items-end max-w-xl mx-auto gap-4 sm:gap-6 pt-10 pb-4 relative select-none">
                            {/* HẠNG 2 (Bên trái) */}
                            {podiumOrder[0] && (
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.1 }}
                                    className="flex flex-col items-center text-center group"
                                >
                                    <div className="relative mb-3">
                                        <div className="absolute inset-0 bg-slate-300/10 blur-md rounded-full group-hover:scale-110 transition-all" />
                                        <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-slate-300 bg-white dark:bg-slate-900 flex items-center justify-center font-bold text-base text-slate-500 shadow-md group-hover:scale-105 transition-all duration-300 relative z-10">
                                            {podiumOrder[0].studentName.charAt(
                                                0,
                                            )}
                                        </div>
                                        <span className="absolute -top-2 -right-1 text-lg z-20">
                                            🥈
                                        </span>
                                    </div>
                                    <div className="space-y-0.5 max-w-full z-10">
                                        <h4 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-350 truncate">
                                            {podiumOrder[0].studentName}
                                        </h4>
                                    </div>
                                    <div className="mt-4 w-full bg-transparent border-t border-b border-slate-100 dark:border-slate-800 rounded-none p-2.5 flex flex-col items-center justify-center transition-all">
                                        <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 tracking-wider">
                                            HẠNG 2
                                        </span>
                                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">
                                            {podiumOrder[0].totalPoints} điểm
                                        </span>
                                    </div>
                                </motion.div>
                            )}

                            {/* HẠNG 1 (Giữa - Cao nhất & Phát sáng nhẹ) */}
                            {podiumOrder[1] && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4 }}
                                    className="flex flex-col items-center text-center group relative z-10"
                                >
                                    <div className="relative mb-4">
                                        <div className="absolute inset-0 bg-amber-400/10 dark:bg-amber-400/5 blur-xl rounded-full scale-110 group-hover:scale-125 transition-all duration-500" />
                                        <div className="w-16 h-16 sm:w-19 sm:h-19 rounded-full overflow-hidden border-2 border-amber-400 bg-white dark:bg-slate-900 flex items-center justify-center font-black text-lg text-amber-600 dark:text-amber-400 shadow-lg group-hover:scale-105 transition-all duration-300 relative z-10 ring-4 ring-amber-400/10">
                                            {podiumOrder[1].studentName.charAt(
                                                0,
                                            )}
                                        </div>
                                        <span
                                            className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-2xl animate-bounce"
                                            style={{ animationDuration: "3s" }}
                                        >
                                            👑
                                        </span>
                                    </div>
                                    <div className="space-y-0.5 max-w-full z-10">
                                        <h4 className="text-xs sm:text-base font-black text-slate-900 dark:text-slate-100 truncate">
                                            {podiumOrder[1].studentName}
                                        </h4>
                                    </div>
                                    <div className="mt-4 w-full bg-transparent border-t border-b border-amber-400/30 dark:border-amber-900/30 rounded-none p-3 flex flex-col items-center justify-center transition-all relative">
                                        <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 tracking-wider">
                                            🥇 QUÁN QUÂN
                                        </span>
                                        <span className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">
                                            {podiumOrder[1].totalPoints} điểm
                                        </span>
                                        <span className="absolute -bottom-5 right-2 font-brand text-amber-500/80 text-[11px] select-none rotate-6 hidden sm:inline">
                                            Nhà vô địch!
                                        </span>
                                    </div>
                                </motion.div>
                            )}

                            {/* HẠNG 3 (Bên phải) */}
                            {podiumOrder[2] && (
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.2 }}
                                    className="flex flex-col items-center text-center group"
                                >
                                    <div className="relative mb-3">
                                        <div className="absolute inset-0 bg-orange-400/5 blur-md rounded-full group-hover:scale-110 transition-all" />
                                        <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-orange-300/80 bg-white dark:bg-slate-900 flex items-center justify-center font-bold text-base text-orange-700 shadow-md group-hover:scale-105 transition-all duration-300 relative z-10">
                                            {podiumOrder[2].studentName.charAt(
                                                0,
                                            )}
                                        </div>
                                        <span className="absolute -top-2 -right-1 text-lg z-20">
                                            🥉
                                        </span>
                                    </div>
                                    <div className="space-y-0.5 max-w-full z-10">
                                        <h4 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-355 truncate">
                                            {podiumOrder[2].studentName}
                                        </h4>
                                    </div>
                                    <div className="mt-4 w-full bg-transparent border-t border-b border-slate-100/80 dark:border-slate-800 rounded-none p-2.5 flex flex-col items-center justify-center transition-all">
                                        <span className="text-[8px] font-black text-orange-600 tracking-wider">
                                            HẠNG 3
                                        </span>
                                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">
                                            {podiumOrder[2].totalPoints} điểm
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    )}

                    {/* DÀNH CHO LOAD CHỜ */}
                    {loading && (
                        <div className="py-24 flex flex-col items-center justify-center gap-3">
                            <RefreshCw className="w-6 h-6 text-[#4B726B] animate-spin" />
                            <span className="text-xs text-slate-450 font-semibold">
                                Đang cập nhật danh sách...
                            </span>
                        </div>
                    )}

                    {/* DANH SÁCH BẢNG XẾP HẠNG CHI TIẾT */}
                    {filteredOverall.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-6">
                                    <span className="w-8 text-center">
                                        Hạng
                                    </span>
                                    <span>Học sinh</span>
                                </div>
                                <div className="flex items-center gap-12">
                                    <span className="hidden sm:inline">
                                        Số đề đã thi
                                    </span>
                                    <span className="w-20 text-right">
                                        Tổng điểm
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                                <AnimatePresence>
                                    {filteredOverall.map((entry) => {
                                        const isMe =
                                            entry.studentId === user.id;
                                        const rank = entry.rankPosition;
                                        const isTop3 = rank <= 3;
                                        const completedRatio = Math.min(
                                            (entry.testsCompleted || 0) /
                                                totalQuizzesForGrade,
                                            1,
                                        );
                                        const pointsRatio = Math.min(
                                            (entry.totalPoints || 0) /
                                                (totalQuizzesForGrade * 10),
                                            1,
                                        );

                                        return (
                                            <motion.div
                                                layout
                                                key={entry.studentId}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`relative overflow-hidden py-3 px-2 rounded-none flex items-center justify-between transition-all duration-200 border-b border-slate-100 dark:border-slate-800/80 ${
                                                    isMe
                                                        ? "bg-[#4B726B]/5 font-bold"
                                                        : "bg-transparent hover:bg-slate-50/20 dark:hover:bg-slate-900/10"
                                                }`}
                                            >
                                                {/* Progress bar background visualizations */}
                                                <div
                                                    className="absolute left-0 top-0 bottom-0 bg-[#4B726B]/5 dark:bg-[#4B726B]/10 pointer-events-none transition-all duration-500"
                                                    style={{
                                                        width: `${completedRatio * 100}%`,
                                                    }}
                                                />
                                                <div
                                                    className="absolute left-0 top-0 bottom-0 bg-[#4B726B]/15 dark:bg-[#4B726B]/25 pointer-events-none transition-all duration-500"
                                                    style={{
                                                        width: `${pointsRatio * 100}%`,
                                                    }}
                                                />

                                                <div className="relative z-10 flex items-center gap-6 min-w-0">
                                                    <span className="w-8 text-center font-mono font-bold text-xs sm:text-sm flex items-center justify-center">
                                                        {isTop3 ? (
                                                            rank === 1 ? (
                                                                "🥇"
                                                            ) : rank === 2 ? (
                                                                "🥈"
                                                            ) : (
                                                                "🥉"
                                                            )
                                                        ) : (
                                                            <span className="text-slate-450">
                                                                #{rank}
                                                            </span>
                                                        )}
                                                    </span>

                                                    <span className="w-6 flex items-center justify-center">
                                                        {renderTrend(
                                                            entry.rankPosition,
                                                            entry.previousRankPosition,
                                                        )}
                                                    </span>

                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div
                                                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none ${
                                                                isMe
                                                                    ? "bg-[#4B726B]/20 text-[#4B726B] dark:bg-[#4B726B]/30 dark:text-brand-300"
                                                                    : isTop3
                                                                      ? "bg-slate-100 text-slate-655 dark:bg-slate-800"
                                                                      : "bg-slate-50 text-slate-400 dark:bg-slate-800/40"
                                                            }`}
                                                        >
                                                            {entry.studentName.charAt(
                                                                0,
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p
                                                                className={`truncate leading-snug flex items-center gap-1.5 text-xs sm:text-sm ${
                                                                    isMe
                                                                        ? "text-slate-900 dark:text-slate-150 font-extrabold"
                                                                        : "text-slate-800 dark:text-slate-200"
                                                                }`}
                                                            >
                                                                <span>
                                                                    {
                                                                        entry.studentName
                                                                    }
                                                                </span>
                                                                {isMe && (
                                                                    <span className="text-[8px] bg-[#4B726B] text-white px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider font-sans">
                                                                        Bạn
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="relative z-10 flex items-center gap-12 shrink-0 text-xs">
                                                    <span className="hidden sm:inline text-slate-450 dark:text-slate-400 font-medium">
                                                        {entry.testsCompleted}{" "}
                                                        đề thi
                                                    </span>
                                                    <span
                                                        className={`w-20 text-right font-mono font-bold sm:text-sm ${
                                                            isMe
                                                                ? "text-[#4B726B] dark:text-[#88BDA4]"
                                                                : isTop3
                                                                  ? "text-slate-900 dark:text-slate-100"
                                                                  : "text-slate-700 dark:text-slate-350"
                                                        }`}
                                                    >
                                                        {entry.totalPoints} đ
                                                    </span>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}

                    {filteredOverall.length === 0 && (
                        <div className="py-12 bg-transparent border-b border-slate-150/60 dark:border-slate-850 rounded-none text-center text-slate-450 text-xs italic">
                            Chưa tìm thấy thông tin xếp hạng học sinh.
                        </div>
                    )}
                </div>

                {/* CỘT PHẢI (Col-span 4): Thành tích cá nhân & Bài thi chưa thi */}
                <div className="lg:col-span-4 space-y-6">
                    {/* A. CARD THÀNH TÍCH CÁ NHÂN */}
                    <div className="bg-transparent border-b border-slate-200 dark:border-slate-850 rounded-none py-6 space-y-4 relative">
                        <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#4B726B]/5 rounded-full blur-xl pointer-events-none" />

                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                Thành tích của bạn
                            </h3>
                        </div>

                        {myOverallStats ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-slate-450">
                                            Thứ hạng hiện tại
                                        </p>
                                        <p className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono mt-0.5 flex items-center gap-1.5">
                                            #{myOverallStats.rankPosition}
                                            {renderTrend(
                                                myOverallStats.rankPosition,
                                                myOverallStats.previousRankPosition,
                                            )}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-455">
                                            Tổng tích lũy
                                        </p>
                                        <p className="text-base font-extrabold text-[#4B726B] font-mono mt-0.5">
                                            {myOverallStats.totalPoints} điểm
                                        </p>
                                    </div>
                                </div>

                                <div className="p-3 bg-[#4B726B]/5 border-l-2 border-[#4B726B] rounded-none space-y-1 relative">
                                    {nextUserAbove ? (
                                        Number(
                                            (
                                                nextUserAbove.totalPoints -
                                                myOverallStats.totalPoints
                                            ).toFixed(1),
                                        ) > 0 ? (
                                            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                                💡 Bạn cần tích lũy thêm{" "}
                                                <strong className="text-[#4B726B] font-mono">
                                                    {Number(
                                                        (
                                                            nextUserAbove.totalPoints -
                                                            myOverallStats.totalPoints
                                                        ).toFixed(1),
                                                    )}{" "}
                                                    điểm
                                                </strong>{" "}
                                                để vượt qua học sinh{" "}
                                                <strong className="text-slate-700 dark:text-slate-300">
                                                    {nextUserAbove.studentName}
                                                </strong>{" "}
                                                (Hạng #
                                                {nextUserAbove.rankPosition})
                                            </p>
                                        ) : (
                                            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                                💡 Bạn đang đồng hạng với{" "}
                                                <strong className="text-slate-700 dark:text-slate-300">
                                                    {nextUserAbove.studentName}
                                                </strong>{" "}
                                                (Hạng #
                                                {nextUserAbove.rankPosition}).
                                                Hãy tích lũy thêm điểm để bứt
                                                phá vươn lên!
                                            </p>
                                        )
                                    ) : (
                                        <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-relaxed font-black">
                                            👑 Bạn đang dẫn đầu Khối{" "}
                                            {activeGrade}! Hãy kiên trì duy trì
                                            vị trí của mình nhé!
                                        </p>
                                    )}
                                    <span className="block font-brand text-[#4B726B]/80 text-[12px] text-right mt-1 select-none">
                                        Cố gắng lên nhé!
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4 space-y-3">
                                <p className="text-xs text-slate-400 italic">
                                    Học bạ của bạn chưa được ghi nhận trên bảng
                                    xếp hạng khối {activeGrade}.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* B. CARD NÂNG CAO ĐIỂM SỐ: Danh sách đề thi chưa thi (CTA để leo hạng) */}
                    <div className="bg-transparent rounded-none py-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                Nâng cao điểm số
                            </h3>
                            <span className="text-[9px] bg-[#4B726B]/10 text-[#4B726B] dark:text-brand-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider scale-90">
                                Chưa làm
                            </span>
                        </div>

                        {untakenQuizzes.length > 0 ? (
                            <div className="space-y-3">
                                <p className="text-[10px] text-slate-455 dark:text-slate-400 font-semibold leading-relaxed">
                                    💡 Dưới đây là các bài thi bạn chưa làm:
                                </p>
                                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                                    {untakenQuizzes.slice(0, 5).map((quiz) => (
                                        <div
                                            key={quiz.id}
                                            onClick={() =>
                                                onNavigate(`/quiz/${quiz.id}`)
                                            }
                                            className="py-3 bg-transparent hover:bg-[#4B726B]/5 border-b border-slate-100 dark:border-slate-800 last:border-b-0 flex items-center justify-between transition-all duration-200 cursor-pointer group"
                                        >
                                            <div className="space-y-1 min-w-0 pr-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                                                        {quiz.subject}
                                                    </span>
                                                </div>
                                                <h4 className="text-xs font-bold text-slate-750 dark:text-slate-200 truncate group-hover:text-[#4B726B] transition-colors">
                                                    {quiz.title}
                                                </h4>
                                                <p className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-slate-350" />
                                                    <span>
                                                        {quiz.duration} phút •{" "}
                                                        {quiz.questions
                                                            ?.length || 0}{" "}
                                                        câu
                                                    </span>
                                                </p>
                                            </div>
                                            <span className="text-[10px] text-slate-400 group-hover:text-[#4B726B] font-bold flex items-center gap-0.5 shrink-0 transition-colors">
                                                Làm bài{" "}
                                                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="py-8 text-center space-y-2 text-slate-400">
                                <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                                <p className="text-xs font-semibold">
                                    Tuyệt vời! Bạn đã hoàn thành tất cả đề thi.
                                </p>
                                <p className="text-[10px] text-slate-455">
                                    Không còn đề thi chưa hoàn thành của Khối{" "}
                                    {activeGrade}.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
