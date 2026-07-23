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
                                {/* Custom Welcome Block Banner */}
                                <div className="bg-gradient-to-r from-brand-50/70 to-brand-100/40 dark:from-brand-950/20 dark:to-brand-900/10 text-slate-800 dark:text-slate-150 rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-brand-100 dark:border-brand-900/40 shadow-xs transition-all duration-200">
                                    <div className="absolute right-0 top-0 w-44 h-44 bg-brand-300/10 rounded-full blur-3xl" />
                                    <div className="relative z-10 max-w-md">
                                        <span className="text-[9px] font-bold bg-brand-100 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-200/40 dark:border-brand-500/20 px-2.5 py-1 rounded-md tracking-wider uppercase">
                                            Học Bài Thôi Em
                                        </span>
                                        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-3">
                                            Chào mừng quay trở lại, {user.name}!
                                        </h2>
                                        <p className="text-xs text-slate-600 dark:text-slate-355 leading-relaxed mt-2">
                                            Hôm nay là ngày tuyệt vời để nâng
                                            cao điểm số. Hãy kiểm tra các đề thi
                                            thử mới cập nhật trong tuần này nhé!
                                        </p>
                                    </div>
                                </div>

                                {/* Score Stats Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-xs">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            Đề thi Đang mở
                                        </span>
                                        <h3 className="text-xl font-bold text-slate-900 mt-1">
                                            {quizzes.length}
                                        </h3>
                                        <p className="text-[10px] text-brand-600 mt-1.5 font-medium">
                                            Bấm "Làm bài thi" để tham gia
                                        </p>
                                    </div>

                                    <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-xs">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            Bài đã hoàn thành
                                        </span>
                                        <h3 className="text-xl font-bold text-slate-900 mt-1">
                                            {completedCount}
                                        </h3>
                                        <p className="text-[10px] text-gray-500 mt-1.5">
                                            Lưu trữ trong học bạ cá nhân
                                        </p>
                                    </div>

                                    <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-xs">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            Điểm trung bình
                                        </span>
                                        <h3 className="text-xl font-bold text-slate-900 mt-1">
                                            {averageScore} / 10
                                        </h3>
                                        <p className="text-[10px] text-brand-600 mt-1.5 font-medium">
                                            Phong độ học tập xuất sắc
                                        </p>
                                    </div>
                                </div>

                                {/* Left: Next suggested exam. Right: Score Logs list */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Next Quiz Promoted Block */}
                                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight text-gray-400">
                                                Đề xuất ôn luyện
                                            </h4>
                                            {quizzes.length > 0 ? (
                                                <div className="mt-4 space-y-3">
                                                    <span className="text-[9px] font-bold bg-brand-50 text-brand-700 border border-brand-200 px-2.5 py-1 rounded-md uppercase">
                                                        HOT • CÓ SẴN
                                                    </span>
                                                    <h5 className="text-xs font-bold text-slate-800 line-clamp-2">
                                                        {quizzes[0].title}
                                                    </h5>
                                                    <p className="text-[11px] text-gray-500 line-clamp-3">
                                                        {quizzes[0].description}
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-400 italic mt-4">
                                                    Không có bài ôn tập khả
                                                    dụng.
                                                </p>
                                            )}
                                        </div>

                                        {quizzes.length > 0 && (
                                            <button
                                                type="button"
                                                id="btn-promoted-start-quiz"
                                                onClick={() =>
                                                    handleStartQuiz(quizzes[0])
                                                }
                                                className="mt-6 w-full py-2.5 bg-gradient-to-r from-brand-300 to-brand-400 text-white font-medium hover:opacity-95 shadow-xs transition-all rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                                            >
                                                <span>Thi thử ngay</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Submission history list log */}
                                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs lg:col-span-2">
                                        <h4 className="text-xs font-bold text-slate-900 mb-4">
                                            Nhật ký điểm số cá nhân
                                        </h4>
                                        <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                                            {studentSubmissions.length > 0 ? (
                                                studentSubmissions
                                                    .slice()
                                                    .reverse()
                                                    .map((sub) => (
                                                        <div
                                                            key={sub.id}
                                                            onClick={() =>
                                                                onNavigate(
                                                                    "/result/" +
                                                                        sub.id,
                                                                )
                                                            }
                                                            className="p-3 bg-bg-base dark:bg-bg-card hover:bg-slate-50 dark:hover:bg-slate-800 border border-border-primary dark:border-slate-800/60 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                                                        >
                                                            <div>
                                                                <p className="text-xs font-semibold text-slate-800 truncate max-w-[280px]">
                                                                    {
                                                                        sub.quizTitle
                                                                    }
                                                                </p>
                                                                <span className="text-[9px] text-gray-400 mt-1 block">
                                                                    Ngày nộp:{" "}
                                                                    {
                                                                        sub.submittedAt
                                                                    }
                                                                </span>
                                                            </div>
                                                            <span className="text-xs font-extrabold text-slate-900 bg-white border border-gray-100 px-2.5 py-1 rounded-lg">
                                                                {sub.score}/10
                                                            </span>
                                                        </div>
                                                    ))
                                            ) : (
                                                <p className="text-xs text-gray-400 italic text-center py-6">
                                                    Bạn chưa tham gia bài kiểm
                                                    tra nào.
                                                </p>
                                            )}
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
