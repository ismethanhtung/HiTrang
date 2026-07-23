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
} from "lucide-react";
import { Quiz, Question, Submission, User } from "../types";
import { renderMathHtml } from "../lib/math";

interface StudentDashboardProps {
    user: User;
    quizzes: Quiz[];
    submissions: Submission[];
    onAddSubmission: (newSub: Submission) => void;
    activeTab: string;
}

export default function StudentDashboard({
    user,
    quizzes,
    submissions,
    onAddSubmission,
    activeTab,
}: StudentDashboardProps) {
    // Quiz Active State
    const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<
        Record<string, any>
    >({});
    const [timeLeft, setTimeLeft] = useState(0); // in seconds
    const [quizTimerActive, setQuizTimerActive] = useState(false);

    // Result Overview State
    const [showResultSummary, setShowResultSummary] =
        useState<Submission | null>(null);

    // Detailed Review State
    const [reviewSubmission, setReviewSubmission] = useState<Submission | null>(null);

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
        setActiveQuiz(quiz);
        setCurrentQuestionIdx(0);
        setSelectedAnswers({});
        setTimeLeft(quiz.duration * 60);
        setQuizTimerActive(true);
        setShowResultSummary(null);
        setReviewSubmission(null);
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
                const correctTf = q.correctAnswers || [false, false, false, false];
                const studentTf = chosen as (boolean | null)[];
                
                let matchCount = 0;
                for (let i = 0; i < 4; i++) {
                    if (studentTf[i] !== undefined && studentTf[i] === correctTf[i]) {
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
                const correctKey = (q.shortAnswerKey || "").trim().toLowerCase();
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
        };

        onAddSubmission(newSubmission);
        setShowResultSummary(newSubmission);
        setActiveQuiz(null);
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
        <div className="flex-1 overflow-y-auto bg-bg-base dark:bg-bg-base text-text-primary min-h-screen transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* DETAILED SUBMISSION REVIEW SCREEN */}
                {reviewSubmission ? (
                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Review Header */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <span className="text-[10px] font-bold bg-brand-100 text-brand-600 px-2.5 py-1 rounded-md tracking-wider uppercase">
                                    Chi tiết bài thi
                                </span>
                                <h2 className="text-sm font-bold text-slate-900 mt-2">
                                    {reviewSubmission.quizTitle}
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">
                                    Nộp lúc: {reviewSubmission.submittedAt}
                                </p>
                            </div>
                            <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between border-t sm:border-t-0 pt-3 sm:pt-0">
                                <div className="text-left sm:text-right">
                                    <span className="text-2xl font-extrabold text-brand-600 block">
                                        {reviewSubmission.score} / 10
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase">Điểm số</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setReviewSubmission(null)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                >
                                    Quay lại
                                </button>
                            </div>
                        </div>

                        {/* Question Reviews */}
                        <div className="space-y-6">
                            {(() => {
                                const quiz = quizzes.find(q => q.id === reviewSubmission.quizId);
                                if (!quiz) {
                                    return (
                                        <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center text-gray-400 italic">
                                            Không tìm thấy dữ liệu đề thi tương ứng.
                                        </div>
                                    );
                                }
                                return quiz.questions.map((q, qIndex) => {
                                    const chosen = reviewSubmission.answers[q.id];
                                    
                                    // Determine grading accuracy
                                    let isQCorrect = false;
                                    let tfStatusList: { text: string; correct: boolean; studentVal: boolean | null; correctVal: boolean }[] = [];
                                    
                                    if (!q.type || q.type === 'single_choice') {
                                        isQCorrect = chosen !== undefined && chosen === q.correctAnswerIndex;
                                    } else if (q.type === 'true_false') {
                                        const correctTf = q.correctAnswers || [false, false, false, false];
                                        const studentTf = (chosen as boolean[]) || [false, false, false, false];
                                        isQCorrect = true;
                                        tfStatusList = q.options.map((opt, oIdx) => {
                                            const sVal = studentTf[oIdx];
                                            const cVal = correctTf[oIdx];
                                            const match = sVal === cVal;
                                            if (!match) isQCorrect = false;
                                            return {
                                                text: opt,
                                                correct: match,
                                                studentVal: sVal,
                                                correctVal: cVal
                                            };
                                        });
                                    } else if (q.type === 'short_answer') {
                                        const cKey = (q.shortAnswerKey || "").trim().toLowerCase();
                                        const sKey = String(chosen || "").trim().toLowerCase();
                                        isQCorrect = cKey && sKey === cKey;
                                    }

                                    return (
                                        <div key={q.id} className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-2xs">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-extrabold text-brand-700 bg-brand-100 px-2.5 py-0.5 rounded-md">
                                                        Câu {qIndex + 1}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${
                                                        q.type === "true_false"
                                                            ? "bg-amber-50 text-amber-800 border-amber-200"
                                                            : q.type === "short_answer"
                                                            ? "bg-purple-50 text-purple-800 border-purple-200"
                                                            : "bg-sky-50 text-sky-800 border-sky-200"
                                                    }`}>
                                                        {q.type === "true_false"
                                                            ? "Đúng / Sai"
                                                            : q.type === "short_answer"
                                                            ? "Điền đáp án"
                                                            : "Trắc nghiệm"}
                                                    </span>
                                                </div>
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                                                    isQCorrect 
                                                        ? "bg-emerald-50 text-emerald-700" 
                                                        : q.type === 'true_false'
                                                        ? "bg-amber-50 text-amber-700"
                                                        : "bg-rose-50 text-rose-700"
                                                }`}>
                                                    {isQCorrect 
                                                        ? "Đúng hoàn toàn" 
                                                        : q.type === 'true_false'
                                                        ? "Đúng một phần"
                                                        : "Sai"}
                                                </span>
                                            </div>

                                            {/* Question text with math equations / images / tables */}
                                            <div 
                                                className="text-xs font-semibold text-slate-800 leading-relaxed overflow-x-auto" 
                                                dangerouslySetInnerHTML={{ __html: renderMathHtml(q.text) }} 
                                            />

                                            {/* 1. Single Choice Options Review */}
                                            {(!q.type || q.type === 'single_choice') && (
                                                <div className="space-y-2">
                                                    {q.options.map((opt, oIdx) => {
                                                        const isChosen = chosen === oIdx;
                                                        const isCorrectOpt = q.correctAnswerIndex === oIdx;
                                                        
                                                        let cardStyle = "border-slate-200 text-slate-700";
                                                        let badge = null;
                                                        
                                                        if (isCorrectOpt) {
                                                            cardStyle = "border-emerald-300 bg-emerald-50/20 text-emerald-800";
                                                            badge = <span className="text-[9px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded ml-auto">Đáp án đúng</span>;
                                                        } else if (isChosen && !isCorrectOpt) {
                                                            cardStyle = "border-rose-300 bg-rose-50/20 text-rose-800";
                                                            badge = <span className="text-[9px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded ml-auto">Lựa chọn của bạn</span>;
                                                        } else if (isChosen) {
                                                            badge = <span className="text-[9px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded ml-auto">Lựa chọn của bạn</span>;
                                                        }

                                                        return (
                                                            <div key={oIdx} className={`flex items-center gap-3 p-3 border rounded-xl text-xs font-medium ${cardStyle}`}>
                                                                <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                                                                    isCorrectOpt ? "bg-emerald-500 text-white" : isChosen ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500"
                                                                }`}>
                                                                    {String.fromCharCode(65 + oIdx)}
                                                                </span>
                                                                <span dangerouslySetInnerHTML={{ __html: renderMathHtml(opt) }} />
                                                                {badge}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* 2. True/False Statement Grid Review */}
                                            {q.type === 'true_false' && (
                                                <div className="space-y-3">
                                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs space-y-2">
                                                        <div className="grid grid-cols-12 font-bold text-slate-500 border-b border-slate-200/60 pb-1.5 mb-1.5">
                                                            <div className="col-span-8">Nhận định</div>
                                                            <div className="col-span-2 text-center">Bạn chọn</div>
                                                            <div className="col-span-2 text-center">Đáp án</div>
                                                        </div>
                                                        {tfStatusList.map((item, oIdx) => {
                                                            const sText = item.studentVal === null ? "Chưa chọn" : item.studentVal ? "Đúng" : "Sai";
                                                            const cText = item.correctVal ? "Đúng" : "Sai";
                                                            return (
                                                                <div key={oIdx} className="grid grid-cols-12 items-center py-1.5 border-b border-slate-100 last:border-0">
                                                                    <div className="col-span-8 font-medium text-slate-800 flex gap-2">
                                                                        <span className="font-extrabold text-slate-500">{String.fromCharCode(97 + oIdx)})</span>
                                                                        <span dangerouslySetInnerHTML={{ __html: renderMathHtml(item.text) }} />
                                                                    </div>
                                                                    <div className={`col-span-2 text-center font-bold ${
                                                                        item.correct ? "text-emerald-600" : "text-rose-600"
                                                                    }`}>
                                                                        {sText}
                                                                    </div>
                                                                    <div className="col-span-2 text-center font-bold text-emerald-600">
                                                                        {cText}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 3. Short Answer Review */}
                                            {q.type === 'short_answer' && (
                                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-slate-500">Đáp án của bạn:</span>
                                                        <span className={`font-extrabold px-3 py-1 rounded-lg ${
                                                            isQCorrect ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                                        }`}>
                                                            {chosen !== undefined ? String(chosen) : "(Để trống)"}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-slate-500">Đáp án đúng:</span>
                                                        <span className="font-extrabold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg">
                                                            {q.shortAnswerKey}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Rich HTML Explanation */}
                                            {q.explanation && (
                                                <div className="bg-amber-50/20 border border-amber-200/50 rounded-2xl p-4 text-xs space-y-2">
                                                    <div className="flex items-center gap-1.5 text-amber-700 font-extrabold">
                                                        <BookOpen className="w-4 h-4 text-amber-600" />
                                                        <span>Lời giải chi tiết:</span>
                                                    </div>
                                                    <div className="text-amber-950 overflow-x-auto leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMathHtml(q.explanation) }} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                ) : activeQuiz ? (
                    /* ACTIVE QUIZ PLAYER VIEW */
                    <motion.div
                        initial={{ opacity: 0, scale: 0.99 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-3xl mx-auto bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
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
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border ${
                                    timeLeft < 60
                                        ? "bg-rose-50 border-rose-100 text-rose-600 animate-pulse"
                                        : "bg-brand-50 border-brand-200 text-brand-700"
                                } text-xs font-bold self-start sm:self-auto`}
                            >
                                <Clock className="w-4.5 h-4.5" />
                                <span>Thời gian: {formatTime(timeLeft)}</span>
                            </div>
                        </div>

                        {/* Questions tracker progress bar */}
                        <div>
                            <div className="flex justify-between text-[11px] font-semibold text-gray-400 mb-1.5">
                                <span>
                                    Câu hỏi {currentQuestionIdx + 1} trên{" "}
                                    {activeQuiz.questions.length}
                                </span>
                                <span>
                                    Tiến độ:{" "}
                                    {Math.round(
                                        ((currentQuestionIdx + 1) /
                                            activeQuiz.questions.length) *
                                            100,
                                    )}
                                    %
                                </span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-brand-300 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${((currentQuestionIdx + 1) / activeQuiz.questions.length) * 100}%`,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Question Box Card */}
                        <div className="bg-bg-base dark:bg-bg-card border border-border-primary dark:border-slate-800 p-6 rounded-2xl space-y-5">
                            <h3 className="text-xs font-semibold text-slate-900 leading-relaxed overflow-x-auto">
                                <span className="text-brand-600 font-bold mr-1">
                                    Câu {currentQuestionIdx + 1}:
                                </span>
                                <span dangerouslySetInnerHTML={{ __html: renderMathHtml(activeQuiz.questions[currentQuestionIdx].text) }} />
                            </h3>

                            {/* Options rendering depending on type */}
                            {(() => {
                                const q = activeQuiz.questions[currentQuestionIdx];
                                const qId = q.id;
                                
                                if (!q.type || q.type === 'single_choice') {
                                    return (
                                        <div className="space-y-3">
                                            {q.options.map((option, idx) => {
                                                const isSelected = selectedAnswers[qId] === idx;
                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        id={`btn-option-${idx}`}
                                                        onClick={() =>
                                                            setSelectedAnswers({
                                                                ...selectedAnswers,
                                                                [qId]: idx,
                                                            })
                                                        }
                                                        className={`w-full flex items-center justify-between p-4 bg-white border rounded-xl text-left text-xs font-medium transition-all duration-150 cursor-pointer ${
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
                                                                {String.fromCharCode(65 + idx)}
                                                            </span>
                                                            <span dangerouslySetInnerHTML={{ __html: renderMathHtml(option) }} />
                                                        </div>
                                                        {isSelected && (
                                                            <div className="w-5 h-5 rounded-full bg-brand-300 text-white font-medium flex items-center justify-center animate-scale-in">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                } else if (q.type === 'true_false') {
                                    const tfAnswers = (selectedAnswers[qId] as boolean[]) || [false, false, false, false];
                                    return (
                                        <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-3 overflow-x-auto">
                                            <div className="grid grid-cols-12 text-[10px] font-bold text-gray-400 uppercase pb-2 border-b border-slate-200 min-w-[320px]">
                                                <div className="col-span-8 sm:col-span-9">Khẳng định / Nhận định</div>
                                                <div className="col-span-4 sm:col-span-3 text-center">Lựa chọn của bạn</div>
                                            </div>
                                            {q.options.map((option, idx) => {
                                                const hasAnswer = selectedAnswers[qId] !== undefined;
                                                const currentVal = tfAnswers[idx];
                                                return (
                                                    <div key={idx} className="grid grid-cols-12 items-center gap-2 py-2 border-b border-slate-100 last:border-0 min-w-[320px]">
                                                        <div className="col-span-8 sm:col-span-9 flex gap-2 text-xs text-slate-800">
                                                            <span className="font-bold text-slate-500">{String.fromCharCode(97 + idx)})</span>
                                                            <span dangerouslySetInnerHTML={{ __html: renderMathHtml(option) }} />
                                                        </div>
                                                        <div className="col-span-4 sm:col-span-3 flex justify-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const updated = [...tfAnswers];
                                                                    updated[idx] = true;
                                                                    setSelectedAnswers({
                                                                        ...selectedAnswers,
                                                                        [qId]: updated
                                                                    });
                                                                }}
                                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                                                                    hasAnswer && currentVal === true
                                                                        ? "bg-emerald-500 text-white shadow-sm"
                                                                        : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                                                                }`}
                                                            >
                                                                Đúng
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const updated = [...tfAnswers];
                                                                    updated[idx] = false;
                                                                    setSelectedAnswers({
                                                                        ...selectedAnswers,
                                                                        [qId]: updated
                                                                    });
                                                                }}
                                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                                                                    hasAnswer && currentVal === false
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
                                } else if (q.type === 'short_answer') {
                                    const textVal = (selectedAnswers[qId] as string) || "";
                                    return (
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">
                                                Nhập đáp án ngắn của bạn:
                                            </label>
                                            <input
                                                type="text"
                                                value={textVal}
                                                onChange={(e) =>
                                                    setSelectedAnswers({
                                                        ...selectedAnswers,
                                                        [qId]: e.target.value
                                                    })
                                                }
                                                placeholder="Ví dụ: 150, 24, 2.05, -3..."
                                                className="w-full px-4 py-3 bg-slate-50 border border-purple-200 hover:border-purple-300 focus:border-purple-500 focus:bg-white text-xs font-bold text-slate-900 rounded-xl focus:outline-none transition-all placeholder:text-slate-400"
                                            />
                                        </div>
                                    );
                                }
                                return null;
                            })()}
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
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 border border-gray-100 hover:bg-slate-100 disabled:opacity-40 text-slate-600 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span>Quay lại</span>
                            </button>

                            {currentQuestionIdx < activeQuiz.questions.length - 1 ? (
                                <button
                                    type="button"
                                    id="btn-next-question"
                                    onClick={() =>
                                        setCurrentQuestionIdx(
                                            (prev) => prev + 1,
                                        )
                                    }
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                                >
                                    <span>Tiếp theo</span>
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    id="btn-submit-active-quiz"
                                    onClick={() => handleQuizSubmit()}
                                    className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-brand-300 to-brand-400 text-white font-medium hover:opacity-95 shadow-xs transition-all text-xs font-bold rounded-xl shadow-xs transition-all animate-pulse cursor-pointer"
                                >
                                    <span>Nộp bài kiểm tra</span>
                                    <CheckCircle2 className="w-4.5 h-4.5" />
                                </button>
                            )}
                        </div>
                    </motion.div>
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
                                Kết quả bài thi đã được đồng bộ lên học bạ điện tử của giáo viên.
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
                                            Hôm nay là ngày tuyệt vời để nâng cao điểm số. Hãy kiểm tra các đề thi thử mới cập nhật trong tuần này nhé!
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
                                                    Không có bài ôn tập khả dụng.
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
                                                            onClick={() => setReviewSubmission(sub)}
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
                                                    Bạn chưa tham gia bài kiểm tra nào.
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
                                        Chọn một trong các đề dưới đây để bắt đầu thời gian tính giờ thi.
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
                                        Lịch sử toàn bộ các đề trắc nghiệm bạn đã tham gia (Bấm để xem chi tiết đáp án & lời giải).
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
                                                                onClick={() => setReviewSubmission(sub)}
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
                                            Chưa ghi nhận thông tin học bạ. Hãy làm đề thi thử đầu tiên để ghi nhận kết quả nhé!
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
