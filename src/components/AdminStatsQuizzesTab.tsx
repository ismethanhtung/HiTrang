import React, { useState, useMemo, useEffect } from "react";
import { Quiz, Submission } from "../types";
import { BarChart3, Search, X, ChevronLeft, ChevronRight } from "lucide-react";

interface AdminStatsQuizzesTabProps {
    quizzes: Quiz[];
    submissions: Submission[];
    onReviewSubmission: (sub: Submission) => void;
}

const SORT_OPTIONS = [
    { value: "newest", label: "Mới nhất" },
    { value: "oldest", label: "Cũ nhất" },
    { value: "submissions", label: "Lượt làm nhiều nhất" },
    { value: "avgScore", label: "Điểm TB cao nhất" },
    { value: "highestScore", label: "Điểm cao nhất" },
];

const GRADE_OPTIONS = ["8", "9", "10", "11", "12"];

export default function AdminStatsQuizzesTab({
    quizzes,
    submissions,
    onReviewSubmission,
}: AdminStatsQuizzesTabProps) {
    const [search, setSearch] = useState("");
    const [filterGrade, setFilterGrade] = useState("all");
    const [sortBy, setSortBy] = useState<
        "newest" | "oldest" | "submissions" | "avgScore" | "highestScore"
    >("newest");
    const [selectedQuizForDetails, setSelectedQuizForDetails] =
        useState<Quiz | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [subPage, setSubPage] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterGrade, sortBy]);

    useEffect(() => {
        setSubPage(1);
    }, [selectedQuizForDetails]);

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
    };

    const statsQuizzesData = useMemo(
        () =>
            quizzes.map((quiz, idx) => {
                const quizSubmissions = submissions.filter(
                    (s) => s.quizId === quiz.id,
                );
                const count = quizSubmissions.length;
                const avg =
                    count > 0
                        ? Number(
                              (
                                  quizSubmissions.reduce(
                                      (acc, curr) => acc + curr.score,
                                      0,
                                  ) / count
                              ).toFixed(1),
                          )
                        : 0;

                let maxScore = 0;
                let maxScorer = "-";
                if (count > 0) {
                    const sortedSubs = [...quizSubmissions].sort(
                        (a, b) => b.score - a.score,
                    );
                    maxScore = sortedSubs[0].score;
                    maxScorer = sortedSubs[0].studentName;
                }

                return {
                    id: quiz.id,
                    title: quiz.title,
                    subject: quiz.subject,
                    grade: quiz.grade || "-",
                    questionsCount: quiz.questions.length,
                    submissionsCount: count,
                    avgScore: avg,
                    highestScore: maxScore,
                    highestScorerName: maxScorer,
                    createdOrder: idx,
                };
            }),
        [quizzes, submissions],
    );

    const filtered = useMemo(() => {
        let result = [...statsQuizzesData];

        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(
                (d) =>
                    d.title.toLowerCase().includes(q) ||
                    d.subject.toLowerCase().includes(q),
            );
        }

        if (filterGrade !== "all") {
            result = result.filter((d) => d.grade === filterGrade);
        }

        result.sort((a, b) => {
            if (sortBy === "newest") return b.createdOrder - a.createdOrder;
            if (sortBy === "oldest") return a.createdOrder - b.createdOrder;
            if (sortBy === "submissions")
                return b.submissionsCount - a.submissionsCount;
            if (sortBy === "avgScore") return b.avgScore - a.avgScore;
            if (sortBy === "highestScore")
                return b.highestScore - a.highestScore;
            return 0;
        });

        return result;
    }, [statsQuizzesData, search, filterGrade, sortBy]);

    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginatedQuizzes = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, currentPage, pageSize]);

    return (
        <div className="space-y-5 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-border-primary/60">
                <div>
                    <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                        Thống Kê Đề Thi
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Thống kê điểm số trung bình, cao nhất và số lượng người
                        tham gia từng đề thi.
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Ô tìm kiếm */}
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Tìm đề thi, môn học..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-8.5 pr-3 py-2 bg-slate-100 border-0 rounded-lg text-xs font-semibold placeholder:text-slate-400 focus:outline-none"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Lọc lớp */}
                <select
                    value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value)}
                    className="px-3 py-2 bg-slate-100 border-0 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                    <option value="all">Tất cả lớp</option>
                    {GRADE_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                            Lớp {g}
                        </option>
                    ))}
                </select>

                {/* Sắp xếp */}
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 bg-slate-100 border-0 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                    {SORT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>

                <span className="text-xs text-slate-400 font-semibold ml-auto">
                    {filtered.length} đề thi
                </span>
            </div>

            {/* Table */}
            <div className="bg-bg-card overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-border-primary/50 bg-slate-50/30 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                <th className="px-4 py-3">Đề thi</th>
                                <th className="px-4 py-3">Môn học</th>
                                <th className="px-4 py-3 text-center">Lớp</th>
                                <th className="px-4 py-3 text-center">
                                    Số câu
                                </th>
                                <th className="px-4 py-3 text-center">
                                    Lượt làm
                                </th>
                                <th className="px-4 py-3 text-center">
                                    Điểm TB
                                </th>
                                <th className="px-4 py-3 text-center">
                                    Điểm cao nhất
                                </th>
                                <th className="px-4 py-3">Người cao nhất</th>
                                <th className="px-4 py-3 text-center">
                                    Hành động
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-primary/40 font-semibold text-text-secondary">
                            {paginatedQuizzes.map((quizData) => (
                                <tr
                                    key={quizData.id}
                                    className="hover:bg-slate-50/50 transition-colors"
                                >
                                    <td className="px-4 py-3 font-bold text-text-primary max-w-[220px]">
                                        <span className="line-clamp-2">
                                            {quizData.title}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold">
                                            {quizData.subject}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {quizData.grade !== "-" ? (
                                            <span className="bg-brand-50 text-brand-600 px-2 py-0.5 rounded text-[10px] font-bold">
                                                Lớp {quizData.grade}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">
                                                —
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center text-slate-600">
                                        {quizData.questionsCount}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span
                                            className={`font-bold ${quizData.submissionsCount > 0 ? "text-text-primary" : "text-slate-400"}`}
                                        >
                                            {quizData.submissionsCount > 0
                                                ? quizData.submissionsCount
                                                : "—"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                quizData.avgScore >= 8
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : quizData.avgScore >= 5
                                                      ? "bg-amber-50 text-amber-700"
                                                      : quizData.submissionsCount >
                                                          0
                                                        ? "bg-rose-50 text-rose-700"
                                                        : "text-slate-400"
                                            }`}
                                        >
                                            {quizData.avgScore > 0
                                                ? quizData.avgScore
                                                : "—"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center font-bold text-text-primary">
                                        {quizData.submissionsCount > 0
                                            ? quizData.highestScore
                                            : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 font-medium">
                                        {quizData.submissionsCount > 0
                                            ? quizData.highestScorerName
                                            : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const originalQuiz =
                                                    quizzes.find(
                                                        (q) =>
                                                            q.id ===
                                                            quizData.id,
                                                    );
                                                if (originalQuiz)
                                                    setSelectedQuizForDetails(
                                                        originalQuiz,
                                                    );
                                            }}
                                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold transition-all active:scale-[0.98] cursor-pointer"
                                        >
                                            Chi tiết
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="px-4 py-10 text-center text-slate-400 italic"
                                    >
                                        {search || filterGrade !== "all"
                                            ? "Không tìm thấy đề thi nào phù hợp với bộ lọc."
                                            : "Chưa có dữ liệu đề thi."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-border-primary/60">
                    <span className="text-[11px] text-slate-400">
                        Hiển thị {(currentPage - 1) * pageSize + 1} -{" "}
                        {Math.min(currentPage * pageSize, filtered.length)} /{" "}
                        {filtered.length} đề thi
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() =>
                                setCurrentPage((p) => Math.max(1, p - 1))
                            }
                            disabled={currentPage === 1}
                            className="p-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-500 rounded-lg transition-colors cursor-pointer border-0"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] font-semibold text-slate-600 px-2">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() =>
                                setCurrentPage((p) =>
                                    Math.min(totalPages, p + 1),
                                )
                            }
                            disabled={currentPage === totalPages}
                            className="p-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-500 rounded-lg transition-colors cursor-pointer border-0"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Quiz Submissions Detail Modal */}
            {selectedQuizForDetails && (
                <div className="fixed inset-0 bg-slate-955/20 backdrop-blur-xs flex items-center justify-center z-45 p-4 select-none animate-in fade-in duration-200">
                    <div className="bg-bg-card rounded-2xl w-full max-w-3xl flex flex-col max-h-[85vh] shadow-xl border-0 animate-in fade-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary/60 flex-shrink-0">
                            <div>
                                <span className="text-[10px] font-extrabold text-brand-600 bg-brand-50 px-2 py-0.5 rounded uppercase tracking-wider">
                                    Danh sách học sinh làm bài
                                </span>
                                <h3 className="text-sm font-bold text-text-primary mt-1.5">
                                    {selectedQuizForDetails.title}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedQuizForDetails(null)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto min-h-0 flex-1">
                            {(() => {
                                const quizSubs = submissions
                                    .filter(
                                        (s) =>
                                            s.quizId ===
                                            selectedQuizForDetails.id,
                                    )
                                    .sort((a, b) => b.score - a.score);

                                const subPageSize = 10;
                                const totalSubPages = Math.ceil(
                                    quizSubs.length / subPageSize,
                                );
                                const paginatedSubs = quizSubs.slice(
                                    (subPage - 1) * subPageSize,
                                    subPage * subPageSize,
                                );

                                // --------------------------------------------
                                // CALCULATIONS FOR DETAILED ANALYTICS
                                // --------------------------------------------
                                const scores = quizSubs.map((s) => s.score);
                                const total = scores.length;
                                const sum = scores.reduce(
                                    (acc, curr) => acc + curr,
                                    0,
                                );
                                const average = Number(
                                    (sum / total).toFixed(2),
                                );

                                // Median
                                const sortedScores = [...scores].sort(
                                    (a, b) => a - b,
                                );
                                const median =
                                    total % 2 !== 0
                                        ? sortedScores[Math.floor(total / 2)]
                                        : Number(
                                              (
                                                  (sortedScores[total / 2 - 1] +
                                                      sortedScores[total / 2]) /
                                                  2
                                              ).toFixed(2),
                                          );

                                // Min / Max
                                const max = Math.max(...scores);
                                const min = Math.min(...scores);

                                // Pass rate (score >= 5.0)
                                const passCount = scores.filter(
                                    (s) => s >= 5.0,
                                ).length;
                                const passRate = Number(
                                    ((passCount / total) * 100).toFixed(1),
                                );

                                // Average time spent
                                const validTimes = quizSubs
                                    .filter((s) => s.timeSpent !== undefined)
                                    .map((s) => s.timeSpent as number);
                                const avgTimeSpent =
                                    validTimes.length > 0
                                        ? Math.round(
                                              validTimes.reduce(
                                                  (acc, curr) => acc + curr,
                                                  0,
                                              ) / validTimes.length,
                                          )
                                        : 0;

                                // 21 Score brackets (from 0 to 10 with step 0.5) representing exact distribution like official exams
                                const distribution = Array.from(
                                    { length: 21 },
                                    (_, i) => {
                                        const scoreVal = i * 0.5;
                                        // Filter submissions matching this score (using rounding to nearest 0.5)
                                        const count = scores.filter(
                                            (s) =>
                                                Math.round(s * 2) / 2 ===
                                                scoreVal,
                                        ).length;
                                        const pct = Number(
                                            ((count / total) * 100).toFixed(1),
                                        );
                                        return {
                                            label: `${scoreVal}đ`,
                                            shortLabel:
                                                scoreVal % 1 === 0
                                                    ? `${scoreVal}`
                                                    : "",
                                            scoreVal,
                                            count,
                                            pct,
                                        };
                                    },
                                );

                                return (
                                    <div className="space-y-6">
                                        {/* Combined Grid: Chart on Left, Indicators on Right */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch border-b border-border-primary/40 pb-6">
                                            {/* Left Column (2/3 width on desktop): Chart */}
                                            <div className="md:col-span-2 space-y-3 flex flex-col justify-between">
                                                <h4 className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-550 tracking-wider">
                                                    Biểu đồ phổ điểm
                                                </h4>
                                                {(() => {
                                                    const maxPct =
                                                        Math.max(
                                                            ...distribution.map(
                                                                (d) => d.pct,
                                                            ),
                                                        ) || 1;
                                                    const maxCount =
                                                        Math.max(
                                                            ...distribution.map(
                                                                (d) => d.count,
                                                            ),
                                                        ) || 1;
                                                    const chartWidth = 500;
                                                    const chartHeight = 185;
                                                    const padLeft = 30;
                                                    const padRight = 10;
                                                    const padTop = 25;
                                                    const padBot = 30;
                                                    const useW =
                                                        chartWidth -
                                                        padLeft -
                                                        padRight;
                                                    const useH =
                                                        chartHeight -
                                                        padTop -
                                                        padBot;
                                                    const colW = useW / 21;
                                                    const barW = Math.min(
                                                        16,
                                                        colW * 0.85,
                                                    );

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

                                                    return (
                                                        <div className="w-full relative">
                                                            <svg
                                                                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                                                className="w-full h-auto"
                                                            >
                                                                <defs>
                                                                    <linearGradient
                                                                        id="dist-grad-emerald"
                                                                        x1="0"
                                                                        y1="0"
                                                                        x2="0"
                                                                        y2="1"
                                                                    >
                                                                        <stop
                                                                            offset="0%"
                                                                            stopColor="#10B981"
                                                                            stopOpacity="0.85"
                                                                        />
                                                                        <stop
                                                                            offset="100%"
                                                                            stopColor="#10B981"
                                                                            stopOpacity="0.15"
                                                                        />
                                                                    </linearGradient>
                                                                    <linearGradient
                                                                        id="dist-grad-blue"
                                                                        x1="0"
                                                                        y1="0"
                                                                        x2="0"
                                                                        y2="1"
                                                                    >
                                                                        <stop
                                                                            offset="0%"
                                                                            stopColor="#3B82F6"
                                                                            stopOpacity="0.85"
                                                                        />
                                                                        <stop
                                                                            offset="100%"
                                                                            stopColor="#3B82F6"
                                                                            stopOpacity="0.15"
                                                                        />
                                                                    </linearGradient>
                                                                    <linearGradient
                                                                        id="dist-grad-amber"
                                                                        x1="0"
                                                                        y1="0"
                                                                        x2="0"
                                                                        y2="1"
                                                                    >
                                                                        <stop
                                                                            offset="0%"
                                                                            stopColor="#F59E0B"
                                                                            stopOpacity="0.85"
                                                                        />
                                                                        <stop
                                                                            offset="100%"
                                                                            stopColor="#F59E0B"
                                                                            stopOpacity="0.15"
                                                                        />
                                                                    </linearGradient>
                                                                    <linearGradient
                                                                        id="dist-grad-red"
                                                                        x1="0"
                                                                        y1="0"
                                                                        x2="0"
                                                                        y2="1"
                                                                    >
                                                                        <stop
                                                                            offset="0%"
                                                                            stopColor="#EF4444"
                                                                            stopOpacity="0.85"
                                                                        />
                                                                        <stop
                                                                            offset="100%"
                                                                            stopColor="#EF4444"
                                                                            stopOpacity="0.15"
                                                                        />
                                                                    </linearGradient>
                                                                </defs>

                                                                {/* Gridlines */}
                                                                <line
                                                                    x1={padLeft}
                                                                    y1={padTop}
                                                                    x2={
                                                                        chartWidth -
                                                                        padRight
                                                                    }
                                                                    y2={padTop}
                                                                    stroke="currentColor"
                                                                    className="text-slate-100 dark:text-slate-800/40"
                                                                    strokeWidth="0.8"
                                                                    strokeDasharray="3,3"
                                                                />
                                                                <line
                                                                    x1={padLeft}
                                                                    y1={
                                                                        padTop +
                                                                        useH / 2
                                                                    }
                                                                    x2={
                                                                        chartWidth -
                                                                        padRight
                                                                    }
                                                                    y2={
                                                                        padTop +
                                                                        useH / 2
                                                                    }
                                                                    stroke="currentColor"
                                                                    className="text-slate-100 dark:text-slate-800/40"
                                                                    strokeWidth="0.8"
                                                                    strokeDasharray="3,3"
                                                                />
                                                                <line
                                                                    x1={padLeft}
                                                                    y1={
                                                                        padTop +
                                                                        useH
                                                                    }
                                                                    x2={
                                                                        chartWidth -
                                                                        padRight
                                                                    }
                                                                    y2={
                                                                        padTop +
                                                                        useH
                                                                    }
                                                                    stroke="currentColor"
                                                                    className="text-slate-200 dark:text-slate-705"
                                                                    strokeWidth="1"
                                                                />

                                                                {/* Bars */}
                                                                {distribution.map(
                                                                    (
                                                                        dist,
                                                                        i,
                                                                    ) => {
                                                                        const barX =
                                                                            padLeft +
                                                                            i *
                                                                                colW +
                                                                            (colW -
                                                                                barW) /
                                                                                2;
                                                                        const barHeight =
                                                                            dist.count >
                                                                            0
                                                                                ? (dist.count /
                                                                                      maxCount) *
                                                                                  (useH -
                                                                                      15)
                                                                                : 0;
                                                                        const y =
                                                                            padTop +
                                                                            useH -
                                                                            barHeight;
                                                                        const centerX =
                                                                            barX +
                                                                            barW /
                                                                                2;

                                                                        let grad =
                                                                            "url(#dist-grad-red)";
                                                                        let color =
                                                                            "#EF4444";
                                                                        if (
                                                                            dist.scoreVal >=
                                                                            9.0
                                                                        ) {
                                                                            grad =
                                                                                "url(#dist-grad-emerald)";
                                                                            color =
                                                                                "#10B981";
                                                                        } else if (
                                                                            dist.scoreVal >=
                                                                            6.5
                                                                        ) {
                                                                            grad =
                                                                                "url(#dist-grad-blue)";
                                                                            color =
                                                                                "#3B82F6";
                                                                        } else if (
                                                                            dist.scoreVal >=
                                                                            5.0
                                                                        ) {
                                                                            grad =
                                                                                "url(#dist-grad-amber)";
                                                                            color =
                                                                                "#F59E0B";
                                                                        }

                                                                        return (
                                                                            <g
                                                                                key={
                                                                                    i
                                                                                }
                                                                            >
                                                                                <path
                                                                                    d={getBarPath(
                                                                                        barX,
                                                                                        padTop,
                                                                                        barW,
                                                                                        useH,
                                                                                        2,
                                                                                    )}
                                                                                    fill="currentColor"
                                                                                    className="text-slate-50/50 dark:text-slate-850/20"
                                                                                />
                                                                                {barHeight >
                                                                                    0 && (
                                                                                    <path
                                                                                        d={getBarPath(
                                                                                            barX,
                                                                                            y,
                                                                                            barW,
                                                                                            barHeight,
                                                                                            2,
                                                                                        )}
                                                                                        fill={
                                                                                            grad
                                                                                        }
                                                                                        className="transition-all duration-300"
                                                                                    />
                                                                                )}

                                                                                {dist.count >
                                                                                    0 && (
                                                                                    <text
                                                                                        x={
                                                                                            centerX
                                                                                        }
                                                                                        y={
                                                                                            y -
                                                                                            5
                                                                                        }
                                                                                        textAnchor="middle"
                                                                                        fill={
                                                                                            color
                                                                                        }
                                                                                        fontSize="7.5"
                                                                                        fontWeight="bold"
                                                                                    >
                                                                                        {
                                                                                            dist.count
                                                                                        }
                                                                                    </text>
                                                                                )}

                                                                                <text
                                                                                    x={
                                                                                        centerX
                                                                                    }
                                                                                    y={
                                                                                        padTop +
                                                                                        useH +
                                                                                        14
                                                                                    }
                                                                                    textAnchor="middle"
                                                                                    fill="currentColor"
                                                                                    fontSize="8.5"
                                                                                    fontWeight="bold"
                                                                                    className="text-slate-700 dark:text-slate-400"
                                                                                >
                                                                                    {
                                                                                        dist.shortLabel
                                                                                    }
                                                                                </text>
                                                                            </g>
                                                                        );
                                                                    },
                                                                )}
                                                            </svg>
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Right Column (1/3 width on desktop): 4 Indicators in 2x2 grid */}
                                            <div className="space-y-4 text-left border-t md:border-t-0 md:border-l border-slate-200/60 dark:border-slate-800/60 pt-6 md:pt-0 md:pl-6 flex flex-col justify-between">
                                                <h3 className="text-xs font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
                                                    Chỉ số đề thi
                                                </h3>

                                                <div className="grid grid-cols-2 gap-y-6 gap-x-4 pt-2 flex-1 content-center">
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                                            Lượt làm
                                                        </span>
                                                        <span className="text-xl font-black text-slate-800 dark:text-slate-200 block">
                                                            {total}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1 pl-4 border-l border-slate-200/60 dark:border-slate-800/60">
                                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                                            Thời gian TB
                                                        </span>
                                                        <span className="text-xl font-black text-slate-800 dark:text-slate-200 block">
                                                            {avgTimeSpent > 0
                                                                ? formatTime(
                                                                      avgTimeSpent,
                                                                  )
                                                                : "—"}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1 border-t border-slate-200/60 dark:border-slate-800/60 pt-4">
                                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                                            Điểm trung bình
                                                        </span>
                                                        <span className="text-xl font-black text-slate-800 dark:text-slate-200 block">
                                                            {average}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1 pl-4 border-l border-slate-200/60 border-t border-slate-200/60 dark:border-slate-800/60 dark:border-t-slate-800/60 pt-4">
                                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                                            Điểm cao nhất
                                                        </span>
                                                        <span className="text-xl font-black text-slate-800 dark:text-slate-200 block">
                                                            {max}/10
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 3. Submissions Table Title */}
                                        <div className="pt-2">
                                            <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-550 tracking-wider mb-3">
                                                Danh sách chi tiết xếp hạng
                                            </h4>
                                            <div className="bg-bg-card border border-border-primary/50 rounded-2xl overflow-hidden shadow-2xs">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse text-xs">
                                                        <thead>
                                                            <tr className="border-b border-border-primary/50 bg-slate-50/30 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                                                <th className="px-3.5 py-3 text-center w-12">
                                                                    Hạng
                                                                </th>
                                                                <th className="px-3.5 py-3">
                                                                    Học sinh
                                                                </th>
                                                                <th className="px-3.5 py-3 text-center">
                                                                    Điểm số
                                                                </th>
                                                                <th className="px-3.5 py-3 text-center">
                                                                    Thời gian
                                                                    làm
                                                                </th>
                                                                <th className="px-3.5 py-3">
                                                                    Thời điểm
                                                                    nộp
                                                                </th>
                                                                <th className="px-3.5 py-3 text-center">
                                                                    Hành động
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-border-primary/40 font-semibold text-text-secondary">
                                                            {paginatedSubs.map(
                                                                (
                                                                    sub,
                                                                    index,
                                                                ) => {
                                                                    const scoreColor =
                                                                        sub.score >=
                                                                        8
                                                                            ? "bg-emerald-50 text-emerald-700"
                                                                            : sub.score >=
                                                                                5
                                                                              ? "bg-amber-50 text-amber-700"
                                                                              : "bg-rose-50 text-rose-700";

                                                                    return (
                                                                        <tr
                                                                            key={
                                                                                sub.id
                                                                            }
                                                                            className="hover:bg-slate-50/50 transition-colors"
                                                                        >
                                                                            <td className="px-3.5 py-3 text-center font-extrabold text-slate-400">
                                                                                #
                                                                                {(subPage -
                                                                                    1) *
                                                                                    subPageSize +
                                                                                    index +
                                                                                    1}
                                                                            </td>
                                                                            <td className="px-3.5 py-3">
                                                                                <div className="font-bold text-text-primary">
                                                                                    {
                                                                                        sub.studentName
                                                                                    }
                                                                                </div>
                                                                                <div className="text-[10px] text-slate-400 font-medium">
                                                                                    @
                                                                                    {sub.studentUsername ||
                                                                                        "unknown"}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-3.5 py-3 text-center">
                                                                                <span
                                                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${scoreColor}`}
                                                                                >
                                                                                    {
                                                                                        sub.score
                                                                                    }{" "}
                                                                                    /
                                                                                    10
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-3.5 py-3 text-center text-slate-500">
                                                                                {sub.timeSpent !==
                                                                                undefined
                                                                                    ? formatTime(
                                                                                          sub.timeSpent,
                                                                                      )
                                                                                    : "—"}
                                                                            </td>
                                                                            <td className="px-3.5 py-3 text-slate-500 font-medium">
                                                                                {
                                                                                    sub.submittedAt
                                                                                }
                                                                            </td>
                                                                            <td className="px-3.5 py-3 text-center">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setSelectedQuizForDetails(
                                                                                            null,
                                                                                        );
                                                                                        onReviewSubmission(
                                                                                            sub,
                                                                                        );
                                                                                    }}
                                                                                    className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-[10px] font-bold transition-all active:scale-[0.98] cursor-pointer"
                                                                                >
                                                                                    Xem
                                                                                    bài
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                },
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Submissions Pagination Controls */}
                                            {totalSubPages > 1 && (
                                                <div className="flex items-center justify-between pt-4">
                                                    <span className="text-[11px] text-slate-400">
                                                        Hiển thị{" "}
                                                        {(subPage - 1) *
                                                            subPageSize +
                                                            1}{" "}
                                                        -{" "}
                                                        {Math.min(
                                                            subPage *
                                                                subPageSize,
                                                            quizSubs.length,
                                                        )}{" "}
                                                        / {quizSubs.length} lượt
                                                        làm
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() =>
                                                                setSubPage(
                                                                    (p) =>
                                                                        Math.max(
                                                                            1,
                                                                            p -
                                                                                1,
                                                                        ),
                                                                )
                                                            }
                                                            disabled={
                                                                subPage === 1
                                                            }
                                                            className="p-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-500 rounded-lg transition-colors cursor-pointer border-0"
                                                        >
                                                            <ChevronLeft className="w-3.5 h-3.5" />
                                                        </button>
                                                        <span className="text-[11px] font-semibold text-slate-600 px-2">
                                                            {subPage} /{" "}
                                                            {totalSubPages}
                                                        </span>
                                                        <button
                                                            onClick={() =>
                                                                setSubPage(
                                                                    (p) =>
                                                                        Math.min(
                                                                            totalSubPages,
                                                                            p +
                                                                                1,
                                                                        ),
                                                                )
                                                            }
                                                            disabled={
                                                                subPage ===
                                                                totalSubPages
                                                            }
                                                            className="p-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-500 rounded-lg transition-colors cursor-pointer border-0"
                                                        >
                                                            <ChevronRight className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-border-primary/60 flex justify-end flex-shrink-0">
                            <button
                                onClick={() => setSelectedQuizForDetails(null)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-all active:scale-[0.98] cursor-pointer"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
