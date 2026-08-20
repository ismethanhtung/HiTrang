import React, { useState, useEffect } from "react";
import { User, Quiz, Submission } from "../types";
import { Search, Users, Clock } from "lucide-react";
import { getOverallLeaderboard } from "../lib/supabaseService";

interface AdminStatsStudentsTabProps {
    quizzes: Quiz[];
    userProfiles: User[];
    submissions: Submission[];
    onReviewSubmission: (sub: Submission) => void;
}

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

export default function AdminStatsStudentsTab({
    quizzes,
    userProfiles,
    submissions,
    onReviewSubmission,
}: AdminStatsStudentsTabProps) {
    const [studentSearchQuery, setStudentSearchQuery] = useState("");
    const [selectedGradeFilter, setSelectedGradeFilter] =
        useState<string>("all"); // "all", "10", "11", "12"
    const [selectedStatsStudentId, setSelectedStatsStudentId] = useState<
        string | null
    >(null);
    const [adminStudentHoveredPointIdx, setAdminStudentHoveredPointIdx] =
        useState<number | null>(null);
    const [studentRank, setStudentRank] = useState<{
        rankPosition: number;
        totalUsers: number;
    } | null>(null);

    // Lazy loading state for student navigation list
    const [visibleCount, setVisibleCount] = useState(25);

    const formatTimeFriendly = (secs?: number) => {
        if (secs === undefined || secs === null) return "Chưa rõ";
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        if (mins > 0) {
            return `${mins} phút ${remainingSecs} giây`;
        }
        return `${remainingSecs} giây`;
    };

    const formatDateTimeFriendly = (dateStr?: string) => {
        if (!dateStr) return "Chưa rõ";
        try {
            const d = safeParseDate(dateStr);
            const hours = String(d.getHours()).padStart(2, "0");
            const minutes = String(d.getMinutes()).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const year = d.getFullYear();
            return `Lúc ${hours}:${minutes} ngày ${day}/${month}/${year}`;
        } catch (e) {
            return dateStr;
        }
    };

    // Fetch ranking for selected student
    useEffect(() => {
        const fetchStudentRank = async () => {
            if (!selectedStatsStudentId) {
                setStudentRank(null);
                return;
            }
            const student = userProfiles.find(
                (u) => u.id === selectedStatsStudentId,
            );
            if (!student) return;
            try {
                const grade = student.grade || "10";
                const leaderboard = await getOverallLeaderboard(grade);
                const userEntry = leaderboard.find(
                    (entry) => entry.studentId === student.id,
                );
                if (userEntry) {
                    setStudentRank({
                        rankPosition: userEntry.rankPosition,
                        totalUsers: leaderboard.length,
                    });
                } else {
                    setStudentRank(null);
                }
            } catch (err) {
                console.error("Error fetching student rank:", err);
                setStudentRank(null);
            }
        };
        fetchStudentRank();
    }, [selectedStatsStudentId, submissions, userProfiles]);

    // Reset lazy load counter on filter changes
    useEffect(() => {
        setVisibleCount(25);
    }, [selectedGradeFilter, studentSearchQuery]);

    // Filter students by grade and search query
    const studentsList = userProfiles.filter((u) => {
        // Filter by grade
        if (selectedGradeFilter !== "all" && u.grade !== selectedGradeFilter)
            return false;

        // Filter by search query
        return (
            u.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
            u.username.toLowerCase().includes(studentSearchQuery.toLowerCase())
        );
    });

    // Handle lazy load infinite scrolling on list scroll
    const handleStudentListScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (
            target.scrollHeight - target.scrollTop <=
            target.clientHeight + 50
        ) {
            setVisibleCount((prev) => Math.min(prev + 25, studentsList.length));
        }
    };

    const visibleStudents = studentsList.slice(0, visibleCount);

    return (
        <div className="absolute inset-6 flex flex-col overflow-hidden space-y-6 animate-in fade-in duration-200">
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                .custom-admin-scrollbar::-webkit-scrollbar {
                    width: 5px !important;
                    height: 5px !important;
                    display: block !important;
                }
                .custom-admin-scrollbar::-webkit-scrollbar-track {
                    background: transparent !important;
                }
                .custom-admin-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(156, 163, 175, 0.4) !important;
                    border-radius: 999px !important;
                }
                .custom-admin-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(156, 163, 175, 0.6) !important;
                }
                /* Firefox */
                .custom-admin-scrollbar {
                    scrollbar-width: thin !important;
                    scrollbar-color: rgba(156, 163, 175, 0.4) transparent !important;
                }
            `,
                }}
            />
            {/* Header */}
            <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/60">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">
                        Thống Kê Học Sinh
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Xem tiến trình học tập, lịch sử điểm số, tần suất làm
                        bài và xem chi tiết bài làm của từng học sinh.
                    </p>
                </div>
            </div>

            {/* Flat 3-Column Layout (Borderless & Scroll Locked) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch flex-1 min-h-0 overflow-hidden">
                {/* Column 1 (col-span-3): Student Navigation List with Lazy Load */}
                <div className="md:col-span-3 flex flex-col h-full border-r border-slate-200/60 dark:border-slate-800/60 pr-6 space-y-4 min-h-0 overflow-hidden">
                    {/* Grade Filters */}
                    <div className="flex gap-1.5 flex-wrap flex-shrink-0">
                        {["all", "10", "11", "12"].map((g) => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => setSelectedGradeFilter(g)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all border cursor-pointer ${
                                    selectedGradeFilter === g
                                        ? "bg-brand-100 text-brand-700 border-brand-200 dark:bg-brand-200/20 dark:text-brand-300 dark:border-brand-200/30"
                                        : "bg-transparent text-slate-400 border-slate-200/50 hover:bg-slate-50 dark:hover:bg-slate-800"
                                }`}
                            >
                                {g === "all" ? "Tất cả lớp" : `Lớp ${g}`}
                            </button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative flex-shrink-0">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            placeholder="Tìm học sinh..."
                            value={studentSearchQuery}
                            onChange={(e) =>
                                setStudentSearchQuery(e.target.value)
                            }
                            className="w-full pl-9 pr-3 py-2 bg-slate-200/40 dark:bg-slate-800/40 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-300/30 border-0"
                        />
                    </div>

                    {/* Students List with Infinite Scroll handler */}
                    <div
                        onScroll={handleStudentListScroll}
                        className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0 custom-admin-scrollbar"
                    >
                        {visibleStudents.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-8">
                                Không tìm thấy học sinh nào.
                            </p>
                        ) : (
                            visibleStudents.map((student) => {
                                const isSelected =
                                    selectedStatsStudentId === student.id;
                                const studentSubs = submissions.filter(
                                    (s) => s.studentId === student.id,
                                );

                                return (
                                    <button
                                        key={student.id}
                                        onClick={() => {
                                            setSelectedStatsStudentId(
                                                student.id,
                                            );
                                            setAdminStudentHoveredPointIdx(
                                                null,
                                            );
                                        }}
                                        className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-3 border-0 ${
                                            isSelected
                                                ? "bg-brand-100/60 dark:bg-brand-100/10 text-brand-700 dark:text-brand-300 font-bold"
                                                : "bg-transparent text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-850"
                                        }`}
                                    >
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                                                isSelected
                                                    ? "bg-brand-200 dark:bg-brand-200/20 text-brand-800 dark:text-brand-300"
                                                    : "bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                            }`}
                                        >
                                            {(student.name || "U")
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div
                                                className={`text-xs font-bold truncate ${isSelected ? "text-brand-800 dark:text-brand-300" : "text-slate-900"}`}
                                            >
                                                {student.name}
                                            </div>
                                            <div className="text-[10px] truncate text-slate-400">
                                                {student.role === "admin"
                                                    ? "Admin"
                                                    : `Lớp ${student.grade || "10"}`}{" "}
                                                • @{student.username} •{" "}
                                                {studentSubs.length} bài
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                        {visibleCount < studentsList.length && (
                            <p className="text-[9px] text-slate-400 text-center py-2 font-mono italic">
                                Đang tải thêm...
                            </p>
                        )}
                    </div>
                </div>

                {/* Right Area (col-span-9): Contains Column 2 & Column 3 */}
                {!selectedStatsStudentId ? (
                    <div className="md:col-span-9 h-full flex flex-col items-center justify-center text-center text-slate-400 italic space-y-2 py-12">
                        <Users className="w-8 h-8 text-slate-305" />
                        <p className="text-xs font-medium">
                            Hãy chọn một học sinh từ danh sách bên trái để quan
                            sát kết quả chi tiết.
                        </p>
                    </div>
                ) : (
                    (() => {
                        const student = userProfiles.find(
                            (u) => u.id === selectedStatsStudentId,
                        );
                        if (!student) return null;

                        const studentSubs = submissions
                            .filter((s) => s.studentId === student.id)
                            .sort(
                                (a, b) =>
                                    safeParseDate(b.submittedAt).getTime() -
                                    safeParseDate(a.submittedAt).getTime(),
                            );

                        const completedCount = studentSubs.length;

                        // Calculate training statistics
                        const gradeQuizzes = student.grade
                            ? quizzes.filter(
                                  (q) => !q.grade || q.grade === student.grade,
                              )
                            : quizzes;

                        const totalQuizzes = gradeQuizzes.length;

                        const averageScore =
                            completedCount > 0
                                ? (
                                      studentSubs.reduce(
                                          (acc, curr) => acc + curr.score,
                                          0,
                                      ) / completedCount
                                  ).toFixed(1)
                                : "0.0";

                        const highestScore =
                            completedCount > 0
                                ? Math.max(
                                      ...studentSubs.map((s) => s.score),
                                  ).toFixed(1)
                                : "0.0";

                        // Filter quizzes that are NOT started/completed by student
                        const uncompletedQuizzes = gradeQuizzes.filter(
                            (quiz) => {
                                return !studentSubs.some(
                                    (sub) => sub.quizId === quiz.id,
                                );
                            },
                        );

                        return (
                            <>
                                {/* Column 2 (col-span-4): Stats & Charts Sidebar (Centered, exactly mirroring Student Dashboard width: 1/3) */}
                                <div className="md:col-span-4 space-y-8 pr-6 border-r border-slate-200/60 dark:border-slate-800/60 h-full overflow-y-auto pb-8 min-w-0 custom-admin-scrollbar">
                                    {/* Student Header */}
                                    <div className="flex items-center gap-4 pb-6 border-b border-slate-200/60 dark:border-slate-800/60 flex-shrink-0">
                                        <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-200 dark:text-slate-900 flex items-center justify-center font-bold text-base flex-shrink-0">
                                            {student.name
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>
                                        <div className="space-y-0.5 min-w-0">
                                            <h3 className="text-base font-black text-slate-900 truncate">
                                                {student.name}
                                            </h3>
                                            <p className="text-[11px] text-slate-400 font-medium truncate">
                                                {student.role === "admin"
                                                    ? "Admin"
                                                    : `Lớp ${student.grade || "10"}`}{" "}
                                                • @{student.username}
                                            </p>
                                            {student.plan && (
                                                <span
                                                    className={`inline-block text-[8px] font-bold px-2 py-0.5 rounded-full mt-1 border uppercase tracking-wider ${
                                                        student.plan === "vip"
                                                            ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-50/10 dark:text-amber-300 dark:border-amber-100/20"
                                                            : student.plan ===
                                                                "basic"
                                                              ? "bg-brand-50 text-brand-700 border-brand-100 dark:bg-brand-50/10 dark:text-brand-300 dark:border-brand-100/20"
                                                              : "bg-slate-100 text-slate-500 border-slate-100"
                                                    }`}
                                                >
                                                    {student.plan}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* 1. Lịch sử điểm số */}
                                    <div className="space-y-2 text-left">
                                        <h3 className="text-xs font-black text-slate-450 uppercase tracking-wider border-b border-slate-200/60 pb-2">
                                            Lịch sử điểm số
                                        </h3>
                                        <div className="w-full relative pt-2">
                                            {(() => {
                                                const chartPointsData = [
                                                    ...studentSubs,
                                                ]
                                                    .reverse()
                                                    .slice(-7)
                                                    .map((sub, i) => ({
                                                        day: `Đề ${i + 1}`,
                                                        score: Number(
                                                            sub.score,
                                                        ),
                                                        quizTitle:
                                                            sub.quizTitle,
                                                        submittedAt:
                                                            sub.submittedAt,
                                                    }));

                                                const width = 500;
                                                const height = 200;
                                                const maxVal = 10;
                                                const paddingLeft = 4;
                                                const paddingRight = 4;
                                                const paddingTop = 16;
                                                const paddingBottom = 16;

                                                const getBarPath = (
                                                    x: number,
                                                    y: number,
                                                    w: number,
                                                    h: number,
                                                    r: number,
                                                ) => {
                                                    const realR = Math.min(
                                                        r,
                                                        h,
                                                        w / 2,
                                                    );
                                                    if (realR <= 0) {
                                                        return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
                                                    }
                                                    return `M ${x} ${y + h} L ${x} ${y + realR} A ${realR} ${realR} 0 0 1 ${x + realR} ${y} L ${x + w - realR} ${y} A ${realR} ${realR} 0 0 1 ${x + w} ${y + realR} L ${x + w} ${y + h} Z`;
                                                };

                                                const getBarGradient = (
                                                    score: number,
                                                ) => {
                                                    if (score >= 8)
                                                        return "url(#admin-chart-bar-grad-green)";
                                                    if (score >= 5)
                                                        return "url(#admin-chart-bar-grad-amber)";
                                                    return "url(#admin-chart-bar-grad-red)";
                                                };

                                                const getTextColor = (
                                                    score: number,
                                                ) => {
                                                    if (score >= 8)
                                                        return "#10B981";
                                                    if (score >= 5)
                                                        return "#D97706";
                                                    return "#EF4444";
                                                };

                                                const usableWidth =
                                                    width -
                                                    paddingLeft -
                                                    paddingRight;
                                                const usableHeight =
                                                    height -
                                                    paddingTop -
                                                    paddingBottom;
                                                const count =
                                                    chartPointsData.length;

                                                const points =
                                                    chartPointsData.map(
                                                        (p, i) => {
                                                            const colWidth =
                                                                usableWidth /
                                                                count;
                                                            const barWidth =
                                                                Math.min(
                                                                    22,
                                                                    colWidth *
                                                                        0.6,
                                                                );
                                                            const barX =
                                                                paddingLeft +
                                                                i * colWidth +
                                                                (colWidth -
                                                                    barWidth) /
                                                                    2;
                                                            const barHeight =
                                                                (p.score /
                                                                    maxVal) *
                                                                usableHeight;
                                                            const y =
                                                                paddingTop +
                                                                usableHeight -
                                                                barHeight;
                                                            const x =
                                                                barX +
                                                                barWidth / 2;
                                                            return {
                                                                x,
                                                                y,
                                                                barX,
                                                                barWidth,
                                                                barHeight,
                                                                score: p.score,
                                                                day: p.day,
                                                            };
                                                        },
                                                    );

                                                const formatDate = (
                                                    dateStr?: string,
                                                ) => {
                                                    if (!dateStr) return "";
                                                    try {
                                                        const d =
                                                            safeParseDate(
                                                                dateStr,
                                                            );
                                                        const day = String(
                                                            d.getDate(),
                                                        ).padStart(2, "0");
                                                        const month = String(
                                                            d.getMonth() + 1,
                                                        ).padStart(2, "0");
                                                        const year =
                                                            d.getFullYear();
                                                        return `${day}/${month}/${year}`;
                                                    } catch (e) {
                                                        return "";
                                                    }
                                                };

                                                return (
                                                    <div className="w-full relative">
                                                        {completedCount ===
                                                        0 ? (
                                                            <div className="py-8 flex items-center justify-center text-slate-400 text-xs italic">
                                                                Chưa có lịch sử
                                                                điểm số 🌸
                                                            </div>
                                                        ) : (
                                                            <svg
                                                                viewBox={`0 0 ${width} ${height}`}
                                                                className="w-full h-auto"
                                                            >
                                                                <defs>
                                                                    <linearGradient
                                                                        id="admin-chart-bar-grad-green"
                                                                        x1="0"
                                                                        y1="0"
                                                                        x2="0"
                                                                        y2="1"
                                                                    >
                                                                        <stop
                                                                            offset="0%"
                                                                            stopColor="#10B981"
                                                                            stopOpacity="0.7"
                                                                        />
                                                                        <stop
                                                                            offset="100%"
                                                                            stopColor="#34D399"
                                                                            stopOpacity="0.2"
                                                                        />
                                                                    </linearGradient>
                                                                    <linearGradient
                                                                        id="admin-chart-bar-grad-amber"
                                                                        x1="0"
                                                                        y1="0"
                                                                        x2="0"
                                                                        y2="1"
                                                                    >
                                                                        <stop
                                                                            offset="0%"
                                                                            stopColor="#F59E0B"
                                                                            stopOpacity="0.7"
                                                                        />
                                                                        <stop
                                                                            offset="100%"
                                                                            stopColor="#FBBF24"
                                                                            stopOpacity="0.2"
                                                                        />
                                                                    </linearGradient>
                                                                    <linearGradient
                                                                        id="admin-chart-bar-grad-red"
                                                                        x1="0"
                                                                        y1="0"
                                                                        x2="0"
                                                                        y2="1"
                                                                    >
                                                                        <stop
                                                                            offset="0%"
                                                                            stopColor="#EF4444"
                                                                            stopOpacity="0.7"
                                                                        />
                                                                        <stop
                                                                            offset="100%"
                                                                            stopColor="#F87171"
                                                                            stopOpacity="0.2"
                                                                        />
                                                                    </linearGradient>
                                                                </defs>

                                                                {/* Horizontal guide lines */}
                                                                <line
                                                                    x1={
                                                                        paddingLeft
                                                                    }
                                                                    y1={
                                                                        paddingTop
                                                                    }
                                                                    x2={
                                                                        width -
                                                                        paddingRight
                                                                    }
                                                                    y2={
                                                                        paddingTop
                                                                    }
                                                                    stroke="#E2E8F0"
                                                                    strokeWidth="0.8"
                                                                    strokeDasharray="3,3"
                                                                    className="dark:stroke-slate-800"
                                                                />
                                                                <line
                                                                    x1={
                                                                        paddingLeft
                                                                    }
                                                                    y1={
                                                                        paddingTop +
                                                                        usableHeight /
                                                                            2
                                                                    }
                                                                    x2={
                                                                        width -
                                                                        paddingRight
                                                                    }
                                                                    y2={
                                                                        paddingTop +
                                                                        usableHeight /
                                                                            2
                                                                    }
                                                                    stroke="#E2E8F0"
                                                                    strokeWidth="0.8"
                                                                    strokeDasharray="3,3"
                                                                    className="dark:stroke-slate-800"
                                                                />
                                                                <line
                                                                    x1={
                                                                        paddingLeft
                                                                    }
                                                                    y1={
                                                                        paddingTop +
                                                                        usableHeight
                                                                    }
                                                                    x2={
                                                                        width -
                                                                        paddingRight
                                                                    }
                                                                    y2={
                                                                        paddingTop +
                                                                        usableHeight
                                                                    }
                                                                    stroke="#CBD5E1"
                                                                    strokeWidth="1"
                                                                    className="dark:stroke-slate-700"
                                                                />

                                                                {points.map(
                                                                    (p, i) => {
                                                                        const isHovered =
                                                                            adminStudentHoveredPointIdx ===
                                                                            i;
                                                                        const isLast =
                                                                            i ===
                                                                            points.length -
                                                                                1;
                                                                        const showLabel =
                                                                            isHovered ||
                                                                            (adminStudentHoveredPointIdx ===
                                                                                null &&
                                                                                isLast);

                                                                        return (
                                                                            <g
                                                                                key={
                                                                                    i
                                                                                }
                                                                            >
                                                                                {/* Background track (full 10 points) */}
                                                                                <path
                                                                                    d={getBarPath(
                                                                                        p.barX,
                                                                                        paddingTop,
                                                                                        p.barWidth,
                                                                                        usableHeight,
                                                                                        3,
                                                                                    )}
                                                                                    fill="currentColor"
                                                                                    className="text-slate-200/40 dark:text-slate-800/40 transition-colors duration-200"
                                                                                />
                                                                                {/* Active score bar */}
                                                                                {p.barHeight >
                                                                                    0 && (
                                                                                    <path
                                                                                        d={getBarPath(
                                                                                            p.barX,
                                                                                            p.y,
                                                                                            p.barWidth,
                                                                                            p.barHeight,
                                                                                            3,
                                                                                        )}
                                                                                        fill={getBarGradient(
                                                                                            p.score,
                                                                                        )}
                                                                                        className="transition-all duration-150"
                                                                                    />
                                                                                )}
                                                                                {/* Score label text on top of the bar */}
                                                                                {showLabel && (
                                                                                    <text
                                                                                        x={
                                                                                            p.x
                                                                                        }
                                                                                        y={
                                                                                            p.y -
                                                                                            4
                                                                                        }
                                                                                        textAnchor="middle"
                                                                                        className="text-[9px] font-black font-mono select-none"
                                                                                        fill={getTextColor(
                                                                                            p.score,
                                                                                        )}
                                                                                    >
                                                                                        {
                                                                                            p.score
                                                                                        }
                                                                                    </text>
                                                                                )}
                                                                                {/* Interactive hover area */}
                                                                                <rect
                                                                                    x={
                                                                                        p.barX -
                                                                                        4
                                                                                    }
                                                                                    y={
                                                                                        paddingTop
                                                                                    }
                                                                                    width={
                                                                                        p.barWidth +
                                                                                        8
                                                                                    }
                                                                                    height={
                                                                                        usableHeight
                                                                                    }
                                                                                    fill="transparent"
                                                                                    className="cursor-pointer"
                                                                                    onMouseEnter={() =>
                                                                                        setAdminStudentHoveredPointIdx(
                                                                                            i,
                                                                                        )
                                                                                    }
                                                                                    onMouseLeave={() =>
                                                                                        setAdminStudentHoveredPointIdx(
                                                                                            null,
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </g>
                                                                        );
                                                                    },
                                                                )}
                                                            </svg>
                                                        )}

                                                        {adminStudentHoveredPointIdx !==
                                                            null &&
                                                            points[
                                                                adminStudentHoveredPointIdx
                                                            ] &&
                                                            chartPointsData[
                                                                adminStudentHoveredPointIdx
                                                            ] && (
                                                                <div
                                                                    className="absolute bg-white border border-slate-200/80 text-slate-800 p-2.5 rounded-xl shadow-lg pointer-events-none transition-all duration-150 animate-in fade-in-50 zoom-in-95 z-30 select-none text-left min-w-[140px] dark:bg-[#27374D] dark:border-slate-700 dark:text-slate-200"
                                                                    style={{
                                                                        left: `${(points[adminStudentHoveredPointIdx].x / width) * 100}%`,
                                                                        top: `${(points[adminStudentHoveredPointIdx].y / height) * 100}%`,
                                                                        transform:
                                                                            "translate(-50%, -115%)",
                                                                    }}
                                                                >
                                                                    <div className="text-[8px] font-bold text-slate-400 dark:text-slate-500 leading-none mb-1 font-mono">
                                                                        {formatDate(
                                                                            chartPointsData[
                                                                                adminStudentHoveredPointIdx
                                                                            ]
                                                                                .submittedAt,
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[9px] font-black text-slate-800 dark:text-slate-100 truncate max-w-[130px] mb-1 font-sans">
                                                                        {
                                                                            chartPointsData[
                                                                                adminStudentHoveredPointIdx
                                                                            ]
                                                                                .quizTitle
                                                                        }
                                                                    </div>
                                                                    <div
                                                                        className="flex items-center gap-1 mt-0.5 text-[9px] font-bold font-mono"
                                                                        style={{
                                                                            color: getTextColor(
                                                                                points[
                                                                                    adminStudentHoveredPointIdx
                                                                                ]
                                                                                    .score,
                                                                            ),
                                                                        }}
                                                                    >
                                                                        <span
                                                                            className="w-1.5 h-1.5 rounded-full animate-pulse"
                                                                            style={{
                                                                                backgroundColor:
                                                                                    getTextColor(
                                                                                        points[
                                                                                            adminStudentHoveredPointIdx
                                                                                        ]
                                                                                            .score,
                                                                                    ),
                                                                            }}
                                                                        ></span>
                                                                        <span>
                                                                            Điểm:{" "}
                                                                            {
                                                                                points[
                                                                                    adminStudentHoveredPointIdx
                                                                                ]
                                                                                    .score
                                                                            }
                                                                            /10đ
                                                                        </span>
                                                                    </div>
                                                                    <div className="absolute top-[100%] left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-white dark:bg-[#27374D] border-b border-r border-slate-200/80 dark:border-slate-700 rotate-45" />
                                                                </div>
                                                            )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="border-b border-slate-200/60 dark:border-slate-800/60" />

                                    {/* 2. Tần suất hoạt động & Xếp hạng song song */}
                                    <div className="grid grid-cols-2 gap-x-4 w-full">
                                        {/* Left Box: Activity calendar */}
                                        <div className="w-full text-left flex flex-col gap-2.5">
                                            <h4 className="text-[10px] font-black text-slate-450 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/80 pb-1.5 font-sans">
                                                Tần suất làm bài
                                            </h4>
                                            <div className="py-1">
                                                {(() => {
                                                    const streak = (() => {
                                                        let count = 0;
                                                        const checkDate = new Date();
                                                        checkDate.setHours(0, 0, 0, 0);

                                                        const studentSubDateStrings = new Set(
                                                            studentSubs.map((s) => safeParseDate(s.submittedAt).toDateString())
                                                        );

                                                        const hasToday = studentSubDateStrings.has(checkDate.toDateString());
                                                        const yesterday = new Date(checkDate);
                                                        yesterday.setDate(checkDate.getDate() - 1);
                                                        const hasYesterday = studentSubDateStrings.has(yesterday.toDateString());

                                                        if (!hasToday && !hasYesterday) {
                                                            return 0;
                                                        }

                                                        let current = hasToday ? checkDate : yesterday;
                                                        while (studentSubDateStrings.has(current.toDateString())) {
                                                            count++;
                                                            current.setDate(current.getDate() - 1);
                                                        }
                                                        return count;
                                                    })();

                                                    const today = new Date();
                                                    today.setHours(
                                                        23,
                                                        59,
                                                        59,
                                                        999,
                                                    );
                                                    const daysList = [];
                                                    for (
                                                        let k = 29;
                                                        k >= 0;
                                                        k--
                                                    ) {
                                                        const d = new Date(
                                                            today,
                                                        );
                                                        d.setDate(
                                                            today.getDate() - k,
                                                        );
                                                        const dStr =
                                                            d.toDateString();
                                                        const count =
                                                            studentSubs.filter(
                                                                (s) => {
                                                                    return (
                                                                        safeParseDate(
                                                                            s.submittedAt,
                                                                        ).toDateString() ===
                                                                        dStr
                                                                    );
                                                                },
                                                            ).length;
                                                        daysList.push({
                                                            date: d,
                                                            count,
                                                        });
                                                    }

                                                    const startDayOfWeek =
                                                        (daysList[0].date.getDay() +
                                                            6) %
                                                        7;

                                                    const formatDateLabel = (
                                                        d: Date,
                                                    ) => {
                                                        const day = String(
                                                            d.getDate(),
                                                        ).padStart(2, "0");
                                                        const month = String(
                                                            d.getMonth() + 1,
                                                        ).padStart(2, "0");
                                                        return `${day}/${month}`;
                                                    };

                                                    const weekHeaders = [
                                                        "T2",
                                                        "T3",
                                                        "T4",
                                                        "T5",
                                                        "T6",
                                                        "T7",
                                                        "CN",
                                                    ];

                                                    return (
                                                        <div className="w-full max-w-[140px] flex flex-col gap-2">
                                                            {streak > 0 && (
                                                                <div className="flex items-center gap-1 text-[9px] text-orange-600 dark:text-orange-400 font-bold mb-1">
                                                                    <span>🔥 Chuỗi:</span>
                                                                    <span className="font-extrabold font-mono">{streak} ngày</span>
                                                                </div>
                                                            )}
                                                            {/* Headers */}
                                                            <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-bold text-slate-400 mb-1 w-full">
                                                                {weekHeaders.map(
                                                                    (h) => (
                                                                        <div
                                                                            key={
                                                                                h
                                                                            }
                                                                            className="w-full text-center font-sans"
                                                                        >
                                                                            {h}
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                            {/* Grid */}
                                                            <div className="grid grid-cols-7 gap-1 w-full">
                                                                {Array.from({
                                                                    length: startDayOfWeek,
                                                                }).map(
                                                                    (_, i) => (
                                                                        <div
                                                                            key={`empty-${i}`}
                                                                            className="w-full h-3 flex justify-center items-center"
                                                                        />
                                                                    ),
                                                                )}
                                                                {daysList.map(
                                                                    (
                                                                        dayInfo,
                                                                        idx,
                                                                    ) => {
                                                                        let colorClass =
                                                                            "bg-slate-200 dark:bg-slate-800 text-slate-400";
                                                                        if (
                                                                            dayInfo.count ===
                                                                            1
                                                                        ) {
                                                                            colorClass =
                                                                                "bg-[#A7F3D0] dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300";
                                                                        } else if (
                                                                            dayInfo.count ===
                                                                            2
                                                                        ) {
                                                                            colorClass =
                                                                                "bg-[#34D399] dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-200";
                                                                        } else if (
                                                                            dayInfo.count >=
                                                                            3
                                                                        ) {
                                                                            colorClass =
                                                                                "bg-[#059669] dark:bg-emerald-750 text-white";
                                                                        }

                                                                        const tooltipText = `${formatDateLabel(dayInfo.date)}: ${dayInfo.count} bài làm`;

                                                                        return (
                                                                            <div
                                                                                key={
                                                                                    idx
                                                                                }
                                                                                className="w-full h-3 flex justify-center items-center"
                                                                            >
                                                                                <div
                                                                                    className={`w-3 h-3 rounded-full transition-all cursor-pointer hover:scale-125 relative group ${colorClass}`}
                                                                                >
                                                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-900 text-white text-[8px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-50 font-mono">
                                                                                        {
                                                                                            tooltipText
                                                                                        }
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    },
                                                                )}
                                                            </div>
                                                            {/* Legend */}
                                                            <div className="flex items-center gap-1 text-[8px] text-slate-400 self-start mt-1 font-sans">
                                                                <span>Ít</span>
                                                                <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800" />
                                                                <div className="w-2 h-2 rounded-full bg-[#A7F3D0] dark:bg-emerald-950/40" />
                                                                <div className="w-2 h-2 rounded-full bg-[#34D399] dark:bg-emerald-900/60" />
                                                                <div className="w-2 h-2 rounded-full bg-[#059669] dark:bg-emerald-750" />
                                                                <span>
                                                                    Nhiều
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {/* Right Box: Ranking stats */}
                                        <div className="w-full text-left flex flex-col gap-2.5 pl-4 border-l border-slate-200/60 dark:border-slate-800">
                                            <h4 className="text-[10px] font-black text-slate-450 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/80 pb-1.5 font-sans">
                                                Xếp hạng
                                            </h4>
                                            <div className="flex-1 flex flex-col justify-center text-left py-1">
                                                {studentRank ? (
                                                    <div className="space-y-1 font-sans">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                                            Khối lớp{" "}
                                                            {student.grade ||
                                                                "10"}
                                                        </span>
                                                        <span className="text-2xl font-black text-slate-800 dark:text-slate-200 block font-mono">
                                                            #
                                                            {
                                                                studentRank.rankPosition
                                                            }
                                                        </span>
                                                        <span className="text-[9px] font-bold text-slate-400 block">
                                                            trên{" "}
                                                            {
                                                                studentRank.totalUsers
                                                            }{" "}
                                                            học sinh
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1 font-sans">
                                                        <span className="text-xs italic text-slate-400 block font-medium">
                                                            Chưa xếp hạng
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 leading-tight block">
                                                            Làm bài thi để bắt
                                                            đầu!
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="border-b border-slate-200/60 dark:border-slate-800/60" />

                                    {/* 3. Chỉ số rèn luyện */}
                                    <div className="space-y-4 text-left">
                                        <h3 className="text-xs font-black text-slate-450 uppercase tracking-wider border-b border-slate-200/60 pb-2">
                                            Chỉ số rèn luyện
                                        </h3>
                                        <div className="grid grid-cols-2 gap-y-6 gap-x-4 pt-2">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                    Tổng số đề thi
                                                </span>
                                                <span className="text-xl font-black text-slate-800 dark:text-slate-200 block font-mono">
                                                    {totalQuizzes}
                                                </span>
                                            </div>
                                            <div className="space-y-1 pl-4 border-l border-slate-200/60">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                    Lượt làm
                                                </span>
                                                <span className="text-xl font-black text-slate-800 dark:text-slate-200 block font-mono">
                                                    {completedCount}
                                                </span>
                                            </div>
                                            <div className="space-y-1 border-t border-slate-200/60 pt-4">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                    Điểm trung bình
                                                </span>
                                                <span className="text-xl font-black text-slate-800 dark:text-slate-200 block font-mono">
                                                    {averageScore}
                                                </span>
                                            </div>
                                            <div className="space-y-1 pl-4 border-l border-slate-200/60 border-t border-slate-200/60 pt-4">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                    Điểm cao nhất
                                                </span>
                                                <span className="text-xl font-black text-[#3B6D85] dark:text-brand-300 block font-mono">
                                                    {highestScore}/10
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Column 3 (col-span-5): Quizzes & Submissions Feed (Split 50/50 vertically and scroll locked) */}
                                <div className="md:col-span-5 flex flex-col h-full pl-2 min-h-0 overflow-hidden pb-4">
                                    {/* 1. Nhật ký bài thi đã làm (Top half, 50% height) */}
                                    <div className="flex-1 flex flex-col min-h-0 pb-4">
                                        <h4 className="flex-shrink-0 text-xs font-black text-slate-450 uppercase tracking-wider border-b border-slate-200/60 pb-2 font-sans mb-3">
                                            Nhật ký bài thi đã làm (
                                            {studentSubs.length})
                                        </h4>
                                        <div className="flex-1 overflow-y-auto space-y-5 pr-1.5 min-h-0 custom-admin-scrollbar">
                                            {studentSubs.map((sub) => {
                                                let scoreColor =
                                                    "bg-rose-50 text-rose-700 border border-rose-100";
                                                if (sub.score >= 8) {
                                                    scoreColor =
                                                        "bg-emerald-50 text-emerald-700 border border-emerald-100";
                                                } else if (sub.score >= 5) {
                                                    scoreColor =
                                                        "bg-amber-50 text-amber-700 border border-amber-100";
                                                }

                                                return (
                                                    <div
                                                        key={sub.id}
                                                        className="group flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-200/50 dark:border-slate-800/40 last:border-0 last:pb-0 gap-4 text-left transition-all"
                                                    >
                                                        <div className="space-y-1.5 flex-1 w-full">
                                                            <div className="text-[13px] font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-[#3B6D85] dark:group-hover:text-brand-300 transition-colors leading-snug font-sans">
                                                                {sub.quizTitle}
                                                            </div>
                                                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-slate-400 font-bold font-mono">
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                                    {formatDateTimeFriendly(
                                                                        sub.submittedAt,
                                                                    )}
                                                                </span>
                                                                {sub.timeSpent !==
                                                                    undefined && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                                        Thời
                                                                        gian
                                                                        làm:{" "}
                                                                        {formatTimeFriendly(
                                                                            sub.timeSpent,
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between md:justify-end gap-5 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100/50">
                                                            <span
                                                                className={`px-3 py-1 rounded-full text-[10px] font-extrabold font-mono ${scoreColor}`}
                                                            >
                                                                {sub.score} / 10
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    onReviewSubmission(
                                                                        sub,
                                                                    )
                                                                }
                                                                className="px-4 py-1.5 bg-[#3B6D85] hover:bg-[#2C5A71] text-white text-[11px] font-black rounded-lg transition-all cursor-pointer shadow-sm active:scale-97 flex items-center gap-0.5 shrink-0"
                                                            >
                                                                Xem chi tiết
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {completedCount === 0 && (
                                                <p className="text-xs text-slate-400 italic py-4">
                                                    Học sinh chưa thực hiện bài
                                                    thi nào.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* 2. Đề thi chưa làm (Bottom half, 50% height) */}
                                    <div className="flex-1 flex flex-col min-h-0 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
                                        <h4 className="flex-shrink-0 text-xs font-black text-slate-450 uppercase tracking-wider border-b border-slate-200/60 pb-2 font-sans mb-3">
                                            Đề thi chưa làm (
                                            {uncompletedQuizzes.length})
                                        </h4>
                                        <div className="flex-1 overflow-y-auto space-y-5 pr-1.5 min-h-0 custom-admin-scrollbar">
                                            {uncompletedQuizzes.map((quiz) => {
                                                const sectionCount =
                                                    quiz.scoringConfig?.sections
                                                        ?.length ||
                                                    new Set(
                                                        quiz.questions
                                                            .map(
                                                                (q) =>
                                                                    q.sectionTitle,
                                                            )
                                                            .filter(Boolean),
                                                    ).size ||
                                                    1;

                                                const formattedDate = (() => {
                                                    if (!quiz.createdAt)
                                                        return "Chưa rõ";
                                                    const dateParts =
                                                        quiz.createdAt.split(
                                                            "-",
                                                        );
                                                    if (
                                                        dateParts.length === 3
                                                    ) {
                                                        return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                                                    }
                                                    return quiz.createdAt;
                                                })();

                                                return (
                                                    <div
                                                        key={quiz.id}
                                                        className="group flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-200/50 dark:border-slate-800/40 last:border-0 last:pb-0 gap-4 text-left transition-all"
                                                    >
                                                        <div className="space-y-1.5 flex-1 w-full">
                                                            <div className="text-[13px] font-extrabold text-slate-800 dark:text-slate-200 leading-snug font-sans">
                                                                {quiz.title}
                                                            </div>
                                                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-slate-400 font-bold font-mono">
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                                    {
                                                                        quiz.duration
                                                                    }{" "}
                                                                    phút
                                                                </span>
                                                                <span>•</span>
                                                                <span>
                                                                    {
                                                                        quiz
                                                                            .questions
                                                                            .length
                                                                    }{" "}
                                                                    câu hỏi
                                                                </span>
                                                                <span>•</span>
                                                                <span>
                                                                    {
                                                                        sectionCount
                                                                    }{" "}
                                                                    phần
                                                                </span>
                                                                <span>•</span>
                                                                <span className="font-sans">
                                                                    Ngày:{" "}
                                                                    {
                                                                        formattedDate
                                                                    }
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between md:justify-end gap-5 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100/50">
                                                            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold font-mono bg-amber-50 text-amber-700 border border-amber-100">
                                                                ○ Chưa làm
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {uncompletedQuizzes.length ===
                                                0 && (
                                                <p className="text-xs text-slate-400 italic py-4">
                                                    Đã hoàn thành xuất sắc tất
                                                    cả đề thi! 🌸
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        );
                    })()
                )}
            </div>
        </div>
    );
}
