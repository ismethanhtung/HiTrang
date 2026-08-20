import React, { useState, useEffect } from "react";
import { getSchedule, ScheduleSlot } from "../lib/supabaseService";
import { Phone, MapPin, Facebook, RefreshCw, Calendar, List } from "lucide-react";

interface ScheduleViewProps {
    user: any;
    onNavigate: (path: string) => void;
}

export default function ScheduleView({ user, onNavigate }: ScheduleViewProps) {
    const [slots, setSlots] = useState<ScheduleSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list"); // Default to list cards for clean UI

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

    const getSlot = (timeSlot: string, dayOfWeek: number): ScheduleSlot | undefined => {
        return slots.find((s) => s.timeSlot === timeSlot && s.dayOfWeek === dayOfWeek);
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-24 bg-bg-base dark:bg-slate-950">
                <RefreshCw className="w-6 h-6 text-[#4B726B] animate-spin" />
                <span className="text-[11px] font-semibold text-slate-400 mt-3">Đang tải lịch học...</span>
            </div>
        );
    }

    // Hardcoded settings according to user request
    const title = "LỊCH HỌC NĂM HỌC 2026 - 2027";
    const subtext = "MÔN TOÁN - LỚP CÔ TRANG (MS CARLIE)";
    const applyDate = "BẮT ĐẦU ÁP DỤNG TỪ 01/07";
    const address = "Hẻm 111 Phùng Hưng, PleiKu, Gia Lai";
    const contact = "0914765601";
    const fbLink = "https://www.facebook.com/nguyen.trang.724265";
    const quote = "Mối tình đẹp nhất là mối tình với tri thức";

    return (
        <div className="flex-1 bg-bg-base dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-200">
            <div className="max-w-5xl mx-auto space-y-6">
                
                {/* HEADER SECTION */}
                <div className="text-center space-y-2.5 pb-4 border-b border-border-primary/50">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                        {title}
                    </h1>
                    <p className="text-xs sm:text-sm font-bold text-[#4B726B] dark:text-brand-300 tracking-wide uppercase">
                        {subtext}
                    </p>
                    
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-300 uppercase">
                            {applyDate}
                        </span>
                        
                        {/* Toggle view mode buttons */}
                        <div className="inline-flex bg-slate-100 dark:bg-slate-850 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800">
                            <button
                                onClick={() => setViewMode("list")}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                    viewMode === "list"
                                        ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xs"
                                        : "text-slate-400 hover:text-slate-650"
                                }`}
                            >
                                <List className="w-3 h-3" />
                                Theo ngày
                            </button>
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                    viewMode === "grid"
                                        ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xs"
                                        : "text-slate-400 hover:text-slate-650"
                                }`}
                            >
                                <Calendar className="w-3 h-3" />
                                Lưới thời khoá biểu
                            </button>
                        </div>
                    </div>
                </div>

                {/* VIEW MODE: LIST OF CARDS */}
                {viewMode === "list" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {days.map((day) => {
                            // Find active classes for this day
                            const daySlots = timeRows
                                .map((time) => ({ time, slot: getSlot(time, day) }))
                                .filter((item) => item.slot && item.slot.content);

                            return (
                                <div
                                    key={day}
                                    className="bg-bg-card rounded-2xl p-5 border border-border-primary/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-3"
                                >
                                    <div>
                                        <div className="pb-2.5 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
                                            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 font-sans uppercase">
                                                {dayLabels[day]}
                                            </h3>
                                            <span className="text-[10px] font-bold text-[#4B726B] bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded">
                                                {daySlots.length} buổi học
                                            </span>
                                        </div>

                                        <div className="pt-3 space-y-3">
                                            {daySlots.length === 0 ? (
                                                <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">
                                                    Không có lịch học
                                                </p>
                                            ) : (
                                                daySlots.map(({ time, slot }) => (
                                                    <div
                                                        key={time}
                                                        className="flex items-center justify-between gap-3 text-xs"
                                                    >
                                                        <span className="font-mono font-medium text-slate-450 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-850">
                                                            {time}
                                                        </span>
                                                        <span className="font-bold text-slate-700 dark:text-slate-300 text-right">
                                                            {slot?.content}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* VIEW MODE: TABLE GRID */
                    <div className="bg-bg-card rounded-2xl overflow-hidden border border-border-primary/80 dark:border-slate-800 shadow-2xs">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[850px] border-collapse text-center">
                                <thead>
                                    <tr className="bg-slate-50/40 dark:bg-slate-900/60 border-b border-border-primary/50 text-[11px] font-bold text-slate-450 uppercase">
                                        <th className="py-3 px-4 w-[130px] border-r border-border-primary/20">Khung giờ</th>
                                        {days.map((day) => (
                                            <th key={day} className="py-3 px-4 font-bold text-slate-700 dark:text-slate-350 border-r border-border-primary/20 last:border-0">
                                                {dayLabels[day]}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {timeRows.map((timeRow) => (
                                        <tr key={timeRow} className="border-b border-border-primary/40 dark:border-slate-900/50 last:border-0">
                                            <td className="py-4 px-3 bg-slate-50/20 dark:bg-slate-900/20 text-[11px] font-bold text-slate-505 dark:text-slate-400 border-r border-border-primary/30 dark:border-slate-850 font-mono">
                                                {timeRow}
                                            </td>
                                            {days.map((day) => {
                                                const slot = getSlot(timeRow, day);
                                                return (
                                                    <td key={day} className="p-1 border-r border-border-primary/20 dark:border-slate-900/30 last:border-0">
                                                        {slot && slot.content ? (
                                                            <div className="py-3 px-2 rounded-lg text-xs leading-tight bg-slate-50 dark:bg-slate-900 text-slate-850 dark:text-slate-200 border border-slate-150 dark:border-slate-800/80 font-bold">
                                                                {slot.content}
                                                            </div>
                                                        ) : (
                                                            <div className="py-3 text-slate-200 dark:text-slate-800 select-none">-</div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* CONTACT SECTION CARD */}
                <div className="bg-bg-card rounded-2xl p-5 border border-border-primary/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex flex-col md:flex-row items-center justify-around gap-x-12 gap-y-3.5 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                        <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-[#4B726B] shrink-0" />
                            <span>Địa chỉ: <strong className="text-slate-850 dark:text-slate-100">{address}</strong></span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Phone className="w-4 h-4 text-[#4B726B] shrink-0" />
                            <span>SĐT/Zalo: <a href={`tel:${contact}`} className="underline text-slate-850 dark:text-slate-100 font-bold hover:text-[#4B726B] transition-colors">{contact}</a></span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Facebook className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span>Facebook: <a href={fbLink} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 dark:text-blue-400 hover:text-[#4B726B] transition-colors font-bold">Nguyễn Trang</a></span>
                        </span>
                    </div>
                </div>

                {/* FOOTER QUOTE */}
                <div className="max-w-xl mx-auto text-center py-4 px-6 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/80 rounded-xl">
                    <p className="text-xs sm:text-sm italic text-slate-550 dark:text-slate-400 font-medium">
                        "{quote}"
                    </p>
                </div>

            </div>
        </div>
    );
}
