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
import { Quiz, Submission, User } from "../types";
import {
    Clock,
    HelpCircle,
    ArrowRight,
    Award,
    CheckCircle2,
    Search,
    Calendar,
    Loader2,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    BookMarked,
} from "lucide-react";

interface GradeViewProps {
    user: User;
    grade: string;
    quizzes: Quiz[];
    submissions: Submission[];
    onStartQuiz: (quiz: Quiz) => void;
    ongoingAttempt?: any | null;
    loading?: boolean;
    currentPath?: string;
    onSelectGrade?: (grade: string | null, category?: string | null) => void;
}

export default function GradeView({
    user,
    grade,
    quizzes,
    submissions,
    onStartQuiz,
    ongoingAttempt,
    loading,
    currentPath,
    onSelectGrade,
}: GradeViewProps) {
    const [searchQuery, setSearchQuery] = useState("");

    // Parse category from URL query parameters initially
    const getInitialCategory = () => {
        try {
            const searchParams = new URLSearchParams(window.location.search);
            return searchParams.get("category") || "Tất cả";
        } catch {
            return "Tất cả";
        }
    };

    const [selectedSubject, setSelectedSubject] = useState(getInitialCategory);
    const [sortBy, setSortBy] = useState("newest");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 12;

    const handleClearFilters = () => {
        setSearchQuery("");
        setSelectedSubject("Tất cả");
        if (onSelectGrade) {
            onSelectGrade(grade, null);
        }
    };

    // Synchronize category selection when currentPath or grade changes
    React.useEffect(() => {
        try {
            const searchParams = new URLSearchParams(window.location.search);
            const categoryParam = searchParams.get("category") || "Tất cả";
            setSelectedSubject(categoryParam);
        } catch {
            setSelectedSubject("Tất cả");
        }
    }, [grade, currentPath]);

    // Reset pagination when grade, search, or filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [grade, searchQuery, selectedSubject, sortBy]);

    // Get raw quizzes belonging to this grade
    const rawGradeQuizzes = quizzes.filter(
        (q) =>
            q.grade === grade ||
            q.title.includes(`Lớp ${grade}`) ||
            q.subject.includes(`Lớp ${grade}`),
    );

    // Extract unique subjects for filtering (cleaning up extra text, e.g. "Toán Học - Lớp 10" -> "Toán Học")
    const getCleanSubjectName = (sub: string) => {
        return sub.split(" - ")[0].trim();
    };

    const GRADE_CATEGORIES_MAP: Record<string, string[]> = {
        "8": ["Giữa kì 1", "Cuối kì 1", "Giữa kì 2", "Cuối kì 2"],
        "9": ["Giữa kì 1", "Cuối kì 1", "Giữa kì 2", "Cuối kì 2", "Thi vào 10"],
        "10": ["Giữa kì 1", "Cuối kì 1", "Giữa kì 2", "Cuối kì 2"],
        "11": ["Giữa kì 1", "Cuối kì 1", "Giữa kì 2", "Cuối kì 2"],
        "12": ["Giữa kì 1", "Cuối kì 1", "Giữa kì 2", "Cuối kì 2", "Thi thử"],
    };

    const standardCats = GRADE_CATEGORIES_MAP[grade] || [];
    const actualSubjects = Array.from(
        new Set(rawGradeQuizzes.map((q) => getCleanSubjectName(q.subject))),
    );
    const extraSubjects = actualSubjects.filter(
        (sub) => !standardCats.includes(sub),
    );

    const subjectOptions = ["Tất cả", ...standardCats, ...extraSubjects];

    // Filter quizzes by search query and clean subject
    let processedQuizzes = rawGradeQuizzes.filter((q) => {
        const matchesSearch =
            q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (q.description || "")
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
        const matchesSubject =
            selectedSubject === "Tất cả" ||
            getCleanSubjectName(q.subject) === selectedSubject;
        return matchesSearch && matchesSubject;
    });

    // Sort quizzes
    processedQuizzes = [...processedQuizzes].sort((a, b) => {
        if (sortBy === "newest") {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
        }
        if (sortBy === "duration_asc") {
            return a.duration - b.duration;
        }
        if (sortBy === "duration_desc") {
            return b.duration - a.duration;
        }
        if (sortBy === "questions_count") {
            return b.questions.length - a.questions.length;
        }
        return 0;
    });

    const totalPages = Math.ceil(processedQuizzes.length / pageSize);
    const paginatedQuizzes = processedQuizzes.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
    );

    // Filter student submissions
    const studentSubmissions = submissions.filter(
        (s) => s.studentId === user.id,
    );

    // Grid column border and padding classes for borderless line-separated columns
    const getColClasses = (index: number) => {
        let classes =
            "group flex flex-col justify-between bg-transparent border-t border-slate-200 dark:border-slate-800 pt-6 pb-6 transition-all duration-200 ";

        // Tablet (2 columns on md)
        const mdCol = index % 2;
        if (mdCol === 0) {
            classes += "md:border-l-0 md:pl-0 md:pr-6 ";
        } else {
            classes +=
                "md:border-l md:border-slate-200 dark:md:border-slate-800 md:pl-6 md:pr-0 ";
        }

        // Desktop (3 columns on lg)
        const lgCol = index % 3;
        if (lgCol === 0) {
            classes += "lg:border-l-0 lg:pl-0 lg:pr-6 ";
        } else if (lgCol === 1) {
            classes +=
                "lg:border-l lg:border-slate-200 dark:lg:border-slate-800 lg:pl-6 lg:pr-6 ";
        } else {
            classes +=
                "lg:border-l lg:border-slate-200 dark:lg:border-slate-800 lg:pl-6 lg:pr-0 ";
        }

        // Mobile reset
        classes += "max-md:border-l-0 max-md:pl-0 max-md:pr-0";
        return classes;
    };

    return (
        <div className="bg-transparent text-text-primary animate-in fade-in duration-200">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Banner Header */}
                <div className="pb-6 border-b border-slate-100 space-y-2 text-left">
                    <h1 className="text-2xl font-bold text-slate-900 font-serif">
                        Kho Đề Thi Ôn Luyện Lớp {grade}
                    </h1>
                    <p className="text-xs text-slate-400 max-w-xl">
                        Tổng hợp các đề thi môn Toán chất lượng cao giúp bứt phá
                        điểm số cùng cô Trang.
                    </p>
                </div>

                {/* Search, Filter & Sort Controls */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pb-2">
                    {/* Search Box */}
                    <div className="relative w-full sm:max-w-xs">
                        <input
                            type="text"
                            placeholder="Tìm kiếm đề thi..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-bg-card border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder-slate-400 dark:placeholder-slate-500"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-end">
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-slate-500 dark:text-slate-400 font-semibold">
                                Phân loại:
                            </span>
                            <select
                                value={selectedSubject}
                                onChange={(e) =>
                                    setSelectedSubject(e.target.value)
                                }
                                className="bg-white dark:bg-bg-card border border-slate-200 dark:border-slate-800 rounded-md px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-brand-500 cursor-pointer"
                            >
                                {subjectOptions.map((sub) => (
                                    <option key={sub} value={sub}>
                                        {sub}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-slate-500 dark:text-slate-400 font-semibold">
                                Sắp xếp:
                            </span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-white dark:bg-bg-card border border-slate-200 dark:border-slate-800 rounded-md px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-brand-500 cursor-pointer"
                            >
                                <option value="newest">Mới nhất</option>
                                <option value="duration_asc">
                                    Thời gian (Tăng dần)
                                </option>
                                <option value="duration_desc">
                                    Thời gian (Giảm dần)
                                </option>
                                <option value="questions_count">
                                    Số lượng câu hỏi
                                </option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Quizzes List - Grid layout of borderless feed items with dynamic border lines */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-0 gap-y-0">
                    {loading ? (
                        <div className="col-span-full py-16 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                        </div>
                    ) : processedQuizzes.length === 0 ? (
                        <div className="col-span-full py-16 text-center text-slate-450 bg-slate-50/50 rounded-xl border border-dashed border-slate-300">
                            <p className="text-xs font-medium inline-flex items-center justify-center gap-1.5 flex-wrap">
                                <span>
                                    {rawGradeQuizzes.length === 0
                                        ? `Chưa có đề thi nào cho khối lớp ${grade} ở thời điểm hiện tại.`
                                        : "Không tìm thấy đề thi nào khớp với bộ lọc của bạn."}
                                </span>
                                {rawGradeQuizzes.length > 0 && (
                                    <button
                                        onClick={handleClearFilters}
                                        className="text-rose-500 hover:text-rose-600 dark:text-rose-450 dark:hover:text-rose-350 font-bold hover:underline cursor-pointer transition-colors bg-transparent border-0 p-0 inline-block align-baseline"
                                    >
                                        Xóa bộ lọc
                                    </button>
                                )}
                            </p>
                        </div>
                    ) : (
                        paginatedQuizzes.map((quiz, index) => {
                            // Check if student has done this quiz
                            const bestSubmission = studentSubmissions
                                .filter((s) => s.quizId === quiz.id)
                                .sort((a, b) => b.score - a.score)[0];

                            // Count unique sections
                            const uniqueSections = new Set(
                                quiz.questions
                                    .map((q) => q.sectionTitle)
                                    .filter(Boolean),
                            );
                            const sectionsCount = uniqueSections.size || 1;

                            // Calculate score stats
                            const studentQuizSubmissions =
                                studentSubmissions.filter(
                                    (s) => s.quizId === quiz.id,
                                );
                            const scores = studentQuizSubmissions.map(
                                (s) => s.score,
                            );
                            const maxScore =
                                scores.length > 0 ? Math.max(...scores) : 0;
                            const avgScore =
                                scores.length > 0
                                    ? Number(
                                          (
                                              scores.reduce(
                                                  (a, b) => a + b,
                                                  0,
                                              ) / scores.length
                                          ).toFixed(1),
                                      )
                                    : 0;
                            const sortedSubmissions = [
                                ...studentQuizSubmissions,
                            ].sort((a, b) => {
                                return (
                                    safeParseDate(
                                        safeParseDate(a.submittedAt).getTime(),
                                    ).getTime() -
                                    safeParseDate(
                                        safeParseDate(b.submittedAt).getTime(),
                                    ).getTime()
                                );
                            });
                            const newestScore =
                                sortedSubmissions.length > 0
                                    ? sortedSubmissions[
                                          sortedSubmissions.length - 1
                                      ].score
                                    : 0;

                            const isOngoing = !!(
                                ongoingAttempt &&
                                ongoingAttempt.quiz_id === quiz.id
                            );

                            const isVip =
                                quiz.id.includes("vip") ||
                                quiz.title.toLowerCase().includes("hsg") ||
                                quiz.title.toLowerCase().includes("chuyên");

                            const formattedDate = (() => {
                                if (!quiz.createdAt) return "";
                                const dateParts = quiz.createdAt.split("-");
                                if (dateParts.length === 3) {
                                    return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                                }
                                return quiz.createdAt;
                            })();

                            return (
                                <div
                                    key={quiz.id}
                                    className={getColClasses(index)}
                                >
                                    <div className="space-y-2.5">
                                        {/* Header line: Tags & Date */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="text-[9px] font-extrabold uppercase tracking-wider bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 px-2 py-0.5 rounded-md border border-brand-200/40 dark:border-brand-500/20">
                                                    {getCleanSubjectName(
                                                        quiz.subject,
                                                    )}
                                                </span>
                                                {isVip && (
                                                    <span className="text-[9px] font-extrabold uppercase tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-350 px-2 py-0.5 rounded-md border border-rose-100 dark:border-rose-900/40">
                                                        Nâng cao
                                                    </span>
                                                )}
                                                {isOngoing && (
                                                    <span className="text-[9px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-350 px-2 py-0.5 rounded-md border border-amber-100 dark:border-amber-900/40 animate-pulse">
                                                        Đang làm dở
                                                    </span>
                                                )}
                                            </div>
                                            {formattedDate && (
                                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">
                                                    {formattedDate}
                                                </span>
                                            )}
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors leading-snug line-clamp-2">
                                            {quiz.title}
                                        </h3>

                                        {/* Description */}
                                        {quiz.description && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-2 leading-relaxed">
                                                {quiz.description}
                                            </p>
                                        )}

                                        {/* Metadata */}
                                        <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 font-bold flex-wrap pt-0.5">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-655" />
                                                {quiz.duration} phút
                                            </span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <HelpCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-655" />
                                                {quiz.questions.length} câu
                                            </span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <BookMarked className="w-3.5 h-3.5 text-slate-400 dark:text-slate-655" />
                                                {sectionsCount} phần
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action line */}
                                    <div className="flex items-center justify-between gap-3 pt-3 mt-4 border-t border-slate-100 dark:border-slate-800/60">
                                        <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-extrabold">
                                            {studentQuizSubmissions.length >
                                            0 ? (
                                                <>
                                                    <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-100/40 dark:border-emerald-900/30">
                                                        Highest: {maxScore}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="bg-amber-50/50 text-amber-700 dark:bg-amber-950/10 dark:text-amber-400 px-2.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/30">
                                                    Chưa làm
                                                </span>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => onStartQuiz(quiz)}
                                            className={`px-4 py-1.5 ${
                                                isOngoing
                                                    ? "bg-[#18323E] hover:bg-[#10222B] dark:bg-slate-800 dark:hover:bg-slate-900 text-white shadow-md shadow-blue-500/10"
                                                    : "bg-[#3B6D85] hover:bg-[#2C5A71] text-white"
                                            } rounded-md text-[11px] font-extrabold flex items-center gap-1 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer flex-shrink-0`}
                                        >
                                            <span>
                                                {isOngoing
                                                    ? "Tiếp tục làm"
                                                    : bestSubmission
                                                      ? "Làm lại"
                                                      : "Làm bài"}
                                            </span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">
                            Trang {currentPage} / {totalPages} (Tổng số{" "}
                            {processedQuizzes.length} đề thi)
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => {
                                    setCurrentPage((prev) => prev - 1);
                                    window.scrollTo({
                                        top: 0,
                                        behavior: "smooth",
                                    });
                                }}
                                className="p-2 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-colors"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                            </button>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => {
                                    setCurrentPage((prev) => prev + 1);
                                    window.scrollTo({
                                        top: 0,
                                        behavior: "smooth",
                                    });
                                }}
                                className="p-2 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-colors"
                            >
                                <ChevronRight className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
