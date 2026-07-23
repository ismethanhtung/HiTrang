import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    BookOpen,
    Clock,
    Sparkles,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    HelpCircle,
    Award,
    BookMarked,
    RefreshCw,
    ChevronRight,
    ChevronLeft,
    X,
    TrendingUp,
    Users,
    Check,
    Calendar,
    Trophy,
} from "lucide-react";
import { Quiz, Question, Submission, User } from "../types";
import { renderMathHtml } from "../lib/math";
import GradeView from "./GradeView";

function cleanTrueFalseQuestionText(html: string): string {
    if (!html) return html;

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    // 1. Remove table elements containing assertions table headers
    const tables = tempDiv.getElementsByTagName("table");
    for (let i = tables.length - 1; i >= 0; i--) {
        const table = tables[i];
        const textContent = table.textContent || "";
        if (
            textContent.includes("Khẳng định") ||
            textContent.includes("Đúng") ||
            textContent.includes("Sai")
        ) {
            table.parentNode?.removeChild(table);
        }
    }

    // 2. Remove paragraphs or list items starting with label prefixes like a), b), c)...
    const items = tempDiv.querySelectorAll("p, li, div");
    items.forEach((item) => {
        const text = item.textContent?.trim() || "";
        const match = text.match(/^([a-f])[\)\.\:\-]/i);
        if (match) {
            item.parentNode?.removeChild(item);
        }
    });

    return tempDiv.innerHTML;
}

interface StudentDashboardProps {
    user: User;
    quizzes: Quiz[];
    submissions: Submission[];
    onAddSubmission: (newSub: Submission) => void;
    activeTab: string;
    selectedGrade: string | null;
    onSelectGrade: (grade: string | null) => void;
    onQuizStateChange?: (isTaking: boolean) => void;
    activeQuizId?: string | null;
    reviewSubmissionId?: string | null;
    onNavigate: (path: string, bypassConfirm?: boolean) => void;
}

export default function StudentDashboard({
    user,
    quizzes,
    submissions,
    onAddSubmission,
    activeTab,
    selectedGrade,
    onSelectGrade,
    onQuizStateChange,
    activeQuizId,
    reviewSubmissionId,
    onNavigate,
}: StudentDashboardProps) {
    // Quiz Active State
    const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [fontSize, setFontSize] = useState<number>(13); // Default font size in px
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, any>>(
        {},
    );
    const [timeLeft, setTimeLeft] = useState(0); // in seconds
    const [quizTimerActive, setQuizTimerActive] = useState(false);

    // Prevent leaving page/tab changes & detect tab switching
    useEffect(() => {
        if (onQuizStateChange) {
            onQuizStateChange(activeQuiz !== null);
        }

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (activeQuiz) {
                e.preventDefault();
                e.returnValue = "ê bé, đang làm mà chuyển đi đâu thế.";
                return "ê bé, đang làm mà chuyển đi đâu thế.";
            }
        };

        const handleVisibilityChange = () => {
            if (activeQuiz && document.hidden) {
                alert(
                    "ê bé, đang kiểm tra mà chuyển tab đi đâu thế! Hãy tập trung làm bài nhé.",
                );
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
        };
    }, [activeQuiz, onQuizStateChange]);

    // Result Overview State
    const [showResultSummary, setShowResultSummary] =
        useState<Submission | null>(null);

    // Detailed Review State
    const [reviewSubmission, setReviewSubmission] = useState<Submission | null>(
        null,
    );
    const [reviewQuestionIdx, setReviewQuestionIdx] = useState(0);

    // Keyboard navigation (ArrowLeft / ArrowRight)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeEl = document.activeElement;
            if (
                activeEl &&
                (activeEl.tagName === "INPUT" ||
                    activeEl.tagName === "TEXTAREA")
            ) {
                return;
            }

            if (activeQuiz) {
                if (e.key === "ArrowLeft") {
                    setCurrentQuestionIdx((prev) => Math.max(0, prev - 1));
                } else if (e.key === "ArrowRight") {
                    setCurrentQuestionIdx((prev) =>
                        Math.min(activeQuiz.questions.length - 1, prev + 1),
                    );
                }
            } else if (reviewSubmission) {
                const quiz = quizzes.find(
                    (q) => q.id === reviewSubmission.quizId,
                );
                if (quiz) {
                    if (e.key === "ArrowLeft") {
                        setReviewQuestionIdx((prev) => Math.max(0, prev - 1));
                    } else if (e.key === "ArrowRight") {
                        setReviewQuestionIdx((prev) =>
                            Math.min(quiz.questions.length - 1, prev + 1),
                        );
                    }
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [activeQuiz, reviewSubmission, quizzes]);

    // Plan limitation modal state
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showContactOptions, setShowContactOptions] = useState(false);

    useEffect(() => {
        if (activeQuizId) {
            const quiz = quizzes.find((q) => q.id === activeQuizId);
            if (quiz) {
                setActiveQuiz(quiz);
                // Reset quiz progress
                setCurrentQuestionIdx(0);
                setSelectedAnswers({});
                setTimeLeft(quiz.duration * 60);
                setQuizTimerActive(true);
            }
        } else {
            setActiveQuiz(null);
            setQuizTimerActive(false);
        }
    }, [activeQuizId, quizzes]);

    useEffect(() => {
        if (reviewSubmissionId) {
            const sub = submissions.find((s) => s.id === reviewSubmissionId);
            if (sub) {
                setReviewSubmission(sub);
                setReviewQuestionIdx(0);
            }
        } else {
            setReviewSubmission(null);
        }
    }, [reviewSubmissionId, submissions]);

    const closeUpgradeModal = () => {
        setShowUpgradeModal(false);
        setShowContactOptions(false);
    };

    // Timer Effect
    useEffect(() => {
        let interval: any = null;
        if (quizTimerActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && quizTimerActive) {
            // Auto submit when time runs out
            handleQuizSubmit(true);
        }
        return () => clearInterval(interval);
    }, [quizTimerActive, timeLeft]);

    // Format seconds to MM:SS
    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
    };

    // Start taking a quiz
    const handleStartQuiz = (quiz: Quiz) => {
        if (!user.plan || user.plan === "nothing") {
            setShowUpgradeModal(true);
            return;
        }
        onNavigate("/quiz/" + quiz.id);
    };

    // Submit current quiz
    const handleQuizSubmit = (force = false) => {
        if (!activeQuiz) return;

        if (
            !force &&
            Object.keys(selectedAnswers).length < activeQuiz.questions.length
        ) {
            if (
                !confirm(
                    "Bạn chưa trả lời hết các câu hỏi. Bạn vẫn muốn nộp bài chứ?",
                )
            ) {
                return;
            }
        }

        setQuizTimerActive(false);

        // Calculate score based on question type
        let correctCount = 0;
        activeQuiz.questions.forEach((q) => {
            const chosen = selectedAnswers[q.id];
            if (chosen === undefined) return;

            if (!q.type || q.type === "single_choice") {
                if (chosen === q.correctAnswerIndex) {
                    correctCount++;
                }
            } else if (q.type === "true_false") {
                const correctTf = q.correctAnswers || [
                    false,
                    false,
                    false,
                    false,
                ];
                const studentTf = chosen as (boolean | null)[];

                let matchCount = 0;
                for (let i = 0; i < 4; i++) {
                    if (
                        studentTf[i] !== undefined &&
                        studentTf[i] === correctTf[i]
                    ) {
                        matchCount++;
                    }
                }

                // Award points based on official Vietnamese high school grading rule for Part II
                if (matchCount === 4) {
                    correctCount += 1.0;
                } else if (matchCount === 3) {
                    correctCount += 0.5;
                } else if (matchCount === 2) {
                    correctCount += 0.25;
                } else if (matchCount === 1) {
                    correctCount += 0.1;
                }
            } else if (q.type === "short_answer") {
                const correctKey = (q.shortAnswerKey || "")
                    .trim()
                    .toLowerCase();
                const studentKey = String(chosen).trim().toLowerCase();
                if (correctKey && studentKey === correctKey) {
                    correctCount++;
                }
            }
        });

        const totalQuestions = activeQuiz.questions.length;
        // Scale score to a scale of 10.0
        const rawScore = (correctCount / totalQuestions) * 10;
        const finalScore = Math.round(rawScore * 10) / 10; // round to 1 decimal place

        const newSubmission: Submission = {
            id: "sub_" + Date.now(),
            quizId: activeQuiz.id,
            quizTitle: activeQuiz.title,
            studentId: user.id,
            studentName: user.name,
            score: finalScore,
            totalQuestions: totalQuestions,
            submittedAt: new Date()
                .toISOString()
                .replace("T", " ")
                .substring(0, 16),
            answers: { ...selectedAnswers },
            timeSpent: activeQuiz.duration * 60 - timeLeft,
        };

        onAddSubmission(newSubmission);
        onNavigate("/result/" + newSubmission.id, true);
    };

    // Student specific stats
    const studentSubmissions = submissions.filter(
        (sub) => sub.studentId === user.id,
    );
    const completedCount = studentSubmissions.length;
    const averageScore =
        completedCount > 0
            ? (
                  studentSubmissions.reduce(
                      (acc, curr) => acc + curr.score,
                      0,
                  ) / completedCount
              ).toFixed(1)
            : "0.0";

    return (
        <div
            className={`flex-1 min-h-0 ${activeQuiz || reviewSubmission ? "overflow-hidden h-full flex flex-col" : "overflow-y-auto min-h-screen"} bg-bg-base dark:bg-bg-base text-text-primary transition-colors duration-200`}
        >
            <div
                className={
                    activeQuiz
                        ? "w-full h-full p-4 xl:p-6 flex flex-col min-h-0"
                        : reviewSubmission
                          ? "w-full h-full p-4 xl:p-6 flex flex-col min-h-0"
                          : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
                }
            >
                {reviewSubmission ? (
                    (() => {
                        const quiz = quizzes.find(
                            (q) => q.id === reviewSubmission.quizId,
                        );
                        if (!quiz) {
                            return (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-gray-400 italic shadow-sm">
                                        Không tìm thấy dữ liệu đề thi tương ứng.
                                    </div>
                                </div>
                            );
                        }

                        const totalQ = quiz.questions.length;

                        // Compute per-question status
                        const qStatuses: (
                            | "correct"
                            | "wrong"
                            | "partial"
                            | "unanswered"
                        )[] = quiz.questions.map((q) => {
                            const chosen = reviewSubmission.answers[q.id];
                            if (
                                chosen === undefined ||
                                chosen === null ||
                                chosen === ""
                            )
                                return "unanswered";
                            if (!q.type || q.type === "single_choice") {
                                return chosen === q.correctAnswerIndex
                                    ? "correct"
                                    : "wrong";
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
                                const matchCount = q.options.filter(
                                    (_, i) => studentTf[i] === correctTf[i],
                                ).length;
                                if (matchCount === 4) return "correct";
                                if (matchCount > 0) return "partial";
                                return "wrong";
                            } else if (q.type === "short_answer") {
                                const cKey = (q.shortAnswerKey || "")
                                    .trim()
                                    .toLowerCase();
                                const sKey = String(chosen || "")
                                    .trim()
                                    .toLowerCase();
                                return cKey && sKey === cKey
                                    ? "correct"
                                    : "wrong";
                            }
                            return "wrong";
                        });

                        const correctCount = qStatuses.filter(
                            (s) => s === "correct",
                        ).length;
                        const wrongCount = qStatuses.filter(
                            (s) => s === "wrong" || s === "partial",
                        ).length;
                        const unansweredCount = qStatuses.filter(
                            (s) => s === "unanswered",
                        ).length;

                        const safeIdx = Math.min(reviewQuestionIdx, totalQ - 1);
                        const q = quiz.questions[safeIdx];
                        const chosen = reviewSubmission.answers[q.id];
                        const status = qStatuses[safeIdx];

                        // Build question-level grading detail
                        let tfStatusList: {
                            text: string;
                            correct: boolean;
                            studentVal: boolean | null;
                            correctVal: boolean;
                        }[] = [];
                        if (q.type === "true_false") {
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
                            tfStatusList = q.options.map((opt, i) => ({
                                text: opt,
                                correct: studentTf[i] === correctTf[i],
                                studentVal: studentTf[i] ?? null,
                                correctVal: correctTf[i],
                            }));
                        }

                        const displayQuestionText =
                            q.type === "true_false"
                                ? cleanTrueFalseQuestionText(q.text)
                                : q.text;

                        const cardAccentClass =
                            status === "correct"
                                ? "border-l-4 border-l-emerald-500"
                                : status === "partial"
                                  ? "border-l-4 border-l-amber-500"
                                  : status === "unanswered"
                                    ? "border-l-4 border-l-slate-300"
                                    : "border-l-4 border-l-rose-500";

                        const statusBadgeClass =
                            status === "correct"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : status === "partial"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : status === "unanswered"
                                    ? "bg-slate-100 text-slate-500 border-slate-200"
                                    : "bg-rose-50 text-rose-700 border-rose-200";

                        const statusText =
                            status === "correct"
                                ? "Đúng"
                                : status === "partial"
                                  ? "Đúng một phần"
                                  : status === "unanswered"
                                    ? "Chưa trả lời"
                                    : "Sai";

                        return (
                            <div className="w-full px-4 xl:px-8 relative flex-1 min-h-0 flex flex-col xl:h-full xl:min-h-0 gap-6">
                                {/* CENTER COLUMN: Question Box Card & Options */}
                                <div className="w-full xl:max-w-4xl xl:mx-auto xl:h-full xl:min-h-0 flex flex-col">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.99 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-white border border-gray-100 rounded-xl p-6 sm:p-8 shadow-sm space-y-6 flex flex-col justify-between xl:h-full xl:min-h-0"
                                    >
                                        {/* Quiz Review Header */}
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
                                            <div>
                                                <span className="text-[9px] font-bold tracking-wider uppercase bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-md">
                                                    {quiz.subject} - Xem lại bài
                                                    làm
                                                </span>
                                                <h2 className="text-sm font-bold text-slate-900 mt-2">
                                                    {reviewSubmission.quizTitle}
                                                </h2>
                                            </div>

                                            {/* Score Pill mimicking Timer Pill */}
                                            <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg border bg-brand-50 border-brand-200 text-brand-700 text-xs font-bold self-start sm:self-auto shadow-3xs">
                                                <Award className="w-4.5 h-4.5" />
                                                <span>
                                                    Điểm số:{" "}
                                                    {reviewSubmission.score}{" "}
                                                    (Đúng {correctCount}/
                                                    {totalQ})
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress indicator bar */}
                                        {(() => {
                                            const progressPercent = Math.round(
                                                ((safeIdx + 1) / totalQ) * 100,
                                            );
                                            return (
                                                <div>
                                                    <div className="flex justify-between text-[11px] font-semibold text-gray-400 mb-1.5">
                                                        <span>
                                                            Xem lại câu{" "}
                                                            {safeIdx + 1} trên{" "}
                                                            {totalQ}
                                                        </span>
                                                        <span>
                                                            Tỷ lệ đúng:{" "}
                                                            {Math.round(
                                                                (correctCount /
                                                                    totalQ) *
                                                                    100,
                                                            )}
                                                            %
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                                            style={{
                                                                width: `${progressPercent}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Question & Options Scroll Container */}
                                        <div
                                            className="flex-1 overflow-y-auto pr-1 space-y-5 min-h-0"
                                            style={{
                                                fontSize: `${fontSize}px`,
                                            }}
                                        >
                                            {/* Question Box Card */}
                                            <div className="bg-bg-base dark:bg-bg-card border border-border-primary dark:border-slate-800 p-6 rounded-xl space-y-4">
                                                {q.sectionTitle && (
                                                    <div className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 inline-block uppercase tracking-wider">
                                                        {q.sectionTitle}
                                                    </div>
                                                )}
                                                <h3
                                                    className="font-semibold text-slate-900 leading-relaxed overflow-x-auto [&_img]:mx-auto [&_img]:block [&_img]:my-4"
                                                    style={{
                                                        fontSize: `${fontSize + 1}px`,
                                                    }}
                                                >
                                                    <span
                                                        dangerouslySetInnerHTML={{
                                                            __html: renderMathHtml(
                                                                displayQuestionText,
                                                            ),
                                                        }}
                                                    />
                                                </h3>

                                                {/* Options rendering depending on type */}
                                                {(() => {
                                                    if (
                                                        !q.type ||
                                                        q.type ===
                                                            "single_choice"
                                                    ) {
                                                        return (
                                                            <div className="space-y-3">
                                                                {q.options.map(
                                                                    (
                                                                        option,
                                                                        idx,
                                                                    ) => {
                                                                        const isChosen =
                                                                            chosen ===
                                                                            idx;
                                                                        const isCorrectOpt =
                                                                            q.correctAnswerIndex ===
                                                                            idx;
                                                                        const cleanedOpt =
                                                                            option.replace(
                                                                                /^\s*[a-f][\)\.\:\-]\s*/i,
                                                                                "",
                                                                            );

                                                                        let borderStyle =
                                                                            "border-gray-200 text-slate-700 bg-white";
                                                                        let letterCircleStyle =
                                                                            "bg-slate-100 text-slate-500";
                                                                        let badge =
                                                                            null;

                                                                        if (
                                                                            isCorrectOpt
                                                                        ) {
                                                                            borderStyle =
                                                                                "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/10";
                                                                            letterCircleStyle =
                                                                                "bg-emerald-500 text-white font-medium";
                                                                            badge =
                                                                                (
                                                                                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white font-medium flex items-center justify-center animate-scale-in">
                                                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                                                    </div>
                                                                                );
                                                                        } else if (
                                                                            isChosen &&
                                                                            !isCorrectOpt
                                                                        ) {
                                                                            borderStyle =
                                                                                "border-rose-400 bg-rose-50 text-rose-900 ring-2 ring-rose-500/10";
                                                                            letterCircleStyle =
                                                                                "bg-rose-500 text-white font-medium";
                                                                            badge =
                                                                                (
                                                                                    <span className="text-[9px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-md animate-scale-in">
                                                                                        Bạn
                                                                                        chọn
                                                                                    </span>
                                                                                );
                                                                        } else if (
                                                                            isChosen
                                                                        ) {
                                                                            borderStyle =
                                                                                "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/10";
                                                                            letterCircleStyle =
                                                                                "bg-emerald-500 text-white font-medium";
                                                                            badge =
                                                                                (
                                                                                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white font-medium flex items-center justify-center animate-scale-in">
                                                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                                                    </div>
                                                                                );
                                                                        }

                                                                        return (
                                                                            <div
                                                                                key={
                                                                                    idx
                                                                                }
                                                                                className={`w-full flex items-center justify-between p-4 border rounded-lg text-left font-medium transition-all duration-155 ${borderStyle}`}
                                                                            >
                                                                                <div className="flex items-center gap-3">
                                                                                    <span
                                                                                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] ${letterCircleStyle}`}
                                                                                    >
                                                                                        {String.fromCharCode(
                                                                                            65 +
                                                                                                idx,
                                                                                        )}
                                                                                    </span>
                                                                                    <span
                                                                                        dangerouslySetInnerHTML={{
                                                                                            __html: renderMathHtml(
                                                                                                cleanedOpt,
                                                                                            ),
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                                {
                                                                                    badge
                                                                                }
                                                                            </div>
                                                                        );
                                                                    },
                                                                )}
                                                            </div>
                                                        );
                                                    } else if (
                                                        q.type === "true_false"
                                                    ) {
                                                        const correctTf =
                                                            q.correctAnswers || [
                                                                false,
                                                                false,
                                                                false,
                                                                false,
                                                            ];
                                                        const studentTf =
                                                            (chosen as (
                                                                | boolean
                                                                | null
                                                            )[]) || [
                                                                null,
                                                                null,
                                                                null,
                                                                null,
                                                            ];

                                                        return (
                                                            <div className="bg-slate-50 border border-slate-300 p-4 rounded-xl space-y-3 overflow-x-auto">
                                                                <div className="grid grid-cols-12 text-[10px] font-bold text-gray-400 uppercase pb-2 border-b border-slate-200 min-w-[320px]">
                                                                    <div className="col-span-8 sm:col-span-9">
                                                                        Khẳng
                                                                        định /
                                                                        Nhận
                                                                        định
                                                                    </div>
                                                                    <div className="col-span-4 sm:col-span-3 text-center">
                                                                        Đáp án &
                                                                        Kết quả
                                                                    </div>
                                                                </div>
                                                                {q.options.map(
                                                                    (
                                                                        option,
                                                                        idx,
                                                                    ) => {
                                                                        const currentVal =
                                                                            studentTf[
                                                                                idx
                                                                            ];
                                                                        const correctVal =
                                                                            correctTf[
                                                                                idx
                                                                            ];
                                                                        const isCorrect =
                                                                            currentVal ===
                                                                            correctVal;
                                                                        const cleanedOption =
                                                                            option.replace(
                                                                                /^\s*[a-f][\)\.\:\-]\s*/i,
                                                                                "",
                                                                            );

                                                                        let dungBtnClass =
                                                                            "bg-white border border-slate-200 text-slate-400";
                                                                        let saiBtnClass =
                                                                            "bg-white border border-slate-200 text-slate-400";

                                                                        if (
                                                                            currentVal ===
                                                                            true
                                                                        ) {
                                                                            dungBtnClass =
                                                                                isCorrect
                                                                                    ? "bg-emerald-500 text-white shadow-sm"
                                                                                    : "bg-rose-500 text-white shadow-sm";
                                                                        } else if (
                                                                            currentVal ===
                                                                            false
                                                                        ) {
                                                                            saiBtnClass =
                                                                                isCorrect
                                                                                    ? "bg-emerald-500 text-white shadow-sm"
                                                                                    : "bg-rose-500 text-white shadow-sm";
                                                                        }

                                                                        if (
                                                                            correctVal ===
                                                                            true
                                                                        ) {
                                                                            dungBtnClass +=
                                                                                " ring-2 ring-emerald-500 ring-offset-1 border-emerald-500";
                                                                        } else {
                                                                            saiBtnClass +=
                                                                                " ring-2 ring-emerald-500 ring-offset-1 border-emerald-500";
                                                                        }

                                                                        return (
                                                                            <div
                                                                                key={
                                                                                    idx
                                                                                }
                                                                                className="grid grid-cols-12 items-center gap-2 py-2 border-b border-slate-100 last:border-0 min-w-[320px]"
                                                                            >
                                                                                <div className="col-span-8 sm:col-span-9 flex gap-2 text-slate-800 [&_img]:mx-auto [&_img]:block [&_img]:my-2">
                                                                                    <span className="font-bold text-slate-500">
                                                                                        {String.fromCharCode(
                                                                                            97 +
                                                                                                idx,
                                                                                        )}

                                                                                        )
                                                                                    </span>
                                                                                    <span
                                                                                        dangerouslySetInnerHTML={{
                                                                                            __html: renderMathHtml(
                                                                                                cleanedOption,
                                                                                            ),
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                                <div className="col-span-4 sm:col-span-3 flex justify-center gap-1.5">
                                                                                    <span
                                                                                        className={`px-3 py-1.5 rounded-md text-[10px] font-extrabold ${dungBtnClass}`}
                                                                                    >
                                                                                        Đúng
                                                                                    </span>
                                                                                    <span
                                                                                        className={`px-3 py-1.5 rounded-md text-[10px] font-extrabold ${saiBtnClass}`}
                                                                                    >
                                                                                        Sai
                                                                                    </span>
                                                                                    <span className="flex items-center ml-1">
                                                                                        {currentVal ===
                                                                                        null ? (
                                                                                            <span className="text-[9px] text-gray-400 font-bold">
                                                                                                Chưa
                                                                                                chọn
                                                                                            </span>
                                                                                        ) : isCorrect ? (
                                                                                            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                                                                                        ) : (
                                                                                            <AlertCircle className="w-4.5 h-4.5 text-rose-500" />
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    },
                                                                )}
                                                            </div>
                                                        );
                                                    } else if (
                                                        q.type ===
                                                        "short_answer"
                                                    ) {
                                                        const textVal = String(
                                                            chosen || "",
                                                        );
                                                        const isCorrect =
                                                            status ===
                                                            "correct";

                                                        let inputBorderClass =
                                                            "border-rose-300 bg-rose-50/20 text-rose-900";
                                                        if (isCorrect) {
                                                            inputBorderClass =
                                                                "border-emerald-300 bg-emerald-50/20 text-emerald-900";
                                                        } else if (
                                                            textVal === ""
                                                        ) {
                                                            inputBorderClass =
                                                                "border-slate-300 bg-slate-50 text-slate-400";
                                                        }

                                                        return (
                                                            <div className="space-y-2">
                                                                <label className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">
                                                                    Đáp án ngắn
                                                                    của bạn:
                                                                </label>
                                                                <div className="flex flex-col gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={
                                                                            textVal !==
                                                                            ""
                                                                                ? textVal
                                                                                : "(Để trống)"
                                                                        }
                                                                        disabled
                                                                        className={`w-full px-4 py-3 font-bold rounded-lg ${inputBorderClass}`}
                                                                        style={{
                                                                            fontSize: `${fontSize}px`,
                                                                        }}
                                                                    />
                                                                    <div className="text-xs text-emerald-700 font-bold mt-1 flex items-center gap-1">
                                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                                        <span>
                                                                            Đáp
                                                                            án
                                                                            chính
                                                                            xác:{" "}
                                                                            {
                                                                                q.shortAnswerKey
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>

                                            {/* Rich HTML Explanation */}
                                            {q.explanation && (
                                                <div
                                                    className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2"
                                                    style={{
                                                        fontSize: `${fontSize - 1}px`,
                                                    }}
                                                >
                                                    <div className="flex items-center gap-1.5 text-[#2B5467] font-extrabold">
                                                        <BookOpen className="w-4 h-4 text-[#2B5467]" />
                                                        <span>
                                                            Lời giải chi tiết:
                                                        </span>
                                                    </div>
                                                    <div
                                                        className="text-slate-700 overflow-x-auto leading-relaxed pl-2 [&_img]:mx-auto [&_img]:block [&_img]:my-4"
                                                        dangerouslySetInnerHTML={{
                                                            __html: renderMathHtml(
                                                                q.explanation,
                                                            ),
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Quiz Navigation Buttons Row */}
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                            <button
                                                type="button"
                                                id="btn-prev-question"
                                                onClick={() =>
                                                    setReviewQuestionIdx((p) =>
                                                        Math.max(0, p - 1),
                                                    )
                                                }
                                                disabled={safeIdx === 0}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 border border-gray-100 hover:bg-slate-100 disabled:opacity-40 text-slate-600 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                                <span>Quay lại</span>
                                            </button>

                                            <button
                                                type="button"
                                                id="btn-next-question"
                                                onClick={() =>
                                                    setReviewQuestionIdx((p) =>
                                                        Math.min(
                                                            totalQ - 1,
                                                            p + 1,
                                                        ),
                                                    )
                                                }
                                                disabled={
                                                    safeIdx === totalQ - 1
                                                }
                                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                                            >
                                                <span>Tiếp theo</span>
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* RIGHT COLUMN: Questions Tracker & Quick Select Panel */}
                                <div className="w-full xl:w-80 bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-6 xl:absolute xl:right-8 xl:top-0 xl:h-full xl:overflow-y-auto flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                                            Bảng câu hỏi
                                        </h3>
                                        <p className="text-[10px] text-gray-500 mt-1 flex items-center flex-wrap gap-1">
                                            <span className="inline-block w-2.5 h-2.5 bg-emerald-200 border border-emerald-350 rounded-sm"></span>{" "}
                                            <span className="mr-1">Đúng</span>
                                            <span className="inline-block w-2.5 h-2.5 bg-rose-200 border border-rose-350 rounded-sm"></span>{" "}
                                            <span className="mr-1">Sai</span>
                                            <span className="inline-block w-2.5 h-2.5 bg-slate-100 border border-slate-250 rounded-sm"></span>{" "}
                                            <span>Chưa làm</span>
                                        </p>
                                    </div>

                                    {/* Render Questions grouped by Section */}
                                    <div className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0">
                                        {(() => {
                                            // Group questions by section
                                            const sections: Record<
                                                string,
                                                {
                                                    qIndex: number;
                                                    q: Question;
                                                }[]
                                            > = {};
                                            quiz.questions.forEach((q, idx) => {
                                                const secTitle =
                                                    q.sectionTitle ||
                                                    "Phần câu hỏi";
                                                if (!sections[secTitle]) {
                                                    sections[secTitle] = [];
                                                }
                                                sections[secTitle].push({
                                                    qIndex: idx,
                                                    q,
                                                });
                                            });

                                            return Object.entries(sections).map(
                                                ([secTitle, items]) => (
                                                    <div
                                                        key={secTitle}
                                                        className="space-y-2"
                                                    >
                                                        <h4 className="text-[10px] font-bold text-brand-600 bg-brand-50/50 px-2 py-1 rounded border border-brand-100/40">
                                                            {secTitle}
                                                        </h4>
                                                        <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2 p-1">
                                                            {items.map(
                                                                ({
                                                                    qIndex,
                                                                    q,
                                                                }) => {
                                                                    const s =
                                                                        qStatuses[
                                                                            qIndex
                                                                        ];
                                                                    const isCurrent =
                                                                        qIndex ===
                                                                        safeIdx;

                                                                    let btnColorClass =
                                                                        "bg-rose-200 text-rose-900 border-rose-300 hover:bg-rose-300";
                                                                    if (
                                                                        s ===
                                                                        "correct"
                                                                    ) {
                                                                        btnColorClass =
                                                                            "bg-emerald-200 text-emerald-900 border-emerald-300 hover:bg-emerald-300";
                                                                    } else if (
                                                                        s ===
                                                                        "partial"
                                                                    ) {
                                                                        btnColorClass =
                                                                            "bg-amber-200 text-amber-900 border-amber-300 hover:bg-amber-300";
                                                                    } else if (
                                                                        s ===
                                                                        "unanswered"
                                                                    ) {
                                                                        btnColorClass =
                                                                            "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200";
                                                                    }

                                                                    return (
                                                                        <button
                                                                            key={
                                                                                q.id
                                                                            }
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setReviewQuestionIdx(
                                                                                    qIndex,
                                                                                )
                                                                            }
                                                                            className={`w-9 h-9 rounded-lg text-xs font-bold transition-all relative flex items-center justify-center cursor-pointer border ${btnColorClass} ${
                                                                                isCurrent
                                                                                    ? "ring-2 ring-slate-400 ring-offset-1 border-slate-500 scale-105 shadow-xs z-10"
                                                                                    : ""
                                                                            }`}
                                                                        >
                                                                            {qIndex +
                                                                                1}
                                                                        </button>
                                                                    );
                                                                },
                                                            )}
                                                        </div>
                                                    </div>
                                                ),
                                            );
                                        })()}
                                    </div>

                                    {/* Font Size Adjuster Controls */}
                                    <div className="flex items-center justify-between px-1 py-2 border-t border-gray-200 text-xs text-slate-600 font-medium">
                                        <span>Cỡ chữ đề thi:</span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFontSize((prev) =>
                                                        Math.max(11, prev - 1),
                                                    )
                                                }
                                                className="w-6 h-6 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-95 transition-all"
                                                title="Giảm cỡ chữ"
                                            >
                                                -
                                            </button>
                                            <span className="font-bold text-slate-800 w-8 text-center">
                                                {fontSize}px
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFontSize((prev) =>
                                                        Math.min(20, prev + 1),
                                                    )
                                                }
                                                className="w-6 h-6 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-95 transition-all"
                                                title="Tăng cỡ chữ"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/* Exit button styled exactly like submit quiz */}
                                    <div className="pt-4 border-t border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (window.history.length > 1)
                                                    window.history.back();
                                                else onNavigate("/");
                                            }}
                                            className="w-full py-3 bg-gradient-to-r from-slate-700 to-slate-800 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 cursor-pointer"
                                        >
                                            <span>Thoát xem lại</span>
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()
                ) : activeQuiz ? (
                    <div className="w-full px-4 xl:px-8 relative flex-1 min-h-0 flex flex-col xl:h-full xl:min-h-0 gap-6">
                        {/* CENTER COLUMN: Question Box Card & Options */}
                        <div className="w-full xl:max-w-4xl xl:mx-auto xl:h-full xl:min-h-0 flex flex-col">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.99 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white border border-gray-100 rounded-xl p-6 sm:p-8 shadow-sm space-y-6 flex flex-col justify-between xl:h-full xl:min-h-0"
                            >
                                {/* Quiz Player Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
                                    <div>
                                        <span className="text-[9px] font-bold tracking-wider uppercase bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-md">
                                            {activeQuiz.subject}
                                        </span>
                                        <h2 className="text-sm font-bold text-slate-900 mt-2">
                                            {activeQuiz.title}
                                        </h2>
                                    </div>

                                    {/* Timer Pill */}
                                    <div
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border ${
                                            timeLeft < 60
                                                ? "bg-rose-50 border-rose-100 text-rose-600 animate-pulse"
                                                : "bg-brand-50 border-brand-200 text-brand-700"
                                        } text-xs font-bold self-start sm:self-auto`}
                                    >
                                        <Clock className="w-4.5 h-4.5" />
                                        <span>
                                            Thời gian: {formatTime(timeLeft)}
                                        </span>
                                    </div>
                                </div>

                                {/* Questions tracker progress bar */}
                                {(() => {
                                    const answeredCount =
                                        activeQuiz.questions.filter((q) => {
                                            const ans = selectedAnswers[q.id];
                                            if (q.type === "true_false") {
                                                return (
                                                    ans !== undefined &&
                                                    Array.isArray(ans) &&
                                                    ans.some(
                                                        (x) =>
                                                            x !== undefined &&
                                                            x !== null,
                                                    )
                                                );
                                            } else {
                                                return (
                                                    ans !== undefined &&
                                                    ans !== ""
                                                );
                                            }
                                        }).length;
                                    const progressPercent = Math.round(
                                        (answeredCount /
                                            activeQuiz.questions.length) *
                                            100,
                                    );

                                    return (
                                        <div>
                                            <div className="flex justify-between text-[11px] font-semibold text-gray-400 mb-1.5">
                                                <span>
                                                    Câu hỏi{" "}
                                                    {currentQuestionIdx + 1}{" "}
                                                    trên{" "}
                                                    {
                                                        activeQuiz.questions
                                                            .length
                                                    }
                                                </span>
                                                <span>
                                                    Tiến độ: {progressPercent}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-brand-300 rounded-full transition-all duration-300"
                                                    style={{
                                                        width: `${progressPercent}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Question & Options Scroll Container */}
                                <div
                                    className="flex-1 overflow-y-auto pr-1 space-y-5 min-h-0"
                                    style={{ fontSize: `${fontSize}px` }}
                                >
                                    {/* Question Box Card */}
                                    <div className="bg-bg-base dark:bg-bg-card border border-border-primary dark:border-slate-800 p-6 rounded-xl space-y-4">
                                        {activeQuiz.questions[
                                            currentQuestionIdx
                                        ].sectionTitle && (
                                            <div className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 inline-block uppercase tracking-wider">
                                                {
                                                    activeQuiz.questions[
                                                        currentQuestionIdx
                                                    ].sectionTitle
                                                }
                                            </div>
                                        )}
                                        <h3
                                            className="font-semibold text-slate-900 leading-relaxed overflow-x-auto [&_img]:mx-auto [&_img]:block [&_img]:my-4"
                                            style={{
                                                fontSize: `${fontSize + 1}px`,
                                            }}
                                        >
                                            {(() => {
                                                const currentQuestion =
                                                    activeQuiz.questions[
                                                        currentQuestionIdx
                                                    ];
                                                const cleanedText =
                                                    currentQuestion.type ===
                                                    "true_false"
                                                        ? cleanTrueFalseQuestionText(
                                                              currentQuestion.text,
                                                          )
                                                        : currentQuestion.text;
                                                return (
                                                    <span
                                                        dangerouslySetInnerHTML={{
                                                            __html: renderMathHtml(
                                                                cleanedText,
                                                            ),
                                                        }}
                                                    />
                                                );
                                            })()}
                                        </h3>

                                        {/* Options rendering depending on type */}
                                        {(() => {
                                            const q =
                                                activeQuiz.questions[
                                                    currentQuestionIdx
                                                ];
                                            const qId = q.id;

                                            if (
                                                !q.type ||
                                                q.type === "single_choice"
                                            ) {
                                                return (
                                                    <div className="space-y-3">
                                                        {q.options.map(
                                                            (option, idx) => {
                                                                const isSelected =
                                                                    selectedAnswers[
                                                                        qId
                                                                    ] === idx;
                                                                return (
                                                                    <button
                                                                        key={
                                                                            idx
                                                                        }
                                                                        type="button"
                                                                        id={`btn-option-${idx}`}
                                                                        onClick={() =>
                                                                            setSelectedAnswers(
                                                                                {
                                                                                    ...selectedAnswers,
                                                                                    [qId]: idx,
                                                                                },
                                                                            )
                                                                        }
                                                                        className={`w-full flex items-center justify-between p-4 bg-white border rounded-lg text-left font-medium transition-all duration-150 cursor-pointer ${
                                                                            isSelected
                                                                                ? "border-brand-300 bg-brand-50/20 text-emerald-800 ring-1 ring-emerald-500/20"
                                                                                : "border-gray-200 text-slate-700 hover:border-gray-300"
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <span
                                                                                className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                                                                                    isSelected
                                                                                        ? "bg-brand-300 text-white font-medium"
                                                                                        : "bg-slate-100 text-slate-500"
                                                                                }`}
                                                                            >
                                                                                {String.fromCharCode(
                                                                                    65 +
                                                                                        idx,
                                                                                )}
                                                                            </span>
                                                                            <span
                                                                                dangerouslySetInnerHTML={{
                                                                                    __html: renderMathHtml(
                                                                                        option,
                                                                                    ),
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        {isSelected && (
                                                                            <div className="w-5 h-5 rounded-full bg-brand-300 text-white font-medium flex items-center justify-center animate-scale-in">
                                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                            </div>
                                                                        )}
                                                                    </button>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                );
                                            } else if (
                                                q.type === "true_false"
                                            ) {
                                                const tfAnswers =
                                                    (selectedAnswers[qId] as (
                                                        | boolean
                                                        | null
                                                    )[]) || [
                                                        null,
                                                        null,
                                                        null,
                                                        null,
                                                    ];
                                                return (
                                                    <div className="bg-slate-50 border border-slate-300 p-4 rounded-xl space-y-3 overflow-x-auto">
                                                        <div className="grid grid-cols-12 text-[10px] font-bold text-gray-400 uppercase pb-2 border-b border-slate-200 min-w-[320px]">
                                                            <div className="col-span-8 sm:col-span-9">
                                                                Khẳng định /
                                                                Nhận định
                                                            </div>
                                                            <div className="col-span-4 sm:col-span-3 text-center">
                                                                Lựa chọn của bạn
                                                            </div>
                                                        </div>
                                                        {q.options.map(
                                                            (option, idx) => {
                                                                const currentVal =
                                                                    tfAnswers[
                                                                        idx
                                                                    ];
                                                                const cleanedOption =
                                                                    option.replace(
                                                                        /^\s*[a-f][\)\.\:\-]\s*/i,
                                                                        "",
                                                                    );
                                                                return (
                                                                    <div
                                                                        key={
                                                                            idx
                                                                        }
                                                                        className="grid grid-cols-12 items-center gap-2 py-2 border-b border-slate-100 last:border-0 min-w-[320px]"
                                                                    >
                                                                        <div className="col-span-8 sm:col-span-9 flex gap-2 text-slate-800 [&_img]:mx-auto [&_img]:block [&_img]:my-2">
                                                                            <span className="font-bold text-slate-500">
                                                                                {String.fromCharCode(
                                                                                    97 +
                                                                                        idx,
                                                                                )}

                                                                                )
                                                                            </span>
                                                                            <span
                                                                                dangerouslySetInnerHTML={{
                                                                                    __html: renderMathHtml(
                                                                                        cleanedOption,
                                                                                    ),
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <div className="col-span-4 sm:col-span-3 flex justify-center gap-1.5">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const updated =
                                                                                        [
                                                                                            ...tfAnswers,
                                                                                        ];
                                                                                    updated[
                                                                                        idx
                                                                                    ] =
                                                                                        true;
                                                                                    setSelectedAnswers(
                                                                                        {
                                                                                            ...selectedAnswers,
                                                                                            [qId]: updated,
                                                                                        },
                                                                                    );
                                                                                }}
                                                                                className={`px-3 py-1.5 rounded-md text-[10px] font-extrabold transition-all cursor-pointer ${
                                                                                    currentVal ===
                                                                                    true
                                                                                        ? "bg-emerald-500 text-white shadow-sm"
                                                                                        : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                                                                                }`}
                                                                            >
                                                                                Đúng
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const updated =
                                                                                        [
                                                                                            ...tfAnswers,
                                                                                        ];
                                                                                    updated[
                                                                                        idx
                                                                                    ] =
                                                                                        false;
                                                                                    setSelectedAnswers(
                                                                                        {
                                                                                            ...selectedAnswers,
                                                                                            [qId]: updated,
                                                                                        },
                                                                                    );
                                                                                }}
                                                                                className={`px-3 py-1.5 rounded-md text-[10px] font-extrabold transition-all cursor-pointer ${
                                                                                    currentVal ===
                                                                                    false
                                                                                        ? "bg-rose-500 text-white shadow-sm"
                                                                                        : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                                                                                }`}
                                                                            >
                                                                                Sai
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                );
                                            } else if (
                                                q.type === "short_answer"
                                            ) {
                                                const textVal =
                                                    (selectedAnswers[
                                                        qId
                                                    ] as string) || "";
                                                return (
                                                    <div className="space-y-2">
                                                        <label className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">
                                                            Nhập đáp án ngắn của
                                                            bạn:
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={textVal}
                                                            onChange={(e) =>
                                                                setSelectedAnswers(
                                                                    {
                                                                        ...selectedAnswers,
                                                                        [qId]: e
                                                                            .target
                                                                            .value,
                                                                    },
                                                                )
                                                            }
                                                            placeholder="Ví dụ: 150, 24, 2.05, -3..."
                                                            className="w-full px-4 py-3 bg-slate-50 border border-purple-200 hover:border-purple-300 focus:border-purple-500 focus:bg-white font-bold text-slate-900 rounded-lg focus:outline-none transition-all placeholder:text-slate-400"
                                                            style={{
                                                                fontSize: `${fontSize}px`,
                                                            }}
                                                        />
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                </div>

                                {/* Quiz Navigation Buttons Row */}
                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    <button
                                        type="button"
                                        id="btn-prev-question"
                                        onClick={() =>
                                            setCurrentQuestionIdx((prev) =>
                                                Math.max(0, prev - 1),
                                            )
                                        }
                                        disabled={currentQuestionIdx === 0}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 border border-gray-100 hover:bg-slate-100 disabled:opacity-40 text-slate-600 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        <span>Quay lại</span>
                                    </button>

                                    {currentQuestionIdx <
                                        activeQuiz.questions.length - 1 && (
                                        <button
                                            type="button"
                                            id="btn-next-question"
                                            onClick={() =>
                                                setCurrentQuestionIdx(
                                                    (prev) => prev + 1,
                                                )
                                            }
                                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                                        >
                                            <span>Tiếp theo</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </div>

                        {/* RIGHT COLUMN: Questions Tracker & Quick Select Panel */}
                        <div className="w-full xl:w-80 bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-6 xl:absolute xl:right-8 xl:top-0 xl:h-full xl:overflow-y-auto flex flex-col justify-between">
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                                    Bảng câu hỏi
                                </h3>
                                <p className="text-[10px] text-gray-500 mt-1">
                                    Click vào số câu để chuyển nhanh. Câu chưa
                                    làm có nền vàng nhạt, câu đã làm có nền xanh
                                    lá.
                                </p>
                            </div>

                            {/* Render Questions grouped by Section */}
                            <div className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0">
                                {(() => {
                                    // Group questions by section
                                    const sections: Record<
                                        string,
                                        { qIndex: number; q: Question }[]
                                    > = {};
                                    activeQuiz.questions.forEach((q, idx) => {
                                        const secTitle =
                                            q.sectionTitle || "Phần câu hỏi";
                                        if (!sections[secTitle]) {
                                            sections[secTitle] = [];
                                        }
                                        sections[secTitle].push({
                                            qIndex: idx,
                                            q,
                                        });
                                    });

                                    return Object.entries(sections).map(
                                        ([secTitle, items]) => (
                                            <div
                                                key={secTitle}
                                                className="space-y-2"
                                            >
                                                <h4 className="text-[10px] font-bold text-brand-600 bg-brand-50/50 px-2 py-1 rounded border border-brand-100/40">
                                                    {secTitle}
                                                </h4>
                                                <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2 p-1">
                                                    {items.map(
                                                        ({ qIndex, q }) => {
                                                            const ans =
                                                                selectedAnswers[
                                                                    q.id
                                                                ];

                                                            // Determine if question is answered
                                                            let isAnswered = false;
                                                            if (
                                                                q.type ===
                                                                "true_false"
                                                            ) {
                                                                isAnswered =
                                                                    ans !==
                                                                        undefined &&
                                                                    Array.isArray(
                                                                        ans,
                                                                    ) &&
                                                                    ans.some(
                                                                        (x) =>
                                                                            x !==
                                                                                undefined &&
                                                                            x !==
                                                                                null,
                                                                    );
                                                            } else {
                                                                isAnswered =
                                                                    ans !==
                                                                        undefined &&
                                                                    ans !== "";
                                                            }

                                                            const isCurrent =
                                                                qIndex ===
                                                                currentQuestionIdx;

                                                            return (
                                                                <button
                                                                    key={q.id}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setCurrentQuestionIdx(
                                                                            qIndex,
                                                                        )
                                                                    }
                                                                    className={`w-9 h-9 rounded-lg text-xs font-bold transition-all relative flex items-center justify-center cursor-pointer border ${
                                                                        isCurrent
                                                                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                                                            : isAnswered
                                                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                              : "bg-amber-50 text-amber-700 border-amber-200"
                                                                    }`}
                                                                >
                                                                    {qIndex + 1}
                                                                </button>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            </div>
                                        ),
                                    );
                                })()}
                            </div>

                            {/* Font Size Adjuster Controls */}
                            <div className="flex items-center justify-between px-1 py-2 border-t border-gray-100 text-xs text-slate-600 font-medium">
                                <span>Cỡ chữ đề thi:</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setFontSize((prev) =>
                                                Math.max(11, prev - 1),
                                            )
                                        }
                                        className="w-6 h-6 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-95 transition-all"
                                        title="Giảm cỡ chữ"
                                    >
                                        -
                                    </button>
                                    <span className="font-bold text-slate-800 w-8 text-center">
                                        {fontSize}px
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setFontSize((prev) =>
                                                Math.min(20, prev + 1),
                                            )
                                        }
                                        className="w-6 h-6 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-95 transition-all"
                                        title="Tăng cỡ chữ"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button inside the Panel */}
                            <div className="pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => handleQuizSubmit()}
                                    className="w-full py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 cursor-pointer"
                                >
                                    <span>Nộp bài kiểm tra</span>
                                    <CheckCircle2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : showResultSummary ? (
                    /* SUBMISSION SCORE OVERVIEW MODAL */
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-2xl mx-auto bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-center"
                    >
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-50 text-brand-600 border border-brand-200 rounded-full">
                            <Award className="w-8 h-8" />
                        </div>

                        <div>
                            <h2 className="text-base font-bold text-slate-900">
                                Chúc mừng bạn đã hoàn thành!
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">
                                Kết quả bài thi đã được đồng bộ lên học bạ điện
                                tử của giáo viên.
                            </p>
                        </div>

                        {/* Score Showcase Panel */}
                        <div className="bg-bg-base dark:bg-bg-card border border-border-primary dark:border-slate-800 rounded-2xl p-6 max-w-sm mx-auto">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                Điểm số đạt được
                            </span>
                            <span className="text-4xl font-extrabold text-brand-600 block mt-2">
                                {showResultSummary.score} / 10
                            </span>
                            <span className="text-[11px] text-gray-500 font-medium block mt-1.5">
                                Đúng{" "}
                                {Math.round(
                                    (showResultSummary.score / 10) *
                                        showResultSummary.totalQuestions,
                                )}{" "}
                                câu trên {showResultSummary.totalQuestions} câu
                            </span>
                        </div>

                        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setReviewSubmission(showResultSummary);
                                    setShowResultSummary(null);
                                }}
                                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                            >
                                Xem chi tiết bài làm
                            </button>
                            <button
                                type="button"
                                id="btn-back-to-dashboard"
                                onClick={() => setShowResultSummary(null)}
                                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                            >
                                Trở về Bảng điều khiển
                            </button>
                        </div>
                    </motion.div>
                ) : selectedGrade !== null ? (
                    <GradeView
                        user={user}
                        grade={selectedGrade}
                        quizzes={quizzes}
                        submissions={submissions}
                        onStartQuiz={handleStartQuiz}
                    />
                ) : (
                    /* STANDARD STUDENT DASHBOARD TABS */
                    <AnimatePresence mode="wait">
                        {activeTab === "student-dashboard" && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-8"
                            >
                                {/* Header section (Welcome back, Alex style) */}
                                {(() => {
                                    const completedCount =
                                        studentSubmissions.length;
                                    const averageScore =
                                        completedCount > 0
                                            ? (
                                                  studentSubmissions.reduce(
                                                      (sum, sub) =>
                                                          sum +
                                                          Number(sub.score),
                                                      0,
                                                  ) / completedCount
                                              ).toFixed(1)
                                            : "0.0";

                                    const uniqueQuizzesDone = new Set(
                                        studentSubmissions.map(
                                            (sub) => sub.quizId,
                                        ),
                                    ).size;
                                    const completionRate =
                                        quizzes.length > 0
                                            ? Math.round(
                                                  (uniqueQuizzesDone /
                                                      quizzes.length) *
                                                      100,
                                              )
                                            : 0;
                                    const totalStudyHours = Math.round(
                                        (completedCount * 45) / 60,
                                    );
                                    const totalCerts =
                                        studentSubmissions.filter(
                                            (sub) => Number(sub.score) >= 8.0,
                                        ).length;

                                    return (
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-slate-200">
                                            <div>
                                                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                                                    Chào mừng quay trở lại,{" "}
                                                    {user.name} 👋
                                                </h1>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                                                    Học tập chăm chỉ, tương lai
                                                    rạng ngời! Tiếp tục cố gắng
                                                    nhé.
                                                </p>
                                            </div>

                                            {/* Stats Grid */}
                                            <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-6 p-4 rounded-2xl">
                                                <div className="text-center min-w-[50px]">
                                                    <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase block tracking-wider">
                                                        Số đề thi
                                                    </span>
                                                    <span className="text-xs sm:text-sm lg:text-base font-black text-slate-800 dark:text-slate-200 block mt-0.5">
                                                        {quizzes.length}
                                                    </span>
                                                </div>
                                                <div className="text-center border-l border-gray-200 dark:border-slate-800 pl-3 min-w-[50px]">
                                                    <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase block tracking-wider">
                                                        Hoàn thành
                                                    </span>
                                                    <span className="text-xs sm:text-sm lg:text-base font-black text-slate-800 dark:text-slate-200 block mt-0.5">
                                                        {completionRate}%
                                                    </span>
                                                </div>

                                                <div className="text-center border-l border-gray-200 dark:border-slate-800 pl-3 min-w-[50px]">
                                                    <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase block tracking-wider">
                                                        Điểm TB
                                                    </span>
                                                    <span className="text-xs sm:text-sm lg:text-base font-black text-slate-800 dark:text-slate-200 block mt-0.5">
                                                        {averageScore}/10
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Row 1: Đề thi mới & Nhật ký timeline */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Left Column (2/3 width on desktop): Đề thi mới */}
                                    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black text-slate-900 tracking-wider uppercase">
                                                Đề thi mới
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onSelectGrade
                                                        ? onSelectGrade(null)
                                                        : undefined
                                                }
                                                className="text-[10px] font-bold text-[#2B5467] hover:underline cursor-pointer"
                                            >
                                                Xem tất cả
                                            </button>
                                        </div>

                                        {/* Horizontal scroll standard white cards (exactly identical layout & height) */}
                                        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-slate-200">
                                            {quizzes.slice(0, 3).map((quiz) => {
                                                const hasDone =
                                                    studentSubmissions.some(
                                                        (sub) =>
                                                            sub.quizId ===
                                                            quiz.id,
                                                    );
                                                return (
                                                    <div
                                                        key={quiz.id}
                                                        className="w-[280px] sm:w-[320px] flex-shrink-0 bg-white border border-gray-100/80 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:border-[#2B5467]/30 hover:shadow-xs transition-all duration-200"
                                                    >
                                                        <div>
                                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                                <span className="text-[9px] font-bold tracking-wider uppercase bg-brand-50 text-[#2B5467] border border-brand-200/50 px-2 py-0.5 rounded-md">
                                                                    {
                                                                        quiz.subject
                                                                    }
                                                                </span>
                                                                {hasDone ? (
                                                                    <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/30">
                                                                        Đã làm
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/30">
                                                                        Chưa làm
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 min-h-[40px]">
                                                                {quiz.title}
                                                            </h3>
                                                            <p className="text-xs text-gray-500 line-clamp-3 mt-2 min-h-[48px] leading-relaxed">
                                                                {quiz.description ||
                                                                    "Hãy click để tham gia làm bài thi thử môn Toán lớp học cô Trang."}
                                                            </p>
                                                        </div>

                                                        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                                                            <span className="text-[10px] text-slate-500 font-medium">
                                                                {
                                                                    quiz
                                                                        .questions
                                                                        .length
                                                                }{" "}
                                                                câu hỏi • 45
                                                                phút
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleStartQuiz(
                                                                        quiz,
                                                                    )
                                                                }
                                                                className="px-4 py-1.5 bg-[#2B5467] hover:bg-[#1E3B4B] text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                                                            >
                                                                Làm bài thi
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Right Column (1/3 width on desktop): Nhật ký timeline */}
                                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black text-slate-900 tracking-wider uppercase">
                                                {new Date().toLocaleDateString(
                                                    "vi-VN",
                                                    {
                                                        month: "long",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    },
                                                )}
                                            </h3>
                                            <span className="text-[10px] font-bold text-slate-400">
                                                Hôm nay
                                            </span>
                                        </div>

                                        {/* Timeline flow */}
                                        <div className="space-y-4 max-h-[170px] overflow-y-auto pr-1">
                                            {studentSubmissions.length > 0 ? (
                                                studentSubmissions
                                                    .slice(-2)
                                                    .reverse()
                                                    .map((sub, idx) => {
                                                        const timelineColors = [
                                                            "bg-emerald-50/65 border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30",
                                                            "bg-blue-50/65 border-blue-100 text-blue-800 dark:bg-blue-950/20 dark:border-blue-900/30",
                                                        ];
                                                        const bulletColors = [
                                                            "bg-emerald-500",
                                                            "bg-blue-500",
                                                        ];
                                                        return (
                                                            <div
                                                                key={sub.id}
                                                                className="flex gap-3 text-left"
                                                            >
                                                                <div className="flex flex-col items-center">
                                                                    <div
                                                                        className={`w-2 h-2 rounded-full mt-1.5 ${bulletColors[idx % 2]}`}
                                                                    />
                                                                    <div className="w-0.5 flex-1 bg-slate-150 my-1" />
                                                                </div>
                                                                <div
                                                                    className={`flex-1 border rounded-xl p-3 space-y-1 ${timelineColors[idx % 2]}`}
                                                                >
                                                                    <span className="text-[9px] font-bold uppercase tracking-wider block opacity-75">
                                                                        {sub.submittedAt.split(
                                                                            " ",
                                                                        )[1] ||
                                                                            "15:30"}{" "}
                                                                        - Hoàn
                                                                        thành
                                                                    </span>
                                                                    <h4 className="text-xs font-bold truncate">
                                                                        {
                                                                            sub.quizTitle
                                                                        }
                                                                    </h4>
                                                                    <p className="text-[10px] opacity-80 font-medium">
                                                                        Kết quả:{" "}
                                                                        {
                                                                            sub.score
                                                                        }
                                                                        /10 điểm
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                            ) : (
                                                <div className="text-center py-8 text-slate-400 text-xs italic">
                                                    Chưa ghi nhận lịch sử thi
                                                    thử hôm nay.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Row 2: Biểu đồ điểm số & Nhiệm vụ & Bạn học */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* 1. Activities Block (Line Chart) */}
                                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xs font-black text-slate-900 tracking-wider uppercase">
                                                    Biểu đồ điểm số
                                                </h3>
                                                <span className="text-[10px] font-bold text-slate-400">
                                                    Điểm số thật
                                                </span>
                                            </div>

                                            {/* SVG Dynamic Line Chart showing real scores */}
                                            <div className="h-28 w-full mt-4 relative flex items-end">
                                                {(() => {
                                                    const chartData =
                                                        studentSubmissions.slice(
                                                            -7,
                                                        );

                                                    const width = 260;
                                                    const height = 90;
                                                    const padding = 10;

                                                    if (
                                                        chartData.length === 0
                                                    ) {
                                                        return (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs italic">
                                                                Chưa có dữ liệu
                                                                điểm số.
                                                            </div>
                                                        );
                                                    }

                                                    const points =
                                                        chartData.map(
                                                            (sub, index) => {
                                                                const scoreVal =
                                                                    Number(
                                                                        sub.score,
                                                                    );
                                                                const x =
                                                                    padding +
                                                                    (index *
                                                                        (width -
                                                                            2 *
                                                                                padding)) /
                                                                        Math.max(
                                                                            1,
                                                                            chartData.length -
                                                                                1,
                                                                        );
                                                                const y =
                                                                    height -
                                                                    padding -
                                                                    (scoreVal /
                                                                        10) *
                                                                        (height -
                                                                            2 *
                                                                                padding);
                                                                return {
                                                                    x,
                                                                    y,
                                                                    score: scoreVal,
                                                                };
                                                            },
                                                        );

                                                    const pathD = points
                                                        .map(
                                                            (p, i) =>
                                                                `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`,
                                                        )
                                                        .join(" ");
                                                    const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

                                                    return (
                                                        <svg
                                                            viewBox={`0 0 ${width} ${height}`}
                                                            className="w-full h-full"
                                                        >
                                                            <defs>
                                                                <linearGradient
                                                                    id="chart-grad"
                                                                    x1="0"
                                                                    y1="0"
                                                                    x2="0"
                                                                    y2="1"
                                                                >
                                                                    <stop
                                                                        offset="0%"
                                                                        stopColor="#2B5467"
                                                                        stopOpacity="0.25"
                                                                    />
                                                                    <stop
                                                                        offset="100%"
                                                                        stopColor="#2B5467"
                                                                        stopOpacity="0"
                                                                    />
                                                                </linearGradient>
                                                            </defs>

                                                            {/* Y-axis helper lines */}
                                                            <line
                                                                x1="0"
                                                                y1={height / 2}
                                                                x2={width}
                                                                y2={height / 2}
                                                                stroke="#f1f5f9"
                                                                strokeWidth="1"
                                                                strokeDasharray="4"
                                                            />

                                                            {/* Area fill */}
                                                            <path
                                                                d={areaD}
                                                                fill="url(#chart-grad)"
                                                            />

                                                            {/* Line path */}
                                                            <path
                                                                d={pathD}
                                                                fill="none"
                                                                stroke="#2B5467"
                                                                strokeWidth="2.5"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />

                                                            {/* Data dots */}
                                                            {points.map(
                                                                (p, i) => (
                                                                    <g key={i}>
                                                                        <circle
                                                                            cx={
                                                                                p.x
                                                                            }
                                                                            cy={
                                                                                p.y
                                                                            }
                                                                            r="3"
                                                                            fill="#ffffff"
                                                                            stroke="#2B5467"
                                                                            strokeWidth="1.5"
                                                                        />
                                                                        <text
                                                                            x={
                                                                                p.x
                                                                            }
                                                                            y={
                                                                                p.y -
                                                                                6
                                                                            }
                                                                            textAnchor="middle"
                                                                            className="text-[7.5px] font-black fill-[#2B5467]"
                                                                        >
                                                                            {
                                                                                p.score
                                                                            }
                                                                        </text>
                                                                    </g>
                                                                ),
                                                            )}
                                                        </svg>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Tasks Block */}
                                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black text-slate-900 tracking-wider uppercase">
                                                Nhiệm vụ hôm nay
                                            </h3>
                                            <span className="text-[10px] font-bold text-slate-400">
                                                Nhiệm vụ
                                            </span>
                                        </div>

                                        {/* Tasks List */}
                                        <div className="space-y-3">
                                            {(() => {
                                                const hasDoneQuizToday =
                                                    studentSubmissions.length >
                                                    0;
                                                const hasHighScore =
                                                    studentSubmissions.some(
                                                        (sub) =>
                                                            Number(sub.score) >=
                                                            8.0,
                                                    );

                                                const tasksList = [
                                                    {
                                                        id: 1,
                                                        desc: "Làm đề thi thử mới nhất",
                                                        pts: "+500",
                                                        done: hasDoneQuizToday,
                                                        prog: hasDoneQuizToday
                                                            ? 100
                                                            : 0,
                                                    },
                                                    {
                                                        id: 2,
                                                        desc: "Đạt điểm Giỏi (> 8.0)",
                                                        pts: "+1,500",
                                                        done: hasHighScore,
                                                        prog: hasHighScore
                                                            ? 100
                                                            : 0,
                                                    },
                                                    {
                                                        id: 3,
                                                        desc: "Xem lời giải chi tiết",
                                                        pts: "+250",
                                                        done: true,
                                                        prog: 100,
                                                    },
                                                    {
                                                        id: 4,
                                                        desc: "Học liên tục 3 ngày",
                                                        pts: "+500",
                                                        done: false,
                                                        prog: 66,
                                                    },
                                                ];

                                                return tasksList.map((task) => (
                                                    <div
                                                        key={task.id}
                                                        className="flex items-center justify-between gap-3 text-left"
                                                    >
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span
                                                                    className={`text-[10px] font-bold ${task.done ? "text-slate-400 line-through" : "text-slate-800"}`}
                                                                >
                                                                    {task.desc}
                                                                </span>
                                                                <span className="text-[9px] font-extrabold text-[#2B5467]">
                                                                    {task.pts}{" "}
                                                                    điểm
                                                                </span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                                                                <div
                                                                    className="bg-[#2B5467] h-full transition-all duration-300"
                                                                    style={{
                                                                        width: `${task.prog}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                alert(
                                                                    `Đã nhận thành công ${task.pts} điểm tích lũy học tập! 🌟`,
                                                                )
                                                            }
                                                            className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer active:scale-95 ${
                                                                task.done
                                                                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                                                    : "bg-slate-50 text-slate-300 cursor-not-allowed"
                                                            }`}
                                                            disabled={
                                                                !task.done
                                                            }
                                                        >
                                                            Nhận
                                                        </button>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </div>

                                    {/* 3. Leaderboard Block */}
                                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black text-slate-900 tracking-wider uppercase">
                                                Bảng xếp hạng bạn học
                                            </h3>
                                            <span className="text-[10px] font-bold text-slate-400">
                                                Xếp hạng
                                            </span>
                                        </div>

                                        {/* Leaderboard list */}
                                        <div className="space-y-2.5">
                                            {[
                                                {
                                                    rank: 1,
                                                    name: "Nguyễn Minh Anh",
                                                    pts: 10568,
                                                    isMe: false,
                                                },
                                                {
                                                    rank: 2,
                                                    name: "Trần Đức Huy",
                                                    pts: 10112,
                                                    isMe: false,
                                                },
                                                {
                                                    rank: 3,
                                                    name: "Phạm Thảo Vy",
                                                    pts: 9052,
                                                    isMe: false,
                                                },
                                                {
                                                    rank: 4,
                                                    name: user.name,
                                                    pts:
                                                        8000 +
                                                        studentSubmissions.length *
                                                            150,
                                                    isMe: true,
                                                },
                                                {
                                                    rank: 5,
                                                    name: "Lê Nam Khánh",
                                                    pts: 7520,
                                                    isMe: false,
                                                },
                                            ].map((friend) => (
                                                <div
                                                    key={friend.rank}
                                                    className={`flex items-center justify-between p-2 rounded-xl border ${
                                                        friend.isMe
                                                            ? "bg-brand-50/50 border-brand-200/50"
                                                            : "bg-slate-50/40 border-slate-100/50"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="text-[10px] font-black text-slate-500 w-3 text-center">
                                                            {friend.rank}
                                                        </span>
                                                        <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200 bg-amber-50">
                                                            <img
                                                                src={
                                                                    friend.isMe
                                                                        ? "/images/trang.jpg"
                                                                        : ""
                                                                }
                                                                alt={
                                                                    friend.name
                                                                }
                                                                className="w-full h-full object-cover"
                                                                onError={(
                                                                    e,
                                                                ) => {
                                                                    (
                                                                        e.target as HTMLImageElement
                                                                    ).src =
                                                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&background=random&size=40`;
                                                                }}
                                                            />
                                                        </div>
                                                        <span
                                                            className={`text-[10px] sm:text-[11px] font-bold truncate max-w-[80px] sm:max-w-[100px] ${
                                                                friend.isMe
                                                                    ? "text-brand-700"
                                                                    : "text-slate-800"
                                                            }`}
                                                        >
                                                            {friend.name}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-900 bg-white border border-gray-150 px-2 py-0.5 rounded-lg">
                                                        {friend.pts.toLocaleString()}{" "}
                                                        pts
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* TAB: AVAILABLE QUIZZES */}
                        {activeTab === "student-quizzes" && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                                        Danh sách Đề thi thử
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Chọn một trong các đề dưới đây để bắt
                                        đầu thời gian tính giờ thi.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {quizzes.map((quiz) => {
                                        const hasDone = studentSubmissions.some(
                                            (sub) => sub.quizId === quiz.id,
                                        );
                                        return (
                                            <div
                                                key={quiz.id}
                                                className="bg-white border border-gray-100/80 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:border-brand-300/20 transition-all duration-200"
                                            >
                                                <div>
                                                    <div className="flex items-center justify-between gap-2 mb-3">
                                                        <span className="text-[9px] font-bold tracking-wider uppercase bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-md">
                                                            {quiz.subject}
                                                        </span>
                                                        {hasDone ? (
                                                            <span className="text-[9px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200/30">
                                                                Đã làm
                                                            </span>
                                                        ) : (
                                                            <span className="text-[9px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200/30">
                                                                Chưa làm
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 min-h-[40px]">
                                                        {quiz.title}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 line-clamp-3 mt-2 min-h-[48px]">
                                                        {quiz.description}
                                                    </p>

                                                    <div className="flex items-center gap-4 border-t border-b border-gray-50 py-2.5 my-4 text-[11px] text-gray-500">
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock className="w-4 h-4 text-gray-400" />
                                                            <span>
                                                                {quiz.duration}{" "}
                                                                phút
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <HelpCircle className="w-4 h-4 text-gray-400" />
                                                            <span>
                                                                {
                                                                    quiz
                                                                        .questions
                                                                        .length
                                                                }{" "}
                                                                câu hỏi
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    id={`btn-start-quiz-${quiz.id}`}
                                                    onClick={() =>
                                                        handleStartQuiz(quiz)
                                                    }
                                                    className="w-full py-2.5 bg-gradient-to-r from-brand-300 to-brand-400 text-white font-medium hover:opacity-95 shadow-xs transition-all rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                                                >
                                                    <span>Bắt đầu làm bài</span>
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* TAB: STUDY HISTORY / RESULTS */}
                        {activeTab === "student-results" && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                                        Học bạ của tôi
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Lịch sử toàn bộ các đề trắc nghiệm bạn
                                        đã tham gia (Bấm để xem chi tiết đáp án
                                        & lời giải).
                                    </p>
                                </div>

                                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
                                    {studentSubmissions.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50/50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                        <th className="py-4 px-6">
                                                            Tên đề thi
                                                        </th>
                                                        <th className="py-4 px-6">
                                                            Thời gian nộp
                                                        </th>
                                                        <th className="py-4 px-6 text-center">
                                                            Đúng / Tổng số câu
                                                        </th>
                                                        <th className="py-4 px-6 text-right">
                                                            Điểm số
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 text-xs text-slate-700">
                                                    {studentSubmissions.map(
                                                        (sub) => (
                                                            <tr
                                                                key={sub.id}
                                                                className="hover:bg-slate-50/40 transition-colors cursor-pointer"
                                                                onClick={() =>
                                                                    onNavigate(
                                                                        "/result/" +
                                                                            sub.id,
                                                                    )
                                                                }
                                                            >
                                                                <td className="py-4 px-6 font-semibold text-slate-900">
                                                                    {
                                                                        sub.quizTitle
                                                                    }
                                                                </td>
                                                                <td className="py-4 px-6 text-gray-400 font-medium">
                                                                    {
                                                                        sub.submittedAt
                                                                    }
                                                                </td>
                                                                <td className="py-4 px-6 text-center text-slate-500 font-bold">
                                                                    {Math.round(
                                                                        (sub.score /
                                                                            10) *
                                                                            sub.totalQuestions,
                                                                    )}{" "}
                                                                    /{" "}
                                                                    {
                                                                        sub.totalQuestions
                                                                    }
                                                                </td>
                                                                <td className="py-4 px-6 text-right">
                                                                    <span className="px-2.5 py-1 bg-brand-50 text-brand-700 border border-brand-200/50 rounded-lg font-bold text-[11px]">
                                                                        {
                                                                            sub.score
                                                                        }
                                                                        /10
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center text-gray-400 italic">
                                            Chưa ghi nhận thông tin học bạ. Hãy
                                            làm đề thi thử đầu tiên để ghi nhận
                                            kết quả nhé!
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* UPGRADE MODAL */}
            {showUpgradeModal && (
                <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-5 w-full max-w-xs border border-slate-100 shadow-xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                            <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-2xl relative z-10 bg-amber-50">
                                <img
                                    src="/images/trang.jpg"
                                    alt="HiTrang Student Avatar"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>

                        {!showContactOptions ? (
                            <>
                                <div className="space-y-1.5">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        Học sinh cô Trang
                                    </h3>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Tính năng dành riêng cho học sinh cô
                                        Trang. Bạn vui lòng{" "}
                                        <span
                                            onClick={() =>
                                                setShowContactOptions(true)
                                            }
                                            className="underline cursor-pointer font-semibold text-slate-900 hover:text-slate-700"
                                        >
                                            liên hệ ngay
                                        </span>{" "}
                                        cô Trang để được thi thử nhé.
                                    </p>
                                </div>
                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={closeUpgradeModal}
                                        className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                                    >
                                        Đóng
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-1.5">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        Liên hệ cô Trang
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Chọn phương thức liên hệ thuận tiện
                                        nhất:
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 pt-1 text-left">
                                    <a
                                        href="https://zalo.me/0926550470"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors"
                                    >
                                        <span>Zalo (Cô Trang)</span>
                                        <span className="text-[10px] text-slate-400 font-normal">
                                            Mở Zalo →
                                        </span>
                                    </a>
                                    <a
                                        href="https://m.me/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors"
                                    >
                                        <span>Messenger</span>
                                        <span className="text-[10px] text-slate-400 font-normal">
                                            Mở chat →
                                        </span>
                                    </a>
                                    <a
                                        href="https://www.facebook.com/nguyen.trang.724265"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors"
                                    >
                                        <span>Facebook Cá Nhân</span>
                                        <span className="text-[10px] text-slate-400 font-normal">
                                            Ghé thăm →
                                        </span>
                                    </a>
                                    <a
                                        href="tel:0926550470"
                                        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors"
                                    >
                                        <span>Hotline / SĐT</span>
                                        <span className="text-[10px] text-slate-400 font-normal">
                                            Gọi ngay →
                                        </span>
                                    </a>
                                </div>
                                <div className="pt-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowContactOptions(false)
                                        }
                                        className="flex-1 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-medium rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                                    >
                                        Quay lại
                                    </button>
                                    <button
                                        type="button"
                                        onClick={closeUpgradeModal}
                                        className="flex-1 py-1.5 bg-slate-900 text-white text-[11px] font-medium rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                        Đóng
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
