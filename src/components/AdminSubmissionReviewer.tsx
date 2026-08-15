import React, { useState, useEffect } from "react";
import { Quiz, Submission } from "../types";
import { renderMathHtml } from "../lib/math";
import {
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    Crown,
    BookOpen,
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

    const quiz = quizzes.find((q) => q.id === submission.quizId);

    useEffect(() => {
        setAdminReviewQuestionIdx(0);
    }, [submission]);

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

    if (!quiz) {
        return (
            <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-gray-400 italic">
                Không tìm thấy dữ liệu đề thi tương ứng.
            </div>
        );
    }

    const cleanTrueFalseQuestionText = (html: string) => {
        if (!html) return "";
        let clean = html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match) => {
            if (match.includes("Khẳng định") || match.includes("Đúng") || match.includes("Sai")) {
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
                const correctTf = q.correctAnswers || [false, false, false, false];
                const studentTf = (chosen as (boolean | null)[]) || [null, null, null, null];
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

    // Build question-level grading detail
    let tfStatusList: {
        text: string;
        correct: boolean;
        studentVal: boolean | null;
        correctVal: boolean;
    }[] = [];
    if (q.type === "true_false") {
        const correctTf = q.correctAnswers || [false, false, false, false];
        const studentTf = (chosen as (boolean | null)[]) || [null, null, null, null];
        tfStatusList = q.options.map((opt, i) => ({
            text: opt,
            correct: studentTf[i] === correctTf[i],
            studentVal: studentTf[i] ?? null,
            correctVal: correctTf[i],
        }));
    }

    const displayQuestionText =
        q.type === "true_false" ? cleanTrueFalseQuestionText(q.text) : q.text;

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
        <div className="w-full relative flex flex-col lg:flex-row lg:justify-center lg:items-start gap-6 max-w-7xl mx-auto animate-in fade-in duration-200">
            {/* CENTER COLUMN: Question Box Card & Options */}
            <div className="w-full lg:flex-1 lg:max-w-4xl flex flex-col">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 flex flex-col justify-between">
                    {/* Quiz Review Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5 text-left">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold tracking-wider uppercase bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-md">
                                    Xem bài làm học sinh
                                </span>
                                <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-xl uppercase">
                                    {submission.studentName}
                                </span>
                            </div>
                            <h2 className="text-sm font-bold text-slate-900 mt-2">
                                {submission.quizTitle}
                            </h2>
                        </div>

                        {/* Score Pill */}
                        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border bg-brand-50 border-brand-200 text-brand-700 text-xs font-bold self-start sm:self-auto shadow-3xs">
                            <Crown className="w-4 h-4" />
                            <span>
                                Điểm số: {submission.score} (Đúng {correctCount}/{totalQ})
                            </span>
                        </div>
                    </div>

                    {/* Progress indicator bar */}
                    <div>
                        <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1.5">
                            <span>
                                Đang xem câu {safeIdx + 1} trên {totalQ}
                            </span>
                            <span>
                                Tỷ lệ đúng: {Math.round((correctCount / totalQ) * 100)}%
                            </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
                        <div className={`bg-slate-50/50 border border-slate-200 p-6 rounded-2xl space-y-4 ${cardAccentClass}`}>
                            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-extrabold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-xl">
                                        Câu {safeIdx + 1}
                                    </span>
                                    <span
                                        className={`text-[9px] font-bold px-2 py-0.5 rounded-xl border uppercase ${
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
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-xl border uppercase ${statusBadgeClass}`}>
                                    {statusText}
                                </span>
                            </div>

                            {q.sectionTitle && (
                                <div className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-xl border border-brand-200 inline-block uppercase tracking-wider">
                                    {q.sectionTitle}
                                </div>
                            )}

                            <h3 className="font-semibold text-slate-900 leading-relaxed overflow-x-auto text-[14px] [&_img]:mx-auto [&_img]:block [&_img]:my-4 select-none">
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
                                                const isCorrectOpt = q.correctAnswerIndex === idx;
                                                const cleanedOpt = option.replace(/^\s*[a-f][\)\.\:\-]\s*/i, "");

                                                let borderStyle = "border-slate-200 text-slate-705 bg-white";
                                                let letterCircleStyle = "bg-slate-100 text-slate-500";
                                                let badge = null;

                                                if (isCorrectOpt) {
                                                    borderStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/10";
                                                    letterCircleStyle = "bg-emerald-500 text-white font-medium";
                                                    badge = (
                                                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white font-medium flex items-center justify-center">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                        </div>
                                                    );
                                                } else if (isChosen && !isCorrectOpt) {
                                                    borderStyle = "border-rose-400 bg-rose-50 text-rose-900 ring-2 ring-rose-500/10";
                                                    letterCircleStyle = "bg-rose-500 text-white font-medium";
                                                    badge = (
                                                        <span className="text-[9px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-md">
                                                            Học sinh chọn
                                                        </span>
                                                    );
                                                }

                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`w-full flex items-center justify-between p-4 border rounded-xl text-left font-medium transition-all duration-155 select-none ${borderStyle}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span
                                                                className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] ${letterCircleStyle}`}
                                                            >
                                                                {String.fromCharCode(65 + idx)}
                                                            </span>
                                                            <span
                                                                dangerouslySetInnerHTML={{
                                                                    __html: renderMathHtml(cleanedOpt),
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
                                    const correctTf = q.correctAnswers || [false, false, false, false];
                                    const studentTf = (chosen as (boolean | null)[]) || [null, null, null, null];

                                    return (
                                        <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3 overflow-x-auto">
                                            <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase pb-2 border-b border-slate-200 min-w-[320px]">
                                                <div className="col-span-8 sm:col-span-9">Khẳng định / Nhận định</div>
                                                <div className="col-span-4 sm:col-span-3 text-center">Đáp án & Kết quả</div>
                                            </div>
                                            {q.options.map((option, idx) => {
                                                const currentVal = studentTf[idx];
                                                const correctVal = correctTf[idx];
                                                const isCorrect = currentVal === correctVal;
                                                const cleanedOption = option.replace(/^\s*[a-f][\)\.\:\-]\s*/i, "");

                                                let dungBtnClass = "bg-white border border-slate-200 text-slate-400";
                                                let saiBtnClass = "bg-white border border-slate-200 text-slate-400";

                                                if (currentVal === true) {
                                                    dungBtnClass = isCorrect ? "bg-emerald-500 text-white shadow-xs" : "bg-rose-500 text-white shadow-xs";
                                                } else if (currentVal === false) {
                                                    saiBtnClass = isCorrect ? "bg-emerald-500 text-white shadow-xs" : "bg-rose-500 text-white shadow-xs";
                                                }

                                                if (correctVal === true) {
                                                    dungBtnClass += " ring-2 ring-emerald-500 ring-offset-1 border-emerald-500";
                                                } else {
                                                    saiBtnClass += " ring-2 ring-emerald-500 ring-offset-1 border-emerald-500";
                                                }

                                                return (
                                                    <div
                                                        key={idx}
                                                        className="grid grid-cols-12 items-center gap-2 py-2 border-b border-slate-100 last:border-0 min-w-[320px]"
                                                    >
                                                        <div className="col-span-8 sm:col-span-9 flex gap-2 text-slate-800 [&_img]:mx-auto [&_img]:block [&_img]:my-2 text-xs select-none">
                                                            <span className="font-bold text-slate-500">{String.fromCharCode(97 + idx)})</span>
                                                            <span
                                                                dangerouslySetInnerHTML={{
                                                                    __html: renderMathHtml(cleanedOption),
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="col-span-4 sm:col-span-3 flex justify-center gap-1.5 select-none">
                                                            <span className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold ${dungBtnClass}`}>
                                                                Đúng
                                                            </span>
                                                            <span className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold ${saiBtnClass}`}>
                                                                Sai
                                                            </span>
                                                            <span className="flex items-center ml-1">
                                                                {currentVal === null ? (
                                                                    <span className="text-[8px] text-gray-400 font-bold">Chưa chọn</span>
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

                                    let inputBorderClass = "border-rose-300 bg-rose-50/20 text-rose-900";
                                    if (isCorrect) {
                                        inputBorderClass = "border-emerald-300 bg-emerald-50/20 text-emerald-900";
                                    } else if (textVal === "") {
                                        inputBorderClass = "border-slate-300 bg-slate-50 text-slate-400";
                                    }

                                    return (
                                        <div className="space-y-2 text-left select-none">
                                            <label className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">
                                                Đáp án điền của học sinh:
                                            </label>
                                            <div className="flex flex-col gap-2">
                                                <input
                                                    type="text"
                                                    value={textVal !== "" ? textVal : "(Để trống)"}
                                                    disabled
                                                    className={`w-full px-4 py-3 font-bold rounded-xl ${inputBorderClass} text-xs`}
                                                />
                                                <div className="text-xs text-emerald-700 font-bold mt-1 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    <span>Đáp án chính xác: {q.shortAnswerKey}</span>
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
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs text-left">
                                <div className="flex items-center gap-1.5 text-[#3B6D85] font-extrabold select-none">
                                    <BookOpen className="w-4 h-4 text-[#3B6D85]" />
                                    <span>Lời giải chi tiết:</span>
                                </div>
                                <div
                                    className="text-slate-700 overflow-x-auto leading-relaxed pl-2 border-l-2 border-[#3B6D85]/30 [&_img]:mx-auto [&_img]:block [&_img]:my-4"
                                    dangerouslySetInnerHTML={{
                                        __html: renderMathHtml(q.explanation),
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Quiz Navigation Buttons Row */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 select-none">
                        <button
                            type="button"
                            onClick={() => setAdminReviewQuestionIdx((p) => Math.max(0, p - 1))}
                            disabled={safeIdx === 0}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 border border-gray-100 hover:bg-slate-100 disabled:opacity-40 text-slate-600 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Quay lại</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setAdminReviewQuestionIdx((p) => Math.min(totalQ - 1, p + 1))}
                            disabled={safeIdx === totalQ - 1}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                        >
                            <span>Tiếp theo</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: Questions Tracker & Quick Select Panel */}
            <div className="w-full lg:w-80 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-6 flex flex-col justify-between text-left select-none">
                <div className="space-y-4">
                    <div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Bảng câu hỏi</h3>
                        <p className="text-[10px] text-slate-500 mt-1.5 flex items-center flex-wrap gap-1">
                            <span className="inline-block w-2.5 h-2.5 bg-emerald-250 border border-emerald-350 rounded-sm"></span>
                            <span className="mr-1">Đúng</span>
                            <span className="inline-block w-2.5 h-2.5 bg-amber-250 border border-amber-300 rounded-sm"></span>
                            <span className="mr-1">Đúng 1 phần</span>
                            <span className="inline-block w-2.5 h-2.5 bg-rose-250 border border-rose-350 rounded-sm"></span>
                            <span className="mr-1">Sai</span>
                            <span className="inline-block w-2.5 h-2.5 bg-slate-100 border border-slate-250 rounded-sm"></span>
                            <span>Chưa làm</span>
                        </p>
                    </div>

                    {/* Render Questions grouped by Section */}
                    <div className="space-y-4 overflow-y-auto max-h-[350px] pr-1">
                        {(() => {
                            const sections: Record<string, { qIndex: number; q: any }[]> = {};
                            quiz.questions.forEach((q, idx) => {
                                const secTitle = q.sectionTitle || "Phần câu hỏi";
                                if (!sections[secTitle]) {
                                    sections[secTitle] = [];
                                }
                                sections[secTitle].push({ qIndex: idx, q });
                            });

                            return Object.entries(sections).map(([secTitle, items]) => (
                                <div key={secTitle} className="space-y-2">
                                    <h4 className="text-[10px] font-bold text-brand-605 bg-brand-50/50 px-2 py-1 rounded border border-brand-100/40">
                                        {secTitle}
                                    </h4>
                                    <div className="grid grid-cols-5 gap-2 p-1">
                                        {items.map(({ qIndex, q }) => {
                                            const s = qStatuses[qIndex];
                                            const isCurrent = qIndex === safeIdx;

                                            let btnColorClass = "bg-rose-200 text-rose-900 border-rose-300 hover:bg-rose-300";
                                            if (s === "correct") {
                                                btnColorClass = "bg-emerald-200 text-emerald-900 border-emerald-300 hover:bg-emerald-300";
                                            } else if (s === "partial") {
                                                btnColorClass = "bg-amber-200 text-amber-900 border-amber-300 hover:bg-emerald-300";
                                            } else if (s === "unanswered") {
                                                btnColorClass = "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200";
                                            }

                                            return (
                                                <button
                                                    key={q.id}
                                                    type="button"
                                                    onClick={() => setAdminReviewQuestionIdx(qIndex)}
                                                    className={`w-9 h-9 rounded-lg text-xs font-bold transition-all relative flex items-center justify-center cursor-pointer border ${btnColorClass} ${
                                                        isCurrent ? "ring-2 ring-slate-400 ring-offset-1 border-slate-500 scale-105 shadow-xs z-10" : ""
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
}
