import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight } from "lucide-react";

interface LandingPageProps {
    onOpenAuth: (mode?: "login" | "register") => void;
    onNavigate?: (path: string) => void;
}

const cyclingWords = ["Tư duy.", "Tốc độ.", "Kiến thức."];

export default function LandingPage({ onOpenAuth }: LandingPageProps) {
    const [wordIdx, setWordIdx] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setWordIdx((prev) => (prev + 1) % cyclingWords.length);
        }, 2600);
        return () => clearInterval(interval);
    }, []);

    const activeWord =
        cyclingWords[wordIdx % cyclingWords.length] || cyclingWords[0];

    return (
        <div className="w-full min-h-screen bg-[#FAF6EE] dark:bg-[#1A2536] text-slate-900 dark:text-slate-100 font-sans antialiased flex flex-col justify-between selection:bg-[#20542E]/20 overflow-x-hidden">
            {/* ─── 1. TOP HEADER BAR (Refined Minimalist Editorial Style) ─── */}
            <header className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-4 sm:py-5 flex items-center justify-between gap-4 border-b border-slate-300/40 dark:border-slate-800/60">
                {/* Left: Brand Logo + Name */}
                <div className="flex items-center gap-2 group select-none">
                    <img
                        src="/logos/lotus.gif"
                        alt="HiTrang Logo"
                        className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                    />
                    <span className="font-calligraphy text-xl sm:text-2xl text-brand-600 dark:text-brand-300 font-semibold tracking-tight leading-none">
                        HiTrang
                    </span>
                </div>

                {/* Right: Login Trigger */}
                <button
                    type="button"
                    onClick={() => onOpenAuth("login")}
                    className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 hover:underline flex items-center gap-1.5 transition-all cursor-pointer"
                >
                    <span>ĐĂNG NHẬP</span>
                </button>
            </header>

            {/* ─── 2. MAIN HERO SECTION (Editorial Serif + Full-Size Teacher Portrait) ─── */}
            <main className="flex-1 flex flex-col justify-center max-w-7xl mx-auto w-full px-6 sm:px-10 lg:px-12 py-12 sm:py-16 lg:py-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
                    {/* LEFT: Typography & Description */}
                    <motion.div
                        className="lg:col-span-7 flex flex-col gap-5 sm:gap-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {/* Giant Serif Title with Cycling Words & Dot */}
                        <div className="h-16 sm:h-24 lg:h-28 flex items-center relative overflow-visible">
                            <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-[76px] font-serif italic text-slate-900 dark:text-slate-100 tracking-tight leading-tight whitespace-nowrap">
                                <AnimatePresence mode="popLayout">
                                    <motion.span
                                        key={wordIdx % cyclingWords.length}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{
                                            duration: 0.4,
                                            ease: [0.16, 1, 0.3, 1],
                                        }}
                                        className="inline-block font-normal select-none"
                                    >
                                        {activeWord}
                                    </motion.span>
                                </AnimatePresence>
                            </h1>
                        </div>

                        {/* Description Prompt */}
                        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-lg">
                            Rèn luyện chuyên sâu môn Toán, đánh giá năng lực với
                            đề thi phong phú.
                        </p>
                    </motion.div>

                    {/* RIGHT: Full-Size Circular Teacher Portrait */}
                    <motion.div
                        className="lg:col-span-5 flex justify-center lg:justify-end"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                            duration: 0.7,
                            delay: 0.1,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                    >
                        <div
                            onClick={() => onOpenAuth("login")}
                            className="w-64 h-64 sm:w-72 sm:h-72 lg:w-96 lg:h-96 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl shadow-slate-300/40 dark:shadow-none cursor-pointer group transition-all duration-300 hover:scale-[1.02]"
                            title="Nhấn để đăng nhập vào lớp học"
                        >
                            <img
                                src="/images/trang2.jpeg"
                                alt="Cô Huyền Trang"
                                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 ease-out"
                            />
                        </div>
                    </motion.div>
                </div>
            </main>

            {/* ─── 3. SUBTLE QUOTE FOOTER ─── */}
            <section className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 pb-12 sm:pb-16 pt-4">
                <div className="pt-8 border-t border-slate-300/40 dark:border-slate-800/60 flex flex-col items-center text-center gap-2 max-w-3xl mx-auto">
                    <p className="font-serif italic text-xl sm:text-2xl lg:text-3xl text-slate-800 dark:text-slate-200 tracking-tight">
                        &ldquo;Đối thủ của bạn đang cày đề, còn bạn đang làm
                        gì?&rdquo;
                    </p>
                    <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-medium font-mono">
                        Toán Cô Trang · Tư duy · Tốc độ · Kiến thức
                    </p>
                </div>
            </section>
        </div>
    );
}
