import React from "react";
import { BugReport } from "../lib/supabaseService";
import { AlertCircle, Clock, User, ShieldAlert } from "lucide-react";

interface AdminBugsTabProps {
    bugReports: BugReport[];
    loading: boolean;
}

export default function AdminBugsTab({ bugReports, loading }: AdminBugsTabProps) {
    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleString("vi-VN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                        Báo Cáo Lỗi Hệ Thống
                    </h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                        Xem và theo dõi các báo cáo lỗi do học sinh/người dùng gửi lên hệ thống.
                    </p>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
                    <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                    <span className="text-xs font-semibold text-slate-500 mt-3">
                        Đang tải danh sách báo cáo...
                    </span>
                </div>
            ) : bugReports.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                    <AlertCircle className="w-8 h-8 text-slate-350" />
                    <p className="text-xs text-slate-400 italic">
                        Chưa ghi nhận bất kỳ báo cáo lỗi nào trên hệ thống.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {bugReports.map((report) => (
                        <div
                            key={report.id}
                            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 hover:shadow-sm transition-all duration-200 flex flex-col gap-4 relative overflow-hidden"
                        >
                            {/* Decorative side badge */}
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-455" />

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-lg flex items-center justify-center shrink-0">
                                        <ShieldAlert className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-750 dark:text-slate-200">
                                            Người gửi: {report.reporterName}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {/* Registered account details */}
                                            {report.userId ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] text-[#4B726B] dark:text-brand-300 font-semibold bg-[#4B726B]/5 dark:bg-[#4B726B]/15 px-2 py-0.5 rounded">
                                                    <User className="w-3 h-3" />
                                                    Tài khoản: {report.username} ({report.userRole === "teacher" ? "Giáo viên" : "Học sinh"})
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-semibold bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                    Khách vãng lai / Chưa đăng nhập
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium sm:self-start">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{formatDate(report.createdAt)}</span>
                                </div>
                            </div>

                            <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850/60 rounded-xl p-3.5 text-xs text-slate-700 dark:text-slate-250 leading-relaxed font-sans whitespace-pre-wrap">
                                {report.description}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
