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
} from "lucide-react";
import { User, OverallLeaderboardEntry } from "../types";
import {
    getOverallLeaderboard,
    refreshOverallLeaderboard,
} from "../lib/supabaseService";
import { motion } from "motion/react";

interface LeaderboardViewProps {
    user: User;
    onNavigate: (path: string) => void;
}

export default function LeaderboardView({
    user,
    onNavigate,
}: LeaderboardViewProps) {
    // Grade states: students are locked to their profile grade (fallback to "10"), teachers default to "10"
    const [activeGrade, setActiveGrade] = useState<string>(() => {
        if (user.role === "student") {
            return user.grade || "10";
        }
        return "10";
    });

    const [overallData, setOverallData] = useState<OverallLeaderboardEntry[]>([]);
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

    useEffect(() => {
        fetchOverallRankings();
    }, [activeGrade]);

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

    // Filter overall data
    const filteredOverall = overallData.filter(
        (entry) =>
            entry.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.studentUsername.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Current User positions
    const myOverallStats = overallData.find((entry) => entry.studentId === user.id);
    const myOverallIndex = overallData.findIndex((entry) => entry.studentId === user.id);
    const nextUserAbove =
        myOverallIndex > 0 ? overallData[myOverallIndex - 1] : null;

    // Render Rank Trend Badge
    const renderTrend = (current: number, previous: number | null) => {
        if (previous === null) {
            return (
                <span className="text-[9px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-950/20 px-1.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                    Mới
                </span>
            );
        }
        const diff = previous - current;
        if (diff > 0) {
            return (
                <span className="flex items-center text-xs font-black text-emerald-600 dark:text-emerald-400">
                    <ChevronUp className="w-3.5 h-3.5 stroke-[3]" />
                    {diff}
                </span>
            );
        } else if (diff < 0) {
            return (
                <span className="flex items-center text-xs font-black text-rose-500">
                    <ChevronDown className="w-3.5 h-3.5 stroke-[3]" />
                    {Math.abs(diff)}
                </span>
            );
        }
        return (
            <span className="flex items-center text-xs text-slate-400">
                <Minus className="w-3.5 h-3.5" />
            </span>
        );
    };

    const top3 = filteredOverall.slice(0, 3);
    const rest = filteredOverall.slice(3);

    const podiumOrder = [
        top3[1] || null, // Hạng 2 (Trái)
        top3[0] || null, // Hạng 1 (Giữa)
        top3[2] || null, // Hạng 3 (Phải)
    ];

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 pb-32 animate-in fade-in duration-200">
            {/* Header vinh danh tối giản & sang trọng */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-150 dark:border-slate-850">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 shadow-xs">
                        <Trophy className="w-6 h-6 stroke-[1.8] animate-pulse" />
                    </div>
                    <div className="space-y-0.5">
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                            Bảng Vinh Danh Học Tập 🏆
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Tôn vinh nỗ lực học tập xuất sắc của các chiến binh lớp {activeGrade}.
                        </p>
                    </div>
                </div>

                {/* Teacher sync button */}
                {user.role === "teacher" && (
                    <button
                        onClick={handleManualRefresh}
                        disabled={refreshing || loading}
                        className="self-start md:self-center px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-250 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50 animate-in fade-in"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                        <span>Đồng bộ dữ liệu bảng xếp hạng</span>
                    </button>
                )}
            </div>

            {/* Bộ lọc khối lớp */}
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
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                    activeGrade === grade.id
                                        ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-md shadow-slate-900/10"
                                        : "bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-400 border-slate-200/70 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800"
                                }`}
                            >
                                {grade.label}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-[#2C5A71]/5 border border-[#2C5A71]/10 px-4 py-2.5 rounded-xl self-start inline-flex items-center gap-2.5 select-none">
                    <span className="w-2 h-2 rounded-full bg-[#2C5A71] animate-pulse"></span>
                    <span className="text-xs font-bold text-[#2C5A71]">
                        Đang xem bảng xếp hạng: Khối {activeGrade} (Mặc định theo lớp học của bạn)
                    </span>
                </div>
            )}

            {/* Tìm kiếm học sinh */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative w-full max-w-xs">
                    <Search className="absolute inset-y-0 left-3.5 flex items-center w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Tìm học sinh theo tên..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200/70 dark:border-slate-850 bg-white dark:bg-slate-900/50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-500/10 focus:border-brand-500 dark:focus:border-brand-400 placeholder:text-slate-400 text-slate-800 dark:text-slate-250 transition-all"
                    />
                </div>
            </div>

            {/* Error view */}
            {error && (
                <div className="p-4 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-start gap-3">
                    <span className="text-rose-500">⚠️</span>
                    <div className="space-y-1">
                        <h4 className="text-xs font-bold text-rose-800 dark:text-rose-400">
                            Không thể tải dữ liệu xếp hạng
                        </h4>
                        <p className="text-[11px] text-rose-650 dark:text-rose-450 leading-relaxed font-medium">
                            {error}
                        </p>
                    </div>
                </div>
            )}

            {/* Loading view */}
            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
                    <span className="text-xs text-slate-450 font-semibold">
                        Đang đồng bộ thứ hạng khối {activeGrade}...
                    </span>
                </div>
            ) : (
                <div className="space-y-10">
                    {/* TOP 3 PODIUM - Thiết kế cao cấp tối giản */}
                    {top3.length > 0 ? (
                        <div className="grid grid-cols-3 items-end max-w-xl mx-auto gap-4 sm:gap-8 pt-8 pb-4 relative select-none">
                            {/* Hạng 2 (Bên trái) */}
                            {podiumOrder[0] && (
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.1 }}
                                    className="flex flex-col items-center text-center group"
                                >
                                    <div className="relative mb-3">
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-slate-300 bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-bold text-lg text-slate-500 shadow-md group-hover:scale-105 transition-transform">
                                            {podiumOrder[0].studentName.charAt(0)}
                                        </div>
                                        <span className="absolute -top-1.5 -right-1 text-xl" title="Hạng 2">🥈</span>
                                    </div>
                                    <div className="space-y-0.5 max-w-full">
                                        <h4 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 truncate">
                                            {podiumOrder[0].studentName}
                                        </h4>
                                        <p className="text-[10px] text-slate-400 truncate">
                                            @{podiumOrder[0].studentUsername}
                                        </p>
                                    </div>
                                    <div className="mt-3.5 w-full bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-2xl p-2.5 flex flex-col items-center justify-center">
                                        <span className="text-[9px] font-black text-slate-450 tracking-wider">HẠNG 2</span>
                                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 mt-0.5">
                                            {podiumOrder[0].totalPoints} điểm
                                        </span>
                                    </div>
                                </motion.div>
                            )}

                            {/* Hạng 1 (Chính giữa - Nổi bật) */}
                            {podiumOrder[1] && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4 }}
                                    className="flex flex-col items-center text-center group relative z-10"
                                >
                                    <div className="relative mb-4">
                                        <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full overflow-hidden border-3 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-center font-black text-xl text-amber-600 dark:text-amber-400 shadow-lg group-hover:scale-105 transition-transform ring-4 ring-amber-400/10">
                                            {podiumOrder[1].studentName.charAt(0)}
                                        </div>
                                        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-2xl animate-bounce" style={{ animationDuration: "2.5s" }} title="Vô địch">👑</span>
                                    </div>
                                    <div className="space-y-0.5 max-w-full">
                                        <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 truncate">
                                            {podiumOrder[1].studentName}
                                        </h4>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold truncate">
                                            @{podiumOrder[1].studentUsername}
                                        </p>
                                    </div>
                                    <div className="mt-3.5 w-full bg-gradient-to-b from-amber-500/10 to-transparent dark:from-amber-500/5 dark:to-transparent border border-amber-400/40 dark:border-amber-900/30 rounded-2xl p-3 flex flex-col items-center justify-center ring-2 ring-amber-400/5">
                                        <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 tracking-widest">🥇 HẠNG 1</span>
                                        <span className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">
                                            {podiumOrder[1].totalPoints} điểm
                                        </span>
                                    </div>
                                </motion.div>
                            )}

                            {/* Hạng 3 (Bên phải) */}
                            {podiumOrder[2] && (
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.2 }}
                                    className="flex flex-col items-center text-center group"
                                >
                                    <div className="relative mb-3">
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-orange-400/80 bg-orange-50/20 dark:bg-orange-950/10 flex items-center justify-center font-bold text-lg text-orange-700 shadow-md group-hover:scale-105 transition-transform">
                                            {podiumOrder[2].studentName.charAt(0)}
                                        </div>
                                        <span className="absolute -top-1.5 -right-1 text-xl" title="Hạng 3">🥉</span>
                                    </div>
                                    <div className="space-y-0.5 max-w-full">
                                        <h4 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 truncate">
                                            {podiumOrder[2].studentName}
                                        </h4>
                                        <p className="text-[10px] text-slate-400 truncate">
                                            @{podiumOrder[2].studentUsername}
                                        </p>
                                    </div>
                                    <div className="mt-3.5 w-full bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-2xl p-2.5 flex flex-col items-center justify-center">
                                        <span className="text-[9px] font-black text-orange-600 tracking-wider">HẠNG 3</span>
                                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 mt-0.5">
                                            {podiumOrder[2].totalPoints} điểm
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    ) : (
                        <div className="py-16 text-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl">
                            Không tìm thấy học sinh nào phù hợp.
                        </div>
                    )}

                    {/* BẢNG XẾP HẠNG CHI TIẾT */}
                    {filteredOverall.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 rounded-2xl overflow-hidden shadow-xs">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/10 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                            <th className="py-4 px-5 w-16 text-center">Thứ hạng</th>
                                            <th className="py-4 px-2 w-16 text-center">Xu hướng</th>
                                            <th className="py-4 px-4">Học sinh</th>
                                            <th className="py-4 px-4 text-center">Khối</th>
                                            <th className="py-4 px-4 text-center">Đề thi đã hoàn thành</th>
                                            <th className="py-4 px-6 text-right">Tổng điểm</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredOverall.map((entry) => {
                                            const isMe = entry.studentId === user.id;
                                            const rank = entry.rankPosition;
                                            const isTop3 = rank <= 3;

                                            return (
                                                <tr
                                                    key={entry.studentId}
                                                    className={`transition-colors font-medium ${
                                                        isMe
                                                            ? "bg-brand-50/20 dark:bg-brand-500/5 font-semibold text-slate-900 dark:text-slate-100 ring-2 ring-inset ring-brand-100/50 dark:ring-brand-500/20"
                                                            : "hover:bg-slate-50/50 dark:hover:bg-slate-850/20 text-slate-650 dark:text-slate-400"
                                                    }`}
                                                >
                                                    {/* Thứ hạng */}
                                                    <td className="py-4 px-5 text-center font-bold text-slate-800 dark:text-slate-250">
                                                        {isTop3 ? (
                                                            <span className="text-sm">
                                                                {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                                                            </span>
                                                        ) : (
                                                            <span>#{rank}</span>
                                                        )}
                                                    </td>

                                                    {/* Xu hướng */}
                                                    <td className="py-4 px-2 text-center">
                                                        {renderTrend(
                                                            entry.rankPosition,
                                                            entry.previousRankPosition
                                                        )}
                                                    </td>

                                                    {/* Tên học sinh */}
                                                    <td className="py-4 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs select-none ${
                                                                isMe 
                                                                    ? "bg-brand-100 text-brand-650 dark:bg-brand-500/20 dark:text-brand-300"
                                                                    : isTop3
                                                                        ? "bg-slate-150 text-slate-655 dark:bg-slate-800 dark:text-slate-350"
                                                                        : "bg-slate-100 text-slate-500 dark:bg-slate-800/40 dark:text-slate-450"
                                                            }`}>
                                                                {entry.studentName.charAt(0)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className={`truncate leading-snug flex items-center gap-1.5 ${isMe ? "text-slate-900 dark:text-slate-100 font-extrabold" : "text-slate-800 dark:text-slate-200"}`}>
                                                                    <span>{entry.studentName}</span>
                                                                    {isMe && (
                                                                        <span className="text-[8px] bg-brand-500 text-white px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider scale-90">
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

                                                    {/* Khối lớp */}
                                                    <td className="py-4 px-4 text-center font-semibold text-slate-500 dark:text-slate-450">
                                                        Lớp {entry.studentGrade || activeGrade}
                                                    </td>

                                                    {/* Số đề thi đã hoàn thành */}
                                                    <td className="py-4 px-4 text-center text-slate-500">
                                                        {entry.testsCompleted} đề thi
                                                    </td>

                                                    {/* Tổng điểm tích lũy */}
                                                    <td className="py-4 px-6 text-right">
                                                        <span className={`font-black text-sm ${
                                                            isMe
                                                                ? "text-brand-600 dark:text-brand-400"
                                                                : isTop3
                                                                    ? "text-slate-900 dark:text-slate-150"
                                                                    : "text-slate-700 dark:text-slate-350"
                                                        }`}>
                                                            {entry.totalPoints} điểm
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
            )}

            {/* Sticky Bottom Bar hiển thị vị trí cá nhân */}
            {!loading && !error && (
                <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-950/90 border-t border-slate-200/60 dark:border-slate-850 backdrop-blur-md py-4 px-6 z-40 shadow-2xl animate-in slide-in-from-bottom duration-300">
                    <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
                        {myOverallStats ? (
                            <>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-brand-500/10 dark:bg-brand-500/20 text-brand-500 dark:text-brand-450 font-extrabold flex items-center justify-center border border-brand-500/20 text-sm shadow-inner select-none">
                                        {myOverallStats.studentName.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 leading-tight">
                                            <span>Hạng của bạn hiện tại:</span>
                                            <span className="text-brand-600 dark:text-brand-400 font-black text-sm">
                                                #{myOverallStats.rankPosition}
                                            </span>
                                            {renderTrend(
                                                myOverallStats.rankPosition,
                                                myOverallStats.previousRankPosition
                                            )}
                                        </h4>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                            Tổng tích lũy:{" "}
                                            <span className="font-extrabold text-slate-700 dark:text-slate-350">
                                                {myOverallStats.totalPoints} điểm
                                            </span>{" "}
                                            | Số bài thi:{" "}
                                            <span className="font-extrabold text-slate-700 dark:text-slate-350">
                                                {myOverallStats.testsCompleted} bài
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    {nextUserAbove ? (
                                        <>
                                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                            <span>
                                                Bạn cần thêm{" "}
                                                <span className="font-black text-brand-600 dark:text-brand-400">
                                                    {Number((nextUserAbove.totalPoints - myOverallStats.totalPoints).toFixed(1))} điểm
                                                </span>{" "}
                                                để vượt hạng học sinh{" "}
                                                <span className="font-bold text-slate-700 dark:text-slate-200">
                                                    {nextUserAbove.studentName}
                                                </span>{" "}
                                                (Hạng #{nextUserAbove.rankPosition})
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-1">
                                            👑 Bạn đang là quán quân của Khối {activeGrade}! Hãy tiếp tục duy trì vị thế nhé!
                                        </span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-3 w-full justify-between">
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                                    <Award className="w-4 h-4 text-slate-400" />
                                    <span>
                                        Bạn chưa có tên trên bảng xếp hạng khối {activeGrade}. Hãy làm bài thi để tích lũy điểm ngay nhé!
                                    </span>
                                </p>
                                <button
                                    onClick={() => onNavigate("/student-quizzes")}
                                    className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-md shadow-brand-500/20"
                                >
                                    Làm bài ngay
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
