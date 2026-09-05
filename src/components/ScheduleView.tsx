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
        <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-12 pb-20 sm:pb-32 bg-transparent">
            {/* HEADER SECTION - Left-aligned, sentence case */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-6 pb-2 sm:pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="text-left hidden sm:block">
                    <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                        {title}
                    </h1>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                        {subtext}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                    <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-md sm:rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-855 text-slate-600 dark:text-slate-300 uppercase self-start sm:self-auto">
                        {applyDate}
                    </span>

                    {/* Toggle view mode buttons */}
                    <div className="grid grid-cols-3 sm:inline-flex w-full sm:w-auto bg-slate-100 dark:bg-slate-855 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none active:outline-none border-0 border-transparent select-none text-center truncate ${
                                viewMode === "grid"
                                    ? "bg-white dark:bg-slate-900 text-slate-855 dark:text-slate-100 shadow-2xs"
                                    : "text-slate-400 hover:text-slate-650"
                            }`}
                        >
                            Lưới TKB
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none active:outline-none border-0 border-transparent select-none text-center truncate ${
                                viewMode === "list"
                                    ? "bg-white dark:bg-slate-900 text-slate-855 dark:text-slate-100 shadow-2xs"
                                    : "text-slate-400 hover:text-slate-650"
                            }`}
                        >
                            Theo ngày
                        </button>
                        <button
                            onClick={() => setViewMode("image")}
                            className={`px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none active:outline-none border-0 border-transparent select-none text-center truncate ${
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 sm:gap-x-4">
                    {days.map((day) => {
                        const daySlots = timeRows
                            .map((time) => ({ time, slot: getSlot(time, day) }))
                            .filter((item) => item.slot && item.slot.content);

                        return (
                            <div
                                key={day}
                                className="p-3.5 sm:p-5 rounded-xl sm:rounded-none border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 sm:bg-transparent dark:bg-slate-850/40 dark:sm:bg-transparent flex flex-col justify-between shadow-2xs sm:shadow-none text-left"
                            >
                                <div>
                                    <div className="pb-2.5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                                        <h3 className="text-xs font-black text-slate-855 dark:text-slate-200 uppercase tracking-wider font-sans">
                                            {dayLabels[day]}
                                        </h3>
                                        <span className="text-[9px] font-bold text-brand-700 dark:text-brand-300 bg-brand-50/90 dark:bg-brand-500/15 px-2 py-0.5 rounded-full uppercase">
                                            {daySlots.length} buổi học
                                        </span>
                                    </div>

                                    <div className="pt-3 space-y-2.5">
                                        {daySlots.length === 0 ? (
                                            <p className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
                                                Không có lịch học
                                            </p>
                                        ) : (
                                            daySlots.map(({ time, slot }) => {
                                                const grade = getGradeFromContent(slot?.content || "");
                                                const pastelClass = getGridPastelStyles(grade);
                                                return (
                                                    <div
                                                        key={time}
                                                        className="flex items-center justify-between gap-2 text-xs py-0.5"
                                                    >
                                                        <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] shrink-0">
                                                            {time}
                                                        </span>
                                                        <span className={`font-black text-[11px] px-2 py-0.5 rounded-md ${pastelClass || "text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800"}`}>
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
                <div className="overflow-x-auto bg-transparent border border-slate-200/80 dark:border-slate-800 rounded-xl sm:rounded-none shadow-3xs">
                    <table className="w-full min-w-[720px] sm:min-w-[850px] border-collapse text-center table-fixed">
                        <thead>
                            <tr className="border-b border-slate-300 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 text-[10px] sm:text-[11px] font-bold text-slate-455 uppercase">
                                <th className="py-2.5 sm:py-3.5 px-2 sm:px-4 w-[110px] sm:w-[130px] border-r border-slate-200/60 dark:border-slate-800/60">
                                    Khung giờ
                                </th>
                                {days.map((day) => (
                                    <th
                                        key={day}
                                        className="py-2.5 sm:py-3.5 px-2 sm:px-4 w-[12.5%] font-bold text-slate-700 dark:text-slate-355 border-r border-slate-200/60 dark:border-slate-800/60 last:border-0"
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
                                    <td className="py-3 sm:py-4 px-2 sm:px-3 text-[10.5px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-300 border-r border-slate-200/60 dark:border-slate-800/60 bg-slate-50/10 dark:bg-slate-900/10">
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
                                                    <div className="py-3 sm:py-4 px-1.5 sm:px-2 text-[11px] sm:text-xs font-bold text-center">
                                                        {slot.content}
                                                    </div>
                                                ) : (
                                                    <div className="py-3 sm:py-4 text-slate-200 dark:text-slate-800 select-none">
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
                <div className="flex justify-center w-full rounded-xl overflow-hidden border border-slate-200/70 dark:border-slate-800">
                    <img
                        src="/lich/1.jpeg"
                        alt="Ảnh Lịch học"
                        className="w-full max-w-4xl h-auto object-contain"
                    />
                </div>
            )}

            {/* THREE-COLUMN LAYOUT: CONTACT & SOCIALS (LEFT) | QUOTE (CENTER) | INTERNAL LINKS (RIGHT) */}
            <div className="pt-6 sm:pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 gap-8 items-center">
                <div className="flex items-center justify-center text-center py-2 sm:py-6">
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
            </div>
        </div>
    );
}
