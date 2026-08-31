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
            <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 pb-32 sm:pb-40 lg:pb-48 overflow-hidden">
                {/* Soft diffused ambient glow — No sharp boundaries or cropped shapes */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute top-0 right-0 -z-10 w-[450px] h-[450px] bg-brand-200/25 dark:bg-brand-500/5 rounded-full blur-[120px]"
                />

                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
                    {/* LEFT — Typography */}
                    <motion.div
                        className="lg:col-span-7 flex flex-col gap-6 sm:gap-8"
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {/* Main heading — editorial mix with dynamic cycling word in creative Playfair Display font */}
                        <h1 className="text-[2.6rem] sm:text-[3.4rem] lg:text-[4rem] leading-[1.1] tracking-tight font-serif text-slate-900 dark:text-slate-100">
                            <span className="font-bold block">
                                Rèn luyện{" "}
                                <span className="inline-block h-[1.15em] overflow-hidden align-bottom">
                                    <AnimatePresence mode="wait">
                                        <motion.span
                                            key={words[wordIdx]}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            transition={{
                                                duration: 0.25,
                                                ease: "easeInOut",
                                            }}
                                            className="italic font-normal text-brand-600 dark:text-brand-300"
                                        >
                                            {words[wordIdx]},
                                        </motion.span>
                                    </AnimatePresence>
                                </span>
                            </span>
                            <span className="font-bold block mt-1">
                                bứt phá điểm số.
                            </span>
                        </h1>

                        {/* Descriptor */}
                        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed max-w-md font-medium">
                            Học tập trực tuyến chuyên sâu môn Toán. Hệ thống đề
                            thi phong phú, đánh giá năng lực thời gian thực.
                        </p>
                    </motion.div>

                    {/* RIGHT — Teacher photo (Circular) */}
                    <motion.div
                        className="lg:col-span-5 flex justify-center lg:justify-end"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                            duration: 0.7,
                            delay: 0.15,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                    >
                        <div className="w-64 h-64 sm:w-72 sm:h-72 lg:w-96 lg:h-96 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl">
                            <img
                                src="/images/trang2.jpeg"
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
                                <span className="font-black">
                                    Đối thủ của bạn đang cày đề,
                                </span>
                                <br />
                                <span className="font-serif italic font-normal text-brand-300">
                                    còn bạn đang làm gì?
                                </span>
                            </h2>
                            <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-xl">
                                Tham gia học tập và rèn luyện cùng lớp Toán Cô
                                Trang ngay hôm nay
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>
        </div>
    );
}
