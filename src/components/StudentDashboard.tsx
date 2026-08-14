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
    Loader2,
    Crown,
} from "lucide-react";
import {
    Quiz,
    Question,
    Submission,
    User,
    QuizLeaderboardEntry,
} from "../types";
import { renderMathHtml } from "../lib/math";
import GradeView from "./GradeView";
import {
    getOrCreateAttempt,
    updateAttemptAnswers,
    finalizeAndSubmitAttempt,
    getStudentQuestions,
    getReviewQuestions,
    getActiveAttempt,
    getQuizLeaderboard,
    getOverallLeaderboard,
} from "../lib/supabaseService";

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
    onSelectGrade: (grade: string | null, category?: string) => void;
    onQuizStateChange?: (isTaking: boolean) => void;
    activeQuizId?: string | null;
    reviewSubmissionId?: string | null;
    onNavigate: (path: string, bypassConfirm?: boolean) => void;
    navigateReplace?: (path: string) => void;
    ongoingAttempt?: any | null;
    loading?: boolean;
    currentPath?: string;
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
    navigateReplace,
    ongoingAttempt,
    loading,
    currentPath,
}: StudentDashboardProps) {
    // Quiz Active State
    const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);

    // User Ranking State
    const [userRank, setUserRank] = useState<{
        rankPosition: number;
        totalUsers: number;
    } | null>(null);

    useEffect(() => {
        const fetchUserRank = async () => {
            if (!user) return;
            try {
                const grade = user.grade || "10";
                const leaderboard = await getOverallLeaderboard(grade);
                const userEntry = leaderboard.find(
                    (entry) => entry.studentId === user.id,
                );
                if (userEntry) {
                    setUserRank({
                        rankPosition: userEntry.rankPosition,
                        totalUsers: leaderboard.length,
                    });
                } else {
                    setUserRank(null);
                }
            } catch (err) {
                console.error("Error fetching user rank for dashboard:", err);
            }
        };
        fetchUserRank();
    }, [user, submissions]);

    const isGradeMismatch =
        user.role === "student" &&
        !!user.grade &&
        !!activeQuiz?.grade &&
        user.grade !== activeQuiz.grade;
    const [quizEntryPhase, setQuizEntryPhase] = useState<
        "none" | "entry" | "taking"
    >("none");
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [fontSize, setFontSize] = useState<number>(13); // Default font size in px
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, any>>(
        {},
    );
    const [timeLeft, setTimeLeft] = useState(0); // in seconds
    const [quizTimerActive, setQuizTimerActive] = useState(false);
    const [currentAttempt, setCurrentAttempt] = useState<any>(null);
    const [loadingAttempt, setLoadingAttempt] = useState(false);
    const [reviewQuiz, setReviewQuiz] = useState<Quiz | null>(null);
    const [loadingReview, setLoadingReview] = useState(false);
    const [activeAttemptInProgress, setActiveAttemptInProgress] = useState<
        any | null
    >(null);
    const [loadingCheckAttempt, setLoadingCheckAttempt] = useState(false);

    // Quiz leaderboard states
    const [quizLeaderboard, setQuizLeaderboard] = useState<
        QuizLeaderboardEntry[]
    >([]);
    const [loadingQuizLeaderboard, setLoadingQuizLeaderboard] =
        useState<boolean>(false);

    // Prevent leaving page/tab changes & detect tab switching
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 12;

    // Reset page when activeTab changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    const totalPages = Math.ceil(quizzes.length / pageSize);
    const paginatedQuizzes = quizzes.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
    );

    // Prevent leaving page/tab changes & detect tab switching
    useEffect(() => {
        if (onQuizStateChange) {
            onQuizStateChange(
                activeQuiz !== null && quizEntryPhase === "taking",
            );
        }

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (activeQuiz && quizEntryPhase === "taking") {
                e.preventDefault();
                e.returnValue = "ê bé, đang làm mà chuyển đi đâu thế.";
                return "ê bé, đang làm mà chuyển đi đâu thế.";
            }
        };

        const handleVisibilityChange = () => {
            if (activeQuiz && quizEntryPhase === "taking" && document.hidden) {
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
    }, [activeQuiz, quizEntryPhase, onQuizStateChange]);

    // Result Overview State
    const [showResultSummary, setShowResultSummary] =
        useState<Submission | null>(null);
    const [hoveredChartPoint, setHoveredChartPoint] = useState<number | null>(
        null,
    );

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
                const quiz =
                    reviewQuiz ||
                    quizzes.find((q) => q.id === reviewSubmission.quizId);
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

    // Start the quiz attempt when student confirms on Entry Screen
    const startQuizAttempt = async () => {
        if (!activeQuiz) return;
        if (isGradeMismatch) {
            alert(
                `Em đang là học sinh lớp ${user.grade} mà? Không được làm bài của lớp khác.`,
            );
            return;
        }

        // Request browser fullscreen synchronously under user gesture context
        try {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            }
        } catch (err) {
            console.warn("Lỗi khi chuyển sang chế độ toàn màn hình:", err);
        }

        setLoadingAttempt(true);
        try {
            const attempt = await getOrCreateAttempt(
                activeQuiz.id,
                activeQuiz.duration,
            );
            const questions = await getStudentQuestions(activeQuiz.id);
            setCurrentAttempt(attempt);
            setActiveQuiz({
                ...activeQuiz,
                questions,
            });
            setCurrentQuestionIdx(0);
            setSelectedAnswers(attempt.answers || {});
            setTimeLeft(attempt.remaining_seconds);
            setQuizTimerActive(true);
            setQuizEntryPhase("taking");
        } catch (err: any) {
            console.error("Lỗi khi khởi tạo lượt thi:", err);
            alert(
                "Không thể khởi tạo hoặc tiếp tục bài thi. Vui lòng thử lại!",
            );
            onNavigate("/", true);
        } finally {
            setLoadingAttempt(false);
        }
    };

    useEffect(() => {
        if (activeQuizId) {
            if (
                activeQuiz &&
                activeQuiz.id === activeQuizId &&
                quizEntryPhase === "taking"
            ) {
                return;
            }
            const quiz = quizzes.find((q) => q.id === activeQuizId);
            if (quiz) {
                setActiveQuiz(quiz);
                setQuizEntryPhase("entry");

                const checkAttempt = async () => {
                    setLoadingCheckAttempt(true);
                    try {
                        const activeAttempt = await getActiveAttempt(quiz.id);
                        setActiveAttemptInProgress(activeAttempt);
                    } catch (err) {
                        console.warn(
                            "Không thể kiểm tra lượt thi dang dở:",
                            err,
                        );
                    } finally {
                        setLoadingCheckAttempt(false);
                    }
                };

                const fetchLeaderboard = async () => {
                    setLoadingQuizLeaderboard(true);
                    try {
                        const data = await getQuizLeaderboard(quiz.id);
                        setQuizLeaderboard(data);
                    } catch (err) {
                        console.warn(
                            "Không thể tải bảng xếp hạng bài thi:",
                            err,
                        );
                    } finally {
                        setLoadingQuizLeaderboard(false);
                    }
                };

                checkAttempt();
                fetchLeaderboard();
            }
        } else {
            setActiveQuiz(null);
            setCurrentAttempt(null);
            setQuizTimerActive(false);
            setQuizEntryPhase("none");
            setActiveAttemptInProgress(null);
            setQuizLeaderboard([]);
        }
    }, [activeQuizId, quizzes, quizEntryPhase, activeQuiz]);

    // Auto-save effect
    useEffect(() => {
        if (!currentAttempt || !quizTimerActive) return;

        // Debounce saving answers to Supabase
        const delayDebounceFn = setTimeout(async () => {
            try {
                await updateAttemptAnswers(
                    currentAttempt.attempt_id,
                    selectedAnswers,
                );
                console.log("Đã tự động lưu đáp án nháp.");
            } catch (err) {
                console.warn(
                    "Không thể lưu nháp đáp án (học sinh có thể đang rớt mạng):",
                    err,
                );
            }
        }, 1500); // 1.5s debounce

        return () => clearTimeout(delayDebounceFn);
    }, [selectedAnswers, currentAttempt, quizTimerActive]);

    useEffect(() => {
        if (reviewSubmissionId) {
            const sub = submissions.find((s) => s.id === reviewSubmissionId);
            if (sub) {
                const initReview = async () => {
                    setLoadingReview(true);
                    try {
                        const questions = await getReviewQuestions(sub.id);
                        const quiz = quizzes.find((q) => q.id === sub.quizId);
                        if (quiz) {
                            setReviewQuiz({
                                ...quiz,
                                questions,
                            });
                            setReviewSubmission(sub);
                            setReviewQuestionIdx(0);
                        } else {
                            alert("Không tìm thấy đề thi tương ứng.");
                            onNavigate("/", true);
                        }
                    } catch (err) {
                        console.error("Lỗi khi tải câu hỏi xem lại:", err);
                        alert("Không thể tải câu hỏi xem lại bài thi.");
                        onNavigate("/", true);
                    } finally {
                        setLoadingReview(false);
                    }
                };
                initReview();
            }
        } else {
            setReviewSubmission(null);
            setReviewQuiz(null);
        }
    }, [reviewSubmissionId, submissions, quizzes]);

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
        if (user.role !== "admin" && (!user.plan || user.plan === "nothing")) {
            setShowUpgradeModal(true);
            return;
        }
        onNavigate("/quiz/" + quiz.id);
    };

    const handleResumeOngoing = () => {
        if (ongoingAttempt && ongoingAttempt.quiz_id) {
            const quiz = quizzes.find((q) => q.id === ongoingAttempt.quiz_id);
            if (quiz) handleStartQuiz(quiz);
        } else {
            onSelectGrade ? onSelectGrade(user.grade || null) : undefined;
        }
    };

    // Submit current quiz
    const handleQuizSubmit = async (force = false) => {
        if (!activeQuiz || !currentAttempt) return;

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

        try {
            // Server trigger will calculate exact score and total questions automatically
            const { score, totalQuestions } = await finalizeAndSubmitAttempt(
                currentAttempt.attempt_id,
                selectedAnswers,
            );

            const newSubmission: Submission = {
                id: currentAttempt.attempt_id, // use the attempt ID so it matches!
                quizId: activeQuiz.id,
                quizTitle: activeQuiz.title,
                studentId: user.id,
                studentName: user.name,
                score: score,
                totalQuestions: totalQuestions,
                submittedAt: new Date()
                    .toISOString()
                    .replace("T", " ")
                    .substring(0, 16),
                answers: { ...selectedAnswers },
                timeSpent: activeQuiz.duration * 60 - timeLeft,
            };

            onAddSubmission(newSubmission);
            if (navigateReplace) {
                navigateReplace("/result/" + newSubmission.id);
            } else {
                onNavigate("/result/" + newSubmission.id, true);
            }
        } catch (err: any) {
            console.error("Lỗi khi nộp bài:", err);
            alert(
                `Lỗi khi nộp bài: ${err.message || "Vui lòng kiểm tra lại kết nối mạng và thử lại!"}`,
            );
        }
    };

    // Student specific stats, filtered by their current grade to prevent mixed totals
    const gradeQuizzes = user.grade
        ? quizzes.filter((q) => !q.grade || q.grade === user.grade)
        : quizzes;
    const studentSubmissions = submissions.filter((sub) => {
        if (sub.studentId !== user.id) return false;
        const quizObj = quizzes.find((q) => q.id === sub.quizId);
        if (
            quizObj &&
            quizObj.grade &&
            user.grade &&
            quizObj.grade !== user.grade
        ) {
            return false;
        }
        return true;
    });
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

    const highestScore =
        completedCount > 0
            ? Math.max(
                  ...studentSubmissions.map((s) => Number(s.score)),
              ).toFixed(1)
            : "0.0";

    const uniqueQuizzesDone = new Set(
        studentSubmissions.map((sub) => sub.quizId),
    ).size;
    const completionRate =
        gradeQuizzes.length > 0
            ? Math.round((uniqueQuizzesDone / gradeQuizzes.length) * 100)
            : 0;
    const totalStudyHours = Math.round((completedCount * 45) / 60);

    const quizSubmissions = activeQuiz
        ? submissions.filter(
              (s) => s.quizId === activeQuiz.id && s.studentId === user.id,
          )
        : [];
    const attemptsCount = quizSubmissions.length;
    const remainingAttempts = Math.max(0, 5 - attemptsCount);
    const maxScore =
        quizSubmissions.length > 0
            ? Math.max(...quizSubmissions.map((s) => s.score))
            : 0;

    const hasOtherActiveAttempt = !!(
        ongoingAttempt &&
        activeQuiz &&
        ongoingAttempt.quiz_id !== activeQuiz.id
    );

    return (
        <div
            className={`flex-1 min-h-0 ${activeQuiz || reviewSubmission ? "overflow-hidden h-full flex flex-col" : "overflow-y-auto min-h-screen"} bg-bg-base dark:bg-bg-base text-text-primary transition-colors duration-200`}
        >
            <div
                className={
                    activeQuiz
                        ? quizEntryPhase === "taking"
                            ? "w-full h-full p-0 sm:p-2 md:p-4 flex flex-col min-h-0"
                            : "w-full h-full p-4 xl:p-6 flex flex-col min-h-0"
                        : reviewSubmission
                          ? "w-full h-full p-4 xl:p-6 flex flex-col min-h-0"
                          : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
                }
            >
                {loadingReview ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-white p-8 xl:p-12 text-center">
                        <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
                        <h3 className="text-sm font-semibold text-slate-800">
                            Đang tải đáp án và giải chi tiết...
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Đồng bộ an toàn với máy chủ để lấy đáp án chính
                            thức.
                        </p>
                    </div>
                ) : reviewSubmission ? (
                    (() => {
                        const quiz =
                            reviewQuiz ||
                            quizzes.find(
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
                            <div className="w-full px-4 xl:px-8 relative flex-1 min-h-0 flex flex-col xl:flex-row xl:justify-center xl:items-start xl:h-full xl:min-h-0 gap-6">
                                {/* CENTER COLUMN: Question Box Card & Options */}
                                <div className="w-full xl:flex-1 xl:max-w-4xl xl:h-full xl:min-h-0 flex flex-col">
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
                                                    <div className="flex items-center gap-1.5 text-[#3B6D85] font-extrabold">
                                                        <BookOpen className="w-4 h-4 text-[#3B6D85]" />
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
                                <div className="w-full xl:w-80 bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-6 xl:h-full xl:overflow-y-auto flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                                            Bảng câu hỏi
                                        </h3>
                                        <p className="text-[10px] text-gray-500 mt-1 flex items-center flex-wrap gap-1">
                                            <span className="inline-block w-2.5 h-2.5 bg-emerald-200 border border-emerald-350 rounded-sm"></span>{" "}
                                            <span className="mr-1">Đúng</span>
                                            <span className="inline-block w-2.5 h-2.5 bg-amber-200 border border-amber-300 rounded-sm"></span>{" "}
                                            <span className="mr-1">
                                                Đúng một phần
                                            </span>
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
                                                if (navigateReplace) {
                                                    navigateReplace("/");
                                                } else {
                                                    onNavigate("/");
                                                }
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
                ) : loadingAttempt ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-white p-8 xl:p-12 text-center">
                        <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
                        <h3 className="text-sm font-semibold text-slate-800">
                            Đang chuẩn bị lượt làm bài...
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Đồng bộ dữ liệu thời gian thực với máy chủ.
                        </p>
                    </div>
                ) : activeQuiz && quizEntryPhase === "entry" ? (
                    <div className="flex-1 flex items-center justify-center p-6 bg-[#F9F8F6] overflow-y-auto">
                        <div className="w-full max-w-5xl flex flex-col lg:flex-row items-stretch justify-center gap-8">
                            {/* Cột 1: Thông tin đề thi */}
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className="w-full lg:w-[420px] shrink-0 bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between space-y-6"
                            >
                                <div className="space-y-6">
                                    {/* Quiz info header */}
                                    <div className="text-center space-y-3">
                                        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
                                            {activeQuiz.title}
                                        </h1>
                                        {activeQuiz.description && (
                                            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                                                {activeQuiz.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Meta info inline simplified */}
                                    <div className="flex items-center justify-center gap-6 text-xs font-semibold text-slate-500 border-y border-slate-100 py-3.5">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4 text-slate-400" />
                                            <span>
                                                Thời gian:{" "}
                                                <strong className="text-slate-800 font-extrabold">
                                                    {activeQuiz.duration} phút
                                                </strong>
                                            </span>
                                        </div>
                                        <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                                        <div className="flex items-center gap-1.5">
                                            <HelpCircle className="w-4 h-4 text-slate-400" />
                                            <span>
                                                Số câu hỏi:{" "}
                                                <strong className="text-slate-800 font-extrabold">
                                                    {activeQuiz.questions
                                                        ?.length || 0}{" "}
                                                    câu
                                                </strong>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Attempts & History Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-550">
                                                Tiến trình làm bài (Tối đa 5
                                                lượt)
                                            </h3>
                                            <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                                Đã làm: {attemptsCount}/5 lượt
                                            </span>
                                        </div>

                                        {/* Custom Attempts visual indicator circles */}
                                        <div className="flex items-center gap-2">
                                            {[1, 2, 3, 4, 5].map((idx) => {
                                                const isUsed =
                                                    idx <= attemptsCount;
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`flex-1 h-2.5 rounded-xl transition-all duration-300 ${
                                                            isUsed
                                                                ? "bg-brand-500 shadow-xs"
                                                                : "bg-slate-200/60 border border-dashed border-slate-350"
                                                        }`}
                                                        title={
                                                            isUsed
                                                                ? `Lượt thứ ${idx} đã dùng`
                                                                : `Lượt thứ ${idx} chưa dùng`
                                                        }
                                                    />
                                                );
                                            })}
                                        </div>

                                        {/* Attempts List */}
                                        {attemptsCount > 0 ? (
                                            <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                                                {quizSubmissions.map(
                                                    (sub, index) => (
                                                        <div
                                                            key={sub.id}
                                                            className="p-3 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between hover:border-brand-200 hover:shadow-2xs transition-all duration-200"
                                                        >
                                                            <div className="space-y-1">
                                                                <span className="block text-[10px] font-bold text-brand-600 uppercase">
                                                                    Lần làm thứ{" "}
                                                                    {index + 1}
                                                                </span>
                                                                <span className="text-[11px] text-slate-400 block font-medium">
                                                                    Ngày nộp:{" "}
                                                                    {
                                                                        sub.submittedAt
                                                                    }
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="text-right">
                                                                    <span className="text-sm font-extrabold text-slate-800">
                                                                        {
                                                                            sub.score
                                                                        }{" "}
                                                                        điểm
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        onNavigate(
                                                                            "/result/" +
                                                                                sub.id,
                                                                        )
                                                                    }
                                                                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-brand-550 hover:text-white border border-slate-200 text-slate-650 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                                                                >
                                                                    Xem lại
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs italic">
                                                🍀 Hãy chuẩn bị tinh thần và bấm
                                                "Bắt đầu làm bài".
                                            </div>
                                        )}

                                        {activeAttemptInProgress && (
                                            <div className="p-3 bg-blue-50 border border-blue-150 text-blue-700 rounded-xl text-xs font-semibold text-center animate-pulse flex items-center justify-center gap-1.5 shadow-3xs">
                                                <RefreshCw
                                                    className="w-3.5 h-3.5 animate-spin"
                                                    style={{
                                                        animationDuration: "3s",
                                                    }}
                                                />
                                                <span>
                                                    Bạn đang có lượt thi dang
                                                    dở! Hãy tiếp tục làm bài.
                                                </span>
                                            </div>
                                        )}

                                        {hasOtherActiveAttempt && (
                                            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-705 rounded-xl text-[11px] font-bold text-center flex items-center justify-center gap-1.5 shadow-3xs leading-relaxed animate-pulse">
                                                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                                <span>
                                                    Bạn đang có bài thi khác
                                                    chưa hoàn thành!
                                                </span>
                                            </div>
                                        )}

                                        {attemptsCount > 0 && (
                                            <div className="flex items-center gap-1.5 justify-center py-1.5 text-emerald-700 rounded-lg ">
                                                <Award className="w-4 h-4 text-emerald-600" />
                                                <span className="text-[11px] font-bold">
                                                    Điểm số cao nhất của bạn:{" "}
                                                    {maxScore} điểm
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Buttons actions */}
                                <div className="space-y-3 pt-4">
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (navigateReplace)
                                                    navigateReplace("/");
                                                else onNavigate("/");
                                            }}
                                            className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-655 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-3xs cursor-pointer transition-colors"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            <span>Quay lại Dashboard</span>
                                        </button>

                                        {isGradeMismatch ? (
                                            <button
                                                type="button"
                                                disabled
                                                className="flex-1 py-3 bg-slate-100 text-slate-400 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-not-allowed opacity-60"
                                            >
                                                <span>Bắt đầu làm bài</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        ) : hasOtherActiveAttempt ? (
                                            <button
                                                type="button"
                                                disabled
                                                className="flex-1 py-3 bg-slate-100 text-slate-400 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-not-allowed opacity-60"
                                            >
                                                <span>
                                                    Đang làm đề thi khác
                                                </span>
                                                <AlertCircle className="w-4 h-4" />
                                            </button>
                                        ) : activeAttemptInProgress ? (
                                            <button
                                                type="button"
                                                onClick={startQuizAttempt}
                                                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 active:scale-99 transition-all cursor-pointer"
                                            >
                                                <span>Tiếp tục làm bài</span>
                                                <RefreshCw
                                                    className="w-4 h-4 animate-spin"
                                                    style={{
                                                        animationDuration: "3s",
                                                    }}
                                                />
                                            </button>
                                        ) : remainingAttempts > 0 ? (
                                            <button
                                                type="button"
                                                onClick={startQuizAttempt}
                                                className="flex-1 py-3 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/10 active:scale-99 transition-all cursor-pointer"
                                            >
                                                <span>Bắt đầu làm bài</span>
                                                <ArrowRight className="w-4 h-4 animate-pulse" />
                                            </button>
                                        ) : (
                                            <div className="flex-1 py-3 bg-slate-100 text-slate-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-not-allowed">
                                                <span>
                                                    Đã hết lượt thi (Tối đa 5)
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {isGradeMismatch && (
                                        <div className="text-center text-xs text-rose-400 font-semibold">
                                            Em đang là học sinh lớp {user.grade}{" "}
                                            mà?
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* Cột 2: Bảng xếp hạng của bài thi */}
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.3,
                                    delay: 0.1,
                                    ease: "easeOut",
                                }}
                                className="flex-1 bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between space-y-4"
                            >
                                <div className="space-y-4 flex-1 flex flex-col min-h-0">
                                    {/* Header BXH */}
                                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                                            <Trophy className="w-4.5 h-4.5 text-amber-500" />{" "}
                                            Bảng xếp hạng thi thử
                                        </h3>
                                        <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                            Lượt thi đầu tiên
                                        </span>
                                    </div>

                                    {/* Loader hoặc Danh sách BXH */}
                                    {loadingQuizLeaderboard ? (
                                        <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                                            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                                            <span className="text-xs font-semibold">
                                                Đang tải bảng xếp hạng...
                                            </span>
                                        </div>
                                    ) : quizLeaderboard.length > 0 ? (
                                        <div className="flex-1 flex flex-col justify-between min-h-0">
                                            {/* Podium Top 3 Mini */}
                                            <div className="grid grid-cols-3 gap-3 items-end justify-center py-4 border-b border-slate-100/60 mb-3 select-none">
                                                {/* Hạng 2 */}
                                                {quizLeaderboard[1] ? (
                                                    <div className="flex flex-col items-center text-center">
                                                        <div className="relative">
                                                            <div className="w-10 h-10 rounded-full border border-slate-300 bg-slate-50 flex items-center justify-center font-bold text-xs text-slate-500">
                                                                {quizLeaderboard[1].studentName.charAt(
                                                                    0,
                                                                )}
                                                            </div>
                                                            <span className="absolute -top-1.5 -right-1 text-xs">
                                                                🥈
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-700 truncate max-w-[80px] block mt-1">
                                                            {
                                                                quizLeaderboard[1]
                                                                    .studentName
                                                            }
                                                        </span>
                                                        <span className="text-[10px] font-black text-slate-500">
                                                            {
                                                                quizLeaderboard[1]
                                                                    .score
                                                            }{" "}
                                                            điểm
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div />
                                                )}

                                                {/* Hạng 1 */}
                                                {quizLeaderboard[0] ? (
                                                    <div className="flex flex-col items-center text-center">
                                                        <div className="relative">
                                                            <div className="w-12 h-12 rounded-full border-2 border-amber-400 bg-amber-55/30 flex items-center justify-center font-black text-sm text-amber-600">
                                                                {quizLeaderboard[0].studentName.charAt(
                                                                    0,
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="text-[11px] font-black text-slate-800 truncate max-w-[90px] block mt-1">
                                                            {
                                                                quizLeaderboard[0]
                                                                    .studentName
                                                            }
                                                        </span>
                                                        <span className="text-[11px] font-black text-amber-600">
                                                            {
                                                                quizLeaderboard[0]
                                                                    .score
                                                            }{" "}
                                                            điểm
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div />
                                                )}

                                                {/* Hạng 3 */}
                                                {quizLeaderboard[2] ? (
                                                    <div className="flex flex-col items-center text-center">
                                                        <div className="relative">
                                                            <div className="w-10 h-10 rounded-full border border-amber-600 bg-amber-50/10 flex items-center justify-center font-bold text-xs text-amber-700/80">
                                                                {quizLeaderboard[2].studentName.charAt(
                                                                    0,
                                                                )}
                                                            </div>
                                                            <span className="absolute -top-1.5 -right-1 text-xs">
                                                                🥉
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-700 truncate max-w-[80px] block mt-1">
                                                            {
                                                                quizLeaderboard[2]
                                                                    .studentName
                                                            }
                                                        </span>
                                                        <span className="text-[10px] font-black text-slate-500">
                                                            {
                                                                quizLeaderboard[2]
                                                                    .score
                                                            }{" "}
                                                            điểm
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div />
                                                )}
                                            </div>

                                            {/* Danh sách các thứ hạng khác */}
                                            <div className="flex-1 overflow-y-auto max-h-[220px] divide-y divide-slate-100 pr-1 text-xs">
                                                {quizLeaderboard.map(
                                                    (entry) => {
                                                        const isMe =
                                                            entry.studentId ===
                                                            user.id;
                                                        const minVal =
                                                            Math.floor(
                                                                entry.durationSeconds /
                                                                    60,
                                                            );
                                                        const secVal =
                                                            entry.durationSeconds %
                                                            60;
                                                        const timeStr =
                                                            minVal === 0
                                                                ? `${secVal}s`
                                                                : `${minVal}p ${secVal}s`;

                                                        return (
                                                            <div
                                                                key={
                                                                    entry.studentId
                                                                }
                                                                className={`py-2.5 px-3.5 flex items-center justify-between rounded-xl transition-colors ${
                                                                    isMe
                                                                        ? "bg-brand-50/30 font-bold border border-brand-100/50"
                                                                        : "hover:bg-slate-50/50"
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <span className="font-extrabold text-slate-400 w-6">
                                                                        {entry.rankPosition <=
                                                                        3
                                                                            ? entry.rankPosition ===
                                                                              1
                                                                                ? "🥇"
                                                                                : entry.rankPosition ===
                                                                                    2
                                                                                  ? "🥈"
                                                                                  : "🥉"
                                                                            : `#${entry.rankPosition}`}
                                                                    </span>
                                                                    <div className="min-w-0">
                                                                        <p className="text-slate-800 font-semibold truncate max-w-[120px]">
                                                                            {
                                                                                entry.studentName
                                                                            }
                                                                        </p>
                                                                        <p className="text-[9px] text-slate-400">
                                                                            @
                                                                            {
                                                                                entry.studentUsername
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="font-extrabold text-slate-750">
                                                                        {
                                                                            entry.score
                                                                        }
                                                                        /10
                                                                    </span>
                                                                    <p className="text-[9px] text-slate-400 flex items-center justify-end gap-1 font-medium">
                                                                        <Clock className="w-2.5 h-2.5" />{" "}
                                                                        {
                                                                            timeStr
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-slate-400 gap-2.5">
                                            <BookOpen className="w-8 h-8 text-slate-300" />
                                            <span className="text-xs">
                                                Chưa có ai hoàn thành đề thi
                                                này. Hãy là người mở màn!
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400 text-center italic border-t border-slate-50 pt-3">
                                    💡 Điểm thi trên BXH được tính theo lượt thi
                                    ĐẦU TIÊN để đảm bảo sự khách quan.
                                </p>
                            </motion.div>
                        </div>
                    </div>
                ) : activeQuiz && quizEntryPhase === "taking" ? (
                    <div className="w-full px-4 xl:px-8 relative flex-1 min-h-0 flex flex-col xl:flex-row xl:justify-center xl:items-start xl:h-full xl:min-h-0 gap-6">
                        {/* CENTER COLUMN: Question Box Card & Options */}
                        <div className="w-full xl:flex-1 xl:max-w-4xl xl:h-full xl:min-h-0 flex flex-col">
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
                        <div className="w-full xl:w-80 bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-6 xl:h-full xl:overflow-y-auto flex flex-col justify-between">
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
                        ongoingAttempt={ongoingAttempt}
                        loading={loading}
                        currentPath={currentPath}
                        onSelectGrade={onSelectGrade}
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
                                        gradeQuizzes.length > 0
                                            ? Math.round(
                                                  (uniqueQuizzesDone /
                                                      gradeQuizzes.length) *
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
                                                    Đối thủ của bạn đang cày đề,
                                                    còn bạn làm gì?
                                                </p>
                                            </div>

                                            {/* Stats Grid */}
                                            <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-6 p-4 rounded-2xl">
                                                <div className="text-center min-w-[50px]">
                                                    <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase block tracking-wider">
                                                        Số đề thi
                                                    </span>
                                                    <span className="text-xs sm:text-sm lg:text-base font-black text-slate-800 dark:text-slate-200 block mt-0.5">
                                                        {gradeQuizzes.length}
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

                                {/* ULTRA-CLEAN FLAT SAGE-WHITE DASHBOARD */}
                                <div className="space-y-12 pt-8">
                                    {/* Ongoing Attempt Alert Banner */}
                                    {ongoingAttempt && (
                                        <div className="bg-[#3B6D85]/5 border border-[#3B6D85]/15 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-[#3B6D85] bg-[#3B6D85]/10 px-2 py-0.5 rounded">
                                                    Đang làm dở
                                                </span>
                                                <h4 className="text-sm font-bold text-slate-800">
                                                    Bạn đang có một bài thi chưa
                                                    hoàn thành
                                                </h4>
                                                <p className="text-xs text-slate-400 font-medium">
                                                    Hãy tiếp tục làm để nộp bài
                                                    và nhận điểm đánh giá chi
                                                    tiết.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleResumeOngoing}
                                                className="px-5 py-2 bg-[#3B6D85] hover:bg-[#2C5A71] text-white text-xs font-black rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <span>
                                                    Làm tiếp đề đang thi
                                                </span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}

                                    {/* 2-Column Split Layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
                                        {/* Left Column: Continue Learning & Quizzes Feed (2/3 width) */}
                                        <div className="lg:col-span-2 space-y-10">
                                            {/* Section 1: Học tiếp bài trước */}
                                            <div className="space-y-4 text-left">
                                                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                                                        Học tiếp bài trước
                                                    </h3>
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        Tiến trình hôm nay
                                                    </span>
                                                </div>

                                                {/* Wide aspect ratio image spanning fully across the layout */}
                                                <div className="relative rounded-2xl overflow-hidden aspect-[21/9] bg-slate-100 border border-slate-200/50">
                                                    <img
                                                        src="/images/landing.png"
                                                        alt="Learning banner"
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                                    <span className="absolute bottom-3 left-4 text-[9px] font-black text-white bg-slate-900/65 px-2.5 py-0.5 rounded uppercase tracking-wider backdrop-blur-xs">
                                                        Lớp {user.grade || "10"}{" "}
                                                        • Toán học
                                                    </span>
                                                </div>

                                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-2">
                                                    <div className="space-y-1.5 flex-1">
                                                        <h4 className="text-base font-black text-slate-800 leading-snug">
                                                            Chương trình ôn
                                                            luyện Toán chất
                                                            lượng cao Cô Trang
                                                        </h4>
                                                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                                            Luyện tập giải đề
                                                            đều đặn giúp bạn
                                                            củng cố kiến thức
                                                            vững chắc cho các kì
                                                            thi sắp tới.
                                                        </p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={
                                                            handleResumeOngoing
                                                        }
                                                        className="px-6 py-2.5 bg-[#3B6D85] hover:bg-[#2C5A71] text-white text-xs font-black rounded-lg transition-all shadow-sm shrink-0 flex items-center gap-1.5 cursor-pointer"
                                                    >
                                                        <span>
                                                            {ongoingAttempt
                                                                ? "Làm tiếp"
                                                                : "Bắt đầu ngay"}
                                                        </span>
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                {/* Flat progress bar */}
                                                <div className="space-y-1.5 pt-2 max-w-md">
                                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                                                        <span>
                                                            Hoàn thành:{" "}
                                                            {completionRate}%
                                                        </span>
                                                        <span>
                                                            {uniqueQuizzesDone}/
                                                            {
                                                                gradeQuizzes.length
                                                            }{" "}
                                                            đề thi
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden">
                                                        <div
                                                            className="bg-[#3B6D85] h-full transition-all duration-500"
                                                            style={{
                                                                width: `${completionRate}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Section Divider */}
                                            <div className="border-b border-slate-200/60" />

                                            {/* Section 2: Đề thi được giao */}
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 text-left">
                                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                                                        Đề thi mới
                                                    </h3>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            onSelectGrade
                                                                ? onSelectGrade(
                                                                      user.grade ||
                                                                          null,
                                                                  )
                                                                : undefined
                                                        }
                                                        className="text-xs font-bold text-[#3B6D85] hover:underline cursor-pointer"
                                                    >
                                                        Xem tất cả đề thi
                                                    </button>
                                                </div>

                                                {/* Spacious borderless feed rows — filter by user's grade locally here only */}
                                                <div className="space-y-6">
                                                    {loading ? (
                                                        <div className="py-10 flex items-center justify-center">
                                                            <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
                                                        </div>
                                                    ) : (
                                                        (() => {
                                                            const gradeQuizzes =
                                                                user.grade
                                                                    ? quizzes.filter(
                                                                          (q) =>
                                                                              !q.grade ||
                                                                              q.grade ===
                                                                                  user.grade,
                                                                      )
                                                                    : quizzes;
                                                            if (
                                                                gradeQuizzes.length ===
                                                                0
                                                            ) {
                                                                return (
                                                                    <div className="py-10 flex items-center justify-center">
                                                                        <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
                                                                    </div>
                                                                );
                                                            }
                                                            return gradeQuizzes
                                                                .slice(0, 5)
                                                                .map((quiz) => {
                                                                    const hasDone =
                                                                        studentSubmissions.some(
                                                                            (
                                                                                sub,
                                                                            ) =>
                                                                                sub.quizId ===
                                                                                quiz.id,
                                                                        );

                                                                    const sectionCount =
                                                                        quiz
                                                                            .scoringConfig
                                                                            ?.sections
                                                                            ?.length ||
                                                                        new Set(
                                                                            quiz.questions
                                                                                .map(
                                                                                    (
                                                                                        q,
                                                                                    ) =>
                                                                                        q.sectionTitle,
                                                                                )
                                                                                .filter(
                                                                                    Boolean,
                                                                                ),
                                                                        )
                                                                            .size ||
                                                                        1;

                                                                    const formattedDate =
                                                                        (() => {
                                                                            if (
                                                                                !quiz.createdAt
                                                                            )
                                                                                return "Chưa rõ";
                                                                            const dateParts =
                                                                                quiz.createdAt.split(
                                                                                    "-",
                                                                                );
                                                                            if (
                                                                                dateParts.length ===
                                                                                3
                                                                            ) {
                                                                                return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                                                                            }
                                                                            try {
                                                                                const d =
                                                                                    new Date(
                                                                                        quiz.createdAt,
                                                                                    );
                                                                                if (
                                                                                    !isNaN(
                                                                                        d.getTime(),
                                                                                    )
                                                                                ) {
                                                                                    const day =
                                                                                        String(
                                                                                            d.getDate(),
                                                                                        ).padStart(
                                                                                            2,
                                                                                            "0",
                                                                                        );
                                                                                    const month =
                                                                                        String(
                                                                                            d.getMonth() +
                                                                                                1,
                                                                                        ).padStart(
                                                                                            2,
                                                                                            "0",
                                                                                        );
                                                                                    const year =
                                                                                        d.getFullYear();
                                                                                    return `${day}/${month}/${year}`;
                                                                                }
                                                                            } catch (e) {}
                                                                            return quiz.createdAt;
                                                                        })();

                                                                    const isVip =
                                                                        quiz.id.includes(
                                                                            "vip",
                                                                        ) ||
                                                                        quiz.title
                                                                            .toLowerCase()
                                                                            .includes(
                                                                                "hsg",
                                                                            ) ||
                                                                        quiz.title
                                                                            .toLowerCase()
                                                                            .includes(
                                                                                "chuyên",
                                                                            );
                                                                    const badgeText =
                                                                        isVip
                                                                            ? "Nâng cao"
                                                                            : "Cơ bản";
                                                                    const badgeStyles =
                                                                        isVip
                                                                            ? "bg-rose-50 text-rose-700 border-rose-100"
                                                                            : "bg-slate-100 text-slate-600 border-slate-200/60";

                                                                    return (
                                                                        <div
                                                                            key={
                                                                                quiz.id
                                                                            }
                                                                            className="group flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-200/50 last:border-0 last:pb-0 gap-4 text-left transition-all"
                                                                        >
                                                                            {/* Left info */}
                                                                            <div className="space-y-1.5 flex-1 w-full">
                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                    <h4 className="text-[13px] font-extrabold text-slate-800 group-hover:text-[#3B6D85] transition-colors leading-snug">
                                                                                        {
                                                                                            quiz.title
                                                                                        }
                                                                                    </h4>
                                                                                </div>

                                                                                <p className="text-xs text-slate-400 font-medium line-clamp-1 max-w-[90%]">
                                                                                    {quiz.description ||
                                                                                        "Tài liệu ôn thi trắc nghiệm toán học giúp chuẩn bị cho kì thi chính thức trên lớp."}
                                                                                </p>

                                                                                {/* Metas and real quiz data */}
                                                                                <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold flex-wrap pt-0.5">
                                                                                    <span className="flex items-center gap-1">
                                                                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                                                        {
                                                                                            quiz.duration
                                                                                        }{" "}
                                                                                        phút
                                                                                    </span>
                                                                                    <span>
                                                                                        •
                                                                                    </span>
                                                                                    <span className="flex items-center gap-1">
                                                                                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                                                                                        {
                                                                                            quiz
                                                                                                .questions
                                                                                                .length
                                                                                        }{" "}
                                                                                        câu
                                                                                        hỏi
                                                                                    </span>
                                                                                    <span>
                                                                                        •
                                                                                    </span>
                                                                                    <span className="flex items-center gap-1">
                                                                                        <BookMarked className="w-3.5 h-3.5 text-slate-400" />
                                                                                        {
                                                                                            sectionCount
                                                                                        }{" "}
                                                                                        phần
                                                                                    </span>
                                                                                    <span>
                                                                                        •
                                                                                    </span>
                                                                                    <span className="flex items-center gap-1 text-slate-400 font-medium">
                                                                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                                                        Ngày:{" "}
                                                                                        {
                                                                                            formattedDate
                                                                                        }
                                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            {/* Right Action */}
                                                                            <div className="flex items-center justify-between md:justify-end gap-5 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100/50">
                                                                                <span
                                                                                    className={`text-[10px] font-extrabold px-3 py-1 rounded-full ${
                                                                                        hasDone
                                                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                                                                            : "bg-amber-50 text-amber-700 border border-amber-100"
                                                                                    }`}
                                                                                >
                                                                                    {hasDone
                                                                                        ? "✓ Đã nộp"
                                                                                        : "○ Chưa làm"}
                                                                                </span>

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        handleStartQuiz(
                                                                                            quiz,
                                                                                        )
                                                                                    }
                                                                                    className="px-4 py-1.5 bg-[#3B6D85] hover:bg-slate-700 text-white text-[11px] font-black rounded-lg transition-all cursor-pointer shadow-sm active:scale-97 flex items-center gap-0.5 shrink-0"
                                                                                >
                                                                                    <span>
                                                                                        Làm
                                                                                        bài
                                                                                    </span>
                                                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                });
                                                        })()
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Sidebar (1/3 width) - Borderless Stats & Charts */}
                                        <div className="space-y-10 lg:pl-4 lg:border-l lg:border-slate-200/50">
                                            {/* Section 3: Lịch sử điểm số */}
                                            {/* Section 3: Lịch sử điểm số */}
                                            <div className="space-y-2 text-left">
                                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-200/60 pb-2">
                                                    Lịch sử điểm số
                                                </h3>

                                                {/* Render chart directly on the page bg */}
                                                <div className="h-[125px] w-full relative">
                                                    {(() => {
                                                        const sorted = [
                                                            ...studentSubmissions,
                                                        ]
                                                            .sort(
                                                                (a, b) =>
                                                                    safeParseDate(
                                                                        b.submittedAt,
                                                                    ).getTime() -
                                                                    safeParseDate(
                                                                        a.submittedAt,
                                                                    ).getTime(),
                                                            )
                                                            .slice(0, 20);
                                                        const historyPoints =
                                                            sorted
                                                                .reverse()
                                                                .map(
                                                                    (
                                                                        sub,
                                                                        i,
                                                                    ) => ({
                                                                        day: `Đề ${i + 1}`,
                                                                        score: Number(
                                                                            sub.score,
                                                                        ),
                                                                        quizTitle:
                                                                            sub.quizTitle,
                                                                        submittedAt:
                                                                            sub.submittedAt,
                                                                    }),
                                                                );

                                                        if (
                                                            historyPoints.length ===
                                                            0
                                                        ) {
                                                            return loading ? (
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
                                                                </div>
                                                            ) : (
                                                                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs italic gap-1 flex-wrap">
                                                                    <span>
                                                                        Ai cũng
                                                                        phải bắt
                                                                        đầu từ
                                                                        đâu đó
                                                                        🌸
                                                                    </span>
                                                                    <button
                                                                        onClick={() => {
                                                                            if (
                                                                                user &&
                                                                                user.grade
                                                                            ) {
                                                                                onSelectGrade(
                                                                                    user.grade,
                                                                                );
                                                                            } else {
                                                                                onSelectGrade(
                                                                                    "10",
                                                                                );
                                                                            }
                                                                        }}
                                                                        className="text-brand-600 hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200 font-bold hover:underline cursor-pointer not-italic transition-colors bg-transparent border-0 p-0 inline-block align-baseline ml-1"
                                                                    >
                                                                        Làm ngay
                                                                    </button>
                                                                </div>
                                                            );
                                                        }

                                                        const width = 280;
                                                        const height = 120;
                                                        const maxVal = 10;
                                                        const paddingLeft = 12;
                                                        const paddingRight = 12;
                                                        const paddingTop = 12;
                                                        const paddingBottom = 12;

                                                        const getBarPath = (
                                                            x: number,
                                                            y: number,
                                                            w: number,
                                                            h: number,
                                                            r: number,
                                                        ) => {
                                                            const realR =
                                                                Math.min(
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
                                                                return "url(#chart-bar-grad-green)";
                                                            if (score >= 5)
                                                                return "url(#chart-bar-grad-amber)";
                                                            return "url(#chart-bar-grad-red)";
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
                                                            historyPoints.length;

                                                        const points =
                                                            historyPoints.map(
                                                                (p, i) => {
                                                                    const colWidth =
                                                                        usableWidth /
                                                                        count;
                                                                    const barWidth =
                                                                        Math.min(
                                                                            14,
                                                                            colWidth *
                                                                                0.6,
                                                                        );
                                                                    const barX =
                                                                        paddingLeft +
                                                                        i *
                                                                            colWidth +
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
                                                                        barWidth /
                                                                            2;
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
                                                            dateStr:
                                                                | string
                                                                | null
                                                                | undefined,
                                                        ) => {
                                                            if (!dateStr)
                                                                return "";
                                                            try {
                                                                const d =
                                                                    safeParseDate(
                                                                        dateStr,
                                                                    );
                                                                const day =
                                                                    String(
                                                                        d.getDate(),
                                                                    ).padStart(
                                                                        2,
                                                                        "0",
                                                                    );
                                                                const month =
                                                                    String(
                                                                        d.getMonth() +
                                                                            1,
                                                                    ).padStart(
                                                                        2,
                                                                        "0",
                                                                    );
                                                                const year =
                                                                    d.getFullYear();
                                                                return `${day}/${month}/${year}`;
                                                            } catch (e) {
                                                                return "";
                                                            }
                                                        };

                                                        return (
                                                            <div className="w-full h-full relative">
                                                                <svg
                                                                    viewBox={`0 0 ${width} ${height}`}
                                                                    className="w-full h-full"
                                                                >
                                                                    <defs>
                                                                        {/* Green gradient (Score >= 8) */}
                                                                        <linearGradient
                                                                            id="chart-bar-grad-green"
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
                                                                        {/* Amber gradient (5 <= Score < 8) */}
                                                                        <linearGradient
                                                                            id="chart-bar-grad-amber"
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
                                                                        {/* Red gradient (Score < 5) */}
                                                                        <linearGradient
                                                                            id="chart-bar-grad-red"
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
                                                                    />

                                                                    {points.map(
                                                                        (
                                                                            p,
                                                                            i,
                                                                        ) => {
                                                                            const isHovered =
                                                                                hoveredChartPoint ===
                                                                                i;
                                                                            const isLast =
                                                                                i ===
                                                                                points.length -
                                                                                    1;
                                                                            const showLabel =
                                                                                isHovered ||
                                                                                (hoveredChartPoint ===
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
                                                                                            setHoveredChartPoint(
                                                                                                i,
                                                                                            )
                                                                                        }
                                                                                        onMouseLeave={() =>
                                                                                            setHoveredChartPoint(
                                                                                                null,
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                </g>
                                                                            );
                                                                        },
                                                                    )}
                                                                </svg>

                                                                {hoveredChartPoint !==
                                                                    null &&
                                                                    points[
                                                                        hoveredChartPoint
                                                                    ] && (
                                                                        <div
                                                                            className="absolute bg-white border border-slate-200/80 text-slate-855 p-2.5 rounded-xl shadow-lg pointer-events-none transition-all duration-150 animate-in fade-in-50 zoom-in-95 z-30 select-none text-left min-w-[140px]"
                                                                            style={{
                                                                                left: `${(points[hoveredChartPoint].x / width) * 100}%`,
                                                                                top: `${(points[hoveredChartPoint].y / height) * 100}%`,
                                                                                transform:
                                                                                    "translate(-50%, -115%)",
                                                                            }}
                                                                        >
                                                                            <div className="text-[8px] font-bold text-slate-400 leading-none mb-1">
                                                                                {formatDate(
                                                                                    historyPoints[
                                                                                        hoveredChartPoint
                                                                                    ]
                                                                                        .submittedAt,
                                                                                )}
                                                                            </div>
                                                                            <div className="text-[9px] font-black text-slate-800 truncate max-w-[130px] mb-1">
                                                                                {
                                                                                    historyPoints[
                                                                                        hoveredChartPoint
                                                                                    ]
                                                                                        .quizTitle
                                                                                }
                                                                            </div>
                                                                            <div
                                                                                className="flex items-center gap-1 mt-0.5 text-[9px] font-bold"
                                                                                style={{
                                                                                    color: getTextColor(
                                                                                        points[
                                                                                            hoveredChartPoint
                                                                                        ]
                                                                                            .score,
                                                                                    ),
                                                                                }}
                                                                            >
                                                                                <span
                                                                                    className="w-1 h-1 rounded-full animate-pulse"
                                                                                    style={{
                                                                                        backgroundColor:
                                                                                            getTextColor(
                                                                                                points[
                                                                                                    hoveredChartPoint
                                                                                                ]
                                                                                                    .score,
                                                                                            ),
                                                                                    }}
                                                                                ></span>
                                                                                <span>
                                                                                    Điểm:{" "}
                                                                                    {
                                                                                        points[
                                                                                            hoveredChartPoint
                                                                                        ]
                                                                                            .score
                                                                                    }
                                                                                    /10đ
                                                                                </span>
                                                                            </div>
                                                                            <div className="absolute top-[100%] left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-white border-b border-r border-slate-200/80 rotate-45" />
                                                                        </div>
                                                                    )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Section 3.5: Tần suất hoạt động & Xếp hạng */}
                                            <div className="text-left -mt-4">
                                                {(() => {
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
                                                            submissions.filter(
                                                                (s) => {
                                                                    return (
                                                                        s.studentId ===
                                                                            user.id &&
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
                                                        d,
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
                                                        <div className="grid grid-cols-2 gap-x-4 w-full">
                                                            {/* Left Box: Activity calendar */}
                                                            <div className="w-full text-left flex flex-col gap-2.5">
                                                                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/80 pb-1.5">
                                                                    Tần suất hoạt động
                                                                </h4>

                                                                <div className="w-full max-w-[140px] flex flex-col gap-2">
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
                                                                                    {
                                                                                        h
                                                                                    }
                                                                                </div>
                                                                            ),
                                                                        )}
                                                                    </div>
                                                                    {/* Grid */}
                                                                    <div className="grid grid-cols-7 gap-1 w-full">
                                                                        {Array.from(
                                                                            {
                                                                                length: startDayOfWeek,
                                                                            },
                                                                        ).map(
                                                                            (
                                                                                _,
                                                                                i,
                                                                            ) => (
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
                                                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-900 text-white text-[8px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-50">
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
                                                                    <div className="flex items-center gap-1 text-[8px] text-slate-400 self-end mt-1">
                                                                        <span>
                                                                            Ít
                                                                        </span>
                                                                        <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800" />
                                                                        <div className="w-2 h-2 rounded-full bg-[#A7F3D0] dark:bg-emerald-950/40" />
                                                                        <div className="w-2 h-2 rounded-full bg-[#34D399] dark:bg-emerald-900/60" />
                                                                        <div className="w-2 h-2 rounded-full bg-[#059669] dark:bg-emerald-750" />
                                                                        <span>
                                                                            Nhiều
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Right Box: Ranking stats */}
                                                            <div className="w-full text-left flex flex-col gap-2.5 pl-4 border-l border-slate-200/60 dark:border-slate-800">
                                                                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/80 pb-1.5">
                                                                    Xếp hạng
                                                                </h4>

                                                                <div className="flex-1 flex flex-col justify-center text-left py-1">
                                                                    {userRank ? (
                                                                        <div className="space-y-1">
                                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                                                                Khối
                                                                                lớp{" "}
                                                                                {user.grade ||
                                                                                    "10"}
                                                                            </span>
                                                                            <span className="text-2xl font-black text-slate-800 dark:text-slate-200 block font-mono">
                                                                                #
                                                                                {
                                                                                    userRank.rankPosition
                                                                                }
                                                                            </span>
                                                                            <span className="text-[9px] font-bold text-slate-400 block">
                                                                                trên{" "}
                                                                                {
                                                                                    userRank.totalUsers
                                                                                }{" "}
                                                                                học
                                                                                sinh
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-1">
                                                                            <span className="text-xs italic text-slate-450 block">
                                                                                Chưa
                                                                                xếp
                                                                                hạng
                                                                            </span>
                                                                            <span className="text-[9px] text-slate-400 leading-tight block">
                                                                                Làm
                                                                                bài
                                                                                thi
                                                                                để
                                                                                bắt
                                                                                đầu!
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Section 4: Chỉ số rèn luyện */}
                                            <div className="space-y-4 text-left">
                                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-200/60 pb-2">
                                                    Chỉ số rèn luyện
                                                </h3>

                                                {/* Flat layout matching the welcome header section stats */}
                                                <div className="grid grid-cols-2 gap-y-6 gap-x-4 pt-2">
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                            Tổng số đề thi
                                                        </span>
                                                        <span className="text-xl font-black text-slate-800 block">
                                                            {
                                                                gradeQuizzes.length
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1 pl-4 border-l border-slate-200/60">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                            Lượt làm
                                                        </span>
                                                        <span className="text-xl font-black text-slate-800 block">
                                                            {completedCount}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1 border-t border-slate-200/60 pt-4">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                            Điểm trung bình
                                                        </span>
                                                        <span className="text-xl font-black text-slate-800 block">
                                                            {averageScore}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1 pl-4 border-l border-slate-200/60 border-t border-slate-200/60 pt-4">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                            Điểm cao nhất
                                                        </span>
                                                        <span className="text-xl font-black text-slate-800 block">
                                                            {highestScore}/10
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
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
                                    {loading ? (
                                        <div className="col-span-full py-16 flex items-center justify-center">
                                            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                                        </div>
                                    ) : quizzes.length === 0 ? (
                                        <div className="col-span-full py-16 text-center text-slate-400 bg-slate-50/55 rounded-2xl border border-dashed border-slate-200">
                                            <BookMarked className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                            <p className="text-sm font-semibold">
                                                Không có đề thi nào khả dụng.
                                            </p>
                                        </div>
                                    ) : (
                                        paginatedQuizzes.map((quiz) => {
                                            const hasDone =
                                                studentSubmissions.some(
                                                    (sub) =>
                                                        sub.quizId === quiz.id,
                                                );
                                            const isOngoing = !!(
                                                ongoingAttempt &&
                                                ongoingAttempt.quiz_id ===
                                                    quiz.id
                                            );
                                            return (
                                                <div
                                                    key={quiz.id}
                                                    className={`bg-white border ${
                                                        isOngoing
                                                            ? "border-blue-300 bg-blue-50/30 shadow-sm"
                                                            : "border-gray-100/80 shadow-xs"
                                                    } rounded-2xl p-4.5 flex flex-col justify-between hover:border-brand-300/20 transition-all duration-200`}
                                                >
                                                    <div>
                                                        <div className="flex items-center justify-between gap-2 mb-2.5">
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

                                                        <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 min-h-[38px]">
                                                            {quiz.title}
                                                        </h3>
                                                        <p className="text-xs text-gray-500 line-clamp-2 mt-1.5 min-h-[32px]">
                                                            {quiz.description}
                                                        </p>

                                                        <div className="flex items-center justify-between border-t border-b border-gray-50 py-2 my-3 text-[11px] text-gray-500">
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                                    <span>
                                                                        {
                                                                            quiz.duration
                                                                        }{" "}
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
                                                            {quiz.createdAt && (
                                                                <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                                                                    <span>
                                                                        Đăng:{" "}
                                                                        {(() => {
                                                                            const dateParts =
                                                                                quiz.createdAt.split(
                                                                                    "-",
                                                                                );
                                                                            if (
                                                                                dateParts.length ===
                                                                                3
                                                                            ) {
                                                                                return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                                                                            }
                                                                            return quiz.createdAt;
                                                                        })()}
                                                                    </span>
                                                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        id={`btn-start-quiz-${quiz.id}`}
                                                        onClick={() =>
                                                            handleStartQuiz(
                                                                quiz,
                                                            )
                                                        }
                                                        className={`w-full py-2.5 bg-gradient-to-r ${
                                                            isOngoing
                                                                ? "from-[#18323E] to-[#10222B] shadow-md shadow-blue-500/10"
                                                                : "from-brand-300 to-brand-400"
                                                        } text-white font-medium hover:opacity-95 shadow-xs transition-all rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer`}
                                                    >
                                                        <span>
                                                            {isOngoing
                                                                ? "Tiếp tục làm bài"
                                                                : "Bắt đầu làm bài"}
                                                        </span>
                                                        <ArrowRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-100">
                                        <span className="text-[11px] text-slate-400 font-semibold">
                                            Trang {currentPage} / {totalPages}{" "}
                                            (Tổng số {quizzes.length} đề thi)
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                disabled={currentPage === 1}
                                                onClick={() => {
                                                    setCurrentPage(
                                                        (prev) => prev - 1,
                                                    );
                                                    window.scrollTo({
                                                        top: 0,
                                                        behavior: "smooth",
                                                    });
                                                }}
                                                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-colors"
                                            >
                                                <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
                                            </button>
                                            <button
                                                disabled={
                                                    currentPage === totalPages
                                                }
                                                onClick={() => {
                                                    setCurrentPage(
                                                        (prev) => prev + 1,
                                                    );
                                                    window.scrollTo({
                                                        top: 0,
                                                        behavior: "smooth",
                                                    });
                                                }}
                                                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-colors"
                                            >
                                                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                                            </button>
                                        </div>
                                    </div>
                                )}
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
