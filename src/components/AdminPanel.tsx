import React, { useState, useCallback } from "react";
import { User, Quiz, Submission, UserPlan, Question, QuestionType } from "../types";
import {
    getAllProfiles,
    updateUserPlan,
    createQuiz,
    deleteQuiz,
    verifyAdminPasswordWithEdgeFunction,
    updateQuiz,
    signUpUser,
    updateUserProfile,
    deleteUserProfile,
    updateUserGrade,
} from "../lib/supabaseService";
import WordImporter from "./WordImporter";
import { renderMathHtml } from "../lib/math";
import {
    Shield,
    Lock,
    Users,
    Crown,
    Zap,
    FileText,
    CheckCircle,
    Trash2,
    Plus,
    Sparkles,
    AlertCircle,
    RefreshCw,
    Edit,
    Search,
    UserPlus,
    ChevronLeft,
    ChevronRight,
    BarChart3,
    BookOpen,
    Clock,
    UserCheck,
    CheckCircle2,
    X,
    Calendar,
    ArrowLeft,
    User as UserIcon,
    ChevronDown,
    ArrowUp,
    ArrowDown,
} from "lucide-react";

interface AdminPanelProps {
    quizzes: Quiz[];
    submissions: Submission[];
    onAddQuiz: (newQuiz: Quiz) => void;
    onDeleteQuiz: (quizId: string) => void;
    onUpdateQuiz: (updatedQuiz: Quiz) => void;
}

export default function AdminPanel({
    quizzes,
    submissions,
    onAddQuiz,
    onDeleteQuiz,
    onUpdateQuiz,
}: AdminPanelProps) {
    // Persist admin verification across reloads
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        return sessionStorage.getItem("admin_verified") === "true";
    });
    const [passwordInput, setPasswordInput] = useState("");
    const [authError, setAuthError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [adminStudentHoveredPointIdx, setAdminStudentHoveredPointIdx] =
        useState<number | null>(null);

    const [activeTab, setActiveTab] = useState<
        "plans" | "create-quiz" | "quizzes" | "stats-quizzes" | "stats-students"
    >("plans");

    const [antiCheatEnabled, setAntiCheatEnabled] = useState<boolean>(() => {
        return localStorage.getItem("hitrang_anti_cheat_enabled") !== "false";
    });

    const handleToggleAntiCheat = (val: boolean) => {
        setAntiCheatEnabled(val);
        localStorage.setItem(
            "hitrang_anti_cheat_enabled",
            val ? "true" : "false",
        );
    };

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
    };

    const handleTabClick = (
        tab:
            | "plans"
            | "create-quiz"
            | "quizzes"
            | "stats-quizzes"
            | "stats-students",
    ) => {
        setActiveTab(tab);
        setAdminReviewSubmission(null);
        setSelectedQuizForDetails(null);
    };

    const cleanTrueFalseQuestionText = (html: string) => {
        if (!html) return "";
        let clean = html.replace(
            /<table[^>]*>([\s\S]*?)<\/table>/gi,
            (match) => {
                if (
                    match.includes("Khẳng định") ||
                    match.includes("Đúng") ||
                    match.includes("Sai")
                ) {
                    return "";
                }
                return match;
            },
        );

        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = clean;

        const items = Array.from(tempDiv.querySelectorAll("p, li, div"));
        items.forEach((item) => {
            const text = item.textContent?.trim() || "";
            if (/^[a-f][\)\.\:\-]/i.test(text)) {
                item.remove();
            }
        });

        return tempDiv.innerHTML;
    };

    const renderSubmissionReview = (sub: Submission, onBack: () => void) => {
        const quiz = quizzes.find((q) => q.id === sub.quizId);

        if (!quiz) {
            return (
                <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-gray-400 italic">
                    Không tìm thấy dữ liệu đề thi tương ứng.
                </div>
            );
        }

        const totalQ = quiz.questions.length;

        // Compute per-question status
        const qStatuses: ("correct" | "wrong" | "partial" | "unanswered")[] =
            quiz.questions.map((q) => {
                const chosen = sub.answers[q.id];
                if (chosen === undefined || chosen === null || chosen === "")
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
                    const studentTf = (chosen as (boolean | null)[]) || [
                        null,
                        null,
                        null,
                        null,
                    ];
                    const matchCount = q.options.filter(
                        (_, i) => studentTf[i] === correctTf[i],
                    ).length;
                    if (matchCount === 4) return "correct";
                    if (matchCount > 0) return "partial";
                    return "wrong";
                } else if (q.type === "short_answer") {
                    const cKey = (q.shortAnswerKey || "").trim().toLowerCase();
                    const sKey = String(chosen || "")
                        .trim()
                        .toLowerCase();
                    return cKey && sKey === cKey ? "correct" : "wrong";
                }
                return "wrong";
            });

        const correctCount = qStatuses.filter((s) => s === "correct").length;

        const safeIdx = Math.min(adminReviewQuestionIdx, totalQ - 1);
        const q = quiz.questions[safeIdx];
        const chosen = sub.answers[q.id];
        const status = qStatuses[safeIdx];

        // Build question-level grading detail
        let tfStatusList: {
            text: string;
            correct: boolean;
            studentVal: boolean | null;
            correctVal: boolean;
        }[] = [];
        if (q.type === "true_false") {
            const correctTf = q.correctAnswers || [false, false, false, false];
            const studentTf = (chosen as (boolean | null)[]) || [
                null,
                null,
                null,
                null,
            ];
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
            <div className="w-full relative flex flex-col lg:flex-row lg:justify-center lg:items-start gap-6 max-w-7xl mx-auto">
                {/* CENTER COLUMN: Question Box Card & Options */}
                <div className="w-full lg:flex-1 lg:max-w-4xl flex flex-col">
                    <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-6 flex flex-col justify-between">
                        {/* Quiz Review Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5 text-left">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold tracking-wider uppercase bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-md">
                                        Xem bài làm học sinh
                                    </span>
                                    <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase">
                                        {sub.studentName}
                                    </span>
                                </div>
                                <h2 className="text-sm font-bold text-slate-900 mt-2">
                                    {sub.quizTitle}
                                </h2>
                            </div>

                            {/* Score Pill */}
                            <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg border bg-brand-50 border-brand-200 text-brand-700 text-xs font-bold self-start sm:self-auto shadow-3xs">
                                <Crown className="w-4 h-4" />
                                <span>
                                    Điểm số: {sub.score} (Đúng {correctCount}/
                                    {totalQ})
                                </span>
                            </div>
                        </div>

                        {/* Progress indicator bar */}
                        <div>
                            <div className="flex justify-between text-[11px] font-semibold text-gray-400 mb-1.5">
                                <span>
                                    Đang xem câu {safeIdx + 1} trên {totalQ}
                                </span>
                                <span>
                                    Tỷ lệ đúng:{" "}
                                    {Math.round((correctCount / totalQ) * 100)}%
                                </span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${Math.round(((safeIdx + 1) / totalQ) * 100)}%`,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Question & Options Content */}
                        <div className="space-y-5 text-left">
                            {/* Question Box Card */}
                            <div
                                className={`bg-slate-50/50 border border-slate-200 p-6 rounded-xl space-y-4 ${cardAccentClass}`}
                            >
                                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-extrabold text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                                            Câu {safeIdx + 1}
                                        </span>
                                        <span
                                            className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                                                q.type === "true_false"
                                                    ? "bg-amber-50 text-amber-800 border-amber-250"
                                                    : q.type === "short_answer"
                                                      ? "bg-purple-50 text-purple-800 border-purple-250"
                                                      : "bg-sky-50 text-sky-800 border-sky-250"
                                            }`}
                                        >
                                            {q.type === "true_false"
                                                ? "Đúng / Sai"
                                                : q.type === "short_answer"
                                                  ? "Điền đáp án"
                                                  : "Trắc nghiệm"}
                                        </span>
                                    </div>
                                    <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${statusBadgeClass}`}
                                    >
                                        {statusText}
                                    </span>
                                </div>

                                {q.sectionTitle && (
                                    <div className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 inline-block uppercase tracking-wider">
                                        {q.sectionTitle}
                                    </div>
                                )}

                                <h3 className="font-semibold text-slate-900 leading-relaxed overflow-x-auto text-[14px] [&_img]:mx-auto [&_img]:block [&_img]:my-4">
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
                                    if (!q.type || q.type === "single_choice") {
                                        return (
                                            <div className="space-y-3">
                                                {q.options.map(
                                                    (option, idx) => {
                                                        const isChosen =
                                                            chosen === idx;
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
                                                        let badge = null;

                                                        if (isCorrectOpt) {
                                                            borderStyle =
                                                                "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/10";
                                                            letterCircleStyle =
                                                                "bg-emerald-500 text-white font-medium";
                                                            badge = (
                                                                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white font-medium flex items-center justify-center">
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
                                                            badge = (
                                                                <span className="text-[9px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-md">
                                                                    Học sinh
                                                                    chọn
                                                                </span>
                                                            );
                                                        } else if (isChosen) {
                                                            badge = (
                                                                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white font-medium flex items-center justify-center">
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <div
                                                                key={idx}
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
                                                                {badge}
                                                            </div>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        );
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

                                        return (
                                            <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3 overflow-x-auto">
                                                <div className="grid grid-cols-12 text-[10px] font-bold text-gray-400 uppercase pb-2 border-b border-slate-200 min-w-[320px]">
                                                    <div className="col-span-8 sm:col-span-9">
                                                        Khẳng định / Nhận định
                                                    </div>
                                                    <div className="col-span-4 sm:col-span-3 text-center">
                                                        Đáp án & Kết quả
                                                    </div>
                                                </div>
                                                {q.options.map(
                                                    (option, idx) => {
                                                        const currentVal =
                                                            studentTf[idx];
                                                        const correctVal =
                                                            correctTf[idx];
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
                                                            currentVal === true
                                                        ) {
                                                            dungBtnClass =
                                                                isCorrect
                                                                    ? "bg-emerald-500 text-white shadow-sm"
                                                                    : "bg-rose-500 text-white shadow-sm";
                                                        } else if (
                                                            currentVal === false
                                                        ) {
                                                            saiBtnClass =
                                                                isCorrect
                                                                    ? "bg-emerald-500 text-white shadow-sm"
                                                                    : "bg-rose-500 text-white shadow-sm";
                                                        }

                                                        if (
                                                            correctVal === true
                                                        ) {
                                                            dungBtnClass +=
                                                                " ring-2 ring-emerald-500 ring-offset-1 border-emerald-500";
                                                        } else {
                                                            saiBtnClass +=
                                                                " ring-2 ring-emerald-500 ring-offset-1 border-emerald-500";
                                                        }

                                                        return (
                                                            <div
                                                                key={idx}
                                                                className="grid grid-cols-12 items-center gap-2 py-2 border-b border-slate-100 last:border-0 min-w-[320px]"
                                                            >
                                                                <div className="col-span-8 sm:col-span-9 flex gap-2 text-slate-800 [&_img]:mx-auto [&_img]:block [&_img]:my-2 text-xs">
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
                                                                        className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold ${dungBtnClass}`}
                                                                    >
                                                                        Đúng
                                                                    </span>
                                                                    <span
                                                                        className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold ${saiBtnClass}`}
                                                                    >
                                                                        Sai
                                                                    </span>
                                                                    <span className="flex items-center ml-1">
                                                                        {currentVal ===
                                                                        null ? (
                                                                            <span className="text-[8px] text-gray-400 font-bold">
                                                                                Chưa
                                                                                chọn
                                                                            </span>
                                                                        ) : isCorrect ? (
                                                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                                        ) : (
                                                                            <AlertCircle className="w-4 h-4 text-rose-500" />
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        );
                                    } else if (q.type === "short_answer") {
                                        const textVal = String(chosen || "");
                                        const isCorrect = status === "correct";

                                        let inputBorderClass =
                                            "border-rose-300 bg-rose-50/20 text-rose-900";
                                        if (isCorrect) {
                                            inputBorderClass =
                                                "border-emerald-300 bg-emerald-50/20 text-emerald-900";
                                        } else if (textVal === "") {
                                            inputBorderClass =
                                                "border-slate-300 bg-slate-50 text-slate-400";
                                        }

                                        return (
                                            <div className="space-y-2 text-left">
                                                <label className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">
                                                    Đáp án điền của học sinh:
                                                </label>
                                                <div className="flex flex-col gap-2">
                                                    <input
                                                        type="text"
                                                        value={
                                                            textVal !== ""
                                                                ? textVal
                                                                : "(Để trống)"
                                                        }
                                                        disabled
                                                        className={`w-full px-4 py-3 font-bold rounded-lg ${inputBorderClass} text-xs`}
                                                    />
                                                    <div className="text-xs text-emerald-700 font-bold mt-1 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        <span>
                                                            Đáp án chính xác:{" "}
                                                            {q.shortAnswerKey}
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
                                <div className="bg-slate-55 border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
                                    <div className="flex items-center gap-1.5 text-[#3B6D85] font-extrabold">
                                        <BookOpen className="w-4 h-4 text-[#3B6D85]" />
                                        <span>Lời giải chi tiết:</span>
                                    </div>
                                    <div
                                        className="text-slate-705 overflow-x-auto leading-relaxed pl-2 border-l-2 border-[#3B6D85]/30 [&_img]:mx-auto [&_img]:block [&_img]:my-4"
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
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() =>
                                    setAdminReviewQuestionIdx((p) =>
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
                                onClick={() =>
                                    setAdminReviewQuestionIdx((p) =>
                                        Math.min(totalQ - 1, p + 1),
                                    )
                                }
                                disabled={safeIdx === totalQ - 1}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                            >
                                <span>Tiếp theo</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Questions Tracker & Quick Select Panel */}
                <div className="w-full lg:w-80 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-6 flex flex-col justify-between text-left">
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                                Bảng câu hỏi
                            </h3>
                            <p className="text-[10px] text-gray-500 mt-1 flex items-center flex-wrap gap-1">
                                <span className="inline-block w-2.5 h-2.5 bg-emerald-200 border border-emerald-350 rounded-sm"></span>
                                <span className="mr-1">Đúng</span>
                                <span className="inline-block w-2.5 h-2.5 bg-amber-200 border border-amber-300 rounded-sm"></span>
                                <span className="mr-1">Đúng 1 phần</span>
                                <span className="inline-block w-2.5 h-2.5 bg-rose-200 border border-rose-350 rounded-sm"></span>
                                <span className="mr-1">Sai</span>
                                <span className="inline-block w-2.5 h-2.5 bg-slate-100 border border-slate-250 rounded-sm"></span>
                                <span>Chưa làm</span>
                            </p>
                        </div>

                        {/* Render Questions grouped by Section */}
                        <div className="space-y-4 overflow-y-auto max-h-[350px] pr-1">
                            {(() => {
                                const sections: Record<
                                    string,
                                    { qIndex: number; q: any }[]
                                > = {};
                                quiz.questions.forEach((q, idx) => {
                                    const secTitle =
                                        q.sectionTitle || "Phần câu hỏi";
                                    if (!sections[secTitle]) {
                                        sections[secTitle] = [];
                                    }
                                    sections[secTitle].push({ qIndex: idx, q });
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
                                            <div className="grid grid-cols-5 gap-2 p-1">
                                                {items.map(({ qIndex, q }) => {
                                                    const s = qStatuses[qIndex];
                                                    const isCurrent =
                                                        qIndex === safeIdx;

                                                    let btnColorClass =
                                                        "bg-rose-200 text-rose-900 border-rose-300 hover:bg-rose-300";
                                                    if (s === "correct") {
                                                        btnColorClass =
                                                            "bg-emerald-200 text-emerald-900 border-emerald-300 hover:bg-emerald-300";
                                                    } else if (
                                                        s === "partial"
                                                    ) {
                                                        btnColorClass =
                                                            "bg-amber-200 text-amber-900 border-amber-300 hover:bg-emerald-300";
                                                    } else if (
                                                        s === "unanswered"
                                                    ) {
                                                        btnColorClass =
                                                            "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200";
                                                    }

                                                    return (
                                                        <button
                                                            key={q.id}
                                                            type="button"
                                                            onClick={() =>
                                                                setAdminReviewQuestionIdx(
                                                                    qIndex,
                                                                )
                                                            }
                                                            className={`w-9 h-9 rounded-lg text-xs font-bold transition-all relative flex items-center justify-center cursor-pointer border ${btnColorClass} ${
                                                                isCurrent
                                                                    ? "ring-2 ring-slate-400 ring-offset-1 border-slate-500 scale-105 shadow-xs z-10"
                                                                    : ""
                                                            }`}
                                                        >
                                                            {qIndex + 1}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ),
                                );
                            })()}
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onBack}
                            className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-3xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Quay lại danh sách</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const [userProfiles, setUserProfiles] = useState<User[]>([]);
    const [loadingProfiles, setLoadingProfiles] = useState(false);
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

    // User Management filters, search and pagination
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState<"all" | "teacher" | "student">(
        "all",
    );
    const [filterPlan, setFilterPlan] = useState<"all" | UserPlan>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);

    // Create User state
    const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
    const [newUserName, setNewUserName] = useState("");
    const [newUserUsername, setNewUserUsername] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("");
    const [newUserRole, setNewUserRole] = useState<"teacher" | "student">(
        "student",
    );
    const [newUserPlan, setNewUserPlan] = useState<UserPlan>("nothing");
    const [newUserGrade, setNewUserGrade] = useState<string>("");

    // Edit User state
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editUserName, setEditUserName] = useState("");
    const [editUserUsername, setEditUserUsername] = useState("");
    const [editUserRole, setEditUserRole] = useState<"teacher" | "student">(
        "student",
    );
    const [editUserPlan, setEditUserPlan] = useState<UserPlan>("nothing");
    const [editUserGrade, setEditUserGrade] = useState<string>("");

    // Statistics & Analytics state
    const [statsQuizSortBy, setStatsQuizSortBy] = useState<
        "submissions" | "avgScore" | "highestScore"
    >("submissions");
    const [statsStudentQuery, setStatsStudentQuery] = useState("");
    const [selectedStatsStudentId, setSelectedStatsStudentId] = useState<
        string | null
    >(null);
    const [adminReviewSubmission, setAdminReviewSubmission] =
        useState<Submission | null>(null);
    const [adminReviewQuestionIdx, setAdminReviewQuestionIdx] = useState(0);

    React.useEffect(() => {
        setAdminReviewQuestionIdx(0);
    }, [adminReviewSubmission]);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeEl = document.activeElement;
            if (
                activeEl &&
                (activeEl.tagName === "INPUT" ||
                    activeEl.tagName === "TEXTAREA" ||
                    activeEl.getAttribute("contenteditable") === "true")
            ) {
                return;
            }

            if (adminReviewSubmission) {
                const quiz = quizzes.find(
                    (q) => q.id === adminReviewSubmission.quizId,
                );
                if (quiz) {
                    if (e.key === "ArrowLeft") {
                        setAdminReviewQuestionIdx((prev) =>
                            Math.max(0, prev - 1),
                        );
                    } else if (e.key === "ArrowRight") {
                        setAdminReviewQuestionIdx((prev) =>
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
    }, [adminReviewSubmission, quizzes]);

    const [selectedQuizForDetails, setSelectedQuizForDetails] =
        useState<Quiz | null>(null);

    // Fetch profiles on mount if already authenticated
    React.useEffect(() => {
        if (isAuthenticated) {
            fetchProfiles();
        }
    }, [isAuthenticated]);

    // New Quiz Form state
    const [quizTitle, setQuizTitle] = useState("");
    const [quizDescription, setQuizDescription] = useState("");
    const [quizSubject, setQuizSubject] = useState("Giải Tích");
    const [quizGrade, setQuizGrade] = useState("10");
    const [quizDuration, setQuizDuration] = useState(45);
    const [importedQuestions, setImportedQuestions] = useState<any[]>([]);
    const [showWordImporter, setShowWordImporter] = useState(false);
    const [saveStatus, setSaveStatus] = useState<string | null>(null);
    const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");

    const [isSaveQuizModalOpen, setIsSaveQuizModalOpen] = useState(false);
    const [durationOption, setDurationOption] = useState<string>("45");
    const [scoringMode, setScoringMode] = useState<string>("EQUAL_WEIGHT");
    const [sectionPoints, setSectionPoints] = useState<Record<string, number>>(
        {},
    );

    // Khởi tạo bareme điểm mặc định cho từng phần khi mở modal
    React.useEffect(() => {
        if (isSaveQuizModalOpen && importedQuestions.length > 0) {
            const uniqueSections = Array.from(
                new Set(
                    importedQuestions
                        .map((q) => q.sectionTitle)
                        .filter(Boolean),
                ),
            ) as string[];

            const defaults: Record<string, number> = {};
            uniqueSections.forEach((sec) => {
                const secStr = sec.toLowerCase();
                if (secStr.includes("phần i") || secStr.includes("phần 1")) {
                    defaults[sec] = 3.0;
                } else if (
                    secStr.includes("phần ii") ||
                    secStr.includes("phần 2")
                ) {
                    defaults[sec] = 4.0;
                } else if (
                    secStr.includes("phần iii") ||
                    secStr.includes("phần 3")
                ) {
                    defaults[sec] = 3.0;
                } else {
                    defaults[sec] =
                        Math.round((10.0 / uniqueSections.length) * 10) / 10;
                }
            });
            setSectionPoints(defaults);
        }
    }, [importedQuestions, isSaveQuizModalOpen]);

    // Auto-update short description based on category, grade, and duration
    React.useEffect(() => {
        if (isSaveQuizModalOpen) {
            const isDefault =
                !quizDescription ||
                /^(Giải Tích|Đại Số|Hình Học|Thi Thử)\s*-\s*Lớp\s*\d+\s*-\s*Thời gian:\s*\d+\s*phút$/i.test(
                    quizDescription,
                ) ||
                /^Đề\s+(Giải Tích|Đại Số|Hình Học|Thi Thử)\s+Lớp\s+\d+\s+\d+\s+Phút$/i.test(
                    quizDescription,
                );
            if (isDefault) {
                setQuizDescription(
                    `Đề ${quizSubject} Lớp ${quizGrade} ${quizDuration} Phút`,
                );
            }
        }
    }, [quizSubject, quizGrade, quizDuration, isSaveQuizModalOpen]);

    const [adminUser] = useState<User | null>(() => {
        const saved = localStorage.getItem("hvt_user");
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return null;
            }
        }
        return null;
    });

    const handleGoBack = () => {
        window.history.pushState({}, "", "/");
        window.dispatchEvent(new PopStateEvent("popstate"));
    };

    const handleQuestionsParsed = useCallback(
        (questions: any[], suggestedTitle?: string) => {
            setImportedQuestions(questions);
            if (suggestedTitle) {
                setQuizTitle(suggestedTitle);
            } else {
                setQuizTitle("");
            }
            setIsSaveQuizModalOpen(true);
        },
        [],
    );

    // Editing quiz state
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editIsPublic, setEditIsPublic] = useState<boolean>(true);
    const [editSubject, setEditSubject] = useState("");
    const [editGrade, setEditGrade] = useState("");
    const [editDuration, setEditDuration] = useState(45);
    const [editQuestions, setEditQuestions] = useState<Question[]>([]);
    const [editScoringMode, setEditScoringMode] = useState<"EQUAL_WEIGHT" | "SECTION_BASED" | "THPT_QG">("EQUAL_WEIGHT");
    const [editSectionPoints, setEditSectionPoints] = useState<Record<string, number>>({});
    const [editDurationOption, setEditDurationOption] = useState<string>("45");

    // Question player state inside edit modal
    const [editModalTab, setEditModalTab] = useState<"questions" | "settings">("questions");
    const [editCurrentQuestionIdx, setEditCurrentQuestionIdx] = useState(0);
    const [editExpandedHtmlQuestions, setEditExpandedHtmlQuestions] = useState<Record<string, boolean>>({});
    const [editFontSize, setEditFontSize] = useState(14);

    // Quiz list search, filter, sorting, and pagination states
    const [quizSearchQuery, setQuizSearchQuery] = useState("");
    const [quizFilterSubject, setQuizFilterSubject] = useState<string>("all");
    const [quizFilterGrade, setQuizFilterGrade] = useState<string>("all");
    const [quizFilterVisibility, setQuizFilterVisibility] = useState<
        "all" | "public" | "private"
    >("all");
    const [quizSortBy, setQuizSortBy] = useState<
        "newest" | "oldest" | "title" | "questions" | "duration"
    >("newest");
    const [quizPage, setQuizPage] = useState(1);
    const [quizPageSize] = useState(10);
    const [quizIsPublic, setQuizIsPublic] = useState(false);

    // Password verification via Supabase Edge Function 'verify-admin'
    const handleVerifyPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError(null);
        setVerifying(true);
        try {
            const isValid =
                await verifyAdminPasswordWithEdgeFunction(passwordInput);
            if (isValid) {
                setIsAuthenticated(true);
                sessionStorage.setItem("admin_verified", "true");
                fetchProfiles();
            } else {
                setAuthError(
                    "Xác thực thất bại qua Supabase Edge Function 'verify-admin'. Mật khẩu không đúng.",
                );
            }
        } catch (err: any) {
            setAuthError(`Lỗi xác thực Edge Function: ${err.message}`);
        } finally {
            setVerifying(false);
        }
    };

    // Load profiles from Supabase
    const fetchProfiles = async () => {
        setLoadingProfiles(true);
        try {
            const data = await getAllProfiles();
            setUserProfiles(data);
        } catch (err) {
            console.error("Lỗi khi tải danh sách hồ sơ:", err);
        } finally {
            setLoadingProfiles(false);
        }
    };

    const handlePlanChange = async (userId: string, newPlan: UserPlan) => {
        setUpdatingUserId(userId);
        try {
            await updateUserPlan(userId, newPlan);
            await fetchProfiles();
        } catch (err: any) {
            console.error("Lỗi cập nhật plan:", err);
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleRoleChange = async (
        userId: string,
        newRole: "teacher" | "student",
    ) => {
        const found = userProfiles.find((u) => u.id === userId);
        if (!found) return;
        setUpdatingUserId(userId);
        try {
            await updateUserProfile(userId, {
                name: found.name,
                username: found.username,
                role: newRole,
                plan: found.plan || "nothing",
                grade: newRole === "student" ? found.grade || null : null,
            });
            await fetchProfiles();
        } catch (err: any) {
            console.error("Lỗi cập nhật vai trò:", err);
            alert(`Lỗi cập nhật vai trò: ${err.message}`);
        } finally {
            setUpdatingUserId(null);
        }
    };

    // Add new account
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (
            !newUserName.trim() ||
            !newUserUsername.trim() ||
            !newUserPassword.trim()
        ) {
            alert("Vui lòng điền đầy đủ thông tin.");
            return;
        }
        try {
            // Regiter user via signUpUser
            const createdUser = await signUpUser(
                newUserName.trim(),
                newUserUsername.trim(),
                newUserPassword,
                newUserRole,
                newUserRole === "student" ? newUserGrade || null : null,
            );
            // If plan is not 'nothing', we need to update it
            if (newUserPlan !== "nothing") {
                await updateUserPlan(createdUser.id, newUserPlan);
            }
            alert("Tạo tài khoản thành công!");
            setIsCreateUserOpen(false);
            setNewUserName("");
            setNewUserUsername("");
            setNewUserPassword("");
            setNewUserRole("student");
            setNewUserPlan("nothing");
            setNewUserGrade("");
            await fetchProfiles();
        } catch (err: any) {
            alert(`Lỗi khi tạo tài khoản: ${err.message}`);
        }
    };

    // Edit user handlers
    const startEditUser = (user: User) => {
        setEditingUser(user);
        setEditUserName(user.name);
        setEditUserUsername(user.username);
        setEditUserRole(user.role);
        setEditUserPlan(user.plan || "nothing");
        setEditUserGrade(user.grade || "");
    };

    const handleSaveEditUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        if (!editUserName.trim() || !editUserUsername.trim()) {
            alert("Vui lòng điền đầy đủ họ tên và username.");
            return;
        }
        try {
            await updateUserProfile(editingUser.id, {
                name: editUserName.trim(),
                username: editUserUsername.trim(),
                role: editUserRole,
                plan: editUserPlan,
                grade:
                    editUserRole === "student" ? editUserGrade || null : null,
            });
            alert("Cập nhật tài khoản thành công!");
            setEditingUser(null);
            await fetchProfiles();
        } catch (err: any) {
            alert(`Lỗi khi cập nhật tài khoản: ${err.message}`);
        }
    };

    // Delete user account
    const handleDeleteUser = async (userId: string) => {
        if (
            !confirm(
                "Bạn có chắc chắn muốn xóa tài khoản này? Thao tác này không thể hoàn tác.",
            )
        ) {
            return;
        }
        try {
            await deleteUserProfile(userId);
            alert("Đã xóa tài khoản thành công!");
            await fetchProfiles();
        } catch (err: any) {
            alert(`Lỗi khi xóa tài khoản: ${err.message}`);
        }
    };

    // Save new quiz (including isPublic flag and scoringConfig)
    const handleSaveNewQuiz = async () => {
        if (!quizTitle.trim() || !quizSubject.trim()) {
            alert("Vui lòng nhập tiêu đề và môn học.");
            return;
        }

        let scoringConfigObj: any = { type: scoringMode };
        if (scoringMode === "SECTION_BASED") {
            scoringConfigObj.sections = Object.keys(sectionPoints).map(
                (sec) => ({
                    section_id: sec,
                    total_points: sectionPoints[sec] || 0,
                }),
            );
        } else if (scoringMode === "THPT_QG") {
            scoringConfigObj.sections = [
                { section_id: "Phần I", total_points: 3.0 },
                { section_id: "Phần II", total_points: 4.0 },
                { section_id: "Phần III", total_points: 3.0 },
            ];
            scoringConfigObj.true_false_rules = {
                "1_correct": 0.1,
                "2_correct": 0.25,
                "3_correct": 0.5,
                "4_correct": 1.0,
            };
        }

        const newQuiz: Quiz = {
            id: crypto.randomUUID(),
            title: quizTitle.trim(),
            description:
                quizDescription.trim() || "Bài kiểm tra chất lượng cao HiTrang",
            subject: quizSubject,
            grade: quizGrade,
            duration: quizDuration,
            questions: importedQuestions,
            createdAt: new Date().toISOString().split("T")[0],
            isPublic: quizIsPublic,
            scoringConfig: scoringConfigObj,
        };
        try {
            await createQuiz(newQuiz);
            onAddQuiz(newQuiz);
            setSaveStatus("Lưu đề thi thành công!");
            setQuizTitle("");
            setQuizDescription("");
            setImportedQuestions([]);
            setShowWordImporter(false);
            setQuizIsPublic(false);
            setScoringMode("EQUAL_WEIGHT");
            setSectionPoints({});
            setTimeout(() => setSaveStatus(null), 3000);
        } catch (err: any) {
            alert(`Lỗi khi lưu đề thi: ${err.message}`);
        }
    };

    // Edit quiz handling
    // Edit quiz handling
    const startEditQuiz = (quiz: Quiz) => {
        setEditingQuiz(quiz);
        setEditTitle(quiz.title);
        setEditDescription(quiz.description);
        setEditIsPublic(quiz.isPublic !== undefined ? quiz.isPublic : true);
        setEditSubject(quiz.subject || "Toán Học");
        setEditGrade(quiz.grade || "12");
        setEditDuration(quiz.duration || 45);
        setEditQuestions(quiz.questions || []);
        setEditModalTab("questions");
        setEditCurrentQuestionIdx(0);
        setEditExpandedHtmlQuestions({});
        setEditFontSize(14);

        const durationStr = quiz.duration ? String(quiz.duration) : "45";
        if (["15", "30", "45", "60", "90"].includes(durationStr)) {
            setEditDurationOption(durationStr);
        } else {
            setEditDurationOption("other");
        }

        const scoringType = quiz.scoringConfig?.type || "EQUAL_WEIGHT";
        setEditScoringMode(scoringType);

        const secPts: Record<string, number> = {};
        if (scoringType === "SECTION_BASED" && quiz.scoringConfig?.sections) {
            quiz.scoringConfig.sections.forEach((sec) => {
                secPts[sec.section_id] = sec.total_points;
            });
        }
        setEditSectionPoints(secPts);
    };

    const cancelEdit = () => {
        setEditingQuiz(null);
    };

    const handleUpdateQuestionText = (index: number, text: string) => {
        const updated = [...editQuestions];
        updated[index] = { ...updated[index], text };
        setEditQuestions(updated);
    };

    const handleUpdateOption = (qIndex: number, oIndex: number, val: string) => {
        const updated = [...editQuestions];
        const opts = [...(updated[qIndex].options || [])];
        while (opts.length <= oIndex) {
            opts.push("");
        }
        opts[oIndex] = val;
        updated[qIndex] = { ...updated[qIndex], options: opts };
        setEditQuestions(updated);
    };

    const handleUpdateCorrectAnswer = (qIndex: number, ansIdx: number) => {
        const updated = [...editQuestions];
        updated[qIndex] = { ...updated[qIndex], correctAnswerIndex: ansIdx };
        setEditQuestions(updated);
    };

    const handleToggleTF = (qIndex: number, oIndex: number, val: boolean) => {
        const updated = [...editQuestions];
        if (!updated[qIndex].correctAnswers) {
            updated[qIndex].correctAnswers = [false, false, false, false];
        }
        const ans = [...updated[qIndex].correctAnswers!];
        ans[oIndex] = val;
        updated[qIndex] = { ...updated[qIndex], correctAnswers: ans };
        setEditQuestions(updated);
    };

    const handleUpdateShortAnswer = (qIndex: number, key: string) => {
        const updated = [...editQuestions];
        updated[qIndex] = { ...updated[qIndex], shortAnswerKey: key };
        setEditQuestions(updated);
    };

    const handleUpdateExplanation = (qIndex: number, explanation: string) => {
        const updated = [...editQuestions];
        updated[qIndex] = { ...updated[qIndex], explanation };
        setEditQuestions(updated);
    };

    const handleUpdateSectionTitle = (qIndex: number, sectionTitle: string) => {
        const updated = [...editQuestions];
        updated[qIndex] = { ...updated[qIndex], sectionTitle };
        setEditQuestions(updated);
    };

    const handleUpdateQuestionPoints = (qIndex: number, points: number) => {
        const updated = [...editQuestions];
        updated[qIndex] = { ...updated[qIndex], points: Number(points) };
        setEditQuestions(updated);
    };

    const handleUpdateQuestionType = (qIndex: number, type: QuestionType) => {
        const updated = [...editQuestions];
        const currentQ = updated[qIndex];
        
        let opts = currentQ.options || [];
        if (type === "single_choice" && opts.length !== 4) {
            opts = ["Phương án A", "Phương án B", "Phương án C", "Phương án D"];
        } else if (type === "true_false" && opts.length !== 4) {
            opts = ["Phát biểu A", "Phát biểu B", "Phát biểu C", "Phát biểu D"];
        } else if (type === "short_answer") {
            opts = [];
        }

        updated[qIndex] = {
            ...currentQ,
            type,
            options: opts,
            correctAnswerIndex: type === "single_choice" ? 0 : currentQ.correctAnswerIndex || 0,
            correctAnswers: type === "true_false" ? currentQ.correctAnswers || [false, false, false, false] : undefined,
            shortAnswerKey: type === "short_answer" ? currentQ.shortAnswerKey || "" : undefined,
        };
        setEditQuestions(updated);
    };

    const handleAddNewQuestionToEdit = () => {
        const newQ: Question = {
            id: "question_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
            text: "Nhập nội dung câu hỏi mới...",
            options: ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
            correctAnswerIndex: 0,
            type: "single_choice",
            sectionTitle: "Phần I",
            points: 0.25,
        };
        const updated = [...editQuestions, newQ];
        setEditQuestions(updated);
        setEditCurrentQuestionIdx(updated.length - 1);
    };

    const handleDeleteQuestionFromEdit = (index: number) => {
        const updated = editQuestions.filter((_, idx) => idx !== index);
        setEditQuestions(updated);
        setEditCurrentQuestionIdx((prev) => Math.max(0, Math.min(updated.length - 2, prev)));
    };

    const handleMoveQuestionUp = (index: number) => {
        if (index === 0) return;
        const updated = [...editQuestions];
        const temp = updated[index];
        updated[index] = updated[index - 1];
        updated[index - 1] = temp;
        setEditQuestions(updated);
        setEditCurrentQuestionIdx(index - 1);
    };

    const handleMoveQuestionDown = (index: number) => {
        if (index === editQuestions.length - 1) return;
        const updated = [...editQuestions];
        const temp = updated[index];
        updated[index] = updated[index + 1];
        updated[index + 1] = temp;
        setEditQuestions(updated);
        setEditCurrentQuestionIdx(index + 1);
    };

    const saveEditQuiz = async () => {
        if (!editingQuiz) return;
        if (!editTitle.trim() || !editSubject.trim()) {
            alert("Vui lòng nhập tên đề thi và môn học.");
            return;
        }

        let scoringConfigObj: any = { type: editScoringMode };
        if (editScoringMode === "SECTION_BASED") {
            scoringConfigObj.sections = Object.keys(editSectionPoints).map(
                (sec) => ({
                    section_id: sec,
                    total_points: editSectionPoints[sec] || 0,
                }),
            );
        } else if (editScoringMode === "THPT_QG") {
            scoringConfigObj.sections = [
                { section_id: "Phần I", total_points: 3.0 },
                { section_id: "Phần II", total_points: 4.0 },
                { section_id: "Phần III", total_points: 3.0 },
            ];
            scoringConfigObj.true_false_rules = {
                "1_correct": 0.1,
                "2_correct": 0.25,
                "3_correct": 0.5,
                "4_correct": 1.0,
            };
        }

        const updated: Partial<Quiz> = {
            title: editTitle.trim(),
            description: editDescription.trim() || "Bài kiểm tra chất lượng cao HiTrang",
            subject: editSubject,
            grade: editGrade,
            duration: Number(editDuration),
            questions: editQuestions,
            isPublic: editIsPublic,
            scoringConfig: scoringConfigObj,
        };

        try {
            await updateQuiz(editingQuiz.id, updated);
            onUpdateQuiz({ ...editingQuiz, ...updated } as Quiz);
            setEditingQuiz(null);
        } catch (err: any) {
            alert(`Lỗi khi cập nhật đề thi: ${err.message}`);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="max-w-md mx-auto my-16 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl space-y-6 text-center">
                <div className="w-16 h-16   text-brand-600 rounded-2xl flex items-center justify-center mx-auto  ">
                    <Shield className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                    Trang Quản Trị Hệ Thống (Admin)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                    Yêu cầu xác thực (ví dụ: admin123).
                </p>
                <form
                    onSubmit={handleVerifyPassword}
                    className="space-y-4 text-left"
                >
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                        Mật khẩu Admin:
                    </label>
                    <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                            type="password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            placeholder="Nhập mật khẩu"
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                        />
                    </div>
                    {authError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                            <span>{authError}</span>
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={verifying}
                        className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer"
                    >
                        {verifying
                            ? "Đang xác thực..."
                            : "Xác Nhận Truy Cập Admin"}
                    </button>
                </form>
            </div>
        );
    }

    // Authenticated dashboard with left sidebar
    const filteredUsers = userProfiles.filter((u) => {
        const matchesSearch =
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.username.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = filterRole === "all" || u.role === filterRole;
        const matchesPlan =
            filterPlan === "all" || (u.plan || "nothing") === filterPlan;
        return matchesSearch && matchesRole && matchesPlan;
    });

    const totalPages = Math.ceil(filteredUsers.length / pageSize);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
    );

    // Quiz filtering, sorting, and pagination logic
    const filteredQuizzes = quizzes
        .filter((q) => {
            const matchesSearch =
                q.title.toLowerCase().includes(quizSearchQuery.toLowerCase()) ||
                (q.description &&
                    q.description
                        .toLowerCase()
                        .includes(quizSearchQuery.toLowerCase())) ||
                q.subject.toLowerCase().includes(quizSearchQuery.toLowerCase());
            const matchesSubject =
                quizFilterSubject === "all" ||
                q.subject.toLowerCase() === quizFilterSubject.toLowerCase();
            const matchesGrade =
                quizFilterGrade === "all" || q.grade === quizFilterGrade;
            const matchesVisibility =
                quizFilterVisibility === "all" ||
                (quizFilterVisibility === "public" && q.isPublic !== false) ||
                (quizFilterVisibility === "private" && q.isPublic === false);
            return (
                matchesSearch &&
                matchesSubject &&
                matchesGrade &&
                matchesVisibility
            );
        })
        .sort((a, b) => {
            if (quizSortBy === "newest") {
                return (b.createdAt || "").localeCompare(a.createdAt || "");
            }
            if (quizSortBy === "oldest") {
                return (a.createdAt || "").localeCompare(b.createdAt || "");
            }
            if (quizSortBy === "title") {
                return a.title.localeCompare(b.title);
            }
            if (quizSortBy === "questions") {
                return b.questions.length - a.questions.length;
            }
            if (quizSortBy === "duration") {
                return b.duration - a.duration;
            }
            return 0;
        });

    const quizTotalPages = Math.ceil(filteredQuizzes.length / quizPageSize);
    const paginatedQuizzes = filteredQuizzes.slice(
        (quizPage - 1) * quizPageSize,
        quizPage * quizPageSize,
    );

    return (
        <div className="flex h-[calc(100vh-64px)] w-screen overflow-hidden bg-[#FDFDFD]">
            {/* LEFT SIDEBAR */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between h-full select-none shrink-0">
                <div className="flex flex-col min-h-0">
                    {/* Profile Section */}
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100/80 bg-gray-50/20">
                        <div className="w-9 h-9 rounded-xl border border-blue-100 bg-blue-50/50 flex items-center justify-center text-[#1B72E8] shrink-0">
                            <UserIcon className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-slate-800 truncate leading-snug">
                                {adminUser?.name || "Giáo viên"}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5 truncate font-medium">
                                Quản trị viên
                            </span>
                        </div>
                    </div>

                    {/* Search settings input */}
                    <div className="px-6 py-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Tìm cài đặt..."
                                value={sidebarSearchQuery}
                                onChange={(e) =>
                                    setSidebarSearchQuery(e.target.value)
                                }
                                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-400 text-slate-700"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        </div>
                    </div>

                    {/* Nav Categories */}
                    <div className="flex-1 overflow-y-auto py-2">
                        {/* Group 1: General Settings */}
                        {(!sidebarSearchQuery ||
                            "quản lý account".includes(
                                sidebarSearchQuery.toLowerCase(),
                            )) && (
                            <div className="space-y-0.5 mb-4">
                                <div className="flex items-center justify-between px-6 py-2">
                                    <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase">
                                        GENERAL SETTINGS
                                    </span>
                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                </div>
                                <button
                                    onClick={() => handleTabClick("plans")}
                                    className={`w-full flex items-center gap-3 py-2.5 text-xs transition-all cursor-pointer ${
                                        activeTab === "plans"
                                            ? "pl-5 pr-6 bg-[#EBF3FF]/60 text-[#1B72E8] border-l-4 border-[#1B72E8] font-bold"
                                            : "pl-[24px] pr-6 text-[#70757A] hover:text-slate-800 hover:bg-slate-50/50 font-medium"
                                    }`}
                                >
                                    <UserIcon className="w-4 h-4 shrink-0" />
                                    <span>Account</span>
                                </button>
                            </div>
                        )}

                        {/* Group 2: Workspace Settings */}
                        {(!sidebarSearchQuery ||
                            "tạo / sửa đề thi".includes(
                                sidebarSearchQuery.toLowerCase(),
                            ) ||
                            "danh sách đề thi".includes(
                                sidebarSearchQuery.toLowerCase(),
                            ) ||
                            "chống gian lận".includes(
                                sidebarSearchQuery.toLowerCase(),
                            )) && (
                            <div className="space-y-0.5 mb-4">
                                <div className="flex items-center justify-between px-6 py-2">
                                    <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase">
                                        WORKSPACE SETTINGS
                                    </span>
                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                </div>

                                {(!sidebarSearchQuery ||
                                    "tạo / sửa đề thi".includes(
                                        sidebarSearchQuery.toLowerCase(),
                                    )) && (
                                    <button
                                        onClick={() =>
                                            handleTabClick("create-quiz")
                                        }
                                        className={`w-full flex items-center gap-3 py-2.5 text-xs transition-all cursor-pointer ${
                                            activeTab === "create-quiz"
                                                ? "pl-5 pr-6 bg-[#EBF3FF]/60 text-[#1B72E8] border-l-4 border-[#1B72E8] font-bold"
                                                : "pl-[24px] pr-6 text-[#70757A] hover:text-slate-800 hover:bg-slate-50/50 font-medium"
                                        }`}
                                    >
                                        <Plus className="w-4 h-4 shrink-0" />
                                        <span>Tạo / Sửa Đề Thi</span>
                                    </button>
                                )}

                                {(!sidebarSearchQuery ||
                                    "danh sách đề thi".includes(
                                        sidebarSearchQuery.toLowerCase(),
                                    )) && (
                                    <button
                                        onClick={() =>
                                            handleTabClick("quizzes")
                                        }
                                        className={`w-full flex items-center gap-3 py-2.5 text-xs transition-all cursor-pointer ${
                                            activeTab === "quizzes"
                                                ? "pl-5 pr-6 bg-[#EBF3FF]/60 text-[#1B72E8] border-l-4 border-[#1B72E8] font-bold"
                                                : "pl-[24px] pr-6 text-[#70757A] hover:text-slate-800 hover:bg-slate-50/50 font-medium"
                                        }`}
                                    >
                                        <BookOpen className="w-4 h-4 shrink-0" />
                                        <span>Danh Sách Đề Thi</span>
                                    </button>
                                )}

                                {(!sidebarSearchQuery ||
                                    "chống gian lận".includes(
                                        sidebarSearchQuery.toLowerCase(),
                                    )) && (
                                    <div className="w-full flex items-center justify-between pr-4 py-2 hover:bg-slate-50/50 transition-all cursor-default">
                                        <div className="flex items-center gap-3 pl-[24px]">
                                            <Shield className="w-4 h-4 text-[#70757A] shrink-0" />
                                            <span className="text-xs font-semibold text-[#70757A]">
                                                Chống gian lận
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleToggleAntiCheat(
                                                    !antiCheatEnabled,
                                                )
                                            }
                                            className={`w-7 h-4 rounded-full p-0.5 transition-colors cursor-pointer relative flex-shrink-0 ${
                                                antiCheatEnabled
                                                    ? "bg-[#1B72E8]"
                                                    : "bg-slate-200"
                                            }`}
                                        >
                                            <div
                                                className={`w-3 h-3 bg-white rounded-full shadow-xs transition-transform transform ${
                                                    antiCheatEnabled
                                                        ? "translate-x-3"
                                                        : "translate-x-0"
                                                }`}
                                            />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Group 3: Connection (Stats) */}
                        {(!sidebarSearchQuery ||
                            "thống kê đề thi".includes(
                                sidebarSearchQuery.toLowerCase(),
                            ) ||
                            "thống kê học sinh".includes(
                                sidebarSearchQuery.toLowerCase(),
                            )) && (
                            <div className="space-y-0.5 mb-4">
                                <div className="flex items-center justify-between px-6 py-2">
                                    <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase">
                                        CONNECTION
                                    </span>
                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                </div>

                                {(!sidebarSearchQuery ||
                                    "thống kê đề thi".includes(
                                        sidebarSearchQuery.toLowerCase(),
                                    )) && (
                                    <button
                                        onClick={() =>
                                            handleTabClick("stats-quizzes")
                                        }
                                        className={`w-full flex items-center gap-3 py-2.5 text-xs transition-all cursor-pointer ${
                                            activeTab === "stats-quizzes"
                                                ? "pl-5 pr-6 bg-[#EBF3FF]/60 text-[#1B72E8] border-l-4 border-[#1B72E8] font-bold"
                                                : "pl-[24px] pr-6 text-[#70757A] hover:text-slate-800 hover:bg-slate-50/50 font-medium"
                                        }`}
                                    >
                                        <BarChart3 className="w-4 h-4 shrink-0" />
                                        <span>Thống kê đề thi</span>
                                    </button>
                                )}

                                {(!sidebarSearchQuery ||
                                    "thống kê học sinh".includes(
                                        sidebarSearchQuery.toLowerCase(),
                                    )) && (
                                    <button
                                        onClick={() =>
                                            handleTabClick("stats-students")
                                        }
                                        className={`w-full flex items-center gap-3 py-2.5 text-xs transition-all cursor-pointer ${
                                            activeTab === "stats-students"
                                                ? "pl-5 pr-6 bg-[#EBF3FF]/60 text-[#1B72E8] border-l-4 border-[#1B72E8] font-bold"
                                                : "pl-[24px] pr-6 text-[#70757A] hover:text-slate-800 hover:bg-slate-50/50 font-medium"
                                        }`}
                                    >
                                        <UserCheck className="w-4 h-4 shrink-0" />
                                        <span>Thống kê học sinh</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer divider and info */}
                <div className="py-4 border-t border-gray-100 bg-white">
                    <div className="px-6 text-center">
                        <span className="text-[9px] text-slate-400 font-medium leading-none">
                            HiTrang v1.1.7 - Settings
                        </span>
                    </div>
                </div>
            </aside>
            <section className="flex-1 p-6 overflow-y-auto">
                {adminReviewSubmission ? (
                    renderSubmissionReview(adminReviewSubmission, () =>
                        setAdminReviewSubmission(null),
                    )
                ) : (
                    <>
                        {activeTab === "plans" && (
                            <div className="space-y-6">
                                {/* Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-800">
                                            Gói Người Dùng
                                        </h2>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Quản lý phân quyền, tìm kiếm và phân
                                            cấp gói dịch vụ học viên.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() =>
                                            setIsCreateUserOpen(true)
                                        }
                                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                                    >
                                        <UserPlus className="w-3.5 h-3.5" />
                                        Tạo tài khoản
                                    </button>
                                </div>

                                {/* Filter Bar */}
                                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                                    {/* Search */}
                                    <div className="relative w-full sm:w-64">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                                        <input
                                            type="text"
                                            placeholder="Tìm tên hoặc username..."
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                                        />
                                    </div>

                                    {/* Filters */}
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <select
                                            value={filterRole}
                                            onChange={(e) => {
                                                setFilterRole(
                                                    e.target.value as any,
                                                );
                                                setCurrentPage(1);
                                            }}
                                            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:border-slate-400 cursor-pointer"
                                        >
                                            <option value="all">
                                                Tất cả vai trò
                                            </option>
                                            <option value="teacher">
                                                Giáo viên
                                            </option>
                                            <option value="student">
                                                Học sinh
                                            </option>
                                        </select>

                                        <select
                                            value={filterPlan}
                                            onChange={(e) => {
                                                setFilterPlan(
                                                    e.target.value as any,
                                                );
                                                setCurrentPage(1);
                                            }}
                                            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:border-slate-400 cursor-pointer"
                                        >
                                            <option value="all">
                                                Tất cả gói
                                            </option>
                                            <option value="nothing">
                                                Free (Nothing)
                                            </option>
                                            <option value="basic">Basic</option>
                                            <option value="vip">VIP</option>
                                        </select>
                                    </div>
                                </div>

                                {/* User List */}
                                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/50">
                                                <th className="py-2.5 px-4">
                                                    Tên Người Dùng
                                                </th>
                                                <th className="py-2.5 px-4">
                                                    Username
                                                </th>
                                                <th className="py-2.5 px-4">
                                                    Vai Trò
                                                </th>
                                                <th className="py-2.5 px-4">
                                                    Plan
                                                </th>
                                                <th className="py-2.5 px-4">
                                                    Lớp
                                                </th>
                                                <th className="py-2.5 px-4 text-right">
                                                    Thao tác
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 text-xs text-slate-600">
                                            {loadingProfiles ? (
                                                <tr>
                                                    <td
                                                        colSpan={6}
                                                        className="py-8 text-center text-slate-400"
                                                    >
                                                        Đang tải danh sách...
                                                    </td>
                                                </tr>
                                            ) : paginatedUsers.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={6}
                                                        className="py-8 text-center text-slate-400"
                                                    >
                                                        Không tìm thấy tài khoản
                                                        nào.
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedUsers.map((prof) => (
                                                    <tr
                                                        key={prof.id}
                                                        className="hover:bg-slate-50/40 transition-colors"
                                                    >
                                                        <td className="py-3 px-4 font-medium text-slate-800">
                                                            {prof.name}
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-400">
                                                            @{prof.username}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <select
                                                                disabled={
                                                                    updatingUserId ===
                                                                    prof.id
                                                                }
                                                                value={
                                                                    prof.role
                                                                }
                                                                onChange={(e) =>
                                                                    handleRoleChange(
                                                                        prof.id,
                                                                        e.target
                                                                            .value as
                                                                            | "teacher"
                                                                            | "student",
                                                                    )
                                                                }
                                                                className={`px-2 py-1 rounded text-[10px] font-bold border focus:outline-none cursor-pointer transition-colors ${
                                                                    prof.role ===
                                                                    "teacher"
                                                                        ? "bg-amber-50 text-amber-800 border-amber-200"
                                                                        : "bg-sky-50 text-sky-800 border-sky-200"
                                                                }`}
                                                            >
                                                                <option value="student">
                                                                    Học sinh
                                                                </option>
                                                                <option value="teacher">
                                                                    Giáo viên
                                                                </option>
                                                            </select>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <select
                                                                disabled={
                                                                    updatingUserId ===
                                                                    prof.id
                                                                }
                                                                value={
                                                                    prof.plan ||
                                                                    "nothing"
                                                                }
                                                                onChange={(e) =>
                                                                    handlePlanChange(
                                                                        prof.id,
                                                                        e.target
                                                                            .value as UserPlan,
                                                                    )
                                                                }
                                                                className={`px-2 py-1 rounded text-[10px] font-bold border focus:outline-none cursor-pointer transition-colors ${
                                                                    prof.plan ===
                                                                    "vip"
                                                                        ? "bg-amber-50 text-amber-800 border-amber-200"
                                                                        : prof.plan ===
                                                                            "basic"
                                                                          ? "bg-sky-50 text-sky-800 border-sky-200"
                                                                          : "bg-slate-50 text-slate-600 border-slate-200"
                                                                }`}
                                                            >
                                                                <option value="nothing">
                                                                    FREE
                                                                </option>
                                                                <option value="basic">
                                                                    BASIC
                                                                </option>
                                                                <option value="vip">
                                                                    VIP
                                                                </option>
                                                            </select>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            {prof.role ===
                                                            "student" ? (
                                                                <select
                                                                    disabled={
                                                                        updatingUserId ===
                                                                        prof.id
                                                                    }
                                                                    value={
                                                                        prof.grade ||
                                                                        ""
                                                                    }
                                                                    onChange={async (
                                                                        e,
                                                                    ) => {
                                                                        const newGrade =
                                                                            e
                                                                                .target
                                                                                .value ||
                                                                            null;
                                                                        setUpdatingUserId(
                                                                            prof.id,
                                                                        );
                                                                        try {
                                                                            await updateUserGrade(
                                                                                prof.id,
                                                                                newGrade,
                                                                            );
                                                                            await fetchProfiles();
                                                                        } catch (err: any) {
                                                                            console.error(
                                                                                "Lỗi cập nhật lớp:",
                                                                                err,
                                                                            );
                                                                            alert(
                                                                                `Lỗi cập nhật lớp: ${err.message}`,
                                                                            );
                                                                        } finally {
                                                                            setUpdatingUserId(
                                                                                null,
                                                                            );
                                                                        }
                                                                    }}
                                                                    className={`px-2 py-1 rounded text-[10px] font-bold border focus:outline-none cursor-pointer transition-colors ${
                                                                        prof.grade
                                                                            ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                                                                            : "bg-slate-50 text-slate-600 border-slate-200"
                                                                    }`}
                                                                >
                                                                    <option value="">
                                                                        Chọn lớp
                                                                    </option>
                                                                    <option value="8">
                                                                        Lớp 8
                                                                    </option>
                                                                    <option value="9">
                                                                        Lớp 9
                                                                    </option>
                                                                    <option value="10">
                                                                        Lớp 10
                                                                    </option>
                                                                    <option value="11">
                                                                        Lớp 11
                                                                    </option>
                                                                    <option value="12">
                                                                        Lớp 12
                                                                    </option>
                                                                </select>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-400 font-medium italic">
                                                                    Không có
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 text-right space-x-1.5">
                                                            <button
                                                                onClick={() =>
                                                                    startEditUser(
                                                                        prof,
                                                                    )
                                                                }
                                                                className="inline-flex items-center px-2 py-1 hover:bg-slate-100 text-slate-500 rounded transition-colors cursor-pointer text-[11px] font-medium"
                                                            >
                                                                Sửa
                                                            </button>
                                                            <button
                                                                disabled={
                                                                    updatingUserId ===
                                                                    prof.id
                                                                }
                                                                onClick={() =>
                                                                    handleDeleteUser(
                                                                        prof.id,
                                                                    )
                                                                }
                                                                className="inline-flex items-center px-2 py-1 hover:bg-rose-50 text-rose-600 rounded transition-colors cursor-pointer text-[11px] font-medium"
                                                            >
                                                                Xóa
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                        <span className="text-[11px] text-slate-400">
                                            Hiển thị{" "}
                                            {(currentPage - 1) * pageSize + 1} -{" "}
                                            {Math.min(
                                                currentPage * pageSize,
                                                filteredUsers.length,
                                            )}{" "}
                                            / {filteredUsers.length} tài khoản
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() =>
                                                    setCurrentPage((p) =>
                                                        Math.max(1, p - 1),
                                                    )
                                                }
                                                disabled={currentPage === 1}
                                                className="p-1 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-500 rounded-md transition-colors cursor-pointer"
                                            >
                                                <ChevronLeft className="w-3.5 h-3.5" />
                                            </button>
                                            <span className="text-[11px] font-semibold text-slate-600 px-2">
                                                {currentPage} / {totalPages}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    setCurrentPage((p) =>
                                                        Math.min(
                                                            totalPages,
                                                            p + 1,
                                                        ),
                                                    )
                                                }
                                                disabled={
                                                    currentPage === totalPages
                                                }
                                                className="p-1 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-500 rounded-md transition-colors cursor-pointer"
                                            >
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* CREATE USER MODAL */}
                                {isCreateUserOpen && (
                                    <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs flex items-center justify-center z-50">
                                        <div className="bg-white rounded-xl p-5 w-full max-w-sm border border-slate-100 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                                            <h3 className="text-xs font-bold text-slate-800 mb-4 flex items-center gap-1.5 uppercase tracking-wider">
                                                Tạo tài khoản mới
                                            </h3>
                                            <form
                                                onSubmit={handleCreateUser}
                                                className="space-y-3.5"
                                            >
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">
                                                        Họ Tên
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="Nguyễn Văn A"
                                                        value={newUserName}
                                                        onChange={(e) =>
                                                            setNewUserName(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-normal focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/10"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">
                                                        Tên đăng nhập
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="nguyenvana"
                                                        value={newUserUsername}
                                                        onChange={(e) =>
                                                            setNewUserUsername(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-normal focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/10"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">
                                                        Mật khẩu
                                                    </label>
                                                    <input
                                                        type="password"
                                                        required
                                                        placeholder="Nhập mật khẩu"
                                                        value={newUserPassword}
                                                        onChange={(e) =>
                                                            setNewUserPassword(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-normal focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/10"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">
                                                            Vai trò
                                                        </label>
                                                        <select
                                                            value={newUserRole}
                                                            onChange={(e) =>
                                                                setNewUserRole(
                                                                    e.target
                                                                        .value as any,
                                                                )
                                                            }
                                                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400"
                                                        >
                                                            <option value="student">
                                                                Học sinh
                                                            </option>
                                                            <option value="teacher">
                                                                Giáo viên
                                                            </option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">
                                                            Plan
                                                        </label>
                                                        <select
                                                            value={newUserPlan}
                                                            onChange={(e) =>
                                                                setNewUserPlan(
                                                                    e.target
                                                                        .value as any,
                                                                )
                                                            }
                                                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400"
                                                        >
                                                            <option value="nothing">
                                                                Free (Nothing)
                                                            </option>
                                                            <option value="basic">
                                                                Basic
                                                            </option>
                                                            <option value="vip">
                                                                VIP
                                                            </option>
                                                        </select>
                                                    </div>
                                                </div>
                                                {newUserRole === "student" && (
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">
                                                            Lớp
                                                        </label>
                                                        <select
                                                            value={newUserGrade}
                                                            onChange={(e) =>
                                                                setNewUserGrade(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400"
                                                        >
                                                            <option value="">
                                                                Chọn lớp
                                                            </option>
                                                            <option value="8">
                                                                Lớp 8
                                                            </option>
                                                            <option value="9">
                                                                Lớp 9
                                                            </option>
                                                            <option value="10">
                                                                Lớp 10
                                                            </option>
                                                            <option value="11">
                                                                Lớp 11
                                                            </option>
                                                            <option value="12">
                                                                Lớp 12
                                                            </option>
                                                        </select>
                                                    </div>
                                                )}
                                                <div className="flex justify-end gap-2 pt-3 border-t border-slate-50">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsCreateUserOpen(
                                                                false,
                                                            );
                                                            setNewUserGrade("");
                                                        }}
                                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        Hủy
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-sm"
                                                    >
                                                        Tạo
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                )}

                                {/* EDIT USER MODAL */}
                                {editingUser && (
                                    <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs flex items-center justify-center z-50">
                                        <div className="bg-white rounded-xl p-5 w-full max-w-sm border border-slate-100 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                                            <h3 className="text-xs font-bold text-slate-800 mb-4 flex items-center gap-1.5 uppercase tracking-wider">
                                                Chỉnh sửa tài khoản
                                            </h3>
                                            <form
                                                onSubmit={handleSaveEditUser}
                                                className="space-y-3.5"
                                            >
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">
                                                        Họ Tên
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={editUserName}
                                                        onChange={(e) =>
                                                            setEditUserName(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-normal focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/10"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">
                                                        Tên đăng nhập
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={editUserUsername}
                                                        onChange={(e) =>
                                                            setEditUserUsername(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-normal focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/10"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">
                                                            Vai trò
                                                        </label>
                                                        <select
                                                            value={editUserRole}
                                                            onChange={(e) =>
                                                                setEditUserRole(
                                                                    e.target
                                                                        .value as any,
                                                                )
                                                            }
                                                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400"
                                                        >
                                                            <option value="student">
                                                                Học sinh
                                                            </option>
                                                            <option value="teacher">
                                                                Giáo viên
                                                            </option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">
                                                            Plan
                                                        </label>
                                                        <select
                                                            value={editUserPlan}
                                                            onChange={(e) =>
                                                                setEditUserPlan(
                                                                    e.target
                                                                        .value as any,
                                                                )
                                                            }
                                                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400"
                                                        >
                                                            <option value="nothing">
                                                                Free (Nothing)
                                                            </option>
                                                            <option value="basic">
                                                                Basic
                                                            </option>
                                                            <option value="vip">
                                                                VIP
                                                            </option>
                                                        </select>
                                                    </div>
                                                </div>
                                                {editUserRole === "student" && (
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">
                                                            Lớp
                                                        </label>
                                                        <select
                                                            value={
                                                                editUserGrade
                                                            }
                                                            onChange={(e) =>
                                                                setEditUserGrade(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400"
                                                        >
                                                            <option value="">
                                                                Chọn lớp
                                                            </option>
                                                            <option value="8">
                                                                Lớp 8
                                                            </option>
                                                            <option value="9">
                                                                Lớp 9
                                                            </option>
                                                            <option value="10">
                                                                Lớp 10
                                                            </option>
                                                            <option value="11">
                                                                Lớp 11
                                                            </option>
                                                            <option value="12">
                                                                Lớp 12
                                                            </option>
                                                        </select>
                                                    </div>
                                                )}
                                                <div className="flex justify-end gap-2 pt-3 border-t border-slate-50">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setEditingUser(null)
                                                        }
                                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        Hủy
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-sm"
                                                    >
                                                        Lưu thay đổi
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === "create-quiz" && (
                            <div className="space-y-6">
                                {/* Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-800">
                                            Import Đề Thi
                                        </h2>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Trích xuất câu hỏi trắc nghiệm 3
                                            Phần, hình vẽ đồ thị và công thức
                                            MathType/Math XML từ file Word
                                            (.docx).
                                        </p>
                                    </div>
                                </div>

                                {/* Importer Component directly in workspace */}
                                <WordImporter
                                    onQuestionsParsed={handleQuestionsParsed}
                                />
                            </div>
                        )}
                        {activeTab === "quizzes" && (
                            <div className="space-y-6">
                                {/* Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-800">
                                            Danh Sách Đề Thi
                                        </h2>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Xem danh sách, tìm kiếm, lọc và quản
                                            lý trạng thái công khai/riêng tư các
                                            đề thi hiện có.
                                        </p>
                                    </div>
                                </div>

                                {/* Filter Bar */}
                                <div className="flex flex-col xl:flex-row gap-3 items-center justify-between">
                                    {/* Search */}
                                    <div className="relative w-full xl:w-64">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                                        <input
                                            type="text"
                                            placeholder="Tìm tiêu đề, môn học..."
                                            value={quizSearchQuery}
                                            onChange={(e) => {
                                                setQuizSearchQuery(
                                                    e.target.value,
                                                );
                                                setQuizPage(1);
                                            }}
                                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                                        />
                                    </div>

                                    {/* Filters */}
                                    <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                                        <select
                                            value={quizFilterSubject}
                                            onChange={(e) => {
                                                setQuizFilterSubject(
                                                    e.target.value,
                                                );
                                                setQuizPage(1);
                                            }}
                                            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:border-slate-400 cursor-pointer"
                                        >
                                            <option value="all">
                                                Tất cả môn học
                                            </option>
                                            <option value="Toán Học">
                                                Toán Học
                                            </option>
                                            <option value="Vật Lý">
                                                Vật Lý
                                            </option>
                                            <option value="Hóa Học">
                                                Hóa Học
                                            </option>
                                            <option value="Tiếng Anh">
                                                Tiếng Anh
                                            </option>
                                        </select>

                                        <select
                                            value={quizFilterGrade}
                                            onChange={(e) => {
                                                setQuizFilterGrade(
                                                    e.target.value,
                                                );
                                                setQuizPage(1);
                                            }}
                                            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:border-slate-400 cursor-pointer"
                                        >
                                            <option value="all">
                                                Tất cả khối lớp
                                            </option>
                                            <option value="8">Lớp 8</option>
                                            <option value="9">Lớp 9</option>
                                            <option value="10">Lớp 10</option>
                                            <option value="11">Lớp 11</option>
                                            <option value="12">Lớp 12</option>
                                        </select>

                                        <select
                                            value={quizFilterVisibility}
                                            onChange={(e) => {
                                                setQuizFilterVisibility(
                                                    e.target.value as any,
                                                );
                                                setQuizPage(1);
                                            }}
                                            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:border-slate-400 cursor-pointer"
                                        >
                                            <option value="all">
                                                Tất cả trạng thái
                                            </option>
                                            <option value="public">
                                                Công khai
                                            </option>
                                            <option value="private">
                                                Riêng tư
                                            </option>
                                        </select>

                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[11px] text-slate-450 font-bold whitespace-nowrap">
                                                Sắp xếp:
                                            </span>
                                            <select
                                                value={quizSortBy}
                                                onChange={(e) => {
                                                    setQuizSortBy(
                                                        e.target.value as any,
                                                    );
                                                    setQuizPage(1);
                                                }}
                                                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:border-slate-400 cursor-pointer"
                                            >
                                                <option value="newest">
                                                    Mới đăng trước
                                                </option>
                                                <option value="oldest">
                                                    Cũ đăng trước
                                                </option>
                                                <option value="title">
                                                    Tên A-Z
                                                </option>
                                                <option value="questions">
                                                    Số câu hỏi giảm dần
                                                </option>
                                                <option value="duration">
                                                    Thời gian giảm dần
                                                </option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Quiz List Table */}
                                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/50">
                                                <th className="py-2.5 px-4 w-1/3">
                                                    Tiêu đề đề thi
                                                </th>
                                                <th className="py-2.5 px-4">
                                                    Môn Học
                                                </th>
                                                <th className="py-2.5 px-4 text-center">
                                                    Khối Lớp
                                                </th>
                                                <th className="py-2.5 px-4 text-center">
                                                    Số câu hỏi
                                                </th>
                                                <th className="py-2.5 px-4 text-center">
                                                    Thời gian
                                                </th>
                                                <th className="py-2.5 px-4 text-center">
                                                    Ngày đăng
                                                </th>
                                                <th className="py-2.5 px-4 text-center">
                                                    Hiển thị
                                                </th>
                                                <th className="py-2.5 px-4 text-right">
                                                    Thao tác
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 text-xs text-slate-600">
                                            {paginatedQuizzes.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={8}
                                                        className="py-8 text-center text-slate-450 font-bold"
                                                    >
                                                        Không tìm thấy đề thi
                                                        nào.
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedQuizzes.map((q) => (
                                                    <tr
                                                        key={q.id}
                                                        className="hover:bg-slate-50/40 transition-colors"
                                                    >
                                                        <td className="py-3 px-4 font-bold text-slate-800 max-w-xs truncate">
                                                            {q.title}
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-500 font-semibold">
                                                            {q.subject}
                                                        </td>
                                                        <td className="py-3 px-4 text-center text-slate-500 font-semibold">
                                                            Lớp{" "}
                                                            {q.grade || "10"}
                                                        </td>
                                                        <td className="py-3 px-4 text-center font-bold text-[#3B6D85]">
                                                            {q.questions.length}{" "}
                                                            câu
                                                        </td>
                                                        <td className="py-3 px-4 text-center text-slate-500 font-semibold">
                                                            {q.duration} phút
                                                        </td>
                                                        <td className="py-3 px-4 text-center text-slate-400 font-medium">
                                                            {q.createdAt
                                                                ? (() => {
                                                                      const dateParts =
                                                                          q.createdAt.split(
                                                                              "-",
                                                                          );
                                                                      if (
                                                                          dateParts.length ===
                                                                          3
                                                                      ) {
                                                                          return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                                                                      }
                                                                      return q.createdAt;
                                                                  })()
                                                                : "-"}
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <span
                                                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                                    q.isPublic !==
                                                                    false
                                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                                        : "bg-rose-50 text-rose-700 border-rose-100"
                                                                }`}
                                                            >
                                                                {q.isPublic !==
                                                                false
                                                                    ? "Công khai"
                                                                    : "Riêng tư"}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() =>
                                                                        startEditQuiz(
                                                                            q,
                                                                        )
                                                                    }
                                                                    className="p-1 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded transition-all cursor-pointer"
                                                                    title="Sửa"
                                                                >
                                                                    <Edit className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        if (
                                                                            confirm(
                                                                                `Bạn chắc chắn muốn xóa đề thi: ${q.title}?`,
                                                                            )
                                                                        ) {
                                                                            onDeleteQuiz(
                                                                                q.id,
                                                                            );
                                                                        }
                                                                    }}
                                                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-all cursor-pointer"
                                                                    title="Xóa"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {quizTotalPages > 1 && (
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                        <span className="text-[11px] text-slate-400 font-semibold">
                                            Trang {quizPage} / {quizTotalPages}{" "}
                                            (Tổng số {filteredQuizzes.length} đề
                                            thi)
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                disabled={quizPage === 1}
                                                onClick={() =>
                                                    setQuizPage(
                                                        (prev) => prev - 1,
                                                    )
                                                }
                                                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-colors"
                                            >
                                                <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
                                            </button>
                                            <button
                                                disabled={
                                                    quizPage === quizTotalPages
                                                }
                                                onClick={() =>
                                                    setQuizPage(
                                                        (prev) => prev + 1,
                                                    )
                                                }
                                                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-colors"
                                            >
                                                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === "stats-quizzes" &&
                            (() => {
                                const statsQuizzesData = quizzes.map((quiz) => {
                                    const quizSubmissions = submissions.filter(
                                        (s) => s.quizId === quiz.id,
                                    );
                                    const count = quizSubmissions.length;
                                    const avg =
                                        count > 0
                                            ? Number(
                                                  (
                                                      quizSubmissions.reduce(
                                                          (acc, curr) =>
                                                              acc + curr.score,
                                                          0,
                                                      ) / count
                                                  ).toFixed(1),
                                              )
                                            : 0;

                                    let maxScore = 0;
                                    let maxScorer = "-";
                                    if (count > 0) {
                                        const sortedSubs = [
                                            ...quizSubmissions,
                                        ].sort((a, b) => b.score - a.score);
                                        maxScore = sortedSubs[0].score;
                                        maxScorer = sortedSubs[0].studentName;
                                    }

                                    return {
                                        id: quiz.id,
                                        title: quiz.title,
                                        subject: quiz.subject,
                                        questionsCount: quiz.questions.length,
                                        submissionsCount: count,
                                        avgScore: avg,
                                        highestScore: maxScore,
                                        highestScorerName: maxScorer,
                                    };
                                });

                                const sortedStatsQuizzes = [
                                    ...statsQuizzesData,
                                ].sort((a, b) => {
                                    if (statsQuizSortBy === "submissions") {
                                        return (
                                            b.submissionsCount -
                                            a.submissionsCount
                                        );
                                    } else if (statsQuizSortBy === "avgScore") {
                                        return b.avgScore - a.avgScore;
                                    } else if (
                                        statsQuizSortBy === "highestScore"
                                    ) {
                                        return b.highestScore - a.highestScore;
                                    }
                                    return 0;
                                });

                                return (
                                    <div className="space-y-6">
                                        {/* Header */}
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                                            <div>
                                                <h2 className="text-lg font-bold text-slate-800">
                                                    Thống Kê Đề Thi
                                                </h2>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    Thống kê điểm số trung bình,
                                                    cao nhất và số lượng người
                                                    tham gia từng đề thi.
                                                </p>
                                            </div>
                                            {/* Sort Dropdown */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-slate-500">
                                                    Sắp xếp theo:
                                                </span>
                                                <select
                                                    value={statsQuizSortBy}
                                                    onChange={(e) =>
                                                        setStatsQuizSortBy(
                                                            e.target
                                                                .value as any,
                                                        )
                                                    }
                                                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-400"
                                                >
                                                    <option value="submissions">
                                                        Số lượt làm bài
                                                    </option>
                                                    <option value="avgScore">
                                                        Điểm trung bình
                                                    </option>
                                                    <option value="highestScore">
                                                        Điểm cao nhất
                                                    </option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Visual Chart Card */}
                                        {statsQuizzesData.length > 0 && (
                                            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-3xs space-y-4">
                                                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                                    <BarChart3 className="w-4 h-4 text-brand-600" />
                                                    <span>
                                                        Biểu đồ điểm trung bình
                                                        các đề thi (Top 5)
                                                    </span>
                                                </h3>
                                                <div className="space-y-3 pt-2">
                                                    {statsQuizzesData
                                                        .slice(0, 5)
                                                        .map((qData) => {
                                                            const percentage =
                                                                (qData.avgScore /
                                                                    10) *
                                                                100;
                                                            return (
                                                                <div
                                                                    key={
                                                                        qData.id
                                                                    }
                                                                    className="space-y-1"
                                                                >
                                                                    <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600">
                                                                        <span className="truncate max-w-[200px] sm:max-w-xs">
                                                                            {
                                                                                qData.title
                                                                            }
                                                                        </span>
                                                                        <span>
                                                                            {
                                                                                qData.avgScore
                                                                            }{" "}
                                                                            / 10
                                                                            (
                                                                            {
                                                                                qData.submissionsCount
                                                                            }{" "}
                                                                            lượt)
                                                                        </span>
                                                                    </div>
                                                                    <div className="h-4 bg-slate-50 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800">
                                                                        <div
                                                                            className="h-full bg-brand-350 dark:bg-brand-500 rounded-lg transition-all duration-500 flex items-center px-2"
                                                                            style={{
                                                                                width: `${Math.max(percentage, 5)}%`,
                                                                            }}
                                                                        >
                                                                            <span className="text-[9px] font-extrabold text-white">
                                                                                {percentage.toFixed(
                                                                                    0,
                                                                                )}

                                                                                %
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Table of Quizzes */}
                                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-3xs">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse text-xs">
                                                    <thead>
                                                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 font-bold uppercase tracking-wider">
                                                            <th className="p-4">
                                                                Đề thi
                                                            </th>
                                                            <th className="p-4">
                                                                Môn học
                                                            </th>
                                                            <th className="p-4 text-center">
                                                                Số câu hỏi
                                                            </th>
                                                            <th className="p-4 text-center">
                                                                Lượt làm
                                                            </th>
                                                            <th className="p-4 text-center">
                                                                Điểm TB
                                                            </th>
                                                            <th className="p-4 text-center">
                                                                Điểm cao nhất
                                                            </th>
                                                            <th className="p-4">
                                                                Người cao nhất
                                                            </th>
                                                            <th className="p-4 text-center">
                                                                Hành động
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                                        {sortedStatsQuizzes.map(
                                                            (quizData) => (
                                                                <tr
                                                                    key={
                                                                        quizData.id
                                                                    }
                                                                    className="hover:bg-slate-50/50"
                                                                >
                                                                    <td className="p-4 font-bold text-slate-900">
                                                                        {
                                                                            quizData.title
                                                                        }
                                                                    </td>
                                                                    <td className="p-4">
                                                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px]">
                                                                            {
                                                                                quizData.subject
                                                                            }
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-4 text-center">
                                                                        {
                                                                            quizData.questionsCount
                                                                        }
                                                                    </td>
                                                                    <td className="p-4 text-center">
                                                                        {
                                                                            quizData.submissionsCount
                                                                        }
                                                                    </td>
                                                                    <td className="p-4 text-center">
                                                                        <span
                                                                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                                quizData.avgScore >=
                                                                                8
                                                                                    ? "bg-emerald-50 text-emerald-700"
                                                                                    : quizData.avgScore >=
                                                                                        5
                                                                                      ? "bg-amber-50 text-amber-700"
                                                                                      : quizData.submissionsCount >
                                                                                          0
                                                                                        ? "bg-rose-50 text-rose-700"
                                                                                        : "bg-slate-50 text-slate-400"
                                                                            }`}
                                                                        >
                                                                            {quizData.avgScore >
                                                                            0
                                                                                ? quizData.avgScore
                                                                                : "-"}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-4 text-center font-bold text-slate-900">
                                                                        {quizData.submissionsCount >
                                                                        0
                                                                            ? quizData.highestScore
                                                                            : "-"}
                                                                    </td>
                                                                    <td className="p-4 text-slate-600 font-medium">
                                                                        {quizData.submissionsCount >
                                                                        0
                                                                            ? quizData.highestScorerName
                                                                            : "-"}
                                                                    </td>
                                                                    <td className="p-4 text-center">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const originalQuiz =
                                                                                    quizzes.find(
                                                                                        (
                                                                                            q,
                                                                                        ) =>
                                                                                            q.id ===
                                                                                            quizData.id,
                                                                                    );
                                                                                if (
                                                                                    originalQuiz
                                                                                ) {
                                                                                    setSelectedQuizForDetails(
                                                                                        originalQuiz,
                                                                                    );
                                                                                }
                                                                            }}
                                                                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-semibold transition-all active:scale-[0.98] cursor-pointer"
                                                                        >
                                                                            Chi
                                                                            tiết
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        )}
                                                        {sortedStatsQuizzes.length ===
                                                            0 && (
                                                            <tr>
                                                                <td
                                                                    colSpan={8}
                                                                    className="p-8 text-center text-slate-400 italic"
                                                                >
                                                                    Không có dữ
                                                                    liệu đề thi
                                                                    tương ứng.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {selectedQuizForDetails && (
                                            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-45 p-4 select-none">
                                                <div className="bg-white rounded-xl w-full max-w-3xl flex flex-col max-h-[85vh] shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
                                                    {/* Modal Header */}
                                                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
                                                        <div>
                                                            <span className="text-[10px] font-extrabold text-[#3B6D85] bg-[#3B6D85]/10 px-2 py-0.5 rounded uppercase tracking-wider">
                                                                Danh sách học
                                                                sinh làm bài
                                                            </span>
                                                            <h3 className="text-sm font-bold text-slate-800 mt-1.5">
                                                                {
                                                                    selectedQuizForDetails.title
                                                                }
                                                            </h3>
                                                        </div>
                                                        <button
                                                            onClick={() =>
                                                                setSelectedQuizForDetails(
                                                                    null,
                                                                )
                                                            }
                                                            className="p-1.5 hover:bg-slate-105 text-slate-400 hover:text-slate-600 rounded-lg transition-all cursor-pointer"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </div>

                                                    {/* Modal Content */}
                                                    <div className="p-6 overflow-y-auto min-h-0 flex-1">
                                                        {(() => {
                                                            const quizSubs =
                                                                submissions
                                                                    .filter(
                                                                        (s) =>
                                                                            s.quizId ===
                                                                            selectedQuizForDetails.id,
                                                                    )
                                                                    .sort(
                                                                        (
                                                                            a,
                                                                            b,
                                                                        ) =>
                                                                            b.score -
                                                                            a.score,
                                                                    );

                                                            if (
                                                                quizSubs.length ===
                                                                0
                                                            ) {
                                                                return (
                                                                    <div className="text-center py-12 text-slate-400 italic">
                                                                        Chưa có
                                                                        học sinh
                                                                        nào thực
                                                                        hiện bài
                                                                        thi này.
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <div className="border border-slate-150 rounded-xl overflow-hidden">
                                                                    <div className="overflow-x-auto">
                                                                        <table className="w-full text-left border-collapse text-xs">
                                                                            <thead>
                                                                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 font-bold uppercase tracking-wider">
                                                                                    <th className="p-3.5 text-center w-12">
                                                                                        Hạng
                                                                                    </th>
                                                                                    <th className="p-3.5">
                                                                                        Học
                                                                                        sinh
                                                                                    </th>
                                                                                    <th className="p-3.5 text-center">
                                                                                        Điểm
                                                                                        số
                                                                                    </th>
                                                                                    <th className="p-3.5 text-center">
                                                                                        Thời
                                                                                        gian
                                                                                        làm
                                                                                    </th>
                                                                                    <th className="p-3.5">
                                                                                        Thời
                                                                                        điểm
                                                                                        nộp
                                                                                    </th>
                                                                                    <th className="p-3.5 text-center">
                                                                                        Hành
                                                                                        động
                                                                                    </th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                                                                {quizSubs.map(
                                                                                    (
                                                                                        sub,
                                                                                        index,
                                                                                    ) => {
                                                                                        let scoreColor =
                                                                                            "bg-rose-50 text-rose-700 border border-rose-200";
                                                                                        if (
                                                                                            sub.score >=
                                                                                            8
                                                                                        ) {
                                                                                            scoreColor =
                                                                                                "bg-emerald-50 text-emerald-700 border border-emerald-200";
                                                                                        } else if (
                                                                                            sub.score >=
                                                                                            5
                                                                                        ) {
                                                                                            scoreColor =
                                                                                                "bg-amber-50 text-amber-700 border border-amber-200";
                                                                                        }

                                                                                        return (
                                                                                            <tr
                                                                                                key={
                                                                                                    sub.id
                                                                                                }
                                                                                                className="hover:bg-slate-50/50"
                                                                                            >
                                                                                                <td className="p-3.5 text-center font-extrabold text-slate-450">
                                                                                                    #
                                                                                                    {index +
                                                                                                        1}
                                                                                                </td>
                                                                                                <td className="p-3.5">
                                                                                                    <div className="font-bold text-slate-800">
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
                                                                                                <td className="p-3.5 text-center">
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
                                                                                                <td className="p-3.5 text-center text-slate-500">
                                                                                                    {sub.timeSpent !==
                                                                                                    undefined
                                                                                                        ? formatTime(
                                                                                                              sub.timeSpent,
                                                                                                          )
                                                                                                        : "-"}
                                                                                                </td>
                                                                                                <td className="p-3.5 text-slate-500 font-medium">
                                                                                                    {
                                                                                                        sub.submittedAt
                                                                                                    }
                                                                                                </td>
                                                                                                <td className="p-3.5 text-center">
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() =>
                                                                                                            setAdminReviewSubmission(
                                                                                                                sub,
                                                                                                            )
                                                                                                        }
                                                                                                        className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded text-[10px] font-bold transition-all active:scale-[0.98] cursor-pointer"
                                                                                                    >
                                                                                                        Xem
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
                                                    <div className="px-6 py-4 border-t border-slate-100 flex justify-end flex-shrink-0">
                                                        <button
                                                            onClick={() =>
                                                                setSelectedQuizForDetails(
                                                                    null,
                                                                )
                                                            }
                                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-all active:scale-[0.98] cursor-pointer"
                                                        >
                                                            Đóng
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                        {activeTab === "stats-students" && (
                            <div className="space-y-6">
                                {adminReviewSubmission ? (
                                    <div className="space-y-6">
                                        {(() => {
                                            const quiz = quizzes.find(
                                                (q) =>
                                                    q.id ===
                                                    adminReviewSubmission.quizId,
                                            );

                                            // Determine number of correct questions
                                            const correctAnswersCount = quiz
                                                ? quiz.questions.filter((q) => {
                                                      const chosen =
                                                          adminReviewSubmission
                                                              .answers[q.id];
                                                      if (
                                                          !q.type ||
                                                          q.type ===
                                                              "single_choice"
                                                      ) {
                                                          return (
                                                              chosen !==
                                                                  undefined &&
                                                              chosen ===
                                                                  q.correctAnswerIndex
                                                          );
                                                      } else if (
                                                          q.type ===
                                                          "true_false"
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
                                                          return q.options.every(
                                                              (_, oIdx) =>
                                                                  studentTf[
                                                                      oIdx
                                                                  ] ===
                                                                  correctTf[
                                                                      oIdx
                                                                  ],
                                                          );
                                                      } else if (
                                                          q.type ===
                                                          "short_answer"
                                                      ) {
                                                          return (
                                                              String(
                                                                  chosen || "",
                                                              )
                                                                  .trim()
                                                                  .toLowerCase() ===
                                                              String(
                                                                  q.shortAnswerKey ||
                                                                      "",
                                                              )
                                                                  .trim()
                                                                  .toLowerCase()
                                                          );
                                                      }
                                                      return false;
                                                  }).length
                                                : 0;

                                            if (!quiz) {
                                                return (
                                                    <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-gray-400 italic">
                                                        Không tìm thấy dữ liệu
                                                        đề thi tương ứng.
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="max-w-4xl mx-auto space-y-6">
                                                    {/* Header */}
                                                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] font-bold bg-[#3B6D85]/10 text-[#3B6D85] px-2 py-0.5 rounded uppercase tracking-wider">
                                                                    Xem bài làm
                                                                    học sinh
                                                                </span>
                                                                <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase">
                                                                    {
                                                                        adminReviewSubmission.studentName
                                                                    }
                                                                </span>
                                                            </div>
                                                            <h2 className="text-sm font-bold text-slate-900 mt-2">
                                                                {
                                                                    adminReviewSubmission.quizTitle
                                                                }
                                                            </h2>
                                                            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                                Nộp bài lúc:{" "}
                                                                {
                                                                    adminReviewSubmission.submittedAt
                                                                }
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-6 self-stretch md:self-auto justify-between border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex flex-col items-center justify-center bg-brand-50 text-[#3B6D85] w-14 h-14 rounded-full border border-brand-200 shadow-2xs">
                                                                    <span className="text-base font-extrabold leading-none">
                                                                        {
                                                                            adminReviewSubmission.score
                                                                        }
                                                                    </span>
                                                                    <span className="text-[7px] font-bold text-slate-400 mt-0.5">
                                                                        ĐIỂM
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs">
                                                                    <div className="font-bold text-slate-800">
                                                                        Kết quả
                                                                        làm bài
                                                                    </div>
                                                                    <div className="text-slate-500 text-[11px] mt-0.5">
                                                                        {
                                                                            correctAnswersCount
                                                                        }{" "}
                                                                        /{" "}
                                                                        {
                                                                            quiz
                                                                                .questions
                                                                                .length
                                                                        }{" "}
                                                                        câu đúng
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setAdminReviewSubmission(
                                                                        null,
                                                                    )
                                                                }
                                                                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-all shadow-3xs cursor-pointer active:scale-95 flex items-center gap-1 flex-shrink-0"
                                                            >
                                                                <ChevronLeft className="w-4 h-4" />
                                                                <span>
                                                                    Quay lại
                                                                </span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Question Reviews */}
                                                    <div className="space-y-6">
                                                        {quiz.questions.map(
                                                            (q, qIndex) => {
                                                                const chosen =
                                                                    adminReviewSubmission
                                                                        .answers[
                                                                        q.id
                                                                    ];

                                                                // Determine grading accuracy
                                                                let isQCorrect = false;
                                                                let isQPartial = false;
                                                                let tfStatusList: {
                                                                    text: string;
                                                                    correct: boolean;
                                                                    studentVal:
                                                                        | boolean
                                                                        | null;
                                                                    correctVal: boolean;
                                                                }[] = [];

                                                                if (
                                                                    !q.type ||
                                                                    q.type ===
                                                                        "single_choice"
                                                                ) {
                                                                    isQCorrect =
                                                                        chosen !==
                                                                            undefined &&
                                                                        chosen ===
                                                                            q.correctAnswerIndex;
                                                                } else if (
                                                                    q.type ===
                                                                    "true_false"
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

                                                                    let matchCount = 0;
                                                                    tfStatusList =
                                                                        q.options.map(
                                                                            (
                                                                                opt,
                                                                                oIdx,
                                                                            ) => {
                                                                                const sVal =
                                                                                    studentTf[
                                                                                        oIdx
                                                                                    ];
                                                                                const cVal =
                                                                                    correctTf[
                                                                                        oIdx
                                                                                    ];
                                                                                const match =
                                                                                    sVal ===
                                                                                    cVal;
                                                                                if (
                                                                                    match
                                                                                )
                                                                                    matchCount++;
                                                                                return {
                                                                                    text: opt,
                                                                                    correct:
                                                                                        match,
                                                                                    studentVal:
                                                                                        sVal,
                                                                                    correctVal:
                                                                                        cVal,
                                                                                };
                                                                            },
                                                                        );

                                                                    isQCorrect =
                                                                        matchCount ===
                                                                        4;
                                                                    isQPartial =
                                                                        matchCount >
                                                                            0 &&
                                                                        matchCount <
                                                                            4;
                                                                } else if (
                                                                    q.type ===
                                                                    "short_answer"
                                                                ) {
                                                                    const cKey =
                                                                        (
                                                                            q.shortAnswerKey ||
                                                                            ""
                                                                        )
                                                                            .trim()
                                                                            .toLowerCase();
                                                                    const sKey =
                                                                        String(
                                                                            chosen ||
                                                                                "",
                                                                        )
                                                                            .trim()
                                                                            .toLowerCase();
                                                                    isQCorrect =
                                                                        cKey &&
                                                                        sKey ===
                                                                            cKey;
                                                                }

                                                                // Determine card border accent style
                                                                let cardAccentClass =
                                                                    "border-l-4 border-l-rose-500";
                                                                let statusBadgeClass =
                                                                    "bg-rose-50 text-rose-700 border-rose-200";
                                                                let statusText =
                                                                    "Sai";

                                                                if (
                                                                    isQCorrect
                                                                ) {
                                                                    cardAccentClass =
                                                                        "border-l-4 border-l-emerald-500";
                                                                    statusBadgeClass =
                                                                        "bg-emerald-50 text-emerald-700 border-emerald-200";
                                                                    statusText =
                                                                        "Đúng";
                                                                } else if (
                                                                    isQPartial
                                                                ) {
                                                                    cardAccentClass =
                                                                        "border-l-4 border-l-amber-500";
                                                                    statusBadgeClass =
                                                                        "bg-amber-50 text-amber-700 border-amber-200";
                                                                    statusText =
                                                                        "Đúng một phần";
                                                                }

                                                                const displayQuestionText =
                                                                    q.type ===
                                                                    "true_false"
                                                                        ? cleanTrueFalseQuestionText(
                                                                              q.text,
                                                                          )
                                                                        : q.text;

                                                                return (
                                                                    <div
                                                                        key={
                                                                            q.id
                                                                        }
                                                                        className={`bg-white border-y border-r border-slate-200 ${cardAccentClass} rounded-xl p-5 space-y-4 shadow-3xs`}
                                                                    >
                                                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-[10px] font-extrabold text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                                                                                    Câu{" "}
                                                                                    {qIndex +
                                                                                        1}
                                                                                </span>
                                                                                <span
                                                                                    className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                                                                                        q.type ===
                                                                                        "true_false"
                                                                                            ? "bg-amber-50 text-amber-800 border-amber-250"
                                                                                            : q.type ===
                                                                                                "short_answer"
                                                                                              ? "bg-purple-50 text-purple-800 border-purple-250"
                                                                                              : "bg-sky-50 text-sky-800 border-sky-250"
                                                                                    }`}
                                                                                >
                                                                                    {q.type ===
                                                                                    "true_false"
                                                                                        ? "Đúng / Sai"
                                                                                        : q.type ===
                                                                                            "short_answer"
                                                                                          ? "Điền đáp án"
                                                                                          : "Trắc nghiệm"}
                                                                                </span>
                                                                            </div>
                                                                            <span
                                                                                className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${statusBadgeClass}`}
                                                                            >
                                                                                {
                                                                                    statusText
                                                                                }
                                                                            </span>
                                                                        </div>

                                                                        <div
                                                                            className="text-[13px] font-semibold text-slate-800 leading-relaxed overflow-x-auto [&_img]:mx-auto [&_img]:block [&_img]:my-4"
                                                                            dangerouslySetInnerHTML={{
                                                                                __html: renderMathHtml(
                                                                                    displayQuestionText,
                                                                                ),
                                                                            }}
                                                                        />

                                                                        {/* Options rendering */}
                                                                        {(!q.type ||
                                                                            q.type ===
                                                                                "single_choice") && (
                                                                            <div className="space-y-2.5">
                                                                                {q.options.map(
                                                                                    (
                                                                                        opt,
                                                                                        oIdx,
                                                                                    ) => {
                                                                                        const isChosen =
                                                                                            chosen ===
                                                                                            oIdx;
                                                                                        const isCorrectOpt =
                                                                                            q.correctAnswerIndex ===
                                                                                            oIdx;
                                                                                        const cleanedOpt =
                                                                                            opt.replace(
                                                                                                /^\s*[a-f][\)\.\:\-]\s*/i,
                                                                                                "",
                                                                                            );

                                                                                        let cardStyle =
                                                                                            "border-slate-200 text-slate-700";
                                                                                        let badge =
                                                                                            null;

                                                                                        if (
                                                                                            isCorrectOpt
                                                                                        ) {
                                                                                            cardStyle =
                                                                                                "border-emerald-300 bg-emerald-50/20 text-emerald-800";
                                                                                            badge =
                                                                                                (
                                                                                                    <span className="text-[9px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded ml-auto">
                                                                                                        Đáp
                                                                                                        án
                                                                                                        đúng
                                                                                                    </span>
                                                                                                );
                                                                                        } else if (
                                                                                            isChosen &&
                                                                                            !isCorrectOpt
                                                                                        ) {
                                                                                            cardStyle =
                                                                                                "border-rose-300 bg-rose-50/20 text-rose-800";
                                                                                            badge =
                                                                                                (
                                                                                                    <span className="text-[9px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded ml-auto">
                                                                                                        Lựa
                                                                                                        chọn
                                                                                                        của
                                                                                                        bạn
                                                                                                    </span>
                                                                                                );
                                                                                        } else if (
                                                                                            isChosen
                                                                                        ) {
                                                                                            badge =
                                                                                                (
                                                                                                    <span className="text-[9px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded ml-auto">
                                                                                                        Lựa
                                                                                                        chọn
                                                                                                        của
                                                                                                        bạn
                                                                                                    </span>
                                                                                                );
                                                                                        }

                                                                                        return (
                                                                                            <div
                                                                                                key={
                                                                                                    oIdx
                                                                                                }
                                                                                                className={`flex items-center gap-3 p-3 border rounded-lg text-xs font-medium ${cardStyle}`}
                                                                                            >
                                                                                                <span
                                                                                                    className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                                                                                                        isCorrectOpt
                                                                                                            ? "bg-emerald-500 text-white"
                                                                                                            : isChosen
                                                                                                              ? "bg-rose-50 text-white"
                                                                                                              : "bg-slate-100 text-slate-500"
                                                                                                    }`}
                                                                                                >
                                                                                                    {String.fromCharCode(
                                                                                                        65 +
                                                                                                            oIdx,
                                                                                                    )}
                                                                                                </span>
                                                                                                <span
                                                                                                    className="[&_img]:mx-auto [&_img]:block [&_img]:my-2"
                                                                                                    dangerouslySetInnerHTML={{
                                                                                                        __html: renderMathHtml(
                                                                                                            cleanedOpt,
                                                                                                        ),
                                                                                                    }}
                                                                                                />
                                                                                                {
                                                                                                    badge
                                                                                                }
                                                                                            </div>
                                                                                        );
                                                                                    },
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {q.type ===
                                                                            "true_false" && (
                                                                            <div className="space-y-2.5">
                                                                                {tfStatusList.map(
                                                                                    (
                                                                                        item,
                                                                                        oIdx,
                                                                                    ) => {
                                                                                        const sText =
                                                                                            item.studentVal ===
                                                                                            null
                                                                                                ? "Chưa chọn"
                                                                                                : item.studentVal
                                                                                                  ? "Đúng"
                                                                                                  : "Sai";
                                                                                        const cText =
                                                                                            item.correctVal
                                                                                                ? "Đúng"
                                                                                                : "Sai";
                                                                                        const cleanedOpt =
                                                                                            item.text.replace(
                                                                                                /^\s*[a-f][\)\.\:\-]\s*/i,
                                                                                                "",
                                                                                            );

                                                                                        return (
                                                                                            <div
                                                                                                key={
                                                                                                    oIdx
                                                                                                }
                                                                                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-150 rounded-lg text-xs"
                                                                                            >
                                                                                                <div className="font-medium text-slate-800 flex gap-2 [&_img]:mx-auto [&_img]:block [&_img]:my-2">
                                                                                                    <span className="font-extrabold text-slate-500">
                                                                                                        {String.fromCharCode(
                                                                                                            97 +
                                                                                                                oIdx,
                                                                                                        )}

                                                                                                        )
                                                                                                    </span>
                                                                                                    <span
                                                                                                        dangerouslySetInnerHTML={{
                                                                                                            __html: renderMathHtml(
                                                                                                                cleanedOpt,
                                                                                                            ),
                                                                                                        }}
                                                                                                    />
                                                                                                </div>
                                                                                                <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                                                                                                    <span
                                                                                                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                                                                                            item.studentVal ===
                                                                                                            null
                                                                                                                ? "bg-slate-200 text-slate-600 border border-slate-300"
                                                                                                                : item.correct
                                                                                                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-255"
                                                                                                                  : "bg-rose-100 text-rose-800 border border-rose-255"
                                                                                                        }`}
                                                                                                    >
                                                                                                        Bạn
                                                                                                        chọn:{" "}
                                                                                                        {
                                                                                                            sText
                                                                                                        }
                                                                                                    </span>
                                                                                                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-255">
                                                                                                        Đáp
                                                                                                        án:{" "}
                                                                                                        {
                                                                                                            cText
                                                                                                        }
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    },
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {q.type ===
                                                                            "short_answer" && (
                                                                            <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-lg flex flex-wrap gap-4 text-xs font-semibold">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-slate-500">
                                                                                        Đáp
                                                                                        án
                                                                                        của
                                                                                        bạn:
                                                                                    </span>
                                                                                    <span
                                                                                        className={`px-2.5 py-0.5 rounded font-extrabold ${
                                                                                            isQCorrect
                                                                                                ? "bg-emerald-100 text-emerald-800 border border-emerald-255"
                                                                                                : "bg-rose-100 text-rose-800 border border-rose-255"
                                                                                        }`}
                                                                                    >
                                                                                        {chosen !==
                                                                                            undefined &&
                                                                                        chosen !==
                                                                                            ""
                                                                                            ? String(
                                                                                                  chosen,
                                                                                              )
                                                                                            : "(Để trống)"}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                                                                                    <span className="text-slate-500">
                                                                                        Đáp
                                                                                        án
                                                                                        đúng:
                                                                                    </span>
                                                                                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-255 px-2.5 py-0.5 rounded font-extrabold">
                                                                                        {
                                                                                            q.shortAnswerKey
                                                                                        }
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {q.explanation && (
                                                                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs space-y-2 mt-4">
                                                                                <div className="flex items-center gap-1.5 text-[#3B6D85] font-extrabold">
                                                                                    <BookOpen className="w-4 h-4 text-[#3B6D85]" />
                                                                                    <span>
                                                                                        Lời
                                                                                        giải
                                                                                        chi
                                                                                        tiết:
                                                                                    </span>
                                                                                </div>
                                                                                <div
                                                                                    className="text-slate-700 overflow-x-auto leading-relaxed pl-5 border-l-2 border-[#3B6D85]/30 [&_img]:mx-auto [&_img]:block [&_img]:my-4"
                                                                                    dangerouslySetInnerHTML={{
                                                                                        __html: renderMathHtml(
                                                                                            q.explanation,
                                                                                        ),
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Header */}
                                        <div className="pb-4 border-b border-slate-100">
                                            <h2 className="text-lg font-bold text-slate-800">
                                                Thống Kê Học Sinh
                                            </h2>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                Quan sát lịch sử thi thử, điểm
                                                số và thời gian làm bài của từng
                                                học sinh.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                            {/* Left Column: List of Students */}
                                            <div className="md:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-3xs h-[calc(100vh-220px)] flex flex-col min-h-0">
                                                <div className="relative">
                                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                                    <input
                                                        type="text"
                                                        placeholder="Tìm học sinh..."
                                                        value={
                                                            statsStudentQuery
                                                        }
                                                        onChange={(e) =>
                                                            setStatsStudentQuery(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-400 focus:bg-white"
                                                    />
                                                </div>

                                                {/* Student list container */}
                                                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0 mt-3">
                                                    {(() => {
                                                        const studentsList =
                                                            userProfiles.filter(
                                                                (u) =>
                                                                    u.role ===
                                                                        "student" &&
                                                                    (u.name
                                                                        .toLowerCase()
                                                                        .includes(
                                                                            statsStudentQuery.toLowerCase(),
                                                                        ) ||
                                                                        u.username
                                                                            .toLowerCase()
                                                                            .includes(
                                                                                statsStudentQuery.toLowerCase(),
                                                                            )),
                                                            );

                                                        if (
                                                            studentsList.length ===
                                                            0
                                                        ) {
                                                            return (
                                                                <p className="text-xs text-slate-400 italic text-center py-6">
                                                                    Không tìm
                                                                    thấy học
                                                                    sinh nào.
                                                                </p>
                                                            );
                                                        }

                                                        return studentsList.map(
                                                            (student) => {
                                                                const isSelected =
                                                                    selectedStatsStudentId ===
                                                                    student.id;
                                                                const studentSubs =
                                                                    submissions.filter(
                                                                        (s) =>
                                                                            s.studentId ===
                                                                            student.id,
                                                                    );

                                                                return (
                                                                    <button
                                                                        key={
                                                                            student.id
                                                                        }
                                                                        onClick={() =>
                                                                            setSelectedStatsStudentId(
                                                                                student.id,
                                                                            )
                                                                        }
                                                                        className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex items-center gap-3 ${
                                                                            isSelected
                                                                                ? "bg-slate-900 border-slate-900 text-white"
                                                                                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                                                                        }`}
                                                                    >
                                                                        <div
                                                                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                                                                isSelected
                                                                                    ? "bg-slate-800 text-white border border-slate-700"
                                                                                    : "bg-brand-50 text-brand-600"
                                                                            }`}
                                                                        >
                                                                            {student.name
                                                                                ? student.name
                                                                                      .charAt(
                                                                                          0,
                                                                                      )
                                                                                      .toUpperCase()
                                                                                : "U"}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div
                                                                                className={`text-xs font-bold truncate ${isSelected ? "text-white" : "text-slate-800"}`}
                                                                            >
                                                                                {
                                                                                    student.name
                                                                                }
                                                                            </div>
                                                                            <div
                                                                                className={`text-[10px] truncate ${isSelected ? "text-slate-400" : "text-slate-400"}`}
                                                                            >
                                                                                @
                                                                                {
                                                                                    student.username
                                                                                }{" "}
                                                                                •{" "}
                                                                                {
                                                                                    studentSubs.length
                                                                                }{" "}
                                                                                bài
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                );
                                                            },
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Right Column: Detailed student analytics */}
                                            <div className="md:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-3xs h-[calc(100vh-220px)] overflow-y-auto">
                                                {(() => {
                                                    if (
                                                        !selectedStatsStudentId
                                                    ) {
                                                        return (
                                                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 italic space-y-2 py-12">
                                                                <Users className="w-8 h-8 text-slate-300" />
                                                                <p className="text-xs">
                                                                    Hãy chọn một
                                                                    học sinh từ
                                                                    danh sách
                                                                    bên trái để
                                                                    quan sát kết
                                                                    quả chi
                                                                    tiết.
                                                                </p>
                                                            </div>
                                                        );
                                                    }

                                                    const student =
                                                        userProfiles.find(
                                                            (u) =>
                                                                u.id ===
                                                                selectedStatsStudentId,
                                                        );
                                                    if (!student) {
                                                        return (
                                                            <p className="text-xs text-slate-400 italic">
                                                                Không tìm thấy
                                                                thông tin học
                                                                sinh.
                                                            </p>
                                                        );
                                                    }

                                                    const studentSubs =
                                                        submissions
                                                            .filter(
                                                                (s) =>
                                                                    s.studentId ===
                                                                    student.id,
                                                            )
                                                            .sort(
                                                                (a, b) =>
                                                                    new Date(
                                                                        b.submittedAt,
                                                                    ).getTime() -
                                                                    new Date(
                                                                        a.submittedAt,
                                                                    ).getTime(),
                                                            );

                                                    const completedCount =
                                                        studentSubs.length;
                                                    const avgScore =
                                                        completedCount > 0
                                                            ? (
                                                                  studentSubs.reduce(
                                                                      (
                                                                          acc,
                                                                          curr,
                                                                      ) =>
                                                                          acc +
                                                                          curr.score,
                                                                      0,
                                                                  ) /
                                                                  completedCount
                                                              ).toFixed(1)
                                                            : "0.0";

                                                    return (
                                                        <div className="space-y-6">
                                                            {/* Student Header */}
                                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 border border-slate-100 rounded-xl">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-base">
                                                                        {student.name
                                                                            .charAt(
                                                                                0,
                                                                            )
                                                                            .toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <h3 className="text-sm font-bold text-slate-900">
                                                                            {
                                                                                student.name
                                                                            }
                                                                        </h3>
                                                                        <p className="text-[11px] text-slate-455">
                                                                            Tài
                                                                            khoản:
                                                                            @
                                                                            {
                                                                                student.username
                                                                            }
                                                                        </p>
                                                                        {student.plan && (
                                                                            <span
                                                                                className={`inline-block text-[8px] font-bold px-1.5 py-0.5 rounded mt-1 border uppercase tracking-wider ${
                                                                                    student.plan ===
                                                                                    "vip"
                                                                                        ? "bg-amber-100 text-amber-800 border-amber-200"
                                                                                        : student.plan ===
                                                                                            "basic"
                                                                                          ? "bg-sky-100 text-sky-800 border-sky-200"
                                                                                          : "bg-slate-100 text-slate-600 border-slate-200"
                                                                                }`}
                                                                            >
                                                                                {
                                                                                    student.plan
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-4">
                                                                    <div className="text-center bg-white border border-slate-100 p-2.5 rounded-lg min-w-[70px] shadow-3xs">
                                                                        <span className="text-[10px] text-slate-400 font-bold block uppercase">
                                                                            Lượt
                                                                            làm
                                                                        </span>
                                                                        <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                                                                            {
                                                                                completedCount
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-center bg-white border border-slate-100 p-2.5 rounded-lg min-w-[70px] shadow-3xs">
                                                                        <span className="text-[10px] text-slate-400 font-bold block uppercase">
                                                                            Điểm
                                                                            TB
                                                                        </span>
                                                                        <span className="text-sm font-extrabold text-[#3B6D85] mt-0.5 block">
                                                                            {
                                                                                avgScore
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Practice Heatmap & Chart Side-by-Side */}
                                                            {completedCount >
                                                                0 && (
                                                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2 pb-6 border-b border-slate-150">
                                                                    {/* Left Column: Biểu đồ tiến trình điểm số */}
                                                                    <div className="lg:col-span-7 space-y-3">
                                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-150">
                                                                            Biểu
                                                                            đồ
                                                                            tiến
                                                                            trình
                                                                            điểm
                                                                            số
                                                                        </h4>
                                                                        <div className="h-[140px] w-full relative pt-2">
                                                                            {(() => {
                                                                                const chartPointsData =
                                                                                    [
                                                                                        ...studentSubs,
                                                                                    ]
                                                                                        .reverse()
                                                                                        .slice(
                                                                                            -7,
                                                                                        )
                                                                                        .map(
                                                                                            (
                                                                                                sub,
                                                                                                i,
                                                                                            ) => ({
                                                                                                day: `Lượt ${i + 1}`,
                                                                                                score: Number(
                                                                                                    sub.score,
                                                                                                ),
                                                                                                quizTitle:
                                                                                                    sub.quizTitle,
                                                                                                submittedAt:
                                                                                                    sub.submittedAt,
                                                                                            }),
                                                                                        );

                                                                                const width = 400;
                                                                                const height = 100;
                                                                                const maxVal = 10;
                                                                                const paddingLeft = 12;
                                                                                const paddingRight = 12;
                                                                                const paddingTop = 16;
                                                                                const paddingBottom = 12;

                                                                                const points =
                                                                                    chartPointsData.map(
                                                                                        (
                                                                                            p,
                                                                                            i,
                                                                                        ) => {
                                                                                            const x =
                                                                                                paddingLeft +
                                                                                                (i *
                                                                                                    (width -
                                                                                                        paddingLeft -
                                                                                                        paddingRight)) /
                                                                                                    Math.max(
                                                                                                        chartPointsData.length -
                                                                                                            1,
                                                                                                        1,
                                                                                                    );
                                                                                            const y =
                                                                                                paddingTop +
                                                                                                ((maxVal -
                                                                                                    p.score) *
                                                                                                    (height -
                                                                                                        paddingTop -
                                                                                                        paddingBottom)) /
                                                                                                    maxVal;
                                                                                            return {
                                                                                                x,
                                                                                                y,
                                                                                                score: p.score,
                                                                                            };
                                                                                        },
                                                                                    );

                                                                                let pathD =
                                                                                    "";
                                                                                let areaD =
                                                                                    "";

                                                                                if (
                                                                                    points.length >
                                                                                    0
                                                                                ) {
                                                                                    if (
                                                                                        points.length ===
                                                                                        1
                                                                                    ) {
                                                                                        pathD = `M ${points[0].x} ${points[0].y}`;
                                                                                        areaD = `M ${points[0].x} ${points[0].y} L ${points[0].x} ${height - paddingBottom} Z`;
                                                                                    } else if (
                                                                                        points.length ===
                                                                                        2
                                                                                    ) {
                                                                                        pathD = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
                                                                                        areaD = `${pathD} L ${points[1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
                                                                                    } else {
                                                                                        pathD = `M ${points[0].x} ${points[0].y}`;
                                                                                        for (
                                                                                            let i = 0;
                                                                                            i <
                                                                                            points.length -
                                                                                                1;
                                                                                            i++
                                                                                        ) {
                                                                                            const curr =
                                                                                                points[
                                                                                                    i
                                                                                                ];
                                                                                            const next =
                                                                                                points[
                                                                                                    i +
                                                                                                        1
                                                                                                ];
                                                                                            const cpX1 =
                                                                                                curr.x +
                                                                                                (next.x -
                                                                                                    curr.x) /
                                                                                                    3;
                                                                                            const cpY1 =
                                                                                                curr.y;
                                                                                            const cpX2 =
                                                                                                curr.x +
                                                                                                (2 *
                                                                                                    (next.x -
                                                                                                        curr.x)) /
                                                                                                    3;
                                                                                            const cpY2 =
                                                                                                next.y;
                                                                                            pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
                                                                                        }
                                                                                        areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
                                                                                    }
                                                                                }

                                                                                const formatDate =
                                                                                    (
                                                                                        dateStr,
                                                                                    ) => {
                                                                                        if (
                                                                                            !dateStr
                                                                                        )
                                                                                            return "";
                                                                                        try {
                                                                                            const d =
                                                                                                new Date(
                                                                                                    dateStr.replace(
                                                                                                        " ",
                                                                                                        "T",
                                                                                                    ),
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
                                                                                                <linearGradient
                                                                                                    id="admin-student-chart-grad"
                                                                                                    x1="0"
                                                                                                    y1="0"
                                                                                                    x2="0"
                                                                                                    y2="1"
                                                                                                >
                                                                                                    <stop
                                                                                                        offset="0%"
                                                                                                        stopColor="#8B5CF6"
                                                                                                        stopOpacity="0.15"
                                                                                                    />
                                                                                                    <stop
                                                                                                        offset="100%"
                                                                                                        stopColor="#8B5CF6"
                                                                                                        stopOpacity="0"
                                                                                                    />
                                                                                                </linearGradient>
                                                                                                <filter
                                                                                                    id="admin-chart-shadow"
                                                                                                    x="-5%"
                                                                                                    y="-5%"
                                                                                                    width="110%"
                                                                                                    height="110%"
                                                                                                >
                                                                                                    <feDropShadow
                                                                                                        dx="0"
                                                                                                        dy="1.5"
                                                                                                        stdDeviation="1.2"
                                                                                                        floodColor="#8B5CF6"
                                                                                                        floodOpacity="0.15"
                                                                                                    />
                                                                                                </filter>
                                                                                            </defs>

                                                                                            {areaD && (
                                                                                                <path
                                                                                                    d={
                                                                                                        areaD
                                                                                                    }
                                                                                                    fill="url(#admin-student-chart-grad)"
                                                                                                />
                                                                                            )}
                                                                                            {pathD && (
                                                                                                <path
                                                                                                    d={
                                                                                                        pathD
                                                                                                    }
                                                                                                    fill="none"
                                                                                                    stroke="#8B5CF6"
                                                                                                    strokeWidth="1.5"
                                                                                                    strokeLinecap="round"
                                                                                                    strokeLinejoin="round"
                                                                                                    filter="url(#admin-chart-shadow)"
                                                                                                />
                                                                                            )}

                                                                                            {points.map(
                                                                                                (
                                                                                                    p,
                                                                                                    i,
                                                                                                ) => {
                                                                                                    const isHovered =
                                                                                                        adminStudentHoveredPointIdx ===
                                                                                                        i;
                                                                                                    const isLast =
                                                                                                        i ===
                                                                                                        points.length -
                                                                                                            1;
                                                                                                    const shouldShow =
                                                                                                        isHovered ||
                                                                                                        (adminStudentHoveredPointIdx ===
                                                                                                            null &&
                                                                                                            isLast);
                                                                                                    if (
                                                                                                        !shouldShow
                                                                                                    )
                                                                                                        return null;
                                                                                                    return (
                                                                                                        <circle
                                                                                                            key={
                                                                                                                i
                                                                                                            }
                                                                                                            cx={
                                                                                                                p.x
                                                                                                            }
                                                                                                            cy={
                                                                                                                p.y
                                                                                                            }
                                                                                                            r="4.5"
                                                                                                            fill="#ffffff"
                                                                                                            stroke="#8B5CF6"
                                                                                                            strokeWidth="2.5"
                                                                                                            className="transition-all duration-150"
                                                                                                        />
                                                                                                    );
                                                                                                },
                                                                                            )}

                                                                                            {points.map(
                                                                                                (
                                                                                                    p,
                                                                                                    i,
                                                                                                ) => {
                                                                                                    const isHovered =
                                                                                                        adminStudentHoveredPointIdx ===
                                                                                                        i;
                                                                                                    const isLast =
                                                                                                        i ===
                                                                                                        points.length -
                                                                                                            1;
                                                                                                    const shouldShow =
                                                                                                        isHovered ||
                                                                                                        (adminStudentHoveredPointIdx ===
                                                                                                            null &&
                                                                                                            isLast);
                                                                                                    if (
                                                                                                        !shouldShow
                                                                                                    )
                                                                                                        return null;
                                                                                                    return (
                                                                                                        <text
                                                                                                            key={`score-lbl-${i}`}
                                                                                                            x={
                                                                                                                p.x
                                                                                                            }
                                                                                                            y={
                                                                                                                p.y -
                                                                                                                8
                                                                                                            }
                                                                                                            textAnchor="middle"
                                                                                                            className="text-[7.5px] font-black fill-[#8B5CF6] select-none"
                                                                                                        >
                                                                                                            {
                                                                                                                p.score
                                                                                                            }

                                                                                                            đ
                                                                                                        </text>
                                                                                                    );
                                                                                                },
                                                                                            )}

                                                                                            {points.map(
                                                                                                (
                                                                                                    p,
                                                                                                    i,
                                                                                                ) => (
                                                                                                    <circle
                                                                                                        key={`hover-${i}`}
                                                                                                        cx={
                                                                                                            p.x
                                                                                                        }
                                                                                                        cy={
                                                                                                            p.y
                                                                                                        }
                                                                                                        r="12"
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
                                                                                                ),
                                                                                            )}
                                                                                        </svg>

                                                                                        {adminStudentHoveredPointIdx !==
                                                                                            null &&
                                                                                            points[
                                                                                                adminStudentHoveredPointIdx
                                                                                            ] && (
                                                                                                <div
                                                                                                    className="absolute bg-white border border-slate-200/80 text-slate-855 p-2.5 rounded-xl shadow-lg pointer-events-none transition-all duration-150 animate-in fade-in-50 zoom-in-95 z-30 select-none text-left min-w-[140px]"
                                                                                                    style={{
                                                                                                        left: `${(points[adminStudentHoveredPointIdx].x / width) * 100}%`,
                                                                                                        top: `${(points[adminStudentHoveredPointIdx].y / height) * 100}%`,
                                                                                                        transform:
                                                                                                            "translate(-50%, -115%)",
                                                                                                    }}
                                                                                                >
                                                                                                    <div className="text-[8px] font-bold text-slate-400 leading-none mb-1">
                                                                                                        {formatDate(
                                                                                                            chartPointsData[
                                                                                                                adminStudentHoveredPointIdx
                                                                                                            ]
                                                                                                                .submittedAt,
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <div className="text-[9px] font-black text-slate-800 truncate max-w-[130px] mb-1">
                                                                                                        {
                                                                                                            chartPointsData[
                                                                                                                adminStudentHoveredPointIdx
                                                                                                            ]
                                                                                                                .quizTitle
                                                                                                        }
                                                                                                    </div>
                                                                                                    <div className="flex items-center gap-1 mt-0.5 text-[9px] font-bold text-[#8B5CF6]">
                                                                                                        <span className="w-1 h-1 rounded-full bg-[#8B5CF6]"></span>
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
                                                                                                    <div className="absolute top-[100%] left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-white border-b border-r border-slate-200/80 rotate-45" />
                                                                                                </div>
                                                                                            )}
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </div>

                                                                    {/* Right Column: Tần suất hoạt động */}
                                                                    <div className="lg:col-span-5 space-y-3">
                                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-150">
                                                                            Tần
                                                                            suất
                                                                            hoạt
                                                                            động
                                                                            (30
                                                                            ngày
                                                                            gần
                                                                            đây)
                                                                        </h4>
                                                                        <div className="py-2">
                                                                            {(() => {
                                                                                const today =
                                                                                    new Date();
                                                                                today.setHours(
                                                                                    23,
                                                                                    59,
                                                                                    59,
                                                                                    999,
                                                                                );
                                                                                const daysList =
                                                                                    [];
                                                                                for (
                                                                                    let k = 29;
                                                                                    k >=
                                                                                    0;
                                                                                    k--
                                                                                ) {
                                                                                    const d =
                                                                                        new Date(
                                                                                            today,
                                                                                        );
                                                                                    d.setDate(
                                                                                        today.getDate() -
                                                                                            k,
                                                                                    );
                                                                                    const dStr =
                                                                                        d.toDateString();
                                                                                    const count =
                                                                                        studentSubs.filter(
                                                                                            (
                                                                                                s,
                                                                                            ) => {
                                                                                                return (
                                                                                                    new Date(
                                                                                                        s.submittedAt.replace(
                                                                                                            " ",
                                                                                                            "T",
                                                                                                        ),
                                                                                                    ).toDateString() ===
                                                                                                    dStr
                                                                                                );
                                                                                            },
                                                                                        ).length;
                                                                                    daysList.push(
                                                                                        {
                                                                                            date: d,
                                                                                            count,
                                                                                        },
                                                                                    );
                                                                                }

                                                                                const startDayOfWeek =
                                                                                    (daysList[0].date.getDay() +
                                                                                        6) %
                                                                                    7;

                                                                                const formatDateLabel =
                                                                                    (
                                                                                        d,
                                                                                    ) => {
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
                                                                                        return `${day}/${month}`;
                                                                                    };

                                                                                const weekHeaders =
                                                                                    [
                                                                                        "T2",
                                                                                        "T3",
                                                                                        "T4",
                                                                                        "T5",
                                                                                        "T6",
                                                                                        "T7",
                                                                                        "CN",
                                                                                    ];

                                                                                return (
                                                                                    <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100/80 w-fit text-left flex flex-col gap-2">
                                                                                        {/* Headers */}
                                                                                        <div className="grid grid-cols-7 gap-1.5 text-center text-[8px] font-bold text-slate-400 mb-1.5">
                                                                                            {weekHeaders.map(
                                                                                                (
                                                                                                    h,
                                                                                                ) => (
                                                                                                    <div
                                                                                                        key={
                                                                                                            h
                                                                                                        }
                                                                                                        className="w-2.5"
                                                                                                    >
                                                                                                        {
                                                                                                            h
                                                                                                        }
                                                                                                    </div>
                                                                                                ),
                                                                                            )}
                                                                                        </div>
                                                                                        {/* Grid */}
                                                                                        <div className="grid grid-cols-7 gap-1.5 w-fit">
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
                                                                                                        className="w-2.5 h-2.5"
                                                                                                    />
                                                                                                ),
                                                                                            )}
                                                                                            {daysList.map(
                                                                                                (
                                                                                                    dayInfo,
                                                                                                    idx,
                                                                                                ) => {
                                                                                                    let colorClass =
                                                                                                        "bg-slate-200 text-slate-400";
                                                                                                    if (
                                                                                                        dayInfo.count ===
                                                                                                        1
                                                                                                    ) {
                                                                                                        colorClass =
                                                                                                            "bg-[#A7F3D0] text-emerald-800";
                                                                                                    } else if (
                                                                                                        dayInfo.count ===
                                                                                                        2
                                                                                                    ) {
                                                                                                        colorClass =
                                                                                                            "bg-[#34D399] text-emerald-950";
                                                                                                    } else if (
                                                                                                        dayInfo.count >=
                                                                                                        3
                                                                                                    ) {
                                                                                                        colorClass =
                                                                                                            "bg-[#059669] text-white";
                                                                                                    }

                                                                                                    const tooltipText = `${formatDateLabel(dayInfo.date)}: ${dayInfo.count} bài làm`;

                                                                                                    return (
                                                                                                        <div
                                                                                                            key={
                                                                                                                idx
                                                                                                            }
                                                                                                            className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer hover:scale-125 relative group ${colorClass}`}
                                                                                                        >
                                                                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-900 text-white text-[8px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-50">
                                                                                                                {
                                                                                                                    tooltipText
                                                                                                                }
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
                                                                                            <div className="w-2 h-2 rounded-full bg-slate-200" />
                                                                                            <div className="w-2 h-2 rounded-full bg-[#A7F3D0]" />
                                                                                            <div className="w-2 h-2 rounded-full bg-[#34D399]" />
                                                                                            <div className="w-2 h-2 rounded-full bg-[#059669]" />
                                                                                            <span>
                                                                                                Nhiều
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Submission list */}
                                                            <div className="space-y-3">
                                                                <h4 className="text-xs font-bold text-slate-800">
                                                                    Nhật ký bài
                                                                    thi đã làm
                                                                </h4>
                                                                <div className="space-y-2.5">
                                                                    {studentSubs.map(
                                                                        (
                                                                            sub,
                                                                        ) => {
                                                                            let scoreColor =
                                                                                "bg-rose-50 text-rose-700 border border-rose-200";
                                                                            if (
                                                                                sub.score >=
                                                                                8
                                                                            ) {
                                                                                scoreColor =
                                                                                    "bg-emerald-50 text-emerald-700 border border-emerald-200";
                                                                            } else if (
                                                                                sub.score >=
                                                                                5
                                                                            ) {
                                                                                scoreColor =
                                                                                    "bg-amber-50 text-amber-700 border border-amber-200";
                                                                            }

                                                                            return (
                                                                                <div
                                                                                    key={
                                                                                        sub.id
                                                                                    }
                                                                                    className="border border-slate-200 rounded-lg p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all hover:border-slate-350 shadow-3xs bg-white"
                                                                                >
                                                                                    <div className="space-y-1">
                                                                                        <div className="text-xs font-bold text-slate-850 truncate max-w-sm sm:max-w-md">
                                                                                            {
                                                                                                sub.quizTitle
                                                                                            }
                                                                                        </div>
                                                                                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-slate-450 font-medium">
                                                                                            <span className="flex items-center gap-1">
                                                                                                <Clock className="w-3 h-3 text-slate-450" />
                                                                                                {
                                                                                                    sub.submittedAt
                                                                                                }
                                                                                            </span>
                                                                                            {sub.timeSpent !==
                                                                                                undefined && (
                                                                                                <span className="flex items-center gap-1">
                                                                                                    <Clock className="w-3 h-3 text-slate-450" />
                                                                                                    Thời
                                                                                                    gian:{" "}
                                                                                                    {formatTime(
                                                                                                        sub.timeSpent,
                                                                                                    )}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                                                                                        <span
                                                                                            className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${scoreColor}`}
                                                                                        >
                                                                                            {
                                                                                                sub.score
                                                                                            }{" "}
                                                                                            /
                                                                                            10
                                                                                        </span>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                setAdminReviewSubmission(
                                                                                                    sub,
                                                                                                )
                                                                                            }
                                                                                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-semibold transition-all active:scale-[0.98] cursor-pointer"
                                                                                        >
                                                                                            Xem
                                                                                            chi
                                                                                            tiết
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        },
                                                                    )}

                                                                    {completedCount ===
                                                                        0 && (
                                                                        <p className="text-xs text-slate-400 italic text-center py-6">
                                                                            Học
                                                                            sinh
                                                                            này
                                                                            chưa
                                                                            thực
                                                                            hiện
                                                                            bài
                                                                            thi
                                                                            nào.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
                {isSaveQuizModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
                            {/* Modal Header */}
                            <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-[#1B72E8]" />
                                        <span>Thiết Lập Đề Thi Mới</span>
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Đã nhận {importedQuestions.length} câu
                                        hỏi. Vui lòng cấu hình các thông số dưới
                                        đây.
                                    </p>
                                </div>
                                <button
                                    onClick={() =>
                                        setIsSaveQuizModalOpen(false)
                                    }
                                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Modal Body (Scrollable) */}
                            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
                                {/* Title */}
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                        Tên bài kiểm tra / Đề thi:{" "}
                                        <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={quizTitle}
                                        onChange={(e) =>
                                            setQuizTitle(e.target.value)
                                        }
                                        placeholder="VD: Kiểm tra cuối kì I Giải Tích lớp 11"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                        Mô tả ngắn:
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={quizDescription}
                                        onChange={(e) =>
                                            setQuizDescription(e.target.value)
                                        }
                                        placeholder="VD: Đề thi thử tự luyện tập giúp củng cố kiến thức nâng cao..."
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-slate-400 resize-none"
                                    />
                                </div>

                                {/* Subject and Grade (Grid) */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                            Phân loại (Danh mục):
                                        </label>
                                        <select
                                            value={quizSubject}
                                            onChange={(e) =>
                                                setQuizSubject(e.target.value)
                                            }
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer"
                                        >
                                            <option value="Giải Tích">
                                                Giải Tích
                                            </option>
                                            <option value="Đại Số">
                                                Đại Số
                                            </option>
                                            <option value="Hình Học">
                                                Hình Học
                                            </option>
                                            <option value="Thi Thử">
                                                Thi Thử
                                            </option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                            Khối lớp:
                                        </label>
                                        <select
                                            value={quizGrade}
                                            onChange={(e) =>
                                                setQuizGrade(e.target.value)
                                            }
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer"
                                        >
                                            <option value="8">Lớp 8</option>
                                            <option value="9">Lớp 9</option>
                                            <option value="10">Lớp 10</option>
                                            <option value="11">Lớp 11</option>
                                            <option value="12">Lớp 12</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Duration Option */}
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                        Thời gian làm bài (Phút):
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {["15", "30", "45", "60", "90"].map(
                                            (time) => (
                                                <button
                                                    key={time}
                                                    type="button"
                                                    onClick={() => {
                                                        setDurationOption(time);
                                                        setQuizDuration(
                                                            Number(time),
                                                        );
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                        durationOption === time
                                                            ? "bg-[#EBF3FF] border border-[#1B72E8] text-[#1B72E8]"
                                                            : "bg-slate-50 border border-slate-200 text-slate-650 hover:bg-slate-100"
                                                    }`}
                                                >
                                                    {time} phút
                                                </button>
                                            ),
                                        )}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setDurationOption("other")
                                            }
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                durationOption === "other"
                                                    ? "bg-[#EBF3FF] border border-[#1B72E8] text-[#1B72E8]"
                                                    : "bg-slate-50 border border-slate-200 text-slate-650 hover:bg-slate-100"
                                            }`}
                                        >
                                            Khác...
                                        </button>
                                    </div>

                                    {durationOption === "other" && (
                                        <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                                            <input
                                                type="number"
                                                value={quizDuration}
                                                onChange={(e) =>
                                                    setQuizDuration(
                                                        Number(e.target.value),
                                                    )
                                                }
                                                placeholder="Nhập số phút..."
                                                min={5}
                                                className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                                            />
                                            <span className="text-xs text-slate-500 font-semibold">
                                                phút
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Chế độ chấm điểm */}
                                <div className="border-t border-gray-100 pt-3.5 space-y-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                            Chế độ chấm điểm (Bareme):
                                        </label>
                                        <select
                                            value={scoringMode}
                                            onChange={(e) =>
                                                setScoringMode(e.target.value)
                                            }
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer"
                                        >
                                            <option value="EQUAL_WEIGHT">
                                                Mode 1: Chia đều điểm (Tổng 10đ
                                                cho tất cả câu)
                                            </option>
                                            <option value="SECTION_BASED">
                                                Mode 2: Chia điểm theo Phần (Tự
                                                cấu hình điểm mỗi phần)
                                            </option>
                                            <option value="THPT_QG">
                                                Mode 3: Thang điểm chuẩn thi
                                                THPT Quốc Gia (3 - 4 - 3)
                                            </option>
                                        </select>
                                    </div>

                                    {/* Mode 2: Hướng dẫn / Nhập cấu hình phần */}
                                    {scoringMode === "SECTION_BASED" && (
                                        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-3 animate-in fade-in duration-150 text-xs">
                                            <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">
                                                Cấu hình điểm số cho từng phần:
                                            </div>
                                            {Object.keys(sectionPoints)
                                                .length === 0 ? (
                                                <p className="text-slate-450 italic text-[11px]">
                                                    Không tìm thấy phân chia
                                                    phần trong câu hỏi đã tải
                                                    lên (Cần có trường
                                                    sectionTitle).
                                                </p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {Object.keys(
                                                        sectionPoints,
                                                    ).map((sec) => (
                                                        <div
                                                            key={sec}
                                                            className="flex items-center justify-between gap-3"
                                                        >
                                                            <span className="font-semibold text-slate-600 truncate max-w-[200px]">
                                                                {sec}:
                                                            </span>
                                                            <div className="flex items-center gap-1.5">
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    min="0"
                                                                    max="10"
                                                                    value={
                                                                        sectionPoints[
                                                                            sec
                                                                        ] || ""
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) => {
                                                                        const val =
                                                                            Number(
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            );
                                                                        setSectionPoints(
                                                                            (
                                                                                prev,
                                                                            ) => ({
                                                                                ...prev,
                                                                                [sec]: val,
                                                                            }),
                                                                        );
                                                                    }}
                                                                    className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-blue-500 text-center bg-white"
                                                                />
                                                                <span className="text-slate-400 font-medium">
                                                                    điểm
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="pt-1.5 border-t border-slate-200 flex justify-between font-bold text-slate-700 text-[11px]">
                                                        <span>TỔNG ĐIỂM:</span>
                                                        <span
                                                            className={
                                                                Math.abs(
                                                                    (
                                                                        Object.values(
                                                                            sectionPoints,
                                                                        ) as number[]
                                                                    ).reduce(
                                                                        (
                                                                            a,
                                                                            b,
                                                                        ) =>
                                                                            a +
                                                                            b,
                                                                        0,
                                                                    ) - 10,
                                                                ) < 0.01
                                                                    ? "text-emerald-600"
                                                                    : "text-rose-500"
                                                            }
                                                        >
                                                            {Object.values(
                                                                sectionPoints,
                                                            )
                                                                .reduce(
                                                                    (a, b) =>
                                                                        a + b,
                                                                    0,
                                                                )
                                                                .toFixed(
                                                                    1,
                                                                )}{" "}
                                                            / 10.0đ
                                                        </span>
                                                    </div>
                                                    {Math.abs(
                                                        Object.values(
                                                            sectionPoints,
                                                        ).reduce(
                                                            (a, b) => a + b,
                                                            0,
                                                        ) - 10,
                                                    ) > 0.01 && (
                                                        <p className="text-rose-550 text-[10px] italic leading-normal">
                                                            * Lưu ý: Tổng điểm
                                                            các phần nên bằng
                                                            10.0 để khớp thang
                                                            điểm chuẩn.
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Mode 3: Giải thích thang chuẩn THPTQG */}
                                    {scoringMode === "THPT_QG" && (
                                        <div className="bg-blue-50/50 rounded-2xl p-3 border border-blue-100 text-[11px] text-slate-600 leading-normal space-y-1.5 animate-in fade-in duration-150">
                                            <div className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">
                                                Cấu hình chuẩn THPT Quốc Gia (Bộ
                                                Giáo Dục):
                                            </div>
                                            <ul className="list-disc pl-4 space-y-0.5 font-medium">
                                                <li>
                                                    <strong className="text-slate-800">
                                                        Phần I (Trắc nghiệm
                                                        nhiều lựa chọn):
                                                    </strong>{" "}
                                                    3.0 điểm (12 câu, mỗi câu
                                                    0.25đ)
                                                </li>
                                                <li>
                                                    <strong className="text-slate-800">
                                                        Phần II (Trắc nghiệm
                                                        Đúng/Sai):
                                                    </strong>{" "}
                                                    4.0 điểm (4 câu. Đúng 1 ý
                                                    được 0.1đ, 2 ý 0.25đ, 3 ý
                                                    0.5đ, 4 ý 1.0đ)
                                                </li>
                                                <li>
                                                    <strong className="text-slate-850">
                                                        Phần III (Trắc nghiệm
                                                        trả lời ngắn):
                                                    </strong>{" "}
                                                    3.0 điểm (6 câu, mỗi câu
                                                    0.5đ)
                                                </li>
                                            </ul>
                                            <p className="text-[10px] text-slate-400 italic font-medium pt-1">
                                                * Hệ thống tự nhận diện các câu
                                                hỏi dựa theo trường{" "}
                                                <code className="bg-slate-100 px-1 rounded">
                                                    sectionTitle
                                                </code>{" "}
                                                (Phần I, II, III).
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Public checkbox */}
                                <div className="flex items-center gap-2.5 py-2 select-none border-t border-gray-100 mt-2">
                                    <input
                                        type="checkbox"
                                        id="modal-checkbox-is-public"
                                        checked={quizIsPublic}
                                        onChange={(e) =>
                                            setQuizIsPublic(e.target.checked)
                                        }
                                        className="h-4 w-4 text-[#1B72E8] border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                    />
                                    <label
                                        htmlFor="modal-checkbox-is-public"
                                        className="text-xs font-semibold text-slate-700 cursor-pointer"
                                    >
                                        Công khai đề thi này (Học sinh có thể
                                        thi ngay)
                                    </label>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-gray-100 bg-slate-50/50 flex items-center justify-end gap-3">
                                <button
                                    onClick={() =>
                                        setIsSaveQuizModalOpen(false)
                                    }
                                    className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer"
                                >
                                    Quay lại chỉnh sửa
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!quizTitle.trim()) {
                                            alert(
                                                "Vui lòng nhập tên bài kiểm tra.",
                                            );
                                            return;
                                        }
                                        await handleSaveNewQuiz();
                                        setIsSaveQuizModalOpen(false);
                                        setActiveTab("quizzes");
                                    }}
                                    className="px-5 py-2 bg-[#1B72E8] hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Xác nhận & Lưu đề thi</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {editingQuiz && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
                        <div className={`bg-white rounded-3xl w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh] transition-all duration-300 ${
                            editModalTab === "questions" ? "max-w-5xl" : "max-w-lg"
                        }`}>
                            {/* Modal Header */}
                            <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        {editModalTab === "questions" ? (
                                            <>
                                                <BookOpen className="w-5 h-5 text-[#3B6D85]" />
                                                <span>Xem Trước & Chỉnh Sửa Câu Hỏi</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-5 h-5 text-[#3B6D85]" />
                                                <span>Cấu Hình & Lưu Đề Thi</span>
                                            </>
                                        )}
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Đang chỉnh sửa đề: <strong className="text-slate-700">{editTitle || editingQuiz.title}</strong>
                                    </p>
                                </div>
                                <button
                                    onClick={cancelEdit}
                                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Modal Body (Conditional Render based on Tab) */}
                            {editModalTab === "questions" ? (
                                <div className="p-6 overflow-y-auto flex-1 flex flex-col lg:flex-row gap-6 bg-slate-50/20 text-left min-h-0">
                                    {/* LEFT COLUMN: Question Box Card */}
                                    <div className="flex-1 flex flex-col min-w-0">
                                        <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm flex flex-col justify-between flex-1 min-h-0">
                                            {/* Header Toolbar */}
                                            {(() => {
                                                const q = editQuestions[editCurrentQuestionIdx];
                                                if (!q) {
                                                    return (
                                                        <div className="flex flex-col items-center justify-center py-12 flex-1 text-slate-400">
                                                            <BookOpen className="w-12 h-12 text-slate-300 mb-2" />
                                                            <p className="italic text-xs">Chưa có câu hỏi nào trong đề thi này.</p>
                                                            <button
                                                                type="button"
                                                                onClick={handleAddNewQuestionToEdit}
                                                                className="mt-3 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg transition-all"
                                                            >
                                                                Thêm câu hỏi đầu tiên
                                                            </button>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div className="space-y-4 flex-1 flex flex-col min-h-0">
                                                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 flex-wrap flex-shrink-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-xs font-black text-white bg-[#3B6D85] px-3 py-1 rounded-lg">
                                                                    Câu {editCurrentQuestionIdx + 1}
                                                                </span>
                                                                <select
                                                                    value={q.type || "single_choice"}
                                                                    onChange={(e) => handleUpdateQuestionType(editCurrentQuestionIdx, e.target.value as QuestionType)}
                                                                    className="text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase bg-slate-50 border-slate-200 text-slate-700 focus:outline-none cursor-pointer"
                                                                >
                                                                    <option value="single_choice">Phần 1: 4 Lựa chọn</option>
                                                                    <option value="true_false">Phần 2: Đúng / Sai</option>
                                                                    <option value="short_answer">Phần 3: Điền đáp án</option>
                                                                </select>
                                                            </div>

                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {/* Section input */}
                                                                <input
                                                                    type="text"
                                                                    placeholder="Mục/Phần"
                                                                    value={q.sectionTitle || ""}
                                                                    onChange={(e) => handleUpdateSectionTitle(editCurrentQuestionIdx, e.target.value)}
                                                                    className="w-20 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-bold text-center text-slate-700 focus:outline-none focus:bg-white"
                                                                    title="Phần (VD: Phần I, Phần II, Phần III)"
                                                                />
                                                                {/* Points input */}
                                                                <div className="flex items-center gap-0.5">
                                                                    <input
                                                                        type="number"
                                                                        step="0.05"
                                                                        min="0"
                                                                        value={q.points !== undefined ? q.points : 0.25}
                                                                        onChange={(e) => handleUpdateQuestionPoints(editCurrentQuestionIdx, Number(e.target.value))}
                                                                        className="w-12 px-1 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-bold text-center text-slate-700 focus:outline-none focus:bg-white"
                                                                        title="Số điểm"
                                                                    />
                                                                    <span className="text-[9px] font-bold text-slate-400">đ</span>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setEditExpandedHtmlQuestions((prev) => ({
                                                                            ...prev,
                                                                            [q.id]: !prev[q.id],
                                                                        }))
                                                                    }
                                                                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 cursor-pointer transition-all ${
                                                                        editExpandedHtmlQuestions[q.id]
                                                                            ? "bg-slate-200 border-slate-350 text-slate-700"
                                                                            : "bg-white border-slate-200 text-slate-500 hover:text-slate-700"
                                                                    }`}
                                                                >
                                                                    <Edit className="w-2.5 h-2.5" />
                                                                    <span>Sửa chữ</span>
                                                                </button>
                                                                
                                                                {/* Move Up/Down */}
                                                                <button
                                                                    type="button"
                                                                    disabled={editCurrentQuestionIdx === 0}
                                                                    onClick={() => handleMoveQuestionUp(editCurrentQuestionIdx)}
                                                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                                                                    title="Di chuyển lên"
                                                                >
                                                                    <ArrowUp className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={editCurrentQuestionIdx === editQuestions.length - 1}
                                                                    onClick={() => handleMoveQuestionDown(editCurrentQuestionIdx)}
                                                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                                                                    title="Di chuyển xuống"
                                                                >
                                                                    <ArrowDown className="w-3.5 h-3.5" />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteQuestionFromEdit(editCurrentQuestionIdx)}
                                                                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                                                    title="Xóa câu hỏi này"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Content area */}
                                                        <div className="space-y-5 overflow-y-auto flex-1 pr-1 min-h-0 text-slate-800" style={{ fontSize: `${editFontSize}px` }}>
                                                            {/* Render Question Text */}
                                                            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3">
                                                                {!editExpandedHtmlQuestions[q.id] ? (
                                                                    <h3
                                                                        className="font-semibold text-slate-900 leading-relaxed overflow-x-auto text-left [&_img]:mx-auto [&_img]:block [&_img]:my-3"
                                                                        dangerouslySetInnerHTML={{
                                                                            __html: renderMathHtml(q.text || ""),
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="space-y-1.5 text-left">
                                                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                                                            Nội dung câu hỏi (Hỗ trợ HTML/KaTeX):
                                                                        </label>
                                                                        <textarea
                                                                            value={q.text || ""}
                                                                            onChange={(e) => handleUpdateQuestionText(editCurrentQuestionIdx, e.target.value)}
                                                                            rows={3}
                                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Options render */}
                                                            {(() => {
                                                                if (!q.type || q.type === "single_choice") {
                                                                    const options = q.options || ["Phương án A", "Phương án B", "Phương án C", "Phương án D"];
                                                                    return (
                                                                        <div className="space-y-2.5 text-left">
                                                                            {options.map((option, idx) => {
                                                                                const isSelected = q.correctAnswerIndex === idx;
                                                                                const letter = String.fromCharCode(65 + idx);
                                                                                return (
                                                                                    <div
                                                                                        key={idx}
                                                                                        onClick={() => {
                                                                                            if (!editExpandedHtmlQuestions[q.id]) {
                                                                                                handleUpdateCorrectAnswer(editCurrentQuestionIdx, idx);
                                                                                            }
                                                                                        }}
                                                                                        className={`w-full flex items-center justify-between p-3.5 border rounded-xl text-left font-medium transition-all duration-150 cursor-pointer ${
                                                                                            isSelected
                                                                                                ? "border-emerald-500 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500/20"
                                                                                                : "bg-white border-slate-200 text-slate-700 hover:border-slate-350"
                                                                                        }`}
                                                                                    >
                                                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleUpdateCorrectAnswer(editCurrentQuestionIdx, idx);
                                                                                                }}
                                                                                                className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] cursor-pointer transition-all flex-shrink-0 ${
                                                                                                    isSelected
                                                                                                        ? "bg-emerald-500 text-white"
                                                                                                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                                                                }`}
                                                                                            >
                                                                                                {letter}
                                                                                            </button>
                                                                                            {editExpandedHtmlQuestions[q.id] ? (
                                                                                                <input
                                                                                                    type="text"
                                                                                                    value={option}
                                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                                    onChange={(e) => handleUpdateOption(editCurrentQuestionIdx, idx, e.target.value)}
                                                                                                    className="flex-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md text-xs focus:outline-none focus:bg-white"
                                                                                                    placeholder={`Lựa chọn ${letter}`}
                                                                                                />
                                                                                            ) : (
                                                                                                <span
                                                                                                    className="flex-1 text-slate-800 text-xs font-semibold leading-relaxed overflow-x-auto"
                                                                                                    dangerouslySetInnerHTML={{
                                                                                                        __html: renderMathHtml(option),
                                                                                                    }}
                                                                                                />
                                                                                            )}
                                                                                        </div>
                                                                                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 ml-2" />}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    );
                                                                } else if (q.type === "true_false") {
                                                                    const options = q.options && q.options.length === 4 ? q.options : ["Ý phát biểu A", "Ý phát biểu B", "Ý phát biểu C", "Ý phát biểu D"];
                                                                    const tfAnswers = q.correctAnswers || [false, false, false, false];
                                                                    return (
                                                                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 overflow-x-auto text-left">
                                                                            <div className="grid grid-cols-12 text-[10px] font-bold text-gray-400 uppercase pb-2 border-b border-slate-200 min-w-[320px]">
                                                                                <div className="col-span-8 sm:col-span-9">Khẳng định / Phát biểu</div>
                                                                                <div className="col-span-4 sm:col-span-3 text-center">Đáp án Đúng/Sai</div>
                                                                            </div>
                                                                            {options.map((option, idx) => {
                                                                                const currentVal = tfAnswers[idx];
                                                                                const letter = String.fromCharCode(97 + idx);
                                                                                return (
                                                                                    <div key={idx} className="grid grid-cols-12 items-center gap-2 py-2 border-b border-slate-200/50 last:border-0 min-w-[320px]">
                                                                                        <div className="col-span-8 sm:col-span-9 flex gap-2 text-slate-800">
                                                                                            <span className="font-bold text-slate-500 uppercase">{letter})</span>
                                                                                            {editExpandedHtmlQuestions[q.id] ? (
                                                                                                <input
                                                                                                    type="text"
                                                                                                    value={option}
                                                                                                    onChange={(e) => handleUpdateOption(editCurrentQuestionIdx, idx, e.target.value)}
                                                                                                    className="flex-1 bg-white border border-slate-200 px-2 py-1 rounded-md text-xs focus:outline-none"
                                                                                                    placeholder={`Phát biểu ${letter}`}
                                                                                                />
                                                                                            ) : (
                                                                                                <span
                                                                                                    className="flex-1 text-slate-800 text-xs font-semibold leading-relaxed overflow-x-auto"
                                                                                                    dangerouslySetInnerHTML={{
                                                                                                        __html: renderMathHtml(option),
                                                                                                    }}
                                                                                                />
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="col-span-4 sm:col-span-3 flex justify-center gap-1.5">
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => handleToggleTF(editCurrentQuestionIdx, idx, true)}
                                                                                                className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold transition-all cursor-pointer ${
                                                                                                    currentVal === true
                                                                                                        ? "bg-emerald-500 text-white shadow-sm"
                                                                                                        : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                                                                                                }`}
                                                                                            >
                                                                                                Đúng
                                                                                            </button>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => handleToggleTF(editCurrentQuestionIdx, idx, false)}
                                                                                                className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold transition-all cursor-pointer ${
                                                                                                    currentVal === false
                                                                                                        ? "bg-rose-500 text-white shadow-sm"
                                                                                                        : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                                                                                                }`}
                                                                                            >
                                                                                                Sai
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    );
                                                                } else if (q.type === "short_answer") {
                                                                    return (
                                                                        <div className="space-y-2 text-left bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                                                            <label className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">
                                                                                Đáp án điền khuyết (Đáp số):
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={q.shortAnswerKey || ""}
                                                                                onChange={(e) => handleUpdateShortAnswer(editCurrentQuestionIdx, e.target.value)}
                                                                                placeholder="Ví dụ: 150, 24, 2.05, -3..."
                                                                                className="w-full px-4 py-2.5 bg-white border border-purple-200 hover:border-purple-300 focus:border-purple-500 font-bold text-slate-900 rounded-xl focus:outline-none transition-all placeholder:text-slate-400 text-xs"
                                                                            />
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}

                                                            {/* Explanation Box */}
                                                            <div className="pt-4 border-t border-slate-200/60 space-y-2 text-left">
                                                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
                                                                    <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                                                                    <span>Lời giải chi tiết:</span>
                                                                </div>
                                                                {!editExpandedHtmlQuestions[q.id] ? (
                                                                    q.explanation ? (
                                                                        <div
                                                                            className="p-4 bg-amber-50/15 border border-amber-200/35 rounded-xl text-xs text-slate-700 overflow-x-auto leading-relaxed font-semibold [&_img]:mx-auto [&_img]:block [&_img]:my-3"
                                                                            dangerouslySetInnerHTML={{
                                                                                __html: renderMathHtml(q.explanation || ""),
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <p className="text-slate-400 italic text-[11px] px-1">Chưa cấu hình lời giải chi tiết.</p>
                                                                    )
                                                                ) : (
                                                                    <textarea
                                                                        value={q.explanation || ""}
                                                                        onChange={(e) => handleUpdateExplanation(editCurrentQuestionIdx, e.target.value)}
                                                                        rows={2}
                                                                        placeholder="Nhập nội dung lời giải chi tiết..."
                                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Card Navigation Footer */}
                                                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 flex-shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
                                                                disabled={editCurrentQuestionIdx === 0}
                                                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-650 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                                            >
                                                                <ChevronLeft className="w-4 h-4" />
                                                                <span>Quay lại</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={handleAddNewQuestionToEdit}
                                                                className="px-3.5 py-2 bg-emerald-55 border border-emerald-250 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                                <span>Thêm câu mới</span>
                                                            </button>

                                                            {editCurrentQuestionIdx < editQuestions.length - 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditCurrentQuestionIdx((prev) => prev + 1)}
                                                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                                                                >
                                                                    <span>Tiếp theo</span>
                                                                    <ChevronRight className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* RIGHT COLUMN: Sidebar Question Tracker */}
                                    <div className="w-full lg:w-72 bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-6 flex flex-col shrink-0 justify-between min-h-[300px]">
                                        <div className="space-y-4">
                                            <div>
                                                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-tight">
                                                    Bảng câu hỏi
                                                </h3>
                                                <p className="text-[10px] text-slate-400 mt-1 font-semibold leading-normal">
                                                    Nhấp vào số câu để chuyển nhanh. Ô màu vàng là chưa điền đáp án, ô màu xanh là đã cấu hình đáp án.
                                                </p>
                                            </div>

                                            {/* Progress bar */}
                                            {(() => {
                                                const configCount = editQuestions.filter((q) => {
                                                    if (q.type === "single_choice") {
                                                        return q.correctAnswerIndex !== undefined && q.correctAnswerIndex !== -1;
                                                    }
                                                    if (q.type === "true_false") {
                                                        return q.correctAnswers && q.correctAnswers.some((x) => x !== undefined && x !== null);
                                                    }
                                                    if (q.type === "short_answer") {
                                                        return q.shortAnswerKey && q.shortAnswerKey.trim() !== "";
                                                    }
                                                    return false;
                                                }).length;

                                                return (
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                                            <span>Tiến độ đáp án:</span>
                                                            <span>{configCount} / {editQuestions.length} câu</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                            <div
                                                                className="bg-emerald-500 h-1.5 transition-all duration-300"
                                                                style={{
                                                                    width: `${editQuestions.length > 0 ? (configCount / editQuestions.length) * 100 : 0}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Section grid display */}
                                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                                                {(() => {
                                                    const sections: Record<string, { qIndex: number; q: Question }[]> = {};
                                                    editQuestions.forEach((q, idx) => {
                                                        let secTitle = "Phần 1: Trắc nghiệm";
                                                        if (q.type === "true_false") {
                                                            secTitle = "Phần 2: Đúng / Sai";
                                                        } else if (q.type === "short_answer") {
                                                            secTitle = "Phần 3: Điền đáp án";
                                                        }
                                                        if (!sections[secTitle]) {
                                                            sections[secTitle] = [];
                                                        }
                                                        sections[secTitle].push({ qIndex: idx, q });
                                                    });

                                                    return Object.entries(sections).map(([secTitle, items]) => (
                                                        <div key={secTitle} className="space-y-1.5">
                                                            <h4 className="text-[9px] font-black text-brand-600 bg-brand-50/50 px-2 py-0.5 rounded border border-brand-100/40 uppercase">
                                                                {secTitle}
                                                            </h4>
                                                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 p-0.5">
                                                                {items.map(({ qIndex, q }) => {
                                                                    const isCurrent = qIndex === editCurrentQuestionIdx;
                                                                    let isConfigured = false;
                                                                    if (q.type === "single_choice") {
                                                                        isConfigured = q.correctAnswerIndex !== undefined && q.correctAnswerIndex !== -1;
                                                                    } else if (q.type === "true_false") {
                                                                        isConfigured = q.correctAnswers && q.correctAnswers.some((x) => x !== undefined && x !== null);
                                                                    } else if (q.type === "short_answer") {
                                                                        isConfigured = q.shortAnswerKey !== undefined && q.shortAnswerKey.trim() !== "";
                                                                    }

                                                                    return (
                                                                        <button
                                                                            key={q.id}
                                                                            type="button"
                                                                            onClick={() => setEditCurrentQuestionIdx(qIndex)}
                                                                            className={`w-8 h-8 rounded-lg text-xs font-black transition-all border cursor-pointer ${
                                                                                isCurrent
                                                                                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                                                                    : isConfigured
                                                                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                                      : "bg-amber-50 text-amber-750 border-amber-200"
                                                                            }`}
                                                                        >
                                                                            {qIndex + 1}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        </div>

                                        {/* Font size and Cấu hình & Lưu */}
                                        <div className="space-y-4 pt-3 border-t border-slate-100 flex-shrink-0">
                                            <div className="flex items-center justify-between text-xs text-slate-650 font-bold">
                                                <span>Cỡ chữ:</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditFontSize((prev) => Math.max(11, prev - 1))}
                                                        className="w-6 h-6 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-95 transition-all"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="font-bold text-slate-800 w-8 text-center">{editFontSize}px</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditFontSize((prev) => Math.min(20, prev + 1))}
                                                        className="w-6 h-6 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-95 transition-all"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setEditModalTab("settings")}
                                                className="w-full py-3 bg-[#3B6D85] hover:bg-[#2C5A71] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-97"
                                            >
                                                <span>Cấu hình & Lưu đề thi</span>
                                                <CheckCircle2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* TAB 2: GENERAL SETTINGS FORM */
                                <div className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
                                    {/* Title */}
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                            Tên bài kiểm tra / Đề thi: <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            placeholder="VD: Kiểm tra cuối kì I Giải Tích lớp 11"
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                            Mô tả ngắn:
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            placeholder="VD: Đề thi thử tự luyện tập giúp củng cố kiến thức..."
                                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-slate-400 resize-none"
                                        />
                                    </div>

                                    {/* Subject & Grade */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                                Phân loại (Danh mục):
                                            </label>
                                            <select
                                                value={editSubject}
                                                onChange={(e) => setEditSubject(e.target.value)}
                                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                                            >
                                                <option value="Giải Tích">Giải Tích</option>
                                                <option value="Đại Số">Đại Số</option>
                                                <option value="Hình Học">Hình Học</option>
                                                <option value="Thi Thử">Thi Thử</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                                Khối lớp:
                                            </label>
                                            <select
                                                value={editGrade}
                                                onChange={(e) => setEditGrade(e.target.value)}
                                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                                            >
                                                <option value="8">Lớp 8</option>
                                                <option value="9">Lớp 9</option>
                                                <option value="10">Lớp 10</option>
                                                <option value="11">Lớp 11</option>
                                                <option value="12">Lớp 12</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Duration */}
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                            Thời gian làm bài (Phút):
                                        </label>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {["15", "30", "45", "60", "90"].map((time) => (
                                                <button
                                                    key={time}
                                                    type="button"
                                                    onClick={() => {
                                                        setEditDurationOption(time);
                                                        setEditDuration(Number(time));
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                        editDurationOption === time
                                                            ? "bg-[#EBF3FF] border border-[#1B72E8] text-[#1B72E8]"
                                                            : "bg-slate-50 border border-slate-200 text-slate-655 hover:bg-slate-100"
                                                    }`}
                                                >
                                                    {time} phút
                                                </button>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => setEditDurationOption("other")}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                    editDurationOption === "other"
                                                        ? "bg-[#EBF3FF] border border-[#1B72E8] text-[#1B72E8]"
                                                        : "bg-slate-50 border border-slate-200 text-slate-655 hover:bg-slate-100"
                                                }`}
                                            >
                                                Khác...
                                            </button>
                                        </div>

                                        {editDurationOption === "other" && (
                                            <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                                                <input
                                                    type="number"
                                                    value={editDuration}
                                                    onChange={(e) => setEditDuration(Number(e.target.value))}
                                                    placeholder="Nhập số phút..."
                                                    min={5}
                                                    className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                                                />
                                                <span className="text-xs text-slate-500 font-semibold">phút</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Scoring Mode */}
                                    <div className="border-t border-gray-100 pt-3.5 space-y-3">
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                                Chế độ chấm điểm (Bareme):
                                            </label>
                                            <select
                                                value={editScoringMode}
                                                onChange={(e) => setEditScoringMode(e.target.value as any)}
                                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                                            >
                                                <option value="EQUAL_WEIGHT">Chia đều điểm (Tổng 10đ cho tất cả câu)</option>
                                                <option value="SECTION_BASED">Chia điểm theo Phần (Tự cấu hình điểm mỗi phần)</option>
                                                <option value="THPT_QG">Thang điểm chuẩn thi THPT Quốc Gia (3 - 4 - 3)</option>
                                            </select>
                                        </div>

                                        {editScoringMode === "SECTION_BASED" && (
                                            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-3 text-xs">
                                                <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">
                                                    Cấu hình điểm số cho từng phần:
                                                </div>
                                                {(() => {
                                                    const sections = Array.from(new Set(editQuestions.map(q => q.sectionTitle).filter(Boolean)));
                                                    if (sections.length === 0) {
                                                        return <p className="text-slate-450 italic text-[11px]">Cần phân loại sectionTitle cho câu hỏi để dùng chế độ này.</p>;
                                                    }
                                                    return (
                                                        <div className="space-y-2">
                                                            {sections.map((sec) => (
                                                                <div key={sec} className="flex items-center justify-between gap-3">
                                                                    <span className="font-semibold text-slate-600 truncate max-w-[200px]">{sec}:</span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <input
                                                                            type="number"
                                                                            step="0.1"
                                                                            min="0"
                                                                            max="10"
                                                                            value={editSectionPoints[sec] || 0}
                                                                            onChange={(e) => {
                                                                                const val = Number(e.target.value);
                                                                                setEditSectionPoints(prev => ({ ...prev, [sec]: val }));
                                                                            }}
                                                                            className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold text-center bg-white"
                                                                        />
                                                                        <span className="text-slate-400">điểm</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        {editScoringMode === "THPT_QG" && (
                                            <div className="bg-blue-50/50 rounded-2xl p-3 border border-blue-105 text-[11px] text-slate-655 leading-normal space-y-1.5 animate-in fade-in duration-150">
                                                <div className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">
                                                    Cấu hình chuẩn THPT Quốc Gia (Bộ Giáo Dục):
                                                </div>
                                                <ul className="list-disc pl-4 space-y-0.5 font-medium">
                                                    <li>Phần I: 3.0 điểm (12 câu, mỗi câu 0.25đ)</li>
                                                    <li>Phần II: 4.0 điểm (4 câu. Đúng 1 ý được 0.1đ, 2 ý 0.25đ, 3 ý 0.5đ, 4 ý 1.0đ)</li>
                                                    <li>Phần III: 3.0 điểm (6 câu, mỗi câu 0.5đ)</li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {/* Public Checkbox */}
                                    <div className="flex items-center gap-2.5 py-2 select-none border-t border-gray-100 mt-2">
                                        <input
                                            type="checkbox"
                                            id="edit-modal-checkbox-is-public"
                                            checked={editIsPublic}
                                            onChange={(e) => setEditIsPublic(e.target.checked)}
                                            className="h-4 w-4 text-[#1B72E8] border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                        />
                                        <label
                                            htmlFor="edit-modal-checkbox-is-public"
                                            className="text-xs font-semibold text-slate-700 cursor-pointer"
                                        >
                                            Công khai đề thi này (Học sinh có thể thi ngay)
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Modal Footer (Conditional based on tab) */}
                            {editModalTab === "settings" && (
                                <div className="px-6 py-4.5 border-t border-gray-100 bg-slate-50/50 flex items-center justify-end gap-3 flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setEditModalTab("questions")}
                                        className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 transition-all cursor-pointer"
                                    >
                                        Quay lại chỉnh sửa câu hỏi
                                    </button>
                                    <button
                                        onClick={saveEditQuiz}
                                        className="px-5 py-2 bg-[#3B6D85] hover:bg-[#2C5A71] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        <span>Lưu thay đổi Đề thi</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </section>
        </div>
    );
}
