import React, { useState, useEffect } from "react";
import {
    getSchedule,
    updateSchedule,
    ScheduleSlot,
} from "../lib/supabaseService";
import { RotateCcw, AlertTriangle, Check, X, RefreshCw } from "lucide-react";

export default function AdminScheduleTab() {
    const [slots, setSlots] = useState<ScheduleSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Selected cell for edit popover
    const [editingCell, setEditingCell] = useState<{
        timeSlot: string;
        dayOfWeek: number;
        content: string;
    } | null>(null);

    const fetchScheduleData = () => {
        setLoading(true);
        getSchedule().then((res) => {
            setSlots(res);
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchScheduleData();
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

    const handleCellClick = (timeSlot: string, dayOfWeek: number) => {
        if (saving) return; // Prevent editing while saving
        const slot = getSlot(timeSlot, dayOfWeek);
        setEditingCell({
            timeSlot,
            dayOfWeek,
            content: slot ? slot.content || "" : "",
        });
    };

    const handleSaveCell = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCell) return;

        // Find or create slot index
        const updatedSlots = [...slots];
        const existingIdx = updatedSlots.findIndex(
            (s) =>
                s.timeSlot === editingCell.timeSlot &&
                s.dayOfWeek === editingCell.dayOfWeek,
        );

        const rowIdx = timeRows.indexOf(editingCell.timeSlot);
        const colIdx = days.indexOf(editingCell.dayOfWeek);
        const slotId = `slot_${rowIdx}_${colIdx}`;

        const newSlot: ScheduleSlot = {
            id: slotId,
            timeSlot: editingCell.timeSlot,
            dayOfWeek: editingCell.dayOfWeek,
            content: editingCell.content.trim(),
        };

        if (existingIdx > -1) {
            updatedSlots[existingIdx] = newSlot;
        } else {
            updatedSlots.push(newSlot);
        }

        // Close editor first and start saving immediately
        setEditingCell(null);
        setSaving(true);

        try {
            // Optimistic update
            setSlots(updatedSlots);
            await updateSchedule(updatedSlots);
        } catch (err: any) {
            alert("Lỗi khi cập nhật lịch học: " + err.message);
            // Revert state by fetching fresh data
            fetchScheduleData();
        } finally {
            setSaving(false);
        }
    };

    const handleResetToDefault = async () => {
        if (
            !window.confirm(
                "Bạn có chắc chắn muốn đặt lại lịch học về mặc định ban đầu không? Mọi thay đổi hiện tại sẽ bị xóa.",
            )
        ) {
            return;
        }
        setSaving(true);
        try {
            const defaultSlots: ScheduleSlot[] = [];
            const contents: Record<string, Record<number, string>> = {
                "7h15 - 9h00": {
                    3: "8 buổi 1",
                    5: "8 buổi 2",
                    7: "8 buổi 3",
                },
                "9h40 - 11h00": {
                    2: "10 buổi 1",
                    3: "10 buổi 1",
                    4: "10 buổi 2",
                    5: "10 buổi 2",
                    6: "10 buổi 3",
                    7: "10 buổi 3",
                },
                "15h40 - 17h00": {
                    2: "11 buổi 1",
                    3: "11 buổi 1",
                    4: "11 buổi 2",
                    5: "11 buổi 2",
                    6: "11 buổi 3",
                    7: "11 buổi 3",
                },
                "17h30 - 19h00": {
                    2: "12 buổi 1",
                    3: "12 buổi 1",
                    4: "12 buổi 2",
                    5: "12 buổi 2",
                    6: "12 buổi 3",
                    7: "12 buổi 3",
                },
                "19h20 - 21h00": {
                    2: "9 buổi 1",
                    3: "9 buổi 1",
                    4: "9 buổi 2",
                    5: "9 buổi 2",
                    6: "9 buổi 3",
                    7: "9 buổi 3",
                },
            };

            for (let rowIdx = 0; rowIdx < timeRows.length; rowIdx++) {
                const ts = timeRows[rowIdx];
                for (let colIdx = 0; colIdx < days.length; colIdx++) {
                    const day = days[colIdx];
                    let contentVal = "";

                    if (contents[ts] && contents[ts][day]) {
                        contentVal = contents[ts][day];
                    }

                    defaultSlots.push({
                        id: `slot_${rowIdx}_${colIdx}`,
                        timeSlot: ts,
                        dayOfWeek: day,
                        content: contentVal,
                    });
                }
            }

            await updateSchedule(defaultSlots);
            alert("Đặt lại lịch học mặc định thành công!");
            fetchScheduleData();
        } catch (err: any) {
            alert("Lỗi khi đặt lại: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const getCellColorClass = (content: string) => {
        if (content) {
            return "bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 font-bold";
        }
        return "bg-transparent text-slate-350 border-slate-200 border-dashed hover:border-slate-350 dark:border-slate-800/80";
    };

    if (loading) {
        return (
            <div className="py-24 text-center">
                <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
                <p className="text-xs text-slate-500 mt-2 font-medium">
                    Đang tải lịch học...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-200 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        Quản Lý Lịch Học
                        {saving && (
                            <RefreshCw className="w-4 h-4 text-brand-500 animate-spin" />
                        )}
                    </h2>
                    <p className="text-xs text-slate-400 dark:text-slate-505 mt-0.5 font-medium">
                        Cập nhật các lớp học trên thời khóa biểu. Các thông tin
                        tiêu đề, địa chỉ được thiết lập mặc định trong mã nguồn.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleResetToDefault}
                        disabled={saving}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Đặt lại mặc định
                    </button>
                </div>
            </div>

            {/* Timetable Interactive Grid */}
            <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-slate-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium italic">
                        Nhấp vào một ô trên thời khóa biểu bên dưới để cập nhật
                        nội dung.
                    </span>
                </div>

                <div className="overflow-x-auto border border-slate-150 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
                    <table className="w-full min-w-[800px] border-collapse text-center">
                        <thead>
                            <tr className="bg-slate-50/40 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-xs">
                                <th className="py-3 px-4 w-[120px] font-bold text-slate-505">
                                    Khung giờ
                                </th>
                                {days.map((day) => (
                                    <th
                                        key={day}
                                        className="py-3 px-4 font-bold text-[#8B7355] dark:text-[#8B7355] uppercase"
                                    >
                                        {dayLabels[day]}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {timeRows.map((timeRow) => (
                                <tr
                                    key={timeRow}
                                    className="border-b border-slate-100 dark:border-slate-900/50"
                                >
                                    <td className="py-4 px-3 bg-[#FCFAF7] dark:bg-slate-900/40 text-[11px] font-black text-slate-700 dark:text-slate-350 font-mono border-r border-slate-150 dark:border-slate-850">
                                        {timeRow}
                                    </td>
                                    {days.map((day) => {
                                        const slot = getSlot(timeRow, day);
                                        return (
                                            <td
                                                key={day}
                                                className="p-1 border-r border-slate-100 dark:border-slate-900/50"
                                            >
                                                <button
                                                    onClick={() =>
                                                        handleCellClick(
                                                            timeRow,
                                                            day,
                                                        )
                                                    }
                                                    disabled={saving}
                                                    className={`w-full py-3 px-2 rounded-xl transition-all flex flex-col items-center justify-center text-center cursor-pointer border ${getCellColorClass(slot ? slot.content : "")} ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                                                >
                                                    {slot && slot.content ? (
                                                        <span className="font-bold tracking-tight line-clamp-2">
                                                            {slot.content}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-semibold opacity-30 hover:opacity-100">
                                                            + Đặt lớp
                                                        </span>
                                                    )}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL POP OVER: Cell Editor */}
            {editingCell && (
                <div className="fixed inset-0 bg-slate-950/25 backdrop-blur-xs flex items-center justify-center z-[100] animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-slate-150 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 relative">
                        {/* Close button */}
                        <button
                            type="button"
                            onClick={() => setEditingCell(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="space-y-1 text-left">
                            <h3 className="text-sm font-black text-slate-850">
                                Cập nhật lịch học ô
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                {dayLabels[editingCell.dayOfWeek]} • Khung giờ:{" "}
                                {editingCell.timeSlot}
                            </p>
                        </div>

                        <form
                            onSubmit={handleSaveCell}
                            className="space-y-4 text-left"
                        >
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-455 uppercase">
                                    Nội dung lớp học
                                </label>
                                <input
                                    type="text"
                                    value={editingCell.content}
                                    onChange={(e) =>
                                        setEditingCell({
                                            ...editingCell,
                                            content: e.target.value,
                                        })
                                    }
                                    placeholder="Ví dụ: 8 buổi 1, Lớp VIP 9..."
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none bg-slate-50/20"
                                    autoFocus
                                />
                            </div>

                            <div className="pt-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingCell(null)}
                                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    Cập nhật ô
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
