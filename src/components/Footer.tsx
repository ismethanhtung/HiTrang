import React from "react";

interface FooterProps {
    onSelectGrade: (grade: string | null, category?: string | null) => void;
    onNavigate: (path: string) => void;
    onOpenContactModal: () => void;
    onOpenBugModal: () => void;
    userLoggedIn: boolean;
}

export default function Footer({
    onSelectGrade,
    onNavigate,
    onOpenContactModal,
    onOpenBugModal,
    userLoggedIn,
}: FooterProps) {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-white border-0 transition-colors duration-200 mt-auto select-none">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
                    {/* Column 1: Teacher Contact Info */}
                    <div className="md:col-span-5 space-y-4">
                        <div className="flex items-center gap-2">
                            <img
                                src="/logos/lotus.gif"
                                alt="Logo"
                                className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
                            />
                            <span className="font-calligraphy text-xl text-brand-500 dark:text-brand-300 font-semibold tracking-tight">
                                HiTrang
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed max-w-sm">
                            Luyện đề cùng Cô Huyền Trang. Rèn luyện tư duy, tốc
                            độ, điểm số.
                        </p>

                        <div className="space-y-2.5 pt-2">
                            <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                                Liên hệ Cô Trang
                            </h4>
                            <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                <div>
                                    <span>
                                        Địa chỉ: Hẻm 111 Phùng Hưng, PleiKu, Gia
                                        Lai
                                    </span>
                                </div>
                                <div>
                                    <span>Điện thoại: </span>
                                    <a
                                        href="tel:0914765601"
                                        className="hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline"
                                    >
                                        0914 765 601
                                    </a>
                                </div>
                                <div>
                                    <span>Email: </span>
                                    <a
                                        href="mailto:ismethanhtung@gmail.com"
                                        className="hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline"
                                    >
                                        ismethanhtung@gmail.com
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Social Links (Plain text links instead of buttons with icons) */}
                        <div className="flex items-center gap-2.5 pt-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                            <a
                                href="https://zalo.me/0914765601"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline"
                            >
                                Zalo
                            </a>
                            <span>&bull;</span>
                            <a
                                href="https://www.facebook.com/nguyen.trang.724265"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline"
                            >
                                Facebook
                            </a>
                            <span>&bull;</span>
                            <a
                                href="https://m.me/nguyen.trang.724265"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline"
                            >
                                Messenger
                            </a>
                        </div>
                    </div>

                    {/* Column 2: Classes & Exam Sections */}
                    <div className="md:col-span-4 space-y-4">
                        <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                            Chương trình học
                        </h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <button
                                onClick={() => onSelectGrade("8")}
                                className="text-left hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline cursor-pointer"
                            >
                                Lớp 8
                            </button>
                            <button
                                onClick={() => onSelectGrade("9")}
                                className="text-left hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline cursor-pointer"
                            >
                                Lớp 9
                            </button>
                            <button
                                onClick={() => onSelectGrade("10")}
                                className="text-left hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline cursor-pointer"
                            >
                                Lớp 10
                            </button>
                            <button
                                onClick={() => onSelectGrade("11")}
                                className="text-left hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline cursor-pointer"
                            >
                                Lớp 11
                            </button>
                            <button
                                onClick={() => onSelectGrade("12")}
                                className="text-left hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline cursor-pointer"
                            >
                                Lớp 12
                            </button>
                            <button
                                onClick={() => onSelectGrade("9", "Thi vào 10")}
                                className="text-left text-brand-500 dark:text-brand-300 transition-colors hover:underline cursor-pointer font-bold"
                            >
                                Thi vào 10 🌸
                            </button>
                            <button
                                onClick={() => onSelectGrade("12", "Thi thử")}
                                className="text-left text-brand-500 dark:text-brand-300 transition-colors hover:underline cursor-pointer font-bold col-span-2"
                            >
                                Thi thử TN THPT 🌸
                            </button>
                        </div>
                    </div>

                    {/* Column 3: Links & Support */}
                    <div className="md:col-span-3 space-y-4">
                        <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                            Liên kết
                        </h4>
                        <div className="flex flex-col gap-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <button
                                onClick={() => onNavigate("/")}
                                className="hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline cursor-pointer text-left"
                            >
                                Trang chủ
                            </button>

                            {userLoggedIn && (
                                <button
                                    onClick={() => onNavigate("/leaderboard")}
                                    className="hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline cursor-pointer text-left"
                                >
                                    Bảng xếp hạng
                                </button>
                            )}

                            <button
                                onClick={() => onNavigate("/lich")}
                                className="hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline cursor-pointer text-left"
                            >
                                Lịch học
                            </button>

                            <button
                                onClick={onOpenContactModal}
                                className="hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline cursor-pointer text-left"
                            >
                                Đăng ký học cô Trang
                            </button>

                            <button
                                onClick={onOpenBugModal}
                                className="hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline cursor-pointer text-left"
                            >
                                Báo lỗi hệ thống
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
