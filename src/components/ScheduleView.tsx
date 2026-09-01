import React, { useState, useEffect } from "react";
import { getSchedule, ScheduleSlot } from "../lib/supabaseService";

const getGradeFromContent = (content: string): string | null => {
    if (!content) return null;
    const clean = content.toLowerCase();
    if (clean.includes("12")) return "12";
    if (clean.includes("11")) return "11";
    if (clean.includes("10")) return "10";
    if (clean.includes("9")) return "9";
    if (clean.includes("8")) return "8";
    return null;
};

const getGridPastelStyles = (grade: string | null): string => {
    if (!grade) return "";
    switch (grade) {
        case "8":
            return "bg-rose-100/60 text-rose-700 dark:bg-rose-500/18 dark:text-rose-300";
        case "9":
            return "bg-purple-100/60 text-purple-700 dark:bg-purple-500/18 dark:text-purple-300";
        case "10":
            return "bg-sky-100/60 text-sky-700 dark:bg-sky-500/18 dark:text-sky-300";
        case "11":
            return "bg-amber-100/60 text-amber-800 dark:bg-amber-500/18 dark:text-amber-300";
        case "12":
            return "bg-emerald-100/60 text-emerald-800 dark:bg-emerald-500/18 dark:text-emerald-300";
        default:
            return "";
    }
};

interface ScheduleViewProps {
    user: any;
    onNavigate: (path: string) => void;
    onOpenContactModal: () => void;
    onOpenBugModal: () => void;
}

export default function ScheduleView({
    user,
    onNavigate,
    onOpenContactModal,
    onOpenBugModal,
}: ScheduleViewProps) {
    const [slots, setSlots] = useState<ScheduleSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"list" | "grid" | "image">("grid"); // Default to grid for clean UI

    useEffect(() => {
        getSchedule().then((res) => {
            setSlots(res);
            setLoading(false);
        });
    }, []);

    const timeRows = [
        "7h15 - 9h00",
        "9h40 - 11h00",
        "13h15 - 15h00",
        "15h40 - 17h00",
        "17h30 - 19h00",
        "19h20 - 21h00",
    ];

    const days = [2, 3, 4, 5, 6, 7, 8];
    const dayLabels: Record<number, string> = {
        2: "Thứ 2",
        3: "Thứ 3",
        4: "Thứ 4",
        5: "Thứ 5",
        6: "Thứ 6",
        7: "Thứ 7",
        8: "Chủ Nhật",
    };

    const getSlot = (
        timeSlot: string,
        dayOfWeek: number,
    ): ScheduleSlot | undefined => {
        return slots.find(
            (s) => s.timeSlot === timeSlot && s.dayOfWeek === dayOfWeek,
        );
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-24 bg-transparent">
                <span className="text-[11px] font-semibold text-slate-400 mt-3">
                    Đang tải lịch học...
                </span>
            </div>
        );
    }

    // Hardcoded settings according to user request (Sentence case, no all-caps)
    const title = "Lịch học năm học 2026 - 2027";
    const subtext = "Môn Toán - Lớp cô Trang (Ms Carlie)";
    const applyDate = "Bắt đầu áp dụng từ 01/07";
    const quote = "Mối tình đẹp nhất là mối tình với tri thức";

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 pb-32 bg-transparent">
            {/* HEADER SECTION - Left-aligned, sentence case */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                        {title}
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                        {subtext}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-855 text-slate-600 dark:text-slate-300 uppercase">
                        {applyDate}
                    </span>

                    {/* Toggle view mode buttons */}
                    <div className="inline-flex bg-slate-100 dark:bg-slate-855 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none active:outline-none border-0 border-transparent select-none ${
                                viewMode === "grid"
                                    ? "bg-white dark:bg-slate-900 text-slate-855 dark:text-slate-100 shadow-2xs"
                                    : "text-slate-400 hover:text-slate-650"
                            }`}
                        >
                            Lưới thời khoá biểu
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none active:outline-none border-0 border-transparent select-none ${
                                viewMode === "list"
                                    ? "bg-white dark:bg-slate-900 text-slate-855 dark:text-slate-100 shadow-2xs"
                                    : "text-slate-400 hover:text-slate-650"
                            }`}
                        >
                            Theo ngày
                        </button>
                        <button
                            onClick={() => setViewMode("image")}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none active:outline-none border-0 border-transparent select-none ${
                                viewMode === "image"
                                    ? "bg-white dark:bg-slate-900 text-slate-855 dark:text-slate-100 shadow-2xs"
                                    : "text-slate-400 hover:text-slate-650"
                            }`}
                        >
                            Ảnh
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === "list" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-6 sm:gap-x-4">
                    {days.map((day) => {
                        const daySlots = timeRows
                            .map((time) => ({ time, slot: getSlot(time, day) }))
                            .filter((item) => item.slot && item.slot.content);

                        return (
                            <div
                                key={day}
                                className="py-4 px-5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
                            >
                                <div>
                                    <div className="pb-2 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                                        <h3 className="text-xs font-black text-slate-855 dark:text-slate-200 uppercase tracking-wider font-sans">
                                            {dayLabels[day]}
                                        </h3>
                                        <span className="text-[9px] font-bold text-[#4B726B] uppercase">
                                            {daySlots.length} buổi học
                                        </span>
                                    </div>

                                    <div className="pt-3.5 space-y-3">
                                        {daySlots.length === 0 ? (
                                            <p className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
                                                Không có lịch học
                                            </p>
                                        ) : (
                                            daySlots.map(({ time, slot }) => {
                                                return (
                                                    <div
                                                        key={time}
                                                        className="flex items-center justify-between gap-3 text-xs"
                                                    >
                                                        <span className="text-slate-600 dark:text-slate-300 font-bold">
                                                            {time}
                                                        </span>
                                                        <span className="font-bold text-slate-700 dark:text-slate-200">
                                                            {slot?.content}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : viewMode === "grid" ? (
                /* VIEW MODE: TABLE GRID (Clean Flat Table, transparent background, outer border, rounded corners) */
                <div className="overflow-x-auto bg-transparent border border-slate-300 dark:border-slate-800 shadow-3xs">
                    <table className="w-full min-w-[850px] border-collapse text-center table-fixed">
                        <thead>
                            <tr className="border-b border-slate-300 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 text-[11px] font-bold text-slate-455 uppercase">
                                <th className="py-3.5 px-4 w-[130px] border-r border-slate-200/60 dark:border-slate-800/60">
                                    Khung giờ
                                </th>
                                {days.map((day) => (
                                    <th
                                        key={day}
                                        className="py-3.5 px-4 w-[12.5%] font-bold text-slate-700 dark:text-slate-355 border-r border-slate-200/60 dark:border-slate-800/60 last:border-0"
                                    >
                                        {dayLabels[day]}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {timeRows.map((timeRow) => (
                                <tr
                                    key={timeRow}
                                    className="border-b border-slate-200 dark:border-slate-800 last:border-0"
                                >
                                    <td className="py-4 px-3 text-[11px] font-bold text-slate-600 dark:text-slate-300 border-r border-slate-200/60 dark:border-slate-800/60 bg-slate-50/10 dark:bg-slate-900/10">
                                        {timeRow}
                                    </td>
                                    {days.map((day) => {
                                        const slot = getSlot(timeRow, day);
                                        const grade =
                                            slot && slot.content
                                                ? getGradeFromContent(
                                                      slot.content,
                                                  )
                                                : null;
                                        const pastelClass =
                                            getGridPastelStyles(grade);
                                        return (
                                            <td
                                                key={day}
                                                className={`p-0 border-r border-slate-200/50 dark:border-slate-800/50 last:border-0 align-middle ${pastelClass || "text-slate-855 dark:text-slate-200"}`}
                                            >
                                                {slot && slot.content ? (
                                                    <div className="py-4 px-2 text-xs font-bold text-center">
                                                        {slot.content}
                                                    </div>
                                                ) : (
                                                    <div className="py-4 text-slate-200 dark:text-slate-800 select-none">
                                                        -
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* VIEW MODE: IMAGE */
                <div className="flex justify-center w-full">
                    <img
                        src="/lich/1.jpeg"
                        alt="Ảnh Lịch học"
                        className="w-full max-w-none"
                    />
                </div>
            )}

            {/* THREE-COLUMN LAYOUT: CONTACT & SOCIALS (LEFT) | QUOTE (CENTER) | INTERNAL LINKS (RIGHT) */}
            {/* Using grid-cols-3 to ensure the middle quote column is mathematically and visually centered */}
            <div className="pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                {/* Left Column: Contact info & Socials */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                            Liên hệ Cô Trang
                        </h4>
                        <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                            <div>
                                <span>
                                    Địa chỉ: Hẻm 111 Phùng Hưng, PleiKu, Gia Lai
                                </span>
                            </div>
                            <div>
                                <span>Điện thoại: </span>
                                <a
                                    href="tel:0914765601"
                                    className="hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline text-slate-555 dark:text-slate-400"
                                >
                                    0914 765 601
                                </a>
                            </div>
                            <div>
                                <span>Email: </span>
                                <a
                                    href="mailto:ismethanhtung@gmail.com"
                                    className="hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline text-slate-555 dark:text-slate-400"
                                >
                                    ismethanhtung@gmail.com
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Social links block exactly like footer column 1 */}
                    <div className="flex items-center gap-2.5 pt-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                        <a
                            href="https://zalo.me/0914765601"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline text-slate-400 dark:text-slate-500"
                        >
                            Zalo
                        </a>
                        <span>&bull;</span>
                        <a
                            href="https://www.facebook.com/nguyen.trang.724265"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline text-slate-400 dark:text-slate-500"
                        >
                            Facebook
                        </a>
                        <span>&bull;</span>
                        <a
                            href="https://m.me/nguyen.trang.724265"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline text-slate-400 dark:text-slate-500"
                        >
                            Messenger
                        </a>
                    </div>
                </div>

                {/* Center Column: Quote - aligned perfectly centered visually */}
                <div className="flex items-center justify-center text-center md:h-full py-4 md:py-6">
                    <p className="text-xs sm:text-sm italic text-slate-550 dark:text-slate-455 font-medium leading-relaxed max-w-xs inline-flex items-center justify-center gap-1.5 flex-wrap">
                        <span>"{quote}</span>
                        <img
                            src="/icons/sakura.png"
                            alt=""
                            className="w-3.5 h-3.5 object-contain inline-block"
                        />
                        <span>"</span>
                    </p>
                </div>

                {/* Right Column: Internal Links (Right-aligned, no self Lịch học link) */}
                <div className="flex flex-col md:items-end md:text-right space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                        Liên kết
                    </h4>
                    <div className="flex flex-col md:items-end gap-2.5 text-xs font-semibold">
                        <button
                            onClick={() => onNavigate("/")}
                            className="text-slate-500 dark:text-slate-400 hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline cursor-pointer text-left md:text-right border-0 bg-transparent p-0 outline-none"
                        >
                            Trang chủ
                        </button>

                        {user && (
                            <button
                                onClick={() => onNavigate("/leaderboard")}
                                className="text-slate-500 dark:text-slate-400 hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline cursor-pointer text-left md:text-right border-0 bg-transparent p-0 outline-none"
                            >
                                Bảng xếp hạng
                            </button>
                        )}

                        <button
                            onClick={onOpenContactModal}
                            className="text-slate-500 dark:text-slate-400 hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline cursor-pointer text-left md:text-right border-0 bg-transparent p-0 outline-none"
                        >
                            Đăng ký học cô Trang
                        </button>

                        <button
                            onClick={onOpenBugModal}
                            className="text-slate-500 dark:text-slate-400 hover:text-brand-500 dark:hover:text-brand-300 transition-colors hover:underline cursor-pointer text-left md:text-right border-0 bg-transparent p-0 outline-none"
                        >
                            Báo lỗi hệ thống
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
