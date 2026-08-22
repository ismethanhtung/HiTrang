import React from "react";
import { motion } from "motion/react";
import { Quiz } from "../types";
import {
    ArrowRight,
    Clock,
    BookOpen,
    Loader2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

interface LandingPageProps {
    quizzes: Quiz[];
    selectedGrade: string | null;
    onSelectGrade: (grade: string | null) => void;
    onOpenAuth: (mode?: "login" | "register") => void;
    onSelectQuizToPreview: (quiz: Quiz) => void;
    loading?: boolean;
}

export default function LandingPage({
    quizzes,
    selectedGrade,
    onSelectGrade,
    onOpenAuth,
    onSelectQuizToPreview,
    loading,
}: LandingPageProps) {
    const [currentPage, setCurrentPage] = React.useState(1);
    const pageSize = 12;

    // Reset current page when selectedGrade changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [selectedGrade]);

    // Filter quizzes by selected grade if any
    const filteredQuizzes = selectedGrade
        ? quizzes.filter(
              (q) =>
                  q.grade === selectedGrade ||
                  q.title.includes(`Lớp ${selectedGrade}`) ||
                  q.subject.includes(`Lớp ${selectedGrade}`),
          )
        : quizzes;

    const totalPages = Math.ceil(filteredQuizzes.length / pageSize);
    const paginatedQuizzes = filteredQuizzes.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
    );

    const handleScrollToQuizzes = () => {
        const grid = document.getElementById("public-quiz-grid");
        grid?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className="w-full min-h-screen bg-slate-50 text-slate-900 dark:text-slate-100 font-sans antialiased overflow-x-hidden transition-colors duration-200">
            {/* HERO SECTION - MODERN MINIMAL EDITORIAL LAYOUT */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
                    
                    {/* LEFT HERO COLUMN */}
                    <motion.div 
                        className="lg:col-span-7 space-y-8 text-left"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-normal text-slate-900 dark:text-slate-100 leading-[1.15] tracking-tight">
                            Học tập cho <br />
                            học viên muốn <br />
                            <span className="font-serif italic text-brand-600 dark:text-brand-300">
                                bứt phá điểm số
                            </span>
                        </h1>

                        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed font-medium">
                            🌸 Học tập không chỉ là lý thuyết – mà là rèn luyện tư duy, giải nhanh đề thi, bứt phá điểm số và làm chủ kiến thức cùng HiTrang.
                        </p>

                        <div className="flex flex-wrap items-center gap-4 pt-2">
                            <button
                                onClick={() => onOpenAuth("login")}
                                className="px-8 py-3.5 bg-brand-600 hover:bg-brand-700 dark:bg-brand-300 dark:hover:bg-brand-200 text-white dark:text-slate-900 text-xs font-bold rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-xs active:scale-[0.98] cursor-pointer"
                            >
                                Đăng Nhập Vào Học
                            </button>
                            <button
                                onClick={handleScrollToQuizzes}
                                className="px-8 py-3.5 bg-white hover:bg-slate-150 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-xs active:scale-[0.98] cursor-pointer"
                            >
                                Khám Phá Đề Thi
                            </button>
                        </div>
                    </motion.div>

                    {/* RIGHT HERO COLUMN */}
                    <motion.div 
                        className="lg:col-span-5 flex justify-center"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
                    >
                        <div className="relative w-64 h-80 sm:w-72 sm:h-96 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-700/80 shadow-md bg-white dark:bg-slate-800">
                            <img
                                src="/images/trang.jpg"
                                alt="HiTrang Student Avatar"
                                className="w-full h-full object-cover grayscale-[15%] hover:grayscale-0 transition-all duration-500"
                            />
                            {/* Elegant overlay card */}
                            <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md dark:bg-slate-900/95 p-3.5 rounded-xl border border-slate-100 dark:border-slate-850 shadow-sm">
                                <p className="text-xs font-black text-slate-900 dark:text-slate-100">Cô Trang</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">Nơi Kiến Thức Nâng Tầm Kết Quả</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* HONORED HIGH-SCORING STUDENTS SECTION */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-200/50 dark:border-slate-800/50 bg-transparent">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-2xl sm:text-3xl font-serif text-slate-900 dark:text-slate-100 leading-snug">
                        Những gương mặt tiêu biểu <br />
                        đạt điểm cao <span className="font-serif italic text-brand-600 dark:text-brand-300">học cô Trang</span>
                    </h2>
                </div>

                {/* Grid of students without timelines */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        {
                            name: "Nguyễn Thanh Phong",
                            score: "10.0 Điểm môn Toán",
                            desc: "Thủ khoa khối A1 tỉnh Gia Lai, đỗ Đại học Ngoại thương Hà Nội. Học sinh xuất sắc chuyên Toán trường THPT Chuyên Hùng Vương.",
                        },
                        {
                            name: "Lê Thị Mai Chi",
                            score: "9.8 Điểm môn Toán",
                            desc: "Đỗ Đại học Bách Khoa TP.HCM chuyên ngành Khoa học Máy tính. Đạt giải Ba Học sinh Giỏi cấp Tỉnh môn Toán.",
                        },
                        {
                            name: "Trần Minh Đức",
                            score: "9.6 Điểm môn Toán",
                            desc: "Đỗ Đại học Y Dược TP.HCM ngành Y đa khoa. Á khoa tổ hợp khối B trường THPT Chuyên Hùng Vương Gia Lai.",
                        },
                    ].map((student, idx) => (
                        <motion.div
                            key={idx}
                            className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between"
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            whileHover={{ y: -4, shadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
                            transition={{ duration: 0.2 }}
                        >
                            <div>
                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                                    {student.name}
                                </h3>
                                <span className="inline-block text-[10px] font-black uppercase tracking-wider text-brand-600 dark:text-brand-300 bg-brand-50/50 dark:bg-brand-500/10 px-2 py-0.5 rounded-md mt-2">
                                    {student.score}
                                </span>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 leading-relaxed font-medium">
                                    {student.desc}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* PUBLIC QUIZZES CATALOG & GRADE SELECTION GRID */}
            <section
                id="public-quiz-grid"
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-white dark:bg-slate-900 border-t border-slate-200/50 dark:border-slate-800/50"
            >
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-serif font-normal text-slate-900 dark:text-slate-100">
                            {selectedGrade
                                ? `Đề Thi Thử Lớp ${selectedGrade}`
                                : "Toàn Bộ Đề Thi Thử"}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                            Chọn môn học và làm bài ngay để đánh giá chính xác năng lực bản thân.
                        </p>
                    </div>

                    {/* GRADE FILTER TAB BAR */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                        <button
                            onClick={() => onSelectGrade(null)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                selectedGrade === null
                                    ? "bg-brand-600 hover:bg-brand-700 text-white shadow-xs"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
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
                                        ? "bg-brand-600 hover:bg-brand-700 text-white shadow-xs"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                }`}
                            >
                                Lớp {g}
                            </button>
                        ))}
                    </div>
                </div>

                {/* QUIZZES CARD GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-full py-16 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                        </div>
                    ) : filteredQuizzes.length === 0 ? (
                        <div className="col-span-full py-16 text-center text-slate-400 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                            <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                            <p className="text-sm font-semibold">
                                Chưa có đề thi nào cho danh mục này.
                            </p>
                        </div>
                    ) : (
                        paginatedQuizzes.map((quiz) => (
                            <motion.div
                                key={quiz.id}
                                className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs transition-all duration-200 group"
                                whileHover={{ y: -3, shadow: "0 8px 20px -4px rgba(0,0,0,0.04)" }}
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider bg-brand-100/50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 px-2.5 py-1 rounded-md">
                                            {quiz.subject}
                                        </span>
                                        <span className="text-xs text-slate-550 dark:text-slate-400 font-medium flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                            {quiz.duration} phút
                                        </span>
                                    </div>

                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors line-clamp-2 leading-snug">
                                        {quiz.title}
                                    </h3>

                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                        {quiz.description}
                                    </p>
                                </div>

                                <div className="pt-4 mt-4 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                        {quiz.questions.length} câu hỏi
                                    </span>
                                    <button
                                        onClick={() => onSelectQuizToPreview(quiz)}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 dark:bg-brand-300 dark:hover:bg-brand-200 text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
                                    >
                                        <span>Làm bài ngay</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-12 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] text-slate-450 dark:text-slate-400 font-bold">
                            Trang {currentPage} / {totalPages} (Tổng số {filteredQuizzes.length} đề thi)
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => {
                                    setCurrentPage((prev) => prev - 1);
                                    handleScrollToQuizzes();
                                }}
                                className="p-2 border border-slate-200 dark:border-slate-850 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer transition-colors"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 text-slate-650 dark:text-slate-350" />
                            </button>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => {
                                    setCurrentPage((prev) => prev + 1);
                                    handleScrollToQuizzes();
                                }}
                                className="p-2 border border-slate-200 dark:border-slate-850 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer transition-colors"
                            >
                                <ChevronRight className="w-3.5 h-3.5 text-slate-650 dark:text-slate-350" />
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
