import React, { useState, useMemo } from "react";
import { Quiz, Submission } from "../types";
import { BarChart3, Search, X } from "lucide-react";

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
            <div className="bg-bg-card rounded-lg overflow-hidden shadow-2xs">
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
                            {filtered.map((quizData) => (
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

                                if (quizSubs.length === 0) {
                                    return (
                                        <div className="text-center py-12 text-slate-400 italic text-sm">
                                            Chưa có học sinh nào thực hiện bài
                                            thi này.
                                        </div>
                                    );
                                }

                                return (
                                    <div className="bg-bg-card rounded-lg overflow-hidden shadow-2xs">
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
                                                            Thời gian làm
                                                        </th>
                                                        <th className="px-3.5 py-3">
                                                            Thời điểm nộp
                                                        </th>
                                                        <th className="px-3.5 py-3 text-center">
                                                            Hành động
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border-primary/40 font-semibold text-text-secondary">
                                                    {quizSubs.map(
                                                        (sub, index) => {
                                                            const scoreColor =
                                                                sub.score >= 8
                                                                    ? "bg-emerald-50 text-emerald-700"
                                                                    : sub.score >=
                                                                        5
                                                                      ? "bg-amber-50 text-amber-700"
                                                                      : "bg-rose-50 text-rose-700";

                                                            return (
                                                                <tr
                                                                    key={sub.id}
                                                                    className="hover:bg-slate-50/50 transition-colors"
                                                                >
                                                                    <td className="px-3.5 py-3 text-center font-extrabold text-slate-400">
                                                                        #
                                                                        {index +
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
                                                                            / 10
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
