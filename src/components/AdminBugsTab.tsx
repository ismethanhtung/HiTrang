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

            {/* Bugs List Table */}
            <div className="bg-bg-card rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-border-primary/50 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/30">
                            <th className="py-2.5 px-4 w-[140px]">Thời gian</th>
                            <th className="py-2.5 px-4 w-[160px]">Người gửi</th>
                            <th className="py-2.5 px-4 w-[200px]">Tài khoản hệ thống</th>
                            <th className="py-2.5 px-4">Nội dung báo lỗi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50 text-xs text-slate-650">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-slate-450">
                                    <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" />
                                    <span className="text-[10px] font-semibold text-slate-400 block mt-2">
                                        Đang tải danh sách báo cáo...
                                    </span>
                                </td>
                            </tr>
                        ) : bugReports.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-12 text-center text-slate-400 italic">
                                    <AlertCircle className="w-6 h-6 text-slate-350 mx-auto mb-1.5" />
                                    <span>Chưa ghi nhận bất kỳ báo cáo lỗi nào trên hệ thống.</span>
                                </td>
                            </tr>
                        ) : (
                            bugReports.map((report) => (
                                <tr key={report.id} className="hover:bg-slate-50/30 transition-colors">
                                    {/* Time */}
                                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-slate-350 shrink-0" />
                                            <span>{formatDate(report.createdAt)}</span>
                                        </div>
                                    </td>

                                    {/* Reporter Name */}
                                    <td className="py-3 px-4 font-bold text-slate-850 dark:text-slate-200">
                                        {report.reporterName}
                                    </td>

                                    {/* System Account */}
                                    <td className="py-3 px-4">
                                        {report.userId ? (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                                    <User className="w-3.5 h-3.5 text-[#4B726B]" />
                                                    {report.username}
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-4.5">
                                                    {report.userRole === "teacher" ? "Giáo viên" : "Học sinh"}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-slate-400 font-medium bg-slate-50 dark:bg-slate-850 px-1.5 py-0.5 rounded">
                                                Khách vãng lai
                                            </span>
                                        )}
                                    </td>

                                    {/* Details */}
                                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                                        {report.description}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
