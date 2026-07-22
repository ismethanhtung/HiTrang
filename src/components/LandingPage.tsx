import React from "react";
import { Quiz } from "../types";
import {
    Sparkles,
    ArrowRight,
    Zap,
    Clock,
    BookOpen,
    CheckCircle2,
} from "lucide-react";

interface LandingPageProps {
    quizzes: Quiz[];
    selectedGrade: string | null;
    onSelectGrade: (grade: string | null) => void;
    onOpenAuth: (mode?: "login" | "register") => void;
    onSelectQuizToPreview: (quiz: Quiz) => void;
}

export default function LandingPage({
    quizzes,
    selectedGrade,
    onSelectGrade,
    onOpenAuth,
    onSelectQuizToPreview,
}: LandingPageProps) {
    // Filter quizzes by selected grade if any
    const filteredQuizzes = selectedGrade
        ? quizzes.filter(
              (q) =>
                  q.grade === selectedGrade ||
                  q.title.includes(`Lớp ${selectedGrade}`),
          )
        : quizzes;

    return (
        <div className="w-full min-h-screen bg-[#F9F8F6] text-[#222B38] font-sans antialiased overflow-x-hidden">
            {/* HERO SECTION - 100% MATCH TO DESIGN SCREENSHOT */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 md:pt-20 md:pb-24">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                    {/* LEFT HERO TEXT & BUTTONS */}
                    <div className="lg:col-span-7 space-y-8 text-left">
                        {/* MAIN EDITORIAL HEADLINE WITH RED OVAL CIRCLE HIGHLIGHT */}
                        <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-normal text-[#233142] leading-[1.1] tracking-tight">
                            Học Tập Cho <br />
                            <span className="relative inline-block my-1 font-serif italic font-normal text-[#1E3046]">
                                {/* HAND-DRAWN RED OVAL RING SVG */}
                                <svg
                                    className="absolute -top-3 -left-4 w-[118%] h-[175%] pointer-events-none text-rose-500 overflow-visible"
                                    viewBox="0 0 200 80"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M10,40 C10,15 90,5 185,25 C205,35 195,65 110,75 C25,85 5,60 25,35 C40,20 120,8 180,20"
                                        stroke="currentColor"
                                        strokeWidth="3.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="animate-pulse"
                                    />
                                </svg>
                                Học Viên
                            </span>{" "}
                            Muốn <br />
                            Bứt Phá Điểm Số
                        </h1>

                        {/* CALL TO ACTION BUTTONS (DARK TEAL PILL & CYAN PILL) */}
                        <div className="flex flex-wrap items-center gap-4 pt-2">
                            <button
                                onClick={() => onOpenAuth("register")}
                                className="px-8 py-3.5 bg-[#2B5467] hover:bg-[#204252] text-white text-sm font-semibold rounded-full shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-98"
                            >
                                Đăng Ký Học Ngay
                            </button>
                            <button
                                onClick={() => {
                                    const grid =
                                        document.getElementById(
                                            "public-quiz-grid",
                                        );
                                    grid?.scrollIntoView({
                                        behavior: "smooth",
                                    });
                                }}
                                className="px-8 py-3.5 bg-[#4BA8CD] hover:bg-[#3d92b4] text-white text-sm font-semibold rounded-full shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-98"
                            >
                                Khám Phá Đề Thi
                            </button>
                        </div>
                    </div>

                    {/* RIGHT HERO GRAPHIC (CIRCULAR PORTRAIT + BLUE LIGHTNING BOLT) */}
                    <div className="lg:col-span-5 flex justify-center relative">
                        <div className="relative w-72 h-72 sm:w-96 sm:h-96">
                            {/* CIRCULAR AVATAR CONTAINER */}
                            <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-2xl relative z-10 bg-amber-50">
                                <img
                                    src="public/images/trang.jpg"
                                    alt="HiTrang Student Avatar"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* SUB-HERO TAGLINE SECTION (BOTTOM LEFT + RIGHT RED LIGHTNING BOLT QUOTE) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-16 md:pt-24 border-t border-slate-200/80 items-start">
                    {/* BOTTOM LEFT TITLE */}
                    <div className="md:col-span-6 text-left">
                        <h2 className="text-2xl sm:text-4xl font-serif font-normal text-[#233142] leading-snug">
                            Nơi Kiến Thức Nâng Tầm{" "}
                            <br className="hidden sm:inline" /> Kết Quả Học Tập.
                        </h2>
                    </div>

                    {/* BOTTOM RIGHT RED LIGHTNING BOLT + PARAGRAPH */}
                    <div className="md:col-span-6 flex items-start gap-4 text-left">
                        <p className="text-xs sm:text-base text-slate-600 font-normal leading-relaxed italic">
                            🌸 Học tập không chỉ là lý thuyết - mà là rèn luyện
                            tư duy, giải nhanh đề thi, bứt phá điểm số và làm
                            chủ kiến thức cùng HiTrang.
                        </p>
                    </div>
                </div>
            </section>

            {/* PUBLIC QUIZZES CATALOG & GRADE SELECTION GRID */}
            <section
                id="public-quiz-grid"
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-white border-t border-slate-200"
            >
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                    <div>
                        {/*<span className="text-xs font-bold uppercase tracking-wider text-[#4BA8CD] bg-[#4BA8CD]/10 px-3 py-1 rounded-full">
                            Kho Đề Thi Mới Nhất
                        </span>*/}
                        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#233142] mt-3">
                            {selectedGrade
                                ? `Đề Thi Thử Lớp ${selectedGrade}`
                                : "Toàn Bộ Đề Thi Thử Đầy Đủ Các Lớp"}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Chọn môn học và làm bài ngay để đánh giá chính xác
                            năng lực bản thân.
                        </p>
                    </div>

                    {/* GRADE FILTER TAB BAR */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                        <button
                            onClick={() => onSelectGrade(null)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                selectedGrade === null
                                    ? "bg-[#2B5467] text-white shadow-xs"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                        >
                            Tất cả
                        </button>
                        {["8", "9", "10", "11", "12"].map((g) => (
                            <button
                                key={g}
                                onClick={() => onSelectGrade(g)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                    selectedGrade === g
                                        ? "bg-[#2B5467] text-white shadow-xs"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                            >
                                Lớp {g}
                            </button>
                        ))}
                    </div>
                </div>

                {/* QUIZZES CARD GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuizzes.length === 0 ? (
                        <div className="col-span-full py-16 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                            <p className="text-sm font-semibold">
                                Chưa có đề thi nào cho danh mục này.
                            </p>
                        </div>
                    ) : (
                        filteredQuizzes.map((quiz) => (
                            <div
                                key={quiz.id}
                                className="bg-[#F9F8F6] border border-slate-200 hover:border-[#4BA8CD]/60 rounded-2xl p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 group"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2B5467]/10 text-[#2B5467] px-2.5 py-1 rounded-md">
                                            {quiz.subject}
                                        </span>
                                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            {quiz.duration} phút
                                        </span>
                                    </div>

                                    <h3 className="text-base font-bold text-[#233142] group-hover:text-[#4BA8CD] transition-colors line-clamp-2">
                                        {quiz.title}
                                    </h3>

                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                        {quiz.description}
                                    </p>
                                </div>

                                <div className="pt-6 mt-4 border-t border-slate-200/60 flex items-center justify-between">
                                    <span className="text-xs text-slate-600 font-semibold">
                                        {quiz.questions.length} câu hỏi trắc
                                        nghiệm
                                    </span>
                                    <button
                                        onClick={() =>
                                            onSelectQuizToPreview(quiz)
                                        }
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2B5467] hover:bg-[#204252] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
                                    >
                                        <span>Thi thử ngay</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}
