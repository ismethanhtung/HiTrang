import React, { useState, useEffect } from "react";
import { Quiz, Submission } from "../types";
import { renderMathHtml } from "../lib/math";
import { getQuiz } from "../lib/supabaseService";
import {
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    Crown,
    Clock,
    User,
    Loader2,
} from "lucide-react";

interface AdminSubmissionReviewerProps {
    submission: Submission;
    onBack: () => void;
    quizzes: Quiz[];
}

export default function AdminSubmissionReviewer({
    submission,
    onBack,
    quizzes,
}: AdminSubmissionReviewerProps) {
    const [adminReviewQuestionIdx, setAdminReviewQuestionIdx] = useState(0);
    const [fullQuiz, setFullQuiz] = useState<Quiz | null>(null);
    const [loadingQuiz, setLoadingQuiz] = useState(false);
    const quiz = fullQuiz;

    useEffect(() => {
        const loadFullQuiz = async () => {
            const cachedQuiz = quizzes.find((q) => q.id === submission.quizId);
            const hasRealQuestions =
                cachedQuiz?.questions &&
                cachedQuiz.questions.length > 0 &&
                Object.keys(cachedQuiz.questions[0]).length > 0;

            if (hasRealQuestions && cachedQuiz) {
                setFullQuiz(cachedQuiz);
            } else {
                setLoadingQuiz(true);
                try {
                    const data = await getQuiz(submission.quizId);
                    setFullQuiz(data);
                } catch (err) {
                    console.error("Lỗi khi tải thông tin đề thi:", err);
                } finally {
                    setLoadingQuiz(false);
                }
            }
        };
        loadFullQuiz();
        setAdminReviewQuestionIdx(0);
    }, [submission, quizzes]);

    useEffect(() => {
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

            if (quiz) {
                if (e.key === "ArrowLeft") {
                    setAdminReviewQuestionIdx((prev) => Math.max(0, prev - 1));
                } else if (e.key === "ArrowRight") {
                    setAdminReviewQuestionIdx((prev) =>
                        Math.min(quiz.questions.length - 1, prev + 1),
                    );
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [quiz]);

    if (loadingQuiz || !quiz) {
        return (
            <div className="flex-1 w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-bg-card border border-border-primary/80 rounded-2xl p-8 text-center">
                <Loader2 className="w-9 h-9 border-3 text-brand-600 animate-spin mb-3" />
                <h3 className="text-sm font-bold text-text-primary">
                    Đang tải chi tiết đề thi và bài làm...
                </h3>
                <p className="text-xs text-text-secondary mt-1">
                    Đang đồng bộ dữ liệu đáp án và câu hỏi từ máy chủ.
                </p>
            </div>
        );
    }

    const cleanTrueFalseQuestionText = (html: string) => {
        if (!html) return "";
        let clean = html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match) => {
            if (
                match.includes("Khẳng định") ||
                match.includes("Đúng") ||
                match.includes("Sai")
            ) {
                return "";
            }
            return match;
        });

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

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
    };

    const totalQ = quiz.questions.length;

    // Compute per-question status
    const qStatuses: ("correct" | "wrong" | "partial" | "unanswered")[] =
        quiz.questions.map((q) => {
            const chosen = submission.answers[q.id];
            if (chosen === undefined || chosen === null || chosen === "")
                return "unanswered";
            if (!q.type || q.type === "single_choice") {
                return chosen === q.correctAnswerIndex ? "correct" : "wrong";
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
                const sKey = String(chosen || "").trim().toLowerCase();
                return cKey && sKey === cKey ? "correct" : "wrong";
            }
            return "wrong";
        });

    const correctCount = qStatuses.filter((s) => s === "correct").length;
    const safeIdx = Math.min(adminReviewQuestionIdx, totalQ - 1);
    const q = quiz.questions[safeIdx];
    const chosen = submission.answers[q.id];
    const status = qStatuses[safeIdx];

    const displayQuestionText =
        q.type === "true_false" ? cleanTrueFalseQuestionText(q.text) : q.text;

    const cardAccentClass =
        status === "correct"
            ? "border-l-4 border-l-emerald-500"
            : status === "partial"
              ? "border-l-4 border-l-amber-500"
              : status === "unanswered"
                ? "border-l-4 border-l-slate-300 dark:border-l-slate-600"
                : "border-l-4 border-l-rose-500";

    const statusBadgeClass =
        status === "correct"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40"
            : status === "partial"
              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40"
              : status === "unanswered"
                ? "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40";

    const statusText =
        status === "correct"
            ? "Đúng"
            : status === "partial"
              ? "Đúng một phần"
              : status === "unanswered"
                ? "Chưa trả lời"
                : "Sai";

    const progressPercent = Math.round(((safeIdx + 1) / totalQ) * 100);

    return (
        <div className="w-full h-full min-h-0 flex flex-col xl:flex-row xl:justify-center xl:items-start gap-5 overflow-hidden animate-in fade-in duration-200 select-none">
            {/* CENTER COLUMN: Question Box Card & Options */}
            <div className="w-full flex-1 min-h-0 xl:max-w-4xl xl:h-full flex flex-col">
                <div className="bg-bg-card border border-border-primary/80 rounded-2xl p-5 sm:p-7 shadow-sm space-y-5 flex flex-col justify-between flex-1 min-h-0 xl:h-full">
                    {/* Quiz Review Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border-primary/60 pb-4 text-left shrink-0">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-extrabold tracking-wider uppercase bg-brand-50 text-brand-700 border border-brand-200 dark:bg-brand-950/40 dark:text-brand-300 dark:border-brand-800/40 px-2.5 py-0.5 rounded-lg shrink-0">
                                    Xem bài làm học sinh
                                </span>
                                <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 shrink-0">
                                    <User className="w-3 h-3 text-slate-400" />
                                    <span>{submission.studentName}</span>
                                    {submission.studentUsername && (
                                        <span className="text-slate-400 font-normal">
                                            (@{submission.studentUsername})
                                        </span>
                                    )}
                                </span>
                            </div>
                            <h2
                                className="text-sm sm:text-base font-extrabold text-text-primary mt-1.5 truncate"
                                title={submission.quizTitle}
                            >
                                {submission.quizTitle}
                            </h2>
                        </div>

                        {/* Top Info Badges */}
                        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto shrink-0">
                            {submission.timeSpent !== undefined && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{formatTime(submission.timeSpent)}</span>
                                </div>
                            )}

                            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border bg-brand-50 border-brand-200 text-brand-700 dark:bg-brand-950/40 dark:border-brand-800/40 dark:text-brand-300 text-xs font-bold shadow-3xs">
                                <Crown className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                <span>
                                    Điểm: {submission.score} (Đúng {correctCount}/{totalQ})
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Progress indicator bar */}
                    <div className="shrink-0">
                        <div className="flex justify-between text-[11px] font-semibold text-text-secondary mb-1.5">
                            <span>
                                Đang xem câu {safeIdx + 1} trên {totalQ}
                            </span>
                            <span>
                                Tỷ lệ đúng: {Math.round((correctCount / totalQ) * 100)}%
                            </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                style={{
                                    width: `${progressPercent}%`,
                                }}
                            />
                        </div>
                    </div>

                    {/* Question & Options Scroll Container */}
                    <div className="flex-1 overflow-y-auto pr-1 space-y-5 min-h-0 custom-scrollbar text-left">
                        {/* Question Box Card */}
                        <div
                            className={`bg-bg-base/60 dark:bg-slate-900/40 border border-border-primary/80 p-5 sm:p-6 rounded-2xl space-y-4 ${cardAccentClass}`}
                        >
                            <div className="flex items-center justify-between border-b border-border-primary/60 pb-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-extrabold text-brand-700 bg-brand-100 dark:bg-brand-950/50 dark:text-brand-300 px-2.5 py-0.5 rounded-lg">
                                        Câu {safeIdx + 1}
                                    </span>
                                    <span
                                        className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border uppercase ${
                                            q.type === "true_false"
                                                ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40"
                                                : q.type === "short_answer"
                                                  ? "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/40"
                                                  : "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/40"
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
                                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border uppercase ${statusBadgeClass}`}
                                >
                                    {statusText}
                                </span>
                            </div>

                            {q.sectionTitle && (
                                <div className="text-[10px] font-bold text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 px-2.5 py-0.5 rounded-lg border border-brand-200 dark:border-brand-800/40 inline-block uppercase tracking-wider">
                                    {q.sectionTitle}
                                </div>
                            )}

                            <h3 className="font-semibold text-text-primary leading-relaxed overflow-x-auto text-[14px] sm:text-[15px] [&_img]:mx-auto [&_img]:block [&_img]:my-4 select-none">
                                <span
                                    dangerouslySetInnerHTML={{
                                        __html: renderMathHtml(displayQuestionText),
                                    }}
                                />
                            </h3>

                            {/* Options rendering depending on type */}
                            {(() => {
                                if (!q.type || q.type === "single_choice") {
                                    return (
                                        <div className="space-y-3">
                                            {q.options.map((option, idx) => {
                                                const isChosen = chosen === idx;
                                                const isCorrectOpt =
                                                    q.correctAnswerIndex === idx;
                                                const cleanedOpt = option.replace(
                                                    /^\s*[a-f][\)\.\:\-]\s*/i,
                                                    "",
                                                );

                                                let borderStyle =
                                                    "border-border-primary/80 text-text-primary bg-bg-card hover:bg-slate-50/50 dark:hover:bg-slate-800/50";
                                                let letterCircleStyle =
                                                    "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400";
                                                let badge = null;

                                                if (isCorrectOpt) {
                                                    borderStyle =
                                                        "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20";
                                                    letterCircleStyle =
                                                        "bg-emerald-500 text-white font-bold";
                                                    badge = (
                                                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white font-medium flex items-center justify-center shrink-0">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                        </div>
                                                    );
                                                } else if (isChosen && !isCorrectOpt) {
                                                    borderStyle =
                                                        "border-rose-400 bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20";
                                                    letterCircleStyle =
                                                        "bg-rose-500 text-white font-bold";
                                                    badge = (
                                                        <span className="text-[9px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-md shrink-0">
                                                            Học sinh chọn
                                                        </span>
                                                    );
                                                }

                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`w-full flex items-center justify-between p-4 border rounded-xl text-left font-medium transition-all duration-150 select-none ${borderStyle}`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0 pr-2">
                                                            <span
                                                                className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${letterCircleStyle}`}
                                                            >
                                                                {String.fromCharCode(
                                                                    65 + idx,
                                                                )}
                                                            </span>
                                                            <span
                                                                className="overflow-x-auto"
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
                                            })}
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
                                        <div className="bg-bg-card border border-border-primary/80 p-4 rounded-xl space-y-3 overflow-x-auto">
                                            <div className="grid grid-cols-12 text-[10px] font-bold text-text-secondary uppercase pb-2 border-b border-border-primary/60 min-w-[320px]">
                                                <div className="col-span-8 sm:col-span-9">
                                                    Khẳng định / Nhận định
                                                </div>
                                                <div className="col-span-4 sm:col-span-3 text-center">
                                                    Đáp án & Kết quả
                                                </div>
                                            </div>
                                            {q.options.map((option, idx) => {
                                                const currentVal = studentTf[idx];
                                                const correctVal = correctTf[idx];
                                                const isCorrect =
                                                    currentVal === correctVal;
                                                const cleanedOption = option.replace(
                                                    /^\s*[a-f][\)\.\:\-]\s*/i,
                                                    "",
                                                );

                                                let dungBtnClass =
                                                    "bg-bg-card border border-border-primary text-slate-400";
                                                let saiBtnClass =
                                                    "bg-bg-card border border-border-primary text-slate-400";

                                                if (currentVal === true) {
                                                    dungBtnClass = isCorrect
                                                        ? "bg-emerald-500 text-white shadow-xs"
                                                        : "bg-rose-500 text-white shadow-xs";
                                                } else if (currentVal === false) {
                                                    saiBtnClass = isCorrect
                                                        ? "bg-emerald-500 text-white shadow-xs"
                                                        : "bg-rose-500 text-white shadow-xs";
                                                }

                                                if (correctVal === true) {
                                                    dungBtnClass +=
                                                        " ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-slate-900 border-emerald-500";
                                                } else {
                                                    saiBtnClass +=
                                                        " ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-slate-900 border-emerald-500";
                                                }

                                                return (
                                                    <div
                                                        key={idx}
                                                        className="grid grid-cols-12 items-center gap-2 py-2.5 border-b border-border-primary/40 last:border-0 min-w-[320px]"
                                                    >
                                                        <div className="col-span-8 sm:col-span-9 flex gap-2 text-text-primary [&_img]:mx-auto [&_img]:block [&_img]:my-2 text-xs select-none pr-2">
                                                            <span className="font-bold text-slate-400 shrink-0">
                                                                {String.fromCharCode(
                                                                    97 + idx,
                                                                )}
                                                                )
                                                            </span>
                                                            <span
                                                                className="overflow-x-auto"
                                                                dangerouslySetInnerHTML={{
                                                                    __html: renderMathHtml(
                                                                        cleanedOption,
                                                                    ),
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="col-span-4 sm:col-span-3 flex justify-center items-center gap-1.5 select-none shrink-0">
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
                                                                {currentVal === null ? (
                                                                    <span className="text-[8px] text-slate-400 font-bold">
                                                                        Chưa chọn
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
                                            })}
                                        </div>
                                    );
                                } else if (q.type === "short_answer") {
                                    const textVal = String(chosen || "");
                                    const isCorrect = status === "correct";

                                    let inputBorderClass =
                                        "border-rose-300 dark:border-rose-800 bg-rose-50/20 text-rose-900 dark:text-rose-200";
                                    if (isCorrect) {
                                        inputBorderClass =
                                            "border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 text-emerald-900 dark:text-emerald-200";
                                    } else if (textVal === "") {
                                        inputBorderClass =
                                            "border-border-primary bg-slate-50 dark:bg-slate-800 text-slate-400";
                                    }

                                    return (
                                        <div className="space-y-2 text-left select-none">
                                            <label className="text-[11px] font-bold text-purple-800 dark:text-purple-400 uppercase tracking-wider block">
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
                                                    className={`w-full px-4 py-3 font-bold rounded-xl ${inputBorderClass} text-xs`}
                                                />
                                                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1.5">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
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
                            <div className="bg-slate-50/80 dark:bg-slate-800/40 border border-border-primary/80 rounded-xl p-4 space-y-2 text-xs text-left">
                                <div className="flex items-center gap-1.5 text-brand-700 dark:text-brand-400 font-extrabold select-none">
                                    <img
                                        src="/icons/lightbulb.png"
                                        alt="Lời giải"
                                        className="w-4 h-4 object-contain select-none flex-shrink-0"
                                    />
                                    <span>Lời giải chi tiết:</span>
                                </div>
                                <div
                                    className="text-text-primary overflow-x-auto leading-relaxed pl-2 border-l-2 border-brand-500/30 [&_img]:mx-auto [&_img]:block [&_img]:my-4"
                                    dangerouslySetInnerHTML={{
                                        __html: renderMathHtml(q.explanation),
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Quiz Navigation Buttons Row */}
                    <div className="flex items-center justify-between pt-4 border-t border-border-primary/60 select-none shrink-0">
                        <button
                            type="button"
                            onClick={() =>
                                setAdminReviewQuestionIdx((p) => Math.max(0, p - 1))
                            }
                            disabled={safeIdx === 0}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-text-primary text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Quay lại</span>
                        </button>

                        <span className="text-xs font-semibold text-text-secondary">
                            Câu {safeIdx + 1} / {totalQ}
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                setAdminReviewQuestionIdx((p) =>
                                    Math.min(totalQ - 1, p + 1),
                                )
                            }
                            disabled={safeIdx === totalQ - 1}
                            className="inline-flex items-center gap-1.5 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-98"
                        >
                            <span>Tiếp theo</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: Questions Tracker & Quick Select Panel */}
            <div className="w-full xl:w-80 bg-bg-card border border-border-primary/80 rounded-2xl p-5 shadow-sm space-y-4 xl:h-full flex flex-col justify-between min-h-0 shrink-0 text-left select-none">
                <div className="space-y-4 flex-1 flex flex-col min-h-0">
                    <div className="shrink-0">
                        <h3 className="text-xs font-bold text-text-primary uppercase tracking-tight">
                            Bảng câu hỏi
                        </h3>
                        <div className="text-[10px] text-text-secondary mt-1.5 flex items-center flex-wrap gap-1.5 font-medium">
                            <span className="inline-flex items-center gap-1">
                                <span className="inline-block w-2.5 h-2.5 bg-emerald-200 dark:bg-emerald-950/60 border border-emerald-400 dark:border-emerald-600 rounded-sm"></span>
                                <span>Đúng</span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <span className="inline-block w-2.5 h-2.5 bg-amber-200 dark:bg-amber-950/60 border border-amber-400 dark:border-amber-600 rounded-sm"></span>
                                <span>1 phần</span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <span className="inline-block w-2.5 h-2.5 bg-rose-200 dark:bg-rose-950/60 border border-rose-400 dark:border-rose-600 rounded-sm"></span>
                                <span>Sai</span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <span className="inline-block w-2.5 h-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-sm"></span>
                                <span>Chưa làm</span>
                            </span>
                        </div>
                    </div>

                    {/* Render Questions grouped by Section */}
                    <div className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0 custom-scrollbar">
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
                                    <div key={secTitle} className="space-y-2">
                                        <h4 className="text-[10px] font-bold text-brand-700 dark:text-brand-300 bg-brand-50/80 dark:bg-brand-950/40 px-2 py-1 rounded-lg border border-brand-100/60 dark:border-brand-800/40">
                                            {secTitle}
                                        </h4>
                                        <div className="grid grid-cols-5 gap-2 p-1">
                                            {items.map(({ qIndex, q }) => {
                                                const s = qStatuses[qIndex];
                                                const isCurrent =
                                                    qIndex === safeIdx;

                                                let btnColorClass =
                                                    "bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800/60 hover:bg-rose-200";
                                                if (s === "correct") {
                                                    btnColorClass =
                                                        "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-200";
                                                } else if (s === "partial") {
                                                    btnColorClass =
                                                        "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/60 hover:bg-amber-200";
                                                } else if (s === "unanswered") {
                                                    btnColorClass =
                                                        "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200";
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
                                                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all relative flex items-center justify-center cursor-pointer border ${btnColorClass} ${
                                                            isCurrent
                                                                ? "ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-900 border-brand-500 scale-105 shadow-xs font-black z-10"
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
                <div className="pt-3 border-t border-border-primary/60 shrink-0">
                    <button
                        type="button"
                        onClick={onBack}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-all shadow-3xs cursor-pointer active:scale-98 flex items-center justify-center gap-1.5"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Quay lại danh sách</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

