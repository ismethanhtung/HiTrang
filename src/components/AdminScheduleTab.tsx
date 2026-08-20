import React, { useState, useEffect } from "react";
import {
    getSchedule,
    updateSchedule,
    updateSystemSettings,
    ScheduleSlot,
    ScheduleData,
} from "../lib/supabaseService";
import {
    Save,
    RotateCcw,
    AlertTriangle,
    Check,
    X,
    RefreshCw,
} from "lucide-react";

export default function AdminScheduleTab() {
    const [data, setData] = useState<ScheduleData>({ slots: [], settings: {} });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Selected cell for edit popover
    const [editingCell, setEditingCell] = useState<{
        timeSlot: string;
        dayOfWeek: number;
        content: string;
        color: string;
    } | null>(null);

    // Form states for settings
    const [settingsForm, setSettingsForm] = useState<Record<string, string>>(
        {},
    );

    const fetchScheduleData = () => {
        setLoading(true);
        getSchedule().then((res) => {
            setData(res);
            setSettingsForm(res.settings);
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
        return data.slots.find(
            (s) => s.timeSlot === timeSlot && s.dayOfWeek === dayOfWeek,
        );
    };

    const handleCellClick = (timeSlot: string, dayOfWeek: number) => {
        const slot = getSlot(timeSlot, dayOfWeek);
        setEditingCell({
            timeSlot,
            dayOfWeek,
            content: slot ? slot.content || "" : "",
            color: slot ? slot.color || "" : "",
        });
    };

    const handleSaveCell = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCell) return;

        // Find or create slot index
        const updatedSlots = [...data.slots];
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
            color: editingCell.color,
        };

        if (existingIdx > -1) {
            updatedSlots[existingIdx] = newSlot;
        } else {
            updatedSlots.push(newSlot);
        }

        setData({ ...data, slots: updatedSlots });
        setEditingCell(null);
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            // Update slots
            await updateSchedule(data.slots);
            // Update settings
            await updateSystemSettings(settingsForm);
            alert("Lưu lịch học và cấu hình thành công!");
            fetchScheduleData();
        } catch (err: any) {
            alert("Lỗi khi lưu dữ liệu: " + err.message);
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
            // Seed defaults again by sending blank arrays or calling reset trigger if we want.
            // Since we generated stable IDs, we can just send the default list directly or delete them.
            // Let's call a reset by rebuilding default lists:
            const defaultSettings = {
                schedule_title: "LỊCH HỌC NĂM HỌC 2026 - 2027",
                schedule_subtext: "MÔN TOÁN - LỚP CÔ TRANG (MS CARLIE)",
                schedule_apply_date: "BẮT ĐẦU ÁP DỤNG TỪ 01/07",
                schedule_address: "Hẻm 111 Phùng Hưng",
                schedule_contact: "0914765601",
                schedule_fb: "https://www.facebook.com/nguyen.trang.724265",
                schedule_quote: "Mối",
            };

            const defaultSlots: ScheduleSlot[] = [];
            const contents: Record<
                string,
                Record<number, { content: string; color: string }>
            > = {
                "7h15 - 9h00": {
                    3: { content: "8 buổi 1", color: "blue" },
                    5: { content: "8 buổi 2", color: "blue" },
                    7: { content: "8 buổi 3", color: "blue" },
                },
                "9h40 - 11h00": {
                    2: { content: "10 buổi 1", color: "orange" },
                    3: { content: "10 buổi 1", color: "orange" },
                    4: { content: "10 buổi 2", color: "orange" },
                    5: { content: "10 buổi 2", color: "orange" },
                    6: { content: "10 buổi 3", color: "orange" },
                    7: { content: "10 buổi 3", color: "orange" },
                },
                "15h40 - 17h00": {
                    2: { content: "11 buổi 1", color: "green" },
                    3: { content: "11 buổi 1", color: "green" },
                    4: { content: "11 buổi 2", color: "green" },
                    5: { content: "11 buổi 2", color: "green" },
                    6: { content: "11 buổi 3", color: "green" },
                    7: { content: "11 buổi 3", color: "green" },
                },
                "17h30 - 19h00": {
                    2: { content: "12 buổi 1", color: "orange" },
                    3: { content: "12 buổi 1", color: "orange" },
                    4: { content: "12 buổi 2", color: "orange" },
                    5: { content: "12 buổi 2", color: "orange" },
                    6: { content: "12 buổi 3", color: "orange" },
                    7: { content: "12 buổi 3", color: "orange" },
                },
                "19h20 - 21h00": {
                    2: { content: "9 buổi 1", color: "blue" },
                    3: { content: "9 buổi 1", color: "blue" },
                    4: { content: "9 buổi 2", Color: "blue" },
                    5: { content: "9 buổi 2", Color: "blue" },
                    6: { content: "9 buổi 3", Color: "blue" },
                    7: { content: "9 buổi 3", Color: "blue" },
                } as any,
            };

            for (let rowIdx = 0; rowIdx < timeRows.length; rowIdx++) {
                const ts = timeRows[rowIdx];
                for (let colIdx = 0; colIdx < days.length; colIdx++) {
                    const day = days[colIdx];
                    let contentVal = "";
                    let colorVal = "";

                    if (contents[ts] && contents[ts][day]) {
                        contentVal = contents[ts][day].content;
                        colorVal = contents[ts][day].color;
                    }

                    defaultSlots.push({
                        id: `slot_${rowIdx}_${colIdx}`,
                        timeSlot: ts,
                        dayOfWeek: day,
                        content: contentVal,
                        color: colorVal,
                    });
                }
            }

            await updateSchedule(defaultSlots);
            await updateSystemSettings(defaultSettings);
            alert("Đặt lại lịch học mặc định thành công!");
            fetchScheduleData();
        } catch (err: any) {
            alert("Lỗi khi đặt lại: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Color definitions
    const colorsList = [
        { key: "", name: "Trống", bgClass: "bg-white border-slate-200" },
        {
            key: "blue",
            name: "Xanh dương",
            bgClass: "bg-[#E0F2FE] text-[#0369A1]",
        },
        { key: "orange", name: "Cam", bgClass: "bg-[#FFEDD5] text-[#C2410C]" },
        {
            key: "green",
            name: "Xanh lá",
            bgClass: "bg-[#D1FAE5] text-[#047857]",
        },
        { key: "gray", name: "Xám", bgClass: "bg-[#F1F5F9] text-[#475569]" },
    ];

    const getCellColorClass = (color: string) => {
        switch (color) {
            case "blue":
                return "bg-[#E0F2FE]/50 text-[#0369A1] font-bold border-sky-100";
            case "orange":
                return "bg-[#FFEDD5]/50 text-[#C2410C] font-bold border-amber-100";
            case "green":
                return "bg-[#D1FAE5]/50 text-[#047857] font-bold border-emerald-100";
            case "gray":
                return "bg-[#F1F5F9]/60 text-[#475569] font-medium border-slate-100";
            default:
                return "bg-transparent text-slate-350 border-slate-100 border-dashed hover:border-slate-300";
        }
    };

    if (loading) {
        return (
            <div className="py-24 text-center">
                <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
                <p className="text-xs text-slate-500 mt-2 font-medium">
                    Đang tải lịch học và cấu hình...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-200 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                        Quản Lý Lịch Học
                    </h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                        Cập nhật nội dung các buổi học, phân biệt màu sắc và cấu
                        hình thông tin hiển thị.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleResetToDefault}
                        disabled={saving}
                        className="px-3.5 py-1.8 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Đặt lại mặc định
                    </button>
                    <button
                        onClick={handleSaveAll}
                        disabled={saving}
                        className="px-4 py-1.8 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                        <Save className="w-3.5 h-3.5" />
                        Lưu toàn bộ
                    </button>
                </div>
            </div>

            {/* Timetable Configuration Forms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-2xl space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                        Cấu hình tiêu đề lịch
                    </h3>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-450 uppercase">
                                Tiêu đề chính
                            </label>
                            <input
                                type="text"
                                value={settingsForm["schedule_title"] || ""}
                                onChange={(e) =>
                                    setSettingsForm({
                                        ...settingsForm,
                                        schedule_title: e.target.value,
                                    })
                                }
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none bg-slate-50/20"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-450 uppercase">
                                Mô tả phụ
                            </label>
                            <input
                                type="text"
                                value={settingsForm["schedule_subtext"] || ""}
                                onChange={(e) =>
                                    setSettingsForm({
                                        ...settingsForm,
                                        schedule_subtext: e.target.value,
                                    })
                                }
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none bg-slate-50/20"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-450 uppercase">
                                Thời gian áp dụng
                            </label>
                            <input
                                type="text"
                                value={
                                    settingsForm["schedule_apply_date"] || ""
                                }
                                onChange={(e) =>
                                    setSettingsForm({
                                        ...settingsForm,
                                        schedule_apply_date: e.target.value,
                                    })
                                }
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none bg-slate-50/20"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-2xl space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                        Thông tin liên hệ & Quote
                    </h3>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-450 uppercase">
                                Địa chỉ
                            </label>
                            <input
                                type="text"
                                value={settingsForm["schedule_address"] || ""}
                                onChange={(e) =>
                                    setSettingsForm({
                                        ...settingsForm,
                                        schedule_address: e.target.value,
                                    })
                                }
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none bg-slate-50/20"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-450 uppercase">
                                Số điện thoại liên hệ
                            </label>
                            <input
                                type="text"
                                value={settingsForm["schedule_contact"] || ""}
                                onChange={(e) =>
                                    setSettingsForm({
                                        ...settingsForm,
                                        schedule_contact: e.target.value,
                                    })
                                }
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none bg-slate-50/20"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-450 uppercase">
                                Link Facebook
                            </label>
                            <input
                                type="text"
                                value={settingsForm["schedule_fb"] || ""}
                                onChange={(e) =>
                                    setSettingsForm({
                                        ...settingsForm,
                                        schedule_fb: e.target.value,
                                    })
                                }
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none bg-slate-50/20"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Timetable Interactive Grid */}
            <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-slate-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium italic">
                        Nhấp vào một ô trên thời khóa biểu bên dưới để cập nhật
                        nội dung và màu sắc.
                    </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
                    <table className="w-full min-w-[800px] border-collapse text-center">
                        <thead>
                            <tr className="bg-[#F8F6F2] dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs">
                                <th className="py-3 px-4 w-[120px] font-bold text-slate-500">
                                    Khung giờ
                                </th>
                                {days.map((day) => (
                                    <th
                                        key={day}
                                        className="py-3 px-4 font-black text-[#8B7355] uppercase"
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
                                                    className={`w-full py-3 px-2 rounded-xl transition-all flex flex-col items-center justify-center text-center cursor-pointer border ${getCellColorClass(slot ? slot.color : "")}`}
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

            {/* Bottom Quote Input */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-2xl space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    Trích dẫn chân trang
                </h3>
                <div className="space-y-1">
                    <input
                        type="text"
                        value={settingsForm["schedule_quote"] || ""}
                        onChange={(e) =>
                            setSettingsForm({
                                ...settingsForm,
                                schedule_quote: e.target.value,
                            })
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none bg-slate-50/20"
                        placeholder="Nhập câu trích dẫn chân lịch học..."
                    />
                </div>
            </div>

            {/* MODAL POP OVER: Cell Editor */}
            {editingCell && (
                <div className="fixed inset-0 bg-slate-950/25 backdrop-blur-xs flex items-center justify-center z-[100] animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-slate-100 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 relative">
                        {/* Close button */}
                        <button
                            type="button"
                            onClick={() => setEditingCell(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="space-y-1 text-left">
                            <h3 className="text-sm font-black text-slate-800">
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
                                <label className="text-[10px] font-bold text-slate-450 uppercase">
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

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-450 uppercase block">
                                    Chọn màu phân loại
                                </label>
                                <div className="flex flex-wrap gap-2 pt-0.5">
                                    {colorsList.map((c) => (
                                        <button
                                            key={c.key}
                                            type="button"
                                            onClick={() =>
                                                setEditingCell({
                                                    ...editingCell,
                                                    color: c.key,
                                                })
                                            }
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer ${c.bgClass} ${
                                                editingCell.color === c.key
                                                    ? "ring-2 ring-brand-500 border-transparent scale-105 shadow-sm"
                                                    : "opacity-80 hover:opacity-100 hover:scale-102"
                                            }`}
                                        >
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
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
