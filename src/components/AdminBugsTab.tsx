import React, { useState, useMemo } from "react";
import { BugReport, deleteBugReport } from "../lib/supabaseService";
import { GoogleIcon, isUserGoogleAccount } from "./GoogleIcon";
import {
    Bug,
    AlertCircle,
    Clock,
    Search,
    RefreshCw,
    Trash2,
    X,
    ChevronLeft,
    ChevronRight,
    Users,
    CheckCircle2,
} from "lucide-react";

interface AdminBugsTabProps {
    bugReports: BugReport[];
    loading: boolean;
    onRefreshBugs?: () => Promise<void>;
    onSelectUserForStats?: (userId: string) => void;
}

const parseBugDescription = (desc: string) => {
    if (!desc) return { title: "Báo cáo lỗi", details: "" };

    const trimmed = desc.trim();

    // Standard format: "Tiêu đề: ... \n\nChi tiết: ..."
    const match = trimmed.match(
        /^Tiêu đề:\s*([^\n]+)(?:\n+Chi tiết:\s*([\s\S]*))?$/i,
    );
    if (match) {
        return {
            title: match[1]?.trim() || "Báo cáo lỗi",
            details: match[2]?.trim() || "",
        };
    }

    // Starts with "Tiêu đề:"
    if (trimmed.toLowerCase().startsWith("tiêu đề:")) {
        const lines = trimmed.split("\n");
        const title = lines[0].replace(/^tiêu đề:\s*/i, "").trim();
        const details = lines
            .slice(1)
            .join("\n")
            .replace(/^\s*chi tiết:\s*/i, "")
            .trim();
        return {
            title: title || "Báo cáo lỗi",
            details: details,
        };
    }

    // Multiple lines: first line is title if short
    const lines = trimmed
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    if (lines.length > 1 && lines[0].length <= 80) {
        return {
            title: lines[0],
            details: lines.slice(1).join("\n"),
        };
    }

    if (trimmed.length > 60) {
        return {
            title: trimmed.slice(0, 50) + "...",
            details: trimmed,
        };
    }

    return {
        title: trimmed,
        details: trimmed,
    };
};

export default function AdminBugsTab({
    bugReports,
    loading,
    onRefreshBugs,
    onSelectUserForStats,
}: AdminBugsTabProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<"all" | "student" | "guest">(
        "all",
    );
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);

    // Status Alert banner
    const [statusMessage, setStatusMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    // Delete Modal
    const [deleteModalBug, setDeleteModalBug] = useState<BugReport | null>(
        null,
    );
    const [isDeleting, setIsDeleting] = useState(false);

    // Auto fetch bugs on mount if empty
    React.useEffect(() => {
        if (onRefreshBugs && bugReports.length === 0) {
            onRefreshBugs();
        }
    }, [onRefreshBugs]);

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleString("vi-VN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            });
        } catch {
            return dateStr;
        }
    };

    // Delete bug report
    const handleDeleteBug = async (report: BugReport) => {
        setIsDeleting(true);
        try {
            await deleteBugReport(report.id);
            setStatusMessage({
                type: "success",
                text: "Đã xóa bản ghi báo cáo lỗi thành công!",
            });
            setDeleteModalBug(null);
            if (onRefreshBugs) await onRefreshBugs();
        } catch (err: any) {
            console.error("Lỗi khi xóa báo cáo lỗi:", err);
            setStatusMessage({
                type: "error",
                text: `Lỗi xóa báo cáo: ${err.message || "Vui lòng thử lại"}`,
            });
        } finally {
            setIsDeleting(false);
        }
    };

    // Filter logic
    const filteredReports = useMemo(() => {
        return bugReports.filter((r) => {
            if (filterType === "student" && !r.userId) return false;
            if (filterType === "guest" && !!r.userId) return false;

            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            const { title, details } = parseBugDescription(r.description);
            return (
                r.reporterName.toLowerCase().includes(q) ||
                (r.username || "").toLowerCase().includes(q) ||
                title.toLowerCase().includes(q) ||
                details.toLowerCase().includes(q) ||
                r.description.toLowerCase().includes(q) ||
                (r.email || "").toLowerCase().includes(q) ||
                formatDate(r.createdAt).toLowerCase().includes(q)
            );
        });
    }, [bugReports, filterType, searchQuery]);

    // Pagination
    const totalPages = Math.ceil(filteredReports.length / pageSize) || 1;
    const paginatedReports = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredReports.slice(start, start + pageSize);
    }, [filteredReports, currentPage, pageSize]);

    const studentCount = useMemo(() => {
        return bugReports.filter((r) => !!r.userId).length;
    }, [bugReports]);

    const guestCount = useMemo(() => {
        return bugReports.filter((r) => !r.userId).length;
    }, [bugReports]);

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border-primary/60">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        Quản Lý Báo Cáo Lỗi Bài Thi
                    </h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                        Xem, theo dõi và xử lý các phản hồi, báo cáo sự cố từ
                        học sinh và người dùng.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={async () => {
                            if (onRefreshBugs) await onRefreshBugs();
                            setStatusMessage({
                                type: "success",
                                text: "Đã làm mới danh sách báo cáo lỗi!",
                            });
                        }}
                        disabled={loading}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200/60 dark:bg-slate-800 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        title="Làm mới danh sách"
                    >
                        <RefreshCw
                            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                        />
                        <span>Làm mới</span>
                    </button>
                </div>
            </div>

            {/* Notification alert banner */}
            {statusMessage && (
                <div
                    className={` text-xs flex items-center justify-between transition-all ${
                        statusMessage.type === "success"
                            ? "  dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300  "
                            : "  dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 "
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {statusMessage.type === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span className="font-medium">
                            {statusMessage.text}
                        </span>
                    </div>
                </div>
            )}

            {/* Filter Bar & Quick Stats */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                {/* Search & Status Badges */}
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm người gửi hoặc nội dung..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/20 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                        />
                    </div>

                    {/* Quick Metric Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-brand-700 dark:text-brand-300 whitespace-nowrap bg-brand-50/80 dark:bg-brand-950/30 border border-brand-200/50 dark:border-brand-800/40 rounded-lg px-2.5 py-1">
                            <Bug className="w-3 h-3 text-brand-500" />
                            Báo cáo: {bugReports.length}
                        </span>

                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-sky-700 dark:text-sky-300 whitespace-nowrap bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200/50 dark:border-sky-800/40 rounded-lg px-2.5 py-1">
                            <Users className="w-3 h-3 text-sky-500" />
                            Học sinh: {studentCount}
                        </span>

                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1">
                            Khách: {guestCount}
                        </span>
                    </div>
                </div>

                {/* Filter dropdown */}
                <div className="flex items-center gap-3 w-full sm:w-auto self-end sm:self-center">
                    <select
                        value={filterType}
                        onChange={(e) => {
                            setFilterType(e.target.value as any);
                            setCurrentPage(1);
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-xs text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                    >
                        <option value="all">Tất cả đối tượng</option>
                        <option value="student">
                            Tài khoản học sinh ({studentCount})
                        </option>
                        <option value="guest">
                            Khách vãng lai ({guestCount})
                        </option>
                    </select>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-bg-card overflow-hidden shadow-2xs">
                <table className="w-full text-left border-1 border-slate-100 dark:border-slate-800/60">
                    <thead>
                        <tr className="border-b border-border-primary/50 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/30 dark:bg-slate-800/20">
                            <th className="py-2.5 px-4 text-center w-12 whitespace-nowrap">
                                STT
                            </th>
                            <th className="py-2.5 px-4 w-52 whitespace-nowrap">
                                Người gửi
                            </th>
                            <th className="py-2.5 px-4 w-44 whitespace-nowrap">
                                Thời gian tạo
                            </th>
                            <th className="py-2.5 px-4 w-60 whitespace-nowrap">
                                Tiêu đề
                            </th>
                            <th className="py-2.5 px-4">Nội dung chi tiết</th>
                            <th className="py-2.5 px-4 text-right whitespace-nowrap w-24">
                                Thao tác
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/40 text-xs text-slate-650">
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="py-10 text-center text-slate-400"
                                >
                                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-400 mb-2" />
                                    <span className="text-xs font-semibold">
                                        Đang tải danh sách báo cáo lỗi...
                                    </span>
                                </td>
                            </tr>
                        ) : paginatedReports.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="py-12 text-center text-slate-400 italic"
                                >
                                    <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                                    <span>Không tìm thấy báo cáo lỗi nào.</span>
                                </td>
                            </tr>
                        ) : (
                            paginatedReports.map((report, index) => {
                                const stt =
                                    (currentPage - 1) * pageSize + index + 1;
                                const isGoogle = isUserGoogleAccount(
                                    report as any,
                                );
                                const { title, details } = parseBugDescription(
                                    report.description,
                                );

                                return (
                                    <tr
                                        key={report.id}
                                        className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors"
                                    >
                                        {/* STT */}
                                        <td className="py-3 px-4 text-center text-slate-400 font-bold">
                                            {stt}
                                        </td>

                                        {/* Reporter */}
                                        <td className="py-3 px-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                        {report.reporterName}
                                                    </span>
                                                    {report.userId ? (
                                                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/40">
                                                            {report.userRole ===
                                                            "teacher"
                                                                ? "Giáo viên"
                                                                : report.userRole ===
                                                                    "admin"
                                                                  ? "Admin"
                                                                  : "Học sinh"}
                                                        </span>
                                                    ) : (
                                                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                            Khách
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Account tag */}
                                                {report.userId && (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (
                                                                    report.userId
                                                                ) {
                                                                    onSelectUserForStats?.(
                                                                        report.userId,
                                                                    );
                                                                }
                                                            }}
                                                            className="hover:text-brand-600 dark:hover:text-brand-300 hover:underline cursor-pointer transition-colors"
                                                            title="Xem thống kê học sinh này"
                                                        >
                                                            @{report.username}
                                                        </button>
                                                        {isGoogle && (
                                                            <span
                                                                className="inline-flex items-center gap-0.5"
                                                                title={
                                                                    report.email
                                                                        ? `Google: ${report.email}`
                                                                        : "Tài khoản Google"
                                                                }
                                                            >
                                                                <GoogleIcon className="w-2.5 h-2.5" />
                                                            </span>
                                                        )}
                                                        {report.grade && (
                                                            <span className="text-[10px] text-slate-400 font-medium">
                                                                • Lớp{" "}
                                                                {report.grade}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Created Time */}
                                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                                <span>
                                                    {formatDate(
                                                        report.createdAt,
                                                    )}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Title Column */}
                                        <td className="py-3 px-4">
                                            <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
                                                {title}
                                            </div>
                                        </td>

                                        {/* Detail Column */}
                                        <td className="py-3 px-4 text-slate-650 dark:text-slate-300 leading-relaxed font-sans">
                                            <div className="line-clamp-2 max-w-xl whitespace-pre-wrap">
                                                {details || report.description}
                                            </div>
                                        </td>

                                        {/* Action */}
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setDeleteModalBug(report)
                                                }
                                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                                                title="Xóa bản báo cáo lỗi này"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-400">
                        Hiển thị {(currentPage - 1) * pageSize + 1} -{" "}
                        {Math.min(
                            currentPage * pageSize,
                            filteredReports.length,
                        )}{" "}
                        / {filteredReports.length} báo cáo
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() =>
                                setCurrentPage((p) => Math.max(1, p - 1))
                            }
                            disabled={currentPage === 1}
                            className="p-1 bg-slate-100 hover:bg-slate-200/60 dark:bg-slate-800 dark:hover:bg-slate-700/60 disabled:opacity-40 text-slate-500 rounded-lg transition-colors cursor-pointer"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 px-2">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() =>
                                setCurrentPage((p) =>
                                    Math.min(totalPages, p + 1),
                                )
                            }
                            disabled={currentPage === totalPages}
                            className="p-1 bg-slate-100 hover:bg-slate-200/60 dark:bg-slate-800 dark:hover:bg-slate-700/60 disabled:opacity-40 text-slate-500 rounded-lg transition-colors cursor-pointer"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {deleteModalBug && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-bg-card rounded-2xl border border-border-primary shadow-xl max-w-sm w-full p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    Xác Nhận Xóa Báo Cáo
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDeleteModalBug(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Bạn có chắc chắn muốn xóa bản ghi báo cáo lỗi này
                            của{" "}
                            <strong className="text-slate-800 dark:text-slate-200">
                                {deleteModalBug.reporterName}
                            </strong>{" "}
                            không? Thao tác này không thể hoàn tác.
                        </p>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setDeleteModalBug(null)}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => handleDeleteBug(deleteModalBug)}
                                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {isDeleting ? (
                                    <>
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                        <span>Đang xóa...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-3 h-3" />
                                        <span>Xác nhận xóa</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
