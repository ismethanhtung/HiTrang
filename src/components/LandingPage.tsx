import React from "react";
import { motion } from "motion/react";

interface LandingPageProps {
    onOpenAuth: (mode?: "login" | "register") => void;
}

const students = [
    {
        name: "Nguyễn Thanh Phong",
        score: "10.0",
        subject: "Toán",
        achievement: "Thủ khoa khối A1 tỉnh Gia Lai · Đỗ ĐH Ngoại Thương HN",
        quote: "Đối thủ của bạn đang cày đề, còn bạn đang làm gì?",
    },
    {
        name: "Lê Thị Mai Chi",
        score: "9.8",
        subject: "Toán",
        achievement: "Giải Ba HS Giỏi Tỉnh · Đỗ Bách Khoa TP.HCM",
        quote: "Mỗi đề thi là một lần bứt phá — đừng để cơ hội trôi qua.",
    },
    {
        name: "Trần Minh Đức",
        score: "9.6",
        subject: "Toán",
        achievement: "Á khoa khối B · Đỗ ĐH Y Dược TP.HCM",
        quote: "Học đúng phương pháp, không phải học nhiều — đó là bí quyết.",
    },
];

const stats = [
    { value: "500+", label: "Học sinh đang học" },
    { value: "10.0", label: "Điểm cao nhất đạt được" },
    { value: "8→12", label: "Lớp đang giảng dạy" },
];

export default function LandingPage({ onOpenAuth }: LandingPageProps) {
    return (
        <div className="w-full min-h-screen bg-slate-50 text-slate-900 dark:bg-bg-base dark:text-slate-100 font-sans antialiased overflow-x-hidden">

            {/* ─── HERO ─────────────────────────────────────────── */}
            <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">

                {/* Soft ambient glow — không màu mè, chỉ là ánh sáng */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute -top-32 right-0 w-[600px] h-[600px] rounded-full opacity-[0.18] dark:opacity-[0.08]"
                    style={{
                        background:
                            "radial-gradient(circle at 70% 30%, #88BDA4 0%, transparent 70%)",
                    }}
                />

                <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

                    {/* LEFT — Typography */}
                    <motion.div
                        className="flex flex-col gap-8"
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {/* Eyebrow */}
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-500 dark:text-brand-300 flex items-center gap-2">
                            <span className="text-brand-300">✦</span>
                            Lớp Toán Cô Trang · Gia Lai
                        </p>

                        {/* Main heading — editorial mix */}
                        <h1 className="text-[2.6rem] sm:text-[3.4rem] lg:text-[3.8rem] leading-[1.08] tracking-tight font-sans">
                            <span className="font-black text-slate-900 dark:text-slate-100">
                                Rèn luyện
                            </span>
                            <br />
                            <span className="font-serif italic font-normal text-brand-600 dark:text-brand-300">
                                tư duy,
                            </span>
                            <span className="font-black text-slate-900 dark:text-slate-100">
                                {" "}bứt phá
                            </span>
                            <br />
                            <span className="font-black text-slate-900 dark:text-slate-100">
                                điểm số.
                            </span>
                        </h1>

                        {/* Descriptor */}
                        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed max-w-md font-medium">
                            Hơn 500 học sinh đang luyện đề cùng Cô Trang — hệ
                            thống đề thi trực tuyến với đánh giá thời gian thực,
                            bảng xếp hạng và lộ trình học cá nhân hoá.
                        </p>

                        {/* CTA */}
                        <div className="flex items-center gap-4 pt-1">
                            <button
                                onClick={() => onOpenAuth("login")}
                                className="px-7 py-3.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-bold rounded-xl hover:bg-brand-700 dark:hover:bg-brand-200 transition-all duration-200 active:scale-[0.98] cursor-pointer shadow-sm"
                            >
                                Đăng nhập vào học
                            </button>
                            <button
                                onClick={() => onOpenAuth("register")}
                                className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-300 transition-colors underline underline-offset-4 decoration-slate-300 dark:decoration-slate-600 cursor-pointer"
                            >
                                Đăng ký tài khoản
                            </button>
                        </div>
                    </motion.div>

                    {/* RIGHT — Teacher photo */}
                    <motion.div
                        className="flex justify-center lg:justify-end"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="relative">
                            {/* Decorative line frame */}
                            <div
                                aria-hidden
                                className="absolute -top-4 -left-4 w-full h-full border border-brand-200 dark:border-brand-800 rounded-2xl"
                            />

                            <div className="relative w-72 h-96 sm:w-80 sm:h-[26rem] rounded-2xl overflow-hidden shadow-xl dark:shadow-slate-900/60">
                                <img
                                    src="/images/trang.jpg"
                                    alt="Cô Huyền Trang"
                                    className="w-full h-full object-cover"
                                />
                                {/* Gradient overlay bottom */}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />

                                {/* Name card on photo */}
                                <div className="absolute bottom-5 left-5 right-5">
                                    <p className="text-white text-sm font-black tracking-tight">
                                        Cô Huyền Trang
                                    </p>
                                    <p className="text-white/70 text-[11px] font-medium mt-0.5">
                                        Giáo viên Toán · Gia Lai
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Scroll cue */}
                <motion.div
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-slate-400 dark:text-slate-600"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.6 }}
                >
                    <span className="text-[9px] font-bold uppercase tracking-widest">Cuộn xuống</span>
                    <motion.div
                        className="w-px h-8 bg-slate-300 dark:bg-slate-700"
                        animate={{ scaleY: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        style={{ transformOrigin: "top" }}
                    />
                </motion.div>
            </section>

            {/* ─── STATS ────────────────────────────────────────── */}
            <section className="border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-bg-card">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800">
                        {stats.map((stat, i) => (
                            <motion.div
                                key={i}
                                className="flex flex-col items-center justify-center py-10 px-4 gap-1.5 text-center"
                                initial={{ opacity: 0, y: 12 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1, duration: 0.5 }}
                            >
                                <span className="text-3xl sm:text-4xl font-mono font-black text-slate-900 dark:text-slate-100 tracking-tighter">
                                    {stat.value}
                                </span>
                                <span className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    {stat.label}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── STUDENTS ─────────────────────────────────────── */}
            <section className="max-w-6xl mx-auto px-6 py-24 sm:py-32">
                {/* Section header */}
                <motion.div
                    className="mb-16"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-500 dark:text-brand-300 mb-3">
                        ✦ Học sinh tiêu biểu
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-sans tracking-tight">
                        <span className="font-black text-slate-900 dark:text-slate-100">Những học sinh </span>
                        <span className="font-serif italic font-normal text-brand-600 dark:text-brand-300">đã bứt phá</span>
                    </h2>
                </motion.div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                    {students.map((s, i) => (
                        <motion.div
                            key={i}
                            className="group relative pl-5 border-l-2 border-brand-200 dark:border-brand-800 hover:border-brand-500 dark:hover:border-brand-400 transition-colors duration-300 flex flex-col gap-4"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.12, duration: 0.5 }}
                        >
                            {/* Score badge */}
                            <span className="inline-flex items-baseline gap-1 w-fit">
                                <span className="text-4xl font-mono font-black text-slate-900 dark:text-slate-100 leading-none">
                                    {s.score}
                                </span>
                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-0.5">
                                    điểm {s.subject}
                                </span>
                            </span>

                            {/* Name & achievement */}
                            <div>
                                <p className="text-sm font-black text-slate-900 dark:text-slate-100">{s.name}</p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5 leading-relaxed">
                                    {s.achievement}
                                </p>
                            </div>

                            {/* Quote */}
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-4">
                                "{s.quote}"
                            </p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ─── CTA BOTTOM ───────────────────────────────────── */}
            <section className="bg-slate-900 dark:bg-slate-950">
                <div className="max-w-6xl mx-auto px-6 py-20 sm:py-24">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
                        {/* Left */}
                        <motion.div
                            className="flex flex-col gap-4 max-w-xl"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.55 }}
                        >
                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-300">
                                ✦ Sẵn sàng chưa?
                            </p>
                            <h2 className="text-3xl sm:text-4xl font-sans tracking-tight text-white">
                                <span className="font-black">Đối thủ của bạn đang cày đề,</span>
                                <br />
                                <span className="font-serif italic font-normal text-brand-300">
                                    còn bạn đang làm gì?
                                </span>
                            </h2>
                            <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                Tham gia cùng hơn 500 học sinh đang luyện đề mỗi ngày.
                                Đăng ký miễn phí, bắt đầu ngay hôm nay.
                            </p>
                        </motion.div>

                        {/* Right */}
                        <motion.div
                            className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0"
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.55, delay: 0.1 }}
                        >
                            <button
                                onClick={() => onOpenAuth("login")}
                                className="px-8 py-4 bg-white text-slate-900 text-sm font-black rounded-xl hover:bg-brand-100 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                            >
                                Đăng nhập vào học →
                            </button>
                            <a
                                href="https://zalo.me/0914765601"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-8 py-4 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer text-center"
                            >
                                Liên hệ Zalo Cô Trang
                            </a>
                        </motion.div>
                    </div>
                </div>
            </section>

        </div>
    );
}
