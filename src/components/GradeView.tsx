import React, { useState } from "react";
import { Quiz, Submission, User } from "../types";
import {
    Clock,
    HelpCircle,
    ArrowRight,
    Award,
    CheckCircle2,
    Search,
} from "lucide-react";

interface GradeViewProps {
    user: User;
    grade: string;
    quizzes: Quiz[];
    submissions: Submission[];
    onStartQuiz: (quiz: Quiz) => void;
}

export default function GradeView({
    user,
    grade,
    quizzes,
    submissions,
    onStartQuiz,
}: GradeViewProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSubject, setSelectedSubject] = useState("Tất cả");
    const [sortBy, setSortBy] = useState("newest");

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

    const subjectOptions = [
        "Tất cả",
        ...Array.from(
            new Set(rawGradeQuizzes.map((q) => getCleanSubjectName(q.subject))),
        ),
    ];

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

    // Filter student submissions
    const studentSubmissions = submissions.filter(
        (s) => s.studentId === user.id,
    );

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-slate-800">
            <div className="max-w-5xl mx-auto px-6 py-12 space-y-8 animate-in fade-in duration-200">
                {/* Banner Header */}
                <div className="pb-6 border-b border-slate-100 space-y-2">
                    <h1 className="text-2xl font-bold text-slate-900 font-serif">
                        Kho Đề Thi Ôn Luyện Lớp {grade}
                    </h1>
                    <p className="text-xs text-slate-400 max-w-xl">
                        Tổng hợp các đề thi môn Toán chất lượng cao giúp bứt phá
                        điểm số cùng cô Trang.
                    </p>
                </div>

                {/* Search, Filter & Sort Controls */}
                {/* Search, Filter & Sort Controls */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pb-2">
                    {/* Search Box */}
                    <div className="relative w-full sm:max-w-xs">
                        <input
                            type="text"
                            placeholder="Tìm kiếm đề thi..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder-slate-400"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-end">
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-slate-500 font-medium">
                                Môn:
                            </span>
                            <select
                                value={selectedSubject}
                                onChange={(e) =>
                                    setSelectedSubject(e.target.value)
                                }
                                className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-brand-500 cursor-pointer"
                            >
                                {subjectOptions.map((sub) => (
                                    <option key={sub} value={sub}>
                                        {sub}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-slate-500 font-medium">
                                Sắp xếp:
                            </span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-brand-500 cursor-pointer"
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

                {/* Quizzes List - 3 Columns Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {processedQuizzes.length === 0 ? (
                        <div className="col-span-full py-16 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-250">
                            <p className="text-xs font-medium">
                                {rawGradeQuizzes.length === 0
                                    ? `Chưa có đề thi nào cho khối lớp ${grade} ở thời điểm hiện tại.`
                                    : "Không tìm thấy đề thi nào khớp với bộ lọc của bạn."}
                            </p>
                        </div>
                    ) : (
                        processedQuizzes.map((quiz) => {
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
                                    new Date(a.submittedAt).getTime() -
                                    new Date(b.submittedAt).getTime()
                                );
                            });
                            const newestScore =
                                sortedSubmissions.length > 0
                                    ? sortedSubmissions[
                                          sortedSubmissions.length - 1
                                      ].score
                                    : 0;

                            return (
                                <div
                                    key={quiz.id}
                                    className="bg-bg-base border border-border-primary rounded-xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs hover:border-border-secondary hover:bg-brand-50/30 transition-all duration-200"
                                >
                                    <div className="space-y-2.5">
                                        {/* Header line */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#2B5467]/10 text-[#2B5467] px-2 py-0.5 rounded">
                                                {getCleanSubjectName(
                                                    quiz.subject,
                                                )}
                                            </span>
                                            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                <span>
                                                    {quiz.duration} phút
                                                </span>
                                            </div>
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                                            {quiz.title}
                                        </h3>

                                        {/* Description */}
                                        {quiz.description && (
                                            <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                                                {quiz.description}
                                            </p>
                                        )}

                                        {/* Info items */}
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
                                            <span className="flex items-center gap-1">
                                                • {quiz.questions.length} câu
                                                hỏi • {sectionsCount} phần
                                            </span>
                                            {bestSubmission && (
                                                <span className="flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-150">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    {bestSubmission.score}/10
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="pt-3 mt-3 border-t border-border-primary flex items-center justify-between gap-2">
                                        {studentQuizSubmissions.length > 0 ? (
                                            <div className="flex flex-wrap items-center gap-1 text-[9px] font-medium text-slate-500">
                                                <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md border border-emerald-100/40">
                                                    Max: {maxScore}
                                                </span>
                                                <span className="bg-slate-50/80 text-slate-600 px-1.5 py-0.5 rounded-md border border-slate-100">
                                                    Avg: {avgScore}
                                                </span>
                                                <span className="bg-blue-50/40 text-blue-700 px-1.5 py-0.5 rounded-md border border-slate-100">
                                                    Mới: {newestScore}
                                                </span>
                                            </div>
                                        ) : (
                                            <div />
                                        )}

                                        <button
                                            onClick={() => onStartQuiz(quiz)}
                                            className="px-4 py-2 bg-[#2B5467] hover:bg-[#204252] text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shadow-3xs cursor-pointer active:scale-98 flex-shrink-0"
                                        >
                                            <span>
                                                {bestSubmission
                                                    ? "Vào thi lại"
                                                    : "Vào thi thử"}
                                            </span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
