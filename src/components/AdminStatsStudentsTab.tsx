import React, { useState } from "react";
import { User, Submission } from "../types";
import { Search, Users, Clock } from "lucide-react";

interface AdminStatsStudentsTabProps {
    userProfiles: User[];
    submissions: Submission[];
    onReviewSubmission: (sub: Submission) => void;
}

export default function AdminStatsStudentsTab({
    userProfiles,
    submissions,
    onReviewSubmission,
}: AdminStatsStudentsTabProps) {
    const [studentSearchQuery, setStudentSearchQuery] = useState("");
    const [selectedStatsStudentId, setSelectedStatsStudentId] = useState<string | null>(null);
    const [adminStudentHoveredPointIdx, setAdminStudentHoveredPointIdx] = useState<number | null>(null);

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
    };

    // Filter students
    const studentsList = userProfiles.filter((u) => {
        if (u.role !== "student") return false;
        return (
            u.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
            u.username.toLowerCase().includes(studentSearchQuery.toLowerCase())
        );
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Thống Kê Học Sinh</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Xem tiến trình học tập, lịch sử điểm số, tần suất làm bài và xem chi tiết bài làm của từng học sinh.
                    </p>
                </div>
            </div>

            {/* Split Screen Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Left Column: Student Navigation List */}
                <div className="md:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs flex flex-col h-[calc(100vh-220px)]">
                    <div className="relative mb-3.5 flex-shrink-0">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            placeholder="Tìm học sinh..."
                            value={studentSearchQuery}
                            onChange={(e) => setStudentSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-1">
                        {studentsList.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-8">
                                Không tìm thấy học sinh nào.
                            </p>
                        ) : (
                            studentsList.map((student) => {
                                const isSelected = selectedStatsStudentId === student.id;
                                const studentSubs = submissions.filter((s) => s.studentId === student.id);

                                return (
                                    <button
                                        key={student.id}
                                        onClick={() => {
                                            setSelectedStatsStudentId(student.id);
                                            setAdminStudentHoveredPointIdx(null);
                                        }}
                                        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                                            isSelected
                                                ? "bg-slate-900 border-slate-900 text-white"
                                                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                                        }`}
                                    >
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                                isSelected
                                                    ? "bg-slate-800 text-white border border-slate-700"
                                                    : "bg-brand-50 text-brand-600"
                                            }`}
                                        >
                                            {(student.name || "U").charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-xs font-bold truncate ${isSelected ? "text-white" : "text-slate-800"}`}>
                                                {student.name}
                                            </div>
                                            <div className={`text-[10px] truncate ${isSelected ? "text-slate-400" : "text-slate-400"}`}>
                                                @{student.username} • {studentSubs.length} bài
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Column: Detailed student analytics */}
                <div className="md:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs h-[calc(100vh-220px)] overflow-y-auto">
                    {(() => {
                        if (!selectedStatsStudentId) {
                            return (
                                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 italic space-y-2 py-12">
                                    <Users className="w-8 h-8 text-slate-305" />
                                    <p className="text-xs font-medium">
                                        Hãy chọn một học sinh từ danh sách bên trái để quan sát kết quả chi tiết.
                                    </p>
                                </div>
                            );
                        }

                        const student = userProfiles.find((u) => u.id === selectedStatsStudentId);
                        if (!student) {
                            return <p className="text-xs text-slate-400 italic">Không tìm thấy thông tin học sinh.</p>;
                        }

                        const studentSubs = submissions
                            .filter((s) => s.studentId === student.id)
                            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

                        const completedCount = studentSubs.length;
                        const avgScore =
                            completedCount > 0
                                ? (studentSubs.reduce((acc, curr) => acc + curr.score, 0) / completedCount).toFixed(1)
                                : "0.0";

                        return (
                            <div className="space-y-6">
                                {/* Student Header */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 border border-slate-100 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-base">
                                            {student.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">{student.name}</h3>
                                            <p className="text-[11px] text-slate-450">Tài khoản: @{student.username}</p>
                                            {student.plan && (
                                                <span
                                                    className={`inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-xl mt-1 border uppercase tracking-wider ${
                                                        student.plan === "vip"
                                                            ? "bg-amber-100 text-amber-800 border-amber-200"
                                                            : student.plan === "basic"
                                                              ? "bg-sky-100 text-sky-800 border-sky-200"
                                                              : "bg-slate-100 text-slate-600 border-slate-200"
                                                    }`}
                                                >
                                                    {student.plan}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="text-center bg-white border border-slate-105 p-2.5 rounded-xl min-w-[70px] shadow-3xs">
                                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Lượt làm</span>
                                            <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">{completedCount}</span>
                                        </div>
                                        <div className="text-center bg-white border border-slate-105 p-2.5 rounded-xl min-w-[70px] shadow-3xs">
                                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Điểm TB</span>
                                            <span className="text-sm font-extrabold text-[#3B6D85] mt-0.5 block">{avgScore}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Practice Heatmap & Chart Side-by-Side */}
                                {completedCount > 0 && (
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2 pb-6 border-b border-slate-150">
                                        {/* Left Column: SVG Chart of Score Trend */}
                                        <div className="lg:col-span-7 space-y-3">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-150">
                                                Biểu đồ tiến trình điểm số
                                            </h4>
                                            <div className="h-[140px] w-full relative pt-2">
                                                {(() => {
                                                    const chartPointsData = [...studentSubs]
                                                        .reverse()
                                                        .slice(-7)
                                                        .map((sub, i) => ({
                                                            day: `Lượt ${i + 1}`,
                                                            score: Number(sub.score),
                                                            quizTitle: sub.quizTitle,
                                                            submittedAt: sub.submittedAt,
                                                        }));

                                                    const width = 400;
                                                    const height = 100;
                                                    const maxVal = 10;
                                                    const paddingLeft = 12;
                                                    const paddingRight = 12;
                                                    const paddingTop = 16;
                                                    const paddingBottom = 12;

                                                    const points = chartPointsData.map((p, i) => {
                                                        const x =
                                                            paddingLeft +
                                                            (i * (width - paddingLeft - paddingRight)) /
                                                                Math.max(chartPointsData.length - 1, 1);
                                                        const y =
                                                            paddingTop +
                                                            ((maxVal - p.score) * (height - paddingTop - paddingBottom)) / maxVal;
                                                        return {
                                                            x,
                                                            y,
                                                            score: p.score,
                                                        };
                                                    });

                                                    let pathD = "";
                                                    let areaD = "";

                                                    if (points.length > 0) {
                                                        if (points.length === 1) {
                                                            pathD = `M ${points[0].x} ${points[0].y}`;
                                                            areaD = `M ${points[0].x} ${points[0].y} L ${points[0].x} ${height - paddingBottom} Z`;
                                                        } else if (points.length === 2) {
                                                            pathD = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
                                                            areaD = `${pathD} L ${points[1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
                                                        } else {
                                                            pathD = `M ${points[0].x} ${points[0].y}`;
                                                            for (let i = 0; i < points.length - 1; i++) {
                                                                const curr = points[i];
                                                                const next = points[i + 1];
                                                                const cpX1 = curr.x + (next.x - curr.x) / 3;
                                                                const cpY1 = curr.y;
                                                                const cpX2 = curr.x + (2 * (next.x - curr.x)) / 3;
                                                                const cpY2 = next.y;
                                                                pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
                                                            }
                                                            areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
                                                        }
                                                    }

                                                    const formatDate = (dateStr?: string) => {
                                                        if (!dateStr) return "";
                                                        try {
                                                            const d = new Date(dateStr.replace(" ", "T"));
                                                            const day = String(d.getDate()).padStart(2, "0");
                                                            const month = String(d.getMonth() + 1).padStart(2, "0");
                                                            const year = d.getFullYear();
                                                            return `${day}/${month}/${year}`;
                                                        } catch (e) {
                                                            return "";
                                                        }
                                                    };

                                                    return (
                                                        <div className="w-full h-full relative">
                                                            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                                                                <defs>
                                                                    <linearGradient
                                                                        id="admin-student-chart-grad"
                                                                        x1="0"
                                                                        y1="0"
                                                                        x2="0"
                                                                        y2="1"
                                                                    >
                                                                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.15" />
                                                                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                                                                    </linearGradient>
                                                                    <filter
                                                                        id="admin-chart-shadow"
                                                                        x="-5%"
                                                                        y="-5%"
                                                                        width="110%"
                                                                        height="110%"
                                                                    >
                                                                        <feDropShadow
                                                                            dx="0"
                                                                            dy="1.5"
                                                                            stdDeviation="1.2"
                                                                            floodColor="#8B5CF6"
                                                                            floodOpacity="0.15"
                                                                        />
                                                                    </filter>
                                                                </defs>

                                                                {areaD && <path d={areaD} fill="url(#admin-student-chart-grad)" />}
                                                                {pathD && (
                                                                    <path
                                                                        d={pathD}
                                                                        fill="none"
                                                                        stroke="#8B5CF6"
                                                                        strokeWidth="1.5"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        filter="url(#admin-chart-shadow)"
                                                                    />
                                                                )}

                                                                {points.map((p, i) => {
                                                                    const isHovered = adminStudentHoveredPointIdx === i;
                                                                    const isLast = i === points.length - 1;
                                                                    const shouldShow = isHovered || (adminStudentHoveredPointIdx === null && isLast);

                                                                    return (
                                                                        <g key={i}>
                                                                            <circle
                                                                                cx={p.x}
                                                                                cy={p.y}
                                                                                r={shouldShow ? 4.5 : 3}
                                                                                fill={shouldShow ? "#8B5CF6" : "#FFFFFF"}
                                                                                stroke="#8B5CF6"
                                                                                strokeWidth={shouldShow ? 2 : 1.5}
                                                                                className="transition-all duration-150 cursor-pointer"
                                                                                onMouseEnter={() => setAdminStudentHoveredPointIdx(i)}
                                                                            />
                                                                        </g>
                                                                    );
                                                                })}
                                                            </svg>

                                                            {adminStudentHoveredPointIdx !== null &&
                                                                points[adminStudentHoveredPointIdx] &&
                                                                chartPointsData[adminStudentHoveredPointIdx] && (
                                                                    <div
                                                                        className="absolute bg-white border border-slate-200/80 text-slate-800 p-2.5 rounded-xl shadow-lg pointer-events-none transition-all duration-150 animate-in fade-in-50 zoom-in-95 z-30 select-none text-left min-w-[140px]"
                                                                        style={{
                                                                            left: `${(points[adminStudentHoveredPointIdx].x / width) * 100}%`,
                                                                            top: `${(points[adminStudentHoveredPointIdx].y / height) * 100}%`,
                                                                            transform: "translate(-50%, -115%)",
                                                                        }}
                                                                    >
                                                                        <div className="text-[8px] font-bold text-slate-400 leading-none mb-1">
                                                                            {formatDate(chartPointsData[adminStudentHoveredPointIdx].submittedAt)}
                                                                        </div>
                                                                        <div className="text-[9px] font-black text-slate-800 truncate max-w-[130px] mb-1">
                                                                            {chartPointsData[adminStudentHoveredPointIdx].quizTitle}
                                                                        </div>
                                                                        <div className="flex items-center gap-1 mt-0.5 text-[9px] font-bold text-[#8B5CF6]">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]"></span>
                                                                            <span>
                                                                                Điểm: {points[adminStudentHoveredPointIdx].score}/10đ
                                                                            </span>
                                                                        </div>
                                                                        <div className="absolute top-[100%] left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-white border-b border-r border-slate-200/80 rotate-45" />
                                                                    </div>
                                                                )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {/* Right Column: Practice Heatmap */}
                                        <div className="lg:col-span-5 space-y-3">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-150">
                                                Tần suất hoạt động (30 ngày gần đây)
                                            </h4>
                                            <div className="py-2">
                                                {(() => {
                                                    const today = new Date();
                                                    today.setHours(23, 59, 59, 999);
                                                    const daysList = [];
                                                    for (let k = 29; k >= 0; k--) {
                                                        const d = new Date(today);
                                                        d.setDate(today.getDate() - k);
                                                        const dStr = d.toDateString();
                                                        const count = studentSubs.filter((s) => {
                                                            return new Date(s.submittedAt.replace(" ", "T")).toDateString() === dStr;
                                                        }).length;
                                                        daysList.push({
                                                            date: d,
                                                            count,
                                                        });
                                                    }

                                                    const startDayOfWeek = (daysList[0].date.getDay() + 6) % 7;

                                                    const formatDateLabel = (d: Date) => {
                                                        const day = String(d.getDate()).padStart(2, "0");
                                                        const month = String(d.getMonth() + 1).padStart(2, "0");
                                                        return `${day}/${month}`;
                                                    };

                                                    const weekHeaders = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

                                                    return (
                                                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100/80 w-fit text-left flex flex-col gap-2">
                                                            {/* Headers */}
                                                            <div className="grid grid-cols-7 gap-1.5 text-center text-[8px] font-bold text-slate-400 mb-1.5">
                                                                {weekHeaders.map((h) => (
                                                                    <div key={h} className="w-2.5">
                                                                        {h}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {/* Grid */}
                                                            <div className="grid grid-cols-7 gap-1.5 w-fit">
                                                                {Array.from({
                                                                    length: startDayOfWeek,
                                                                }).map((_, i) => (
                                                                    <div key={`empty-${i}`} className="w-2.5 h-2.5" />
                                                                ))}
                                                                {daysList.map((dayInfo, idx) => {
                                                                    let colorClass = "bg-slate-200 text-slate-400";
                                                                    if (dayInfo.count === 1) {
                                                                        colorClass = "bg-[#A7F3D0] text-emerald-800";
                                                                    } else if (dayInfo.count === 2) {
                                                                        colorClass = "bg-[#34D399] text-emerald-950";
                                                                    } else if (dayInfo.count >= 3) {
                                                                        colorClass = "bg-[#059669] text-white";
                                                                    }

                                                                    const tooltipText = `${formatDateLabel(dayInfo.date)}: ${dayInfo.count} bài làm`;

                                                                    return (
                                                                        <div
                                                                            key={idx}
                                                                            className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer hover:scale-125 relative group ${colorClass}`}
                                                                        >
                                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-900 text-white text-[8px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-50">
                                                                                {tooltipText}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            {/* Legend */}
                                                            <div className="flex items-center gap-1 text-[8px] text-slate-400 self-end mt-1">
                                                                <span>Ít</span>
                                                                <div className="w-2 h-2 rounded-full bg-slate-200" />
                                                                <div className="w-2 h-2 rounded-full bg-[#A7F3D0]" />
                                                                <div className="w-2 h-2 rounded-full bg-[#34D399]" />
                                                                <div className="w-2 h-2 rounded-full bg-[#059669]" />
                                                                <span>Nhiều</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Submission list */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-800">Nhật ký bài thi đã làm</h4>
                                    <div className="space-y-2.5">
                                        {studentSubs.map((sub) => {
                                            let scoreColor = "bg-rose-50 text-rose-700 border border-rose-200";
                                            if (sub.score >= 8) {
                                                scoreColor = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                                            } else if (sub.score >= 5) {
                                                scoreColor = "bg-amber-50 text-amber-700 border border-amber-200";
                                            }

                                            return (
                                                <div
                                                    key={sub.id}
                                                    className="border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all hover:border-slate-350 shadow-3xs bg-white"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="text-xs font-bold text-slate-800 truncate max-w-sm sm:max-w-md">
                                                            {sub.quizTitle}
                                                        </div>
                                                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-slate-450 font-medium">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3 text-slate-450" />
                                                                {sub.submittedAt}
                                                            </span>
                                                            {sub.timeSpent !== undefined && (
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="w-3 h-3 text-slate-450" />
                                                                    Thời gian: {formatTime(sub.timeSpent)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                                                        <span className={`px-2 py-0.5 rounded-xl text-[11px] font-extrabold ${scoreColor}`}>
                                                            {sub.score} / 10
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => onReviewSubmission(sub)}
                                                            className="px-2.5 py-1 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-[11px] font-semibold transition-all active:scale-[0.98] cursor-pointer"
                                                        >
                                                            Xem chi tiết
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {completedCount === 0 && (
                                            <p className="text-xs text-slate-400 italic text-center py-6">
                                                Học sinh này chưa thực hiện bài thi nào.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}
