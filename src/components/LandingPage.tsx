import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface LandingPageProps {
    onOpenAuth: (mode?: "login" | "register") => void;
}

const words = ["tư duy", "tốc độ", "kỹ năng"];

export default function LandingPage({ onOpenAuth }: LandingPageProps) {
    const [wordIdx, setWordIdx] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setWordIdx((prev) => (prev + 1) % words.length);
        }, 2200);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full min-h-screen bg-slate-50 text-slate-900 dark:bg-bg-base dark:text-slate-100 font-sans antialiased overflow-x-hidden">

            {/* ─── HERO ─────────────────────────────────────────── */}
            <section className="relative min-h-screen flex flex-col items-center justify-center py-16 sm:py-24 overflow-hidden">

                {/* Soft ambient glow */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute -top-32 right-0 w-[600px] h-[600px] rounded-full opacity-[0.18] dark:opacity-[0.08]"
                    style={{
                        background:
                            "radial-gradient(circle at 70% 30%, #88BDA4 0%, transparent 70%)",
                    }}
                />

                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

                    {/* LEFT — Typography */}
                    <motion.div
                        className="lg:col-span-7 flex flex-col gap-6 sm:gap-8"
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {/* Main heading — editorial mix with dynamic cycling word */}
                        <h1 className="text-[2.6rem] sm:text-[3.4rem] lg:text-[3.8rem] leading-[1.08] tracking-tight font-sans">
                            <span className="font-black text-slate-900 dark:text-slate-100">
                                Rèn luyện
                            </span>
                            <br />
                            <span className="inline-flex items-baseline">
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={words[wordIdx]}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.25, ease: "easeInOut" }}
                                        className="font-serif italic font-normal text-brand-600 dark:text-brand-300 inline-block mr-2"
                                    >
                                        {words[wordIdx]},
                                    </motion.span>
                                </AnimatePresence>
                                <span className="font-black text-slate-900 dark:text-slate-100">
                                    bứt phá
                                </span>
                            </span>
                            <br />
                            <span className="font-black text-slate-900 dark:text-slate-100">
                                điểm số.
                            </span>
                        </h1>

                        {/* Descriptor */}
                        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed max-w-md font-medium">
                            Học tập trực tuyến chuyên sâu môn Toán. Hệ thống đề thi phong phú, đánh giá năng lực thời gian thực và lộ trình tối ưu điểm số.
                        </p>
                    </motion.div>

                    {/* RIGHT — Teacher photo (Circular) */}
                    <motion.div
                        className="lg:col-span-5 flex justify-center lg:justify-end"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="w-56 h-56 sm:w-72 sm:h-72 lg:w-80 lg:h-80 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl">
                            <img
                                src="/images/trang.jpg"
                                alt="Cô Huyền Trang"
                                className="w-full h-full object-cover object-top"
                            />
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ─── CTA BOTTOM ───────────────────────────────────── */}
            <section className="bg-slate-900 dark:bg-slate-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
                    <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto">
                        
                        {/* Text Content Only, Centered */}
                        <motion.div
                            className="flex flex-col gap-4 items-center"
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.55 }}
                        >
                            <h2 className="text-3xl sm:text-4xl font-sans tracking-tight text-white leading-tight">
                                <span className="font-black">Đối thủ của bạn đang cày đề,</span>
                                <br />
                                <span className="font-serif italic font-normal text-brand-300">
                                    còn bạn đang làm gì?
                                </span>
                            </h2>
                            <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-xl">
                                Tham gia học tập và rèn luyện cùng lớp Toán Cô Trang ngay hôm nay
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

        </div>
    );
}
