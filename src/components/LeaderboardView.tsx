import React, { useState, useEffect } from "react";
import {
    Trophy,
    Search,
    Award,
    ChevronUp,
    ChevronDown,
    Minus,
    Clock,
    Calendar,
    Sparkles,
    RefreshCw,
    User as UserIcon,
    ArrowLeft,
    CheckCircle2,
    BookOpen,
    Filter,
} from "lucide-react";
import { User, Quiz, QuizLeaderboardEntry, OverallLeaderboardEntry } from "../types";
import {
    getQuizLeaderboard,
    getOverallLeaderboard,
    refreshOverallLeaderboard,
} from "../lib/supabaseService";

interface LeaderboardViewProps {
    user: User;
    quizzes: Quiz[];
    onNavigate: (path: string) => void;
}

type TabType = "overall" | "quiz";

export default function LeaderboardView({
    user,
    quizzes,
    onNavigate,
}: LeaderboardViewProps) {
    const [activeTab, setActiveTab] = useState<TabType>("overall");
    
    // Grade states: students are locked to their profile grade (fallback to "10"), teachers default to "10"
    const [activeGrade, setActiveGrade] = useState<string>(() => {
        if (user.role === "student") {
            return user.grade || "10";
        }
        return "10";
    });

    const [overallData, setOverallData] = useState<OverallLeaderboardEntry[]>([]);
    const [quizData, setQuizData] = useState<QuizLeaderboardEntry[]>([]);
    const [selectedQuizId, setSelectedQuizId] = useState<string>("");
    
    const [loading, setLoading] = useState<boolean>(true);
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

    // Filter quizzes to only match the currently active grade tab
    const gradeQuizzes = quizzes.filter(
        (q) => q.grade === activeGrade || (!q.grade && activeGrade === "10")
    );

    // Fetch Overall Leaderboard for the active grade
    const fetchOverallRankings = async (showSilence = false) => {
        if (!showSilence) setLoading(true);
        setError(null);
        try {
            const data = await getOverallLeaderboard(activeGrade);
            setOverallData(data);
        } catch (err: any) {
            console.error("Lỗi khi tải bảng xếp hạng chung:", err);
            setError(err.message || "Không thể tải dữ liệu bảng xếp hạng.");
        } finally {
            setLoading(false);
        }
    };

    // Fetch Quiz Leaderboard
    const fetchQuizRankings = async (quizId: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getQuizLeaderboard(quizId);
            setQuizData(data);
        } catch (err: any) {
            console.error("Lỗi khi tải bảng xếp hạng bài thi:", err);
            setError(err.message || "Không thể tải dữ liệu bảng xếp hạng bài thi.");
        } finally {
            setLoading(false);
        }
    };

    // Trigger data loading when tab, grade, or quiz selection changes
    useEffect(() => {
        if (activeTab === "overall") {
            fetchOverallRankings();
        } else if (activeTab === "quiz") {
            if (gradeQuizzes.length > 0) {
                // If the selected quiz is not in the current grade's quizzes, reset it to the first one
                const currentGradeQuizIds = gradeQuizzes.map((q) => q.id);
                let quizIdToFetch = selectedQuizId;

                if (!selectedQuizId || !currentGradeQuizIds.includes(selectedQuizId)) {
                    quizIdToFetch = gradeQuizzes[0].id;
                    setSelectedQuizId(quizIdToFetch);
                }
                
                fetchQuizRankings(quizIdToFetch);
            } else {
                setQuizData([]);
                setLoading(false);
            }
        }
    }, [activeTab, activeGrade, selectedQuizId, quizzes]);

    // Handle manual refresh for teacher
    const handleManualRefresh = async () => {
        if (user.role !== "teacher") return;
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

    // Helpers
    const formatDuration = (seconds: number): string => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        if (m === 0) return `${s}s`;
        return `${m}m ${s}s`;
    };

    const formatDate = (dateString: string): string => {
        try {
            const d = new Date(dateString);
            const pad = (n: number) => n.toString().padStart(2, "0");
            return `${pad(d.getHours())}:${pad(d.getMinutes())} - ${pad(
                d.getDate()
            )}/${pad(d.getMonth() + 1)}`;
        } catch {
            return "Không xác định";
        }
    };

    // Filter overall data
    const filteredOverall = overallData.filter(
        (entry) =>
            entry.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.studentUsername.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter quiz data
    const filteredQuiz = quizData.filter(
        (entry) =>
            entry.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.studentUsername.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Current User positions
    const myOverallStats = overallData.find((entry) => entry.studentId === user.id);
    const myOverallIndex = overallData.findIndex((entry) => entry.studentId === user.id);
    const nextUserAbove =
        myOverallIndex > 0 ? overallData[myOverallIndex - 1] : null;

    const myQuizStats = quizData.find((entry) => entry.studentId === user.id);

    // Render Rank Trend Badge
    const renderTrend = (current: number, previous: number | null) => {
        if (previous === null) {
            return (
                <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-950/20 px-1.5 py-0.5 rounded-sm uppercase tracking-wider animate-pulse">
                    Mới
                </span>
            );
        }
        const diff = previous - current;
        if (diff > 0) {
            return (
                <span className="flex items-center text-xs font-black text-emerald-600 dark:text-emerald-500">
                    <ChevronUp className="w-3.5 h-3.5" />
                    {diff}
                </span>
            );
        } else if (diff < 0) {
            return (
                <span className="flex items-center text-xs font-black text-rose-500">
                    <ChevronDown className="w-3.5 h-3.5" />
                    {Math.abs(diff)}
                </span>
            );
        }
        return (
            <span className="flex items-center text-xs text-slate-400">
                <Minus className="w-3 h-3" />
            </span>
        );
    };

    // Split Podium (Top 3) vs Table List (Rank 4+)
    const renderPodiumAndList = () => {
        const currentData = activeTab === "overall" ? filteredOverall : filteredQuiz;
        const top3 = currentData.slice(0, 3);
        const rest = currentData.slice(3);

        const podiumOrder = [
            top3[1] || null, // 2nd
            top3[0] || null, // 1st
            top3[2] || null, // 3rd
        ];

        return (
            <div className="space-y-8 select-none">
                {/* Welcome & Info Banner */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                            {activeTab === "overall"
                                ? `Bảng xếp hạng chung - Khối ${activeGrade}`
                                : `Hạng bài thi - Khối ${activeGrade}`}
                            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                        </h2>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                            {activeTab === "overall"
                                ? `Xếp hạng tích lũy dựa trên tổng điểm thi lượt đầu của các bài kiểm tra lớp ${activeGrade}.`
                                : "💡 Bảng xếp hạng chỉ ghi nhận kết quả của lượt làm bài ĐẦU TIÊN để đảm bảo tính công bằng."}
                        </p>
                    </div>

                    {/* Teacher Actions */}
                    {user.role === "teacher" && activeTab === "overall" && (
                        <button
                            onClick={handleManualRefresh}
                            disabled={refreshing || loading}
                            className="px-3 py-1.5 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                        >
                            <RefreshCw
                                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
                            />
                            <span>Đồng bộ điểm & rank</span>
                        </button>
                    )}
                </div>

                {/* Top 3 Podium section */}
                {top3.length > 0 ? (
                    <div className="grid grid-cols-3 items-end max-w-2xl mx-auto gap-3 sm:gap-6 pt-6 pb-2">
                        {/* 2nd Place (Left) */}
                        {podiumOrder[0] && (
                            <div className="flex flex-col items-center text-center group">
                                <div className="relative mb-2.5">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-slate-350 bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-bold text-lg text-slate-500 relative shadow-sm group-hover:scale-105 transition-transform">
                                        {podiumOrder[0].studentName.charAt(0)}
                                    </div>
                                    <span className="absolute -top-2 -right-1.5 text-xl sm:text-2xl" title="Huy chương Bạc">
                                        🥈
                                    </span>
                                </div>
                                <div className="space-y-0.5 max-w-full">
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 truncate">
                                        {podiumOrder[0].studentName}
                                    </h4>
                                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium truncate">
                                        @{podiumOrder[0].studentUsername}
                                    </p>
                                    {podiumOrder[0].studentGrade && (
                                        <span className="inline-block text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1 py-0.2 rounded-sm font-bold mt-0.5">
                                            Lớp {podiumOrder[0].studentGrade}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-3 w-full bg-slate-100/60 dark:bg-slate-800/40 rounded-t-xl p-3 border-t border-x border-slate-200/50 dark:border-slate-800 flex flex-col items-center justify-center">
                                    <span className="text-[10px] font-black text-slate-400 tracking-wider">HẠNG 2</span>
                                    <span className="text-xs sm:text-sm font-black text-slate-650 dark:text-slate-300 mt-1">
                                        {"totalPoints" in podiumOrder[0]
                                            ? `${(podiumOrder[0] as OverallLeaderboardEntry).totalPoints} điểm`
                                            : `${(podiumOrder[0] as QuizLeaderboardEntry).score}/10`}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* 1st Place (Center) */}
                        {podiumOrder[1] && (
                            <div className="flex flex-col items-center text-center group">
                                <div className="relative mb-3.5 z-10">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-3 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-center font-black text-xl text-amber-600 dark:text-amber-400 relative shadow-md group-hover:scale-105 transition-transform">
                                        {podiumOrder[1].studentName.charAt(0)}
                                    </div>
                                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-2xl sm:text-3xl animate-bounce" style={{ animationDuration: "3s" }} title="Vương miện vô địch">
                                        👑
                                    </span>
                                </div>
                                <div className="space-y-0.5 max-w-full">
                                    <h4 className="text-xs sm:text-base font-extrabold text-slate-850 dark:text-slate-100 truncate">
                                        {podiumOrder[1].studentName}
                                    </h4>
                                    <p className="text-[9px] sm:text-xs text-slate-400 dark:text-slate-500 font-semibold truncate">
                                        @{podiumOrder[1].studentUsername}
                                    </p>
                                    {podiumOrder[1].studentGrade && (
                                        <span className="inline-block text-[8px] bg-amber-50 dark:bg-amber-950/30 text-amber-650 dark:text-amber-400 px-1 py-0.2 rounded-sm font-bold mt-0.5 border border-amber-100/30">
                                            Lớp {podiumOrder[1].studentGrade}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-3 w-full bg-amber-50/40 dark:bg-amber-950/10 rounded-t-2xl p-4 border-t border-x border-amber-250/20 dark:border-amber-900/30 flex flex-col items-center justify-center ring-2 ring-amber-400/10">
                                    <span className="text-[10px] font-black text-amber-500 dark:text-amber-400 tracking-widest flex items-center gap-0.5">
                                        🥇 HẠNG 1
                                    </span>
                                    <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 mt-1">
                                        {"totalPoints" in podiumOrder[1]
                                            ? `${(podiumOrder[1] as OverallLeaderboardEntry).totalPoints} điểm`
                                            : `${(podiumOrder[1] as QuizLeaderboardEntry).score}/10`}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* 3rd Place (Right) */}
                        {podiumOrder[2] && (
                            <div className="flex flex-col items-center text-center group">
                                <div className="relative mb-2.5">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-amber-650 bg-amber-50/20 dark:bg-amber-900/10 flex items-center justify-center font-bold text-lg text-amber-700/80 relative shadow-sm group-hover:scale-105 transition-transform">
                                        {podiumOrder[2].studentName.charAt(0)}
                                    </div>
                                    <span className="absolute -top-2 -right-1.5 text-xl sm:text-2xl" title="Huy chương Đồng">
                                        🥉
                                    </span>
                                </div>
                                <div className="space-y-0.5 max-w-full">
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 truncate">
                                        {podiumOrder[2].studentName}
                                    </h4>
                                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium truncate">
                                        @{podiumOrder[2].studentUsername}
                                    </p>
                                    {podiumOrder[2].studentGrade && (
                                        <span className="inline-block text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1 py-0.2 rounded-sm font-bold mt-0.5">
                                            Lớp {podiumOrder[2].studentGrade}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-3 w-full bg-slate-100/60 dark:bg-slate-800/40 rounded-t-xl p-3 border-t border-x border-slate-200/50 dark:border-slate-800 flex flex-col items-center justify-center">
                                    <span className="text-[10px] font-black text-amber-700/60 tracking-wider">HẠNG 3</span>
                                    <span className="text-xs sm:text-sm font-black text-slate-650 dark:text-slate-300 mt-1">
                                        {"totalPoints" in podiumOrder[2]
                                            ? `${(podiumOrder[2] as OverallLeaderboardEntry).totalPoints} điểm`
                                            : `${(podiumOrder[2] as QuizLeaderboardEntry).score}/10`}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    !loading && (
                        <div className="py-12 text-center text-slate-400">
                            Chưa có dữ liệu học sinh của khối này.
                        </div>
                    )
                )}

                {/* Table List of Ranks */}
                {currentData.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        <th className="py-3 px-4 w-16 text-center">Hạng</th>
                                        {activeTab === "overall" && (
                                            <th className="py-3 px-2 w-12 text-center">Trend</th>
                                        )}
                                        <th className="py-3 px-4">Học sinh</th>
                                        <th className="py-3 px-4 text-center">Khối lớp</th>
                                        {activeTab === "overall" ? (
                                            <th className="py-3 px-4 text-center">Số bài đã thi</th>
                                        ) : (
                                            <>
                                                <th className="py-3 px-4 text-center">Thời gian làm</th>
                                                <th className="py-3 px-4 text-center">Thời điểm nộp</th>
                                            </>
                                        )}
                                        <th className="py-3 px-6 text-right">Tổng điểm</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {currentData.map((entry, index) => {
                                        const isMe = entry.studentId === user.id;
                                        const rank = entry.rankPosition;
                                        const isTop3 = rank <= 3;

                                        return (
                                            <tr
                                                key={entry.studentId}
                                                className={`transition-colors font-medium ${
                                                    isMe
                                                        ? "bg-brand-50/20 dark:bg-brand-500/5 font-semibold text-slate-900 dark:text-slate-100 ring-2 ring-inset ring-brand-100/50 dark:ring-brand-500/20"
                                                        : "hover:bg-slate-50/40 dark:hover:bg-slate-800/20 text-slate-600 dark:text-slate-400"
                                                }`}
                                            >
                                                {/* Rank position */}
                                                <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                                                    {isTop3 ? (
                                                        <span className="text-sm">
                                                            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                                                        </span>
                                                    ) : (
                                                        <span>#{rank}</span>
                                                    )}
                                                </td>

                                                {/* Trend (Overall only) */}
                                                {activeTab === "overall" && (
                                                    <td className="py-3.5 px-2 text-center">
                                                        {renderTrend(
                                                            (entry as OverallLeaderboardEntry).rankPosition,
                                                            (entry as OverallLeaderboardEntry).previousRankPosition
                                                        )}
                                                    </td>
                                                )}

                                                {/* Profile info */}
                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] ${
                                                            isMe 
                                                                ? "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300"
                                                                : isTop3
                                                                    ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                                                    : "bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400"
                                                        }`}>
                                                            {entry.studentName.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className={`truncate leading-snug flex items-center gap-1.5 ${isMe ? "text-slate-900 dark:text-slate-100 font-extrabold" : "text-slate-800 dark:text-slate-200"}`}>
                                                                <span>{entry.studentName}</span>
                                                                {isMe && (
                                                                    <span className="text-[9px] bg-brand-500 text-white px-1 py-0.2 rounded-sm font-bold uppercase tracking-wider scale-90">
                                                                        Bạn
                                                                    </span>
                                                                )}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 truncate">
                                                                @{entry.studentUsername}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Grade */}
                                                <td className="py-3.5 px-4 text-center font-semibold text-slate-500 dark:text-slate-400">
                                                    Lớp {entry.studentGrade || activeGrade}
                                                </td>

                                                {/* Completed Quizzes / Quiz stats */}
                                                {activeTab === "overall" ? (
                                                    <td className="py-3.5 px-4 text-center text-slate-500">
                                                        {(entry as OverallLeaderboardEntry).testsCompleted} đề thi
                                                    </td>
                                                ) : (
                                                    <>
                                                        <td className="py-3.5 px-4 text-center text-slate-500 flex items-center justify-center gap-1">
                                                            <Clock className="w-3 h-3 text-slate-400" />
                                                            <span>{formatDuration((entry as QuizLeaderboardEntry).durationSeconds)}</span>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center text-slate-455 dark:text-slate-500">
                                                            {formatDate((entry as QuizLeaderboardEntry).submittedAt)}
                                                        </td>
                                                    </>
                                                )}

                                                {/* Points/EXP score */}
                                                <td className="py-3.5 px-6 text-right">
                                                    <span className={`font-black text-sm ${
                                                        isMe
                                                            ? "text-brand-550 dark:text-brand-400"
                                                            : isTop3
                                                                ? "text-slate-800 dark:text-slate-255"
                                                                : "text-slate-700 dark:text-slate-350"
                                                    }`}>
                                                        {"totalPoints" in entry
                                                            ? `${(entry as OverallLeaderboardEntry).totalPoints} điểm`
                                                            : `${(entry as QuizLeaderboardEntry).score}/10`}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 pb-32 animate-in fade-in duration-200">
            {/* Top Stats and Nav */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-50/70 dark:bg-brand-500/10 rounded-xl flex items-center justify-center text-brand-500 dark:text-brand-300">
                        <Trophy className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                            Bảng xếp hạng vinh danh 🌸
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            Chăm chỉ làm bài, tích lũy điểm số, vươn lên dẫn đầu!
                        </p>
                    </div>
                </div>

                {/* Tab select */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-1 rounded-xl flex gap-1 self-start sm:self-auto">
                    <button
                        onClick={() => {
                            setActiveTab("overall");
                            setSearchQuery("");
                        }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            activeTab === "overall"
                                ? "bg-white dark:bg-slate-800 text-brand-550 dark:text-brand-300 shadow-xs"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-255"
                        }`}
                    >
                        Bảng xếp hạng chung
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab("quiz");
                            setSearchQuery("");
                        }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            activeTab === "quiz"
                                ? "bg-white dark:bg-slate-800 text-brand-550 dark:text-brand-300 shadow-xs"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-255"
                        }`}
                    >
                        BXH Từng bài thi
                    </button>
                </div>
            </div>

            {/* Grade Selection Sub-navigation (Visible to Teacher ONLY, Students are locked to their own grade) */}
            {user.role === "teacher" ? (
                <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
                        <Filter className="w-3.5 h-3.5" /> Lọc theo Khối lớp (Dành cho Giáo viên)
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {grades.map((grade) => (
                            <button
                                key={grade.id}
                                onClick={() => {
                                    setActiveGrade(grade.id);
                                    setSearchQuery("");
                                }}
                                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                    activeGrade === grade.id
                                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-150 dark:border-slate-850 hover:bg-slate-50"
                                }`}
                            >
                                {grade.label}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                /* Student is restricted to their grade only */
                <div className="bg-[#2C5A71]/5 border border-[#2C5A71]/10 px-4 py-2.5 rounded-xl self-start inline-flex items-center gap-2 select-none">
                    <span className="w-2 h-2 rounded-full bg-[#2C5A71] animate-pulse"></span>
                    <span className="text-xs font-bold text-[#2C5A71]">
                        Đang xem bảng xếp hạng: Khối {activeGrade} (Mặc định lớp học)
                    </span>
                </div>
            )}

            {/* Filtering and search bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                {/* Search box */}
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute inset-y-0 left-3 flex items-center pl-0.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm học sinh..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-150 dark:border-slate-850 bg-white dark:bg-slate-900/50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-500/10 focus:border-brand-500 dark:focus:border-brand-400 placeholder:text-slate-400 dark:placeholder:text-slate-550 text-slate-800 dark:text-slate-250"
                    />
                </div>

                {/* Quiz Selector (Quiz tab only, list is filtered by the active grade) */}
                {activeTab === "quiz" && gradeQuizzes.length > 0 && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-xs text-slate-400 font-semibold whitespace-nowrap hidden sm:inline">
                            Chọn bài thi:
                        </span>
                        <select
                            value={selectedQuizId}
                            onChange={(e) => setSelectedQuizId(e.target.value)}
                            className="w-full sm:w-60 px-3 py-2 border border-slate-150 dark:border-slate-850 bg-white dark:bg-slate-900/50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-500 dark:focus:border-brand-400 text-slate-800 dark:text-slate-200 font-semibold"
                        >
                            {gradeQuizzes.map((quiz) => (
                                <option key={quiz.id} value={quiz.id}>
                                    {quiz.title}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Error view */}
            {error && (
                <div className="p-4 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-start gap-3">
                    <span className="text-rose-500">⚠️</span>
                    <div className="space-y-1">
                        <h4 className="text-xs font-bold text-rose-800 dark:text-rose-400">
                            Đã xảy ra lỗi tải dữ liệu
                        </h4>
                        <p className="text-[11px] text-rose-650 dark:text-rose-450 leading-relaxed font-medium">
                            {error}
                        </p>
                    </div>
                </div>
            )}

            {/* Loading view */}
            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
                    <span className="text-xs text-slate-450 font-semibold">
                        Đang tải dữ liệu bảng xếp hạng...
                    </span>
                </div>
            ) : (
                renderPodiumAndList()
            )}

            {/* Empty quizzes state */}
            {activeTab === "quiz" && gradeQuizzes.length === 0 && !loading && (
                <div className="py-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-center space-y-3">
                    <BookOpen className="w-8 h-8 text-slate-350 mx-auto" />
                    <div className="space-y-1 max-w-sm mx-auto px-4">
                        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350">
                            Không có đề thi nào của Khối {activeGrade}
                        </h3>
                        <p className="text-[10px] text-slate-400">
                            Chưa có đề thi nào được phân loại cho Khối {activeGrade} để xếp thứ hạng.
                        </p>
                    </div>
                </div>
            )}

            {/* Sticky Bottom Bar for Current User Stats */}
            {!loading && !error && activeTab === "overall" && (
                <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/60 dark:border-slate-850 backdrop-blur-md py-4 px-6 z-40 shadow-2xl animate-in slide-in-from-bottom duration-300">
                    <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left">
                        {myOverallStats ? (
                            <>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-brand-500/10 dark:bg-brand-500/20 text-brand-500 dark:text-brand-400 font-extrabold flex items-center justify-center border border-brand-500/20 text-sm shadow-inner animate-pulse">
                                        {myOverallStats.studentName.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 leading-tight">
                                            <span>Thứ hạng của bạn:</span>
                                            <span className="text-brand-550 dark:text-brand-400 font-black text-sm">
                                                #{myOverallStats.rankPosition}
                                            </span>
                                            {renderTrend(
                                                myOverallStats.rankPosition,
                                                myOverallStats.previousRankPosition
                                            )}
                                        </h4>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                            Tổng điểm:{" "}
                                            <span className="font-extrabold text-slate-700 dark:text-slate-300">
                                                {myOverallStats.totalPoints} điểm
                                            </span>{" "}
                                            | Bài thi hoàn thành:{" "}
                                            <span className="font-extrabold text-slate-700 dark:text-slate-300">
                                                {myOverallStats.testsCompleted} đề
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    {nextUserAbove ? (
                                        <>
                                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                            <span>
                                                Cần thêm{" "}
                                                <span className="font-black text-brand-550 dark:text-brand-400">
                                                    {Number(
                                                        (
                                                            Number(nextUserAbove.totalPoints) -
                                                            Number(myOverallStats.totalPoints)
                                                        ).toFixed(1)
                                                    )}{"  "}
                                                    điểm
                                                </span>{" "}
                                                để vượt qua{" "}
                                                <span className="font-extrabold text-slate-700 dark:text-slate-200">
                                                    {nextUserAbove.studentName}
                                                </span>{" "}
                                                (Hạng #{nextUserAbove.rankPosition})
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-amber-550 dark:text-amber-400 font-bold flex items-center gap-1">
                                            👑 Bạn đang giữ vị trí quán quân Khối {activeGrade}! Cố gắng duy trì nhé!
                                        </span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-3 w-full justify-between">
                                <p className="text-xs text-slate-550 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                                    <Award className="w-4 h-4 text-slate-400" />
                                    <span>
                                        Bạn chưa có tên trên bảng xếp hạng khối {activeGrade}. Hãy làm bài thi để tích lũy
                                        điểm số nhé!
                                    </span>
                                </p>
                                <button
                                    onClick={() => onNavigate("/student-quizzes")}
                                    className="px-3.5 py-1.5 bg-brand-500 hover:bg-brand-650 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-md shadow-brand-500/20"
                                >
                                    Làm bài ngay
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Sticky Bottom Bar for Quiz Rankings */}
            {!loading && !error && activeTab === "quiz" && selectedQuizId && (
                <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/60 dark:border-slate-850 backdrop-blur-md py-4 px-6 z-40 shadow-2xl animate-in slide-in-from-bottom duration-300">
                    <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left">
                        {myQuizStats ? (
                            <>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-brand-500/10 dark:bg-brand-500/20 text-brand-500 dark:text-brand-400 font-extrabold flex items-center justify-center border border-brand-500/20 text-sm shadow-inner">
                                        {myQuizStats.studentName.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 leading-tight">
                                            <span>Thứ hạng đề này của bạn:</span>
                                            <span className="text-brand-550 dark:text-brand-400 font-black text-sm">
                                                #{myQuizStats.rankPosition}
                                            </span>
                                        </h4>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                            Điểm lượt đầu:{" "}
                                            <span className="font-extrabold text-slate-755 dark:text-slate-300">
                                                {myQuizStats.score}/10
                                            </span>{" "}
                                            | Thời gian làm:{" "}
                                            <span className="font-extrabold text-slate-755 dark:text-slate-300">
                                                {formatDuration(myQuizStats.durationSeconds)}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-550 dark:text-slate-400 font-bold flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    <span>
                                        Bạn đã hoàn thành tốt bài kiểm tra này. Lượt thi đầu tiên đã được lưu điểm.
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-3 w-full justify-between">
                                <p className="text-xs text-slate-555 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                                    <Award className="w-4 h-4 text-slate-455" />
                                    <span>
                                        Bạn chưa làm bài kiểm tra này. Hãy thi ngay để ghi nhận điểm xếp hạng!
                                    </span>
                                </p>
                                <button
                                    onClick={() => onNavigate(`/quiz/${selectedQuizId}`)}
                                    className="px-3.5 py-1.5 bg-brand-500 hover:bg-brand-650 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-md shadow-brand-500/20"
                                >
                                    Bắt đầu thi
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
