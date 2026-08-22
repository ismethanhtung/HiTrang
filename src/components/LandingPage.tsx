import React from "react";
import { motion } from "motion/react";

interface LandingPageProps {
    onOpenAuth: (mode?: "login" | "register") => void;
}

export default function LandingPage({ onOpenAuth }: LandingPageProps) {
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

                {/* Grid of students */}
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
        </div>
    );
}
