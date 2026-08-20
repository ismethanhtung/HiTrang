import React, { useState, useEffect } from "react";
import {
    getSchedule,
    ScheduleSlot,
    ScheduleData,
} from "../lib/supabaseService";
import { Calendar, Phone, MapPin, Facebook, RefreshCw } from "lucide-react";

interface ScheduleViewProps {
    user: any;
    onNavigate: (path: string) => void;
}

export default function ScheduleView({ user, onNavigate }: ScheduleViewProps) {
    const [data, setData] = useState<ScheduleData>({ slots: [], settings: {} });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSchedule().then((res) => {
            setData(res);
            setLoading(false);
        });
    }, []);

    // Color classes mapping matching standard UI style guidelines
    const getColorClasses = (color: string) => {
        switch (color) {
            case "blue":
                return "bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 border border-sky-100 dark:border-sky-900/20 font-bold";
            case "orange":
                return "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/20 font-bold";
            case "green":
                return "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20 font-bold";
            case "gray":
                return "bg-slate-50 dark:bg-slate-800/30 text-slate-650 dark:text-slate-400 border border-slate-100 dark:border-slate-800/35 font-semibold";
            default:
                return "bg-transparent text-slate-400 dark:text-slate-650 border border-transparent";
        }
    };

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
        return data.slots.find(
            (s) => s.timeSlot === timeSlot && s.dayOfWeek === dayOfWeek,
        );
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-24 bg-bg-base dark:bg-slate-950">
                <RefreshCw className="w-6 h-6 text-[#4B726B] animate-spin" />
                <span className="text-[11px] font-semibold text-slate-500 mt-3">
                    Đang tải lịch học...
                </span>
            </div>
        );
    }

    const title =
        data.settings["schedule_title"] || "LỊCH HỌC NĂM HỌC 2026 - 2027";
    const subtext =
        data.settings["schedule_subtext"] ||
        "MÔN TOÁN - LỚP CÔ TRANG (MS CARLIE)";
    const applyDate =
        data.settings["schedule_apply_date"] || "BẮT ĐẦU ÁP DỤNG TỪ 01/07";
    const address = data.settings["schedule_address"] || "Hẻm 111 Phùng Hưng";
    const contact = data.settings["schedule_contact"] || "0914765601";
    const fbLink =
        data.settings["schedule_fb"] ||
        "https://www.facebook.com/nguyen.trang.724265";
    const quote = data.settings["schedule_quote"] || "Mối";

    return (
        <div className="flex-1 bg-bg-base dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-200">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* HEADER SECTION */}
                <div className="text-center space-y-3 pb-2 border-b border-border-primary/50">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
                        {title}
                    </h1>
                    <p className="text-xs sm:text-sm font-bold text-[#4B726B] dark:text-[#4B726B] font-sans tracking-wide uppercase">
                        {subtext}
                    </p>

                    <div className="inline-flex items-center px-3 py-1 bg-slate-100 dark:bg-slate-850 text-slate-650 dark:text-slate-300 rounded-lg text-[10px] font-bold tracking-wider uppercase">
                        {applyDate}
                    </div>
                </div>

                {/* TIMETABLE CARD */}
                <div className="bg-bg-card rounded-2xl overflow-hidden border border-border-primary/80 dark:border-slate-800 shadow-2xs">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[850px] border-collapse text-center">
                            <thead>
                                <tr className="bg-slate-50/40 dark:bg-slate-900/60 border-b border-border-primary/50 text-[11px] font-bold text-slate-450 uppercase">
                                    <th className="py-3 px-4 w-[130px] border-r border-border-primary/20">
                                        Khung giờ
                                    </th>
                                    {days.map((day) => (
                                        <th
                                            key={day}
                                            className="py-3 px-4 font-bold text-slate-700 dark:text-slate-350 border-r border-border-primary/20 last:border-0"
                                        >
                                            {dayLabels[day]}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {/* Part 1: Morning Rows (First 2 slots) */}
                                {timeRows.slice(0, 2).map((timeRow) => (
                                    <tr
                                        key={timeRow}
                                        className="border-b border-border-primary/40 dark:border-slate-900/50"
                                    >
                                        <td className="py-4 px-3 bg-slate-50/20 dark:bg-slate-900/20 text-[11px] font-bold text-slate-500 dark:text-slate-400 border-r border-border-primary/30 dark:border-slate-850 font-mono">
                                            {timeRow}
                                        </td>
                                        {days.map((day) => {
                                            const slot = getSlot(timeRow, day);
                                            return (
                                                <td
                                                    key={day}
                                                    className="p-1 border-r border-border-primary/20 dark:border-slate-900/30 last:border-0"
                                                >
                                                    {slot && slot.content ? (
                                                        <div
                                                            className={`py-3 px-2 rounded-lg text-xs leading-tight transition-colors ${getColorClasses(slot.color)}`}
                                                        >
                                                            {slot.content}
                                                        </div>
                                                    ) : (
                                                        <div className="py-3 text-slate-300 dark:text-slate-700 select-none">
                                                            -
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}

                                {/* MIDDLE ROW: Contact Information */}
                                <tr className="bg-slate-50/30 dark:bg-slate-900/40 border-b border-border-primary/40 dark:border-slate-800">
                                    <td colSpan={8} className="py-4 px-6">
                                        <div className="flex flex-col md:flex-row items-center justify-center gap-x-12 gap-y-3 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                                            <span className="flex items-center gap-1.5">
                                                <MapPin className="w-4 h-4 text-[#4B726B] shrink-0" />
                                                <span>
                                                    Địa chỉ:{" "}
                                                    <strong className="text-slate-850 dark:text-slate-100">
                                                        {address}
                                                    </strong>
                                                </span>
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Phone className="w-4 h-4 text-[#4B726B] shrink-0" />
                                                <span>
                                                    SĐT/Zalo:{" "}
                                                    <a
                                                        href={`tel:${contact}`}
                                                        className="underline text-slate-850 dark:text-slate-100 font-bold hover:text-[#4B726B] transition-colors"
                                                    >
                                                        {contact}
                                                    </a>
                                                </span>
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Facebook className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                                <span>
                                                    Facebook:{" "}
                                                    <a
                                                        href={fbLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="underline text-blue-600 dark:text-blue-400 hover:text-[#4B726B] transition-colors font-bold"
                                                    >
                                                        Nguyễn Trang
                                                    </a>
                                                </span>
                                            </span>
                                        </div>
                                    </td>
                                </tr>

                                {/* Part 2: Afternoon & Evening Rows (Remaining slots) */}
                                {timeRows.slice(2).map((timeRow) => (
                                    <tr
                                        key={timeRow}
                                        className="border-b border-border-primary/40 dark:border-slate-900/50 last:border-0"
                                    >
                                        <td className="py-4 px-3 bg-slate-50/20 dark:bg-slate-900/20 text-[11px] font-bold text-slate-500 dark:text-slate-400 border-r border-border-primary/30 dark:border-slate-850 font-mono">
                                            {timeRow}
                                        </td>
                                        {days.map((day) => {
                                            const slot = getSlot(timeRow, day);
                                            return (
                                                <td
                                                    key={day}
                                                    className="p-1 border-r border-border-primary/20 dark:border-slate-900/30 last:border-0"
                                                >
                                                    {slot && slot.content ? (
                                                        <div
                                                            className={`py-3 px-2 rounded-lg text-xs leading-tight transition-colors ${getColorClasses(slot.color)}`}
                                                        >
                                                            {slot.content}
                                                        </div>
                                                    ) : (
                                                        <div className="py-3 text-slate-300 dark:text-slate-700 select-none">
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
                </div>

                {/* FOOTER QUOTE */}
                <div className="max-w-xl mx-auto text-center py-4 px-6 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/80 rounded-xl">
                    <p className="text-xs sm:text-sm italic text-slate-500 dark:text-slate-400 font-medium">
                        "{quote}"
                    </p>
                </div>
            </div>
        </div>
    );
}
